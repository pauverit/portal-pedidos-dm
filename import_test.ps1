$supabaseUrl = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$headers = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('D:\COPIA DOWNLOADS\CLIENTES+ACTIVOS FUSIONADO.xlsx')
$sheet = $wb.Sheets.Item(1)
$range = $sheet.UsedRange
$rows = $range.Rows.Count

$importedCount = 0
$r = 2 # Start after header

while ($r -le $rows -and $importedCount -lt 3) {
    try {
        $email = $sheet.Cells.Item($r, 7).Text.Trim()
        $serial = $sheet.Cells.Item($r, 18).Text.Trim()
        $brand = $sheet.Cells.Item($r, 26).Text.Trim()
        $model = $sheet.Cells.Item($r, 27).Text.Trim()
        $warranty = $sheet.Cells.Item($r, 30).Text.Trim()

        # Log found row - use ${r} to avoid drive name ambiguity
        Write-Host "Row ${r}: Email=$email, Serial=$serial, Brand=$brand, Model=$model"

        # Skip invalid rows
        if ($email -eq '' -or $serial -eq '' -or $serial -eq 'SIN DATOS' -or $model -eq 'SIN DATOS' -or $model -eq '') {
            $r++
            continue
        }

        # 1. Find client ID by email
        $clientUrl = "$supabaseUrl/rest/v1/clients?email=eq.$email&select=id"
        $clientRes = Invoke-RestMethod -Uri $clientUrl -Method Get -Headers $headers
        
        if ($clientRes.Count -gt 0) {
            $clientId = $clientRes[0].id
            Write-Host "  Found client ID: $clientId for $email"

            # 2. Upsert machine
            $machineData = @{
                client_id = $clientId
                serial_number = $serial
                brand = $brand
                model = $model
                warranty_expires = if ($warranty -eq 'SIN DATOS' -or $warranty -eq '') { $null } else { $warranty }
                status = 'active'
            }
            $machineJson = $machineData | ConvertTo-Json
            
            $machineUrl = "$supabaseUrl/rest/v1/machines"
            $headers['Prefer'] = 'resolution=merge-duplicates,return=representation'
            $res = Invoke-RestMethod -Uri $machineUrl -Method Post -Headers $headers -Body $machineJson
            
            Write-Host "  Successfully imported machine for $email"
            $importedCount++
        } else {
            Write-Host "  Client not found for email: $email"
        }
    } catch {
        Write-Host "  Failed to process row ${r}: $($_.Exception.Message)"
    }

    $r++
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
Write-Host "Done! Imported $importedCount machines."
