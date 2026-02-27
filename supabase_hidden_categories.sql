-- Add hidden_categories column to clients table
-- This stores an array of catalog family IDs that are hidden for each client
-- e.g. ['rigid', 'display'] means those families won't appear in the client's sidebar

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS hidden_categories text[] DEFAULT '{}';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'hidden_categories';
