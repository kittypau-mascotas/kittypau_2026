# Fase 2 - Dataset de Entrenamiento

Construye el dataset supervisado de `KPCL0034` a partir de los artefactos de la Fase 1.
El modelo activo de esta fase es solo para alimentacion y no cubre hidratacion.

## Flujo

1. `01_build_labels.py`
2. `02_build_features.py`
3. `03_build_train_dataset.py`
4. `04_dataset_report.py`

## Entradas

- `../fase_1_extraccion/data/raw/readings_raw.parquet`
- `../fase_1_extraccion/data/raw/events_labeled.parquet`
- `../fase_1_extraccion/data/raw/sessions_labeled.parquet`

## Salidas

- `data/interim/readings_labeled.parquet`
- `data/interim/readings_features.parquet`
- `data/train/X_train.parquet`
- `data/train/X_val.parquet`
- `data/train/X_test.parquet`
- `data/train/y_train.parquet`
- `data/train/y_val.parquet`
- `data/train/y_test.parquet`
- `data/train/label_encoder.json`
- `data/train/dataset_meta.json`
- `outputs/dataset_report/dataset_report.txt`

## Resultados — Experimento 06 (2026-06-13)

**Estado: ✅ Completada.**

| Split | Filas | Rango |
|---|---|---|
| Train | 44,016 | Apr 08 – Apr 25 |
| Val | 9,432 | Apr 25 – Apr 28 |
| **Test ★** | **9,432** | **Apr 28 – May 01** (reservado Fase 4) |

Distribución: reposo 61,259 (97.2%) · alimentacion 1,530 (2.4%) · servido 91 (0.1%)

Las 12 features se calculan **por segmento** (gaps > 300s delimitan bloques independientes).
Parámetros canónicos en `_phase2_utils.py`: `GAP_CUTOFF_S=300`, `PLATEAU_THRESHOLD=1.5`.

## Alcance del modelo

- Clases activas: `alimentacion`, `servido`, `reposo`.
- El dataset se construye sobre lecturas y sesiones de `KPCL0034`.
- `hidratacion` puede aparecer en históricos o artefactos previos, pero no entra al training set actual.
- Cualquier extensión a agua debe tratarse como una nueva versión del pipeline o una nueva rama de análisis.
