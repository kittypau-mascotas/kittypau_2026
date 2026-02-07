# Test onboarding backend (profiles -> pets -> devices)
# Requiere variables en entorno:
# SUPABASE_ANON_KEY, MQTT_WEBHOOK_SECRET, KITTYPAU_PASSWORD, PET_NAME, PET_TYPE

$supabaseUrl = "https://zgwqtzazvkjkfocxnxsh.supabase.co"
$anonKey = $env:SUPABASE_ANON_KEY
$apiBase = "https://kittypau-app.vercel.app"

$emailB = "kittypau.mascotas@gmail.com"
$passwordB = $env:KITTYPAU_PASSWORD
$petName = $env:PET_NAME
$petType = $env:PET_TYPE
$deviceCode = "KPCL" + (Get-Date -Format "mmss")

if (-not $anonKey) { throw "Falta SUPABASE_ANON_KEY en entorno." }
if (-not $passwordB) { throw "Falta KITTYPAU_PASSWORD en entorno." }
if (-not $petName) { throw "Falta PET_NAME en entorno." }
if (-not $petType) { throw "Falta PET_TYPE en entorno." }

# 1) Auth
$tokenB = (Invoke-RestMethod -Method Post `
  -Uri "$supabaseUrl/auth/v1/token?grant_type=password" `
  -Headers @{ apikey=$anonKey; "Content-Type"="application/json" } `
  -Body "{`"email`":`"$emailB`",`"password`":`"$passwordB`"}"
).access_token

Write-Host "Auth OK"

# 2) profiles (user onboarding step)
$profile = Invoke-RestMethod -Method Put `
  -Uri "$apiBase/api/profiles" `
  -Headers @{Authorization="Bearer $tokenB"; "Content-Type"="application/json"} `
  -Body "{`"user_name`":`"Kitty Tester`",`"city`":`"Santiago`",`"country`":`"CL`",`"user_onboarding_step`":`"pet_profile`"}"

Write-Host "PUT /api/profiles OK -> $($profile.id)"

# 3) pets (create)
$pet = Invoke-RestMethod -Method Post `
  -Uri "$apiBase/api/pets" `
  -Headers @{Authorization="Bearer $tokenB"; "Content-Type"="application/json"} `
  -Body "{`"name`":`"$petName`",`"type`":`"$petType`",`"origin`":`"rescatado`",`"pet_onboarding_step`":`"pet_profile`"}"

Write-Host "POST /api/pets OK -> $($pet.id)"

# 4) devices (link)
$device = Invoke-RestMethod -Method Post `
  -Uri "$apiBase/api/devices" `
  -Headers @{Authorization="Bearer $tokenB"; "Content-Type"="application/json"} `
  -Body "{`"device_code`":`"$deviceCode`",`"device_type`":`"food_bowl`",`"status`":`"active`",`"pet_id`":`"$($pet.id)`"}"

Write-Host "POST /api/devices OK -> $($device.id) ($deviceCode)"

# 5) Verify pet state
$pets = Invoke-RestMethod -Method Get `
  -Uri "$apiBase/api/pets" `
  -Headers @{Authorization="Bearer $tokenB"}

$linked = $pets | Where-Object { $_.id -eq $pet.id }
Write-Host "pet_state -> $($linked.pet_state)"
