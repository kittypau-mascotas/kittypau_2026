# Ciclo Gamma — Bitácoras de Experimentos (G-01 a G-06)

> Fusión de los 6 archivos `g0N_*.md` de resultados de experimentos. Ver [[EXPERIMENT_TRACKER_GAMMA]] para la tabla resumen con métricas comparadas.


---


<!-- ==== fusionado desde g01_baseline_limpio.md ==== -->

# G-01 — Baseline Gamma Limpio

**Ciclo:** Gamma (γ)
**Fase:** A — Baseline + GBM
**Estado:** ⏳ Pendiente
**Prerequisito:** Pre-G completado (≥80 serv · ≥200 alim · Fase 1 OK)
**Fecha estimada:** TBD (post Pre-G)

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) §9

---

## Objetivo

Establecer la nueva referencia de partida del Ciclo Gamma con datos y features correctas.
Este experimento mide el impacto **puro** de las correcciones de Alpha:
- Timezone corregida (Santiago en lugar de UTC)
- Ambos UUIDs de KPCL0034
- Resampleo a 30s
- ≥80 sesiones de servido reales (sin SMOTE como parche primario)
- 13 features Gamma (incluyendo `dia_semana_sin`, `plateau_duration_s` en segundos)

El modelo es LightGBM con los mismos hiperparámetros de referencia de α-06, para aislar el impacto de los datos.

---

## Configuración

### Modelo

| Parámetro | Valor |
|---|---|
| Algoritmo | LightGBM |
| Objetivo Modelo A | `binary` |
| Objetivo Modelo B | `multiclass` (3 clases) |
| Seed | 42 |
| Threshold inicial | 0.20 (calibrar con isotónica) |

### Hiperparámetros de referencia (igual que α-06)

```python
# Modelo A
params_a = {
    "objective": "binary",
    "metric": "binary_logloss",
    "boosting_type": "gbdt",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "n_estimators": 300,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "verbose": -1,
    "seed": 42
}

# Modelo B
params_b = {
    "objective": "multiclass",
    "num_class": 3,
    "metric": "multi_logloss",
    "boosting_type": "gbdt",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "n_estimators": 300,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "verbose": -1,
    "seed": 42
}
```

### Features

Las 13 features del Ciclo Gamma definidas en `_gamma_utils.py` (`FEATURES_GAMMA`). Ver [GLOSARIO_GAMMA.md](GLOSARIO_GAMMA.md) sección 4.

### Datos

| Dataset | Período | Estado requerido |
|---|---|---|
| Dump Abril 2026 | Apr 8 – May 1 | ✅ Disponible |
| Dump Mayo-Jun 2026 | May 25 – Jun 14 | ✅ Disponible |
| Dump nuevo (Jun 15+) | Jun 15 → presente | ⏳ Descargar antes de Pre-G |
| `new_annotations_gamma.csv` | Jun 15 → presente | ⏳ Requiere ≥80 serv anotados |

---

## Comandos de ejecución

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g01_prepare_datasets.py
python g02_train_modelo_a_gbm.py   # G-01: solo LightGBM (sin --benchmark)
python g03_train_modelo_b_gbm.py   # G-01: solo LightGBM
python g09_training_report.py
```

---

## Metas

| Métrica | Umbral Gamma | Referencia Alpha (α-06) |
|---|---|---|
| F1 activo (Modelo A) | **≥ 0.75** | 0.7619 |
| AUC-ROC (Modelo A) | **≥ 0.90** | — |
| F1 alimentacion (Modelo B) | **≥ 0.72** | 0.7606 |
| F1 servido (Modelo B) | **≥ 0.25** (baseline inicial) | ~0.14–0.34 en Alpha |
| Macro F1 (Modelo B) | **≥ 0.60** | — |

> Nota: si G-01 no supera a α-06, hay que revisar la calidad de las nuevas anotaciones y los datos antes de avanzar a G-02.

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Volumen de datos

| Split | Filas | Alimentacion | Servido | Reposo |
|---|---|---|---|---|
| Train | — | — | — | — |
| Val | — | — | — | — |
| Test (sellado) | — | — | — | — |

### Modelo A

| Métrica | Valor |
|---|---|
| F1 activo | — |
| AUC-ROC | — |
| Threshold óptimo | — |
| Threshold inicial (0.20) | — |

### Modelo B

| Métrica | Valor |
|---|---|
| F1 alimentacion | — |
| F1 servido | — |
| F1 reposo | — |
| Macro F1 | — |

### Top features (Modelo A)

| Rank | Feature | Importancia |
|---|---|---|
| 1 | — | — |
| 2 | — | — |
| 3 | — | — |

### Top features (Modelo B)

| Rank | Feature | Importancia |
|---|---|---|
| 1 | — | — |
| 2 | — | — |
| 3 | — | — |

---

## Artefactos generados

```
gamma/fase_3_modelos/models/gbm/
├── g01_lgbm_a.lgb
├── g01_lgbm_a_params.json
├── g01_lgbm_a_calibrator.pkl
├── g01_lgbm_b.lgb
├── g01_lgbm_b_params.json
└── g01_training_report.txt
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Superó los umbrales Gamma?** — (Sí / No / Parcial)

