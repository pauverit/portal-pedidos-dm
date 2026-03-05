# force_reassign.ps1
# Re-aplica las reglas de asignacion sobre TODOS los clientes con zone o delegation conocida.
# Tambien anade zonas extendidas no cubiertas antes (Almeria -> Jose Miguel, etc.)

$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$hGet   = @{ apikey=$key; Authorization="Bearer $key" }
$hPatch = @{ apikey=$key; Authorization="Bearer $key"; "Content-Type"="application/json"; Prefer="return=minimal" }

function Norm($s) {
    $s = $s.ToLower().Trim() -replace '\s+', ' '
    $s = $s -replace [char]0xE1,"a" -replace [char]0xE9,"e" -replace [char]0xED,"i" `
             -replace [char]0xF3,"o" -replace [char]0xFA,"u" -replace [char]0xF1,"n" `
             -replace [char]0xC1,"a" -replace [char]0xC9,"e" -replace [char]0xCD,"i" `
             -replace [char]0xD3,"o" -replace [char]0xDA,"u" -replace [char]0xD1,"n"
    return $s
}

function GetRep($raw) {
    $p = Norm $raw

    # Jose Miguel — Jaen, Granada + Almeria (sur de Andalucia oriental)
    if ($p -match "jaen|linares|ubeda|baeza|andujar|martos|alcala la real") { return "Jose Miguel" }
    if ($p -match "granada|motril|guadix|baza|loja|huescar|armilla|almunecar") { return "Jose Miguel" }
    if ($p -match "almeria|garrucha|roquetas|el ejido|vera|nijar") { return "Jose Miguel" }

    # Julian Sastoque — Malaga
    if ($p -match "malaga|marbella|fuengirola|torremolinos|benalmadena|mijas|estepona|ronda|nerja|antequera|velez.malaga|alhaurin|coin|torre del mar|manilva") { return "Julian Sastoque" }

    # Javier — Murcia, Alicante, Albacete
    if ($p -match "murcia|muecia|cartagena|lorca|molina de segura|alcantarilla") { return "Javier" }
    if ($p -match "alicante|elche|torrevieja|orihuela|benidorm|denia|elda|villena|alcoy") { return "Javier" }
    if ($p -match "albacete|hellin|villarrobledo|almansa") { return "Javier" }

    # Alberto Villanueva — Valencia, Castellon, Barcelona, Zaragoza, Baleares
    if ($p -match "valencia|gandia|sagunto|torrent|paterna|castellon|burriana|villarreal") { return "Alberto Villanueva" }
    if ($p -match "barcelona|badalona|hospitalet|terrassa|sabadell|mataro|girona|tarragona") { return "Alberto Villanueva" }
    if ($p -match "zaragoza|baleares|palma|mallorca|ibiza|menorca|formentera|illes") { return "Alberto Villanueva" }

    # Mariano — Sevilla, Cordoba, Extremadura (Badajoz, Caceres)
    if ($p -match "sevilla|dos hermanas|alcala de guadaira|mairena") { return "Mariano" }
    if ($p -match "cordoba|cirdoba|lucena|pozoblanco|cabra") { return "Mariano" }
    if ($p -match "badajoz|caceres|merida|plasencia|don benito|almendralejo|extremadura") { return "Mariano" }

    # Jorge — Huelva, Cadiz
    if ($p -match "huelva|lepe|almonte|moguer|ayamonte") { return "Jorge" }
    if ($p -match "cadiz|jerez|algeciras|la linea|san fernando|sanlucar|el puerto") { return "Jorge" }

    return $null
}

# --- Cargar TODOS los clientes con role=client ---
Write-Host "Cargando todos los clientes..."
$all = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=id,company_name,sales_rep,delegation,zone&role=eq.client&limit=1000&offset=$off" -Headers $hGet
    if ($pg -and $pg.Count -gt 0) { $all += $pg; $off += 1000 } else { break }
} while ($pg.Count -eq 1000)

Write-Host "  Total clientes: $($all.Count)"
Write-Host ""

$updated  = 0
$confirmed = 0
$noData   = 0
$noRule   = 0
$unknownZ = @{}

foreach ($c in $all) {
    # Determinar provincia/zona de referencia
    $prov = ""
    if ($c.zone -and $c.zone.Trim()) {
        $prov = $c.zone.Trim()
    } elseif ($c.delegation -and $c.delegation.Trim()) {
        $prov = $c.delegation.Trim()
    }

    if (-not $prov) { $noData++; continue }

    $rep = GetRep($prov)
    if (-not $rep) {
        $k = Norm($prov)
        if (-not $unknownZ.ContainsKey($k)) { $unknownZ[$k] = 0 }
        $unknownZ[$k]++
        $noRule++
        continue
    }

    # Solo actualizar si el valor actual es diferente (null, vacio, o incorrecto)
    $cur = if ($c.sales_rep) { $c.sales_rep.Trim() } else { "" }
    if ($cur -eq $rep) { $confirmed++; continue }

    $body = "{`"sales_rep`":`"$rep`"}"
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        Invoke-RestMethod -Uri "$url/rest/v1/clients?id=eq.$($c.id)" -Headers $hPatch -Method Patch -Body $bodyBytes | Out-Null
        if ($cur) {
            Write-Host "  CORREGIDO: $($c.company_name) | '$cur' -> '$rep' ($prov)"
        } else {
            Write-Host "  ASIGNADO: $($c.company_name) | '$prov' -> '$rep'"
        }
        $updated++
    } catch {
        Write-Host "  ERROR: $($c.company_name): $_"
    }
}

Write-Host ""
Write-Host "==================================================="
Write-Host "  Actualizados/asignados   : $updated"
Write-Host "  Ya correctos             : $confirmed"
Write-Host "  Sin datos de zona        : $noData"
Write-Host "  Zona no cubierta         : $noRule"
Write-Host "==================================================="

if ($unknownZ.Count -gt 0) {
    Write-Host ""
    Write-Host "Zonas sin regla (top 30):"
    $unknownZ.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 30 | ForEach-Object {
        Write-Host ("  [" + $_.Value + "x] " + $_.Name)
    }
}
