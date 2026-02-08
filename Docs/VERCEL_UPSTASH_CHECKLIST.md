# Checklist Upstash + Vercel (Kittypau)

Objetivo: asegurar rate limit distribuido en producción.

## 1. Crear Redis (Upstash)
- Crear DB en Upstash (REST API habilitada).
- Copiar `UPSTASH_REDIS_REST_URL`.
- Copiar `UPSTASH_REDIS_REST_TOKEN`.

## 2. Configurar en Vercel
- Ir a `Project Settings -> Environment Variables`.
- Agregar:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Aplicar en `Production` + `Preview` (según necesidad).

## 3. Validar en runtime
- Verificar que `/api/mqtt/webhook` responde 429 tras >60 req/min.
- Verificar que una segunda instancia replica el límite (rate limit distribuido).
- Revisar logs: debe aparecer `request_id` en errores.

## 4. Validar fallback
- Quitar temporalmente `UPSTASH_REDIS_REST_URL` en Preview.
- Confirmar que rate limit sigue funcionando (fallback local).

## 5. Seguridad
- Nunca exponer `UPSTASH_REDIS_REST_TOKEN` en frontend.
- Mantener secretos solo en Vercel (server-side).

