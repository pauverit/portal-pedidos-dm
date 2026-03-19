-- ════════════════════════════════════════════════════════════════════════════
-- PASO 18 — Libros Oficiales: Balance, P&G, Libro Diario, Mayor
-- Ejecutar en Supabase SQL Editor
-- Requiere: plan_cuentas, asientos, asiento_lineas (PASO 12)
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- BALANCE DE SITUACIÓN
-- Activo (grupos 1-5 naturaleza deudora) / Pasivo+PN (grupos 1-5 naturaleza acreedora)
-- Estructura simplificada PGC español
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_balance_situacion AS
SELECT
    pc.empresa_id,
    pc.codigo,
    pc.nombre,
    pc.grupo,
    pc.naturaleza,
    pc.tipo,
    -- Saldo = Debe - Haber acumulado de asientos confirmados
    COALESCE(SUM(al.debe - al.haber), 0)   AS saldo_deudor,
    COALESCE(SUM(al.haber - al.debe), 0)   AS saldo_acreedor,
    -- Saldo neto con signo según naturaleza
    CASE pc.naturaleza
        WHEN 'deudora'   THEN COALESCE(SUM(al.debe - al.haber), 0)
        WHEN 'acreedora' THEN COALESCE(SUM(al.haber - al.debe), 0)
        ELSE 0
    END                                     AS saldo_neto,
    -- Clasificación en Balance
    CASE
        WHEN pc.codigo LIKE '2%' THEN 'Activo No Corriente'
        WHEN pc.codigo LIKE '3%' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '43%' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '44%' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '45%' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '46%' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '47%' AND pc.naturaleza = 'deudora' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '48%' THEN 'Activo Corriente'
        WHEN pc.codigo LIKE '57%' THEN 'Activo Corriente — Tesorería'
        WHEN pc.codigo LIKE '1%' AND pc.naturaleza = 'acreedora' THEN 'Patrimonio Neto'
        WHEN pc.codigo LIKE '17%' THEN 'Pasivo No Corriente'
        WHEN pc.codigo LIKE '16%' THEN 'Pasivo No Corriente'
        WHEN pc.codigo LIKE '40%' THEN 'Pasivo Corriente'
        WHEN pc.codigo LIKE '41%' THEN 'Pasivo Corriente'
        WHEN pc.codigo LIKE '47%' AND pc.naturaleza = 'acreedora' THEN 'Pasivo Corriente'
        WHEN pc.codigo LIKE '52%' THEN 'Pasivo Corriente'
        ELSE 'Otros'
    END                                     AS bloque_balance
FROM plan_cuentas pc
LEFT JOIN asiento_lineas al ON al.cuenta_id = pc.id
LEFT JOIN asientos a ON a.id = al.asiento_id AND a.estado = 'confirmado'
WHERE pc.activa = true
  AND pc.nivel <= 3   -- Solo cuentas de tercer nivel para balance resumido
GROUP BY pc.empresa_id, pc.codigo, pc.nombre, pc.grupo, pc.naturaleza, pc.tipo
HAVING COALESCE(SUM(al.debe - al.haber), 0) != 0
    OR COALESCE(SUM(al.haber - al.debe), 0) != 0;


-- ════════════════════════════════════════════════════════════════════════════
-- CUENTA DE PÉRDIDAS Y GANANCIAS (P&G)
-- Grupos 6 (gastos) y 7 (ingresos)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_pyg AS
SELECT
    pc.empresa_id,
    pc.codigo,
    pc.nombre,
    pc.grupo,
    -- Importe del período
    CASE
        WHEN pc.grupo = 6 THEN COALESCE(SUM(al.debe - al.haber), 0)   -- Gastos: saldo deudor
        WHEN pc.grupo = 7 THEN COALESCE(SUM(al.haber - al.debe), 0)   -- Ingresos: saldo acreedor
        ELSE 0
    END                                     AS importe,
    -- Signo contable: positivo = gasto / negativo = ingreso (para resultado)
    CASE
        WHEN pc.grupo = 6 THEN 'gasto'
        WHEN pc.grupo = 7 THEN 'ingreso'
        ELSE 'neutro'
    END                                     AS tipo_resultado,
    -- Subgrupos P&G
    CASE
        WHEN pc.codigo LIKE '70%' THEN 'Ventas y prestaciones'
        WHEN pc.codigo LIKE '71%' THEN 'Variación existencias PT'
        WHEN pc.codigo LIKE '73%' THEN 'Trabajos para activo'
        WHEN pc.codigo LIKE '74%' THEN 'Subvenciones'
        WHEN pc.codigo LIKE '75%' THEN 'Otros ingresos explotación'
        WHEN pc.codigo LIKE '76%' THEN 'Ingresos financieros'
        WHEN pc.codigo LIKE '77%' THEN 'Beneficios enajenación'
        WHEN pc.codigo LIKE '79%' THEN 'Exceso provisiones'
        WHEN pc.codigo LIKE '60%' THEN 'Compras'
        WHEN pc.codigo LIKE '61%' THEN 'Variación existencias'
        WHEN pc.codigo LIKE '62%' THEN 'Servicios exteriores'
        WHEN pc.codigo LIKE '63%' THEN 'Tributos'
        WHEN pc.codigo LIKE '64%' THEN 'Gastos de personal'
        WHEN pc.codigo LIKE '65%' THEN 'Otros gastos explotación'
        WHEN pc.codigo LIKE '66%' THEN 'Gastos financieros'
        WHEN pc.codigo LIKE '67%' THEN 'Pérdidas enajenación'
        WHEN pc.codigo LIKE '68%' THEN 'Amortizaciones'
        WHEN pc.codigo LIKE '69%' THEN 'Pérdidas valor elementos'
        ELSE 'Otros'
    END                                     AS partida
