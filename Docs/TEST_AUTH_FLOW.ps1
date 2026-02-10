param(
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$AnonKey = $env:SUPABASE_ANON_KEY,
  [string]$Email
)

if (-not $SupabaseUrl -or -not $AnonKey -or -not $Email) {
  Write-Host "Uso: .\\Docs\\TEST_AUTH_FLOW.ps1 -Email usuario@dominio.com" -ForegroundColor Yellow
  exit 1
}

$payload = "{`"email`":`"$Email`"}"
try {
  $res = Invoke-RestMethod -Method Post `
    -Uri "$SupabaseUrl/auth/v1/recover" `
    -Headers @{ apikey=$AnonKey; "Content-Type"="application/json" } `
    -Body $payload
  Write-Host "Reset solicitado. Revisa el correo y valida que abra /reset" -ForegroundColor Green
} catch {
  Write-Host "Error solicitando reset: $($_.Exception.Message)" -ForegroundColor Red
}
