-- ============================================================
-- PASO 8 — BUSINESS INTELLIGENCE & ANALYTICS
-- Portal Pedidos DM — Digital Market
-- ============================================================

-- ============================================================
-- 8.1  VISTA: Ventas mensuales por empresa
-- ============================================================
CREATE OR REPLACE VIEW bi_ventas_mensual AS
SELECT
  empresa_id,
  to_char(fecha::date, 'YYYY-MM')      AS periodo,
  COUNT(*)                             AS num_facturas,
  SUM(base_imponible)                  AS base_total,
  SUM(iva)                             AS iva_total,
  SUM(total)                           AS total_facturado,
  SUM(CASE WHEN estado = 'cobrada' THEN total ELSE 0 END) AS total_cobrado,
  SUM(CASE WHEN estado <> 'cobrada' AND estado <> 'anulada'
           THEN total ELSE 0 END)      AS total_pendiente
FROM facturas
WHERE estado <> 'anulada'
GROUP BY empresa_id, to_char(fecha::date, 'YYYY-MM');

-- ============================================================
-- 8.2  VISTA: Top clientes por facturación
-- ============================================================
CREATE OR REPLACE VIEW bi_top_clientes AS
SELECT
  empresa_id,
  cliente_id,
  cliente_nombre,
  COUNT(*)                 AS num_facturas,
  SUM(total)               AS total_facturado,
  SUM(CASE WHEN estado = 'cobrada' THEN total ELSE 0 END) AS total_cobrado,
  MAX(fecha::date)         AS ultima_factura
FROM facturas
WHERE estado <> 'anulada'
GROUP BY empresa_id, cliente_id, cliente_nombre;

-- ============================================================
-- 8.3  VISTA: Estado cartera (cobros pendientes)
-- ============================================================
CREATE OR REPLACE VIEW bi_cartera_cobros AS
SELECT
  empresa_id,
  id                  AS factura_id,
  referencia,
  cliente_nombre,
  fecha::date         AS fecha_emision,
  COALESCE(fecha_vencimiento::date, (fecha::date + INTERVAL '30 days')::date) AS fecha_vencimiento,
  total,
  estado,
  -- Días de retraso (solo facturas vencidas y no cobradas)
  CASE
    WHEN estado NOT IN ('cobrada','anulada')
     AND COALESCE(fecha_vencimiento::date, (fecha::date + INTERVAL '30 days')::date) < CURRENT_DATE
    THEN (CURRENT_DATE - COALESCE(fecha_vencimiento::date, (fecha::date + INTERVAL '30 days')::date))
    ELSE 0
  END AS dias_retraso,
  CASE
    WHEN estado = 'cobrada' THEN 'cobrada'
    WHEN estado = 'anulada' THEN 'anulada'
    WHEN COALESCE(fecha_vencimiento::date, (fecha::date + INTERVAL '30 days')::date) < CURRENT_DATE THEN 'vencida'
    WHEN COALESCE(fecha_vencimiento::date, (fecha::date + INTERVAL '30 days')::date) <= CURRENT_DATE + INTERVAL '7 days' THEN 'vence_pronto'
    ELSE 'al_dia'
  END AS situacion
FROM facturas
WHERE estado <> 'anulada';

-- ============================================================
-- 8.4  VISTA: Cuenta de resultados simplificada por mes
-- ============================================================
CREATE OR REPLACE VIEW bi_cuenta_resultados AS
WITH ingresos AS (
  SELECT empresa_id,
         to_char(fecha::date, 'YYYY-MM') AS periodo,
         SUM(base_imponible) AS ingresos
  FROM facturas
  WHERE estado <> 'anulada'
  GROUP BY empresa_id, to_char(fecha::date, 'YYYY-MM')
),
gastos_nominas AS (
  SELECT empresa_id,
         periodo,
         SUM(coste_total_empresa) AS gastos_nominas
  FROM nominas
  WHERE estado IN ('confirmada','pagada')
  GROUP BY empresa_id, periodo
)
SELECT
  COALESCE(i.empresa_id, gn.empresa_id) AS empresa_id,
  COALESCE(i.periodo,    gn.periodo)    AS periodo,
  COALESCE(i.ingresos,        0) AS ingresos,
  0::numeric                            AS gastos_compras,
  COALESCE(gn.gastos_nominas, 0) AS gastos_nominas,
  COALESCE(i.ingresos, 0) - COALESCE(gn.gastos_nominas, 0) AS resultado
FROM ingresos i
FULL OUTER JOIN gastos_nominas gn
  ON i.empresa_id = gn.empresa_id
  AND i.periodo = gn.periodo;

