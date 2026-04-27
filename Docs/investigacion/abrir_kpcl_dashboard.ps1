$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$serverScript = Join-Path $scriptDir 'serve_kpcl_dashboard.py'
$graphHtml = Join-Path $scriptDir 'kpcl_pruebas_eventos.html'
$pageUrl = "http://127.0.0.1:8765/?autoload=1&v=$(Get-Date -Format 'yyyyMMddHHmmssfff')"
$python = (Get-Command python.exe -ErrorAction Stop).Source
$refreshUrl = 'http://127.0.0.1:8765/refresh'

Set-Location $repoRoot

$ready = $false
try {
  $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 2
  if ($health.StatusCode -eq 200) {
    $ready = $true
  }
} catch {
  # El servidor no estaba listo aun.
}

if (-not $ready) {
  $owners = @(Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($owner in $owners) {
    if ($owner -and $owner -ne 0) {
      Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Seconds 1
  Start-Process -FilePath $python -ArgumentList $serverScript -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2

  for ($i = 0; $i -lt 120; $i++) {
    try {
      $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 2
      if ($health.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
}

if (-not $ready) {
  Write-Host "El dashboard no quedo listo a tiempo. Revisa el proceso y vuelve a intentar."
  exit 1
}

try {
  Invoke-WebRequest -UseBasicParsing -Uri $refreshUrl -Method Post -TimeoutSec 30 | Out-Null
} catch {
  # Si el refresh aun no responde, el HTML igual se abrira ya con el servidor listo.
}

Start-Process -FilePath $pageUrl
Write-Host "Grafico abierto en $pageUrl con el servidor listo en segundo plano"
