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
cd "d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\09_Investigacion\Ciclo Alpha v2\fase_0_ruido"
streamlit run app_anotacion_av2.py
```

**No usar** `python app_anotacion_av2.py` — genera warnings de ScriptRunContext porque Streamlit necesita su propio runner.
