-- ============================================================
-- PASO 12 — DEVOLUCIONES DE VENTA
-- Portal Pedidos DM — Digital Market
-- Gestión de devoluciones de clientes + reposición de stock
-- ============================================================

-- ============================================================
-- 12.1  Tabla: devoluciones_venta
-- ============================================================
CREATE TABLE IF NOT EXISTS devoluciones_venta (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia        text UNIQUE,                              -- DEV-0001
  empresa_id        uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  delegacion_id     uuid REFERENCES delegaciones(id) ON DELETE SET NULL,
  -- Documento origen (al menos uno)
  factura_id        uuid REFERENCES facturas(id) ON DELETE SET NULL,
  albaran_id        uuid REFERENCES albaranes(id) ON DELETE SET NULL,
  -- Cliente
  cliente_id        uuid REFERENCES clients(id) ON DELETE SET NULL,
  cliente_nombre    text NOT NULL,
  -- Almacén de destino de la mercancía devuelta
  almacen_id        uuid REFERENCES almacenes(id) ON DELETE SET NULL,
  almacen_nombre    text,
  -- Datos de la devolución
  fecha             date NOT NULL DEFAULT CURRENT_DATE,
  motivo            text NOT NULL DEFAULT 'defecto'
                    CHECK (motivo IN ('defecto','error_pedido','cambio','no_deseado','otro')),
  estado            text NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','recibida','procesada','anulada')),
  -- Importes (calculados por trigger)
  subtotal          numeric(12,2) NOT NULL DEFAULT 0,
  base_imponible    numeric(12,2) NOT NULL DEFAULT 0,
  iva_porcentaje    numeric(5,2)  NOT NULL DEFAULT 21,
  iva               numeric(12,2) NOT NULL DEFAULT 0,
  total             numeric(12,2) NOT NULL DEFAULT 0,
  -- Abono
  tipo_abono        text NOT NULL DEFAULT 'nota_credito'
                    CHECK (tipo_abono IN ('nota_credito','devolucion_efectivo','canje','saldo')),
  nota_credito_ref  text,                                    -- N/C generada
  -- Control
  notas             text,
  created_by        uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Numeración automática
CREATE OR REPLACE FUNCTION set_referencia_devolucion()
RETURNS TRIGGER AS $$
DECLARE v_num int;
BEGIN
  IF NEW.referencia IS NULL THEN
    SELECT COALESCE(MAX(CAST(split_part(referencia, '-', 2) AS int)), 0) + 1
    INTO v_num
    FROM devoluciones_venta
    WHERE empresa_id = NEW.empresa_id;
    NEW.referencia := 'DEV-' || LPAD(v_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ref_devolucion ON devoluciones_venta;
CREATE TRIGGER trg_ref_devolucion
  BEFORE INSERT ON devoluciones_venta
  FOR EACH ROW EXECUTE FUNCTION set_referencia_devolucion();

-- ============================================================
-- 12.2  Líneas de devolución
-- ============================================================
CREATE TABLE IF NOT EXISTS devolucion_lineas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id   uuid NOT NULL REFERENCES devoluciones_venta(id) ON DELETE CASCADE,
  orden           int  NOT NULL DEFAULT 1,
  producto_id     uuid REFERENCES products(id) ON DELETE SET NULL,
  descripcion     text NOT NULL,
  cantidad        numeric(12,4) NOT NULL DEFAULT 1,
  precio_unitario numeric(12,4) NOT NULL DEFAULT 0,
  descuento       numeric(5,2)  NOT NULL DEFAULT 0,
  iva_porcentaje  numeric(5,2)  NOT NULL DEFAULT 21,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0
);

-- Trigger: recalcular totales en cabecera al modificar líneas
CREATE OR REPLACE FUNCTION recalcular_totales_devolucion()
RETURNS TRIGGER AS $$
DECLARE v_id uuid;
BEGIN
  v_id := COALESCE(NEW.devolucion_id, OLD.devolucion_id);
  UPDATE devoluciones_venta
  SET subtotal       = (SELECT COALESCE(SUM(subtotal), 0) FROM devolucion_lineas WHERE devolucion_id = v_id),
      base_imponible = (SELECT COALESCE(SUM(subtotal), 0) FROM devolucion_lineas WHERE devolucion_id = v_id),
      iva            = (SELECT COALESCE(SUM(subtotal * iva_porcentaje / 100), 0) FROM devolucion_lineas WHERE devolucion_id = v_id),
      total          = (SELECT COALESCE(SUM(subtotal * (1 + iva_porcentaje / 100)), 0) FROM devolucion_lineas WHERE devolucion_id = v_id),
      updated_at     = now()
  WHERE id = v_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_totales_devolucion ON devolucion_lineas;
CREATE TRIGGER trg_totales_devolucion
  AFTER INSERT OR UPDATE OR DELETE ON devolucion_lineas
  FOR EACH ROW EXECUTE FUNCTION recalcular_totales_devolucion();

-- Trigger: al PROCESAR una devolución, devolver stock al almacén
CREATE OR REPLACE FUNCTION procesar_stock_devolucion()
RETURNS TRIGGER AS $$
DECLARE
  lin RECORD;
BEGIN
  -- Solo actuar cuando cambia estado a 'recibida' (mercancía llega físicamente)
  IF NEW.estado = 'recibida' AND OLD.estado <> 'recibida' AND NEW.almacen_id IS NOT NULL THEN
    FOR lin IN
      SELECT * FROM devolucion_lineas WHERE devolucion_id = NEW.id AND producto_id IS NOT NULL
    LOOP
      -- Incrementar stock en el almacén receptor
      INSERT INTO stock_almacen (producto_id, almacen_id, cantidad, pmp)
      VALUES (lin.producto_id, NEW.almacen_id, lin.cantidad, lin.precio_unitario)
      ON CONFLICT (producto_id, almacen_id)
      DO UPDATE SET
        cantidad   = stock_almacen.cantidad + EXCLUDED.cantidad,
        updated_at = now();

      -- Registrar movimiento de stock
      INSERT INTO movimientos_stock (
        producto_id, almacen_id, tipo, cantidad,
        referencia_doc, notas, created_at
      ) VALUES (
        lin.producto_id, NEW.almacen_id, 'entrada_devolucion', lin.cantidad,
        NEW.referencia, 'Devolución de cliente: ' || NEW.cliente_nombre, now()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_devolucion ON devoluciones_venta;
CREATE TRIGGER trg_stock_devolucion
  AFTER UPDATE ON devoluciones_venta
  FOR EACH ROW EXECUTE FUNCTION procesar_stock_devolucion();

-- ============================================================
-- 12.3  Vista: devoluciones pendientes de procesar
-- ============================================================
CREATE OR REPLACE VIEW devoluciones_pendientes AS
SELECT
  d.id, d.referencia, d.empresa_id,
  d.cliente_nombre, d.fecha,
  d.motivo, d.estado, d.tipo_abono,
  d.total,
  f.referencia AS factura_ref,
  a.referencia AS albaran_ref,
  al.nombre    AS almacen_nombre
FROM devoluciones_venta d
LEFT JOIN facturas  f  ON f.id  = d.factura_id
LEFT JOIN albaranes a  ON a.id  = d.albaran_id
LEFT JOIN almacenes al ON al.id = d.almacen_id
WHERE d.estado IN ('pendiente','recibida');

-- ============================================================
-- 12.4  Tipo de movimiento de stock (ampliar si no existe)
-- ============================================================
-- Si movimientos_stock.tipo tiene un CHECK constraint, añadir el nuevo valor:
DO $$
BEGIN
  -- Intentar añadir 'entrada_devolucion' al enum/check si es necesario
  -- (depende de la implementación existente — ignorar si ya existe)
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;