**Hallazgo principal:** —

**Diferencia vs α-06:** —

**Próximo paso:** G-02 — GBM Benchmark completo con XGBoost, CatBoost y HistGBM.

---

## Referencias

| Documento | Enlace |
|---|---|
| Guía maestra Gamma | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) |
| Tracker de experimentos | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |
| Experimento sucesor | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Referencia Alpha (α-06) | `Ciclo_Alpha_v1/experiments/exp_06_dump_colab.md` |


---


<!-- ==== fusionado desde g02_gbm_benchmark.md ==== -->

# G-02 — GBM Benchmark Completo

**Ciclo:** Gamma (γ)
**Fase:** A — Baseline + GBM
**Estado:** ⏳ Pendiente
**Prerequisito:** G-01 completado
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) §9

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
| Experimento anterior | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Experimento siguiente | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |


---


<!-- ==== fusionado desde g03_feature_engineering.md ==== -->

# G-03 — Feature Engineering Avanzado

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-02 completado (mejor GBM seleccionado)
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) §9

---

## Objetivo

Determinar si features adicionales mejoran el rendimiento del mejor GBM de G-02.
El método es un ablation study: se parte del baseline G-02 y se agrega una feature nueva
a la vez, midiendo el delta de F1 en validación. Solo se incorporan las que muestran
mejora estadísticamente relevante.

---

## Features candidatas a evaluar

| Feature | Disponible desde | Por qué evaluar | Hipótesis |
|---|---|---|---|
| `light_percent` | Mayo 2026 | Presencia de luz puede correlacionar con servido (mañana/tarde) | Mejora `hour_sin/cos` para servido |
| `light_lux` | Mayo 2026 | Complementa `light_percent` con intensidad absoluta | Puede diferenciar interior/exterior |
| `rolling_std_30` | Siempre (derivada) | Ventana larga para detectar cambios de baseline | Puede mejorar detección de reposo prolongado |
| `temperature` | Siempre | Temperatura ambiente puede correlacionar con actividad del gato | Correlación baja en Alpha — verificar con más datos |
| `humidity` | Siempre | Ídem temperatura | Correlación baja en Alpha |

Nota: `light_percent` y `light_lux` solo están disponibles desde Mayo 2026. Si el dataset
de entrenamiento incluye Abril 2026, estas features tendrán NaN para ese período.
Evaluar si el modelo GBM maneja los NaN de forma nativa (CatBoost sí; LGBM/XGBoost requieren imputación).

---

## Método

### Ablation study

Para cada feature candidata:
1. Tomar el modelo ganador de G-02 (mismos hiperparámetros, mismos splits).
2. Agregar la nueva feature al conjunto `FEATURES_GAMMA`.
3. Entrenar y evaluar sobre `X_val.parquet`.
4. Calcular delta F1 vs G-02 para cada métrica objetivo.
5. Si delta F1 activo ≥ +0.01 O delta F1 servido ≥ +0.02: la feature se incorpora.

