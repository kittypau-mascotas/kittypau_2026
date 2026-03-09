-- Battery estimation support for KPCL without dedicated fuel gauge.
-- Adds optional voltage/source/state metadata while keeping legacy battery_level.

alter table public.readings
  add column if not exists battery_voltage numeric,
  add column if not exists battery_state text,
  add column if not exists battery_source text,
  add column if not exists battery_is_estimated boolean not null default false;

alter table public.devices
  add column if not exists battery_voltage numeric,
  add column if not exists battery_state text,
  add column if not exists battery_source text,
  add column if not exists battery_is_estimated boolean not null default false,
  add column if not exists battery_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'readings_battery_voltage_check'
  ) then
    alter table public.readings
      add constraint readings_battery_voltage_check
      check (
        battery_voltage is null
        or (battery_voltage >= 0 and battery_voltage <= 6)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'devices_battery_voltage_check'
  ) then
    alter table public.devices
      add constraint devices_battery_voltage_check
      check (
        battery_voltage is null
        or (battery_voltage >= 0 and battery_voltage <= 6)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'readings_battery_state_check'
  ) then
    alter table public.readings
      add constraint readings_battery_state_check
      check (
        battery_state is null
        or battery_state in ('optimal','medium','low','critical','charging','external_power','unknown')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'devices_battery_state_check'
  ) then
    alter table public.devices
      add constraint devices_battery_state_check
      check (
        battery_state is null
        or battery_state in ('optimal','medium','low','critical','charging','external_power','unknown')
      );
  end if;
end $$;

create index if not exists idx_readings_device_recorded_battery
  on public.readings (device_id, recorded_at desc)
  include (battery_level, battery_voltage, battery_state, battery_source, battery_is_estimated);
