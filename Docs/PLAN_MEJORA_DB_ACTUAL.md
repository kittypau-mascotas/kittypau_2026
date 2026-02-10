# Plan de mejora de base actual (Supabase)

## Objetivo
Mejorar la base actual sin romper el frontend ni el bridge. Se mantiene:
- readings como tabla de app.
- sensor_readings como tabla de telemetria cruda.
- devices.device_id (KPCL texto) y devices.id (UUID).

## Alcance
- Alinear columnas entre sensor_readings y readings.
- Robustecer el pipeline de ingestion.
- Mejorar indices y vistas de lectura.
- Agregar queries de verificacion de integridad.

## No se hace (por ahora)
- Cambios de arquitectura IoT (particiones o time-series).
- Eliminacion de tablas actuales.
- Cambios de nombres que rompan el frontend.

---

## Fase 0 — Seguridad antes de cambios
1. Backup o export de esquema.
2. Verificar conteos basicos:
   - select count(*) from devices;
   - select count(*) from sensor_readings;
   - select count(*) from readings;

---

## Fase 1 — Alinear esquema de readings con sensor_readings
Asegurar que readings tenga todos los campos que existen en sensor_readings:

```sql
alter table public.readings
  add column if not exists light_lux real,
  add column if not exists light_percent integer,
  add column if not exists light_condition text,
  add column if not exists device_timestamp text;
```

Indices recomendados (sin romper front):

```sql
create index if not exists idx_readings_device_time
  on public.readings (device_id, recorded_at desc);

create index if not exists idx_readings_pet_time
  on public.readings (pet_id, recorded_at desc);

create index if not exists idx_readings_ingested
  on public.readings (ingested_at desc);
```

---

## Fase 2 — Pipeline robusto (sensor_readings -> readings)
Objetivo: copiar datos crudos a readings para que la app lea una sola tabla.

Reglas:
- sensor_readings.device_id (KPCL texto) se mapea a devices.device_id.
- readings.device_id usa devices.id (UUID).
- pet_id se obtiene desde devices.pet_id.
- ingested_at = now().
- clock_invalid = true si device_timestamp no parsea.

Pseudo-SQL (a implementar en SQL Editor):

```sql
create or replace function public.sync_sensor_reading_to_readings()
returns trigger as $$
declare
  v_device_uuid uuid;
  v_pet_id uuid;
  v_clock_invalid boolean := false;
  v_ts timestamptz;
begin
  select id, pet_id into v_device_uuid, v_pet_id
  from public.devices
  where device_id = new.device_id;

  if v_device_uuid is null then
    return null; -- device desconocido, no insertar
  end if;

  begin
    v_ts := new.recorded_at;
  exception when others then
    v_ts := now();
    v_clock_invalid := true;
  end;

  insert into public.readings(
    id, device_id, pet_id, weight_grams, water_ml, temperature, humidity,
    battery_level, recorded_at, flow_rate, ingested_at, clock_invalid,
    light_lux, light_percent, light_condition, device_timestamp
  ) values (
    gen_random_uuid(), v_device_uuid, v_pet_id,
    new.weight_grams, new.water_ml, new.temperature, new.humidity,
    new.battery_level, v_ts, null, now(), v_clock_invalid,
    new.light_lux, new.light_percent, new.light_condition, new.device_timestamp
  );

  return null;
end;
$$ language plpgsql;

create trigger trg_sync_sensor_reading
  after insert on public.sensor_readings
  for each row execute function public.sync_sensor_reading_to_readings();
```

---

## Fase 3 — Backfill controlado (sin duplicar)
Si ya existe data en sensor_readings, copiar a readings solo si no existe:

```sql
insert into public.readings(
  id, device_id, pet_id, weight_grams, water_ml, temperature, humidity,
  battery_level, recorded_at, flow_rate, ingested_at, clock_invalid,
  light_lux, light_percent, light_condition, device_timestamp
)
select
  gen_random_uuid(), d.id, d.pet_id,
  sr.weight_grams, sr.water_ml, sr.temperature, sr.humidity,
  sr.battery_level, sr.recorded_at, null, sr.recorded_at, false,
  sr.light_lux, sr.light_percent, sr.light_condition, sr.device_timestamp
from public.sensor_readings sr
join public.devices d on d.device_id = sr.device_id
where not exists (
  select 1 from public.readings r
  where r.device_id = d.id and r.recorded_at = sr.recorded_at
);
```

---

## Fase 4 — Vistas para lectura rapida
Si la app usa latest_readings o device_summary, incluir nuevos campos:

```sql
create or replace view public.latest_readings as
select distinct on (device_id)
  device_id, pet_id, weight_grams, water_ml, temperature, humidity,
  battery_level, recorded_at, flow_rate, ingested_at, clock_invalid,
  light_lux, light_percent, light_condition, device_timestamp
from public.readings
order by device_id, recorded_at desc;
```

---

## Fase 5 — Validaciones de integridad (reporte)

```sql
-- readings sin device
select r.id, r.device_id
from public.readings r
left join public.devices d on d.id = r.device_id
where d.id is null;

-- sensor_readings sin device (KPCL)
select sr.id, sr.device_id
from public.sensor_readings sr
left join public.devices d on d.device_id = sr.device_id
where d.device_id is null;

-- devices sin pet
select d.id, d.device_id
from public.devices d
left join public.pets p on p.id = d.pet_id
where d.pet_id is not null and p.id is null;
```

---

## Impacto esperado
- Frontend sigue leyendo readings.
- Bridge sigue escribiendo sensor_readings.
- Se habilita visibilidad completa (luz y timestamp) en UI sin romper.

## Checklist de ejecucion
1. Fase 1 (schema + indices).
2. Fase 2 (trigger pipeline).
3. Fase 3 (backfill).
4. Fase 4 (vistas).
5. Fase 5 (integridad).
