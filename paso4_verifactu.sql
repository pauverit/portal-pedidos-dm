-- ============================================================
-- PASO 4: Facturación legal + VeriFactu AEAT
-- Digital Market (portal-pedidos-dm)
-- Ejecutar en Supabase SQL Editor
-- Requiere extensión pgcrypto (disponible en Supabase por defecto)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Registro VeriFactu (encadenamiento inmutable) ─────────────

CREATE TABLE IF NOT EXISTS verifactu_registros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id      UUID NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  -- Datos del encadenamiento
  num_registro    BIGINT NOT NULL,          -- número secuencial por empresa
  nif_emisor      TEXT NOT NULL,
  num_serie       TEXT NOT NULL,            -- ej: A-0001
  fecha_factura   DATE NOT NULL,
  tipo_factura    TEXT NOT NULL DEFAULT 'F1', -- F1=normal, F2=simplificada, R1-R5=rectificativa
  cuota_total     NUMERIC(12,2) NOT NULL,   -- suma de IVA
  importe_total   NUMERIC(12,2) NOT NULL,   -- total factura
  hash_anterior   TEXT,                     -- hash del registro anterior (NULL = primero)
  hash_actual     TEXT NOT NULL,            -- SHA-256 de este registro
  -- QR
  qr_url          TEXT,                     -- URL de validación AEAT
  -- Timestamps
  fecha_registro  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Estado envío (para futuro envío a AEAT via API)
  estado_envio    TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado_envio IN ('pendiente','enviado','aceptado','rechazado','anulado')),
  respuesta_aeat  JSONB,
  -- Constraint: cada factura solo puede estar una vez
  UNIQUE (factura_id),
  UNIQUE (empresa_id, num_registro)
);

-- Secuencia por empresa (usamos tabla de contadores)
CREATE TABLE IF NOT EXISTS verifactu_contadores (
  empresa_id  UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  ultimo_num  BIGINT NOT NULL DEFAULT 0
);

-- Insertar contadores para las 2 empresas ya existentes
INSERT INTO verifactu_contadores (empresa_id, ultimo_num)
SELECT id, 0 FROM empresas
ON CONFLICT (empresa_id) DO NOTHING;

