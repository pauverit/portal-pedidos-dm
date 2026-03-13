-- ============================================================
-- PASO 6 — FACTURACIÓN RECURRENTE + SEPA XML
-- Portal Pedidos DM — Digital Market
-- ============================================================

-- ============================================================
-- 6.1  CONTADOR DE FACTURAS POR EMPRESA + SERIE
-- ============================================================
CREATE TABLE IF NOT EXISTS facturas_contadores (
  empresa_id  uuid    NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  serie       text    NOT NULL,
  ultimo_num  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, serie)
);

ALTER TABLE facturas_contadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facturas_contadores_empresa" ON facturas_contadores
  USING (empresa_id IN (SELECT id FROM empresas));

-- Inicializar para las empresas existentes con series A y B
INSERT INTO facturas_contadores (empresa_id, serie, ultimo_num)
SELECT id, 'A', 0 FROM empresas ON CONFLICT DO NOTHING;
INSERT INTO facturas_contadores (empresa_id, serie, ultimo_num)
SELECT id, 'B', 0 FROM empresas ON CONFLICT DO NOTHING;

-- ============================================================
-- 6.2  CONTRATOS RECURRENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos_recurrentes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id          uuid        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  cliente_nombre      text,
  descripcion         text        NOT NULL,
  importe_base        numeric(12,2) NOT NULL,
  iva_porcentaje      numeric(5,2)  NOT NULL DEFAULT 21,
  frecuencia          text        NOT NULL DEFAULT 'mensual'
                        CHECK (frecuencia IN ('mensual','trimestral','semestral','anual')),
  serie               text        NOT NULL DEFAULT 'A',
  dia_cobro           smallint    NOT NULL DEFAULT 1 CHECK (dia_cobro BETWEEN 1 AND 28),
  fecha_inicio        date        NOT NULL DEFAULT CURRENT_DATE,
  proxima_facturacion date        NOT NULL,
  estado              text        NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','pausado','cancelado')),
  -- Cobro
  metodo_cobro        text        NOT NULL DEFAULT 'transferencia'
                        CHECK (metodo_cobro IN ('transferencia','sepa','tarjeta','efectivo','otro')),
  -- SEPA mandate (para domiciliación)
  iban_cliente        text,
  bic_cliente         text,
  mandato_id          text,
  mandato_fecha       date,
  secuencia_sepa      text        NOT NULL DEFAULT 'FRST'
                        CHECK (secuencia_sepa IN ('FRST','RCUR','FNAL','OOFF')),
  notas               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contratos_recurrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratos_recurrentes_empresa" ON contratos_recurrentes
  USING (empresa_id IN (SELECT id FROM empresas));

CREATE INDEX idx_contratos_empresa    ON contratos_recurrentes(empresa_id);
CREATE INDEX idx_contratos_cliente    ON contratos_recurrentes(cliente_id);
CREATE INDEX idx_contratos_prox_fac   ON contratos_recurrentes(proxima_facturacion) WHERE estado = 'activo';

