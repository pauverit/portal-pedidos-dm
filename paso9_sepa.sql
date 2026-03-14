-- ============================================================
-- PASO 9 — REMESAS SEPA (Adeudos Directos)
-- Portal Pedidos DM — Digital Market
-- ============================================================

-- ============================================================
-- 9.1  Mandatos SEPA por cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS mandatos_sepa (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  cliente_nombre   text NOT NULL,
  referencia       text NOT NULL,          -- Referencia única del mandato (RUM)
  tipo             text NOT NULL DEFAULT 'CORE'   -- CORE | B2B
                   CHECK (tipo IN ('CORE','B2B')),
  iban_deudor      text NOT NULL,
  bic_deudor       text,
  secuencia        text NOT NULL DEFAULT 'RCUR'   -- FRST | RCUR | OOFF | FNAL
                   CHECK (secuencia IN ('FRST','RCUR','OOFF','FNAL')),
  fecha_firma      date NOT NULL,
  estado           text NOT NULL DEFAULT 'activo'
                   CHECK (estado IN ('activo','cancelado','suspendido')),
  notas            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (empresa_id, referencia)
);

-- ============================================================
-- 9.2  Cabecera de remesa
-- ============================================================
CREATE TABLE IF NOT EXISTS remesas_sepa (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre           text NOT NULL,
  fecha_creacion   date NOT NULL DEFAULT CURRENT_DATE,
  fecha_cobro      date NOT NULL,          -- Fecha valor de cobro
  estado           text NOT NULL DEFAULT 'borrador'
                   CHECK (estado IN ('borrador','enviada','aceptada','parcial','rechazada')),
  num_operaciones  int  NOT NULL DEFAULT 0,
  importe_total    numeric(14,2) NOT NULL DEFAULT 0,
  mensaje_id       text,                   -- MessageId para el XML
  xml_generado     text,                   -- Contenido XML PAIN.008
  notas            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ============================================================
-- 9.3  Líneas de remesa (una por factura/adeudo)
-- ============================================================
CREATE TABLE IF NOT EXISTS remesa_lineas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remesa_id        uuid NOT NULL REFERENCES remesas_sepa(id) ON DELETE CASCADE,
  mandato_id       uuid REFERENCES mandatos_sepa(id) ON DELETE SET NULL,
  factura_id       uuid REFERENCES facturas(id) ON DELETE SET NULL,
  cliente_nombre   text NOT NULL,
  iban_deudor      text NOT NULL,
  bic_deudor       text,
  referencia_mandato text NOT NULL,
  fecha_firma_mandato date NOT NULL,
  secuencia        text NOT NULL DEFAULT 'RCUR'
                   CHECK (secuencia IN ('FRST','RCUR','OOFF','FNAL')),
  concepto         text NOT NULL,
  importe          numeric(14,2) NOT NULL,
  estado           text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','aceptada','devuelta','cancelada')),
  motivo_devolucion text,
  created_at       timestamptz DEFAULT now()
);

