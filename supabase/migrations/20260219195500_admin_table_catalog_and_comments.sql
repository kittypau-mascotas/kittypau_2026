-- Table/View descriptions + admin catalog stats

do $$
begin
  if to_regclass('public.admin_roles') is not null then
    execute 'comment on table public.admin_roles is ''Roles administrativos y permisos de acceso al portal admin.''';
  end if;
  if to_regclass('public.audit_events') is not null then
    execute 'comment on table public.audit_events is ''Eventos de auditoria operativa y de seguridad de la plataforma.''';
  end if;
  if to_regclass('public.breeds') is not null then
    execute 'comment on table public.breeds is ''Catalogo de razas para mascotas.''';
  end if;
  if to_regclass('public.bridge_heartbeats') is not null then
    execute 'comment on table public.bridge_heartbeats is ''Estado en vivo del bridge IoT por heartbeat.''';
  end if;
  if to_regclass('public.devices') is not null then
    execute 'comment on table public.devices is ''Inventario de dispositivos KPCL/KPBR vinculados a dueños y mascotas.''';
  end if;
  if to_regclass('public.pet_breeds') is not null then
    execute 'comment on table public.pet_breeds is ''Relacion N:N entre mascotas y razas.''';
  end if;
  if to_regclass('public.pets') is not null then
    execute 'comment on table public.pets is ''Perfil de mascota y estado de onboarding.''';
  end if;
  if to_regclass('public.profiles') is not null then
    execute 'comment on table public.profiles is ''Perfil extendido del usuario autenticado.''';
  end if;
  if to_regclass('public.readings') is not null then
    execute 'comment on table public.readings is ''Telemetria normalizada de dispositivos IoT.''';
  end if;
  if to_regclass('public.sensor_readings') is not null then
    execute 'comment on table public.sensor_readings is ''Buffer/ingesta historica de lecturas de sensores (legacy).''';
  end if;

  if to_regclass('public.latest_readings') is not null then
    execute 'comment on view public.latest_readings is ''Ultima lectura por dispositivo.''';
  end if;
  if to_regclass('public.device_summary') is not null then
    execute 'comment on view public.device_summary is ''Resumen operativo de dispositivos + ultima lectura.''';
  end if;
  if to_regclass('public.bridge_status_live') is not null then
    execute 'comment on view public.bridge_status_live is ''Estado vivo del bridge (active/degraded/offline).''';
  end if;
  if to_regclass('public.admin_dashboard_live') is not null then
    execute 'comment on view public.admin_dashboard_live is ''KPIs consolidados para dashboard administrativo.''';
  end if;
end $$;

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
      if obj.object_name in ('audit_events') then
        execute format('select max(created_at) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name in ('bridge_heartbeats') then
        execute format('select max(last_seen) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name in ('devices') then
        execute format('select max(last_seen) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name in ('readings') then
        execute format('select max(coalesce(ingested_at, recorded_at)) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name in ('sensor_readings') then
        execute format('select max(recorded_at) from public.%I', obj.object_name) into last_ts;
      elsif obj.object_name in ('pets', 'profiles', 'pet_breeds', 'breeds', 'admin_roles') then
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = obj.object_name
            and column_name = 'updated_at'
        ) into has_updated_at;
        if has_updated_at then
          execute format('select max(updated_at) from public.%I', obj.object_name) into last_ts;
        else
          execute format('select max(created_at) from public.%I', obj.object_name) into last_ts;
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
