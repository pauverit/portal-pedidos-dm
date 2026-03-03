-- Add image_url column to machines table
ALTER TABLE machines ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS notes TEXT;

-- Unique constraint on serial_number for upsert support (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'machines_serial_number_key'
  ) THEN
    ALTER TABLE machines ADD CONSTRAINT machines_serial_number_key UNIQUE (serial_number);
  END IF;
END $$;

-- Create the Supabase Storage bucket for machine images (run once)
-- In Supabase dashboard: Storage → New Bucket → Name: machine-images → Public: true
-- Or run via management API. The SQL below inserts the bucket row if you have storage schema access:
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-images', 'machine-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Anyone can view machine images"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'machine-images' );

CREATE POLICY IF NOT EXISTS "Authenticated users can upload machine images"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'machine-images' );
