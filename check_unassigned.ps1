$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE"
$supabaseUrl = "https://nyxxzlhlvqusiirzrano.supabase.co"
$h = @{ apikey=$anonKey; Authorization="Bearer $anonKey" }
$hPatch = @{ apikey=$anonKey; Authorization="Bearer $anonKey"; "Content-Type"="application/json"; Prefer="return=minimal" }

# Reglas igual que assign_salesreps.ps1
function GetSalesRep($prov) {
    $p = $prov.ToLower() -replace '\s+', ' '
    $p = $p -replace [char]0xE1,"a" -replace [char]0xE9,"e" -replace [char]0xED,"i" -replace [char]0xF3,"o" -replace [char]0xFA,"u" -replace [char]0xF1,"n"
    if ($p -match "jaen|granada")                                      { return "Jose Miguel" }
    if ($p -match "murcia|alicante|albacete")                          { return "Javier" }
    if ($p -match "valencia|castellon|barcelona|zaragoza|baleares|balears|illes") { return "Alberto Villanueva" }
    if ($p -match "malaga")                                            { return "Julian Sastoque" }
    if ($p -match "sevilla|cordoba|extremadura|badajoz|caceres")       { return "Mariano" }
    if ($p -match "huelva|cadiz")                                      { return "Jorge" }
    return $null
}

# Cargar clientes sin sales_rep (paginado)
Write-Host "Cargando clientes sin comercial asignado..."
$unassigned = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?select=id,company_name,delegation,zone&sales_rep=is.null&role=eq.client&limit=1000&offset=$off" -Headers $h
    $unassigned += $pg; $off += 1000
} while ($pg.Count -eq 1000)
Write-Host "  -> $($unassigned.Count) sin comercial"

$assigned = 0
$stillUnknown = @()

foreach ($c in $unassigned) {
    # Intentar por delegation primero, luego zone
    $prov = ""
    if ($c.delegation -and $c.delegation.Trim()) { $prov = $c.delegation.Trim() }
    elseif ($c.zone -and $c.zone.Trim())         { $prov = $c.zone.Trim() }

    if (-not $prov) {
        $stillUnknown += $c.company_name
        continue
    }

    $rep = GetSalesRep($prov)
    if (-not $rep) {
        $stillUnknown += "$($c.company_name) [prov: $prov]"
        continue
    }

    $body = "{`"sales_rep`":`"$rep`"}"
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?id=eq.$($c.id)" -Headers $hPatch -Method Patch -Body $bodyBytes | Out-Null
        Write-Host "  OK: $($c.company_name) | $prov -> $rep"
        $assigned++
    } catch {
        Write-Host "  ERROR: $($c.company_name): $_"
    }
}

Write-Host ""
Write-Host "==================================================="
Write-Host "  Asignados ahora      : $assigned"
Write-Host "  Sin datos de provincia: $($stillUnknown.Count)"
Write-Host "==================================================="
Write-Host ""
Write-Host "Sin provincia (primeros 30):"
$stillUnknown | Select-Object -First 30 | ForEach-Object { Write-Host "  - $_" }
