# Ciclo Alpha v2 — Arquitectura y Pipeline

> Fusión de la arquitectura del pipeline, arquitectura técnica de la app, cómo lanzarla y el pipeline de datos/rutas críticas.


---


<!-- ==== fusionado desde av2_01_ARQUITECTURA_Y_PIPELINE.md ==== -->

---
tags: [kittypau, ciclo-alpha-v2, arquitectura, pipeline]
fecha_creacion: 2026-06-26
estado: activo
---

# Ciclo Alpha v2 — Arquitectura del Pipeline

> Ver [[av2_00_INDICE_Y_VISION_GENERAL]] para el índice completo del ciclo.

---

## Filosofía de diseño

El Ciclo Alpha v2 se basa en tres principios:

1. **Sin ML supervisado en esta fase** — los datos etiquetados son insuficientes para entrenar un modelo generalizable. Las reglas matemáticas son interpretables y ajustables.
2. **Detectar de más, filtrar después** — el generador de candidatos usa umbrales bajos a propósito. Es preferible revisar un falso positivo que perder un evento real.
3. **Las anotaciones manuales son la fuente de verdad** — cada umbral en `umbrales.json` se deriva empíricamente de las anotaciones, no de suposiciones a priori.

---

## Diagrama del pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  FUENTES DE DATOS                                               │
│  readings.csv + readings_rows.csv (Supabase export)             │
│  246.130 lecturas · 2026-04-08 → 2026-06-26                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0A — DETECCIÓN DE SEGMENTOS                               │
│  01_genera_candidatos.py                                        │
│                                                                 │
│  1. Filtrar KPCL0034 por UUID                                   │
│  2. Resamplear a 30s (forward-fill máx. 2 slots)               │
│  3. Detectar actividad (rolling std + rolling delta)            │
│  4. Agrupar en segmentos contiguos                              │
│  5. Fusionar gaps < 120s                                        │
│  6. Calcular metadata + shape features por segmento             │
│                                                                 │
│  OUTPUT: candidatos_av2.csv (916 candidatos)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0B — ANOTACIÓN MANUAL                                     │
│  app_anotacion_av2.py (Streamlit)                               │
│                                                                 │
│  Operador revisa cada candidato:                                │
│  - Gráfico interactivo del segmento                             │
│  - Métricas: duración, Δpeso, pendiente, shape features         │
│  - Asigna: alimentacion | servido | ruido                       │
│                                                                 │
│  OUTPUT: anotaciones_av2.csv (814 anotaciones)                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0C — DERIVACIÓN DE UMBRALES                               │
│  revisar_anotaciones.py + umbrales.json                         │
│                                                                 │
│  1. Calcular estadísticas por categoría desde anotaciones       │
│  2. Identificar outliers y mislabels                            │
│  3. Actualizar umbrales.json con thresholds empíricos           │
│  4. Definir reglas del detector (orden: serv → alim → ruido)    │
│                                                                 │
│  OUTPUT: umbrales.json v1.2                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼ (PRÓXIMO)
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1 — CLASIFICADOR AUTOMÁTICO                               │
│  fase_1_extraccion/ (pendiente)                                 │
│                                                                 │
│  Implementar función clasificar(candidato) → categoría          │
│  usando las reglas de umbrales.json v1.2:                       │
│  1. SERVIDO   si sim_servido > 0.70 AND delta_w > +20g          │
│  2. ALIMENT.  si sim_alim > 0.70 AND monotonicity < -0.03       │
│  3. RUIDO     en cualquier otro caso                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼ (FUTURO)
┌─────────────────────────────────────────────────────────────────┐
│  FASE 2 — VALIDACIÓN                                            │
│  Evaluar detector automático vs. anotaciones manuales           │
│  Métricas: precision / recall / F1 por categoría                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura de archivos

