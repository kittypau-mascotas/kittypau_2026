# G-02 — GBM Benchmark Completo

**Ciclo:** Gamma (γ)
**Fase:** A — Baseline + GBM
**Estado:** ⏳ Pendiente
**Prerequisito:** G-01 completado
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [instructivo.md](instructivo.md) §9

---

## Objetivo

Encontrar el mejor algoritmo GBM para el problema Kittypau con datos del Ciclo Gamma.
Se entrenan en paralelo los cuatro algoritmos de la familia GBM usando los mismos splits,
features y protocolo de evaluación. El ganador se usa como referencia en G-03 y G-04.

---

## Modelos evaluados

| Modelo | Librería | Fortaleza principal en este problema |
|---|---|---|
| **LightGBM** | `lightgbm` | Rápido, probado en Alpha; referencia de G-01 |
| **XGBoost** | `xgboost` | Regularización diferente; puede generalizar distinto entre períodos |
| **CatBoost** | `catboost` | Mejor con datos pequeños; manejo nativo de NA |
| **HistGradientBoosting** | `sklearn` | Sin dependencias extra; buena calibración |

---

## Configuración

### Parámetros iniciales por modelo

```python
param_grid = {
    "lightgbm": {
        "n_estimators": 300,
        "num_leaves": 31,
        "learning_rate": 0.05,
        "seed": 42
    },
    "xgboost": {
        "n_estimators": 300,
        "max_depth": 6,
        "learning_rate": 0.05,
        "seed": 42
    },
    "catboost": {
        "iterations": 300,
        "depth": 6,
        "learning_rate": 0.05,
        "random_seed": 42,
        "verbose": 0
    },
    "histgbm": {
        "max_iter": 300,
        "max_leaf_nodes": 31,
        "learning_rate": 0.05,
        "random_state": 42
    }
}
```

Nota: los hiperparámetros finales se optimizan en G-04 (Optuna). Este experimento usa valores comparables entre modelos para aislar el efecto del algoritmo.

### Comando

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g02_train_modelo_a_gbm.py --benchmark   # activa los 4 GBM en paralelo
python g03_train_modelo_b_gbm.py --benchmark
python g09_training_report.py --mode=gbm_benchmark
```

### Instalación previa

```powershell
pip install xgboost catboost
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| Mejor GBM Modelo A | Maximizar F1 activo + AUC-ROC |
| Mejor GBM Modelo B | Maximizar F1 servido sin degradar F1 alim (prioridad: servido) |
| Referencia para G-03 | El mejor modelo de cada tarea avanza como baseline |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Modelo A — Comparativa

| Algoritmo | F1 activo | AUC-ROC | Threshold óptimo | Tiempo train (s) |
|---|---|---|---|---|
| LightGBM (G-01) | — | — | — | — |
| XGBoost | — | — | — | — |
| CatBoost | — | — | — | — |
| HistGBM | — | — | — | — |
| **Ganador** | | | | |

### Modelo B — Comparativa

| Algoritmo | F1 alim | F1 serv | F1 reposo | Macro F1 | Tiempo train (s) |
|---|---|---|---|---|---|
| LightGBM (G-01) | — | — | — | — | — |
| XGBoost | — | — | — | — | — |
| CatBoost | — | — | — | — | — |
| HistGBM | — | — | — | — | — |
| **Ganador** | | | | | |

### Observaciones sobre distribución de errores

*¿Algún modelo es consistentemente mejor en servido? ¿Hay diferencias por período de datos?*

---

## Artefactos generados

```
gamma/fase_3_modelos/models/gbm/
├── g02_lgbm_a.lgb       g02_lgbm_b.lgb
├── g02_xgb_a.xgb        g02_xgb_b.xgb
├── g02_catboost_a.cbm   g02_catboost_b.cbm
├── g02_histgbm_a.pkl    g02_histgbm_b.pkl
└── gbm_benchmark_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**Mejor modelo Modelo A:** —
**Mejor modelo Modelo B:** —
**¿Hay diferencia significativa entre algoritmos?** —

**Próximo paso:** G-03 — Feature Engineering avanzado sobre el mejor GBM.

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [g01_baseline_limpio.md](g01_baseline_limpio.md) |
| Experimento siguiente | [g03_feature_engineering.md](g03_feature_engineering.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |
