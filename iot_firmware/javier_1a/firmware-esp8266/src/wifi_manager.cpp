// wifi_manager.cpp
// GestiÃ³n de WiFi y credenciales usando LittleFS
#include "wifi_manager.h"
#include "config.h"
#include "led_indicator.h" // Incluir led_indicator para usar las funciones del LED
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <vector>

struct WifiCredential {
    String ssid;
    String pass;
};

#define WIFI_CRED_FILE "/wifi.json"
#define LAST_WIFI_FILE "/last_wifi.txt"
#define WIFI_CONNECT_TIMEOUT 12000  // 12 segundos para dar tiempo al router
#include <ArduinoJson.h>

static std::vector<WifiCredential> knownNetworks;
static bool wifiConnected = false;
static String lastSuccessfulSSID = "";

static void addDefaultNetworkUnique(const char* ssid, const char* pass) {
    for (const auto& cred : knownNetworks) {
        if (cred.ssid == ssid) return;
    }
    knownNetworks.push_back({ssid, pass});
}


void loadWifiCredentials() {
    knownNetworks.clear();

    // 1. Siempre cargar las redes hardcoded (garantiza conectividad base)
    addDefaultNetworkUnique(WIFI_SSID, WIFI_PASS);
    addDefaultNetworkUnique("Jeivos", "jdayne212");
    addDefaultNetworkUnique("Casa 15", "mateo916");
    addDefaultNetworkUnique("Suarez_Mujica_891", "SuarezMujica891");
    addDefaultNetworkUnique("Kittypau", "kittypau1234");
    addDefaultNetworkUnique("Mauro", "mauro1234");
    addDefaultNetworkUnique("VTR-2736410_2g", "wp8Fjtwyydhq");

    // 2. Mergear redes guardadas en LittleFS (agregadas via ADDWIFI)
    if (LittleFS.exists(WIFI_CRED_FILE)) {
        File f = LittleFS.open(WIFI_CRED_FILE, "r");
        if (f) {
            DynamicJsonDocument doc(512);
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
    DynamicJsonDocument doc(512);
    JsonArray arr = doc.to<JsonArray>();
    for (auto &cred : knownNetworks) {
        JsonObject obj = arr.createNestedObject();
        obj["ssid"] = cred.ssid;
        obj["pass"] = cred.pass;
    }
    File f = LittleFS.open(WIFI_CRED_FILE, "w");
    if (f) {
        serializeJson(doc, f);
        f.close();
    }
}

// Guardar Ãºltima red WiFi exitosa
void saveLastSuccessfulSSID(const String& ssid) {
    File f = LittleFS.open(LAST_WIFI_FILE, "w");
    if (f) {
        f.print(ssid);
        f.close();
    }
}

// Cargar Ãºltima red WiFi exitosa
String loadLastSuccessfulSSID() {
    if (!LittleFS.exists(LAST_WIFI_FILE)) return "";
    File f = LittleFS.open(LAST_WIFI_FILE, "r");
    if (!f) return "";
    String ssid = f.readString();
    f.close();
    ssid.trim();
    return ssid;
}

// Buscar credenciales por SSID
WifiCredential* findCredentialBySSID(const String& ssid) {
    for (auto &cred : knownNetworks) {
        if (cred.ssid == ssid) return &cred;
    }
    return nullptr;
}

// Intentar conectar a una red especÃ­fica
bool tryConnectToNetwork(const String& ssid, const String& pass) {
    Serial.print("Intentando conectar a: ");
    Serial.println(ssid);
    WiFi.disconnect(true);
    WiFi.begin(ssid.c_str(), pass.c_str());
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT) {
        handleLedIndicator();
        delay(100);  // Reducido de 500ms a 100ms para mejor respuesta
    }
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        lastSuccessfulSSID = ssid;
        saveLastSuccessfulSSID(ssid);
        Serial.print("Conectado a WiFi: ");
        Serial.println(ssid);
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        stopWifiBlink();
        return true;
    }
    Serial.print("Fallo al conectar a ");
    Serial.print(ssid);
    Serial.print(", Estado: ");
    Serial.println(WiFi.status());
    return false;
}

