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
| Experimento sucesor | [g02_gbm_benchmark.md](g02_gbm_benchmark.md) |
| Referencia Alpha (α-06) | `Ciclo_Alpha_v1/experiments/exp_06_dump_colab.md` |
