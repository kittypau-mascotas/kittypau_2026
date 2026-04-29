
#include "sensors.h"
#include "config.h"
#include "mqtt_manager.h"
#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>
#include <HX711.h>
#include <algorithm>
#include <time.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

#ifdef USE_DHT11
  #include <DHT.h>
  static DHT dht(PIN_DHT, DHT11);
#else
  #include <Adafruit_AHTX0.h>
  static Adafruit_AHTX0 aht;
#endif

static HX711        scale;
static BH1750       lightMeter;
static bool         tempHumReady = false;
static bool         bh1750Ready  = false;

// Cache de la ultima lectura de bateria — leida por main.cpp via sensorsGetLastBattery()
static BatteryReading s_lastBattery = { -1, -1.0f, "battery_only" };
// EMA sobre voltaje — suaviza interferencia del radio WiFi en el ADC del ESP8266
static float s_emaVoltage = -1.0f;

// ── Clasificacion de luz ─────────────────────────────────────────────────────
static const char* classifyLight(float lux) {
    if (lux <  20)  return "dark";
    if (lux < 100)  return "dim";
    if (lux < 500)  return "normal";
    return "bright";
}

// ── Lectura de bateria (A0 + divisor de tension) ─────────────────────────────
// BATT_SAMPLES lecturas promediadas + EMA entre ciclos para reducir ruido ADC/WiFi.
BatteryReading sensorsReadBattery() {
    long raw_sum = 0;
    for (int i = 0; i < BATT_SAMPLES; i++) {
        raw_sum += analogRead(A0);
        delay(2);
        yield();
    }
    float adc_avg = (float)raw_sum / (float)BATT_SAMPLES;
    float v_pin   = (adc_avg / ADC_RESOLUTION) * ADC_VREF;
    float v_raw   = v_pin * ((float)(BATT_R1_KOHM + BATT_R2_KOHM) / (float)BATT_R2_KOHM);

    // EMA: primer arranque inicializa directo; luego suaviza
    if (s_emaVoltage < 0.0f) s_emaVoltage = v_raw;
    else s_emaVoltage = BATT_EMA_ALPHA * v_raw + (1.0f - BATT_EMA_ALPHA) * s_emaVoltage;

    float v_batt = roundf(s_emaVoltage * 100.0f) / 100.0f;
    int level = (int)(((s_emaVoltage - BATT_MIN_V) / (BATT_MAX_V - BATT_MIN_V)) * 100.0f);
    level = constrain(level, 0, 100);

    // TODO: deteccion de estado de carga requiere comparador externo (LM393)
    // El modulo HW-373 no baja el catodo a 0V — oscila entre 3V y 5V (incompatible con GPIO 3.3V)
    return { level, v_batt, "battery_only" };
}

BatteryReading sensorsGetLastBattery() {
    return s_lastBattery;
}