void wifiManagerInit() {
    LittleFS.begin();
    Serial.println("LittleFS iniciado.");
    loadWifiCredentials();
    lastSuccessfulSSID = loadLastSuccessfulSSID();
    printKnownNetworks();

    if (lastSuccessfulSSID.length() > 0) {
        Serial.print("Ãšltima red exitosa: ");
        Serial.println(lastSuccessfulSSID);
    }

    WiFi.mode(WIFI_STA);
    startWifiBlink();

    // 1. Si hay Ãºltima red exitosa, intentarla PRIMERO (sin escanear)
    if (lastSuccessfulSSID.length() > 0) {
        WifiCredential* lastCred = findCredentialBySSID(lastSuccessfulSSID);
        if (lastCred && tryConnectToNetwork(lastCred->ssid, lastCred->pass)) {
            return;  // Conectado a Ãºltima red exitosa
        }
    }

    // 2. Escanear redes disponibles
    Serial.println("Escaneando redes WiFi...");
    int numNetworks = WiFi.scanNetworks(false, false);  // No async, no hidden
    Serial.print("Redes encontradas: ");
    Serial.println(numNetworks);

    // 3. Intentar solo redes que estÃ¡n visibles Y conocidas
    for (int i = 0; i < numNetworks && !wifiConnected; i++) {
        String scannedSSID = WiFi.SSID(i);
        // Saltar la Ãºltima red exitosa (ya la intentamos)
        if (scannedSSID == lastSuccessfulSSID) continue;

        WifiCredential* cred = findCredentialBySSID(scannedSSID);
        if (cred) {
            Serial.print("Red conocida visible: ");
            Serial.println(scannedSSID);
            if (tryConnectToNetwork(cred->ssid, cred->pass)) {
                WiFi.scanDelete();
                return;  // Conectado
            }
        }
    }
    WiFi.scanDelete();

    // 4. Si aÃºn no conectado, mensaje final
    if (!wifiConnected) {
        Serial.println("No se pudo conectar a ninguna red WiFi visible.");
        stopWifiBlink();
    }
}

void wifiManagerLoop() {
    if (WiFi.status() != WL_CONNECTED) {
        if (wifiConnected) {
            wifiConnected = false;
            Serial.println("ConexiÃ³n WiFi perdida. Intentando reconectar...");
        }
        startWifiBlink();  // mantener parpadeo activo en cada reintento

        // Throttle: no reintentar mas rapido que cada 30s para no saturar el router
        static unsigned long lastReconnectAttempt = 0;
        if (millis() - lastReconnectAttempt < 30000 && lastReconnectAttempt != 0) {
            return;
        }
        lastReconnectAttempt = millis();

        // 1. Intentar Ãºltima red exitosa primero
        if (lastSuccessfulSSID.length() > 0) {
            WifiCredential* lastCred = findCredentialBySSID(lastSuccessfulSSID);
            if (lastCred && tryConnectToNetwork(lastCred->ssid, lastCred->pass)) {
                return;
            }
        }

        // 2. Escanear y reconectar a redes visibles conocidas
        int numNetworks = WiFi.scanNetworks(false, false);
        for (int i = 0; i < numNetworks && !wifiConnected; i++) {
            String scannedSSID = WiFi.SSID(i);
            if (scannedSSID == lastSuccessfulSSID) continue;

            WifiCredential* cred = findCredentialBySSID(scannedSSID);
            if (cred && tryConnectToNetwork(cred->ssid, cred->pass)) {
                WiFi.scanDelete();
                return;
            }
        }
        WiFi.scanDelete();

        if (!wifiConnected) {
            Serial.println("No se pudo reconectar a ninguna red.");
        }
    } else {
        if (!wifiConnected) {
            // ConexiÃ³n establecida (posiblemente tardÃ­a)
            wifiConnected = true;
            lastSuccessfulSSID = WiFi.SSID();
            saveLastSuccessfulSSID(lastSuccessfulSSID);
            Serial.print("WiFi conectado a: ");
            Serial.println(WiFi.SSID());
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            stopWifiBlink();
        }
    }
}

void wifiManagerAddSSID(const char* ssid, const char* pass) {
    // Agrega nueva red y guarda en LittleFS
    for (auto &cred : knownNetworks) {
        if (cred.ssid == ssid) return; // Ya existe
    }
    knownNetworks.push_back({ssid, pass});
    saveWifiCredentials();
}

void wifiManagerRemoveSSID(const char* ssidToRemove) {
    bool removed = false;
    // Use an iterator to safely remove elements
    for (auto it = knownNetworks.begin(); it != knownNetworks.end(); ) {
        if (it->ssid.equalsIgnoreCase(ssidToRemove)) { // Case-insensitive comparison
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
        saveWifiCredentials(); // Save changes to LittleFS
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
            Serial.print(cred.ssid);
            Serial.print(", PASS: ");
            Serial.println(cred.pass);
        }
    }
    Serial.println("--------------------------");
}





