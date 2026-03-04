# import_clients.ps1
# Procesa Clientes.csv:
#   - Si el cliente ya existe (por nombre normalizado o email) -> actualiza campos vacios
#   - Si no existe -> lo crea con todos los datos disponibles
#
# Columnas CSV (indice):
#  0=Referencia, 1=NombreJuridico, 2=Nombre(contacto), 3=CifNif,
#  4=Tel1, 5=Tel2, 6=Fax, 7=Email, 8=Direccion, 9=Localidad,
#  10=Provincia, 11=CP, 12=Pais, 13=Lat, 14=Lon, 15=Web,
#  16=Familia(->delegation), 17=Observaciones, 18=FormaPago,
#  19=Vencimiento, 20=DiaPago, 21=Ajuste, 22=Descuento, 23=Tarifa,
#  24=Agente(->sales_rep), ...

$csvPath     = "C:\Users\enehas\Downloads\Clientes.csv"
$supabaseUrl = "https://nyxxzlhlvqusiirzrano.supabase.co"
$anonKey     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE"

$hGet = @{
    "apikey"        = $anonKey
    "Authorization" = "Bearer $anonKey"
}
$hPost = @{
    "apikey"        = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}
$hPatch = @{
    "apikey"        = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

# Helpers
function Safe($v) {
    if ($v -eq $null) { return "" }
    return $v.Trim()
}

function NormName($n) {
    if (-not $n) { $n = "" }
    return $n.ToLower().Trim() -replace '\s+', ' '
}

function HasValue($s) {
    return ($s -ne $null -and $s.ToString().Trim() -ne "")
}

# 1. Leer CSV
Write-Host "Leyendo CSV: $csvPath"
$csvRows = Import-Csv -Path $csvPath -Delimiter ";" -Encoding Default

$rows = $csvRows | Where-Object { $_ } | ForEach-Object {
    $v = @($_.PSObject.Properties.Value)
    if ($v.Count -lt 25) { return }
    $nombre = Safe($v[1])
    if (-not $nombre) { return }
    [PSCustomObject]@{
        ClientRef  = Safe($v[0])
        CompanyName= $nombre
        ContactName= Safe($v[2])
        CifNif     = Safe($v[3])
        Phone      = Safe($v[4])
        Email      = Safe($v[7])
        Address    = (Safe($v[8])) -replace "[\r\n]+", " "
        Localidad  = Safe($v[9])
        Provincia  = Safe($v[10])
        CP         = Safe($v[11])
        Familia    = Safe($v[16])
        Notas      = Safe($v[17])
        SalesRep   = Safe($v[24])
    }
}
Write-Host "  -> $($rows.Count) filas validas"

# 2. Cargar clientes de Supabase (paginado, con campos completos)
Write-Host "Cargando clientes de Supabase..."
$allClients = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?select=id,company_name,email,phone,sales_rep,delegation&limit=1000&offset=$off" -Headers $hGet
    $allClients += $pg; $off += 1000
} while ($pg.Count -eq 1000)
Write-Host "  -> $($allClients.Count) clientes en Supabase"

# Mapas de busqueda
$nameMap  = @{}   # nombre normalizado -> cliente completo
$emailMap = @{}   # email -> id

foreach ($c in $allClients) {
    $k = NormName($c.company_name)
    if ($k -and -not $nameMap.ContainsKey($k)) {
        $nameMap[$k] = $c
    }
    $emRaw = if ($c.email) { $c.email } else { "" }
    $em = $emRaw.Trim().ToLower()
    if ($em -and $em -notlike "noemail+*" -and -not $emailMap.ContainsKey($em)) {
        $emailMap[$em] = $c.id
    }
}

# 3. Procesar filas
$created  = @()
$updated  = @()
$skipped  = @()

