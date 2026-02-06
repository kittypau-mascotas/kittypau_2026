# Mapa de Ecosistema (Onboarding Rapido)

## 1) Arquitectura (que corre y donde)
- Next.js (Frontend + API) en Vercel.
- Supabase (DB + Auth + Realtime).
- HiveMQ Cloud (MQTT).
- Raspberry Pi Zero 2 W (Bridge MQTT -> API).

Docs clave:
- `Docs/ARQUITECTURA_PROYECTO.md`
- `Docs/ARQUITECTURA_COMPLETA.md`
- `Docs/DIAGRAMA_ARQUITECTURA_ACTUAL.md`

---

## 2) Base de datos y seguridad
- Esquema oficial: `Docs/SQL_SCHEMA.sql`
- RLS activo en todas las tablas.
- `devices.pet_id` obligatorio.
- Trigger: `update_device_from_reading` actualiza `last_seen`.

Docs clave:
- `Docs/GUIA_SQL_SUPABASE.md`
- `Docs/GUIA_MIGRACION_SQL.md`
- `Docs/ENUMS_OFICIALES.md`

---

## 3) APIs y contratos
Endpoints MVP:
- `POST /api/mqtt/webhook`
- `GET/POST /api/pets`
- `GET/POST /api/devices`
- `GET /api/readings?device_id=<UUID>`

Docs clave:
- `Docs/FRONT_BACK_APIS.md`
- `Docs/CONTRATOS_POR_VISTA.md`

---

## 4) IoT + Bridge
- Dispositivo publica a HiveMQ.
- Bridge en Raspberry reenvia a Vercel.

Docs clave:
- `Docs/RASPBERRY_BRIDGE.md`
- `Docs/REGLAS_INTERPRETACION_IOT.md`

---

## 5) Frontend + Design System
- Tokens + UI base en `Docs/estilos y diseños.md`
- Login parallax: `Docs/IMAGENES_LOGIN.md`

---

## 6) Pruebas y deploy
- Pruebas E2E: `Docs/PRUEBAS_E2E.md`
- Checklist deploy: `Docs/CHECKLIST_DEPLOY.md`

---

## 7) Ruta corta para un dev nuevo
1. Leer `Docs/MAPA_ECOSISTEMA.md`
2. Leer `Docs/ARQUITECTURA_PROYECTO.md`
3. Ejecutar `Docs/SQL_SCHEMA.sql`
4. Probar endpoints con `Docs/PRUEBAS_E2E.md`


## 8) Primer dia del dev (script rapido)
1. Clonar repo y abrir kittypau_2026_hivemq.
2. Configurar .env.local con variables de Vercel (solo frontend).
3. Verificar Docs/CHECKLIST_DEPLOY.md (envs + schema cache).
4. Generar ccess_token en Supabase Auth.
5. Ejecutar pruebas minimas en Docs/PRUEBAS_E2E.md (API directa).

