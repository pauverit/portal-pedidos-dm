-- ============================================================
-- PASO 5 — CONTABILIDAD PGC ESPAÑOLA
-- Portal Pedidos DM — Digital Market
-- ============================================================

-- ============================================================
-- 5.1  PLAN DE CUENTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_cuentas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo        varchar(10) NOT NULL,        -- e.g. "430", "700.01"
  nombre        text NOT NULL,
  grupo         smallint NOT NULL CHECK (grupo BETWEEN 1 AND 9),  -- PGC grupos 1-9
  naturaleza    char(1) NOT NULL CHECK (naturaleza IN ('D','H')), -- Deudora / Acreedora
  tipo          text NOT NULL CHECK (tipo IN ('activo','pasivo','neto','ingreso','gasto','mixto')),
  nivel         smallint NOT NULL DEFAULT 3 CHECK (nivel BETWEEN 1 AND 6),
  activa        boolean NOT NULL DEFAULT true,
  es_pgc        boolean NOT NULL DEFAULT false,  -- true = cuenta base PGC no borrable
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

ALTER TABLE plan_cuentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_cuentas_empresa" ON plan_cuentas
  USING (empresa_id IN (SELECT id FROM empresas));

CREATE INDEX idx_plan_cuentas_empresa ON plan_cuentas(empresa_id);
CREATE INDEX idx_plan_cuentas_codigo  ON plan_cuentas(empresa_id, codigo);

-- ============================================================
-- 5.2  ASIENTOS CONTABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS asientos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  num_asiento   integer NOT NULL,
  fecha         date NOT NULL,
  referencia    text,
  descripcion   text NOT NULL,
  tipo          text NOT NULL DEFAULT 'manual'
                CHECK (tipo IN ('manual','venta','compra','nomina','amortizacion','apertura','cierre')),
  estado        text NOT NULL DEFAULT 'borrador'
                CHECK (estado IN ('borrador','confirmado','cancelado')),
  origen_id     uuid,           -- id de factura / compra origen (si auto-generado)
  origen_tipo   text,           -- 'factura_venta' | 'factura_compra'
  notas         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, num_asiento)
);

ALTER TABLE asientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asientos_empresa" ON asientos
  USING (empresa_id IN (SELECT id FROM empresas));

-- ============================================================
-- 5.3  LÍNEAS DE ASIENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS asiento_lineas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asiento_id    uuid NOT NULL REFERENCES asientos(id) ON DELETE CASCADE,
  cuenta_id     uuid NOT NULL REFERENCES plan_cuentas(id),
  descripcion   text,
  debe          numeric(14,2) NOT NULL DEFAULT 0 CHECK (debe >= 0),
  haber         numeric(14,2) NOT NULL DEFAULT 0 CHECK (haber >= 0),
  orden         smallint NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE asiento_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asiento_lineas_via_asiento" ON asiento_lineas
  USING (asiento_id IN (SELECT id FROM asientos));

CREATE INDEX idx_asiento_lineas_asiento ON asiento_lineas(asiento_id);
CREATE INDEX idx_asiento_lineas_cuenta  ON asiento_lineas(cuenta_id);

