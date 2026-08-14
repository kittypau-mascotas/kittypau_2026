---
id: spec_11_resumen_consumo_today
title: SPEC 11 — Resumen de consumo (día/semana/mes) en /today, fuera de Barras Sims
type: spec
status: draft
owner: Mauro
created: 2026-08-14
updated: 2026-08-14
tags:
  - spec
  - today
  - analytics
  - bridge
  - metricas
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
  - [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]
  - [[07_MQTT/README_MQTT]]
---

# SPEC 11 — Resumen de consumo (día/semana/mes) en `/today`

> Pedido de Mauro (2026-08-14): mostrar en `/today` cuánta comida/agua al día, semana y mes,
> total de servidos, cuánto peso/ml por servido, promedios — la mayor cantidad de data real
> posible sobre la mascota. **Confirmado con Mauro: va en una sección nueva de `/today`, fuera
> del panel "Barras Sims"** (protegido, ver [[29_Specs/README_Specs]] y memoria de sesión —
> revertido 3 veces, no se toca sin confirmar).

---

## 0. El hallazgo central: esto ya está calculado, solo falta mostrarlo

No hace falta mandar nada nuevo al bridge ni crear una tabla — **el pipeline completo que
Mauro pidió ya existe y corre en producción ahora mismo**, verificado por lectura directa de
código:

```
KPCL (peso) ──MQTT──▶ bridge/src/processor.js (state machine + Z-score)
                              │
                              ▼
                    Supabase Analytics DB
                    ├── pet_sessions        (cada servido, ya calculado)
                    └── pet_daily_summary   (totales del día, ya calculado)
                              │
                              ▼
              kittypau_app: GET /api/analytics/sessions   ← consumido por /story
              kittypau_app: GET /api/analytics/daily      ← construido, CERO consumidores hoy
```

- **`pet_sessions`** (`bridge/src/processor.js:192-207`): cada sesión detectada trae
  `grams_consumed`/`water_ml`, `duration_sec`, `classification` (normal/low/high/skipped),
  `anomaly_score` (Z-score contra baseline rolling de 30 sesiones), `avg_temperature`,
  `avg_humidity`. Ya expuesto vía `GET /api/analytics/sessions` y consumido hoy solo por
  `/story` (el feed narrativo "Bandida comió más de lo habitual").
- **`pet_daily_summary`** (`bridge/src/processor.js:243-295`): rollup por día ya calculado —
  `total_food_grams`, `food_sessions`, `total_water_ml`, `water_sessions`, `anomaly_count`,
  `skipped_meals`, `first_session_at`/`last_session_at`. Expuesto vía `GET
  /api/analytics/daily?pet_id=X&days=N` (`kittypau_app/src/app/api/analytics/daily/route.ts`)
  — **este endpoint no lo llama ninguna pantalla hoy**, es el gap real.

**Semana/mes no necesitan cálculo nuevo del lado del servidor** — son una suma de N filas de
`pet_daily_summary` que ya trae el endpoint existente con `days=7`/`days=30`. Promedio por
servido tampoco: `total_food_grams / food_sessions` del mismo payload.

---

## 1. Dependencia bloqueante — resolver antes de mostrar esto al usuario

