$supabaseUrl = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$headers = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=minimal'
}

# 1. Load exported machines
$rawMachines = Get-Content 'c:\Users\enehas\Downloads\portal-pedidos-dm\machines_to_import.json' -Raw | ConvertFrom-Json

# 2. Get ALL Clients map (Email -> ID AND Name -> ID)
Write-Output "Fetching all clients..."
$allClients = @()
$offset = 0
$limit = 1000
while ($true) {
    $url = "$($supabaseUrl)/rest/v1/clients?select=id,email,company_name&offset=$($offset)&limit=$($limit)"
    $batch = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    if ($batch.Count -eq 0) { break }
    $allClients += $batch
    if ($batch.Count -lt $limit) { break }
    $offset += $limit
}
Write-Output "Total clients in DB: $($allClients.Count)"

$emailMap = @{}
$nameMap = @{}
foreach ($c in $allClients) {
    if ($c.email) { $emailMap[$c.email.ToLower().Trim()] = $c.id }
    if ($c.company_name) { $nameMap[$c.company_name.ToLower().Trim()] = $c.id }
    if ($c.name) { $nameMap[$c.name.ToLower().Trim()] = $c.id }
}

# 3. Prepare machines for insert
$toInsert = @()
$missing = 0
$linkedByEmail = 0
$linkedByName = 0

foreach ($m in $rawMachines) {
    $clientId = $null
    
    $email = if ($m.Email) { $m.Email.ToLower().Trim() } else { "" }
    $name = if ($m.ClientName) { $m.ClientName.ToLower().Trim() } else { "" }

    if ($email -and $emailMap.ContainsKey($email)) {
        $clientId = $emailMap[$email]
        $linkedByEmail++
    } elseif ($name -and $nameMap.ContainsKey($name)) {
        $clientId = $nameMap[$name]
        $linkedByName++
    }

    if ($clientId) {
        $warrantyStr = $null
        if ($m.Warranty -is [double] -or $m.Warranty -is [int]) {
            $warrantyStr = [DateTime]::FromOADate($m.Warranty).ToString("yyyy-MM-dd")
        } elseif ($m.Warranty -match '^\d{4}-\d{2}-\d{2}') {
            $warrantyStr = $m.Warranty
        }

        $toInsert += @{
            client_id = $clientId
            serial_number = if ($m.Serial) { $m.Serial.ToString().Trim() } else { "S/N" }
            model = if ($m.Model) { $m.Model.ToString().Trim() } else { "Unknown" }
            brand = if ($m.Brand) { $m.Brand.ToString().Trim() } else { "Unknown" }
            warranty_expires = $warrantyStr
            status = 'active'
        }
    } else {
        $missing++
    }
}

Write-Output "Stats: Total Machines=$($rawMachines.Count), Linked By Email=$linkedByEmail, Linked By Name=$linkedByName, Total Linked=$($toInsert.Count), Missing Clients=$missing"

# 4. Bulk Insert in chunks
$chunkSize = 200
$totalInserted = 0
for ($i = 0; $i -lt $toInsert.Count; $i += $chunkSize) {
    $end = [Math]::Min($i + $chunkSize - 1, $toInsert.Count - 1)
    $chunk = $toInsert[$i..$end]
    $payload = $chunk | ConvertTo-Json -Depth 5
    
    try {
        $insertUrl = "$supabaseUrl/rest/v1/machines"
        Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $headers -Body $payload
        $totalInserted += $chunk.Count
        Write-Output "Chunk $([math]::floor($i/$chunkSize) + 1) OK. Total so far: $totalInserted"
    } catch {
        Write-Output "Error in Chunk $([math]::floor($i/$chunkSize) + 1):"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Output "Supabase Error Body: $($reader.ReadToEnd())"
        } else {
            Write-Output $_.Exception.Message
        }
    }
}

Write-Output "Done! Successfully imported $totalInserted machines."