-- ============================================================
-- 9.4  Trigger: actualizar totales de cabecera
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_totales_remesa()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE remesas_sepa
  SET
    num_operaciones = (SELECT COUNT(*) FROM remesa_lineas
                       WHERE remesa_id = COALESCE(NEW.remesa_id, OLD.remesa_id)
                         AND estado <> 'cancelada'),
    importe_total   = (SELECT COALESCE(SUM(importe),0) FROM remesa_lineas
                       WHERE remesa_id = COALESCE(NEW.remesa_id, OLD.remesa_id)
                         AND estado <> 'cancelada'),
    updated_at      = now()
  WHERE id = COALESCE(NEW.remesa_id, OLD.remesa_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_totales_remesa ON remesa_lineas;
CREATE TRIGGER trg_totales_remesa
  AFTER INSERT OR UPDATE OR DELETE ON remesa_lineas
  FOR EACH ROW EXECUTE FUNCTION actualizar_totales_remesa();

-- ============================================================
-- 9.5  Función: añadir facturas pendientes a una remesa
-- ============================================================
CREATE OR REPLACE FUNCTION añadir_facturas_a_remesa(p_remesa_id uuid)
RETURNS int AS $$
DECLARE
  v_empresa_id uuid;
  v_count int := 0;
  rec record;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM remesas_sepa WHERE id = p_remesa_id;

  FOR rec IN
    SELECT
      f.id            AS factura_id,
      f.cliente_id,
      f.cliente_nombre,
      f.total         AS importe,
      f.referencia    AS concepto,
      m.id            AS mandato_id,
      m.iban_deudor,
      m.bic_deudor,
      m.referencia    AS referencia_mandato,
      m.fecha_firma   AS fecha_firma_mandato,
      m.secuencia
    FROM facturas f
    JOIN mandatos_sepa m ON m.cliente_id = f.cliente_id
                        AND m.empresa_id = f.empresa_id
                        AND m.estado = 'activo'
    WHERE f.empresa_id = v_empresa_id
      AND f.estado IN ('emitida','enviada')
      AND NOT EXISTS (
        SELECT 1 FROM remesa_lineas rl
        WHERE rl.factura_id = f.id
          AND rl.estado <> 'cancelada'
      )
  LOOP
    INSERT INTO remesa_lineas (
      remesa_id, mandato_id, factura_id,
      cliente_nombre, iban_deudor, bic_deudor,
      referencia_mandato, fecha_firma_mandato, secuencia,
      concepto, importe
    ) VALUES (
      p_remesa_id, rec.mandato_id, rec.factura_id,
      rec.cliente_nombre, rec.iban_deudor, rec.bic_deudor,
      rec.referencia_mandato, rec.fecha_firma_mandato, rec.secuencia,
      rec.concepto, rec.importe
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9.6  Función: generar XML PAIN.008.003.02
-- ============================================================
CREATE OR REPLACE FUNCTION generar_xml_sepa(p_remesa_id uuid)
RETURNS text AS $$
DECLARE
  v_remesa      remesas_sepa;
  v_empresa     empresas;
  v_msg_id      text;
  v_creacion    text;
  v_cobro       text;
  v_xml         text;
  v_txs         text := '';
  rec           record;
  v_tx_id       text;
BEGIN
  SELECT * INTO v_remesa  FROM remesas_sepa WHERE id = p_remesa_id;
  SELECT * INTO v_empresa FROM empresas     WHERE id = v_remesa.empresa_id;

  v_msg_id   := COALESCE(v_remesa.mensaje_id, 'MSG-' || to_char(now(),'YYYYMMDDHHMMSS'));
  v_creacion := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS');
  v_cobro    := to_char(v_remesa.fecha_cobro, 'YYYY-MM-DD');

  -- Generar transacciones
  FOR rec IN
    SELECT * FROM remesa_lineas
    WHERE remesa_id = p_remesa_id AND estado = 'pendiente'
    ORDER BY cliente_nombre
  LOOP
    v_tx_id := 'TX-' || substring(rec.id::text, 1, 8);
    v_txs := v_txs || '
      <DrctDbtTxInf>
        <PmtId><EndToEndId>' || v_tx_id || '</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">' || to_char(rec.importe, 'FM999999990.00') || '</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>' || xmlescape(rec.referencia_mandato) || '</MndtId>
            <DtOfSgntr>' || to_char(rec.fecha_firma_mandato, 'YYYY-MM-DD') || '</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt><FinInstnId>' ||
          CASE WHEN rec.bic_deudor IS NOT NULL
               THEN '<BIC>' || xmlescape(rec.bic_deudor) || '</BIC>'
               ELSE '<Othr><Id>NOTPROVIDED</Id></Othr>'
          END ||
        '</FinInstnId></DbtrAgt>
        <Dbtr><Nm>' || xmlescape(rec.cliente_nombre) || '</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>' || replace(rec.iban_deudor,' ','') || '</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>' || xmlescape(rec.concepto) || '</Ustrd></RmtInf>
      </DrctDbtTxInf>';
  END LOOP;

  v_xml := '<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.003.02"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.008.003.02 pain.008.003.02.xsd">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>' || v_msg_id || '</MsgId>
      <CreDtTm>' || v_creacion || '</CreDtTm>
      <NbOfTxs>' || v_remesa.num_operaciones || '</NbOfTxs>
      <CtrlSum>' || to_char(v_remesa.importe_total,'FM999999990.00') || '</CtrlSum>
      <InitgPty><Nm>' || xmlescape(COALESCE(v_empresa.razon_social, v_empresa.nombre)) || '</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-' || to_char(now(),'YYYYMMDDHHMMSS') || '</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>' || v_remesa.num_operaciones || '</NbOfTxs>
      <CtrlSum>' || to_char(v_remesa.importe_total,'FM999999990.00') || '</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>' || v_cobro || '</ReqdColltnDt>
      <Cdtr><Nm>' || xmlescape(COALESCE(v_empresa.razon_social, v_empresa.nombre)) || '</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>' || replace(COALESCE(v_empresa.iban,''), ' ', '') || '</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></CdtrAgt>' ||
      v_txs || '
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>';

  -- Guardar XML en la remesa
  UPDATE remesas_sepa
  SET xml_generado = v_xml,
      mensaje_id   = v_msg_id,
      estado       = CASE WHEN estado = 'borrador' THEN 'enviada' ELSE estado END,
      updated_at   = now()
  WHERE id = p_remesa_id;

  RETURN v_xml;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9.7  Función: marcar líneas devueltas y actualizar facturas
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_devolucion_sepa(
  p_linea_id uuid,
  p_motivo   text DEFAULT 'MD01'
) RETURNS void AS $$
DECLARE
  v_linea remesa_lineas;
BEGIN
  SELECT * INTO v_linea FROM remesa_lineas WHERE id = p_linea_id;

  UPDATE remesa_lineas
  SET estado = 'devuelta', motivo_devolucion = p_motivo
  WHERE id = p_linea_id;

  -- Revertir la factura a 'emitida' si existía
  IF v_linea.factura_id IS NOT NULL THEN
    UPDATE facturas SET estado = 'emitida' WHERE id = v_linea.factura_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9.8  Vista resumen de remesas
-- ============================================================
CREATE OR REPLACE VIEW remesas_resumen AS
SELECT
  r.id,
  r.empresa_id,
  r.nombre,
  r.fecha_creacion,
  r.fecha_cobro,
  r.estado,
  r.num_operaciones,
  r.importe_total,
  COUNT(CASE WHEN rl.estado = 'aceptada'  THEN 1 END) AS lineas_aceptadas,
  COUNT(CASE WHEN rl.estado = 'devuelta'  THEN 1 END) AS lineas_devueltas,
  COUNT(CASE WHEN rl.estado = 'pendiente' THEN 1 END) AS lineas_pendientes,
  r.created_at
FROM remesas_sepa r
LEFT JOIN remesa_lineas rl ON rl.remesa_id = r.id
GROUP BY r.id;
