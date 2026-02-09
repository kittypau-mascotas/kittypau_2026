$ErrorActionPreference = "Stop"

function Get-EnvOrThrow($name) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if (-not $value) { throw "Missing required env var: $name" }
  return $value
}

$baseUrl = $env:BASE_URL
if (-not $baseUrl) { $baseUrl = "https://kittypau-app.vercel.app" }

$token = $env:ACCESS_TOKEN
if (-not $token) { throw "Missing ACCESS_TOKEN. Load Docs/.env.test.local first." }

$webhook = Get-EnvOrThrow "MQTT_WEBHOOK_SECRET"

Write-Host "NEGATIVE TESTS (DB/API)"
Write-Host "Base URL: $baseUrl"

# 1) Webhook sin device -> 400
try {
  Invoke-RestMethod -Method Post `
    -Uri "$baseUrl/api/mqtt/webhook" `
    -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json" } `
    -Body "{`"temperature`":23.5}" | Out-Null
  throw "Expected webhook missing device to fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
  Write-Host "OK: webhook missing device -> 400"
}

# 2) Webhook con device inexistente -> 404
try {
  Invoke-RestMethod -Method Post `
    -Uri "$baseUrl/api/mqtt/webhook" `
    -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json" } `
    -Body "{`"device_id`":`"KPCL9999`",`"temperature`":23.5}" | Out-Null
  throw "Expected webhook invalid device to fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw $_ }
  Write-Host "OK: webhook unknown device -> 404"
}

# 3) PATCH /api/devices/:id con status invalido -> 400
try {
  Invoke-RestMethod -Method Patch `
    -Uri "$baseUrl/api/devices/00000000-0000-0000-0000-000000000000" `
    -Headers @{ Authorization="Bearer $token"; "Content-Type"="application/json" } `
    -Body "{`"status`":`"bad_status`"}" | Out-Null
  throw "Expected invalid status to fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
  Write-Host "OK: invalid status -> 400"
}

# 4) GET /api/readings con device ajeno -> 403/404
try {
  Invoke-RestMethod -Method Get `
    -Uri "$baseUrl/api/readings?device_uuid=00000000-0000-0000-0000-000000000000" `
    -Headers @{ Authorization="Bearer $token" } | Out-Null
  Write-Host "WARN: readings for unknown device did not fail (check response)"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 403 -or $code -eq 404) {
    Write-Host "OK: readings unknown device -> $code"
  } else {
    throw $_
  }
}

Write-Host "NEGATIVE TESTS DONE"

