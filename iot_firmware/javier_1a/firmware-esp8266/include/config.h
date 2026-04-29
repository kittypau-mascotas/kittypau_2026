// config.h - Kittypau IoT
#pragma once

#define PROJECT_NAME "Kittypau"
#define FIRMWARE_VERSION "2.0.0"

// Pines para NodeMCU v3 ESP8266
#define PIN_LED_STATUS  LED_BUILTIN  // GPIO2  - LED integrado (logica invertida)
#define PIN_HX711_DOUT  12           // D6 (GPIO12)
#define PIN_HX711_SCK   13           // D7 (GPIO13)
// D5 (GPIO14) libre en hardware AHT10; DHT11 en builds USE_DHT11 (KPCL0035)
#define PIN_DHT         14           // D5 (GPIO14) — solo usado si USE_DHT11
// Controlador de carga TP4056 — pines de estado (catodo LED via divisor 10k+10k a GND)
// El modulo HW-373 usa 5V en los LEDs — divisor baja a 2.5V para proteger el GPIO
// GPIO16 (D0) tiene 10k interno a RST — NO usar para CHRG, no detecta LOW correctamente
#define PIN_CHRG         0           // D3 (GPIO0)  — catodo LED1 (CHRG): LOW=cargando
#define PIN_STDBY       16           // D0 (GPIO16) — catodo LED2 (STDBY): LOW=cargado
// Bus I2C compartido: SDA=D2(GPIO4), SCL=D1(GPIO5)
//   AHT10  → 0x38  (temperatura + humedad)
//   BH1750 → 0x23  (luz, ADDR pin a GND)
// A0 → divisor de tension para bateria (ver seccion BATT mas abajo)

// Dispositivo
// DEVICE_ID puede sobreescribirse por build_flags en PlatformIO (ej. OTA por dispositivo).
#ifndef DEVICE_ID
#define DEVICE_ID      "KPCL0036"
#endif
#define DEVICE_TYPE    "comedero"              // Funcion: "comedero", "bebedero"
#define DEVICE_MODEL   "NodeMCU v3 CP2102"     // Modelo de placa electronica

// WiFi por defecto
#define WIFI_SSID      "Jeivos"
#define WIFI_PASS      "jdayne212"

// MQTT Broker HiveMQ Cloud
#define MQTT_BROKER    "cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USER      "Kittypau1"
#define MQTT_PASS      "Kittypau1234"

// Topics
#define TOPIC_STATUS   DEVICE_ID "/STATUS"
#define TOPIC_SENSORS  DEVICE_ID "/SENSORS"
#define TOPIC_CMD      DEVICE_ID "/cmd"

// Rangos y limites de Sensores
#define MAX_WEIGHT_G    1000.0f   // Gramos maximos en la celda de carga
#define LIGHT_MAX_LUX   1000.0f   // Lux referencia para normalizacion a % (BH1750 mide hasta 65535 lux)
#define MAX_TEMP_C      100.0f    // Grados Celsius maximos validos
#define MAX_HUMIDITY_PC 100.0f    // Porcentaje maximo de humedad

// ── Divisor de tension para bateria (A0) ────────────────────────────────────
// Circuito: Vbat ── R1 ── A0 ── R2 ── GND
// NodeMCU A0 acepta 0–3.3 V (internamente divide por ~3.3 para el ADC 0–1 V).
//
//   Vbat_calculado = (ADC_raw / ADC_RESOLUTION) * ADC_VREF * ((R1+R2)/R2)
//
// Con R1=R2=100k:  factor = 2.0  →  rango medible: 0–6.6 V
//   LiPo 4.2 V max  →  V_A0 = 2.10 V  →  ADC ≈ 651  ✓
//   LiPo 3.0 V min  →  V_A0 = 1.50 V  →  ADC ≈ 465  ✓
#define BATT_R1_KOHM    100       // Resistencia superior del divisor (kOhm)
#define BATT_R2_KOHM    100       // Resistencia inferior del divisor (kOhm)
#define BATT_MAX_V      4.2f      // Voltaje = 100 % (LiPo cargada)
#define BATT_MIN_V      3.0f      // Voltaje =   0 % (LiPo agotada / apagar)
#define ADC_RESOLUTION  1023.0f   // ADC 10-bit (ESP8266)
#define ADC_VREF        3.3f      // Tension de referencia del ADC en NodeMCU (V)
#define BATT_SAMPLES    32        // Muestras promediadas por lectura (anti-ruido WiFi ADC ESP8266)
#define BATT_EMA_ALPHA  0.15f     // Factor EMA entre lecturas consecutivas (menor = más suave)

// Calibracion HX711
// Factor de partida — calibrar con objeto de peso conocido via env:calibration.
// Procedimiento en platformio.ini (env:calibration): subir, abrir monitor serie,
//   "T" = tare, ingresa gramos del objeto → guarda factor automaticamente en LittleFS.
#define HX711_CALIBRATION_FACTOR 4301.0f
#define WEIGHT_DEADBAND          2.0f     // Cambio minimo en gramos para reportar nuevo peso

// Archivo de calibraciÃ³n
#define CALIBRATION_FILE "/calibration.json"
#define TARE_FILE        "/tare.json"

// Telemetria de bateria
// Desde v2.0.0 se mide en tiempo real via divisor de tension en A0.
// Estos defines son solo el fallback si la lectura falla (ADC error).
#define BATTERY_LEVEL_DEFAULT        -1
#define BATTERY_VOLTAGE_DEFAULT      -1.0f
#define BATTERY_STATE_DEFAULT        "battery_only"
#define BATTERY_SOURCE_DEFAULT       "battery"
#define BATTERY_IS_ESTIMATED_DEFAULT  false


