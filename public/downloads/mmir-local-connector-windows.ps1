$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$AppName = "MMIR Local Connector"
$HostAddress = "127.0.0.1"
$Port = if ($env:MMIR_LOCAL_CONNECTOR_PORT) { $env:MMIR_LOCAL_CONNECTOR_PORT } else { "3000" }
$OllamaUrl = if ($env:OLLAMA_URL) { $env:OLLAMA_URL } else { "http://127.0.0.1:11434" }
$MmirSite = if ($env:MMIR_SITE) { $env:MMIR_SITE } else { "https://mmir.ai/#connect-options" }
$Root = Join-Path $env:LOCALAPPDATA "MMIR Local Connector"
$NodeDir = Join-Path $Root "node"
$Server = Join-Path $Root "server.mjs"
$TokenFile = Join-Path $Root "pairing-token"
$ModelFile = Join-Path $Root "default-model"
$LogDir = Join-Path $env:LOCALAPPDATA "MMIR Local Connector\Logs"
$StartScript = Join-Path $Root "start-connector.ps1"
$ServerSource = "https://mmir.ai/downloads/mmir-local-connector-server.mjs"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message"
}

function Fail {
  param([string]$Message)
  throw "Install failed: $Message"
}

function Get-NodeMajor {
  param([string]$NodePath)
  try {
    return [int](& $NodePath -p "Number(process.versions.node.split('.')[0])")
  } catch {
    return 0
  }
}

function Get-NodeArch {
  $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
  if ($arch -eq "x64") { return "x64" }
  if ($arch -eq "arm64") { return "arm64" }
  Fail "unsupported Windows architecture: $arch"
}

function Get-LatestNodeVersion {
  try {
    $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 20
    return ($index | Where-Object { $_.lts -ne $false } | Select-Object -First 1).version
  } catch {
    return "v22.21.1"
  }
}

function Ensure-Node {
  $global:NodeBin = $null
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand -and (Get-NodeMajor $nodeCommand.Source) -ge 20) {
    $global:NodeBin = $nodeCommand.Source
    return
  }

  $privateNode = Join-Path $NodeDir "node.exe"
  if ((Test-Path $privateNode) -and (Get-NodeMajor $privateNode) -ge 20) {
    $global:NodeBin = $privateNode
    return
  }

  $version = Get-LatestNodeVersion
  $arch = Get-NodeArch
  $archive = "node-$version-win-$arch.zip"
  $url = "https://nodejs.org/dist/$version/$archive"
  $temp = Join-Path $env:TEMP $archive
  $extract = Join-Path $env:TEMP "mmir-node-$version-$arch"

  Write-Step "Installing private Node.js runtime $version"
  Invoke-WebRequest -Uri $url -OutFile $temp -TimeoutSec 180
  Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue
  Expand-Archive -Path $temp -DestinationPath $extract -Force
  Remove-Item -Recurse -Force $NodeDir -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $NodeDir | Out-Null
  $sourceDir = Get-ChildItem $extract -Directory | Select-Object -First 1
  Copy-Item -Path (Join-Path $sourceDir.FullName "*") -Destination $NodeDir -Recurse -Force
  $global:NodeBin = Join-Path $NodeDir "node.exe"
}

