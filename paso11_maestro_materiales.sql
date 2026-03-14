-- ============================================================
-- PASO 11 — MAESTRO DE MATERIALES AVANZADO
-- + PGC Español Completo
-- + Márgenes y Rentabilidad
-- Portal Pedidos DM — Digital Market
-- ============================================================

-- ============================================================
-- 11.1  Ampliar tabla PRODUCTS con campos de coste y contabilidad
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS precio_compra      numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp                numeric(14,4),            -- PVP recomendado (si difiere de price)
  ADD COLUMN IF NOT EXISTS margen_bruto_pct   numeric(6,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS familia            text,                     -- Agrupación comercial
  ADD COLUMN IF NOT EXISTS proveedor_habitual_id uuid,                  -- Ref a proveedores
  ADD COLUMN IF NOT EXISTS cuenta_ventas      varchar(10) DEFAULT '700', -- PGC venta
  ADD COLUMN IF NOT EXISTS cuenta_compras     varchar(10) DEFAULT '600', -- PGC compra
  ADD COLUMN IF NOT EXISTS cuenta_existencias varchar(10) DEFAULT '300', -- PGC stock
  ADD COLUMN IF NOT EXISTS cuenta_var_exist   varchar(10) DEFAULT '610', -- PGC variación exist.
  ADD COLUMN IF NOT EXISTS notas_internas     text,
  ADD COLUMN IF NOT EXISTS activo             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- Trigger: recalcular margen cuando cambia price o precio_compra
CREATE OR REPLACE FUNCTION recalcular_margen_producto()
RETURNS TRIGGER AS $$
BEGIN
  -- margen = (precio_venta - coste) / precio_venta * 100
  -- Usa price como precio de venta (o pvp si está definido)
  IF COALESCE(NEW.pvp, NEW.price) > 0 AND NEW.precio_compra > 0 THEN
    NEW.margen_bruto_pct := round(
      (COALESCE(NEW.pvp, NEW.price) - NEW.precio_compra)
      / COALESCE(NEW.pvp, NEW.price) * 100, 2
    );
  ELSE
    NEW.margen_bruto_pct := 0;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_margen_producto ON products;
CREATE TRIGGER trg_margen_producto
  BEFORE INSERT OR UPDATE OF price, pvp, precio_compra ON products
  FOR EACH ROW EXECUTE FUNCTION recalcular_margen_producto();

-- Actualizar márgenes de todos los productos existentes
UPDATE products
SET margen_bruto_pct = CASE
  WHEN COALESCE(pvp, price) > 0 AND precio_compra > 0
  THEN round((COALESCE(pvp, price) - precio_compra) / COALESCE(pvp, price) * 100, 2)
  ELSE 0
END
WHERE true;

-- ============================================================
-- 11.2  Ampliar recepcion_lineas: PVP en recepción + margen
-- ============================================================
ALTER TABLE recepcion_lineas
  ADD COLUMN IF NOT EXISTS pvp_en_recepcion   numeric(14,4),
  ADD COLUMN IF NOT EXISTS margen_bruto_pct   numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notas              text;

-- Trigger: actualizar precio_compra en products al recepcionar
CREATE OR REPLACE FUNCTION actualizar_coste_producto()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si hay producto_id y precio_coste > 0
  IF NEW.producto_id IS NOT NULL AND NEW.precio_coste > 0 THEN
    -- Calcular margen en la línea
    IF COALESCE(NEW.pvp_en_recepcion, 0) > 0 THEN
      NEW.margen_bruto_pct := round(
        (NEW.pvp_en_recepcion - NEW.precio_coste) / NEW.pvp_en_recepcion * 100, 2
      );
    END IF;
    -- Actualizar precio_compra del producto (último coste conocido)
    UPDATE products
    SET precio_compra = NEW.precio_coste,
        pvp           = COALESCE(NULLIF(NEW.pvp_en_recepcion, 0), pvp),
        updated_at    = now()
    WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coste_recepcion ON recepcion_lineas;
CREATE TRIGGER trg_coste_recepcion
  BEFORE INSERT OR UPDATE ON recepcion_lineas
  FOR EACH ROW EXECUTE FUNCTION actualizar_coste_producto();

-- ============================================================
-- 11.3  Vista: margen bruto por línea de venta
-- ============================================================
CREATE OR REPLACE VIEW bi_margen_ventas AS
SELECT
  fl.factura_id,
  f.empresa_id,
  to_char(f.fecha::date, 'YYYY-MM')   AS periodo,
  fl.producto_id,
  fl.descripcion,
  p.familia,
  p.cuenta_ventas,
  fl.cantidad,
  fl.precio_unitario                   AS pvp_facturado,
  COALESCE(p.precio_compra, 0)         AS coste_unitario,
  fl.descuento,
  fl.subtotal                          AS ingreso_neto,
  -- Margen bruto en €
  round(fl.cantidad * (fl.precio_unitario * (1 - fl.descuento/100) - COALESCE(p.precio_compra, 0)), 2) AS margen_bruto_eur,
  -- Margen bruto en %
  CASE
    WHEN fl.precio_unitario > 0 AND COALESCE(p.precio_compra, 0) > 0
    THEN round((fl.precio_unitario * (1 - fl.descuento/100) - p.precio_compra)
               / (fl.precio_unitario * (1 - fl.descuento/100)) * 100, 2)
    ELSE NULL
  END AS margen_bruto_pct,
  f.cliente_nombre
FROM factura_lineas fl
JOIN facturas f ON f.id = fl.factura_id
LEFT JOIN products p ON p.id = fl.producto_id
WHERE f.estado <> 'anulada';

-- ============================================================
-- 11.4  Vista: rentabilidad por producto (resumen)
-- ============================================================
CREATE OR REPLACE VIEW bi_rentabilidad_producto AS
SELECT
  p.id                                     AS producto_id,
  mv.empresa_id,
  p.name                                   AS producto_nombre,
  p.reference,
  p.category                               AS categoria,
  p.familia,
  p.precio_compra                          AS coste_actual,
  COALESCE(p.pvp, p.price)                AS pvp_actual,
  p.margen_bruto_pct                       AS margen_actual_pct,
  COUNT(DISTINCT mv.factura_id)            AS num_facturas,
  COALESCE(SUM(mv.cantidad), 0)            AS unidades_vendidas,
  COALESCE(SUM(mv.ingreso_neto), 0)        AS ingreso_total,
  COALESCE(SUM(mv.margen_bruto_eur), 0)    AS margen_bruto_total,
  CASE
    WHEN SUM(mv.ingreso_neto) > 0
    THEN round(SUM(mv.margen_bruto_eur) / SUM(mv.ingreso_neto) * 100, 2)
    ELSE 0
  END AS margen_medio_pct
FROM products p
LEFT JOIN bi_margen_ventas mv ON mv.producto_id = p.id
GROUP BY p.id, mv.empresa_id, p.name, p.reference, p.category, p.familia,
         p.precio_compra, p.pvp, p.price, p.margen_bruto_pct;

-- ============================================================
-- 11.5  Vista: margen neto = margen bruto - gastos empresa prorrateados
-- ============================================================
CREATE OR REPLACE VIEW bi_margen_neto_empresa AS
WITH gastos_mes AS (
  SELECT empresa_id, to_char(fecha, 'YYYY-MM') AS periodo,
         SUM(base_imponible) AS gastos_totales
  FROM gastos WHERE estado <> 'anulado'
  GROUP BY empresa_id, to_char(fecha, 'YYYY-MM')
),
nominas_mes AS (
  SELECT empresa_id, periodo,
         SUM(coste_total_empresa) AS gastos_nominas
  FROM nominas WHERE estado IN ('confirmada','pagada')
  GROUP BY empresa_id, periodo
),
ventas_mes AS (
  SELECT empresa_id, periodo,
         SUM(ingreso_neto)     AS ventas,
         SUM(margen_bruto_eur) AS margen_bruto
  FROM bi_margen_ventas
  GROUP BY empresa_id, periodo
)
SELECT
  vm.empresa_id,
  vm.periodo,
  COALESCE(vm.ventas, 0)                           AS ventas,
  COALESCE(vm.margen_bruto, 0)                     AS margen_bruto,
  COALESCE(gm.gastos_totales, 0)                   AS gastos_operativos,
  COALESCE(nm.gastos_nominas, 0)                   AS gastos_personal,
  COALESCE(gm.gastos_totales, 0)
    + COALESCE(nm.gastos_nominas, 0)               AS gastos_totales,
  COALESCE(vm.margen_bruto, 0)
    - COALESCE(gm.gastos_totales, 0)
    - COALESCE(nm.gastos_nominas, 0)               AS resultado_neto,
  CASE
    WHEN COALESCE(vm.ventas, 0) > 0
    THEN round((COALESCE(vm.margen_bruto, 0)
                - COALESCE(gm.gastos_totales, 0)
                - COALESCE(nm.gastos_nominas, 0))
               / vm.ventas * 100, 2)
    ELSE 0
  END AS margen_neto_pct
FROM ventas_mes vm
LEFT JOIN gastos_mes  gm ON gm.empresa_id = vm.empresa_id AND gm.periodo = vm.periodo
LEFT JOIN nominas_mes nm ON nm.empresa_id = vm.empresa_id AND nm.periodo = vm.periodo;

-- ============================================================
-- 11.6  Ampliar tabla factura_lineas con producto_id si falta
-- ============================================================
ALTER TABLE factura_lineas
  ADD COLUMN IF NOT EXISTS producto_id  uuid,
  ADD COLUMN IF NOT EXISTS categoria    text,
  ADD COLUMN IF NOT EXISTS descuento    numeric(5,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 11.7  PGC ESPAÑOL COMPLETO (actualizado 2024)
--       Amplía el seed existente con cuentas faltantes
-- ============================================================
CREATE OR REPLACE FUNCTION seed_pgc_completo(p_empresa_id uuid)
RETURNS void AS $$
BEGIN
  -- Usa ON CONFLICT DO NOTHING para no duplicar cuentas existentes
  INSERT INTO plan_cuentas (empresa_id, codigo, nombre, grupo, naturaleza, tipo, nivel, es_pgc)
  VALUES
  -- ── GRUPO 1: Financiación básica ───────────────────────────────────────────
  (p_empresa_id,'1',  'Financiación básica',               1,'H','neto',   1,true),
  (p_empresa_id,'10', 'Capital',                           1,'H','neto',   2,true),
  (p_empresa_id,'100','Capital social',                    1,'H','neto',   3,true),
  (p_empresa_id,'101','Fondo social',                      1,'H','neto',   3,true),
  (p_empresa_id,'102','Capital',                           1,'H','neto',   3,true),
  (p_empresa_id,'11', 'Reservas y otros instrumentos de patrimonio neto',1,'H','neto',2,true),
  (p_empresa_id,'112','Reserva legal',                     1,'H','neto',   3,true),
  (p_empresa_id,'113','Reservas voluntarias',              1,'H','neto',   3,true),
  (p_empresa_id,'114','Reservas especiales',               1,'H','neto',   3,true),
  (p_empresa_id,'118','Aportaciones de socios o propietarios',1,'H','neto',3,true),
  (p_empresa_id,'119','Diferencias por ajuste del capital a euros',1,'H','neto',3,true),
  (p_empresa_id,'12', 'Resultados pendientes de aplicación',1,'H','neto',  2,true),
  (p_empresa_id,'120','Remanente',                         1,'H','neto',   3,true),
  (p_empresa_id,'121','Resultados negativos de ejercicios anteriores',1,'D','neto',3,true),
  (p_empresa_id,'129','Resultado del ejercicio',           1,'H','neto',   3,true),
  (p_empresa_id,'13', 'Subvenciones, donaciones y ajustes por cambios de valor',1,'H','neto',2,true),
  (p_empresa_id,'130','Subvenciones oficiales de capital', 1,'H','neto',   3,true),
  (p_empresa_id,'131','Donaciones y legados de capital',   1,'H','neto',   3,true),
  (p_empresa_id,'14', 'Provisiones',                       1,'H','pasivo', 2,true),
  (p_empresa_id,'141','Provisión para impuestos',          1,'H','pasivo', 3,true),
  (p_empresa_id,'142','Provisión para otras responsabilidades',1,'H','pasivo',3,true),
  (p_empresa_id,'143','Provisión por desmantelamiento, retiro o rehabilitación del inmovilizado',1,'H','pasivo',3,true),
  (p_empresa_id,'15', 'Deudas a largo plazo con características especiales',1,'H','pasivo',2,true),
  (p_empresa_id,'17', 'Deudas a largo plazo por préstamos recibidos y otros conceptos',1,'H','pasivo',2,true),
  (p_empresa_id,'170','Deudas a largo plazo con entidades de crédito',1,'H','pasivo',3,true),
  (p_empresa_id,'171','Deudas a largo plazo',              1,'H','pasivo', 3,true),
  (p_empresa_id,'173','Proveedores de inmovilizado a largo plazo',1,'H','pasivo',3,true),
  (p_empresa_id,'174','Acreedores por arrendamiento financiero a largo plazo',1,'H','pasivo',3,true),
  (p_empresa_id,'175','Efectos a pagar a largo plazo',     1,'H','pasivo', 3,true),
  (p_empresa_id,'18', 'Fianzas y depósitos recibidos a largo plazo',1,'H','pasivo',2,true),
  (p_empresa_id,'180','Fianzas recibidas a largo plazo',   1,'H','pasivo', 3,true),
  (p_empresa_id,'19', 'Situaciones transitorias de financiación',1,'H','pasivo',2,true),
  -- ── GRUPO 2: Activo no corriente ───────────────────────────────────────────
  (p_empresa_id,'2',  'Activo no corriente',               2,'D','activo', 1,true),
  (p_empresa_id,'20', 'Inmovilizaciones intangibles',      2,'D','activo', 2,true),
  (p_empresa_id,'200','Investigación',                     2,'D','activo', 3,true),
  (p_empresa_id,'201','Desarrollo',                        2,'D','activo', 3,true),
  (p_empresa_id,'202','Concesiones administrativas',       2,'D','activo', 3,true),
  (p_empresa_id,'203','Propiedad industrial',              2,'D','activo', 3,true),
  (p_empresa_id,'205','Derechos de traspaso',              2,'D','activo', 3,true),
  (p_empresa_id,'206','Aplicaciones informáticas',        2,'D','activo', 3,true),
  (p_empresa_id,'21', 'Inmovilizaciones materiales',       2,'D','activo', 2,true),
  (p_empresa_id,'210','Terrenos y bienes naturales',       2,'D','activo', 3,true),
  (p_empresa_id,'211','Construcciones',                    2,'D','activo', 3,true),
  (p_empresa_id,'212','Instalaciones técnicas',            2,'D','activo', 3,true),
  (p_empresa_id,'213','Maquinaria',                        2,'D','activo', 3,true),
  (p_empresa_id,'214','Utillaje',                          2,'D','activo', 3,true),
  (p_empresa_id,'215','Otras instalaciones',               2,'D','activo', 3,true),
  (p_empresa_id,'216','Mobiliario',                        2,'D','activo', 3,true),
  (p_empresa_id,'217','Equipos para procesos de información',2,'D','activo',3,true),
  (p_empresa_id,'218','Elementos de transporte',           2,'D','activo', 3,true),
  (p_empresa_id,'219','Otro inmovilizado material',        2,'D','activo', 3,true),
  (p_empresa_id,'22', 'Inversiones inmobiliarias',         2,'D','activo', 2,true),
  (p_empresa_id,'220','Inversiones en terrenos y bienes naturales',2,'D','activo',3,true),
  (p_empresa_id,'221','Inversiones en construcciones',     2,'D','activo', 3,true),
  (p_empresa_id,'23', 'Inmovilizaciones materiales en curso',2,'D','activo',2,true),
  (p_empresa_id,'230','Adaptación de terrenos y bienes naturales',2,'D','activo',3,true),
  (p_empresa_id,'231','Construcciones en curso',           2,'D','activo', 3,true),
  (p_empresa_id,'232','Instalaciones técnicas en montaje', 2,'D','activo', 3,true),
  (p_empresa_id,'237','Equipos para procesos de información en montaje',2,'D','activo',3,true),
  (p_empresa_id,'28', 'Amortización acumulada del inmovilizado',2,'H','activo',2,true),
  (p_empresa_id,'280','Amortización acumulada del inmovilizado intangible',2,'H','activo',3,true),
  (p_empresa_id,'281','Amortización acumulada del inmovilizado material',2,'H','activo',3,true),
  (p_empresa_id,'282','Amortización acumulada de las inversiones inmobiliarias',2,'H','activo',3,true),
  (p_empresa_id,'29', 'Deterioro de valor de activos no corrientes',2,'H','activo',2,true),
  -- ── GRUPO 3: Existencias ───────────────────────────────────────────────────
  (p_empresa_id,'3',  'Existencias',                       3,'D','activo', 1,true),
  (p_empresa_id,'30', 'Comerciales',                       3,'D','activo', 2,true),
  (p_empresa_id,'300','Mercaderías',                       3,'D','activo', 3,true),
  (p_empresa_id,'301','Materias primas',                   3,'D','activo', 3,true),
  (p_empresa_id,'31', 'Materias primas',                   3,'D','activo', 2,true),
  (p_empresa_id,'310','Materias primas',                   3,'D','activo', 3,true),
  (p_empresa_id,'32', 'Otros aprovisionamientos',          3,'D','activo', 2,true),
  (p_empresa_id,'320','Elementos y conjuntos incorporables',3,'D','activo', 3,true),
  (p_empresa_id,'321','Combustibles',                      3,'D','activo', 3,true),
  (p_empresa_id,'322','Repuestos',                         3,'D','activo', 3,true),
  (p_empresa_id,'325','Materiales diversos',               3,'D','activo', 3,true),
  (p_empresa_id,'326','Embalajes',                         3,'D','activo', 3,true),
  (p_empresa_id,'327','Envases',                           3,'D','activo', 3,true),
  (p_empresa_id,'328','Material de oficina',               3,'D','activo', 3,true),
  (p_empresa_id,'33', 'Productos en curso',                3,'D','activo', 2,true),
  (p_empresa_id,'35', 'Productos terminados',              3,'D','activo', 2,true),
  (p_empresa_id,'350','Productos terminados',              3,'D','activo', 3,true),
  (p_empresa_id,'39', 'Deterioro de valor de las existencias',3,'H','activo',2,true),
  (p_empresa_id,'390','Deterioro del valor de las mercaderías',3,'H','activo',3,true),
  (p_empresa_id,'391','Deterioro de valor de las materias primas',3,'H','activo',3,true),
  -- ── GRUPO 4: Acreedores y deudores ────────────────────────────────────────
  (p_empresa_id,'4',  'Acreedores y deudores por operaciones comerciales',4,'H','mixto',1,true),
  (p_empresa_id,'40', 'Proveedores',                       4,'H','pasivo', 2,true),
  (p_empresa_id,'400','Proveedores',                       4,'H','pasivo', 3,true),
  (p_empresa_id,'401','Proveedores, efectos comerciales a pagar',4,'H','pasivo',3,true),
  (p_empresa_id,'403','Proveedores, empresas del grupo',   4,'H','pasivo', 3,true),
  (p_empresa_id,'404','Proveedores, empresas asociadas',   4,'H','pasivo', 3,true),
  (p_empresa_id,'405','Proveedores, otras partes vinculadas',4,'H','pasivo',3,true),
  (p_empresa_id,'406','Envases y embalajes a devolver a proveedores',4,'H','pasivo',3,true),
  (p_empresa_id,'407','Anticipos a proveedores',           4,'D','activo', 3,true),
  (p_empresa_id,'41', 'Acreedores varios',                 4,'H','pasivo', 2,true),
  (p_empresa_id,'410','Acreedores por prestaciones de servicios',4,'H','pasivo',3,true),
  (p_empresa_id,'411','Acreedores, efectos comerciales a pagar',4,'H','pasivo',3,true),
  (p_empresa_id,'419','Acreedores por operaciones en común',4,'H','pasivo',3,true),
  (p_empresa_id,'43', 'Clientes',                          4,'D','activo', 2,true),
  (p_empresa_id,'430','Clientes',                          4,'D','activo', 3,true),
  (p_empresa_id,'431','Clientes, efectos comerciales a cobrar',4,'D','activo',3,true),
  (p_empresa_id,'432','Clientes, operaciones de factoring',4,'D','activo', 3,true),
  (p_empresa_id,'433','Clientes, empresas del grupo',      4,'D','activo', 3,true),
  (p_empresa_id,'434','Clientes, empresas asociadas',      4,'D','activo', 3,true),
  (p_empresa_id,'435','Clientes, otras partes vinculadas', 4,'D','activo', 3,true),
  (p_empresa_id,'436','Clientes de dudoso cobro',          4,'D','activo', 3,true),
  (p_empresa_id,'437','Envases y embalajes a devolver por clientes',4,'H','pasivo',3,true),
  (p_empresa_id,'438','Anticipos de clientes',             4,'H','pasivo', 3,true),
  (p_empresa_id,'44', 'Deudores varios',                   4,'D','activo', 2,true),
  (p_empresa_id,'440','Deudores',                          4,'D','activo', 3,true),
  (p_empresa_id,'441','Deudores, efectos comerciales a cobrar',4,'D','activo',3,true),
  (p_empresa_id,'46', 'Personal',                          4,'D','activo', 2,true),
  (p_empresa_id,'460','Anticipos de remuneraciones',       4,'D','activo', 3,true),
  (p_empresa_id,'465','Remuneraciones pendientes de pago', 4,'H','pasivo', 3,true),
  (p_empresa_id,'47', 'Administraciones Públicas',         4,'D','mixto',  2,true),
  (p_empresa_id,'470','Hacienda Pública, deudora por diversos conceptos',4,'D','activo',3,true),
  (p_empresa_id,'471','Organismos de la Seguridad Social, deudores',4,'D','activo',3,true),
  (p_empresa_id,'472','Hacienda Pública, IVA soportado',   4,'D','activo', 3,true),
  (p_empresa_id,'473','Hacienda Pública, retenciones y pagos a cuenta',4,'D','activo',3,true),
  (p_empresa_id,'474','Activos por impuesto diferido',     4,'D','activo', 3,true),
  (p_empresa_id,'475','Hacienda Pública, acreedora por conceptos fiscales',4,'H','pasivo',3,true),
  (p_empresa_id,'476','Organismos de la Seguridad Social, acreedores',4,'H','pasivo',3,true),
  (p_empresa_id,'477','Hacienda Pública, IVA repercutido', 4,'H','pasivo', 3,true),
  (p_empresa_id,'479','Pasivos por diferencias temporarias imponibles',4,'H','pasivo',3,true),
  (p_empresa_id,'48', 'Ajustes por periodificación',       4,'D','activo', 2,true),
  (p_empresa_id,'480','Gastos anticipados',                4,'D','activo', 3,true),
  (p_empresa_id,'485','Ingresos anticipados',              4,'H','pasivo', 3,true),
  -- ── GRUPO 5: Cuentas financieras ──────────────────────────────────────────
  (p_empresa_id,'5',  'Cuentas financieras',               5,'D','mixto',  1,true),
  (p_empresa_id,'52', 'Deudas a corto plazo por préstamos recibidos y otros',5,'H','pasivo',2,true),
  (p_empresa_id,'520','Deudas a corto plazo con entidades de crédito',5,'H','pasivo',3,true),
  (p_empresa_id,'521','Deudas a corto plazo',              5,'H','pasivo', 3,true),
  (p_empresa_id,'522','Deudas a corto plazo transformables en subvenciones',5,'H','pasivo',3,true),
  (p_empresa_id,'523','Proveedores de inmovilizado a corto plazo',5,'H','pasivo',3,true),
  (p_empresa_id,'524','Acreedores por arrendamiento financiero a corto plazo',5,'H','pasivo',3,true),
  (p_empresa_id,'525','Efectos a pagar a corto plazo',     5,'H','pasivo', 3,true),
  (p_empresa_id,'527','Intereses a corto plazo de deudas con entidades de crédito',5,'H','pasivo',3,true),
  (p_empresa_id,'53', 'Inversiones financieras a corto plazo en partes vinculadas',5,'D','activo',2,true),
  (p_empresa_id,'54', 'Otras inversiones financieras a corto plazo',5,'D','activo',2,true),
  (p_empresa_id,'55', 'Otras cuentas no bancarias',        5,'D','mixto',  2,true),
  (p_empresa_id,'551','Cuenta corriente con socios y administradores',5,'D','mixto',3,true),
  (p_empresa_id,'552','Cuenta corriente con otras personas y entidades vinculadas',5,'D','mixto',3,true),
  (p_empresa_id,'553','Cuenta corriente con otras empresas vinculadas',5,'D','mixto',3,true),
  (p_empresa_id,'556','Desembolsos exigidos sobre participaciones en el patrimonio neto',5,'H','pasivo',3,true),
  (p_empresa_id,'557','Dividendo activo a cuenta',         5,'D','activo', 3,true),
  (p_empresa_id,'558','Socios por desembolsos exigidos',   5,'D','activo', 3,true),
  (p_empresa_id,'56', 'Fianzas y depósitos recibidos y constituidos a corto plazo',5,'D','mixto',2,true),
  (p_empresa_id,'57', 'Tesorería',                         5,'D','activo', 2,true),
  (p_empresa_id,'570','Caja, euros',                       5,'D','activo', 3,true),
  (p_empresa_id,'571','Caja, moneda extranjera',           5,'D','activo', 3,true),
  (p_empresa_id,'572','Bancos e instituciones de crédito c/c vista, euros',5,'D','activo',3,true),
  (p_empresa_id,'573','Bancos e instituciones de crédito c/c vista, moneda extranjera',5,'D','activo',3,true),
  (p_empresa_id,'574','Bancos e instituciones de crédito, cuentas de ahorro, euros',5,'D','activo',3,true),
  (p_empresa_id,'58', 'Activos no corrientes mantenidos para la venta y grupos enajenables de elementos',5,'D','activo',2,true),
  (p_empresa_id,'59', 'Provisiones financieras a corto plazo',5,'H','pasivo',2,true),
  -- ── GRUPO 6: Compras y gastos ─────────────────────────────────────────────
  (p_empresa_id,'6',  'Compras y gastos',                  6,'D','gasto',  1,true),
  (p_empresa_id,'60', 'Compras',                           6,'D','gasto',  2,true),
  (p_empresa_id,'600','Compras de mercaderías',            6,'D','gasto',  3,true),
  (p_empresa_id,'601','Compras de materias primas',        6,'D','gasto',  3,true),
  (p_empresa_id,'602','Compras de otros aprovisionamientos',6,'D','gasto', 3,true),
  (p_empresa_id,'606','Descuentos sobre compras por pronto pago',6,'H','gasto',3,true),
  (p_empresa_id,'607','Trabajos realizados por otras empresas',6,'D','gasto',3,true),
  (p_empresa_id,'608','Devoluciones de compras y operaciones similares',6,'H','gasto',3,true),
  (p_empresa_id,'609','Rappels por compras',               6,'H','gasto',  3,true),
  (p_empresa_id,'61', 'Variación de existencias',          6,'D','gasto',  2,true),
  (p_empresa_id,'610','Variación de existencias de mercaderías',6,'D','gasto',3,true),
  (p_empresa_id,'611','Variación de existencias de materias primas',6,'D','gasto',3,true),
  (p_empresa_id,'612','Variación de existencias de otros aprovisionamientos',6,'D','gasto',3,true),
  (p_empresa_id,'62', 'Servicios exteriores',              6,'D','gasto',  2,true),
  (p_empresa_id,'620','Gastos en investigación y desarrollo del ejercicio',6,'D','gasto',3,true),
  (p_empresa_id,'621','Arrendamientos y cánones',          6,'D','gasto',  3,true),
  (p_empresa_id,'622','Reparaciones y conservación',       6,'D','gasto',  3,true),
  (p_empresa_id,'623','Servicios de profesionales independientes',6,'D','gasto',3,true),
  (p_empresa_id,'624','Transportes',                       6,'D','gasto',  3,true),
  (p_empresa_id,'625','Primas de seguros',                 6,'D','gasto',  3,true),
  (p_empresa_id,'626','Servicios bancarios y similares',   6,'D','gasto',  3,true),
  (p_empresa_id,'627','Publicidad, propaganda y relaciones públicas',6,'D','gasto',3,true),
  (p_empresa_id,'628','Suministros',                       6,'D','gasto',  3,true),
  (p_empresa_id,'629','Otros servicios',                   6,'D','gasto',  3,true),
  (p_empresa_id,'63', 'Tributos',                          6,'D','gasto',  2,true),
  (p_empresa_id,'630','Impuesto sobre beneficios',         6,'D','gasto',  3,true),
  (p_empresa_id,'631','Otros tributos',                    6,'D','gasto',  3,true),
  (p_empresa_id,'632','IVA no deducible',                  6,'D','gasto',  3,true),
  (p_empresa_id,'634','Ajustes negativos en la imposición sobre beneficios',6,'D','gasto',3,true),
  (p_empresa_id,'636','Devolución de impuestos',           6,'H','gasto',  3,true),
  (p_empresa_id,'64', 'Gastos de personal',                6,'D','gasto',  2,true),
  (p_empresa_id,'640','Sueldos y salarios',                6,'D','gasto',  3,true),
  (p_empresa_id,'641','Indemnizaciones',                   6,'D','gasto',  3,true),
  (p_empresa_id,'642','Seguridad Social a cargo de la empresa',6,'D','gasto',3,true),
  (p_empresa_id,'643','Retribuciones a largo plazo mediante sistemas de aportación definida',6,'D','gasto',3,true),
  (p_empresa_id,'644','Retribuciones a largo plazo mediante sistemas de prestación definida',6,'D','gasto',3,true),
  (p_empresa_id,'645','Retribuciones al personal mediante instrumentos de patrimonio',6,'D','gasto',3,true),
  (p_empresa_id,'649','Otros gastos sociales',             6,'D','gasto',  3,true),
  (p_empresa_id,'65', 'Otros gastos de gestión',           6,'D','gasto',  2,true),
  (p_empresa_id,'650','Pérdidas de créditos comerciales incobrables',6,'D','gasto',3,true),
  (p_empresa_id,'651','Resultados de operaciones en común',6,'D','gasto',  3,true),
  (p_empresa_id,'659','Otras pérdidas en gestión corriente',6,'D','gasto', 3,true),
  (p_empresa_id,'66', 'Gastos financieros',                6,'D','gasto',  2,true),
  (p_empresa_id,'660','Gastos financieros por actualización de provisiones',6,'D','gasto',3,true),
  (p_empresa_id,'661','Intereses de obligaciones y bonos',6,'D','gasto',  3,true),
  (p_empresa_id,'662','Intereses de deudas',               6,'D','gasto',  3,true),
  (p_empresa_id,'663','Intereses por descuento de efectos y operaciones de factoring',6,'D','gasto',3,true),
  (p_empresa_id,'664','Dividendos de acciones o participaciones consideradas como pasivos financieros',6,'D','gasto',3,true),
  (p_empresa_id,'665','Descuentos sobre ventas por pronto pago',6,'D','gasto',3,true),
  (p_empresa_id,'666','Pérdidas en participaciones y valores representativos de deuda',6,'D','gasto',3,true),
  (p_empresa_id,'667','Pérdidas de créditos no comerciales',6,'D','gasto', 3,true),
  (p_empresa_id,'668','Diferencias negativas de cambio',   6,'D','gasto',  3,true),
  (p_empresa_id,'669','Otros gastos financieros',          6,'D','gasto',  3,true),
  (p_empresa_id,'67', 'Pérdidas procedentes de activos no corrientes',6,'D','gasto',2,true),
  (p_empresa_id,'670','Pérdidas procedentes del inmovilizado intangible',6,'D','gasto',3,true),
  (p_empresa_id,'671','Pérdidas procedentes del inmovilizado material',6,'D','gasto',3,true),
  (p_empresa_id,'672','Pérdidas procedentes de las inversiones inmobiliarias',6,'D','gasto',3,true),
  (p_empresa_id,'678','Gastos excepcionales',              6,'D','gasto',  3,true),
  (p_empresa_id,'68', 'Dotaciones para amortizaciones',    6,'D','gasto',  2,true),
  (p_empresa_id,'680','Amortización del inmovilizado intangible',6,'D','gasto',3,true),
  (p_empresa_id,'681','Amortización del inmovilizado material',6,'D','gasto',3,true),
  (p_empresa_id,'682','Amortización de las inversiones inmobiliarias',6,'D','gasto',3,true),
  (p_empresa_id,'69', 'Pérdidas por deterioro y otras dotaciones',6,'D','gasto',2,true),
  (p_empresa_id,'690','Pérdidas por deterioro del inmovilizado intangible',6,'D','gasto',3,true),
  (p_empresa_id,'691','Pérdidas por deterioro del inmovilizado material',6,'D','gasto',3,true),
  (p_empresa_id,'692','Pérdidas por deterioro de las inversiones inmobiliarias',6,'D','gasto',3,true),
  (p_empresa_id,'693','Pérdidas por deterioro de existencias',6,'D','gasto',3,true),
  (p_empresa_id,'694','Pérdidas por deterioro de créditos por operaciones comerciales',6,'D','gasto',3,true),
  (p_empresa_id,'695','Dotación a la provisión para riesgos y gastos',6,'D','gasto',3,true),
  (p_empresa_id,'696','Pérdidas por deterioro de participaciones y valores representativos de deuda a largo plazo',6,'D','gasto',3,true),
  (p_empresa_id,'697','Pérdidas por deterioro de créditos a largo plazo',6,'D','gasto',3,true),
  (p_empresa_id,'698','Pérdidas por deterioro de participaciones y valores representativos de deuda a corto plazo',6,'D','gasto',3,true),
  (p_empresa_id,'699','Pérdidas por deterioro de créditos a corto plazo',6,'D','gasto',3,true),
  -- ── GRUPO 7: Ventas e ingresos ────────────────────────────────────────────
  (p_empresa_id,'7',  'Ventas e ingresos',                 7,'H','ingreso',1,true),
  (p_empresa_id,'70', 'Ventas de mercaderías, de producción propia, de servicios',7,'H','ingreso',2,true),
  (p_empresa_id,'700','Ventas de mercaderías',             7,'H','ingreso',3,true),
  (p_empresa_id,'701','Ventas de productos terminados',    7,'H','ingreso',3,true),
  (p_empresa_id,'702','Ventas de productos semiterminados',7,'H','ingreso',3,true),
  (p_empresa_id,'703','Ventas de subproductos y residuos', 7,'H','ingreso',3,true),
  (p_empresa_id,'704','Ventas de envases y embalajes',     7,'H','ingreso',3,true),
  (p_empresa_id,'705','Prestaciones de servicios',        7,'H','ingreso',3,true),
  (p_empresa_id,'706','Descuentos sobre ventas por pronto pago',7,'D','ingreso',3,true),
  (p_empresa_id,'708','Devoluciones de ventas y operaciones similares',7,'D','ingreso',3,true),
  (p_empresa_id,'709','Rappels sobre ventas',              7,'D','ingreso',3,true),
  (p_empresa_id,'71', 'Variación de existencias',          7,'H','ingreso',2,true),
  (p_empresa_id,'710','Variación de existencias de productos en curso',7,'H','ingreso',3,true),
  (p_empresa_id,'711','Variación de existencias de productos semiterminados',7,'H','ingreso',3,true),
  (p_empresa_id,'712','Variación de existencias de productos terminados',7,'H','ingreso',3,true),
  (p_empresa_id,'713','Variación de existencias de subproductos, residuos y materiales recuperados',7,'H','ingreso',3,true),
  (p_empresa_id,'73', 'Trabajos realizados para la empresa',7,'H','ingreso',2,true),
  (p_empresa_id,'730','Trabajos realizados para el inmovilizado intangible',7,'H','ingreso',3,true),
  (p_empresa_id,'731','Trabajos realizados para el inmovilizado material',7,'H','ingreso',3,true),
  (p_empresa_id,'74', 'Subvenciones, donaciones y legados',7,'H','ingreso',2,true),
  (p_empresa_id,'740','Subvenciones, donaciones y legados a la explotación',7,'H','ingreso',3,true),
  (p_empresa_id,'741','Subvenciones oficiales a la explotación',7,'H','ingreso',3,true),
  (p_empresa_id,'75', 'Otros ingresos de gestión',         7,'H','ingreso',2,true),
  (p_empresa_id,'751','Resultados de operaciones en común',7,'H','ingreso',3,true),
  (p_empresa_id,'752','Ingresos por arrendamientos',       7,'H','ingreso',3,true),
  (p_empresa_id,'753','Ingresos de propiedad industrial cedida en explotación',7,'H','ingreso',3,true),
  (p_empresa_id,'754','Ingresos por comisiones',           7,'H','ingreso',3,true),
  (p_empresa_id,'755','Ingresos por servicios al personal',7,'H','ingreso',3,true),
  (p_empresa_id,'759','Ingresos por servicios diversos',   7,'H','ingreso',3,true),
  (p_empresa_id,'76', 'Ingresos financieros',              7,'H','ingreso',2,true),
  (p_empresa_id,'760','Ingresos de participaciones en instrumentos de patrimonio',7,'H','ingreso',3,true),
  (p_empresa_id,'761','Ingresos de valores representativos de deuda',7,'H','ingreso',3,true),
  (p_empresa_id,'762','Ingresos de créditos',              7,'H','ingreso',3,true),
  (p_empresa_id,'763','Beneficios por valoración de instrumentos financieros por su valor razonable',7,'H','ingreso',3,true),
  (p_empresa_id,'765','Descuentos sobre compras por pronto pago',7,'H','ingreso',3,true),
  (p_empresa_id,'768','Diferencias positivas de cambio',   7,'H','ingreso',3,true),
  (p_empresa_id,'769','Otros ingresos financieros',        7,'H','ingreso',3,true),
  (p_empresa_id,'77', 'Beneficios procedentes de activos no corrientes',7,'H','ingreso',2,true),
  (p_empresa_id,'770','Beneficios procedentes del inmovilizado intangible',7,'H','ingreso',3,true),
  (p_empresa_id,'771','Beneficios procedentes del inmovilizado material',7,'H','ingreso',3,true),
  (p_empresa_id,'772','Beneficios procedentes de las inversiones inmobiliarias',7,'H','ingreso',3,true),
  (p_empresa_id,'778','Ingresos excepcionales',            7,'H','ingreso',3,true),
  (p_empresa_id,'79', 'Excesos y aplicaciones de provisiones',7,'H','ingreso',2,true),
  (p_empresa_id,'790','Reversión del deterioro del inmovilizado intangible',7,'H','ingreso',3,true),
  (p_empresa_id,'791','Reversión del deterioro del inmovilizado material',7,'H','ingreso',3,true),
  (p_empresa_id,'794','Reversión del deterioro de créditos por operaciones comerciales',7,'H','ingreso',3,true),
  (p_empresa_id,'795','Exceso de provisión para riesgos y gastos',7,'H','ingreso',3,true)
  ON CONFLICT (empresa_id, codigo) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11.8  Vista: producto con todas sus cuentas PGC resueltas
-- ============================================================
CREATE OR REPLACE VIEW productos_con_cuentas AS
SELECT
  p.id, p.name, p.reference, p.price, p.precio_compra,
  COALESCE(p.pvp, p.price) AS pvp_efectivo,
  p.margen_bruto_pct,
  p.familia, p.activo,
  p.cuenta_ventas,      cv.nombre  AS nombre_cuenta_ventas,
  p.cuenta_compras,     cc.nombre  AS nombre_cuenta_compras,
  p.cuenta_existencias, ce.nombre  AS nombre_cuenta_existencias
FROM products p
LEFT JOIN plan_cuentas cv ON cv.codigo = p.cuenta_ventas
LEFT JOIN plan_cuentas cc ON cc.codigo = p.cuenta_compras
LEFT JOIN plan_cuentas ce ON ce.codigo = p.cuenta_existencias;
