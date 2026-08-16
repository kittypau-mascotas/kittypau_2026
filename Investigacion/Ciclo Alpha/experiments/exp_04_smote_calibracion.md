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

