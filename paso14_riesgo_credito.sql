  -- ============================================================
  -- PASO 14 — RIESGO DE CRÉDITO / LÍMITE COFACE
  -- Portal Pedidos DM — Digital Market
  -- ============================================================
  -- Gestión del riesgo crediticio por cliente:
  --   · Límite aprobado por COFACE (aseguradora de crédito)
  --   · Límite interno complementario cuando COFACE no cubre
  --   · Cálculo automático de riesgo vivo:
  --       - Facturas pendientes de cobro (vencidas + en plazo)
  --       - Pedidos confirmados aún sin facturar
  --   · Semáforo de estado: ok / alerta / vencido / excedido / bloqueado
  --   · Bloqueo manual de cliente para no seguir sirviendo mercancía
  -- ============================================================

  -- ============================================================
  -- 14.1  Tabla: límites de crédito por cliente
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.limites_credito (
    id                        uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id                uuid          NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id                uuid          NOT NULL REFERENCES public.clients(id)  ON DELETE CASCADE,

    -- ── Datos COFACE (o aseguradora equivalente) ──────────────
    limite_coface             numeric(12,2),             -- Importe cubierto por COFACE
    clasificacion_coface      text,                      -- A1, A2, A3, A4, B, C, D
    numero_poliza_coface      text,                      -- Nº expediente / dossier COFACE
    fecha_consulta_coface     date,                      -- Fecha de la última consulta realizada
    fecha_vencimiento_coface  date,                      -- Fecha en que caduca la cobertura (anual)

    -- ── Límite interno (cuando no hay COFACE o como complemento) ──
    limite_interno            numeric(12,2),

    -- ── Bloqueo manual ────────────────────────────────────────
    bloqueado                 boolean       NOT NULL DEFAULT false,
    motivo_bloqueo            text,                      -- Razón del bloqueo (mora, litigio…)
    fecha_bloqueo             timestamptz,
    bloqueado_por             uuid          REFERENCES public.clients(id),

    -- ── Metadatos ─────────────────────────────────────────────
    notas                     text,
    created_at                timestamptz   NOT NULL DEFAULT now(),
    updated_at                timestamptz   NOT NULL DEFAULT now(),

    UNIQUE (empresa_id, cliente_id)
  );

  -- Trigger para mantener updated_at automático
  CREATE OR REPLACE FUNCTION public.set_updated_at_fn()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN NEW.updated_at = now(); RETURN NEW; END;
  $$;

  DROP TRIGGER IF EXISTS trg_limites_credito_upd ON public.limites_credito;
  CREATE TRIGGER trg_limites_credito_upd
    BEFORE UPDATE ON public.limites_credito
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_fn();

  -- Row Level Security: cada empresa solo ve sus propios límites
  ALTER TABLE public.limites_credito ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "limites_empresa_propia" ON public.limites_credito;
  CREATE POLICY "limites_empresa_propia" ON public.limites_credito
    USING (
      empresa_id IN (
        SELECT empresa_id FROM public.clients WHERE id = auth.uid()
      )
    );

  -- ============================================================
  -- 14.2  Vista: riesgo vivo por cliente
  -- ============================================================
  -- Para cada cliente calcula en tiempo real:
  --   deuda_vencida         → facturas cuyo vencimiento ya pasó
  --   deuda_vigente         → facturas en plazo pero sin cobrar
  --   pedidos_sin_facturar  → pedidos confirmados sin factura emitida
  --   riesgo_vivo           → suma de todo lo anterior
  --   pct_limite_usado      → porcentaje del límite COFACE/interno consumido
  --   estado_riesgo         → semáforo (ok / alerta / vencido / excedido / bloqueado / sin_limite)
  -- ============================================================
  CREATE OR REPLACE VIEW public.v_riesgo_cliente AS
  WITH

  -- ── CTE 0: empresa_id del cliente (desde su factura más reciente) ──
  -- clients no tiene empresa_id; lo derivamos de facturas o limites_credito
  empresa_cliente AS (
    SELECT DISTINCT ON (cliente_id)
      cliente_id,
      empresa_id
    FROM public.facturas
    WHERE cliente_id IS NOT NULL
    ORDER BY cliente_id, fecha DESC
  ),

  -- ── CTE 1: saldos pendientes agrupados por cliente ────────────
  facturas_pendientes AS (
    SELECT
      f.cliente_id,

      SUM(
        f.total - COALESCE(
          (SELECT SUM(co.importe) FROM public.cobros co WHERE co.factura_id = f.id),
          0
        )
      )                                                         AS saldo_pendiente,

      -- Parte vencida
      SUM(
        CASE
          WHEN COALESCE(f.fecha_vencimiento, f.fecha + INTERVAL '30 days') < CURRENT_DATE
          THEN f.total - COALESCE(
            (SELECT SUM(co.importe) FROM public.cobros co WHERE co.factura_id = f.id), 0
          )
          ELSE 0
        END
      )                                                         AS saldo_vencido,

      -- Parte vigente
      SUM(
        CASE
          WHEN COALESCE(f.fecha_vencimiento, f.fecha + INTERVAL '30 days') >= CURRENT_DATE
          THEN f.total - COALESCE(
            (SELECT SUM(co.importe) FROM public.cobros co WHERE co.factura_id = f.id), 0
          )
          ELSE 0
        END
      )                                                         AS saldo_vigente,

      -- Días del vencimiento más antiguo
      MAX(
        CASE
          WHEN COALESCE(f.fecha_vencimiento, f.fecha + INTERVAL '30 days') < CURRENT_DATE
          THEN EXTRACT(DAY FROM (
            CURRENT_DATE - COALESCE(f.fecha_vencimiento, f.fecha + INTERVAL '30 days')
          ))
          ELSE 0
        END
      )::int                                                    AS dias_mayor_vencimiento,

      COUNT(*)::int                                             AS num_facturas_pendientes

    FROM public.facturas f
    WHERE f.estado IN ('emitida', 'parcialmente_cobrada', 'vencida')
    GROUP BY f.cliente_id
  ),

  -- ── CTE 2: pedidos confirmados sin factura emitida ────────────
  pedidos_sin_facturar AS (
    SELECT
      pv.cliente_id,
      SUM(pv.total)                                             AS total_pedidos_vivos,
      COUNT(*)::int                                             AS num_pedidos_vivos
    FROM public.pedidos_venta pv
    WHERE pv.estado IN ('confirmado', 'en_proceso', 'entregado')
      AND NOT EXISTS (
        SELECT 1 FROM public.facturas f
        WHERE f.pedido_venta_id = pv.id
          AND f.estado NOT IN ('anulada', 'borrador')
      )
    GROUP BY pv.cliente_id
  )

  SELECT
    -- ── Datos del cliente ──────────────────────────────────────
    c.id                                                        AS cliente_id,
    c.company_name                                              AS cliente_nombre,
    c.email,
    NULL::text                                                  AS cif,
    -- empresa_id viene de limites_credito si existe, sino de la última factura
    COALESCE(lc.empresa_id, ec.empresa_id)                      AS empresa_id,

    -- ── Datos del límite ──────────────────────────────────────
    lc.id                                                       AS limite_id,
    lc.limite_coface,
    lc.clasificacion_coface,
    lc.numero_poliza_coface,
    lc.fecha_consulta_coface,
    lc.fecha_vencimiento_coface,
    lc.limite_interno,

    COALESCE(lc.limite_coface, lc.limite_interno, 0)            AS limite_efectivo,

    -- ── Bloqueo ───────────────────────────────────────────────
    COALESCE(lc.bloqueado, false)                               AS bloqueado,
    lc.motivo_bloqueo,
    lc.fecha_bloqueo,

    -- ── Riesgo calculado ──────────────────────────────────────
    COALESCE(fp.saldo_pendiente,        0)                      AS deuda_total,
    COALESCE(fp.saldo_vencido,          0)                      AS deuda_vencida,
    COALESCE(fp.saldo_vigente,          0)                      AS deuda_vigente,
    COALESCE(ps.total_pedidos_vivos,    0)                      AS pedidos_sin_facturar,
    COALESCE(fp.num_facturas_pendientes,0)                      AS num_facturas_pendientes,
    COALESCE(ps.num_pedidos_vivos,      0)                      AS num_pedidos_vivos,
    COALESCE(fp.dias_mayor_vencimiento, 0)                      AS dias_mayor_vencimiento,

    COALESCE(fp.saldo_pendiente, 0) + COALESCE(ps.total_pedidos_vivos, 0)
                                                                AS riesgo_vivo,

    -- ── % del límite consumido ────────────────────────────────
    CASE
      WHEN COALESCE(lc.limite_coface, lc.limite_interno, 0) > 0
      THEN ROUND(
        (COALESCE(fp.saldo_pendiente,0) + COALESCE(ps.total_pedidos_vivos,0))
        / COALESCE(lc.limite_coface, lc.limite_interno) * 100,
        1
      )
      ELSE NULL
    END                                                         AS pct_limite_usado,

    -- ── Crédito disponible ────────────────────────────────────
    GREATEST(
      0,
      COALESCE(lc.limite_coface, lc.limite_interno, 0)
      - COALESCE(fp.saldo_pendiente, 0)
      - COALESCE(ps.total_pedidos_vivos, 0)
    )                                                           AS credito_disponible,

    -- ── Estado semáforo ───────────────────────────────────────
    CASE
      WHEN COALESCE(lc.bloqueado, false) = true
        THEN 'bloqueado'
      WHEN COALESCE(lc.limite_coface, lc.limite_interno) IS NOT NULL
        AND (COALESCE(fp.saldo_pendiente,0) + COALESCE(ps.total_pedidos_vivos,0))
            >= COALESCE(lc.limite_coface, lc.limite_interno)
        THEN 'excedido'
      WHEN COALESCE(fp.saldo_vencido, 0) > 0
        THEN 'vencido'
      WHEN COALESCE(lc.limite_coface, lc.limite_interno) IS NOT NULL
        AND (COALESCE(fp.saldo_pendiente,0) + COALESCE(ps.total_pedidos_vivos,0))
            >= COALESCE(lc.limite_coface, lc.limite_interno) * 0.8
        THEN 'alerta'
      WHEN COALESCE(lc.limite_coface, lc.limite_interno) IS NULL
        THEN 'sin_limite'
      ELSE 'ok'
    END                                                         AS estado_riesgo

  FROM public.clients c
  -- empresa_id desde la última factura del cliente
  LEFT JOIN empresa_cliente           ec ON ec.cliente_id = c.id
  -- límite de crédito (sin filtrar por empresa_id en el JOIN)
  LEFT JOIN public.limites_credito    lc ON lc.cliente_id = c.id
  -- saldos de facturas pendientes
  LEFT JOIN facturas_pendientes       fp ON fp.cliente_id  = c.id
  -- pedidos sin facturar
  LEFT JOIN pedidos_sin_facturar      ps ON ps.cliente_id  = c.id
  WHERE c.role = 'client'
    AND COALESCE(c.is_active, true) = true
    -- Solo mostrar clientes que tengan algún registro en el sistema
    AND (lc.id IS NOT NULL OR ec.empresa_id IS NOT NULL);


  -- ============================================================
  -- 14.3  Vista: detalle de facturas pendientes por cliente
  -- ============================================================
  -- Usada en el panel de detalle para mostrar el listado de
  -- facturas sin cobrar de un cliente concreto.
  -- ============================================================
  CREATE OR REPLACE VIEW public.v_facturas_pendientes_cliente AS
  SELECT
    f.id,
    f.referencia,
    f.empresa_id,
    f.cliente_id,
    f.cliente_nombre,
    f.fecha,
    f.fecha_vencimiento,
    f.estado,
    f.total,

    -- Lo ya cobrado (suma de cobros registrados)
    COALESCE(
      (SELECT SUM(c.importe) FROM public.cobros c WHERE c.factura_id = f.id),
      0
    )                                                           AS total_cobrado,

    -- Saldo pendiente
    f.total - COALESCE(
      (SELECT SUM(c.importe) FROM public.cobros c WHERE c.factura_id = f.id),
      0
    )                                                           AS saldo_pendiente,

    -- Días de antigüedad del vencimiento (0 si aún no ha vencido)
    GREATEST(
      0,
      EXTRACT(DAY FROM (
        CURRENT_DATE - COALESCE(f.fecha_vencimiento, f.fecha + INTERVAL '30 days')
      ))
    )::int                                                      AS dias_vencida

  FROM public.facturas f
  WHERE f.estado IN ('emitida', 'parcialmente_cobrada', 'vencida');


  -- ============================================================
  -- 14.4  Índices de rendimiento
  -- ============================================================
  CREATE INDEX IF NOT EXISTS idx_facturas_cliente_estado
    ON public.facturas (cliente_id, estado)
    WHERE estado IN ('emitida', 'parcialmente_cobrada', 'vencida');

  CREATE INDEX IF NOT EXISTS idx_pedidos_venta_cliente_estado
    ON public.pedidos_venta (cliente_id, estado)
    WHERE estado IN ('confirmado', 'en_proceso', 'entregado');

  CREATE INDEX IF NOT EXISTS idx_cobros_factura
    ON public.cobros (factura_id);

  CREATE INDEX IF NOT EXISTS idx_limites_credito_empresa_cliente
    ON public.limites_credito (empresa_id, cliente_id);
