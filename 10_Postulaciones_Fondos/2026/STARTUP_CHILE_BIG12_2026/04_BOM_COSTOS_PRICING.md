# Kittypau KPCL — BOM, Costos y Fundamento de Precios
**Versión:** 1.0 — 2026-05-22
**Fuente de componentes:** firmware-esp8266/platformio.ini + sensors.cpp (repositorio kittypau_2026)

---

## 1. Inventario de componentes (derivado del firmware)

Componentes identificados directamente desde el código fuente:

| Componente | Uso | Archivo fuente |
|---|---|---|
| ESP8266 NodeMCU v2 | MCU principal + WiFi | `platformio.ini` board=nodemcuv2 |
| HX711 | Amplificador celda de carga (peso) | `sensors.cpp` → `scale.begin()` |
| Celda de carga (load cell, 1kg) | Sensor de peso | `sensors.cpp` → `scale.get_units()` |
| AHT10 (I2C) | Temperatura + humedad (prod. actual) | `sensors.cpp` → `aht.begin()` |
| DHT11 (GPIO14) | Temperatura + humedad (KPCL0035) | `sensors.cpp` ifdef USE_DHT11 |
| BH1750 (I2C) | Luz ambiental en lux | `sensors.cpp` → `lightMeter.begin()` |
| TP4056 | Módulo carga batería Li-Ion | `sensors.cpp` → pines CHRG/STDBY comentados |
| 18650 Li-Ion 3.7V | Batería | `sensors.cpp` → divisor tensión en A0 |
| Divisor de tensión (R1+R2) | Lectura nivel batería | `sensors.cpp` → `BATT_R1_KOHM`, `BATT_R2_KOHM` |
| LED indicador | Estado del dispositivo | `led_indicator.cpp` |

> **⚠️ Nota ESP32-C3:** El firmware en producción usa **ESP8266 NodeMCU v2** — es el único MCU deployado en dispositivos reales (KPCL0035, KPCL0036, KPCL0051). La postulación BIG12 menciona ESP32-C3 como objetivo futuro (v2), pero **no está en producción ni en el repo activo**. El BOM vigente se basa en ESP8266. La columna "v2 ESP32-C3" queda como referencia para cuando se concrete esa migración. No usar ESP32-C3 como argumento técnico en la postulación actual.

---

## 2. BOM por unidad — Precios de referencia

**Metodología:** Precios consultados en AliExpress (importación directa) y MercadoLibre Chile (disponibilidad local). El precio BOM usado es el promedio ponderado para volumen de 10–30 unidades (escala BIG12), con flete estimado incluido.

| # | Componente | Qty | AliExpress (USD) | ML Chile (USD) | BOM usado (USD) | BOM v2 ESP32-C3 |
|---|---|---|---|---|---|---|
| 1 | ESP8266 NodeMCU v2 | 1 | 2,00 | 4,50 | **3,00** | — |
| — | ESP32-C3 (v2 objetivo) | 1 | 2,50 | 5,00 | — | **3,50** |
| 2 | HX711 módulo breakout | 1 | 0,60 | 1,80 | **1,00** | 1,00 |
| 3 | Celda de carga 1 kg | 1 | 1,20 | 3,00 | **1,80** | 1,80 |
| 4 | AHT10 módulo I2C | 1 | 0,70 | 2,00 | **1,10** | 1,10 |
| 5 | BH1750 módulo I2C | 1 | 0,80 | 2,00 | **1,20** | 1,20 |
| 6 | TP4056 módulo carga | 1 | 0,35 | 1,20 | **0,65** | 0,65 |
| 7 | Batería 18650 2600mAh | 1 | 2,20 | 5,00 | **3,20** | 3,20 |
| 8 | PCB / protoboard | 1 | 0,70 | 1,80 | **1,10** | 1,10 |
| 9 | Pasivos (R, C, cables, conectores) | lote | 0,40 | 1,00 | **0,60** | 0,60 |
| 10 | Carcasa 3D impresa (PETG ~80g) | 1 | 0,80 | 2,50 | **1,50** | 1,50 |
| 11 | Bowl base (acero inox 14cm) | 1 | 1,50 | 3,50 | **2,20** | 2,20 |
| 12 | Cable USB-C + adaptador 5V | 1 | 1,20 | 3,00 | **1,80** | 1,80 |
| 13 | Packaging (caja + insert) | 1 | 0,40 | 1,20 | **0,70** | 0,70 |
| | **TOTAL BOM MATERIALES** | | | | **19,85** | **20,35** |

