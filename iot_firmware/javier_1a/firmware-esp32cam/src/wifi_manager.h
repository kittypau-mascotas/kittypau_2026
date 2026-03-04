// wifi_manager.h
#pragma once
#include <vector>
#include <Arduino.h>

void wifiManagerInit();
void wifiManagerLoop();
void wifiManagerAddSSID(const char* ssid, const char* pass);
bool isWifiConnected();
void printKnownNetworks();
void wifiManagerRemoveSSID(const char* ssid);

