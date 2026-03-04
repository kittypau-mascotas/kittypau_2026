// main.cpp
// KittyPaw - ESP32-CAM with sensors, camera streaming, and OTA
// v1.1: ArduinoOTA, Online/Offline debounce, STATUS completo, event handler

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include "config.h"
#include "wifi_manager.h"
#include "mqtt_manager.h"
#include "sensors.h"
#include "led_indicator.h"
#include "camera_manager.h"

// Intervalos de publicacion (milisegundos)
#define SENSOR_PUBLISH_INTERVAL 10000  // Datos cada 10 segundos
#define STATUS_PUBLISH_INTERVAL 15000  // Estado cada 15 segundos

// Timers
static unsigned long lastSensorPublishTime = 0;
static unsigned long lastStatusPublishTime = 0;

// Estado del sistema
static String last_sensor_health = "Initializing";
static bool cameraOk = false;

// Flag para pausar tareas durante OTA
static volatile bool otaInProgress = false;

// Online/Offline con debounce
static bool hasPublishedOnce = false;
static bool deviceOnline = false;
static unsigned long lastOnlineTime = 0;
#define OFFLINE_GRACE_PERIOD 15000  // 15s de gracia antes de declarar Offline

// Actualizar estado Online/Offline con debounce
void updateDeviceOnlineState() {
    bool wifiOk = isWifiConnected();
    bool mqttOk = isMqttConnected();
    unsigned long now = millis();

    if (wifiOk && mqttOk && hasPublishedOnce) {
        deviceOnline = true;
        lastOnlineTime = now;
    } else if (deviceOnline && (now - lastOnlineTime > OFFLINE_GRACE_PERIOD)) {
        deviceOnline = false;
    }
}

// Publica el estado detallado del dispositivo
void publishDeviceStatus() {
    updateDeviceOnlineState();

    bool wifiOk = isWifiConnected();
    const char* wifi_status_str = wifiOk ? "Conectado" : "Desconectado";
    const char* device_status_str = deviceOnline ? "Online" : "Offline";

    // Crear payload JSON
    StaticJsonDocument<384> doc;
    doc["wifi_status"] = wifi_status_str;
    doc["wifi_ssid"] = wifiOk ? WiFi.SSID() : "";
    doc["wifi_ip"] = wifiOk ? WiFi.localIP().toString() : "";
    doc[DEVICE_ID] = device_status_str;
    doc["sensor_health"] = last_sensor_health;
    doc["device_type"] = DEVICE_TYPE;
    doc["device_model"] = DEVICE_MODEL;
    doc["camera_status"] = cameraOk ? "OK" : "ERROR";

    // Agregar URL de streaming si esta disponible
    if (cameraOk && wifiOk) {
        doc["stream_url"] = getCameraStreamUrl();
    }

    char payload[384];
    serializeJson(doc, payload);

    mqttManagerPublishStatus(payload);
}

// Callback de eventos MQTT -> LED
void onMqttEvent(MqttEvent event) {
    switch (event) {
        case MQTT_EVT_CONNECTED:
        case MQTT_EVT_CMD_RECEIVED:
            blinkLED(2, 100);
            break;
        case MQTT_EVT_PUBLISHED:
            blinkLED(1, 100);
            break;
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n========================================");
    Serial.printf("  %s - %s [%s]\n", PROJECT_NAME, DEVICE_ID, DEVICE_TYPE);
    Serial.printf("  Firmware v%s\n", FIRMWARE_VERSION);
    Serial.println("========================================");
    Serial.println("Iniciando sistema...\n");

    // 1. Inicializar indicador LED
    ledIndicatorInit();

    // 2. Conectar a WiFi
    Serial.println("[1/6] Conectando a WiFi...");
    wifiManagerInit();

    // 3. Inicializar MQTT
    Serial.println("[2/6] Inicializando MQTT...");
    mqttManagerInit();
    mqttManagerSetEventHandler(onMqttEvent);

    // 4. OTA
    Serial.println("[3/6] Configurando OTA...");
    ArduinoOTA.setHostname(DEVICE_ID);
    ArduinoOTA.onStart([]() {
        Serial.println("[OTA] Iniciando... (pausando MQTT y sensores)");
        otaInProgress = true;
    });
    ArduinoOTA.onEnd([]() {
        Serial.println("[OTA] Completo.");
        otaInProgress = false;
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("[OTA] Progreso: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) { Serial.printf("[OTA] Error[%u]\n", error); });
    ArduinoOTA.begin();
    Serial.println("[OTA] Listo.");

    // 5. Inicializar sensores
    Serial.println("[4/6] Inicializando sensores...");
    sensorsInit();

    // 6. Inicializar camara
    Serial.println("[5/6] Inicializando camara...");
    cameraOk = cameraInit();

    // 7. Iniciar servidor de streaming (si la camara esta OK)
    Serial.println("[6/6] Iniciando servidor de streaming...");
    if (cameraOk) {
        cameraStartServer();
    } else {
        Serial.println("Advertencia: Camara no disponible, streaming deshabilitado");
    }

    Serial.println("\n========================================");
    Serial.println("  Inicializacion completada");
    Serial.println("========================================");
    if (isWifiConnected()) {
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        if (cameraOk) {
            Serial.print("Stream: http://");
            Serial.print(WiFi.localIP());
            Serial.println("/stream");
        }
    }
    Serial.println("========================================\n");
}

void loop() {
    unsigned long now = millis();

    // OTA (siempre activo, prioridad maxima)
    ArduinoOTA.handle();

    // Durante OTA, solo manejar OTA y WiFi
    if (otaInProgress) return;

    // Mantener conexion WiFi
    wifiManagerLoop();

    // Actualizar parpadeo LED
    handleLedIndicator();

    // Mantener conexion MQTT
    mqttManagerLoop();

    // Publicar datos de sensores periodicamente
    if (now - lastSensorPublishTime > SENSOR_PUBLISH_INTERVAL) {
        lastSensorPublishTime = now;
        last_sensor_health = sensorsReadAndPublish();

        if (isMqttConnected()) {
            hasPublishedOnce = true;
        }
    }

    // Publicar estado del dispositivo periodicamente
    if (now - lastStatusPublishTime > STATUS_PUBLISH_INTERVAL) {
        lastStatusPublishTime = now;
        if (isMqttConnected()) {
            publishDeviceStatus();
        }
    }
}
