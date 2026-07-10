---
fase: 5
nombre: Modelos de Clasificación
estado: pendiente
ciclo: Alpha v2
---

# Fase 5 — Modelos

> **Objetivo:** Entrenar un clasificador que, dado el vector de features de un segmento
> completo, prediga si es `alimentacion`, `servido` o `ruido`.

---

## Input

- `../fase_4_dataset/data/train/X_train.parquet`
- `../fase_4_dataset/data/train/X_val.parquet`
- `../fase_4_dataset/data/train/y_train.parquet`
- `../fase_4_dataset/data/train/y_val.parquet`

## Output esperado

| Artefacto | Descripción |
|-----------|-------------|
| `models/modelo_av2.lgb` | Modelo LightGBM entrenado |
| `models/model_meta.json` | Hiperparámetros, métricas de validación, threshold |
| `outputs/training_report.html` | Curvas de aprendizaje, matriz de confusión, importancia de features |

---

## Arquitectura

### Heurística baseline (implementar primero)

```python
def clasificar_heuristico(row):
    if row["delta_peso_total"] > 5:
        return "servido"
    elif row["delta_peso_total"] < -5 and row["duracion_s"] > 120:
        return "alimentacion"
    else:
        return "ruido"
```

Calcular F1 de esta heurística antes de entrenar cualquier modelo.
Si F1-servido ≥ 0.80 con la heurística, el modelo ML es un refinamiento, no la solución principal.

### LightGBM multiclase

```python
import lightgbm as lgb

params = {
    "objective": "multiclass",
    "num_class": 3,
    "metric": "multi_logloss",
    "class_weight": "balanced",     # no SMOTE — usar weights
    "learning_rate": 0.05,
    "n_estimators": 500,
    "early_stopping_rounds": 50,
}
```

---

## Métricas de evaluación (sobre val set)

| Métrica | Objetivo | Baseline Ciclo Alpha |
|---------|---------|----------------------|
| F1-alimentacion | ≥ 0.85 | 0.7606 |
| F1-servido | ≥ 0.60 | 0.1395 (Alpha) / 0.2656 (Gamma) |
| F1-macro | ≥ 0.75 | 0.6312 (Alpha Exp06) |

---

## Scripts a crear

| Script | Acción |
|--------|--------|
| `01_baseline_heuristico.py` | Evalúa la heurística simple; establece el piso de comparación |
| `02_train_lgbm.py` | Entrena LightGBM con early stopping |
| `03_threshold_sweep.py` | Busca thresholds óptimos por clase |
| `04_training_report.py` | Genera reporte con métricas sobre val set — NO usa X_test |

### GRU como alternativa (si LGBM no alcanza F1-serv ≥ 0.60)

Del Exp 10-NN (2026-06-15) aprendimos que el GRU bidireccional logró F1-servido=0.34
sobre datos per-reading con solo 27 sesiones reales — el mejor resultado histórico para servido.

En Alpha v2 los segmentos son vectores cortos (~10 features). Si LGBM sobre vectores de
segmento no alcanza el objetivo, considerar GRU sobre la **serie temporal interna del segmento**
(secuencia de lecturas dentro del segmento, no el vector de features agregadas):

```
Entrada GRU: (batch, n_lecturas_del_segmento, 13_features_por_lectura)
Salida: clasificación del segmento completo (alim / serv / ruido)
```

Parámetros de referencia del GRU de Exp 10:
- hidden=128, layers=2, bidireccional, dropout=0.3
- Optimizer: AdamW lr=5e-4
- SMOTE solo en servido hasta target=3× real

---

## Reglas de este ciclo

- No usar X_test en ningún script de esta fase
- Si F1-servido < 0.40 en val set → detener y revisar Fase 2 (segmentación) antes de continuar
- Si heurística ya da F1-servido > 0.70 → reportarlo y evaluar si el modelo ML aporta