function Find-Ollama {
  $command = Get-Command ollama -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"),
    (Join-Path $env:LOCALAPPDATA "Ollama\ollama.exe"),
    "C:\Program Files\Ollama\ollama.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

function Test-OllamaReady {
  try {
    Invoke-RestMethod -Uri "$OllamaUrl/api/version" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Ensure-Ollama {
  $global:OllamaBin = Find-Ollama
  if (-not $global:OllamaBin) {
    Write-Step "Installing Ollama"
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
      winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
    } else {
      $installer = Join-Path $env:TEMP "OllamaSetup.exe"
      Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installer -TimeoutSec 300
      Start-Process -FilePath $installer -Wait
    }
    $global:OllamaBin = Find-Ollama
  }

  if (-not $global:OllamaBin) {
    Fail "Ollama installed but the CLI was not found. Start Ollama once, then rerun this installer."
  }

  if (-not (Test-OllamaReady)) {
    Write-Step "Starting Ollama"
    Start-Process -FilePath $global:OllamaBin -ArgumentList "serve" -WindowStyle Hidden -RedirectStandardOutput (Join-Path $LogDir "ollama.log") -RedirectStandardError (Join-Path $LogDir "ollama.err.log")
  }

  for ($index = 0; $index -lt 40; $index += 1) {
    if (Test-OllamaReady) { return }
    Start-Sleep -Seconds 1
  }
  Fail "Ollama did not become ready on $OllamaUrl."
}

function Get-RecommendedModel {
  $memoryGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
  if ($memoryGb -ge 16) { return "llama3.2:3b" }
  if ($memoryGb -ge 8) { return "llama3.2:1b" }
  return "qwen2.5:0.5b"
}

function Ensure-Token {
  if (-not (Test-Path $TokenFile)) {
    & $global:NodeBin -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url')+'\n')" | Set-Content -Path $TokenFile -NoNewline
  }
}

function Ensure-Model {
  $model = if ($env:MMIR_MODEL) { $env:MMIR_MODEL } else { Get-RecommendedModel }
  Set-Content -Path $ModelFile -Value $model

  if ($env:MMIR_SKIP_MODEL_PULL -eq "true") {
    Write-Step "Skipping model download"
    return
  }

  $installed = (& $global:OllamaBin list 2>$null | Select-Object -Skip 1) -join "`n"
  if ($installed -match [regex]::Escape($model)) {
    Write-Step "Starter model already installed: $model"
    return
  }

  Write-Step "Downloading starter model: $model"
  & $global:OllamaBin pull $model
}

function Write-Server {
  Invoke-WebRequest -Uri $ServerSource -OutFile $Server -TimeoutSec 60
}

function Write-StartScript {
  $script = @"
`$env:HOST = "$HostAddress"
`$env:PORT = "$Port"
`$env:OLLAMA_URL = "$OllamaUrl"
`$env:MMIR_PAIRING_TOKEN_FILE = "$TokenFile"
`$env:MMIR_DEFAULT_MODEL_FILE = "$ModelFile"
`$env:MMIR_CONNECTOR_PLATFORM = "windows"
& "$global:NodeBin" "$Server"
"@
  Set-Content -Path $StartScript -Value $script
}

function Register-Startup {
  $startup = [Environment]::GetFolderPath("Startup")
  $shortcutPath = Join-Path $startup "MMIR Local Connector.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = "powershell.exe"
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
  $shortcut.WorkingDirectory = $Root
  $shortcut.Save()
}

function Start-Connector {
  $health = "http://${HostAddress}:${Port}/health"
  try {
    Invoke-RestMethod -Uri $health -TimeoutSec 2 | Out-Null
    return
  } catch {}

  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $StartScript -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $LogDir "local-connector.log") -RedirectStandardError (Join-Path $LogDir "local-connector.err.log")

  for ($index = 0; $index -lt 30; $index += 1) {
    try {
      Invoke-RestMethod -Uri $health -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  Fail "local connector did not become ready on $health."
}

New-Item -ItemType Directory -Force -Path $Root, $LogDir | Out-Null

Write-Step "Installing $AppName"
Ensure-Node
Write-Step "Using Node: $global:NodeBin"
Ensure-Ollama
Ensure-Token
Ensure-Model
Write-Server
Write-StartScript
Register-Startup
Start-Connector

Write-Step "$AppName is ready"
Write-Host "Health: http://${HostAddress}:${Port}/health"
Write-Host "Status: http://${HostAddress}:${Port}/status"
Write-Host "Install folder: $Root"
Write-Host "Logs: $LogDir"
Start-Process $MmirSite