[[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §2 encontró que `processor.js:129`
clasifica cada sesión usando el `device_type` de `devices`, que hoy está roto para KPCL0035
(bebedero reportado como comedero) — las sesiones de agua se vienen guardando como
`session_type: 'food'`. **No implementar la UI de este spec antes de que el fix de SPEC_09
§1.1 (override en el bridge) esté deployado** — de lo contrario el primer número que ve el
usuario en la sección nueva mezcla comida y agua bajo "comida", exactamente el tipo de dato
no confiable que el proyecto prohíbe mostrar sin advertencia.

---

## 2. Diseño de la sección nueva

**Ubicación:** nuevo bloque en `/today`, independiente de "Barras Sims" — no comparte
componente, no comparte lógica, no se agregan cards al panel existente.

**Contenido (todo con dato real detrás, nada inventado):**

| Elemento | Fuente | Cálculo |
|---|---|---|
| Total comida hoy / semana / mes | `pet_daily_summary.total_food_grams` | Suma de N días |
| Total agua hoy / semana / mes | `pet_daily_summary.total_water_ml` | Suma de N días |
| N° de servidos (comida / agua) | `pet_daily_summary.food_sessions` / `water_sessions` | Suma de N días |
| Promedio por servido | Derivado | `total_food_grams / food_sessions` (evitar división por cero) |
| Servidos fuera de lo normal | `pet_daily_summary.anomaly_count` | Suma de N días — mismo criterio Z-score que ya usa `/story` |
| Comidas omitidas | `pet_daily_summary.skipped_meals` | Directo del payload (hoy siempre 0 — ver §4, no implementado en el processor todavía) |

**Selector de período:** día / semana / mes, un solo `fetch` a
`/api/analytics/daily?pet_id=X&days=30` (el máximo que se vaya a mostrar) y sumar en memoria
según el período elegido — no repetir el fetch por cada toggle.

**Gating free/premium — decisión pendiente, no asumida:** `FREE_HISTORY_DAYS=3` ya está
harcodeado en `analytics/daily/route.ts`. Con eso, un usuario free **no tiene los 7/30 días
necesarios** para "semana"/"mes" completos. Dos caminos, sin implementar ninguno todavía:
1. Deshabilitar semana/mes para free con copy tipo "Disponible en Premium" (reusa el patrón
   de gating que ya existe en `/story` y `analytics/daily`).
2. Mostrar el rango parcial disponible (ej. "últimos 3 días") sin ocultar el selector.

Necesita decisión de Mauro antes de implementar — no es un detalle técnico menor, es
monetización.

**Copy honesto (mismo estándar que Hunger Bar/hidratación, ver
[[29_Specs/SPEC_04_Metricas_Today_Investigacion]] §3):** cada número lleva su unidad y, si
aplica, una nota de "calculado sobre N servidos detectados" — nunca un número pelado sin
contexto de dónde sale.

---

## 2.1 — 10 métricas adicionales de consumo de alimento

Pedido de Mauro (2026-08-14): sumar ~10 métricas más sobre el cálculo de consumo de
alimento. Mismo estándar que el resto de este spec y que
[[29_Specs/SPEC_04_Metricas_Today_Investigacion]]: **cada una cita de qué campo/estadística
real sale, ninguna introduce una constante nueva sin medir.** Todas usan datos que ya se
están calculando (`pet_sessions`/`pet_daily_summary`) o estadísticas ya calibradas y
documentadas en [[05_API/SPEC_HungerBar_Alimentacion]] §0.1 sobre 254 comidas reales de
KPCL0034 — cero investigación nueva requerida.

⚠️ **Caveat de datos antes de implementar:** `pet_sessions.duration_sec` está en el
`SELECT` de `api/analytics/sessions/route.ts` pero **no se encontró en el objeto que
`processor.js` inserta** (`processor.js:192-207` no lo asigna explícitamente). No se pudo
confirmar en esta sesión si es una columna generada en la DB (el schema de la analytics DB
no está versionado en este repo, ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]])
o si simplemente llega `null` siempre — mismo patrón que el hallazgo ya documentado de
`skipped_meals` (§4). **Las métricas #1 y #2 de abajo calculan duración como `session_end −
session_start` en vez de confiar en `duration_sec`** — ambos timestamps sí están
garantizados (`processor.js` los asigna siempre), evita depender del campo sin confirmar.

| # | Métrica | Fuente / fórmula | Por qué está respaldada |
|---|---|---|---|
| 1 | **Duración promedio por comida** | `avg(session_end − session_start)` sobre `pet_sessions` con `session_type='food'` del período | Campo ya calculado por `processor.js`, solo falta promediar |
| 2 | **Velocidad de consumo (g/min)** | `grams_consumed / ((session_end − session_start) en min)`, promediado por sesión | Combina dos campos ya reales — ratio derivado, no constante nueva |
| 3 | **Comidas hoy vs. su patrón medido** | `food_sessions` de hoy vs. mediana real **4** (rango 1-6) de [[05_API/SPEC_HungerBar_Alimentacion]] §0.1 | Usa la mediana ya calibrada sobre 254 comidas anotadas — no un número inventado nuevo |
| 4 | **¿Comió en su horario habitual?** | Hora de `session_start` de hoy vs. horas pico reales medidas: 19h, 05h, 16h, 10h, 17h, 06h, 07h, 09h ([[05_API/SPEC_HungerBar_Alimentacion]] §0.1) | Mismas horas pico ya medidas y documentadas, reusadas tal cual |
| 5 | **Consistencia del intervalo entre comidas** | Intervalo real de hoy vs. IQR medido (P25=3.8h / P75=8.27h) — "dentro de lo típico" si cae en el rango | Mismo IQR ya calibrado que usa el clamp de display de la Hunger Bar |
| 6 | **Racha de días con actividad detectada** | Días consecutivos con `food_sessions > 0` en `pet_daily_summary`, contando hacia atrás desde hoy | Conteo directo sobre un campo ya real, sin inventar umbral |
| 7 | **Regularidad del consumo diario** | Desviación estándar (o coeficiente de variación) de `total_food_grams` sobre los últimos N días | Estadística estándar sobre un campo ya real — sin constante nueva |
| 8 | **% de comidas dentro del rango que definió el dueño** | `grams_consumed` de cada sesión vs. `pet.food_normal_min_g`/`food_normal_max_g` | Mismos campos que ya usa `applyCustomLimits()` en `story/page.tsx` — reuso directo, cero cálculo nuevo |
| 9 | **Comida más grande / más chica del período** | `max(grams_consumed)` / `min(grams_consumed)` sobre `pet_sessions` del período | Extremos de un campo ya real |
| 10 | **Tendencia semana vs. semana anterior** | `(Σtotal_food_grams semana actual − Σtotal_food_grams semana previa) / semana previa × 100` | Resta/porcentaje sobre sumas ya reales de `pet_daily_summary` — mismo patrón que "semana"/"mes" ya definido en §2 |

**Todas caen en el mismo "Grupo A" de SPEC_04** (respaldadas, portables) porque a diferencia
de Hambre/Saciedad/Apetito (que sí requieren la taxonomía de investigación completa), estas
diez son agregaciones/estadísticas directas sobre campos que el bridge **ya está
escribiendo en producción** — no dependen de anotaciones nuevas ni de Motor v2.

**Presentación sugerida:** no las 10 como barras — mezclar formatos según el tipo de dato
(#1/#2/#9 como stat simple con unidad; #3/#4/#5/#8 como comparación contra el patrón, ej.
"4 de las ~4 comidas habituales" o "dentro de su horario habitual"; #6 como racha tipo
streak; #7/#10 como indicador de tendencia con flecha). Mismo principio de copy honesto del
§2: cada una con su fórmula en tooltip.

---

## 3. Qué NO hace falta construir

- Nueva tabla en Supabase — `pet_daily_summary` ya cubre día/semana/mes por agregación.
- Cambios en `bridge/src/processor.js` — el cálculo de sesión y el rollup diario ya están
  completos y corriendo. Único cambio de bridge relacionado es el de SPEC_09 (fix de
  `device_type`), no un cálculo nuevo.
- Nuevo endpoint — `GET /api/analytics/daily` ya existe con la forma correcta, solo falta un
  consumidor de UI.

---

## 4. Qué sí falta (fuera de alcance de este spec, anotado para no perderlo)

- **`skipped_meals` siempre es `0`** en `upsertDailySummary()` (`processor.js:289`) — el
  campo existe en el schema pero el processor nunca lo calcula (no hay lógica de "se esperaba
  una comida y no llegó" en el state machine actual, que solo reacciona a lo que sí ocurre).
  Si se quiere mostrar "comidas omitidas" con dato real, hace falta esa lógica — hoy sería un
  0 permanente, no un dato confiable. **No mostrar este campo en la UI hasta que se implemente.**
- Motor Matemático v2 / Evidence Engine (102 features) no está conectado a este pipeline —
  `processor.js` usa reglas simples (umbral de gramos + Z-score), no el clasificador
  calibrado. Coherente con la decisión ya tomada para Hunger Bar (arquitectura B', ver
  [[05_API/SPEC_HungerBar_Alimentacion]]) — no reabrir esa decisión acá.

---

## 5. Priorización

| # | Item | Esfuerzo | Bloqueante |
|---|---|---|---|
| 1 | Deploy del fix de SPEC_09 §1.1 (bridge) | — | Sí — bloquea todo lo demás |
| 2 | Decisión de gating free/premium (§2) | — | Sí — bloquea el diseño del selector |
| 3 | Componente nuevo en `/today` consumiendo `analytics/daily` existente | S | — |
| 4 | `skipped_meals` real en `processor.js` | M | No — se puede lanzar sin esto, ocultando el campo |

---

## Ver también

- [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] — fix bloqueante antes de mostrar estos números
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — reglas de naming/presentación honesta ya establecidas
- [[07_MQTT/README_MQTT]] — arquitectura del bridge, `processor.js`
