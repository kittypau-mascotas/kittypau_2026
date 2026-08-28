---
description: "Task list for Motor de Evidencia Real en la Barra de Hambre"
---

# Tasks: Motor de Evidencia Real en la Barra de Hambre

**Input**: Design documents from `Knowledge/29_Specs/007-evidence-engine-hunger-bar/`
(spec.md, plan.md, research.md, data-model.md, quickstart.md)

**Tests**: incluidos explícitamente — la propia spec (FR-002, SC-001/SC-002) exige verificar
la precisión contra el estándar ya medido en investigación, así que la validación por fixtures
"golden" no es opcional en esta feature.

**Organization**: agrupadas por user story (spec.md). Nota de alcance: US2 y US3 son aspectos
del mismo cambio de motor (exponer confianza / no romper lo existente) — dependen de que US1 ya
exista, no son slices totalmente independientes entre sí, pero cada una tiene su propio criterio
de verificación independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1/US2/US3, según spec.md

## Phase 1: Setup

**Purpose**: estructura del submódulo + fixtures golden que todo lo demás necesita.

- [X] T001 Crear la estructura de archivos vacíos de `kittypau_app/src/lib/evidence-engine/`
  (`types.ts`, `resample.ts`, `math-utils.ts`, `features.ts`, `evidence-score.ts`,
  `__fixtures__/` — carpeta) per [plan.md](./plan.md) §Project Structure
- [X] T002 [P] Escribir script de exportación de fixtures
  `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/scripts_export_fixtures_evidence_engine.py`: (a)
  copia `data/comp_stats_v2.json` → `kittypau_app/src/lib/evidence-engine/comp_stats_v2.json`;
  (b) exporta `data/features_anotaciones_v2.csv` + `data/comp_stats_v2.json` a
  `kittypau_app/src/lib/evidence-engine/__fixtures__/classification-golden.json` (research.md
  §8.1, 741 anotaciones); (c) para 30 anotaciones (10 por categoría), reconstruye el array
  crudo de pesos resampleado con el mismo pipeline exacto de `revisar_anotaciones_v2.py`
  (`cargar_resampled()`+`extraer_ventana()`) y lo empareja con las features ya calculadas en
  `features_anotaciones_v2.csv` en
  `kittypau_app/src/lib/evidence-engine/__fixtures__/extraction-golden.json` (research.md §8.2)
- [X] T003 Ejecutar el script de T002 una vez — verificado: `comp_stats_v2.json` (36979 bytes),
  `classification-golden.json` (741 anotaciones, 1.8MB), `extraction-golden.json` (30 muestras,
  77KB) generados correctamente

**Checkpoint**: fixtures y esqueleto de archivos listos — puede empezar Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: utilidades matemáticas compartidas que `features.ts` (US1) necesita para portar
las 15 familias del Evidence Engine. Nada de esto es visible por sí solo — es infraestructura.

**⚠️ CRITICAL**: ningún trabajo de US1 puede completarse sin esto.

- [X] T004 [P] Definir tipos compartidos en `kittypau_app/src/lib/evidence-engine/types.ts`:
  `CompStats`, `FeatureMap`, `EvidenceResult` per [data-model.md](./data-model.md) §1
- [X] T005 [P] Implementar resampleo a grilla fija de 30s (bucketing + promedio + forward-fill
  máx. 2 slots) en `kittypau_app/src/lib/evidence-engine/resample.ts` per research.md §2
- [X] T006 Implementar en `kittypau_app/src/lib/evidence-engine/math-utils.ts`: DFT directa
  O(n²) para el espectro (research.md §3), skew/kurtosis poblacional (research.md §5), entropía
  de Shannon/Sample/Permutation (research.md §6), dimensión fractal Higuchi/Katz, complejidad
  Lempel-Ziv — replicando 1:1 las fórmulas de `shape_features_v2.py`
- [X] T007 Implementar en el mismo `kittypau_app/src/lib/evidence-engine/math-utils.ts` el port
  a mano de `find_peaks` (picos, prominence, width por interpolación a `rel_height=0.5`) per
  research.md §4 (depende de T006 — mismo archivo, no paralelizable con T006)
- [X] T008 [P] `kittypau_app/src/lib/evidence-engine/math-utils.test.ts` — casos conocidos para
  DFT/find_peaks/skew/kurtosis/entropías (valores calculados a mano o contra casos triviales:
  señal constante, rampa lineal, señal senoidal simple) per [quickstart.md](./quickstart.md) §2 —
  4 de los casos se verificaron ejecutando el Python real (`shape_features_v2.py`) sobre los
  mismos fixtures y coinciden exactamente (shannon/sample_entropy/higuchi/lempel_ziv)

**Checkpoint**: utilidades matemáticas verificadas — US1 puede implementar `features.ts` sobre
una base ya correcta.

---

## Phase 3: User Story 1 - Detección de comidas reales con precisión validada (Priority: P1) 🎯 MVP

