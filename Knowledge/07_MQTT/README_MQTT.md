---
id: readme_mqtt
title: MQTT — HiveMQ + Bridge Raspberry
type: backend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
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

# Actualizar
cd /home/kittypau/kittypau-bridge
git pull && npm install
sudo systemctl restart kittypau-bridge
```

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

| Versión | Cambio principal |
|---|---|
| v3.2 | Retira escritura a `sensor_readings` (tabla compat obsoleta) — **versión canónica activa** |
| v3.1 | Registra `kpcl_prendido`/`kpcl_apagado` en `audit_events` |
| v3.0 | Integra `processor.js` — sesiones + escritura analytics DB |
| v2.6 | Schema unificado |
| v2.4 | Upsert `bridge_heartbeats` y `bridge_status_live` |
| v2.3 | Publica status de la RPi (KPBR0001) cada 60s via MQTT |
| v2.2 | Registra cambios de IP en `ip_history` (JSONB) de devices |
| v2.0 | Mapeo de campos: weight→weight_grams, temp→temperature, hum→humidity |

> ⚠️ **Inconsistencia de versiones en el código** (deuda técnica M1):  
> El `bridge/package.json` dice `"version": "2.4.0"` — nunca se actualizó.  
> El `console.log` en `index.js` línea 44 dice `"Kittypau Bridge v3.0"` — está desactualizado.  
> La versión canónica correcta es **v3.2** (documentada en el encabezado del archivo y en Knowledge).  
> Impacto: confunde en logs de systemd y diagnóstico remoto en la Raspberry Pi.

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

- [[02_Arquitectura/ADR_001_MQTT_vs_HTTP]] — decisión HiveMQ vs REST
- [[08_ESP32/README_ESP32]] — firmware que publica los mensajes
- [[06_BaseDatos/README_BaseDatos]] — tablas donde el bridge escribe
