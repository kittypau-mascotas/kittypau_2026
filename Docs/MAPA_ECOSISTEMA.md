# Mapa de Ecosistema (Onboarding Rapido)

Fuente de verdad del ecosistema:
- `Docs/FUENTE_DE_VERDAD.md`

## 1) Arquitectura activa
- Next.js (Frontend + API) en Vercel.
- Supabase (DB + Auth + Realtime).
- HiveMQ Cloud (MQTT).
- Raspberry Pi Zero 2 W (Bridge MQTT -> API).

## 2) Base de datos y seguridad
- Esquema oficial: `Docs/SQL_SCHEMA.sql`
- RLS activo en las tablas principales.
- `devices.pet_id` obligatorio.
- Trigger: `update_device_from_reading` actualiza `last_seen`.

## 3) APIs y contratos
Endpoints MVP:
- `POST /api/mqtt/webhook`
- `GET/POST /api/pets`
- `GET/POST /api/devices`
- `GET /api/readings?device_uuid=<UUID>`

## 4) IoT + Bridge
- Dispositivo publica a HiveMQ.
- Bridge en Raspberry reenvia a Vercel.

## 5) Frontend + Design System
- Tokens y UI base: `Docs/estilos y disenios.md`
- Login parallax: `Docs/IMAGENES_LOGIN.md`

## 6) Pruebas y deploy
- Pruebas E2E: `Docs/PRUEBAS_E2E.md`
- Checklist deploy: `Docs/CHECKLIST_DEPLOY.md`

## 7) Ruta corta para un dev nuevo
1. Leer `Docs/FUENTE_DE_VERDAD.md`
2. Leer `Docs/ARQUITECTURA_PROYECTO.md`
3. Ejecutar `Docs/SQL_SCHEMA.sql`
4. Probar endpoints con `Docs/PRUEBAS_E2E.md`


