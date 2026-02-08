# Tópicos MQTT - Kittypau IoT (referencia)

## Broker (HiveMQ Cloud)
- **Servicio**: HiveMQ Cloud
- **Host**: `<TU_HOST_HIVEMQ>`
- **Puerto**: `8883` (MQTT sobre TLS)
- **Certificado**: ISRG Root X1 (Let's Encrypt)
- **Credenciales**: se gestionan por `.env` en el bridge (no documentar en texto plano)

---

## Convención de topics
Patrón general:
- `{DEVICE_ID}/SENSORS`
- `{DEVICE_ID}/STATUS`
- `{DEVICE_ID}/cmd`

Ejemplo:
- `KPCL0038/SENSORS`
- `KPCL0038/STATUS`
- `KPCL0038/cmd`

El bridge se suscribe con wildcard para todos los dispositivos:
- `+/SENSORS`
- `+/STATUS`

---

## Topics publicados (Dispositivo -> Broker)

### 1) `{DEVICE_ID}/SENSORS`
- **Frecuencia**: configurable (ej. cada 10s)
- **Payload JSON**:
```json
{
  "timestamp": "MM-dd-aaaa HH:mm:ss",
  "weight": 125.50,
  "temp": 24.30,
  "hum": 65.00,
  "ldr": 450
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `timestamp` | string | Hora NTP `MM-dd-aaaa HH:mm:ss` |
| `weight` | float | Peso en gramos |
| `temp` | float/null | Temperatura °C |
| `hum` | float/null | Humedad % |
| `ldr` | int | ADC 0-1023 (luz) |

### 2) `{DEVICE_ID}/STATUS`
- **Frecuencia**: configurable (ej. cada 15s)
- **Payload JSON**:
```json
{
  "wifi_status": "Conectado",
  "wifi_ssid": "MiRed",
  "wifi_ip": "192.168.1.50",
  "KPCL0038": "Online",
  "sensor_health": "OK"
}
```

| Campo | Tipo | Valores |
|---|---|---|
| `wifi_status` | string | `Conectado` / `Desconectado` |
| `wifi_ssid` | string | SSID actual |
| `wifi_ip` | string | IP local |
| `{DEVICE_ID}` | string | `Online` / `Offline` |
| `sensor_health` | string | `OK` / `ERR_*` |

---

## Topics suscritos (Broker -> Dispositivo)

### `{DEVICE_ID}/cmd`
Comandos remotos al dispositivo.

#### ADDWIFI
```json
{
  "command": "ADDWIFI",
  "ssid": "NombreRed",
  "pass": "ClaveRed"
}
```

#### REMOVEWIFI
```json
{
  "command": "REMOVEWIFI",
  "ssid": "NombreRed"
}
```

#### CALIBRATE_WEIGHT (tare)
```json
{
  "command": "CALIBRATE_WEIGHT",
  "action": "tare"
}
```

#### CALIBRATE_WEIGHT (set_scale)
```json
{
  "command": "CALIBRATE_WEIGHT",
  "action": "set_scale",
  "factor": 4205.70
}
```

---

## Mapeo hacia API (Bridge -> Webhook)
El bridge debe mapear `{DEVICE_ID}/SENSORS` al payload de `/api/mqtt/webhook`:

| MQTT SENSORS | Webhook |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `timestamp` | `timestamp` |
| `DEVICE_ID` | `deviceCode` (inyectado desde topic) |

**Nota**: `STATUS` no se persiste hoy en DB; se puede extender el schema si se necesita.
