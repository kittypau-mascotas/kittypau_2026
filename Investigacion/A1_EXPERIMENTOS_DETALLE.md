# Ciclo Alpha v1 — Bitácoras Completas de Experimentos (Exp 01–11)

> Fusión de los 12 archivos `A1_exp_NN_*.md` — bitácora detallada de cada experimento del Ciclo Alpha v1 (cerrado). Ver [[A1_EXPERIMENT_TRACKER]] para la tabla resumen con métricas comparadas.


---


<!-- ==== fusionado desde A1_exp_01_linea_base.md ==== -->

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


---


<!-- ==== fusionado desde A1_exp_02_threshold_rebalanceo.md ==== -->

# Experimento 02 - Bitacora completa del pipeline

- Fecha: `2026-04-26`
- Hora: `20:45:13`
- Proyecto: `Kittypau`
- Alcance: resumen completo de Fase 1, Fase 2 y Fase 3 para registrar la segunda iteracion experimental.
- Objetivo: documentar los cambios de configuracion aplicados para mejorar los resultados y dejar una base reproducible de comparacion contra el Experimento 1.

## 1. Proposito del experimento

Este experimento registra la segunda corrida completa y reproducible del pipeline de investigacion. El objetivo es dejar documentado:

- que se mantuvo igual respecto al Experimento 1,
- que configuraciones nuevas se aplicaron en Fase 3,
- como se volvieron a entrenar los modelos,
- que features e hiperparametros quedaron activos,
- que resultados se obtuvieron,
- y como repetir exactamente la misma version del experimento.

## 2. Cambios respecto al Experimento 1

### Fase 1 y Fase 2

- No se modificaron.
- Se reutilizaron los mismos artefactos y splits del Experimento 1.
- No fue necesario tocar la extraccion ni el dataset base.

### Cambios en Modelo A

- `learning_rate`: de `0.05` a `0.03`
- `max_depth`: de `-1` a `8`
- `num_boost_round`: de `1000` a `1500`
- `early stopping`: de `50` a `80` rondas
- Se agrego busqueda de threshold optimo en validacion
- Se guardo `best_threshold` en los parametros del modelo

### Cambios en Modelo B

- `num_leaves`: de `31` a `63`
- `max_depth`: de `-1` a `8`
- `min_child_samples`: de `10` a `5`
- `feature_fraction`: de `0.8` a `0.9`
- `bagging_fraction`: de `0.8` a `0.9`
- `lambda_l2`: agregado con valor `1.0`
- Peso de clase suavizado con `weight_power = 0.25`

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

Durante todo el Experimento 2 de Fase 3 no se cargaron:

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
  "learning_rate": 0.03,
  "num_leaves": 31,
  "max_depth": 8,
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

- `best_iteration`: `16`
- `best_val_loss`: `0.10969050625046929`
- `default_threshold`: `0.5`
- `best_threshold`: `0.42`
- `default_val_f1`: `0.0`
- `accuracy`: `0.9738863287250384`
- `precision`: `0.6794871794871795`
- `recall`: `0.4690265486725664`
- `f1`: `0.5549738219895288`
- `auc_roc`: `0.9023725094776451`

### Matriz de confusion

```text
TN = 6234
FP = 50
FN = 120
TP = 106
```

### Lectura tecnica

La mejora mas importante del Modelo A no vino solo por el entrenamiento, sino por dejar de usar el threshold por defecto. El umbral optimo de `0.42` permite recuperar la clase `activo` con mucho mejor equilibrio entre precision y recall.

## 9. Configuracion del Modelo B

### Hiperparametros

```json
{
  "objective": "multiclass",
  "num_class": 3,
  "metric": "multi_logloss",
  "boosting_type": "gbdt",
  "learning_rate": 0.05,
  "num_leaves": 63,
  "max_depth": 8,
  "min_child_samples": 5,
  "feature_fraction": 0.9,
  "bagging_fraction": 0.9,
  "bagging_freq": 5,
  "lambda_l2": 1.0,
  "verbose": -1,
  "seed": 42
}
```

### Pesos por clase observados en train

- `alimentacion`: `1.991x`
- `servido`: `3.940x`
- `reposo`: `0.764x`

### Configuracion de balance

- `weight_power`: `0.25`

### Resultados de validacion

- `best_iteration`: `30`
- `best_val_loss`: `0.10412294309548739`
- `accuracy`: `0.976036866359447`
- `macro_f1`: `0.6366685530123335`
- `weighted_f1`: `0.9714049557642785`

### F1 por clase

- `alimentacion`: `0.5222929936305732`
- `servido`: `0.4`
- `reposo`: `0.9877126654064272`

### Lectura tecnica

El Modelo B mejoro de forma clara al suavizar los pesos de clase en lugar de llevarlos al extremo. El resultado mas visible es el aumento del `macro F1` y la mejora de `servido`, aunque esa clase sigue siendo la mas dificil.

## 10. Comparacion contra el Experimento 1

### Modelo A

- `AUC-ROC`: de `0.8098` a `0.9024`
- `F1 activo`: de `0.0000` a `0.5550`
- `precision`: de `0.0000` a `0.6795`
- `recall`: de `0.0000` a `0.4690`

### Modelo B

- `Macro F1`: de `0.5688` a `0.6367`
- `F1 alimentacion`: de `0.3984` a `0.5223`
- `F1 servido`: de `0.3333` a `0.4000`

### Interpretacion

El Experimento 2 confirma que:

- el threshold tuning es clave para el Modelo A,
- y el rebalanceo suavizado mejora al Modelo B mas que el peso extremo original.

## 11. Importancia de features observada

### Modelo A - top features

1. `rolling_std_10`
2. `plateau_duration`
3. `hour_cos`
4. `hour_sin`
5. `weight_grams`
6. `rolling_std_5`
7. `rolling_mean_5`
8. `net_weight`
9. `clock_invalid`
10. `delta_w`

### Modelo B - top features

1. `rolling_std_5`
2. `rolling_std_10`
3. `plateau_duration`
4. `hour_cos`
5. `hour_sin`
6. `weight_grams`
7. `net_weight`
8. `rolling_mean_5`
9. `delta_w_10`
10. `delta_w_3`

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

- El `Modelo A` mejoro bastante, pero todavia no alcanza el umbral de `F1` requerido para pasar a produccion.
- El `Modelo B` ya supero `Macro F1 >= 0.60`, pero aun no alcanza el objetivo de `F1` por clase para `alimentacion` y sigue corto en `servido`.
- El balance suave (`weight_power = 0.25`) funciono mejor que el balance extremo del experimento anterior.
- El threshold optimo es una palanca muy fuerte para esta familia de datos.

## 15. Proxima ejecucion

Para repetir este experimento mas adelante:

1. Verificar que existan los artefactos de Fase 1.
2. Verificar que existan los artefactos de Fase 2.
3. Confirmar que `lightgbm==4.3.0` siga instalado.
4. Ejecutar los 4 scripts de Fase 3 en orden.
5. Guardar una nueva version de este documento con fecha y hora nuevas.


---


<!-- ==== fusionado desde A1_exp_03_mejor_base.md ==== -->

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


---


<!-- ==== fusionado desde A1_exp_04_smote_calibracion.md ==== -->

# Experimento 04 - Bitacora completa del pipeline

- Fecha: `2026-04-26`
- Hora: `21:29:55`
- Proyecto: `Kittypau`
- Base: `Experimento 03`
- Alcance: corrida ejecutada de la cuarta iteracion experimental de Fase 3.
- Estado: `ejecutado`

## 0. Proposito del experimento

El Experimento 4 parte de la base construida en el Experimento 3 y mantiene los mismos datos de Fase 1 y Fase 2. La idea fue empujar el rendimiento sin pedir nueva extraccion de datos, atacando dos puntos concretos:

- `Modelo B` sigue siendo la prioridad, porque todavia falla en `F1 alimentacion` y `F1 servido`.
- `Modelo A` ya esta cerca de su techo con los datos actuales, por lo que necesita calibracion mas fina en lugar de un redisenio completo.

La estrategia central fue:

- usar `SMOTE` real sobre `servido` en el `Modelo B`,
- y aplicar calibracion isotonica post-entrenamiento en el `Modelo A`.

## 1. Contexto y razonamiento

Los datos son los mismos que en los tres experimentos anteriores. Con ese constraint, la estrategia del Experimento 4 se divide en dos ejes:

- `Modelo B` es la prioridad. Tiene dos metricas que aun fallan para Fase 4: `F1 alimentacion` y `F1 servido`.
- `Modelo A` esta cerca de su techo con datos actuales. El `F1 activo = 0.560` necesita un empuje fino de calibracion, no un redisenio del modelo.

La diferencia clave frente al Experimento 3 es que aqui se reemplaza la duplicacion exacta de `servido` por `SMOTE`, para introducir variabilidad sintetica en vez de copias identicas.

## 2. Features

### 2.1 Features sin cambios respecto al Experimento 3

Las `12` features del Experimento 3 se mantienen. La eliminacion de `delta_w_3` y `rate_gs` no degrado el modelo, y no hay nuevas variables disponibles sin nueva extraccion de datos.

| Feature | Posicion top-10 Modelo A | Posicion top-10 Modelo B |
|---|---:|---:|
| `rolling_std_10` | `1` | `2` |
| `plateau_duration` | `2` | `3` |
| `rolling_std_5` | `8` | `1` |
| `hour_cos` | `3` | `5` |
| `hour_sin` | `4` | `4` |
| `weight_grams` | `5` | `6` |
| `rolling_mean_5` | `6` | `8` |
| `net_weight` | `7` | `7` |
| `delta_w_10` | `9` | `9` |
| `delta_w` | `10` | `10` |
| `is_plateau` | `—` | `—` |
| `clock_invalid` | `—` | `—` |

### 2.2 Lectura de features

- `is_plateau` y `clock_invalid` no aparecen en los top-10 de ningun experimento.
- Si el Experimento 4 no mostraba mejora, estas dos variables deberian evaluarse como candidatas a ablacion en el Experimento 5.

## 3. Modelo A

### 3.1 Hiperparametros de entrenamiento

Los hiperparametros son muy similares al Experimento 3. El cambio principal del Experimento 4 no es de arquitectura, sino de regularizacion suave y calibracion posterior.

| Parametro | Exp 2 | Exp 3 | Exp 4 recomendado |
|---|---:|---:|---:|
| `objective` | `binary` | `binary` | `binary` |
| `metric` | `binary_logloss` | `binary_logloss` | `binary_logloss` |
| `learning_rate` | `0.03` | `0.012` | `0.010` |
| `num_leaves` | `31` | `63` | `63` |
| `max_depth` | `8` | `10` | `10` |
| `min_child_samples` | `20` | `20` | `15` |
| `feature_fraction` | `0.8` | `0.95` | `0.90` |
| `bagging_fraction` | `0.8` | `0.95` | `0.90` |
| `bagging_freq` | `5` | `5` | `5` |
| `scale_pos_weight` | `43.217` | `43.217` | `43.217` |
| `lambda_l2` | `—` | `—` | `0.5` |
| `num_boost_round` | `1500` | `3500` | `3500` |
| `early_stopping_rounds` | `80` | `150` | `150` |
| `seed` | `42` | `42` | `42` |

### 3.2 Razon de los ajustes

- `feature_fraction` y `bagging_fraction` bajan de `0.95` a `0.90` porque en el Experimento 3 el modelo convergio en `best_iteration = 55`, lo que sugiere que todavia hay margen para regularizar mejor.
- `lambda_l2 = 0.5` agrega una penalizacion suave para evitar que el modelo se apoye demasiado en unas pocas seniales.
- `learning_rate = 0.010` deja mas espacio para que el threshold tuning y la calibracion trabajen sobre probabilidades mas estables.

### 3.3 Calibracion isotonica post-entrenamiento

Despues de entrenar el modelo, se aplico calibracion isotonica con `scikit-learn` sobre el set de validacion. La idea era mejorar la calidad de los scores de probabilidad y hacer que el threshold tuning fuera mas confiable.

| Paso | Detalle |
|---|---|
| 1 | Entrenar LightGBM normalmente con los hiperparametros anteriores. |
| 2 | Predecir probabilidades sobre `X_val`. |
| 3 | Aplicar `CalibratedClassifierCV` con `method='isotonic'` y `cv='prefit'`. |
| 4 | Ejecutar threshold sweep sobre scores calibrados. |
| 5 | Guardar `best_threshold_calibrated` separado del threshold crudo. |

### 3.4 Threshold sweep

| Parametro | Valor recomendado |
|---|---:|
| Rango de busqueda | `0.20` - `0.55` |
| Paso | `0.02` |
| Metrica de seleccion | `F1-score` sobre clase `activo` en `val` |
| Referencia Exp 3 | `best_threshold = 0.37`, `F1 = 0.560` |
| Objetivo Exp 4 | `F1 activo >= 0.60` con calibracion |

### 3.5 Resultado real

- `best_iteration`: `105`
- `best_val_loss`: `0.105953`
- `threshold calibrado`: `0.22`
- `F1@0.50 raw`: `0.5440`
- `F1@0.50 calibrado`: `0.5593`
- `accuracy`: `0.9737`
- `precision`: `0.6608`
- `recall`: `0.5000`
- `F1 activo`: `0.5693`
- `AUC-ROC`: `0.8802`

#### Matriz de confusion

```text
TN = 6226
FP = 58
FN = 113
TP = 113
```

#### Lectura tecnica

El Modelo A mejoro levemente frente al Experimento 3. La calibracion isotonica ayudo a ordenar mejor las probabilidades, pero el salto fue pequeno y aun no alcanza el umbral de produccion.

## 4. Modelo B

### 4.1 Hiperparametros de entrenamiento

El cambio mas importante del Experimento 4 en el Modelo B es reemplazar la duplicacion simple de `servido` por `SMOTE` con `k_neighbors=3`.

| Parametro | Exp 2 | Exp 3 | Exp 4 recomendado |
|---|---:|---:|---:|
| `objective` | `multiclass` | `multiclass` | `multiclass` |
| `num_class` | `3` | `3` | `3` |
| `metric` | `multi_logloss` | `multi_logloss` | `multi_logloss` |
| `learning_rate` | `0.05` | `0.03` | `0.02` |
| `num_leaves` | `63` | `63` | `127` |
| `max_depth` | `8` | `10` | `10` |
| `min_child_samples` | `5` | `3` | `1` |
| `feature_fraction` | `0.9` | `0.9` | `0.85` |
| `bagging_fraction` | `0.9` | `0.9` | `0.85` |
| `bagging_freq` | `5` | `5` | `5` |
| `lambda_l2` | `1.0` | `1.5` | `2.0` |
| `weight_power` | `0.25` | `0.25` | `0.40` |
| `num_boost_round` | `1000` | `1000` | `2500` |
| `early_stopping_rounds` | `50` | `50` | `120` |
| `seed` | `42` | `42` | `42` |

### 4.2 Razon de los ajustes

- `num_leaves = 127` da mas capacidad al modelo, ya que el dataset de train aumentara con `SMOTE`.
- `lambda_l2 = 2.0` compensa la mayor capacidad del modelo.
- `weight_power = 0.40` incrementa el peso relativo de las clases minoritarias sin volver al extremo del Experimento 1.
- `feature_fraction` y `bagging_fraction` bajan a `0.85` para controlar sobreajuste.

### 4.3 Estrategia de rebalanceo: SMOTE sobre `servido`

La duplicacion x3 del Experimento 3 introduce copias exactas de las mismas filas. En este experimento se reemplazo por una implementacion local equivalente a `SMOTE` para generar ejemplos sinteticos interpolados, ya que `imbalanced-learn` no estaba disponible en el entorno.

| Paso | Codigo / detalle | Razon |
|---|---|---|
| 1 | Instalar dependencia `imbalanced-learn` | Libreria estandar para SMOTE. |
| 2 | Separar clase `servido` con `mask = y_train == 1` | SMOTE solo sobre la clase minoritaria extrema. |
| 3 | Aplicar `SMOTE(k_neighbors=3, random_state=42)` | Hay pocos vecinos reales disponibles. |
| 4 | Combinar con train original | `X_aug = vstack([X_train, X_smote])` y `y_aug = concat([y_train, y_smote])`. |
| 5 | Verificar distribucion | Confirmar que `servido` llego a unas `126` muestras. |
| 6 | Guardar artefactos | `X_train_smote.parquet` y `y_train_smote.parquet`. |

Regla critica:

- aplicar `SMOTE` solo sobre `X_train`,
- nunca tocar `X_val` ni `X_test`,
- y evaluar siempre sobre validacion real, no sintetica.

### 4.4 Comparacion contra la duplicacion del Experimento 3

| Estrategia | Exp 3 | Exp 4 | Ventaja Exp 4 |
|---|---|---|---|
| Metodo | Duplicacion x3 | SMOTE `k=3` | Genera variabilidad real, no copias exactas. |
| Ejemplos `servido` en train | `42 x3 = 126` | `42 + 84 sinteticos = 126` | Misma cantidad, mejor calidad. |
| Riesgo de overfitting | Alto en puntos exactos | Bajo, interpolacion suavizada | `—` |
| `weight_power` | `0.25` | `0.40` | Mas peso relativo a clases minoritarias. |

### 4.5 Resultado real

- `best_iteration`: `105`
- `best_val_loss`: `0.109012`
- `accuracy`: `0.9762`
- `macro F1`: `0.6456`
- `weighted F1`: `0.9725`
- `F1 alimentacion`: `0.5488`
- `F1 servido`: `0.4000`
- `F1 reposo`: `0.9879`

#### Lectura tecnica

El rebalanceo con SMOTE local aumento la variabilidad del entrenamiento, pero no supero el resultado del Experimento 3 en la clase `servido`. La clase `alimentacion` mejoro un poco, pero el `Macro F1` global quedo por debajo del experimento anterior.

## 5. Objetivos del Experimento 4

| Metrica | Exp 3 actual | Umbral Fase 4 | Objetivo Exp 4 |
|---|---:|---:|---:|
| Modelo A - F1 activo | `0.560` | `0.70` | `>= 0.60` |
| Modelo A - AUC-ROC | `0.880` | `0.85` | `>= 0.88` |
| Modelo B - Macro F1 | `0.671` | `0.60` | `>= 0.70` |
| Modelo B - F1 alimentacion | `0.526` | `0.65` | `>= 0.58` |
| Modelo B - F1 servido | `0.500` | `—` | `>= 0.55` |

Los objetivos eran deliberadamente conservadores. Con los mismos datos, no era realista saltar a los umbrales de Fase 4 de una sola vez.

## 6. Orden de ejecucion recomendado

1. Verificar que `imbalanced-learn` este instalado o usar una implementacion local equivalente.
2. Ejecutar `01_prepare_datasets.py`.
3. Actualizar `02_train_modelo_a.py` con los nuevos hiperparametros y agregar calibracion isotonica post-fit.
4. Reemplazar la duplicacion x3 por `SMOTE k=3` en `03_train_modelo_b.py` y actualizar hiperparametros.
5. Ejecutar threshold sweep en el Modelo A sobre scores calibrados.
6. Ejecutar `04_training_report.py` y comparar contra el Experimento 3.
7. Documentar la corrida como `Experimento_04_YYYY-MM-DD_HH-MM-SS.md`.

## 7. Comparacion contra el Experimento 3

| Metrica | Exp 3 | Exp 4 |
|---|---:|---:|
| Modelo A - F1 activo | `0.5600` | `0.5693` |
| Modelo A - AUC-ROC | `0.8798` | `0.8802` |
| Modelo B - Macro F1 | `0.6712` | `0.6456` |
| Modelo B - F1 alimentacion | `0.5256` | `0.5488` |
| Modelo B - F1 servido | `0.5000` | `0.4000` |

### Lectura comparativa

- El Modelo A mejoro de forma leve pero consistente.
- El Modelo B no logro superar el Experimento 3 y perdio rendimiento en `servido`.
- `SMOTE` no sustituyo la ventaja de la duplicacion controlada en este caso concreto.

## 8. Limite actual de los datos

Con `42` sesiones de `servido` y `74` de `alimentacion`, los cuatro experimentos ya extraen gran parte del valor disponible en el dataset actual.

Si el Experimento 4 no logra cruzar los umbrales de Fase 4, la siguiente accion prioritaria deberia ser recolectar mas sesiones etiquetadas de `servido` y `alimentacion` en `public.audit_events` antes de seguir iterando hiperparametros.

