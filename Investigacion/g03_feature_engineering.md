# G-03 — Feature Engineering Avanzado

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-02 completado (mejor GBM seleccionado)
**Fecha estimada:** TBD

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | [instructivo.md](instructivo.md) §9

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
| Experimento anterior | [g02_gbm_benchmark.md](g02_gbm_benchmark.md) |
| Experimento siguiente | [g04_hyperparameter_optimization.md](g04_hyperparameter_optimization.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) |
