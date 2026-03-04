$supabaseUrl = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$headers = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
}
$url = "$supabaseUrl/rest/v1/machines?select=*&limit=1"
$resp = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
$resp.Content | Out-File -FilePath 'machine_sample.json'
Write-Output "Sample saved to machine_sample.json"
