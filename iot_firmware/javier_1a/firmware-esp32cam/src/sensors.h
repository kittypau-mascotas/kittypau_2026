// sensors.h
#pragma once
#include <Arduino.h>

void sensorsInit();
String sensorsReadAndPublish();
void sensorsTareWeight();
void sensorsSetCalibrationFactor(float factor);
float loadCalibrationFactor();
void saveCalibrationFactor(float factor);
