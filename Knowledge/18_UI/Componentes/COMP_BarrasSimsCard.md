---
id: comp_barras_sims_card
title: Componente — BarrasSimsCard
type: component
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-12
tags:
  - componente
  - today
  - barras-sims
related:
  - [[00_HOME]]
  - [[18_UI/Componentes/README_Componentes]]
  - [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]
  - [[05_API/SPEC_HungerBar_Alimentacion]]
---

# Componente — BarrasSimsCard

> Archivo: `kittypau_app/src/app/(app)/today/_components/barras-sims-card.tsx`

---

## Objetivo

Mostrar de un vistazo, en el hero de `/today`, cuánto le queda a la mascota antes de la
próxima comida y el estado del bebedero — la primera cosa que un usuario mira al abrir la
app. Extraído de `today/page.tsx` el 2026-08-11 (antes vivía inline dentro del JSX del
hero, ~125 líneas mezcladas con el resto de la página).

---

## Funcionamiento

**Props de entrada:**

| Prop | Tipo | De dónde viene |
|---|---|---|
| `deviceId` | `string \| null \| undefined` | `bowlDevice?.device_id` — el comedero activo de la mascota |
| `bars` | `[BarKind, BarKind]` | Array armado en `page.tsx` con 2 entradas fijas: `food` y `water` (ver abajo) |
| `powerState` | `"on" \| "off" \| "nodata"` | `resolveDevicePowerState(bowlDevice)` — `lib/utils/api.ts` |
| `batteryState` / `batteryLevel` | `string \| null` / `number \| null` | `bowlDevice.battery_state` / `.battery_level`, columnas de Supabase actualizadas por el bridge |

Cada elemento de `bars` (`BarKind`) trae ya resuelto todo lo que el componente necesita
para pintar una barra: `filledBlocks` (0–20), `valueLabel`, `statusLabel`, `noteLabel`,
clases de color. El componente **no calcula nada** — es puramente presentacional, todo el
cálculo pasa antes en `page.tsx`.

**Quién lo consume:** `today/page.tsx`, sección `#today-hero`.

**Datos externos que toca directo:** ninguno — 100% presentacional.

---

## Métricas / fórmulas

El componente no calcula las métricas, solo las pinta — pero vale documentar de dónde salen
porque son las 2 únicas barras que existen hoy:

| Barra | Fuente real de la métrica |
|---|---|
| **Comida** | `hungerBar.percentage` de `GET /api/pets/:id/hunger-bar` → `computeHungerBar()` en `lib/hunger-bar.ts`. Fórmula: `100 × (1 − horas_desde_última_comida / intervalo_estimado)`, 100% = comió recién, decae a 0%. Ver [[05_API/SPEC_HungerBar_Alimentacion]]. |
| **Agua** | `waterWellness` de `buildWellnessState()` en `page.tsx` — basado en `audit_events` confirmados manualmente (`inicio_hidratacion`/`termino_hidratacion`), no en un modelo automático. Sin evidencia confirmada, muestra "Sin evidencia real" — no inventa un número. |

`getOperationalLabel()` y `getBatteryStateLabel()` (importados de `../_lib/today-format`)
solo traducen el `powerState`/`battery_state` crudo a texto — no son métricas nuevas.

---

## Características / variantes

- Grid fijo de 2 columnas (`grid-cols-2`) — pensado para exactamente 2 barras, no crece
  solo agregando más elementos al array `bars` sin ajustar el layout.
- `fillStyle` opcional permite un color de relleno calculado en runtime (usado por Comida,
  vía `hungerBarColor()` en `page.tsx` — gradiente continuo verde→rojo según `percentage`);
  Agua usa un gradiente CSS fijo en vez de `fillStyle`.
- **Estilo visual "líquido" (2026-08-12):** el track (`.kp-liquid-track`) y el fill
  (`.kp-liquid-fill`, ambos en `globals.css`) reemplazan el pill plano original por un
  efecto de cápsula con sombra neumórfica + un "menisco" redondeado en la superficie del
  relleno (un `::before` circular posicionado con `transform: translateY(-50%)` — no con
  `top: -50%`, que queda relativo al alto del propio fill y rompe el efecto al variar el
  %, error real cometido y corregido en la misma sesión). Adaptado de un loader decorativo
  de referencia (animación infinita con keyframes) a algo 100% data-driven: sin
  `@keyframes`, la altura sigue siendo `filledBlocks/WELLNESS_BLOCKS` calculado en
  `page.tsx`, sin cambios. Verificado visualmente en 0%, 30%, 65% y 100% vía Playwright
  (altura del DOM forzada por script, ninguna cuenta de prueba tenía datos reales en un %
  intermedio en el momento de verificar).

---

## Sensible a cambios

**No agregar barras nuevas a este widget sin proponerlo primero.** Ya se intentó sumar
"Rutina" y "Datos frescos" el 2026-08-11 y Mauro pidió revertirlo por completo, sin dar
razones puntuales — es la tercera vez que se revierte un cambio a este panel específico en
el historial del proyecto (ver `git log` #18, #20). Ver
[[29_Specs/SPEC_04_Metricas_Today_Investigacion]] para el detalle completo antes de volver a
proponer algo acá.

> El rediseño visual del 2026-08-12 (estilo "líquido" de arriba) es distinto de los 3
> reverts anteriores: Mauro lo pidió explícito, pegando el código de referencia y
> especificando "respetando funciones, cálculos y colores según el progreso" — no es una
> adición no solicitada de métricas/cards, es un cambio de skin sobre las 2 barras que ya
> existían. Cero cambio en `today/page.tsx` (props/cálculo/color intactos), solo en este
> componente + `globals.css`.

---

## Ver también

- [[18_UI/Componentes/README_Componentes]]
- [[05_API/SPEC_HungerBar_Alimentacion]] — fórmula de la barra de Comida
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — por qué este widget es sensible
