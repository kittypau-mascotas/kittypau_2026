# KPCL0034 — Data Science Pipeline

> **Ecosistema:** Este pipeline forma parte de `investigacion/`. Documentos maestros:
> [README raíz](../README.md) · [GLOSARIO](../GLOSARIO.md) · [EXPERIMENT_TRACKER](../av1_EXPERIMENT_TRACKER.md) · [experiments/README](av1_EXPERIMENTS_README.md) · [Data_2026/README](../Data_2026/README.md)

Pipeline de ML supervisado para detección automática de sesiones de alimentación de Bandida
sobre datos de peso del bowl `KPCL0034`. Estado activo: **Exp 10-NN completado** (2026-06-15) · F1 activo mejor NN=0.6016 (TCN) · GRU F1 servido=0.34 · **Modelo en producción: Exp 06** · **Próximo: Exp 11** (ensemble GRU+LGBM + revisión 155 candidatos Mayo-Jun).

---

## Estructura

```
Data Science/
├── README.md                          ← este archivo
├── requirements.txt                   ← dependencias Python (LightGBM 4.3.0, Streamlit 1.58, Plotly 6.8)
├── .gitignore
├── inferencia_kpcl0034.py              ← inferencia con modelos Exp 06 sobre datos de entrenamiento
├── inferencia_exp07_mayo_junio.py      ← inferencia Exp 07 sobre Mayo–Jun 2026 (sin etiquetar)
├── colab_analisis_kpcl0034_07052026.py ← análisis exploratorio Colab (07-05-2026)
├── av1_REFERENCIAS.md                   ← links y referencias externas
├── av1_PREPARACION_NUEVA_INGESTA.md     ← guía para nueva ingesta de datos
├── av1_REPORTE_SESION_2026-04-26.md     ← bitácora histórica de la sesión inicial
├── av1_RESUMEN_EXPERIMENTOS_FASE3.md    ← resumen ejecutivo Exp 01–05 (histórico)
├── av1_REPORTE_EXPERIMENTOS_FASE3.md    ← reporte maestro Exp 01–05 (histórico)
├── resumen_fase3.svg                   ← gráfico comparativo visual
│
├── experiments/                       ← un MD por experimento
│   ├── av1_EXPERIMENTOS_DETALLE.md           ← Modelo A F1=0.00 (threshold default)
│   ├── av1_EXPERIMENTOS_DETALLE.md ← Modelo A F1=0.555 (threshold tuning)
│   ├── av1_EXPERIMENTOS_DETALLE.md           ← Modelo B Macro F1=0.671 (mejor base histórica)
│   ├── av1_EXPERIMENTOS_DETALLE.md    ← SMOTE + calibración isotónica
│   ├── av1_EXPERIMENTOS_DETALLE.md        ← Fase 1 actualizada, modelos sin cambio
│   ├── av1_EXPERIMENTOS_DETALLE.md        ← dump 07-05-2026 · Fase 4 habilitada
│   ├── av1_EXPERIMENTOS_DETALLE.md ← ✅ Completado — inferencia Mayo–Jun 2026 · 155 sesiones anotadas retroactivamente
│   ├── av1_EXPERIMENTOS_DETALLE.md ← ✅ Completado — Abril+MayoJun unificados · F1 servido↑ · shift distribución
│   ├── av1_EXPERIMENTOS_DETALLE.md ← ✅ Completado — resampleo 30s · F1=0.6000 · AUC=0.9146 · threshold sube a 0.26
│   ├── av1_EXPERIMENTOS_DETALLE.md ← ✅ Completado — threshold por período · plateau en segundos · cadencia_s (#13)
│   ├── av1_EXPERIMENTOS_DETALLE.md               ← ✅ Completado — benchmark 4 NN vs LGBM Exp 06 · LGBM permanece en prod · GRU F1 serv=0.34
│   └── av1_EXPERIMENTOS_DETALLE.md      ← 📋 Planificado — revertir cadencia_s · revisión 155 candidatos Exp 07 · ensemble GRU+LGBM
│
├── fase_1_extraccion/
│   ├── INSTRUCCIONES_FASE1_CLAUDE_CODE.docx
│   ├── data/
│   │   ├── raw/                       ← readings_raw.parquet · events_labeled.parquet · sessions_labeled.parquet
│   │   └── processed/
│   ├── notebooks/
│   │   └── exploracion_fase1.ipynb
│   ├── outputs/
│   │   └── quality_report/quality_report.txt
│   └── scripts/
│       ├── 01_setup_env.py
│       ├── 02_get_device_uuid.py
│       ├── 03_extract_readings.py     ← lee readings.csv del dump CSV
│       ├── 04_extract_events.py       ← lee audit_events.csv + fusiona new_annotations.csv
│       ├── 05_build_sessions.py
│       ├── 06_quality_report.py
│       └── _supabase_helpers.py
│
├── fase_2_dataset/
│   ├── README.md
│   ├── INSTRUCCIONES_FASE2_CLAUDE_CODE.docx
│   ├── data/
│   │   ├── interim/                   ← readings_labeled.parquet · readings_features.parquet
│   │   └── train/                     ← X/y train·val·test + label_encoder.json + dataset_meta.json
│   ├── outputs/
│   │   └── dataset_report/dataset_report.txt
│   └── scripts/
│       ├── 01_build_labels.py
│       ├── 02_build_features.py
│       ├── 03_build_train_dataset.py
│       ├── 04_dataset_report.py
│       └── _phase2_utils.py           ← fuente canónica de features (GAP=300s, PLATEAU=1.5g)
│
├── fase_3_modelos/
│   ├── README.md
│   ├── INSTRUCCIONES_FASE3_CLAUDE_CODE.docx
│   ├── models/
│   │   ├── modelo_a/                  ← modelo_a.lgb · calibration_isotonic.json · params · importance
│   │   └── modelo_b/                  ← modelo_b.lgb · params · importance
│   ├── outputs/
│   │   └── training_report/training_report.txt
│   └── scripts/
│       ├── 01_prepare_datasets.py
│       ├── 02_train_modelo_a.py
│       ├── 03_train_modelo_b.py
│       ├── 04_training_report.py
│       └── _phase3_utils.py
│
└── fase_4_visualizacion/              ← Fase 4: anotación + evaluación final
    ├── COMO_EJECUTAR.md
    ├── app_anotacion.py               ← Streamlit — vista longitudinal + etiquetado manual
    ├── data/
    │   └── new_annotations.csv        ← anotaciones locales del usuario (se fusionan en Fase 1)
    ├── dist/                          ← build React (output generado — no commitar)
    └── node_modules/                  ← npm packages (no commitar)
```

