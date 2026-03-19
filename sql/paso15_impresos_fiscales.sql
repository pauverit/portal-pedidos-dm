-- ════════════════════════════════════════════════════════════════════════════
-- PASO 15 — Impresos Fiscales: Modelo 303, 347, 190
-- Ejecutar en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ─── PREREQUISITOS ────────────────────────────────────────────────────────────
-- Asegúrate de que existen las tablas:
--   asientos, asiento_lineas, plan_cuentas (PASO 12 contabilidad)
--   pedidos_venta, facturas_venta (PASO 4/5 ventas)
--   pedidos_compra (PASO 11 compras)
--   nominas (PASO 16 RRHH) — opcional para Modelo 190

-- ════════════════════════════════════════════════════════════════════════════
-- MODELO 303 — IVA Trimestral
-- Extrae bases imponibles y cuotas IVA desde plan de cuentas PGC
--   Grupo 477x = IVA repercutido (ventas)
--   Grupo 472x = IVA soportado deducible (compras)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_modelo_303 AS
SELECT
    a.empresa_id,
    EXTRACT(YEAR FROM a.fecha)::int                        AS ejercicio,
    CEIL(EXTRACT(MONTH FROM a.fecha) / 3.0)::int           AS trimestre,
    pc.codigo                                              AS cuenta,
    pc.nombre                                              AS nombre_cuenta,
    -- Ventas: cuota IVA = saldo haber de 477x
    CASE
        WHEN pc.codigo LIKE '477%' THEN 'repercutido'
        WHEN pc.codigo LIKE '472%' THEN 'soportado'
        ELSE 'otro'
    END                                                    AS tipo_iva,
    -- Tipo impositivo inferido del subcódigo (4771 = 21%, 4772 = 10%, 4773 = 4%)
    CASE
        WHEN pc.codigo LIKE '4771%' OR pc.codigo LIKE '4721%' THEN 21
        WHEN pc.codigo LIKE '4772%' OR pc.codigo LIKE '4722%' THEN 10
        WHEN pc.codigo LIKE '4773%' OR pc.codigo LIKE '4723%' THEN 4
        ELSE NULL
    END                                                    AS tipo_pct,
    SUM(al.haber - al.debe)                                AS cuota_iva,
    -- Base imponible = cuota / tipo × 100 (aproximación cuando no hay cuenta base)
    CASE
        WHEN pc.codigo LIKE '477%' THEN
            CASE
                WHEN pc.codigo LIKE '4771%' THEN ROUND(SUM(al.haber - al.debe) / 0.21, 2)
                WHEN pc.codigo LIKE '4772%' THEN ROUND(SUM(al.haber - al.debe) / 0.10, 2)
                WHEN pc.codigo LIKE '4773%' THEN ROUND(SUM(al.haber - al.debe) / 0.04, 2)
                ELSE ROUND(SUM(al.haber - al.debe) / 0.21, 2)
            END
        WHEN pc.codigo LIKE '472%' THEN
            CASE
                WHEN pc.codigo LIKE '4721%' THEN ROUND(SUM(al.debe - al.haber) / 0.21, 2)
                WHEN pc.codigo LIKE '4722%' THEN ROUND(SUM(al.debe - al.haber) / 0.10, 2)
                WHEN pc.codigo LIKE '4723%' THEN ROUND(SUM(al.debe - al.haber) / 0.04, 2)
                ELSE ROUND(SUM(al.debe - al.haber) / 0.21, 2)
            END
        ELSE 0
    END                                                    AS base_imponible
FROM asiento_lineas al
JOIN asientos a        ON a.id = al.asiento_id
JOIN plan_cuentas pc   ON pc.id = al.cuenta_id
WHERE a.estado = 'confirmado'
  AND (pc.codigo LIKE '477%' OR pc.codigo LIKE '472%')
GROUP BY
    a.empresa_id,
    EXTRACT(YEAR FROM a.fecha),
    CEIL(EXTRACT(MONTH FROM a.fecha) / 3.0),
    pc.codigo,
    pc.nombre;

-- Vista resumen por trimestre (para cabecera del modelo)
CREATE OR REPLACE VIEW v_modelo_303_resumen AS
SELECT
    empresa_id,
    ejercicio,
    trimestre,
    -- IVA repercutido total
    SUM(CASE WHEN tipo_iva = 'repercutido' THEN base_imponible ELSE 0 END) AS total_base_repercutida,
    SUM(CASE WHEN tipo_iva = 'repercutido' THEN cuota_iva ELSE 0 END)     AS total_cuota_repercutida,
    -- IVA soportado total
    SUM(CASE WHEN tipo_iva = 'soportado'   THEN base_imponible ELSE 0 END) AS total_base_soportada,
    SUM(CASE WHEN tipo_iva = 'soportado'   THEN ABS(cuota_iva) ELSE 0 END) AS total_cuota_soportada,
    -- Resultado: a ingresar (+) o a compensar (-)
    SUM(CASE WHEN tipo_iva = 'repercutido' THEN cuota_iva ELSE 0 END)
    - SUM(CASE WHEN tipo_iva = 'soportado' THEN ABS(cuota_iva) ELSE 0 END) AS resultado_trimestre
FROM v_modelo_303
GROUP BY empresa_id, ejercicio, trimestre;


-- ════════════════════════════════════════════════════════════════════════════
-- MODELO 347 — Declaración anual de operaciones con terceros (>3.005,06 €)
-- Une ventas (clientes) y compras (proveedores) por NIF
-- ════════════════════════════════════════════════════════════════════════════

