# Análisis Estadístico, ML e IA — Índice (KittyPau)

Carpeta para ordenar el trabajo de **analítica estadística**, **Machine Learning** e **IA aplicada a producto**.

Documentos canónicos a respetar:
- Arquitectura de datos/ML (canon): `Docs/KittyPau_Arquitectura_Datos_v3.md`
- Inventario por capas: `Docs/CAPAS_DATOS_ANALITICA_ML_IA.md`
- Transformaciones (`log10` + FFT): `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`
- Fórmulas y eventos: `Docs/MODELO_DATOS_IA_FORMULAS_KITTYPAU.md`

---

## Contenido

1. `01_OBJETIVOS_Y_PREGUNTAS.md` — preguntas de producto/operación y cómo se miden
2. `02_CALIDAD_DATOS.md` — checks, frescura, missing rate, outliers, coherencia temporal (`effective_ts`)
3. `03_FEATURES_Y_LABELS.md` — features, etiquetas (labels), y datasets de entrenamiento
4. `04_BASELINES_ESTADISTICOS.md` — MAD/IQR/z-score, pruebas no paramétricas, FFT/rutinas
5. `05_EVALUACION_Y_METRICAS.md` — métricas ML + métricas de negocio relacionadas
6. `06_MLOPS_VERSIONADO_Y_BACKFILLS.md` — versionado (schema/features/modelos), re-runs, backfills
7. `07_INSIGHTS_Y_UX.md` — cómo convertir resultados en insights accionables

## Subcarpetas

- `sql/README.md` — vistas/queries para features, calidad y reportes
- `notebooks/README.md` — notebooks y convenciones
- `datasets/README.md` — convenciones de datasets (no subir datos sensibles)
- `infra/README.md` — integración de infra/data products (ej. `supabase-analytics/`)

## Runbook (ejecución)

- `00_RUNBOOK_EJECUCION.md` — pasos para correr el análisis total (scope=`all`) y troubleshooting.

## Integraciones (este repo)

- `supabase-analytics/` es un **proyecto Supabase separado** (DB de analítica procesada). Ver `infra/supabase-analytics.md`.
