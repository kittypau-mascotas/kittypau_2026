# Implementation Plan: Motor de Evidencia Real en la Barra de Hambre

**Branch**: `007-evidence-engine-hunger-bar` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/007-evidence-engine-hunger-bar/spec.md`

## Summary

Reemplazar `classifySegment()` (reglas de magnitud/dirección/duración, ~51-58% de acierto sin
medir formalmente) en `kittypau_app/src/lib/hunger-bar.ts` por una clasificación calibrada
alimentación/servido/ruido que reproduce el Evidence Engine real de
`Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py` (80.0% accuracy fuera de
muestra, 527 anotaciones). Enfoque técnico (ver [research.md](./research.md)): conservar
`detectSegments()` (máquina de estados de detección) tal cual, agregar el sub-array de pesos
crudos al `Segment` detectado, portar a mano las 15 familias de features + `evidence_score()`
(z-score contra `comp_stats_v2.json` bundleado + discriminante de Fisher + softmax) sin librerías
nuevas, y validar el port contra dos capas de fixtures "golden" generadas desde los propios
datos ya calibrados de investigación (`features_anotaciones_v2.csv` para clasificación,
un subconjunto con arrays crudos para extracción). Alcance limitado a Alimentación — Agua queda
fuera (decisión ya tomada, ver spec).

## Technical Context

**Language/Version**: TypeScript (Next.js 16 App Router, Node.js runtime) — mismo stack que el
resto de `kittypau_app/src/lib` y `src/app/api`.

**Primary Dependencies**: ninguna nueva. Reutiliza lo ya instalado: Next.js (bundling de JSON
como asset estático vía `resolveJsonModule`), `vitest` (ya en `devDependencies`, ya usado por
`hunger-bar.test.ts`). FFT, `find_peaks`, skew/kurtosis y sample entropy se portan a mano (ver
research.md §3-6) — no se agrega `fft-js`, `scipy`-equivalente, ni ninguna lib de estadística.

**Storage**: N/A para la lógica (función pura sobre arrays en memoria). Un asset estático nuevo:
`kittypau_app/src/lib/evidence-engine/comp_stats_v2.json` (copia versionada de
`Investigacion/Ciclo_Alpha_v2/fase_0_ruido/data/comp_stats_v2.json`, ~37KB) — ver research.md §7.

**Testing**: `vitest` (`npm run test`, ya configurado). Tests co-ubicados
(`src/lib/evidence-engine/*.test.ts`), siguiendo el patrón ya usado por `hunger-bar.test.ts`.
Incluye un test de regresión de accuracy equivalente a
`Investigacion/.../tests/test_evidence_engine.py` (piso 65%, comparación SC-001 ≥75%).

**Target Platform**: Next.js server runtime (misma plataforma de deploy que
`/api/pets/[id]/hunger-bar/route.ts` hoy — sin infraestructura nueva).

**Project Type**: Web app existente (Next.js App Router) — no aplica ninguna de las 3 opciones
de estructura del template (no es library/cli, no es mobile+API); es una adición dentro del
mismo proyecto único ya existente.

**Performance Goals**: sin regresión perceptible sobre el request actual de
`/api/pets/[id]/hunger-bar` (hoy cacheado 30s, calculado on-demand). Las ventanas de segmento a
clasificar son cortas (1.5–15 min a paso de 30s ⇒ ≤~30 muestras), así que los métodos O(n²)
(DFT directa, sample entropy) son del orden de cientos de operaciones — sin impacto medible.

**Constraints**: sin librerías nuevas (no-negociable Ponytail + pedido explícito); no modificar
`detectSegments()` más allá de agregar el sub-array de pesos al `Segment` (FR-004/User Story 3);
no tocar Hidratación (FR-005); no cambiar la interfaz visual de la Barra de Hambre.

**Scale/Scope**: una función de clasificación reutilizada por segmento candidato (0-5 por
ventana de 10 días por mascota, según `WINDOW_DAYS` ya existente en la route); un asset de datos
de ~37KB por build.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio V (Motor Matemático v2 — Complejidad Justificada)** — GATE PRINCIPAL de esta
  feature. Exige leer el módulo completo y el contrato del Evidence Engine antes de tocarlo:
  cumplido antes de escribir el spec (`shape_features_v2.py` completo, 1139 líneas, y
  `Knowledge/11_ModelosIA/MODEL_EvidenceEngine.md` completo). La complejidad que se porta (102
  features, 15 familias, softmax calibrado) está justificada por el dominio — no es
  over-engineering nuevo, es la reproducción fiel de algo ya validado y documentado. **PASA**.
- **Principio I (Ponytail)** — el ladder se sube completo antes de decidir portar: (1) ¿necesita
  existir? sí — es el gap explícitamente documentado desde que se implementó v1 (comentario
  `ponytail:` en el propio `hunger-bar.ts` ya lo señala como pendiente); (2) ¿ya existe en el
  codebase? no en TS, solo en Python fuera del árbol de la app; (3-5) ¿lo resuelve
  stdlib/nativo/una dependencia ya instalada? no — FFT/find_peaks/entropías no tienen
  equivalente nativo en Node, de ahí el port a mano en vez de agregar una librería nueva (ver
  research.md). Ningún paso del ladder resuelve el problema sin escribir el port. **PASA**, con
  la complejidad heredada del Principio V como justificación explícita.
- **Principio III (No-Negociables)** — sin escrituras a producción en esta feature (solo lógica
  pura + un asset estático nuevo copiado a mano); el manejo de datos insuficientes (FR-007,
  degradar a "sin datos") es exactamente el tipo de "check ejecutable" que el principio exige
  dejar en código lazy no trivial. **PASA**.
- **Convivencia con Knowledge/29_Specs/** — feature vive en
  `Knowledge/29_Specs/007-evidence-engine-hunger-bar/`, `.specify/feature.json` ya apunta ahí.
  **PASA**.

Sin violaciones. Complexity Tracking: no aplica (tabla vacía).

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/007-evidence-engine-hunger-bar/
├── spec.md              # /speckit-specify output
├── checklists/
│   └── requirements.md
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

(Sin `contracts/`: esta feature no expone ni cambia ninguna interfaz externa nueva — la forma de
respuesta de `/api/pets/[id]/hunger-bar` no cambia, ver data-model.md §3. Es un cambio interno de
`kittypau_app/src/lib`.)

### Source Code (repository root)

```text
kittypau_app/src/lib/
├── hunger-bar.ts                    # MODIFICADO: Segment gana un campo de pesos crudos;
│                                     # classifySegment() delega en evidence-engine/
├── hunger-bar.test.ts                # existente, sin romper (User Story 3)
└── evidence-engine/                  # NUEVO — el port
    ├── comp_stats_v2.json            # copia versionada del calibrado real (research.md §7)
    ├── resample.ts                   # bucketing a 30s + ffill máx. 2 slots (research.md §2)
    ├── math-utils.ts                 # DFT directa, find_peaks a mano, skew/kurtosis,
    │                                 # sample/permutation/Shannon entropy, Higuchi/Katz FD,
    │                                 # Lempel-Ziv (research.md §3-6)
    ├── features.ts                   # extraerFeatures(): las 15 familias F00-F14,
    │                                 # 1:1 con shape_features_v2.py
    ├── evidence-score.ts             # evidenceScore(): normalización z-score +
    │                                 # discriminante de Fisher + softmax
    ├── types.ts                      # tipos compartidos (CompStats, FeatureMap, EvidenceResult)
    ├── math-utils.test.ts
    ├── features.test.ts               # golden fixtures capa de extracción (research.md §8.2)
    └── evidence-score.test.ts         # golden fixtures capa de clasificación + regresión
                                        # de accuracy (research.md §8.1)

kittypau_app/src/app/api/pets/[id]/hunger-bar/route.ts   # sin cambios de contrato (ver data-model.md)
```

**Structure Decision**: proyecto único ya existente (Next.js App Router) — se agrega un
submódulo autocontenido `src/lib/evidence-engine/` en vez de esparcir el port en archivos
sueltos, siguiendo el mismo patrón de organización por carpeta que ya usa el resto de `src/lib`.
`hunger-bar.ts` pasa a ser el "adaptador" entre `detectSegments()`/`computeHungerBar()` (sin
cambios de comportamiento externo) y el motor real.

## Complexity Tracking

> Sin violaciones que justificar — tabla omitida intencionalmente.
