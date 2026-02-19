-- Stable source for admin table/view usage cards

create or replace view public.admin_object_stats_live as
with relstats as (
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
),
last_updates as (
  select 'admin_roles'::text as object_name, max(coalesce(updated_at, created_at)) as last_updated_at from public.admin_roles
  union all select 'audit_events', max(created_at) from public.audit_events
  union all select 'breeds', null::timestamptz
  union all select 'bridge_heartbeats', max(last_seen) from public.bridge_heartbeats
  union all select 'devices', max(last_seen) from public.devices
  union all select 'pet_breeds', null::timestamptz
  union all select 'pets', max(created_at) from public.pets
  union all select 'profiles', max(created_at) from public.profiles
  union all select 'readings', max(coalesce(ingested_at, recorded_at)) from public.readings
  union all select 'sensor_readings', max(recorded_at) from public.sensor_readings
  union all select 'latest_readings', max(recorded_at) from public.readings
  union all select 'device_summary', max(recorded_at) from public.readings
  union all select 'bridge_status_live', max(last_seen) from public.bridge_heartbeats
  union all select 'admin_dashboard_live', now()
)
select
  r.schema_name,
  r.object_name,
  r.object_type,
  r.description,
  r.row_estimate,
  r.size_bytes,
  case when r.size_bytes is null then null else pg_size_pretty(r.size_bytes) end as size_pretty,
  lu.last_updated_at
from relstats r
left join last_updates lu on lu.object_name = r.object_name
order by coalesce(r.size_bytes, 0) desc, r.object_name;

comment on view public.admin_object_stats_live is 'Catalogo de tablas y vistas con tamano/rows estimados y ultima actualizacion aproximada para dashboard admin.';
