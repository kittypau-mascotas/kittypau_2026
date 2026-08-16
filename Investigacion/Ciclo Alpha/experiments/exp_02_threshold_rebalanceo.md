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

