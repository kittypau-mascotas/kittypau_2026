---
id: readme_componentes
title: Componentes de la app — índice
type: architecture
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - componentes
  - frontend
  - arquitectura
related:
  - [[00_HOME]]
  - [[18_UI/README_UI]]
  - [[04_Frontend/README_Frontend]]
  - [[_Templates/TPL_COMPONENTE]]
---

# Componentes de la app — índice

> Empezó el 2026-08-11 al extraer los primeros componentes de `today/page.tsx` (que llegó a
> 3101 líneas). Objetivo: cuando una página crece, lo que se saca de ella se documenta acá
> — no solo se mueve de archivo.

---

## Convención

- **Un doc por componente con lógica/props real.** Los puramente visuales sin estado propio
  (wrappers de estilo, iconos) no necesitan doc individual — se mencionan en el doc del
  componente que los usa.
- **Plantilla:** [[_Templates/TPL_COMPONENTE]] — Objetivo, Funcionamiento (props + de dónde
  vienen los datos), Métricas (si aplica, con fórmula citada), Características, Sensible a
  cambios (si aplica).
- **Ubicación en código:** cada página con componentes propios tiene su
  `pagina/_components/` y, si hace falta, `pagina/_lib/` para helpers puros compartidos
  entre esos componentes — ver `today/_components/` y `today/_lib/` como primer ejemplo.
- Este doc se actualiza cada vez que se extrae un componente nuevo de una página — no es
  retroactivo a todo el código existente, solo a lo que se va tocando.

---

## `/today` (`kittypau_app/src/app/(app)/today/`)

| Componente | Doc | Qué hace |
|---|---|---|
| `_components/barras-sims-card.tsx` | [[18_UI/Componentes/COMP_BarrasSimsCard]] | Widget "Barras Sims" (Comida/Agua) del hero |
| `_components/bowl-wellness-card.tsx` | [[18_UI/Componentes/COMP_BowlWellnessCard]] | Card de Alimentación/Hidratación — un componente para ambas |
| `_components/onboarding-guide-modal.tsx` | [[18_UI/Componentes/COMP_OnboardingGuideModal]] | Modal "Modo guía" de bienvenida |
| `_lib/today-format.tsx` | [[18_UI/Componentes/COMP_TodayFormatHelpers]] | Helpers puros de formato (batería, conectividad, tendencia) |
| `_components/day-night-timeline-card.tsx` | [[18_UI/Componentes/COMP_DayNightTimelineCard]] | Card del timeline día/noche con el chart de Alimentación/Hidratación |

> ⚠️ `DayCycleChart.tsx` + `useDayCycleData.ts` (en la raíz de `today/`, no en
> `_components/`) están **sin usar en ningún lado del código** — confirmado con `grep` al
> extraer `DayNightTimelineCard`. Ver [[18_UI/Componentes/COMP_DayNightTimelineCard]] para
> el detalle. No se borraron sin confirmar primero.

El resto de `today/page.tsx` (~2540 líneas) sigue siendo un componente monolítico con toda
la carga de datos, el hunger bar, los charts de consumo, el timeline de audit events, etc.
— no se documenta acá pieza por pieza porque no está partido en componentes todavía. Ver
[[29_Specs/SPEC_02_UIUX_Mejoras]] si se retoma ese trabajo.

---

## Ver también

- [[18_UI/README_UI]] — recorrido de pantallas completas
- [[04_Frontend/README_Frontend]] — arquitectura y estructura de carpetas
- [[_Templates/TPL_COMPONENTE]]
