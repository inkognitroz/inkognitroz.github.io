param(
  [string]$Model = "gemma3:270m",
  [string]$TargetDir = "$env:USERPROFILE\.mmir\local-node",
  [switch]$DryRun,
  [switch]$InstallOllama,
  [switch]$SkipModelPull
)

$ErrorActionPreference = "Stop"

$ArchiveUrl = "https://github.com/inkognitroz/mmir-local-node/archive/refs/heads/main.zip"
$ZipPath = Join-Path $env:TEMP "mmir-local-node-main.zip"
$ExtractRoot = Join-Path $env:TEMP "mmir-local-node-bootstrap"
$SourceDir = Join-Path $ExtractRoot "mmir-local-node-main"

Write-Host "MMIR Local Node bootstrap for Windows"
Write-Host "Model: $Model"
Write-Host "Target: $TargetDir"
if ($DryRun) {
  Write-Host "Dry run: the bootstrap will download and preview, but the installer will not start services."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 20+ is required. Install Node.js from https://nodejs.org and rerun this script."
}

New-Item -ItemType Directory -Force -Path $ExtractRoot | Out-Null
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

Write-Host "Downloading MMIR Local Node package..."
Invoke-WebRequest -Uri $ArchiveUrl -OutFile $ZipPath -UseBasicParsing

if (Test-Path $SourceDir) {
  Remove-Item -Recurse -Force $SourceDir
}
Expand-Archive -Path $ZipPath -DestinationPath $ExtractRoot -Force

Copy-Item -Recurse -Force (Join-Path $SourceDir "*") $TargetDir

Push-Location $TargetDir
$env:MMIR_MODEL = $Model
if ($InstallOllama) { $env:MMIR_INSTALL_OLLAMA = "true" }
if ($SkipModelPull) { $env:MMIR_SKIP_MODEL_PULL = "true" }

if ($DryRun) {
  .\install\mmir-install.ps1 -DryRun
} else {
  .\install\mmir-install.ps1
}
Pop-Location
