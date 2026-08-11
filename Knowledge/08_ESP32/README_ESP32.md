---
id: readme_esp32
title: Firmware — ESP8266 / ESP32-CAM (KPCL)
type: sensor
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-11
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

## ⚠️ Ubicación real en disco (verificado 2026-08-11)

> `CLAUDE.md` describe `kittypau_iot_firmware/` como la carpeta del firmware. **Ya no es así.**
> Esa carpeta existe en disco pero está **vacía y en `.gitignore`** (junto con
> `kittypau_iot_firmware (antiguo)/`, que sí tiene contenido pero es legacy explícito).
>
> El firmware activo, versionado en git, vive en:
> ```
> iot_firmware/javier_1a/
> ├── firmware-esp8266/     ← NodeMCU v3, food bowl — principal
> │   ├── include/config.h
> │   ├── src/*.cpp, *.h
> │   ├── platformio.ini
> │   └── README_BH1750_BATTERY.md   ← changelog v2.0.0 (BH1750+AHT10+batería)
> └── firmware-esp32cam/    ← ESP32-CAM
>     ├── include/config.h
>     └── src/*.cpp, *.h
> ```
> Último commit que tocó firmware: `fc02dfc` (2026-04-28, OTA env para KPCL0036).
> Este README ya reflejaba correctamente el contenido técnico (sensores, versión) —
> solo la ruta de carpeta en `CLAUDE.md` estaba desactualizada.

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

`platformio.ini` en `firmware-esp8266/` define varios entornos:

| Entorno | Uso |
|---|---|
| `nodemcuv2` | Build/upload producción vía USB (`upload_port = COM10`). `DEVICE_ID` default en `config.h` = `KPCL0036` |
| `calibration` | Mismo build + `CALIBRATION_MODE` (serial interactivo para calibrar HX711) |
| `ota` | OTA genérico — editar `upload_port` con la IP del dispositivo destino |
| `ota_kpcl0035` | OTA dedicado — `build_flags = -D DEVICE_ID=\"KPCL0035\" -D USE_DHT11` (KPCL0035 sigue en DHT11, no AHT10) |
| `ota_kpcl0036` | OTA dedicado a KPCL0036 |

`config.h` permite `DEVICE_ID` por `build_flags` (`#ifndef DEVICE_ID`) para no editar el archivo en cada flasheo — así se reflashea la misma imagen a distintos KPCL solo cambiando el entorno.

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