```
Investigacion/Ciclo_Alpha_v2/
│
├── av2_00_INDICE_Y_VISION_GENERAL.md                 ← Este índice
├── av2_01_ARQUITECTURA_Y_PIPELINE.md      ← Este documento
├── av2_02_DISPOSITIVO_Y_DATOS.md
├── av2_03_DETECCION_SEGMENTOS.md
├── 04_SHAPE_FEATURES.md
├── av2_05_ANOTACION_Y_CATEGORIAS.md
├── av2_06_UMBRALES_Y_REGLAS.md
├── av2_07_RESULTADOS_Y_BENCHMARKS.md
├── av2_08_APP_ANOTACION.md
│
└── fase_0_ruido/                    ← Código del ciclo
    ├── 01_genera_candidatos.py
    ├── app_anotacion_av2.py
    ├── requirements_check.py
    ├── config/
    │   └── umbrales.json
    └── data/
        ├── candidatos_av2.csv
        └── anotaciones_av2.csv
```

---

## Diferencias respecto al Ciclo Alpha (v1)

| Aspecto | Ciclo Alpha v1 | Ciclo Alpha v2 |
|---|---|---|
| Método de clasificación | LightGBM supervisado | Reglas matemáticas + coseno |
| Features | Manuales (delta, pendiente) | Shape features automáticas |
| Etiquetado | `audit_events` de Supabase | App de anotación dedicada |
| Datos | Export hasta 2026-05-07 | Continuo hasta hoy (2026-06-26) |
| Interpretabilidad | Baja (modelo caja negra) | Alta (reglas explícitas) |
| Requisito de datos | Dataset etiquetado grande | Umbrales derivables con ~50 anots. |

---

## Tecnologías utilizadas

| Herramienta | Versión | Uso |
|---|---|---|
| Python | 3.11 | Lenguaje principal |
| pandas | 2.x | Procesamiento de series temporales |
| numpy | — | Cálculo de shape features |
| Streamlit | — | App de anotación |
| Plotly | — | Visualizaciones interactivas |
| zoneinfo | stdlib 3.9+ | Conversión America/Santiago |

---

## Ver también

- [[av2_02_DISPOSITIVO_Y_DATOS]] — Fuentes de datos y UUIDs
- [[av2_03_DETECCION_SEGMENTOS]] — Detalles de `01_genera_candidatos.py`
- [[04_SHAPE_FEATURES]] — Matemática de los features de forma
- [[av2_06_UMBRALES_Y_REGLAS]] — Reglas de clasificación actuales


---


<!-- ==== fusionado desde av2_01_ARQUITECTURA_Y_PIPELINE.md ==== -->

# Arquitectura — app_anotacion_av2.py

## Principio fundamental

**La app es 100% offline.** Todos los datos que muestra vienen de archivos CSV locales.
El único momento en que toca Supabase es cuando el usuario presiona **🔄 Actualizar Todo**.

---

## Flujo de datos

```
Supabase (nube)
     │
     │  SOLO al presionar "🔄 Actualizar Todo"
     ▼
readings_rows.csv          ← append incremental (sync desde Supabase)
readings.csv               ← estático, datos abril 2026, NUNCA modificar

     │
     │  load_lecturas()  — 3 capas de caché
     ▼
_cache_lecturas_30s.parquet  ← caché en disco (~0.3 s al cargar)
     │
     ▼
session_state["_df_lec"]    ← caché en RAM (instantáneo en reruns)

     │
     ├── df_lec → toda la app
     ├── anotaciones_av2.csv → guardadas localmente
     └── candidatos_av2.csv → generados por 01_genera_candidatos.py
```

---

## Separación de responsabilidades

### Datos online (Supabase)
Responsable: `supabase_client.py` → `sync_readings_incremental()`

- **Cuándo se llama**: únicamente desde el botón "🔄 Actualizar Todo"
- **Qué hace**: descarga filas nuevas desde el último corte y las agrega a `readings_rows.csv`
- **Qué NO hace**: no se llama nunca de forma automática, sin polling, sin TTL

### Datos locales (CSV)
Responsable: funciones en `app_anotacion_av2.py`

