# create_crm_tables.ps1
# Crea las tablas client_visits y client_calls en Supabase
# Requiere la SERVICE ROLE KEY (no la anon key)
# Obtenerla en: https://app.supabase.com/project/nyxxzlhlvqusiirzrano/settings/api
#
# USAGE: powershell -ExecutionPolicy Bypass -File create_crm_tables.ps1 -ServiceKey "eyJhbGciO..."

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceKey
)

$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$h = @{
    apikey        = $ServiceKey
    Authorization = "Bearer $ServiceKey"
    "Content-Type" = "application/json"
}

$sql = @"
CREATE TABLE IF NOT EXISTS public.client_visits (
    id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id      uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sales_rep_id   uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    visit_date     timestamptz NOT NULL DEFAULT now(),
    notes          text,
    next_action    text,
    client_name    text,
    sales_rep_name text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_visits" ON public.client_visits;
CREATE POLICY "anon_all_visits" ON public.client_visits FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.client_calls (
    id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id      uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sales_rep_id   uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    call_date      timestamptz NOT NULL DEFAULT now(),
    direction      text        NOT NULL DEFAULT 'outbound',
    summary        text,
    client_name    text,
    sales_rep_name text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_calls" ON public.client_calls;
CREATE POLICY "anon_all_calls" ON public.client_calls FOR ALL USING (true) WITH CHECK (true);
"@

# Try via Supabase Management REST API
$projectRef = "nyxxzlhlvqusiirzrano"
$mgmtUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"

Write-Host "Intentando crear tablas via Management API..."
try {
    $body = @{ query = $sql } | ConvertTo-Json
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $result = Invoke-RestMethod -Uri $mgmtUrl -Method Post -Headers $h -Body $bodyBytes -ErrorAction Stop
    Write-Host "OK: Tablas creadas correctamente"
    Write-Host $result
} catch {
    Write-Host "Error Management API: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Alternativa: pega el siguiente SQL en Supabase Dashboard > SQL Editor:"
    Write-Host "============================================================"
    Write-Host $sql
}
