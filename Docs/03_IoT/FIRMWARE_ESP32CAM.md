---
tags: [firmware, esp32, cam, camara, iot, hardware]
area: IoT
estado: prototipo
actualizado: 2026-06-24
---

# Firmware ESP32-CAM — KPCL (v1.0.0)

Firmware para el comedero con cámara. Corre en AI-Thinker ESP32-CAM.  
Ubicación en repo: `iot_firmware/javier_1a/firmware-esp32cam/`

> **Estado**: prototipo. No hay dispositivos activos en campo actualmente. Device ID asignado: `KPCL0040`.

## Hardware

### Placa

**AI-Thinker ESP32-CAM** (ESP32-S)

### Sensores y periféricos

| Componente | Función | Pines |
|---|---|---|
| OV2640 (integrado) | Cámara 2MP | Pines CAMERA\_* en config.h |
| HX711 + celda de carga | Peso (gramos) | DOUT: GPIO13, SCK: GPIO14 |
| DHT11 | Temperatura + Humedad | GPIO15 |
| LED rojo integrado | Indicador estado | GPIO33 |
| Flash LED | Iluminación cámara | GPIO4 (uso con precaución — alta potencia) |

### Configuración de cámara

| Parámetro | Valor |
|---|---|
| Resolución | VGA (640×480) |
| Calidad JPEG | 12 (0–63, menor = mejor) |
| Frame buffers | 2 |
| HTTP streaming | Puerto 80 / 81 |

## Arquitectura del firmware

```
firmware-esp32cam/
├── src/
│   ├── main.cpp             ← Loop principal
│   ├── camera_manager.cpp/.h ← Inicialización OV2640, captura y publish
│   ├── sensors.cpp/.h       ← HX711, DHT11
│   ├── mqtt_manager.cpp/.h  ← Conexión TLS a HiveMQ
│   ├── wifi_manager.cpp/.h  ← Multi-red
│   └── led_indicator.cpp/.h ← Indicador LED
├── include/
│   └── config.h             ← Pines, MQTT, cámara, calibración
└── platformio.ini           ← Entornos de build
```

## Tópicos MQTT (adicionales al ESP8266)

Además de `SENSORS`, `STATUS` y `cmd`, el ESP32-CAM publica:

### `{DEVICE_ID}/CAMERA`

Publica imágenes capturadas (JPEG codificado en base64 o URL de stream).

```
KPCL0040/CAMERA
```

Ver esquema completo en [[TOPICOS_MQTT]].

## Entornos PlatformIO

| Entorno | Uso |
|---|---|
| `esp32cam` | Flash por USB (COM8) |
| `ota` | OTA genérico (IP: 192.168.1.92) |

## Dependencias

```
knolleary/PubSubClient @ ^2.8
bblanchon/ArduinoJson @ ^6.19.4
bogde/HX711 @ ^0.7.5
adafruit/DHT sensor library @ ^1.4.2
adafruit/Adafruit Unified Sensor @ ^1.1.4
```

Filesystem: **SPIFFS** (a diferencia del ESP8266 que usa LittleFS).

## Links relacionados

- [[FIRMWARE_ESP8266]]
- [[TOPICOS_MQTT]]
- [[KPCL_CATALOGO_COMPONENTES_Y_COSTOS]]