```python
for feature_candidata in FEATURES_CANDIDATAS:
    features_ext = FEATURES_GAMMA + [feature_candidata]
    modelo = entrenar_gbm(X_train[features_ext], y_train)
    metricas = evaluar(modelo, X_val[features_ext], y_val)
    delta = metricas - metricas_baseline_g02
    print(f"{feature_candidata}: delta F1 activo={delta['f1_activo']:+.4f}, "
          f"delta F1 serv={delta['f1_servido']:+.4f}")
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| Feature incluida | Delta F1 activo ≥ +0.01 O delta F1 servido ≥ +0.02 |
| Feature excluida | Delta negativo o sin señal |
| Features finales Gamma | Lista definitiva para G-04 |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Ablation — Modelo A (F1 activo)

| Feature candidata | F1 activo base | F1 activo +feature | Delta | Decisión |
|---|---|---|---|---|
| `light_percent` | — | — | — | — |
| `light_lux` | — | — | — | — |
| `rolling_std_30` | — | — | — | — |
| `temperature` | — | — | — | — |
| `humidity` | — | — | — | — |

### Ablation — Modelo B (F1 servido)

| Feature candidata | F1 serv base | F1 serv +feature | Delta | Decisión |
|---|---|---|---|---|
| `light_percent` | — | — | — | — |
| `light_lux` | — | — | — | — |
| `rolling_std_30` | — | — | — | — |
| `temperature` | — | — | — | — |
| `humidity` | — | — | — | — |

### Feature importance extendida

```
gamma/fase_3_modelos/outputs/training_report/feature_importance_extended.csv
```

---

## Artefactos generados

```
gamma/fase_3_modelos/outputs/training_report/
├── g03_ablation_results.csv
├── feature_importance_extended.csv
└── g03_features_finales.json   ← lista definitiva para G-04
```

---

## Conclusiones

*A completar post-ejecución.*

**Features incorporadas en G-04:** —
**Features descartadas:** —
**Sorpresas:** —

**Próximo paso:** G-04 — Hyperparameter Optimization (Optuna) sobre las features finales.

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Experimento siguiente | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |


---


<!-- ==== fusionado desde g04_hyperparameter_optimization.md ==== -->

# G-04 — Hyperparameter Optimization (Optuna)

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-03 completado (features finales definidas)
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) §9

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
| Experimento anterior | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Experimento siguiente | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |


---


<!-- ==== fusionado desde g05_classical_ml_benchmark.md ==== -->

# G-05 — ML Clásico Benchmark

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-04 completado (GBM optimizado como referencia)
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) §9

---

## Objetivo

Determinar si algún modelo de ML clásico compite con el GBM optimizado de G-04.
Los modelos clásicos sirven como sanity check (si LogReg supera al GBM, hay sobrefit)
y como posibles contribuyentes a un ensemble en G-08.

---

## Modelos evaluados

| Modelo | Librería | Cuándo puede ganar |
|---|---|---|
| **Random Forest** | `sklearn` | Buena calibración; resistente a outliers de peso |
| **Extra Trees** | `sklearn` | Más rápido que RF; útil con features ruidosas |
| **SVM (kernel RBF)** | `sklearn` | Puede capturar fronteras no lineales con pocos datos |
| **Logistic Regression** | `sklearn` | Sanity check: si supera al GBM en F1, hay sobrefit en el GBM |

### Nota importante sobre SVM

SVM requiere normalización de features. Aplicar `StandardScaler` **solo sobre los datos de training**;
nunca ajustar el scaler sobre validación o test.

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train[FEATURES_FINALES])
X_val_scaled   = scaler.transform(X_val[FEATURES_FINALES])
# X_test_scaled: NO tocar todavía
```

---

## Configuración

### Hiperparámetros iniciales

```python
modelos = {
    "random_forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),
    "extra_trees": ExtraTreesClassifier(
        n_estimators=300,
        max_depth=None,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),
    "svm": SVC(
        kernel="rbf",
        C=1.0,
        gamma="scale",
        probability=True,          # necesario para calibración de probabilidades
        class_weight="balanced",
        random_state=42
    ),
    "logistic_regression": LogisticRegression(
        C=1.0,
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",
        multi_class="multinomial",
        random_state=42
    )
}
```

### Comandos

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g04_train_modelo_a_classical.py
python g05_train_modelo_b_classical.py
python g09_training_report.py --mode=classical_benchmark
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| ¿Algún clásico supera al GBM en F1 activo? | Si sí → investigar sobrefit en G-04 |
| ¿Algún clásico supera al GBM en F1 servido? | Si sí → incorporar en ensemble G-08 |
| Referencia para ensemble | Mejores modelos clásicos guardados para G-08 |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Modelo A — Comparativa vs G-04

| Modelo | F1 activo | AUC-ROC | ¿Supera GBM? |
|---|---|---|---|
| **GBM optimizado (G-04)** | — | — | — |
| Random Forest | — | — | — |
| Extra Trees | — | — | — |
| SVM (RBF) | — | — | — |
| Logistic Regression | — | — | — |

### Modelo B — Comparativa vs G-04

| Modelo | F1 alim | F1 serv | Macro F1 | ¿Supera GBM en servido? |
|---|---|---|---|---|
| **GBM optimizado (G-04)** | — | — | — | — |
| Random Forest | — | — | — | — |
| Extra Trees | — | — | — | — |
| SVM (RBF) | — | — | — | — |
| Logistic Regression | — | — | — | — |

### Observaciones de calibración

*¿Algún modelo clásico tiene mejor calibración de probabilidades que el GBM?*
*(Importante para el blend de probabilidades en G-08.)*

---

## Artefactos generados

