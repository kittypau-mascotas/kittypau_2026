---
id: readme_sensores
title: Sensores — KPCL0034 "Bandida" (food bowl)
type: sensor
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-14
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

> ⚠️ **Verificar antes de asumir "activo" (encontrado 2026-08-14):** una consulta directa a
> la tabla `devices` del proyecto principal devolvió **solo 4 filas totales** — KPCL0034,
> KPCL0035, KPCL0036, y un cuarto device sin código KPCL conocido documentado. **KPCL0031,
> KPCL0033, KPCL0037, KPCL0038, KPCL0040 y KPCL0041 no tienen fila en `devices` hoy** — no
> se confirmó si nunca llegaron a registrarse, se borraron, o viven en otro entorno/proyecto
> Supabase. La lista de abajo (`DEVICES` en `bridge/src/index.js`, ya no usada — el bridge
> corre en modo wildcard) puede estar desactualizada respecto a qué hardware existe hoy de
> verdad. No tratar esta tabla como inventario físico sin re-confirmar.

| ID | Tipo | Estado |
|---|---|---|
| KPCL0031, KPCL0033 | food_bowl | ⚠️ Sin fila en `devices` verificada 2026-08-14 — confirmar antes de asumir "activo" |
| KPCL0034 | food_bowl (comedero) — **de Bandida** | UUID `3a460074-e7c3-41bf-ae5a-a011445f927a`. Apagado desde 23-jul-2026, no ha vuelto a reportar |
| KPCL0035 | **water_bowl (bebedero) — de Bandida** ✅ confirmado por Mauro 2026-08-13 | UUID `0dc601c0-1533-40c5-b606-6d89eb2d4042` (DHT11 en lugar de AHT10 — payload igual). Creado el mismo minuto que KPCL0034 (25-may-2026), se apagó junto con él el 23-jul-2026 pero se reconectó solo el 10-ago-2026 y sigue activo. Detalle completo en [[29_Specs/SPEC_07_Investigacion_Hidratacion]] (banner de corrección al inicio). ⚠️ Su `device_type` real en Supabase sigue diciendo `comedero` — el firmware no tiene guard para overridearlo y el bridge lo pisa cada 15s, ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] |
| KPCL0036 | food_bowl — **NO es de Bandida** ⚠️ | UUID `7573c1d6-25bf-4ad2-89eb-7f29a1313c5a`, pertenece a otra mascota ("pasturri", otro dueño) desde el 17-jul-2026. **No confundir con el UUID retirado `3c1c6705-636d-4770-bdcf-21aa6f7225a5`**, que tuvo este mismo código "KPCL0036" hasta esa fecha y que las fuentes de abril/mayo 2026 (`../../Investigacion/07_AUDITORIA_KPCL0036_ERROR_PESO.md`, `README.md` raíz, `../../Investigacion/GLOSARIO_GAMMA.md`) documentan como bebedero — ese device está retirado, ya no existe en la tabla `devices` de Supabase. Ver [[29_Specs/SPEC_07_Investigacion_Hidratacion]] para la historia completa de esta confusión |
| KPCL0037, KPCL0038, KPCL0040, KPCL0041 | food_bowl | ⚠️ Sin fila en `devices` verificada 2026-08-14 — confirmar antes de asumir "activo" |

---

## Ver también

- [[08_ESP32/README_ESP32]] — firmware del dispositivo
- [[10_Datasets/README_Datasets]] — archivos CSV con los datos
- [[14_Experimentos/EXP_AlphaV2_Pipeline]] — cómo se procesan los datos
- [[24_Glosario/README_Glosario]] — términos del dominio
