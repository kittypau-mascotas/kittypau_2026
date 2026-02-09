# Integración Bridge Raspberry ↔ Kittypau (Vercel/Supabase/HiveMQ)

## Objetivo
Conectar el bridge que corre en la PC/Raspberry con el backend de Kittypau (Vercel + Supabase) y HiveMQ, usando credenciales seguras y estructura SQL compatible.

---

## Flujo E2E
ESP32 → HiveMQ → Bridge (Raspberry/PC) → `POST /api/mqtt/webhook` (Vercel) → Supabase.

---

## Variables que el bridge necesita
Debe recibir **solo** lo necesario para publicar y reenviar lecturas.

**MQTT (HiveMQ)**
- `MQTT_HOST`
- `MQTT_PORT`
- `MQTT_USER`
- `MQTT_PASS`
- `MQTT_TOPIC` (ej: `+/SENSORS`)
- `MQTT_TLS` (true/false)

**Webhook (Vercel)**
- `WEBHOOK_URL` (ej: `https://kittypau-app.vercel.app/api/mqtt/webhook`)
- `WEBHOOK_TOKEN` (igual a `MQTT_WEBHOOK_SECRET`)

**Supabase (solo si el bridge escribe directo)**
- No recomendado: usar Service Role en el bridge expone la DB.
- Preferido: todo por `WEBHOOK_URL`.

---

## Compatibilidad SQL (pendiente)
Se recibió un fragmento de SQL V3 con:
- `devices.notes`
- `devices.ip_history`
- `devices.retired_at`
- vista `device_summary`

Problemas detectados:
1. En Kittypau usamos `devices.device_id` (KPCL) y `devices.id` (UUID).
2. El SQL menciona columnas inexistentes: `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`.
3. Menciona la vista `latest_readings`, no definida en este repo.

**Acción requerida**  
Necesitamos el SQL completo del bridge (tablas + vistas + triggers) para integrar.

---

## Plan de integración SQL (propuesto)
1. Mapear `device_id` (KPCL) y soportar `device_uuid` (UUID) cuando aplique.
2. Agregar columnas extra si son necesarias:
   - `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
3. Crear vista `latest_readings` si el bridge la usa.
4. Crear/ajustar vista `device_summary` con nombres compatibles.

---

## Manejo de errores (bridge)
Recomendado:
- Reintentos exponenciales si falla el webhook (5xx/timeout).
- Backoff si 429 (rate limit).
- Log local rotativo.
- Healthcheck cada 60s a `/api/bridge/heartbeat`.

---

## Verificación
1. MQTT CLI publica sample a `+/SENSORS`.
2. Bridge reenvía a webhook.
3. `GET /api/readings` devuelve lectura nueva.
4. `devices.last_seen` actualizado.

---

## Pendientes
- SQL completo del bridge (4 tablas adicionales y vistas).
- Decidir si el bridge persiste localmente o solo forward a webhook.
- Definir si `device_summary` vive en Supabase o en el bridge.