El techo real del modelo con estos datos probablemente esta cerca. `SMOTE` y calibracion son paliativos utiles, pero no reemplazan datos reales.

## 9. Cierre

Este documento deja registrada la corrida real del Experimento 4, con resultados modestos para el binario y una mejora insuficiente para el multiclase respecto al Experimento 3.


---


<!-- ==== fusionado desde A1_exp_05_nueva_ingesta.md ==== -->

# Experimento 05 - Bitacora completa del pipeline

- Fecha: `2026-04-26`
- Hora: `23:33:16`
- Proyecto: `Kittypau`
- Base: `Experimento 04`
- Alcance: corrida ejecutada de la quinta iteracion experimental de Fase 3 despues de nueva ingesta en Supabase.
- Estado: `ejecutado`

## 0. Proposito del experimento

El objetivo de este ciclo fue verificar dos cosas al mismo tiempo:

- si las nuevas sesiones de `alimentacion` y `servido` mejoraban la zona visual del grafico y el resumen de Fase 1,
- y si esa nueva ingesta cambiaba el rendimiento de Fase 2 y Fase 3.

El hallazgo principal fue claro: Fase 1 si cambio, pero Fase 2 y Fase 3 quedaron practicamente iguales al Experimento 4.

## 1. Contexto y razonamiento

Se mantuvo exactamente la misma estrategia de Fase 3 que en el Experimento 4:

- `Modelo A` sigue usando calibracion isotonica y threshold tuning.
- `Modelo B` sigue usando la version con `SMOTE` local sobre `servido`.

La diferencia real de este experimento fue la nueva ingesta de eventos manuales en Supabase para `KPCL0034`.

## 2. Fase 1 - nueva ingesta y visibilidad del grafico

### 2.1 Totales actuales de Fase 1

| Elemento | Total |
|---|---:|
| Readings extraidos | `96,807` |
| Rango temporal | `2026-04-08 02:34:40.188776+00:00 -> 2026-04-27 03:29:47.297000+00:00` |
| Etiquetas totales | `202` |
| Sesiones reconstruidas | `95` |

### 2.2 Distribucion de etiquetas

| Etiqueta | Cantidad |
|---|---:|
| `inicio_alimentacion` | `81` |
| `termino_alimentacion` | `81` |
| `inicio_servido` | `14` |
| `termino_servido` | `14` |
| `kpcl_con_plato` | `5` |
| `kpcl_sin_plato` | `4` |
| `tare_con_plato` | `3` |

### 2.3 Sesiones reconstruidas

| Tipo | N | Duracion media | Duracion maxima |
|---|---:|---:|---:|
| `alimentacion` | `81` | `473 s` | `2100 s` |
| `servido` | `14` | `167 s` | `510 s` |

### 2.4 Lectura tecnica

La nueva ingesta si se refleja en el dashboard y en el resumen de Fase 1.
Eso mejora la capacidad de inspeccion visual de las curvas de `alimentacion` y `servido`.

Importante:

- el grafico actualizado ya muestra `81/81` para `alimentacion` y `14/14` para `servido`,
- pero esta mejora de trazabilidad no se tradujo en cambios del dataset de entrenamiento de Fase 2.

## 3. Fase 2 - dataset supervisado

### 3.1 Totales de dataset

| Split | Filas | Rango temporal |
|---|---:|---|
| Train | `30,377` | `2026-04-08 -> 2026-04-20` |
| Val | `6,510` | `2026-04-20 -> 2026-04-22` |
| Test | `6,510` | `2026-04-22 -> 2026-04-25` |

### 3.2 Distribucion de clases en train

| Clase | Cantidad | Porcentaje |
|---|---:|---:|
| `reposo` | `29,690` | `97.7%` |
| `alimentacion` | `645` | `2.1%` |
| `servido` | `42` | `0.1%` |

### 3.3 Distribucion de clases en val

| Clase | Cantidad |
|---|---:|
| `reposo` | `6,284` |
| `alimentacion` | `218` |
| `servido` | `8` |

### 3.4 Distribucion de clases en test

| Clase | Cantidad |
|---|---:|
| `reposo` | `6,212` |
| `alimentacion` | `276` |
| `servido` | `22` |

### 3.5 Hallazgo critico

Aunque Fase 1 crecieron las etiquetas y las sesiones visibles, Fase 2 quedo con los mismos totales que en el Experimento 4:

- `Total filas = 43,397`
- misma distribucion de clases
- mismo split temporal
- mismos archivos de entrenamiento

Esto significa que la nueva ingesta no modifico el set supervisado final que alimenta Fase 3.

## 4. Fase 3 - resultados del modelo con esta ingesta

### 4.1 Modelo A - binario `activo` vs `reposo`

#### Configuracion efectiva

| Campo | Valor |
|---|---:|
| Features activas | `12` |
| Features removidas | `delta_w_3`, `rate_gs` |
| Iteraciones entrenadas | `105` |
| Mejor val loss | `0.105953` |
| Threshold por defecto | `0.50` |
| Threshold calibrado | `0.22` |

#### Resultados de validacion

| Medida | Valor |
|---|---:|
| Accuracy | `0.9737` |
| Precision | `0.6608` |
| Recall | `0.5000` |
| F1 activo | `0.5693` |
| AUC-ROC | `0.8802` |
| F1 @ threshold default | `0.5440` |
| F1 @ threshold calibrado 0.50 | `0.5593` |

#### Matriz de confusion

```text
TN = 6226
FP = 58
FN = 113
TP = 113
```

#### Feature importance top 10

| Feature | Importancia |
|---|---:|
| `rolling_std_10` | `1133364.284` |
| `plateau_duration` | `416315.642` |
| `hour_cos` | `234851.715` |
| `weight_grams` | `177963.914` |
| `hour_sin` | `156629.240` |
| `rolling_mean_5` | `33845.457` |
| `rolling_std_5` | `28098.333` |
| `net_weight` | `14022.470` |
| `delta_w_10` | `6388.917` |
| `delta_w` | `1951.732` |

#### Lectura tecnica

El Modelo A no cambio frente al Experimento 4.
La calibracion sigue ayudando, pero el techo del binario se mantiene casi igual.

### 4.2 Modelo B - multiclase `alimentacion` / `servido` / `reposo`

#### Configuracion efectiva

| Campo | Valor |
|---|---:|
| Servido SMOTE | `84` sinteticas |
| Servido target count | `126` |
| Weight power | `0.4` |
| Iteraciones entrenadas | `105` |
| Mejor val loss | `0.109012` |

#### Resultados de validacion

| Medida | Valor |
|---|---:|
| Accuracy | `0.9762` |
| Macro F1 | `0.6456` |
| Weighted F1 | `0.9725` |
| F1 alimentacion | `0.5488` |
| F1 servido | `0.4000` |
| F1 reposo | `0.9879` |

#### Feature importance top 10

| Feature | Importancia |
|---|---:|
| `rolling_std_10` | `119374.340` |
| `rolling_std_5` | `111329.385` |
| `hour_sin` | `31167.029` |
| `hour_cos` | `30994.702` |
| `plateau_duration` | `29197.143` |
| `weight_grams` | `25201.399` |
| `rolling_mean_5` | `15305.049` |
| `net_weight` | `10853.811` |
| `delta_w_10` | `8944.547` |
| `delta_w` | `4576.300` |

#### Lectura tecnica

El Modelo B tampoco cambio frente al Experimento 4.
La clase `servido` sigue siendo el cuello de botella y, con esta ingesta, no hubo mejora observable del multiclase.

## 5. Comparacion contra el Experimento 4

| Metricas | Exp 4 | Exp 5 | Delta |
|---|---:|---:|---:|
| Modelo A - F1 activo | `0.5693` | `0.5693` | `0.0000` |
| Modelo A - AUC-ROC | `0.8802` | `0.8802` | `0.0000` |
| Modelo B - Macro F1 | `0.6456` | `0.6456` | `0.0000` |
| Modelo B - F1 alimentacion | `0.5488` | `0.5488` | `0.0000` |
| Modelo B - F1 servido | `0.4000` | `0.4000` | `0.0000` |

### Lectura comparativa

- La nueva ingesta mejoro Fase 1 y el grafico, pero no movio Fase 2.
- Como Fase 2 no cambió, Fase 3 quedo exactamente igual al Experimento 4.
- Esto confirma que el siguiente salto real necesita eventos adicionales que si entren al dataset supervisado final.

## 6. Conclusiones

### Estado actual

- `Modelo A`: estable, pero aun debajo del umbral de produccion.
- `Modelo B`: estable, pero el `servido` sigue muy por debajo de lo deseado.
- `Fase 4`: aun no habilitada.

### Lectura final

El Experimento 5 fue util para:

- validar la ingesta nueva,
- verificar que el grafico ya refleja mas sesiones,
- y confirmar que aun no estamos alimentando mas variabilidad al dataset de entrenamiento.

### Decision sugerida

La siguiente iteracion deberia centrarse en:

1. Recolectar mas sesiones reales de `alimentacion` y `servido` que entren al corte temporal de Fase 2.
2. Volver a ejecutar Fase 1 y confirmar que el incremento queda dentro del dataset supervisado.
3. Repetir Fase 2 y Fase 3 desde la mejor base actual.

## 7. Nota operativa

La marca de tiempo del ultimo evento de `alimentacion` fue interpretada como `2026-04-26 22:27:14 UTC` para mantener coherencia en el pipeline.


---


<!-- ==== fusionado desde A1_exp_06_colab_dataset.md ==== -->

# Experimento 06 — Dataset Colab (dump 07-05-2026)

- Fecha planificada: `2026-06-13`
- Base: Experimento 03 (mejor base) + datos dump Colab
- Alcance: Re-ejecutar Fase 1 → Fase 2 → Fase 3 con el dump completo del 07-05-2026
- Estado: `completado — 2026-06-13`

---

## 0. Objetivo

Aprovechar el dump completo de Supabase al 07-05-2026 para:

1. Extender el dataset a **103 sesiones de alimentación** (vs 95 en Exp 05, +8).
2. Incorporar **18–20 sesiones de servido** (vs 14 en Exp 05, +30%).
3. Extender la cobertura temporal hasta **2026-05-01** (vs Apr 27 en Exp 05, +5 días).
4. Usar la **tabla `readings`** como fuente (esquema moderno con `clock_invalid` e `ingested_at`).

---

## 1. Cambios respecto a Experimento 05

| Aspecto | Exp 05 | Exp 06 |
|---|---|---|
| Fuente de datos | Supabase API (live) | CSV dump 07-05-2026 |
| Tabla de readings | `sensor_readings` (via API) | `readings.csv` (dump local) |
| Etiquetas `manual_bowl_category` | 202 | 271 |
| Sesiones alimentación | 95 | 103 |
| Sesiones servido | 14 | 18–20 |
| Cobertura temporal | Apr 8 – Apr 27 | Apr 8 – May 1 |
| Split temporal train | Apr 8 – Apr 20 | Apr 8 – Apr 20 |
| Split temporal val | Apr 20 – Apr 22 | Apr 20 – Apr 25 |
| Split temporal test | Apr 22 – Apr 25 | Apr 25 – May 1 ★ |

★ El tramo Apr 25 – May 1 contiene sesiones que nunca entraron a ningún entrenamiento previo. **Reservar estrictamente para Fase 4.**

---

## 2. Fuente de datos — paths locales

```
d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\
  Docs\investigacion\Data_2026\Abril_2026\
    kittypau_full_07-05-2026_csv\
      readings.csv           ← tabla activa (1,085,889 filas, 242 MB)
      audit_events.csv       ← 749 eventos, 271 manual_bowl_category
      devices.csv            ← metadata de 12 devices
      sensor_readings.csv    ← NO USAR (tabla legacy sin clock_invalid)
```

**Encoding:** Cargar todos los CSVs con `encoding="latin1"` (exports Supabase con caracteres especiales).

---

## 3. Fase 1 — Extracción desde CSV

### 3.1 Cambios en scripts

| Script | Cambio requerido |
|---|---|
| `03_extract_readings.py` | Leer desde `readings.csv` en lugar de Supabase API. Filtrar `device_code = 'KPCL0034'`. Mantener `clock_invalid` y usar `ingested_at` como fallback de timestamp. |
| `04_extract_events.py` | Leer desde `audit_events.csv`. Parsear `payload` (JSON string). Filtrar `event_type = 'manual_bowl_category'`. Resolver `device_code` via join con `devices.csv`. |
| `05_build_sessions.py` | Sin cambios — consume `events_labeled.parquet` de Fase 1. |
| `06_quality_report.py` | Sin cambios — valida artefactos de Fase 1. |

### 3.2 Parsing de audit_events

El campo `payload` de `audit_events.csv` es un JSON string. Ejemplo de extracción:

```python
import json, pandas as pd

df = pd.read_csv("audit_events.csv", encoding="latin1")
df["payload_parsed"] = df["payload"].apply(json.loads)
df["category"] = df["payload_parsed"].apply(lambda x: x.get("category"))
df["device_code"] = df["payload_parsed"].apply(lambda x: x.get("device_id"))
```

El campo `created_at` puede tener zonas horarias mixtas (`+00`, `-04`, `-04:00`). Normalizar a UTC con `dateutil.parser.parse` o `pd.to_datetime(..., utc=True)`.

### 3.3 Salidas esperadas de Fase 1

| Artefacto | Esperado |
|---|---|
| `readings_raw.parquet` | ~200,000–220,000 filas (KPCL0034, incluyendo `clock_invalid=True`) |
| `events_labeled.parquet` | ~206 filas (103 `inicio_alim` + 103 `termino_alim`) |
| `sessions_labeled.parquet` | 103 sesiones alimentación + 18–20 sesiones servido |
| `quality_report.txt` | Validar: sesiones ≥ 103, etiquetas ≥ 206, readings > 150,000 |

---

## 4. Fase 2 — Dataset supervisado

### 4.1 Split temporal extendido

| Split | Período | Propósito |
|---|---|---|
| Train | Apr 8 – Apr 20 | Entrenamiento (70%) |
| Val | Apr 20 – Apr 25 | Validación durante entrenamiento (15%) |
| Test | Apr 25 – May 1 | **★ Reservado para Fase 4** (15%) |

### 4.2 Balance de clases esperado

Con más sesiones y cobertura extendida, el dataset debería crecer:

| Clase | Exp 05 (train) | Exp 06 (estimado) |
|---|---|---|
| `reposo` | 29,690 (97.7%) | ~proporcional |
| `alimentacion` | 645 (2.1%) | ~900–1,100 (+40%) |
| `servido` | 42 (0.1%) | ~70–110 (+67%) |

### 4.3 Sin cambios en features

Mantener las **12 features activas** del Experimento 03:

`weight_grams`, `delta_w`, `delta_w_10`, `rolling_std_5`, `rolling_std_10`, `rolling_mean_5`, `net_weight`, `is_plateau`, `plateau_duration`, `hour_sin`, `hour_cos`, `clock_invalid`

---

## 5. Fase 3 — Modelos

### 5.1 Estrategia base (partir del Exp 03)

- **Modelo A (binario):** LightGBM con threshold sweep 0.25–0.50 en pasos de 0.02.
- **Modelo B (multiclase):** LightGBM con duplicación de `servido` ×3 en train. Evaluar si sigue siendo necesaria con más muestras reales.
- `scale_pos_weight` para Modelo A; `class_weight` para Modelo B.

### 5.2 Evaluaciones adicionales a probar

- Si `servido` train ≥ 80 filas reales: probar sin duplicación (puro oversampling vs. real).
- Comparar threshold óptimo de Modelo A vs. Exp 03 (0.37) — puede correrse con más datos.

### 5.3 Metas del experimento

| Métrica | Exp 03 (actual) | Meta Exp 06 |
|---|---|---|
| Modelo A F1 activo | 0.560 | ≥ 0.60 |
| Modelo A AUC-ROC | 0.880 | ≥ 0.88 (mantener) |
| Modelo B Macro F1 | 0.671 | ≥ 0.70 |
| Modelo B F1 alimentacion | 0.526 | ≥ 0.60 |
| Modelo B F1 servido | 0.500 | ≥ 0.55 |

> Si Modelo A F1 activo ≥ 0.70 **y** Modelo B F1 alimentacion ≥ 0.65 → habilitar **Fase 4**.

---

## 6. Checklist de ejecución

### Antes de empezar
- [ ] Verificar acceso a `Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/`
- [ ] Confirmar que `readings.csv` existe y pesa ~242 MB
- [ ] Confirmar que `audit_events.csv` existe y tiene ~749 filas

### Fase 1
- [ ] Adaptar `03_extract_readings.py`: leer `readings.csv`, filtrar KPCL0034, mantener fallback `ingested_at`
- [ ] Adaptar `04_extract_events.py`: leer `audit_events.csv`, parsear `payload` JSON, normalizar timezone a UTC
- [ ] Ejecutar `01_setup_env.py` (verificar entorno, aunque la fuente sea CSV)
- [ ] Ejecutar `03_extract_readings.py` → validar `readings_raw.parquet` > 150,000 filas
- [ ] Ejecutar `04_extract_events.py` → validar `events_labeled.parquet` ≥ 206 filas
- [ ] Ejecutar `05_build_sessions.py` → validar 103 sesiones alimentación + ≥ 18 servido
- [ ] Ejecutar `06_quality_report.py` → revisar `quality_report.txt`

### Fase 2
- [ ] Ejecutar `01_build_labels.py`
- [ ] Ejecutar `02_build_features.py`
- [ ] Ejecutar `03_build_train_dataset.py` con split extendido a May 1
- [ ] Verificar distribución de clases: `alimentacion` > 645, `servido` > 42
- [ ] Verificar que `X_test` cubre Apr 25 – May 1
- [ ] Ejecutar `04_dataset_report.py` y comparar con `dataset_meta.json` de Exp 05

### Fase 3
- [ ] Ejecutar `01_prepare_datasets.py`
- [ ] Ejecutar `02_train_modelo_a.py`
- [ ] Ejecutar `03_train_modelo_b.py`
- [ ] Ejecutar `04_training_report.py`
- [ ] Comparar resultados contra Exp 03 (mejor base)
- [ ] Documentar resultados en la sección "7. Resultados" de este archivo

---

## 7. Resultados

*Ejecutado el 2026-06-13. Fuente: CSV dump 07-05-2026.*

### 7.1 Fase 1

| Elemento | Esperado | Real |
|---|---|---|
| Readings extraídos | ~200,000–220,000 | **124,682** (KPCL0034, Apr 8 – May 1) |
| clock_invalid=True | ~50% | **50.0%** (62,333 filas) |
| Etiquetas | ≥ 206 | **254** (206 alimentacion + 36 servido + 12 otros) |
| Sesiones alimentación | 103 | **103** (dur. media 445 s) |
| Sesiones servido | 18–20 | **18** (dur. media 159 s) |

**Nota:** El conteo de readings (124,682) es inferior al estimado inicial (200,000–220,000) porque el corte `FECHA_FIN = 2026-05-02` limita al periodo etiquetado. La tabla `readings` de Supabase tiene 1,085,889 filas en total para todos los dispositivos.

### 7.2 Split temporal (Fase 2)

| Split | Filas | Rango |
|---|---|---|
| Train | 44,016 | Apr 08 – Apr 25 |
| Val | 9,432 | Apr 25 – Apr 28 |
| Test ★ | 9,432 | Apr 28 – May 01 |

Distribución total: reposo 61,259 (97.2%) · alimentacion 1,530 (2.4%) · servido 91 (0.1%)

### 7.3 Modelo A — Binario (activo vs reposo)

| Métrica | Exp 05 (anterior) | Exp 06 | Delta |
|---|---|---|---|
| F1 activo (val) | 0.5693 | **0.7619** | +0.1926 ✅ |
| AUC-ROC (val) | 0.8802 | **0.9205** | +0.0403 ✅ |
| Threshold calibrado | 0.22 | **0.20** | — |
| Precisión | — | 0.750 | — |
| Recall | — | 0.774 | — |
| Accuracy | 0.9737 | **0.9905** | +0.0168 |
| TP/FP/FN/TN | 113/58/113/6226 | **144/48/42/9198** | — |

