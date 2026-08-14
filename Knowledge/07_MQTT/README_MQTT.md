---
id: readme_mqtt
title: MQTT — HiveMQ + Bridge Raspberry
type: backend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-14
tags:
  - mqtt
  - hivemq
  - bridge
  - raspberry
  - iot
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[08_ESP32/README_ESP32]]
  - [[09_Sensores/README_Sensores]]
  - [[23_Decisiones/ADR_001_MQTT_vs_HTTP]]
---

# MQTT — HiveMQ + Bridge Raspberry

---

## Broker HiveMQ Cloud

| Campo | Valor |
|---|---|
| Host | `cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud` |
| Puerto | `8883` (MQTT sobre TLS) |
| Certificado | ISRG Root X1 (Let's Encrypt) — embebido en firmware |
| Usuario | `Kittypau1` |
| Contraseña | en `.env` del bridge — nunca en texto plano |

---

## Convención de tópicos

```
{DEVICE_ID}/SENSORS   ← Dispositivo → Broker  (cada 30 s)
{DEVICE_ID}/STATUS    ← Dispositivo → Broker  (cada 15 s)
{DEVICE_ID}/cmd       ← Broker → Dispositivo  (comandos)
{DEVICE_ID}/CAMERA    ← Solo ESP32-CAM
```

El bridge se suscribe con wildcard: `+/SENSORS`, `+/STATUS`

---

## Payload SENSORS

Frecuencia: configurable vía `SET_INTERVAL`. Default: 30 s.

```json
{
  "timestamp": "2026-02-08T16:06:28Z",
  "weight": 125.50,
  "temp": 24.30,
  "hum": 65.00,
  "light": { "lux": 12.5, "%": 7, "condition": "dim" }
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `timestamp` | string ISO 8601 | UTC, sincronizado por NTP |
| `weight` | float | Gramos. Deadband 2g (no publica si cambio < 2g) |
| `temp` | float / null | °C — `null` si falla AHT10/DHT11 |
| `hum` | float / null | % — `null` si falla sensor |
| `light.lux` | float | BH1750, rango 0–65535 |
| `light.condition` | string | `dark`/`dim`/`normal`/`bright` |

## Payload STATUS

Frecuencia: cada 15 s.

```json
{
  "wifi_status": "Conectado",
  "sensor_health": "OK",
  "device_type": "comedero",
  "battery_state": "battery_only",
  "battery_level": 82,
  "battery_voltage": 3.94,
  "battery_is_estimated": false,
  "sensor_interval_ms": 30000
}
```

---

## Comandos (Broker → Dispositivo)

| Comando | Payload ejemplo |
|---|---|
| `ADDWIFI` | `{ "command": "ADDWIFI", "ssid": "MiRed", "pass": "clave123" }` |
| `REMOVEWIFI` | `{ "command": "REMOVEWIFI", "ssid": "MiRed" }` |
| `CALIBRATE_WEIGHT` | `{ "command": "CALIBRATE_WEIGHT", "action": "tare" }` |
| `SET_INTERVAL` | `{ "command": "SET_INTERVAL", "value_ms": 10000 }` — mín 1000 ms |

---

## Bridge Raspberry Pi (v3.2)

Servicio Node.js que corre 24/7 en Raspberry Pi Zero 2 W.

```
KPCL (ESP8266)
    │ MQTT TLS 8883
    ▼
HiveMQ Cloud
    │ +/SENSORS, +/STATUS
    ▼
bridge/src/index.js ──── processor.js
    │                         │
    ▼                         ▼
Supabase (principal)    Supabase Analytics
(service_role key)      (analytics service key)
```

El bridge escribe **directamente con service_role key** (bypass RLS). El webhook `/api/mqtt/webhook` ya no es la vía principal desde v3.0.

### Flujo al recibir SENSORS

1. Parsea JSON del payload
2. Upsert en `readings` (peso, temperatura, humedad, luz, batería)
3. Actualiza `devices.last_seen`
4. Llama a `processor.js` → detecta sesiones → escribe en analytics DB
5. Actualiza `bridge_heartbeats.last_mqtt_at`

### Flujo al recibir STATUS

1. Actualiza `devices` (IP, estado online/offline, battery, device_type)
2. Emite `kpcl_prendido` / `kpcl_apagado` en `audit_events` si cambia estado
3. Si es `KPBR0001` (la Pi misma): actualiza `bridge_heartbeats` + `bridge_status_live`

Un dispositivo pasa a **Offline** si no hay STATUS en > 3 minutos.

### Operaciones en la Pi

```bash
# Estado
sudo systemctl status kittypau-bridge
journalctl -u kittypau-bridge -f
```

> ⚠️ **Corregido 2026-08-14 (confirmado por SSH real, no por suposición):**
> `/home/kittypau/kittypau-bridge` **no es un `git clone`** — no tiene `.git`. El deploy es
> manual: alguien edita/copia `bridge.js` directo en la Pi y guarda una copia `.bak` antes
> (`bridge.js.bak`, `.bak2`, `.bak3`, `.bak4_pre_dedup_fix_20260723`). El comando
> `git pull && npm install && sudo systemctl restart` que este doc tenía **no funciona ahí**
> — no hay repo del que hacer pull. Ver
> [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1 para el detalle completo y la
> recomendación de convertirlo en un clone real.

### Variables de entorno del bridge

| Variable | Descripción |
|---|---|
| `MQTT_BROKER` | Host HiveMQ Cloud |
| `MQTT_PORT` | `8883` |
| `MQTT_USER` / `MQTT_PASS` | Credenciales MQTT |
| `SUPABASE_URL` | URL proyecto Supabase principal |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) |
| `SUPABASE_ANALYTICS_URL` | URL DB analytics |
| `BRIDGE_HEARTBEAT_SECRET` | Token para `/api/bridge/heartbeat` |

### Versiones del bridge

| Versión | Cambio principal | ¿Desplegada en la Pi hoy? |
|---|---|---|
| v3.2 | Retira escritura a `sensor_readings` (tabla compat obsoleta) — versión canónica **del repo git** | 🔴 No — ver corrección abajo |
| v3.1 | Registra `kpcl_prendido`/`kpcl_apagado` en `audit_events` | ✅ Sí — esta es la que corre de verdad |
| v3.0 | Integra `processor.js` — sesiones + escritura analytics DB | ✅ Sí (heredado, sigue en v3.1) |
| v2.6 | Schema unificado | ✅ Sí |
| v2.4 | Upsert `bridge_heartbeats` y `bridge_status_live` | ✅ Sí |
| v2.3 | Publica status de la RPi (KPBR0001) cada 60s via MQTT | ✅ Sí |
| v2.2 | Registra cambios de IP en `ip_history` (JSONB) de devices | ✅ Sí |
| v2.0 | Mapeo de campos: weight→weight_grams, temp→temperature, hum→humidity | ✅ Sí |

> ⚠️ **Corregido 2026-08-14 — el "Resuelto" anterior estaba mal, comparaba las cosas
> equivocadas.** La nota vieja decía que `bridge/package.json` (del repo) y el
> `console.log` de `index.js` (del repo) ya coincidían en "3.2.0" — cierto, pero irrelevante:
> **el `package.json` real en la Raspberry dice `"1.0.0"`** (nunca actualizado desde
> 2026-03-04) y el `bridge.js` desplegado se identifica a sí mismo como v3.1 en el header
> pero v3.0 en el `console.log` — la inconsistencia real está en producción, no en el repo.
> Confirmado por SSH directo, no por lectura de código solamente. Detalle completo en
> [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1.

---

## Mapeo SENSORS → Supabase

| Campo MQTT | Campo Supabase (`readings`) |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `light` | `light` (objeto JSON) |
| `battery_level` | `battery_level` |
| `battery_voltage` | `battery_voltage` |
| `battery_state` | `battery_state` |
| topic prefix | `device_id` |

---

## Ver también

- [[02_Arquitectura/ARQ_Pipeline_End_to_End]] — las 6 capas del sistema trazadas end-to-end (firmware→bridge→DBs→backend→frontend→móvil)
- [[02_Arquitectura/ADR_001_MQTT_vs_HTTP]] — decisión HiveMQ vs REST
- [[08_ESP32/README_ESP32]] — firmware que publica los mensajes
- [[06_BaseDatos/README_BaseDatos]] — tablas donde el bridge escribe
