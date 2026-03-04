// sensors.cpp
// Sensor management for ESP32-CAM (HX711 + DHT11, no LDR)

#include "sensors.h"
#include "config.h"
#include "mqtt_manager.h"
#include <HX711.h>
#include <DHT.h>
#include <algorithm>
#include <time.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

static HX711 scale;
static DHT dht(PIN_DHT, DHT11);
static float lastReportedWeight = 0.0f;  // Para deadband

void sensorsInit() {
    Serial.println("Inicializando sensores...");

    // Inicializar HX711 (celda de carga)
    scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);

    // Cargar factor de calibracion desde SPIFFS
    float calibration_factor = loadCalibrationFactor();
    scale.set_scale(calibration_factor);

    // Tarar la bascula al iniciar (con timeout)
    Serial.print("Esperando HX711...");
    unsigned long startTime = millis();
    while (!scale.is_ready() && (millis() - startTime < 3000)) {
        delay(100);
        Serial.print(".");
    }

    if (scale.is_ready()) {
        scale.tare();
        Serial.println("\nHX711 inicializado y tarado.");
    } else {
        Serial.println("\nAdvertencia: HX711 no detectado, continuando sin bascula.");
    }

    // Inicializar DHT11
    dht.begin();
    Serial.println("DHT11 inicializado.");

    Serial.println("Sensores listos.");
}

String sensorsReadAndPublish() {
    String sensor_health_status = "OK";

    // Crear documento JSON
    StaticJsonDocument<256> doc;

    // Timestamp
    time_t rawtime;
    struct tm * timeinfo;
    char timestamp_str[20];
    time(&rawtime);
    timeinfo = gmtime(&rawtime);
    strftime(timestamp_str, sizeof(timestamp_str), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
    doc["timestamp"] = timestamp_str;

    // --- Lectura HX711 (Peso) ---
    if (scale.is_ready()) {
        long raw_value = scale.get_value();
        Serial.print("Raw HX711 value: ");
        Serial.println(raw_value);

        float weight = scale.get_units(5);
        // Limitar rango y redondear a 3 decimales
        weight = std::max(0.0f, std::min(weight, MAX_WEIGHT_G));
        weight = roundf(weight * 1000.0f) / 1000.0f;
        // Filtro deadband: solo reportar si el cambio supera WEIGHT_DEADBAND
        if (fabs(weight - lastReportedWeight) >= WEIGHT_DEADBAND) {
            lastReportedWeight = weight;
        }
        doc["weight"] = lastReportedWeight;
    } else {
        sensor_health_status = "ERR_HX711";
        doc["weight"] = nullptr;
        Serial.println("Error: HX711 no esta listo");
    }

    // --- Lectura DHT11 (Temperatura y Humedad) ---
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    if (isnan(temp) || isnan(hum) || temp < -10.0f || temp > 120.0f || hum < 0.0f || hum > 100.0f) {
        if (sensor_health_status == "OK") {
            sensor_health_status = "ERR_DHT";
        }
        doc["temp"] = nullptr;
        doc["hum"] = nullptr;
        Serial.println("Error: Lectura DHT invalida");
    } else {
        // Redondear a 3 decimales
        doc["temp"] = roundf(temp * 1000.0f) / 1000.0f;
        doc["hum"] = roundf(hum * 1000.0f) / 1000.0f;
    }

    // Serializar y publicar
    char payload[256];
    serializeJson(doc, payload);
    mqttManagerPublishSensorData(payload);

    return sensor_health_status;
}

void sensorsTareWeight() {
    Serial.println("Calibrando bascula: Tarado...");
    scale.tare();
    Serial.println("Bascula tarada.");
}

void sensorsSetCalibrationFactor(float factor) {
    Serial.print("Estableciendo factor de calibracion: ");
    Serial.println(factor, 4);
    scale.set_scale(factor);
    saveCalibrationFactor(factor);
    Serial.println("Factor de calibracion guardado.");
}

float loadCalibrationFactor() {
    float factor = HX711_CALIBRATION_FACTOR;
    Serial.print("Cargando factor de calibracion desde ");
    Serial.println(CALIBRATION_FILE);

    if (SPIFFS.exists(CALIBRATION_FILE)) {
        Serial.println("Archivo de calibracion encontrado.");
        File file = SPIFFS.open(CALIBRATION_FILE, "r");
        if (file) {
            StaticJsonDocument<64> doc;
            DeserializationError error = deserializeJson(doc, file);
            if (!error && doc.containsKey("factor")) {
                factor = doc["factor"].as<float>();
                Serial.print("Factor cargado: ");
                Serial.println(factor, 4);
            } else {
                Serial.println("Error al parsear archivo de calibracion");
            }
            file.close();
        }
    } else {
        Serial.println("Archivo de calibracion no encontrado, usando valor por defecto.");
    }

    Serial.print("Factor de calibracion final: ");
    Serial.println(factor, 4);
    return factor;
}

void saveCalibrationFactor(float factor) {
    Serial.print("Guardando factor de calibracion: ");
    Serial.println(factor, 4);

    File file = SPIFFS.open(CALIBRATION_FILE, "w");
    if (file) {
        StaticJsonDocument<64> doc;
        doc["factor"] = factor;
        size_t bytesWritten = serializeJson(doc, file);
        Serial.print("Bytes escritos: ");
        Serial.println(bytesWritten);
        file.close();
    } else {
        Serial.println("Error: No se pudo abrir archivo para escritura");
    }
}
