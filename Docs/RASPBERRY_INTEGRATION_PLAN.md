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
- Heartbeat cada 60s a `/api/bridge/heartbeat`.
- Health check cada 5 min a `/api/bridge/health-check`.

---

## Verificación
1. MQTT CLI publica sample a `+/SENSORS`.
2. Bridge reenvía a webhook.
3. `GET /api/readings` devuelve lectura nueva.
4. `devices.last_seen` actualizado.

---

## Pendientes
- Decidir si `device_summary` vive en Supabase o en el bridge.

> **Nota (bridge v2.4):** El bridge activo (`bridge/src/index.js`) conecta directo a Supabase usando `@supabase/supabase-js` con service role key. Ya no usa webhook intermedio.

---

## Estrategia de Migración de Schema (compatibilidad Raspberry)

### Objetivo
Unificar el esquema de la Raspberry (bridge) con Kittypau sin borrar datos existentes.
Se permite **renombrar columnas** y **agregar columnas/vistas** para compatibilidad.
No se ejecuta nada hasta aprobar este plan.

### Diferencias detectadas (bridge vs Kittypau)
Bridge usa:
- `devices.device_id` (string KPCLxxxx)
- `device_summary` con columnas: `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
- vista `latest_readings`
- columnas nuevas: `notes`, `ip_history`, `retired_at`

Kittypau actual:
- `devices.device_id` (string KPCLxxxx, único)
- `devices.id` (UUID, PK)
- no tiene `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
- no tiene `latest_readings` ni `device_summary`

### Fase 1 (compatibilidad — sin perder datos)
1. **Agregar columnas** a `devices`:
   - `notes` TEXT
   - `ip_history` JSONB default '[]'
   - `retired_at` TIMESTAMPTZ
   - `wifi_status` TEXT
   - `wifi_ssid` TEXT
   - `wifi_ip` TEXT
   - `sensor_health` TEXT
2. **Crear vista `latest_readings`** en base a `sensor_readings` (por `device_id`).
3. **Crear vista `device_summary`** usando `device_id` (KPCL) como clave humana.
4. **Mantener `device_id`** como fuente de verdad para el bridge.

### Riesgos y mitigaciones
- **Riesgo**: romper UI/API si renombramos sin migración → Mitigación: fase 1 con aliases
- **Riesgo**: datos duplicados si bridge manda `device_id` distinto → Mitigación: normalizar formato KPCL
- **Riesgo**: vistas referencian columnas inexistentes → Mitigación: agregar columnas antes de crear vistas

### Checklist previo a ejecutar
1. Confirmar que bridge envía `device_id` (KPCL).
2. Confirmar si bridge puede enviar `device_uuid` (opcional).
3. Ejecutar migración en staging (Supabase).
4. Validar API `/api/devices` y `/api/readings`.
5. Validar bridge con MQTT CLI.


