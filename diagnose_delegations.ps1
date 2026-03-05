$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$h = @{ apikey=$key; Authorization="Bearer $key" }

# Load ALL unassigned clients
$all = @()
$off = 0
do {
    $pg = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=delegation,zone&sales_rep=is.null&role=eq.client&limit=1000&offset=$off" -Headers $h
    if ($pg -and $pg.Count -gt 0) { $all += $pg; $off += 1000 } else { break }
} while ($pg.Count -eq 1000)

Write-Host "Total sin asignar: $($all.Count)"
Write-Host ""

# Count distinct delegation values
$counts = @{}
foreach ($c in $all) {
    if ($c.delegation -and $c.delegation.Trim()) {
        $d = $c.delegation.Trim().ToUpper()
    } elseif ($c.zone -and $c.zone.Trim()) {
        $d = "[zone] " + $c.zone.Trim().ToUpper()
    } else {
        $d = "(vacio)"
    }
    if (-not $counts.ContainsKey($d)) { $counts[$d] = 0 }
    $counts[$d]++
}

Write-Host "Top 80 valores de delegation/zone:"
$counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 80 | ForEach-Object {
    Write-Host "  [$($_.Value)x] $($_.Name)"
}
