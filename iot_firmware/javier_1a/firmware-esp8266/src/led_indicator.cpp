#include "led_indicator.h"
#include <Arduino.h>
#include "config.h" // Incluir para PIN_LED_STATUS

const int ledPin = PIN_LED_STATUS;

// Variables para el parpadeo de LED no bloqueante
static bool blinkEnable = false;
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
    if (!blinkEnable) {  // solo reinicia el ciclo si no estaba ya corriendo
        blinkEnable = true;
        lastBlinkMillis = millis();
        digitalWrite(ledPin, HIGH);
    }
}

void stopWifiBlink() {
    blinkEnable = false;
    digitalWrite(ledPin, HIGH);
}

void handleLedIndicator() {
    if (!blinkEnable) return;

    // Patrón: 3 parpadeos rápidos → 500ms pausa → repite
    // Cada parpadeo: 100ms ON + 100ms OFF = 200ms × 3 = 600ms + 500ms pausa = 1100ms ciclo
    unsigned long t = (millis() - lastBlinkMillis) % 1100;
    bool on = (t < 600) && ((t % 200) < 100);
    digitalWrite(ledPin, on ? LOW : HIGH);  // LED activo en LOW
}