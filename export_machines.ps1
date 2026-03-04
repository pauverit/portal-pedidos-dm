$excelPath = 'D:\COPIA DOWNLOADS\CLIENTES+ACTIVOS FUSIONADO.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open($excelPath)
$sheet = $wb.Sheets.Item(1)
$lastRow = $sheet.UsedRange.Rows.Count
$lastCol = $sheet.UsedRange.Columns.Count

$data = @()
$headers = @()

# Get Headers (assuming Row 1)
for ($c = 1; $c -le $lastCol; $c++) {
    $header = $sheet.Cells.Item(1, $c).Text
    $headers += $header
    Write-Output "Col ${c}: ${header}"
}

# Get Data (Rows 2 to lastRow)
# Note: For performance with many rows, reading cell by cell is slow.
# However, for a one-off import of a few thousand rows, it's usually acceptable.
# Let's try to get the range value for better speed.
$range = $sheet.Range("A2", $sheet.Cells.Item($lastRow, $lastCol))
$values = $range.Value2

$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

$result = @{
    TotalRows = $lastRow
    Headers = $headers
    # Sample data for logging/verification before we do the massive loop
    # We will process everything in the next script or this one.
}

# Map columns to indices (Hardcoded for reliability after verification)
$colEmail = 7
$colSerie = 18
$colMarca = 26
$colModel = 27
$colWarranty = 30

Write-Output "Total Rows: $lastRow"
Write-Output "Model Col: $colModel, Serie Col: $colSerie, Email Col: $colEmail, Warranty Col: $colWarranty"

$colClientName = 20

# Export data to JSON
$allMachines = @()
for ($r = 1; $r -le ($lastRow - 1); $r++) {
    $email = $values[$r, $colEmail]
    $clientName = $values[$r, $colClientName]
    
    $m = @{
        Email = if ($email) { $email.ToString().Trim().ToLower() } else { "" }
        ClientName = if ($clientName) { $clientName.ToString().Trim() } else { "" }
        Model = if ($values[$r, $colModel]) { $values[$r, $colModel].ToString().Trim() } else { "Unknown" }
        Serial = if ($values[$r, $colSerie]) { $values[$r, $colSerie].ToString().Trim() } else { "S/N" }
        Brand = if ($values[$r, $colMarca]) { $values[$r, $colMarca].ToString().Trim() } else { "Unknown" }
        Warranty = $values[$r, $colWarranty]
    }
    $allMachines += $m
}

$allMachines | ConvertTo-Json | Out-File -FilePath 'c:\Users\enehas\Downloads\portal-pedidos-dm\machines_to_import.json' -Encoding utf8
Write-Output "Exported $($allMachines.Count) machines to machines_to_import.json"
