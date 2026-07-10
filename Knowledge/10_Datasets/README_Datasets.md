---
id: readme_datasets
title: Datasets — readings.csv + readings_rows.csv + anotaciones
type: dataset
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - dataset
  - readings
  - anotaciones
  - candidatos
  - kpcl0034
related:
  - [[00_HOME]]
  - [[09_Sensores/README_Sensores]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
  - [[24_Glosario/README_Glosario]]
---

# Datasets — KPCL0034 "Bandida"

---

## Archivos de datos

### Datos crudos (INMUTABLES / APPEND-ONLY)

| Archivo | Ruta | Regla | Contenido |
|---|---|---|---|
| `readings.csv` | `11_Data/2026/readings.csv` | **NUNCA modificar** | 8 024 filas · Abr 8 – May 23 2026 · UUID `9510a455...` |
| `readings_rows.csv` | `11_Data/2026/readings_rows.csv` | **Append-only** — solo `sync_readings_incremental()` | 94 588+ filas · May 23 – presente · UUID `3a460074...` |

### Artefactos generados (regenerables)

| Archivo | Ruta | Generado por | Contenido |
|---|---|---|---|
| `candidatos_av2.csv` | `fase_0_ruido/data/` | `01_genera_candidatos.py` | 421 segmentos detectados |
| `anotaciones_av2.csv` | `fase_0_ruido/data/` | App — save/delete | 421 etiquetas manuales — **CRÍTICO** |
| `features_anotaciones_v2.csv` | `fase_0_ruido/data/` | `revisar_anotaciones_v2.py` | 417 filas × 109 cols |
| `comp_stats_v2.json` | `fase_0_ruido/data/` | `revisar_anotaciones_v2.py` | 102 features × 3 categorías × 4 stats (µ/σ/mediana/n) |
| `_cache_lecturas_30s.parquet` | `fase_0_ruido/data/` | `load_lecturas()` en app | Caché de resampleo — borrable sin pérdida |

---

## Schema de readings.csv / readings_rows.csv

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | UUID de la lectura |
| `device_id` | uuid | UUID del dispositivo KPCL0034 |
| `created_at` | timestamp UTC | Momento en que se inseró en Supabase |
| `weight_grams` | float | Peso del bowl en gramos |
| `temperature` | float / null | °C |
| `humidity` | float / null | % |
| `light` | jsonb / null | `{lux, %, condition}` |
| `battery_level` | int / null | 0–100% |
| `battery_voltage` | float / null | Voltios |
| `battery_state` | string / null | `battery_only` / `charging` / `charged` |

---

## Schema de candidatos_av2.csv

| Columna | Descripción |
|---|---|
| `id_candidato` | ID único del candidato |
| `t_inicio` | Timestamp inicio (UTC) |
| `t_fin` | Timestamp fin (UTC) |
| `delta_w` | Cambio total de peso (g): positivo=subida, negativo=bajada |
| `duracion_s` | Duración del segmento (s) |
| `tipo` | `bajada` / `subida` / `mixto` |
| `n_muestras` | Número de muestras en el segmento (resampleo 30 s) |
| `feature_*` | 102 features calculadas por Motor v2 |

### Distribución de candidatos (v2.1)

| Tipo | N | Descripción |
|---|---|---|
| `bajada` | 248 | Peso baja durante >60% del tiempo |
| `mixto` | 95 | Sube y baja sin tendencia clara |
| `subida` | 78 | Peso sube durante >60% del tiempo |
| **Total** | **421** | |

---

## Schema de anotaciones_av2.csv

| Columna | Descripción |
|---|---|
| `id_anotacion` | UUID único de la anotación |
| `id_candidato` | FK a `candidatos_av2.csv` |
| `t_inicio` | Timestamp inicio (hora STGO) |
| `t_fin` | Timestamp fin (hora STGO) |
| `categoria` | `alimentacion` / `servido` / `ruido` / `ciclo_servido_alimento` |
| `notas` | Texto libre del operador |
| `origen` | `manual` / `auto` |
| `created_at` | Cuándo se anotó |

**Backup automático diario:** `fase_0_ruido/data/backups/anotaciones_av2_YYYYMMDD.csv`

### Estado de anotaciones (2026-06-28)

| Categoría | N |
|---|---|
| 🍽️ `alimentacion` | 209 |
| 🫙 `servido` | 45 |
| ⚡ `ruido` | 167 |
| **Total** | **421** |

---

## Parámetros de detección de candidatos

Editables en `config/umbrales.json` desde Tab 4 de la app:

| Parámetro | Default | Descripción |
|---|---|---|
| `rolling_std_min` | — | Desviación estándar mínima en ventana rolling para considerar "actividad" |
| `delta_g_min` | — | Delta mínimo (g) para no descartar como micro-movimiento |
| `min_duration_s` | — | Duración mínima del evento (s) |
| `gap_fusion_s` | 120 | Si dos eventos distan < 120 s, se fusionan |

---

## Cómo actualizar los datasets

```powershell
# 1. Sincronizar datos nuevos desde Supabase (agrega filas a readings_rows.csv)
# → Presionar "🔄 Actualizar Todo" en la app, o:
python supabase_client.py  # solo sync

# 2. Re-detectar candidatos
python 01_genera_candidatos.py

# 3. Recalcular features y estadísticas
python revisar_anotaciones_v2.py
# → genera features_anotaciones_v2.csv + comp_stats_v2.json
```

---

## Ver también

- [[09_Sensores/README_Sensores]] — el dispositivo que genera los datos
- [[14_Experimentos/EXP_AlphaV2_Pipeline]] — pipeline completo
- [[14_Experimentos/EXP_AlphaV2_AppArq]] — app que lee estos archivos
- [[13_Features/README_ShapeFeatures]] — features extraídas de los candidatos
