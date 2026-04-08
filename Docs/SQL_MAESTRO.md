# SQL Maestro — Kittypau

Índice de documentos SQL en orden de lectura/ejecución.

---

## Paso 1 — Schema base
- [SQL_SCHEMA.sql](SQL_SCHEMA.sql) — Schema oficial completo (ejecutar primero en Supabase)
- [GUIA_SQL_SUPABASE.md](GUIA_SQL_SUPABASE.md) — Cómo ejecutar el schema en Supabase

## Paso 2 — Schemas adicionales
- [SQL_FINANZAS_KITTYPAU.sql](SQL_FINANZAS_KITTYPAU.sql) — Tablas de finanzas
- [SQL_STORAGE_POLICIES_kittypau_photos.sql](SQL_STORAGE_POLICIES_kittypau_photos.sql) — Políticas de Storage

## Paso 3 — Diseño y decisiones
- [PLAN_SQL_ESTRUCTURA.md](PLAN_SQL_ESTRUCTURA.md) — Decisiones de diseño: enums, triggers, constraints, índices
- [ENUMS_OFICIALES.md](ENUMS_OFICIALES.md) — Enumeraciones permitidas en el schema
- [PARTICIONES_READINGS.md](PARTICIONES_READINGS.md) — Estrategia de particionamiento por tiempo para sensor_readings

## Paso 4 — Mejoras y migraciones
- [PLAN_MEJORA_DB_ACTUAL.md](PLAN_MEJORA_DB_ACTUAL.md) — Fases de mejora sin romper datos (índices, vistas, backfill)
- [GUIA_MIGRACION_SQL.md](GUIA_MIGRACION_SQL.md) — Cómo migrar schema sin perder datos
- [RASPBERRY_INTEGRATION_PLAN.md](RASPBERRY_INTEGRATION_PLAN.md) — Columnas y vistas requeridas por el bridge (wifi_status, ip_history, etc.)

## Paso 5 — Validación y limpieza
- [SQL_ASSERTS.md](SQL_ASSERTS.md) — Queries de validación del schema
- [SQL_CHECK_BRIDGE_UNIQUENESS.sql](SQL_CHECK_BRIDGE_UNIQUENESS.sql) — Check de unicidad del bridge
- [CLEANUP_SQL.sql](CLEANUP_SQL.sql) — Queries de limpieza de datos


