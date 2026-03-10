# Guia Migracion SQL - KViejos

Objetivo: evolucionar el schema sin romper datos ni despliegues.

## Reglas
1. Migraciones idempotentes:
   - `create table if not exists`
   - `add column if not exists`
   - `create index if not exists`
2. Evitar deletes destructivos sin plan de backfill.
3. Siempre agregar asserts en `SQL_ASSERTS.md` cuando se agrega un campo critico.

## Naming
- `YYYYMMDDHHMMSS_descripcion.sql`
- Ejemplo: `20260310131000_kviejos_rls_and_indexes_v1.sql`