-- ============================================================
-- 5.4  CONTADORES DE ASIENTO (uno por empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS asiento_contadores (
  empresa_id    uuid PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  ultimo_num    integer NOT NULL DEFAULT 0
);

ALTER TABLE asiento_contadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asiento_contadores_empresa" ON asiento_contadores
  USING (empresa_id IN (SELECT id FROM empresas));

-- ============================================================
-- 5.5  FUNCIÓN: obtener siguiente número de asiento
-- ============================================================
CREATE OR REPLACE FUNCTION siguiente_num_asiento(p_empresa_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_num integer;
BEGIN
  INSERT INTO asiento_contadores(empresa_id, ultimo_num)
  VALUES (p_empresa_id, 1)
  ON CONFLICT (empresa_id)
  DO UPDATE SET ultimo_num = asiento_contadores.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;
  RETURN v_num;
END;
$$;

-- ============================================================
-- 5.6  FUNCIÓN: confirmar asiento (valida cuadre debe=haber)
-- ============================================================
CREATE OR REPLACE FUNCTION confirmar_asiento(p_asiento_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_debe  numeric;
  v_haber numeric;
BEGIN
  SELECT COALESCE(SUM(debe),0), COALESCE(SUM(haber),0)
    INTO v_debe, v_haber
    FROM asiento_lineas
   WHERE asiento_id = p_asiento_id;

  IF abs(v_debe - v_haber) > 0.01 THEN
    RAISE EXCEPTION 'El asiento no cuadra: debe=% haber=%', v_debe, v_haber;
  END IF;

  UPDATE asientos SET estado = 'confirmado', updated_at = now()
   WHERE id = p_asiento_id AND estado = 'borrador';
END;
$$;

-- ============================================================
-- 5.7  FUNCIÓN: generar asiento automático desde factura de venta
--   Crea líneas:  430 (cliente) DEBE total con IVA
--                 700 (ventas)  HABER base imponible
--                 477 (IVA rep) HABER cuota IVA
-- ============================================================
CREATE OR REPLACE FUNCTION generar_asiento_venta(p_factura_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_factura       record;
  v_asiento_id    uuid;
  v_num           integer;
  c430            uuid;
  c700            uuid;
  c477            uuid;
BEGIN
  -- Obtener datos de la factura
  SELECT f.*, c.company_name AS cliente_nombre
    INTO v_factura
    FROM facturas f
    JOIN clients c ON c.id = f.cliente_id
   WHERE f.id = p_factura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura % no encontrada', p_factura_id;
  END IF;

  -- Obtener cuentas del plan (empresa)
  SELECT id INTO c430 FROM plan_cuentas
   WHERE empresa_id = v_factura.empresa_id AND codigo = '430' LIMIT 1;
  SELECT id INTO c700 FROM plan_cuentas
   WHERE empresa_id = v_factura.empresa_id AND codigo = '700' LIMIT 1;
  SELECT id INTO c477 FROM plan_cuentas
   WHERE empresa_id = v_factura.empresa_id AND codigo = '477' LIMIT 1;

  IF c430 IS NULL OR c700 IS NULL OR c477 IS NULL THEN
    RAISE EXCEPTION 'Faltan cuentas 430/700/477 en el plan de cuentas de la empresa';
  END IF;

  -- Crear asiento
  v_num := siguiente_num_asiento(v_factura.empresa_id);
  INSERT INTO asientos(id, empresa_id, num_asiento, fecha, referencia,
                        descripcion, tipo, estado, origen_id, origen_tipo)
  VALUES (gen_random_uuid(), v_factura.empresa_id, v_num,
          v_factura.fecha_emision::date,
          v_factura.numero_factura,
          'Venta a ' || v_factura.cliente_nombre,
          'venta', 'borrador',
          p_factura_id, 'factura_venta')
  RETURNING id INTO v_asiento_id;

  -- Línea 430 — cliente (debe = total factura con IVA)
  INSERT INTO asiento_lineas(asiento_id, cuenta_id, descripcion, debe, haber, orden)
  VALUES (v_asiento_id, c430,
          v_factura.numero_factura || ' ' || v_factura.cliente_nombre,
          v_factura.total_con_iva, 0, 1);

  -- Línea 700 — ingresos ventas (haber = base imponible)
  INSERT INTO asiento_lineas(asiento_id, cuenta_id, descripcion, debe, haber, orden)
  VALUES (v_asiento_id, c700,
          'Venta ' || v_factura.numero_factura,
          0, v_factura.base_imponible, 2);

  -- Línea 477 — IVA repercutido (haber = cuota IVA)
  INSERT INTO asiento_lineas(asiento_id, cuenta_id, descripcion, debe, haber, orden)
  VALUES (v_asiento_id, c477,
          'IVA ' || v_factura.porcentaje_iva || '% ' || v_factura.numero_factura,
          0, v_factura.cuota_iva, 3);

  RETURN v_asiento_id;
END;
$$;

-- ============================================================
-- 5.8  VISTA: balance de sumas y saldos
-- ============================================================
CREATE OR REPLACE VIEW sumas_saldos AS
SELECT
  pc.empresa_id,
  pc.codigo,
  pc.nombre,
  pc.grupo,
  pc.naturaleza,
  pc.tipo,
  COALESCE(SUM(al.debe),  0) AS total_debe,
  COALESCE(SUM(al.haber), 0) AS total_haber,
  CASE pc.naturaleza
    WHEN 'D' THEN COALESCE(SUM(al.debe),0)  - COALESCE(SUM(al.haber),0)
    WHEN 'H' THEN COALESCE(SUM(al.haber),0) - COALESCE(SUM(al.debe),0)
  END AS saldo
FROM plan_cuentas pc
LEFT JOIN asiento_lineas al ON al.cuenta_id = pc.id
LEFT JOIN asientos a ON a.id = al.asiento_id AND a.estado = 'confirmado'
GROUP BY pc.empresa_id, pc.id, pc.codigo, pc.nombre, pc.grupo, pc.naturaleza, pc.tipo;

-- ============================================================
-- 5.9  PRE-CARGAR CUENTAS PGC (Grupos 1-7) EN TODAS LAS EMPRESAS
-- ============================================================
DO $$
DECLARE
  emp record;
  pgc_accounts jsonb := '[
    {"codigo":"100","nombre":"Capital social","grupo":1,"naturaleza":"H","tipo":"neto","nivel":3},
    {"codigo":"112","nombre":"Reserva legal","grupo":1,"naturaleza":"H","tipo":"neto","nivel":3},
    {"codigo":"113","nombre":"Reservas voluntarias","grupo":1,"naturaleza":"H","tipo":"neto","nivel":3},
    {"codigo":"120","nombre":"Remanente","grupo":1,"naturaleza":"H","tipo":"neto","nivel":3},
    {"codigo":"129","nombre":"Resultado del ejercicio","grupo":1,"naturaleza":"H","tipo":"neto","nivel":3},
    {"codigo":"170","nombre":"Deudas a largo plazo con entidades de crédito","grupo":1,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"173","nombre":"Proveedores de inmovilizado a largo plazo","grupo":1,"naturaleza":"H","tipo":"pasivo","nivel":3},

    {"codigo":"200","nombre":"Investigación","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"210","nombre":"Terrenos y bienes naturales","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"211","nombre":"Construcciones","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"213","nombre":"Maquinaria","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"214","nombre":"Utillaje","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"215","nombre":"Otras instalaciones","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"216","nombre":"Mobiliario","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"217","nombre":"Equipos para procesos de información","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"218","nombre":"Elementos de transporte","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"220","nombre":"Inversiones en terrenos y bienes naturales","grupo":2,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"281","nombre":"Amortización acumulada inmovilizado material","grupo":2,"naturaleza":"H","tipo":"activo","nivel":3},
    {"codigo":"282","nombre":"Amortización acumulada inversiones inmobiliarias","grupo":2,"naturaleza":"H","tipo":"activo","nivel":3},

    {"codigo":"300","nombre":"Mercaderías","grupo":3,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"310","nombre":"Materias primas","grupo":3,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"320","nombre":"Otros aprovisionamientos","grupo":3,"naturaleza":"D","tipo":"activo","nivel":3},

    {"codigo":"400","nombre":"Proveedores","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"401","nombre":"Proveedores, efectos comerciales a pagar","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"410","nombre":"Acreedores por prestaciones de servicios","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"430","nombre":"Clientes","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"431","nombre":"Clientes, efectos comerciales a cobrar","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"436","nombre":"Clientes de dudoso cobro","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"440","nombre":"Deudores","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"460","nombre":"Anticipos de remuneraciones","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"465","nombre":"Remuneraciones pendientes de pago","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"470","nombre":"Hacienda Pública, deudora por IVA","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"471","nombre":"Organismos de la Seguridad Social, deudores","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"472","nombre":"Hacienda Pública, IVA soportado","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"473","nombre":"Hacienda Pública, retenciones y pagos a cuenta","grupo":4,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"475","nombre":"Hacienda Pública, acreedor por IVA","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"476","nombre":"Organismos de la Seguridad Social, acreedores","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"477","nombre":"Hacienda Pública, IVA repercutido","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"479","nombre":"Ajustes positivos en la imposición indirecta","grupo":4,"naturaleza":"H","tipo":"pasivo","nivel":3},

    {"codigo":"520","nombre":"Deudas a corto plazo con entidades de crédito","grupo":5,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"521","nombre":"Deudas a corto plazo por préstamos recibidos","grupo":5,"naturaleza":"H","tipo":"pasivo","nivel":3},
    {"codigo":"551","nombre":"Cuenta corriente con socios y administradores","grupo":5,"naturaleza":"D","tipo":"mixto","nivel":3},
    {"codigo":"570","nombre":"Caja, euros","grupo":5,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"572","nombre":"Bancos e instituciones de crédito c/c vista, euros","grupo":5,"naturaleza":"D","tipo":"activo","nivel":3},
    {"codigo":"580","nombre":"Inversiones financieras a corto plazo en instr. patrim.","grupo":5,"naturaleza":"D","tipo":"activo","nivel":3},

    {"codigo":"600","nombre":"Compras de mercaderías","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"601","nombre":"Compras de materias primas","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"602","nombre":"Compras de otros aprovisionamientos","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"610","nombre":"Variación de existencias de mercaderías","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"621","nombre":"Arrendamientos y cánones","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"622","nombre":"Reparaciones y conservación","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"623","nombre":"Servicios de profesionales independientes","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"624","nombre":"Transportes","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"625","nombre":"Primas de seguros","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"626","nombre":"Servicios bancarios y similares","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"627","nombre":"Publicidad, propaganda y relaciones públicas","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"628","nombre":"Suministros","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"629","nombre":"Otros servicios","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"640","nombre":"Sueldos y salarios","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"642","nombre":"Seguridad Social a cargo de la empresa","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"649","nombre":"Otros gastos sociales","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"660","nombre":"Gastos financieros por actualización de provisiones","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"662","nombre":"Intereses de deudas","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"681","nombre":"Amortización del inmovilizado material","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"682","nombre":"Amortización de las inversiones inmobiliarias","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"690","nombre":"Pérdidas por deterioro del inmovilizado intangible","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},
    {"codigo":"694","nombre":"Pérdidas por deterioro de créditos por oper. comerciales","grupo":6,"naturaleza":"D","tipo":"gasto","nivel":3},

    {"codigo":"700","nombre":"Ventas de mercaderías","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3},
    {"codigo":"701","nombre":"Ventas de productos terminados","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3},
    {"codigo":"705","nombre":"Prestaciones de servicios","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3},
    {"codigo":"706","nombre":"Descuentos sobre ventas por pronto pago","grupo":7,"naturaleza":"D","tipo":"ingreso","nivel":3},
    {"codigo":"708","nombre":"Devoluciones de ventas y operaciones similares","grupo":7,"naturaleza":"D","tipo":"ingreso","nivel":3},
    {"codigo":"740","nombre":"Subvenciones a la explotación","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3},
    {"codigo":"751","nombre":"Resultados de operaciones en común","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3},
    {"codigo":"760","nombre":"Ingresos de participaciones en instrumentos de patrimonio","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3},
    {"codigo":"769","nombre":"Otros ingresos financieros","grupo":7,"naturaleza":"H","tipo":"ingreso","nivel":3}
  ]';
  acc record;
BEGIN
  FOR emp IN SELECT id FROM empresas LOOP
    FOR acc IN SELECT * FROM jsonb_to_recordset(pgc_accounts)
               AS t(codigo text, nombre text, grupo smallint, naturaleza text,
                    tipo text, nivel smallint)
    LOOP
      INSERT INTO plan_cuentas(empresa_id, codigo, nombre, grupo, naturaleza,
                                tipo, nivel, activa, es_pgc)
      VALUES (emp.id, acc.codigo, acc.nombre, acc.grupo, acc.naturaleza::char(1),
              acc.tipo, acc.nivel, true, true)
      ON CONFLICT (empresa_id, codigo) DO NOTHING;
    END LOOP;

    -- Insertar contador de asiento si no existe
    INSERT INTO asiento_contadores(empresa_id, ultimo_num)
    VALUES (emp.id, 0)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
