---
tags: [iot, mqtt, topicos, payload, hivemq]
area: IoT
estado: activo
actualizado: 2026-06-24
---

# Tópicos MQTT — Kittypau IoT

## Broker (HiveMQ Cloud)

| Campo | Valor |
|---|---|
| Host | `cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud` |
| Puerto | `8883` (MQTT sobre TLS) |
| Certificado | ISRG Root X1 (Let's Encrypt) — embebido en firmware |
| Usuario | `Kittypau1` |
| Contraseña | en `.env` del bridge — no en texto plano |

## Convención de tópicos

```
{DEVICE_ID}/SENSORS   ← Dispositivo → Broker
{DEVICE_ID}/STATUS    ← Dispositivo → Broker
{DEVICE_ID}/cmd       ← Broker → Dispositivo
{DEVICE_ID}/CAMERA    ← Solo ESP32-CAM
```

El bridge se suscribe con wildcard: `+/SENSORS`, `+/STATUS`

---

## Tópicos publicados (Dispositivo → Broker)

### `{DEVICE_ID}/SENSORS`

Frecuencia: configurable vía `SET_INTERVAL`. Default: 30 s.

```json
{
  "timestamp": "2026-02-08T16:06:28Z",
  "weight": 125.50,
  "temp": 24.30,
  "hum": 65.00,
  "light": {
    "lux": 12.5,
    "%": 7,
    "condition": "dim"
  }
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `timestamp` | string ISO 8601 | UTC, sincronizado por NTP |
| `weight` | float | Gramos. Deadband 2g (no publica si cambio < 2g) |
| `temp` | float / null | °C. `null` si falla AHT10 o DHT11 |
| `hum` | float / null | %. `null` si falla sensor |
| `light.lux` | float | Lux (BH1750, rango 0–65535) |
| `light.%` | int | Normalizado 0–100 (ref: 1000 lux = 100%) |
| `light.condition` | string | `dark` (<20 lux) / `dim` (<100) / `normal` (<500) / `bright` (>=500) |

> **KPCL0035** usa DHT11 en lugar de AHT10 — el payload es el mismo, solo cambia el sensor subyacente.

### `{DEVICE_ID}/STATUS`

Frecuencia: cada 15 s.

```json
{
  "wifi_status": "Conectado",
  "wifi_ssid": "Jeivos",
  "wifi_ip": "192.168.100.106",
  "KPCL0036": "Online",
  "sensor_health": "OK",
  "device_type": "comedero",
  "device_model": "NodeMCU v3 CP2102",
  "battery_state": "battery_only",
  "battery_source": "battery",
  "battery_level": 82,
  "battery_voltage": 3.94,
  "battery_is_estimated": false,
  "sensor_interval_ms": 30000
}
```

| Campo | Tipo | Valores |
|---|---|---|
| `wifi_status` | string | `Conectado` / `Desconectado` |
| `wifi_ssid` | string | SSID actual o `""` |
| `wifi_ip` | string | IP local o `""` |
| `{DEVICE_ID}` | string | `Online` / `Offline` (con debounce 15 s) |
| `sensor_health` | string | `OK` / `ERR_HX711` / `ERR_DHT` / `Initializing` |
| `device_type` | string | `comedero` / `bebedero` |
| `device_model` | string | Modelo de placa |
| `battery_state` | string | `battery_only` / `charging` / `charged` |
| `battery_level` | int | 0–100 % (`-1` si falla lectura) |
| `battery_voltage` | float | Voltios (`-1.0` si falla) |
| `battery_is_estimated` | bool | `false` = lectura real via ADC |
| `sensor_interval_ms` | int | Intervalo de publicación SENSORS en ms |

---

## Tópicos suscritos (Broker → Dispositivo)

### `{DEVICE_ID}/cmd`

#### ADDWIFI
```json
{ "command": "ADDWIFI", "ssid": "MiRed", "pass": "clave123" }
```

#### REMOVEWIFI
```json
{ "command": "REMOVEWIFI", "ssid": "MiRed" }
```

#### CALIBRATE_WEIGHT — tare
```json
{ "command": "CALIBRATE_WEIGHT", "action": "tare" }
```

#### CALIBRATE_WEIGHT — set_scale
```json
{ "command": "CALIBRATE_WEIGHT", "action": "set_scale", "factor": 4205.70 }
```

#### SET_INTERVAL
```json
{ "command": "SET_INTERVAL", "value_ms": 10000 }
```
Mínimo 1000 ms. Persiste en LittleFS (`/interval.json`).

---

## Mapeo SENSORS → Webhook Bridge

| Campo MQTT | Campo Webhook (`/api/mqtt/webhook`) |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `light` | `light` (objeto completo) |
| `timestamp` | `timestamp` |
| topic prefix | `device_id` (extraído del tópico) |

El STATUS no se persiste en DB actualmente.

## Links relacionados

- [[FIRMWARE_ESP8266]]
- [[FIRMWARE_ESP32CAM]]
- [[RASPBERRY_BRIDGE]]
- [[../02_App/FRONT_BACK_APIS]]
