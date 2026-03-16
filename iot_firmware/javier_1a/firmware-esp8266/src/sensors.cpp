
#include "sensors.h"
#include "config.h"
#include "mqtt_manager.h"
#include <Arduino.h>  // Para yield()
#include <HX711.h>
#include <DHT.h>
#include <algorithm> // Para std::min y std::max
#include <time.h>    // Para time(nullptr)
#include <LittleFS.h>  // Added for calibration persistence
#include <ArduinoJson.h> // Added for calibration persistence

static HX711 scale;
static DHT dht(PIN_DHT, DHT11);

// Helper para clasificar la condición de luz
const char* classifyLight(float lux) {
  if (lux < 20) return "dark";
  if (lux < 100) return "dim";
  if (lux < 500) return "normal";
  return "bright";
}

void sensorsInit() {
    scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);

    // --- CALIBRACIÓN DE LA BÁSCULA ---
    // 1. Carga y fija el factor de escala desde LittleFS
    float calibration_factor = loadCalibrationFactor();
    scale.set_scale(calibration_factor);

    // 2. Pone la báscula a cero (tara) al iniciar - solo si está lista
    yield();  // Alimentar watchdog
    Serial.print("Esperando HX711...");

    // Esperar hasta 1.5 segundos a que el HX711 esté listo (optimizado)
    unsigned long startWait = millis();
    while (!scale.is_ready() && (millis() - startWait < 1500)) {
        delay(50);
        yield();
        Serial.print(".");
    }

    if (scale.is_ready()) {
        Serial.println(" listo!");
        scale.tare();
        Serial.println("Báscula tarada.");
    } else {
        Serial.println(" NO detectado! Continuando sin tara.");
    }
    yield();

    dht.begin();
    // Nota: En ESP8266, A0 no necesita pinMode
}

String sensorsReadAndPublish() {
    String sensor_health_status = "OK";
    
    // Crear el documento JSON principal
    StaticJsonDocument<256> doc;

    // Timestamp
    time_t rawtime;
    struct tm * timeinfo;
    char timestamp_str[20];
    time(&rawtime);
    timeinfo = gmtime(&rawtime);
    strftime(timestamp_str, sizeof(timestamp_str), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
    doc["timestamp"] = timestamp_str;

    // --- Lectura de Sensores ---
    // HX711 (Peso)
    yield();  // Alimentar watchdog antes de lectura
    static float lastStableWeight = 0.0f;
    if (scale.is_ready()) {
        float weight = scale.get_units(5);  // 5 muestras para mayor estabilidad
        yield();  // Alimentar watchdog después de lectura
        weight = std::max(0.0f, std::min(weight, MAX_WEIGHT_G));

        // Deadband: ignorar cambios menores al umbral (anti-drift en batería)
        float diff = weight - lastStableWeight;
        if (diff < 0) diff = -diff;
        if (diff >= WEIGHT_DEADBAND) {
            lastStableWeight = weight;
        }

        Serial.print("Weight: ");
        Serial.println(lastStableWeight);
        doc["weight"] = roundf(lastStableWeight * 1000.0f) / 1000.0f;
    } else {
        sensor_health_status = "ERR_HX711";
        doc["weight"] = nullptr;
    }

    // DHT (Temperatura y Humedad)
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum) || temp < -10.0f || temp > 120.0f || hum < 0.0f || hum > 100.0f) {
        if (sensor_health_status == "OK") {
            sensor_health_status = "ERR_DHT";
        }
        doc["temp"] = nullptr;
        doc["hum"] = nullptr;
    } else {
        // Limitar a 3 decimales
        doc["temp"] = roundf(temp * 1000.0f) / 1000.0f;
        doc["hum"] = roundf(hum * 1000.0f) / 1000.0f;
    }

    // LDR (Luz)
    float ldr_raw = analogRead(PIN_LDR);
    // Aproximación lineal a Lux. Para mayor precisión, se necesitaría una curva de calibración.
    float lux = (ldr_raw / ADC_MAX_VALUE) * LIGHT_MAX_LUX;
    // Limitar a 3 decimales
    lux = roundf(std::max(LIGHT_MIN_LUX, std::min(lux, LIGHT_MAX_LUX)) * 1000.0f) / 1000.0f;
    
    // Normalización a porcentaje
    int percentage = map(lux, LIGHT_MIN_LUX, LIGHT_MAX_LUX, 0, 100);
    percentage = constrain(percentage, 0, 100);

    // Clasificación
    const char* condition = classifyLight(lux);

    // Crear objeto anidado para la luz
    JsonObject light = doc.createNestedObject("light");
    light["lux"] = lux;
    light["%"] = percentage;
    light["condition"] = condition;
  

    // Serializar y publicar
    char payload[256];
    serializeJson(doc, payload);
    mqttManagerPublishSensorData(payload);

    return sensor_health_status;
}