FROM plan_cuentas pc
LEFT JOIN asiento_lineas al ON al.cuenta_id = pc.id
LEFT JOIN asientos a ON a.id = al.asiento_id AND a.estado = 'confirmado'
WHERE pc.activa = true
  AND pc.grupo IN (6, 7)
  AND pc.nivel <= 3
GROUP BY pc.empresa_id, pc.codigo, pc.nombre, pc.grupo
HAVING COALESCE(SUM(al.debe - al.haber), 0) != 0
    OR COALESCE(SUM(al.haber - al.debe), 0) != 0;


-- ════════════════════════════════════════════════════════════════════════════
-- LIBRO DIARIO
-- Todos los asientos confirmados con sus líneas, ordenados por fecha/num
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_libro_diario AS
SELECT
    a.empresa_id,
    a.num_asiento,
    a.fecha,
    a.descripcion                           AS concepto_asiento,
    a.tipo,
    al.orden,
    pc.codigo                               AS cuenta,
    pc.nombre                               AS nombre_cuenta,
    al.descripcion                          AS concepto_linea,
    al.debe,
    al.haber
FROM asientos a
JOIN asiento_lineas al ON al.asiento_id = a.id
JOIN plan_cuentas pc   ON pc.id = al.cuenta_id
WHERE a.estado = 'confirmado'
ORDER BY a.fecha, a.num_asiento, al.orden;


-- ════════════════════════════════════════════════════════════════════════════
-- FICHAS DE MAYOR
-- Movimientos de una cuenta específica con saldo acumulado
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_libro_mayor AS
SELECT
    a.empresa_id,
    pc.codigo                               AS cuenta,
    pc.nombre                               AS nombre_cuenta,
    pc.naturaleza,
    a.fecha,
    a.num_asiento,
    a.descripcion                           AS concepto,
    al.debe,
    al.haber,
    -- Saldo acumulado (ventana por cuenta, orden cronológico)
    SUM(al.debe - al.haber) OVER (
        PARTITION BY a.empresa_id, pc.codigo
        ORDER BY a.fecha, a.num_asiento, al.orden
        ROWS UNBOUNDED PRECEDING
    )                                       AS saldo_acumulado
FROM asientos a
JOIN asiento_lineas al ON al.asiento_id = a.id
JOIN plan_cuentas pc   ON pc.id = al.cuenta_id
WHERE a.estado = 'confirmado'
ORDER BY pc.codigo, a.fecha, a.num_asiento;


-- ════════════════════════════════════════════════════════════════════════════
-- SUMAS Y SALDOS (tabla auxiliar regenerable)
-- Se mantiene como tabla materializada via trigger o recarga periódica
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sumas_saldos (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id   uuid NOT NULL REFERENCES empresas(id),
    ejercicio    int NOT NULL,
    codigo       text NOT NULL,
    nombre       text NOT NULL,
    debe_total   numeric(14,2) DEFAULT 0,
    haber_total  numeric(14,2) DEFAULT 0,
    saldo_deudor  numeric(14,2) DEFAULT 0,
    saldo_acreedor numeric(14,2) DEFAULT 0,
    updated_at   timestamptz DEFAULT now(),
    UNIQUE(empresa_id, ejercicio, codigo)
);

-- Función para regenerar sumas y saldos de un ejercicio
CREATE OR REPLACE FUNCTION regenerar_sumas_saldos(
    p_empresa_id uuid,
    p_ejercicio  int
) RETURNS void AS $$
BEGIN
    DELETE FROM sumas_saldos
    WHERE empresa_id = p_empresa_id AND ejercicio = p_ejercicio;

    INSERT INTO sumas_saldos (empresa_id, ejercicio, codigo, nombre, debe_total, haber_total, saldo_deudor, saldo_acreedor)
    SELECT
        a.empresa_id,
        EXTRACT(YEAR FROM a.fecha)::int,
        pc.codigo,
        pc.nombre,
        COALESCE(SUM(al.debe), 0),
        COALESCE(SUM(al.haber), 0),
        GREATEST(COALESCE(SUM(al.debe), 0) - COALESCE(SUM(al.haber), 0), 0),
        GREATEST(COALESCE(SUM(al.haber), 0) - COALESCE(SUM(al.debe), 0), 0)
    FROM asiento_lineas al
    JOIN asientos a      ON a.id = al.asiento_id
    JOIN plan_cuentas pc ON pc.id = al.cuenta_id
    WHERE a.empresa_id = p_empresa_id
      AND a.estado = 'confirmado'
      AND EXTRACT(YEAR FROM a.fecha)::int = p_ejercicio
    GROUP BY a.empresa_id, EXTRACT(YEAR FROM a.fecha), pc.codigo, pc.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
