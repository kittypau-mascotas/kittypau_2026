$ErrorActionPreference = "Stop"

function Get-EnvOrThrow($name) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if (-not $value) { throw "Missing required env var: $name" }
  return $value
}

$baseUrl = $env:BASE_URL
if (-not $baseUrl) { $baseUrl = "https://kittypau-app.vercel.app" }

$token = Get-EnvOrThrow "ACCESS_TOKEN"
$deviceId = Get-EnvOrThrow "DEVICE_ID_UUID"

Write-Host "READINGS CONTRACT TESTS"
Write-Host "Base URL: $baseUrl"
Write-Host "Device UUID: $deviceId"

# 1) Falta parametro device_id/device_uuid -> 400
try {
  Invoke-RestMethod -Method Get `
    -Uri "$baseUrl/api/readings" `
    -Headers @{ Authorization = "Bearer $token" } | Out-Null
  throw "Expected missing device_id to fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
  Write-Host "OK: missing device_id -> 400"
}

# 2) from invalido -> 400
try {
  Invoke-RestMethod -Method Get `
    -Uri "$baseUrl/api/readings?device_id=$deviceId&from=not-a-date" `
    -Headers @{ Authorization = "Bearer $token" } | Out-Null
  throw "Expected invalid from to fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
  Write-Host "OK: invalid from -> 400"
}

# 3) rango invalido from > to -> 400
try {
  Invoke-RestMethod -Method Get `
    -Uri "$baseUrl/api/readings?device_id=$deviceId&from=2026-03-10T00:00:00Z&to=2026-03-01T00:00:00Z" `
    -Headers @{ Authorization = "Bearer $token" } | Out-Null
  throw "Expected invalid range to fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
  Write-Host "OK: invalid range -> 400"
}

# 4) consulta valida con device_id -> 200
$resDeviceId = Invoke-RestMethod -Method Get `
  -Uri "$baseUrl/api/readings?device_id=$deviceId&limit=10" `
  -Headers @{ Authorization = "Bearer $token" }

if (-not $resDeviceId) {
  throw "Expected payload for device_id query"
}
Write-Host "OK: valid device_id query -> 200"

# 5) consulta valida con alias device_uuid -> 200
$resDeviceUuid = Invoke-RestMethod -Method Get `
  -Uri "$baseUrl/api/readings?device_uuid=$deviceId&limit=10" `
  -Headers @{ Authorization = "Bearer $token" }

if (-not $resDeviceUuid) {
  throw "Expected payload for device_uuid alias query"
}
Write-Host "OK: valid device_uuid alias query -> 200"

Write-Host "READINGS CONTRACT TESTS DONE"
