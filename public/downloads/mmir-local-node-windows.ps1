param(
  [string]$Model = "gemma3:270m",
  [switch]$DryRun,
  [switch]$SkipModelPull
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "MMIR Local Node bootstrap is now MMIR Local Connector."
Write-Host "This legacy entrypoint delegates to the one-click connector installer."
Write-Host "Model: $Model"
if ($DryRun) {
  Write-Host "DryRun requested: downloading the new installer without running it."
}

$env:MMIR_MODEL = $Model
if ($SkipModelPull) { $env:MMIR_SKIP_MODEL_PULL = "true" }

$Installer = Join-Path $env:TEMP "mmir-local-connector-windows.ps1"
Invoke-WebRequest -Uri "https://mmir.ai/downloads/mmir-local-connector-windows.ps1" -OutFile $Installer -UseBasicParsing

if ($DryRun) {
  Write-Host "Downloaded connector installer to $Installer"
  Write-Host "Run this when ready:"
  Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File `"$Installer`""
  exit 0
}

powershell -NoProfile -ExecutionPolicy Bypass -File $Installer
