---
id: comp_onboarding_guide_modal
title: Componente — OnboardingGuideModal
type: component
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - componente
  - today
  - onboarding
related:
  - [[00_HOME]]
  - [[18_UI/Componentes/README_Componentes]]
  - [[29_Specs/SPEC_02_UIUX_Mejoras]]
---

# Componente — OnboardingGuideModal

> Archivo: `kittypau_app/src/app/(app)/today/_components/onboarding-guide-modal.tsx`

---

## Objetivo

Modal "Modo guía" que recibe al usuario la primera vez que entra a `/today`: explica qué va
a ver y da 2 tips rápidos. Extraído el 2026-08-11 (antes ~50 líneas inline al final del
`return` de `page.tsx`).

---

## Funcionamiento

**Props de entrada:**

| Prop | Tipo | De dónde viene |
|---|---|---|
| `petLabel` | `string` | Nombre de la mascota activa, calculado en `page.tsx` |
| `ownerLabel` | `string` | Nombre del dueño/usuario, calculado en `page.tsx` |
| `onClose` | `() => void` | `() => setShowGuide(false)` en `page.tsx` |

**Quién lo consume:** `today/page.tsx`, renderizado condicionalmente cuando
`showGuide === true`.

**Datos externos que toca directo:** `window.localStorage` — al cerrar (por cualquiera de
los 2 botones), guarda `kittypau_guide_seen: "1"` para no volver a mostrarse. La lectura de
esa clave (para decidir `showGuide` inicial) sigue en `page.tsx`, no en este componente.

---

## Características / variantes

- 2 formas de cerrar: botón "Entendido" (se queda en `/today`) o link "Completar registro"
  (navega a `/registro`) — ambas marcan `kittypau_guide_seen` antes de actuar.
- Sin `role="dialog"`/`aria-modal`/focus trap — a diferencia de `<AccessibleModal>` (usado
  en `/bowl`), este modal no pasó por esa generalización todavía. Candidato a portar al
  mismo patrón si se vuelve a tocar (ver [[29_Specs/SPEC_02_UIUX_Mejoras]] U1).

---

## Ver también

- [[18_UI/Componentes/README_Componentes]]
- [[29_Specs/SPEC_02_UIUX_Mejoras]] — U3, generalizar este patrón a otras pantallas