-- ============================================================
-- 8.5  VISTA: Funnel presupuestos → pedidos → facturas
-- ============================================================
CREATE OR REPLACE VIEW bi_funnel_ventas AS
SELECT
  p.empresa_id,
  to_char(CURRENT_DATE, 'YYYY')          AS año,
  COUNT(DISTINCT p.id)                   AS presupuestos,
  COUNT(DISTINCT pv.id)                  AS pedidos,
  COUNT(DISTINCT f.id)                   AS facturas,
  COALESCE(SUM(DISTINCT p.total), 0)     AS importe_presupuestado,
  COALESCE(SUM(DISTINCT f.total), 0)     AS importe_facturado,
  CASE WHEN COUNT(DISTINCT p.id) > 0
    THEN round(COUNT(DISTINCT pv.id)::numeric / COUNT(DISTINCT p.id) * 100, 1)
    ELSE 0
  END AS conversion_pct
FROM presupuestos p
LEFT JOIN pedidos_venta pv ON pv.presupuesto_id = p.id
LEFT JOIN facturas f ON f.presupuesto_id = p.id OR f.pedido_venta_id = pv.id
WHERE extract(year FROM p.fecha::date) = extract(year FROM CURRENT_DATE)
GROUP BY p.empresa_id;

-- ============================================================
-- 8.6  VISTA: KPI resumen empresa (un registro por empresa)
-- ============================================================
CREATE OR REPLACE VIEW bi_kpi_empresa AS
WITH mes_actual AS (
  SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS periodo
),
ventas_mes AS (
  SELECT empresa_id, SUM(total) AS ventas_mes, COUNT(*) AS facturas_mes
  FROM facturas, mes_actual
  WHERE estado <> 'anulada'
    AND to_char(fecha::date, 'YYYY-MM') = periodo
  GROUP BY empresa_id
),
ventas_año AS (
  SELECT empresa_id, SUM(total) AS ventas_año
  FROM facturas
  WHERE estado <> 'anulada'
    AND extract(year FROM fecha::date) = extract(year FROM CURRENT_DATE)
  GROUP BY empresa_id
),
cobros_pendientes AS (
  SELECT empresa_id,
         SUM(total) AS pendiente_cobro,
         SUM(CASE WHEN situacion = 'vencida' THEN total ELSE 0 END) AS vencido
  FROM bi_cartera_cobros
  WHERE situacion NOT IN ('cobrada','anulada')
  GROUP BY empresa_id
),
mrr AS (
  SELECT empresa_id, SUM(
    CASE frecuencia
      WHEN 'mensual'    THEN importe_base
      WHEN 'trimestral' THEN round(importe_base / 3, 2)
      WHEN 'semestral'  THEN round(importe_base / 6, 2)
      WHEN 'anual'      THEN round(importe_base / 12, 2)
    END
  ) AS mrr
  FROM contratos_recurrentes
  WHERE estado = 'activo'
  GROUP BY empresa_id
),
emp_activos AS (
  SELECT empresa_id, COUNT(*) AS num_empleados
  FROM empleados
  WHERE estado = 'activo'
  GROUP BY empresa_id
)
SELECT
  e.empresa_id,
  COALESCE(vm.ventas_mes, 0)         AS ventas_mes,
  COALESCE(vm.facturas_mes, 0)       AS facturas_mes,
  COALESCE(va.ventas_año, 0)         AS ventas_año,
  COALESCE(cp.pendiente_cobro, 0)    AS pendiente_cobro,
  COALESCE(cp.vencido, 0)            AS cobros_vencidos,
  COALESCE(m.mrr, 0)                 AS mrr,
  COALESCE(ea.num_empleados, 0)      AS num_empleados
FROM (SELECT DISTINCT empresa_id FROM facturas) e
LEFT JOIN ventas_mes      vm ON vm.empresa_id = e.empresa_id
LEFT JOIN ventas_año      va ON va.empresa_id = e.empresa_id
LEFT JOIN cobros_pendientes cp ON cp.empresa_id = e.empresa_id
LEFT JOIN mrr              m  ON m.empresa_id  = e.empresa_id
LEFT JOIN emp_activos      ea ON ea.empresa_id = e.empresa_id;

-- ============================================================
-- 8.7  VISTA: Actividad comercial (presupuestos pendientes)
-- ============================================================
CREATE OR REPLACE VIEW bi_pipeline_comercial AS
SELECT
  empresa_id,
  estado,
  COUNT(*)     AS num_presupuestos,
  SUM(total)   AS importe_total,
  AVG(total)   AS ticket_medio,
  MIN(fecha::date) AS mas_antiguo
FROM presupuestos
WHERE fecha::date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY empresa_id, estado;
