# Experimento 03 - Bitacora completa del pipeline

- Fecha: `2026-04-26`
- Hora: `21:04:48`
- Proyecto: `Kittypau`
- Alcance: resumen completo de Fase 1, Fase 2 y Fase 3 para registrar la tercera iteracion experimental.
- Objetivo: documentar la corrida con features recortadas, threshold tuning mas fino y rebalanceo adicional de `servido`.

## 0. Visualizacion del experimento

- [Experimentos_Fase3_Resumen.svg](./Experimentos_Fase3_Resumen.svg)
- Esta lamina resume la evolucion de los tres experimentos y los umbrales de Fase 4.

## 1. Proposito del experimento

Este experimento registra la tercera corrida completa y reproducible del pipeline de investigacion. El objetivo es dejar documentado:

- que cambios se aplicaron sobre el Experimento 2,
- como se simplificaron features,
- como se ajusto el threshold del Modelo A,
- como se rebalanceo la clase `servido` en el Modelo B,
- que resultados se obtuvieron,
- y como repetir exactamente esta version del experimento.

## 2. Cambios respecto al Experimento 2

### Fase 1 y Fase 2

- No se modificaron.
- Se reutilizaron los mismos artefactos y splits del Experimento 2.
- No fue necesario tocar la extraccion ni el dataset base.

### Cambios en features

- Se eliminaron `delta_w_3` y `rate_gs`.
- Se mantuvieron `12` features activas.

### Cambios en Modelo A

- `learning_rate`: de `0.03` a `0.012`
- `num_leaves`: de `31` a `63`
- `max_depth`: de `8` a `10`
- `feature_fraction`: de `0.8` a `0.95`
- `bagging_fraction`: de `0.8` a `0.95`
- `num_boost_round`: de `1500` a `3500`
- `early stopping`: de `80` a `150` rondas
- Se hizo threshold sweep entre `0.25` y `0.50` con paso `0.02`

### Cambios en Modelo B

- `min_child_samples`: de `5` a `3`
- `max_depth`: de `8` a `10`
- `learning_rate`: de `0.05` a `0.03`
- `lambda_l2`: de `1.0` a `1.5`
- `weight_power`: se mantuvo en `0.25`
- Se duplico la clase `servido` x3 en train

## 3. Origen de los datos

### Fase 1 - Extraccion desde Supabase

La fuente oficial operativa de eventos manuales sigue siendo `public.audit_events`.

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

Durante todo el Experimento 3 de Fase 3 no se cargaron:

- `X_test.parquet`
- `y_test.parquet`

Esos archivos siguen reservados para una fase posterior.

## 4. Resumen de Fase 2

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

## 5. Reproduccion de la Fase 3

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

## 6. Features usadas

El experimento utilizo estas variables de entrada:

- `weight_grams`
- `delta_w`
- `delta_w_10`
- `rolling_std_5`
- `rolling_std_10`
- `rolling_mean_5`
- `net_weight`
- `is_plateau`
- `plateau_duration`
- `hour_sin`
- `hour_cos`
- `clock_invalid`

### Features eliminadas

- `delta_w_3`
- `rate_gs`

## 7. Preparacion de etiquetas

### Encoding original

- `alimentacion` -> `0`
- `servido` -> `1`
- `reposo` -> `2`

### Modelo A

- `activo` = `alimentacion + servido`
- `reposo` = `reposo`

### Modelo B

- Mantiene las tres clases originales

## 8. Configuracion del Modelo A

### Hiperparametros

```json
{
  "objective": "binary",
  "metric": "binary_logloss",
  "boosting_type": "gbdt",
  "learning_rate": 0.012,
  "num_leaves": 63,
  "max_depth": 10,
  "min_child_samples": 20,
  "feature_fraction": 0.95,
  "bagging_fraction": 0.95,
  "bagging_freq": 5,
  "scale_pos_weight": 43.21688500727802,
  "verbose": -1,
  "seed": 42
}
```

### Resultados de validacion

- `best_iteration`: `55`
- `best_val_loss`: `0.10816801949838144`
- `default_threshold`: `0.5`
- `best_threshold`: `0.37`
- `default_val_f1`: `0.2920634920634921`
- `accuracy`: `0.9746543778801844`
- `precision`: `0.7046979865771812`
- `recall`: `0.4646017699115044`
- `f1`: `0.5600000000000002`
- `auc_roc`: `0.8798264462809916`

