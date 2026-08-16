# Experiment Tracker — Kittypau ML Pipeline

> Registro maestro de todos los experimentos ML.
> **Actualizar este archivo** cada vez que se ejecute o complete un nuevo experimento.
> Para detalles técnicos de cada experimento, ir al archivo correspondiente en `Data Science/experiments/`.

---

## Tabla Maestra de Experimentos

> **Columna "Etiquetado":** ✅ manual = datos con ground truth humano · ❌ sin etiquetar = predicciones del modelo sin validación humana · ⏳ retroactivo = etiquetado manual pendiente via `app_anotacion.py`.
> Ver taxonomía completa en [GLOSARIO.md — Taxonomía de Datos](GLOSARIO.md#taxonomía-de-datos).

| ID | Nombre | Fecha | Estado | F1 activo (A) | F1 alim (B) | F1 serv (B) | Threshold A | Datos fuente | Etiquetado | Sesiones train | Archivo |
|----|--------|-------|--------|:---:|:---:|:---:|:---:|---|:---:|:---:|---|
| **Exp 01** | Línea base | 2026-04-26 | 🗂️ Histórico | 0.0000 ⛔ | 0.3984 | 0.3333 | 0.50 | Supabase API · Apr 8–Apr 27 | ✅ manual | 95 alim · 14 serv | [exp_01](Data Science/experiments/exp_01_linea_base.md) |
| **Exp 02** | Threshold + rebalanceo | 2026-04-26 | 🗂️ Histórico | 0.5550 | 0.5223 | 0.4000 | 0.42 | Supabase API · Apr 8–Apr 27 | ✅ manual | 95 alim · 14 serv | [exp_02](Data Science/experiments/exp_02_threshold_rebalanceo.md) |
| **Exp 03** | Mejor base histórica | 2026-04-26 | 🗂️ Histórico | 0.5600 | 0.5256 | 0.5000 | 0.42 | Supabase API · Apr 8–Apr 27 | ✅ manual | 95 alim · 14 serv | [exp_03](Data Science/experiments/exp_03_mejor_base.md) |
| **Exp 04** | SMOTE + calibración | 2026-04-26 | 🗂️ Histórico | 0.5693 | 0.5488 | 0.4000 | **0.20** | Supabase API · Apr 8–Apr 27 | ✅ manual | 95 alim · 14 serv | [exp_04](Data Science/experiments/exp_04_smote_calibracion.md) |
| **Exp 05** | Nueva ingesta Fase 1 | 2026-04-26 | 🗂️ Histórico | 0.5693 | 0.5488 | 0.4000 | 0.20 | CSV Apr 8–May 1 | ✅ manual | 95 alim · 14 serv | [exp_05](Data Science/experiments/exp_05_nueva_ingesta.md) |
| **Exp 06** | Dump 07-05-2026 | 2026-06-13 | ✅ Producción | **0.7619** ✅ | **0.7606** ✅ | 0.1395 ⚠️ | 0.20 | CSV Apr 8–May 1 (completo) | ✅ manual | **103 alim · 18 serv** | [exp_06](Data Science/experiments/exp_06_colab_dataset.md) |
| **Exp 07** | Inferencia Mayo–Jun | 2026-06-14 | ✅ Completado | N/A | N/A | N/A | 0.20 | CSV May 25–Jun 14 | ✅ Anotado retroactivamente (app_anotacion) | N/A — inferencia pura | [exp_07](Data Science/experiments/exp_07_inferencia_mayo_junio.md) |
| **Exp 08** | Unificación Mayo-Jun | 2026-06-14 | ✅ Completado | 0.6021 ⚠️ | 0.5778 ⚠️ | **0.2414** ↑ | 0.20 | Apr 8–Jun 14 (combinado) | ✅ manual+retroactivo | **185 alim · 27 serv** | [exp_08](Data Science/experiments/exp_08_unificacion_mayo_junio.md) |
| **Exp 09** | Revisión Abril + Unif. | ⏳ TBD | ⏳ Pendiente | — | — | — | 0.20 | Apr re-revisado + May-Jun | ⏳ revisión Abril via app_anotacion (Prep Exp 09) | — | — |
| **Exp 10-NN** | Benchmark neuronal — 4 arquitecturas | 2026-06-15 | ✅ Completado | 0.6016 ⚠️ (TCN) | 0.4728 ⚠️ (MLP) | **0.3400** ↑ (GRU) | 0.60 (todas) | Exp 09B dataset (30s · 13 features · Apr–Jun) | ✅ manual+retroactivo | 185 alim · 27 serv | [exp_10_nn](Data Science/experiments/exp_10_nn_colab.md) |
| **Exp 11** | Limpieza features + ground truth Mayo-Jun + ensemble GRU+LGBM | ⏳ TBD | 📋 Planificado | — | — | — (meta ≥ 0.30) | — | Exp 09B + revisión retroactiva 155 sesiones Exp 07 | ⏳ pendiente revisión Línea B | 185+ alim · 27+ serv | [exp_11](Data Science/experiments/exp_11_ensemble_gru_lgbm.md) |

---

## Evolución de Métricas

### Modelo A — F1 Activo (Binario)

```
0.000 ──→ 0.555 ──→ 0.560 ──→ 0.569 ──→ 0.569 ──→ 0.762
[Exp01]  [Exp02]  [Exp03]  [Exp04]  [Exp05]  [Exp06]
           ↑         ↑         ↑                  ↑
       thresh      12 feat  SMOTE+calib       +8 sesiones
       0.42       definitivas threshold=0.20   alim nuevas
```

### Modelo B — F1 Alimentacion (Multiclase)

```
0.398 ──→ 0.522 ──→ 0.526 ──→ 0.549 ──→ 0.549 ──→ 0.761
[Exp01]  [Exp02]  [Exp03]  [Exp04]  [Exp05]  [Exp06]
```

### Modelo A — F1 Activo (actualizado con Exp 08)

```
0.000 ──→ 0.555 ──→ 0.560 ──→ 0.569 ──→ 0.569 ──→ 0.762 ──→ 0.602
[Exp01]  [Exp02]  [Exp03]  [Exp04]  [Exp05]  [Exp06]  [Exp08]
                                                           ↑
                                                    shift distribución
                                                    (val=Mayo-Jun)
```

### Modelo B — F1 Servido (problema parcialmente resuelto)

```
0.333 ──→ 0.400 ──→ 0.500 ──→ 0.400 ──→ 0.400 ──→ 0.140 ──→ 0.241 ↑
[Exp01]  [Exp02]  [Exp03]  [Exp04]  [Exp05]  [Exp06]  [Exp08]
```

> F1 servido mejora en Exp 08 (+0.10) gracias a 9 sesiones retroactivas nuevas (total 27).
> El drop de F1 activo y alimentacion en Exp 08 es por shift de distribución: val/test ahora son Mayo-Jun (cadencia 30s vs 14.7s en Abril).
> **Exp 06 sigue siendo el modelo de producción.** Exp 09 buscará estabilizar con revisión de Abril.

---

## Parámetros Técnicos Comparados

| Parámetro | Exp 01 | Exp 02 | Exp 03 | Exp 04 | Exp 05 | Exp 06 | Exp 07 |
|-----------|:------:|:------:|:------:|:------:|:------:|:------:|:------:|
| Threshold Modelo A | 0.50 | 0.42 | 0.42 | **0.20** | 0.20 | 0.20 | 0.20 |
| SMOTE (servido) | No | No | Sí ×3 | Sí local | Sí | Sí | N/A |
| Calibración isotónica | No | No | No | **Sí** | Sí | Sí | Sí (aplicada) |
| Features activas | 12 | 12 | 12 | 12 | 12 | 12 | 12 |
| Sesiones alim (train) | 95 | 95 | 95 | 95 | 95 | **103** | N/A |
| Sesiones servido (train) | 14 | 14 | 14 | 14 | 14 | **18** | N/A |
| Algoritmo | LGBM | LGBM | LGBM | LGBM | LGBM | LGBM | LGBM inference |
| Datos fuente | API | API | API | API | CSV | CSV extendido | CSV May–Jun |

---

## Artefactos de los Experimentos

| Experimento | Artefacto | Ubicación | Descripción |
|-------------|-----------|-----------|-------------|
| Exp 01–05 | (sin artefactos de modelo persistentes) | — | Resultados solo en .md; modelos sobrescritos |
| **Exp 06** | `modelo_a.lgb` | `Data Science/fase_3_modelos/models/modelo_a/` | Modelo A en producción actual |
| **Exp 06** | `modelo_b.lgb` | `Data Science/fase_3_modelos/models/modelo_b/` | Modelo B en producción actual |
| **Exp 06** | `calibration_isotonic.json` | `Data Science/fase_3_modelos/models/modelo_a/` | Calibrador isotónico (threshold 0.20) |
| **Exp 06** | `X_train/val/test.parquet` + `y_*.parquet` | `Data Science/fase_2_dataset/data/train/` | Dataset de entrenamiento |
| **Exp 06** | `training_history.json` | `Data Science/fase_3_modelos/models/modelo_[a\|b]/` | Historial de pérdida por iteración |
| **Exp 06** | `feature_importance.csv` | `Data Science/fase_3_modelos/models/modelo_[a\|b]/` | Importancia de features |
| **Exp 07** | `X_mayo_junio.parquet` | `Data_2026/Mayo_2026/` | Features de inferencia (57,101 filas × 12) |
| **Exp 07** | `sesiones_detectadas_mayo_junio.csv` | `Data_2026/Mayo_2026/` | 155 sesiones detectadas (134 alim + 6 serv + 15 reposo) |
| **Exp 07** | `inferencia_mayo_junio.html` | `Data_2026/Mayo_2026/` | Dashboard visual interactivo |

---

## Resultados Detallados — Exp 07 (Inferencia)

| Métrica | Valor |
|---------|-------|
| Período de datos | 2026-05-23 → 2026-06-14 (21 días) |
| Filas procesadas (KPCL0034) | 57,101 |
| Cadencia mediana | 30.0 s (vs 14.7 s en entrenamiento) |
| Filas activo (Modelo A) | 2,202 (3.9%) |
| Sesiones detectadas total | 155 |
| Sesiones alimentación (Modelo B) | 134 |
| Sesiones servido (Modelo B) | 6 |
| Sesiones con clase reposo (A activo, B reposo) | 15 |
| Consumo total estimado | 1,306 g en 20 días |
| Consumo medio por sesión | 9.7 g |
| Duración media por sesión | 4.9 min |
| Sesiones válidas (filtro `|consumido_g| ≥ 3g`) | 3 |
| **F1 activo formal** | ⏳ Pendiente etiquetado retroactivo |
| **F1 alimentacion formal** | ⏳ Pendiente etiquetado retroactivo |
| **F1 servido formal** | ⏳ Pendiente etiquetado retroactivo |

### Alertas Detectadas en Exp 07

| Alerta | Impacto | Mitigación |
|--------|---------|-----------|
| `clock_invalid = True` al 100% | No usar `recorded_at` | Forzado `ingested_at` en script |
| 3 devices en CSV | Datos mixtos | Filtro por UUID KPCL0034 antes de pipeline |
| Cadencia 30s vs 14.7s en train | Rolling features con menos densidad | Documentado — diferencia de producción esperada |
| `light_*` features nuevas en Mayo | Columnas desconocidas para el modelo | No incorporadas — para Exp 08+ |

---

## Criterios de Aprobación para Avanzar a Fase 4

| Métrica | Umbral mínimo | Estado Exp 06 | Estado Exp 07 |
|---------|:---:|:---:|:---:|
| F1 activo — Modelo A | ≥ 0.70 | ✅ 0.7619 | ⏳ pendiente |
| F1 alimentacion — Modelo B | ≥ 0.65 | ✅ 0.7606 | ⏳ pendiente |
| F1 servido — Modelo B | ≥ 0.30 | ⚠️ 0.1395 | ⏳ pendiente |
| Macro F1 — Modelo B | ≥ 0.60 | ✅ estimado | ⏳ pendiente |

**Fase 4 habilitada desde Exp 06.** El threshold de F1 servido sigue siendo la brecha abierta.

---

## Roadmap de Próximos Experimentos

| ID | Nombre tentativo | Prioridad | Prerequisito | Objetivo principal |
|----|-----------------|-----------|--------------|-------------------|
| ~~**Exp 08**~~ | ~~Reentrenamiento Mayo–Junio~~ | ✅ Hecho | — | F1 servido mejorado (+0.10) |
| ~~**Exp 09**~~ | ~~Revisión Abril + Unificación total~~ | ✅ Hecho | — | Exp 09A/09B completados — shift diagnosticado |
| ~~**Exp 10-NN**~~ | ~~Benchmark neuronal — 4 arquitecturas GPU~~ | ✅ Hecho | Exp 09B · Colab T4 | LGBM Exp 06 permanece en producción · GRU mejor NN (F1 serv=0.34) |
| **Exp 11** | Limpieza features + ground truth Mayo-Jun + ensemble GRU+LGBM | 🔴 Alta | Exp 10-NN completado | Revertir `cadencia_s` (→12 feat) · revisar 155 candidatos Exp 07 · ensemble LGBM+GRU Modelo B → F1 servido ≥ 0.30 · Macro F1 ≥ 0.62 |

### Plan para Exp 11

**Contexto:** Exp 09A, 09B y 10-NN agotaron las palancas de feature engineering y arquitectura. El gap Abril vs Mayo-Jun no se cerró más allá de F1 activo=0.60. El único avance concreto fue GRU en F1 servido (+0.20 vs LGBM). Exp 11 combina tres líneas de bajo riesgo:

**Línea A — Revertir `cadencia_s` (→ 12 features):**
`cadencia_s` no aparece en top-10 importancia en Exp 09B y F1 no cambió. Quitar de `_phase2_utils.py`. `plateau_duration` en segundos se mantiene.

**Línea B — Revisión retroactiva de 155 candidatos de Exp 07:**
- 134 `alimentacion` + 6 `servido` + 15 FP de Modelo A detectados en Mayo-Jun.
- Confirmar/descartar con `app_anotacion.py` → fusionar a `new_annotations.csv`.
- Prioridad: las 6 candidatas `servido` (clase más escasa, max impacto histórico).
- Si Línea B aporta 0-2 sesiones netas → escalar a recolección hardware nueva en Exp 12.

**Línea C — Ensemble LGBM + GRU (Modelo B):**
- Blending de probabilidades: `probs_blend[:, SERVIDO_IDX] = alpha*GRU + (1-alpha)*LGBM`.
- Sweep de alpha (0.3–0.8, paso 0.1) sobre `X_val`.
- Punto de partida: `nn_b_best_b.pt` de Exp 10 (recuperar de Colab antes de borrar entorno).
- Si Línea B añade sesiones servido → reentrenar GRU primero.

**Orden de ejecución:** Línea B (datos) → Línea A (features) → Fase 2 → Fase 3 LGBM → Línea C (ensemble).

Ver plan completo en [exp_11_ensemble_gru_lgbm.md](Data Science/experiments/exp_11_ensemble_gru_lgbm.md).

---

## Protocolo para Crear un Nuevo Experimento

1. Copiar `Data Science/experiments/exp_06_colab_dataset.md` como plantilla
2. Renombrar a `exp_0N_nombre_corto.md`
3. Actualizar todas las secciones (objetivo, cambios, datos, parámetros, resultados)
4. **Añadir fila a la Tabla Maestra** de este archivo
5. Actualizar la columna "Estado" del experimento anterior (marcar como 🗂️ Histórico si fue superado)
6. Ejecutar pipeline en orden: Fase 1 → Fase 2 → Fase 3
7. Documentar métricas, artefactos y decisión en el .md del experimento
8. Actualizar `Data Science/README.md` si cambia el experimento activo

### Reglas que NO se deben romper sin nuevo experimento

- Las 12 features son invariantes (cambiar = reentrenar desde Fase 1)
- `GAP_CUTOFF_S = 300` y `PLATEAU_THRESHOLD = 1.5g` son invariantes
- El split temporal debe mantenerse (train→val→test cronológico)
- `THRESHOLD_A = 0.20` es el threshold calibrado de producción

---

## Plantilla de Fila para Tabla Maestra

```
| **Exp 0N** | Nombre del experimento | YYYY-MM-DD | [Estado] | X.XXXX | X.XXXX | X.XXXX | 0.XX | Descripción datos | NNN alim · NN serv | [exp_0N](Data Science/experiments/exp_0N_nombre.md) |
```
