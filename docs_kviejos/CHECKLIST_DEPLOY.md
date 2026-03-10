# Checklist Deploy — KViejos (Fase 2)

## Objetivo
Mantener despliegues repetibles para web + APIs + APK.

## Web/Backend (Vercel)
- Variables env (Supabase URL/keys)
- Deploy automatico por `main`
- Verificar health endpoints

## DB (Supabase)
- Migraciones versionadas
- Idempotencia: `add column if not exists`, `create index if not exists`
- Asserts basicos post-deploy

## APK (Capacitor)
- `npx cap sync android`
- Build debug/release
- Probar permisos (notificaciones, red)

