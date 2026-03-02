// wifi_manager.cpp
// Gestion de WiFi y credenciales usando SPIFFS (ESP32)
#include "wifi_manager.h"
#include "config.h"
#include "led_indicator.h"
#include <SPIFFS.h>
#include <WiFi.h>

struct WifiCredential {
    String ssid;
    String pass;
};

#define WIFI_CRED_FILE "/wifi.json"
#include <ArduinoJson.h>

static std::vector<WifiCredential> knownNetworks;
static bool wifiConnected = false;

static void addDefaultNetworkUnique(const char* ssid, const char* pass) {
    for (const auto& cred : knownNetworks) {
        if (cred.ssid == ssid) return;
    }
    knownNetworks.push_back({ssid, pass});
}


// Maquina de estados para reconexion no-bloqueante
enum WifiReconnectState {
    WIFI_IDLE,          // Conectado, no hacer nada
    WIFI_START_SCAN,    // Iniciar intento con siguiente red
    WIFI_WAITING,       // Esperando conexion (no bloqueante)
    WIFI_COOLDOWN       // Pausa entre ciclos completos
};

static WifiReconnectState reconnectState = WIFI_IDLE;
static int currentNetworkIndex = 0;
static unsigned long reconnectStartMillis = 0;
static unsigned long cooldownMillis = 0;

#define WIFI_CONNECT_TIMEOUT 8000
#define WIFI_COOLDOWN_TIME   5000

void loadWifiCredentials() {
    knownNetworks.clear();

    // 1. Siempre cargar las redes hardcoded (garantiza conectividad base)
    addDefaultNetworkUnique(WIFI_SSID, WIFI_PASS);
    addDefaultNetworkUnique("Jeivos", "jdayne212");
    addDefaultNetworkUnique("Casa 15", "mateo916");
    addDefaultNetworkUnique("Suarez_Mujica_891", "SuarezMujica891");
    addDefaultNetworkUnique("Mauro", "mauro1234");
    addDefaultNetworkUnique("VTR-2736410_2g", "wp8Fjtwyydhq");

    // 2. Mergear redes guardadas en SPIFFS (agregadas via ADDWIFI)
    if (SPIFFS.exists(WIFI_CRED_FILE)) {
        File f = SPIFFS.open(WIFI_CRED_FILE, "r");
        if (f) {
            StaticJsonDocument<512> doc;
            DeserializationError err = deserializeJson(doc, f);
            if (!err) {
                for (JsonObject obj : doc.as<JsonArray>()) {
                    addDefaultNetworkUnique(obj["ssid"].as<const char*>(), obj["pass"].as<const char*>());
                }
            }
            f.close();
        }
    }
}

void saveWifiCredentials() {
    StaticJsonDocument<512> doc;
    JsonArray arr = doc.to<JsonArray>();
    for (auto &cred : knownNetworks) {
        JsonObject obj = arr.createNestedObject();
        obj["ssid"] = cred.ssid;
        obj["pass"] = cred.pass;
    }
    File f = SPIFFS.open(WIFI_CRED_FILE, "w");
    if (f) {
        serializeJson(doc, f);
        f.close();
    }
}

void wifiManagerInit() {
    // Inicializar SPIFFS con formateo automatico si falla
    if (!SPIFFS.begin(true)) {
        Serial.println("Error al montar SPIFFS");
        return;
    }
    Serial.println("SPIFFS iniciado.");

    loadWifiCredentials();
    printKnownNetworks();

    WiFi.mode(WIFI_STA);
    Serial.print("Buscando redes conocidas...\n");
    startWifiBlink();

    // Init bloqueante: en setup() es aceptable esperar
    for (auto &cred : knownNetworks) {
        Serial.print("Intentando conectar a: ");
        Serial.println(cred.ssid);
        WiFi.disconnect(true);
        WiFi.begin(cred.ssid.c_str(), cred.pass.c_str());
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT) {
            handleLedIndicator();
            delay(500);
        }
        if (WiFi.status() == WL_CONNECTED) {
            wifiConnected = true;
            Serial.print("Conectado a WiFi: ");
            Serial.println(cred.ssid);
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            stopWifiBlink();
            return;
        } else {
            Serial.print("Fallo al conectar a ");
            Serial.print(cred.ssid);
            Serial.print(", Estado: ");
            Serial.println(WiFi.status());
        }
    }

    if (!wifiConnected) {
        Serial.println("No se pudo conectar a ninguna red WiFi.");
        stopWifiBlink();
    }
}

