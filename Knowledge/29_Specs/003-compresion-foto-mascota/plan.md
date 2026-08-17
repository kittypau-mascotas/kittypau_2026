# Implementation Plan: Compresión Automática de Foto de Mascota

**Branch**: `003-compresion-foto-mascota` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/003-compresion-foto-mascota/spec.md`

## Summary

Hoy 2 pantallas rechazan de plano cualquier foto de mascota de más de 5MB
(`pet/page.tsx` y `registro-flow.tsx`), aunque una de las dos ya tiene la
maquinaria de compresión (canvas + JPEG) que resolvería el problema — solo
que corre después del rechazo y solo si el usuario abre manualmente un editor
de recorte opcional. El fix: extraer esa lógica a una función compartida
nueva (`src/lib/utils/photo-compress.ts`) que se ejecuta **automáticamente**
al seleccionar cualquier foto en ambas pantallas — downscale proporcional +
reencode JPEG iterativo hasta entrar bajo el límite — reemplazando el gate
de "rechazar si pesa más de X" por "reducir hasta que pese menos de X". Cero
dependencias nuevas (Canvas API nativa, mismo patrón que ya usa
`applyCrop()`).

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router), React client components (`"use client"`)

**Primary Dependencies**: Ninguna nueva. Reutiliza `@supabase/supabase-js` (`getSupabaseBrowser()`, ya usado en ambos archivos) y Canvas API nativa del navegador (`HTMLCanvasElement`, `Image`/`createImageBitmap`, `Blob`) — mismo patrón que `applyCrop()` en `registro-flow.tsx` ya usa hoy.

**Storage**: Supabase Storage, bucket `kittypau-photos` (sin cambios de bucket/políticas — mismos paths `pets/${petId}.${ext}` y `pets/${random}.${ext}` que ya existen).

**Testing**: Vitest (`npm run test` → `vitest run`, ya configurado en el proyecto) para la lógica de la función de compresión; validación manual end-to-end vía `quickstart.md` para la subida real (Canvas/Blob no rasterizan de verdad en jsdom).

**Target Platform**: Navegador web (incluye el WebView de la app móvil vía Capacitor, per `capacitor.config.ts` — la Canvas API es soportada ahí igual que en un navegador de escritorio/móvil estándar).

**Project Type**: Web app (Next.js App Router, single app en `kittypau_app/`) — no aplica la estructura backend/frontend separada del template, es un cambio 100% client-side.

**Performance Goals**: La reducción de una foto de celular típica (hasta ~20MB) debe completarse en el navegador sin que el usuario perciba el "Subiendo..."/guardado como colgado — referencia: unos pocos segundos en un dispositivo de gama media, no debe bloquear el hilo principal de forma perceptible más allá de eso.

**Constraints**: Sin librerías nuevas (restricción explícita del usuario). No modificar el bucket/políticas de Supabase Storage. No agregar un paso de UI obligatorio nuevo (el recorte manual existente en registro sigue siendo opcional).

**Scale/Scope**: 1 módulo nuevo (`src/lib/utils/photo-compress.ts` + test), 2 archivos existentes modificados (`pet/page.tsx`, `registro-flow.tsx`) para consumir el módulo en vez de su lógica actual de rechazo/compresión ad-hoc.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Ponytail**: la función compartida nueva es el diff mínimo que elimina
  la duplicación real (1 flujo comprime pero tarde y opcional, el otro no
  comprime nada) — no se introduce una abstracción especulativa, ambos
  call-sites la necesitan hoy. Ladder aplicado: ¿ya existe en el codebase? →
  sí, parcialmente (`applyCrop`), se extrae y generaliza en vez de
  reimplementar desde cero. **Cambios quirúrgicos**: tocar solo
  `uploadPetPhoto`/el handler de `pet/page.tsx` y `preparePhoto`/`uploadPhoto`
  de `registro-flow.tsx` — `applyCrop()` (el editor de recorte manual) se
  deja intacto, no se reformatea el resto de ninguno de los 2 archivos
  (~2200 y ~2300 líneas respectivamente, ambos con mucho código no
  relacionado). PASA.
- **II. Fix de Bug = Causa Raíz**: la causa raíz es el gate de tamaño
  aplicado sobre el archivo original sin comprimir — el fix ataca eso
  directamente (comprimir antes del gate, no subir el límite ni parchear el
  mensaje de error). PASA.
- **III. No-Negociables**: validación en trust boundary (tamaño de archivo
  antes de subir) se mantiene, se hace más permisiva en la entrada pero
  sigue existiendo como gate real antes de la subida (FR-005) — no se
  elimina, se mueve a después de la reducción. Sin escrituras a producción
  fuera de lo que ya existe (mismo bucket, mismas políticas). PASA.
- **V. Motor Matemático**: no aplica, este feature no toca `Ciclo_Alpha_v2`
  ni `shape_features_v2.py`.
- **VII. Knowledge Vault**: spec y plan viven en `Knowledge/29_Specs/`
  (verificado, no en `specs/` de la raíz). PASA.

Sin violaciones. Tabla de Complexity Tracking no aplica (vacía).

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/003-compresion-foto-mascota/
├── spec.md               # Especificación (ya creada por /speckit-specify)
├── plan.md               # Este archivo
├── research.md           # Fase 0 — hallazgos y decisiones técnicas
├── data-model.md          # Fase 1 — ciclo de vida transitorio del archivo
├── quickstart.md          # Fase 1 — guía de validación manual + automatizada
└── checklists/
    └── requirements.md    # Checklist de calidad del spec (ya validado)
```

Sin `contracts/`: este feature no expone ni consume ninguna interfaz externa
nueva (no hay endpoint nuevo, no hay librería pública nueva) — solo
preprocesa el archivo antes de llamar a la subida a Supabase Storage que ya
existe en ambos flujos. Ver regla "Skip if project is purely internal" del
propio comando.

### Source Code (repository root)

```text
kittypau_app/src/
├── lib/
│   └── utils/
│       ├── photo-compress.ts       # NUEVO — downscale + reencode JPEG iterativo
│       └── photo-compress.test.ts  # NUEVO — tests unitarios (Vitest)
└── app/
    ├── (app)/pet/page.tsx                          # MODIFICADO — uploadPetPhoto usa photo-compress
    └── (public)/login/_components/registro-flow.tsx # MODIFICADO — preparePhoto usa photo-compress
```

**Structure Decision**: proyecto único (Next.js App Router), sin separación
backend/frontend — el cambio es enteramente client-side. Módulo nuevo en
`src/lib/utils/`, mismo patrón ya establecido ahí (`api.ts`/`api.test.ts`) y
en `src/lib/hunger-bar.ts`/`hunger-bar.test.ts` — archivo chico
autocontenido con su test co-ubicado, sin subcarpeta nueva.

## Complexity Tracking

*Sin violaciones que justificar — tabla vacía a propósito.*
