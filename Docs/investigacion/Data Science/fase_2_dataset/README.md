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

## Alcance del modelo

- Clases activas: `alimentacion`, `servido`, `reposo`.
- El dataset se construye sobre lecturas y sesiones de `KPCL0034`.
- `hidratacion` puede aparecer en historicos o artefactos previos, pero no entra al training set actual.
- Cualquier extension a agua debe tratarse como una nueva version del pipeline o una nueva rama de analisis.
