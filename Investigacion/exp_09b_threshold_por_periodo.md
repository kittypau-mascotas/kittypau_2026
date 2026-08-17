# Exp 09B — Threshold por Período + Plateau en Segundos + cadencia_s

| Campo | Valor |
|---|---|
| **ID** | Exp 09B |
| **Nombre** | Threshold por período de cadencia · plateau_duration en segundos · feature cadencia_s |
| **Fecha** | 2026-06-14 |
| **Estado** | ✅ Completado |
| **Basado en** | [Exp 09A](exp_09a_cadencia_normalizada.md) + nueva data Abril y Mayo-Jun |
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
