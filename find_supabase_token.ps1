$paths = @(
    "$env:USERPROFILE\.supabase",
    "$env:APPDATA\supabase",
    "$env:LOCALAPPDATA\supabase"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "Encontrado: $p"
        Get-ChildItem $p -Recurse -File | ForEach-Object { Write-Host "  $($_.FullName)" }
    } else {
        Write-Host "No existe: $p"
    }
}
