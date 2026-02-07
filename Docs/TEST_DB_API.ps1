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
$deviceCode = "KPCL" + (Get-Date -Format "mmss")

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
    -Body "{`"device_code`":`"$deviceCode`",`"device_type`":`"food_bowl`",`"status`":`"active`",`"pet_id`":`"$petIdB`"}"
} catch {
  throw "POST /api/devices fallo. Revisa pet_id o duplicado device_code."
}

Write-Host "POST /api/devices OK -> $($device.id) ($deviceCode)"

# === Webhook ===
Invoke-RestMethod -Method Post `
  -Uri "$apiBase/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json"} `
  -Body "{`"deviceCode`":`"$deviceCode`",`"temperature`":23.5,`"humidity`":65,`"weight_grams`":3500,`"battery_level`":85,`"flow_rate`":120}" | Out-Null

Write-Host "POST /api/mqtt/webhook OK"

# === Readings ===
Invoke-RestMethod -Method Get `
  -Uri "$apiBase/api/readings?device_id=$($device.id)" `
  -Headers @{Authorization="Bearer $tokenB"} | Out-Null

Write-Host "GET /api/readings OK"
