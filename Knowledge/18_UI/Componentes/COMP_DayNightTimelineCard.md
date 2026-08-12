---
id: comp_day_night_timeline_card
title: Componente — DayNightTimelineCard
type: component
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - componente
  - today
  - graficos
related:
  - [[00_HOME]]
  - [[18_UI/Componentes/README_Componentes]]
---

# Componente — DayNightTimelineCard

> Archivo: `kittypau_app/src/app/(app)/today/_components/day-night-timeline-card.tsx`

---

## Objetivo

La card con la ilustración de ciclo día/noche (amanecer/día/atardecer/noche) + los eventos
de Alimentación/Hidratación superpuestos + navegación de ciclo (anterior/hoy/siguiente).
Es lo primero que un usuario asocia visualmente con "el timeline del día" en `/today`.

---

## Funcionamiento

**Es solo la carcasa visual — no calcula nada.** Todo el cómputo pesado sigue en
`page.tsx` porque depende de ~15 variables de estado de la página (sesiones de audit
events, devices, ventana de tiempo) que no se movieron en esta extracción:

| Prop | De dónde viene en `page.tsx` |
|---|---|
| `dayCycleOffsetDays` / `onOffsetChange` | `useState` + `setDayCycleOffsetDays` — cuántos ciclos hacia atrás se está mirando |
| `rangeTitle` | `dayNightRangeTitle` — "hoy" o la fecha del ciclo mostrado |
| `chartData` | `dayNightChartData` (`useMemo`) — 2 datasets (Alimentación/Hidratación) desde `bowlDayNightPoints`/`waterDayNightPoints` |
| `chartOptions` | `dayNightChartOptions` (`useMemo`) — tooltip callbacks que resuelven texto por sesión (`findSessionForPoint`, `deviceAuditEvents`) |
| `backgroundPlugin` | `dayNightBackgroundPlugin` (`useMemo`) — plugin de Chart.js que dibuja `dayNightBackground` (imagen precargada) como fondo del canvas vía `ctx.drawImage()` |
| `chartLoadError` / `mqttLiveError` | Estados de error de carga | 
| `isAuthoritativeFoodDevice` / `authoritativeDeviceCode` | Si el device activo es el que tiene evidencia auditada (`KPCL0034`) |

**⚠️ La ilustración de mañana/día/tarde/noche que se ve no es una imagen `<img>` de fondo ni
el componente D3 `DayCycleChart.tsx`** (ver nota abajo) — es un **plugin de Chart.js**
(`dayNightBackgroundPlugin`) que dibuja una imagen precargada directo sobre el `<canvas>`
con `ctx.drawImage()`, en modo "cover". Los puntos de Alimentación/Hidratación son datasets
normales de Chart.js con `pointStyle` custom (íconos de plato/agua).

---

## Nota — `DayCycleChart.tsx` / `useDayCycleData.ts` eran código muerto — eliminados

Al extraer este componente se confirmó que **`today/DayCycleChart.tsx` y
`today/useDayCycleData.ts` no se importaban desde ningún lado del código** (`grep` en todo
`src/`, cero resultados). Era un chart D3 (SVG) con fondo de franjas de color por hora +
íconos de sesión animados — una implementación distinta y más simple que la que realmente
está en producción (el plugin de Chart.js de arriba). **Eliminados el 2026-08-11 a pedido
de Mauro**, para no dejar confusión sobre cuál de los 2 charts es el real. `d3` y
`@types/d3` quedaron como dependencias sin uso en `package.json` — no se desinstalaron en
esta pasada (tocar `package.json`/lockfile es un paso aparte).

---

## Ver también

- [[18_UI/Componentes/README_Componentes]]
