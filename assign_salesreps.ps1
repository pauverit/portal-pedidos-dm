# assign_salesreps.ps1
# Asigna comerciales a clientes segun provincia:
#   JAEN, GRANADA           -> Jose Miguel
#   MURCIA, ALICANTE, ALBACETE -> Javier
#   VALENCIA, CASTELLON, BARCELONA, ZARAGOZA, BALEARES -> Alberto Villanueva
#   MALAGA                  -> Julian Sastoque
#   SEVILLA, CORDOBA, EXTREMADURA (BADAJOZ, CACERES) -> Mariano
#   HUELVA, CADIZ           -> Jorge
#
# Fuente de provincia: col 10 (Provincia) del CSV, o campo delegation en Supabase.
# Sobreescribe el comercial en TODOS los clientes donde se pueda determinar la provincia.

$csvPath     = "C:\Users\enehas\Downloads\Clientes.csv"
$supabaseUrl = "https://nyxxzlhlvqusiirzrano.supabase.co"
$anonKey     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE"

$hGet = @{
    "apikey"        = $anonKey
    "Authorization" = "Bearer $anonKey"
}
$hPatch = @{
    "apikey"        = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

# Normaliza texto: minusculas, sin tildes
function Norm($s) {
    if (-not $s) { return "" }
    $s = $s.ToLower().Trim()
    $s = $s -replace "a", "a"  # placeholder for pipeline
    $s = $s -replace [char]0xE1, "a"  # a con tilde
    $s = $s -replace [char]0xE9, "e"  # e con tilde
    $s = $s -replace [char]0xED, "i"  # i con tilde
    $s = $s -replace [char]0xF3, "o"  # o con tilde
    $s = $s -replace [char]0xFA, "u"  # u con tilde
    $s = $s -replace [char]0xF1, "n"  # enye
    $s = $s -replace [char]0xFC, "u"  # u dieresis
    $s = $s -replace [char]0xC1, "a"  # A con tilde
    $s = $s -replace [char]0xC9, "e"
    $s = $s -replace [char]0xCD, "i"
    $s = $s -replace [char]0xD3, "o"
    $s = $s -replace [char]0xDA, "u"
    $s = $s -replace [char]0xD1, "n"
    $s = $s -replace '\s+', ' '
    return $s
}

# Determina comercial a partir de provincia normalizada
function GetSalesRep($prov) {
    $p = Norm($prov)
    if ($p -match "jaen|granada")                                      { return "Jose Miguel" }
    if ($p -match "murcia|alicante|albacete")                          { return "Javier" }
    if ($p -match "valencia|castellon|barcelona|zaragoza|baleares|balears|illes") { return "Alberto Villanueva" }
    if ($p -match "malaga")                                            { return "Julian Sastoque" }
    if ($p -match "sevilla|cordoba|extremadura|badajoz|caceres")       { return "Mariano" }
    if ($p -match "huelva|cadiz")                                      { return "Jorge" }
    return $null
}

# 1. Leer CSV -> mapa nombre_normalizado -> provincia
Write-Host "Leyendo CSV para extraer provincias..."
$csvRows = Import-Csv -Path $csvPath -Delimiter ";" -Encoding Default
$csvProvinceMap = @{}
foreach ($r in $csvRows) {
    $v = @($r.PSObject.Properties.Value)
    if ($v.Count -lt 11) { continue }
    $nombre = if ($v[1]) { $v[1].Trim() } else { "" }
    if (-not $nombre) { continue }
    $prov = if ($v[10]) { $v[10].Trim() } else { "" }    # col 10 = Provincia
    $fam  = if ($v[16]) { $v[16].Trim() } else { "" }    # col 16 = Familia (backup)
    $key  = Norm($nombre)
    if ($key -and -not $csvProvinceMap.ContainsKey($key)) {
        $csvProvinceMap[$key] = if ($prov) { $prov } else { $fam }
    }
}
Write-Host "  -> $($csvProvinceMap.Count) clientes con provincia en CSV"

# 2. Cargar todos los clientes de Supabase (paginado)
Write-Host "Cargando clientes de Supabase..."
$allClients = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?select=id,company_name,sales_rep,delegation&limit=1000&offset=$off" -Headers $hGet
    $allClients += $pg; $off += 1000
} while ($pg.Count -eq 1000)
Write-Host "  -> $($allClients.Count) clientes cargados"

# 3. Asignar comerciales
$assigned    = @()   # comercial asignado/cambiado
$unchanged   = @()   # mismo comercial (ya correcto)
$noProvince  = @()   # sin provincia determinable

foreach ($c in $allClients) {
    $norm     = Norm($c.company_name)
    $province = $null

    # Buscar provincia: primero en CSV, luego en delegation de Supabase
    if ($csvProvinceMap.ContainsKey($norm)) {
        $province = $csvProvinceMap[$norm]
    } elseif ($c.delegation -and $c.delegation.Trim() -ne "") {
        $province = $c.delegation.Trim()
    }

    if (-not $province) {
        $noProvince += $c.company_name
        continue
    }

    $targetRep = GetSalesRep($province)
    if (-not $targetRep) {
        $noProvince += "$($c.company_name) [prov: $province]"
        continue
    }

    # Comparar con actual
    $curRep = if ($c.sales_rep) { $c.sales_rep.Trim() } else { "" }
    if ($curRep -eq $targetRep) {
        $unchanged += $c.company_name
        continue
    }

    # Actualizar
    $body = "{`"sales_rep`":`"$targetRep`"}"
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?id=eq.$($c.id)" -Headers $hPatch -Method Patch -Body $bodyBytes | Out-Null
        $prev = if ($curRep) { $curRep } else { "(vacio)" }
        Write-Host "  OK: $($c.company_name) | $province -> $targetRep  [antes: $prev]"
        $assigned += [PSCustomObject]@{
            Nombre    = $c.company_name
            Provincia = $province
            Comercial = $targetRep
            Anterior  = $prev
        }
    } catch {
        Write-Host "  ERROR: $($c.company_name): $_"
    }
}

# 4. Resumen
Write-Host ""
Write-Host "==================================================="
Write-Host "  Asignados / actualizados : $($assigned.Count)"
Write-Host "  Ya correctos (sin cambio): $($unchanged.Count)"
Write-Host "  Sin provincia detectada  : $($noProvince.Count)"
Write-Host "==================================================="

$outPath = "$PSScriptRoot\asignacion_comerciales.csv"
if ($assigned.Count -gt 0) {
    $assigned | Export-Csv -Path $outPath -Delimiter ";" -Encoding UTF8 -NoTypeInformation
    Write-Host "  Detalle -> $outPath"
}
Write-Host ""
Write-Host "Provincias sin regla (muestra):"
$noProvince | Select-Object -First 20 | ForEach-Object { Write-Host "  - $_" }