foreach ($row in $rows) {
    $norm     = NormName($row.CompanyName)
    $emailLow = $row.Email.ToLower()

    # Buscar cliente existente
    $existing = $null
    if ($nameMap.ContainsKey($norm)) {
        $existing = $nameMap[$norm]
    } elseif ($emailLow -and -not ($emailLow -like "noemail+*") -and $emailMap.ContainsKey($emailLow)) {
        $existId = $emailMap[$emailLow]
        $existing = $allClients | Where-Object { $_.id -eq $existId } | Select-Object -First 1
    }

    # ── A. Cliente existente -> actualizar solo campos vacios ─────────────────
    if ($existing) {
        $patch = @{}

        # Email: actualizar si el actual es placeholder o vacio
        $curEmail = if ($existing.email) { $existing.email.Trim() } else { "" }
        if (HasValue($row.Email) -and ($curEmail -eq "" -or $curEmail -like "noemail+*")) {
            $patch["email"] = $row.Email
        }
        # Phone
        $curPhone = if ($existing.phone) { $existing.phone.Trim() } else { "" }
        if (HasValue($row.Phone) -and $curPhone -eq "") {
            $patch["phone"] = $row.Phone
        }
        # Sales rep
        $curSales = if ($existing.sales_rep) { $existing.sales_rep.Trim() } else { "" }
        if (HasValue($row.SalesRep) -and $curSales -eq "") {
            $patch["sales_rep"] = $row.SalesRep
        }
        # Delegation (Familia)
        $curDeleg = if ($existing.delegation) { $existing.delegation.Trim() } else { "" }
        if (HasValue($row.Familia) -and $curDeleg -eq "") {
            $patch["delegation"] = $row.Familia
        }

        if ($patch.Count -gt 0) {
            $body = $patch | ConvertTo-Json -Compress
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            try {
                Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?id=eq.$($existing.id)" -Headers $hPatch -Method Patch -Body $bodyBytes | Out-Null
                $fields = ($patch.Keys -join ", ")
                Write-Host "  ACTUALIZADO: $($row.CompanyName) [$fields]"
                $updated += [PSCustomObject]@{ Nombre=$row.CompanyName; CamposActualizados=$fields }
            } catch {
                Write-Host "  ERROR actualizando $($row.CompanyName): $_"
            }
        } else {
            $skipped += $row
        }
        continue
    }

    # ── B. Cliente nuevo -> crear ─────────────────────────────────────────────
    $email = $row.Email
    if (-not (HasValue($email))) {
        $emailRef = $row.ClientRef -replace '[^a-zA-Z0-9]', '_'
        $email = "noemail+$emailRef@portal.dm"
    }

    $cliData = @{
        company_name         = $row.CompanyName
        email                = $email
        role                 = "client"
        rappel_accumulated   = 0
        rappel_threshold     = 800
        must_change_password = $false
        is_active            = $false
        hide_prices          = $false
        custom_prices        = @{}
        used_coupons         = @()
        hidden_categories    = @()
    }
    if (HasValue($row.Phone))    { $cliData["phone"]      = $row.Phone }
    if (HasValue($row.SalesRep)) { $cliData["sales_rep"]  = $row.SalesRep }
    if (HasValue($row.Familia))  { $cliData["delegation"] = $row.Familia }

    $body = $cliData | ConvertTo-Json -Compress -Depth 5
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients" -Headers $hPost -Method Post -Body $bodyBytes
        $newId = $res[0].id
        $nameMap[$norm] = @{ id=$newId; email=$email; phone=$row.Phone; sales_rep=$row.SalesRep; delegation=$row.Familia }
        Write-Host "  CREADO: $($row.CompanyName) (ref=$($row.ClientRef))"
        $created += [PSCustomObject]@{
            Id         = $newId
            Referencia = $row.ClientRef
            Nombre     = $row.CompanyName
            Email      = $email
            Telefono   = $row.Phone
            Agente     = $row.SalesRep
            Familia    = $row.Familia
        }
    } catch {
        Write-Host "  ERROR creando $($row.CompanyName): $_"
    }
}

# 4. Resumen
Write-Host ""
Write-Host "==================================================="
Write-Host "  Clientes creados     : $($created.Count)"
Write-Host "  Clientes actualizados: $($updated.Count)"
Write-Host "  Sin cambios          : $($skipped.Count)"
Write-Host "==================================================="

$outCreated = "$PSScriptRoot\clientes_creados.csv"
$outUpdated = "$PSScriptRoot\clientes_actualizados.csv"

if ($created.Count -gt 0) {
    $created | Export-Csv -Path $outCreated -Delimiter ";" -Encoding UTF8 -NoTypeInformation
    Write-Host "  Creados -> $outCreated"
}
if ($updated.Count -gt 0) {
    $updated | Export-Csv -Path $outUpdated -Delimiter ";" -Encoding UTF8 -NoTypeInformation
    Write-Host "  Actualizados -> $outUpdated"
}
