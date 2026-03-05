$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$h = @{ apikey=$key; Authorization="Bearer $key" }

$tables = @("client_visits","client_calls","incidents","incident_comments","work_orders","machines","clients","coupons","orders","products")

foreach ($t in $tables) {
    try {
        $r = Invoke-RestMethod -Uri "$url/rest/v1/$t`?limit=1" -Headers $h -ErrorAction Stop
        Write-Host "  OK      $t"
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match "404" -or $msg -match "schema cache" -or $msg -match "not found") {
            Write-Host "  FALTA   $t  <---"
        } else {
            Write-Host "  ERROR   $t  : $msg"
        }
    }
}
