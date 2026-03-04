$supabaseUrl = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$headers = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
}

Write-Output "Fetching clients..."
$clientsUrl = "$($supabaseUrl)/rest/v1/clients?select=id,email,company_name"
try {
    $clients = Invoke-RestMethod -Uri $clientsUrl -Method Get -Headers $headers
    Write-Output "Found $($clients.Count) clients."
    $clients | Select-Object -First 5 | ConvertTo-Json | Out-File -FilePath 'clients_sample.json'
} catch {
    Write-Error "Failed to fetch clients: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output "Error: $($reader.ReadToEnd())"
    }
}
