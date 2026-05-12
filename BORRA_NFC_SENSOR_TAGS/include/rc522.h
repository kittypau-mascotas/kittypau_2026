#pragma once
#include <Arduino.h>
#include "softspi.h"

// ─── Registros RC522 ─────────────────────────────────────────────────────────
#define REG_COMMAND       0x01
#define REG_COM_IEN       0x02
#define REG_COM_IRQ       0x04
#define REG_ERROR         0x06
#define REG_FIFO_DATA     0x09
#define REG_FIFO_LEVEL    0x0A
#define REG_CONTROL       0x0C
#define REG_BIT_FRAMING   0x0D
#define REG_COLL          0x0E
#define REG_MODE          0x11
#define REG_TX_MODE       0x12
#define REG_RX_MODE       0x13
#define REG_TX_CONTROL    0x14
#define REG_TX_ASK        0x15
#define REG_T_MODE        0x2A
#define REG_T_PRESCALER   0x2B
#define REG_T_RELOAD_H    0x2C
#define REG_T_RELOAD_L    0x2D
#define REG_RF_CFG        0x26

// ─── Comandos RC522 ──────────────────────────────────────────────────────────
#define CMD_IDLE          0x00
#define CMD_CALC_CRC      0x03
#define CMD_TRANSMIT      0x04
#define CMD_TRANSCEIVE    0x0C
#define CMD_SOFT_RESET    0x0F

// ─── Comandos ISO14443A (PICC) ───────────────────────────────────────────────
#define PICC_REQA         0x26
#define PICC_HALTA        0x50
#define PICC_ANTICOLL     0x93
#define PICC_ANTICOLL_2   0x95
#define PICC_SELECT       0x93
#define PICC_UL_READ      0x30   // NTAG215 leer página
#define PICC_UL_WRITE     0xA2   // NTAG215 escribir página

#define STATUS_OK         0x00
#define STATUS_TIMEOUT    0x01
#define STATUS_ERROR      0x02
#define STATUS_COLLISION  0x03

// ─── Register R/W ────────────────────────────────────────────────────────────

inline void rc522_write(uint8_t reg, uint8_t val) {
    spi_select();
    spi_transfer((reg << 1) & 0x7E);
    spi_transfer(val);
    spi_deselect();
}

inline uint8_t rc522_read(uint8_t reg) {
    spi_select();
    spi_transfer(((reg << 1) & 0x7E) | 0x80);
    uint8_t val = spi_transfer(0x00);
    spi_deselect();
    return val;
}

inline void rc522_set_bits(uint8_t reg, uint8_t mask) {
    rc522_write(reg, rc522_read(reg) | mask);
}
inline void rc522_clr_bits(uint8_t reg, uint8_t mask) {
    rc522_write(reg, rc522_read(reg) & ~mask);
}

// ─── Init / Reset ────────────────────────────────────────────────────────────

inline void rc522_reset() {
    pinMode(PIN_RST, OUTPUT);
    digitalWrite(PIN_RST, LOW);  delay(10);
    digitalWrite(PIN_RST, HIGH); delay(50);
    rc522_write(REG_COMMAND, CMD_SOFT_RESET);
    delay(10);
}

inline void rc522_init() {
    spi_init();
    rc522_reset();
    rc522_write(REG_TX_MODE,     0x00);  // reset baud TX
    rc522_write(REG_RX_MODE,     0x00);  // reset baud RX
    rc522_write(0x24,            0x26);  // ModWidthReg = 26
    rc522_write(REG_T_MODE,      0x80);
    rc522_write(REG_T_PRESCALER, 0xA9);
    rc522_write(REG_T_RELOAD_H,  0x03);
    rc522_write(REG_T_RELOAD_L,  0xE8);
    rc522_write(REG_TX_ASK,      0x40);
    rc522_write(REG_MODE,        0x3D);
    rc522_set_bits(REG_TX_CONTROL, 0x03); // antena ON
}

// ─── FIFO helpers ────────────────────────────────────────────────────────────

inline void fifo_flush() {
    rc522_write(REG_FIFO_LEVEL, 0x80);
}

inline void fifo_write(const uint8_t* buf, uint8_t len) {
    for (uint8_t i = 0; i < len; i++) rc522_write(REG_FIFO_DATA, buf[i]);
}

// ─── Transceive: enviar buf, recibir en out[], retorna STATUS_* ───────────────

uint8_t rc522_transceive(const uint8_t* tx, uint8_t txLen,
                          uint8_t* rx, uint8_t* rxLen,
                          uint8_t bitFraming = 0x00) {
    rc522_write(REG_COMMAND, CMD_IDLE);
    rc522_write(REG_COM_IRQ, 0x7F);
    fifo_flush();
    fifo_write(tx, txLen);
    rc522_write(REG_BIT_FRAMING, bitFraming);
    rc522_write(REG_COMMAND, CMD_TRANSCEIVE);
    rc522_set_bits(REG_BIT_FRAMING, 0x80); // StartSend

    uint32_t deadline = millis() + 36;
    uint8_t irq = 0;
    while (millis() < deadline) {
        irq = rc522_read(REG_COM_IRQ);
        if (irq & 0x30) break; // RxIRQ | IdleIRQ
        if (irq & 0x01) return STATUS_TIMEOUT;
        yield();
    }
    rc522_clr_bits(REG_BIT_FRAMING, 0x80);

    if (!(irq & 0x30))               return STATUS_TIMEOUT;
    if (rc522_read(REG_ERROR) & 0x11) return STATUS_ERROR; // solo BufferOvfl+ProtocolErr, no ParityErr

    uint8_t n = rc522_read(REG_FIFO_LEVEL);
    if (rxLen) *rxLen = n;
    for (uint8_t i = 0; i < n && i < 18; i++)
        rx[i] = rc522_read(REG_FIFO_DATA);

    if (rc522_read(REG_COLL) & 0x20) return STATUS_COLLISION;
    return STATUS_OK;
}

