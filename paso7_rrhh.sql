-- ============================================================
-- PASO 7 — RRHH Y NÓMINAS
-- Portal Pedidos DM — Digital Market
-- España: SS, IRPF, PGC integrado
-- ============================================================

-- ============================================================
-- 7.1  DEPARTAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS departamentos (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid    NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre       text    NOT NULL,
  codigo       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departamentos_empresa" ON departamentos
  USING (empresa_id IN (SELECT id FROM empresas));

CREATE INDEX idx_departamentos_empresa ON departamentos(empresa_id);

-- ============================================================
-- 7.2  EMPLEADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS empleados (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            uuid    NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  departamento_id       uuid    REFERENCES departamentos(id) ON DELETE SET NULL,

  -- Datos personales
  nombre                text    NOT NULL,
  apellidos             text    NOT NULL,
  dni_nie               text,
  fecha_nacimiento      date,
  email                 text,
  telefono              text,
  direccion             text,

  -- Datos laborales
  num_ss                text,                -- número seguridad social
  num_cuenta_iban       text,
  puesto                text    NOT NULL,
  grupo_cotizacion      smallint NOT NULL DEFAULT 5
                          CHECK (grupo_cotizacion BETWEEN 1 AND 11),
  tipo_contrato         text    NOT NULL DEFAULT 'indefinido'
                          CHECK (tipo_contrato IN (
                            'indefinido','temporal','formacion','obra_servicio',
                            'interinidad','practicas','relevo','otro')),
  jornada               text    NOT NULL DEFAULT 'completa'
                          CHECK (jornada IN ('completa','parcial')),
  porcentaje_jornada    numeric(5,2) NOT NULL DEFAULT 100,

  -- Retribución
  sueldo_bruto_anual    numeric(12,2) NOT NULL DEFAULT 0,
  num_pagas             smallint NOT NULL DEFAULT 14
                          CHECK (num_pagas IN (12,14)),
  irpf_porcentaje       numeric(5,2) NOT NULL DEFAULT 15,

  -- Fechas
  fecha_alta            date    NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja            date,

  -- Estado
  estado                text    NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo','baja','excedencia','suspendido')),

  notas                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empleados_empresa" ON empleados
  USING (empresa_id IN (SELECT id FROM empresas));

CREATE INDEX idx_empleados_empresa    ON empleados(empresa_id);
CREATE INDEX idx_empleados_depto      ON empleados(departamento_id);
CREATE INDEX idx_empleados_estado     ON empleados(estado) WHERE estado = 'activo';

-- ============================================================
-- 7.3  NÓMINAS (cabecera)
-- ============================================================
CREATE TABLE IF NOT EXISTS nominas (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid    NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  empleado_id     uuid    NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,

  -- Periodo YYYY-MM
  periodo         char(7) NOT NULL,           -- ej: '2025-01'
  num_paga        smallint,                    -- 1-14 (paga extra si aplica)

  -- Fechas
  fecha_pago      date,

  -- Totales calculados (se rellenan al confirmar)
  total_devengado numeric(12,2) NOT NULL DEFAULT 0,
  total_deducciones numeric(12,2) NOT NULL DEFAULT 0,
  liquido_percibir  numeric(12,2) NOT NULL DEFAULT 0,

  -- Coste empresa SS
  ss_empresa      numeric(12,2) NOT NULL DEFAULT 0,
  coste_total_empresa numeric(12,2) NOT NULL DEFAULT 0,

  estado          text    NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','confirmada','pagada','anulada')),

  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (empleado_id, periodo)
);

ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nominas_empresa" ON nominas
  USING (empresa_id IN (SELECT id FROM empresas));

CREATE INDEX idx_nominas_empresa   ON nominas(empresa_id);
CREATE INDEX idx_nominas_empleado  ON nominas(empleado_id);
CREATE INDEX idx_nominas_periodo   ON nominas(periodo);

-- ============================================================
-- 7.4  CONCEPTOS DE NÓMINA (líneas)
-- ============================================================
CREATE TABLE IF NOT EXISTS nomina_conceptos (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nomina_id       uuid    NOT NULL REFERENCES nominas(id) ON DELETE CASCADE,
  orden           smallint NOT NULL DEFAULT 1,

  tipo            text    NOT NULL
                    CHECK (tipo IN ('devengado','deduccion')),
  codigo          text    NOT NULL,           -- SB, CE, HE, IRPF, SSCC, etc.
  descripcion     text    NOT NULL,
  importe         numeric(12,2) NOT NULL DEFAULT 0,

  -- metadato: si es % sobre base
  base_calculo    numeric(12,2),
  porcentaje      numeric(5,2)
);

ALTER TABLE nomina_conceptos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nomina_conceptos_via_nomina" ON nomina_conceptos
  USING (nomina_id IN (SELECT id FROM nominas));

CREATE INDEX idx_nomina_conceptos_nomina ON nomina_conceptos(nomina_id);

-- ============================================================
-- 7.5  AUSENCIAS / VACACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS ausencias (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid    NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  empleado_id     uuid    NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,

  tipo            text    NOT NULL DEFAULT 'vacaciones'
                    CHECK (tipo IN (
                      'vacaciones','enfermedad','accidente_laboral',
                      'permiso_retribuido','maternidad','paternidad',
                      'excedencia','otro')),
  fecha_inicio    date    NOT NULL,
  fecha_fin       date    NOT NULL,
  dias_habiles    smallint,
  dias_naturales  smallint GENERATED ALWAYS AS
                    (fecha_fin - fecha_inicio + 1) STORED,

  estado          text    NOT NULL DEFAULT 'solicitada'
                    CHECK (estado IN ('solicitada','aprobada','rechazada','cancelada')),

  aprobado_por    text,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CHECK (fecha_fin >= fecha_inicio)
);

ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ausencias_empresa" ON ausencias
  USING (empresa_id IN (SELECT id FROM empresas));

CREATE INDEX idx_ausencias_empresa   ON ausencias(empresa_id);
CREATE INDEX idx_ausencias_empleado  ON ausencias(empleado_id);
CREATE INDEX idx_ausencias_fechas    ON ausencias(fecha_inicio, fecha_fin);

-- ============================================================
-- 7.6  FUNCIÓN: generar nómina mensual estándar
--   Tasas SS 2025 (España):
--     Empresa: CC 23.60%, Desempleo 5.50%, AT/EP ~0.90%, FOGASA 0.20%, FP 0.60%
--     Trabajador: CC 4.70%, Desempleo 1.55%, FP 0.10%
-- ============================================================
CREATE OR REPLACE FUNCTION generar_nomina_mensual(
  p_empleado_id uuid,
  p_periodo     char(7)   -- 'YYYY-MM'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_emp           record;
  v_nomina_id     uuid;
  v_salario_mes   numeric(12,2);
  v_base_ss       numeric(12,2);

  -- SS trabajador
  v_ss_cc         numeric(12,2);   -- contingencias comunes 4.70%
  v_ss_desemp     numeric(12,2);   -- desempleo 1.55%
  v_ss_fp         numeric(12,2);   -- formación profesional 0.10%
  v_total_ss_trab numeric(12,2);

  -- IRPF
  v_irpf          numeric(12,2);

  -- SS empresa
  v_ss_emp_cc     numeric(12,2);   -- CC 23.60%
  v_ss_emp_desemp numeric(12,2);   -- Desempleo 5.50%
  v_ss_emp_atep   numeric(12,2);   -- AT/EP 0.90%
  v_ss_emp_fogasa numeric(12,2);   -- FOGASA 0.20%
  v_ss_emp_fp     numeric(12,2);   -- FP 0.60%
  v_total_ss_emp  numeric(12,2);

  -- Totales
  v_total_deveng  numeric(12,2);
  v_total_deduc   numeric(12,2);
  v_liquido       numeric(12,2);
BEGIN
  -- Cargar datos del empleado
  SELECT * INTO v_emp FROM empleados WHERE id = p_empleado_id AND estado = 'activo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empleado % no encontrado o no activo', p_empleado_id;
  END IF;

  -- Salario mensual (sueldo_bruto_anual / num_pagas)
  v_salario_mes := round(v_emp.sueldo_bruto_anual / v_emp.num_pagas, 2);

  -- Base cotización SS (simplificada = salario mensual)
  v_base_ss := v_salario_mes;

  -- SS trabajador
  v_ss_cc         := round(v_base_ss * 0.0470, 2);
  v_ss_desemp     := round(v_base_ss * 0.0155, 2);
  v_ss_fp         := round(v_base_ss * 0.0010, 2);
  v_total_ss_trab := v_ss_cc + v_ss_desemp + v_ss_fp;

  -- IRPF
  v_irpf := round(v_salario_mes * v_emp.irpf_porcentaje / 100, 2);

  -- SS empresa
  v_ss_emp_cc     := round(v_base_ss * 0.2360, 2);
  v_ss_emp_desemp := round(v_base_ss * 0.0550, 2);
  v_ss_emp_atep   := round(v_base_ss * 0.0090, 2);
  v_ss_emp_fogasa := round(v_base_ss * 0.0020, 2);
  v_ss_emp_fp     := round(v_base_ss * 0.0060, 2);
  v_total_ss_emp  := v_ss_emp_cc + v_ss_emp_desemp + v_ss_emp_atep + v_ss_emp_fogasa + v_ss_emp_fp;

  -- Totales
  v_total_deveng := v_salario_mes;
  v_total_deduc  := v_total_ss_trab + v_irpf;
  v_liquido      := v_total_deveng - v_total_deduc;

  -- Insertar cabecera
  INSERT INTO nominas (
    empresa_id, empleado_id, periodo, fecha_pago,
    total_devengado, total_deducciones, liquido_percibir,
    ss_empresa, coste_total_empresa, estado
  ) VALUES (
    v_emp.empresa_id, p_empleado_id, p_periodo,
    (p_periodo || '-28')::date,  -- día 28 por defecto
    v_total_deveng, v_total_deduc, v_liquido,
    v_total_ss_emp, v_total_deveng + v_total_ss_emp,
    'borrador'
  )
  ON CONFLICT (empleado_id, periodo) DO UPDATE
    SET total_devengado     = EXCLUDED.total_devengado,
        total_deducciones   = EXCLUDED.total_deducciones,
        liquido_percibir    = EXCLUDED.liquido_percibir,
        ss_empresa          = EXCLUDED.ss_empresa,
        coste_total_empresa = EXCLUDED.coste_total_empresa,
        updated_at          = now()
  RETURNING id INTO v_nomina_id;

  -- Eliminar conceptos previos (si recalculando)
  DELETE FROM nomina_conceptos WHERE nomina_id = v_nomina_id;

  -- ── DEVENGOS ────────────────────────────────────────────────
  INSERT INTO nomina_conceptos (nomina_id, orden, tipo, codigo, descripcion, importe)
  VALUES
    (v_nomina_id, 1, 'devengado', 'SB', 'Sueldo Base', v_salario_mes);

  -- ── DEDUCCIONES ─────────────────────────────────────────────
  INSERT INTO nomina_conceptos
    (nomina_id, orden, tipo, codigo, descripcion, base_calculo, porcentaje, importe)
  VALUES
    (v_nomina_id, 10, 'deduccion', 'SSCC', 'SS Contingencias Comunes (4.70%)',
     v_base_ss, 4.70, v_ss_cc),
    (v_nomina_id, 11, 'deduccion', 'SSDE', 'SS Desempleo (1.55%)',
     v_base_ss, 1.55, v_ss_desemp),
    (v_nomina_id, 12, 'deduccion', 'SSFP', 'SS Formación Profesional (0.10%)',
     v_base_ss, 0.10, v_ss_fp),
    (v_nomina_id, 20, 'deduccion', 'IRPF', 'Retención IRPF (' || v_emp.irpf_porcentaje || '%)',
     v_salario_mes, v_emp.irpf_porcentaje, v_irpf);

  RETURN v_nomina_id;
END;
$$;

-- ============================================================
-- 7.7  FUNCIÓN: confirmar nómina (cambia estado)
-- ============================================================
CREATE OR REPLACE FUNCTION confirmar_nomina(p_nomina_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE nominas
     SET estado = 'confirmada', updated_at = now()
   WHERE id = p_nomina_id AND estado = 'borrador';
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 7.8  FUNCIÓN: generar nóminas de todos los activos (periodo)
-- ============================================================
CREATE OR REPLACE FUNCTION generar_nominas_periodo(
  p_empresa_id uuid,
  p_periodo    char(7)
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_emp    record;
  v_count  integer := 0;
BEGIN
  FOR v_emp IN
    SELECT id FROM empleados
     WHERE empresa_id = p_empresa_id AND estado = 'activo'
  LOOP
    PERFORM generar_nomina_mensual(v_emp.id, p_periodo);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 7.9  VISTA: nóminas con datos del empleado
-- ============================================================
CREATE OR REPLACE VIEW nominas_detalle AS
SELECT
  n.*,
  e.nombre        || ' ' || e.apellidos AS empleado_nombre,
  e.dni_nie,
  e.puesto,
  e.grupo_cotizacion,
  d.nombre AS departamento
FROM nominas n
JOIN empleados e ON e.id = n.empleado_id
LEFT JOIN departamentos d ON d.id = e.departamento_id;

-- ============================================================
-- 7.10  VISTA: resumen masa salarial por empresa y periodo
-- ============================================================
CREATE OR REPLACE VIEW masa_salarial_periodo AS
SELECT
  n.empresa_id,
  n.periodo,
  COUNT(*)                          AS num_nominas,
  SUM(n.total_devengado)            AS total_bruto,
  SUM(n.total_deducciones)          AS total_deducciones,
  SUM(n.liquido_percibir)           AS total_liquido,
  SUM(n.ss_empresa)                 AS total_ss_empresa,
  SUM(n.coste_total_empresa)        AS coste_total
FROM nominas n
WHERE n.estado IN ('confirmada','pagada')
GROUP BY n.empresa_id, n.periodo;

-- ============================================================
-- 7.11  VISTA: plantilla activa por empresa
-- ============================================================
CREATE OR REPLACE VIEW plantilla_activa AS
SELECT
  e.empresa_id,
  e.id,
  e.nombre || ' ' || e.apellidos AS nombre_completo,
  e.dni_nie,
  e.puesto,
  e.grupo_cotizacion,
  e.tipo_contrato,
  e.jornada,
  e.porcentaje_jornada,
  e.sueldo_bruto_anual,
  round(e.sueldo_bruto_anual / e.num_pagas, 2) AS salario_mensual,
  e.irpf_porcentaje,
  e.fecha_alta,
  d.nombre AS departamento
FROM empleados e
LEFT JOIN departamentos d ON d.id = e.departamento_id
WHERE e.estado = 'activo';

-- ============================================================
-- 7.12  VISTA: ausencias pendientes de aprobación
-- ============================================================
CREATE OR REPLACE VIEW ausencias_pendientes AS
SELECT
  a.*,
  e.nombre || ' ' || e.apellidos AS empleado_nombre,
  e.puesto,
  d.nombre AS departamento
FROM ausencias a
JOIN empleados e ON e.id = a.empleado_id
LEFT JOIN departamentos d ON d.id = e.departamento_id
WHERE a.estado = 'solicitada';
