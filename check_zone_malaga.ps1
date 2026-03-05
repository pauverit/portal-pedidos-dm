$url = 'https://nyxxzlhlvqusiirzrano.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eHh6bGhsdnF1c2lpcnpyYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE4MTMsImV4cCI6MjA4NjgwNzgxM30.v8f5Xuxj1oyatCnvik6OQRs2nB3MssTK9i59XN-8mFE'
$h = @{ apikey=$key; Authorization="Bearer $key" }

# Query clients with zone containing "malaga" (any sales_rep value)
$pg = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=company_name,sales_rep,delegation,zone&zone=ilike.*malaga*&role=eq.client&limit=10" -Headers $h
Write-Host "Muestra zone ilike malaga ($($pg.Count) resultados):"
$pg | ForEach-Object {
    $sr = if ($_.sales_rep -ne $null) { "'$($_.sales_rep)'" } else { "(null)" }
    Write-Host "  $($_.company_name) | zone=$($_.zone) | delegation=$($_.delegation) | sales_rep=$sr"
}
Write-Host ""

# Count: how many have zone=malaga AND sales_rep = null
$n = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=id&zone=ilike.*malaga*&role=eq.client&sales_rep=is.null" -Headers $h -Method Get
Write-Host "Con zone=MALAGA y sales_rep=null: $($n.Count)"

# Count: how many have zone=malaga AND sales_rep = '' (empty string)
$e = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=id&zone=ilike.*malaga*&role=eq.client&sales_rep=eq." -Headers $h -Method Get
Write-Host "Con zone=MALAGA y sales_rep='' (vacio): $($e.Count)"

# Count: how many have zone=malaga total
$all2 = @()
$off = 0
do {
    $p2 = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=sales_rep&zone=ilike.*malaga*&role=eq.client&limit=1000&offset=$off" -Headers $h
    if ($p2 -and $p2.Count -gt 0) { $all2 += $p2; $off += 1000 } else { break }
} while ($p2.Count -eq 1000)

Write-Host "Total clientes zone=MALAGA: $($all2.Count)"

$counts = @{}
foreach ($c in $all2) {
    $sr = if ($c.sales_rep -ne $null -and $c.sales_rep -ne '') { $c.sales_rep } else { "(null/vacio)" }
    if (-not $counts.ContainsKey($sr)) { $counts[$sr] = 0 }
    $counts[$sr]++
}

Write-Host "Distribucion sales_rep:"
$counts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  [$($_.Value)x] '$($_.Name)'"
}

# Now check other key provinces
Write-Host ""
Write-Host "--- COMPROBANDO OTRAS PROVINCIAS ---"
foreach ($prov in @("malaga","jaen","granada","murcia","alicante","albacete","valencia","barcelona","sevilla","cordoba","huelva","cadiz")) {
    $cnt = @()
    $o2 = 0
    do {
        $p3 = Invoke-RestMethod -Uri "$url/rest/v1/clients?select=sales_rep&zone=ilike.*$prov*&role=eq.client&limit=1000&offset=$o2" -Headers $h
        if ($p3 -and $p3.Count -gt 0) { $cnt += $p3; $o2 += 1000 } else { break }
    } while ($p3.Count -eq 1000)
    $nullCount = ($cnt | Where-Object { $_.sales_rep -eq $null -or $_.sales_rep -eq '' }).Count
    Write-Host ("  " + $prov + ": " + $cnt.Count + " total, " + $nullCount + " sin asignar")
}
