@echo off
setlocal
set "MMIR_INSTALLER=%TEMP%\mmir-local-connector-windows.ps1"
echo Downloading MMIR Local Connector for Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://mmir.ai/downloads/mmir-local-connector-windows.ps1' -OutFile $env:MMIR_INSTALLER -UseBasicParsing } catch { Write-Error $_; exit 1 }"
if errorlevel 1 pause & exit /b 1
echo Starting installer...
powershell -NoProfile -ExecutionPolicy Bypass -File "%MMIR_INSTALLER%"
if errorlevel 1 pause & exit /b 1
echo.
echo MMIR Local Connector installer completed.
pause
