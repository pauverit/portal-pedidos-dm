# import_warranty_machines.ps1
# Procesa el CSV de activos en garantia.
# - Si la maquina ya existe (por nro de serie) -> actualiza warranty_expires
# - Si no existe -> busca/crea el cliente y crea la maquina
# Genera nuevos_clientes_importados.csv con los clientes creados para revision.

$csvPath     = "C:\Users\enehas\Downloads\Activos en clientes.csv"
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

function ParseDate($d) {
    if (-not $d) { $d = "" } else { $d = $d.Trim() }
    if ($d -match "^(\d{2})/(\d{2})/(\d{4})$") {
        return "$($Matches[3])-$($Matches[2])-$($Matches[1])"
    }
    return $null
}

function NormName($n) {
    if (-not $n) { $n = "" }
    return $n.ToLower().Trim() -replace '\s+', ' '
}

function Safe($v) {
    if ($v -eq $null) { return "" }
    return $v.Trim()
}

# 1. Leer CSV
Write-Host "Leyendo CSV: $csvPath"
$csvRows = Import-Csv -Path $csvPath -Delimiter ";" -Encoding Default

# Columnas por indice:
# 0=Referencia, 1=Nombre, 2=Identificador, 3=NroSerie, 4=RefCliente, 5=NombreCliente,
# 6=Direccion, 7=Localidad, 8=Provincia, 9=CP, 10=Pais, 11=Marca, 12=Modelo,
# 13=Mantenimiento, 14=InicioGarantia, 15=FinGarantia
$rows = $csvRows | Where-Object { $_ } | ForEach-Object {
    $v = @($_.PSObject.Properties.Value)
    if ($v.Count -lt 16) { return }
    [PSCustomObject]@{
        ActRef      = Safe($v[0])
        MachineName = Safe($v[1])
        Serial      = Safe($v[3])
        ClientRef   = Safe($v[4])
        ClientName  = Safe($v[5])
        Address     = (Safe($v[6])) -replace "[\r\n]+", " "
        Localidad   = Safe($v[7])
        Provincia   = Safe($v[8])
        CP          = Safe($v[9])
        Pais        = Safe($v[10])
        Brand       = Safe($v[11])
        Model       = Safe($v[12])
        StartDate   = ParseDate($v[14])
        EndDate     = ParseDate($v[15])
    }
}
Write-Host "  -> $($rows.Count) filas validas"

# 2. Cargar clientes de Supabase (paginado)
Write-Host "Cargando clientes de Supabase..."
$allClients = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?select=id,company_name&limit=1000&offset=$off" -Headers $hGet
    $allClients += $pg; $off += 1000
} while ($pg.Count -eq 1000)
Write-Host "  -> $($allClients.Count) clientes"

$clientNameMap = @{}
foreach ($c in $allClients) {
    $k = NormName($c.company_name)
    if ($k -and -not $clientNameMap.ContainsKey($k)) { $clientNameMap[$k] = $c.id }
}

# 3. Cargar maquinas de Supabase (paginado)
Write-Host "Cargando maquinas de Supabase..."
$allMachines = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/machines?select=id,serial_number&limit=1000&offset=$off" -Headers $hGet
    $allMachines += $pg; $off += 1000
} while ($pg.Count -eq 1000)
Write-Host "  -> $($allMachines.Count) maquinas"

$serialMap = @{}
foreach ($m in $allMachines) {
    $sn = Safe($m.serial_number)
    if ($sn -and $sn -ne "" -and $sn -ne "S/N" -and $sn -ne "SIN DATOS" -and -not $serialMap.ContainsKey($sn)) {
        $serialMap[$sn] = $m.id
    }
}

# 4. Procesar cada fila
$updated    = @()
$created    = @()
$newClients = @()
$skipped    = @()

