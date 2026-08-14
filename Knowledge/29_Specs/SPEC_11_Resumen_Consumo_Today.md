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