> **Pasa umbral Fase 4**: F1 activo ≥ 0.70 ✅ y AUC-ROC ≥ 0.85 ✅

### 7.4 Modelo B — Multiclase (alimentacion / servido / reposo)

| Métrica | Exp 05 (anterior) | Exp 06 | Delta |
|---|---|---|---|
| Macro F1 (val) | 0.6456 | **0.6312** | -0.0144 |
| F1 alimentacion | 0.5488 | **0.7606** | +0.2118 ✅ |
| F1 servido | 0.4000 | **0.1395** | -0.2605 ⚠️ |
| F1 reposo | 0.9879 | **0.9934** | +0.0055 |
| SMOTE servido | 84 sinteticas | **142 sinteticas** (71 reales → 213) | — |

> **Pasa umbral Fase 4**: F1 alimentacion ≥ 0.65 ✅
>
> ⚠️ **F1 servido baja**: val set tiene solo 12 ejemplos de servido → F1 inestable. Necesita investigación en Fase 4 con el test set completo (Apr 28 – May 1, 8 sesiones servido).

### 7.5 Conclusión y habilitación de Fase 4

Ambas condiciones para habilitar Fase 4 están cumplidas:

- Modelo A F1 activo = **0.7619** ≥ 0.70 ✅
- Modelo B F1 alimentacion = **0.7606** ≥ 0.65 ✅

**Fase 4 habilitada.** Ejecutar evaluación sobre `X_test` (Apr 28 – May 01) y comparar contra estos resultados de validación.

---

## 8. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Encoding de CSVs (ñ, tildes) | Usar `encoding="latin1"` en todos los `pd.read_csv()` |
| Timezone mixtas en `audit_events` | Normalizar con `dateutil.parser.parse` → UTC |
| Mezcla `readings` vs `sensor_readings` | Usar solo `readings.csv` (tiene `clock_invalid`, `ingested_at`) |
| `clock_invalid = True` en 50% de filas | Mantener fallback a `ingested_at` (no descartar como hace Colab) |
| Test set vacío si el split no cubre May 1 | Ajustar `03_build_train_dataset.py` para extender el corte |


---


<!-- ==== fusionado desde A1_exp_07_inferencia_mayo_junio.md ==== -->

# Experimento 07 — Inferencia sobre datos Mayo–Junio 2026 (sin etiquetar)

- Fecha: `2026-06-14`
- Hora: `—`
- Proyecto: `Kittypau`
- Base: `Experimento 06`
- Alcance: Aplicar los modelos de Fase 3 sobre `readings_rows.csv`
  (Mayo–Junio 2026) para detectar sesiones sin etiquetas manuales previas.
- Estado: `completado — 2026-06-14`

---

## 0. Propósito del experimento

Este experimento tiene un objetivo distinto a todos los anteriores (Exp 01–06).

En los experimentos anteriores el flujo era:
> datos etiquetados → entrenar modelos → evaluar en validación

En el Experimento 07 el flujo es:
> modelos ya entrenados (Exp 06) → datos **sin etiquetar** → inferencia → sesiones detectadas

El archivo `readings_rows.csv` cubre el período **2026-05-23 → 2026-06-14** y **no contiene etiquetas manuales de alimentación ni servido**. Esto lo convierte en el primer conjunto de datos genuinamente nuevo sobre el que los modelos del Exp 06 pueden demostrar su capacidad de generalización real.

### Referencias a experimentos anteriores

- Los modelos usados en este experimento son los producidos en `A1_EXPERIMENTOS_DETALLE.md`.
- La arquitectura de features es la definida desde `A1_EXPERIMENTOS_DETALLE.md` (12 features activas, invariantes desde entonces).
- Las reglas de etiquetado y fuente de verdad están en `REGLAS_EVENTOS_ALIMENTACION.md`.
- El pipeline de inferencia de referencia es `inferencia_kpcl0034.py` documentado en el `README.md` de Data Science.

---

## 1. Fuente de datos

### Archivo

```
D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\
  Docs\investigacion\Data_2026\Mayo_2026\
    readings_rows.csv
```

### Resumen del análisis exploratorio (ejecutado 2026-06-14)

| Métrica | Valor |
|---|---|
| Filas totales | 121,764 |
| Columnas | 20 |
| Tamaño en memoria | 89.98 MB |
| Rango temporal (`recorded_at`) | 2026-05-23 20:55 UTC → 2026-06-14 04:07 UTC |
| Rango temporal (`ingested_at`) | 2026-05-23 20:55 UTC → 2026-06-14 04:07 UTC |
| Duración total | 21 días, 7 horas |
| Cadencia mediana | 12.1 s |
| Cadencia media | 14.6 s |
| Gaps > 5 minutos | 11 |

### Alerta crítica: clock_invalid al 100%

A diferencia del dump de abril (donde `clock_invalid = True` era ~50%), en este CSV
**el 100% de las filas tienen `clock_invalid = True`**.

**Consecuencia directa para el pipeline:**
- No usar `recorded_at` en ningún paso.
- Usar `ingested_at` como timestamp canónico en todo el experimento.
- Ajustar el script `03_extract_readings.py` para forzar `ingested_at` sin condición.

Esta diferencia debe documentarse y no ignorarse. Ver `REGLAS_EVENTOS_ALIMENTACION.md`
sección "Fuente 1" para el tratamiento canónico de `clock_invalid`.

### Devices presentes en el CSV

| device_id (UUID) | Filas | % | Device conocido |
|---|---|---|---|
| `3a460074-e7c3-41bf-ae5a-a011445f927a` | 57,154 | 46.9% | **KPCL0034** (food_bowl — pipeline activo) |
| `0dc601c0-1533-40c5-b606-6d89eb2d4042` | 57,036 | 46.8% | **KPCL0035** (comedero — device nuevo) |
| `418565e7-6683-440c-80e6-666363574cec` | 7,574 | 6.2% | Desconocido — no aparece en tabla `devices` |

**Regla de filtrado:**
El pipeline ML activo trabaja exclusivamente sobre KPCL0034.
Filtrar por `device_id = '3a460074-e7c3-41bf-ae5a-a011445f927a'` antes de cualquier
procesamiento de features. Ver `README.md` de Data Science — "El alcance vigente es
investigación supervisada sobre alimento; KPCL0036 e hidratación quedan fuera del
modelo activo."

### KPCL0035 — observaciones

KPCL0035 es un comedero nuevo que no formó parte de ningún experimento anterior.
Tiene `battery_level` reportando normalmente (67%, ~3.81V), a diferencia de KPCL0034
que sigue sin enviar batería. El `pet_id` es el mismo que KPCL0034, lo que sugiere
que es también el comedero de Bandida. Por ahora queda **fuera del scope del Exp 07**
pero puede ser incorporado en experimentos futuros si se etiquetan sus sesiones.

### Columnas disponibles

| # | Columna | Dtype | % lleno | Notas |
|---|---|---|---|---|
| 0 | `id` | object | 100% | UUID de lectura |
| 1 | `device_id` | object | 100% | Filtrar por KPCL0034 |
| 2 | `pet_id` | object | 99.4% | 784 nulos |
| 3 | `weight_grams` | float64 | 99.9% | Feature principal |
| 4 | `water_ml` | float64 | 0% | Vacía — ignorar |
| 5 | `flow_rate` | float64 | 0% | Vacía — ignorar |
| 6 | `temperature` | float64 | 100% | Feature disponible |
| 7 | `humidity` | float64 | 100% | Feature disponible |
| 8 | `battery_level` | float64 | 53.1% | Solo KPCL0035 y device desconocido |
| 9 | `recorded_at` | object | 100% | NO USAR (clock_invalid=True en 100%) |
| 10 | `ingested_at` | object | 100% | TIMESTAMP CANÓNICO para este experimento |
| 11 | `clock_invalid` | bool | 100% | True en el 100% de filas |
| 12 | `battery_voltage` | float64 | 53.1% | Solo KPCL0035 |
| 13 | `battery_state` | object | 53.1% | Solo KPCL0035 |
| 14 | `battery_source` | object | 53.1% | Solo KPCL0035 |
| 15 | `battery_is_estimated` | bool | 100% | False en todo el CSV |
| 16 | `light_percent` | int64 | 100% | Feature nueva — no estaba en Exp 01–06 |
| 17 | `light_lux` | float64 | 100% | Feature nueva — no estaba en Exp 01–06 |
| 18 | `light_condition` | object | 100% | dark 94.4%, dim 5.5%, normal/bright <1% |
| 19 | `battery_updated_at` | object | 53.1% | Solo KPCL0035 |

### Features nuevas: light_percent y light_lux

Estas columnas no existían en el dataset de entrenamiento de los Exp 01–06.
No deben agregarse al modelo en este experimento — los modelos del Exp 06 no las conocen.
Quedan registradas como candidatas para el Experimento 08 si se decide reentrenar.

---

## 2. Modelos disponibles (Experimento 06)

Los modelos a usar son los artefactos producidos en `A1_EXPERIMENTOS_DETALLE.md`,
entrenados con el dump 07-05-2026 (Apr 8 – May 1).

| Modelo | Artefacto | Métricas de validación (Exp 06) |
|---|---|---|
| Modelo A (binario) | `fase_3_modelos/models/modelo_a/modelo_a.lgb` | F1 activo = **0.7619**, AUC-ROC = **0.9205** |
| Modelo A calibración | `fase_3_modelos/models/modelo_a/calibration_isotonic.json` | Threshold calibrado = 0.20 |
| Modelo B (multiclase) | `fase_3_modelos/models/modelo_b/modelo_b.lgb` | F1 alimentacion = **0.7606**, Macro F1 = 0.6312 |

Ambos modelos cruzaron los umbrales de Fase 4 en validación:
- Modelo A F1 activo ≥ 0.70 ✅
- Modelo B F1 alimentacion ≥ 0.65 ✅

Este experimento es la primera aplicación real de esos modelos sobre datos fuera
del período de entrenamiento.

---

## 3. Ajustes necesarios por Fase

### Fase 1 — Extracción

**Script de referencia:** `fase_1_extraccion/scripts/03_extract_readings.py`

Ajustes requeridos para este experimento:

| Ajuste | Detalle |
|---|---|
| Fuente de datos | Leer desde `readings_rows.csv` (no desde Supabase API ni dump anterior) |
| Filtro de device | `device_id = '3a460074-e7c3-41bf-ae5a-a011445f927a'` (KPCL0034 únicamente) |
| Timestamp canónico | Usar `ingested_at` **siempre**, sin condicional `clock_invalid` (es True al 100%) |
| Encoding | `latin1` — consistente con todos los CSVs del proyecto |
| Columnas a ignorar | `water_ml`, `flow_rate` (vacías al 100%) |
| Columnas nuevas | `light_percent`, `light_lux`, `light_condition` — **no incorporar al modelo** |
| Etiquetas | Este CSV **no tiene etiquetas**. No ejecutar `04_extract_events.py` en modo normal. |

**Resultado esperado de Fase 1:**
- `readings_raw.parquet` con ~57,154 filas (KPCL0034, Mayo–Junio)
- Sin `sessions_labeled.parquet` — no hay etiquetas
- Sin `events_labeled.parquet` — no hay eventos manuales en este período

### Fase 2 — Features

**Script de referencia:** `fase_2_dataset/scripts/02_build_features.py`

Las **12 features activas** definidas en `A1_EXPERIMENTOS_DETALLE.md` y mantenidas en
todos los experimentos hasta el Exp 06 se calculan exactamente igual:

| # | Feature | Nota |
|---|---|---|
| 1 | `weight_grams` | Peso bruto — disponible en el CSV |
| 2 | `delta_w` | `weight[t] - weight[t-1]` |
| 3 | `delta_w_10` | Delta sobre ventana de 10 lecturas |
| 4 | `rolling_std_5` | Std últimas 5 lecturas |
| 5 | `rolling_std_10` | Std últimas 10 lecturas |
| 6 | `rolling_mean_5` | Media últimas 5 lecturas |
| 7 | `net_weight` | `weight - baseline_w` (percentil 10, ventana 60 filas) |
| 8 | `is_plateau` | 1 si `rolling_std_5 < 1.5g` |
| 9 | `plateau_duration` | Filas consecutivas en plateau |
| 10 | `hour_sin` | Componente seno del ciclo horario (basado en `ingested_at`) |
| 11 | `hour_cos` | Componente coseno del ciclo horario (basado en `ingested_at`) |
| 12 | `clock_invalid` | Constante = 1 en todo este dataset |

**Atención:** `hour_sin` y `hour_cos` deben calcularse desde `ingested_at`, no desde
`recorded_at`. Ver `_phase2_utils.py` — `GAP=300s`, `PLATEAU=1.5g`.

**No hay `y` (labels)** — este experimento solo construye `X`, no `X` e `y`.

### Fase 3 — Inferencia (no entrenamiento)

En este experimento **no se entrena ningún modelo nuevo**.

El script de referencia es `inferencia_kpcl0034.py` (documentado en `README.md`).

Flujo de inferencia:

```
readings_rows.csv (KPCL0034)
    → Fase 1: extraer y limpiar lecturas
    → Fase 2: calcular 12 features → X_mayo_junio.parquet
    → Modelo A: predecir activo/reposo por fila con threshold calibrado 0.20
    → Modelo B: predecir alimentacion/servido/reposo por fila
    → Post-proceso: agrupar filas consecutivas activas → sesiones detectadas
    → Salida: sesiones_detectadas_mayo_junio.csv + inferencia_mayo_junio.html
```

**Threshold a usar:**
- Modelo A: `threshold = 0.20` (calibrado en Exp 06, guardado en `calibration_isotonic.json`)
- Modelo B: argmax de probabilidades (sin threshold adicional)

---

## 4. Validación y anotación posterior

Este experimento no tiene ground truth previo, pero puede generarlo después.

### Opción A — Validación visual

Abrir `inferencia_mayo_junio.html` en el dashboard y comparar visualmente las bandas
detectadas por el modelo contra la curva de peso. Usar `app_anotacion.py` para confirmar
o corregir sesiones detectadas.

### Opción B — Etiquetado retroactivo

Usar `app_anotacion.py` para registrar manualmente `inicio_alimentacion` /
`termino_alimentacion` sobre el período Mayo–Junio en `new_annotations.csv`.
Esas anotaciones se fusionan en la próxima corrida de `04_extract_events.py` y
permiten calcular métricas reales del modelo en este período nuevo.

Esta es la ruta recomendada: convierte el Exp 07 en el conjunto de evaluación más
limpio disponible hasta ahora, ya que el período Mayo–Junio **nunca fue visto durante
el entrenamiento**.

### Opción C — Usar como test set formal (Fase 4 extendida)

Si se etiqueta suficiente porción del período, este CSV puede funcionar como el
test set más robusto del proyecto — con 21 días de datos nunca vistos vs. los
3-4 días del test set reservado del Exp 06.

---

## 5. Metas del experimento

| Métrica | Umbral Fase 4 | Referencia Exp 06 (val) | Meta Exp 07 |
|---|---|---|---|
| Modelo A — F1 activo | ≥ 0.70 | 0.7619 | Medir sobre anotaciones posteriores |
| Modelo A — AUC-ROC | ≥ 0.85 | 0.9205 | Medir sobre anotaciones posteriores |
| Modelo B — F1 alimentacion | ≥ 0.65 | 0.7606 | Medir sobre anotaciones posteriores |
| Modelo B — F1 servido | — | 0.1395 ⚠️ | Observar — esperamos mejora con más datos reales |
| Sesiones detectadas | — | — | Validar coherencia con curva de peso |

---

## 6. Checklist de ejecución

### Preparación
- [x] Confirmar que `readings_rows.csv` existe y tiene 121,764 filas
- [x] Confirmar que los modelos del Exp 06 existen en `fase_3_modelos/models/`
- [x] Confirmar que `calibration_isotonic.json` está presente para el Modelo A
- [x] Activar entorno virtual: `.\venv\Scripts\Activate.ps1`

### Fase 1 + 2 + Inferencia (script unificado `inferencia_exp07_mayo_junio.py`)
- [x] Leer desde `readings_rows.csv`, filtrar `device_id = KPCL0034` por UUID
- [x] Forzar `ingested_at` como timestamp (clock_invalid=True al 100%)
- [x] Calcular las 12 features invariantes (espejo exacto de `_phase2_utils.py`)
- [x] Generar `X_mayo_junio.parquet` — 57,101 filas, 12 features
- [x] Cargar Modelo A con calibración isotónica, threshold 0.20
- [x] Cargar Modelo B con argmax
- [x] Generar `sesiones_detectadas_mayo_junio.csv`
- [x] Generar `inferencia_mayo_junio.html`

### Validación
- [ ] Abrir dashboard y revisar sesiones detectadas vs. curva de peso
- [ ] Iniciar etiquetado retroactivo con `app_anotacion.py` (opcional pero recomendado)
- [ ] Documentar sesiones anómalas o períodos donde el modelo falla visiblemente

### Cierre
- [x] Completar sección "7. Resultados" de este documento
- [ ] Registrar en `A1_RESUMEN_EXPERIMENTOS_FASE3.md` la fila del Exp 07

---

## 7. Resultados

*Ejecutado: 2026-06-14. Script: `inferencia_exp07_mayo_junio.py`.*

### 7.1 Sesiones detectadas por Modelo A

| Métrica | Valor |
|---|---|
| Total filas procesadas | 57,101 |
| Filas clasificadas como `activo` | 2,202 (3.9%) |
| Sesiones agrupadas detectadas | **155** |
| Duración media por sesión | 4.9 min |
| 152 sesiones descartadas (sanity filter `|consumido_g| < 3g`) | — |

### 7.2 Sesiones detectadas por Modelo B (dominancia de clase en cada sesión activa)

| Clase dominante | Sesiones |
|---|---|
| `alimentacion` | **134** |
| `servido` | 6 |
| `reposo` (activo en A, reposo en B) | 15 |

**Estadísticas alimentación:**

| Métrica | Valor |
|---|---|
| Consumo total estimado | 1,306 g en 20 días |
| Consumo medio por sesión | 9.7 g |
| Duración media | 4.9 min |

**Resumen diario (sesiones de alimentación):**

| Fecha | Sesiones | Consumo (g) | Dur. media (min) |
|---|---|---|---|
| 2026-05-25 | 5 | 11 | 7.0 |
| 2026-05-26 | 6 | 42 | 4.1 |
| 2026-05-27 | 5 | 79 | 6.9 |
| 2026-05-28 | 5 | 76 | 4.5 |
| 2026-05-29 | 6 | 49 | 4.8 |
| 2026-05-30 | 10 | 70 | 4.2 |
| 2026-05-31 | 8 | 92 | 4.1 |
| 2026-06-01 | 13 | 61 | 4.4 |
| 2026-06-02 | 9 | 89 | 4.4 |
| 2026-06-03 | 8 | 41 | 3.0 |
| 2026-06-04 | 11 | 74 | 5.5 |
| 2026-06-05 | 9 | 105 | 4.0 |
| 2026-06-06 | 3 | 41 | 6.5 |
| 2026-06-07 | 5 | 75 | 6.2 |
| 2026-06-08 | 4 | 65 | 4.1 |
| 2026-06-09 | 6 | 98 | 7.3 |
| 2026-06-10 | 9 | 64 | 4.8 |
| 2026-06-11 | 5 | 71 | 5.8 |
| 2026-06-12 | 4 | 40 | 6.5 |
| 2026-06-13 | 3 | 63 | 4.0 |

**Observaciones post-inferencia:**
- 15 sesiones con clase dominante `reposo` detectadas como activas por Modelo A sugieren que el threshold 0.20 está siendo muy sensible en algunas zonas de transición (servido o reseteo del plato).
- Algunas sesiones muestran `consumido_g` negativo (ej. -53g, -129g): son eventos de servido clasificados como alimentación — coherente con la dificultad histórica del Modelo B en discriminar servido (F1 servido=0.14 en Exp 06).
- La cadencia de 30s (vs. 14.7s en entrenamiento) puede generar ventanas rolling con menos puntos, lo que reduce levemente la resolución de `rolling_std_5` y `rolling_std_10`.

### 7.3 Métricas (pendiente de etiquetado retroactivo)

| Métrica | Valor |
|---|---|
| Modelo A — F1 activo | pendiente |
| Modelo A — AUC-ROC | pendiente |
| Modelo B — Macro F1 | pendiente |
| Modelo B — F1 alimentacion | pendiente |
| Modelo B — F1 servido | pendiente |

