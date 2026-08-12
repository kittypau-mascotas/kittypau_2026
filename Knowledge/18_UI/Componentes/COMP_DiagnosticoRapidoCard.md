---
id: comp_diagnostico_rapido_card
title: "Componente — DiagnosticoRapidoCard"
type: component
status: active
owner: Mauro
created: 2026-08-12
updated: 2026-08-12
tags:
  - componente
  - diagnostico
  - bowl
  - today
  - pet
related:
  - [[00_HOME]]
  - [[18_UI/Componentes/README_Componentes]]
  - [[29_Specs/SPEC_02_UIUX_Mejoras]]
---

# Componente — DiagnosticoRapidoCard

> Archivo: `kittypau_app/src/app/_components/diagnostico-rapido-card.tsx`
> Lógica: `kittypau_app/src/lib/device-diagnostics.ts`

---

## Objetivo

Panel "Diagnóstico rápido" — 3 columnas (Conexión/Energía/Firmware) + "Acciones
recomendadas" en lenguaje simple. Nació en `/bowl` y [[29_Specs/SPEC_02_UIUX_Mejoras]]
(ítem U2) lo identificó como el mejor patrón de confianza-en-los-datos de la app —
explica *por qué* falta información en vez de solo mostrar "N/D". Generalizado a
`/today` y `/pet` el 2026-08-12 para que el usuario tenga el mismo nivel de
explicación accionable en las 3 pantallas con datos de sensor.

---

## Funcionamiento

**Props de entrada:**

| Prop | Tipo | De dónde viene |
|---|---|---|
| `title` | `string` (opcional, default "Diagnóstico rápido") | Página que lo consume — en `/today` y `/pet` se pasa "· Comedero"/"· Bebedero" porque hay 2 dispositivos; en `/bowl` no hace falta (1 solo dispositivo seleccionado) |
| `connectionHint` | `string` | `getConnectionHint(device.last_seen)` |
| `batterySummary` | `string` | `getBatterySummary(...).summary` |
| `batteryExtra` | `string` | `getBatterySummary(...).extra` |
| `actionNotes` | `string[]` | `getActionNotes({ batteryLevel, lastSeen })` |
| `children` | `React.ReactNode` (opcional) | Contenido extra dentro de la misma card — usado solo en `/bowl` para los 2 botones deshabilitados "Calibración remota"/"Reinicio remoto" (roadmap, específicos del flujo de configuración de `/bowl`, no forman parte del patrón genérico) |

**Quién lo consume:** `(app)/bowl/page.tsx`, `(app)/today/page.tsx`, `(app)/pet/page.tsx`.

**Datos externos que toca directo:** ninguno, 100% presentacional. Toda la lógica de
umbrales vive en `@/lib/device-diagnostics.ts` (`getConnectionHint`, `getStatusSummary`,
`getActionNotes`, `getStatusBlurb`, `getBatterySummary`, `batteryHealthLabel`) — pura,
sin fetch, extraída **tal cual** de `/bowl` (cero cambio de comportamiento) para que
`/today` y `/pet` calculen exactamente los mismos umbrales sobre sus propios objetos de
dispositivo (`battery_level`, `battery_voltage`, `battery_source`, `battery_is_estimated`,
`last_seen` — mismas columnas de la tabla `devices` en los 3 casos).

---

## Métricas / fórmulas

- **Conexión:** `last_seen` vs ahora — ≤5min "tiempo real", ≤30min "recientemente", si no "inestable o apagado".
- **Energía:** `battery_level` — ≤15% "Crítica", ≤35% "Baja", ≤70% "Media", si no "Óptima".
- **Acciones recomendadas:** batería ≤15% → cargar pronto; ≤35% → planificar carga; sin `last_seen` → revisar energía/Wi-Fi; si ninguna aplica → "Todo estable."

Mismos umbrales que ya estaban en producción en `/bowl` desde antes — no se inventó
ningún número nuevo al generalizar.

---

## Características / variantes

- `/bowl`: una sola card (el dispositivo seleccionado en el selector superior), con los
  2 botones de roadmap como `children`.
- `/today` y `/pet`: hasta 2 cards lado a lado (`grid sm:grid-cols-2`) — una por
  Comedero, una por Bebedero — solo si el dispositivo respectivo existe. Sin
  `children` (sin botones de roadmap, esos son específicos del flujo de `/bowl`).
- `/today`: las cards de dispositivo NO tocan batería/conexión de "Barras Sims" — son
  paneles nuevos, independientes, debajo de `#today-bowls`.

---

## Sensible a cambios

Ninguno de los 3 dispositivos consumidores está en "Barras Sims" — no aplica la
restricción de [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]. Sí conviene
mantener `device-diagnostics.ts` como única fuente de los umbrales: si se cambia un
número acá, cambia para las 3 pantallas a la vez (deliberado).

---

## Ver también

- [[18_UI/Componentes/README_Componentes]]
- [[29_Specs/SPEC_02_UIUX_Mejoras]] — ítem U2, motivación original
