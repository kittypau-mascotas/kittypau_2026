# SQL Assertions (Kittypau)

Objetivo: Validar schema, constraints y datos base de forma rÃ¡pida en Supabase.

## 1) Columnas crÃ­ticas existen
```sql
select
  table_name,
  column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'profiles' and column_name in ('user_onboarding_step')) or
    (table_name = 'pets' and column_name in ('pet_onboarding_step')) or
    (table_name = 'readings' and column_name in ('flow_rate'))
  )
order by table_name, column_name;
```

Esperado: 3 filas.

---

## 2) Constraints de enums
```sql
select conname, pg_get_constraintdef(c.oid) as def
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname in ('pets','devices')
  and c.contype = 'c'
order by t.relname, conname;
```

Esperado:
- `pets.type` in ('cat','dog')
- `pets.pet_state` in ('created','completed_profile','device_pending','device_linked','inactive','archived')
- `devices.device_type` in ('food_bowl','water_bowl')
- `devices.status` in ('active','inactive','maintenance')
- `devices.device_state` in ('factory','claimed','linked','offline','lost','error')

---

## 3) Ãndices mÃ­nimos
```sql
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_pets_user_id',
    'idx_devices_owner_id',
    'idx_readings_device_id',
    'idx_readings_recorded_at',
    'idx_pet_breeds_pet_id',
    'idx_devices_pet_id'
  )
order by indexname;
```

Esperado: 6 filas.

---

## 4) RLS habilitado en tablas core
```sql
select relname, relrowsecurity
from pg_class
where relname in ('profiles','pets','devices','readings','breeds','pet_breeds')
order by relname;
```

Esperado: `relrowsecurity = true` en todas.

---

## 5) PolÃ­ticas RLS registradas
```sql
select
  schemaname,
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','pets','devices','readings','breeds','pet_breeds')
order by tablename, policyname;
```

Esperado: policies definidas en `Docs/SQL_SCHEMA.sql`.

---

## 6) Trigger de devices por lectura
```sql
select
  tgname,
  tgrelid::regclass as table_name
from pg_trigger
where tgname = 'trg_update_device_from_reading';
```

Esperado: 1 fila en `public.readings`.


## Checks adicionales (consistencia de onboarding)
- Validar constraint `devices_device_code_format_check`.
- Validar constraint `profiles_onboarding_step_check`.
- Validar constraint `pets_onboarding_step_check`.
