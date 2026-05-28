param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateFile = Join-Path $root '.dev-state.json'
$logDir = Join-Path $root '.dev-logs'

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "[DEV] Verifying developer tooling..." -ForegroundColor Cyan

if (-not (Test-CommandExists 'node')) { throw 'Node.js is required but was not found on PATH.' }
if (-not (Test-CommandExists 'npm')) { throw 'npm is required but was not found on PATH.' }

$pythonCmd = if (Test-CommandExists 'py') { 'py' }
             elseif (Test-CommandExists 'python') { 'python' }
             else { throw 'Python is required but was not found on PATH.' }

$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$mlDir = Join-Path $root 'ml-model'

if (-not (Test-Path (Join-Path $backendDir 'package.json'))) { throw 'backend/package.json not found.' }
if (-not (Test-Path (Join-Path $frontendDir 'package.json'))) { throw 'frontend/package.json not found.' }
if (-not (Test-Path (Join-Path $mlDir 'app.py'))) { throw 'ml-model/app.py not found.' }

if (-not (Test-Path (Join-Path $backendDir 'node_modules'))) {
  Write-Warning '[DEV] backend/node_modules is missing. Run npm install in backend before starting.'
}
if (-not (Test-Path (Join-Path $frontendDir 'node_modules'))) {
  Write-Warning '[DEV] frontend/node_modules is missing. Run npm install in frontend before starting.'
}

if (Test-Path $stateFile) {
  try {
    $existing = Get-Content $stateFile -Raw | ConvertFrom-Json
    if ($existing.processes) {
      Write-Host '[DEV] Stopping any existing launcher processes first...' -ForegroundColor Yellow
      & (Join-Path $root 'stop-dev.ps1') | Out-Null
    }
  }
  catch {
    Write-Warning '[DEV] Existing state file could not be read; continuing.'
  }
}

$processes = @()

$backendProcess = Start-Process -FilePath 'powershell' -ArgumentList @('-NoExit', '-Command', "Set-Location '$backendDir'; npm run dev") -PassThru -WorkingDirectory $backendDir -WindowStyle Normal
$processes += [pscustomobject]@{ Name = 'backend'; Id = $backendProcess.Id; WorkingDir = $backendDir; Command = 'npm run dev' }

$frontendProcess = Start-Process -FilePath 'powershell' -ArgumentList @('-NoExit', '-Command', "Set-Location '$frontendDir'; npm run dev") -PassThru -WorkingDirectory $frontendDir -WindowStyle Normal
$processes += [pscustomobject]@{ Name = 'frontend'; Id = $frontendProcess.Id; WorkingDir = $frontendDir; Command = 'npm run dev' }

$mlCommand = if ($pythonCmd -eq 'py') { "py app.py" } else { "python app.py" }
$mlProcess = Start-Process -FilePath 'powershell' -ArgumentList @('-NoExit', '-Command', "Set-Location '$mlDir'; $mlCommand") -PassThru -WorkingDirectory $mlDir -WindowStyle Normal
$processes += [pscustomobject]@{ Name = 'ml-model'; Id = $mlProcess.Id; WorkingDir = $mlDir; Command = $mlCommand }

$state = [pscustomobject]@{ createdAt = (Get-Date).ToUniversalTime().ToString('o'); processes = $processes }
$state | ConvertTo-Json -Depth 5 | Set-Content $stateFile -Encoding utf8

Write-Host "" 
Write-Host "[DEV] Started all services in separate PowerShell windows." -ForegroundColor Green
Write-Host "  - Backend  : $backendDir" -ForegroundColor Blue
Write-Host "  - Frontend : $frontendDir" -ForegroundColor Green
Write-Host "  - ML model : $mlDir" -ForegroundColor Magenta
Write-Host "" 
Write-Host "[DEV] Logs are visible in their own PowerShell windows." -ForegroundColor Yellow
Write-Host "[DEV] Stop with: npm run dev:stop" -ForegroundColor Yellow