Para calcularlas: etiquetar retroactivamente con `app_anotacion.py` y re-ejecutar con el CSV de anotaciones.

---

## 8. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| `clock_invalid = True` en 100% de filas | Usar `ingested_at` siempre, sin condición |
| 3 devices en el CSV | Filtrar por UUID de KPCL0034 antes de cualquier cálculo |
| Features nuevas (`light_*`) | No incorporar al modelo — los Exp 01–06 no las conocen |
| Device desconocido (`418565e7`) | Ignorar en este experimento — investigar origen en paralelo |
| KPCL0035 en mismo CSV | Excluir del pipeline — no tiene etiquetas ni historial de entrenamiento |
| Deriva de distribución Mayo–Jun vs. Apr | Esperable — es exactamente lo que este experimento mide |

---

## 9. Relación con experimentos anteriores

| Experimento | Rol en el Exp 07 |
|---|---|
| `A1_EXPERIMENTOS_DETALLE.md` | Línea base histórica de referencia |
| `A1_EXPERIMENTOS_DETALLE.md` | Introdujo threshold tuning — threshold 0.20 del Exp 07 viene de esta línea |
| `A1_EXPERIMENTOS_DETALLE.md` | Definió las 12 features activas — invariantes en el Exp 07 |
| `A1_EXPERIMENTOS_DETALLE.md` | Introdujo calibración isotónica — usada en Modelo A del Exp 07 |
| `A1_EXPERIMENTOS_DETALLE.md` | Confirmó que nueva ingesta no siempre mueve el modelo — lección aplicable aquí |
| `A1_EXPERIMENTOS_DETALLE.md` | **Fuente de los modelos** usados en el Exp 07 — F1 activo 0.76, F1 alim 0.76 |

---

## 10. Próxima ejecución

Para repetir o continuar este experimento:

1. Verificar que `readings_rows.csv` sigue en la ruta de Mayo_2026.
2. Verificar que los modelos del Exp 06 están en `fase_3_modelos/models/`.
3. Ejecutar el checklist de la sección 6 en orden.
4. Si se etiquetó retroactivamente, volver a calcular métricas con las anotaciones nuevas.
5. Guardar una nueva versión de este documento con fecha y resultados completos.


======================================================================
KITTYPAU — EXP 07 — ANÁLISIS KPCL0034 — Mayo–Junio 2026
======================================================================

Cargando: readings_rows.csv
  Filas totales: 121,764  |  Columnas: 20

  KPCL0034 aislado: 57,154 filas  (46.9% del CSV total)
  clock_invalid = True: 100.0%  → usando ingested_at siempre

──────────────────────────────────────────────────────────────────────
1. RANGO TEMPORAL Y CADENCIA — KPCL0034

──────────────────────────────────────────────────────────────────────
  Inicio   : 2026-05-25 01:51:44.354000+00:00
  Fin      : 2026-06-14 04:06:15.895000+00:00
  Duración : 20 days 02:14:31.541000
  Filas    : 57,107

  Cadencia:
    Mediana : 30.0 s  (Exp 01–05: 14.7 s)
    Media   : 30.2 s
    Mín     : 0.0 s
    Máx     : 1328.8 s

  Gaps > 300s (delimitan segmentos): 11
    Gap 1: 172.2 min  @ 2026-05-29 17:26:35.413000+00:00
    Gap 2: 63.3 min  @ 2026-05-29 19:57:56.108000+00:00
    Gap 3: 14.1 min  @ 2026-05-30 14:49:45.353000+00:00
    Gap 4: 22.1 min  @ 2026-05-30 16:09:54.414000+00:00
    Gap 5: 6.6 min  @ 2026-06-04 14:13:58.508000+00:00
    Gap 6: 6.6 min  @ 2026-06-07 21:37:34.148000+00:00
    Gap 7: 9.1 min  @ 2026-06-08 16:03:55.508000+00:00
    Gap 8: 7.6 min  @ 2026-06-11 14:48:59.956000+00:00
    Gap 9: 18.6 min  @ 2026-06-12 13:55:44.255000+00:00
    Gap 10: 6.6 min  @ 2026-06-12 14:34:26.087000+00:00
    Gap 11: 17.0 min  @ 2026-06-12 15:03:57.851000+00:00

──────────────────────────────────────────────────────────────────────
2. CALIDAD DE SEÑAL — weight_grams

──────────────────────────────────────────────────────────────────────
  Filas válidas : 57,055  |  Nulos: 52 (0.09%)
  Min    : 0.0 g
  P5     : 90.0 g
  P25    : 107.0 g
  Mediana: 122.0 g
  Media  : 125.4 g
  P75    : 142.0 g
  P95    : 174.0 g
  Max    : 237.0 g
  Std    : 26.10 g

  Peso neto (weight - 151g plato):
    Mediana: -29.0 g
    Negativo (posible vacío/tara): 47,653 filas (83.5%)

  Outliers detectados:
    weight > 900g  : 0 filas
    weight = 0g    : 12 filas

  Peso mediano por día:
            mediana_g      std_g  n_lecturas
fecha
2026-05-25      125.0  21.545809        2700
2026-05-26      107.0  27.349324        2875
2026-05-27      179.0  12.601790        2870
2026-05-28      134.0  22.389175        2872
2026-05-29      120.0  14.940620        2387
2026-05-30      135.0  18.856575        2805
2026-05-31      102.0  27.488932        2873
2026-06-01      124.0   7.004305        2871
2026-06-02       95.0  14.200063        2872
2026-06-03      115.0   3.907542        2875
2026-06-04      114.0   7.326804        2855
2026-06-05      100.0  12.005734        2877
2026-06-06      123.0  17.627755        2870
2026-06-07      137.0  15.753532        2861
2026-06-08      123.0  16.251806        2860
2026-06-09      113.0  27.429069        2872
2026-06-10      166.0  21.821244        2869
2026-06-11      165.0  12.686581        2843
2026-06-12      128.0   9.690094        2786
2026-06-13      108.0  17.478603        2870
2026-06-14      111.0   3.291225         492

──────────────────────────────────────────────────────────────────────
3. PRE-CÁLCULO DE 12 FEATURES INVARIANTES (Exp 03–06)

──────────────────────────────────────────────────────────────────────
d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\analisis.py:158: FutureWarning: Series.fillna with 'method' is deprecated and will raise in a future version. Use obj.ffill() or obj.bfill() instead.
  w  = df["weight_grams"].fillna(method="ffill")
  Features calculadas:
                   n_validos     mean      std    min  mediana       max
weight_grams         57055.0  125.355   26.098    0.0  122.000   237.000
delta_w              57106.0    0.000    2.670 -129.0    0.000   141.000
delta_w_10           57097.0    0.004    4.753 -129.0    0.000   141.000
rolling_std_5        57106.0    0.240    2.121    0.0    0.000    63.057
rolling_std_10       57106.0    0.392    2.439    0.0    0.000    55.356
rolling_mean_5       57106.0  125.360   26.033    0.0  122.000   195.000
net_weight           57098.0    1.260    7.459 -129.0    0.000   106.000
is_plateau           57107.0    0.967    0.178    0.0    1.000     1.000
plateau_duration     57107.0  235.908  216.170    0.0  176.000  1243.000
hour_sin             57107.0    0.014    0.705   -1.0    0.031     1.000
hour_cos             57107.0    0.008    0.709   -1.0    0.017     1.000
clock_invalid_int    57107.0    1.000    0.000    1.0    1.000     1.000

  Filas con delta_w < -2g (candidatos a consumo): 499  (0.87%)
  Filas con delta_w > +10g (candidatos a servido): 74  (0.13%)
  Filas en plateau (rolling_std_5 < 1.5g): 96.7%

──────────────────────────────────────────────────────────────────────
4. ZONAS CANDIDATAS A SESIONES DE ALIMENTACIÓN

──────────────────────────────────────────────────────────────────────
  (Heurístico pre-modelo: caída sostenida > 5g en < 30 min)

  Sesiones candidatas detectadas: 115
  Consumo total estimado     : 2096.0 g
  Consumo medio por sesión   : 18.2 g
  Duración media             : 5.2 min

  Detalle (primeras 20):
                          inicio                              fin  duracion_min  consumo_g  peso_inicio  peso_fin
2026-05-25 12:18:55.217000+00:00 2026-05-25 12:25:55.527000+00:00           7.0       20.0        153.0     133.0
2026-05-25 15:17:03.670000+00:00 2026-05-25 15:23:33.724000+00:00           6.5       12.0        137.0     125.0
2026-05-25 21:05:34.984000+00:00 2026-05-25 21:10:34.896000+00:00           5.0       11.0        121.0     110.0
2026-05-25 23:06:35.815000+00:00 2026-05-25 23:13:05.788000+00:00           6.5       21.0        116.0      95.0
2026-05-26 07:22:08.353000+00:00 2026-05-26 07:24:38.472000+00:00           2.5        6.0        134.0     128.0
2026-05-26 07:52:38.568000+00:00 2026-05-26 07:57:38.560000+00:00           5.0       11.0        133.0     122.0
2026-05-26 11:08:39.697000+00:00 2026-05-26 11:16:09.799000+00:00           7.5       15.0        122.0     107.0
2026-05-26 11:37:39.856000+00:00 2026-05-26 11:42:39.821000+00:00           5.0       10.0        111.0     101.0
2026-05-26 16:13:41.151000+00:00 2026-05-26 16:16:11.159000+00:00           2.5        6.0         99.0      93.0
2026-05-26 21:37:42.162000+00:00 2026-05-26 21:42:42.014000+00:00           5.0       11.0        198.0     187.0
2026-05-27 00:08:42.727000+00:00 2026-05-27 00:13:12.905000+00:00           4.5       11.0        190.0     179.0
2026-05-27 09:35:18.691000+00:00 2026-05-27 09:37:48.633000+00:00           2.5        6.0        185.0     179.0
2026-05-27 13:44:50.118000+00:00 2026-05-27 13:50:20.136000+00:00           5.5       14.0        192.0     178.0
2026-05-27 15:11:20.637000+00:00 2026-05-27 15:13:50.856000+00:00           2.5        9.0        180.0     171.0
2026-05-27 19:51:52.641000+00:00 2026-05-27 19:59:52.789000+00:00           8.0       36.0        179.0     143.0
2026-05-27 23:59:55.415000+00:00 2026-05-28 00:08:25.534000+00:00           8.5       21.0        155.0     134.0
2026-05-28 04:59:04.257000+00:00 2026-05-28 05:04:04.353000+00:00           5.0       13.0        137.0     124.0
2026-05-28 09:48:35.479000+00:00 2026-05-28 09:53:05.439000+00:00           4.5       11.0        124.0     113.0
2026-05-28 09:53:35.495000+00:00 2026-05-28 09:56:05.654000+00:00           2.5        7.0        113.0     106.0
2026-05-28 11:38:36.201000+00:00 2026-05-28 11:41:06.177000+00:00           2.5       55.0        106.0      51.0

  Resumen diario:
            n_sesiones  consumo_total_g  duracion_media_min
fecha
2026-05-25           4             64.0                 6.2
2026-05-26           6             59.0                 4.6
2026-05-27           6             97.0                 5.2
2026-05-28           7            143.0                 3.9
2026-05-29           4             57.0                 5.3
2026-05-30           7             97.0                 4.6
2026-05-31           7            120.0                 4.9
2026-06-01           7            125.0                 5.7
2026-06-02           8             95.0                 4.6
2026-06-03           4             98.0                 4.0
2026-06-04          10            179.0                 5.2
2026-06-05           9            163.0                 4.1
2026-06-06           3             46.0                 6.5
2026-06-07           6            183.0                 5.6
2026-06-08           5             91.0                 6.3
2026-06-09           5            110.0                 8.1
2026-06-10           6             96.0                 5.2
2026-06-11           6            119.0                 5.3
2026-06-12           4             81.0                 6.0
2026-06-13           1             73.0                 7.0

──────────────────────────────────────────────────────────────────────
5. DERIVA DE DISTRIBUCIÓN vs. DATOS DE ENTRENAMIENTO (Exp 06)

──────────────────────────────────────────────────────────────────────
  weight_grams — comparación:
    Este CSV  → mediana: 122.0g  |  std: 26.1g
    Exp 06    → mediana en train no documentada explícitamente
    Plate weight referencia: 151g

  temperature:
    Mediana: 19.5°C  |  Rango: 15.0–22.0°C

  humidity:
    Mediana: 40.1%  |  Rango: 29.4–49.8%

  Distribución horaria de lecturas (UTC):
    00h:  2,398  ████
    01h:  2,460  ████
    02h:  2,514  █████
    03h:  2,515  █████
    04h:  2,407  ████
    05h:  2,399  ████
    06h:  2,398  ████
    07h:  2,396  ████
    08h:  2,396  ████
    09h:  2,399  ████
    10h:  2,398  ████
    11h:  2,396  ████
    12h:  2,393  ████
    13h:  2,355  ████
    14h:  2,250  ████
    15h:  2,231  ████
    16h:  2,243  ████
    17h:  2,343  ████
    18h:  2,383  ████
    19h:  2,276  ████
    20h:  2,383  ████
    21h:  2,387  ████
    22h:  2,393  ████
    23h:  2,394  ████

  Features nuevas (NO incorporar al modelo actual):
    light_percent → mediana: 1.0%
    light_lux     → mediana: 13.69 lux
    light_condition distribución:
      dark      :  56,773  (99.4%)
      dim       :     334  (0.6%)

──────────────────────────────────────────────────────────────────────
6. VERIFICACIÓN DE COMPATIBILIDAD CON MODELOS EXP 06

──────────────────────────────────────────────────────────────────────

  Check                          Criterio                                 Estado Detalle
  ────────────────────────────── ──────────────────────────────────────── ───── ────────────────────
  weight_grams                   columna requerida                        ✅
  temperature                    columna requerida                        ✅
  humidity                       columna requerida                        ✅
  ingested_at                    columna requerida                        ✅
  clock_invalid                  columna requerida                        ✅
  weight_grams                   cobertura > 98%                          ✅     99.9%
  clock_invalid                  100% True → usar ingested_at             ✅     100% True
  weight_grams                   rango 0–1100g                            ✅     0–237g
  12 features                    calculables desde columnas disponibles   ✅
  water_ml / flow_rate           vacías — ignorar                         ✅     ['water_ml', 'flow_rate']

  Modelo A (binario)   → threshold calibrado a usar: 0.20
  Modelo B (multiclase)→ argmax de probabilidades
  Artefactos esperados:
    fase_3_modelos/models/modelo_a/modelo_a.lgb
    fase_3_modelos/models/modelo_a/calibration_isotonic.json
    fase_3_modelos/models/modelo_b/modelo_b.lgb

──────────────────────────────────────────────────────────────────────
7. RESUMEN EJECUTIVO — LISTO PARA EXP 07

──────────────────────────────────────────────────────────────────────

  Dataset  : readings_rows.csv — KPCL0034 aislado
  Período  : 2026-05-25 → 2026-06-14 (20 días)
  Filas    : 57,107
  Cadencia : 30.0 s mediana
  Peso     : 122.0g mediana  |  26.1g std
  Gaps     : 11 gaps > 5 min

  ALERTAS CRÍTICAS:
    ⚠️  clock_invalid = True en 100% → usar ingested_at siempre
    ⚠️  3 devices en CSV → solo KPCL0034 filtrado aquí
    ⚠️  light_percent / light_lux presentes → NO incorporar al modelo
    ⚠️  Sin etiquetas → inferencia pura, no evaluación

  SIGUIENTE PASO:
    1. Ejecutar 03_extract_readings.py con ingested_at forzado
    2. Ejecutar 02_build_features.py → X_mayo_junio.parquet
    3. Ejecutar inferencia_kpcl0034.py con modelos del Exp 06
    4. Abrir inferencia_mayo_junio.html y validar visualmente
    5. Etiquetar sesiones retroactivamente con app_anotacion.py

======================================================================
FIN DEL ANÁLISIS
======================================================================


---


<!-- ==== fusionado desde A1_exp_08_unificacion_mayo_junio.md ==== -->

# Exp 08 — Unificación Mayo-Junio 2026

| Campo | Valor |
|---|---|
| **ID** | Exp 08 |
| **Nombre** | Unificación datos Mayo-Junio 2026 |
| **Fecha** | 2026-06-14 |
| **Estado** | ✅ Completado |
| **Basado en** | Exp 06 (artefactos base) + Exp 07 (anotaciones retroactivas) |

---

## Objetivo

Reentrenar Modelo A y Modelo B incorporando las 91 sesiones retroactivamente anotadas de Mayo-Junio 2026 (resultado del proceso de etiquetado manual via `app_anotacion.py`).

---

## Cambios respecto a Exp 06

| Componente | Exp 06 | Exp 08 |
|---|---|---|
| Fuente de readings | `kittypau_full_07-05-2026_csv/readings.csv` (solo Abril) | Abril + `Mayo_2026/readings_rows.csv` |
| Rango de datos | Apr 8 – May 1, 2026 | Apr 8 – Jun 14, 2026 |
| Total filas readings | 124,682 | **212,011** |
| Sesiones alimentacion (train) | 103 | **185** (+82 retroactivas) |
| Sesiones servido (train) | 18 | **27** (+9 retroactivas) |
| Etiquetado May-Jun | ❌ Sin etiquetar | ✅ Retroactivo via `new_annotations.csv` |
| Split (train/val/test) | Apr 8–Apr 20 / Apr 20–Apr 28 / Apr 28–May 1 | Apr 8–May 31 / May 31–Jun 7 / Jun 7–Jun 14 |
| UUID KPCL0034 Abril | `9510a455-b0e9-4932-8be1-03976d31228a` | mismo |
| UUID KPCL0034 Mayo-Jun | N/A | `3a460074-e7c3-41bf-ae5a-a011445f927a` |

---

## Modificaciones al pipeline

### `fase_1_extraccion/scripts/03_extract_readings.py`
- `FECHA_FIN` extendido de `2026-05-02` a `2026-06-15`
- Nueva función `load_from_csv_mayo_junio()`: lee `Data_2026/Mayo_2026/readings_rows.csv`, filtra por `KPCL0034_MJ_UUID`, usa `ingested_at` (clock_invalid 100% True en Mayo-Jun)
- `main()` concatena Abril + Mayo-Jun antes de llamar a `build_dataframe()`

### Scripts sin cambios
- `04_extract_events.py`: ya fusionaba `new_annotations.csv` automáticamente
- `05_build_sessions.py`: sin cambios (genérico)
- Fase 2 y Fase 3: sin cambios

---

## Resultados — Fase 1

| Métrica | Valor |
|---|---|
| Total readings | 212,011 |
| Rango temporal | Apr 8 – Jun 14, 2026 |
| Gaps > 5 min | 21 (incluyendo gap May 1 – May 25 sin datos) |
| clock_invalid True | 134,576 (63.5%) |
| Sesiones reconstruidas | 212 (185 alim · 27 serv) |
| Eventos etiquetados | 436 (254 audit_events + 182 new_annotations) |

---

## Resultados — Fase 2 (Dataset)

| Split | Filas | Período |
|---|---|---|
| Train | 94,621 | Apr 8 – May 31, 2026 |
| Val | 20,276 | May 31 – Jun 7, 2026 |
| Test | 20,277 | Jun 7 – Jun 14, 2026 |

Distribución train: reposo 97.8% · alimentacion 2.0% · servido 0.1%

---

## Resultados — Modelo A (Binario: activo vs reposo)

| Métrica | Exp 06 | **Exp 08** | Delta |
|---|:---:|:---:|:---:|
| F1 activo | 0.7619 | **0.6021** | −0.16 |
| AUC-ROC | 0.9205 | **0.9181** | −0.00 |
| Threshold | 0.20 | 0.20 | — |
| Precision | — | 0.4960 | — |
| Recall | — | 0.7658 | — |
| Iteraciones | — | 17 | — |

---

## Resultados — Modelo B (Multiclase)

| Métrica | Exp 06 | **Exp 08** | Delta |
|---|:---:|:---:|:---:|
| F1 alimentacion | 0.7606 | **0.5778** | −0.18 |
| F1 servido | 0.1395 ⚠️ | **0.2414** ✅ | **+0.10** |
| F1 reposo | — | 0.9884 | — |
| Macro F1 | 0.6312 | **0.6025** | −0.03 |
| Iteraciones | — | 179 | — |

