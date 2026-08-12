---
id: comp_bowl_wellness_card
title: Componente — BowlWellnessCard
type: component
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - componente
  - today
  - alimentacion
  - hidratacion
related:
  - [[00_HOME]]
  - [[18_UI/Componentes/README_Componentes]]
  - [[29_Specs/SPEC_03_Objetivos_Monitoreo]]
---

# Componente — BowlWellnessCard

> Archivo: `kittypau_app/src/app/(app)/today/_components/bowl-wellness-card.tsx`

---

## Objetivo

Mostrar el estado del comedero o del bebedero de la mascota: conectividad, batería, último
evento de alimentación/hidratación confirmado, contenido actual, temperatura, humedad. Es
la card grande de la sección `#today-bowls` de `/today`.

Extraído el 2026-08-11: antes eran **2 bloques JSX casi idénticos de ~200 líneas cada uno**
(uno para comida, uno para agua) copiados en `page.tsx` — la única diferencia real eran
colores, textos e íconos. Ahora es un solo componente parametrizado por `kind`.

---

## Funcionamiento

**Props de entrada:**

| Prop | Tipo | De dónde viene |
|---|---|---|
| `kind` | `"food" \| "water"` | Fijo en cada uso — decide toda la config visual (`KIND_CONFIG`) |
| `hasDevice` | `boolean` | `hasFoodDevice` / `hasWaterDevice` en `page.tsx` — si la mascota tiene un comedero/bebedero vinculado |
| `device` | objeto con `device_id`, `battery_level`, `battery_state`, `last_seen` | `bowlDevice` / `waterDevice`, filtrados de `state.devices` por `device_type` |
| `latestReading` | objeto con `recorded_at` | `bowlLatestReading` / `waterLatestReading`, de `GET /api/readings` |
| `powerState` | `"on" \| "off" \| "nodata"` | `resolveDevicePowerState(device)` — `lib/utils/api.ts` |
| `wellness` | `WellnessState` (`stateLabel`, `lastEventLabel`, `levelLabel`, ...) | `buildWellnessState()` en `page.tsx`, basado en `audit_events` confirmados |
| `contentValueText` | `string` | Texto ya formateado (gramos o mL) — `bowlContentWeightText` / `waterVolumeMlText` |
| `contentWeightGrams` / `prevContentWeightGrams` | `number \| null` | Para la flechita de tendencia (▲/▼) |
| `tempText` / `humidityText` | `string` | Ya formateados desde `latestReading` |
| `formatTimestamp` | función | Pasada desde `page.tsx` (usa `chileCompactDatetime`) |

**Quién lo consume:** `today/page.tsx`, sección `#today-bowls`, una vez con `kind="food"` y
una vez con `kind="water"`.

**Datos externos que toca directo:** ninguno — 100% presentacional, todo llega por props.

---

## Métricas / fórmulas

No calcula métricas — las recibe ya resueltas. La única lógica propia es de **presentación**:
qué colores/textos/íconos usar según `kind` (tabla `KIND_CONFIG`) y si mostrar el estado
"vacío" (sin dispositivo vinculado) o la card completa.

`wellness.stateLabel`/`lastEventLabel` vienen de `buildWellnessState()` — basado en
`audit_events` confirmados manualmente, no en un modelo de detección automática (ver
[[29_Specs/SPEC_03_Objetivos_Monitoreo]] Pilar 2 para el estado de esto en Hidratación).

---

## Características / variantes

- **Estado vacío**: si `hasDevice` es `false`, muestra ilustración semi-transparente +
  copy "Sin comedero/bebedero asignado" + botón "Agregar comedero/bebedero" → `/bowl`. No
  intenta renderizar datos que no existen.
- **Asimetría real entre `food` y `water`** (no es un descuido, así estaba en el original):
  el chip de humedad de `food` usa `sky` y el de `water` usa `violet` — colores distintos
  para el mismo tipo de dato en las 2 variantes. Se preservó tal cual al extraer el
  componente, no se "corrigió" sin que lo pidan.
- El ícono y título del chip de "contenido" cambian: `food` dice "Contenido actual" (ícono
  de lista), `water` dice "Nivel actual" (ícono de gota).

---

## Ver también

- [[18_UI/Componentes/README_Componentes]]
- [[29_Specs/SPEC_03_Objetivos_Monitoreo]] — por qué Hidratación no tiene un modelo de detección real todavía
