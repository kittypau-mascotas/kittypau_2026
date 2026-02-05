$ErrorActionPreference = "Stop"

if (-not $env:MQTT_WEBHOOK_SECRET) {
  Write-Host "Falta MQTT_WEBHOOK_SECRET en el entorno." -ForegroundColor Red
  exit 1
}

$body = @{
  deviceId      = "KPCL0001"
  temperature   = 23.5
  humidity      = 65
  weight_grams  = 3500
  battery_level = 85
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/mqtt/webhook" `
  -Method Post `
  -Headers @{ "x-webhook-token" = $env:MQTT_WEBHOOK_SECRET } `
  -ContentType "application/json" `
  -Body $body
