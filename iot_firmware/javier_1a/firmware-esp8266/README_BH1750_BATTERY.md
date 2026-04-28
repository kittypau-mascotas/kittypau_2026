# Firmware ESP8266 v2.0.0 — BH1750 + AHT10 + Bateria

Fecha: 2026-04-27

---

## Cambios respecto a v1.x

| Componente | Antes (v1.x) | Ahora (v2.0.0) |
|---|---|---|
| Luz | LDR analogico en A0 (aprox. lineal) | BH1750 digital I2C (lux reales, ±1 lux) |
| Temp + Humedad | DHT11 en D5/GPIO14 (±2°C, ±5% RH) | AHT10 I2C (±0.3°C, ±2% RH) |
| Bateria | Constantes hardcodeadas (sin medicion) | Divisor de tension en A0, lectura real |
| Pin D5/GPIO14 | DHT11 | Libre |
| Pin A0 | LDR | Divisor de tension para bateria |

---

## Diagrama de conexiones

```
NodeMCU v3 ESP8266
┌─────────────────────────────────────────────────────────────────┐
│  D1 (GPIO5) ──── SCL ──┬── BH1750 SCL                         │
│  D2 (GPIO4) ──── SDA ──┼── BH1750 SDA                         │
│                         └── AHT10  SDA/SCL                     │
│  D6 (GPIO12) ─── DOUT ─── HX711 DOUT                          │
│  D7 (GPIO13) ─── SCK  ─── HX711 SCK                           │
│  D5 (GPIO14) ─── libre (antes: DHT11)                          │
│  D4 (GPIO2)  ─── LED integrado (logica invertida)              │
│  A0 ──── punto medio divisor de tension (R1-R2)                │
│  3V3 ─── VCC de BH1750, AHT10, HX711                          │
│  GND ─── GND comun                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Tabla de pines:**

| Pin NodeMCU | GPIO | Componente | Señal |
|---|---|---|---|
| D1 | GPIO5 | BH1750 + AHT10 | I2C SCL |
| D2 | GPIO4 | BH1750 + AHT10 | I2C SDA |
| D4 | GPIO2 | LED integrado | LED_STATUS |
| D6 | GPIO12 | HX711 | DOUT |
| D7 | GPIO13 | HX711 | SCK |
| D5 | GPIO14 | — | libre |
| A0 | ADC | Divisor tension | VBAT_DIV |

**Direcciones I2C:**

| Sensor | Direccion | Notas |
|---|---|---|
| AHT10 | 0x38 | fija |
| BH1750 | 0x23 | ADDR pin a GND |

---

## BH1750 — Sensor de luz digital

**Libreria:** `claws/BH1750 @ ^1.3.0`  
**Modo:** `CONTINUOUS_HIGH_RES_MODE` (resolucion 1 lux, ~120 ms/lectura)  
**Rango:** 1 – 65535 lux

Conexion: VCC→3V3, GND→GND, SDA→D2, SCL→D1, ADDR→GND (direccion 0x23).

Payload MQTT (campo `light`):
```json
"light": { "lux": 312.5, "%": 31, "condition": "normal" }
```

| Condicion | Rango |
|---|---|
| `dark` | < 20 lux |
| `dim` | 20 – 99 lux |
| `normal` | 100 – 499 lux |
| `bright` | >= 500 lux |

El porcentaje normaliza respecto a `LIGHT_MAX_LUX = 1000` (luz interior tipica).

---

## AHT10 — Temperatura y humedad

**Libreria:** `adafruit/Adafruit AHTX0 @ ^2.0.5`  
**Direccion I2C:** 0x38 (fija)  
**Precision:** ±0.3°C, ±2% HR (frente a ±2°C, ±5% del DHT11)

Conexion: VCC→3V3, GND→GND, SDA→D2, SCL→D1 (bus compartido con BH1750).

Payload MQTT: `"temp": 23.45, "hum": 61.20`

---

## Divisor de tension — Bateria (A0)

```
Vbat (+) ── R1 (100 kΩ) ── A0 (NodeMCU) ── R2 (100 kΩ) ── GND
```

NodeMCU v3 acepta 0–3.3 V en A0 (tiene divisor interno 220k/100k al ADC del chip).

**Calculo:**
```
V_A0  = (ADC_raw / 1023) × 3.3 V
Vbat  = V_A0 × (R1 + R2) / R2  =  V_A0 × 2.0
nivel = constrain((Vbat - 3.0) / (4.2 - 3.0) × 100, 0, 100)
```

**Referencia LiPo (R1=R2=100 kΩ):**

| Vbat | V_A0 | ADC | Nivel |
|---|---|---|---|
| 4.20 V | 2.10 V | ~651 | 100% |
| 3.90 V | 1.95 V | ~604 | 75% |
| 3.70 V | 1.85 V | ~573 | 58% |
| 3.40 V | 1.70 V | ~527 | 33% |
| 3.00 V | 1.50 V | ~465 | 0% |

El firmware promedia 8 lecturas para reducir ruido del ADC.

**Payload MQTT (bateria):**
```json
"battery_level": 72,
"battery_voltage": 3.87,
"battery_state": "battery_only",
"battery_source": "battery",
"battery_is_estimated": false
```

Estos campos aparecen en `/SENSORS` (cada ciclo) y en `/STATUS` (cada 15 s).

---

## Compilar y subir

```bash
# Produccion via USB (COM10)
pio run -e nodemcuv2 --target upload

