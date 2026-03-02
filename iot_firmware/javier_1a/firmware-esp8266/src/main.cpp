#include "config.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include "wifi_manager.h"
#include "mqtt_manager.h"
#include "sensors.h"
#include "led_indicator.h"
#include <ArduinoOTA.h>

// Intervalos de publicación (en milisegundos)
#define SENSOR_PUBLISH_INTERVAL 10000  // Datos cada 10 segundos
#define STATUS_PUBLISH_INTERVAL 15000  // Estado cada 15 segundos

// Timers
static unsigned long lastSensorPublishTime = 0;
static unsigned long lastStatusPublishTime = 0;

// Estado de sensores y lógica Online/Offline con debounce
static String last_sensor_health = "Initializing";
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
        // Condiciones OK → Online inmediato
        deviceOnline = true;
        lastOnlineTime = now;
    } else if (deviceOnline && (now - lastOnlineTime > OFFLINE_GRACE_PERIOD)) {
        // Solo pasar a Offline tras 30s sostenidos sin conexión
        deviceOnline = false;
    }
    // Si deviceOnline==true y aún dentro del grace period, se mantiene Online
}

void publishDeviceStatus() {
    updateDeviceOnlineState();

    bool wifiOk = isWifiConnected();
    const char* wifi_status_str = wifiOk ? "Conectado" : "Desconectado";
    const char* device_status_str = deviceOnline ? "Online" : "Offline";

    // Crear el payload JSON
    StaticJsonDocument<320> doc;
    doc["wifi_status"] = wifi_status_str;
    doc["wifi_ssid"] = wifiOk ? WiFi.SSID() : "";
    doc["wifi_ip"] = wifiOk ? WiFi.localIP().toString() : "";
    doc[DEVICE_ID] = device_status_str;
    doc["sensor_health"] = last_sensor_health;
    doc["device_type"] = DEVICE_TYPE;
    doc["device_model"] = DEVICE_MODEL;

    char payload[320];
    serializeJson(doc, payload);

    // Publicar el estado
    mqttManagerPublishStatus(payload);
}


// Callback de eventos MQTT → LED
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
  delay(300);  // Reducido de 1000ms para arranque más rápido
  Serial.println("Serial initialized. Setup starting...");

  Serial.println("Initializing LittleFS...");
  if (!LittleFS.begin()) {
    Serial.println("Falló el montaje de LittleFS");
    return;
  }
  Serial.println("LittleFS iniciado.");

  Serial.println("\n========== Kittypau IoT ==========");
  Serial.println("[" DEVICE_ID "] Initializing...");

  ledIndicatorInit();

  // 1. Conectar a WiFi
  wifiManagerInit();

  // 2. Iniciar el gestor de MQTT (carga certificados, etc.)
  mqttManagerInit();
  mqttManagerSetEventHandler(onMqttEvent);

  // 3. OTA
  ArduinoOTA.setHostname(DEVICE_ID);
  ArduinoOTA.onStart([]() { Serial.println("[OTA] Iniciando..."); });
  ArduinoOTA.onEnd([]() { Serial.println("[OTA] Completo."); });
  ArduinoOTA.onError([](ota_error_t error) { Serial.printf("[OTA] Error[%u]\n", error); });
  ArduinoOTA.begin();
  Serial.println("[OTA] Listo.");

  // 4. Iniciar los sensores
  sensorsInit();

  Serial.println("[" DEVICE_ID "] Initialization complete.");
}

void loop() {
  unsigned long now = millis();

  // OTA
  ArduinoOTA.handle();

  // Mantener la conexión WiFi
  wifiManagerLoop();

  // Actualizar el estado del parpadeo del LED
  handleLedIndicator();

  // Mantener la conexión MQTT y procesar mensajes entrantes
  mqttManagerLoop();

  // Publicar datos de sensores periódicamente
  if (now - lastSensorPublishTime > SENSOR_PUBLISH_INTERVAL) {
    lastSensorPublishTime = now;
    last_sensor_health = sensorsReadAndPublish(); // Capturar el estado de los sensores
    if (isMqttConnected()) {
      hasPublishedOnce = true;
    }
  }

  // Publicar estado del dispositivo periódicamente
  if (now - lastStatusPublishTime > STATUS_PUBLISH_INTERVAL) {
    lastStatusPublishTime = now;
    if (isMqttConnected()) { // Solo intentar publicar si hay conexión
      publishDeviceStatus();
    }
  }
}