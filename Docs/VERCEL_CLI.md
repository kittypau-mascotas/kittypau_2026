# Vercel CLI (Kittypau)

## Objetivo
Administrar deployments, vincular el repo y revisar logs del proyecto.

## Instalacion
Recomendado usar `npx` (sin instalacion global):
```powershell
npx vercel --version
```

## Login
```powershell
npx vercel login
```

## Link del proyecto
```powershell
npx vercel link --yes
```
Nota: puede sobrescribir `.env.local` local con variables del proyecto.

## Listar deployments
```powershell
npx vercel ls
```

## Ver logs
```powershell
npx vercel logs
```

## Probar webhook (desde local)
```powershell
$env:WEBHOOK_TOKEN="<MQTT_WEBHOOK_SECRET>"
Invoke-RestMethod -Method Post `
  -Uri "https://kittypau-app.vercel.app/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$env:WEBHOOK_TOKEN; "Content-Type"="application/json"} `
  -Body "{`"device_id`":`"KPCL0001`",`"temperature`":23.5,`"humidity`":65,`"weight_grams`":3500,`"battery_level`":85,`"flow_rate`":120}"
```

## Variables de entorno
```powershell
npx vercel env ls
```

## Buenas practicas
- No subir `.env.local` con secretos al repo.
- Validar que el proyecto vinculado sea el correcto antes de deploy.


