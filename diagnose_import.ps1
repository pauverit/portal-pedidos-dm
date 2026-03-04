$supabaseUrl = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$headers = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'resolution=merge-duplicates' # Attempting upsert if supported
}

# 1. Load exported machines
$rawMachines = Get-Content 'c:\Users\enehas\Downloads\portal-pedidos-dm\machines_to_import.json' -Raw | ConvertFrom-Json

# 2. Get Clients map (Email -> ID AND Name -> ID)
Write-Output "Fetching clients..."
$clients = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/clients?select=id,email,company_name,name" -Method Get -Headers $headers
$emailMap = @{}
$nameMap = @{}
foreach ($c in $clients) {
    if ($c.email) { $emailMap[$c.email.ToLower()] = $c.id }
    if ($c.company_name) { $nameMap[$c.company_name.ToLower()] = $c.id }
    if ($c.name) { $nameMap[$c.name.ToLower()] = $c.id }
}

# 3. Prepare machines for insert
$toInsert = @()
$missing = 0

foreach ($m in $rawMachines) {
    $email = $m.Email.ToLower()
    $clientId = $null
    
    if ($emailMap.ContainsKey($email)) {
        $clientId = $emailMap[$email]
    } elseif ($m.ClientName -and $nameMap.ContainsKey($m.ClientName.ToLower())) {
        # Note: I need to update export_machines.ps1 to include ClientName (Col 20)
        $clientId = $nameMap[$m.ClientName.ToLower()]
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

Write-Output "Linked: $($toInsert.Count), Missing: $missing"

# 4. Try inserting ONE machine to see the error clearly if it fails
if ($toInsert.Count -gt 0) {
    $testMachine = $toInsert[0]
    $payload = $testMachine | ConvertTo-Json
    try {
        Write-Output "Testing single insert..."
        $url = "$supabaseUrl/rest/v1/machines"
        Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $payload -UseBasicParsing
        Write-Output "Test insert OK."
    } catch {
        Write-Output "Test insert FAILED."
        if ($_.Exception.Response) {
             $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
             Write-Output "Error body: $($reader.ReadToEnd())"
        } else {
             Write-Output $_.Exception.Message
        }
    }
}
