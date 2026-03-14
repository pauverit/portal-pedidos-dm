-- ============================================================
-- PASO 13 — MATERIALES: TRAZABILIDAD COMPLETA DE DOCUMENTOS
-- Portal Pedidos DM — Digital Market
-- ============================================================
-- Consolida en una sola vista todos los documentos donde aparece
-- cada producto (presupuestos, pedidos, albaranes, facturas,
-- devoluciones, órdenes de compra, recepciones).
-- ============================================================

-- 13.1  Vista: trazabilidad por producto
-- ============================================================
CREATE OR REPLACE VIEW v_traza_producto AS

-- Presupuestos
SELECT
  'presupuesto'     AS tipo_doc,
  p.id              AS doc_id,
  p.referencia      AS referencia,
  p.empresa_id,
  p.cliente_nombre,
  p.fecha,
  p.estado,
  p.total,
  pl.producto_id,
  pl.cantidad,
  pl.precio_unitario,
  pl.subtotal
FROM presupuesto_lineas pl
JOIN presupuestos p ON p.id = pl.presupuesto_id
WHERE pl.producto_id IS NOT NULL

UNION ALL

-- Pedidos de venta
SELECT
  'pedido'          AS tipo_doc,
  pv.id, pv.referencia, pv.empresa_id, pv.cliente_nombre,
  pv.fecha, pv.estado, pv.total,
  pvl.producto_id, pvl.cantidad, pvl.precio_unitario, pvl.subtotal
FROM pedido_venta_lineas pvl
JOIN pedidos_venta pv ON pv.id = pvl.pedido_venta_id
WHERE pvl.producto_id IS NOT NULL

UNION ALL

-- Albaranes
SELECT
  'albaran'         AS tipo_doc,
  a.id, a.referencia, a.empresa_id, a.cliente_nombre,
  a.fecha, a.estado, NULL::numeric AS total,
  al.producto_id, al.cantidad, al.precio_unitario, al.subtotal
FROM albaran_lineas al
JOIN albaranes a ON a.id = al.albaran_id
WHERE al.producto_id IS NOT NULL

UNION ALL

-- Facturas
SELECT
  'factura'         AS tipo_doc,
  f.id, f.referencia, f.empresa_id, f.cliente_nombre,
  f.fecha, f.estado, f.total,
  fl.producto_id, fl.cantidad, fl.precio_unitario, fl.subtotal
FROM factura_lineas fl
JOIN facturas f ON f.id = fl.factura_id
WHERE fl.producto_id IS NOT NULL

UNION ALL

-- Devoluciones (requiere PASO 12)
SELECT
  'devolucion'      AS tipo_doc,
  d.id, d.referencia, d.empresa_id, d.cliente_nombre,
  d.fecha, d.estado, d.total,
  dl.producto_id, dl.cantidad, dl.precio_unitario, dl.subtotal
FROM devolucion_lineas dl
JOIN devoluciones_venta d ON d.id = dl.devolucion_id
WHERE dl.producto_id IS NOT NULL

UNION ALL

-- Órdenes de compra
SELECT
  'compra'          AS tipo_doc,
  pc.id, pc.referencia, pc.empresa_id,
  pc.proveedor_nombre AS cliente_nombre,
  pc.fecha, pc.estado, pc.total,
  pcl.producto_id, pcl.cantidad, pcl.precio_unitario, pcl.subtotal
FROM pedido_compra_lineas pcl
JOIN pedidos_compra pc ON pc.id = pcl.pedido_compra_id
WHERE pcl.producto_id IS NOT NULL

UNION ALL

-- Recepciones (precio_coste en lugar de precio_unitario)
SELECT
  'recepcion'       AS tipo_doc,
  r.id, r.referencia, r.empresa_id,
  r.proveedor_nombre AS cliente_nombre,
  r.fecha, r.estado, NULL::numeric AS total,
  rl.producto_id, rl.cantidad, rl.precio_coste AS precio_unitario, rl.subtotal
FROM recepcion_lineas rl
JOIN recepciones r ON r.id = rl.recepcion_id
WHERE rl.producto_id IS NOT NULL;

-- ============================================================
-- 13.2  Vista: stock consolidado por producto y almacén
-- ============================================================
CREATE OR REPLACE VIEW v_stock_producto AS
SELECT
  s.producto_id,
  s.almacen_id,
  al.nombre        AS almacen_nombre,
  al.codigo        AS almacen_tipo,
  s.cantidad,
  s.pmp,
  s.updated_at
FROM stock s
JOIN almacenes al ON al.id = s.almacen_id
WHERE s.cantidad <> 0;
