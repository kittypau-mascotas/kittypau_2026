# Kittypau ML — Ciclo Gamma (γ)
## Guía Maestra: Nueva Serie de Experimentos

**Versión:** 2.1 (revisada)
**Fecha de creación:** 2026-06-15
**Última actualización:** 2026-06-16 — Pre-G reemplazado por el proceso de unificación + retiquetado descrito en `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`
**Autor:** Mauro Curcuma
**Estado:** Activo — en preparación pre-G-01

---

## Índice

1. [Visión y Diferencias Clave con el Ciclo Alpha](#1-visión-y-diferencias-clave)
2. [Lo que Heredamos del Ciclo Alpha](#2-herencia-del-ciclo-alpha)
3. [Lista Explícita: Qué Copiar y Qué No](#3-lista-explícita-qué-copiar-y-qué-no)
4. [Los 8 Errores Críticos que Gamma Corrige](#4-los-8-errores-críticos-que-gamma-corrige)
5. [Estructura de Carpetas del Ciclo Gamma](#5-estructura-de-carpetas)
6. [Nueva Categorización: Protocolo y Herramientas](#6-nueva-categorización)
7. [Features del Ciclo Gamma (13 definitivas)](#7-features-del-ciclo-gamma)
8. [Marco de Evaluación de Modelos — Diseño Amplio](#8-marco-de-evaluación-de-modelos)
9. [Secuencia de Experimentos Gamma](#9-secuencia-de-experimentos)
10. [Tabla Maestra de Experimentos](#10-tabla-maestra)
11. [Parámetros Globales e Invariantes](#11-parámetros-globales)
12. [Comandos de Ejecución](#12-comandos-de-ejecución)
13. [Reglas del Ciclo Gamma](#13-reglas-del-ciclo-gamma)
14. [Referencias Cruzadas](#14-referencias-cruzadas)

---

## 1. Visión y Diferencias Clave

El Ciclo Gamma es la segunda generación del proyecto Kittypau ML. Parte desde cero
en datos y anotaciones, pero incorpora todos los aprendizajes del Ciclo Alpha
(α-01 a α-10). No es una continuación — es un reinicio estructurado.

### Las tres diferencias fundamentales con Alpha

| Dimensión | Ciclo Alpha | Ciclo Gamma |
|---|---|---|
| **Datos** | Anotaciones acumuladas iterativamente, con errores UTC | **Unificación Abril–Mayo–Junio + retiquetado total asistido por Modelo A de Exp06** (no anotación a ciegas desde cero), hora Santiago, ≥80 servido antes de entrenar |
| **Modelos** | Solo LightGBM (con NN al final como benchmark) | **Evaluación sistemática y paralela**: GBM family, ML Clásico y Deep Learning por fase |
| **Orden** | Entrenar rápido, diagnosticar después | **Diagnosticar primero** (distribución, calidad, anotaciones), entrenar cuando los datos estén listos |

### Ciclos del proyecto

| Ciclo | ID | Período | Estado |
|---|---|---|---|
| **Alpha** | α | 2026-04-26 → 2026-06-15 | ✅ Cerrado — α-01 a α-10 |
| **Beta** | β | Reservado | ⏳ Posible ciclo hardware futuro |
| **Gamma** | γ | 2026-06-15 → TBD | 🟢 Activo |

---

## 2. Herencia del Ciclo Alpha

### 2.1 Lo que funcionó — mantener sin cambios

| Elemento | Por qué mantenerlo |
|---|---|
| **Estructura de pipeline Fase 1→4** | Sólida y reproducible. No cambiar. |
| **Split temporal estricto** | Nunca aleatorio. La única forma correcta para series temporales. |
| **Threshold tuning post-entrenamiento** | Impacto crítico. Default 0.50 nunca usar en clases desbalanceadas. |
| **Calibración isotónica** | Mejora estabilidad del threshold en producción. |
| **Dump CSV local como fuente** | Más confiable que API de Supabase para reproducibilidad. |
| **12 features base** (sin `cadencia_s`) | Robustas desde α-03. `rolling_std_10` y `plateau_duration` top en importancia siempre. |
| **GAP_CUTOFF_S = 300s** | Invariante validada en todos los experimentos. |
| **PLATEAU_THRESHOLD = 1.5g** | Invariante. |
| **Resampleo a 30s** | Necesario para normalizar cadencia entre períodos. |
| **`app_anotacion.py`** | Herramienta funcional. Migrar y mejorar como `app_anotacion_gamma.py`. |
| **Dashboard KPCL (`kpcl_pruebas_eventos.html`)** | Reutilizar para identificar sesiones a anotar. |

### 2.2 Lo que NO funcionó — no repetir

| Error Alpha | Consecuencia documentada | Corrección en Gamma |
|---|---|---|
| UTC en lugar de hora local | Rutinas de Bandida desplazadas 3–4h en `hour_sin`/`hour_cos` | Siempre `America/Santiago` |
| UUID doble sin documentar | Joins rotos al combinar Abril y Mayo-Jun | `KPCL0034_UUIDS` lista explícita |
| `servido` insuficiente antes de entrenar | 14–27 sesiones → SMOTE como parche, F1 servido inestable | ≥80 sesiones reales antes de G-01 |
| Distribución no analizada pre-entrenamiento | Shift no detectado → F1 cayó 0.76→0.60 al unir períodos (α-08) | Paso obligatorio de diagnóstico en Fase 1 |
| `clock_invalid=True` al 100% en Mayo-Jun sin investigar | Usaba `recorded_at` inválido | Siempre `ingested_at` cuando `clock_invalid=True` |
| Test set nunca evaluado formalmente | Todas las métricas de Alpha son de validación, no de generalización real | Evaluar test una única vez al tener modelo candidato |
| NN benchmark prematuro (α-10) | 185 sesiones insuficientes → LGBM gana por defecto | NN solo con ≥300 alim + ≥80 serv |
| `cadencia_s` añadida sin beneficio (α-09B) | Feature sin importancia real, añade ruido | Excluida de Gamma |

---

## 3. Lista Explícita: Qué Copiar y Qué No

Esta sección es la guía de migración. Para cada archivo se indica la acción.

### 3.1 Scripts de Fase 1 → Copiar y Adaptar

Origen: `Data Science/fase_1_extraccion/scripts/`
Destino: `Data Science/gamma/fase_1_extraccion/scripts/`

| Archivo Alpha | Archivo Gamma | Acción | Cambios requeridos |
|---|---|---|---|
| `01_setup_env.py` | `g01_setup_env.py` | Copiar + adaptar | Actualizar rutas a carpeta `gamma/` |
| `02_get_device_uuid.py` | `g02_get_device_uuid.py` | Copiar + adaptar | Agregar ambos UUIDs de KPCL0034; incluir KPCL0035 como comentario |
| `03_extract_readings.py` | `g03_extract_readings.py` | Reescribir sobre la base | Corregir: UTC→Santiago, dual UUID, análisis de distribución, anomalías peso |
| `04_extract_events.py` | `g04_extract_events.py` | Copiar + adaptar | Cambiar ruta anotaciones a `new_annotations_gamma.csv`; agregar merge de Alpha annotations como referencia opcional |
| `05_build_sessions.py` | `g05_build_sessions.py` | Copiar casi sin cambios | Agregar contador de sesiones por período para diagnóstico |
| `06_quality_report.py` | `g06_quality_report.py` | Copiar + adaptar | Añadir reporte de distribución por período; añadir reporte de cadencia por período |
| `_supabase_helpers.py` | `_gamma_utils.py` | Reescribir | Nuevas constantes, dual UUID, RESAMPLE_TARGET_S, TZ_SANTIAGO, FEATURES_GAMMA |

### 3.2 Scripts de Fase 2 → Copiar y Adaptar

Origen: `Data Science/fase_2_dataset/scripts/`
Destino: `Data Science/gamma/fase_2_dataset/scripts/`

| Archivo Alpha | Archivo Gamma | Acción | Cambios requeridos |
|---|---|---|---|
| `01_build_labels.py` | `g01_build_labels.py` | Copiar + adaptar | Actualizar rutas a `gamma/` |
| `02_build_features.py` | `g02_build_features.py` | Reescribir sobre la base | Agregar resampleo 30s; features temporales en hora Santiago; `plateau_duration_s` en segundos; `dia_semana_sin` nueva; remover `cadencia_s` |
| `03_build_train_dataset.py` | `g03_build_train_dataset.py` | Copiar + adaptar | Actualizar fechas de split cuando se tenga nuevo dump |
| `04_dataset_report.py` | `g04_dataset_report.py` | Copiar + adaptar | Añadir tabla de distribución por período en el reporte |
| `_phase2_utils.py` | `_gamma_phase2_utils.py` | Reescribir | Todas las correcciones de timezone, plateau en segundos, resampleo, sin `cadencia_s` |

### 3.3 Scripts de Fase 3 → Reemplazar por Framework Multi-Modelo

Origen: `Data Science/fase_3_modelos/scripts/`
Destino: `Data Science/gamma/fase_3_modelos/scripts/`

| Archivo Alpha | Archivo Gamma | Acción | Cambios requeridos |
|---|---|---|---|
| `01_prepare_datasets.py` | `g01_prepare_datasets.py` | Copiar + adaptar | Actualizar rutas; cargar features Gamma (13) |
| `02_train_modelo_a.py` | `g02_train_modelo_a_gbm.py` | Reescribir | Entrenar LightGBM + XGBoost + CatBoost + HistGBM en paralelo; comparar métricas en un solo reporte |
| `03_train_modelo_b.py` | `g03_train_modelo_b_gbm.py` | Reescribir | Ídem para Modelo B multiclase |
| *(no existía)* | `g04_train_modelo_a_classical.py` | **NUEVO** | RF, ExtraTrees, SVM, LogReg — comparar vs mejor GBM de G-03 |
| *(no existía)* | `g05_train_modelo_b_classical.py` | **NUEVO** | Ídem para Modelo B |
| *(no existía)* | `g06_train_modelo_a_nn.py` | **NUEVO (data-conditional)** | MLP, GRU, TCN — ejecutar solo con ≥300 alim + ≥80 serv |
| *(no existía)* | `g07_train_modelo_b_nn.py` | **NUEVO (data-conditional)** | Ídem para Modelo B; incluir blend por clase |
| *(no existía)* | `g08_ensemble.py` | **NUEVO** | Blend best GBM + best NN; stacking; ensemble servido-específico |
| `04_training_report.py` | `g09_training_report.py` | Reescribir | Comparativa multi-modelo; ranking por métrica; selección automática de mejor modelo por tarea |
| `_phase3_utils.py` | `_gamma_phase3_utils.py` | Reescribir | Funciones de entrenamiento, calibración y evaluación genéricas para cualquier algoritmo |

### 3.4 Herramientas a Reutilizar (migrar con mejoras)

| Herramienta Alpha | Herramienta Gamma | Ubicación Gamma | Mejoras requeridas |
|---|---|---|---|
| `app_anotacion.py` | `app_anotacion_gamma.py` | `gamma/fase_4_anotacion/` | Prioridad servido; barra progreso hasta 80; timestamps en hora Santiago; modo "revisión Alpha" opcional |
| `inferencia_kpcl0034.py` | `inferencia_gamma.py` | `gamma/` | Adaptada a 13 features Gamma y a multi-modelo (cargar el mejor modelo según config) |
| `inferencia_exp07_mayo_junio.py` | Referencia histórica | Solo lectura en `experiments/` | No migrar — referencia de cómo se hizo en Alpha |
| Script dashboard KPCL (`serve_kpcl_dashboard.py`) | Sin cambios | `Investigacion/Dashboard_KPCL/` | Ya funciona; usarlo para identificar candidatos de anotación |
| `abrir_kpcl_dashboard.ps1` | Sin cambios | `Investigacion/Dashboard_KPCL/` | Ya funciona |

### 3.5 Datos Disponibles para Gamma

| Dataset | Ruta | Período | Estado | Uso en Gamma |
|---|---|---|---|---|
| Dump Abril 2026 | `Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/` | Apr 8 – May 1 | ✅ Disponible | Lectura y eventos |
| Dump Mayo-Jun 2026 | `Data_2026/Mayo_2026/readings_rows.csv` | May 25 – Jun 14 | ✅ Disponible | Lectura |
| Dump nuevo (requerido) | A descargar de Supabase | Jun 15 → presente | ⏳ Pendiente | Lectura + eventos más recientes |
| Audit events Alpha | `kittypau_full_07-05-2026_csv/audit_events.csv` | Apr 8 – May 1 | ✅ Disponible | **Referencia opcional** — no importar ciegamente |
| Anotaciones retroactivas Alpha | `fase_4_visualizacion/data/new_annotations.csv` | May 25 – Jun 14 | ✅ Disponible | **Referencia opcional** — revisar antes de incorporar |
| **Anotaciones Gamma (nuevas)** | `gamma/fase_4_anotacion/data/new_annotations_gamma.csv` | Jun 15 → presente | ⏳ Por crear | Fuente de verdad del Ciclo Gamma |
| **Unificado Abril-Mayo-Junio** | `Data_2026/Abril_Mayo_Junio_2026/02_unificado/readings_unificado_30s.parquet` | Abr 8 – Jun 14 (o más reciente si hay dump nuevo) | ⏳ Por generar (Pre-G, Pasos 4.1–4.4) | Insumo único de la inferencia de candidatos y de Fase 2 |

### 3.6 Qué NO Copiar

| Elemento | Motivo |
|---|---|
| Archivos `.parquet` de datos | Se regeneran desde cero con el pipeline Gamma |
| Archivos `.lgb`, `.pt` de modelos | Se reentrenan con nuevas features y datos |
| `training_report.txt`, `quality_report.txt` | Se regeneran con el nuevo pipeline |
| `dataset_meta.json` de Alpha | Metadatos del split antiguo — no aplica |
| `new_annotations.csv` de Alpha directamente | Revisar primero — pueden tener errores de timezone o etiquetado |
| Features en UTC (Alpha) | Todas las features temporales se recalculan con hora Santiago |

---

## 4. Los 8 Errores Críticos que Gamma Corrige

Cada corrección tiene un checkpoint obligatorio en Fase 1.

### Error α-1 — `servido` insuficiente (el problema raíz)

**Alpha:** con 14–27 sesiones de `servido`, SMOTE era un parche. F1 servido era inestable entre 0.14 y 0.50 según el experimento.

**Gamma:** no se ejecuta ningún experimento de entrenamiento hasta tener **≥80 sesiones reales de `servido` etiquetadas** en `new_annotations_gamma.csv`.

```python
# Checkpoint en g06_quality_report.py
MIN_SERVIDO_SESSIONS = 80
sesiones = pd.read_parquet("gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet")
n_servido = len(sesiones[sesiones["session_type"] == "servido"])
assert n_servido >= MIN_SERVIDO_SESSIONS, \
    f"❌ Solo {n_servido} sesiones de servido. Meta: {MIN_SERVIDO_SESSIONS}. Anotar más con app_anotacion_gamma.py"
```

### Error α-2 — Shift de distribución no diagnosticado antes de entrenar

**Alpha:** al unir Abril + Mayo-Jun en α-08, el F1 activo cayó de 0.76 a 0.60 sin diagnóstico previo. Se descubrió el problema después de entrenar.

**Gamma:** paso obligatorio de análisis de distribución (Kolmogorov-Smirnov por feature y por período) antes de cualquier entrenamiento que combine fuentes.

```python
# En g06_quality_report.py — OBLIGATORIO, no opcional
analisis_distribucion_por_periodo(df_all)
# Si detecta shift en features críticas → WARNING + requiere revisión manual antes de continuar
```

### Error α-3 — `hour_sin`/`hour_cos` calculados en UTC

**Alpha:** Bandida come a las 8am Santiago (UTC-4), pero la feature `hour_sin` lo registraba a las 12pm UTC. Las rutinas horarias estaban desplazadas 3–4 horas en el dataset.

**Gamma:**

```python
from zoneinfo import ZoneInfo
TZ_SANTIAGO = ZoneInfo("America/Santiago")

def calcular_features_temporales(df):
    ts_santiago = df["ts_utc"].dt.tz_localize("UTC").dt.tz_convert(TZ_SANTIAGO)
    hour_local  = ts_santiago.dt.hour + ts_santiago.dt.minute / 60.0
    dia         = ts_santiago.dt.dayofweek
    df["hour_sin"]       = np.sin(2 * np.pi * hour_local / 24)
    df["hour_cos"]       = np.cos(2 * np.pi * hour_local / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * dia / 7)  # nueva en Gamma
    return df
```

### Error α-4 — UUID doble de KPCL0034 sin documentar

**Alpha:** KPCL0034 aparece con dos UUIDs distintos:
- Abril 2026: `9510a455-b0e9-4932-8be1-03976d31228a`
- Mayo-Jun 2026: `3a460074-e7c3-41bf-ae5a-a011445f927a`

Esto causó joins rotos y joins duplicados silenciosos al combinar períodos.

**Gamma:** constante explícita en `_gamma_utils.py`:

```python
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
```

Todos los scripts de Fase 1 filtran por esta lista, no por un UUID individual.

### Error α-5 — `clock_invalid=True` al 100% en Mayo-Jun sin investigar

**Alpha:** en Mayo-Jun, el 100% de las lecturas tienen `clock_invalid=True`, pero el script de Fase 1 aplicaba la condición `if clock_invalid: usar ingested_at else: usar recorded_at` sin detectar que el 100% caía en la rama `clock_invalid`. Esto generó timestamps ligeramente incorrectos en algunos casos.

**Gamma:** el script fuerza `ingested_at` sin condición cuando detecta que el período tiene `clock_invalid` al 100%:

```python
# En g03_extract_readings.py
pct_clock_invalid = df["clock_invalid"].mean()
if pct_clock_invalid > 0.95:
    print(f"⚠️  clock_invalid al {pct_clock_invalid*100:.0f}% — forzando ingested_at para TODO el período")
    df["ts_utc"] = pd.to_datetime(df["ingested_at"], utc=True)
else:
    df["ts_utc"] = df.apply(
        lambda r: r["ingested_at"] if r["clock_invalid"] else r["recorded_at"], axis=1
    )
```

### Error α-6 — Test set nunca evaluado formalmente

**Alpha:** `X_test.parquet` existe desde α-01 y nunca fue tocado. Todas las métricas del Ciclo Alpha son de validación, no de generalización real sobre datos no vistos.

**Gamma:** el test set se evalúa exactamente una vez, al final del ciclo, cuando el modelo candidato final esté seleccionado. Antes de ese momento, está bloqueado por convención de código.

```python
# En _gamma_phase3_utils.py
def cargar_test_set():
    raise PermissionError(
        "❌ El test set no puede cargarse antes de G-Final. "
        "Ver regla 1 del Ciclo Gamma."
    )
# Solo se descomenta en el script g_final_evaluacion_test.py
```

### Error α-7 — Benchmark neuronal prematuro (α-10)

**Alpha:** se ejecutaron 4 arquitecturas NN con 185 alim + 27 serv. Con datos tabulares pequeños y clases tan desbalanceadas, LGBM tenía ventaja estructural predecible. El resultado era esperado.

**Gamma:** los experimentos de NN (G-06 en adelante) tienen un prerequisito explícito de datos:
- Modelo A (NN): ≥300 sesiones de alimentación
- Modelo B (NN): ≥80 sesiones de servido + ≥300 de alimentación

Esto significa que G-06 puede ejecutarse solo cuando la base de datos lo permita, no antes.

### Error α-8 — `cadencia_s` añadida sin beneficio claro

**Alpha:** en α-09B se añadió `cadencia_s` como feature #13. No apareció en los top-10 de importancia ni mejoró el F1 en α-09B ni en α-10.

**Gamma:** `cadencia_s` está excluida desde el inicio. El resampleo a 30s hace que la cadencia sea constante, volviéndola redundante. Si se quisiera reincorporar en el futuro, requiere un experimento numerado.

---

## 5. Estructura de Carpetas

```
Data Science/
├── gamma/                                      ← TODO el Ciclo Gamma vive aquí
│   │
│   ├── CICLO_GAMMA_NUEVO_PIPELINE_ML.md        ← este archivo (guía maestra)
│   ├── EXPERIMENT_TRACKER_GAMMA.md             ← tabla maestra de experimentos Gamma
│   ├── GLOSARIO_GAMMA.md                       ← términos actualizados con lecciones Alpha
│   │
│   ├── experiments/                            ← un MD por experimento Gamma
│   │   ├── g01_baseline_limpio.md
│   │   ├── g02_gbm_benchmark.md
│   │   ├── g03_feature_engineering.md
│   │   ├── g04_hyperparameter_optimization.md
│   │   ├── g05_classical_ml_benchmark.md
│   │   └── g06_nn_baseline.md  (data-conditional)
│   │
│   ├── fase_1_extraccion/
│   │   ├── scripts/
│   │   │   ├── g01_setup_env.py
│   │   │   ├── g02_get_device_uuid.py
│   │   │   ├── g03_extract_readings.py       ← mayor revisión
│   │   │   ├── g04_extract_events.py
│   │   │   ├── g05_build_sessions.py
│   │   │   ├── g06_quality_report.py         ← con checkpoints y distribución
│   │   │   └── _gamma_utils.py               ← constantes y UUIDs
│   │   ├── data/
│   │   │   ├── raw/                          ← readings_raw.parquet · events_labeled.parquet · sessions_labeled.parquet
│   │   │   └── processed/
│   │   └── outputs/
│   │       ├── quality_report/
│   │       ├── anomalias_peso.csv
│   │       ├── anomalias_sesiones.csv
│   │       └── distribucion_por_periodo.json  ← NUEVO — shift analysis obligatorio
│   │
│   ├── fase_2_dataset/
│   │   ├── scripts/
│   │   │   ├── g01_build_labels.py
│   │   │   ├── g02_build_features.py         ← resampleo + hora Santiago + dia_semana_sin
│   │   │   ├── g03_build_train_dataset.py
│   │   │   ├── g04_dataset_report.py
│   │   │   └── _gamma_phase2_utils.py        ← fuente canónica de features
│   │   ├── data/
│   │   │   ├── interim/                      ← readings_labeled · readings_features (30s)
│   │   │   └── train/                        ← X/y train·val·test + label_encoder + meta
│   │   └── outputs/dataset_report/
│   │
│   ├── fase_3_modelos/
│   │   ├── scripts/
│   │   │   ├── g01_prepare_datasets.py
│   │   │   ├── g02_train_modelo_a_gbm.py     ← LGBM + XGBoost + CatBoost + HistGBM
│   │   │   ├── g03_train_modelo_b_gbm.py     ← ídem para multiclase
│   │   │   ├── g04_train_modelo_a_classical.py ← RF + ET + SVM + LogReg
│   │   │   ├── g05_train_modelo_b_classical.py ← ídem para multiclase
│   │   │   ├── g06_train_modelo_a_nn.py      ← MLP + GRU + TCN (data-conditional)
│   │   │   ├── g07_train_modelo_b_nn.py      ← ídem + blend por clase
│   │   │   ├── g08_ensemble.py               ← blend best GBM + best NN
│   │   │   ├── g09_training_report.py        ← comparativa multi-modelo
│   │   │   └── _gamma_phase3_utils.py        ← entrenamiento y evaluación genéricos
│   │   ├── models/
│   │   │   ├── gbm/                          ← modelos GBM por familia
│   │   │   ├── classical/                    ← modelos ML clásico
│   │   │   ├── nn/                           ← modelos NN (pesos + arquitectura)
│   │   │   └── ensemble/                     ← modelos ensemble
│   │   └── outputs/training_report/
│   │
│   ├── fase_4_anotacion/
│   │   ├── app_anotacion_gamma.py            ← Streamlit — anotación con prioridad servido
│   │   ├── generar_candidatos_servido.py     ← detecta candidatos de servido no anotados
│   │   ├── COMO_EJECUTAR_GAMMA.md
│   │   └── data/
│   │       ├── new_annotations_gamma.csv     ← FUENTE DE VERDAD del Ciclo Gamma
│   │       └── servido_candidates.csv        ← candidatos para revisar
│   │
│   └── inferencia_gamma.py                   ← inferencia adaptada a multi-modelo Gamma
│
├── experiments/                              ← Ciclo Alpha (solo lectura)
└── fase_*/                                   ← Ciclo Alpha (solo lectura)
```

---

## 6. Nueva Categorización

### 6.1 Por qué re-etiquetar con asistencia de modelo (no anotar a ciegas)

Las anotaciones del Ciclo Alpha tienen tres problemas conocidos:
1. Las sesiones detectadas y anotadas con `app_anotacion.py` en Mayo-Jun usaban timestamps posiblemente sesgados por `clock_invalid` sin la corrección completa.
2. Los criterios de inicio/término de `servido` no estaban tan bien definidos en los primeros backfills (el operador aprendía mientras anotaba).
3. Las sesiones de alimentación del dump de Abril pueden tener bordes ligeramente desplazados porque se anotaron retroactivamente mirando la curva sin precisión de segundos.

Por eso ninguna etiqueta de Alpha se hereda como ground truth. Pero en vez de que el
revisor humano escanee los 3 meses completos a ciegas, el Pre-G de Gamma usa el
**`modelo_a.lgb` de Exp06** (mejor resultado de Alpha) para generar candidatos de
sesión sobre todo el período unificado Abril–Mayo–Junio, y el humano solo clasifica
esos candidatos (alimentacion / servido / hidratación / falso positivo) — ver el
runbook completo en
[`CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`](CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md).
Esto resuelve el mismo problema de fondo (criterios y timestamps inconsistentes) sin
requerir una revisión manual exhaustiva línea por línea de tres meses de datos, y con
la visualización correcta (hora Santiago, no UTC).

### 6.2 Protocolo de Anotación Gamma

#### Criterios de inicio y término (mejorados)

| Sesión | Inicio | Término | Exclusión |
|---|---|---|---|
| `alimentacion` | Primer punto de descenso sostenido (≥3g en ≤60s) | Último punto antes de estabilización en nuevo plateau (rolling_std_5 < 1.5g en ≥3 lecturas) | Si hay subida de peso entre inicio y término → excluir (puede ser servido intercalado) |
| `servido` | Cuando el operador pone comida en el plato (primer punto de subida sostenida ≥5g) | Cuando el peso se estabiliza después de llenar (rolling_std_5 < 1.5g) | No confundir con recuperación de baseline tras descanso |
| `hidratacion` | Ídem a alimentación pero en KPCL0036 | Ídem | KPCL0036 excluido del pipeline ML activo |

#### Reglas operativas para el anotador

1. Siempre mirar la curva en hora **Santiago** — nunca en UTC.
2. Si no queda claro si es `alimentacion` o `servido`: dejar como `sin_clasificar` y revisar después.
3. Cada sesión de `servido` tiene prioridad máxima — es el cuello de botella del modelo.
4. Confirmar que hay ≥2 lecturas dentro de cada ventana antes de cerrar el par.
5. Una sesión con `consumido_g < 0` (el peso subió entre inicio y término) es un error de etiquetado — eliminar.

### 6.3 Herramientas de Anotación Disponibles

| Herramienta | Cuándo usar | Qué hace |
|---|---|---|
| `modelo_a.lgb` + `calibration_isotonic.json` (Exp06) | Pre-anotación (Pre-G, Paso 4.6–4.7) | Genera `prob_activo` sobre los 3 meses unificados con threshold bajo (0.12) y agrupa en `sesiones_candidatas.csv` — ver `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md` |
| `app_anotacion_gamma.py` (`app_anotacion.py` migrado) | Anotación primaria | Visualiza curva en hora Santiago; formulario de anotación sobre los candidatos generados por el modelo; barra de progreso hasta 80 servidos |
| `generar_candidatos_servido.py` | Pre-anotación complementaria | Detecta heurísticamente tramos con subida de peso ≥5g no cubiertos por los candidatos del modelo → exporta `servido_candidates.csv` |
| Dashboard KPCL (`kpcl_pruebas_eventos.html`) | Revisión rápida | Vista operativa del bowl con eventos superpuestos; útil para confirmar visual de sesiones |
| Alpha annotations (`new_annotations.csv` / `audit_events`) | Cross-check final (Paso 4.10) | Comparar con `new_annotations_gamma.csv` solo para detectar y documentar discrepancias; NO importar automáticamente ni calcular métrica de coincidencia |

### 6.4 Meta de Datos Antes de G-01

Estas condiciones deben cumplirse antes de ejecutar el primer experimento:

- [ ] `uuid_mapping.json` creado y aplicado (Paso 4.2 del runbook de unificación)
- [ ] Timestamps de Abril + Mayo-Jun normalizados a UTC (Paso 4.3)
- [ ] `readings_unificado_30s.parquet` generado (Paso 4.4)
- [ ] Inferencia con `modelo_a.lgb` (Exp06) corrida sobre el dataset unificado (Paso 4.6, threshold 0.12)
- [ ] `sesiones_candidatas.csv` generado y exportado a `app_anotacion_gamma.py` (Pasos 4.7–4.8)
- [ ] `app_anotacion_gamma.py` ejecutado y con **≥80 sesiones de `servido`** en `new_annotations_gamma.csv` (Paso 4.9)
- [ ] **≥200 sesiones de `alimentacion`** en total (entre dump Abril + Mayo-Jun + nuevas anotaciones)
- [ ] Cross-check de discrepancias contra `audit_events`/`new_annotations.csv` de Alpha documentado (Paso 4.10)
- [ ] `distribucion_clases_gamma.txt` revisado sin assertion errors (Paso 4.11)

---

## 7. Features del Ciclo Gamma

Las 13 features del Ciclo Gamma son un refinamiento de las 12 de Alpha.
`cadencia_s` se excluye. Se añade `dia_semana_sin`. Todas las temporales en hora local.

| # | Feature | Fórmula / Fuente | Cambio vs Alpha | Invariante desde |
|---|---|---|---|---|
| 1 | `weight_grams` | Peso bruto (interpolado, ≤3 NaN consecutivos) | Sin cambio | α-01 |
| 2 | `delta_w` | `w[t] - w[t-1]` | Sin cambio | α-01 |
| 3 | `delta_w_10` | `w[t] - w[t-10]` | Sin cambio | α-03 |
| 4 | `rolling_std_5` | Std últimas 5 lecturas | Sin cambio | α-01 |
| 5 | `rolling_std_10` | Std últimas 10 lecturas (feature #1 en importancia) | Sin cambio | α-01 |
| 6 | `rolling_mean_5` | Media últimas 5 lecturas | Sin cambio | α-01 |
| 7 | `net_weight` | `w - percentil10(w, ventana=60)` | Sin cambio | α-03 |
| 8 | `is_plateau` | `1 si rolling_std_5 < 1.5g` | Sin cambio | α-03 |
| 9 | `plateau_duration_s` | Segundos consecutivos en plateau (×30 con resampleo) | **GAMMA: en segundos** (Alpha usaba filas) | γ-G01 |
| 10 | `hour_sin` | `sin(2π × hour_Santiago / 24)` | **GAMMA: hora Santiago** (Alpha usaba UTC) | γ-G01 |
| 11 | `hour_cos` | `cos(2π × hour_Santiago / 24)` | **GAMMA: hora Santiago** | γ-G01 |
| 12 | `clock_invalid` | Flag de reloj inválido (0/1) | Sin cambio | α-01 |
| 13 | `dia_semana_sin` | `sin(2π × dayofweek_Santiago / 7)` | **NUEVA en Gamma** — captura rutinas semanales | γ-G01 |

Features disponibles pero NO en Gamma todavía:

| Feature | Disponible desde | Motivo de exclusión |
|---|---|---|
| `light_percent`, `light_lux` | Mayo 2026 | Evaluar en G-03 si mejoran F1 |
| `battery_level` | Parcial (KPCL0035 reporta) | No consistente en KPCL0034 |
| `cadencia_s` | α-09B | Importancia baja, excluida (error α-8) |
| `temperature`, `humidity` | Siempre | Correlación baja en Alpha; evaluar en G-03 |

---

## 8. Marco de Evaluación de Modelos

Esta es la diferencia más importante del Ciclo Gamma. En lugar de un único algoritmo,
se evalúan sistemáticamente cuatro grupos de modelos en fases separadas.

### Filosofía de evaluación

- Cada grupo se evalúa sobre los **mismos splits y features** para comparación justa.
- El mejor modelo de cada grupo se registra en `EXPERIMENT_TRACKER_GAMMA.md`.
- La selección del modelo de producción se hace una vez al final, no incrementalmente.
- Las métricas de referencia son las de Alpha-06 (F1 activo=0.7619, F1 alim=0.7606).

### 8.1 Grupo A — Gradient Boosting (GBM)

Ejecutar en paralelo en el mismo script (`g02_train_modelo_a_gbm.py`).

| Modelo | Librería | Fortalezas en este problema |
|---|---|---|
| **LightGBM** | `lightgbm` | Rápido, probado en Alpha, buen manejo de desbalance |
| **XGBoost** | `xgboost` | Regularización diferente, puede generalizar distinto entre períodos |
| **CatBoost** | `catboost` | Mejor con features categóricas y datos pequeños; manejo nativo de NA |
| **HistGradientBoosting** | `sklearn` | Sin dependencias extra, reproducible, buena calibración |

Parámetros de búsqueda sugeridos (Optuna sweep en G-04):

```python
# Para cada GBM — sweep en validación
param_grid = {
    "lightgbm": {"n_estimators": [100,300,500], "num_leaves": [31,63,127], "learning_rate": [0.01,0.03,0.05]},
    "xgboost": {"n_estimators": [100,300,500], "max_depth": [4,6,8], "learning_rate": [0.01,0.03,0.05]},
    "catboost": {"iterations": [100,300,500], "depth": [4,6,8], "learning_rate": [0.01,0.03,0.05]},
}
```

### 8.2 Grupo B — ML Clásico

Ejecutar en paralelo en `g04_train_modelo_a_classical.py`. Sirven como upper bound de simplicidad y como sanity check.

| Modelo | Librería | Cuándo puede ganar |
|---|---|---|
| **Random Forest** | `sklearn` | Buena calibración, resistente a outliers de peso |
| **Extra Trees** | `sklearn` | Más rápido que RF, útil con features ruidosas |
| **SVM (kernel RBF)** | `sklearn` | Puede capturar fronteras no lineales con pocos datos |
| **Logistic Regression** | `sklearn` | Sanity check: si supera a LGBM, hay sobrefit en el GBM |

Nota: SVM requiere normalización de features (`StandardScaler`). Aplicar solo sobre el set de training antes de pasar a SVM, sin tocar los splits.

### 8.3 Grupo C — Deep Learning (data-conditional)

Solo ejecutar cuando se cumplan: **≥300 sesiones de alimentación** + **≥80 sesiones de servido**.
Ejecutar en Google Colab Pro con GPU (T4 o A100).

| Modelo | Tipo | Por qué incluir | Referencia Alpha |
|---|---|---|---|
| **MLP profundo** | Feedforward tabular | Baseline neuronal; rápido de entrenar | NN-A en α-10 |
| **GRU bidireccional** | Recurrente | Mejor F1 servido en α-10 (0.34 vs 0.14 LGBM); captura señal temporal de llenado | NN-B en α-10 |
| **TCN** (Temporal Conv Net) | Convolucional temporal | Mejor F1 activo NN en α-10 (0.60); ventanas largas eficientes | NN-C en α-10 |
| **LSTM** | Recurrente | Variante de GRU, más parámetros; comparar vs GRU con más datos | Nuevo en Gamma |
| **Transformer ligero** | Atención | Útil cuando hay muchas features y contexto largo; en α-10 fue el peor (sobredimensionado) | NN-D en α-10 — probar solo con ≥500 sesiones |
| **TabNet** | Tabular-específico | Atención sobre features tabulares; diseñado para este tipo de problema | Nuevo en Gamma |

Nota importante de Alpha: el Transformer fue el peor en α-10 con 185 sesiones. Solo incorporar en Gamma si el dataset supera las 500 sesiones de alimentación.

### 8.4 Grupo D — Ensemble

Solo ejecutar después de tener el mejor modelo de cada grupo anterior.

| Estrategia | Descripción | Cuándo usar |
|---|---|---|
| **Blend de probabilidades** | `p_final = α×p_GBM + (1-α)×p_NN` con sweep de α | Cuando GBM y NN tienen fortalezas complementarias |
| **Stacking** | Metaclasificador (LogReg o RF pequeño) entrenado sobre predicciones de G1+G2+G3 | Cuando los tres grupos tienen F1 ≥ 0.65 en sus métricas principales |
| **Ensemble por clase** (recomendado) | Para `servido`: usar probabilidades del mejor modelo de G-C (ej. GRU). Para `alimentacion`/`reposo`: usar el mejor GBM. | Si GRU gana en `servido` pero pierde en `alimentacion` — exactamente el patrón de Alpha |

El ensemble por clase es la estrategia más prometedora dado el aprendizaje de α-10:

```python
def predecir_con_ensemble_por_clase(X, gbm_model, gru_model, alpha_servido=0.7):
    """
    Combina GBM (mejor en alimentacion/reposo) con GRU (mejor en servido).
    alpha_servido: peso del GRU en la clase servido (sweep 0.3–0.8).
    """
    p_gbm = gbm_model.predict_proba(X)   # shape (N, 3)
    p_gru = gru_model.predict_proba(X)   # shape (N, 3)

    IDX_SERVIDO = 1  # encoding: alimentacion=0, servido=1, reposo=2

    p_blend = p_gbm.copy()
    p_blend[:, IDX_SERVIDO] = (
        alpha_servido * p_gru[:, IDX_SERVIDO] +
        (1 - alpha_servido) * p_gbm[:, IDX_SERVIDO]
    )
    return p_blend.argmax(axis=1)
```

---

## 9. Secuencia de Experimentos Gamma

Los experimentos Gamma se organizan en cuatro fases. Las fases C y D son
data-conditional (solo ejecutar cuando los prerequisitos de datos se cumplan).

### Pre-G: Unificación de Datos + Retiquetado Total

**No es un experimento numerado — es el prerequisito de todos. Runbook completo:**
[`CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`](CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md).
**Implementación (specs .py en .md):**
[`fase_1_extraccion/scripts/`](fase_1_extraccion/scripts/) — `g01` a `g10`.

| Tarea | Script | Meta |
|---|---|---|
| Setup + verificación de entorno | `g01_setup_env.md` | Carpetas creadas, artefactos de Exp06 accesibles |
| UUID mapping (Paso 4.2) | `g02_uuid_mapping.md` | `uuid_mapping.json` |
| Unificar Abril+Mayo-Jun (UUID + timezone, Pasos 4.1+4.3) | `g03_unify_readings.md` | `readings_unificado_utc.parquet` |
| Resampleo a 30s (Paso 4.4) | `g04_resample_30s.md` | `readings_unificado_30s.parquet` |
| 12 features esquema Exp06 (Paso 4.5) | `g05_compute_features_12.md` | `X_inferencia_3meses.parquet` |
| Inferencia con `modelo_a.lgb` (Exp06), threshold 0.12 (Paso 4.6) | `g06_inferencia_modelo_a.md` | `candidatos_actividad.csv` |
| Agrupación en sesiones candidatas (Paso 4.7) | `g07_build_sesiones_candidatas.md` | `sesiones_candidatas.csv` revisable manualmente |
| Exportar a `app_anotacion.py` (Paso 4.8) | `g08_export_anotacion.md` | `sesiones_candidatas_anotacion.json` |
| Retiquetado manual (Paso 4.9 — humano) | `app_anotacion.py` (Ciclo Alpha) | **≥80 sesiones de servido** en `new_annotations_gamma.csv` |
| Build sessions + cross-check Alpha (Paso 4.10) | `g09_build_sessions_labeled.md` | `sessions_labeled.parquet`, discrepancias documentadas sin fusionar |
| Checkpoint final + distribución de clases (Paso 4.11) | `g10_quality_report.md` | `distribucion_clases_gamma.txt`, sin assertion errors |

---

### Fase A: Baseline Limpio + GBM Benchmark

**G-01 — Baseline Gamma Limpio**

| Campo | Detalle |
|---|---|
| Prerequisito | Pre-G completo (≥80 servido, ≥200 alimentación) |
| Modelo | LightGBM (igual que Alpha, pero con todas las correcciones) |
| Objetivo | Establecer la nueva referencia de partida con datos y features correctas |
| Meta | F1 activo ≥ 0.75, F1 alim ≥ 0.72, F1 servido ≥ 0.30 |
| Qué mide | El impacto puro de las correcciones de Alpha (timezone, UUIDs, resampleo, más servido) |
| Artefactos | `gamma/fase_3_modelos/models/gbm/g01_lgbm_a.lgb` + `g01_lgbm_b.lgb` |

**G-02 — GBM Benchmark Completo**

| Campo | Detalle |
|---|---|
| Prerequisito | G-01 completado |
| Modelos | LightGBM + XGBoost + CatBoost + HistGBM — todos en paralelo |
| Objetivo | Encontrar el mejor algoritmo GBM para este problema con datos Gamma |
| Meta | Identificar el GBM que maximiza: F1 activo (Modelo A) + F1 alim (Modelo B) + F1 servido (Modelo B) |
| Qué cambia vs G-01 | Agrega 3 competidores GBM; mismos datos, mismas features |
| Artefactos | 4 modelos por tarea (A y B) + reporte comparativo `gbm_benchmark_report.csv` |

---

### Fase B: Feature Engineering + ML Clásico

**G-03 — Feature Engineering Avanzado**

| Campo | Detalle |
|---|---|
| Prerequisito | G-02 completado |
| Modelos | Mejor GBM de G-02 (comparación baseline) |
| Features nuevas a evaluar | `light_percent`, `light_lux` (Mayo 2026+), `temperature`, `humidity`, `rolling_std_30` (ventana larga) |
| Objetivo | Identificar si features adicionales mejoran el mejor GBM de G-02 |
| Método | Ablation study: G-02_best + {cada feature nueva}, medir delta de F1 |
| Artefactos | `feature_importance_extended.csv` + reporte de ablation |

**G-04 — Hyperparameter Optimization (Optuna)**

| Campo | Detalle |
|---|---|
| Prerequisito | G-03 completado (features finales definidas) |
| Modelos | Mejor GBM con mejores features |
| Objetivo | Encontrar hiperparámetros óptimos con búsqueda bayesiana |
| Herramienta | Optuna (≥200 trials por modelo por tarea) |
| Qué es invariante | Features, splits, threshold tuning |
| Artefactos | `optuna_study_a.pkl` + `optuna_study_b.pkl` + mejores params |

**G-05 — ML Clásico Benchmark**

| Campo | Detalle |
|---|---|
| Prerequisito | G-04 completado (GBM optimizado como referencia) |
| Modelos | RF, ExtraTrees, SVM (RBF), LogReg — todos vs mejor GBM de G-04 |
| Objetivo | Determinar si algún modelo clásico compite con el GBM optimizado |
| Meta | Si alguno supera al GBM en F1 servido → incorporar en ensemble |
| Artefactos | `classical_benchmark_report.csv` + modelos serializados |

---

### Fase C: Deep Learning (Data-Conditional)

**Prerequisito global Fase C: ≥300 sesiones alimentación + ≥80 sesiones servido**

**G-06 — NN Baseline (MLP + GRU + TCN)**

| Campo | Detalle |
|---|---|
| Prerequisito | G-05 + ≥300 alim + ≥80 serv |
| Modelos | MLP, GRU bidireccional, TCN — los 3 en Colab Pro (GPU T4) |
| Input | Secuencias de longitud fija (ventana de 60 timesteps × 13 features) |
| Objetivo | Determinar si las NN superan al mejor GBM de G-04 con más datos |
| Métrica crítica | F1 servido (Modelo B) — la clase que GBM no resuelve bien |
| Artefactos | 3 modelos × 2 tareas + `nn_baseline_report.csv` |

**G-07 — NN Avanzado (LSTM + TabNet)**

| Campo | Detalle |
|---|---|
| Prerequisito | G-06 completado + alguna NN mostró F1 > GBM en ≥1 métrica |
| Modelos | LSTM, TabNet, y Transformer solo si ≥500 sesiones alim |
| Objetivo | Explorar si arquitecturas alternativas mejoran sobre G-06 |
| Artefactos | Modelos + reporte comparativo vs G-06 |

---

### Fase D: Ensemble y Evaluación Final

**G-08 — Ensemble**

| Campo | Detalle |
|---|---|
| Prerequisito | G-04 (best GBM) + G-06 (best NN, si mejora) |
| Estrategias | (1) Blend probabilidades con sweep α; (2) Stacking; (3) Ensemble por clase (GBM para alim/reposo, NN para servido) |
| Objetivo | Maximizar F1 macro y especialmente F1 servido sin degradar F1 alim |
| Meta | F1 servido ≥ 0.40, F1 alim ≥ 0.75, F1 activo ≥ 0.75 |
| Artefactos | Ensemble serializado + reporte de sweep α |

**G-Final — Evaluación Formal sobre Test Set**

| Campo | Detalle |
|---|---|
| Prerequisito | G-08 completado con modelo candidato final seleccionado |
| Acción | Cargar `X_test.parquet` + `y_test.parquet` (primera y única vez) |
| Objetivo | Métricas reales de generalización sobre datos nunca vistos |
| Decisión | Si supera umbrales Gamma → modelo de producción Ciclo Gamma |
| Artefactos | `g_final_test_report.json` + modelo de producción Gamma |

---

## 10. Tabla Maestra de Experimentos

Ver archivo: `gamma/EXPERIMENT_TRACKER_GAMMA.md`

Resumen inicial:

| ID | Nombre | Fase | Prerequisito | Meta principal | Estado |
|---|---|---|---|---|---|
| **Pre-G** | Preparación datos + anotación | Pre | — | ≥80 serv · ≥200 alim · Fase 1 OK | ⏳ Pendiente |
| **G-01** | Baseline Gamma limpio | A | Pre-G ✅ | F1 activo ≥ 0.75 · F1 alim ≥ 0.72 | ⏳ Pendiente |
| **G-02** | GBM Benchmark (4 algoritmos) | A | G-01 ✅ | Encontrar mejor GBM | ⏳ Pendiente |
| **G-03** | Feature Engineering avanzado | B | G-02 ✅ | Identificar features que mejoran el GBM | ⏳ Pendiente |
| **G-04** | Hyperparameter Optimization (Optuna) | B | G-03 ✅ | GBM completamente optimizado | ⏳ Pendiente |
| **G-05** | ML Clásico Benchmark | B | G-04 ✅ | Comparar RF/ET/SVM vs GBM | ⏳ Pendiente |
| **G-06** | NN Baseline (MLP/GRU/TCN) | C | G-05 + ≥300 alim + ≥80 serv | F1 servido ≥ 0.40 desde NN | ⏳ Data-conditional |
| **G-07** | NN Avanzado (LSTM/TabNet) | C | G-06 con señal positiva | Explorar arquitecturas adicionales | ⏳ Data-conditional |
| **G-08** | Ensemble GBM + NN | D | G-04 + G-06 | F1 servido ≥ 0.40 · sin degradar alim | ⏳ Pendiente |
| **G-Final** | Evaluación formal test set | D | G-08 modelo candidato | Métricas reales de generalización | ⏳ Reservado |

### Umbrales de Producción del Ciclo Gamma (elevados vs Alpha)

| Métrica | Umbral Alpha (referencia) | Umbral Gamma (objetivo) |
|---|---|---|
| F1 activo — Modelo A | ≥ 0.70 | **≥ 0.75** |
| AUC-ROC — Modelo A | ≥ 0.85 | **≥ 0.90** |
| F1 alimentacion — Modelo B | ≥ 0.65 | **≥ 0.75** |
| F1 servido — Modelo B | sin umbral | **≥ 0.40** |
| Macro F1 — Modelo B | ≥ 0.60 | **≥ 0.65** |

---

## 11. Parámetros Globales e Invariantes

Definidos en `_gamma_utils.py`. Cambiarlos requiere crear un nuevo experimento numerado.

```python
# _gamma_utils.py — FUENTE CANÓNICA DE CONSTANTES GAMMA

# ── Dispositivos ────────────────────────────────────────────────────────────────
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
KPCL0034_CODE = "KPCL0034"

# ── Pipeline ────────────────────────────────────────────────────────────────────
GAP_CUTOFF_S       = 300    # segundos — gap para delimitar segmento nuevo
PLATEAU_THRESHOLD  = 1.5    # gramos — umbral is_plateau (rolling_std_5)
RESAMPLE_TARGET_S  = 30     # segundos — cadencia uniforme post-resampleo
BASELINE_WINDOW    = 60     # lecturas — ventana para calcular net_weight (percentil 10)

# ── Inferencia ──────────────────────────────────────────────────────────────────
MIN_SESSION_S      = 30     # duración mínima de sesión válida
GAP_MERGE_S        = 60     # gap entre activos para fusionar en misma sesión
MIN_CONSUMED_G     = 3.0    # cambio mínimo de peso para sesión válida

# ── Datos: meta antes de G-01 ───────────────────────────────────────────────────
MIN_SERVIDO_SESSIONS    = 80    # sesiones reales de servido etiquetadas
MIN_ALIM_SESSIONS       = 200   # sesiones de alimentación etiquetadas
MIN_ALIM_FOR_NN         = 300   # sesiones de alimentación para habilitar G-06

# NOTA — Augmentación temporal (activa desde 2026-06-17):
# Mientras servido_real < MIN_SERVIDO_SESSIONS, _gamma_utils.cargar_sessions_con_augmentation()
# oversamplea con reemplazo hasta completar 80. Las filas sintéticas llevan is_augmented=True.
# Se auto-desactiva cuando haya >= 80 sesiones reales. Ver §7b de CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md.

# ── Features (en orden — NO cambiar sin nuevo experimento) ──────────────────────
FEATURES_GAMMA = [
    "weight_grams",
    "delta_w",
    "delta_w_10",
    "rolling_std_5",
    "rolling_std_10",
    "rolling_mean_5",
    "net_weight",
    "is_plateau",
    "plateau_duration_s",   # en segundos (no filas — corrección vs Alpha)
    "hour_sin",             # hora Santiago (no UTC — corrección vs Alpha)
    "hour_cos",             # hora Santiago
    "clock_invalid",
    "dia_semana_sin",       # nueva en Gamma
]

# ── Encoding de clases ──────────────────────────────────────────────────────────
LABEL_ENCODING = {
    "alimentacion": 0,
    "servido":      1,
    "reposo":       2,
}

# ── Threshold inicial Modelo A ──────────────────────────────────────────────────
# Recalibrar con isotonic regression en cada experimento, partir de 0.20 como referencia
THRESHOLD_A_INICIAL = 0.20

# ── Timezone ────────────────────────────────────────────────────────────────────
TZ_LOCAL = "America/Santiago"
TZ_UTC   = "UTC"

# ── Encoding CSV (exports Supabase) ─────────────────────────────────────────────
CSV_ENCODING = "latin1"
```

---

## 12. Comandos de Ejecución

### Setup inicial del entorno Gamma

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

# Crear estructura de carpetas Gamma
New-Item -ItemType Directory -Force -Path @(
    "gamma/fase_1_extraccion/scripts",
    "gamma/fase_1_extraccion/data/raw",
    "gamma/fase_1_extraccion/data/processed",
    "gamma/fase_1_extraccion/outputs/quality_report",
    "gamma/fase_2_dataset/scripts",
    "gamma/fase_2_dataset/data/interim",
    "gamma/fase_2_dataset/data/train",
    "gamma/fase_2_dataset/outputs/dataset_report",
    "gamma/fase_3_modelos/scripts",
    "gamma/fase_3_modelos/models/gbm",
    "gamma/fase_3_modelos/models/classical",
    "gamma/fase_3_modelos/models/nn",
    "gamma/fase_3_modelos/models/ensemble",
    "gamma/fase_3_modelos/outputs/training_report",
    "gamma/fase_4_anotacion/data",
    "gamma/experiments"
)
```

### Paso 1 — Anotación (SIEMPRE PRIMERO)

```powershell
streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
# → http://localhost:8501
# Anotar hasta que la barra de progreso muestre ≥ 80 sesiones de servido
# Usar también generar_candidatos_servido.py para encontrar candidatos

python gamma/fase_4_anotacion/generar_candidatos_servido.py
# → exporta gamma/fase_4_anotacion/data/servido_candidates.csv
```

### Paso 2 — Fase 1

```powershell
cd "gamma/fase_1_extraccion/scripts"
python g01_setup_env.py
python g02_get_device_uuid.py
python g03_extract_readings.py    # corrige timezone, dual UUID, detecta anomalías
python g04_extract_events.py      # fusiona audit_events + new_annotations_gamma.csv
python g05_build_sessions.py
python g06_quality_report.py      # checkpoints: ≥80 serv, ≥200 alim, sin assertion errors

# Revisar OBLIGATORIAMENTE:
# - gamma/fase_1_extraccion/outputs/anomalias_peso.csv
# - gamma/fase_1_extraccion/outputs/anomalias_sesiones.csv
# - gamma/fase_1_extraccion/outputs/distribucion_por_periodo.json
```

### Paso 3 — Fase 2

```powershell
cd "../../fase_2_dataset/scripts"
python g01_build_labels.py
python g02_build_features.py      # resampleo 30s + hora Santiago + dia_semana_sin
python g03_build_train_dataset.py
python g04_dataset_report.py

# Verificar distribución de clases en dataset_report
# Verificar que X_test.parquet existe pero NO abrirlo
```

### Paso 4 — Fase 3 (G-01)

```powershell
cd "../../fase_3_modelos/scripts"
python g01_prepare_datasets.py
python g02_train_modelo_a_gbm.py  # G-01: solo LightGBM
python g03_train_modelo_b_gbm.py  # G-01: solo LightGBM
python g09_training_report.py
```

### Paso 5 — Fase 3 (G-02: GBM Benchmark)

```powershell
# Instalar dependencias adicionales
pip install xgboost catboost optuna --break-system-packages

# Correr benchmark GBM completo
python g02_train_modelo_a_gbm.py --benchmark  # activa los 4 GBM en paralelo
python g03_train_modelo_b_gbm.py --benchmark
python g09_training_report.py --mode=gbm_benchmark
```

### Fase C (G-06) — Redes Neuronales en Colab

```python
# Subir a Google Colab Pro:
# - gamma/fase_3_modelos/scripts/g06_train_modelo_a_nn.py
# - gamma/fase_2_dataset/data/train/X_train.parquet
# - gamma/fase_2_dataset/data/train/X_val.parquet
# - gamma/fase_2_dataset/data/train/y_train.parquet
# - gamma/fase_2_dataset/data/train/y_val.parquet

# En Colab:
!pip install torch torchvision torchaudio
!pip install lightning imbalanced-learn
# Ejecutar g06_train_modelo_a_nn.py
# Descargar modelos .pt al terminar
```

---

## 13. Reglas del Ciclo Gamma

Estas reglas son inviolables. Romperlas requiere documentar el motivo en el experimento.

1. **`X_test` y `y_test` no se tocan** hasta que exista un modelo candidato final en G-08.
2. **No se entrena** hasta tener ≥80 sesiones de `servido` reales en `new_annotations_gamma.csv`.
3. **Siempre hora Santiago** para `hour_sin`, `hour_cos`, `dia_semana_sin`. Nunca UTC.
4. **Siempre `ingested_at`** cuando `clock_invalid=True`. Detectar automáticamente períodos con 100% `clock_invalid` y forzar `ingested_at` sin condición.
5. **Siempre resampleo a 30s** antes de calcular features. No negociable desde G-01.
6. **Siempre análisis de distribución por período** (`distribucion_por_periodo.json`) antes de combinar fuentes de datos distintos en entrenamiento.
7. **Ambos UUIDs de KPCL0034** siempre en `KPCL0034_UUIDS`. Nunca filtrar por un solo UUID.
8. **Encoding `latin1`** para todos los CSVs exportados de Supabase.
9. **Un experimento = un archivo MD** en `gamma/experiments/` + una fila en `EXPERIMENT_TRACKER_GAMMA.md`.
10. **NN solo con datos suficientes**: G-06 y posteriores requieren ≥300 alim + ≥80 serv. No antes.
11. **Comparación siempre sobre los mismos splits**: todos los modelos G-01 a G-08 se evalúan sobre el mismo `X_val.parquet` para comparación justa.
12. **No importar anotaciones de Alpha automáticamente**: las de `new_annotations.csv` son una referencia, no una fuente de verdad automática para Gamma.
13. **`cadencia_s` excluida**: no incorporar de vuelta sin un experimento numerado que justifique su valor.
14. **Threshold siempre post-calibración isotónica**: nunca usar threshold default 0.50 en producción.

---

## 14. Referencias Cruzadas

| Documento | Rol en Gamma |
|---|---|
| `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md` | Runbook operativo del Pre-G: unificación de datos + inferencia con Modelo A de Exp06 + retiquetado total |
| `fase_1_extraccion/scripts/g01_setup_env.md` ... `g10_quality_report.md` | Implementación (specs .py) de los Pasos 4.1–4.11 del runbook de unificación |
| `gamma/EXPERIMENT_TRACKER_GAMMA.md` | Tabla maestra de todos los experimentos del Ciclo Gamma |
| `gamma/GLOSARIO_GAMMA.md` | Definiciones actualizadas con lecciones Alpha |
| `experiments/exp_01_linea_base.md` a `exp_10_nn_colab.md` | Ciclo Alpha (solo lectura, referencia histórica) |
| `EXPERIMENT_TRACKER.md` | Tracker del Ciclo Alpha (histórico) |
| `../02_REGLAS_EVENTOS_ALIMENTACION.md` | Taxonomía canónica de eventos (aplica a ambos ciclos) |
| `../03_ML_PREDICCION_ALIMENTACION.md` | Especificación ML original (Ciclo Alpha) |
| `../01_GUIA_DASHBOARD_KPCL.md` | Guía del dashboard para identificar sesiones a anotar |
| `../04_OPERATIVIZACION_SESIONES_SUPABASE.md` | Estructura de sesiones en Supabase |
| `../06_AUDITORIA_SIN_CARGADOR.md` | Contexto de anomalías KPCL0036 |
| `../07_AUDITORIA_KPCL0036_ERROR_PESO.md` | Por qué KPCL0036 sigue excluido |

---

## Apéndice A — Renombramiento Ciclo Alpha

Para mantener el historial claro, los experimentos Alpha se identifican con prefijo α:

| Nombre anterior | Nombre Alpha canónico |
|---|---|
| Exp 01 | **α-01** — Línea base |
| Exp 02 | **α-02** — Threshold + rebalanceo |
| Exp 03 | **α-03** — Mejor base histórica (**referencia de 12 features**) |
| Exp 04 | **α-04** — SMOTE + calibración isotónica |
| Exp 05 | **α-05** — Nueva ingesta Fase 1 |
| Exp 06 | **α-06** — Dump Colab ★ **Mejor Alpha / Producción actual** |
| Exp 07 | **α-07** — Inferencia Mayo-Jun |
| Exp 08 | **α-08** — Unificación Mayo-Jun |
| Exp 09A | **α-09A** — Cadencia normalizada |
| Exp 09B | **α-09B** — Threshold por período |
| Exp 10-NN | **α-10** — Benchmark neuronal |

---

## Apéndice B — Checklist de Arranque del Ciclo Gamma

```
□ Dump de Supabase descargado y guardado en Data_2026/
□ Carpeta gamma/ creada con estructura completa
□ _gamma_utils.py creado con constantes y KPCL0034_UUIDS
□ _gamma_phase2_utils.py creado con resampleo, hora Santiago, plateau_duration_s
□ _gamma_phase3_utils.py creado con funciones genéricas multi-modelo
□ app_anotacion_gamma.py ejecutando correctamente en localhost:8501
□ generar_candidatos_servido.py generó servido_candidates.csv
□ Anotación de servido en progreso (barra en app)
□ ≥80 sesiones de servido → DESBLOQUEADO: ejecutar Paso 2 (Fase 1)
□ g06_quality_report.py pasa sin assertion errors
□ distribucion_por_periodo.json revisado → DESBLOQUEADO: ejecutar Paso 3 (Fase 2)
□ X_test.parquet generado → sellar (no abrir)
□ G-01 ejecutado → baseline establecido
□ EXPERIMENT_TRACKER_GAMMA.md actualizado con fila G-01
```