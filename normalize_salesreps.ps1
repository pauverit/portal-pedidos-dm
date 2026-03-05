# normalize_salesreps.ps1
# Normaliza los nombres de comerciales en la tabla clients de Supabase.
# Mapea nombres historicos/completos a los nombres actuales del sistema.

$supabaseUrl = "https://nyxxzlhlvqusiirzrano.supabase.co"
$anonKey     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE"

$hGet = @{ "apikey" = $anonKey; "Authorization" = "Bearer $anonKey" }
$hPatch = @{
    "apikey"        = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

# Nombres validos actuales (tal como estan en la tabla clients con role=sales)
$validNames = @("Jose Miguel","Alberto Corcoles","Julian Sastoque","Mariano","Javier","Jorge","Alberto Villanueva")

# Mapa: nombre antiguo (normalizado a lower) -> nombre actual
$nameMap = @{
    # Jose Miguel
    "jose miguel"                    = "Jose Miguel"
    "jose miguel garcia rodriguez"   = "Jose Miguel"
    # Javier
    "javier"                         = "Javier"
    "javier delgado pozo"            = "Javier"
    "javier delgado"                 = "Javier"
    # Alberto Villanueva
    "alberto villanueva"             = "Alberto Villanueva"
    "alberto javier villanueva montejano" = "Alberto Villanueva"
    # Julian Sastoque
    "julian sastoque"                = "Julian Sastoque"
    "julian"                         = "Julian Sastoque"
    # Mariano
    "mariano"                        = "Mariano"
    "mariano garcia crespo"          = "Mariano"
    "mariano  garcia crespo"         = "Mariano"
    # Jorge
    "jorge"                          = "Jorge"
    "jorge dominguez arriaga"        = "Jorge"
    # Alberto Corcoles
    "alberto corcoles"               = "Alberto Corcoles"
    "alberto"                        = "Alberto Corcoles"
    # Daniel Pelaez -> sin asignar (ya no esta en el sistema)
    "daniel pelaez"                  = ""
    "daniel  pelaez"                 = ""
    # Ricardo Silvestre -> sin asignar
    "ricardo silvestre"              = ""
    # Jose Luis Sanchez -> sin asignar
    "jose luis sanchez"              = ""
    "jose luis sanchez,"             = ""
}

# Cargar todos los clientes con sales_rep no nulo
Write-Host "Cargando clientes..."
$allClients = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?select=id,company_name,sales_rep&sales_rep=not.is.null&limit=1000&offset=$off" -Headers $hGet
    $allClients += $pg; $off += 1000
} while ($pg.Count -eq 1000)
Write-Host "  -> $($allClients.Count) clientes con sales_rep"

$updated   = 0
$cleared   = 0
$alreadyOk = 0
$unknown   = @()

foreach ($c in $allClients) {
    $cur = $c.sales_rep.Trim()
    # Normalizar: lower + quitar acentos (reemplazar bytes comunes de Windows-1252)
    $curLow = $cur.ToLower() -replace '\s+', ' '
    $curLow = $curLow -replace [char]0xE1,"a" -replace [char]0xE9,"e" -replace [char]0xED,"i" `
                      -replace [char]0xF3,"o" -replace [char]0xFA,"u" -replace [char]0xF1,"n" `
                      -replace [char]0xC1,"a" -replace [char]0xC9,"e" -replace [char]0xCD,"i" `
                      -replace [char]0xD3,"o" -replace [char]0xDA,"u" -replace [char]0xD1,"n" `
                      -replace "�","a"  # caracter corrupto comun

    # Ya es un nombre valido
    if ($validNames -contains $cur) {
        $alreadyOk++
        continue
    }

    # Fallback: match por comienzo si no se encuentra exacto
    if (-not $nameMap.ContainsKey($curLow)) {
        if     ($curLow -match "^jose miguel")  { $nameMap[$curLow] = "Jose Miguel" }
        elseif ($curLow -match "^mariano")       { $nameMap[$curLow] = "Mariano" }
        elseif ($curLow -match "^jorge")         { $nameMap[$curLow] = "Jorge" }
        elseif ($curLow -match "^javier")        { $nameMap[$curLow] = "Javier" }
        elseif ($curLow -match "^julian")        { $nameMap[$curLow] = "Julian Sastoque" }
        elseif ($curLow -match "^alberto villanueva|^alberto javier") { $nameMap[$curLow] = "Alberto Villanueva" }
        elseif ($curLow -match "^alberto corcoles") { $nameMap[$curLow] = "Alberto Corcoles" }
        elseif ($curLow -match "^daniel")        { $nameMap[$curLow] = "" }
        elseif ($curLow -match "^ricardo")       { $nameMap[$curLow] = "" }
        elseif ($curLow -match "^jose luis")     { $nameMap[$curLow] = "" }
    }

    # Buscar en el mapa
    if ($nameMap.ContainsKey($curLow)) {
        $target = $nameMap[$curLow]
        if ($target -eq "") {
            # Limpiar el campo
            $body = '{"sales_rep":null}'
        } else {
            $json = $target -replace '"', '\"'
            $body = "{`"sales_rep`":`"$json`"}"
        }
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        try {
            Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?id=eq.$($c.id)" -Headers $hPatch -Method Patch -Body $bodyBytes | Out-Null
            if ($target -eq "") {
                Write-Host "  LIMPIADO: $($c.company_name) | '$cur' -> (sin asignar)"
                $cleared++
            } else {
                Write-Host "  OK: $($c.company_name) | '$cur' -> '$target'"
                $updated++
            }
        } catch {
            Write-Host "  ERROR: $($c.company_name): $_"
        }
    } else {
        $unknown += "'$cur'"
    }
}

Write-Host ""
Write-Host "==================================================="
Write-Host "  Normalizados   : $updated"
Write-Host "  Limpiados      : $cleared"
Write-Host "  Ya correctos   : $alreadyOk"
Write-Host "  Desconocidos   : $($unknown.Count)"
Write-Host "==================================================="
if ($unknown.Count -gt 0) {
    Write-Host ""
    Write-Host "Nombres no reconocidos (no tocados):"
    $unknown | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" }
}
