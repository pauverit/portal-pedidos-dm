-- ============================================================
-- PASO 1 — Estructura Base Digital Market
-- Tablas: empresas, delegaciones, almacenes
-- Datos reales de Digital Market seeded directamente
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. TABLA EMPRESAS (2 CIFs) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.empresas (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre       text        NOT NULL,
    razon_social text        NOT NULL,
    cif          text        NOT NULL UNIQUE,
    direccion    text,
    cp           text,
    ciudad       text,
    provincia    text,
    telefono     text,
    email        text,
    web          text,
    iban         text,
    logo_url     text,
    activa       boolean     NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_empresas" ON public.empresas;
CREATE POLICY "anon_all_empresas" ON public.empresas
    FOR ALL USING (true) WITH CHECK (true);

-- Seed: 2 empresas reales de Digital Market
INSERT INTO public.empresas (nombre, razon_social, cif, direccion, cp, ciudad, provincia, telefono, email, web)
VALUES
    (
        'Digital Market Dpi',
        'Digital Market Dpi''sur Sl',
        'B73486474',
        'Calle Castillo de Lorca',
        '30564', 'Lorquí', 'Murcia',
        '968676723',
        'administracion@digital-market.es',
        'www.digital-market.es'
    ),
    (
        'Digital Market Andalucía',
        'Digital Market Andalucia Sl',
        'B73860538',
        'Calle Castillo de Lorca, 12 - 5',
        '30564', 'Lorquí', 'Murcia',
        '952627377',
        'administracion@digital-market.es',
        'www.digital-market.es'
    )
ON CONFLICT (cif) DO NOTHING;

-- ─── 2. TABLA DELEGACIONES (4) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.delegaciones (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id  uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre      text        NOT NULL,
    codigo      text        NOT NULL UNIQUE,   -- MU / VA / MA / SE
    ciudad      text,
    provincia   text,
    direccion   text,
    cp          text,
    telefono    text,
    email       text,
    activa      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delegaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_delegaciones" ON public.delegaciones;
CREATE POLICY "anon_all_delegaciones" ON public.delegaciones
    FOR ALL USING (true) WITH CHECK (true);

-- Seed: 4 delegaciones
INSERT INTO public.delegaciones (empresa_id, nombre, codigo, ciudad, provincia)
VALUES
    (
        (SELECT id FROM public.empresas WHERE cif = 'B73486474'),
        'Murcia', 'MU', 'Murcia', 'Murcia'
    ),
    (
        (SELECT id FROM public.empresas WHERE cif = 'B73486474'),
        'Valencia', 'VA', 'Valencia', 'Valencia'
    ),
    (
        (SELECT id FROM public.empresas WHERE cif = 'B73860538'),
        'Málaga', 'MA', 'Málaga', 'Málaga'
    ),
    (
        (SELECT id FROM public.empresas WHERE cif = 'B73860538'),
        'Sevilla', 'SE', 'Sevilla', 'Sevilla'
    )
ON CONFLICT (codigo) DO NOTHING;

-- ─── 3. TABLA ALMACENES (4) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.almacenes (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    delegacion_id uuid        NOT NULL REFERENCES public.delegaciones(id) ON DELETE CASCADE,
    nombre        text        NOT NULL,
    codigo        text        NOT NULL UNIQUE,  -- ALM-MU / ALM-VA / ALM-MA / ALM-SE
    direccion     text,
    descripcion   text,
    activo        boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_almacenes" ON public.almacenes;
CREATE POLICY "anon_all_almacenes" ON public.almacenes
    FOR ALL USING (true) WITH CHECK (true);

-- Seed: 4 almacenes (uno por delegación)
INSERT INTO public.almacenes (delegacion_id, nombre, codigo, descripcion)
VALUES
    (
        (SELECT id FROM public.delegaciones WHERE codigo = 'MU'),
        'Almacén Murcia', 'ALM-MU', 'Almacén principal delegación Murcia'
    ),
    (
        (SELECT id FROM public.delegaciones WHERE codigo = 'VA'),
        'Almacén Valencia', 'ALM-VA', 'Almacén principal delegación Valencia'
    ),
    (
        (SELECT id FROM public.delegaciones WHERE codigo = 'MA'),
        'Almacén Málaga', 'ALM-MA', 'Almacén principal delegación Málaga'
    ),
    (
        (SELECT id FROM public.delegaciones WHERE codigo = 'SE'),
        'Almacén Sevilla', 'ALM-SE', 'Almacén principal delegación Sevilla'
    )
ON CONFLICT (codigo) DO NOTHING;

-- ─── 4. AÑADIR delegation_id A CLIENTS ──────────────────────
-- Mantiene el campo delegation (texto) existente para compatibilidad
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS delegation_id uuid REFERENCES public.delegaciones(id);

-- Migrar datos existentes: mapear texto → UUID por código de delegación
UPDATE public.clients
SET delegation_id = d.id
FROM public.delegaciones d
WHERE UPPER(public.clients.delegation) = UPPER(d.nombre)
   OR UPPER(public.clients.delegation) = UPPER(d.codigo)
   OR UPPER(public.clients.delegation) LIKE '%' || UPPER(d.nombre) || '%';

-- ─── 5. ACTUALIZAR CONSTRAINT DE ROLES ──────────────────────
-- Añadir nuevos roles al CHECK constraint de clients
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_role_check;
ALTER TABLE public.clients
    ADD CONSTRAINT clients_role_check
    CHECK (role IN (
        'admin', 'client', 'sales', 'tech', 'tech_lead',
        'compras', 'almacen', 'administracion', 'direccion'
    ));

-- ─── VERIFICACIÓN FINAL ──────────────────────────────────────
SELECT 'empresas'    AS tabla, COUNT(*) AS filas FROM public.empresas
UNION ALL
SELECT 'delegaciones', COUNT(*) FROM public.delegaciones
UNION ALL
SELECT 'almacenes',    COUNT(*) FROM public.almacenes;