// ── Inicializacion ───────────────────────────────────────────────────────────
void sensorsInit() {
    // ── HX711 (celda de carga) ────────────────────────────────────────────────
    scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
    scale.set_scale(loadCalibrationFactor());

    yield();
    Serial.print("[HX711] Esperando sensor...");
    unsigned long t0 = millis();
    while (!scale.is_ready() && (millis() - t0 < 1500)) {
        delay(50);
        yield();
        Serial.print(".");
    }
    if (scale.is_ready()) {
        Serial.println(" listo!");
        long savedOffset = loadTareOffset();
        if (savedOffset != 0) {
            scale.set_offset(savedOffset);
            Serial.print("[HX711] Offset restaurado: "); Serial.println(savedOffset);
        } else {
            scale.tare();
            saveTareOffset(scale.get_offset());
            Serial.println("[HX711] Tarado (primer arranque).");
        }
    } else {
        Serial.println(" NO detectado!");
    }
    yield();

    // ── Bus I2C (SDA=D2/GPIO4, SCL=D1/GPIO5) ─────────────────────────────────
    Wire.begin();

    // ── Temperatura + humedad ────────────────────────────────────────────────
#ifdef USE_DHT11
    dht.begin();
    tempHumReady = true;
    Serial.println("[DHT11] Sensor iniciado (GPIO14).");
#else
    tempHumReady = aht.begin();
    if (tempHumReady) {
        Serial.println("[AHT10] Sensor iniciado.");
    } else {
        Serial.println("[AHT10] ERROR: no detectado en 0x38.");
    }
#endif

    // ── BH1750 (luz) ─────────────────────────────────────────────────────────
    bh1750Ready = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
    if (bh1750Ready) {
        Serial.println("[BH1750] Sensor iniciado (CONTINUOUS_HIGH_RES).");
    } else {
        Serial.println("[BH1750] ERROR: no detectado en 0x23.");
    }

    // ── A0 — divisor de tension (bateria) + pines TP4056 ────────────────────
    // A0 no requiere pinMode en ESP8266.
    // Pines CHRG/STDBY reservados para futura implementacion con comparador externo
    // pinMode(PIN_CHRG,  INPUT_PULLUP);
    // pinMode(PIN_STDBY, INPUT);
    Serial.printf("[BATT] Divisor R1=%dk R2=%dk | rango %.1f-%.1f V\n",
                  BATT_R1_KOHM, BATT_R2_KOHM, BATT_MIN_V, BATT_MAX_V);
    Serial.printf("[CHRG] Pines CHRG=D0(GPIO%d) STDBY=D3(GPIO%d)\n", PIN_CHRG, PIN_STDBY);
}

// ── Lectura y publicacion SENSORS ────────────────────────────────────────────
String sensorsReadAndPublish() {
    String health = "OK";

    StaticJsonDocument<384> doc;

    // Timestamp UTC
    time_t rawtime;
    struct tm* timeinfo;
    char ts[20];
    time(&rawtime);
    timeinfo = gmtime(&rawtime);
    strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
    doc["timestamp"] = ts;

    // ── HX711 (peso) ─────────────────────────────────────────────────────────
    yield();
    static float lastStableWeight = 0.0f;
    if (scale.is_ready()) {
        float w = scale.get_units(5);
        yield();
        w = std::max(0.0f, std::min(w, MAX_WEIGHT_G));
        if (fabsf(w - lastStableWeight) >= WEIGHT_DEADBAND) lastStableWeight = w;
        Serial.printf("[HX711] %.3f g\n", lastStableWeight);
        doc["weight"] = roundf(lastStableWeight * 1000.0f) / 1000.0f;
    } else {
        health = "ERR_HX711";
        doc["weight"] = nullptr;
    }

    // ── Temperatura + humedad ────────────────────────────────────────────────
    if (tempHumReady) {
#ifdef USE_DHT11
        float temp = dht.readTemperature();
        float hum  = dht.readHumidity();
        const char* sensorTag = "[DHT11]";
        const char* errTag    = "ERR_DHT11";
#else
        sensors_event_t humidity_evt, temp_evt;
        aht.getEvent(&humidity_evt, &temp_evt);
        float temp = temp_evt.temperature;
        float hum  = humidity_evt.relative_humidity;
        const char* sensorTag = "[AHT10]";
        const char* errTag    = "ERR_AHT10";
#endif
        if (isnan(temp) || isnan(hum) || temp < -40.0f || temp > 85.0f || hum < 0.0f || hum > 100.0f) {
            if (health == "OK") health = errTag;
            doc["temp"] = nullptr;
            doc["hum"]  = nullptr;
        } else {
            Serial.printf("%s %.2f C  %.2f %%\n", sensorTag, temp, hum);
            doc["temp"] = roundf(temp * 100.0f) / 100.0f;
            doc["hum"]  = roundf(hum  * 100.0f) / 100.0f;
        }
    } else {
#ifdef USE_DHT11
        if (health == "OK") health = "ERR_DHT11";
#else
        if (health == "OK") health = "ERR_AHT10";
#endif
        doc["temp"] = nullptr;
        doc["hum"]  = nullptr;
    }

    // ── BH1750 (luz) ─────────────────────────────────────────────────────────
    {
        JsonObject light = doc.createNestedObject("light");
        if (bh1750Ready) {
            float lux = lightMeter.readLightLevel();
            if (lux < 0) {
                if (health == "OK") health = "ERR_BH1750";
                light["lux"]       = nullptr;
                light["%"]         = nullptr;
                light["condition"] = nullptr;
            } else {
                lux = roundf(lux * 10.0f) / 10.0f;
                int pct = constrain((int)((lux / LIGHT_MAX_LUX) * 100.0f), 0, 100);
                Serial.printf("[BH1750] %.1f lux  %d%%  %s\n", lux, pct, classifyLight(lux));
                light["lux"]       = lux;
                light["%"]         = pct;
                light["condition"] = classifyLight(lux);
            }
        } else {
            if (health == "OK") health = "ERR_BH1750";
            light["lux"]       = nullptr;
            light["%"]         = nullptr;
            light["condition"] = nullptr;
        }
    }

    // ── A0 — bateria (divisor de tension) ────────────────────────────────────
    s_lastBattery = sensorsReadBattery();
    if (s_lastBattery.level >= 0) {
        Serial.printf("[BATT] %.2f V  %d%%  %s\n", s_lastBattery.voltage, s_lastBattery.level, s_lastBattery.state);
        doc["battery_level"]        = s_lastBattery.level;
        doc["battery_voltage"]      = s_lastBattery.voltage;
        doc["battery_state"]        = s_lastBattery.state;
        doc["battery_source"]       = "battery";
        doc["battery_is_estimated"] = false;
    }

    // ── Publicar ──────────────────────────────────────────────────────────────
    char payload[384];
    serializeJson(doc, payload);
    mqttManagerPublishSensorData(payload);

    return health;
}