> **Flete inbound estimado (AliExpress → Chile, prorrateado por unidad a 30u):** +1,80 USD  
> **BOM total incluyendo flete:** ~**21,65 USD** (v1 ESP8266) / **22,15 USD** (v2 ESP32-C3)

El número usado en la postulación (BOM USD 21,50) está dentro del rango real.

---

## 3. Costo total por unidad — 3 escenarios de volumen

| Ítem de costo | 1–10 u (prototipo) | 10–50 u (BIG12) | 100+ u (escala) |
|---|---|---|---|
| BOM materiales + flete | 24,00 | 21,65 | 16,50 |
| Ensamble (HH × tarifa) | 12,00 | 7,50 | 3,50 |
| Programación firmware + QA | 5,00 | 2,50 | 0,80 |
| Overhead (rechazos 5%, garantía) | 2,00 | 1,50 | 1,00 |
| Procesamiento pago (5%) | 2,50 | 2,50 | 2,50 |
| **COSTO TOTAL UNITARIO** | **45,50** | **35,65** | **24,30** |
| **Precio de venta** | 50,00 | 50,00 | 50,00 |
| **Margen bruto** | **4,50 (9%)** | **14,35 (29%)** | **25,70 (51%)** |

> A 30–50 unidades el margen ya es ~29%. A 100+ unidades sube a ~51%, compatible con la afirmación de "57% de margen bruto" que figura en la postulación —ese número aplica cuando se excluye el costo de labor (COGS solo materiales).

---

## 4. Desglose de Horas-Hombre (HH)

### 4.1 HH de desarrollo (inversión acumulada — costo hundido)

| Actividad | Responsable | HH est. | Tarifa ref. (USD/h) | Valor (USD) |
|---|---|---|---|---|
| Diseño hardware + PCB | Javier | 80 | 35 | 2.800 |
| Firmware ESP8266 (C++) | Javier | 150 | 35 | 5.250 |
| Bridge Python + MQTT | Javier | 60 | 35 | 2.100 |
| Backend API (Next.js) | Mauricio | 80 | 30 | 2.400 |
| Dashboard web + app | Mauricio | 100 | 30 | 3.000 |
| Pipeline analytics + ML | Mauricio | 90 | 30 | 2.700 |
| Calibración + pruebas campo | Javier | 40 | 35 | 1.400 |
| **TOTAL DESARROLLO** | | **600** | | **~19.650** |

Este valor (≈USD 19.000–20.000) es consistente con la declaración de "+600 hrs de trabajo, valor de mercado USD 30K–50K" en la postulación *(el rango alto asume tarifa senior de USD 50–80/h)*.

### 4.2 HH por unidad producida (costo operativo recurrente)

| Tarea por unidad | HH | Tarifa (USD/h) | Costo (USD) |
|---|---|---|---|
| Ensamble físico + soldadura | 1,50 | 5,00 | 7,50 |
| Flash firmware (batch, jig) | 0,25 | 5,00 | 1,25 |
| Calibración celda de carga | 0,25 | 5,00 | 1,25 |
| QA funcional (test WiFi, MQTT, sensores) | 0,25 | 5,00 | 1,25 |
| **TOTAL HH/UNIDAD** | **2,25** | | **11,25** |

> Tarifa de referencia: sueldo mínimo Chile 2026 ≈ CLP 500.000/mes ÷ 176 hrs ≈ CLP 2.840/h ≈ **USD 3,00/h**. Se usó USD 5,00/h asumiendo un técnico con experiencia básica en electrónica, por encima del mínimo.  
> A 50+ unidades con jig de calibración, el tiempo de ensamble baja a ~1,5h por unidad → costo HH ~USD 7,50.

---

## 5. Fundamento del precio de suscripción — USD 8/mes

### 5.1 Costo de infraestructura cloud por usuario/mes