foreach ($row in $rows) {
    if (-not $row.EndDate) {
        Write-Host "  OMITIDA (sin fecha fin garantia): $($row.ActRef) $($row.ClientName)"
        $skipped += $row; continue
    }

    $serial = $row.Serial

    # A. Maquina existente -> actualizar garantia
    if ($serial -and $serial -ne "" -and $serial -ne "S/N" -and $serial -ne "SIN DATOS" -and $serialMap.ContainsKey($serial)) {
        $machineId = $serialMap[$serial]
        $body = @{ warranty_expires = $row.EndDate } | ConvertTo-Json -Compress
        try {
            Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/machines?id=eq.$machineId" -Headers $hPatch -Method Patch -Body $body | Out-Null
            Write-Host "  ACTUALIZADA: $serial -> garantia $($row.EndDate) ($($row.ClientName))"
            $updated += [PSCustomObject]@{ Serial=$serial; Cliente=$row.ClientName; FinGarantia=$row.EndDate }
        } catch {
            Write-Host "  ERROR actualizando $serial : $_"
        }
        continue
    }

    # B. Maquina nueva -> buscar o crear cliente
    $norm = NormName($row.ClientName)
    $clientId = $null

    if ($clientNameMap.ContainsKey($norm)) {
        $clientId = $clientNameMap[$norm]
    } else {
        # Crear nuevo cliente
        $emailRef  = $row.ClientRef -replace '[^a-zA-Z0-9]', '_'
        $email     = "noemail+$emailRef@portal.dm"
        $cliBody   = @{
            company_name         = $row.ClientName
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
        } | ConvertTo-Json -Compress -Depth 5

        try {
            $cliBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($cliBody)
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients" -Headers $hPost -Method Post -Body $cliBodyBytes
            $clientId = $res[0].id
            $clientNameMap[$norm] = $clientId
            Write-Host "  NUEVO CLIENTE: $($row.ClientName) (id=$clientId)"
            $newClients += [PSCustomObject]@{
                Id          = $clientId
                Referencia  = $row.ClientRef
                Nombre      = $row.ClientName
                Direccion   = $row.Address
                Localidad   = $row.Localidad
                Provincia   = $row.Provincia
                CP          = $row.CP
                EmailPlaceholder = $email
                Notas       = "REVISAR: sin email real - anadir email y activar si necesita acceso al portal"
            }
        } catch {
            Write-Host "  ERROR creando cliente $($row.ClientName) : $_"
            $skipped += $row; continue
        }
    }

    # Crear maquina
    $snValue = if ($serial -and $serial -ne "") { $serial } else { "S/N" }
    $mBody = @{
        client_id        = $clientId
        serial_number    = $snValue
        brand            = $row.Brand
        model            = $row.Model
        install_date     = $row.StartDate
        warranty_expires = $row.EndDate
        status           = "active"
        notes            = "Importado: $($row.ActRef)"
    } | ConvertTo-Json -Compress

    try {
        $mBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($mBody)
        Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/machines" -Headers $hPost -Method Post -Body $mBodyBytes | Out-Null
        Write-Host "  NUEVA MAQUINA: $($row.Brand) $($row.Model) SN=$serial -> $($row.ClientName)"
        $created += [PSCustomObject]@{ Ref=$row.ActRef; Serial=$serial; Marca=$row.Brand; Modelo=$row.Model; Cliente=$row.ClientName; FinGarantia=$row.EndDate }
    } catch {
        Write-Host "  ERROR creando maquina $($row.ActRef): $_"
    }
}

# 5. Resumen
Write-Host ""
Write-Host "==================================================="
Write-Host "  Garantias actualizadas : $($updated.Count)"
Write-Host "  Maquinas nuevas        : $($created.Count)"
Write-Host "  Clientes nuevos        : $($newClients.Count)"
Write-Host "  Filas omitidas         : $($skipped.Count)"
Write-Host "==================================================="

# Guardar clientes nuevos para revision
$outPath = "$PSScriptRoot\nuevos_clientes_importados.csv"
if ($newClients.Count -gt 0) {
    $newClients | Export-Csv -Path $outPath -Delimiter ";" -Encoding UTF8 -NoTypeInformation
    Write-Host ""
    Write-Host "[!] Revisa los $($newClients.Count) clientes nuevos en:"
    Write-Host "    $outPath"
    Write-Host "    -> Anade el email real de cada uno y activalos si necesitan acceso al portal."
}
