# Validacion Admin Dashboard (CLI)

Fecha de validacion: 2026-02-12

## 1) Verificacion en Vercel CLI
Comando:
```bash
vercel inspect kittypau-app.vercel.app
```
Resultado validado:
- Deployment en `status: Ready`.
- Alias activo: `https://kittypau-app.vercel.app`.
- Rutas detectadas en build:
  - `GET /api/admin/overview`
  - `/admin`

Comando:
```bash
vercel env ls
```
Resultado validado (proyecto `kittypau-app`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `BRIDGE_HEARTBEAT_SECRET`
- `CRON_SECRET`

## 2) Verificacion en Supabase CLI
Comando:
```bash
npx supabase migration list --linked
```
Resultado validado:
- Migracion admin aplicada en remoto:
  - `20260212080000_admin_roles_and_dashboard`

## 3) Verificacion funcional de ingreso admin
Prueba realizada por CLI:
1. Login con `javomauro.contacto@gmail.com`.
2. Obtener `access_token`.
3. Llamar `GET https://kittypau-app.vercel.app/api/admin/overview` con `Authorization: Bearer <token>`.

Resultado validado:
- `admin_role = owner_admin`
- `summary` presente
- `audit_events` con datos
- Sin token, mismo endpoint responde `401` (bloqueo correcto).

## 4) Verificacion web del dashboard
Comando:
```bash
Invoke-WebRequest -Method Get -Uri "https://kittypau-app.vercel.app/admin"
```
Resultado:
- `HTTP 200` (ruta disponible).

## 5) Criterios de aceptacion cubiertos
1. Usuario admin autentica y obtiene vista admin (`/admin`).
2. Endpoint admin exige autenticacion y rol.
3. Dashboard admin expone:
- KPCL online/offline
- estado de bridges
- tabla de dispositivos offline
- `audit_events` en linea (auto refresh)

## 6) Nota operativa
- Si se cambia contraseña o rol del admin en Supabase, revalidar esta guía.
- Si el entorno Vercel cambia de proyecto enlazado, volver a ejecutar `vercel link --yes --project kittypau-app`.

## 7) Nota (CORS / "Failed to fetch")
- Los endpoints bajo `/api/*` soportan preflight `OPTIONS` y retornan headers CORS.
- Esto permite validar el dashboard/admin desde herramientas externas o desde otros orÃ­genes (p.ej. pruebas locales),
  siempre usando `Authorization: Bearer <token>` o `x-bridge-token` segÃºn corresponda.
