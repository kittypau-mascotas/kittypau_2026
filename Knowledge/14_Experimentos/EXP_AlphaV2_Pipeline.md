---
id: exp_alphav2_pipeline
title: "EXP: Alpha v2 — Pipeline de Anotación y Motor Matemático"
type: experiment
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - experimento
  - alpha-v2
  - pipeline
  - motor-v2
  - anotacion
related:
  - [[00_HOME]]
  - [[13_Features/README_ShapeFeatures]]
  - [[15_Resultados/RESULT_AlphaV2_Snapshots]]
  - [[10_Datasets/README_Datasets]]
---

# EXP: Alpha v2 — Pipeline de Anotación y Motor Matemático

**Estado:** Activo  
**Período:** 2026-04-08 → presente  
**Dispositivo:** KPCL0034 "Bandida" (food bowl)

---

## Botón "🔄 Actualizar Todo"

Ubicado en el encabezado de `app_anotacion_av2.py`.

**Qué hace:**
1. Detecta si hay datos nuevos comparando timestamps de archivos (sin cargar los CSV)
2. Si no hay nada nuevo → muestra aviso `"Sin datos nuevos — los artefactos ya están al día"`
3. Si hay CSV más nuevo que los candidatos → corre `01_genera_candidatos.py`
4. Siempre recalcula features si hay anotaciones más nuevas que el JSON de stats → corre `revisar_anotaciones_v2.py`
5. Limpia el caché de Streamlit y recarga la app

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
│   ├── readings.csv                            ← Abril 2026 (KPCL0034 UUID 1)  ← NUNCA TOCAR
│   └── readings_rows.csv                       ← Mayo-Jun 2026 (KPCL0034 UUID 2)  ← append-only
│
└── Investigacion/Ciclo Alpha v2/fase_0_ruido/
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
        └── backups/                            ← Backups diarios automáticos
```

### UUIDs de KPCL0034 "Bandida"

```python
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026     → readings.csv
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo-Jun 2026  → readings_rows.csv
}
```

---

## Pipeline completo

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
```

---

## Estado de artefactos al 2026-06-28

| Artefacto | Estado |
|-----------|--------|
| `readings_rows.csv` | 94,588 filas KPCL0034 · 2026-05-23 → 2026-06-27 |
| `readings.csv` | 8,024 filas KPCL0034 · 2026-04-08 → 2026-05-23 |
| `candidatos_av2.csv` | 421 candidatos · Abr 8 → Jun 27 |
| `anotaciones_av2.csv` | 421 anotaciones (alim=209 / serv=45 / ruido=167) |
| `features_anotaciones_v2.csv` | 417 filas × 109 cols (4 pendientes de regenerar) |
| `comp_stats_v2.json` | 102 features · basado en 417 anotaciones |

> **Pendiente:** correr `revisar_anotaciones_v2.py` (o botón "🔄 Actualizar Todo") para cerrar
> snapshot v2.2 con alim=209.

---

## Categorías de anotación

| Categoría | Emoji | Color | Descripción |
|-----------|-------|-------|-------------|
| `alimentacion` | 🍽️ | `#00b45a` | Bandida comiendo |
| `servido` | 🫙 | `#1e64ff` | Llenado del plato |
| `ruido` | ⚡ | `#ef4444` | Falsa actividad (descartado) |
| `ciclo_servido_alimento` | 🟡 | `#facc15` | Ciclo completo servido+alimento |

---

## Lanzar la app

```powershell
cd "d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Ciclo Alpha v2\fase_0_ruido"
python -m streamlit run app_anotacion_av2.py
```

### Tabs de la app (lazy loading)

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

---

## Funciones clave en app_anotacion_av2.py

| Función | Línea aprox. | Descripción |
|---------|-------------|-------------|
| `load_comp_stats()` | ~126 | Lee `comp_stats_v2.json`. Devuelve `(dict, n_alim, n_serv, n_ruido)` |
| `_necesita_actualizacion()` | ~143 | Compara mtimes. Devuelve `(hay_raw_nueva, hay_anot_nuevas)` |
| `load_lecturas()` | ~180 | Lee y resamplea ambos CSV (3 capas de caché) |
| `load_candidatos()` | ~207 | Lee `candidatos_av2.csv` |
| `load_anotaciones()` | ~218 | Lee `anotaciones_av2.csv` |
| `_ciclo_composicion_cards()` | ~507 | 3 tarjetas HTML de composición de ciclo |
| `_batch_metricas()` | ~551 | Pre-computa métricas por categoría |
| `_intervalos_validos_alim()` | ~560 | Intervalos entre alimentaciones filtrados |

---

## Ver también

- [[15_Resultados/RESULT_AlphaV2_Snapshots]]
- [[13_Features/README_ShapeFeatures]]
- [[10_Datasets/README_Datasets]]
