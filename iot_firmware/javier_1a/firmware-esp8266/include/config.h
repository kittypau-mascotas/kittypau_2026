// config.h - Kittypau IoT
#pragma once

#define PROJECT_NAME "Kittypau"
#define FIRMWARE_VERSION "1.0.0"

// Pines para NodeMCU ESP8266
#define PIN_LED_STATUS LED_BUILTIN  // GPIO2 - LED integrado (lÃ³gica invertida)
#define PIN_HX711_DOUT 12           // D6 (GPIO12)
#define PIN_HX711_SCK  13           // D7 (GPIO13)
#define PIN_DHT        14           // D5 (GPIO14)
#define PIN_LDR        A0           // Ãšnico pin ADC en ESP8266

// Dispositivo
#define DEVICE_ID      "KPCL0034"
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

// Rangos y lÃ­mites de Sensores
#define MAX_WEIGHT_G    1000.0f   // Gramos
#define LIGHT_MIN_LUX   0.0f      // Lux mÃ­nimo para normalizaciÃ³n
#define LIGHT_MAX_LUX   1000.0f   // Lux mÃ¡ximo para normalizaciÃ³n
#define MAX_TEMP_C      100.0f    // Grados Celsius
#define MAX_HUMIDITY_PC 100.0f    // Porcentaje
#define ADC_MAX_VALUE   1023.0f   // Valor mÃ¡ximo del ADC en ESP8266 (10-bit)

// CalibraciÃ³n de Sensores
// Este valor es un punto de partida. Debes calibrarlo para tu celda de carga especÃ­fica.
// Procedimiento:
// 1. Descomenta el cÃ³digo de calibraciÃ³n en `sensors.cpp`.
// 2. Sube el firmware y abre el monitor serie.
// 3. Con la bÃ¡scula vacÃ­a, obtÃ©n la lectura del "Valor en bruto".
// 4. Coloca un objeto de peso conocido (ej. 100g) y obtÃ©n la nueva lectura.
// 5. Calcula: factor = (lectura_con_peso - lectura_sin_peso) / peso_conocido_en_gramos.
// 6. Coloca el factor calculado aquÃ­.
#define HX711_CALIBRATION_FACTOR 4301.0f
#define WEIGHT_DEADBAND          2.0f     // Cambio mÃ­nimo en gramos para reportar nuevo peso

// Archivo de calibraciÃ³n
#define CALIBRATION_FILE "/calibration.json"
#define TARE_FILE        "/tare.json"

// Telemetria de bateria (opcional)
// El bridge ya esta preparado para guardar estos campos cuando existan.
// Si el hardware no los mide, pueden quedar vacios o por defecto.
#define BATTERY_LEVEL_DEFAULT        -1
#define BATTERY_VOLTAGE_DEFAULT      -1.0f
#define BATTERY_STATE_DEFAULT        ""
#define BATTERY_SOURCE_DEFAULT       ""
#define BATTERY_IS_ESTIMATED_DEFAULT  false


