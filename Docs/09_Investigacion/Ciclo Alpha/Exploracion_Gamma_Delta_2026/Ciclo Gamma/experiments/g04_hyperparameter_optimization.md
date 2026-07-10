# G-04 — Hyperparameter Optimization (Optuna)

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-03 completado (features finales definidas)
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) | [instructivo.md](../instructivo.md) §9

---

## Objetivo

Encontrar los hiperparámetros óptimos para el mejor GBM seleccionado en G-02,
usando las features finales definidas en G-03.
La búsqueda es bayesiana (Optuna) con ≥200 trials por modelo por tarea.

El resultado de G-04 es el **GBM de referencia final** para el Ciclo Gamma.
Todo experimento posterior (G-05, G-06, G-08) compara contra este baseline.

---

## Configuración

### Herramienta

```python
import optuna

# Ejemplo para LightGBM Modelo A
def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
        "num_leaves": trial.suggest_int("num_leaves", 20, 150),
        "learning_rate": trial.suggest_float("learning_rate", 0.005, 0.1, log=True),
        "min_child_samples": trial.suggest_int("min_child_samples", 10, 100),
        "feature_fraction": trial.suggest_float("feature_fraction", 0.5, 1.0),
        "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5, 1.0),
        "bagging_freq": trial.suggest_int("bagging_freq", 1, 10),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
    }
    modelo = entrenar_lgbm(params, X_train, y_train)
    f1 = evaluar_f1_activo(modelo, X_val, y_val)
    return f1

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=200)
```

### Espacio de búsqueda por familia GBM

```python
# LightGBM
lgbm_space = {
    "n_estimators": [100, 300, 500, 1000],
    "num_leaves": [20, 31, 63, 127],
    "learning_rate": [0.005, 0.01, 0.03, 0.05, 0.1],
    "min_child_samples": [10, 20, 50, 100],
}

# XGBoost (si ganó en G-02)
xgb_space = {
    "n_estimators": [100, 300, 500, 1000],
    "max_depth": [3, 4, 6, 8],
    "learning_rate": [0.005, 0.01, 0.03, 0.05, 0.1],
    "min_child_weight": [1, 5, 10],
}

# CatBoost (si ganó en G-02)
catboost_space = {
    "iterations": [100, 300, 500, 1000],
    "depth": [4, 6, 8],
    "learning_rate": [0.01, 0.03, 0.05, 0.1],
    "l2_leaf_reg": [1, 3, 5, 10],
}
```

### Invariantes durante la optimización

Estos parámetros NO se tocan en la búsqueda:
- Features: las definidas en G-03
- Splits: `X_train.parquet` / `X_val.parquet` (mismos que G-01 a G-03)
- Seed: 42
- Calibración isotónica: siempre activada sobre el modelo ganador

### Comando

```powershell
pip install optuna

cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g04_train_modelo_a_optuna.py --n-trials 200
python g04_train_modelo_b_optuna.py --n-trials 200
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| F1 activo optimizado | > F1 activo G-02 (mismo algoritmo, mejor configuración) |
| F1 servido optimizado | Máximo alcanzable con GBM; referencia para G-05 y G-06 |
| Estudio guardado | `optuna_study_a.pkl` + `optuna_study_b.pkl` para reproducibilidad |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Modelo A — Mejor trial

| Parámetro | Valor óptimo |
|---|---|
| Algoritmo | — |
| `n_estimators` / `iterations` | — |
| `num_leaves` / `max_depth` | — |
| `learning_rate` | — |
| Threshold óptimo | — |

### Métricas Modelo A

| Métrica | G-02 (baseline) | G-04 (optimizado) | Delta |
|---|---|---|---|
| F1 activo | — | — | — |
| AUC-ROC | — | — | — |

### Modelo B — Mejor trial

| Parámetro | Valor óptimo |
|---|---|
| Algoritmo | — |
| `n_estimators` / `iterations` | — |
| `num_leaves` / `max_depth` | — |
| `learning_rate` | — |

### Métricas Modelo B

| Métrica | G-02 (baseline) | G-04 (optimizado) | Delta |
|---|---|---|---|
| F1 alimentacion | — | — | — |
| F1 servido | — | — | — |
| Macro F1 | — | — | — |

### Curva de convergencia Optuna

*Gráfico o descripción de cómo convergió la búsqueda.*

---

## Artefactos generados

```
gamma/fase_3_modelos/models/gbm/
├── g04_best_modelo_a.<ext>        ← modelo A optimizado
├── g04_best_modelo_a_params.json
├── g04_best_modelo_a_calibrator.pkl
├── g04_best_modelo_b.<ext>        ← modelo B optimizado
├── g04_best_modelo_b_params.json
└── gamma/fase_3_modelos/outputs/training_report/
    ├── optuna_study_a.pkl
    ├── optuna_study_b.pkl
    └── g04_optimization_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**Mejora sobre G-02:** —
**Hiperparámetros más influyentes:** —
**¿Se alcanzó el umbral Gamma de F1 activo ≥ 0.75?** —

**Próximo paso:** G-05 — ML Clásico Benchmark vs el GBM optimizado de G-04.

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [g03_feature_engineering.md](g03_feature_engineering.md) |
| Experimento siguiente | [g05_classical_ml_benchmark.md](g05_classical_ml_benchmark.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) |
