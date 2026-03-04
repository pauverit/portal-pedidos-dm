$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('D:\COPIA DOWNLOADS\CLIENTES+ACTIVOS FUSIONADO.xlsx')
$sheet = $wb.Sheets.Item(1)
$range = $sheet.UsedRange
$rows = $range.Rows.Count
$cols = $range.Columns.Count

$data = @()
for ($r = 1; $r -le [Math]::Min(10, $rows); $r++) {
    $rowValues = @()
    for ($c = 1; $c -le $cols; $c++) {
        $rowValues += $range.Cells.Item($r, $c).Text
    }
    $data += ($rowValues -join ";")
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

$data | Out-File -FilePath 'C:\Users\enehas\Downloads\portal-pedidos-dm\excel_preview.txt' -Encoding utf8