| Función | Propósito |
|---|---|
| `load_lecturas()` | Lee y resamplea lecturas KPCL0034 a 30s. 3 capas de caché. |
| `load_candidatos()` | Lee `candidatos_av2.csv`. Caché por mtime. |
| `load_anotaciones()` | Lee `anotaciones_av2.csv`. Caché por mtime en session_state. |
| `save_anotacion()` | Escribe en `anotaciones_av2.csv`. Invalida caché. |
| `delete_anotacion()` | Borra una fila de `anotaciones_av2.csv`. Invalida caché. |
| `load_comp_stats()` | Lee `comp_stats_v2.json`. `@st.cache_data`. |
| `calcular_metricas()` | Calcula 7 métricas sobre un segmento. `@st.cache_data(max_entries=2000)`. |
| `build_chart()` | Construye figura Plotly de una curva. `@st.cache_data(max_entries=60)`. |

---

## Flujo del botón "🔄 Actualizar Todo"

```
1. sync_readings_incremental()     → descarga filas nuevas a readings_rows.csv
2. 01_genera_candidatos.py         → re-detecta candidatos → candidatos_av2.csv
3. revisar_anotaciones_v2.py       → recalcula features → comp_stats_v2.json
4. Invalidar cachés específicas:
   - load_comp_stats.clear()
   - _evidence_ventana_cached.clear()
   - build_chart.clear()                    (solo si hay datos nuevos)
   - build_comparison_chart.clear()         (solo si hay datos nuevos)
   - build_global_chart.clear()             (solo si hay datos nuevos)
   - calcular_metricas.clear()              (solo si hay datos nuevos)
   - _calcular_features_v2_cached.clear()   (solo si hay datos nuevos)
   - Borrar parquet en disco                (solo si hay datos nuevos)
   - Limpiar session_state _df_lec          (solo si hay datos nuevos)
   - Limpiar session_state _sscache_*       (loops pesados de Tab 7 y Tab 8)
5. st.rerun()
```

El paso 4 es **selectivo**: si solo cambiaron anotaciones (sin datos crudos nuevos), NO se invalida el parquet ni los charts — solo las estadísticas y el Evidence Engine.

---

## Sistema de caché (3 capas)

```
Capa 1 — session_state (RAM)
  Clave: _df_lec_mtime >= csv_mtime
  Costo: 0 ms — retorno inmediato en reruns

Capa 2 — Parquet en disco
  Archivo: data/_cache_lecturas_30s.parquet
  Costo: ~300 ms al cargar
  Se regenera cuando csv_mtime > parquet_mtime

Capa 3 — Parseo CSV completo
  Usa PyArrow + ThreadPoolExecutor(2) para leer ambos CSVs en paralelo
  Costo: ~5-10 s (solo ocurre al primer arranque o después de sync)
```

### Cachés por función

| Función | Tipo caché | Invalidación |
|---|---|---|
| `calcular_metricas` | `@st.cache_data(max_entries=2000)` | mtime de CSV como hash del df |
| `build_chart` | `@st.cache_data(max_entries=60)` | mtime CSV + mtime anotaciones |
| `build_comparison_chart` | `@st.cache_data` | mtime CSV + mtime anotaciones |
| `build_global_chart` | `@st.cache_data(max_entries=30)` | mtime CSV · Tab 0 Vista Global |
| `_calcular_features_v2_cached` | `@st.cache_data(max_entries=500)` | hash por array `.tobytes()` · Tab 5 |
| `load_comp_stats` | `@st.cache_data` | `.clear()` explícito |
| `_evidence_ventana_cached` | `@st.cache_data(ttl=300)` | mtime CSV como hash |
| Loop Tab 7 `deltas_g` | `session_state["_sscache_t7_*"]` | clave = `len(df)_{mtime}` |
| Loop Tab 8 `_kp_deltas` | `session_state["_sscache_kpe_*"]` | clave = `len(df)_{mtime}` |

---

## Archivos de datos

| Archivo | Regla |
|---|---|
| `11_Data/2026/readings.csv` | **NUNCA modificar.** Datos estáticos abril 2026. |
| `11_Data/2026/readings_rows.csv` | Append-only. Solo escribe `sync_readings_incremental`. |
| `data/candidatos_av2.csv` | Generado por `01_genera_candidatos.py`. Sobreescribible. |
| `data/anotaciones_av2.csv` | Escrito por la app (save/delete). Backup diario automático. |
| `data/comp_stats_v2.json` | Generado por `revisar_anotaciones_v2.py`. |
| `data/_cache_lecturas_30s.parquet` | Caché regenerable. Se puede borrar sin perder datos. |
| `config/umbrales.json` | Umbrales del detector. Editable desde Tab 5. |

---

## Navegación lazy — tabs que solo cargan al activarse

La navegación usa `st.radio(horizontal=True, key="tab_nav")` en lugar de `st.tabs()`.
Esto garantiza que **solo el tab activo ejecuta su código** en cada rerun de Streamlit.
Cada tab muestra una barra de progreso 0→100% durante la carga.

| Tab | Nombre | Datos que usa | Progreso |
|---|---|---|---|
| 0 | 🌐 Vista Global | df_lec + df_anot + build_global_chart | no |
| 1 | 🔍 Revisar Candidatos | df_cand + df_lec + df_anot → **escribe** | sí (4 pasos) |
| 2 | 📏 Analizar Curva | df_lec + df_anot + calcular_metricas | sí (3 pasos) |
| 3 | 🔄 Comparar Curvas | df_lec + df_anot + build_comparison_chart | sí (3 pasos) |
| 4 | 📊 Panel de Features | df_cand + df_lec + calcular_metricas | sí (3 pasos) |
| 5 | 🧮 Motor Matemático | df_lec + _calcular_features_v2_cached + cs_dict | sí (4 pasos) |
| 6 | 📋 Anotaciones | df_anot (solo lectura) | no |
| 7 | 🕐 Próxima Comida | df_anot + calcular_metricas + df_lec | sí (3 pasos) |
| 8 | 🐱 Kittypau | df_anot + df_lec + cs_dict + Evidence Engine | sí (3 pasos) |

**La app nunca llama a Supabase desde ningún Tab.** Cada Tab solo lee datos ya cargados en memoria.

---

## Cómo agregar datos nuevos

1. Presionar **🔄 Actualizar Todo** en la app
   - Descarga datos nuevos de Supabase → `readings_rows.csv`
   - Regenera candidatos y features
   - La app se recarga automáticamente con los datos frescos

2. O manualmente (para desarrollo):
   ```powershell
   # Desde el directorio fase_0_ruido/
   python 01_genera_candidatos.py
   python revisar_anotaciones_v2.py
   ```
   Luego refrescar la app en el browser.

---

## Cómo lanzar la app

```powershell
cd "d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Ciclo_Alpha_v2\fase_0_ruido"
streamlit run app_anotacion_av2.py
```

**No usar** `python app_anotacion_av2.py` — genera warnings de ScriptRunContext porque Streamlit necesita su propio runner.


---


<!-- ==== fusionado desde av2_01_ARQUITECTURA_Y_PIPELINE.md ==== -->

---
fase: 0
nombre: App de Anotación Alpha v2 + Motor Matemático v2
estado: activo
ciclo: Alpha v2
actualizado: 2026-06-28
---

# Fase 0 — App de Anotación y Motor Matemático v2

> **Objetivo original:** Caracterizar estadísticamente qué es "nada" —
> la distribución del sensor KPCL0034 en reposo.
>
> **Estado actual (2026-06-28):** La fase evolucionó en una app completa de
> anotación + análisis. El modelo de ruido quedó implícito en las 421
> anotaciones (categoría "ruido" = 167 eventos) y en las 102 features del
> Motor Matemático v2. Separación ruido vs alimentación: 1.63σ en
> `tpl_doble_rampa`.

---

## Lanzar la app

```powershell
cd "d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Ciclo_Alpha_v2\fase_0_ruido"
streamlit run app_anotacion_av2.py
```

### Navegación (lazy loading — solo el tab activo ejecuta su código)

| Tab | Nombre | Función |
|-----|--------|---------|
| 0 | 🌐 Vista Global | Serie temporal completa con bandas de anotaciones |
| 1 | 🔍 Revisar Candidatos | Anotar candidatos (cola, slider, formulario) |
| 2 | 📏 Analizar Curva | Estadísticas y distribuciones por categoría |
| 3 | 🔄 Comparar Curvas | Spaghetti overlay de curvas del mismo tipo |
| 4 | 📊 Panel de Features | Reglas emergentes y outliers por candidato |
| 5 | 🧮 Motor Matemático | 102 features v2 + Evidence Engine + Feature Atlas |
| 6 | 📋 Anotaciones | Lista completa guardada localmente |
| 7 | 🕐 Próxima Comida | Predictor estadístico (intervalos + modelo circadiano) |
| 8 | 🐱 Kittypau | Dashboard de bienestar Bandida (10 indicadores Sims) |

Cada tab muestra barra de progreso real 0→100% al cargar.

---

## Input

| Archivo | Ruta | Regla |
|---------|------|-------|
| `readings.csv` | `11_Data/2026/` | **NUNCA modificar.** 8,024 lecturas Abr 2026 |
| `readings_rows.csv` | `11_Data/2026/` | Append-only. 94,588 lecturas May–Jun 2026 |

## Artefactos generados

| Artefacto | Ruta | Estado al 2026-06-28 |
|-----------|------|----------------------|
| `candidatos_av2.csv` | `data/` | 421 candidatos · Abr 8 → Jun 27 |
| `anotaciones_av2.csv` | `data/` | 421 anot. (alim=209 / serv=45 / ruido=167) |
| `features_anotaciones_v2.csv` | `data/` | 417 filas × 109 cols |
| `comp_stats_v2.json` | `data/` | 102 features · µ/σ/n por categoría |
| `ciclos_servido_alimento.csv` | `data/` | 28 ciclos manuales de servido/alimento (Tab 7/8) |
| `_cache_lecturas_30s.parquet` | `data/` | Caché regenerable — se puede borrar |
| `umbrales.json` | `config/` | Umbrales detector (editables en Tab 4) |
| `data/backups/` | `data/backups/` | Backups diarios de anotaciones y ciclos (auto) |

---

## Motor Matemático v2

**Archivo:** `shape_features_v2.py`  
**Features:** 102 en 15 familias (F00–F14) — solo numpy + scipy  
**Importar:** `from shape_features_v2 import extraer_features, evidence_score`

