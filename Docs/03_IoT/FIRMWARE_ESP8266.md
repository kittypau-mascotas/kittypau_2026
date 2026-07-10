---
tags: [firmware, esp8266, nodemcu, iot, hardware]
area: IoT
estado: activo
actualizado: 2026-06-24
---

# Firmware ESP8266 — KPCL (v2.0.0)

Firmware principal del comedero Kittypau. Corre en NodeMCU v3 (ESP8266).  
Ubicación en repo: `iot_firmware/javier_1a/firmware-esp8266/`

## Dispositivos activos

| Device ID | Sensor temp/hum | IP OTA | Estado |
|---|---|---|---|
| `KPCL0035` | DHT11 | 192.168.100.95 | Activo |
| `KPCL0036` | AHT10 | 192.168.100.96 | Activo |

El `DEVICE_ID` por defecto en `config.h` es `KPCL0036`. Para otros dispositivos se sobreescribe con `build_flags` en PlatformIO.

## Hardware

### Placa

**NodeMCU v3 ESP8266** (chip CP2102)

### Sensores

| Sensor | Función | Interfaz | Pines |
|---|---|---|---|
| HX711 + celda de carga | Peso (gramos) | Digital | DOUT: D6 (GPIO12), SCK: D7 (GPIO13) |
| AHT10 *(KPCL0036)* | Temperatura + Humedad | I2C (0x38) | SDA: D2 (GPIO4), SCL: D1 (GPIO5) |
| DHT11 *(KPCL0035)* | Temperatura + Humedad | Digital | D5 (GPIO14) |
| BH1750 | Luz (lux) | I2C (0x23) | SDA: D2, SCL: D1 |
| A0 + divisor R1=R2=100k | Batería (voltaje) | ADC | A0 |
| TP4056 (HW-373) | Controlador de carga LiPo | GPIO | D3 (GPIO0), D0 (GPIO16) |
| LED integrado | Indicador estado | Digital | GPIO2 (lógica invertida) |

### Batería

Circuito divisor de tensión en A0:
- Rango medible: 0–6.6 V (con R1=R2=100k)
- LiPo 4.2 V → ADC ≈ 651, LiPo 3.0 V → ADC ≈ 465
- 32 muestras promediadas + filtro EMA (alpha=0.15) para estabilizar ruido del radio WiFi
- El estado de carga (`charging`/`charged`) requiere comparador externo (LM393) — pendiente de implementar

## Arquitectura del firmware

```
firmware-esp8266/
├── src/
│   ├── main.cpp             ← Loop principal, publicación periódica, OTA
│   ├── sensors.cpp/.h       ← HX711, AHT10/DHT11, BH1750, batería ADC
│   ├── mqtt_manager.cpp/.h  ← Conexión TLS a HiveMQ, callback de comandos
│   ├── wifi_manager.cpp/.h  ← Multi-red, reconexión, gestión vía MQTT
│   ├── led_indicator.cpp/.h ← Parpadeo no bloqueante (callbacks)
│   └── captive_portal.cpp/.h ← Portal cautivo WiFi (onboarding)
├── include/
│   └── config.h             ← Todos los defines: pines, MQTT, sensores, batería
├── data/
│   └── wifi.json            ← Redes WiFi persistidas en LittleFS
└── platformio.ini           ← Entornos de build
```

## Módulos

### main.cpp
- Inicia WiFi → MQTT → OTA → sensores
- Publica `SENSORS` cada `sensorPublishInterval` ms (default: 30 s, persistido en `/interval.json`)
- Publica `STATUS` cada 15 s
- Lógica Online/Offline con debounce de 15 s

### sensors.cpp
- Inicializa HX711 con factor de calibración desde LittleFS (`/calibration.json`)
- Lee BH1750 (lux) y clasifica en `dark/dim/normal/bright`
- Lee AHT10 o DHT11 según `USE_DHT11` build flag
- Lee batería: 32 muestras ADC + EMA entre ciclos
- Publica el payload a través de `mqtt_manager`

### mqtt_manager.cpp
- TLS con certificado ISRG Root X1 embebido en PROGMEM
- Backoff exponencial en reconexión (5 s – 60 s)
- Verifica heap > 20 KB antes de iniciar TLS
- Sincroniza hora por NTP en la primera conexión
- Despacha comandos recibidos en `/cmd` (ver [[TOPICOS_MQTT]])

### wifi_manager.cpp
- Carga credenciales desde LittleFS (`/wifi.json`)
- Intenta conectarse a redes conocidas en orden
- Soporta `ADDWIFI` / `REMOVEWIFI` vía MQTT

## Entornos PlatformIO

| Entorno | Uso |
|---|---|
| `nodemcuv2` | Flash por USB (COM10) |
| `calibration` | Modo calibración HX711 por serial |
| `ota` | OTA genérico (IP configurable en `.ini`) |
| `ota_kpcl0035` | OTA directo a KPCL0035 (IP: 192.168.100.95, DHT11) |
| `ota_kpcl0036` | OTA directo a KPCL0036 (IP: 192.168.100.96, AHT10) |

## Calibración del peso (HX711)

1. Subir con entorno `calibration`
2. Abrir monitor serie (115200 baud)
3. `T` = tare (poner a cero)
4. Colocar objeto de peso conocido → ingresar gramos → guarda factor en LittleFS
5. Volver a flash con `nodemcuv2` o `ota_kpcl0036`

Factor actual en `config.h`: `4301.0`

## Dependencias

```
knolleary/PubSubClient @ ^2.8
bblanchon/ArduinoJson @ ^6.19.4
bogde/HX711 @ ^0.7.5
claws/BH1750 @ ^1.3.0
adafruit/Adafruit AHTX0 @ ^2.0.5       ← KPCL0036
adafruit/DHT sensor library @ ^1.4.2   ← KPCL0035
adafruit/Adafruit Unified Sensor @ ^1.1.14
```

## Links relacionados

- [[TOPICOS_MQTT]]
- [[FIRMWARE_ESP32CAM]]
- [[RASPBERRY_BRIDGE]]
- [[BATERIA_ESTIMADA_KPCL]]
- [[KPCL_CATALOGO_COMPONENTES_Y_COSTOS]]
