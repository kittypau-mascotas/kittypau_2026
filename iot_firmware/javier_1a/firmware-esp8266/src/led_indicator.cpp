#include "led_indicator.h"
#include <Arduino.h>
#include "config.h" // Incluir para PIN_LED_STATUS

const int ledPin = PIN_LED_STATUS;

// Variables para el parpadeo de LED no bloqueante
static bool blinkEnable = false;
static bool portalBlink = false;
static unsigned long lastBlinkMillis = 0;
static bool ledState = HIGH; // HIGH = LED apagado

void ledIndicatorInit() {
    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, HIGH); // Apagar el LED inicialmente
}

// Parpadeo bloqueante para eventos
void blinkLED(int times, int duration) {
    bool wasBlinking = blinkEnable;
    if (wasBlinking) {
        stopWifiBlink();
    }
    
    for (int i = 0; i < times; i++) {
        digitalWrite(ledPin, LOW);
        delay(duration);
        digitalWrite(ledPin, HIGH);
        if (i < times - 1) {
            delay(duration);
        }
    }

    if (wasBlinking) {
        startWifiBlink();
    }
}

void startWifiBlink() {
    if (!blinkEnable) {
        blinkEnable = true;
        portalBlink = false;
        lastBlinkMillis = millis();
        digitalWrite(ledPin, HIGH);
    }
}

// Patrón portal: -.. -.. -..  (largo·corto·corto)
void startPortalBlink() {
    blinkEnable = true;
    portalBlink = true;
    lastBlinkMillis = millis();
    digitalWrite(ledPin, HIGH);
}

void stopWifiBlink() {
    blinkEnable = false;
    portalBlink = false;
    digitalWrite(ledPin, HIGH);
}

void handleLedIndicator() {
    if (!blinkEnable) return;

    if (portalBlink) {
        // Ciclo 1400ms: -300ms ON, 150ms OFF, .100ms ON, 100ms OFF, .100ms ON, 650ms OFF
        unsigned long t = (millis() - lastBlinkMillis) % 1400;
        bool on = (t < 300)                          // largo  (-)
               || (t >= 450 && t < 550)              // corto  (.)
               || (t >= 650 && t < 750);             // corto  (.)
        digitalWrite(ledPin, on ? LOW : HIGH);
    } else {
        // Patrón WiFi: 3 parpadeos rápidos → 500ms pausa → repite
        unsigned long t = (millis() - lastBlinkMillis) % 1100;
        bool on = (t < 600) && ((t % 200) < 100);
        digitalWrite(ledPin, on ? LOW : HIGH);
    }
}