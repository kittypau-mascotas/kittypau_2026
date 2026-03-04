// config.h - Kittypau IoT (ESP32-CAM)
#pragma once

#define PROJECT_NAME    "Kittypau"
#define FIRMWARE_VERSION "1.0.0"

// ==================== DEVICE CONFIGURATION ====================
#define DEVICE_ID      "KPCL0040"
#define DEVICE_TYPE    "comedero_cam"           // Funcion: "comedero_cam", "bebedero_cam"
#define DEVICE_MODEL   "AI-Thinker ESP32-CAM"   // Modelo de placa electronica

// ==================== PIN DEFINITIONS (ESP32-CAM) ====================
// HX711 Load Cell (usando pines libres del ESP32-CAM)
#define PIN_HX711_DOUT 13
#define PIN_HX711_SCK  14

// DHT11 Temperature/Humidity Sensor
#define PIN_DHT        15

// LED Indicator (ESP32-CAM built-in red LED)
#define PIN_LED        33

// Flash LED (use with caution - high power)
#define PIN_FLASH_LED  4

// ==================== CAMERA CONFIGURATION (AI_THINKER ESP32-CAM) ====================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ==================== WiFi CONFIGURATION ====================
#define WIFI_SSID      "Casa 15"
#define WIFI_PASS      "mateo916"

// ==================== MQTT/HiveMQ Cloud CONFIGURATION ====================
#define MQTT_BROKER    "cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USER      "Kittypau1"
#define MQTT_PASS      "Kittypau1234"
#define MQTT_BUFFER_SIZE 1024

// Topics
#define TOPIC_STATUS   DEVICE_ID "/STATUS"
#define TOPIC_SENSORS  DEVICE_ID "/SENSORS"
#define TOPIC_CMD      DEVICE_ID "/cmd"
#define TOPIC_CAMERA   DEVICE_ID "/CAMERA"

// ==================== SENSOR LIMITS ====================
#define MAX_WEIGHT_G    1000.0f   // Gramos
#define MAX_TEMP_C      100.0f    // Grados Celsius
#define MAX_HUMIDITY_PC 100.0f    // Porcentaje

// ==================== HX711 CALIBRATION ====================
// Este valor es un punto de partida. Debes calibrarlo para tu celda de carga.
// Procedimiento:
// 1. Descomenta el codigo de calibracion en sensors.cpp
// 2. Sube el firmware y abre el monitor serie
// 3. Con la bascula vacia, obtén la lectura del "Valor en bruto"
// 4. Coloca un objeto de peso conocido (ej. 100g) y obtén la nueva lectura
// 5. Calcula: factor = (lectura_con_peso - lectura_sin_peso) / peso_conocido_en_gramos
// 6. Coloca el factor calculado aqui
#define HX711_CALIBRATION_FACTOR 4301.0f
#define WEIGHT_DEADBAND          2.0f     // Cambio minimo en gramos para reportar nuevo peso

// Archivo de calibracion
#define CALIBRATION_FILE "/calibration.json"

// ==================== CAMERA SETTINGS ====================
#define CAMERA_FRAME_SIZE FRAMESIZE_VGA  // 640x480
#define CAMERA_JPEG_QUALITY 12           // 0-63, lower = better quality
#define CAMERA_FB_COUNT 2                // Frame buffer count

// Web server ports
#define CAMERA_HTTP_PORT 80
#define CAMERA_STREAM_PORT 81
