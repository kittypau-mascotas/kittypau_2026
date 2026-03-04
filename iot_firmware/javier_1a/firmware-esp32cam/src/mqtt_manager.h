// mqtt_manager.h
#pragma once
#include <Arduino.h>

enum MqttEvent {
    MQTT_EVT_CONNECTED,
    MQTT_EVT_PUBLISHED,
    MQTT_EVT_CMD_RECEIVED
};

typedef void (*MqttEventHandler)(MqttEvent event);

void mqttManagerInit();
void mqttManagerLoop();
void mqttManagerPublishStatus(const char* payload);
void mqttManagerPublishSensorData(const char* payload);
bool isMqttConnected();
void mqttManagerSetEventHandler(MqttEventHandler handler);
