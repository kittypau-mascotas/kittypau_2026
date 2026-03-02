// mqtt_manager.cpp
// MQTT Manager for ESP32 with HiveMQ Cloud using native WiFiClientSecure
// v1.1: Backoff exponencial, event handler desacoplado, NTP Chile

#include "mqtt_manager.h"
#include "config.h"
#include "wifi_manager.h"
#include "sensors.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
#include <ArduinoJson.h>

// ESP32 native WiFiClientSecure
WiFiClientSecure net;
PubSubClient mqttClient(net);

static bool mqttConnected = false;
static bool timeSynchronized = false;

// Event handler para desacoplar notificaciones (LED, etc.)
static MqttEventHandler eventHandler = nullptr;

void mqttManagerSetEventHandler(MqttEventHandler handler) {
    eventHandler = handler;
}

static void notifyEvent(MqttEvent event) {
    if (eventHandler) eventHandler(event);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String t = String(topic);
    if (t.endsWith("/cmd")) {
        Serial.println("Comando MQTT recibido.");
        notifyEvent(MQTT_EVT_CMD_RECEIVED);

        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, payload, length);

        if (error) {
            Serial.print("deserializeJson() fallo: ");
            Serial.println(error.c_str());
            return;
        }

        const char* command = doc["command"];
        if (command && strcmp(command, "ADDWIFI") == 0) {
            const char* ssid = doc["ssid"];
            const char* pass = doc["pass"];

            if (ssid && pass) {
                Serial.print("Anadiendo nueva red WiFi: ");
                Serial.println(ssid);
                wifiManagerAddSSID(ssid, pass);
            } else {
                Serial.println("Error: Faltan 'ssid' o 'pass' en el comando ADDWIFI.");
            }
        } else if (command && strcmp(command, "CALIBRATE_WEIGHT") == 0) {
            const char* action = doc["action"];
            if (action) {
                if (strcmp(action, "tare") == 0) {
                    Serial.println("Comando CALIBRATE_WEIGHT: TARE.");
                    sensorsTareWeight();
                } else if (strcmp(action, "set_scale") == 0) {
                    float factor = doc["factor"];
                    if (factor != 0) {
                        Serial.print("Comando CALIBRATE_WEIGHT: SET_SCALE con factor ");
                        Serial.println(factor);
                        sensorsSetCalibrationFactor(factor);
                    } else {
                        Serial.println("Error: CALIBRATE_WEIGHT SET_SCALE requiere 'factor'.");
                    }
                } else {
                    Serial.print("Error: Accion desconocida para CALIBRATE_WEIGHT: ");
                    Serial.println(action);
                }
            } else {
                Serial.println("Error: CALIBRATE_WEIGHT requiere 'action'.");
            }
        } else if (command && strcmp(command, "REMOVEWIFI") == 0) {
            const char* ssid = doc["ssid"];
            if (ssid) {
                Serial.print("Comando REMOVEWIFI: Eliminando red WiFi ");
                Serial.println(ssid);
                wifiManagerRemoveSSID(ssid);
            } else {
                Serial.println("Error: REMOVEWIFI requiere 'ssid'.");
            }
        } else {
            Serial.println("Comando desconocido o no especificado.");
        }
    }
}

void mqttManagerInit() {
    // HiveMQ Cloud usa TLS con autenticacion por usuario/contraseña
    // setInsecure() permite TLS sin verificar el certificado del servidor
    net.setInsecure();

    // Configurar cliente MQTT con buffer mas grande
    mqttClient.setBufferSize(MQTT_BUFFER_SIZE);
    mqttClient.setSocketTimeout(30);
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    Serial.println("MQTT Manager inicializado para HiveMQ Cloud");
    Serial.print("  Broker: ");
    Serial.println(MQTT_BROKER);
    Serial.print("  Puerto: ");
    Serial.println(MQTT_PORT);
}

void reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) return;

    // Sincronizar hora por NTP (requerido para validacion de certificados)
    if (!timeSynchronized) {
        Serial.print("Sincronizando hora con NTP...");
        // Zona horaria Chile: CLT (UTC-4) con horario de verano CLST (UTC-3)
        configTzTime("CLT4CLST,M9.1.6/24,M4.1.6/24", "pool.ntp.org", "time.nist.gov");

        time_t now = time(nullptr);
        int attempts = 0;
        while (now < 1510644967 && attempts < 20) {
            delay(500);
            now = time(nullptr);
            Serial.print(".");
            attempts++;
        }

        if (now >= 1510644967) {
            Serial.println("\nHora sincronizada.");
            struct tm timeinfo;
            localtime_r(&now, &timeinfo);
            Serial.print("Hora actual (Chile): ");
            Serial.print(asctime(&timeinfo));
            timeSynchronized = true;
        } else {
            Serial.println("\nAdvertencia: No se pudo sincronizar la hora NTP");
            timeSynchronized = true;  // Marcar como hecho para no bloquear
        }
    }

    // Si ya esta conectado, no hacer nada
    if (mqttClient.connected()) return;

    // Reintentos con backoff exponencial (no-bloqueante)
    static int mqtt_retries = 0;
    static unsigned long lastMqttAttempt = 0;
    static unsigned long retryInterval = 5000;

    if (millis() - lastMqttAttempt < retryInterval && lastMqttAttempt != 0) {
        return;
    }
    lastMqttAttempt = millis();

    if (WiFi.status() != WL_CONNECTED) return;

    Serial.print("Intentando conexion MQTT... (Backoff: ");
    Serial.print(retryInterval / 1000);
    Serial.println("s)");

    String clientId = DEVICE_ID;
    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
        Serial.println("Conectado!");
        mqtt_retries = 0;
        retryInterval = 5000;  // Reset backoff
        mqttConnected = true;
        mqttClient.subscribe(TOPIC_CMD);
        notifyEvent(MQTT_EVT_CONNECTED);
        Serial.print("Suscrito a: ");
        Serial.println(TOPIC_CMD);
    } else {
        mqtt_retries++;
        Serial.print(" Fallo, rc=");
        Serial.print(mqttClient.state());
        Serial.print(" (Intento ");
        Serial.print(mqtt_retries);
        Serial.println(")");

        // Diagnostico de errores comunes
        switch (mqttClient.state()) {
            case -4: Serial.println("  -> MQTT_CONNECTION_TIMEOUT"); break;
            case -3: Serial.println("  -> MQTT_CONNECTION_LOST"); break;
            case -2: Serial.println("  -> MQTT_CONNECT_FAILED"); break;
            case -1: Serial.println("  -> MQTT_DISCONNECTED"); break;
            case 1: Serial.println("  -> MQTT_CONNECT_BAD_PROTOCOL"); break;
            case 2: Serial.println("  -> MQTT_CONNECT_BAD_CLIENT_ID"); break;
            case 3: Serial.println("  -> MQTT_CONNECT_UNAVAILABLE"); break;
            case 4: Serial.println("  -> MQTT_CONNECT_BAD_CREDENTIALS"); break;
            case 5: Serial.println("  -> MQTT_CONNECT_UNAUTHORIZED"); break;
        }

        // Backoff exponencial: 5s -> 10s -> 20s -> 40s -> max 60s
        retryInterval = min((unsigned long)60000, retryInterval * 2);

        if (mqtt_retries >= 5) {
            Serial.println("Fallo persistente. Forzando reconexion WiFi...");
            WiFi.disconnect();
            mqtt_retries = 0;
            retryInterval = 5000;
        }
    }
}

void mqttManagerLoop() {
    if (!mqttClient.connected()) {
        mqttConnected = false;
        reconnectMQTT();
    }
    mqttClient.loop();
}

void mqttManagerPublishStatus(const char* payload) {
    if (mqttClient.connected()) {
        Serial.print(TOPIC_STATUS);
        Serial.print(": ");
        Serial.println(payload);
        mqttClient.publish(TOPIC_STATUS, payload, true);
        notifyEvent(MQTT_EVT_PUBLISHED);
    }
}

void mqttManagerPublishSensorData(const char* payload) {
    if (mqttClient.connected()) {
        Serial.print(TOPIC_SENSORS);
        Serial.print(": ");
        Serial.println(payload);
        mqttClient.publish(TOPIC_SENSORS, payload, false);
        notifyEvent(MQTT_EVT_PUBLISHED);
    }
}

bool isMqttConnected() {
    return mqttClient.connected();
}
