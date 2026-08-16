# Kittypau ML — Ciclo Gamma (γ) — Tracker de Experimentos

**Ciclo:** Gamma (γ)
**Inicio:** 2026-06-15
**Cierre:** TBD
**Estado actual:** ✅ G-01 ✅ G-02 ✅ G-03 ✅ G-05 completos · ⏳ G-04 bloqueado (`pip install optuna`) · próximo: **G-04** Hyperopt

Referencia principal: [instructivo.md](instructivo.md) · Runbook Pre-G: [CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md](CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md)

---

## Estado del Ciclo

| Fase | Experimentos | Estado |
|---|---|---|
| **Pre-G** | Preparación datos + anotación + Fase 2 dataset | ✅ Completo (2026-06-17) |
| **A — Baseline + GBM** | G-01, G-02 | ✅ Completo (2026-06-17) |
| **B — Feature Eng + Clásico** | G-03, G-04, G-05 | ⏳ G-03 ✅ · G-04 ⏳ (falta optuna) · G-05 ✅ |
| **C — Deep Learning** | G-06, G-07 | 🔒 Data-conditional (≥300 alim + ≥80 serv) |
| **D — Ensemble + Final** | G-08, G-Final | 🔒 Bloqueado (requiere G-04) |

---

## Tabla Maestra

| ID | Nombre | Fase | Prerequisito | Meta principal | F1 activo | F1 alim | F1 serv | Macro F1 | AUC-A | Estado | Archivo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pre-G** | Unificación Abr-May-Jun + inferencia Modelo A (Exp06) + retiquetado total | Pre | — | ≥80 serv · ≥200 alim · Fase 1 OK | — | — | — | — | — | ✅ Completo (2026-06-17) | [CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md](CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md) · [fase_1_extraccion/scripts/](fase_1_extraccion/scripts/) |
| **G-01** | Baseline LightGBM | A | Pre-G ✅ | F1 activo ≥ 0.75 · F1 alim ≥ 0.72 | **0.8139** ✅ | **0.7598** ✅ | 0.2656 ❌ | **0.6733** ✅ | **0.9960** ✅ | ✅ Completo (2026-06-17) | [g01_baseline_lgbm.py](fase_3_modelos/scripts/g01_baseline_lgbm.py) |
| **G-02** | GBM Benchmark (LightGBM + RF¹) | A | G-01 ✅ | Encontrar mejor GBM | **0.8227** ✅ (RF) | **0.7580** ✅ | 0.1989 ❌ | **0.6505** ✅ | **0.9965** ✅ | ✅ Completo (2026-06-17) | [g02_gbm_benchmark.py](fase_3_modelos/scripts/g02_gbm_benchmark.py) |
| **G-03** | Feature Engineering (gain + subsets) | B | G-02 ✅ | Subconjunto óptimo de features | **0.8189** ✅ | — | 0.2390 ❌ | — | — | ✅ Completo (2026-06-17) | [g03_feature_engineering.py](fase_3_modelos/scripts/g03_feature_engineering.py) |
| **G-04** | Hyperparameter Optimization (Optuna) | B | G-03 ✅ | LightGBM completamente optimizado | — | — | — | — | — | ⏳ Bloqueado (`pip install optuna`) | [g04_hyperopt.py](fase_3_modelos/scripts/g04_hyperopt.py) |
| **G-05** | ML Clásico Benchmark | B | G-03 ✅ | Confirmar GBM > clásicos | **0.8073** ✅ (ET) | 0.7430 ✅ | 0.2408 ❌ | 0.6593 ✅ | 0.9957 ✅ | ✅ Completo (2026-06-17) | [g05_classical_ml.py](fase_3_modelos/scripts/g05_classical_ml.py) |
| **G-06** | NN Baseline (MLP/GRU/TCN) | C | G-05 + ≥300 alim + ≥80 serv | F1 servido ≥ 0.40 desde NN | — | — | — | — | — | 🔒 Data-conditional | — |
| **G-07** | NN Avanzado (LSTM/TabNet) | C | G-06 señal positiva | Explorar arquitecturas adicionales | — | — | — | — | — | 🔒 Data-conditional | — |
| **G-08** | Ensemble GBM + NN | D | G-04 + G-06 | F1 serv ≥ 0.40 · F1 alim ≥ 0.75 | — | — | — | — | — | 🔒 Pendiente | — |
| **G-Final** | Evaluación formal test set | D | mejor modelo candidato | Métricas reales de generalización | — | — | — | — | — | 🔒 Reservado | — |

---

## Referencia Alpha (ciclo cerrado)

| ID Alpha | Nombre | F1 activo | F1 alim | F1 serv | Macro F1 | AUC-A | Modelo prod |
|---|---|---|---|---|---|---|---|
| α-01 | Línea base | 0.00 | 0.40 | 0.33 | 0.57 | 0.81 | No |
| α-02 | Threshold + rebalanceo | — | — | — | — | — | No |
| α-03 | Mejor base histórica | — | — | — | — | — | No |
| α-04 | SMOTE + calibración isotónica | — | — | — | — | — | No |
| α-05 | Nueva ingesta Fase 1 | — | — | — | — | — | No |
| **α-06** | **Dump Colab ★** | **0.7619** | **0.7606** | — | — | — | **✅ Producción actual** |
| α-07 | Inferencia Mayo-Jun | — | — | — | — | — | No |
| α-08 | Unificación Mayo-Jun | 0.60 | — | — | — | — | No (regresión vs α-06) |
| α-09A | Cadencia normalizada | — | — | — | — | — | No |
| α-09B | Threshold por período | — | — | — | — | — | No |
| α-10 | Benchmark neuronal | — | — | 0.34 (GRU) | — | — | No (datos insuficientes) |