---

## Estado actual — Experimento 09B completado · Exp 10-NN planificado (2026-06-14)

### Taxonomía de datos activa

| Dato | Etiquetado manual | Visto por modelo | Período | Estado |
|---|:---:|:---:|---|---|
| Train set (Exp 09A) | ✅ Sí | ✅ Sí | Apr 8 – May 31, 2026 | ✅ En train Exp 09A (30s resampleado) |
| Val set (Exp 09A) | ✅ Retroactivo | ✅ Sí | May 31 – Jun 7, 2026 | ✅ Evaluación Exp 09A |
| Test set (reservado) | ✅ Retroactivo | ❌ NO | Jun 7 – Jun 14, 2026 | ⚠️ RESERVADO Fase 4 |
| Sesiones Abril (re-revisión) | ⏳ En revisión | ✅ Sí (train/val/test) | Apr 8 – May 1, 2026 | 🔄 `app_anotacion.py` · 109/128 con referencia |

> **Modelo en producción: Exp 06** (F1 activo=0.7619 · F1 alim=0.7606).
> Exp 09A completado — F1 activo=0.6000, AUC=0.9146. El resampleo a 30s es invariante pero no resolvió el shift de calibración entre períodos.
> **Exp 09B planificado:** threshold por período + `plateau_duration` en segundos + feature `cadencia_s` → meta F1 ≥ 0.68 en Mayo-Jun.

