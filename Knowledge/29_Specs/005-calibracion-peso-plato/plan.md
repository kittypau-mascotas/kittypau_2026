# Implementation Plan: Calibración Automática del Peso del Plato (por Tara)

**Branch**: `005-calibracion-peso-plato` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/005-calibracion-peso-plato/spec.md`

## Summary

Hoy el paso 3 (Dispositivo) del registro pide el peso del plato a mano, en
un único formulario atómico que crea el dispositivo. El pedido reemplaza eso
por una secuencia guiada que ejecuta una tara física real (`CALIBRATE_WEIGHT`
ya existe, usado hoy como botón manual "Tarar" en `/bowl`) y **verifica** que
el resultado dio ~0, algo que el botón actual no hace. Esto obliga a
reordenar el paso: primero se vincula el dispositivo (crea la fila, sin
`plate_weight_grams`), y recién con el dispositivo ya real se ofrece la
calibración guiada. El hallazgo más importante de la investigación: el
cálculo de contenido en `today/page.tsx` YA maneja correctamente
`plate_weight_grams = null` (usa el peso bruto directo) — así que el camino
tara y el camino manual (respaldo) conviven sin tocar ningún cálculo
existente.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router), React client components; sin cambios de firmware (se reutiliza el comando `CALIBRATE_WEIGHT` ya implementado en `iot_firmware/javier_1a/firmware-esp8266`).

**Primary Dependencies**: Ninguna nueva — Supabase Realtime (`postgres_changes` sobre `readings`, patrón ya usado en `/bowl/page.tsx`), `device_commands` (ya existe, usado hoy para tara/intervalo), `@supabase/supabase-js` ya presente.

**Storage**: Supabase Postgres — sin columnas ni tablas nuevas (ver `data-model.md`). `devices.plate_weight_grams` se deja `null` en el camino tara.

**Testing**: Vitest para la función pura de umbral de confirmación ("¿esta lectura cuenta como ~0?"); `tsc`/`eslint`/`next build` + validación manual contra hardware real vía `quickstart.md` (sin mocks de MQTT/firmware en el proyecto).

**Target Platform**: Navegador web (incluye WebView de Capacitor) hablando con un dispositivo Kittypau físico real a través de Supabase + bridge + HiveMQ — no hay simulación de hardware disponible.

**Project Type**: Web app (Next.js App Router) — cambio de flujo dentro de `registro-flow.tsx`, sin nuevo proyecto ni servicio.

**Performance Goals**: Secuencia completa (conexión → plato → tara → confirmación) bajo 15 segundos con el dispositivo conectado (SC-001) — requiere acelerar temporalmente el intervalo de publicación de `SENSORS` (`SET_INTERVAL`, ya existe) durante la prueba.

**Constraints**: Sin cambios de firmware ni de protocolo MQTT — se reutiliza `CALIBRATE_WEIGHT`/`tare` y `SET_INTERVAL` tal como están documentados en `Knowledge/07_MQTT/README_MQTT.md`. La tara real es permanente (persistida en el dispositivo) — no-negociable (FR-009) que la secuencia guiada solo se ofrezca sobre un dispositivo recién vinculado sin lecturas propias todavía.

**Scale/Scope**: Reordena el paso 3 del registro en 2 sub-pasos (vincular → calibrar) dentro del mismo componente `registro-flow.tsx`; 1 componente/bloque de UI nuevo para la secuencia guiada; reutiliza endpoints ya existentes (`POST /api/devices`, `POST /api/devices/[id]/tare`, `POST /api/devices/[id]/interval`, `PATCH /api/devices/[id]` para el camino manual) sin necesitar ninguno nuevo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Ponytail**: se reutilizan 4 mecanismos ya existentes (tara, intervalo,
  Realtime sobre `readings`, cálculo de contenido con fallback a peso bruto)
  sin inventar ninguno nuevo — el único código genuinamente nuevo es la UI
  guiada y la función de umbral de confirmación. Descartada explícitamente
  una columna nueva (`calibrated_at`) por YAGNI (ver `research.md`). PASA.
- **II. Fix de Bug = Causa Raíz**: no aplica — no es un bug, es una mejora
  de UX/precisión sobre un flujo que ya funcionaba.
- **III. No-Negociables**: error handling que previene pérdida de datos —
  la secuencia nunca da una tara dudosa por buena sin verificarla (FR-004),
  y siempre deja un camino de salida (repetir o manual, FR-005/FR-008).
  **Hardware nunca es el ideal en papel**: el margen de "~0" usa el mismo
  criterio de ruido de sensor que ya documenta el protocolo (deadband 2g),
  no un cero exacto imposible en la práctica. PASA.
- **V. Motor Matemático**: no aplica directamente — pero el hallazgo de
  research.md (leer el firmware completo antes de decidir el mecanismo) es
  el mismo principio de "no simplificar sin entender el dominio físico"
  aplicado a hardware en vez de al Motor Matemático. El resguardo de FR-009
  (nunca tarar un dispositivo con historial) protege explícitamente la
  continuidad de peso absoluto que otras partes del sistema (incluido el
  pipeline de `Investigacion/`) asumen para dispositivos ya en producción.
  PASA.
- **VI. IoT/Firmware — verificar dos veces**: se leyó `mqtt_manager.cpp` y
  `sensors.cpp` completos antes de diseñar — confirmado que `CALIBRATE_WEIGHT`
  persiste en LittleFS (permanente). Este plan **no modifica firmware**, solo
  reutiliza el comando ya desplegado. PASA.
- **VII. Knowledge Vault**: spec/plan viven en `Knowledge/29_Specs/`
  (verificado). PASA.

Sin violaciones. Tabla de Complexity Tracking no aplica (vacía).

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/005-calibracion-peso-plato/
├── spec.md
├── plan.md               # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

Sin `contracts/`: no se agrega ningún endpoint nuevo — se reutilizan
`POST /api/devices`, `POST /api/devices/[id]/tare`,
`POST /api/devices/[id]/interval`, `PATCH /api/devices/[id]`, todos ya
documentados/existentes.

### Source Code (repository root)

```text
kittypau_app/src/
├── app/(public)/login/_components/
│   └── registro-flow.tsx          # MODIFICADO — paso 3 reordenado en 2 sub-pasos + secuencia guiada de tara
└── lib/utils/
    ├── plate-tare-check.ts         # NUEVO — función pura: ¿esta lectura confirma la tara? (umbral ~0)
    └── plate-tare-check.test.ts    # NUEVO — test unitario del umbral
```

**Structure Decision**: sin archivos de API nuevos (todo reutilizado). La
lógica de UI vive en `registro-flow.tsx` (mismo archivo que ya posee el
paso 3 hoy); la única lógica no-trivial que vale la pena aislar en su
propia función pura y testeable es la decisión de umbral de confirmación —
mismo patrón que `src/lib/utils/photo-compress.ts` (spec 003) y
`src/lib/utils/api.ts`: módulo chico en `src/lib/utils/` con su test
co-ubicado.

## Complexity Tracking

*Sin violaciones que justificar — tabla vacía a propósito.*
