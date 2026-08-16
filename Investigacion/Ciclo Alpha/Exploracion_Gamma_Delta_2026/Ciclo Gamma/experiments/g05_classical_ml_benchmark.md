# G-05 — ML Clásico Benchmark

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-04 completado (GBM optimizado como referencia)
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) | [instructivo.md](../instructivo.md) §9

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
| Experimento anterior | [g04_hyperparameter_optimization.md](g04_hyperparameter_optimization.md) |
| Experimento siguiente | [g06_nn_baseline.md](g06_nn_baseline.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) |
