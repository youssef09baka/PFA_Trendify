param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateFile = Join-Path $root '.dev-state.json'

if (-not (Test-Path $stateFile)) {
  Write-Host '[DEV] No launcher state found. Nothing to stop.' -ForegroundColor Yellow
  return
}

try {
  $state = Get-Content $stateFile -Raw | ConvertFrom-Json
}
catch {
  Write-Warning '[DEV] Could not read launcher state. Removing stale file.'
  Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
  return
}

if (-not $state.processes) {
  Write-Host '[DEV] No running processes found.' -ForegroundColor Yellow
  Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
  return
}

foreach ($entry in $state.processes) {
  try {
    if ($null -ne $entry.Id) {
      Stop-Process -Id $entry.Id -Force -ErrorAction SilentlyContinue
      Write-Host "[DEV] Stopped $($entry.Name) (PID $($entry.Id))" -ForegroundColor Red
    }
  }
  catch {
    Write-Warning "[DEV] Could not stop $($entry.Name) (PID $($entry.Id))."
  }
}

Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
Write-Host '[DEV] All launcher processes stopped.' -ForegroundColor Green