---

## Análisis

### ¿Por qué bajan F1 activo y F1 alimentacion?

El **val set ahora es Mayo-Jun 2026** (May 31 – Jun 7), que tiene características diferentes al período de entrenamiento original (Abril):

| Característica | Abril (train) | Mayo-Jun (val/test) |
|---|---|---|
| Cadencia mediana | ~14.7 s | ~30.0 s |
| clock_invalid True | ~50% | 100% |
| UUID KPCL0034 | `9510a455…` | `3a460074…` |
| Origen de etiquetas | Tiempo real (Supabase) | Retroactivo (app_anotacion) |

El **shift de distribución** entre Abril y Mayo-Jun explica la caída en las métricas de val. El modelo sigue siendo capaz (AUC-ROC = 0.9181 > 0.85), pero el dominio Mayo-Jun es estadísticamente diferente.

### F1 servido mejora (+0.10)

La adición de 9 sesiones de servido retroactivas (de 18 a 27 total) mejoró el F1 servido de 0.1395 a 0.2414. Con más datos de este tipo, el modelo debería seguir mejorando.

### Decisión de producción

**Exp 06 permanece como modelo de producción** ya que tiene mejor F1 activo y F1 alimentacion sobre datos del mismo período de entrenamiento. Exp 08 es un experimento diagnóstico que confirma:

1. La heterogeneidad de datos Abril vs Mayo-Jun requiere normalización de features (cadencia, distribución temporal)
2. Más datos de servido ayudan
3. El shift de distribución es el factor limitante para Exp 08

---

## Próximos pasos → Exp 09

Opciones para Exp 09 (en evaluación):

1. **Normalizar cadencia**: pre-procesar ambos períodos a la misma frecuencia (~30s) antes de calcular features
2. **Revisar etiquetas Abril**: usar `app_anotacion.py` modo "Prep Exp 09 - Abril 2026" para confirmar/corregir las 128 sesiones detectadas
3. **Separar modelos por período**: un modelo para datos Abril (alta cadencia) y otro para Mayo-Jun (baja cadencia)
4. **Incluir `light_*` features**: disponibles desde Mayo-Jun, podrían ayudar a detectar sesiones nocturnas

---

## Artefactos

| Artefacto | Ubicación |
|---|---|
| `modelo_a.lgb` (Exp 08) | `fase_3_modelos/models/modelo_a/modelo_a.lgb` |
| `modelo_b.lgb` (Exp 08) | `fase_3_modelos/models/modelo_b/modelo_b.lgb` |
| `readings_raw.parquet` (extendido) | `fase_1_extraccion/data/raw/readings_raw.parquet` |
| `sessions_labeled.parquet` | `fase_1_extraccion/data/raw/sessions_labeled.parquet` |
| `quality_report.txt` | `fase_1_extraccion/outputs/quality_report/quality_report.txt` |
| `dataset_report.txt` | `fase_2_dataset/outputs/dataset_report/dataset_report.txt` |
| `training_report.txt` | `fase_3_modelos/outputs/training_report/training_report.txt` |

> ⚠️ **NOTA**: Los artefactos `modelo_a.lgb` y `modelo_b.lgb` han sido sobreescritos por Exp 08.
> Para reproducir Exp 06 se necesita re-correr el pipeline con `FECHA_FIN=2026-05-02` y sin el CSV Mayo-Jun.
> La inferencia de producción del sistema web sigue usando los modelos de Exp 06 (via Supabase).


---


<!-- ==== fusionado desde A1_exp_09a_cadencia_normalizada.md ==== -->

# Exp 09A — Normalización de Cadencia

| Campo | Valor |
|---|---|
| **ID** | Exp 09A |
| **Nombre** | Normalización de cadencia a 30 s |
| **Fecha** | 2026-06-14 |
| **Estado** | ✅ Completado |
| **Basado en** | Exp 08 (dataset Abril + Mayo-Jun) |
| **Siguiente** | [Exp 09B](A1_EXPERIMENTOS_DETALLE.md) — threshold por período + plateau en segundos + cadencia_s |

---

## 1. Objetivo

Eliminar el shift de distribución entre Abril 2026 y Mayo-Jun 2026 que causó la
caída de F1 activo de 0.7619 → 0.6021 en Exp 08.

---

## 2. Root cause identificado en Exp 08

Las features de rolling window se computan por **fila**, no por tiempo:

| Período | Cadencia real | `rolling(5)` representa | `rolling(10)` representa |
|---|---|---|---|
| Abril 2026 | ~14.7 s | ~74 s | ~147 s |
| Mayo-Jun 2026 | ~30 s | ~150 s | ~300 s |

El modelo aprende `rolling_std_5`, `plateau_duration`, `delta_w_10` en el contexto
temporal de Abril (147 s por ventana de 10) y los evalúa en Mayo-Jun (300 s por
ventana de 10). La misma feature numérica describe fenómenos diferentes en cada
período → distribución shift → caída de métricas en val/test.

El AUC-ROC se mantuvo estable (0.9181 vs 0.9205) porque el modelo aún discrimina
correctamente en términos de ranking, pero la calibración de probabilidades y los
umbrales se desalinean.

---

## 3. Cambio principal

**Resampleo a cadencia uniforme de 30 s** antes de calcular features.

Con cadencia uniforme:
- `rolling(5)` → siempre 150 s en ambos períodos
- `rolling(10)` → siempre 300 s en ambos períodos
- `plateau_duration` → cuenta en unidades de 30 s, comparables entre períodos

### Implementación

| Archivo | Cambio |
|---|---|
| `fase_2_dataset/scripts/_phase2_utils.py` | Nueva función `resample_to_uniform(df, target_s=30)` + constante `RESAMPLE_TARGET_S=30` |
| `fase_2_dataset/scripts/02_build_features.py` | Llamada a `resample_to_uniform()` entre `remove_subsecond_duplicates` y `compute_segment_features` |

### Qué NO cambia

| Invariante | Valor | Estado |
|---|---|---|
| Las 12 features activas | Sin cambio | ✅ Invariante |
| `GAP_CUTOFF_S` | 300 s | ✅ Invariante |
| `PLATEAU_THRESHOLD` | 1.5 g | ✅ Invariante |
| Split temporal (70/15/15) | Sin cambio | ✅ Invariante |
| `THRESHOLD_A` | 0.20 | ✅ Invariante |
| Fases 1 y 3 | Sin cambio | ✅ Sin modificar |

### Método de resampleo

Forward-fill (step function) por segmento de continuidad. El peso del bowl es
una señal de tipo escalón: no varía entre lecturas salvo por eventos de
alimentación o servido, por lo que propagar el último valor conocido es la
interpolación correcta.

No se rellena a través de gaps > GAP_CUTOFF_S (discontinuidades reales de datos).

---

## 4. Dataset

| Campo | Valor |
|---|---|
| Fuente de readings | Exp 08: Abril + Mayo-Jun (212,011 filas originales) |
| Rango temporal | Apr 8 – Jun 14, 2026 |
| Cadencia mediana post-resampleo | 29.7 s |
| Filas post-resampleo | 134,922 (de 135,174 pre-consolidación, 99.8% retenidas) |
| Segmentos de continuidad | 22 |
| Gaps > 5 min | 21 |
| Sesiones alimentacion | 191 (train) |
| Sesiones servido | 27 (train) |
| Split | 70/15/15 temporal (idéntico a Exp 08) |

### Split temporal

| Split | Filas | Período |
|---|---|---|
| Train | 94,445 | 2026-04-08 → 2026-05-31 |
| Val | 20,238 | 2026-05-31 → 2026-06-07 |
| Test | 20,239 | 2026-06-07 → 2026-06-14 |

### Distribución de clases en train

| Clase | Filas | % |
|---|---|---|
| `reposo` | 92,418 | 97.9% |
| `alimentacion` | 1,901 | 2.0% |
| `servido` | 126 | 0.1% |

### Distribución de clases en val

| Clase | Filas |
|---|---|
| `reposo` | 19,746 |
| `alimentacion` | 452 |
| `servido` | 40 |

### Pesos sugeridos para entrenamiento

| Clase | Peso |
|---|---|
| `alimentacion` | 16.561x |
| `servido` | 249.854x |
| `reposo` | 0.341x |

---

## 5. Resultados

*Ejecutado el 2026-06-14.*

### Modelo A (Binario: activo vs reposo)

| Métrica | Exp 06 | Exp 08 | **Exp 09** | vs Exp 08 |
|---|:---:|:---:|:---:|:---:|
| F1 activo | 0.7619 | 0.6021 | **0.6000** | −0.0021 |
| AUC-ROC | 0.9205 | 0.9181 | **0.9146** | −0.0035 |
| Threshold calibrado | 0.20 | 0.20 | **0.26** | — |
| Precisión | 0.750 | 0.4960 | **0.4947** | — |
| Recall | 0.774 | 0.7658 | **0.7622** | — |
| Accuracy | 0.9905 | — | **0.9753** | — |
| Mejor val loss | — | — | **0.086366** | — |
| Iteraciones entrenadas | — | 17 | **25** | — |
| scale_pos_weight | — | — | **45.593** | — |

#### Matriz de confusión

```
TP = 375   FP = 383
FN = 117   TN = 19,363
```

#### Feature importance top 10 (Modelo A)

| Feature | Importancia |
|---|---:|
| `rolling_std_10` | 2,605,090 |
| `plateau_duration` | 737,304 |
| `hour_sin` | 580,438 |
| `weight_grams` | 451,406 |
| `hour_cos` | 337,972 |
| `rolling_mean_5` | 145,206 |
| `rolling_std_5` | 49,102 |
| `net_weight` | 47,987 |
| `clock_invalid` | 9,834 |
| `delta_w_10` | 1,672 |

### Modelo B (Multiclase: alimentacion / servido / reposo)

| Métrica | Exp 06 | Exp 08 | **Exp 09** | vs Exp 08 |
|---|:---:|:---:|:---:|:---:|
| F1 alimentacion | 0.7606 | 0.5778 | **0.5834** | +0.0056 |
| F1 servido | 0.1395 | 0.2414 | **0.2182** | −0.0232 |
| F1 reposo | — | 0.9884 | **0.9891** | +0.0007 |
| Macro F1 | 0.6312 | 0.6025 | **0.5969** | −0.0056 |
| Weighted F1 | — | — | **0.9785** | — |
| Accuracy | — | — | **0.9788** | — |
| Mejor val loss | — | — | **0.073579** | — |
| Iteraciones entrenadas | — | 179 | **235** | — |
| SMOTE sintéticas (servido) | 84 | — | **252** |  — |
| Servido target count | — | — | **378** | — |
| Weight power | — | — | **0.4** | — |

#### Feature importance top 10 (Modelo B)

| Feature | Importancia |
|---|---:|
| `rolling_std_5` | 321,816 |
| `rolling_std_10` | 163,443 |
| `plateau_duration` | 139,668 |
| `hour_sin` | 120,616 |
| `hour_cos` | 117,109 |
| `weight_grams` | 105,640 |
| `net_weight` | 82,184 |
| `delta_w_10` | 69,563 |
| `rolling_mean_5` | 66,896 |
| `clock_invalid` | 17,876 |

---

## 6. Análisis

La hipótesis principal del Exp 09 **no se cumplió**: el resampleo a 30 s no recuperó el nivel de Exp 06 ni mejoró significativamente sobre Exp 08.

El resampleo a 30 s era condición necesaria pero no suficiente para eliminar el shift. Las causas adicionales identificadas son:

| Factor | Abril (train) | Mayo-Jun (val/test) |
|---|---|---|
| Cadencia mediana | ~14.7 s → 30 s post-resampleo | ~30 s (nativo) |
| clock_invalid True | ~50% | ~100% |
| UUID KPCL0034 | `9510a455…` | `3a460074…` |
| Origen etiquetas | Tiempo real (Supabase) | Retroactivo (app_anotacion) |
| Calidad anotaciones | Alta (operador en tiempo real) | Variable (retroactiva) |

El AUC-ROC se mantiene estable (0.9146) porque el modelo sigue discriminando en ranking, pero la calibración de probabilidades sigue desalineada entre períodos.

El Modelo B muestra una leve mejora en `alimentacion` (+0.0056 vs Exp 08) pero retrocede en `servido` (−0.0232). Con solo 40 ejemplos de `servido` en val, el F1 de esa clase es inestable en cualquier experimento.

**Conclusión:** El shift entre Abril y Mayo-Jun tiene causas más profundas que la cadencia. La normalización a 30 s es correcta como invariante del pipeline, pero no es suficiente para recuperar las métricas de Exp 06.

---

## 7. Pasos ejecutados

```bash
cd "Docs/investigacion/Data Science"

# Fase 1 (sin cambios — artefactos de Exp 08)
# readings_raw.parquet y sessions_labeled.parquet ya existían

# Fase 2 (resampleo aplicado en 02_build_features.py)
python fase_2_dataset/scripts/01_build_labels.py
python fase_2_dataset/scripts/02_build_features.py   # ← resampleo a 30s aplicado aquí
python fase_2_dataset/scripts/03_build_train_dataset.py
python fase_2_dataset/scripts/04_dataset_report.py

# Fase 3
python fase_3_modelos/scripts/01_prepare_datasets.py
python fase_3_modelos/scripts/02_train_modelo_a.py
python fase_3_modelos/scripts/03_train_modelo_b.py
python fase_3_modelos/scripts/04_training_report.py

# Fase 4 (actualización de visualización)
python fase_4_visualizacion/prepare_data.py
```

---

## 8. Decisión

**Exp 06 permanece como modelo de producción.** El resampleo a 30 s queda como invariante del pipeline para todos los experimentos futuros (es la decisión correcta aunque no resolvió el shift por sí sola).

Exp 09 es un experimento diagnóstico que confirma:

1. La cadencia no era el único factor del shift — el origen retroactivo de las etiquetas y el cambio de UUID del dispositivo también contribuyen.
2. Más datos de `servido` siguen siendo el cuello de botella principal.
3. El pipeline normalizado a 30 s está listo para Exp 10 y Exp 11.

**Criterio de habilitación para Exp 10-Claude:**
- Pipeline normalizado a 30 s ✅
- `ANTHROPIC_API_KEY` disponible en `.env.local`
- Objetivo: ≥ 40 sesiones nuevas de `servido` anotadas

---

## Artefactos

| Artefacto | Ubicación |
|---|---|
| `modelo_a.lgb` (Exp 09) | `fase_3_modelos/models/modelo_a/modelo_a.lgb` |
| `modelo_b.lgb` (Exp 09) | `fase_3_modelos/models/modelo_b/modelo_b.lgb` |
| `readings_features.parquet` (30s) | `fase_2_dataset/data/interim/readings_features.parquet` |
| `calibration_isotonic.json` | `fase_3_modelos/models/modelo_a/calibration_isotonic.json` |
| `feature_importance.csv` (A) | `fase_3_modelos/models/modelo_a/feature_importance.csv` |
| `feature_importance.csv` (B) | `fase_3_modelos/models/modelo_b/feature_importance.csv` |
| `training_report.txt` | `fase_3_modelos/outputs/training_report/training_report.txt` |
| `dataset_report.txt` | `fase_2_dataset/outputs/dataset_report/dataset_report.txt` |
| `quality_report.txt` | `fase_1_extraccion/outputs/quality_report/quality_report.txt` |

> ⚠️ **NOTA**: Los artefactos `modelo_a.lgb` y `modelo_b.lgb` han sido sobreescritos por Exp 09.
> Para reproducir Exp 08 se necesita re-correr el pipeline sin el resampleo a 30 s.
> La inferencia de producción sigue usando los modelos de Exp 06 (via Supabase).


---


<!-- ==== fusionado desde A1_exp_09b_threshold_por_periodo.md ==== -->

# Exp 09B — Threshold por Período + Plateau en Segundos + cadencia_s

| Campo | Valor |
|---|---|
| **ID** | Exp 09B |
| **Nombre** | Threshold por período de cadencia · plateau_duration en segundos · feature cadencia_s |
| **Fecha** | 2026-06-14 |
| **Estado** | ✅ Completado |
| **Basado en** | [Exp 09A](A1_EXPERIMENTOS_DETALLE.md) + nueva data Abril y Mayo-Jun |
| **Foco** | Modelo A (binario: activo vs reposo) |

---

## 1. Objetivo

Reentrenar el Modelo A usando **todas las anotaciones disponibles** de ambos
períodos (Abril + Mayo-Jun), y actualizar `app_anotacion.py` para mostrar la
comparación visual entre marcas manuales (ground truth) y lo que el modelo
detectó automáticamente sobre la curva de peso.

El foco es exclusivamente:

> **Detectar actividad vs reposo** — no clasificar alimentacion vs servido.
> El Modelo A binario es la prioridad. El Modelo B queda como referencia secundaria.

---

## 2. Estado de referencia

| Métrica | Exp 06 (producción) | Exp 08 | Exp 09A (completado) |
|---|:---:|:---:|:---:|
| F1 activo | **0.7619** | 0.6021 | 0.6000 |
| AUC-ROC | **0.9205** | 0.9181 | 0.9146 |
| Threshold calibrado | 0.20 | 0.20 | 0.26 |
| Datos train | Apr 8–Apr 20 | Apr 8–May 31 | Apr 8–May 31 (30s) |
| Datos val | Apr 20–Apr 28 | May 31–Jun 7 | May 31–Jun 7 (30s) |
| Sesiones train | 103 alim · 18 serv | 185 alim · 27 serv | 191 alim · 27 serv |

**Diagnóstico clave:** AUC-ROC estable en ~0.91 en todos los experimentos.
El modelo discrimina bien — el problema es el shift de calibración entre
períodos de cadencia diferente (Abril ~14.7s vs Mayo-Jun ~30s).

---

## 3. Fuentes de datos

### Fuente 1 — Anotaciones Abril (audit_events)

```python
# 04_extract_events.py ya las carga desde audit_events.csv del dump
# Cubren: Apr 8 – May 1, 2026
# Etiquetas disponibles: 254 (206 alimentacion + 36 servido + 12 otros)
# Sesiones: 103 alimentacion · 18 servido
```

### Fuente 2 — Anotaciones Mayo-Jun (new_annotations.csv)

```python
# 04_extract_events.py fusiona automáticamente new_annotations.csv
# Cubren: May 25 – Jun 14, 2026
# Resultado del etiquetado retroactivo via app_anotacion.py (Exp 07)
# Sesiones retroactivas: 82 alim · 9 serv (incorporadas en Exp 08)
```

### Fuente combinada que entra a Fase 2

```python
# events_labeled.parquet = audit_events.csv + new_annotations.csv
# Rango total: Apr 8 – Jun 14, 2026
# Sesiones totales disponibles: 185 alim · 27 serv (base Exp 08)
# + sesiones adicionales pendientes de revisión Abril (hasta 128 confirmadas)
```

### Prerequisito antes de ejecutar

```
Estado actual de los datos:
├── audit_events.csv (Abril)        → disponible, usar tal como está
├── new_annotations.csv (Mayo-Jun)  → disponible, usar tal como está
└── Revisión sesiones Abril         → usar lo que hay (109/128 con referencia)
                                       No bloquear Exp 09B por esto
```

> No esperar revisión completa de Abril para arrancar.
> Correr Exp 09B con los datos disponibles hoy y documentar la cobertura real.

---

## 4. Cambios respecto a Exp 09A

### CAMBIO 1 — Threshold separado por período de cadencia

**Prioridad:** Alta — cambio solo de inferencia, sin reentrenar.

**Por qué:** El threshold `0.20` fue calibrado sobre validación de Abril.
Con cadencia ~30s las probabilidades del modelo se desalinean sistemáticamente.
En Exp 09A el threshold óptimo subió a `0.26`, confirmando el desalineamiento.

**Implementación en `02_train_modelo_a.py`:**