**Mejor feature discriminativo:** `tpl_doble_rampa` (6.92σ sep. Alimentación vs Servido, medido sobre 814 anotaciones — actualizado 2026-08-16, ver [[av2_07_RESULTADOS_Y_BENCHMARKS]] snapshot v2.5)  
**Optimización aplicada (2026-06-28):** `_f08_lempel_ziv` O(n²) → O(n log n) con set-based LZ78  
**Fix aplicado (2026-08-10):** `evidence_score()` normaliza features (z-score) y calcula pesos desde los
datos en vez de usarlos crudos con pesos a mano — accuracy 49.6% → 78.8% (held-out). Ver
[av2_04_MOTOR_MATEMATICO.md §12bis](av2_04_MOTOR_MATEMATICO.md#12bis-actualización-2026-08-10--el-problema-real-no-eran-los-pesos-era-la-escala).

---

## Scripts de pipeline

| Script | Acción |
|--------|--------|
| `01_genera_candidatos.py` | Detecta eventos → `candidatos_av2.csv` |
| `revisar_anotaciones_v2.py` | Extrae 102 features por anotación → CSV + JSON stats |

**Botón "🔄 Actualizar Todo"** en la app: sync Supabase → ejecuta ambos scripts → invalida cachés → recarga.

---

## Estructura del directorio

```
fase_0_ruido/
├── app_anotacion_av2.py          ← App principal (streamlit run)
├── 01_genera_candidatos.py       ← Script 1: detecta eventos
├── revisar_anotaciones_v2.py     ← Script 2: extrae features y stats
├── shape_features_v2.py          ← Motor Matemático v2 (102 features)
├── supabase_client.py            ← Sync incremental desde Supabase
├── requirements_check.py         ← Verifica dependencias antes de arrancar
├── Documentacion/                 ← ARQUITECTURA_APP, ACTUALIZACION_DATA, HISTORIAL_RESULTADOS, RECOPILACION_DATOS_APP
├── config/
│   └── umbrales.json             ← Umbrales detector (editables en Tab 4)
├── data/
│   ├── anotaciones_av2.csv       ← CRÍTICO: etiquetas del operador
│   ├── candidatos_av2.csv        ← Generado por Script 1
│   ├── features_anotaciones_v2.csv ← Generado por Script 2
│   ├── comp_stats_v2.json        ← Generado por Script 2
│   ├── ciclos_servido_alimento.csv ← Ciclos manuales (Tab 7/8)
│   ├── _cache_lecturas_30s.parquet ← Caché regenerable
│   └── backups/                  ← Backups diarios automáticos (auto-generado)
├── Resultados/benchmark_data_abril_mayo_junio/  ← Análisis benchmark (referencia)
├── tests/                        ← Tests unitarios
└── 0A_exploracion/               ← Scripts de exploración inicial (no en pipeline activo)
    0B_deteccion_inactividad/
    0C_modelo_ruido/
```

> Los directorios `0A_`, `0B_` y `0C_` son la exploración inicial que derivó en el pipeline
> actual. Sus scripts no se ejecutan en producción pero se conservan como referencia metodológica.

---

## Ver también

- [av2_07_RESULTADOS_Y_BENCHMARKS.md](av2_07_RESULTADOS_Y_BENCHMARKS.md) — snapshots históricos por ingesta de datos
- [av2_01_ARQUITECTURA_Y_PIPELINE.md](av2_01_ARQUITECTURA_Y_PIPELINE.md) — pipeline completo y rutas críticas
- [av2_01_ARQUITECTURA_Y_PIPELINE.md](av2_01_ARQUITECTURA_Y_PIPELINE.md) — arquitectura de caché y responsabilidades por función


---


<!-- ==== fusionado desde av2_01_ARQUITECTURA_Y_PIPELINE.md ==== -->

# Flujo de Actualización de Data — Alpha v2

Documentación del botón **🔄 Actualizar Todo** y el pipeline de regeneración de artefactos.

---

## Botón "🔄 Actualizar Todo"

Ubicado en el encabezado de `app_anotacion_av2.py`, a la derecha del título.

**Qué hace:**

1. Detecta si hay datos nuevos comparando timestamps de archivos (sin cargar los CSV)
2. Si no hay nada nuevo → muestra aviso `"Sin datos nuevos — los artefactos ya están al día"`
3. Si hay CSV más nuevo que los candidatos → corre `01_genera_candidatos.py`
4. Siempre recalcula features si hay anotaciones más nuevas que el JSON de stats → corre `revisar_anotaciones_v2.py`
5. Limpia el cache de Streamlit (`st.cache_data.clear()`) y recarga la app

**Lógica de detección:**

| Condición | Acción |
|-----------|--------|
| `mtime(readings_rows.csv) > mtime(candidatos_av2.csv)` | Regenerar candidatos |
| `mtime(anotaciones_av2.csv) > mtime(comp_stats_v2.json)` | Recalcular features |
| Ninguna | Mostrar "Sin datos nuevos" |

---

## Rutas críticas

```
kittypau_2026_hivemq/
│
├── 11_Data/2026/                          ← DATA CRUDA (INPUT)
│   ├── readings.csv                            ← Abril 2026 (KPCL0034 UUID 1)
│   └── readings_rows.csv                       ← Mayo-Jun 2026 (KPCL0034 UUID 2)
│
└── Investigacion/Ciclo_Alpha_v2/fase_0_ruido/
    │
    ├── app_anotacion_av2.py                    ← APP PRINCIPAL (Streamlit)
    ├── 01_genera_candidatos.py                 ← SCRIPT 1: detecta eventos
    ├── revisar_anotaciones_v2.py               ← SCRIPT 2: extrae features y stats
    ├── shape_features_v2.py                    ← MOTOR MATEMÁTICO v2 (102 features)
    │
    ├── config/
    │   └── umbrales.json                       ← Umbrales de detección (editables en Tab 4)
    │
    └── data/                                   ← ARTEFACTOS GENERADOS (OUTPUT)
        ├── candidatos_av2.csv                  ← Eventos detectados (regenerado por Script 1)
        ├── anotaciones_av2.csv                 ← Etiquetas del operador (escrito por la app)
        ├── features_anotaciones_v2.csv         ← 102 features × anotación (regenerado por Script 2)
        ├── comp_stats_v2.json                  ← µ/σ/n por feature y categoría (regenerado por Script 2)
        ├── ciclos_servido_alimento.csv         ← Ciclos manuales de servido/alimento (Tab 7/8)
        └── backups/                            ← Backups diarios automáticos (generados por la app)
```

### UUIDs de KPCL0034 "Bandida" (food bowl)

```python
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026     → readings.csv
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo-Jun 2026  → readings_rows.csv
}
```

Todos los scripts filtran por estos UUIDs antes de procesar.

---

## Pipeline completo (paso a paso)

```
[Nueva data en readings_rows.csv]
            │
            ▼
   python 01_genera_candidatos.py
   ─────────────────────────────
   Lee readings.csv + readings_rows.csv
   Filtra KPCL0034_UUIDS
   Resamplea a 30s (ffill limit=2)
   Detecta actividad (rolling std + delta)
   Fusiona segmentos cercanos (<120s gap)
   Extrae 102 features por segmento (Motor v2)
   → data/candidatos_av2.csv  (421 filas al 2026-06-27)
            │
            ▼
   [Anotar nuevos candidatos en Tab 1 de la app]
            │
            ▼
   python revisar_anotaciones_v2.py
   ────────────────────────────────
   Lee anotaciones_av2.csv + lecturas crudas
   Extrae 102 features para cada anotación
   Calcula µ/σ/mediana/n por categoría
   → data/features_anotaciones_v2.csv  (filas × 109 cols)
   → data/comp_stats_v2.json           (102 features × 3 cats)
            │
            ▼
   [Botón "🔄 Actualizar Todo" en la app]
   ──────────────────────────────────────
   Detecta cambios por mtime
   Corre Script 1 si hay CSV nuevo
   Corre Script 2 si hay anotaciones nuevas
   load_comp_stats() recarga comp_stats_v2.json en memoria
   st.cache_data.clear() + st.rerun()
            │
            ▼
   [Tab 5 Motor Matemático — cuadro comparativo actualizado]
   COMP_STATS = cs_dict   ← 102 features desde JSON (ya no hardcodeado)
   Caption: "X anotaciones" ← dinámico (cs_n_alim + cs_n_serv + cs_n_ruido)
```

---

## Estado al 2026-06-28

| Artefacto | Estado |
|-----------|--------|
| `readings_rows.csv` | 94,588 filas KPCL0034 · 2026-05-23 → 2026-06-27 |
| `readings.csv` | 8,024 filas KPCL0034 · 2026-04-08 → 2026-05-23 |
| `candidatos_av2.csv` | 421 candidatos · Abr 8 → Jun 27 |
| `anotaciones_av2.csv` | 421 anotaciones (alim=209 / serv=45 / ruido=167) |
| `features_anotaciones_v2.csv` | 417 filas × 109 cols (4 pendientes de regenerar) |
| `comp_stats_v2.json` | 102 features · basado en 417 anotaciones |

> **Pendiente:** correr `revisar_anotaciones_v2.py` (o botón "🔄 Actualizar Todo") para actualizar
> features y comp_stats con las 4 anotaciones nuevas (alim pasó de 205→209).

---

## Funciones clave en app_anotacion_av2.py

| Función | Línea aprox. | Descripción |
|---------|-------------|-------------|
| `load_comp_stats()` | ~126 | Lee `comp_stats_v2.json` con cache. Devuelve `(dict, n_alim, n_serv, n_ruido)` |
| `_necesita_actualizacion()` | ~143 | Compara mtimes. Devuelve `(hay_raw_nueva, hay_anot_nuevas)` |
| `load_lecturas()` | ~180 | Lee y resamplea ambos CSV (cacheado) |
| `load_candidatos()` | ~207 | Lee `candidatos_av2.csv` |
| `load_anotaciones()` | ~218 | Lee `anotaciones_av2.csv` |

---

## Ver también

- [av2_07_RESULTADOS_Y_BENCHMARKS.md](av2_07_RESULTADOS_Y_BENCHMARKS.md) — snapshots históricos de métricas por ingesta
- [shape_features_v2.py](shape_features_v2.py) — Motor Matemático v2, 102 features en 15 familias


---
