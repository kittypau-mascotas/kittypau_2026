# Guia SQL Supabase - KViejos

Objetivo: ejecutar el schema y migraciones de KViejos en un proyecto Supabase dedicado.

## Opcion A (recomendada): Supabase CLI + migrations
1. Instala Supabase CLI
2. Inicia un proyecto Supabase (KViejos)
3. Desde el root del repo:
   - copia/usa la carpeta `supabase_kviejos/` como tu carpeta `supabase/` del proyecto KViejos
   - aplica migraciones con:
     - `supabase db push`

Nota: este repo mantiene `supabase/` para Kittypau. KViejos vive en `supabase_kviejos/` para evitar colisiones.

## Opcion B: ejecutar SQL_SCHEMA.sql manualmente (solo MVP local)
1. En Supabase Studio -> SQL Editor
2. Ejecuta `docs_kviejos/SQL_SCHEMA.sql`
3. Ejecuta `docs_kviejos/SQL_ASSERTS.md` para validar

Riesgo: pierdes trazabilidad de migraciones si no usas el directorio `migrations/`.

