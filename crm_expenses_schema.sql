-- ─────────────────────────────────────────────────────────────────────────────
-- CRM & EXPENSES — Migration Script
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. CRM: Client Visits ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_visits (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sales_rep_id  UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes         TEXT,
  next_action   TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_visits_client    ON client_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_client_visits_sales_rep ON client_visits(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_client_visits_date      ON client_visits(visit_date DESC);

-- RLS: commercials can only see/insert their own
ALTER TABLE client_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_visits_all" ON client_visits FOR ALL USING (true) WITH CHECK (true);

-- ── 2. CRM: Client Calls ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_calls (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sales_rep_id  UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_date     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  direction     TEXT          NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  summary       TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_calls_client    ON client_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_sales_rep ON client_calls(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_date      ON client_calls(call_date DESC);

ALTER TABLE client_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_calls_all" ON client_calls FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Expenses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_role        TEXT          NOT NULL CHECK (user_role IN ('sales','tech','tech_lead','admin')),
  expense_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
  type             TEXT          NOT NULL CHECK (type IN ('restaurant','km','hotel','other')),
  description      TEXT,
  amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  km               NUMERIC(8,2)  DEFAULT 0,
  km_rate          NUMERIC(6,4)  DEFAULT 0.19,
  ticket_image_url TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user      ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Supabase Storage bucket for expense ticket photos ──────────────────────
-- NOTE: Run this only if the bucket does not already exist.
-- In Supabase Dashboard → Storage → New Bucket: "expense-tickets" (private)
-- Or use the Supabase Management API. The INSERT below creates it via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-tickets',
  'expense-tickets',
  false,
  5242880,  -- 5 MB max per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload/read their own files
CREATE POLICY "expense_tickets_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'expense-tickets');

CREATE POLICY "expense_tickets_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'expense-tickets');

CREATE POLICY "expense_tickets_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'expense-tickets');
