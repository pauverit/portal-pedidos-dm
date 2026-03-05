# fix_phones.ps1
# Limpia telefonos de clientes:
# - Quita prefijo "34" si empieza por 34
# - Quita sufijo ".0" si acaba en .0
# Resultado esperado: numero de 9 digitos

$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$hGet   = @{ apikey=$key; Authorization="Bearer $key" }
$hPatch = @{ apikey=$key; Authorization="Bearer $key"; "Content-Type"="application/json"; Prefer="return=minimal" }

# Cargar todos los clientes con telefono
Write-Host "Cargando clientes con telefono..."
$all = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=id,company_name,phone&phone=not.is.null&phone=neq.&role=eq.client&limit=1000&offset=$off" -Headers $hGet
    if ($pg -and $pg.Count -gt 0) { $all += $pg; $off += 1000 } else { break }
} while ($pg.Count -eq 1000)

Write-Host "  Total con telefono: $($all.Count)"
Write-Host ""

$updated = 0
$skipped = 0
$errors  = 0

foreach ($c in $all) {
    $orig = $c.phone.Trim()
    $clean = $orig

    # Quitar sufijo .0
    if ($clean -match '\.0$') {
        $clean = $clean -replace '\.0$', ''
    }

    # Quitar prefijo 34 si el resultado seria un numero de 9 digitos
    if ($clean -match '^34' -and $clean.Length -ge 11) {
        $withoutPrefix = $clean.Substring(2)
        # Solo quitar si lo que queda son digitos y tiene longitud correcta (8-9)
        if ($withoutPrefix -match '^\d{8,9}$') {
            $clean = $withoutPrefix
        }
    }

    # Limpiar espacios y guiones residuales
    $clean = $clean -replace '[\s\-\.]', ''

    if ($clean -eq $orig) { $skipped++; continue }

    $body = "{`"phone`":`"$clean`"}"
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        Invoke-RestMethod -Uri "$url/rest/v1/clients?id=eq.$($c.id)" -Headers $hPatch -Method Patch -Body $bodyBytes | Out-Null
        Write-Host "  OK: $($c.company_name) | '$orig' -> '$clean'"
        $updated++
    } catch {
        Write-Host "  ERR: $($c.company_name): $_"
        $errors++
    }
}

Write-Host ""
Write-Host "==================================================="
Write-Host "  Actualizados  : $updated"
Write-Host "  Sin cambio    : $skipped"
Write-Host "  Errores       : $errors"
Write-Host "==================================================="
