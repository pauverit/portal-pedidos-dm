-- ============================================================
-- PASO 10 — GASTOS DE EMPRESA
-- Portal Pedidos DM — Digital Market
-- Alquiler, suministros, combustible, seguros, asesoría...
-- ============================================================

-- ============================================================
-- 10.1  Categorías de gasto (árbol PGC)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_gasto (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  codigo_pgc   text,            -- Cuenta PGC (621, 628, 629, 631, 641...)
  descripcion  text,
  color        text DEFAULT '#6366f1',
  icono        text DEFAULT 'receipt',
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- Seed categorías estándar (se insertan por empresa al crearla o manualmente)
-- Las empresas deben llamar a seed_categorias_gasto(empresa_id)

CREATE OR REPLACE FUNCTION seed_categorias_gasto(p_empresa_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO categorias_gasto (empresa_id, nombre, codigo_pgc, descripcion, color, icono) VALUES
    (p_empresa_id, 'Alquileres',           '621', 'Arrendamiento de locales, naves y oficinas',          '#3b82f6', 'building'),
    (p_empresa_id, 'Renting vehículos',    '621', 'Arrendamiento financiero de vehículos',               '#6366f1', 'car'),
    (p_empresa_id, 'Electricidad',         '628', 'Consumo eléctrico de instalaciones',                  '#f59e0b', 'zap'),
    (p_empresa_id, 'Agua',                 '628', 'Suministro de agua',                                  '#06b6d4', 'droplets'),
    (p_empresa_id, 'Gas / Calefacción',    '628', 'Gas natural y gasóleo de calefacción',                '#f97316', 'flame'),
    (p_empresa_id, 'Combustible',          '628', 'Gasoil y gasolina para vehículos de empresa',         '#84cc16', 'fuel'),
    (p_empresa_id, 'Telecomunicaciones',   '628', 'Internet, teléfono fijo y móvil',                     '#8b5cf6', 'wifi'),
    (p_empresa_id, 'Seguros',              '625', 'Pólizas de seguro (RC, vehículos, edificios...)',      '#10b981', 'shield'),
    (p_empresa_id, 'Asesoría / Gestoría',  '623', 'Servicios de gestoría, asesoría fiscal y laboral',    '#ec4899', 'briefcase'),
    (p_empresa_id, 'Publicidad',           '627', 'Marketing, publicidad y ferias',                      '#f43f5e', 'megaphone'),
    (p_empresa_id, 'Mantenimiento',        '622', 'Reparaciones y conservación de instalaciones',        '#64748b', 'wrench'),
    (p_empresa_id, 'Material de oficina',  '629', 'Papelería, consumibles y material fungible',          '#a78bfa', 'paperclip'),
    (p_empresa_id, 'Dietas y viajes',      '629', 'Desplazamientos, dietas y alojamiento',               '#fb923c', 'plane'),
    (p_empresa_id, 'Servicios bancarios',  '626', 'Comisiones bancarias y gastos financieros',           '#94a3b8', 'landmark'),
    (p_empresa_id, 'Tributos',             '631', 'IBI, IAE y otros impuestos locales',                  '#ef4444', 'scroll'),
    (p_empresa_id, 'Otros gastos',         '629', 'Gastos no clasificados en otras categorías',          '#6b7280', 'more-horizontal')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10.2  Acreedores (proveedores de servicios)
-- ============================================================
CREATE TABLE IF NOT EXISTS acreedores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  nif             text,
  iban            text,
  email           text,
  telefono        text,
  direccion       text,
  categoria_id    uuid REFERENCES categorias_gasto(id) ON DELETE SET NULL,
  notas           text,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 10.3  Gastos (facturas de acreedor / tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS gastos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  acreedor_id     uuid REFERENCES acreedores(id) ON DELETE SET NULL,
  acreedor_nombre text NOT NULL,
  categoria_id    uuid REFERENCES categorias_gasto(id) ON DELETE SET NULL,
  categoria_nombre text,
  numero_factura  text,
  fecha           date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  concepto        text NOT NULL,
  base_imponible  numeric(14,2) NOT NULL DEFAULT 0,
  iva_porcentaje  numeric(5,2)  NOT NULL DEFAULT 21,
  iva             numeric(14,2) NOT NULL DEFAULT 0,
  irpf_porcentaje numeric(5,2)  NOT NULL DEFAULT 0,
  irpf            numeric(14,2) NOT NULL DEFAULT 0,
  total           numeric(14,2) NOT NULL DEFAULT 0,
  forma_pago      text NOT NULL DEFAULT 'transferencia'
                  CHECK (forma_pago IN ('transferencia','domiciliacion','tarjeta','efectivo','cheque')),
  estado          text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','pagado','vencido','anulado')),
  es_recurrente   boolean NOT NULL DEFAULT false,
  periodo         text,          -- YYYY-MM si viene de recurrente
  url_documento   text,          -- Enlace al PDF/imagen del justificante
  asiento_id      uuid,          -- Enlace al asiento contable (PASO 5)
  notas           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Trigger: calcular IVA, IRPF y total automáticamente
CREATE OR REPLACE FUNCTION calcular_totales_gasto()
RETURNS TRIGGER AS $$
BEGIN
  NEW.iva   := round(NEW.base_imponible * NEW.iva_porcentaje  / 100, 2);
  NEW.irpf  := round(NEW.base_imponible * NEW.irpf_porcentaje / 100, 2);
  NEW.total := NEW.base_imponible + NEW.iva - NEW.irpf;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_totales_gasto ON gastos;
CREATE TRIGGER trg_totales_gasto
  BEFORE INSERT OR UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION calcular_totales_gasto();

-- ============================================================
-- 10.4  Gastos recurrentes (plantillas mensuales/anuales)
-- ============================================================
CREATE TABLE IF NOT EXISTS gastos_recurrentes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  acreedor_id     uuid REFERENCES acreedores(id) ON DELETE SET NULL,
  acreedor_nombre text NOT NULL,
  categoria_id    uuid REFERENCES categorias_gasto(id) ON DELETE SET NULL,
  categoria_nombre text,
  concepto        text NOT NULL,
  base_imponible  numeric(14,2) NOT NULL DEFAULT 0,
  iva_porcentaje  numeric(5,2)  NOT NULL DEFAULT 21,
  irpf_porcentaje numeric(5,2)  NOT NULL DEFAULT 0,
  dia_vencimiento int           NOT NULL DEFAULT 1   -- Día del mes de vencimiento
                  CHECK (dia_vencimiento BETWEEN 1 AND 31),
  frecuencia      text NOT NULL DEFAULT 'mensual'
                  CHECK (frecuencia IN ('mensual','trimestral','semestral','anual')),
  forma_pago      text NOT NULL DEFAULT 'domiciliacion'
                  CHECK (forma_pago IN ('transferencia','domiciliacion','tarjeta','efectivo','cheque')),
  activo          boolean NOT NULL DEFAULT true,
  ultimo_periodo  text,          -- Último YYYY-MM generado
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 10.5  Función: generar gastos recurrentes del mes
-- ============================================================
CREATE OR REPLACE FUNCTION generar_gastos_mes(
  p_empresa_id uuid,
  p_periodo    text   -- 'YYYY-MM'
) RETURNS int AS $$
DECLARE
  v_count int := 0;
  rec     gastos_recurrentes;
  v_fecha date;
  v_mes   int;
  v_año   int;
BEGIN
  v_año  := extract(year  FROM to_date(p_periodo, 'YYYY-MM'))::int;
  v_mes  := extract(month FROM to_date(p_periodo, 'YYYY-MM'))::int;

  FOR rec IN
    SELECT * FROM gastos_recurrentes
    WHERE empresa_id = p_empresa_id
      AND activo = true
      AND (ultimo_periodo IS NULL OR ultimo_periodo < p_periodo)
      AND (
        frecuencia = 'mensual'
        OR (frecuencia = 'trimestral' AND v_mes IN (1,4,7,10))
        OR (frecuencia = 'semestral'  AND v_mes IN (1,7))
        OR (frecuencia = 'anual'      AND v_mes = 1)
      )
  LOOP
    -- Calcular fecha: último día del mes si dia_vencimiento > días del mes
    v_fecha := (to_date(p_periodo || '-01', 'YYYY-MM-DD')
                + ((rec.dia_vencimiento - 1) || ' days')::interval)::date;
    -- Ajustar si se pasa del mes
    IF extract(month FROM v_fecha) <> v_mes THEN
      v_fecha := (date_trunc('month', to_date(p_periodo || '-01', 'YYYY-MM-DD'))
                  + interval '1 month' - interval '1 day')::date;
    END IF;

    INSERT INTO gastos (
      empresa_id, acreedor_id, acreedor_nombre,
      categoria_id, categoria_nombre,
      fecha, fecha_vencimiento, concepto,
      base_imponible, iva_porcentaje, irpf_porcentaje,
      forma_pago, es_recurrente, periodo
    ) VALUES (
      p_empresa_id, rec.acreedor_id, rec.acreedor_nombre,
      rec.categoria_id, rec.categoria_nombre,
      v_fecha, v_fecha, rec.concepto,
      rec.base_imponible, rec.iva_porcentaje, rec.irpf_porcentaje,
      rec.forma_pago, true, p_periodo
    );

    UPDATE gastos_recurrentes SET ultimo_periodo = p_periodo WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10.6  Vista: resumen de gastos por categoría y mes
-- ============================================================
CREATE OR REPLACE VIEW gastos_por_categoria AS
SELECT
  empresa_id,
  to_char(fecha, 'YYYY-MM')    AS periodo,
  categoria_id,
  categoria_nombre,
  COUNT(*)                     AS num_gastos,
  SUM(base_imponible)          AS base_total,
  SUM(iva)                     AS iva_total,
  SUM(total)                   AS total_gastos,
  SUM(CASE WHEN estado = 'pagado' THEN total ELSE 0 END)   AS total_pagado,
  SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) AS total_pendiente
FROM gastos
WHERE estado <> 'anulado'
GROUP BY empresa_id, to_char(fecha, 'YYYY-MM'), categoria_id, categoria_nombre;

-- ============================================================
-- 10.7  Vista: gastos pendientes de pago
-- ============================================================
CREATE OR REPLACE VIEW gastos_pendientes AS
SELECT
  g.id,
  g.empresa_id,
  g.acreedor_nombre,
  g.categoria_nombre,
  g.concepto,
  g.fecha,
  g.fecha_vencimiento,
  g.total,
  g.forma_pago,
  g.estado,
  CASE
    WHEN g.fecha_vencimiento < CURRENT_DATE AND g.estado = 'pendiente' THEN 'vencido'
    WHEN g.fecha_vencimiento <= CURRENT_DATE + 7 AND g.estado = 'pendiente' THEN 'vence_pronto'
    ELSE g.estado
  END AS situacion,
  CASE
    WHEN g.fecha_vencimiento < CURRENT_DATE AND g.estado = 'pendiente'
    THEN (CURRENT_DATE - g.fecha_vencimiento)
    ELSE 0
  END AS dias_retraso
FROM gastos g
WHERE g.estado IN ('pendiente','vencido');
