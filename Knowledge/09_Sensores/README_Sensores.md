---
id: readme_sensores
title: Sensores — KPCL0034 "Bandida" (food bowl)
type: sensor
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-13
tags:
  - kpcl
  - kpcl0034
  - bandida
  - food-bowl
  - sensor
related:
  - [[00_HOME]]
  - [[08_ESP32/README_ESP32]]
  - [[10_Datasets/README_Datasets]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
  - [[24_Glosario/README_Glosario]]
  - [[29_Specs/SPEC_07_Investigacion_Hidratacion]]
---

# Sensores — KPCL0034 "Bandida"

---

## Dispositivo principal de investigación

| Campo | Valor |
|---|---|
| ID | `KPCL0034` |
| Alias | "Bandida" (nombre del gato dueño del dispositivo) |
| Tipo | `food_bowl` — comedero con sensor de peso integrado |
| Placa | NodeMCU v3 CP2102 (ESP8266) |
| Firmware | v2.0.0 |

---

## UUIDs en base de datos

KPCL0034 tiene **dos UUIDs** porque el dispositivo fue re-registrado en Mayo 2026:

| UUID | Período | Archivo CSV |
|---|---|---|
| `9510a455-b0e9-4932-8be1-03976d31228a` | Abril 2026 | `readings.csv` — **NUNCA modificar** |
| `3a460074-e7c3-41bf-ae5a-a011445f927a` | Mayo–Jun 2026 | `readings_rows.csv` — append-only |

Ambos UUIDs se filtran en el pipeline para obtener la señal completa de KPCL0034.

---

## Sensores del dispositivo

| Sensor | Dato | Especificación |
|---|---|---|
| HX711 + celda de carga | `weight_grams` | Resolución ~1g, deadband 2g |
| AHT10 | `temperature`, `humidity` | °C y %. `null` si falla. |
| BH1750 | `light.lux`, `light.condition` | 0–65535 lux |

---

## Señal de peso — características

| Característica | Valor |
|---|---|
| Frecuencia de muestreo | 1 lectura / 30 s (nominal) |
| Rango de peso bowl | ~80–200 g (vacío ~80 g, lleno ~200 g) |
| Peso de Bandida estimado | 130–160 g (cuando está encima del bowl) |
| Resampleo en pipeline | 30 s con ffill limit=2 |

---

## Período de datos disponibles (2026-06-29)

| Período | Fuente | Filas |
|---|---|---|
| 2026-04-08 → 2026-05-23 | `readings.csv` (estático) | 8 024 filas |
| 2026-05-23 → 2026-06-27 | `readings_rows.csv` (dinámico) | 94 588 filas |
| Total | — | 102 612 filas |

---

## Candidatos y anotaciones (snapshot v2.1)

| Artefacto | Estado |
|---|---|
| Candidatos detectados | 421 (Abr 8 → Jun 27) |
| Anotaciones completadas | 421 (alim=209 / serv=45 / ruido=167) |
| Features calculadas | 102 features × 417 anotaciones confirmadas |

---

## Otros dispositivos del ecosistema

| ID | Tipo | Estado |
|---|---|---|
| KPCL0031, KPCL0033 | food_bowl | Activos, usuarios reales |
| KPCL0035 | food_bowl | DHT11 en lugar de AHT10 — payload igual |
| KPCL0036 | **water_bowl (bebedero)** ✅ confirmado 2026-08-13 | UUID `3c1c6705-636d-4770-bdcf-21aa6f7225a5`. Esta fila decía `food_bowl` — corregido: 3 fuentes independientes (`07_AUDITORIA_KPCL0036_ERROR_PESO.md`, `README.md` raíz, `GLOSARIO_GAMMA.md`) lo documentan como bebedero desde abril 2026; el `device_type=comedero` que aparece en exports recientes es una reclasificación posterior del hardware (reutilizado en pruebas comparativas), no su rol original. Tiene 821.785 lecturas crudas (más que KPCL0034) pero con una anomalía de voltaje/spikes documentada, sin resolver. Detalle completo en [[29_Specs/SPEC_07_Investigacion_Hidratacion]] §2.2–§2.3 |
| KPCL0037, KPCL0038, KPCL0040, KPCL0041 | food_bowl | Activos |

---

## Ver también

- [[08_ESP32/README_ESP32]] — firmware del dispositivo
- [[10_Datasets/README_Datasets]] — archivos CSV con los datos
- [[14_Experimentos/EXP_AlphaV2_Pipeline]] — cómo se procesan los datos
- [[24_Glosario/README_Glosario]] — términos del dominio
