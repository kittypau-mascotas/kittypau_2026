# SQL Maestro - KViejos

Indice de documentos SQL en orden de lectura/ejecucion.

---

## Paso 1 - Schema base
- [SQL_SCHEMA.sql](SQL_SCHEMA.sql) - Schema v1 (para proyecto KViejos)
- [GUIA_SQL_SUPABASE.md](GUIA_SQL_SUPABASE.md) - Como ejecutar schema/migraciones en Supabase

## Paso 2 - Diseno y decisiones
- [PLAN_SQL_ESTRUCTURA.md](PLAN_SQL_ESTRUCTURA.md) - Decisiones: constraints, indices, RLS, eventos/alertas
- [ENUMS_OFICIALES.md](ENUMS_OFICIALES.md) - Enumeraciones y valores permitidos
- [PARTICIONES_EVENTS.md](PARTICIONES_EVENTS.md) - Estrategia de crecimiento para eventos (por tiempo)

## Paso 3 - Migraciones versionadas
- Carpeta: `supabase_kviejos/migrations/`
- Orden sugerido:
  - `20260310130000_kviejos_schema_v1.sql`
  - `20260310131000_kviejos_rls_and_indexes_v1.sql`

## Paso 4 - Validacion
- [SQL_ASSERTS.md](SQL_ASSERTS.md) - Queries para validar schema y datos base

## Nota importante
KViejos usa un folder de DB separado para no mezclar migraciones con Kittypau:
- `supabase_kviejos/` (KViejos)
- `supabase/` (Kittypau)

