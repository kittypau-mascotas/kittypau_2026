---
id: readme_esp32
title: Firmware — ESP8266 / ESP32-CAM (KPCL)
type: sensor
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - esp8266
  - esp32
  - firmware
  - iot
  - kpcl
related:
  - [[00_HOME]]
  - [[09_Sensores/README_Sensores]]
  - [[07_MQTT/README_MQTT]]
  - [[02_Arquitectura/README_Arquitectura]]
---

# Firmware — ESP8266 / ESP32-CAM (KPCL)

---

## Plataformas

| Placa | Modelo | Uso |
|---|---|---|
| NodeMCU v3 CP2102 | ESP8266 | Food bowl (comedero/bebedero) — **principal** |
| ESP32-CAM | ESP32 | Cámara adicional (tópico `/CAMERA`) |

---

## Firmware ESP8266 (KPCL food bowl)

**Versión activa:** v2.0.0  
**Stack:** Arduino framework, MQTT over TLS, LittleFS, HX711, AHT10/DHT11, BH1750.

### Sensores

| Sensor | Dato | Notas |
|---|---|---|
| HX711 + celda de carga | `weight_grams` | Tara guardada en LittleFS |
| AHT10 (o DHT11 en KPCL0035) | `temperature`, `humidity` | `null` si falla |
| BH1750 | `light.lux`, `light.%`, `light.condition` | Rango 0–65535 lux |

### Publicaciones MQTT

| Tópico | Frecuencia | Contenido |
|---|---|---|
| `{DEVICE_ID}/SENSORS` | Default 30 s | peso, temp, hum, luz, timestamp |
| `{DEVICE_ID}/STATUS` | Cada 15 s | wifi, battery, sensor_health, device_type |

**Deadband:** no publica SENSORS si cambio de peso < 2 g (evita spam sin actividad real).

### Comandos recibidos (`{DEVICE_ID}/cmd`)

| Comando | Acción |
|---|---|
| `ADDWIFI` | Agrega red WiFi a LittleFS |
| `REMOVEWIFI` | Elimina red WiFi |
| `CALIBRATE_WEIGHT` + `tare` | Realiza tara en caliente |
| `CALIBRATE_WEIGHT` + `set_scale` | Escribe factor de escala HX711 |
| `SET_INTERVAL` | Cambia intervalo de SENSORS (mín 1000 ms) |

### Batería

Desde firmware v2.0.0: ADC real para `battery_level`, `battery_voltage`, `battery_state`.
- Estados: `battery_only` / `charging` / `charged`
- Si falla lectura: `battery_level=-1`, `battery_voltage=-1.0`

### OTA (Over The Air)

Actualización de firmware vía WiFi. Requiere que el dispositivo esté online y el script de deploy.

---

## Firmware ESP32-CAM

Tópico: `{DEVICE_ID}/CAMERA`  
Payload: JPEG en base64 o stream MJPEG.  
Estado: funcional pero no integrado activamente en el producto principal.

---

## Dispositivos conocidos

```
KPCL0031, KPCL0033, KPCL0034 ("Bandida"), KPCL0035, KPCL0036,
KPCL0037, KPCL0038, KPCL0040, KPCL0041
```

`KPCL0034` es el dispositivo de investigación principal — ver [[09_Sensores/README_Sensores]].

---

## Configuración del dispositivo

Parámetros almacenados en LittleFS:
- `/wifi.json` — lista de redes WiFi conocidas
- `/interval.json` — intervalo de publicación SENSORS
- Factor de escala HX711 en memoria de calibración

---

## Ver también

- [[09_Sensores/README_Sensores]] — KPCL0034 "Bandida" en detalle
- [[07_MQTT/README_MQTT]] — tópicos y payloads completos
