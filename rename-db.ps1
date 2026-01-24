$source = "src/app/api/db"
$dest = "src/app/api/db-legacy"

if (Test-Path $source) {
    Rename-Item -Path $source -NewName $dest -Force
    Write-Host "Renamed $source to $dest"
} else {
    Write-Host "Source folder not found: $source"
}
