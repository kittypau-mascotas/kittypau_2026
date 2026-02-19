-- Harden admin object stats so dashboard keeps working even if some objects are missing.

create or replace function public.admin_object_stats()
returns table (
  schema_name text,
  object_name text,
  object_type text,
  description text,
  row_estimate bigint,
  size_bytes bigint,
  size_pretty text,
  last_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  names text[] := array[
    'admin_dashboard_live',
    'admin_roles',
    'audit_events',
    'breeds',
    'bridge_heartbeats',
    'bridge_status_live',
    'device_summary',
    'devices',
    'latest_readings',
    'pet_breeds',
    'pets',
    'profiles',
    'readings',
    'sensor_readings'
  ];
  obj_name text;
  rel_oid oid;
  rel_kind "char";
  rel_tuples real;
  rel_description text;
  rel_size bigint;
  last_ts timestamptz;
begin
  foreach obj_name in array names loop
    select c.oid, c.relkind, c.reltuples, obj_description(c.oid, 'pg_class')
      into rel_oid, rel_kind, rel_tuples, rel_description
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = obj_name
      and c.relkind in ('r', 'v')
    limit 1;

    if rel_oid is null then
      continue;
    end if;

    rel_size := case when rel_kind = 'r' then pg_total_relation_size(rel_oid) else null end;
    last_ts := null;

    if obj_name = 'audit_events' and to_regclass('public.audit_events') is not null then
      select max(created_at) into last_ts from public.audit_events;
    elsif obj_name = 'bridge_heartbeats' and to_regclass('public.bridge_heartbeats') is not null then
      select max(last_seen) into last_ts from public.bridge_heartbeats;
    elsif obj_name = 'devices' and to_regclass('public.devices') is not null then
      select max(last_seen) into last_ts from public.devices;
    elsif obj_name = 'readings' and to_regclass('public.readings') is not null then
      select max(coalesce(ingested_at, recorded_at)) into last_ts from public.readings;
    elsif obj_name = 'sensor_readings' and to_regclass('public.sensor_readings') is not null then
      select max(recorded_at) into last_ts from public.sensor_readings;
    elsif obj_name in ('latest_readings', 'device_summary')
      and to_regclass('public.readings') is not null then
      select max(recorded_at) into last_ts from public.readings;
    elsif obj_name = 'bridge_status_live'
      and to_regclass('public.bridge_heartbeats') is not null then
      select max(last_seen) into last_ts from public.bridge_heartbeats;
    elsif obj_name = 'admin_dashboard_live' then
      last_ts := now();
    elsif obj_name = 'pets' and to_regclass('public.pets') is not null then
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'pets' and column_name = 'updated_at'
      ) then
        execute 'select max(updated_at) from public.pets' into last_ts;
      elsif exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'pets' and column_name = 'created_at'
      ) then
        execute 'select max(created_at) from public.pets' into last_ts;
      end if;
    elsif obj_name = 'profiles' and to_regclass('public.profiles') is not null then
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
      ) then
        execute 'select max(updated_at) from public.profiles' into last_ts;
      elsif exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at'
      ) then
        execute 'select max(created_at) from public.profiles' into last_ts;
      end if;
    end if;

    return query
    select
      'public'::text as schema_name,
      obj_name as object_name,
      case when rel_kind = 'v' then 'view' else 'table' end as object_type,
      rel_description as description,
      case when rel_kind = 'r' then rel_tuples::bigint else null end as row_estimate,
      rel_size as size_bytes,
      case when rel_size is null then null else pg_size_pretty(rel_size) end as size_pretty,
      last_ts as last_updated_at;
  end loop;
end;
$$;

create or replace view public.admin_object_stats_live as
select *
from public.admin_object_stats()
order by coalesce(size_bytes, 0) desc, object_name;

comment on view public.admin_object_stats_live is
  'Catalogo estable de tablas/vistas con tamano estimado y ultima actualizacion aproximada.';
