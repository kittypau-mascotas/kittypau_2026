# SQL Assertions (KViejos)

Objetivo: validar schema, constraints e indices minimos rapidamente.

## 1) Tablas core existen
```sql
select relname
from pg_class
where relkind = 'r'
  and relnamespace = 'public'::regnamespace
  and relname in (
    'households','residents','contacts','sensors',
    'events','alert_rules','alerts','acknowledgements','audit_events'
  )
order by relname;
```

Esperado: 9 filas.

## 2) RLS habilitado
```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('households','residents','contacts','sensors','events','alert_rules','alerts','acknowledgements','audit_events')
order by relname;
```

Esperado: `relrowsecurity = true` en todas.

## 3) Indices minimos
```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_residents_household',
    'idx_contacts_household',
    'ux_contacts_primary_per_household',
    'idx_sensors_household',
    'idx_sensors_household_status',
    'idx_sensors_resident',
    'idx_events_household_recorded',
    'idx_events_sensor_recorded',
    'idx_events_resident_recorded',
    'idx_alert_rules_household_enabled',
    'idx_alerts_household_status'
  )
order by indexname;
```

Esperado: 11 filas.

## 4) Constraints de enums (checks)
```sql
select conname, pg_get_constraintdef(c.oid) as def
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relnamespace = 'public'::regnamespace
  and t.relname in ('sensors','events','alerts','contacts','alert_rules')
  and c.contype = 'c'
order by t.relname, conname;
```

Esperado: checks para `sensors.sensor_type`, `sensors.status`, `events.event_type`, `events.severity`, `alerts.status`, `contacts.channel`, `alert_rules.rule_type`.

## 5) Triggers de updated_at
```sql
select
  tgname,
  tgrelid::regclass as table_name
from pg_trigger
where tgname like 'trg_kviejos_%_updated_at'
order by tgname;
```

Esperado: 6 filas (households, residents, contacts, sensors, alert_rules, alerts).
