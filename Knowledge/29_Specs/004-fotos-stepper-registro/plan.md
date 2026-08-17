# Implementation Plan: Fotos en el Stepper de Registro

**Branch**: `004-fotos-stepper-registro` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/004-fotos-stepper-registro/spec.md`

## Summary

El stepper de registro (dueño en `page.tsx`) hoy muestra "✓" en el círculo de
un paso completado, sin importar qué foto haya elegido la persona. El avatar
de usuario (`registerAvatar`) ya vive en `page.tsx` y está disponible sin
cambios; la foto de mascota (`petPhotoPreview`) vive dentro de `RegistroFlow`
y no se expone hacia el padre hoy. Fix: agregar un callback nuevo
(`onPetPhotoPreviewChange`, mismo patrón que `onProgress`/`onDeviceTypeChange`
ya existentes) para levantar esa URL, y extender la cadena de condiciones ya
existente del círculo del stepper con 2 casos nuevos (paso 1 → avatar, paso 2
→ foto de mascota) antes del fallback "✓" que se mantiene para los casos sin
foto.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router), React client components (`"use client"`)

**Primary Dependencies**: Ninguna nueva — React `useState`/`useEffect` estándar, mismo patrón de callback ya usado 2 veces en `registro-flow.tsx`.

**Storage**: N/A — sin cambios de schema ni de qué se persiste (ver `data-model.md`).

**Testing**: Sin test unitario dedicado (no hay `@testing-library/react` instalado, ver `research.md` § Testing) — `tsc --noEmit` + `eslint` + validación manual vía `quickstart.md`.

**Target Platform**: Navegador web (incluye WebView de Capacitor, sin diferencia — es JSX condicional plano).

**Project Type**: Web app (Next.js App Router) — cambio 100% client-side, 2 archivos existentes.

**Performance Goals**: Ninguno nuevo — reutiliza URLs de imagen ya en memoria (`registerAvatar` es una ruta estática, `petPhotoPreview` es un blob local ya creado por spec 003), sin requests de red adicionales.

**Constraints**: Sin librerías nuevas. No modificar cuándo/qué se persiste (FR explícito: puramente visual). No romper el orden de prioridad ya existente error > marca > completado > número.

**Scale/Scope**: 2 archivos modificados (`page.tsx`, `registro-flow.tsx`), 1 prop nuevo, 2 estados nuevos en `page.tsx`, ~15-20 líneas de JSX condicional adicional.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Ponytail**: el callback nuevo replica un patrón ya usado 2 veces en el
  mismo archivo para el mismo propósito (level más bajo del ladder: "¿ya
  existe en este codebase?" → sí, reutilizado). Sin Context, sin librería de
  estado global, sin componente nuevo para 15 líneas de JSX — la abstracción
  mínima que resuelve el pedido. **Cambios quirúrgicos**: se toca solo
  `RegistroFlowProps`, el nuevo `useEffect`, la invocación de `<RegistroFlow>`,
  y el `span login-step2-dot` — nada del resto de los ~2300+2200 líneas de
  ambos archivos (mucho de eso es UI de trial/login/otros pasos, no
  relacionado). PASA.
- **II. Fix de Bug = Causa Raíz**: no aplica — no es un bug, es una mejora
  visual pedida explícitamente.
- **III. No-Negociables**: sin trust boundary nuevo, sin escritura a
  producción nueva (Supabase no se toca). Accesibilidad: el `<img>` del
  círculo necesita `alt` descriptivo (ej. "Tu foto de perfil"/"Foto de tu
  mascota"), no decorativo — a diferencia del logo de marca que sí usa
  `alt=""` porque es puramente decorativo, acá la foto SÍ transmite
  información (de quién es la cuenta/mascota). PASA, con ese detalle
  incorporado a las tareas de implementación.
- **VII. Knowledge Vault**: spec/plan viven en `Knowledge/29_Specs/`
  (verificado). PASA.

Sin violaciones. Tabla de Complexity Tracking no aplica (vacía).

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/004-fotos-stepper-registro/
├── spec.md
├── plan.md               # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

Sin `contracts/`: no hay interfaz externa nueva — el prop `onPetPhotoPreviewChange`
es interno entre 2 componentes del mismo árbol React, no una interfaz pública
ni un endpoint.

### Source Code (repository root)

```text
kittypau_app/src/app/(public)/login/
├── page.tsx                          # MODIFICADO — nuevo estado, nuevo prop wired, JSX del stepper extendido
└── _components/
    └── registro-flow.tsx             # MODIFICADO — nuevo prop en RegistroFlowProps + useEffect que lo notifica
```

**Structure Decision**: sin archivos nuevos — el feature es enteramente
aditivo dentro de los 2 componentes que ya existen y ya se comunican entre sí
por props/callbacks.

## Complexity Tracking

*Sin violaciones que justificar — tabla vacía a propósito.*