```python
import numpy as np
from sklearn.metrics import f1_score

# Después del entrenamiento y calibración isotónica
# Separar val set por período de cadencia
mask_abril   = X_val['ts'] < '2026-05-01'
mask_mayo_jun = X_val['ts'] >= '2026-05-01'

best_threshold_abril    = 0.20  # valor base conocido
best_threshold_mayo_jun = 0.20  # se buscará

best_f1_mayo = 0.0
for threshold in np.arange(0.10, 0.55, 0.02):
    if mask_mayo_jun.sum() > 0:
        f1 = f1_score(
            y_val[mask_mayo_jun],
            (probs_val_calibrated[mask_mayo_jun] >= threshold).astype(int),
            zero_division=0
        )
        if f1 > best_f1_mayo:
            best_f1_mayo = f1
            best_threshold_mayo_jun = round(threshold, 2)

# Guardar ambos thresholds
calibration = {
    "threshold_abril":    best_threshold_abril,
    "threshold_mayo_jun": best_threshold_mayo_jun,
    "f1_abril":           f1_score(y_val[mask_abril],
                              (probs_val_calibrated[mask_abril] >= best_threshold_abril).astype(int),
                              zero_division=0),
    "f1_mayo_jun":        best_f1_mayo,
    "criterio":           "cadencia_mediana_s < 20 → threshold_abril, >= 20 → threshold_mayo_jun"
}

import json
with open("models/modelo_a/calibration_by_period.json", "w") as f:
    json.dump(calibration, f, indent=2)
```

**Artefacto nuevo:** `calibration_by_period.json`

---

### CAMBIO 2 — `plateau_duration` en segundos (no en filas)

**Prioridad:** Alta — feature más distorsionada por el cambio de cadencia.

**Por qué:** Con cadencia 14.7s, 10 filas = 147s de plateau.
Con cadencia 30s, 10 filas = 300s de plateau. El mismo valor numérico
describe fenómenos temporales diferentes — el modelo aprende el contexto
de Abril y falla al generalizar a Mayo-Jun.

**Implementación en `_phase2_utils.py`:**

```python
def compute_segment_features(df: pd.DataFrame) -> pd.DataFrame:
    # Paso 1: contar filas consecutivas en plateau
    plateau_group = (df['is_plateau'] == 0).cumsum()
    df['plateau_duration_rows'] = df.groupby(plateau_group)['is_plateau'].cumsum()

    # Paso 2: calcular delta_t entre lecturas consecutivas (post-resampleo = ~30s)
    df['delta_t_s'] = df['ts'].diff().dt.total_seconds().fillna(RESAMPLE_TARGET_S)
    df['delta_t_s'] = df['delta_t_s'].clip(0, GAP_CUTOFF_S - 1)

    # Paso 3: plateau_duration en segundos
    df['plateau_duration'] = df['plateau_duration_rows'] * df['delta_t_s']

    # Limpiar columna intermedia
    df = df.drop(columns=['plateau_duration_rows', 'delta_t_s'])

    return df
```

**Impacto esperado:** Medio-Alto. Segunda feature más importante en ambos modelos (importancia 737,304 en Exp 09A).

---

### CAMBIO 3 — `cadencia_s` como 13ª feature explícita

**Prioridad:** Media — convierte el shift implícito en información explícita.

**Por qué:** Si el modelo "sabe" la cadencia con la que está trabajando,
puede aprender a interpretar las rolling windows en su contexto temporal real.

**Implementación en `_phase2_utils.py`:**

```python
# Agregar después del resampleo a 30s, antes de calcular rolling features
df['cadencia_s'] = df['ts'].diff().dt.total_seconds()
df['cadencia_s'] = df['cadencia_s'].clip(0, 120).fillna(RESAMPLE_TARGET_S)
# clip a 120s: valores > 120s son gaps reales (> GAP_CUTOFF_S = 300s)
```

**Actualizar lista de features en `01_prepare_datasets.py`:**

```python
FEATURES = [
    'weight_grams', 'delta_w', 'delta_w_10',
    'rolling_std_5', 'rolling_std_10', 'rolling_mean_5',
    'net_weight', 'is_plateau', 'plateau_duration',
    'hour_sin', 'hour_cos', 'clock_invalid',
    'cadencia_s'  # ← nueva feature #13
]
```

> Si no mejora F1 ni AUC en la comparación final, eliminar y revertir a 12 features.

---

### CAMBIO 4 — Train set mixto Abril + Mayo-Jun

**Prioridad:** Alta — palanca más directa contra el shift de distribución.

**Por qué:** El modelo de Exp 06 (producción) solo vio Abril. En inferencia
de Mayo-Jun encuentra una distribución diferente y el threshold se desalinea.
Si el train incluye ejemplos de ambas cadencias, el modelo aprende a generalizar.

**Implementación en `03_build_train_dataset.py`:**

```python
# Split temporal extendido para Exp 09B
TRAIN_END    = '2026-05-31'   # incluye Abril completo + Mayo
VAL_START    = '2026-05-31'
VAL_END      = '2026-06-07'
TEST_START   = '2026-06-07'
TEST_END     = '2026-06-15'   # reservado para Fase 4

# Construcción del train set
df_train = df_features[df_features['ts'] < TRAIN_END].copy()

# Verificar balance de cadencias en train
cadencia_median = df_train.groupby(
    df_train['ts'].dt.to_period('M')
)['cadencia_s'].median()
print("Cadencia mediana por mes en train:")
print(cadencia_median)
```

**Split resultante esperado:**

| Split | Período | Sesiones esperadas |
|---|---|---|
| Train | Apr 8 – May 31 | ~185 alim · ~27 serv |
| Val | May 31 – Jun 7 | ~30-40 alim · ~5 serv |
| Test ★ | Jun 7 – Jun 14 | RESERVADO Fase 4 |

---

### CAMBIO 5 — Revisión de train set Abril (prerequisito blando)

**Prioridad:** Media — mejora calidad del ground truth sin cambiar el pipeline.

```sql
-- Verificar estado actual de anomalías en Abril
SELECT anomaly_type, COUNT(*) as n
FROM public.device_bowl_session_anomalies dsa
JOIN public.devices d ON d.id = dsa.device_id
WHERE d.device_id = 'KPCL0034'
  AND dsa.detected_at >= '2026-04-08'
  AND dsa.detected_at < '2026-05-01'
GROUP BY anomaly_type;
```

> Si anomalías en Abril < 10 casos: proceder sin revisión adicional.
> Si anomalías > 10 casos: correr revisión parcial en app_anotacion antes de Fase 1.

---

## 5. Actualización de `app_anotacion.py`

### Nuevo modo: `"Comparación Modelo A"`

Agregar al selector de modo en `app_anotacion.py`:

```python
modo = st.sidebar.selectbox(
    "Modo de vista",
    [
        "Anotación manual",          # modo original
        "Comparación Modelo A",      # nuevo modo
        "Prep Exp 09 - Abril 2026",  # modo existente
    ]
)
```

### Vista de comparación

Muestra en un gráfico superpuesto:
- **Bandas verdes** — sesiones manuales (ground truth de `audit_events` + `new_annotations.csv`)
- **Bandas naranja** — sesiones detectadas por Modelo A (inferencia con threshold por período)

Métricas calculadas con IoU temporal (solapamiento mínimo 50% para contar como TP):

```python
if modo == "Comparación Modelo A":
    sesiones_manuales = load_sesiones_manuales(device_code='KPCL0034')
    sesiones_modelo = run_modelo_a_inference(
        readings=readings,
        model_path="fase_3_modelos/models/modelo_a/modelo_a.lgb",
        calibration_path="fase_3_modelos/models/modelo_a/calibration_by_period.json"
    )
    matches = compute_session_matches(sesiones_manuales, sesiones_modelo, iou_threshold=0.5)

    tp = matches['true_positive'].sum()
    fp = matches['false_positive'].sum()
    fn = matches['false_negative'].sum()
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
```

Los FP (detectados sin etiqueta manual) pueden confirmarse directamente desde la tabla
con un botón "Confirmar" que escribe en `new_annotations.csv`.

### Función `run_modelo_a_inference`

```python
def run_modelo_a_inference(readings, model_path, calibration_path):
    model = lgb.Booster(model_file=model_path)
    with open(calibration_path) as f:
        cal = json.load(f)

    features_df = compute_segment_features(readings)
    X = features_df[FEATURES].fillna(0)
    probs = model.predict(X)

    # Seleccionar threshold por cadencia
    cadencia_med = readings['ts'].diff().dt.total_seconds().median()
    threshold = (
        cal['threshold_abril'] if cadencia_med < 20
        else cal['threshold_mayo_jun']
    )

    features_df['activo'] = (probs >= threshold).astype(int)

    # Agrupar en sesiones continuas
    sesiones = []
    en_sesion = False
    for _, row in features_df.iterrows():
        if row['activo'] == 1 and not en_sesion:
            en_sesion = True
            inicio = row['ts']
        elif row['activo'] == 0 and en_sesion:
            en_sesion = False
            sesiones.append({'start_at': inicio, 'end_at': row['ts']})
    if en_sesion:
        sesiones.append({'start_at': inicio, 'end_at': features_df['ts'].iloc[-1]})

    return pd.DataFrame(sesiones)
```

### Función `compute_session_matches` (IoU temporal)

```python
def compute_session_matches(ground_truth, detected, iou_threshold=0.5):
    results = []
    det_matched = set()

    for i, gt in ground_truth.iterrows():
        gt_start = pd.Timestamp(gt['session_start_at'])
        gt_end   = pd.Timestamp(gt['session_end_at'])
        best_iou, best_j = 0, None

        for j, det in detected.iterrows():
            overlap = max(0, (min(gt_end, det['end_at']) - max(gt_start, det['start_at'])).total_seconds())
            union   = (max(gt_end, det['end_at']) - min(gt_start, det['start_at'])).total_seconds()
            iou = overlap / union if union > 0 else 0
            if iou > best_iou:
                best_iou, best_j = iou, j

        tipo = 'TP' if best_iou >= iou_threshold else 'FN'
        results.append({'tipo': tipo, 'gt_idx': i, 'det_idx': best_j, 'IoU': round(best_iou, 3), ...})
        if tipo == 'TP':
            det_matched.add(best_j)

    for j, det in detected.iterrows():
        if j not in det_matched:
            results.append({'tipo': 'FP', 'det_idx': j, 'IoU': 0, ...})

    return pd.DataFrame(results)
```

---

## 6. Orden de ejecución

```
Paso 0 — Prerequisitos de datos
├── Verificar anomalías Abril con SQL (ver CAMBIO 5)
├── Confirmar que new_annotations.csv tiene anotaciones May-Jun
└── Si anomalías Abril < 10: proceder sin revisión adicional

Paso 1 — Actualizar app_anotacion.py
├── Agregar modo "Comparación Modelo A"
├── Implementar run_modelo_a_inference()
├── Implementar compute_session_matches()
└── Probar visualmente sobre un día de Abril y uno de Mayo-Jun

Paso 2 — Fase 1 (verificar, sin cambios de script)
├── python 03_extract_readings.py  ← readings Abril + Mayo-Jun
├── python 04_extract_events.py    ← fusiona audit_events + new_annotations
├── python 05_build_sessions.py
└── python 06_quality_report.py   ← verificar: sesiones ≥ 185 alim · ≥ 27 serv

Paso 3 — Fase 2 (cambios Exp 09B)
├── Aplicar CAMBIO 2: plateau_duration en segundos (_phase2_utils.py)
├── Aplicar CAMBIO 3: agregar cadencia_s (_phase2_utils.py)
├── python 01_build_labels.py
├── python 02_build_features.py   ← resampleo 30s + nuevas features
├── python 03_build_train_dataset.py  ← split Apr 8–May 31 / May 31–Jun 7 / Jun 7–Jun 14
└── python 04_dataset_report.py   ← verificar distribución de clases

Paso 4 — Fase 3 (cambios Exp 09B)
├── python 01_prepare_datasets.py
├── python 02_train_modelo_a.py   ← CAMBIO 1: threshold por período
├── python 03_train_modelo_b.py   ← sin cambios principales
└── python 04_training_report.py  ← comparar vs Exp 09A

Paso 5 — Validación en app_anotacion
├── Abrir modo "Comparación Modelo A"
├── Revisar un día de Abril: ¿bandas detectadas coinciden con manuales?
├── Revisar un día de Mayo-Jun: ¿el nuevo threshold mejora la detección?
└── Documentar observaciones visuales
```

---

## 7. Checklist de ejecución

### Prerequisitos
- [ ] `audit_events.csv` disponible con etiquetas Apr 8 – May 1
- [ ] `new_annotations.csv` disponible con etiquetas May 25 – Jun 14
- [ ] Anomalías en Abril verificadas con SQL (< 10 casos para proceder)
- [ ] `lightgbm==4.3.0` instalado en el entorno

### Fase 1
- [ ] `03_extract_readings.py` corre sin errores
- [ ] `04_extract_events.py` fusiona ambas fuentes correctamente
- [ ] `quality_report.txt` muestra ≥ 185 sesiones alimentacion y ≥ 27 servido

### Fase 2
- [ ] `_phase2_utils.py` actualizado con `plateau_duration` en segundos
- [ ] `_phase2_utils.py` actualizado con feature `cadencia_s`
- [ ] `dataset_report.txt` muestra split correcto (train hasta May 31)
- [ ] Distribución de clases en train: `reposo` > 95%, `activo` ~3-5%

### Fase 3
- [ ] `02_train_modelo_a.py` guarda `calibration_by_period.json`
- [ ] F1 activo val (Mayo-Jun) reportado en `training_report.txt`
- [ ] AUC-ROC ≥ 0.90 (no degradar)
- [ ] Comparación vs Exp 09A documentada

### app_anotacion
- [ ] Modo "Comparación Modelo A" visible en sidebar
- [ ] Gráfico superpuesto renderiza sin errores
- [ ] Tabla comparativa muestra TP / FP / FN correctamente
- [ ] Botón "Confirmar" guarda en `new_annotations.csv`

---

## 8. Criterios de éxito

| Métrica | Exp 09A | Meta Exp 09B |
|---|:---:|:---:|
| F1 activo (val Mayo-Jun) | 0.6000 | **≥ 0.68** |
| AUC-ROC (val Mayo-Jun) | 0.9146 | ≥ 0.91 (mantener) |
| F1 activo (val Abril estimado) | ~0.76 | ≥ 0.74 (no degradar) |
| Threshold Abril | 0.26 | ~0.20 (separado por período) |
| Threshold Mayo-Jun | 0.26 | calibrado automáticamente |

> Si F1 activo Mayo-Jun ≥ 0.68 **y** AUC-ROC ≥ 0.91 →
> Exp 09B pasa a ser la nueva referencia para el Modelo A.
>
> Si F1 activo Mayo-Jun ≥ 0.70 → evaluar reemplazar Exp 06 en producción.

---

## 9. Artefactos nuevos que genera Exp 09B

| Artefacto | Ubicación | Descripción |
|---|---|---|
| `calibration_by_period.json` | `fase_3_modelos/models/modelo_a/` | Thresholds separados por cadencia |
| `readings_features_09b.parquet` | `fase_2_dataset/data/interim/` | Features con plateau_duration en segundos + cadencia_s |
| `modelo_a_09b.lgb` | `fase_3_modelos/models/modelo_a/` | Modelo A de Exp 09B |
| `training_report_09b.txt` | `fase_3_modelos/outputs/training_report/` | Comparación Exp 09A vs 09B |

---

## 10. Resultados reales (ejecutado 2026-06-14)

### Modelo A (Binario: activo vs reposo)

| Métrica | Exp 09A | **Exp 09B** | vs 09A |
|---|:---:|:---:|:---:|
| F1 activo | 0.6000 | **0.6000** | = |
| AUC-ROC | 0.9146 | **0.9171** | +0.0025 |
| Threshold calibrado | 0.26 | **0.26** | = |
| Precisión | 0.4947 | **0.4947** | = |
| Recall | 0.7622 | **0.7622** | = |
| Accuracy | 0.9753 | **0.9753** | = |
| Iteraciones entrenadas | 25 | **25** | = |
| Features activas | 12 | **13** (`cadencia_s`) | +1 |

#### Matriz de confusión

```
TP = 375   FP = 383
FN = 117   TN = 19,363
```

#### Feature importance top 10 (Modelo A)

| Feature | Importancia |
|---|---:|
| `rolling_std_10` | 2,605,090 |
| `plateau_duration` | 737,304 |
| `hour_sin` | 580,438 |
| `weight_grams` | 451,406 |
| `hour_cos` | 337,972 |
| `rolling_mean_5` | 145,206 |
| `rolling_std_5` | 49,102 |
| `net_weight` | 47,987 |
| `clock_invalid` | 9,834 |
| `delta_w_10` | 1,672 |

> ⚠️ `cadencia_s` no aparece en el top 10 — importancia baja. Candidata a eliminación en Exp 10.

### Modelo B (Multiclase)

| Métrica | Exp 09A | **Exp 09B** | vs 09A |
|---|:---:|:---:|:---:|
| F1 alimentacion | 0.5834 | **0.5944** | +0.0110 |
| F1 servido | 0.2182 | **0.2264** | +0.0082 |
| F1 reposo | 0.9891 | **0.9895** | +0.0004 |
| Macro F1 | 0.5969 | **0.6034** | +0.0065 |
| Iteraciones entrenadas | 235 | **235** | = |

### Threshold por período (CAMBIO 1)

| Período | n val | Threshold | F1 |
|---|:---:|:---:|:---:|
| Abril (< 2026-05-01) | **0** | 0.26 (valor base) | — |
| Mayo-Jun (≥ 2026-05-01) | 20,238 | **0.26** | 0.6000 |

> **Hallazgo clave:** El val set (May 31 – Jun 7) es 100% Mayo-Jun. No hay datos de Abril en
> validación, por lo que la calibración diferencial de threshold no tiene efecto en este ciclo.
> El threshold para Abril permanece en 0.26 (heredado). Para calibrar el threshold de Abril
> correctamente se necesitaría un val set que incluya datos de Abril.

### Conclusión

| Criterio | Meta | Resultado | Estado |
|---|:---:|:---:|:---:|
| F1 activo Mayo-Jun ≥ 0.68 | 0.68 | 0.6000 | ❌ No alcanzado |
| AUC-ROC ≥ 0.91 | 0.91 | 0.9171 | ✅ Mantenido |
| cadencia_s mejora F1 | sí | No visible en top 10 | ❌ Eliminar en Exp 10 |

**Exp 06 permanece como modelo de producción.** El AUC-ROC mejoró levemente (+0.0025) pero el F1
activo se mantuvo en 0.6000. Los cambios 2 (plateau en segundos) y 4 (train mixto) son
correctos y quedan como invariantes, pero no son suficientes para recuperar el F1 de Exp 06.

**Recomendación para Exp 10:** revertir `cadencia_s` (importancia baja) y enfocar en
mejorar la calidad del ground truth de Mayo-Jun — el problema sigue siendo la distribución
del origen de etiquetas (retroactivo vs tiempo real).

---

## 11. Resumen de cambios

| # | Cambio | Archivo | Impacto | Riesgo | Requiere reentrenar |
|---|---|---|:---:|:---:|:---:|
| 1 | Threshold por período de cadencia | `02_train_modelo_a.py` | Alto | Bajo | No |
| 2 | `plateau_duration` en segundos | `_phase2_utils.py` | Medio-Alto | Medio | Sí (Fase 2+) |
| 3 | `cadencia_s` como feature #13 | `_phase2_utils.py` | Medio | Medio | Sí (Fase 2+) |
| 4 | Train set mixto Abril + Mayo-Jun | `03_build_train_dataset.py` | Alto | Medio | Sí (Fase 2+) |
| 5 | Revisión ground truth Abril | SQL + `app_anotacion.py` | Medio | Bajo | Sí (Fase 1+) |
| 6 | Modo Comparación en app_anotacion | `app_anotacion.py` | — | Bajo | No |


---


<!-- ==== fusionado desde A1_exp_10_nn_colab.md ==== -->

# Exp 10-NN — Redes Neuronales en Colab (4 arquitecturas)

