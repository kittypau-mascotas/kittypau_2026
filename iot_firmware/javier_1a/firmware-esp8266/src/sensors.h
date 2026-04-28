// sensors.h
#pragma once
#include <Arduino.h>

// Lectura de bateria medida via divisor de tension en A0
struct BatteryReading {
    int         level;    // porcentaje 0-100, o -1 si la lectura fallo
    float       voltage;  // tension en voltios, o -1.0f si la lectura fallo
    const char* state;    // "charging" | "charged" | "battery_only"
};

void sensorsInit();
String sensorsReadAndPublish();
void sensorsTareWeight();
void sensorsSetCalibrationFactor(float factor);
float loadCalibrationFactor();
void saveCalibrationFactor(float factor);
long loadTareOffset();
void saveTareOffset(long offset);
long sensorsGetRawValue(int times = 10);

// Retorna la ultima lectura de bateria medida en sensorsReadAndPublish()
BatteryReading sensorsGetLastBattery();
