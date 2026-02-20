-- 1. Create the 'coupons' table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'percentage',
    discount_value NUMERIC NOT NULL,
    min_order_amount NUMERIC DEFAULT 0,
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) on the table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 3. Create policies to allow public (anon/authenticated) access for Web App Operations
-- Permite a cualquier usuario (anon) leer cupones
CREATE POLICY "Enable read access for all users"
ON public.coupons FOR SELECT
USING (true);

-- Permite a cualquier usuario (anon) insertar cupones
CREATE POLICY "Enable insert for all users"
ON public.coupons FOR INSERT
WITH CHECK (true);

-- Permite a cualquier usuario (anon) actualizar cupones
CREATE POLICY "Enable update for all users"
ON public.coupons FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permite a cualquier usuario (anon) borrar cupones
CREATE POLICY "Enable delete for all users"
ON public.coupons FOR DELETE
USING (true);