```
gamma/fase_3_modelos/models/classical/
├── g05_rf_a.pkl      g05_rf_b.pkl
├── g05_et_a.pkl      g05_et_b.pkl
├── g05_svm_a.pkl     g05_svm_b.pkl
├── g05_svm_scaler.pkl               ← StandardScaler para SVM
├── g05_logreg_a.pkl  g05_logreg_b.pkl
└── gamma/fase_3_modelos/outputs/training_report/
    └── classical_benchmark_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Algún modelo clásico compite con el GBM?** —
**¿Hay señal de sobrefit en G-04?** —
**Modelos candidatos para ensemble G-08:** —

**Próximo paso:**
- Si los datos lo permiten (≥300 alim + ≥80 serv): G-06 — NN Baseline
- Si no: esperar más anotaciones y pasar directamente a G-08 con solo GBM

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Experimento siguiente | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |


---


<!-- ==== fusionado desde g06_nn_baseline.md ==== -->

# G-06 — NN Baseline (MLP / GRU / TCN)

**Ciclo:** Gamma (γ)
**Fase:** C — Deep Learning (Data-Conditional)
**Estado:** ⏳ Data-conditional — bloqueado hasta cumplir prerequisito de datos
**Prerequisito de pipeline:** G-05 completado
**Prerequisito de datos:** ≥300 sesiones de alimentación + ≥80 sesiones de servido en `new_annotations_gamma.csv`
**Entorno:** Google Colab Pro (GPU T4 o A100)
**Fecha estimada:** TBD (data-conditional)

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [GAMMA_INSTRUCTIVO.md](GAMMA_INSTRUCTIVO.md) §9

---

## Por qué este experimento es data-conditional

En el Ciclo Alpha, α-10 ejecutó 4 arquitecturas NN con 185 sesiones de alimentación y 27 de servido.
LightGBM ganó por defecto: con datos tabulares tan pequeños y clases tan desbalanceadas,
el GBM tiene ventaja estructural. El resultado era predecible y no informativo.

Este experimento solo se ejecuta cuando la base de datos es suficiente para que la comparación sea justa.
Ejecutarlo antes sería repetir el error α-7.

---

## Objetivo

Determinar si las redes neuronales superan al GBM optimizado de G-04 cuando el dataset es suficiente.
La métrica crítica es **F1 servido** (Modelo B), que fue la mayor debilidad del GBM en Alpha.

El aprendizaje más importante de α-10: el GRU bidireccional tuvo el mejor F1 servido (0.34)
y el TCN tuvo el mejor F1 activo de NN (0.60), ambos con solo 185 sesiones.
Con ≥300 sesiones, la hipótesis es que ambos mejorarán significativamente.

---

## Modelos evaluados

| Modelo | Tipo | Referencia Alpha | Por qué incluir |
|---|---|---|---|
| **MLP profundo** | Feedforward tabular | NN-A en α-10 | Baseline neuronal; rápido de entrenar; no requiere secuencias |
| **GRU bidireccional** | Recurrente | NN-B en α-10 (mejor F1 serv: 0.34) | Captura señal temporal de llenado; fue el más prometedor en servido |
| **TCN** (Temporal Conv Net) | Convolucional temporal | NN-C en α-10 (mejor F1 activo: 0.60) | Ventanas largas eficientes; más estable que GRU en activo |

> El Transformer (NN-D en α-10) fue el peor con 185 sesiones. Solo se incorpora en G-07 con ≥500 sesiones.

---

## Configuración

### Formato de input

Todos los modelos reciben secuencias de longitud fija:
- Ventana: **60 timesteps** (60 × 30s = 30 minutos de contexto)
- Features: las 13 de `FEATURES_GAMMA` (definidas en `_gamma_utils.py`)
- Shape: `(batch, 60, 13)`

```python
SEQUENCE_LENGTH = 60    # timesteps por muestra
N_FEATURES = 13         # features Gamma
BATCH_SIZE = 64
EPOCHS = 100
EARLY_STOPPING_PATIENCE = 10
```

### Arquitecturas base

```python
# MLP
mlp = Sequential([
    Dense(128, activation="relu"),
    Dropout(0.3),
    Dense(64, activation="relu"),
    Dropout(0.2),
    Dense(n_classes, activation="softmax")
])

# GRU bidireccional
gru = Sequential([
    Bidirectional(GRU(64, return_sequences=True)),
    Bidirectional(GRU(32)),
    Dense(32, activation="relu"),
    Dense(n_classes, activation="softmax")
])

