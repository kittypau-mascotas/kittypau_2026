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