// ── Tara ─────────────────────────────────────────────────────────────────────
void sensorsTareWeight() {
    yield();
    if (scale.is_ready()) {
        scale.tare();
        saveTareOffset(scale.get_offset());
        Serial.println("[HX711] Tarado y offset guardado.");
    } else {
        Serial.println("[HX711] Error: no esta listo.");
    }
    yield();
}

long sensorsGetRawValue(int times) {
    yield();
    return scale.get_value(times);
}

// ── Persistencia en LittleFS ─────────────────────────────────────────────────
long loadTareOffset() {
    if (!LittleFS.exists(TARE_FILE)) return 0;
    File f = LittleFS.open(TARE_FILE, "r");
    if (!f) return 0;
    DynamicJsonDocument doc(64);
    long offset = 0;
    if (!deserializeJson(doc, f) && doc.containsKey("offset")) {
        offset = doc["offset"].as<long>();
        Serial.print("[HX711] Offset cargado: "); Serial.println(offset);
    }
    f.close();
    return offset;
}

void saveTareOffset(long offset) {
    File f = LittleFS.open(TARE_FILE, "w");
    if (!f) { Serial.println("[HX711] Error guardando offset."); return; }
    DynamicJsonDocument doc(64);
    doc["offset"] = offset;
    serializeJson(doc, f);
    f.close();
    Serial.print("[HX711] Offset guardado: "); Serial.println(offset);
}

float loadCalibrationFactor() {
    float factor = HX711_CALIBRATION_FACTOR;
    if (LittleFS.exists(CALIBRATION_FILE)) {
        File f = LittleFS.open(CALIBRATION_FILE, "r");
        if (f) {
            DynamicJsonDocument doc(64);
            if (!deserializeJson(doc, f) && doc.containsKey("factor")) {
                factor = doc["factor"].as<float>();
                Serial.printf("[HX711] Factor cargado: %.4f\n", factor);
            }
            f.close();
        }
    } else {
        Serial.printf("[HX711] Factor por defecto: %.4f\n", factor);
    }
    return factor;
}

void saveCalibrationFactor(float factor) {
    File f = LittleFS.open(CALIBRATION_FILE, "w");
    if (!f) { Serial.println("[HX711] Error guardando factor."); return; }
    DynamicJsonDocument doc(64);
    doc["factor"] = factor;
    serializeJson(doc, f);
    f.close();
    Serial.printf("[HX711] Factor guardado: %.4f\n", factor);
}

void sensorsSetCalibrationFactor(float factor) {
    scale.set_scale(factor);
    saveCalibrationFactor(factor);
}
