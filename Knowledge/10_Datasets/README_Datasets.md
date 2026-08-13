---
id: readme_datasets
title: Datasets — readings.csv + readings_rows.csv + anotaciones
type: dataset
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-13
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
  - [[29_Specs/SPEC_07_Investigacion_Hidratacion]]
---

# Datasets — KPCL0034 "Bandida"

---

## ⚠️ Discrepancia sin resolver — tamaño real de `readings.csv` (hallazgo 2026-08-11)

Verificación directa del archivo en disco (`Docs/11_Data/2026/readings.csv`, no versionado —
está en `.gitignore` vía `Docs/11_Data/**/*.csv`, así que no hay historial git que consultar):

| Métrica | Documentado (aquí y en `fase_0_ruido/`) | Medido en vivo 2026-08-11 |
|---|---|---|
| Filas totales del archivo | (no se documenta — se asume ≈ solo KPCL0034) | **1 085 889** |
| Dispositivos distintos en el archivo | 1 (solo KPCL0034) | **5** (`9510a455…`=154 857, `3c1c6705…`=821 785, `67aaaf28…`=108 587, + 2 more) |
| Filas de KPCL0034 (`9510a455...`) | **8 024** | **154 857** |
| Rango de fechas | Abr 8 → May 23 2026 | Abr 7 → May 7 2026 (todo el archivo) |

`readings_rows.csv` tiene el mismo patrón: **270 001 filas totales**, 3 dispositivos, de las
cuales **167 959** matchean el UUID de KPCL0034 Mayo–Jun (`3a460074...`) — vs. las 94 588
documentadas.

> ✅ **Resuelto 2026-08-13:** el device dominante `3c1c6705…` (821 785 filas, 75,7% del
> archivo) es **KPCL0036, el bebedero** — confirmado por Mauro. No es un sensor mal
> configurado floodeando lecturas: reporta a una cadencia real de ~1,16s (15–25× más
> rápido que KPCL0034), lo que explica el volumen sin que implique más uso. Ver
> [[29_Specs/SPEC_07_Investigacion_Hidratacion]] §2.2–§2.3 para el diagnóstico completo
> (incluye una anomalía de hardware sin resolver: 9,09% de lecturas en exactamente `0`).

**No parece ser corrupción reciente:** una memoria de sesión de hace ~45 días ya registraba
"Filas KPCL0034: ~154 857" para este mismo archivo — el número coincide exacto con lo medido
hoy. Es decir, **"8 024 filas" fue siempre un número incorrecto en la documentación**
(probablemente confundido con un conteo resampleado a 30s, no con las filas crudas del CSV),
no una modificación del archivo "nunca tocar". El device `3c1c6705…` domina el archivo con
821 785 filas — no se investigó si es un sensor mal configurado floodeando lecturas o un
export sin filtrar por device; los scripts de `fase_0_ruido/` sí filtran correctamente por
`KPCL0034_UUIDS` antes de procesar, así que el pipeline de anotación no se ve afectado. Aun
así, Mauro debería confirmar contra Supabase qué es exactamente ese device dominante.

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

### Distribución de candidatos (v2.1, Jun 27 — última distribución por tipo registrada)

| Tipo | N | Descripción |
|---|---|---|
| `bajada` | 248 | Peso baja durante >60% del tiempo |
| `mixto` | 95 | Sube y baja sin tendencia clara |
| `subida` | 78 | Peso sube durante >60% del tiempo |
| **Total** | **421** | |

> Estado en vivo verificado 2026-08-11: `candidatos_av2.csv` tiene **590 filas** (589 candidatos +
> header). Split "mixto" por giro interno (`punto_split_mixto()`) ya está implementado pero
> **no aplicado** — ver [[15_Resultados/RESULT_AlphaV2_Snapshots]] snapshot v2.4, punto 4.

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

### Estado de anotaciones

| Categoría | N (v2.4, 2026-08-11 cerrado) | N en vivo (2026-08-11, `wc -l` directo) |
|---|---|---|
| 🍽️ `alimentacion` | 254 | 262 |
| 🫙 `servido` | 55 | 58 |
| ⚡ `ruido` | 187 | 207 |
| **Total** | **496** | **527** |

> La columna "en vivo" son las filas reales de `anotaciones_av2.csv` en este momento —
> hay anotación en curso desde el último snapshot cerrado (v2.4). No hay snapshot
> formal para estos 527 todavía; `revisar_anotaciones_v2.py` no se ha corrido sobre
> ellas. Ver [[15_Resultados/RESULT_AlphaV2_Snapshots]] para el historial completo.

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

## Dataset de hidratación (KPCL0036) — separado, en construcción

Desde 2026-08-13 existe `fase_0_ruido/data_agua/candidatos_agua.csv` (393 candidatos: 223
bajada/57%, 159 subida/40%, 11 mixto/3%), generado por el mismo `01_genera_candidatos.py`
de esta página vía `KITTYPAU_DEVICE_PROFILE=KPCL0036` — parametrización descrita en
[[29_Specs/SPEC_07_Investigacion_Hidratacion]] §5.1/§7. **No es un fork**: mismo código,
carpeta de datos distinta (`data_agua/` vs. `data/`), nunca se mezclan. Todavía sin
anotaciones manuales ni `umbrales_agua.json` calibrado — ver SPEC_07 §7 para el roadmap
completo. No agregar filas de agua a las tablas de esta página; su esquema y estado viven
en el índice propio [[00_INDICE_AV2_AGUA]].

## Ver también

- [[09_Sensores/README_Sensores]] — el dispositivo que genera los datos
- [[14_Experimentos/EXP_AlphaV2_Pipeline]] — pipeline completo
- [[14_Experimentos/EXP_AlphaV2_AppArq]] — app que lee estos archivos
- [[13_Features/README_ShapeFeatures]] — features extraídas de los candidatos
- [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — línea de investigación de hidratación
  (KPCL0036), datasets/parámetros propios, no mezclar con los de esta página (comida)
- [[00_INDICE_AV2_AGUA]] — índice de artefactos generados para hidratación
