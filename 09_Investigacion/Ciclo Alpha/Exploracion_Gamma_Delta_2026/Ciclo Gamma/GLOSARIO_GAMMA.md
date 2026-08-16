# Glosario Kittypau ML — Ciclo Gamma (γ)

**Versión:** 1.0
**Fecha:** 2026-06-15
**Aplica a:** Ciclo Gamma (γ). El Ciclo Alpha usa el mismo vocabulario salvo donde se indica `[CORREGIDO EN GAMMA]`.

Referencia principal: [instructivo.md](instructivo.md)

---

## Índice

1. [Dispositivos y datos](#1-dispositivos-y-datos)
2. [Tipos de sesión y etiquetas](#2-tipos-de-sesión-y-etiquetas)
3. [Pipeline de datos](#3-pipeline-de-datos)
4. [Features del modelo](#4-features-del-modelo)
5. [Modelos y evaluación](#5-modelos-y-evaluación)
6. [Constantes del sistema](#6-constantes-del-sistema)
7. [Errores documentados del Ciclo Alpha](#7-errores-documentados-del-ciclo-alpha)
8. [Convenciones de nombres](#8-convenciones-de-nombres)

---

## 1. Dispositivos y datos

**KPCL0034**
Dispositivo food_bowl principal de prueba. Mascota asociada: Bandida. Tiene **dos UUIDs** por un problema de registro en Supabase: uno para el período Abril 2026 y otro para Mayo-Jun 2026 en adelante. Ambos siempre deben incluirse en `KPCL0034_UUIDS`.

**KPCL0035**
Dispositivo secundario. Reporta `battery_level` de forma más consistente. No se usa en el pipeline ML activo de Gamma.

**KPCL0036**
Dispositivo hidratación (water_bowl). Excluido del pipeline ML por error de peso documentado. Ver `07_AUDITORIA_KPCL0036_ERROR_PESO.md`.

**UUID Abril 2026** (`9510a455-b0e9-4932-8be1-03976d31228a`)
Primer UUID de KPCL0034, activo del 8 al 30 de abril de 2026.

**UUID Mayo-Jun 2026** (`3a460074-e7c3-41bf-ae5a-a011445f927a`)
Segundo UUID de KPCL0034, activo desde el 25 de mayo de 2026 en adelante.

**`clock_invalid`**
Flag booleano en `public.readings`. Cuando es `True`, el reloj interno del dispositivo no era confiable y se debe usar `ingested_at` en lugar de `recorded_at`. En el período Mayo-Jun 2026, el 100% de las lecturas tienen `clock_invalid=True`. `[CORREGIDO EN GAMMA]` — ver error α-5.

**`recorded_at`**
Timestamp del reloj del dispositivo. Usar solo cuando `clock_invalid=False`.

**`ingested_at`**
Timestamp del servidor Supabase al momento de recibir la lectura. Usar siempre cuando `clock_invalid=True`.

**Dump**
Exportación CSV local de la tabla `public.readings` desde Supabase. Más confiable que la API para reproducibilidad. Ruta: `Data_2026/<Mes>/`.

---

## 2. Tipos de sesión y etiquetas

**`alimentacion`** (clase 0)
El gato (Bandida) está comiendo. Se detecta por descenso sostenido del peso (≥3g en ≤60s). Inicio: primer punto de descenso; término: estabilización en nuevo plateau. Es la clase más frecuente.

**`servido`** (clase 1)
El operador pone comida en el plato. Se detecta por subida sostenida de peso (≥5g). Es el **cuello de botella** del modelo B. En Alpha solo había 14–27 sesiones etiquetadas; Gamma requiere ≥80 antes de entrenar.

**`reposo`** (clase 2)
El peso está estable, sin consumo ni servido activo. Clase mayoritaria (~95% de lecturas). `rolling_std_5 < PLATEAU_THRESHOLD`.

**`sin_clasificar`**
Etiqueta provisional para sesiones que no quedan claras en la primera revisión. No se usa como clase en entrenamiento — debe resolverse antes de G-01.

**`hidratacion`**
Solo aplica a KPCL0036. Excluida del pipeline ML activo.

**Modelo A**
Clasificador binario: `activo` (alimentacion + servido) vs. `reposo`. Métrica principal: F1 activo.

**Modelo B**
Clasificador multiclase: `alimentacion` / `servido` / `reposo`. Métricas: F1 por clase + Macro F1.

**Sesión**
Bloque temporal continuo de actividad del mismo tipo, delimitado por gaps (≥ `GAP_CUTOFF_S` = 300s) y validado con `MIN_SESSION_S` = 30s y `MIN_CONSUMED_G` = 3.0g.

**`new_annotations_gamma.csv`**
Fuente de verdad de etiquetas del Ciclo Gamma. Creado con `app_anotacion_gamma.py` a partir de los candidatos generados por `modelo_a.lgb` de Exp06 (ver Pre-G / `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`). No mezclar con las anotaciones de Alpha (`new_annotations.csv`).

**Unificación Abril-Mayo-Junio** `[NUEVO EN GAMMA]`
Sub-proceso del Pre-G que combina las lecturas de Abril + Mayo-Jun 2026 en una sola tabla continua (UUID único, UTC normalizado, resampleo a 30s), corre inferencia con el Modelo A de Alpha (Exp06) para generar candidatos de sesión, y los expone a retiquetado humano total en `app_anotacion_gamma.py`. Reemplaza la anotación manual desde cero. Ver `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`.

**`uuid_mapping.json`**
Tabla de equivalencia de UUIDs de KPCL0034 (Abril vs Mayo-Jun) usada en el Paso 4.2 de la unificación, antes de cualquier join o filtro por `device_id`.

**`sesiones_candidatas.csv`**
Salida del Paso 4.7 de la unificación: agrupación en sesiones de las filas con `prob_activo ≥ THRESHOLD_CANDIDATOS_GAMMA` (0.12), generadas por el Modelo A de Exp06 sobre el período unificado. Insumo de `app_anotacion_gamma.py`, no un dataset de entrenamiento.

---

## 3. Pipeline de datos

**Fase 1 — Extracción**
Scripts `g01` a `g06`. Descarga readings de Supabase, aplica correcciones de timezone y UUID, detecta anomalías, construye sesiones y genera quality report. El checkpoint más crítico está en `g06_quality_report.py` (assertion de ≥80 servido).

**Fase 2 — Dataset**
Scripts `g01` a `g04`. Construye las features, aplica resampleo a 30s, split temporal train/val/test. El test set se sella (no se abre hasta G-Final).

**Fase 3 — Modelos**
Scripts `g01` a `g09`. Entrena modelos GBM, clásico, NN y ensemble. Genera reportes comparativos.

**Fase 4 — Anotación**
App Streamlit `app_anotacion_gamma.py`. Fase de recolección de datos que habilita la Fase 3.

**Split temporal**
La única forma válida de dividir el dataset: train / val / test por rangos de fecha, nunca aleatorio. Invariante desde α-01.

**Resampleo a 30s** `[CORREGIDO EN GAMMA]`
Antes de calcular features, todas las lecturas se resamplean a cadencia uniforme de 30 segundos. Corrige la cadencia variable del sensor (14–17s en Alpha). Invariante desde G-01.

**Análisis de distribución por período**
Kolmogorov-Smirnov aplicado a cada feature entre períodos (Abril vs Mayo-Jun vs nuevos). Paso **obligatorio** en `g06_quality_report.py` antes de combinar fuentes en entrenamiento. `[NUEVO EN GAMMA]`.

**`distribucion_por_periodo.json`**
Salida del análisis de distribución. Debe revisarse manualmente antes de ejecutar Fase 2.

**`anomalias_peso.csv`**
Lecturas con valores de peso anómalos (negativos, spikes extremos, NaN). Se revisa manualmente en Fase 1.

**`anomalias_sesiones.csv`**
Sesiones con características anómalas (duración < 30s, consumido_g < 0, etc.).

---

## 4. Features del modelo

Las 13 features del Ciclo Gamma. Definidas en `_gamma_utils.py` como `FEATURES_GAMMA`. El orden importa — no cambiar sin nuevo experimento numerado.

| # | Feature | Tipo | Descripción |
|---|---|---|---|
| 1 | `weight_grams` | Raw | Peso bruto interpolado (≤3 NaN consecutivos) |
| 2 | `delta_w` | Derivada | `w[t] - w[t-1]` — cambio por lectura |
| 3 | `delta_w_10` | Derivada | `w[t] - w[t-10]` — cambio en ventana de 10 lecturas |
| 4 | `rolling_std_5` | Estadístico | Desviación estándar últimas 5 lecturas |
| 5 | `rolling_std_10` | Estadístico | Std últimas 10 lecturas — **feature #1 en importancia en Alpha** |
| 6 | `rolling_mean_5` | Estadístico | Media últimas 5 lecturas |
| 7 | `net_weight` | Derivada | `w - percentil10(w, ventana=60)` — peso neto sobre baseline local |
| 8 | `is_plateau` | Binario | `1 si rolling_std_5 < PLATEAU_THRESHOLD (1.5g)` |
| 9 | `plateau_duration_s` | Temporal | Segundos consecutivos en plateau. `[GAMMA: en segundos]` — Alpha usaba filas |
| 10 | `hour_sin` | Temporal | `sin(2π × hora_Santiago / 24)`. `[GAMMA: hora local]` — Alpha usaba UTC |
| 11 | `hour_cos` | Temporal | `cos(2π × hora_Santiago / 24)`. `[GAMMA: hora local]` |
| 12 | `clock_invalid` | Flag | 0/1 — indica si el timestamp del dispositivo era inválido |
| 13 | `dia_semana_sin` | Temporal | `sin(2π × dia_semana_Santiago / 7)`. **Nueva en Gamma** — captura rutinas semanales |

**Features excluidas de Gamma**

| Feature | Disponible desde | Motivo de exclusión |
|---|---|---|
| `cadencia_s` | α-09B | Importancia baja; resampleo a 30s la vuelve constante. Error α-8. |
| `light_percent`, `light_lux` | Mayo 2026 | Evaluar en G-03 si mejoran F1 |
| `battery_level` | Parcial | No consistente en KPCL0034 |
| `temperature`, `humidity` | Siempre | Correlación baja en Alpha; evaluar en G-03 |

---

## 5. Modelos y evaluación

**GBM (Gradient Boosting Machine)**
Familia de modelos evaluada en G-02: LightGBM, XGBoost, CatBoost, HistGradientBoosting. Son el grupo de referencia principal para Gamma.

**LightGBM**
Modelo del Ciclo Alpha. Rápido, buen manejo de desbalance. Referencia de G-01.

**XGBoost**
Regularización diferente a LGBM. Puede generalizar distinto entre períodos.

**CatBoost**
Mejor con datos pequeños y features categóricas. Manejo nativo de valores faltantes.

**HistGradientBoosting**
Implementación sklearn, sin dependencias extra. Buena calibración por defecto.

**Random Forest / Extra Trees**
Benchmarks ML clásico (G-05). Útiles como sanity check: si superan al GBM, hay sobrefit.

**SVM (kernel RBF)**
Requiere `StandardScaler`. Solo se aplica sobre el set de training; los splits no se tocan.

**MLP**
Feedforward neuronal tabular. Baseline NN en G-06.

**GRU bidireccional**
Red recurrente. En α-10 tuvo el mejor F1 servido de todas las NN (0.34 vs 0.14 LGBM con datos insuficientes). Target de G-06.

**TCN (Temporal Convolutional Network)**
Red convolucional temporal. En α-10 tuvo el mejor F1 activo NN (0.60).

**LSTM**
Red recurrente, más parámetros que GRU. Solo comparar con datos suficientes.

**Transformer**
En α-10 fue el peor con 185 sesiones (sobredimensionado). Solo evaluar en G-07 con ≥500 sesiones.

**TabNet**
Atención sobre features tabulares. Diseñado para datos tabulares clasificados. Nuevo en G-07.

**Ensemble por clase** (estrategia recomendada)
Para `servido`: usar probabilidades del mejor modelo NN. Para `alimentacion`/`reposo`: usar el mejor GBM. Motivado por el patrón observado en α-10 donde GRU ganó en servido pero no en alimentación.

**Threshold tuning**
Ajuste post-entrenamiento del umbral de clasificación. **Nunca usar 0.50** como umbral por defecto en clases desbalanceadas. Usar calibración isotónica + sweeping sobre validación.

**Calibración isotónica**
Técnica para mejorar la confiabilidad de las probabilidades de salida. Mejora la estabilidad del threshold en producción. Invariante desde α-04.

**Optuna**
Librería de optimización bayesiana de hiperparámetros. Se usa en G-04 (≥200 trials por modelo por tarea).

**F1 activo**
Métrica de Modelo A: F1 de la clase `activo` (alimentacion + servido). Referencia Alpha: 0.7619 (α-06).

**F1 servido**
Métrica crítica de Modelo B. Era el cuello de botella en Alpha (0.14–0.50 con 14–27 sesiones). Umbral Gamma: ≥ 0.40.

**Macro F1**
Promedio no ponderado de F1 por clase. Penaliza fuertemente si alguna clase falla.

**Test set bloqueado**
`X_test.parquet` y `y_test.parquet` no pueden cargarse hasta que exista un modelo candidato final (G-08 completado). Bloqueado por convención en `_gamma_phase3_utils.py`. Ver regla 1 del Ciclo Gamma.

---

## 6. Constantes del sistema

Todas definidas en `_gamma_utils.py`. Cambiarlas requiere un nuevo experimento numerado.

| Constante | Valor | Descripción |
|---|---|---|
| `GAP_CUTOFF_S` | 300s | Gap mínimo para delimitar segmento nuevo en la serie |
| `PLATEAU_THRESHOLD` | 1.5g | Umbral de `rolling_std_5` para detectar plateau |
| `RESAMPLE_TARGET_S` | 30s | Cadencia uniforme post-resampleo |
| `BASELINE_WINDOW` | 60 lecturas | Ventana para calcular `net_weight` (percentil 10) |
| `MIN_SESSION_S` | 30s | Duración mínima de sesión válida |
| `GAP_MERGE_S` | 60s | Gap entre activos para fusionar en misma sesión |
| `MIN_CONSUMED_G` | 3.0g | Cambio mínimo de peso para sesión válida |
| `MIN_SERVIDO_SESSIONS` | 80 | Sesiones de servido requeridas antes de G-01 |
| `MIN_ALIM_SESSIONS` | 200 | Sesiones de alimentación requeridas antes de G-01 |
| `MIN_ALIM_FOR_NN` | 300 | Sesiones de alimentación para habilitar G-06 |
| `THRESHOLD_A_INICIAL` | 0.20 | Punto de partida para threshold sweep en Modelo A (producción) |
| `THRESHOLD_CANDIDATOS_GAMMA` | 0.12 | Threshold de `prob_activo` para generar candidatos en el Pre-G (Paso 4.6 de la unificación) — más bajo que producción para maximizar recall |
| `TZ_LOCAL` | `America/Santiago` | Timezone para todos los cálculos temporales |
| `CSV_ENCODING` | `latin1` | Encoding de los dumps CSV de Supabase |

---

## 7. Errores documentados del Ciclo Alpha

Ocho errores críticos corregidos en Gamma. Ver [instructivo.md](instructivo.md) sección 4 para los checkpoints de verificación.

| ID | Error | Impacto observado | Corrección Gamma |
|---|---|---|---|
| **α-1** | `servido` insuficiente (14–27 sesiones) | F1 servido inestable (0.14–0.50); SMOTE como parche | ≥80 sesiones reales antes de G-01 |
| **α-2** | Shift de distribución no diagnosticado pre-entrenamiento | F1 activo cayó 0.76→0.60 en α-08 al unir períodos | Análisis KS obligatorio en Fase 1 |
| **α-3** | `hour_sin/cos` calculados en UTC | Rutinas horarias de Bandida desplazadas 3–4 horas | Siempre `America/Santiago` |
| **α-4** | UUID doble de KPCL0034 sin documentar | Joins rotos y duplicados silenciosos | `KPCL0034_UUIDS` lista explícita con ambos |
| **α-5** | `clock_invalid=True` al 100% sin investigar | Timestamps ligeramente incorrectos en Mayo-Jun | Forzar `ingested_at` cuando pct > 95% |
| **α-6** | Test set nunca evaluado formalmente | Todas las métricas Alpha son de validación, no de test | Test se evalúa exactamente una vez en G-Final |
| **α-7** | Benchmark NN prematuro (α-10) con 185 sesiones | LGBM ganó por defecto; resultado esperado | G-06 solo con ≥300 alim + ≥80 serv |
| **α-8** | `cadencia_s` añadida sin beneficio (α-09B) | Sin impacto en F1; añade ruido | Excluida de Gamma desde G-01 |

---

## 8. Convenciones de nombres

**Prefijos de experimento**
- `α-XX` — Experimento del Ciclo Alpha (solo lectura, referencia histórica)
- `G-XX` — Experimento del Ciclo Gamma (activo)
- `Pre-G` — Preparación de datos (no es experimento de modelo)
- `G-Final` — Evaluación formal del test set

**Prefijos de archivos**
- `g01_`, `g02_`, ... — Scripts del Ciclo Gamma (Python)
- `_gamma_` — Archivos de utilidades compartidas (utils, helpers)
- `exp_01_` ... `exp_10_` — Scripts legacy del Ciclo Alpha (no editar)

**Sufijos de modelo**
- `_a` — Modelo A (binario: activo/reposo)
- `_b` — Modelo B (multiclase: alimentacion/servido/reposo)
- `_gbm` — Variante Gradient Boosting
- `_classical` — Variante ML clásico
- `_nn` — Variante neuronal

**Carpeta `gamma/`**
Todo el código y datos del Ciclo Gamma viven bajo `Data Science/gamma/`. Las carpetas hermanas (`fase_1_extraccion/`, `fase_2_dataset/`, etc. en la raíz de `Data Science/`) pertenecen al Ciclo Alpha y son solo lectura.

---

## Referencias cruzadas

| Documento | Contenido |
|---|---|
| [CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md](CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md) | Runbook operativo del Pre-G: unificación de datos + inferencia con Modelo A de Exp06 + retiquetado total |
| [instructivo.md](instructivo.md) | Guía maestra del Ciclo Gamma (pipeline, errores, reglas) |
| [EXPERIMENT_TRACKER_GAMMA.md](EXPERIMENT_TRACKER_GAMMA.md) | Estado y métricas de cada experimento Gamma |
| [../02_REGLAS_EVENTOS_ALIMENTACION.md](../02_REGLAS_EVENTOS_ALIMENTACION.md) | Taxonomía canónica de eventos (aplica a ambos ciclos) |
| [../03_ML_PREDICCION_ALIMENTACION.md](../03_ML_PREDICCION_ALIMENTACION.md) | Especificación ML original (Ciclo Alpha — referencia) |
| [../01_GUIA_DASHBOARD_KPCL.md](../01_GUIA_DASHBOARD_KPCL.md) | Dashboard para identificar sesiones a anotar |
| [../07_AUDITORIA_KPCL0036_ERROR_PESO.md](../07_AUDITORIA_KPCL0036_ERROR_PESO.md) | Por qué KPCL0036 sigue excluido |
