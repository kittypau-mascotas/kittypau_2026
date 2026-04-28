-- ============================================================
-- Automatic battery cycle tracking for Kittypau
-- ============================================================
-- This trigger watches readings and opens/closes rows in
-- public.device_battery_cycles whenever battery telemetry indicates:
--   - charging / external power
--   - full charge
--   - battery-only usage
--   - transition back to charging (cycle close + new cycle open)
-- ============================================================

create or replace function public.sync_device_battery_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_uuid uuid;
  v_device_code text;
  v_device_type text;
  v_device_status text;
  v_device_state text;
  v_ts timestamptz;
  v_battery_state text;
  v_battery_source text;
  v_is_charging boolean;
  v_is_external boolean;
  v_is_battery_only boolean;
  v_has_open_cycle boolean := false;
  v_open_cycle public.device_battery_cycles%rowtype;
begin
  -- Only act when at least one battery-related signal is present.
  if new.battery_level is null
     and new.battery_voltage is null
     and new.battery_state is null
     and new.battery_source is null then
    return new;
  end if;

  select
    d.id,
    d.device_id,
    d.device_type,
    d.status,
    d.device_state
  into
    v_device_uuid,
    v_device_code,
    v_device_type,
    v_device_status,
    v_device_state
  from public.devices d
  where d.id = new.device_id
  limit 1;

  if v_device_uuid is null then
    return new;
  end if;

  v_ts := coalesce(
    case
      when coalesce(new.clock_invalid, false) then new.ingested_at
      else new.recorded_at
    end,
    new.recorded_at,
    new.ingested_at,
    now()
  );

  v_battery_state := nullif(new.battery_state, '');
  v_battery_source := nullif(new.battery_source, '');
  v_is_charging := (v_battery_state = 'charging');
  v_is_external := (v_battery_source = 'external_power');
  v_is_battery_only := not v_is_charging and not v_is_external
    and (
      new.battery_level is not null
      or v_battery_state in ('optimal', 'medium', 'low', 'critical', 'unknown')
    );

  select *
  into v_open_cycle
  from public.device_battery_cycles c
  where c.device_uuid = v_device_uuid
    and c.cycle_end_at is null
  order by c.cycle_start_at desc
  limit 1
  for update;

  v_has_open_cycle := found;

  -- 1) If energy is back on, close the active battery-only cycle first.
  if v_is_charging or v_is_external then
    if v_has_open_cycle then
      if v_open_cycle.battery_only_start_at is not null and v_open_cycle.cycle_status = 'battery_only' then
        update public.device_battery_cycles
        set
          battery_only_end_at = coalesce(battery_only_end_at, v_ts),
          cycle_end_at = coalesce(cycle_end_at, v_ts),
          total_duration_seconds = coalesce(total_duration_seconds, extract(epoch from v_ts - cycle_start_at)::numeric(12,3)),
          battery_only_duration_seconds = case
            when battery_only_start_at is not null then extract(epoch from coalesce(battery_only_end_at, v_ts) - battery_only_start_at)::numeric(12,3)
            else battery_only_duration_seconds
          end,
          cycle_status = 'closed',
          updated_at = now()
        where id = v_open_cycle.id;

        v_has_open_cycle := false;
      end if;
    end if;

    -- 2) Start or continue a charging cycle.
    if not v_has_open_cycle then
      insert into public.device_battery_cycles (
        device_uuid,
        device_code,
        device_label,
        device_type,
        device_status,
        device_state,
        cycle_status,
        cycle_start_at,
        charging_start_at,
        battery_level_at_start,
        battery_voltage_at_start,
        battery_state_at_start,
        battery_source_at_start,
        readings_count,
        charging_samples,
        summary,
        notes,
        created_at,
        updated_at
      )
      values (
        v_device_uuid,
        v_device_code,
        v_device_code,
        v_device_type,
        v_device_status,
        v_device_state,
        case when v_is_charging or v_is_external then 'charging' else 'open' end,
        v_ts,
        case when v_is_charging or v_is_external then v_ts else null end,
        new.battery_level,
        new.battery_voltage,
        v_battery_state,
        v_battery_source,
        1,
        case when v_is_charging or v_is_external then 1 else 0 end,
        jsonb_build_object(
          'source', 'readings_trigger',
          'event', case when v_is_charging then 'charging' when v_is_external then 'external_power' else 'start' end
        ),
        'Battery cycle opened automatically from readings.',
        now(),
        now()
      );
    else
      update public.device_battery_cycles
      set
        cycle_status = case when v_is_charging or v_is_external then 'charging' else cycle_status end,
        charging_start_at = coalesce(charging_start_at, case when v_is_charging or v_is_external then v_ts else null end),
        battery_level_at_start = coalesce(battery_level_at_start, new.battery_level),
        battery_voltage_at_start = coalesce(battery_voltage_at_start, new.battery_voltage),
        battery_state_at_start = coalesce(battery_state_at_start, v_battery_state),
        battery_source_at_start = coalesce(battery_source_at_start, v_battery_source),
        battery_level_at_end = new.battery_level,
        battery_voltage_at_end = new.battery_voltage,
        battery_state_at_end = v_battery_state,
        battery_source_at_end = v_battery_source,
        readings_count = coalesce(readings_count, 0) + 1,
        charging_samples = coalesce(charging_samples, 0) + case when v_is_charging or v_is_external then 1 else 0 end,
        battery_only_samples = coalesce(battery_only_samples, 0),
        battery_level_at_full_charge = case
          when new.battery_level = 100 then coalesce(battery_level_at_full_charge, new.battery_level)
          else battery_level_at_full_charge
        end,
        battery_voltage_at_full_charge = case
          when new.battery_level = 100 then coalesce(battery_voltage_at_full_charge, new.battery_voltage)
          else battery_voltage_at_full_charge
        end,
        battery_state_at_full_charge = case
          when new.battery_level = 100 then coalesce(battery_state_at_full_charge, v_battery_state)
          else battery_state_at_full_charge
        end,
        battery_source_at_full_charge = case
          when new.battery_level = 100 then coalesce(battery_source_at_full_charge, v_battery_source)
          else battery_source_at_full_charge
        end,
        full_charge_at = case
          when new.battery_level = 100 then coalesce(full_charge_at, v_ts)
          else full_charge_at
        end,
        total_duration_seconds = case
          when cycle_end_at is not null and cycle_start_at is not null
            then extract(epoch from cycle_end_at - cycle_start_at)::numeric(12,3)
          else total_duration_seconds
        end,
        summary = jsonb_set(
          coalesce(summary, '{}'::jsonb),
          '{last_event}',
          to_jsonb((case when v_is_charging then 'charging' when v_is_external then 'external_power' else 'battery_only' end)::text),
          true
        ),
        updated_at = now()
      where id = v_open_cycle.id;
    end if;

    return new;
  end if;

  -- 3) Battery-only usage starts when we are no longer on external power.
  if v_is_battery_only then
    if not v_has_open_cycle then
      insert into public.device_battery_cycles (
        device_uuid,
        device_code,
        device_label,
        device_type,
        device_status,
        device_state,
        cycle_status,
        cycle_start_at,
        unplugged_at,
        battery_only_start_at,
        battery_level_at_start,
        battery_voltage_at_start,
        battery_state_at_start,
        battery_source_at_start,
        readings_count,
        battery_only_samples,
        summary,
        notes,
        created_at,
        updated_at
      )
      values (
        v_device_uuid,
        v_device_code,
        v_device_code,
        v_device_type,
        v_device_status,
        v_device_state,
        'battery_only',
        v_ts,
        v_ts,
        v_ts,
        new.battery_level,
        new.battery_voltage,
        v_battery_state,
        v_battery_source,
        1,
        1,
        jsonb_build_object(
          'source', 'readings_trigger',
          'event', 'battery_only_start'
        ),
        'Battery-only usage started automatically from readings.',
        now(),
        now()
      );
    else
      update public.device_battery_cycles
      set
        battery_only_start_at = coalesce(battery_only_start_at, v_ts),
        unplugged_at = coalesce(unplugged_at, v_ts),
        cycle_status = 'battery_only',
        battery_level_at_end = new.battery_level,
        battery_voltage_at_end = new.battery_voltage,
        battery_state_at_end = v_battery_state,
        battery_source_at_end = v_battery_source,
        battery_only_samples = coalesce(battery_only_samples, 0) + 1,
        readings_count = coalesce(readings_count, 0) + 1,
        summary = jsonb_set(
          coalesce(summary, '{}'::jsonb),
          '{last_event}',
          to_jsonb('battery_only'::text),
          true
        ),
        updated_at = now()
      where id = v_open_cycle.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_device_battery_cycle on public.readings;

create trigger trg_sync_device_battery_cycle
after insert or update of battery_level, battery_voltage, battery_state, battery_source, recorded_at, ingested_at, clock_invalid
on public.readings
for each row
execute function public.sync_device_battery_cycle();

