# Arquitectura Completa Kittypau (Actual)

## Objetivo
Arquitectura real del MVP con Next.js + Supabase + HiveMQ + Raspberry Bridge.

---

## Componentes principales
1. **Frontend + API**: Next.js (App Router) en Vercel.
2. **DB/Auth/Realtime**: Supabase.
3. **MQTT**: HiveMQ Cloud.
4. **Bridge 24/7**: Raspberry Pi Zero 2 W (MQTT -> API).

---

## Flujo de datos (telemetría)
1. ESP32 publica MQTT en HiveMQ.
2. Bridge en Raspberry escucha `+/SENSORS` (ver `Docs/TOPICOS_MQTT.md`).
3. Bridge reenvia a `POST /api/mqtt/webhook`.
4. API valida `x-webhook-token`, busca `device_code` y guarda lectura.
5. Supabase Realtime notifica a la app.

---

## Diagrama alto nivel
```
ESP32 -> HiveMQ -> Raspberry Bridge -> /api/mqtt/webhook -> Supabase (DB)
                                                             \
                                                              -> Realtime -> App Web
```

---

## Endpoints MVP
1. `POST /api/mqtt/webhook`
2. `GET/POST /api/pets`
3. `GET/POST /api/devices`
4. `GET /api/readings?device_id=<UUID>`

Notas:
- `device_code` (KPCLxxxx) no es `device_id` (UUID).
- `devices.pet_id` es obligatorio.

---

## Seguridad
- Webhook protegido con `x-webhook-token`.
- RLS activo en Supabase para datos por usuario.
- `SUPABASE_SERVICE_ROLE_KEY` solo en backend.

---

## Repositorio
```
/Docs
/kittypau_app
  /src
    /app
    /lib
    /components
  /scripts
  /public
/bridge
```

---

## Fuentes de verdad
- Arquitectura y endpoints: `Docs/ARQUITECTURA_PROYECTO.md`, `Docs/FRONT_BACK_APIS.md`
- Esquema DB: `Docs/SQL_SCHEMA.sql`
- Pruebas: `Docs/PRUEBAS_E2E.md`
- Bridge: `Docs/RASPBERRY_BRIDGE.md`