### Estado por fase

| Fase | Estado | Resultado |
|---|---|---|
| Fase 1 (Exp 06) | ✅ Histórico | 124,682 filas · 254 eventos · 103 alim + 18 serv |
| Fase 2 (Exp 06) | ✅ Histórico | split Apr 8–May 1 · 62,880 filas post-dedup |
| Fase 3 (Exp 06) | ✅ Producción | Modelo A F1=**0.7619** · AUC=**0.9205** · Modelo B F1-alim=**0.7606** |
| Fase 4 Exp 07 | ✅ Completada | 155 sesiones detectadas · **anotadas retroactivamente** (82 alim + 9 serv útiles) |
| Fase 1 (Exp 09A) | ✅ Completada | 212,011 filas · 436 eventos · **185 alim + 27 serv** (misma Fase 1 que Exp 08) |
| Fase 2 (Exp 09A) | ✅ Completada | resampleo 30s · 134,922 filas · split Apr 8–May 31 / May 31–Jun 7 / Jun 7–Jun 14 |
| Fase 3 (Exp 09A) | ✅ Completada | Modelo A F1=0.6000 · AUC=0.9146 · threshold=0.26 |
| Fase 2 (Exp 09B) | ✅ Completada | plateau_duration en segundos · cadencia_s (#13) · 134,922 filas 30s |
| Fase 3 (Exp 09B) | ✅ Completada | F1=0.6000 (sin mejora) · AUC=0.9171 (+0.0025) · cadencia_s importancia baja |
| app_anotacion Exp 09B | 🔄 Pendiente | modo "Comparación Modelo A" · IoU temporal · confirmación de FP |

### Resultados Exp 06 (validación) — modelos en producción

| Modelo | Métrica | Exp 05 | **Exp 06** |
|---|---|---:|---:|
| Modelo A | F1 activo | 0.5693 | **0.7619** (+0.19) |
| Modelo A | AUC-ROC | 0.8802 | **0.9205** (+0.04) |
| Modelo A | threshold | 0.22 | **0.20** |
| Modelo B | F1 alimentacion | 0.5488 | **0.7606** (+0.21) |
| Modelo B | F1 servido | 0.4000 | 0.1395 ⚠️ |
| Modelo B | Macro F1 | 0.6456 | 0.6312 |

⚠️ **F1 servido inestable** en Exp 06 (val set con solo 12 ejemplos). El Exp 07
confirma que el modelo discrimina servido con dificultad en producción (6 de 140
sesiones clasificadas como servido). Prioridad: etiquetar retroactivamente el
período Mayo–Junio con `app_anotacion.py` para obtener métricas reales del Exp 07.

### Resultados Exp 07 (inferencia — sin ground truth aún)

| Métrica | Valor |
|---|---|
| Período inferido | 2026-05-25 → 2026-06-14 (20 días) |
| Filas procesadas (KPCL0034) | 57,101 |
| Sesiones detectadas total | 155 |
| Sesiones alimentación (Modelo B) | **134** |
| Sesiones servido (Modelo B) | 6 |
| Sesiones descartadas (sanity filter) | 15 |
| Consumo total estimado | 1,306 g |
| Consumo medio por sesión | 9.7 g |
| Duración media por sesión | 4.9 min |
| Métricas formales (F1, AUC) | ⏳ Pendiente de etiquetado retroactivo |

Artefactos en `Data_2026/Mayo_2026/`: `X_mayo_junio.parquet` ·
`sesiones_detectadas_mayo_junio.csv` · `inferencia_mayo_junio.html`

---

## Features activas (12 invariantes desde Exp 03 · 13 en Exp 09B)

| # | Feature | Descripción |
|---|---|---|
| 1 | `weight_grams` | Peso bruto del bowl |
| 2 | `delta_w` | `weight[t] - weight[t-1]` (cambio inmediato) |
| 3 | `delta_w_10` | Delta sobre ventana de 10 lecturas |
| 4 | `rolling_std_5` | Std últimas 5 lecturas — **#1 en importancia** |
| 5 | `rolling_std_10` | Std últimas 10 lecturas |
| 6 | `rolling_mean_5` | Media últimas 5 lecturas |
| 7 | `net_weight` | `weight - baseline_w` (percentil 10, ventana 60 filas) |
| 8 | `is_plateau` | 1 si `rolling_std_5 < 1.5g` (señal estable) |
| 9 | `plateau_duration` | Filas consecutivas en plateau (Exp 03–09A) · **segundos en Exp 09B** |
| 10 | `hour_sin` | Componente seno del ciclo horario diario (UTC) |
| 11 | `hour_cos` | Componente coseno del ciclo horario diario (UTC) |
| 12 | `clock_invalid` | 1 si `recorded_at` es inválido (usa `ingested_at`) |
| 13 | `cadencia_s` | ⚠️ **Nueva en Exp 09B** — intervalo entre lecturas en segundos (clip 0–120s) |

Calculadas **por segmento** (gaps > 300s delimitan bloques independientes) — ver `_phase2_utils.py`.
Feature #13 (`cadencia_s`) evaluada en Exp 10-NN — si no mejora en las NN tampoco, se elimina en Exp 11.

---

## Inferencia en producción

### Exp 06 — datos de entrenamiento (referencia)

```powershell
# Generar sesiones detectadas + dashboard HTML sobre datos Apr–May
& C:\Users\Usuario\AppData\Local\Programs\Python\Python311\python.exe `
  "d:/Escritorio/Proyectos/AIoT_Kittypau/kittypau_2026_hivemq/Docs/investigacion/Data Science/inferencia_kpcl0034.py"
```

Salida: `sesiones_detectadas.csv` + `inferencia_kpcl0034.html`

### Exp 07 — Mayo–Junio 2026 (inferencia en producción)

```powershell
# Inferencia sobre datos Mayo–Junio sin etiquetar
& C:\Users\Usuario\AppData\Local\Programs\Python\Python311\python.exe `
  "d:/Escritorio/Proyectos/AIoT_Kittypau/kittypau_2026_hivemq/Docs/investigacion/Data Science/inferencia_exp07_mayo_junio.py"
```

Fuente: `Data_2026/Mayo_2026/readings_rows.csv` (KPCL0034, 57,101 filas)
Salida: `Data_2026/Mayo_2026/sesiones_detectadas_mayo_junio.csv` +
        `Data_2026/Mayo_2026/inferencia_mayo_junio.html`

Modelos usados: artefactos del Exp 06 en `fase_3_modelos/models/`.

---

## App de anotación

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1
streamlit run fase_4_visualizacion/app_anotacion.py
# → http://localhost:8501
```

Las anotaciones guardadas en `fase_4_visualizacion/data/new_annotations.csv` se fusionan
automáticamente en la próxima corrida de `fase_1_extraccion/scripts/04_extract_events.py`.

---

## Ejecución del pipeline (Fase 1 → 2 → 3)

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

# Fase 1
cd fase_1_extraccion/scripts
python 03_extract_readings.py
python 04_extract_events.py
python 05_build_sessions.py
python 06_quality_report.py

# Fase 2
cd ../../fase_2_dataset/scripts
python 01_build_labels.py
python 02_build_features.py
python 03_build_train_dataset.py
python 04_dataset_report.py

# Fase 3
cd ../../fase_3_modelos/scripts
python 01_prepare_datasets.py
python 02_train_modelo_a.py
python 03_train_modelo_b.py
python 04_training_report.py
```

**Fuente primaria:** CSV dump local `Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/`.
**Fallback:** Supabase API (requiere `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`).

---

## Fuente oficial de etiquetas

- `public.audit_events` en Supabase — vía `audit_events.csv` del dump local.
- `fase_4_visualizacion/data/new_annotations.csv` — anotaciones locales nuevas del usuario.
- `04_extract_events.py` genera `events_labeled.parquet` fusionando ambas fuentes.
- No mantener listas locales paralelas de eventos históricos fuera de estos dos canales.
