# Pipeline CI/CD (Kittypau)

## Objetivo
Documentar el flujo completo de despliegue y validación del proyecto.

## 1. Repositorio
- Repositorio principal en GitHub: `kittypau_2026`.
- Rama principal: `main`.

## 2. Supabase (DB/Auth)
- Migraciones via Supabase CLI (`supabase/migrations`).
- Flujo recomendado:
  1. `npx supabase login`
  2. `npx supabase link --project-ref <PROJECT_REF>`
  3. `npx supabase db push`
- Validaciones post‑migración: `Docs/TEST_DB_API.ps1`, `Docs/TEST_ONBOARDING_BACKEND.ps1`.

## 3. Vercel (Frontend + API)
- Deploy automático desde GitHub (main).
- Variables críticas:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MQTT_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Redeploy obligatorio si cambian envs.

## 4. Rate limit distribuido
- Upstash Redis en producción.
- Validación: prueba 429 en `/api/mqtt/webhook`.
- Checklist: `Docs/VERCEL_UPSTASH_CHECKLIST.md`.

## 5. MQTT / Raspberry Bridge
- Dispositivos → HiveMQ → Bridge (Raspberry) → `/api/mqtt/webhook`.
- Topics: `+/SENSORS` (ver `Docs/TOPICOS_MQTT.md`).
- Guía: `Docs/RASPBERRY_BRIDGE.md`.

## 6. Pruebas mínimas antes de release
- `Docs/TEST_DB_API.ps1`
- `Docs/TEST_ONBOARDING_BACKEND.ps1`
- POST webhook + GET readings
- UI login + today feed con datos reales

## 7. Observabilidad
- Errores API incluyen `request_id`.
- Logs en Vercel para trazabilidad.

## 8. Riesgos conocidos
- Realtime aún no integrado en frontend.
- Refresh token no implementado en UI.

