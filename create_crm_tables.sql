-- ============================================================
-- CRM Tables: client_visits y client_calls
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabla de Visitas comerciales
CREATE TABLE IF NOT EXISTS public.client_visits (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id     uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sales_rep_id  uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    visit_date    timestamptz NOT NULL DEFAULT now(),
    notes         text,
    next_action   text,
    client_name   text,
    sales_rep_name text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_visits" ON public.client_visits;
CREATE POLICY "anon_all_visits" ON public.client_visits
    FOR ALL USING (true) WITH CHECK (true);

-- Tabla de Llamadas comerciales
CREATE TABLE IF NOT EXISTS public.client_calls (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id     uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sales_rep_id  uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    call_date     timestamptz NOT NULL DEFAULT now(),
    direction     text        NOT NULL DEFAULT 'outbound',
    summary       text,
    client_name   text,
    sales_rep_name text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_calls" ON public.client_calls;
CREATE POLICY "anon_all_calls" ON public.client_calls
    FOR ALL USING (true) WITH CHECK (true);
