// camera_manager.h
// Camera manager for ESP32-CAM with OV2640

#ifndef CAMERA_MANAGER_H
#define CAMERA_MANAGER_H

#include <Arduino.h>

// Inicializa la camara OV2640
bool cameraInit();

// Inicia el servidor web para streaming
void cameraStartServer();

// Procesa peticiones del servidor (llamar en loop)
void cameraLoop();

// Captura una imagen y la guarda en SPIFFS (para futuro uso)
bool cameraCaptureToFile(const char* filename);

// Obtiene el estado de la camara
bool isCameraReady();

// Obtiene la IP para el streaming
String getCameraStreamUrl();

#endif
