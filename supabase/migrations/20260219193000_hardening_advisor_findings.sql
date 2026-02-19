-- Hardening based on Supabase Advisor findings (security + performance)

-- 1) RLS on legacy sensor_readings (if table exists)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'sensor_readings'
  ) then
    execute 'alter table public.sensor_readings enable row level security';
    execute 'revoke all on table public.sensor_readings from anon, authenticated';
  end if;
end $$;

-- 2) Views should run as security invoker
do $$
declare
  v_name text;
begin
  foreach v_name in array array[
    'device_summary',
    'bridge_status_live',
    'latest_readings',
    'admin_dashboard_live'
  ]
  loop
    if exists (
      select 1
      from pg_views
      where schemaname = 'public'
        and viewname = v_name
    ) then
      execute format(
        'alter view public.%I set (security_invoker = true)',
        v_name
      );
    end if;
  end loop;
end $$;

-- 3) Immutable search_path for role-executed functions
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure::text as regproc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('update_device_last_seen', 'update_device_from_reading')
  loop
    execute format(
      'alter function %s set search_path = public, pg_temp',
      fn.regproc
    );
  end loop;
end $$;

-- 4) Move pg_trgm out of public schema
create schema if not exists extensions;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
exception
  when insufficient_privilege then
    raise notice 'No privileges to move extension pg_trgm. Execute as owner/admin.';
end $$;

-- 5) Slow-query support indexes (only where columns/tables exist)
do $$
begin
  -- Legacy ingest path: sensor_readings -> readings
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'sensor_readings'
  ) then
    create index if not exists idx_sensor_readings_device_recorded_at
      on public.sensor_readings (device_id, recorded_at desc);
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'readings'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'readings'
        and column_name = 'device_id'
    ) then
      create index if not exists idx_readings_device_id_recorded_at_desc
        on public.readings (device_id, recorded_at desc);
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'readings'
        and column_name = 'device_uuid'
    ) then
      create index if not exists idx_readings_device_uuid_recorded_at_desc
        on public.readings (device_uuid, recorded_at desc);
    end if;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'devices'
  ) then
    create index if not exists idx_devices_device_id_lookup
      on public.devices (device_id);
  end if;
end $$;

-- 6) Refresh planner statistics
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'sensor_readings'
  ) then
    analyze public.sensor_readings;
  end if;
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'readings'
  ) then
    analyze public.readings;
  end if;
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'devices'
  ) then
    analyze public.devices;
  end if;
end $$;