---

## Umbrales de Producción Gamma

| Métrica | Umbral Alpha (referencia) | Umbral Gamma (objetivo) |
|---|---|---|
| F1 activo — Modelo A | ≥ 0.70 | **≥ 0.75** |
| AUC-ROC — Modelo A | ≥ 0.85 | **≥ 0.90** |
| F1 alimentacion — Modelo B | ≥ 0.65 | **≥ 0.75** |
| F1 servido — Modelo B | sin umbral | **≥ 0.40** |
| Macro F1 — Modelo B | ≥ 0.60 | **≥ 0.65** |

---

## Checklist Pre-G + Fase 2

```
✅ uuid_mapping.json creado y aplicado a Abril + Mayo-Jun
✅ Timestamps normalizados a UTC (Paso 4.3)
✅ readings_unificado_30s.parquet generado (Paso 4.4) — 134,935 lecturas, Abr–Jun 2026
✅ Inferencia con modelo_a.lgb (Exp06) corrida, threshold 0.12 (Paso 4.6)
✅ sesiones_candidatas.csv generado y volumen validado (Paso 4.7) — 647 candidatos
✅ app_anotacion_gamma.py ejecutando en localhost:8501 con los candidatos cargados
✅ Revisión manual completa (647/647 candidatos) → 264 alim · 63 serv · 296 reposo · 24 sin_clasificar
✅ Cross-check de discrepancias vs etiquetas Alpha documentado (Paso 4.10)
✅ distribucion_clases_gamma.txt revisado sin assertion errors (Paso 4.11)
✅ sessions_labeled.parquet generado (g09 Fase 1) — 647 sesiones etiquetadas
✅ quality_report aprobado con augmentación: servido real=63 + sintético=17 → 80/80 (g10)
── Fase 2 ──────────────────────────────────────────────────────────────────
✅ g01_build_labels.py — readings_labeled.parquet (134,935 filas, 327 sesiones activas)
✅ g02_build_features.py — readings_features.parquet (13 features Gamma verificadas, 22 segmentos)
✅ g03_build_train_dataset.py — splits temporales generados, X_test SELLADO
     Train: 77,676 filas | Val: 36,632 | Test: 20,505
✅ g04_dataset_report.py — dataset_report.json (imbalance 563.7x documentado)
── Fase 3 ──────────────────────────────────────────────────────────────────
✅ G-01 ejecutado → baseline F1-activo=0.8139 (supera target 0.75 y Alpha 0.7619)
✅ G-02 ejecutado → mejor LightGBM=0.8139 / RandomForest=0.8227 (XGBoost/CatBoost no instalados)
✅ G-03 ejecutado → mejor subconjunto 'sin_tiempo' (10 features, F1-activo=0.8189)
✅ G-05 ejecutado → ExtraTrees=0.8073 ✅, LinearSVC=0.7405 ⚠️, LogReg=0.1711 ❌ (sin escala)
── Pendiente ────────────────────────────────────────────────────────────────
□ G-04: pip install optuna → ejecutar g04_hyperopt.py (80 trials, ~30min)
□ Servido real ≥ 80 → desactivar augmentación (faltan 17 anotaciones)
□ G-Final: evaluar test set con mejor modelo de G-04
```

¹ G-02 benchmark parcial: XGBoost y CatBoost no instalados, solo LightGBM vs RandomForest.

---

## Fase 3 — Scripts implementados (2026-06-17)

```
fase_3_modelos/
  scripts/
    _gamma_phase3_utils.py   ← cargar_dataset(), evaluar_modelo(), guardar_experimento(),
                                imprimir_resultados(), MODELS_DIR, TARGETS_GAMMA, ALPHA_REF
    g01_baseline_lgbm.py     ← G-01: LightGBM is_unbalance=True, early stopping 50
    g02_gbm_benchmark.py     ← G-02: LightGBM + XGBoost + CatBoost + RandomForest
    g03_feature_engineering.py ← G-03: importancia gain + SHAP + 4 subconjuntos
    g04_hyperopt.py          ← G-04: Optuna 80 trials, maximiza F1-activo-val
    g05_classical_ml.py      ← G-05: ExtraTrees + LogisticRegression + LinearSVC
  models/                    ← .pkl guardados por cada experimento
  outputs/                   ← G-01.json, G-02.json … (leídos por scripts posteriores)
```

Orden de ejecución Fase A+B: `g01 → g02 → g03 → g04 → g05`
Cada script lee el JSON del anterior para encadenar decisions (mejor algo, mejores features).
G-06/07/08 se implementan cuando los datos lo permitan (≥300 alim + ≥80 serv reales).

---

## Reglas de uso de este archivo

1. Actualizar la fila del experimento tan pronto como termine — no acumular actualizaciones.
2. Solo registrar métricas de **validación** hasta G-Final; las de test solo se registran en G-Final.
3. El campo "Modelo prod" solo puede ser `✅` si el experimento superó **todos** los umbrales Gamma.
4. Los experimentos data-conditional (G-06, G-07) no pueden iniciar sin verificar los prerequisitos de datos.
5. Ver [instructivo.md](instructivo.md) sección 13 para las 14 reglas inviolables del Ciclo Gamma.
