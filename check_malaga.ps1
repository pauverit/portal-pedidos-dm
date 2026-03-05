$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$h = @{ apikey=$key; Authorization="Bearer $key" }

# Check sales_rep values for MALAGA delegation clients
$pg = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=company_name,sales_rep,delegation&delegation=ilike.*malaga*&role=eq.client&limit=50" -Headers $h

Write-Host "Muestra de clientes MALAGA:"
$pg | ForEach-Object {
    $sr = if ($_.sales_rep) { $_.sales_rep } else { "(null)" }
    Write-Host "  $($_.company_name) | delegation=$($_.delegation) | sales_rep=$sr"
}
Write-Host ""
Write-Host "Total muestra: $($pg.Count)"

# Also count distinct sales_rep values for MALAGA
$all = @()
$off = 0
do {
    $p2 = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=sales_rep&delegation=ilike.*malaga*&role=eq.client&limit=1000&offset=$off" -Headers $h
    if ($p2 -and $p2.Count -gt 0) { $all += $p2; $off += 1000 } else { break }
} while ($p2.Count -eq 1000)

$srCounts = @{}
foreach ($c in $all) {
    $sr = if ($c.sales_rep) { $c.sales_rep } else { "(null)" }
    if (-not $srCounts.ContainsKey($sr)) { $srCounts[$sr] = 0 }
    $srCounts[$sr]++
}

Write-Host ""
Write-Host "Distribucion sales_rep para clientes MALAGA ($($all.Count) total):"
$srCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  [$($_.Value)x] '$($_.Name)'"
}

# Also check JAEN and GRANADA
Write-Host ""
Write-Host "--- JAEN/GRANADA ---"
$jg = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=sales_rep,delegation&or=(delegation.ilike.*jaen*,delegation.ilike.*ja%C3%A9n*,delegation.ilike.*granada*)&role=eq.client&limit=200" -Headers $h
$jgCounts = @{}
foreach ($c in $jg) {
    $sr = if ($c.sales_rep) { $c.sales_rep } else { "(null)" }
    if (-not $jgCounts.ContainsKey($sr)) { $jgCounts[$sr] = 0 }
    $jgCounts[$sr]++
}
Write-Host "Distribucion sales_rep para JAEN/GRANADA ($($jg.Count) total):"
$jgCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  [$($_.Value)x] '$($_.Name)'"
}
