# Experimento 01 - Bitacora completa del pipeline

- Fecha: `2026-04-26`
- Hora: `20:29:01`
- Proyecto: `Kittypau`
- Alcance: resumen completo de Fase 1, Fase 2 y Fase 3 para dejar una base reproducible del experimento inicial.
- Objetivo: documentar origen de datos, transformaciones, configuracion de entrenamiento y resultados para poder repetir la corrida en otro momento.

## 1. Proposito del experimento

Este experimento registra la primera corrida completa y reproducible del pipeline de investigacion. El objetivo es dejar documentado:

- como nacen los datos originales,
- como se construye el dataset intermedio,
- como se entrenan los modelos,
- que features e hiperparametros se usaron,
- cuantas muestras tuvo cada clase,
- que metricas se obtuvieron,
- y como volver a ejecutar exactamente el mismo flujo en otro momento.

## 2. Origen de los datos

### Fase 1 - Extraccion desde Supabase

La fuente oficial operativa de eventos manuales vive en `public.audit_events`.

#### Resumen de calidad de Fase 1

- `readings_raw.parquet`: `85,910` filas
- Rango temporal de readings: `2026-04-08 02:34:40.188776+00:00` -> `2026-04-25 06:02:11.586000+00:00`
- `clock_invalid=True`: `42,947` filas (`50.0%`)
- Cadencia mediana: `14.7s`
- Cadencia media: `17.2s`
- Gaps mayores a 5 minutos: `9`

#### Etiquetas extraidas

- Total etiquetas: `186`
- `inicio_alimentacion`: `74`
- `termino_alimentacion`: `74`
- `inicio_servido`: `13`
- `termino_servido`: `13`
- `kpcl_con_plato`: `5`
- `kpcl_sin_plato`: `4`
- `tare_con_plato`: `3`

#### Sesiones reconstruidas

- Total sesiones: `87`
- Alimentacion: `74`
- Servido: `13`

### Fase 2 - Construccion del dataset

La Fase 2 tomo las lecturas y etiquetas ya procesadas para construir el dataset supervisado de entrenamiento.

#### Salidas de Fase 2 usadas en este experimento

