-- 1. Products Table Adjustments
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_m2 DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_finish BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_backing BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_adhesive BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS finish TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS backing TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS adhesive TEXT;

-- 2. Clients Table Adjustments
ALTER TABLE clients ADD COLUMN IF NOT EXISTS used_coupons TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rappel_threshold DECIMAL(10,2) DEFAULT 800.00;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hide_prices BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_prices JSONB DEFAULT '{}';
-- SAT / Tech fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hidden_categories TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sales_rep_code TEXT;

-- 3. Orders Table Adjustments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'tramitado';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rappel_discount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sales_rep TEXT;

-- 4. Index for performance (No foreign keys to avoid type mismatch errors)
CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_product_id ON order_lines(product_id);
