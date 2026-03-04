$supabaseUrl = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$headers = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
}

# 1. Get ALL existing serial numbers (handle pagination)
Write-Output "Fetching existing serials..."
$existingSerials = @{}
$offset = 0
$limit = 1000
while ($true) {
    $url = "$($supabaseUrl)/rest/v1/machines?select=serial_number&offset=$($offset)&limit=$($limit)"
    try {
        $batch = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
        if ($batch.Count -eq 0) { break }
        foreach ($item in $batch) {
            if ($item.serial_number -and $item.serial_number -ne "S/N") {
                $existingSerials[$item.serial_number.ToLower().Trim()] = $true
            }
        }
        if ($batch.Count -lt $limit) { break }
        $offset += $limit
    } catch {
        Write-Error "Failed to fetch serials batch at $($offset): $_"
        break
    }
}
Write-Output "Found $($existingSerials.Count) unique non-S/N serials in DB."

# 2. Get ALL Clients
Write-Output "Fetching all clients..."
$allClients = @()
$offset = 0
while ($true) {
    $url = "$($supabaseUrl)/rest/v1/clients?select=id,email,company_name&offset=$($offset)&limit=1000"
    $batch = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    if ($batch.Count -eq 0) { break }
    $allClients += $batch
    if ($batch.Count -lt 1000) { break }
    $offset += 1000
}
$emailMap = @{}
$nameMap = @{}
foreach ($c in $allClients) {
    if ($c.email) { $emailMap[$c.email.ToLower().Trim()] = $c.id }
    if ($c.company_name) { $nameMap[$c.company_name.ToLower().Trim()] = $c.id }
}

# 3. Process machine list
$rawMachines = Get-Content 'c:\Users\enehas\Downloads\portal-pedidos-dm\machines_to_import.json' -Raw | ConvertFrom-Json
$toInsert = @()
$seenInThisBatch = @{}
$stats = @{ Linked=0; Missing=0; SkippedDB=0; SkippedExcel=0; NullSerial=0 }

foreach ($m in $rawMachines) {
    $clientId = $null
    $email = if ($m.Email) { $m.Email.ToLower().Trim() } else { "" }
    $name = if ($m.ClientName) { $m.ClientName.ToLower().Trim() } else { "" }

    if ($email -and $emailMap.ContainsKey($email)) { $clientId = $emailMap[$email] }
    elseif ($name -and $nameMap.ContainsKey($name)) { $clientId = $nameMap[$name] }

    if ($clientId) {
        $sn = if ($m.Serial) { $m.Serial.ToString().Trim() } else { "" }
        if ($sn -eq "S/N" -or $sn -eq "") {
            $stats.NullSerial++
            $snValue = $null # Use SQL NULL for non-unique or empty serials
        } else {
            $snLower = $sn.ToLower()
            if ($existingSerials.ContainsKey($snLower)) {
                $stats.SkippedDB++
                continue
            }
            if ($seenInThisBatch.ContainsKey($snLower)) {
                $stats.SkippedExcel++
                continue
            }
            $seenInThisBatch[$snLower] = $true
            $snValue = $sn
        }

        $warrantyStr = $null
        if ($m.Warranty -is [double] -or $m.Warranty -is [int]) {
            $warrantyStr = [DateTime]::FromOADate($m.Warranty).ToString("yyyy-MM-dd")
        } elseif ($m.Warranty -match '^\d{4}-\d{2}-\d{2}') {
            $warrantyStr = $m.Warranty
        }

        $toInsert += @{
            client_id = $clientId
            serial_number = $snValue
            model = if ($m.Model) { $m.Model.ToString().Trim() } else { "Unknown" }
            brand = if ($m.Brand) { $m.Brand.ToString().Trim() } else { "Unknown" }
            warranty_expires = $warrantyStr
            status = 'active'
        }
        $stats.Linked++
    } else {
        $stats.Missing++
    }
}

Write-Output "Stats: Total=$($rawMachines.Count), Linked=$($stats.Linked), Missing=$($stats.Missing), Skipped (DB)=$($stats.SkippedDB), Duplicate (Excel)=$($stats.SkippedExcel), NullSerial=$($stats.NullSerial)"

# 4. Insert in chunks
$headers['Content-Type'] = 'application/json'
$headers['Prefer'] = 'return=minimal'
$chunkSize = 50
$totalInserted = 0

for ($i = 0; $i -lt $toInsert.Count; $i += $chunkSize) {
    $end = [Math]::Min($i + $chunkSize - 1, $toInsert.Count - 1)
    $chunk = $toInsert[$i..$end]
    $payload = $chunk | ConvertTo-Json -Depth 5
    
    try {
        $insertUrl = "$supabaseUrl/rest/v1/machines"
        Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $headers -Body $payload
        $totalInserted += $chunk.Count
        Write-Output "Chunk $([math]::floor($i/$chunkSize) + 1) OK ($totalInserted)"
    } catch {
        Write-Output "Error in Chunk $([math]::floor($i/$chunkSize) + 1):"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Output "Supabase Error Body: $($reader.ReadToEnd())"
        } else {
            Write-Output $_.Exception.Message
        }
        # One-by-one retry for this chunk to find the bad row
        Write-Output "Retrying chunk one by one..."
        foreach ($row in $chunk) {
            try {
                Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $headers -Body ($row | ConvertTo-Json)
                $totalInserted++
            } catch {
                # Log specific row error but continue
                Write-Output "Row failed: $($row.serial_number) - $($row.model)"
                if ($_.Exception.Response) {
                     $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                     Write-Output "Error: $($reader.ReadToEnd())"
                }
            }
        }
    }
}

Write-Output "Final Result: Successfully imported $totalInserted machines."
