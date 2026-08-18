# Implementation Plan: Solo Placeholder, Nunca Autocompletar en Login/Registro

**Branch**: `006-solo-placeholder-sin-autocompletar` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/006-solo-placeholder-sin-autocompletar/spec.md`

## Summary

Los campos de email/contraseña de login, registro y recuperar contraseña
siguen pre-llenándose con datos guardados por el navegador (confirmado en
vivo esta sesión: causó un "User already registered" real al reofrecer un
email+contraseña de una prueba anterior). `autoComplete="off"`/
`"new-password"` no alcanzan — Chrome los ignora para campos que reconoce
como credenciales. Fix: patrón `readOnly` hasta el primer foco/click en los
5 campos relevantes — técnica nativa HTML que sí es respetada por los
navegadores. Se elimina además el `<datalist>` propio de spec 004 (email de
login), que este pedido vuelve obsoleto por ser más estricto.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router), React client component.

**Primary Dependencies**: Ninguna nueva — `useState` + atributos HTML nativos (`readOnly`, `autoComplete`).

**Storage**: N/A — se elimina el único uso de `localStorage` que este archivo tenía para este propósito (`known-emails.ts`, spec 004).

**Testing**: Sin test unitario dedicado (comportamiento de navegador real, ver `research.md` § Testing) — `tsc`/`eslint` + `quickstart.md` manual.

**Target Platform**: Navegador web (login/registro/reset son rutas públicas, sin diferencia de Capacitor acá).

**Project Type**: Web app (Next.js App Router) — 1 archivo modificado, 2 archivos eliminados (módulo de spec 004 que queda sin uso).

**Performance Goals**: Ninguno — cambio de atributos/estado local, sin requests de red adicionales.

**Constraints**: Sin librerías nuevas (explícito en el pedido). No romper el llenado normal por teclado/paste ni el submit de ningún formulario. Debe convivir con la validación ya existente de cada campo (mensajes de error bajo el input no cambian).

**Scale/Scope**: 1 archivo modificado (`page.tsx`, 5 campos: email login, password login, email reset, email registro, password registro), 2 archivos eliminados (`known-emails.ts`, `known-emails.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Ponytail**: técnica 100% nativa (HTML `readOnly` + un `useState` por
  campo), sin librería nueva — ladder paso 4 (feature de la plataforma).
  **Eliminación sobre adición**: se borra `known-emails.ts` completo en vez
  de dejarlo como código muerto sin consumidor (código muerto generado por
  este mismo cambio, no preexistente — corresponde borrarlo de paso). PASA.
- **II. Fix de Bug = Causa Raíz**: la causa raíz confirmada en vivo es que
  `autoComplete` no es suficiente señal para los navegadores modernos en
  campos de credenciales — el fix ataca eso directamente (una técnica que
  sí funciona), no agrega un mensaje de advertencia ni un parche cosmético.
  PASA.
- **III. No-Negociables**: accesibilidad — un campo `readOnly` sigue siendo
  perfectamente accesible (foco, lectura de placeholder/label por lector de
  pantalla); pasar a editable en el primer foco no introduce ninguna
  barrera nueva, y el label/tooltip de cada campo no cambia. PASA.
- **VII. Knowledge Vault**: spec/plan viven en `Knowledge/29_Specs/`
  (verificado). PASA.

Sin violaciones. Tabla de Complexity Tracking no aplica (vacía).

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/006-solo-placeholder-sin-autocompletar/
├── spec.md
├── plan.md               # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

Sin `contracts/`: no hay interfaz externa — comportamiento de formulario
100% client-side.

### Source Code (repository root)

```text
kittypau_app/src/
├── app/(public)/login/
│   └── page.tsx                          # MODIFICADO — readOnly-hasta-foco en 5 campos, quita <datalist>
└── lib/utils/
    ├── known-emails.ts                   # ELIMINADO — sin consumidor tras este cambio
    └── known-emails.test.ts              # ELIMINADO — junto con el módulo
```

**Structure Decision**: sin archivos nuevos — todo el cambio vive en
`page.tsx`, que ya es donde viven los 3 formularios. Se elimina, no se
agrega, el único módulo que quedaría huérfano.

## Complexity Tracking

*Sin violaciones que justificar — tabla vacía a propósito.*
