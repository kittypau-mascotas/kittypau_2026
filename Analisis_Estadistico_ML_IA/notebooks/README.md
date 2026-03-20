# Jupyter Notebooks (Análisis/ML/IA)

Carpeta de notebooks para exploración estadística, prototipos de features y validación de hipótesis.

Referencias:
- Índice de análisis: `Analisis_Estadistico_ML_IA/INDEX.md`
- Runbook: `Analisis_Estadistico_ML_IA/00_RUNBOOK_EJECUCION.md`
- Arquitectura canon de datos/ML: `Docs/KittyPau_Arquitectura_Datos_v3.md`
- Calidad de datos: `Analisis_Estadistico_ML_IA/02_CALIDAD_DATOS.md`

Convenciones:
- No incluir secretos ni datos sensibles.
- No commitear datasets grandes ni exportar PII.
- Nombrar por fecha + objetivo (ej. `2026-03-20_baselines_mad.ipynb`).

## Variables de entorno (recomendado)
Usar el template `Analisis_Estadistico_ML_IA/notebooks/.env.notebook.local.example` y crear `Analisis_Estadistico_ML_IA/notebooks/.env.notebook.local` (ignorado por git):
- `ANALYSIS_SCOPE=all` (o `pet`)
- `WINDOW_DAYS=30`
- `SUPABASE_MAIN_URL=https://<PROJECT_REF_MAIN>.supabase.co`
- `SUPABASE_MAIN_SERVICE_ROLE_KEY=...` (service_role del proyecto main; JWT `eyJ...` recomendado si hay 401)
- (opcional) `SUPABASE_ANALYTICS_URL=https://<PROJECT_REF_ANALYTICS>.supabase.co`
- (opcional) `SUPABASE_ANALYTICS_SERVICE_ROLE_KEY=...` (service_role del proyecto analytics)
- (solo si `ANALYSIS_SCOPE=pet`) `PET_ID=<uuid>`

Nota importante sobre keys:
- Si estás usando keys tipo `sb_secret_...` y recibes `401 Invalid API key`, usa la `service_role` JWT (`eyJ...`) desde Supabase Dashboard → Project Settings → API → Project API keys.

## Chequeo CLI (sin instalar global)
- Listar proyectos: `npx supabase projects list`
- Ver project-ref linkeado (main): `Get-Content supabase/.temp/project-ref`

## Dependencias (opcional)
- Instalar desde archivo: `pip install -r Analisis_Estadistico_ML_IA/notebooks/requirements.txt`

## Seguridad
- Si alguna `service_role` key estuvo en un notebook/commit, **rotarla** en Supabase Dashboard (Settings → API → Roll keys) y actualizar `.env.notebook.local`.
