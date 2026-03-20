# Checklist — Conexión Supabase (análisis)

## 1) CLI
- `npx supabase projects list` muestra:
  - main: `zgwqtzazvkjkfocxnxsh`
  - analytics: `spfonxnyprjqxcxaqsbe`
- Main linkeado en repo: `supabase/.temp/project-ref` = `zgwqtzazvkjkfocxnxsh`

## 2) Notebook (sin secretos hardcodeados)
- Variables en `Analisis_Estadistico_ML_IA/notebooks/.env.notebook.local` (no commitear)
- Template: `Analisis_Estadistico_ML_IA/notebooks/.env.notebook.local.example`
- `ANALYSIS_SCOPE=all` para analizar “toda la base” (sin `PET_ID`)

## 3) Analytics (si se usa)
- URL: `https://spfonxnyprjqxcxaqsbe.supabase.co`
- Key: `SUPABASE_ANALYTICS_SERVICE_ROLE_KEY` (service_role)
- Link del proyecto (requiere password Postgres, no pasarlo por CLI en texto compartido):
  - `cd supabase-analytics`
  - `npx supabase link --project-ref spfonxnyprjqxcxaqsbe`
  - `npx supabase db push`

## 4) Rotación de credenciales
- Si alguna `service_role` key se filtró en notebook/commit/log: **rotar** en Dashboard y reemplazar en `.env.notebook.local`.
- Si recibes `401 Invalid API key` usando `sb_secret_...`, cambia a `service_role` JWT (`eyJ...`) del mismo proyecto.
