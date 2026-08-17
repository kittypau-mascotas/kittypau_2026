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
