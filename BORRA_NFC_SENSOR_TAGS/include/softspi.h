#pragma once
#include <Arduino.h>
#include "config.h"

// Bit-bang SPI mode 0 (CPOL=0, CPHA=0), MSB first — compatible RC522
// Usa PIN_MOSI=D2 en vez de D7 (roto).

inline void spi_init() {
    pinMode(PIN_SS,   OUTPUT); digitalWrite(PIN_SS,   HIGH);
    pinMode(PIN_SCK,  OUTPUT); digitalWrite(PIN_SCK,  LOW);
    pinMode(PIN_MOSI, OUTPUT); digitalWrite(PIN_MOSI, LOW);
    pinMode(PIN_MISO, INPUT);
}

inline uint8_t spi_transfer(uint8_t data) {
    uint8_t result = 0;
    for (int8_t i = 7; i >= 0; i--) {
        digitalWrite(PIN_MOSI, (data >> i) & 1);
        delayMicroseconds(2);
        digitalWrite(PIN_SCK, HIGH);
        delayMicroseconds(2);
        result = (result << 1) | digitalRead(PIN_MISO);
        digitalWrite(PIN_SCK, LOW);
        delayMicroseconds(2);
    }
    return result;
}

inline void spi_select()   { digitalWrite(PIN_SS, LOW);  }
inline void spi_deselect() { digitalWrite(PIN_SS, HIGH); }
