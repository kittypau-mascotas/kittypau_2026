# Quickstart — Validar el Motor de Evidencia portado

**Feature**: [spec.md](./spec.md) | Ver [data-model.md](./data-model.md) para los tipos/tolerancias

## Prerrequisitos

- Repo en la rama `007-evidence-engine-hunger-bar` (o el código de esta feature ya aplicado).
- `kittypau_app/`: `npm install` ya corrido.
- Python del entorno de `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/` disponible **solo** para
  generar los fixtures golden una vez (no hace falta para correr los tests de `kittypau_app` en
  CI normal — los fixtures quedan congelados como JSON en el repo).

## 1. Generar los fixtures golden (una sola vez, o al recalibrar)

```bash
cd Investigacion/Ciclo_Alpha_v2/fase_0_ruido
python scripts_export_fixtures_evidence_engine.py   # script nuevo de esta feature, ver tasks.md
```

Produce:
- `kittypau_app/src/lib/evidence-engine/__fixtures__/classification-golden.json` — desde
  `data/features_anotaciones_v2.csv` + `data/comp_stats_v2.json` (research.md §8.1).
- `kittypau_app/src/lib/evidence-engine/__fixtures__/extraction-golden.json` — muestra pequeña
  con arrays crudos de peso + features esperadas (research.md §8.2).
- `kittypau_app/src/lib/evidence-engine/comp_stats_v2.json` — copia del calibrado real
  (research.md §7).

## 2. Correr los tests del port

```bash
cd kittypau_app
npm run test -- src/lib/evidence-engine
```

**Resultado esperado**:
- `math-utils.test.ts`: DFT/find_peaks/skew/kurtosis/entropías dan los mismos valores que
  fórmulas de referencia sobre casos conocidos.
- `features.test.ts`: `extraerFeatures()` reproduce `extraction-golden.json` dentro de tolerancia
  (data-model.md §2).
- `evidence-score.test.ts`:
  - `evidenceScore()` reproduce `classification-golden.json` (capa de clasificación).
  - Test de regresión de accuracy: split 80/20 sobre el golden de clasificación, piso ≥65%
    (igual que `Investigacion/.../tests/test_evidence_engine.py`), y verificación SC-001 (≥75%
    de coincidencia contra la anotación humana).

## 3. Verificar que el resto de la Barra de Hambre no cambió (User Story 3)

```bash
npm run test -- src/lib/hunger-bar.test.ts
npm run type-check
npm run lint
```

Debe seguir en verde sin modificar el fixture existente de `hunger-bar.test.ts` — solo se agregó
un campo (`weights`) al `Segment`, el resto del comportamiento (decaimiento, `ALERT_THRESHOLD_HOURS`,
fallback de mediana) es el mismo código, sin tocar.

## 4. Verificación manual end-to-end (opcional, sobre datos reales de KPCL0034)

```bash
npm run dev
```

Iniciar sesión con `kittypau.mascotas@gmail.com`, ir a `/today` o `/pet`, confirmar que la Barra
de Hambre de Bandida (KPCL0034) sigue mostrando porcentaje/alerta con normalidad y que
`lastMealConfidence` (visible vía `/api/pets/[id]/hunger-bar` en devtools) refleja un valor de
confianza del Evidence Engine real, no el score triangular anterior.