-- ── Cobros de facturas ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cobros (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id   UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  importe      NUMERIC(12,2) NOT NULL,
  metodo       TEXT NOT NULL DEFAULT 'transferencia'
                 CHECK (metodo IN ('transferencia','tarjeta','cheque','efectivo','sepa','otro')),
  referencia   TEXT,                        -- nº operación bancaria, cheque, etc.
  notas        TEXT,
  created_by   UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Libro de facturas emitidas (view) ─────────────────────────
-- Simplifica la consulta para el libro registro de IVA

CREATE OR REPLACE VIEW libro_facturas_emitidas AS
SELECT
  f.id,
  f.referencia,
  f.fecha,
  e.cif            AS nif_emisor,
  e.razon_social   AS nombre_emisor,
  f.cliente_id,
  f.cliente_nombre,
  f.base_imponible,
  f.iva_porcentaje,
  f.iva,
  f.total,
  f.estado,
  f.fecha_cobro,
  f.metodo_cobro,
  vr.hash_actual   AS huella_verifactu,
  vr.estado_envio  AS estado_verifactu,
  vr.qr_url
FROM facturas f
JOIN empresas e ON e.id = f.empresa_id
LEFT JOIN verifactu_registros vr ON vr.factura_id = f.id
ORDER BY f.fecha DESC, f.referencia DESC;

-- ── Función: calcular hash VeriFactu ─────────────────────────
-- Implementa la cadena según especificación AEAT VeriFactu 1.0
-- Cadena = IDEmisorFactura|NumSerieFactura|FechaExpedicion|TipoFactura|CuotaTotal|ImporteTotal|Huella_anterior

CREATE OR REPLACE FUNCTION calcular_hash_verifactu(
  p_nif_emisor    TEXT,
  p_num_serie     TEXT,
  p_fecha         DATE,
  p_tipo          TEXT,
  p_cuota         NUMERIC,
  p_total         NUMERIC,
  p_hash_anterior TEXT   -- NULL si es el primero
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_cadena TEXT;
  v_hash   TEXT;
BEGIN
  v_cadena := p_nif_emisor
    || '|' || p_num_serie
    || '|' || TO_CHAR(p_fecha, 'DD-MM-YYYY')
    || '|' || p_tipo
    || '|' || TO_CHAR(p_cuota, 'FM999999999999990.00')
    || '|' || TO_CHAR(p_total, 'FM999999999999990.00')
    || '|' || COALESCE(p_hash_anterior, '');

  v_hash := UPPER(encode(digest(v_cadena, 'sha256'), 'hex'));
  RETURN v_hash;
END;
$$;

-- ── Función: registrar factura en VeriFactu ───────────────────

CREATE OR REPLACE FUNCTION registrar_verifactu(p_factura_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_fac          facturas%ROWTYPE;
  v_empresa      empresas%ROWTYPE;
  v_num          BIGINT;
  v_hash_ant     TEXT;
  v_hash_nuevo   TEXT;
  v_qr_url       TEXT;
  v_tipo         TEXT;
BEGIN
  -- Ya registrada?
  IF EXISTS (SELECT 1 FROM verifactu_registros WHERE factura_id = p_factura_id) THEN
    RAISE EXCEPTION 'La factura ya está registrada en VeriFactu';
  END IF;

  SELECT * INTO v_fac FROM facturas WHERE id = p_factura_id;
  SELECT * INTO v_empresa FROM empresas WHERE id = v_fac.empresa_id;

  -- Tipo de factura
  v_tipo := CASE
    WHEN v_fac.referencia LIKE 'RC-%' THEN 'R1'   -- rectificativa
    ELSE 'F1'                                       -- normal
  END;

  -- Obtener y actualizar contador (FOR UPDATE para concurrencia)
  UPDATE verifactu_contadores
  SET ultimo_num = ultimo_num + 1
  WHERE empresa_id = v_fac.empresa_id
  RETURNING ultimo_num INTO v_num;

  -- Obtener hash anterior (el más reciente de esta empresa)
  SELECT hash_actual INTO v_hash_ant
  FROM verifactu_registros
  WHERE empresa_id = v_fac.empresa_id
  ORDER BY num_registro DESC
  LIMIT 1;

  -- Calcular hash
  v_hash_nuevo := calcular_hash_verifactu(
    v_empresa.cif,
    v_fac.referencia,
    v_fac.fecha::DATE,
    v_tipo,
    v_fac.iva,
    v_fac.total,
    v_hash_ant
  );

  -- Construir URL QR AEAT
  -- Formato: https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=B73486474&numserie=A-0001&fecha=01-01-2025&importe=121.00
  v_qr_url := 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR'
    || '?nif=' || v_empresa.cif
    || '&numserie=' || v_fac.referencia
    || '&fecha=' || TO_CHAR(v_fac.fecha::DATE, 'DD-MM-YYYY')
    || '&importe=' || TO_CHAR(v_fac.total, 'FM999999999999990.00');

  -- Insertar registro
  INSERT INTO verifactu_registros (
    factura_id, empresa_id, num_registro,
    nif_emisor, num_serie, fecha_factura,
    tipo_factura, cuota_total, importe_total,
    hash_anterior, hash_actual, qr_url
  ) VALUES (
    p_factura_id, v_fac.empresa_id, v_num,
    v_empresa.cif, v_fac.referencia, v_fac.fecha::DATE,
    v_tipo, v_fac.iva, v_fac.total,
    v_hash_ant, v_hash_nuevo, v_qr_url
  );

  -- Actualizar la factura con el hash
  UPDATE facturas
  SET verifactu_hash = v_hash_nuevo
  WHERE id = p_factura_id;

  RETURN v_hash_nuevo;
END;
$$;

-- ── Función: anular registro VeriFactu (genera rectificativa) ─

CREATE OR REPLACE FUNCTION anular_verifactu(p_factura_id UUID, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verifactu_registros
  SET estado_envio = 'anulado',
      respuesta_aeat = jsonb_build_object('motivo', p_motivo, 'fecha', NOW())
  WHERE factura_id = p_factura_id;

  UPDATE facturas SET estado = 'cancelada' WHERE id = p_factura_id;
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE verifactu_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_verifactu" ON verifactu_registros USING (true) WITH CHECK (true);

ALTER TABLE verifactu_contadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_verifactu_contadores" ON verifactu_contadores USING (true) WITH CHECK (true);

ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cobros" ON cobros USING (true) WITH CHECK (true);

-- ── Índices ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_verifactu_empresa ON verifactu_registros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_verifactu_factura ON verifactu_registros(factura_id);
CREATE INDEX IF NOT EXISTS idx_cobros_factura ON cobros(factura_id);
CREATE INDEX IF NOT EXISTS idx_cobros_empresa ON cobros(empresa_id);

-- Columna factura.cliente_id para la view (si se nombra diferente)
-- Nota: la view usa f.cliente_id — asegúrate que la columna en facturas se llama cliente_id
-- Si se llama diferente, ajusta en la view de arriba.

-- FIN PASO 4
