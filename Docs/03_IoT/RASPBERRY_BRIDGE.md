---
tags: [bridge, raspberry, mqtt, supabase, nodejs]
area: IoT
estado: activo
actualizado: 2026-06-24
---

# Bridge MQTT → Supabase (Raspberry Pi)

Servicio Node.js que corre 24/7 en la Raspberry Pi Zero 2 W.  
Escucha mensajes MQTT de los dispositivos KPCL y los persiste directamente en Supabase.

Código fuente: `bridge/` (repo). Runtime: Raspberry Pi (fuera del repo).

## Versión actual: v3.2

| Versión | Cambio principal |
|---|---|
| v3.2 | Retira escritura a `sensor_readings` (tabla compat obsoleta) |
| v3.1 | Registra `kpcl_prendido` / `kpcl_apagado` en `audit_events` |
| v3.0 | Integra `processor.js` — sesiones + doble escritura a analytics DB |
| v2.6 | Schema unificado |
| v2.4 | Upsert `bridge_heartbeats` y `bridge_status_live` |
| v2.3 | Publica status de la RPi (KPBR0001) cada 60 s via MQTT |
| v2.2 | Registra cambios de IP en `ip_history` (JSONB) de `devices` |
| v2.0 | Mapeo de campos: `weight→weight_grams`, `temp→temperature`, `hum→humidity` |

## Arquitectura

```
KPCL (ESP8266)
    │ MQTT TLS 8883
    ▼
HiveMQ Cloud
    │ +/SENSORS, +/STATUS (wildcard)
    ▼
bridge/src/index.js  ──── processor.js
    │                         │
    ▼                         ▼
Supabase (principal)    Supabase Analytics
(service_role key)      (analytics service key)
```

> El bridge escribe **directamente a Supabase** con service_role key (bypass de RLS).  
> El webhook `/api/mqtt/webhook` ya NO es la vía principal de ingesta desde v3.0.

## Flujo por mensaje

### Al recibir `{DEVICE_ID}/SENSORS`
1. Parsea JSON del payload
2. Upsert en `device_readings` (peso, temperatura, humedad, luz, batería)
3. Actualiza `devices.last_seen`
4. Llama a `processor.js` para detectar sesiones → escribe en analytics DB
5. Actualiza `bridge_heartbeats.last_mqtt_at`

### Al recibir `{DEVICE_ID}/STATUS`
1. Actualiza `devices` (IP, estado online/offline, battery, device_type)
2. Registra cambio de IP en `ip_history` si cambió
3. Emite evento `kpcl_prendido` o `kpcl_apagado` en `audit_events` si cambia online↔offline
4. Si el dispositivo es `KPBR0001` (la propia RPi), actualiza `bridge_heartbeats` y `bridge_status_live`

### Detección offline
Un dispositivo pasa a Offline si no se recibe STATUS en > 3 minutos.

## Processor.js (analytics)

State machine por dispositivo que detecta sesiones de alimentación/hidratación:

| Parámetro | Valor |
|---|---|
| Umbral apertura sesión | caída > 5 g |
| Cierre sesión | 2 lecturas consecutivas estables (±3 g) |
| Baseline z-score | últimas 30 sesiones por mascota |
| Tablas analytics | `pet_sessions`, `pet_daily_summary` |

## Estructura del código

```
bridge/
├── src/
│   ├── index.js      ← Lógica MQTT, handlers SENSORS/STATUS, escritura Supabase
│   └── processor.js  ← Detección de sesiones, escritura analytics DB
├── systemd/
│   └── kittypau-bridge.service  ← Servicio systemd para la Pi
└── package.json      ← v2.4.0, kittypau-mqtt-bridge
```

## Variables de entorno

Archivo `.env` en la Pi en `/home/kittypau/kittypau-bridge/.env` (no versionado).

| Variable | Descripción |
|---|---|
| `MQTT_BROKER` | Host HiveMQ Cloud |
| `MQTT_PORT` | `8883` |
| `MQTT_USER` | Usuario MQTT |
| `MQTT_PASS` | Contraseña MQTT |
| `SUPABASE_URL` | URL del proyecto Supabase principal |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) |
| `SUPABASE_ANALYTICS_URL` | URL de la DB analytics |
| `SUPABASE_ANALYTICS_SERVICE_KEY` | Service key analytics |
| `BRIDGE_HEARTBEAT_SECRET` | Token para `/api/bridge/heartbeat` |

## Dispositivos conocidos

```
KPCL0031, KPCL0033, KPCL0035, KPCL0036,
KPCL0037, KPCL0038, KPCL0040, KPCL0041
```

El bridge usa wildcard (`+/SENSORS`, `+/STATUS`) — acepta cualquier dispositivo con prefijo `KPCL`.

## Operaciones en la Pi

### Estado del servicio
```bash
sudo systemctl status kittypau-bridge
journalctl -u kittypau-bridge -f
```

### Instalar / reinstalar servicio
```bash
sudo cp bridge/systemd/kittypau-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kittypau-bridge
sudo systemctl start kittypau-bridge
```

### Actualizar bridge
```bash
cd /home/kittypau/kittypau-bridge
git pull
npm install
sudo systemctl restart kittypau-bridge
```

## Mapeo de campos MQTT → Supabase

| Campo MQTT (SENSORS) | Campo Supabase |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `light` | `light` (objeto JSON) |
| `battery_level` | `battery_level` |
| `battery_voltage` | `battery_voltage` |
| `battery_state` | `battery_state` |
| topic prefix | `device_id` |

## Links relacionados

- [[TOPICOS_MQTT]]
- [[FIRMWARE_ESP8266]]
- [[BRIDGE_HEALTHCHECK]]
- [[ESTADO_BRIDGE_ACTUAL]]
- [[RASPBERRY_CLI]]
- [[../05_DevOps/ENV_VARIABLES]]