- `Docs/investigacion/Data Science/fase_2_dataset/data/train/X_train.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/X_val.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/y_train.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/y_val.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/label_encoder.json`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/dataset_meta.json`

#### Restriccion critica

Durante todo el experimento de Fase 3 no se cargaron:

- `X_test.parquet`
- `y_test.parquet`

Esos archivos quedaron reservados para una fase posterior.

## 3. Resumen de Fase 2

### Volumen total

- Train: `30,377` filas
- Val: `6,510` filas
- Test: `6,510` filas

### Rango temporal

- Train: `2026-04-08 02:34:40.188776+00:00` -> `2026-04-20 17:00:21.470502+00:00`
- Val: `2026-04-20 17:00:51.456621+00:00` -> `2026-04-22 23:02:48.029903+00:00`
- Test: `2026-04-22 23:03:17.986910+00:00` -> `2026-04-25 06:02:11.351774+00:00`

### Distribucion global de clases en Fase 2

- `reposo`: `42,186`
- `alimentacion`: `1,139`
- `servido`: `72`

### Pesos de clase calculados en train

- `alimentacion`: `15.698708`
- `servido`: `241.087302`
- `reposo`: `0.341046`

## 4. Reproduccion de la Fase 3

### Comandos de reproduccion

```powershell
python "Docs/investigacion/Data Science/fase_3_modelos/scripts/01_prepare_datasets.py"
python "Docs/investigacion/Data Science/fase_3_modelos/scripts/02_train_modelo_a.py"
python "Docs/investigacion/Data Science/fase_3_modelos/scripts/03_train_modelo_b.py"
python "Docs/investigacion/Data Science/fase_3_modelos/scripts/04_training_report.py"
```

### Entorno de ejecucion

- Python: `3.11`
- `lightgbm`: `4.3.0`
- Sistema: Windows / PowerShell

## 5. Features usadas

El experimento utilizo estas variables de entrada:

- `weight_grams`
- `delta_w`
- `delta_w_3`
- `delta_w_10`
- `rate_gs`
- `rolling_std_5`
- `rolling_std_10`
- `rolling_mean_5`
- `net_weight`
- `is_plateau`
- `plateau_duration`
- `hour_sin`
- `hour_cos`
- `clock_invalid`

## 6. Preparacion de etiquetas

### Encoding original

- `alimentacion` -> `0`
- `servido` -> `1`
- `reposo` -> `2`

### Modelo A

- `activo` = `alimentacion + servido`
- `reposo` = `reposo`

### Modelo B

- Mantiene las tres clases originales

## 7. Configuracion del Modelo A

### Hiperparametros

```json
{
  "objective": "binary",
  "metric": "binary_logloss",
  "boosting_type": "gbdt",
  "learning_rate": 0.05,
  "num_leaves": 31,
  "max_depth": -1,
  "min_child_samples": 20,
  "feature_fraction": 0.8,
  "bagging_fraction": 0.8,
  "bagging_freq": 5,
  "scale_pos_weight": 43.21688500727802,
  "verbose": -1,
  "seed": 42
}
```

### Resultados de validacion

- `best_iteration`: `1`
- `best_val_loss`: `0.12516653602526887`
- `accuracy`: `0.965284178187404`
- `precision`: `0.0`
- `recall`: `0.0`
- `f1`: `0.0`
- `auc_roc`: `0.809807743222005`

### Matriz de confusion

```text
TN = 6284
FP = 0
FN = 226
TP = 0
```

### Lectura tecnica

El modelo colapso hacia la clase `reposo`. La capacidad discriminativa teorica existe, pero el threshold actual no permite recuperar la clase `activo`.

## 8. Configuracion del Modelo B

### Hiperparametros

```json
{
  "objective": "multiclass",
  "num_class": 3,
  "metric": "multi_logloss",
  "boosting_type": "gbdt",
  "learning_rate": 0.05,
  "num_leaves": 31,
  "max_depth": -1,
  "min_child_samples": 10,
  "feature_fraction": 0.8,
  "bagging_fraction": 0.8,
  "bagging_freq": 5,
  "verbose": -1,
  "seed": 42
}
```

### Pesos por clase observados en train

- `alimentacion`: `15.699x`
- `servido`: `241.087x`
- `reposo`: `0.341x`

### Resultados de validacion

- `best_iteration`: `90`
- `best_val_loss`: `0.13639363542452845`
- `accuracy`: `0.9509984639016897`
- `macro_f1`: `0.5687701550128992`
- `weighted_f1`: `0.9544597676348965`

### F1 por clase

- `alimentacion`: `0.39843750000000006`
- `servido`: `0.33333333333333326`
- `reposo`: `0.9745396317053643`

### Lectura tecnica

El modelo aprendio mejor que el binario, pero la clase `servido` sigue siendo el cuello de botella principal por su escasez extrema.

## 9. Importancia de features observada

### Modelo A - top features

1. `rolling_std_10`
2. `plateau_duration`
3. `hour_cos`
4. `hour_sin`
5. `weight_grams`
6. `rolling_std_5`

### Modelo B - top features

1. `plateau_duration`
2. `rolling_std_10`
3. `hour_sin`
4. `hour_cos`
5. `weight_grams`
6. `net_weight`
7. `rolling_mean_5`
8. `delta_w_10`
9. `rolling_std_5`
10. `delta_w`

## 10. Artefactos generados

### Modelo A

- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_a/modelo_a.lgb`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_a/modelo_a_params.json`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_a/training_history.json`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_a/feature_importance.csv`

### Modelo B

- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_b/modelo_b.lgb`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_b/modelo_b_params.json`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_b/training_history.json`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_b/feature_importance.csv`

### Reporte comparativo

- `Docs/investigacion/Data Science/fase_3_modelos/outputs/training_report/training_report.txt`

## 11. Umbrales de referencia para Fase 4

### Modelo A

- `AUC-ROC >= 0.85`
- `F1 activo >= 0.70`

### Modelo B

- `Macro F1 >= 0.60`
- `F1 alimentacion >= 0.65`

## 12. Conclusiones del experimento

- El `Modelo A` no es util todavia para deteccion operativa de actividad.
- El `Modelo B` es mas prometedor, pero sigue sin llegar a nivel de produccion.
- La clase `servido` requiere mas datos o una estrategia de rebalanceo mas agresiva.
- La siguiente iteracion debe enfocarse en threshold tuning, rebalanceo y revision de features.

## 13. Proxima ejecucion

Para repetir este experimento mas adelante:

1. Verificar que existan los artefactos de Fase 1.
2. Verificar que existan los artefactos de Fase 2.
3. Confirmar que `lightgbm==4.3.0` siga instalado.
4. Ejecutar los 4 scripts de Fase 3 en orden.
5. Guardar una nueva version de este documento con fecha y hora nuevas.

