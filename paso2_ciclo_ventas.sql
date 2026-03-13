-- ============================================================
-- PASO 2 — Ciclo de Ventas Completo
-- Presupuestos → Pedidos de Venta → Albaranes → Facturas
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── SECUENCIAS DE NUMERACIÓN ────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS presupuestos_seq START 1;
CREATE SEQUENCE IF NOT EXISTS pedidos_venta_seq  START 1;
CREATE SEQUENCE IF NOT EXISTS albaranes_seq       START 1;

-- ─── 1. PRESUPUESTOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    referencia       text          UNIQUE NOT NULL
                         DEFAULT 'PRES-' || LPAD(nextval('presupuestos_seq')::text, 4, '0'),
    empresa_id       uuid          NOT NULL REFERENCES public.empresas(id),
    delegacion_id    uuid          REFERENCES public.delegaciones(id),
    cliente_id       uuid          NOT NULL REFERENCES public.clients(id),
    cliente_nombre   text,
    fecha            date          NOT NULL DEFAULT CURRENT_DATE,
    fecha_validez    date,
    estado           text          NOT NULL DEFAULT 'borrador'
                         CHECK (estado IN ('borrador','enviado','aceptado','rechazado','facturado','cancelado')),
    subtotal         numeric(12,2) NOT NULL DEFAULT 0,
    descuento_global numeric(5,2)  NOT NULL DEFAULT 0,
    base_imponible   numeric(12,2) NOT NULL DEFAULT 0,
    iva_porcentaje   numeric(5,2)  NOT NULL DEFAULT 21,
    iva              numeric(12,2) NOT NULL DEFAULT 0,
    total            numeric(12,2) NOT NULL DEFAULT 0,
    notas            text,
    condiciones      text,
    created_by       uuid          REFERENCES public.clients(id),
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_presupuestos" ON public.presupuestos;
CREATE POLICY "anon_all_presupuestos" ON public.presupuestos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.presupuesto_lineas (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    presupuesto_id   uuid          NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    orden            integer       NOT NULL DEFAULT 1,
    producto_id      uuid          REFERENCES public.products(id),
    descripcion      text          NOT NULL,
    cantidad         numeric(12,4) NOT NULL DEFAULT 1,
    precio_unitario  numeric(12,4) NOT NULL DEFAULT 0,
    descuento        numeric(5,2)  NOT NULL DEFAULT 0,
    iva_porcentaje   numeric(5,2)  NOT NULL DEFAULT 21,
    subtotal         numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.presupuesto_lineas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_pres_lin" ON public.presupuesto_lineas;
CREATE POLICY "anon_all_pres_lin" ON public.presupuesto_lineas FOR ALL USING (true) WITH CHECK (true);

-- ─── 2. PEDIDOS DE VENTA ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pedidos_venta (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    referencia       text          UNIQUE NOT NULL
                         DEFAULT 'PED-' || LPAD(nextval('pedidos_venta_seq')::text, 4, '0'),
    presupuesto_id   uuid          REFERENCES public.presupuestos(id),
    empresa_id       uuid          NOT NULL REFERENCES public.empresas(id),
    delegacion_id    uuid          REFERENCES public.delegaciones(id),
    almacen_id       uuid          REFERENCES public.almacenes(id),
    cliente_id       uuid          NOT NULL REFERENCES public.clients(id),
    cliente_nombre   text,
    fecha            date          NOT NULL DEFAULT CURRENT_DATE,
    fecha_entrega    date,
    estado           text          NOT NULL DEFAULT 'confirmado'
                         CHECK (estado IN ('borrador','confirmado','en_proceso','entregado','facturado','cancelado')),
    subtotal         numeric(12,2) NOT NULL DEFAULT 0,
    descuento_global numeric(5,2)  NOT NULL DEFAULT 0,
    base_imponible   numeric(12,2) NOT NULL DEFAULT 0,
    iva_porcentaje   numeric(5,2)  NOT NULL DEFAULT 21,
    iva              numeric(12,2) NOT NULL DEFAULT 0,
    total            numeric(12,2) NOT NULL DEFAULT 0,
    metodo_envio     text          DEFAULT 'agencia'
                         CHECK (metodo_envio IN ('agencia','propio','recogida')),
    notas            text,
    created_by       uuid          REFERENCES public.clients(id),
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_venta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_ped_venta" ON public.pedidos_venta;
CREATE POLICY "anon_all_ped_venta" ON public.pedidos_venta FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pedido_venta_lineas (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_venta_id  uuid          NOT NULL REFERENCES public.pedidos_venta(id) ON DELETE CASCADE,
    orden            integer       NOT NULL DEFAULT 1,
    producto_id      uuid          REFERENCES public.products(id),
    descripcion      text          NOT NULL,
    cantidad         numeric(12,4) NOT NULL DEFAULT 1,
    precio_unitario  numeric(12,4) NOT NULL DEFAULT 0,
    descuento        numeric(5,2)  NOT NULL DEFAULT 0,
    iva_porcentaje   numeric(5,2)  NOT NULL DEFAULT 21,
    subtotal         numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.pedido_venta_lineas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_ped_lin" ON public.pedido_venta_lineas;
CREATE POLICY "anon_all_ped_lin" ON public.pedido_venta_lineas FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. ALBARANES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.albaranes (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    referencia       text          UNIQUE NOT NULL
                         DEFAULT 'ALB-' || LPAD(nextval('albaranes_seq')::text, 4, '0'),
    pedido_venta_id  uuid          REFERENCES public.pedidos_venta(id),
    empresa_id       uuid          NOT NULL REFERENCES public.empresas(id),
    delegacion_id    uuid          REFERENCES public.delegaciones(id),
    almacen_id       uuid          REFERENCES public.almacenes(id),
    cliente_id       uuid          NOT NULL REFERENCES public.clients(id),
    cliente_nombre   text,
    fecha            date          NOT NULL DEFAULT CURRENT_DATE,
    estado           text          NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente','entregado','firmado','facturado')),
    firma_cliente    text,
    firma_fecha      timestamptz,
    firma_nombre     text,
    notas            text,
    created_by       uuid          REFERENCES public.clients(id),
    created_at       timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.albaranes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_albaranes" ON public.albaranes;
CREATE POLICY "anon_all_albaranes" ON public.albaranes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.albaran_lineas (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    albaran_id       uuid          NOT NULL REFERENCES public.albaranes(id) ON DELETE CASCADE,
    orden            integer       NOT NULL DEFAULT 1,
    producto_id      uuid          REFERENCES public.products(id),
    descripcion      text          NOT NULL,
    cantidad         numeric(12,4) NOT NULL DEFAULT 1,
    precio_unitario  numeric(12,4) NOT NULL DEFAULT 0,
    descuento        numeric(5,2)  NOT NULL DEFAULT 0,
    iva_porcentaje   numeric(5,2)  NOT NULL DEFAULT 21,
    subtotal         numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.albaran_lineas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_alb_lin" ON public.albaran_lineas;
CREATE POLICY "anon_all_alb_lin" ON public.albaran_lineas FOR ALL USING (true) WITH CHECK (true);

-- ─── 4. FACTURAS ─────────────────────────────────────────────
-- Contador por empresa + serie + año
CREATE TABLE IF NOT EXISTS public.factura_contadores (
    id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id  uuid    NOT NULL REFERENCES public.empresas(id),
    serie       text    NOT NULL,
    anio        integer NOT NULL,
    ultimo      integer NOT NULL DEFAULT 0,
    UNIQUE (empresa_id, serie, anio)
);
ALTER TABLE public.factura_contadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_fac_cont" ON public.factura_contadores;
CREATE POLICY "anon_all_fac_cont" ON public.factura_contadores FOR ALL USING (true) WITH CHECK (true);

-- Función atómica: incrementa contador y devuelve el número
CREATE OR REPLACE FUNCTION public.next_factura_number(
    p_empresa_id uuid,
    p_serie      text,
    p_anio       integer
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
    INSERT INTO public.factura_contadores (empresa_id, serie, anio, ultimo)
    VALUES (p_empresa_id, p_serie, p_anio, 1)
    ON CONFLICT (empresa_id, serie, anio)
    DO UPDATE SET ultimo = factura_contadores.ultimo + 1
    RETURNING ultimo INTO v_num;
    RETURN v_num;
END; $$;

CREATE TABLE IF NOT EXISTS public.facturas (
    id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    serie             text          NOT NULL,
    numero            integer       NOT NULL,
    referencia        text          UNIQUE NOT NULL,   -- A-0001, B-0001…
    empresa_id        uuid          NOT NULL REFERENCES public.empresas(id),
    delegacion_id     uuid          REFERENCES public.delegaciones(id),
    cliente_id        uuid          NOT NULL REFERENCES public.clients(id),
    cliente_nombre    text,
    presupuesto_id    uuid          REFERENCES public.presupuestos(id),
    pedido_venta_id   uuid          REFERENCES public.pedidos_venta(id),
    albaran_id        uuid          REFERENCES public.albaranes(id),
    fecha             date          NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento date,
    estado            text          NOT NULL DEFAULT 'emitida'
                          CHECK (estado IN ('borrador','emitida','enviada','cobrada','cancelada')),
    subtotal          numeric(12,2) NOT NULL DEFAULT 0,
    descuento_global  numeric(5,2)  NOT NULL DEFAULT 0,
    base_imponible    numeric(12,2) NOT NULL DEFAULT 0,
    iva_porcentaje    numeric(5,2)  NOT NULL DEFAULT 21,
    iva               numeric(12,2) NOT NULL DEFAULT 0,
    total             numeric(12,2) NOT NULL DEFAULT 0,
    metodo_cobro      text,
    fecha_cobro       date,
    notas             text,
    verifactu_hash    text,          -- Fase 4
    created_by        uuid          REFERENCES public.clients(id),
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now()
);
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_facturas" ON public.facturas;
CREATE POLICY "anon_all_facturas" ON public.facturas FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.factura_lineas (
    id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    factura_id       uuid          NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
    orden            integer       NOT NULL DEFAULT 1,
    producto_id      uuid          REFERENCES public.products(id),
    descripcion      text          NOT NULL,
    cantidad         numeric(12,4) NOT NULL DEFAULT 1,
    precio_unitario  numeric(12,4) NOT NULL DEFAULT 0,
    descuento        numeric(5,2)  NOT NULL DEFAULT 0,
    iva_porcentaje   numeric(5,2)  NOT NULL DEFAULT 21,
    subtotal         numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.factura_lineas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_fac_lin" ON public.factura_lineas;
CREATE POLICY "anon_all_fac_lin" ON public.factura_lineas FOR ALL USING (true) WITH CHECK (true);

-- ─── Inicializar contadores ───────────────────────────────────
-- Serie A = Digital Market Dpi'sur (B73486474)
INSERT INTO public.factura_contadores (empresa_id, serie, anio, ultimo)
SELECT id, 'A', EXTRACT(year FROM now())::integer, 0
FROM public.empresas WHERE cif = 'B73486474'
ON CONFLICT DO NOTHING;

-- Serie B = Digital Market Andalucía (B73860538)
INSERT INTO public.factura_contadores (empresa_id, serie, anio, ultimo)
SELECT id, 'B', EXTRACT(year FROM now())::integer, 0
FROM public.empresas WHERE cif = 'B73860538'
ON CONFLICT DO NOTHING;

-- ─── VERIFICACIÓN ─────────────────────────────────────────────
SELECT 'presupuestos'       AS tabla, COUNT(*) AS filas FROM public.presupuestos
UNION ALL SELECT 'pedidos_venta',     COUNT(*) FROM public.pedidos_venta
UNION ALL SELECT 'albaranes',         COUNT(*) FROM public.albaranes
UNION ALL SELECT 'facturas',          COUNT(*) FROM public.facturas
UNION ALL SELECT 'factura_contadores',COUNT(*) FROM public.factura_contadores;
