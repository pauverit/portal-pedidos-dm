-- ─── Extend incidents table for unified parts flow ────────────────────────────

-- 1. Drop old status constraint and add new one that includes all states
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'signed', 'cancelled', 'invoiced', 'pending', 'closed'));

-- 2. Add new columns (safe to run multiple times)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution         TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_type      TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS estimated_minutes  INTEGER;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS scheduled_at       TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS started_at         TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS cancelled_reason   TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS signature_url      TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority           TEXT DEFAULT 'normal'
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- 3. Migrate existing status values (old → new naming)
--    Run AFTER step 1 so the new values are allowed by the constraint
UPDATE incidents SET status = 'open'   WHERE status = 'pending';
UPDATE incidents SET status = 'signed' WHERE status = 'closed';

-- ─── Supabase Storage bucket for client signatures ────────────────────────────
-- Create bucket via Supabase Dashboard (Storage → New bucket → sat-signatures, Public ON)
-- OR run this if your Supabase version supports it:
INSERT INTO storage.buckets (id, name, public)
VALUES ('sat-signatures', 'sat-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies  — DROP first to avoid "already exists" errors
DROP POLICY IF EXISTS "sat_sig_select" ON storage.objects;
DROP POLICY IF EXISTS "sat_sig_insert" ON storage.objects;

CREATE POLICY "sat_sig_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sat-signatures');

CREATE POLICY "sat_sig_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sat-signatures');
