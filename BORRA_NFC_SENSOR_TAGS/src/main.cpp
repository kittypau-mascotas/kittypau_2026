#include <Arduino.h>
#include "rc522.h"

#define TARGET_URL "https://kittypau.vercel.app"

// Comandos recibidos por Serial (desde Python):
//   w → escribir URL NDEF en el próximo tag
//   d → modo detección (detecta tag y responde OPEN_URL:...)
//   s → estado actual
//
// Respuestas enviadas por Serial (hacia Python):
//   READY
//   TAG_UID:<hex>
//   TAG_WRITTEN:OK
//   TAG_WRITTEN:ERROR
//   OPEN_URL:<url>
//   STATE:<write|detect>

typedef enum { MODE_IDLE, MODE_WRITE, MODE_DETECT } Mode;
Mode mode = MODE_IDLE;

// ─── NDEF URL writer ─────────────────────────────────────────────────────────

bool writeNDEFUrl(const char* url) {
    const char* body   = url + 8;
    uint8_t bodyLen    = strlen(body);
    uint8_t payloadLen = 1 + bodyLen;
    uint8_t recordLen  = 4 + payloadLen;
    uint8_t buf[64]    = {};
    uint8_t i = 0;
    buf[i++] = 0x03;
    buf[i++] = recordLen;
    buf[i++] = 0xD1;
    buf[i++] = 0x01;
    buf[i++] = payloadLen;
    buf[i++] = 0x55;
    buf[i++] = 0x04; // https://
    memcpy(buf + i, body, bodyLen); i += bodyLen;
    buf[i++] = 0xFE;

    if (!ntag_write_page(3, NTAG215_CC)) return false;
    uint8_t pages = (i + 3) / 4;
    for (uint8_t p = 0; p < pages; p++) {
        uint8_t pd[4] = {};
        for (uint8_t b = 0; b < 4; b++) {
            uint8_t idx = p * 4 + b;
            if (idx < i) pd[b] = buf[idx];
        }
        if (!ntag_write_page(NTAG215_USER_PAGE_START + p, pd)) return false;
    }
    return true;
}

// ─── procesar comando serial ──────────────────────────────────────────────────

void handleCommand(char cmd) {
    if (cmd == 'w') {
        mode = MODE_WRITE;
        Serial.println(F("STATE:write"));
    } else if (cmd == 'd') {
        mode = MODE_DETECT;
        Serial.println(F("STATE:detect"));
    } else if (cmd == 's') {
        if      (mode == MODE_WRITE)  Serial.println(F("STATE:write"));
        else if (mode == MODE_DETECT) Serial.println(F("STATE:detect"));
        else                          Serial.println(F("STATE:idle"));
    } else if (cmd == 'v') {
        uint8_t ver = rc522_read(0x37);
        Serial.print(F("RC522_VERSION:0x")); Serial.println(ver, HEX);
        if (ver == 0x91 || ver == 0x92) Serial.println(F("RC522:OK"));
        else Serial.println(F("RC522:SPI_ERROR"));
    } else if (cmd == 't') {
        // test básico: intenta REQA 3 veces e imprime resultado raw
        for (uint8_t i = 0; i < 3; i++) {
            uint8_t r = picc_reqa_raw();
            Serial.print(F("REQA:"));
            if      (r == STATUS_OK)        Serial.println(F("OK"));
            else if (r == STATUS_TIMEOUT)   Serial.println(F("TIMEOUT"));
            else if (r == STATUS_COLLISION) Serial.println(F("COLLISION(card_present)"));
            else                            Serial.println(F("ERROR"));
            delay(200);
        }
    }
}

// ─── setup / loop ─────────────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    delay(500);
    rc522_init();
    uint8_t ver = rc522_read(0x37); // VersionReg — espera 0x91 o 0x92
    Serial.print(F("RC522_VERSION:0x")); Serial.println(ver, HEX);
    if (ver == 0x91 || ver == 0x92) Serial.println(F("RC522:OK"));
    else                             Serial.println(F("RC522:SPI_ERROR"));
    Serial.println(F("READY"));
}

static uint32_t lastHeartbeat = 0;

void loop() {
    // leer comando
    if (Serial.available()) {
        char c = Serial.read();
        while (Serial.available()) Serial.read();
        handleCommand(c);
    }

    if (mode == MODE_IDLE) { delay(100); return; }

    // heartbeat cada 3 segundos — muestra resultado del último REQA
    if (millis() - lastHeartbeat > 3000) {
        lastHeartbeat = millis();
        uint8_t r = picc_reqa_raw();
        Serial.print(F("SCAN:"));
        if      (r == STATUS_TIMEOUT)   Serial.println(F("no_tag"));
        else if (r == STATUS_OK)        Serial.println(F("tag_reqa_ok"));
        else if (r == STATUS_COLLISION) Serial.println(F("tag_collision"));
        else                            Serial.println(F("error"));
    }

    if (!picc_reqa()) { delay(150); return; }
    uint8_t uid[7] = {};
    if (!picc_uid(uid)) { delay(150); return; }

    // imprimir UID
    Serial.print(F("TAG_UID:"));
    for (uint8_t i = 0; i < 7; i++) {
        if (uid[i] < 0x10) Serial.print('0');
        Serial.print(uid[i], HEX);
        if (i < 6) Serial.print(':');
    }
    Serial.println();

    if (mode == MODE_WRITE) {
        if (writeNDEFUrl(TARGET_URL)) {
            Serial.println(F("TAG_WRITTEN:OK"));
        } else {
            Serial.println(F("TAG_WRITTEN:ERROR"));
        }
        mode = MODE_IDLE;
        Serial.println(F("STATE:idle"));

    } else if (mode == MODE_DETECT) {
        Serial.println(F("OPEN_URL:" TARGET_URL));
        picc_halt();
        delay(2000);
        return;
    }

    picc_halt();
}