// ─── CRC ─────────────────────────────────────────────────────────────────────

bool rc522_crc(const uint8_t* data, uint8_t len, uint8_t* crcOut) {
    rc522_write(REG_COMMAND, CMD_IDLE);
    fifo_flush();
    fifo_write(data, len);
    rc522_write(REG_COMMAND, CMD_CALC_CRC);
    uint32_t dl = millis() + 89;
    while (millis() < dl) {
        if (rc522_read(0x05) & 0x04) { // DivIrqReg CRCIRq
            rc522_write(REG_COMMAND, CMD_IDLE);
            crcOut[0] = rc522_read(0x22); // CRCResultRegL
            crcOut[1] = rc522_read(0x21); // CRCResultRegH
            return true;
        }
        yield();
    }
    return false;
}

// ─── ISO14443A: REQA ─────────────────────────────────────────────────────────

uint8_t picc_reqa_raw() {
    rc522_write(REG_TX_MODE, 0x00);
    rc522_write(REG_RX_MODE, 0x00);
    rc522_write(0x24, 0x26);                 // ModWidthReg reset
    rc522_clr_bits(REG_COLL, 0x80);          // ValuesAfterColl=0
    uint8_t cmd = PICC_REQA;
    uint8_t rx[2]; uint8_t rxLen;
    return rc522_transceive(&cmd, 1, rx, &rxLen, 0x07);
}

bool picc_reqa() {
    uint8_t r = picc_reqa_raw();
    return (r == STATUS_OK || r == STATUS_COLLISION);
}

// ─── Anticollision + leer UID 7 bytes ────────────────────────────────────────

// acepta OK o COLLISION como respuesta válida (NTAG215 puede responder con COLLISION)
static inline bool transceive_ok(const uint8_t* tx, uint8_t txLen, uint8_t* rx, uint8_t* rxLen, uint8_t minLen = 1) {
    uint8_t r = rc522_transceive(tx, txLen, rx, rxLen);
    return (r == STATUS_OK || r == STATUS_COLLISION) && (!rxLen || *rxLen >= minLen);
}

bool picc_uid(uint8_t uid[7]) {
    // Cascade 1 — anticollision
    uint8_t tx[2] = { PICC_ANTICOLL, 0x20 };
    uint8_t rx[5]; uint8_t rxLen;
    if (!transceive_ok(tx, 2, rx, &rxLen, 5)) return false;

    bool cascade = (rx[0] == 0x88); // CT = cascade tag, NTAG215 tiene UID de 7 bytes

    // SELECT CL1
    uint8_t sel[9] = { PICC_SELECT, 0x70, rx[0], rx[1], rx[2], rx[3], rx[4], 0, 0 };
    if (!rc522_crc(sel, 7, sel + 7)) return false;
    uint8_t sarx[3]; uint8_t sarLen;
    if (!transceive_ok(sel, 9, sarx, &sarLen)) return false;

    if (cascade) {
        uid[0] = rx[1]; uid[1] = rx[2]; uid[2] = rx[3];
        // Cascade 2 — anticollision
        uint8_t tx2[2] = { PICC_ANTICOLL_2, 0x20 };
        uint8_t rx2[5]; uint8_t rx2Len;
        if (!transceive_ok(tx2, 2, rx2, &rx2Len, 5)) return false;
        uint8_t sel2[9] = { PICC_ANTICOLL_2, 0x70, rx2[0], rx2[1], rx2[2], rx2[3], rx2[4], 0, 0 };
        if (!rc522_crc(sel2, 7, sel2 + 7)) return false;
        uint8_t s2rx[3]; uint8_t s2Len;
        if (!transceive_ok(sel2, 9, s2rx, &s2Len)) return false;
        uid[3] = rx2[0]; uid[4] = rx2[1]; uid[5] = rx2[2]; uid[6] = rx2[3];
    } else {
        memcpy(uid, rx, 4);
        uid[4] = uid[5] = uid[6] = 0;
    }
    return true;
}

// ─── HALT ────────────────────────────────────────────────────────────────────

void picc_halt() {
    uint8_t buf[4] = { PICC_HALTA, 0, 0, 0 };
    rc522_crc(buf, 2, buf + 2);
    uint8_t rx[2]; uint8_t rxLen;
    rc522_transceive(buf, 4, rx, &rxLen);
}

// ─── NTAG215: leer página ────────────────────────────────────────────────────

bool ntag_read_page(uint8_t page, uint8_t out[4]) {
    uint8_t cmd[4] = { PICC_UL_READ, page, 0, 0 };
    if (!rc522_crc(cmd, 2, cmd + 2)) return false;
    uint8_t rx[18]; uint8_t rxLen;
    if (rc522_transceive(cmd, 4, rx, &rxLen) != STATUS_OK || rxLen < 4) return false;
    memcpy(out, rx, 4);
    return true;
}

// ─── NTAG215: escribir página ────────────────────────────────────────────────

bool ntag_write_page(uint8_t page, const uint8_t data[4]) {
    uint8_t cmd[8] = { PICC_UL_WRITE, page, data[0], data[1], data[2], data[3], 0, 0 };
    if (!rc522_crc(cmd, 6, cmd + 6)) return false;
    uint8_t rx[2]; uint8_t rxLen;
    return rc522_transceive(cmd, 8, rx, &rxLen) == STATUS_OK;
}