-- ============================================================
-- 6.3  FUNCIÓN: siguiente número de factura por serie
-- ============================================================
CREATE OR REPLACE FUNCTION siguiente_num_factura(p_empresa_id uuid, p_serie text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_num integer;
BEGIN
  INSERT INTO facturas_contadores(empresa_id, serie, ultimo_num)
  VALUES (p_empresa_id, p_serie, 1)
  ON CONFLICT (empresa_id, serie)
  DO UPDATE SET ultimo_num = facturas_contadores.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;
  RETURN v_num;
END;
$$;

-- ============================================================
-- 6.4  FUNCIÓN: calcular siguiente fecha según frecuencia
-- ============================================================
CREATE OR REPLACE FUNCTION avanzar_fecha_recurrente(
  p_fecha     date,
  p_frecuencia text,
  p_dia_cobro  smallint DEFAULT 1
)
RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_nueva date;
BEGIN
  CASE p_frecuencia
    WHEN 'mensual'     THEN v_nueva := p_fecha + INTERVAL '1 month';
    WHEN 'trimestral'  THEN v_nueva := p_fecha + INTERVAL '3 months';
    WHEN 'semestral'   THEN v_nueva := p_fecha + INTERVAL '6 months';
    WHEN 'anual'       THEN v_nueva := p_fecha + INTERVAL '1 year';
    ELSE v_nueva := p_fecha + INTERVAL '1 month';
  END CASE;
  -- Ajustar al día de cobro del mes resultante
  v_nueva := date_trunc('month', v_nueva) + (p_dia_cobro - 1) * INTERVAL '1 day';
  RETURN v_nueva::date;
END;
$$;

-- ============================================================
-- 6.5  FUNCIÓN: facturar un contrato recurrente
--   Crea una factura + línea y avanza proxima_facturacion
-- ============================================================
CREATE OR REPLACE FUNCTION facturar_contrato(p_contrato_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_contrato   record;
  v_num        integer;
  v_ref        text;
  v_factura_id uuid;
  v_iva        numeric(12,2);
  v_total      numeric(12,2);
BEGIN
  SELECT cr.*, c.company_name AS _cliente_nombre
    INTO v_contrato
    FROM contratos_recurrentes cr
    JOIN clients c ON c.id = cr.cliente_id
   WHERE cr.id = p_contrato_id AND cr.estado = 'activo';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % no encontrado o no activo', p_contrato_id;
  END IF;

  -- Calcular importes
  v_iva   := round(v_contrato.importe_base * v_contrato.iva_porcentaje / 100, 2);
  v_total := v_contrato.importe_base + v_iva;

  -- Generar número de factura
  v_num := siguiente_num_factura(v_contrato.empresa_id, v_contrato.serie);
  v_ref := v_contrato.serie || '-' || LPAD(v_num::text, 4, '0');

  -- Crear factura
  INSERT INTO facturas(
    serie, numero, referencia, empresa_id, cliente_id, cliente_nombre,
    fecha, fecha_vencimiento, estado,
    base_imponible, iva_porcentaje, iva, total,
    metodo_cobro, notas
  ) VALUES (
    v_contrato.serie, v_num, v_ref,
    v_contrato.empresa_id, v_contrato.cliente_id,
    COALESCE(v_contrato.cliente_nombre, v_contrato._cliente_nombre),
    v_contrato.proxima_facturacion,
    v_contrato.proxima_facturacion + INTERVAL '30 days',
    'emitida',
    v_contrato.importe_base, v_contrato.iva_porcentaje, v_iva, v_total,
    v_contrato.metodo_cobro,
    'Factura recurrente: ' || v_contrato.descripcion
  ) RETURNING id INTO v_factura_id;

  -- Crear línea de factura
  INSERT INTO factura_lineas(
    factura_id, orden, descripcion, cantidad, precio_unitario,
    iva_porcentaje, subtotal
  ) VALUES (
    v_factura_id, 1, v_contrato.descripcion, 1,
    v_contrato.importe_base, v_contrato.iva_porcentaje, v_contrato.importe_base
  );

  -- Avanzar fecha y actualizar secuencia SEPA (FRST → RCUR después de 1ª vez)
  UPDATE contratos_recurrentes
     SET proxima_facturacion = avanzar_fecha_recurrente(
           proxima_facturacion, frecuencia, dia_cobro),
         secuencia_sepa = CASE WHEN secuencia_sepa = 'FRST' THEN 'RCUR' ELSE secuencia_sepa END,
         updated_at = now()
   WHERE id = p_contrato_id;

  RETURN v_factura_id;
END;
$$;

-- ============================================================
-- 6.6  VISTA: contratos pendientes (vencidos o vencen hoy)
-- ============================================================
CREATE OR REPLACE VIEW contratos_pendientes AS
SELECT
  cr.*,
  c.company_name AS cliente_nombre_completo,
  c.email        AS cliente_email,
  -- MRR equivalente mensual de este contrato
  CASE cr.frecuencia
    WHEN 'mensual'    THEN cr.importe_base
    WHEN 'trimestral' THEN round(cr.importe_base / 3, 2)
    WHEN 'semestral'  THEN round(cr.importe_base / 6, 2)
    WHEN 'anual'      THEN round(cr.importe_base / 12, 2)
  END AS mrr_mensual,
  (cr.proxima_facturacion <= CURRENT_DATE) AS vencido
FROM contratos_recurrentes cr
JOIN clients c ON c.id = cr.cliente_id
WHERE cr.estado = 'activo';

-- ============================================================
-- 6.7  VISTA: MRR por empresa
-- ============================================================
CREATE OR REPLACE VIEW mrr_por_empresa AS
SELECT
  empresa_id,
  COUNT(*) FILTER (WHERE estado = 'activo')           AS contratos_activos,
  COUNT(*) FILTER (WHERE estado = 'pausado')          AS contratos_pausados,
  SUM(
    CASE frecuencia
      WHEN 'mensual'    THEN importe_base
      WHEN 'trimestral' THEN round(importe_base / 3, 2)
      WHEN 'semestral'  THEN round(importe_base / 6, 2)
      WHEN 'anual'      THEN round(importe_base / 12, 2)
    END
  ) FILTER (WHERE estado = 'activo')                  AS mrr,
  SUM(
    CASE frecuencia
      WHEN 'mensual'    THEN importe_base * 12
      WHEN 'trimestral' THEN importe_base * 4
      WHEN 'semestral'  THEN importe_base * 2
      WHEN 'anual'      THEN importe_base
    END
  ) FILTER (WHERE estado = 'activo')                  AS arr
FROM contratos_recurrentes
GROUP BY empresa_id;
