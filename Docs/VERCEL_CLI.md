# Vercel CLI (Kittypau)

## Objetivo
Operar el proyecto en Vercel desde terminal:
- login y link del proyecto,
- deploy preview y production,
- inspeccion de logs,
- gestion de variables.

## Prerrequisitos
- Node.js y npm instalados.
- Acceso al team/proyecto en Vercel.

## 1) Verificar CLI
Usar por `npx`:
```powershell
npx vercel --version
```

## 2) Login
```powershell
npx vercel login
```

## 3) Link del proyecto
Desde la raiz del repo:
```powershell
npx vercel link --yes
```

Validar:
```powershell
npx vercel whoami
npx vercel project ls
```

Nota:
- `vercel link` puede modificar archivos locales.
- Revisar `git status` despues del link.

## 4) Deploy

### 4.1 Preview
```powershell
npx vercel
```

### 4.2 Production
```powershell
npx vercel --prod
```

## 5) Logs
Deployments:
```powershell
npx vercel ls
```

Logs recientes:
```powershell
npx vercel logs --since 30m
```

Logs de deployment:
```powershell
npx vercel logs <deployment-url-o-id>
```

## 6) Variables de entorno
Listar:
```powershell
npx vercel env ls
```

Agregar:
```powershell
npx vercel env add <NOMBRE> <environment>
```
`environment`: `development`, `preview`, `production`.

Descargar envs:
```powershell
npx vercel env pull .env.local
```

Importante:
- Si cambian envs, redeploy obligatorio.
- No commitear `.env.local`.

## 7) Prueba rápida webhook
```powershell
$env:WEBHOOK_TOKEN="<MQTT_WEBHOOK_SECRET>"
Invoke-RestMethod -Method Post `
  -Uri "https://kittypau-app.vercel.app/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$env:WEBHOOK_TOKEN; "Content-Type"="application/json"} `
  -Body "{`"device_id`":`"KPCL0001`",`"temperature`":23.5,`"humidity`":65,`"weight_grams`":3500,`"battery_level`":85,`"flow_rate`":120}"
```

## 8) Problemas comunes
- `401/403`: permisos o token de cuenta.
- Proyecto equivocado: relink con `npx vercel link --yes`.
- Cambio no visible: revisar entorno (`preview` vs `production`).

## 9) Flujo recomendado GitHub main + Vercel (2026-03-06)
Desde la raiz del repo:
```powershell
git checkout main
git pull origin main
git add -A
git commit -m "docs: update android apk and deployment status"
git push origin main
npx vercel --prod
```
Verificacion posterior:
```powershell
npx vercel ls
npx vercel logs --since 15m
```
