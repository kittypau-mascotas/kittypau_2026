# Conexiones RC522 + NTAG215 + ESP8266 NodeMCU v2 (Kittypau KPCL)

## Diagrama de conexiones

```
         NodeMCU v2 (ESP8266) — misma placa que KPCL Kittypau
        ┌──────────────────────┐
        │ 3.3V ────────────────┼──── VCC  (RC522, pin 8)  ⚡ ¡NUNCA 5V!
        │ GND  ────────────────┼──── GND  (RC522, pin 6)
        │ D5   (GPIO14) ───────┼──── SCK  (RC522, pin 2)  SPI clock
        │ D6   (GPIO12) ───────┼──── MISO (RC522, pin 4)  SPI data out
        │ D1   (GPIO5)  ───────┼──── MOSI (RC522, pin 3)  SPI data in  ← D7 ROTO
        │ D8   (GPIO15) ───────┼──── SDA  (RC522, pin 1)  SPI chip select
        │ D3   (GPIO0)  ───────┼──── RST  (RC522, pin 7)  reset
        │                      │    IRQ   (RC522, pin 5) → sin conectar
        └──────────────────────┘

        NTAG215 Sticker Tag
        ┌────────────────────────────────────────────────────────┐
        │  Pasivo — sin cables                                   │
        │  Acercar a la bobina de la antena del RC522 (< 3 cm)  │
        └────────────────────────────────────────────────────────┘

Pines D5/D6/D7 también se usan en KPCL para HX711 y DHT.
Este proyecto NFC es INDEPENDIENTE del firmware KPCL.
```

## Pinout RC522 (8 pines)

| Pin RC522 | Nombre | NodeMCU v2 | GPIO | Nota |
|-----------|--------|------------|------|------|
| 1         | SDA    | D8         | 15   | SPI CS |
| 2         | SCK    | D5         | 14   | SPI clock |
| 3         | MOSI   | **D1**     | **5**| **D7 roto → reemplazado por D1 (soft SPI)** |
| 4         | MISO   | D6         | 12   | SPI data out |
| 5         | IRQ    | —          | —    | sin conectar |
| 6         | GND    | GND        | —    | |
| 7         | RST    | D3         | 0    | reset (D4 es LED interno) |
| 8         | 3.3V   | 3.3V       | —    | ⚡ no usar 5V |

## Notas críticas

- **Voltaje:** El RC522 opera a **3.3V**. Conectado a 5V se daña.
- **IRQ:** No se usa en este firmware — dejar sin conectar.
- **NTAG215:** Es pasivo (sin batería). La antena del RC522 lo alimenta por inducción. Distancia máxima ~3 cm.
- **SPI exclusivo:** Si hay otros dispositivos SPI, cada uno necesita su propio pin SDA/CS.

## Comando para compilar y subir

```bash
pio run --target upload --environment d1_mini
pio device monitor --baud 115200
```

## Uso básico (Monitor Serial 115200)

| Tecla | Acción |
|-------|--------|
| `r`   | Lee UID + primeras páginas del tag |
| `w`   | Escribe URL NDEF `https://kittypau.vercel.app` |
| `e`   | Borra páginas 4-20 del tag |
| `m`   | Muestra menú |

Después de `w`, acerca un smartphone Android/iPhone al tag → abre el navegador automáticamente.
