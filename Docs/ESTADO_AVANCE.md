# Estado del Proyecto y Proximos Pasos (2026-02-03)

## Resumen de avance
- Proyecto Next.js creado en `kittypau_app/` (TypeScript + App Router).
- Endpoint webhook listo: `src/app/api/mqtt/webhook/route.ts`.
- Cliente Supabase server listo: `src/lib/supabase/server.ts`.
- `.env.local` creado en `kittypau_app/`.
- Script de prueba: `scripts/test-webhook.ps1`.
- Prueba local del webhook exitosa (respuesta `success: true`).
- SQL base generado en `Docs/SQL_SCHEMA.sql`.

## Lo que ya funciona
1. Webhook recibe datos y guarda en Supabase (local).
2. Dispositivo creado con `device_code` (ej: `KPCL0001`).

## Pendiente inmediato
1. Confirmar data en tabla `readings`.
2. Crear UI base (login, mascotas, dispositivos, dashboard).
3. Implementar CRUD de mascotas y dispositivos.
4. Activar Realtime en dashboard.
5. Definir y construir pop-up de registro con progreso (Usuario -> Mascota -> Dispositivo).

## Pendiente de infraestructura
1. Deploy en Vercel.
2. Configurar variables en Vercel.
3. Configurar webhook en HiveMQ con URL publica.
4. Probar end-to-end en produccion.

## Implementado hoy
- API Routes para CRUD:
  - `GET/POST /api/pets`
  - `GET/POST /api/devices`
  - `GET /api/readings?device_id=...`
- Autenticacion por `Authorization: Bearer <access_token>`.

## Riesgos conocidos
- `ARQUITECTURA_COMPLETA.md` tiene texto con codificacion antigua (mojibake). No afecta el MVP, pero conviene normalizarlo luego.