# Calibracion de bascula (serial interactivo)
pio run -e calibration --target upload

# OTA — editar upload_port con la IP actual del dispositivo
pio run -e ota --target upload

# OTA dedicado para KPCL0035
pio run -e ota_kpcl0035 --target upload

# Solo compilar (sin subir)
pio run -e nodemcuv2
```

**Monitor serie:**
```bash
pio device monitor --port COM10 --baud 115200
```

**Salida de boot exitoso:**
```
[HX711] Offset restaurado: -184320
[AHT10] Sensor iniciado.
[BH1750] Sensor iniciado (CONTINUOUS_HIGH_RES).
[BATT] Divisor R1=100k R2=100k | rango 3.0-4.2 V
...
[HX711] 0.000 g
[AHT10] 23.45 C  61.20 %
[BH1750] 312.5 lux  31%  normal
[BATT] 3.87 V  72%
```

---

## Checklist de validacion

- [ ] Boot muestra `[AHT10] Sensor iniciado.` y `[BH1750] Sensor iniciado.`
- [ ] Serial imprime `[AHT10] XX.XX C  XX.XX %` en cada ciclo
- [ ] Serial imprime `[BH1750] XX.X lux  XX%  condicion` en cada ciclo
- [ ] Serial imprime `[BATT] X.XX V  XX%` en cada ciclo
- [ ] Payload MQTT `/SENSORS` contiene `light`, `temp`, `hum`, `battery_*`
- [ ] Payload MQTT `/STATUS` contiene `battery_level` y `battery_voltage` reales
- [ ] Nivel de bateria cambia si se ajusta el voltaje de entrada

---

## Uso de memoria (v2.0.0, env:nodemcuv2)

| Recurso | Uso |
|---|---|
| RAM | 42.8% (~35 KB de 82 KB) |
| Flash | 52.0% (~544 KB de 1044 KB) |

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `include/config.h` | Quita LDR/DHT, agrega BH1750 y constantes divisor bateria |
| `src/sensors.h` | Agrega `BatteryReading` struct y `sensorsGetLastBattery()` |
| `src/sensors.cpp` | Reemplaza LDR→BH1750, DHT11→AHT10, A0→bateria |
| `src/main.cpp` | `appendBatteryTelemetry()` usa datos reales del sensor |
| `platformio.ini` | Reemplaza DHT por AHTX0, agrega BH1750 en 4 entornos |