# TCN (Temporal Convolutional Network)
# Usar librería keras-tcn o implementación personalizada
tcn = Sequential([
    TCN(nb_filters=64, kernel_size=3, dilations=[1,2,4,8]),
    Dense(n_classes, activation="softmax")
])
```

### Manejo de clases desbalanceadas

```python
# Pesos de clase (calcular en runtime sobre y_train)
class_weights = compute_class_weight("balanced", classes=np.unique(y_train), y=y_train)
class_weight_dict = dict(enumerate(class_weights))
```

### Entorno Colab

```python
# En Google Colab Pro — instalar dependencias
!pip install torch torchvision torchaudio
!pip install lightning imbalanced-learn keras-tcn

# Subir a Colab:
# gamma/fase_3_modelos/scripts/g06_train_modelo_a_nn.py
# gamma/fase_3_modelos/scripts/g07_train_modelo_b_nn.py
# gamma/fase_2_dataset/data/train/X_train.parquet
# gamma/fase_2_dataset/data/train/X_val.parquet
# gamma/fase_2_dataset/data/train/y_train.parquet
# gamma/fase_2_dataset/data/train/y_val.parquet
```

---

## Verificación del prerequisito de datos

```python
# Antes de ejecutar — verificar en local
from gamma._gamma_utils import MIN_ALIM_FOR_NN, MIN_SERVIDO_SESSIONS
import pandas as pd

sesiones = pd.read_parquet("gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet")
n_alim = len(sesiones[sesiones["session_type"] == "alimentacion"])
n_serv = len(sesiones[sesiones["session_type"] == "servido"])

assert n_alim >= MIN_ALIM_FOR_NN, f"❌ {n_alim} sesiones alim. Requeridas: {MIN_ALIM_FOR_NN}"
assert n_serv >= MIN_SERVIDO_SESSIONS, f"❌ {n_serv} sesiones serv. Requeridas: {MIN_SERVIDO_SESSIONS}"
print(f"✅ Dataset suficiente: {n_alim} alim + {n_serv} serv. G-06 desbloqueado.")
```

---

## Metas

| Métrica | Umbral para considerar NN competitiva | Referencia α-10 (185 sesiones) |
|---|---|---|
| F1 activo — GRU/TCN Modelo A | > F1 activo GBM G-04 | TCN: 0.60 |
| F1 servido — GRU Modelo B | **≥ 0.40** | GRU: 0.34 |
| Macro F1 Modelo B | > Macro F1 GBM G-04 | — |

Si ninguna NN supera al GBM en ninguna métrica: saltar G-07 e ir directo a G-08 con solo GBM.

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Volumen de datos al ejecutar

| Clase | Sesiones disponibles |
|---|---|
| Alimentacion | — (objetivo: ≥300) |
| Servido | — (objetivo: ≥80) |
| Reposo | — |

### Modelo A — Comparativa

| Modelo | F1 activo | AUC-ROC | Tiempo por época | Épocas (early stop) | ¿Supera GBM G-04? |
|---|---|---|---|---|---|
| **GBM G-04 (referencia)** | — | — | — | — | — |
| MLP | — | — | — | — | — |
| GRU bidireccional | — | — | — | — | — |
| TCN | — | — | — | — | — |

### Modelo B — Comparativa

| Modelo | F1 alim | F1 serv | Macro F1 | ¿Supera GBM en servido? |
|---|---|---|---|---|
| **GBM G-04 (referencia)** | — | — | — | — |
| MLP | — | — | — | — |
| GRU bidireccional | — | — | — | — |
| TCN | — | — | — | — |

---

## Artefactos generados

```
gamma/fase_3_modelos/models/nn/
├── g06_mlp_a.pt         g06_mlp_b.pt
├── g06_gru_a.pt         g06_gru_b.pt
├── g06_tcn_a.pt         g06_tcn_b.pt
├── g06_mlp_arch.json    (arquitectura para carga posterior)
├── g06_gru_arch.json
├── g06_tcn_arch.json
└── gamma/fase_3_modelos/outputs/training_report/
    └── nn_baseline_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Alguna NN superó al GBM en F1 servido?** —
**¿Alguna NN superó al GBM en F1 activo?** —
**Mejor NN para ensemble G-08:** —

**Próximo paso:**
- Si alguna NN mostró F1 > GBM en ≥1 métrica: G-07 — NN Avanzado (LSTM/TabNet)
- Si ninguna supera al GBM: ir directo a G-08 — Ensemble

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [GAMMA_EXPERIMENTOS_DETALLE.md](GAMMA_EXPERIMENTOS_DETALLE.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |
| Referencia α-10 | `av1_EXPERIMENTOS_DETALLE.md` (referencia histórica) |


---