| Campo | Valor |
|---|---|
| **ID** | Exp 10-NN |
| **Nombre** | Benchmark neuronal — 4 arquitecturas con GPU |
| **Fecha** | 2026-06-15 |
| **Estado** | ✅ Completado |
| **Basado en** | Exp 09B (pipeline normalizado a 30 s · 13 features · dataset Apr–Jun) |
| **Prerrequisito** | Exp 09B completado · Acceso a Google Colab Pro con GPU T4/A100 |
| **Archivo Colab** | `exp_10_colab.py` |
| **Ubicación** | `experiments/exp_10_colab/exp_10_colab.py` |
| **Drive Modelo A** | [Carpeta Drive A](https://drive.google.com/drive/folders/1EUTN-rAuZujoS8JXCwqTD0D54dXPkX_I) — `X_train/val + y_train/val` binario |
| **Drive Modelo B** | [Carpeta Drive B](https://drive.google.com/drive/folders/1ZrTtyl8jKxkeWDxx0gT6OMvqj_G1B8UQ) — `X_train/val + y_train/val` multiclase |

---

## Instrucciones para Claude Code (VS Code)

> ✅ **Limpieza ya ejecutada.** Los artefactos de Exp 10-Claude, Exp 11-NN y Exp 12-RT fueron eliminados el 2026-06-14.
> El script `exp_10_colab.py` ya existe en `experiments/exp_10_colab/`.

```bash
# Verificar que la carpeta de resultados existe
ls "Docs/investigacion/Data Science/experiments/exp_10_colab/results/"
```

> Subir `exp_10_colab.py` junto con los parquets de Exp 09B a Google Colab y ejecutar.

---

## 1. Objetivo

Entrenar y comparar **4 arquitecturas de redes neuronales** sobre el dataset normalizado de Exp 09B para evaluar si alguna supera al LightGBM de Exp 06 en producción.

Las 4 arquitecturas compiten en paralelo sobre GPU en Google Colab:

| # | Arquitectura | Tipo | Foco |
|---|---|---|---|
| NN-A | MLP profundo | Tabular feedforward | Baseline neuronal rápido |
| NN-B | GRU bidireccional | Secuencial recurrente | Captura dependencias temporales |
| NN-C | TCN (Temporal Conv Net) | Convolucional temporal | Ventanas largas, eficiente en GPU |
| NN-D | Transformer (pequeño) | Atención | Relaciones no locales entre timesteps |

---

## 2. Estado de referencia

| Métrica | LightGBM Exp 06 (producción) | Meta NN Exp 10 |
|---|:---:|:---:|
| F1 activo (Modelo A) | **0.7619** | ≥ 0.80 |
| AUC-ROC (Modelo A) | **0.9205** | ≥ 0.92 |
| F1 alimentacion (Modelo B) | **0.7606** | ≥ 0.78 |
| F1 servido (Modelo B) | 0.1395 ⚠️ | ≥ 0.40 |
| Macro F1 (Modelo B) | 0.6312 | ≥ 0.70 |

> Criterio de producción: una NN supera al LGBM si gana en ≥ 3 de las 5 métricas.
> Si ninguna supera, LGBM Exp 06 permanece en producción y las NN se documentan como diagnóstico.

---

## 3. Dataset

### Fuente

Dos carpetas separadas en Google Drive (mismo correo que Colab). El script las descarga automáticamente al ejecutar.

| Modelo | Drive ID | Contenido |
|---|---|---|
| **Modelo A** (binario) | `1EUTN-rAuZujoS8JXCwqTD0D54dXPkX_I` | `X_train/val.parquet` + `y_train/val.parquet` — labels: 0=reposo / 1=activo |
| **Modelo B** (multiclase) | `1ZrTtyl8jKxkeWDxx0gT6OMvqj_G1B8UQ` | `X_train/val.parquet` + `y_train/val.parquet` — labels: 0=alim / 1=serv / 2=rep |

> El script detecta automáticamente si los labels de Modelo A son binarios (0/1) o multiclase (0/1/2 → convierte a binario).

Referencia original (Exp 09B):

```
fase_2_dataset/data/train/
  X_train.parquet   → 94,445 filas
  X_val.parquet     → 20,238 filas
  X_test.parquet    → 20,239 filas  ← NO tocar hasta Fase 4
  y_train.parquet
  y_val.parquet
  y_test.parquet
```

### Features activas (13)

```python
FEATURES = [
    'weight_grams', 'delta_w', 'delta_w_10',
    'rolling_std_5', 'rolling_std_10', 'rolling_mean_5',
    'net_weight', 'is_plateau', 'plateau_duration',
    'hour_sin', 'hour_cos', 'clock_invalid',
    'cadencia_s'
]
```

> `cadencia_s` fue añadida en Exp 09B. Si no mejora en las NN tampoco, se elimina en Exp 11.

### Distribución de clases en train

| Clase | Filas | % |
|---|---|---|
| `reposo` | 92,418 | 97.9% |
| `alimentacion` | 1,901 | 2.0% |
| `servido` | 126 | 0.1% |

### SMOTE sobre `servido` (aplicado en Colab antes de entrenar)

- Target: 378 filas de servido (×3)
- Sintéticas: 252
- Train final: 94,697 filas

---

## 4. Las 4 arquitecturas

### NN-A — MLP profundo

**Por qué:** Baseline mínimo. Verifica si la representación tabular plana ya es suficiente.

| Componente | Valor |
|---|---|
| Input | 13 features (flat) |
| Capas ocultas | [256, 128, 64, 32] |
| Activación | ReLU + BatchNorm + Dropout(0.3) |
| Output binario (A) | Linear(32→1) → Sigmoid |
| Output multiclase (B) | Linear(32→3) → Softmax |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=1e-3, weight_decay=1e-4 |
| Scheduler | CosineAnnealingLR T_max=50 |
| Epochs | 100 · early stopping patience=15 |
| Batch size | 512 |

---

### NN-B — GRU bidireccional

**Por qué:** El bowl es una señal temporal. El GRU captura dependencias entre timesteps consecutivos sin requerir features rolling manuales.

| Componente | Valor |
|---|---|
| Ventana de secuencia | 10 timesteps × 13 features = (batch, 10, 13) |
| Step | 1 timestep (sliding window) |
| GRU | hidden=128, layers=2, bidireccional, dropout=0.3 |
| Clasificador | Linear(256→64) → ReLU → Dropout(0.3) → Linear(64→output) |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=5e-4 |
| Scheduler | ReduceLROnPlateau patience=5 factor=0.5 |
| Epochs | 100 · early stopping patience=15 |
| Batch size | 256 |

---

### NN-C — TCN (Temporal Convolutional Network)

**Por qué:** Las conv dilatadas cubren ventanas largas con menos parámetros que el GRU. Más eficiente en GPU que RNN para secuencias moderadas.

| Componente | Valor |
|---|---|
| Ventana de secuencia | 16 timesteps × 13 features |
| Canales conv | [64, 128, 128, 64] |
| Kernel size | 3 |
| Dilaciones | [1, 2, 4, 8] |
| Activación | ReLU + Weight Norm |
| Dropout | 0.2 |
| Clasificador | Linear(64→output) |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=1e-3 |
| Scheduler | OneCycleLR max_lr=1e-2 |
| Epochs | 80 · early stopping patience=12 |
| Batch size | 256 |

---

### NN-D — Transformer (pequeño)

**Por qué:** La atención multi-cabeza puede detectar relaciones entre momentos no contiguos dentro de la ventana (ej: inicio vs fin de un plateau).

| Componente | Valor |
|---|---|
| Ventana de secuencia | 16 timesteps × 13 features |
| Positional encoding | Learnable |
| d_model | 64 |
| n_heads | 4 |
| n_layers | 3 |
| d_ff | 256 |
| Dropout | 0.1 |
| Clasificador | Mean pooling → Linear(64→output) |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=3e-4, weight_decay=1e-4 |
| Scheduler | LinearLR warmup (1 epoch ≈ 740 pasos) → CosineAnnealingWarmRestarts |
| Epochs | 80 · early stopping patience=12 |
| Batch size | 128 |

---

## 5. Métricas de evaluación

Todas las arquitecturas se evalúan con las mismas métricas sobre `X_val`:

### Modelo A (binario: activo vs reposo)

| Métrica | Descripción |
|---|---|
| F1 activo | F1 de la clase positiva con threshold óptimo |
| AUC-ROC | Área bajo la curva ROC |
| Threshold óptimo | Sweep 0.10–0.60 paso 0.02, maximizando F1 |
| Precision / Recall | Con el threshold óptimo |
| Matriz de confusión | TP / FP / FN / TN |

### Modelo B (multiclase)

| Métrica | Descripción |
|---|---|
| Macro F1 | Promedio no ponderado de F1 por clase |
| F1 alimentacion | F1 clase 0 |
| F1 servido | F1 clase 1 |
| F1 reposo | F1 clase 2 |
| Weighted F1 | Promedio ponderado por soporte |

---

## 6. Estructura de resultados

El script genera en `results/` (dentro del directorio de Colab):

```
results/
  # Métricas por arquitectura
  nn_a_results.json            ← history + modelo_a + modelo_b — NN-A MLP
  nn_b_results.json            ← NN-B GRU
  nn_c_results.json            ← NN-C TCN
  nn_d_results.json            ← NN-D Transformer

  # Tablas de comparación
  benchmark_summary.csv        ← tabla comparativa 4 NN vs LGBM Exp 06
  benchmark_report.txt         ← reporte texto con métricas A y B formateadas

  # Curvas de entrenamiento (por arquitectura)
  training_curves_nn_a.png     ← 2×2: A loss / A val / B loss / B val — NN-A
  training_curves_nn_b.png
  training_curves_nn_c.png
  training_curves_nn_d.png

  # Matrices de confusión (por modelo)
  cms_modelo_a.png             ← 2×2 grilla: CM Modelo A para las 4 arquitecturas
  cms_modelo_b.png             ← 2×2 grilla: CM Modelo B para las 4 arquitecturas
  confusion_matrix_best.png    ← CM del mejor en A y del mejor en B (1 plot)

  # Análisis adicional
  roc_curves_modelo_a.png      ← curvas ROC de las 4 NN en un mismo gráfico
  f1_comparison.png            ← barras agrupadas: F1/AUC por métrica y arquitectura

  # Pesos PyTorch (quedan en Colab, no se commitean)
  nn_a_best_a.pt  nn_a_best_b.pt
  nn_b_best_a.pt  nn_b_best_b.pt
  nn_c_best_a.pt  nn_c_best_b.pt
  nn_d_best_a.pt  nn_d_best_b.pt
```

> Solo descargar los `.json`, `.csv`, `.txt` y `.png` para documentar en el repo.
> Los `.pt` quedan en Colab para retomar entrenamiento o llevar a producción en Exp 11.

### Formato de `benchmark_summary.csv`

| Arquitectura | F1_activo | AUC_ROC | F1_alim | F1_servido | Macro_F1 | Threshold | Epochs | Tiempo_s |
|---|---|---|---|---|---|---|---|---|
| LGBM_Exp06 | 0.7619 | 0.9205 | 0.7606 | 0.1395 | 0.6312 | 0.20 | 25 | — |
| NN-A MLP | — | — | — | — | — | — | — | — |
| NN-B GRU | — | — | — | — | — | — | — | — |
| NN-C TCN | — | — | — | — | — | — | — | — |
| NN-D Transformer | — | — | — | — | — | — | — | — |

---

## 7. Orden de ejecución en Colab

```
1. En Colab → Runtime → Change runtime type → GPU (T4 o A100)

2. Subir solo el script al directorio de trabajo de Colab:
   - exp_10_colab.py
   (Los parquets se descargan automáticamente desde Drive)

3. Ejecutar — el script instala dependencias, autentica con Drive,
   descarga los parquets y entrena las 4 arquitecturas:
   !python exp_10_colab.py

4. El script imprimirá el BENCHMARK SUMMARY y la DECISIÓN al finalizar.

5. Descargar de Colab → results/:
   benchmark_summary.csv   benchmark_report.txt
   nn_[a-d]_results.json   training_curves_nn_[a-d].png
   cms_modelo_a.png         cms_modelo_b.png
   roc_curves_modelo_a.png  f1_comparison.png
   confusion_matrix_best.png

6. Copiar al repo local:
   experiments/exp_10_colab/results/
```

> **Drive**: los parquets se descargan en `data_modelo_a/` y `data_modelo_b/` la primera vez.
> En ejecuciones siguientes se saltan si ya existen (no re-descarga).
>
> **AMP activo automáticamente** cuando hay GPU — ~2× más rápido en T4, ~3× en A100.

---

## 8. Criterio de decisión

| Resultado | Acción |
|---|---|
| NN supera LGBM en ≥ 3 métricas | NN candidata a producción → Exp 11 ajusta hiperparámetros de la ganadora |
| NN supera LGBM en 1–2 métricas | NN como ensemble con LGBM → evaluar en Exp 11 |
| Ninguna NN supera LGBM | LGBM Exp 06 permanece en producción · Exp 11 enfocado en más datos |

---

## 9. Artefactos

| Artefacto | Ubicación en el repo |
|---|---|
| `exp_10_colab.py` | `experiments/exp_10_colab/exp_10_colab.py` |
| `benchmark_summary.csv` | `experiments/exp_10_colab/results/` |
| `benchmark_report.txt` | `experiments/exp_10_colab/results/` |
| `nn_[a-d]_results.json` | `experiments/exp_10_colab/results/` |
| `training_curves_nn_[a-d].png` | `experiments/exp_10_colab/results/` |
| `cms_modelo_a.png` · `cms_modelo_b.png` | `experiments/exp_10_colab/results/` |
| `roc_curves_modelo_a.png` | `experiments/exp_10_colab/results/` |
| `f1_comparison.png` | `experiments/exp_10_colab/results/` |
| `confusion_matrix_best.png` | `experiments/exp_10_colab/results/` |

> ⚠️ `X_test.parquet` y `y_test.parquet` NO se usan en Exp 10.
> Quedan reservados para Fase 4 con el modelo ganador final.
>
> Los archivos `.pt` (pesos PyTorch) se generan en Colab pero **no se commitean** al repo.
> Solo subirlos si se decide llevar la NN a producción en Exp 11.

---

## 10. Notas técnicas del script (`exp_10_colab.py`)

| Optimización / Feature | Detalle |
|---|---|
| **Drive API** | `setup_drive()` autentica con `google.colab.auth` y descarga parquets via `googleapiclient` — no requiere gdown ni links públicos |
| **Datos separados A/B** | `load_data_a()` desde `DRIVE_FOLDER_ID_A` · `load_data_b()` desde `DRIVE_FOLDER_ID_B` — datasets independientes por modelo |
| **pos_weight dinámico** | Calculado desde los datos reales de Modelo A (`n_neg / n_pos`) — no hardcodeado |
| **Labels auto-detectados** | `load_data_a()` detecta si y es binario (0/1) o multiclase (0/1/2) y convierte automáticamente |
| **SMOTE solo en B** | Modelo B aplica SMOTE en servido hasta `SMOTE_TARGET=378`; Modelo A no necesita SMOTE (usa pos_weight) |
| **AMP (Mixed Precision)** | `torch.autocast` + `GradScaler` — activo automáticamente en GPU; ~2× en T4, ~3× en A100 |
| **SequenceDataset** | `np.lib.stride_tricks.as_strided` — cero copias de memoria, 5-10× más rápido que loop Python |
| **`_run_task` unificada** | Elimina ~80 líneas de código duplicado entre tarea A y tarea B |
| **Warmup Transformer** | `LinearLR` (1 epoch, start_factor=1e-6) → `SequentialLR` → `CosineAnnealingWarmRestarts` |
| **`build_scheduler()`** | Factory centralizada para cosine / plateau / onecycle / warmrestart |
| **GPU cleanup** | `del model` + `torch.cuda.empty_cache()` entre experimentos |
| **`torch.load` seguro** | `weights_only=True` + `map_location=DEVICE` |
| **ROC curves** | `_get_val_probs_a()` guarda probs del val set → `plot_roc_curves()` genera curvas para las 4 NN |
| **Reportes por modelo** | `cms_modelo_a.png` (2×2 CMs Modelo A) · `cms_modelo_b.png` (2×2 CMs Modelo B) · `f1_comparison.png` (barras agrupadas) |
| **`benchmark_report.txt`** | Reporte texto con tablas de métricas A y B — descargable de Colab |

---

## 11. Resultados

> Ejecutado en Google Colab GPU — 2026-06-15T03:53 UTC.
> GPU usada: T4 (según tiempo de entrenamiento). Datos: `results-20260615T035329Z-3-001/`.

### Modelo A — Clasificador binario (activo vs reposo)

| Arquitectura | F1 activo | AUC-ROC | Threshold | Precision | Recall | Epochs | Tiempo |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **LGBM Exp 06** | **0.7619** | **0.9205** | 0.20 | — | — | 25 | — |
| NN-A MLP | 0.4872 | 0.8969 | 0.60 | 0.3550 | 0.7764 | 16 | 78.4 s |
| NN-B GRU | 0.5203 | 0.9129 | 0.60 | 0.3873 | 0.7927 | 23 | 179.0 s |
| NN-C TCN | **0.6016** | 0.9086 | 0.60 | 0.5014 | 0.7520 | 37 | 335.8 s |
| NN-D Transformer | 0.4948 | 0.8560 | 0.40 | 0.5108 | 0.4797 | 27 | 512.5 s |

### Modelo B — Clasificador multiclase (alim / servido / reposo)

| Arquitectura | Macro F1 | F1 alim | F1 servido | F1 reposo | Epochs |
|---|:---:|:---:|:---:|:---:|:---:|
| **LGBM Exp 06** | **0.6312** | **0.7606** | 0.1395 | — | 25 |
| NN-A MLP | 0.5189 | 0.4728 | 0.1125 | 0.9715 | 21 |
| NN-B GRU | **0.5552** | 0.3613 | **0.3400** | 0.9642 | 24 |
| NN-C TCN | 0.5439 | 0.3305 | 0.3333 | 0.9679 | 26 |
| NN-D Transformer | 0.5492 | 0.3892 | 0.2812 | 0.9772 | 16 |

### Matrices de confusión — Modelo A (mejor: NN-C TCN)

```
NN-C TCN — Modelo A (F1=0.6016, AUC=0.9086, thr=0.60)
             pred_reposo  pred_activo
 real_reposo    19,363        368
 real_activo       122        370
```

### Matrices de confusión — Modelo B (mejor: NN-B GRU)

```
NN-B GRU — Modelo B (Macro F1=0.5552, F1_serv=0.3400)
              pred_alim  pred_serv  pred_rep
 real_alim       375          0        77
 real_serv        11         17        12
 real_rep       1238         43    18,456
```

### Métricas vs meta Exp 10

| Métrica | Meta | Mejor NN | Resultado |
|---|:---:|:---:|:---:|
| F1 activo ≥ 0.80 | ≥ 0.80 | 0.6016 (TCN) | ❌ No alcanzado |
| AUC-ROC ≥ 0.92 | ≥ 0.92 | 0.9129 (GRU) | ❌ No alcanzado |
| F1 alim ≥ 0.78 | ≥ 0.78 | 0.4728 (MLP) | ❌ No alcanzado |
| F1 servido ≥ 0.40 | ≥ 0.40 | 0.3400 (GRU) | ⚠️ Parcial (+0.20 vs LGBM) |
| Macro F1 ≥ 0.70 | ≥ 0.70 | 0.5552 (GRU) | ❌ No alcanzado |

### Decisión final

**Ninguna NN supera a LGBM Exp 06.** LGBM Exp 06 permanece en producción.

Hallazgos clave:

- **F1 activo**: LGBM (0.7619) supera a la mejor NN (TCN 0.6016) por −16 puntos. El MLP tabular plano es insuficiente; GRU y TCN mejoran pero no alcanza. El Transformer es el más débil (AUC=0.856 — el único por debajo de LGBM en AUC).
- **F1 servido**: Las NN muestran una ventaja real aquí. GRU llega a 0.34 (+0.20 sobre LGBM 0.14), TCN a 0.33. El modelo recurrente y convolucional capturan mejor los patrones temporales breves de servido.
- **F1 alimentacion**: Las NN no logran aprender esta clase con el dataset actual. El problema es de datos, no de arquitectura — necesitan más sesiones de alimentación etiquetadas.
- **Threshold óptimo**: Todas las NN convergen en threshold=0.60 (vs 0.20 de LGBM) — señal de que las probabilidades no están calibradas. Calibración isotónica en Exp 11 podría bajar el threshold y mejorar F1.
- **Tiempo**: MLP (78 s) es 6× más rápido que Transformer (512 s) con peor resultado — el Transformer claramente no es adecuado para este tamaño de dataset.

**Acción:**
- Exp 11: ensemble GRU + LGBM para aprovechar la mejora de GRU en servido sin sacrificar F1 activo y alimentacion.
- Alternativamente: más datos etiquetados de alimentacion y servido antes de reentrenar NN.


---


<!-- ==== fusionado desde A1_exp_11_ensemble_gru_lgbm.md ==== -->

# Exp 11 — Reversión `cadencia_s`, revisión retroactiva Mayo-Jun y ensemble GRU+LGBM (Modelo B)

| Campo | Valor |
|---|---|
| **ID** | Exp 11 |
| **Nombre** | Limpieza de features + ampliación de ground truth Mayo-Jun + ensemble servido |
| **Fecha planificada** | A definir (post 2026-06-15) |
| **Estado** | 📋 Planificado — no ejecutado |
| **Basado en** | [Exp 09B](A1_EXPERIMENTOS_DETALLE.md) (pipeline 30s, 13 features) + [Exp 10-NN](A1_EXPERIMENTOS_DETALLE.md) (benchmark NN) + [Exp 07](A1_EXPERIMENTOS_DETALLE.md) (candidatos sin etiquetar) |
| **Modelo en producción** | Exp 06 (sin cambios hasta que Exp 11 demuestre mejora real) |

---

## 0. Resumen ejecutivo

Exp 09A, 09B y 10-NN agotaron las palancas de *feature engineering* y *arquitectura*
para cerrar el gap Abril vs Mayo-Jun: ninguna movió el F1 activo de Mayo-Jun más
allá de 0.60. Lo único que sí mostró señal positiva en esas corridas fue:

1. `cadencia_s` no ayuda (Exp 09B lo recomienda revertir).
2. Más datos de `servido` ayudan cuando aparecen (Exp 08: +9 sesiones → F1 servido +0.10).
3. Una arquitectura recurrente/convolucional (GRU/TCN) captura mejor `servido` que LGBM
   (+0.20 en F1 servido, Exp 10-NN), aunque pierde en `alimentacion` y `F1 activo`.

Exp 11 combina estas tres señales en tres líneas de trabajo de bajo riesgo,
ejecutables sin nueva recolección de hardware:

- **Línea A** — revertir `cadencia_s` (12 features, invariante desde Exp 03).
- **Línea B** — revisar retroactivamente las 155 sesiones candidatas que Exp 07
  detectó en Mayo-Jun (134 alimentación, 6 servido, 15 falsos positivos de Modelo A)
  y fusionarlas a `new_annotations.csv`.
- **Línea C** — ensemble LGBM + GRU para el Modelo B, usando los pesos de
  `nn_b_best_b.pt` (Exp 10) como punto de partida para mejorar `F1 servido` sin
  sacrificar `F1 alimentacion`.

**No se toca** el split temporal (train Apr 8–May 31 / val May 31–Jun 7 / test
Jun 7–Jun 14), `GAP_CUTOFF_S=300`, `PLATEAU_THRESHOLD=1.5g`, `plateau_duration` en
segundos, ni `X_test`/`y_test`.

---

## 1. Qué deja cada experimento anterior (insumos de Exp 11)

| Experimento | Aporte que usa Exp 11 | Decisión que motiva |
|---|---|---|
| Exp 06 | Modelo de producción (F1 activo=0.7619, F1 alim=0.7606, AUC=0.9205) | Referencia a no degradar |
| Exp 07 | 155 sesiones candidatas sin etiquetar en Mayo-Jun (134 alim · 6 serv · 15 FP de A) | Insumo directo de Línea B |
| Exp 08 | Train mixto Abril+Mayo-Jun (185 alim · 27 serv) — invariante desde aquí | Base de dataset de Exp 11 |
| Exp 09A | Resampleo a 30s — invariante | Sin cambios |
| Exp 09B | `plateau_duration` en segundos (✅ mantener) · `cadencia_s` (❌ revertir) · threshold por período (sin efecto, val 100% Mayo-Jun) | Línea A |
| Exp 10-NN | GRU: F1 servido=0.34 (vs 0.14 LGBM) · TCN: F1 activo=0.60 · ninguna NN supera a LGBM en general | Línea C |

---

## 2. Línea A — Revertir `cadencia_s` (volver a 12 features)

**Justificación:** en Exp 09B, `cadencia_s` no aparece en el top 10 de importancia
y el F1 activo no cambió (0.6000 → 0.6000). El README ya marca esto como pendiente:
*"revertir si no mejora"*.

**Cambio concreto en `_phase2_utils.py` / `01_prepare_datasets.py`:**

```python
FEATURES = [
    'weight_grams', 'delta_w', 'delta_w_10',
    'rolling_std_5', 'rolling_std_10', 'rolling_mean_5',
    'net_weight', 'is_plateau', 'plateau_duration',
    'hour_sin', 'hour_cos', 'clock_invalid',
    # 'cadencia_s',  ← eliminada (Exp 11, baja importancia en Exp 09B)
]
```

`plateau_duration` **se mantiene en segundos** (Cambio 2 de Exp 09B sigue siendo
invariante — no se revierte, solo `cadencia_s`).

**Costo:** ninguno adicional — se aplica en la misma corrida de Fase 2 que Línea B,
ya que de todas formas hay que recalcular features con las nuevas anotaciones.

**Riesgo:** bajo. Si el F1 baja, es trivial reincorporar la feature.

---

## 3. Línea B — Revisión retroactiva de los 155 candidatos de Exp 07

### 3.1 Qué hay para revisar

Exp 07 corrió inferencia con los modelos de Exp 06 sobre `readings_rows.csv`
(2026-05-25 → 2026-06-14, sin etiquetas) y agrupó 155 sesiones activas:

| Clase dominante (Modelo B) | Sesiones | Acción en Exp 11 |
|---|---:|---|
| `alimentacion` | 134 | Confirmar/descartar con `app_anotacion.py` → `new_annotations.csv` |
| `servido` | 6 | Confirmar/descartar — prioridad alta, clase más escasa |
| `reposo` (falso positivo de Modelo A) | 15 | Revisar para entender sensibilidad del threshold 0.20 en zonas de transición |

### 3.2 Expectativa realista sobre `servido`

El README fija como meta `≥ 40 sesiones nuevas de servido anotadas`. Las 6
candidatas detectadas por Exp 07 **no alcanzan esa meta por sí solas** — parte
de ellas probablemente ya están incluidas en las +9 retroactivas de Exp 08.

Por eso Línea B se documenta con dos resultados posibles:

| Resultado de la revisión | Siguiente paso |
|---|---|
| Se confirman 3-6 sesiones `servido` netas nuevas | Proceder con Línea C (ensemble) usando el incremento disponible |
| 0-2 sesiones netas nuevas | Línea C sigue siendo válida (usa los pesos GRU ya entrenados en Exp 10), pero documentar explícitamente que el cuello de botella de datos **no se resolvió** y escalar a recolección de hardware nueva como prioridad para Exp 12 |

### 3.3 Revisión secundaria (opcional, bajo costo)

Las **15 sesiones `reposo`-dominante marcadas como activas por Modelo A** son
el mejor material disponible para entender por qué el threshold 0.20
sobre-detecta en Mayo-Jun (hipótesis de Exp 07: "zonas de transición de servido
o reseteo del plato"). Revisarlas con `app_anotacion.py` puede aportar señal
para Línea A/C sin requerir nuevas sesiones `servido`.

### 3.4 Pipeline

```
1. app_anotacion.py → modo revisión de candidatos Exp 07
   - cargar sesiones_detectadas_mayo_junio.csv (Exp 07)
   - para cada sesión: confirmar tipo (alimentacion/servido/ninguna) y ajustar bordes
   - guardar confirmaciones en new_annotations.csv (mismo formato que Exp 08)

2. 04_extract_events.py
   - fusiona audit_events.csv + new_annotations.csv (sin cambios de código, ya soportado desde Exp 08)

3. 05_build_sessions.py / 06_quality_report.py
   - validar: sesiones servido train > 27, sesiones alimentacion train > 185
```

---

## 4. Línea C — Ensemble LGBM + GRU para Modelo B

### 4.1 Justificación

| Métrica (val Exp 10, dataset mixto) | LGBM Exp 06 | GRU (NN-B) | Δ |
|---|:---:|:---:|:---:|
| F1 alimentacion | **0.7606** | 0.3613 | LGBM gana |
| F1 servido | 0.1395 | **0.3400** | GRU gana (+0.20) |
| F1 reposo | — | 0.9642 | similar |
| Macro F1 | 0.6312 | 0.5552 | LGBM gana |

Ningún modelo solo es suficiente. La hipótesis de Exp 11 es que un ensemble
que delegue la decisión `servido` al GRU (donde es fuerte) y el resto a LGBM
(donde es fuerte) puede mejorar Macro F1 y F1 servido sin perder F1 alimentacion.

### 4.2 Estrategia recomendada — blending de probabilidades

```python
# probs_lgbm: (N, 3) -> [alim, serv, rep]
# probs_gru:  (N, 3) -> [alim, serv, rep]  (requiere ventana de 10 timesteps)

# Paso 1: alinear índices (GRU pierde las primeras 9 filas por la ventana)
# Paso 2: blend solo en la columna 'servido', con peso alpha
alpha = 0.6  # peso del GRU para la clase servido — sweep 0.3-0.8 en validación
probs_blend = probs_lgbm.copy()
probs_blend[:, SERVIDO_IDX] = (
    alpha * probs_gru[:, SERVIDO_IDX] + (1 - alpha) * probs_lgbm[:, SERVIDO_IDX]
)
probs_blend = probs_blend / probs_blend.sum(axis=1, keepdims=True)  # renormalizar
y_pred = probs_blend.argmax(axis=1)
```

**Por qué blending y no stacking:** stacking (meta-clasificador) requiere
re-entrenar con CV anidada y añade complejidad para una clase con ~126 filas
de train. El blending con un solo hiperparámetro (`alpha`) es ajustable
directamente sobre `X_val` con un sweep simple, igual que se hizo con los
thresholds en Exp 02-04.

### 4.3 Punto de partida del GRU

- Usar `nn_b_best_b.pt` de Exp 10 como warm-start (pesos guardados en Colab,
  no comiteados — recuperar antes de borrar el entorno de Colab).
- Si Línea B agrega sesiones `servido` nuevas, **reentrenar el GRU** con el
  dataset actualizado (mismo script `exp_10_colab.py`, sección NN-B) antes de
  construir el ensemble — el GRU es el componente más sensible a datos nuevos
  de `servido`.
- Si Línea B no agrega sesiones netas, usar los pesos de Exp 10 sin reentrenar
  y documentar el ensemble como "diagnóstico con datos de Exp 09B".

### 4.4 Riesgo de alineación de ventanas

El GRU usa ventanas de 10 timesteps (`as_strided`, sin padding) → las primeras
9 filas de cada segmento de continuidad no tienen predicción GRU. Para esas
filas, `probs_blend = probs_lgbm` (alpha efectivo = 0). Documentar explícitamente
cuántas filas quedan en este caso (≈ 9 × 22 segmentos ≈ 200 filas de ~20,000 en val).

---

## 5. Modelo A — sin cambios estructurales, solo recálculo

Modelo A no tiene una línea propia en Exp 11. Se reentrena con:

- 12 features (Línea A aplicada).
- Dataset ampliado por Línea B (más sesiones `alimentacion`/`servido` confirmadas
  en Mayo-Jun pueden reducir falsos positivos cerca de zonas de servido,
  indirectamente ayudando a F1 activo).
- `calibration_by_period.json` (Exp 09B) se recalcula, pero se documenta de nuevo
  si el val set sigue siendo 100% Mayo-Jun (en cuyo caso `threshold_abril`
  permanece heredado en 0.20, sin cambios).

**No se espera un salto grande en Modelo A** — el objetivo es no degradar
(F1 activo Mayo-Jun ≥ 0.58, AUC-ROC ≥ 0.91) mientras Líneas A-C atacan Modelo B.

---

## 6. Orden de ejecución

```
Paso 1 — Línea B (datos primero — sin esto, A y C tienen poco que ofrecer)
├── app_anotacion.py: revisar 155 candidatos de Exp 07
│     ├── 134 alimentacion → confirmar/descartar
│     ├── 6 servido → confirmar/descartar (prioridad)
│     └── 15 reposo (FP de A) → revisar, documentar patrón
├── Guardar confirmaciones en new_annotations.csv
└── Re-ejecutar Fase 1: 04_extract_events.py, 05_build_sessions.py, 06_quality_report.py

Paso 2 — Línea A (en paralelo con Fase 2)
├── _phase2_utils.py / 01_prepare_datasets.py: quitar cadencia_s (12 features)
└── plateau_duration se mantiene en segundos

Paso 3 — Fase 2 completa
├── 01_build_labels.py
├── 02_build_features.py   (12 features, 30s, plateau en segundos)
├── 03_build_train_dataset.py  (split sin cambios: Apr8-May31/May31-Jun7/Jun7-Jun14)
└── 04_dataset_report.py   → comparar conteos servido/alimentacion vs Exp 09B

Paso 4 — Fase 3 — Modelo A y B (LGBM)
├── 02_train_modelo_a.py  (12 features, recalibrar)
└── 03_train_modelo_b.py  (12 features, dataset ampliado)

Paso 5 — Línea C (ensemble)
├── Si hubo sesiones servido nuevas → reentrenar GRU (exp_10_colab.py, NN-B)
├── Si no → reusar nn_b_best_b.pt de Exp 10
├── Generar probs_lgbm y probs_gru sobre X_val
├── Sweep de alpha (0.3-0.8, paso 0.1) → elegir alpha óptimo por Macro F1 / F1 servido
└── Documentar matriz de confusión del ensemble vs LGBM solo vs GRU solo

Paso 6 — Reporte
├── 04_training_report.py
└── Completar secciones 8-9 de este documento con resultados reales
```

---

## 7. Métricas objetivo

| Métrica | Exp 06 (prod, Abril) | Exp 09B (val Mayo-Jun) | Mejor NN (Exp 10) | **Meta Exp 11** |
|---|:---:|:---:|:---:|:---:|
| Modelo A — F1 activo | 0.7619 | 0.6000 | 0.6016 (TCN) | ≥ 0.6000 (no degradar) |
| Modelo A — AUC-ROC | 0.9205 | 0.9171 | 0.9129 (GRU) | ≥ 0.9171 (no degradar) |
| Modelo B — F1 alimentacion | 0.7606 | 0.5944 | 0.4728 (MLP) | ≥ 0.5944 (no degradar) |
| Modelo B — F1 servido | 0.1395 | 0.2264 | **0.3400 (GRU)** | **≥ 0.30** (ensemble) |
| Modelo B — Macro F1 | 0.6312 | 0.6034 | 0.5552 (GRU) | ≥ 0.62 |

> Si `F1 servido (ensemble) ≥ 0.30` **y** Macro F1 ≥ Exp 09B sin degradar
> `F1 alimentacion` → el ensemble queda como candidato a reemplazar el Modelo B
> de Exp 06 para el período Mayo-Jun, manteniendo Exp 06 puro para Abril.

---

## 8. Checklist de ejecución

### Línea B — datos
- [ ] `sesiones_detectadas_mayo_junio.csv` (Exp 07) disponible y accesible
- [ ] `app_anotacion.py` soporta modo "revisión de candidatos" (verificar/agregar)
- [ ] 134 candidatos `alimentacion` revisados
- [ ] 6 candidatos `servido` revisados (prioridad)
- [ ] 15 candidatos `reposo`/FP revisados y documentados
- [ ] `new_annotations.csv` actualizado
- [ ] `quality_report.txt` muestra conteos de sesiones actualizados

### Línea A — features
- [ ] `cadencia_s` eliminada de `FEATURES` en `_phase2_utils.py`
- [ ] `plateau_duration` confirmado en segundos (sin cambios)
- [ ] `dataset_report.txt` confirma 12 columnas de features

### Fase 3 — LGBM
- [ ] Modelo A reentrenado, métricas no degradan vs Exp 09B
- [ ] Modelo B reentrenado, métricas no degradan vs Exp 09B

### Línea C — ensemble
- [ ] Pesos GRU de Exp 10 recuperados (`nn_b_best_b.pt`) o reentrenados
- [ ] `probs_lgbm` y `probs_gru` generados sobre `X_val`
- [ ] Sweep de `alpha` documentado (tabla alpha vs F1 servido / Macro F1)
- [ ] Matriz de confusión del ensemble documentada
- [ ] Comparación final: LGBM solo vs GRU solo vs ensemble

### Cierre
- [ ] Sección "9. Resultados" completada con métricas reales
- [ ] Decisión documentada (¿reemplaza a Exp 06 para Mayo-Jun? ¿queda como diagnóstico?)
- [ ] Fila de Exp 11 actualizada en `A1_EXPERIMENTS_README.md` y `A1_EXPERIMENT_TRACKER.md`

---

## 9. Resultados

*Pendiente de ejecución.*

| Métrica | Valor |
|---|---|
| Modelo A — F1 activo | — |
| Modelo A — AUC-ROC | — |
| Modelo B — F1 alimentacion (LGBM) | — |
| Modelo B — F1 servido (LGBM) | — |
| Modelo B — F1 servido (GRU) | — |
| Modelo B — F1 servido (ensemble, alpha=?) | — |
| Modelo B — Macro F1 (ensemble) | — |
| Sesiones `servido` netas nuevas (Línea B) | — |

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Línea B aporta 0-2 sesiones `servido` nuevas (escenario más probable según conteos de Exp 07) | Documentar honestamente; el ensemble (Línea C) sigue siendo válido con datos de Exp 09B/10 |
| Alineación de ventanas GRU (9 filas sin predicción por segmento) | Usar `probs_lgbm` puro en esas filas; cuantificar cuántas son (~1% del val) |
| `app_anotacion.py` no tiene modo "revisión de candidatos" todavía | Construirlo reutilizando el modo "Comparación Modelo A" de Exp 09B (mismo tipo de overlay) |
| Revertir `cadencia_s` requiere recalcular Fase 2 completa | Se hace en la misma corrida que Línea B — sin costo incremental |
| Ensemble mejora val pero no generaliza a test (Jun 7-14, nunca visto) | No tocar `X_test`/`y_test` en Exp 11; reservar para Fase 4 con el modelo ganador final |

---

## 11. Si Exp 11 no cierra la brecha — opciones para Exp 12

Estas opciones quedan **fuera de alcance de Exp 11** pero documentadas como
backlog, en orden de prioridad si Línea B confirma que los datos `servido`
siguen siendo el cuello de botella dominante:

1. **Recolección de hardware nueva** dirigida específicamente a `servido`
   (sesiones cortas, ~160s de duración media) — la palanca de mayor impacto
   histórico (Exp 06: +4 sesiones servido → contexto de +20pts en F1 activo).
2. **Separar modelos por período** (Abril alta cadencia / Mayo-Jun baja cadencia)
   — propuesto en Exp 08 (`Próximos pasos`, opción 3) y nunca probado. El AUC
   estable (~0.91-0.92) en todos los experimentos sugiere que el problema es de
   *calibración por dominio*, no de capacidad discriminativa — dos modelos
   especializados podrían evitar el promedio que penaliza a ambos dominios.
3. **Incluir `light_percent`/`light_lux`** (disponibles desde Mayo-Jun, Exp 07) —
   podrían ayudar a discriminar sesiones nocturnas, pero requieren que Abril
   tenga (o se impute) un valor equivalente para no introducir otra discontinuidad
   entre períodos.

---

## Artefactos esperados

| Artefacto | Ubicación |
|---|---|
| `new_annotations.csv` (actualizado, Línea B) | `Docs/investigacion/Data_2026/Mayo_2026/` |
| `dataset_report.txt` (12 features) | `fase_2_dataset/outputs/dataset_report/` |
| `modelo_a.lgb`, `modelo_b.lgb` (Exp 11) | `fase_3_modelos/models/modelo_a/`, `modelo_b/` |
| `nn_b_best_b.pt` (GRU, reentrenado o de Exp 10) | `experiments/exp_10_colab/results/` → copiar a `fase_3_modelos/models/modelo_b/` |
| `ensemble_alpha_sweep.csv` | `fase_3_modelos/outputs/training_report/` |
| `training_report.txt` (Exp 11) | `fase_3_modelos/outputs/training_report/` |


---