**Goal**: la Barra de Hambre clasifica alimentación/servido/ruido con el mismo criterio
calibrado que ya usa investigación (80% accuracy fuera de muestra).

**Independent Test**: sobre `classification-golden.json` (segmentos ya anotados), la
clasificación producida por el port coincide con la anotación humana en ≥75% de los casos
(SC-001), y el test de regresión (split 80/20, piso 65%) pasa igual que
`Investigacion/.../tests/test_evidence_engine.py`.

### Implementation for User Story 1

- [X] T009 [US1] Implementar `extraerFeatures()` (familias F00-F14, 102 features) en
  `kittypau_app/src/lib/evidence-engine/features.ts`, usando `resample.ts` (T005) y
  `math-utils.ts` (T006/T007) — 1:1 con `extraer_features()` de `shape_features_v2.py`
- [X] T010 [US1] `kittypau_app/src/lib/evidence-engine/features.test.ts` — valida
  `extraerFeatures()` contra `__fixtures__/extraction-golden.json` con las tolerancias de
  [data-model.md](./data-model.md) §2 (depende de T009, T003) — **31/31 tests en verde en el
  primer run** contra las 30 anotaciones reales (10 por categoría) procesadas por el propio
  Python real
- [X] T011 [US1] Implementar `evidenceScore()` (normalización z-score pooled contra
  `comp_stats_v2.json`, discriminante tipo Fisher `computeDataDrivenWeights()`, softmax final)
  en `kittypau_app/src/lib/evidence-engine/evidence-score.ts` — 1:1 con `evidence_score()` de
  `shape_features_v2.py` (depende de T004, T003). No se portó el fallback legado
  `EVIDENCE_WEIGHTS` (comentario `ponytail:` explicando por qué no aplica acá)
- [X] T012 [US1] `kittypau_app/src/lib/evidence-engine/evidence-score.test.ts` — 4 tests:
  softmax suma 1.0, sin NaN, accuracy in-sample reproduce **exactamente** el número del Python
  real (0.7152496626180836, verificado ejecutando `shape_features_v2.py` directamente — bit a
  bit idéntico), y split 80/20 propio ≥65% (piso) y ≥75% (SC-001, corregido — ver spec.md).
  **53/53 tests en verde** en todo `src/lib/evidence-engine`
- [X] T013 [US1] En `kittypau_app/src/lib/hunger-bar.ts`: `Segment` extendido con
  `weights: ReadingPoint[]`; `detectSegments()` sin cambios en su máquina de estados, solo
  conserva el sub-array; se agregó `classifyWeightSegment()` en `evidence-score.ts` (resamplea,
  guarda FR-007 <3 muestras, llama `extraerFeatures()`+`evidenceScore()` con
  `comp_stats_v2.json` bundleado) y `classifySegment(deltaG, durationMin)`/`triangularScore()`
  (v1, ahora código muerto) se eliminaron por completo
- [X] T014 [US1] Comentario de cabecera de `kittypau_app/src/lib/hunger-bar.ts` reescrito — ya
  no dice "pendiente", referencia `./evidence-engine/` y
  `Knowledge/29_Specs/007-evidence-engine-hunger-bar/`. `npx tsc --noEmit` limpio en todo el
  proyecto y `hunger-bar.test.ts` (fixture preexistente) sigue en verde sin tocar sus
  aserciones — el Evidence Engine real clasifica ese mismo fixture como "alimentacion"

**Checkpoint**: `npm run test -- src/lib/evidence-engine` en verde — US1 funcional y testeable
de forma independiente.

---

## Phase 4: User Story 2 - Confianza visible, no caja negra (Priority: P2)

**Goal**: la confianza reportada por la Barra de Hambre es la del Evidence Engine real, no un
score arbitrario.

**Independent Test**: para una comida real detectada, `lastMealConfidence` en la respuesta de
`computeHungerBar()`/`/api/pets/[id]/hunger-bar` coincide con `EvidenceResult.confianza` del
segmento ganador.

### Implementation for User Story 2

- [X] T015 [US2] Verificado: `computeHungerBar()` no se tocó — sigue asignando
  `lastMealConfidence` desde `lastMeal.confidence`, que ahora llega poblado con
  `EvidenceResult.confianza` (0-1) desde T013, sin transformación adicional
  ([data-model.md](./data-model.md) §3)
- [X] T016 [P] [US2] Agregado en `kittypau_app/src/lib/hunger-bar.test.ts`: caso que llama
  `classifyWeightSegment()` directo sobre el segmento del fixture y confirma que
  `lastMealConfidence` coincide con esa confianza real — 7/7 tests en verde

**Checkpoint**: US1 + US2 funcionando juntas — la confianza mostrada es trazable al motor real.

---

## Phase 5: User Story 3 - El comportamiento actual no se rompe (Priority: P3)

**Goal**: decaimiento, alerta y fallback de la Barra de Hambre siguen funcionando igual que
antes del reemplazo del clasificador.

