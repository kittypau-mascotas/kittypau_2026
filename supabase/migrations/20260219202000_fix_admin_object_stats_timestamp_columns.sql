-- Fix: admin_object_stats() should not assume created_at/updated_at exists in all tables

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
  obj record;
  last_ts timestamptz;
  has_updated_at boolean;
  has_created_at boolean;
begin
  for obj in
    with rel as (
      select
        n.nspname as schema_name,
        c.relname as object_name,
        case when c.relkind = 'v' then 'view' else 'table' end as object_type,
        obj_description(c.oid, 'pg_class') as description,
        case when c.relkind = 'r' then c.reltuples::bigint else null end as row_estimate,
        case when c.relkind = 'r' then pg_total_relation_size(c.oid) else null end as size_bytes
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
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
        )
        and c.relkind in ('r', 'v')
    )
    select *
    from rel
    order by coalesce(size_bytes, 0) desc, object_name
  loop
    last_ts := null;

    if obj.object_type = 'table' then
      if obj.object_name = 'audit_events' then
        execute format('select max(created_at) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name = 'bridge_heartbeats' then
        execute format('select max(last_seen) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name = 'devices' then
        execute format('select max(last_seen) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name = 'readings' then
        execute format('select max(coalesce(ingested_at, recorded_at)) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name = 'sensor_readings' then
        execute format('select max(recorded_at) from public.%I', obj.object_name) into last_ts;
      else
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = obj.object_name
            and column_name = 'updated_at'
        ) into has_updated_at;

        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = obj.object_name
            and column_name = 'created_at'
        ) into has_created_at;

        if has_updated_at then
          execute format('select max(updated_at) from public.%I', obj.object_name) into last_ts;
        elsif has_created_at then
          execute format('select max(created_at) from public.%I', obj.object_name) into last_ts;
        else
          last_ts := null;
        end if;
      end if;
    end if;

    return query
    select
      obj.schema_name,
      obj.object_name,
      obj.object_type,
      obj.description,
      obj.row_estimate,
      obj.size_bytes,
      case when obj.size_bytes is null then null else pg_size_pretty(obj.size_bytes) end as size_pretty,
      last_ts;
  end loop;
end;
$$;
