# Test inmediato DB/API (Auth -> Pets -> Device -> Webhook -> Readings)
# Requiere: PowerShell 5+ y variables debajo definidas.

# === Configuracion ===
$supabaseUrl = "https://zgwqtzazvkjkfocxnxsh.supabase.co"
$anonKey = $env:SUPABASE_ANON_KEY
$apiBase = "https://kittypau-app.vercel.app"
$webhook = $env:MQTT_WEBHOOK_SECRET

# Usuario B (para pruebas)
$emailB = "kittypau.mascotas@gmail.com"
$passwordB = $env:KITTYPAU_PASSWORD

# Pet y device
$petIdB = $env:PET_ID
$device_id = "KPCL" + (Get-Random -Minimum 1000 -Maximum 9999)

if (-not $anonKey) { throw "Falta SUPABASE_ANON_KEY en entorno." }
if (-not $webhook) { throw "Falta MQTT_WEBHOOK_SECRET en entorno." }
if (-not $passwordB) { throw "Falta KITTYPAU_PASSWORD en entorno." }
if (-not $petIdB) { throw "Falta PET_ID en entorno." }

# === Auth ===
$tokenB = (Invoke-RestMethod -Method Post `
  -Uri "$supabaseUrl/auth/v1/token?grant_type=password" `
  -Headers @{ apikey=$anonKey; "Content-Type"="application/json" } `
  -Body "{`"email`":`"$emailB`",`"password`":`"$passwordB`"}"
).access_token

Write-Host "Token B OK"

# === Pets ===
Invoke-RestMethod -Method Get `
  -Uri "$apiBase/api/pets" `
  -Headers @{Authorization="Bearer $tokenB"} | Out-Null

Write-Host "GET /api/pets OK"

# === Device ===
try {
  $device = Invoke-RestMethod -Method Post `
    -Uri "$apiBase/api/devices" `
    -Headers @{Authorization="Bearer $tokenB"; "Content-Type"="application/json"} `
    -Body "{`"device_id`":`"$device_id`",`"device_type`":`"food_bowl`",`"status`":`"active`",`"pet_id`":`"$petIdB`"}"
} catch {
  # fallback: crear una mascota nueva y reintentar
  $newPet = Invoke-RestMethod -Method Post `
    -Uri "$apiBase/api/pets" `
    -Headers @{Authorization="Bearer $tokenB"; "Content-Type"="application/json"} `
    -Body "{`"name`":`"Mishu Test`",`"type`":`"cat`"}"

  $petIdB = $newPet.id
  $device = Invoke-RestMethod -Method Post `
    -Uri "$apiBase/api/devices" `
    -Headers @{Authorization="Bearer $tokenB"; "Content-Type"="application/json"} `
    -Body "{`"device_id`":`"$device_id`",`"device_type`":`"food_bowl`",`"status`":`"active`",`"pet_id`":`"$petIdB`"}"
}

Write-Host "POST /api/devices OK -> $($device.id) ($device_id)"

# === Webhook ===
Invoke-RestMethod -Method Post `
  -Uri "$apiBase/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json"} `
  -Body "{`"device_id`":`"$device_id`",`"temperature`":23.5,`"humidity`":65,`"weight_grams`":3500,`"battery_level`":85,`"flow_rate`":120}" | Out-Null

Write-Host "POST /api/mqtt/webhook OK"

# === Webhook clock drift (timestamp fuera de ±10 min) ===
$timestampDelaySeconds = 2
Start-Sleep -Seconds $timestampDelaySeconds
$oldTimestamp = (Get-Date).AddHours(-2).ToString("o")
Invoke-RestMethod -Method Post `
  -Uri "$apiBase/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json"} `
  -Body "{`"device_id`":`"$device_id`",`"temperature`":23.5,`"humidity`":65,`"weight_grams`":3500,`"battery_level`":85,`"flow_rate`":120,`"timestamp`":`"$oldTimestamp`"}" | Out-Null

Write-Host "POST /api/mqtt/webhook drift OK"

# === Readings ===
Invoke-RestMethod -Method Get `
  -Uri "$apiBase/api/readings?device_uuid=$($device.id)&limit=200" `
  -Headers @{Authorization="Bearer $tokenB"} | Out-Null

# === Verificar clock_invalid ===
$latestReadings = Invoke-RestMethod -Method Get `
  -Uri "$apiBase/api/readings?device_uuid=$($device.id)&limit=200" `
  -Headers @{Authorization="Bearer $tokenB"}

$clockInvalid = $false
$items = $null
if ($latestReadings -is [System.Collections.IEnumerable]) {
  $items = $latestReadings
} elseif ($latestReadings.data) {
  $items = $latestReadings.data
}

if ($items) {
  $clockInvalid = ($items | Where-Object {
      $_.clock_invalid -eq $true -or $_.clock_invalid -eq "true" -or $_.clock_invalid -eq 1
    } | Select-Object -First 1) -ne $null
}

Write-Host "GET /api/readings OK"
if ($clockInvalid) {
  Write-Host "clock_invalid OK"
} else {
  Write-Host "clock_invalid no encontrado (toma mas lecturas o valida en DB)"
  if ($items) {
    $items | Select-Object -First 3 id, recorded_at, ingested_at, clock_invalid | Format-Table | Out-String | Write-Host
  }
}