**Independent Test**: el fixture ya existente en `hunger-bar.test.ts`
(`readingsFromMeal`/`mealDetectedAt`) sigue pasando sin modificar sus aserciones de
comportamiento (deltaG, startAt, category, decaimiento).

### Implementation for User Story 3

- [X] T017 [US3] `hunger-bar.test.ts` existente pasó sin cambios contra el nuevo clasificador;
  se agregó la aserción `segments[0].weights.length > 0` sin tocar las aserciones existentes
- [X] T018 [P] [US3] Verificación completa desde `kittypau_app/`: `npx tsc --noEmit` (0
  errores, proyecto completo), `npx eslint` sobre `evidence-engine/` + `hunger-bar.ts` +
  `hunger-bar.test.ts` (0 warnings/errores), `npx vitest run` completo (**99/99 tests en
  verde**, 9 archivos), `npm run build-check` (**build de producción exitoso**, incluye
  `/api/pets/[id]/hunger-bar` compilado sin errores)

**Checkpoint**: las 3 user stories funcionan juntas, nada del comportamiento previo se rompió.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md` actualizado: status
  `v1-implementado` → `v2-implementado`, tabla §0 con la fila de clasificación marcada ✅
  resuelta, enlace a `29_Specs/007-evidence-engine-hunger-bar/spec`
- [X] T020 [P] `Knowledge/11_ModelosIA/MODEL_EvidenceEngine.md` actualizado: fila nueva en
  "Dónde se usa" para producción TS + procedimiento de recalibración; **hallazgo real**
  documentado: el 80.5% in-sample de 2026-08-13 (527 anotaciones) ya no aplica al dataset
  actual (741 anotaciones) — in-sample da 71.5% hoy, held-out da 77.0% (la cifra que
  corresponde comparar, ver corrección en spec.md SC-001)
- [X] T021 Verificación end-to-end sobre datos reales de KPCL0034 (variante más directa que
  abrir el navegador: se trajeron las últimas ~9h de lecturas reales de KPCL0034 desde
  Supabase — el dispositivo se reconectó hoy 2026-08-28 — y se corrió `computeHungerBar()`
  real en un smoke test temporal, luego borrado). Resultado real observado: detectó
  correctamente 5 segmentos "servido" (el tareo/llenado de esta sesión), 1 "ruido", y 1
  "alimentacion" real (Δ-14g/3min, confianza 1.0) → `status: "ok"`, `percentage: 43`,
  `lastMealConfidence: 1` — sin excepciones, valores dentro de rango. Confirma que el port
  funciona correctamente end-to-end contra datos de producción, no solo contra fixtures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato (T002/T003 requieren
  acceso al entorno Python de `Investigacion/`, no a `kittypau_app`)
- **Foundational (Phase 2)**: depende de T001 (estructura de archivos) — bloquea toda la Fase 3
- **US1 (Phase 3)**: depende de Foundational completo + fixtures de T003
- **US2 (Phase 4)**: depende de US1 (T013) — no es independiente de US1 en el sentido estricto,
  pero sí tiene su propio criterio de verificación
- **US3 (Phase 5)**: depende de US1 (T013) — mismo caso que US2
- **Polish (Phase 6)**: depende de que US1-US3 estén completas

### Parallel Opportunities

- T002 puede correr en paralelo con T001 (entornos distintos: Python vs. estructura TS)
- T004, T005 en paralelo (archivos distintos) — T006/T007 son secuenciales entre sí (mismo
  archivo `math-utils.ts`) pero pueden correr en paralelo con T004/T005
- T008 en paralelo con el resto de Foundational una vez T006/T007 tengan un primer borrador
- T016 y T018 son las únicas tareas `[P]` dentro de US2/US3 (archivos de test distintos entre sí
  y del resto)
- T019/T020 en paralelo entre sí (documentos distintos)

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Fase 1: Setup (fixtures + esqueleto)
2. Fase 2: Foundational (matemática base) — bloqueante
3. Fase 3: US1 — el port completo de clasificación
4. **Parar y validar**: `npm run test -- src/lib/evidence-engine` en verde, SC-001 ≥75%
5. Recién ahí evaluar si US2/US3 se entregan en el mismo cambio o aparte

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → validar independientemente (accuracy) → esto ya es el valor de negocio central del spec
3. US2 → validar que la confianza expuesta es trazable (cambio pequeño sobre lo ya hecho en US1)
4. US3 → confirmar cero regresión sobre el comportamiento ya existente
5. Polish → documentación + verificación manual final

---

## Format validation

Las 21 tareas siguen el formato `- [ ] T### [P?] [Story?] Descripción con ruta de archivo` —
Setup/Foundational/Polish sin label de story, Fases 3-5 con `[US1]`/`[US2]`/`[US3]` según
corresponda, y cada tarea nombra al menos un archivo o comando concreto.