| Servicio | Uso | Costo/usuario/mes |
|---|---|---|
| Supabase (DB + Auth + Realtime) | ~5 MB datos/mes/usuario | ~0,08 USD |
| Vercel (frontend + API) | ~50K req/mes/usuario | ~0,05 USD |
| HiveMQ (MQTT broker) | ~15K mensajes/mes/dispositivo | ~0,12 USD |
| ML inference (LightGBM batch) | ~150 predicciones/mes | ~0,03 USD |
| **Total infra por usuario** | | **~0,28 USD/mes** |

Costo marginal de infraestructura ≈ **USD 0,28/usuario/mes**.  
A USD 8/mes → **margen SaaS: 96,5%** — consistente con un modelo SaaS de escala.

### 5.2 Benchmarking de precio en el mercado

| Producto | Precio/mes | Qué ofrece |
|---|---|---|
| Whistle Go (collar GPS+salud perro, USA) | USD 9,99 | GPS + actividad, sin analítica de alimentación |
| Petcube Bites 2 (cámara+dispensador) | USD 7,99 | Video + dispensa comida, sin medición de consumo |
| PetDesk (plataforma vet) | USD 14,99 | Gestión veterinaria, no dispositivo |
| Wag (servicio paseo) | USD 4,99–19,99 | Servicio, no hardware analítico |
| **Kittypau** | **USD 8,00** | Medición precisa + IA + alertas + dashboard |

Kittypau se posiciona entre Petcube (USD 7,99) y Whistle (USD 9,99), con una propuesta de valor diferenciada (única en LATAM con medición de consumo + IA).

### 5.3 Análisis de retorno para el dueño

| Evento | Costo sin Kittypau | Con Kittypau |
|---|---|---|
| Consulta veterinaria urgencia (Santiago) | CLP 80.000–150.000 (~USD 85–160) | Potencialmente evitada por detección temprana |
| Consulta programada | CLP 35.000–50.000 (~USD 37–53) | Reemplaza urgencia |
| Suscripción Kittypau / año | — | USD 96 (USD 8 × 12 meses) |

Si Kittypau previene **1 consulta de urgencia al año**, el usuario ahorra USD 85–160 y paga USD 96/año → **ROI positivo desde el primer evento**.

### 5.4 LTV/CAC a USD 8/mes

| Métrica | Valor | Cálculo |
|---|---|---|
| ARPU | USD 8/mes | Precio suscripción |
| Retención estimada | 18 meses | Benchmark SaaS consumer IoT |
| LTV | USD 144 | 8 × 18 |
| CAC estimado | USD 15–25 | Social media + referidos |
| **LTV/CAC** | **5,8x – 9,6x** | LTV ÷ CAC |

> La postulación declara LTV/CAC 10,7x — ese valor asume 22 meses de retención o CAC de USD 13,5. Es el escenario optimista. El rango conservador (5,8x–9,6x) sigue siendo muy saludable (benchmark SaaS: >3x = viable).

---

## 6. Resumen ejecutivo de pricing

| Concepto | Valor | Fundamento |
|---|---|---|
| Precio hardware | **USD 50** | BOM USD 21,65 + HH USD 10 + overhead → margen 28–51% según volumen |
| Precio suscripción | **USD 8/mes** | Costo infra USD 0,28; benchmark competencia USD 7,99–9,99; ROI positivo para usuario |
| Margen bruto hardware (BOM only) | **57%** | (50 − 21,65) ÷ 50 = 56,7% — se alcanza excluyendo labor, a partir de 30u |
| Margen bruto SaaS | **96%** | Costo marginal USD 0,28 sobre USD 8,00 |
| Precio competencia importada | USD 80–200 | PetKit, SureFeed — 1,6x a 4x más caro que Kittypau |

---

## 7. Sensibilidad — ¿qué pasa si el BOM sube?

| Escenario | BOM | Precio venta | Margen |
|---|---|---|---|
| Base (30u, AliExpress) | 21,65 | 50,00 | 29% |
| Alza aranceles +20% | 25,98 | 50,00 | 20% |
| Solo componentes locales (ML Chile) | 32,00 | 50,00 | 5% |
| Solo componentes locales + subir precio | 32,00 | 65,00 | 22% |

→ El modelo es viable mientras los componentes vengan de AliExpress. Compra exclusiva en MercadoLibre Chile destruye el margen al precio actual de USD 50.  
→ Si en el futuro los aranceles suben significativamente, el precio de venta debería ajustarse a USD 60–65 o migrar manufactura a volumen con proveedor PCBA.
