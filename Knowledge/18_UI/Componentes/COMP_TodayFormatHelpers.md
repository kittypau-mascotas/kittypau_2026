---
id: comp_today_format_helpers
title: Componente — today-format (helpers puros)
type: component
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - componente
  - today
  - helpers
related:
  - [[00_HOME]]
  - [[18_UI/Componentes/README_Componentes]]
---

# Componente — today-format (helpers puros)

> Archivo: `kittypau_app/src/app/(app)/today/_lib/today-format.tsx`

---

## Objetivo

Centralizar 6 funciones de formato/presentación que antes estaban **redefinidas dentro del
cuerpo de `TodayPage`** (recalculadas en cada render, sin motivo — son puras, no dependen de
ningún estado del componente). Extraídas el 2026-08-11 junto con `BarrasSimsCard` y
`BowlWellnessCard`, que son sus consumidores principales.

No es un componente visual — es una librería de funciones puras (`.tsx` solo porque
`renderTrend()` devuelve JSX).

---

## Funcionamiento

| Export | Firma | Qué hace |
|---|---|---|
| `powerDotStyles` | `Record<"on"\|"off"\|"nodata", string>` | Clases Tailwind del punto de color junto al título de cada card |
| `getConnectivityLabel(timestamp)` | `(string\|null) => string` | "Estable" (≤10min) / "Reciente" (≤45min) / "Atrasada" (≤180min) / "Sin señal" — umbrales fijos, no vienen de investigación, son de sentido común de UX |
| `getBatteryStateLabel(state, level)` | `(...) => {text, className}` | Traduce `battery_state`/`battery_level` crudos de Supabase a texto + color |
| `getOperationalLabel(powerState)` | `(...) => string` | "Dispositivo encendido/apagado/Sin telemetría" |
| `getWellnessToneClasses(stateLabel, type)` | `(...) => string` | Color del badge de estado (`Confirmado` = verde/celeste según `food`/`water`, cualquier otro = gris) |
| `renderTrend(current, previous)` | `(...) => JSX \| null` | Flechita ▲/▼ si el valor subió/bajó desde la lectura anterior; `null` si no hay cambio significativo (`< 0.001`) |

**Quién los consume:** `BarrasSimsCard`, `BowlWellnessCard`, y potencialmente cualquier
componente nuevo bajo `today/_components/` que necesite el mismo tipo de formato.

---

## Sin métricas propias

Estas funciones no calculan nada nuevo — solo traducen valores que ya vienen calculados
(desde `hunger-bar.ts`, `buildWellnessState()`, o columnas crudas de Supabase) a texto/color
para la UI.

---

## Ver también

- [[18_UI/Componentes/README_Componentes]]
- [[18_UI/Componentes/COMP_BarrasSimsCard]]
- [[18_UI/Componentes/COMP_BowlWellnessCard]]