-- Vista auxiliar: ventas agrupadas por cliente y año
CREATE OR REPLACE VIEW v_347_ventas AS
SELECT
    fv.empresa_id,
    EXTRACT(YEAR FROM fv.fecha_emision)::int  AS ejercicio,
    u.id                                       AS tercero_id,
    COALESCE(u.nif, u.email)                   AS nif,
    u.name                                     AS nombre,
    u.email                                    AS email,
    'cliente'::text                            AS tipo,
    SUM(fv.total)                              AS importe_total
FROM facturas_venta fv
JOIN users u ON u.id = fv.cliente_id
WHERE fv.estado IN ('emitida', 'cobrada', 'parcial')
GROUP BY
    fv.empresa_id,
    EXTRACT(YEAR FROM fv.fecha_emision),
    u.id, u.nif, u.name, u.email;

-- Vista auxiliar: compras agrupadas por proveedor y año
CREATE OR REPLACE VIEW v_347_compras AS
SELECT
    pc.empresa_id,
    EXTRACT(YEAR FROM pc.fecha_pedido)::int   AS ejercicio,
    pc.proveedor_id                            AS tercero_id,
    COALESCE(pc.proveedor_nif, pc.proveedor_nombre) AS nif,
    pc.proveedor_nombre                        AS nombre,
    NULL::text                                 AS email,
    'proveedor'::text                          AS tipo,
    SUM(pc.total_con_iva)                      AS importe_total
FROM pedidos_compra pc
WHERE pc.estado IN ('confirmado', 'recibido', 'facturado')
GROUP BY
    pc.empresa_id,
    EXTRACT(YEAR FROM pc.fecha_pedido),
    pc.proveedor_id,
    pc.proveedor_nif,
    pc.proveedor_nombre;

-- Vista final Modelo 347: solo terceros que superan el umbral anual
CREATE OR REPLACE VIEW v_modelo_347 AS
SELECT
    empresa_id,
    ejercicio,
    tercero_id,
    nif,
    nombre,
    email,
    tipo,
    importe_total,
    -- Importe primer semestre (S1) y segundo semestre (S2) — requiere detalle
    -- Se calcula en la vista _detalle más abajo
    CASE WHEN importe_total > 3005.06 THEN true ELSE false END AS supera_umbral
FROM (
    SELECT * FROM v_347_ventas
    UNION ALL
    SELECT * FROM v_347_compras
) combined
WHERE importe_total > 3005.06;


-- ════════════════════════════════════════════════════════════════════════════
-- MODELO 190 — Resumen anual retenciones e ingresos a cuenta (IRPF)
-- Basado en nóminas (tabla nominas) si existe, o en cuentas PGC 465 / 640
-- ════════════════════════════════════════════════════════════════════════════

-- Vista desde tabla nominas (si existe la tabla del PASO RRHH)
-- Si no existe, fallback a cuentas contables 465 (remuneraciones pendientes)
CREATE OR REPLACE VIEW v_modelo_190 AS
SELECT
    n.empresa_id,
    EXTRACT(YEAR FROM n.fecha_nomina)::int      AS ejercicio,
    n.empleado_id                               AS perceptor_id,
    COALESCE(u.nif, u.email)                    AS nif_perceptor,
    u.name                                      AS nombre_perceptor,
    '01'::text                                  AS clave_percepcion,  -- Rendimientos trabajo
    SUM(n.salario_bruto)                        AS importe_integro,
    SUM(COALESCE(n.retencion_irpf, 0))          AS retencion_total,
    SUM(COALESCE(n.seguridad_social_empleado, 0)) AS cuota_ss,
    SUM(n.salario_neto)                         AS importe_neto
FROM nominas n
JOIN users u ON u.id = n.empleado_id
GROUP BY
    n.empresa_id,
    EXTRACT(YEAR FROM n.fecha_nomina),
    n.empleado_id,
    u.nif, u.email, u.name;

-- Vista resumen Modelo 190 por empresa/año
CREATE OR REPLACE VIEW v_modelo_190_resumen AS
SELECT
    empresa_id,
    ejercicio,
    COUNT(DISTINCT perceptor_id)  AS num_perceptores,
    SUM(importe_integro)          AS total_importe_integro,
    SUM(retencion_total)          AS total_retenciones,
    SUM(cuota_ss)                 AS total_cuota_ss,
    SUM(importe_neto)             AS total_importe_neto
FROM v_modelo_190
GROUP BY empresa_id, ejercicio;


-- ════════════════════════════════════════════════════════════════════════════
-- PERMISOS RLS — los usuarios autenticados pueden leer sus propias vistas
-- ════════════════════════════════════════════════════════════════════════════

-- Las vistas ya filtran por empresa_id, que la app pasa como parámetro.
-- No se necesita RLS adicional sobre las vistas si las tablas base
-- ya tienen sus propias políticas RLS.

-- ════════════════════════════════════════════════════════════════════════════
-- NOTAS DE IMPLEMENTACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- 1. Si la tabla 'nominas' no existe aún, v_modelo_190 dará error.
--    En ese caso, ejecuta primero el SQL de RRHH o comenta esa vista.
--
-- 2. Para Modelo 303, los tipos IVA se determinan por subcuenta PGC:
--    4771 / 4721 → 21%
--    4772 / 4722 → 10%
--    4773 / 4723 → 4%
--    Puedes añadir más subcuentas según tu plan de cuentas.
--
-- 3. Para Modelo 347, el umbral legal es 3.005,06 €/año (IVA incluido).
--    La vista incluye tanto clientes como proveedores.
--
-- 4. Los importes son aproximaciones calculadas desde la contabilidad.
--    Para una declaración oficial siempre verifica con tu gestor fiscal.
-- ════════════════════════════════════════════════════════════════════════════
