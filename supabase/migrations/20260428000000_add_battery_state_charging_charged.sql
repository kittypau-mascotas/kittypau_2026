-- Amplía los valores permitidos de battery_state para incluir
-- 'battery_only' (firmware v2.0) y 'charged' (TP4056 STDBY=LOW).
-- Los valores previos (optimal, medium, low, critical, charging, external_power, unknown)
-- se conservan para compatibilidad con registros históricos.

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'readings_battery_state_check'
  ) then
    alter table public.readings drop constraint readings_battery_state_check;
  end if;

  alter table public.readings
    add constraint readings_battery_state_check
    check (
      battery_state is null
      or battery_state in (
        'optimal','medium','low','critical',
        'charging','charged',
        'battery_only',
        'external_power','unknown'
      )
    );

  if exists (
    select 1 from pg_constraint where conname = 'devices_battery_state_check'
  ) then
    alter table public.devices drop constraint devices_battery_state_check;
  end if;

  alter table public.devices
    add constraint devices_battery_state_check
    check (
      battery_state is null
      or battery_state in (
        'optimal','medium','low','critical',
        'charging','charged',
        'battery_only',
        'external_power','unknown'
      )
    );
end $$;
