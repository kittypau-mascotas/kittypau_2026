// captive_portal.h
// Portal cautivo para configuración inicial de WiFi en modo AP
#pragma once

// Arranca el portal cautivo (AP KP-<deviceId>) y bloquea hasta que el usuario
// ingrese credenciales o expire el timeout (5 min). Siempre hace ESP.restart().
void startCaptivePortal(const char* deviceId);
