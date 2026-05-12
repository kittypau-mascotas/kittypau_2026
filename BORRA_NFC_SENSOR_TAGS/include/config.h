#pragma once

// ─── NodeMCU v2 (ESP8266) — Kittypau KPCL board ──────────────────────────────
//
// RC522   NodeMCU v2
// SDA  -> D8 (GPIO15)   SPI chip select
// SCK  -> D5 (GPIO14)   SPI clock
// MOSI -> D1 (GPIO5)    SPI data in  ← D7 roto, reemplazado por D1 (soft SPI)
// MISO -> D6 (GPIO12)   SPI data out
// RST  -> D3 (GPIO0)    reset
// 3.3V -> 3.3V          ¡NUNCA 5V!
// IRQ  -> sin conectar

#define PIN_SS    15  // D8
#define PIN_SCK   14  // D5
#define PIN_MOSI   5  // D1  ← soft SPI (D7/GPIO13 roto)
#define PIN_MISO  12  // D6
#define PIN_RST    0  // D3
#define PIN_BUZZ   4  // D2 — speaker 0.25W + R 330Ω

// NTAG215
#define NTAG215_USER_PAGE_START   4
#define NTAG215_USER_PAGE_END   129

static const uint8_t NTAG215_CC[4] = { 0xE1, 0x10, 0x3E, 0x00 };
