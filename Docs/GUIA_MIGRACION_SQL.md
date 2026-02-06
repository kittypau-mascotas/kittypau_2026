# Guia de Migracion SQL (Kittypau)

## Objetivo
Actualizar esquema sin perder datos existentes.

---

## Escenario A: proyecto limpio (sin datos)
1. Ejecutar `Docs/SQL_SCHEMA.sql` en Supabase.
2. Verificar tablas y RLS.

---

## Escenario B: proyecto con datos
1. No ejecutar SQL completo directo.
2. Crear un script de migracion:
   - Agregar columnas nuevas en `readings` (ej. `flow_rate`).
   - Crear tablas `breeds` y `pet_breeds` (si no existen).
   - Agregar estados nuevos en checks (`pet_state`, `device_state`, `status`).
   - Preparar `devices.pet_id` obligatorio:
     - Crear al menos 1 `pet` por usuario.
     - Asignar `pet_id` a todos los `devices` existentes.
     - Luego aplicar `ALTER TABLE devices ALTER COLUMN pet_id SET NOT NULL`.
   - Crear trigger `update_device_from_reading`.
   - Agregar campos de onboarding:
     - `profiles.user_onboarding_step`
     - `pets.pet_onboarding_step`
3. Ejecutar migracion por pasos y validar.

---

## SQL propuesto (onboarding)
```sql
alter table public.profiles
  add column if not exists user_onboarding_step text default 'not_started';

alter table public.pets
  add column if not exists pet_onboarding_step text default 'not_started';
```

---

## Checklist de migracion
- [ ] Respaldo de datos (export o snapshot).
- [ ] Agregar columnas nuevas con `ALTER TABLE`.
- [ ] Poblar valores por defecto.
- [ ] Actualizar RLS si hay cambios de columnas.
- [ ] Verificar integridad.

---

## Nota
Hasta que se decida migracion, no aplicar el SQL completo.