void sensorsTareWeight() {
    Serial.println("Calibrando báscula: Taring...");
    yield();
    if (scale.is_ready()) {
        scale.tare();
        Serial.println("Báscula tarada.");
    } else {
        Serial.println("Error: HX711 no está listo.");
    }
    yield();
}

long sensorsGetRawValue(int times) {
    yield();
    return scale.get_value(times);
}

void sensorsSetCalibrationFactor(float factor) {
    Serial.print("Calibrando báscula: Estableciendo factor de escala a ");
    Serial.println(factor);
    scale.set_scale(factor);
    Serial.println("Factor de escala establecido.");
    saveCalibrationFactor(factor); // Save to LittleFS
}

float loadCalibrationFactor() {
    float factor = HX711_CALIBRATION_FACTOR; // Default factor from config.h
    Serial.print("Intentando cargar factor de calibración desde ");
    Serial.println(CALIBRATION_FILE);

    if (LittleFS.exists(CALIBRATION_FILE)) {
        Serial.println("Archivo de calibración encontrado.");
        File file = LittleFS.open(CALIBRATION_FILE, "r");
        if (file) {
            Serial.print("Tamaño del archivo de calibración: ");
            Serial.println(file.size());
            DynamicJsonDocument doc(64);
            DeserializationError error = deserializeJson(doc, file);
            if (!error) {
                if (doc.containsKey("factor")) {
                    factor = doc["factor"].as<float>();
                    Serial.print("Factor de calibración cargado exitosamente de LittleFS: ");
                    Serial.println(factor, 4); // Print with 4 decimal places
                } else {
                    Serial.println("Error: Archivo de calibración no contiene la clave 'factor'.");
                }
            } else {
                Serial.print("Error al parsear archivo de calibración (deserializeJson): ");
                Serial.println(error.c_str());
            }
            file.close();
        } else {
            Serial.println("Error: No se pudo abrir el archivo de calibración para lectura.");
        }
    } else {
        Serial.println("Archivo de calibración NO encontrado, usando factor por defecto.");
    }
    Serial.print("Factor de calibración final: ");
    Serial.println(factor, 4);
    return factor;
}

void saveCalibrationFactor(float factor) {
    Serial.print("Intentando guardar factor de calibración: ");
    Serial.println(factor, 4);
    File file = LittleFS.open(CALIBRATION_FILE, "w");
    if (file) {
        DynamicJsonDocument doc(64);
        doc["factor"] = factor;
        Serial.print("Serializando JSON para guardar...");
        size_t bytesWritten = serializeJson(doc, file);
        if (bytesWritten == 0) {
            Serial.println("Error al escribir el archivo de calibración (serializeJson devolvió 0).");
        } else {
            Serial.print("Factor de calibración guardado en LittleFS. Bytes escritos: ");
            Serial.println(bytesWritten);
        }
        file.close();
    } else {
        Serial.println("Error: No se pudo abrir el archivo de calibración para escritura.");
    }
}
