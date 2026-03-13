-- ============================================================
-- PASO 3: Compras y Almacén
-- Digital Market (portal-pedidos-dm)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Proveedores ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proveedores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID REFERENCES empresas(id) ON DELETE RESTRICT,
  codigo        TEXT,                          -- PRO-0001
  nombre        TEXT NOT NULL,
  razon_social  TEXT,
  cif           TEXT,
  direccion     TEXT,
  cp            TEXT,
  ciudad        TEXT,
  provincia     TEXT,
  pais          TEXT DEFAULT 'España',
  telefono      TEXT,
  email         TEXT,
  web           TEXT,
  iban          TEXT,
  swift         TEXT,
  contacto      TEXT,                          -- nombre de contacto principal
  dias_pago     INTEGER DEFAULT 30,            -- plazo de pago habitual (días)
  notas         TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencia para código de proveedor
CREATE SEQUENCE IF NOT EXISTS proveedores_seq START 1;

-- ── Pedidos de Compra ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedidos_compra (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia       TEXT NOT NULL UNIQUE,       -- OC-0001
  empresa_id       UUID REFERENCES empresas(id) ON DELETE RESTRICT,
  delegacion_id    UUID REFERENCES delegaciones(id) ON DELETE SET NULL,
  almacen_id       UUID REFERENCES almacenes(id) ON DELETE SET NULL,
  proveedor_id     UUID REFERENCES proveedores(id) ON DELETE RESTRICT,
  proveedor_nombre TEXT,
  fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega    DATE,
  estado           TEXT NOT NULL DEFAULT 'borrador'
                     CHECK (estado IN ('borrador','confirmado','enviado','recibido_parcial','recibido','cancelado')),
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_global NUMERIC(5,2) NOT NULL DEFAULT 0,
  base_imponible   NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_porcentaje   NUMERIC(5,2) NOT NULL DEFAULT 21,
  iva              NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas            TEXT,
  created_by       UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS pedidos_compra_seq START 1;

CREATE TABLE IF NOT EXISTS pedido_compra_lineas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_compra_id  UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  orden             INTEGER NOT NULL,
  producto_id       UUID,                      -- referencia opcional a catálogo
  referencia_proveedor TEXT,                   -- ref. del proveedor
  descripcion       TEXT NOT NULL,
  cantidad          NUMERIC(12,4) NOT NULL DEFAULT 1,
  precio_unitario   NUMERIC(12,4) NOT NULL DEFAULT 0,
  descuento         NUMERIC(5,2) NOT NULL DEFAULT 0,
  iva_porcentaje    NUMERIC(5,2) NOT NULL DEFAULT 21,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  cantidad_recibida NUMERIC(12,4) NOT NULL DEFAULT 0,   -- para seguimiento parcial
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recepciones de Mercancía ──────────────────────────────────

CREATE TABLE IF NOT EXISTS recepciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia        TEXT NOT NULL UNIQUE,      -- REC-0001
  pedido_compra_id  UUID REFERENCES pedidos_compra(id) ON DELETE SET NULL,
  empresa_id        UUID REFERENCES empresas(id) ON DELETE RESTRICT,
  delegacion_id     UUID REFERENCES delegaciones(id) ON DELETE SET NULL,
  almacen_id        UUID NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  proveedor_id      UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  proveedor_nombre  TEXT,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  estado            TEXT NOT NULL DEFAULT 'borrador'
                      CHECK (estado IN ('borrador','confirmada','anulada')),
  albaran_proveedor TEXT,                      -- Nº albarán del proveedor
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas             TEXT,
  created_by        UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS recepciones_seq START 1;

CREATE TABLE IF NOT EXISTS recepcion_lineas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id   UUID NOT NULL REFERENCES recepciones(id) ON DELETE CASCADE,
  orden          INTEGER NOT NULL,
  producto_id    UUID,
  descripcion    TEXT NOT NULL,
  cantidad       NUMERIC(12,4) NOT NULL DEFAULT 1,
  precio_coste   NUMERIC(12,4) NOT NULL DEFAULT 0,   -- precio de compra neto
  subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Stock por Almacén ─────────────────────────────────────────
-- Una fila por (producto_id, almacen_id). Se actualiza en cada recepción/movimiento.

CREATE TABLE IF NOT EXISTS stock (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id  UUID NOT NULL,                 -- referencia al catálogo de productos
  almacen_id   UUID NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
  cantidad     NUMERIC(12,4) NOT NULL DEFAULT 0,
  pmp          NUMERIC(12,4) NOT NULL DEFAULT 0,   -- Precio Medio Ponderado
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (producto_id, almacen_id)
);

-- ── Movimientos de Stock ──────────────────────────────────────
-- Registro inmutable de cada entrada/salida (audit trail)

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id    UUID NOT NULL,
  almacen_id     UUID NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL
                   CHECK (tipo IN (
                     'entrada_compra',     -- recepción de proveedor
                     'salida_venta',       -- albarán de venta
                     'entrada_traspaso',   -- recibido desde otro almacén
                     'salida_traspaso',    -- enviado a otro almacén
                     'ajuste_positivo',    -- ajuste manual +
                     'ajuste_negativo',    -- ajuste manual -
                     'devolucion_cliente', -- devolución de cliente
                     'devolucion_proveedor'-- devolución a proveedor
                   )),
  cantidad       NUMERIC(12,4) NOT NULL,     -- siempre positivo; tipo define dirección
  precio_coste   NUMERIC(12,4) DEFAULT 0,    -- precio unitario de la operación
  referencia_doc TEXT,                       -- REC-0001 / ALB-0001 / TRA-0001 etc.
  doc_id         UUID,                       -- UUID del documento origen
  notas          TEXT,
  created_by     UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Traspasos entre Almacenes ─────────────────────────────────

CREATE TABLE IF NOT EXISTS traspasos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia        TEXT NOT NULL UNIQUE,    -- TRA-0001
  empresa_id        UUID REFERENCES empresas(id) ON DELETE RESTRICT,
  almacen_origen_id UUID NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  almacen_destino_id UUID NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  estado            TEXT NOT NULL DEFAULT 'borrador'
                      CHECK (estado IN ('borrador','en_transito','confirmado','anulado')),
  notas             TEXT,
  -- Firma del responsable de destino
  firma_recepcion   TEXT,                    -- base64 canvas
  firma_fecha       TIMESTAMPTZ,
  firma_nombre      TEXT,
  created_by        UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS traspasos_seq START 1;

CREATE TABLE IF NOT EXISTS traspaso_lineas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traspaso_id  UUID NOT NULL REFERENCES traspasos(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL,
  producto_id  UUID,
  descripcion  TEXT NOT NULL,
  cantidad     NUMERIC(12,4) NOT NULL DEFAULT 1,
  pmp_origen   NUMERIC(12,4) DEFAULT 0,     -- PMP del almacén origen al momento del traspaso
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Costes de Importación (Landed Costs) ─────────────────────

CREATE TABLE IF NOT EXISTS landed_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id    UUID NOT NULL REFERENCES recepciones(id) ON DELETE CASCADE,
  concepto        TEXT NOT NULL,             -- 'flete', 'seguro', 'aduana', 'otros'
  importe         NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_reparto  TEXT NOT NULL DEFAULT 'proporcional'
                    CHECK (metodo_reparto IN ('proporcional','por_unidad','igual')),
  aplicado        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCIONES
-- ============================================================

-- ── update_stock_pmp: actualiza stock y recalcula PMP atómicamente ──

CREATE OR REPLACE FUNCTION update_stock_pmp(
  p_producto_id  UUID,
  p_almacen_id   UUID,
  p_cantidad     NUMERIC,   -- positivo = entrada, negativo = salida
  p_precio_coste NUMERIC    -- precio unitario de la operación (0 para salidas)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_actual   NUMERIC;
  v_pmp_actual     NUMERIC;
  v_nuevo_pmp      NUMERIC;
  v_nueva_cantidad NUMERIC;
BEGIN
  -- Lock the row (or create it)
  INSERT INTO stock (producto_id, almacen_id, cantidad, pmp)
  VALUES (p_producto_id, p_almacen_id, 0, 0)
  ON CONFLICT (producto_id, almacen_id) DO NOTHING;

  SELECT cantidad, pmp INTO v_stock_actual, v_pmp_actual
  FROM stock
  WHERE producto_id = p_producto_id AND almacen_id = p_almacen_id
  FOR UPDATE;

  v_nueva_cantidad := v_stock_actual + p_cantidad;

  IF v_nueva_cantidad < 0 THEN
    v_nueva_cantidad := 0;  -- no permitimos stock negativo (alertar en app)
  END IF;

  -- PMP sólo se recalcula en entradas (p_precio_coste > 0 y p_cantidad > 0)
  IF p_cantidad > 0 AND p_precio_coste > 0 THEN
    IF (v_stock_actual + p_cantidad) > 0 THEN
      v_nuevo_pmp := (v_stock_actual * v_pmp_actual + p_cantidad * p_precio_coste)
                     / (v_stock_actual + p_cantidad);
    ELSE
      v_nuevo_pmp := p_precio_coste;
    END IF;
  ELSE
    v_nuevo_pmp := v_pmp_actual;  -- en salidas el PMP no cambia
  END IF;

  UPDATE stock
  SET cantidad   = v_nueva_cantidad,
      pmp        = ROUND(v_nuevo_pmp, 4),
      updated_at = NOW()
  WHERE producto_id = p_producto_id AND almacen_id = p_almacen_id;
END;
$$;

-- ── confirmar_recepcion: aplica todas las líneas de una recepción al stock ──

CREATE OR REPLACE FUNCTION confirmar_recepcion(p_recepcion_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec  recepciones%ROWTYPE;
  v_lin  recepcion_lineas%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM recepciones WHERE id = p_recepcion_id FOR UPDATE;

  IF v_rec.estado != 'borrador' THEN
    RAISE EXCEPTION 'La recepción ya fue confirmada o anulada';
  END IF;

  FOR v_lin IN
    SELECT * FROM recepcion_lineas WHERE recepcion_id = p_recepcion_id
  LOOP
    IF v_lin.producto_id IS NOT NULL THEN
      -- Actualizar stock con PMP
      PERFORM update_stock_pmp(v_lin.producto_id, v_rec.almacen_id, v_lin.cantidad, v_lin.precio_coste);

      -- Registrar movimiento
      INSERT INTO movimientos_stock
        (producto_id, almacen_id, tipo, cantidad, precio_coste, referencia_doc, doc_id, created_by)
      VALUES
        (v_lin.producto_id, v_rec.almacen_id, 'entrada_compra',
         v_lin.cantidad, v_lin.precio_coste, v_rec.referencia, p_recepcion_id, p_user_id);
    END IF;
  END LOOP;

  UPDATE recepciones SET estado = 'confirmada' WHERE id = p_recepcion_id;
END;
$$;

-- ── confirmar_traspaso: mueve stock entre almacenes ──────────────────────────

CREATE OR REPLACE FUNCTION confirmar_traspaso(p_traspaso_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_tra  traspasos%ROWTYPE;
  v_lin  traspaso_lineas%ROWTYPE;
BEGIN
  SELECT * INTO v_tra FROM traspasos WHERE id = p_traspaso_id FOR UPDATE;

  IF v_tra.estado != 'en_transito' THEN
    RAISE EXCEPTION 'El traspaso debe estar en_transito para confirmarse';
  END IF;

  FOR v_lin IN
    SELECT * FROM traspaso_lineas WHERE traspaso_id = p_traspaso_id
  LOOP
    IF v_lin.producto_id IS NOT NULL THEN
      -- Salida del almacén origen
      PERFORM update_stock_pmp(v_lin.producto_id, v_tra.almacen_origen_id, -v_lin.cantidad, 0);
      INSERT INTO movimientos_stock
        (producto_id, almacen_id, tipo, cantidad, precio_coste, referencia_doc, doc_id, created_by)
      VALUES
        (v_lin.producto_id, v_tra.almacen_origen_id, 'salida_traspaso',
         v_lin.cantidad, v_lin.pmp_origen, v_tra.referencia, p_traspaso_id, p_user_id);

      -- Entrada en almacén destino (con el PMP del origen)
      PERFORM update_stock_pmp(v_lin.producto_id, v_tra.almacen_destino_id, v_lin.cantidad, COALESCE(v_lin.pmp_origen, 0));
      INSERT INTO movimientos_stock
        (producto_id, almacen_id, tipo, cantidad, precio_coste, referencia_doc, doc_id, created_by)
      VALUES
        (v_lin.producto_id, v_tra.almacen_destino_id, 'entrada_traspaso',
         v_lin.cantidad, v_lin.pmp_origen, v_tra.referencia, p_traspaso_id, p_user_id);
    END IF;
  END LOOP;

  UPDATE traspasos SET estado = 'confirmado' WHERE id = p_traspaso_id;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_proveedores" ON proveedores USING (true) WITH CHECK (true);

ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_pedidos_compra" ON pedidos_compra USING (true) WITH CHECK (true);

ALTER TABLE pedido_compra_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_pedido_compra_lineas" ON pedido_compra_lineas USING (true) WITH CHECK (true);

ALTER TABLE recepciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_recepciones" ON recepciones USING (true) WITH CHECK (true);

ALTER TABLE recepcion_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_recepcion_lineas" ON recepcion_lineas USING (true) WITH CHECK (true);

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_stock" ON stock USING (true) WITH CHECK (true);

ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_movimientos_stock" ON movimientos_stock USING (true) WITH CHECK (true);

ALTER TABLE traspasos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_traspasos" ON traspasos USING (true) WITH CHECK (true);

ALTER TABLE traspaso_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_traspaso_lineas" ON traspaso_lineas USING (true) WITH CHECK (true);

ALTER TABLE landed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_landed_costs" ON landed_costs USING (true) WITH CHECK (true);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stock_producto ON stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_almacen ON stock(almacen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen ON movimientos_stock(almacen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_doc ON movimientos_stock(doc_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_proveedor ON pedidos_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_pedido ON recepciones(pedido_compra_id);
CREATE INDEX IF NOT EXISTS idx_traspaso_lineas_traspaso ON traspaso_lineas(traspaso_id);

-- FIN PASO 3
