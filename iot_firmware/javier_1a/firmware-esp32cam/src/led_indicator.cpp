// led_indicator.cpp
// LED indicator for ESP32-CAM (using GPIO 33 - red LED)

#include "led_indicator.h"
#include "config.h"
#include <Arduino.h>

// ESP32-CAM red LED on GPIO 33 (active LOW)
const int ledPin = PIN_LED;

// Variables para parpadeo WiFi no bloqueante
static bool wifiBlinkEnable = false;
static unsigned long wifiBlinkMillis = 0;
static bool wifiLedState = HIGH;

// Variables para parpadeo de eventos (no bloqueante)
static int eventBlinksRemaining = 0;
static int eventBlinkDuration = 0;
static unsigned long eventBlinkMillis = 0;
static bool eventLedOn = false;

void ledIndicatorInit() {
    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, HIGH); // Apagar LED rojo inicialmente

    // Apagar flash LED (GPIO 4) - queda encendido si no se controla
    pinMode(PIN_FLASH_LED, OUTPUT);
    digitalWrite(PIN_FLASH_LED, LOW);

    Serial.println("LED indicator inicializado (GPIO 33, Flash GPIO 4 apagado)");
}

// Parpadeo no-bloqueante: programa N parpadeos que handleLedIndicator() ejecuta
void blinkLED(int times, int duration) {
    eventBlinksRemaining = times;
    eventBlinkDuration = duration;
    eventBlinkMillis = millis();
    eventLedOn = true;
    digitalWrite(ledPin, LOW); // Encender (active LOW)
}

void startWifiBlink() {
    wifiBlinkEnable = true;
    wifiBlinkMillis = millis();
    wifiLedState = HIGH;
    digitalWrite(ledPin, wifiLedState);
}

void stopWifiBlink() {
    wifiBlinkEnable = false;
    digitalWrite(ledPin, HIGH); // Asegurar LED apagado
}

void handleLedIndicator() {
    unsigned long now = millis();

    // Prioridad 1: parpadeo de eventos (MQTT publish, conexion, etc.)
    if (eventBlinksRemaining > 0) {
        if (now - eventBlinkMillis >= (unsigned long)eventBlinkDuration) {
            eventBlinkMillis = now;
            if (eventLedOn) {
                // Apagar
                digitalWrite(ledPin, HIGH);
                eventLedOn = false;
                eventBlinksRemaining--;
            } else {
                // Encender siguiente parpadeo
                digitalWrite(ledPin, LOW);
                eventLedOn = true;
            }
        }
        return;
    }

    // Prioridad 2: parpadeo WiFi continuo
    if (!wifiBlinkEnable) return;

    if (now - wifiBlinkMillis >= 250) {
        wifiBlinkMillis = now;
        wifiLedState = !wifiLedState;
        digitalWrite(ledPin, wifiLedState);
    }
}
