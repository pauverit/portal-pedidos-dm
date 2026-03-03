-- ============================================================
--  SAT Module — Schema
--  Run this in your Supabase SQL editor to set up the SAT module
-- ============================================================

-- Ensure uuid generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Máquinas instaladas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS machines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    serial_number   TEXT NOT NULL,
    model           TEXT,
    brand           TEXT,
    install_date    DATE,
    warranty_expires DATE,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'decommissioned')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Contratos de mantenimiento ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    type            TEXT NOT NULL DEFAULT 'basic'
                        CHECK (type IN ('basic', 'full', 'premium')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    annual_cost     DECIMAL(10,2) NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Incidencias ────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS incidents_reference_seq START 1;

CREATE TABLE IF NOT EXISTS incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference       TEXT UNIQUE NOT NULL
                        DEFAULT 'INC' || LPAD(nextval('incidents_reference_seq')::TEXT, 5, '0'),
    client_id       UUID NOT NULL REFERENCES clients(id),
    machine_id      UUID REFERENCES machines(id),
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'closed')),
    severity        TEXT NOT NULL DEFAULT 'normal'
                        CHECK (severity IN ('low', 'normal', 'high', 'urgent')),
    assigned_to     UUID REFERENCES clients(id),   -- tech user
    created_by      UUID REFERENCES clients(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);

-- ─── Comentarios de incidencias (actividad/timeline) ────────────────────────
CREATE TABLE IF NOT EXISTS incident_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    author_id       UUID REFERENCES clients(id),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Partes de trabajo ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS work_orders_reference_seq START 1;

CREATE TABLE IF NOT EXISTS work_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference       TEXT UNIQUE NOT NULL
                        DEFAULT 'PAR' || LPAD(nextval('work_orders_reference_seq')::TEXT, 5, '0'),
    incident_id     UUID REFERENCES incidents(id),
    machine_id      UUID REFERENCES machines(id),
    client_id       UUID NOT NULL REFERENCES clients(id),
    technician_id   UUID REFERENCES clients(id),
    scheduled_date  TIMESTAMPTZ,
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'closed')),
    diagnosis       TEXT,
    resolution      TEXT,
    hours_worked    DECIMAL(5,2),
    materials_cost  DECIMAL(10,2) NOT NULL DEFAULT 0,
    labor_cost      DECIMAL(10,2) NOT NULL DEFAULT 0,
    rappel_discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    client_signature TEXT,          -- base64 canvas signature
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Registro de llamadas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sat_calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID REFERENCES clients(id),
    direction       TEXT NOT NULL DEFAULT 'inbound'
                        CHECK (direction IN ('inbound', 'outbound')),
    operator_id     UUID REFERENCES clients(id),
    summary         TEXT,
    incident_id     UUID REFERENCES incidents(id),
    call_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes for common lookups ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_machines_client        ON machines(client_id);
CREATE INDEX IF NOT EXISTS idx_incidents_client       ON incidents(client_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned     ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_status       ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_client     ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status     ON work_orders(status);

-- ─── Row Level Security (optional but recommended) ──────────────────────────
-- Enable RLS so that technicians only see their own work orders if needed
-- ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
-- (Policies to be defined based on auth strategy)
