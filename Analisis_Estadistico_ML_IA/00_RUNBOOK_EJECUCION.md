# Runbook — Análisis Total (KittyPau)

Objetivo: ejecutar el análisis con **toda la base** (scope=`all`) de forma reproducible, sin depender del CWD de Jupyter y detectando temprano errores de credenciales/schema/datos.

## 1) Pre-requisitos

- VSCode con soporte de Jupyter Notebook.
- Python 3.11+ recomendado.
- Paquetes (una vez por entorno):
  - `pip install supabase python-dotenv pandas numpy matplotlib seaborn scipy scikit-learn plotly`

## 2) Variables de entorno (notebooks)

1) Copia `Analisis_Estadistico_ML_IA/notebooks/.env.notebook.local.example` a `Analisis_Estadistico_ML_IA/notebooks/.env.notebook.local`.
2) Completa valores:
   - `SUPABASE_MAIN_URL`
   - `SUPABASE_MAIN_SERVICE_ROLE_KEY` (**sb_secret_*** o JWT legacy `eyJ...`)
   - (opcional) `SUPABASE_ANALYTICS_URL`
   - (opcional) `SUPABASE_ANALYTICS_SERVICE_ROLE_KEY`
   - `ANALYSIS_SCOPE=all`
   - `WINDOW_DAYS=30` (ajusta según necesidad)
   - `PAGE_SIZE`, `MAX_ROWS`

Notas:
- Error `401 Invalid API key` casi siempre es **URL+KEY de proyectos distintos** o key mal copiada.
- Para análisis total, usa key privilegiada (`sb_secret_*` o JWT `eyJ...`), no `sb_publishable_*`.

## 3) Orden de ejecución recomendado (notebook)

En `Analisis_Estadistico_ML_IA/notebooks/KittyPau_ML_Analysis.ipynb`:

1) **ENV + Supabase clients** (carga `.env.notebook.local` y crea `supabase_main`/`supabase_analytics`)
2) **Schema checks (MAIN + ANALYTICS)** (debe imprimir `OK devices`, `OK readings`, `OK pet_sessions`, `OK pet_daily_summary`)
3) **Dispositivos** (`df_devices`)
4) **Readings** (`df_raw` con ventana `WINDOW_DAYS`)
5) **Data availability checks** (verifica si `weight_grams`/`water_ml` vienen con datos)
6) **Derivadas (KittyPau)** (crea `df` con `effective_ts`, deltas, tasas y logs)
7) **Sesiones + resumen diario (Analytics)** (`df_sessions` + `df_daily`) — recomendado como “fuente procesada”
8) **Baselines** (elige automáticamente la mejor fuente: readings → daily → sessions)
9) Plots / insights / métricas

## 4) Si `readings` no trae métricas (caso típico)

Síntoma:
- `df_raw` tiene filas, pero `weight_grams` y `water_ml` llegan 100% nulos.

Acción:
- Usa `df_daily` (pet_daily_summary) y/o `df_sessions` (pet_sessions) para baselines, tendencias y alertas.
- Revisa el pipeline de ingesta/ETL que debería poblar `readings` o confirmar que `readings` es “raw” y la verdad analítica vive solo en Analytics.

## 5) SQL rápido de diagnóstico

Ver `Analisis_Estadistico_ML_IA/sql/01_data_availability.sql`.