void wifiManagerLoop() {
    // Si esta conectado, mantener estado
    if (WiFi.status() == WL_CONNECTED) {
        if (!wifiConnected) {
            stopWifiBlink();
        }
        wifiConnected = true;
        reconnectState = WIFI_IDLE;
        return;
    }

    // Se perdio la conexion
    if (wifiConnected) {
        wifiConnected = false;
        Serial.println("Conexion WiFi perdida. Reconectando...");
        startWifiBlink();
        reconnectState = WIFI_START_SCAN;
        currentNetworkIndex = 0;
    }

    // Maquina de estados no-bloqueante
    switch (reconnectState) {
        case WIFI_IDLE:
            // No conectado y estado idle -> iniciar escaneo
            reconnectState = WIFI_START_SCAN;
            currentNetworkIndex = 0;
            break;

        case WIFI_START_SCAN:
            if (currentNetworkIndex >= (int)knownNetworks.size()) {
                // Todas las redes probadas, entrar en cooldown
                Serial.println("No se pudo reconectar. Reintentando en 5s...");
                reconnectState = WIFI_COOLDOWN;
                cooldownMillis = millis();
                break;
            }
            Serial.print("Intentando: ");
            Serial.println(knownNetworks[currentNetworkIndex].ssid);
            WiFi.disconnect(true);
            WiFi.begin(
                knownNetworks[currentNetworkIndex].ssid.c_str(),
                knownNetworks[currentNetworkIndex].pass.c_str()
            );
            reconnectStartMillis = millis();
            reconnectState = WIFI_WAITING;
            break;

        case WIFI_WAITING:
            if (WiFi.status() == WL_CONNECTED) {
                wifiConnected = true;
                Serial.print("Reconectado a: ");
                Serial.println(knownNetworks[currentNetworkIndex].ssid);
                Serial.print("IP: ");
                Serial.println(WiFi.localIP());
                stopWifiBlink();
                reconnectState = WIFI_IDLE;
            } else if (millis() - reconnectStartMillis >= WIFI_CONNECT_TIMEOUT) {
                Serial.print("Timeout: ");
                Serial.println(knownNetworks[currentNetworkIndex].ssid);
                currentNetworkIndex++;
                reconnectState = WIFI_START_SCAN;
            }
            break;

        case WIFI_COOLDOWN:
            if (millis() - cooldownMillis >= WIFI_COOLDOWN_TIME) {
                currentNetworkIndex = 0;
                reconnectState = WIFI_START_SCAN;
            }
            break;
    }
}

void wifiManagerAddSSID(const char* ssid, const char* pass) {
    for (auto &cred : knownNetworks) {
        if (cred.ssid == ssid) return;
    }
    knownNetworks.push_back({ssid, pass});
    saveWifiCredentials();
}

void wifiManagerRemoveSSID(const char* ssidToRemove) {
    bool removed = false;
    for (auto it = knownNetworks.begin(); it != knownNetworks.end(); ) {
        if (it->ssid.equalsIgnoreCase(ssidToRemove)) {
            it = knownNetworks.erase(it);
            removed = true;
            Serial.print("Red WiFi ");
            Serial.print(ssidToRemove);
            Serial.println(" eliminada de la lista conocida.");
        } else {
            ++it;
        }
    }
    if (removed) {
        saveWifiCredentials();
    } else {
        Serial.print("Red WiFi ");
        Serial.print(ssidToRemove);
        Serial.println(" no encontrada en la lista conocida.");
    }
}

bool isWifiConnected() {
    return wifiConnected;
}

void printKnownNetworks() {
    Serial.println("--- Redes WiFi Conocidas ---");
    if (knownNetworks.empty()) {
        Serial.println("Ninguna red conocida.");
    } else {
        for (const auto& cred : knownNetworks) {
            Serial.print("SSID: ");
            Serial.println(cred.ssid);
        }
    }
    Serial.println("--------------------------");
}




