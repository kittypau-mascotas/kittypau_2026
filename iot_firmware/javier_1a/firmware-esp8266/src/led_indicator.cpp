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
    blinkEnable = true;
    lastBlinkMillis = millis();
    ledState = HIGH;
    digitalWrite(ledPin, ledState);
}

void stopWifiBlink() {
    blinkEnable = false;
    digitalWrite(ledPin, HIGH);
}

void handleLedIndicator() {
    if (!blinkEnable) return;

    if (millis() - lastBlinkMillis >= 250) {
        lastBlinkMillis = millis();
        ledState = !ledState;
        digitalWrite(ledPin, ledState);
    }
}