### Matriz de confusion

```text
TN = 6240
FP = 44
FN = 121
TP = 105
```

### Lectura tecnica

El Modelo A mejora respecto al Experimento 2, pero su ganancia sigue dependiendo mas del threshold que de la capacidad base del clasificador.

## 9. Configuracion del Modelo B

### Hiperparametros

```json
{
  "objective": "multiclass",
  "num_class": 3,
  "metric": "multi_logloss",
  "boosting_type": "gbdt",
  "learning_rate": 0.03,
  "num_leaves": 63,
  "max_depth": 10,
  "min_child_samples": 3,
  "feature_fraction": 0.9,
  "bagging_fraction": 0.9,
  "bagging_freq": 5,
  "lambda_l2": 1.5,
  "verbose": -1,
  "seed": 42
}
```

### Pesos por clase observados en train aumentado

- `alimentacion`: `1.992x`
- `servido`: `2.996x`
- `reposo`: `0.765x`

### Configuracion de balance

- `weight_power`: `0.25`
- `served_duplication_factor`: `3`

### Resultados de validacion

- `best_iteration`: `51`
- `best_val_loss`: `0.10803039460414612`
- `accuracy`: `0.9764984639016897`
- `macro_f1`: `0.671196983777108`
- `weighted_f1`: `0.9718873949571094`

### F1 por clase

- `alimentacion`: `0.5256410256410257`
- `servido`: `0.5`
- `reposo`: `0.9879499254022784`

### Lectura tecnica

El Modelo B es el que mas aprovecha el Experimento 3. La duplicacion controlada de `servido` genera una mejora concreta y visible en la clase mas debil.

## 10. Comparacion contra el Experimento 2

### Modelo A

- `AUC-ROC`: de `0.9024` a `0.8798`
- `F1 activo`: de `0.5550` a `0.5600`
- `threshold optimo`: de `0.42` a `0.37`
- `default F1`: de `0.0000` a `0.2921`

### Modelo B

- `Macro F1`: de `0.6367` a `0.6712`
- `F1 alimentacion`: de `0.5223` a `0.5256`
- `F1 servido`: de `0.4000` a `0.5000`

### Interpretacion

El Experimento 3 confirma que:

- recortar features poco utiles no rompe el rendimiento,
- el Modelo A sigue dependiendo mucho del threshold,
- y el mayor salto viene de reforzar la clase `servido` en el Modelo B.

## 11. Importancia de features observada

### Modelo A - top features

1. `rolling_std_10`
2. `plateau_duration`
3. `hour_cos`
4. `hour_sin`
5. `weight_grams`
6. `rolling_mean_5`
7. `net_weight`
8. `rolling_std_5`
9. `delta_w_10`
10. `delta_w`

### Modelo B - top features

1. `rolling_std_5`
2. `rolling_std_10`
3. `plateau_duration`
4. `hour_sin`
5. `hour_cos`
6. `weight_grams`
7. `net_weight`
8. `rolling_mean_5`
9. `delta_w_10`
10. `delta_w`

## 12. Artefactos generados

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
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_b/X_train_augmented.parquet`
- `Docs/investigacion/Data Science/fase_3_modelos/models/modelo_b/y_train_augmented.parquet`

### Reporte comparativo

- `Docs/investigacion/Data Science/fase_3_modelos/outputs/training_report/training_report.txt`

## 13. Umbrales de referencia para Fase 4

### Modelo A

- `AUC-ROC >= 0.85`
- `F1 activo >= 0.70`

### Modelo B

- `Macro F1 >= 0.60`
- `F1 alimentacion >= 0.65`

## 14. Conclusiones del experimento

- El Modelo A mejora en threshold y calibracion, pero aun no llega al objetivo de `F1`.
- El Modelo B sigue siendo la base mas solida y el rebalanceo con duplicacion de `servido` ayuda de verdad.
- La limpieza de features no empeoro el modelo y deja una base mas ordenada para seguir iterando.
- La clase `servido` sigue siendo el cuello de botella principal para avanzar a produccion.

## 15. Proxima ejecucion

Para repetir este experimento mas adelante:

1. Verificar que existan los artefactos de Fase 1.
2. Verificar que existan los artefactos de Fase 2.
3. Confirmar que `lightgbm==4.3.0` siga instalado.
4. Ejecutar los 4 scripts de Fase 3 en orden.
5. Guardar una nueva version de este documento con fecha y hora nuevas.

