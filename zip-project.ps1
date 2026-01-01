# Simple script to zip the project
$projectPath = "c:\Users\Python120612\Desktop\TRAE"
$tempZipPath = "$projectPath\project-temp.zip"
$finalZipPath = "$projectPath\project.zip"

# Remove temporary zip file if it exists
if (Test-Path $tempZipPath) {
    Remove-Item $tempZipPath -Force
}

# Create zip file using .NET API
Add-Type -AssemblyName System.IO.Compression.FileSystem
$compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal

# Create the zip file
[System.IO.Compression.ZipFile]::CreateFromDirectory($projectPath, $tempZipPath, $compressionLevel, $false)

# Remove final zip file if it exists and rename temp to final
if (Test-Path $finalZipPath) {
    Remove-Item $finalZipPath -Force
}
Rename-Item $tempZipPath $finalZipPath

Write-Host "Project zipped successfully to $finalZipPath"