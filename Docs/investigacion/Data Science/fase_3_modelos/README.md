# Fase 3 - Entrenamiento de Modelos

Esta fase consume el dataset construido en la Fase 2 para entrenar y comparar dos variantes del modelo de deteccion de comportamiento de `KPCL0034`.

## Objetivo

- `Modelo A`: clasificador binario `activo` vs `reposo`.
- `Modelo B`: clasificador multiclase `alimentacion` / `servido` / `reposo`.
- Generar un reporte comparativo con metricas de validacion y una recomendacion inicial para la Fase 4.

La Fase 3 no debe tocar los artefactos de `fase_1_extraccion/` ni volver a construir el dataset base de la Fase 2.

## Entrada esperada

Usar exclusivamente los archivos generados por `fase_2_dataset/scripts/03_build_train_dataset.py`:

- `Docs/investigacion/Data Science/fase_2_dataset/data/train/X_train.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/X_val.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/y_train.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/y_val.parquet`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/label_encoder.json`
- `Docs/investigacion/Data Science/fase_2_dataset/data/train/dataset_meta.json`

## Estructura esperada

La Fase 3 deberia existir como carpeta independiente:

```text
Docs/investigacion/Data Science/fase_3_modelos/
+-- scripts/
|   +-- 01_prepare_datasets.py
|   +-- 02_train_modelo_a.py
|   +-- 03_train_modelo_b.py
|   `-- 04_training_report.py
+-- models/
|   +-- modelo_a/
|   `-- modelo_b/
`-- outputs/
    `-- training_report/
```

## Contrato de scripts

### `01_prepare_datasets.py`

- Lee los parquets de la Fase 2.
- Prepara dos versiones del dataset.
- Para el `Modelo A`, colapsa `alimentacion` y `servido` en una clase `activo`.
- Para el `Modelo B`, conserva las tres clases originales.

### `02_train_modelo_a.py`

- Entrena el modelo binario con `LightGBM`.
- Usa `early stopping`.
- Usa `scale_pos_weight` o un peso equivalente para mitigar el desbalance.
- Guarda modelo, parametros, historial de entrenamiento e importancia de features.

### `03_train_modelo_b.py`

- Entrena el modelo multiclase con `LightGBM`.
- Usa pesos por clase o por muestra calculados a partir de la Fase 2.
- Guarda modelo, parametros, historial de entrenamiento e importancia de features.

### `04_training_report.py`

- Compara ambos modelos sobre validacion.
- Genera un reporte tecnico con metricas, resumen de clases y recomendacion.
- No debe consumir el test set.

## Salidas esperadas

- `models/modelo_a/modelo_a.lgb`
- `models/modelo_a/modelo_a_params.json`
- `models/modelo_a/training_history.json`
- `models/modelo_a/feature_importance.csv`
- `models/modelo_a/X_train.parquet`
- `models/modelo_a/X_val.parquet`
- `models/modelo_a/y_train.parquet`
- `models/modelo_a/y_val.parquet`
- `models/modelo_a/label_encoder.json`
- `models/modelo_b/modelo_b.lgb`
- `models/modelo_b/modelo_b_params.json`
- `models/modelo_b/training_history.json`
- `models/modelo_b/feature_importance.csv`
- `models/modelo_b/X_train.parquet`
- `models/modelo_b/X_val.parquet`
- `models/modelo_b/y_train.parquet`
- `models/modelo_b/y_val.parquet`
- `models/modelo_b/label_encoder.json`
- `outputs/training_report/training_report.txt`

## Orden recomendado de ejecucion

1. Preparar la estructura de carpetas de la Fase 3.
2. Instalar `LightGBM`.
3. Ejecutar `01_prepare_datasets.py`.
4. Ejecutar `02_train_modelo_a.py`.
5. Ejecutar `03_train_modelo_b.py`.
6. Ejecutar `04_training_report.py`.

## Coherencia con el proyecto

- La Fase 2 ya entrega exactamente las tres etiquetas que necesita el `Modelo B`.
- La variante binaria del `Modelo A` es coherente con el objetivo de lanzar primero una deteccion simple de actividad.
- El `test set` queda reservado para una fase posterior, lo cual mantiene la validacion honesta y evita fuga de informacion.
- Esta fase solo prepara, entrena y reporta usando `train` y `val`.

## Riesgos e incoherencias a vigilar

- `LightGBM` no estaba incluido en `Docs/investigacion/Data Science/requirements.txt`; si no se instala, la Fase 3 no corre.
- En la instruccion original aparece la expresion "metricas por epoca", pero en `LightGBM` lo correcto es hablar de iteraciones o rondas de boosting.
- La carpeta `fase_3_modelos/` no existe hoy en el repo; esta documentacion define el contrato esperado antes de implementar el codigo.
- Cualquier uso del set de test en esta fase rompe la separacion entre entrenamiento y evaluacion final.

## Criterio de cierre

La fase queda lista cuando:

- existen ambos modelos entrenados,
- el reporte comparativo se genera sin errores,
- la validacion se hace solo con `X_val` y `y_val`,
- y el test queda intacto para la Fase 4.
