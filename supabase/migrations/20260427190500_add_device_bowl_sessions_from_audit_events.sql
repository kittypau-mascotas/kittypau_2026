-- ============================================================
-- Operational bowl sessions from manual audit events
-- ============================================================
-- Canonical source:
--   public.audit_events (event_type = 'manual_bowl_category')
-- This migration materializes paired sessions for:
--   inicio_* -> termino_* for alimentacion / servido / hidratacion
-- and stores anomalies (duplicate start, end without start, start without end).
-- ============================================================

create table if not exists public.device_bowl_sessions (
  id bigserial primary key,
  device_uuid uuid not null references public.devices(id) on delete cascade,
  device_code text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  session_type text not null check (session_type in ('alimentacion', 'servido', 'hidratacion')),
  source text,
  start_event_id uuid not null references public.audit_events(id) on delete cascade,
  end_event_id uuid not null references public.audit_events(id) on delete cascade,
  session_start_at timestamptz not null,
  session_end_at timestamptz not null,
  duration_seconds numeric(12, 3) not null,
  start_content_grams numeric(10, 3),
  end_content_grams numeric(10, 3),
  net_grams numeric(10, 3),
  measurement_direction text not null default 'unknown' check (measurement_direction in ('decrease', 'increase', 'unknown')),
  is_valid boolean not null default false,
  validation_reason text,
  created_at timestamptz not null default now(),
  unique (start_event_id, end_event_id)
);

create index if not exists idx_device_bowl_sessions_device_time
  on public.device_bowl_sessions (device_uuid, session_start_at desc);

create index if not exists idx_device_bowl_sessions_device_code_time
  on public.device_bowl_sessions (device_code, session_start_at desc);

create index if not exists idx_device_bowl_sessions_owner_time
  on public.device_bowl_sessions (owner_id, session_start_at desc);

create index if not exists idx_device_bowl_sessions_type_time
  on public.device_bowl_sessions (session_type, session_start_at desc);

create table if not exists public.device_bowl_session_anomalies (
  id bigserial primary key,
  device_uuid uuid not null references public.devices(id) on delete cascade,
  device_code text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  session_type text check (session_type in ('alimentacion', 'servido', 'hidratacion')),
  anomaly_type text not null check (anomaly_type in (
    'inicio_duplicado_reemplazado_por_inicio_mas_reciente',
    'termino_sin_inicio_correspondiente',
    'inicio_sin_termino_correspondiente'
  )),
  event_id uuid references public.audit_events(id) on delete set null,
  related_event_id uuid references public.audit_events(id) on delete set null,
  event_at timestamptz not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_device_bowl_session_anomalies_device_time
  on public.device_bowl_session_anomalies (device_uuid, event_at desc);

create index if not exists idx_device_bowl_session_anomalies_device_code_time
  on public.device_bowl_session_anomalies (device_code, event_at desc);

create index if not exists idx_device_bowl_session_anomalies_owner_time
  on public.device_bowl_session_anomalies (owner_id, event_at desc);

alter table public.device_bowl_sessions enable row level security;
alter table public.device_bowl_session_anomalies enable row level security;

drop policy if exists "device_bowl_sessions_select_own" on public.device_bowl_sessions;
create policy "device_bowl_sessions_select_own"
  on public.device_bowl_sessions for select
  using (owner_id = auth.uid());

drop policy if exists "device_bowl_session_anomalies_select_own" on public.device_bowl_session_anomalies;
create policy "device_bowl_session_anomalies_select_own"
  on public.device_bowl_session_anomalies for select
  using (owner_id = auth.uid());

create or replace function public.resolve_event_content_grams(
  p_device_uuid uuid,
  p_payload jsonb,
  p_event_ts timestamptz
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  v_from_snapshot numeric;
  v_weight_snapshot numeric;
  v_plate_snapshot numeric;
  v_plate_device numeric;
  v_fallback_weight numeric;
begin
  if p_payload is null then
    return null;
  end if;

  begin
    v_from_snapshot := nullif(trim(p_payload #>> '{snapshot,content_weight_grams}'), '')::numeric;
  exception when others then
    v_from_snapshot := null;
  end;

  if v_from_snapshot is not null then
    return greatest(0, round(v_from_snapshot::numeric, 3));
  end if;

  begin
    v_weight_snapshot := nullif(trim(p_payload #>> '{snapshot,weight_grams}'), '')::numeric;
  exception when others then
    v_weight_snapshot := null;
  end;

  begin
    v_plate_snapshot := nullif(trim(p_payload #>> '{snapshot,plate_weight_grams}'), '')::numeric;
  exception when others then
    v_plate_snapshot := null;
  end;

  select d.plate_weight_grams::numeric
  into v_plate_device
  from public.devices d
  where d.id = p_device_uuid;

  if v_weight_snapshot is not null then
    return greatest(0, round((v_weight_snapshot - coalesce(v_plate_snapshot, v_plate_device, 0))::numeric, 3));
  end if;

  select r.weight_grams::numeric
  into v_fallback_weight
  from public.readings r
  where r.device_id = p_device_uuid
    and r.weight_grams is not null
    and abs(extract(epoch from (r.recorded_at - p_event_ts))) <= 1200
  order by abs(extract(epoch from (r.recorded_at - p_event_ts))) asc, r.recorded_at desc
  limit 1;

  if v_fallback_weight is not null then
    return greatest(0, round((v_fallback_weight - coalesce(v_plate_device, 0))::numeric, 3));
  end if;

  return null;
end;
$$;

create or replace function public.rebuild_device_bowl_sessions(
  p_device_uuid uuid default null,
  p_device_code text default null
)
returns table(inserted_sessions integer, inserted_anomalies integer)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  rec record;
  v_key text;
  v_type text;
  v_phase text;
  v_open jsonb := '{}'::jsonb;
  v_info jsonb;
  v_inserted_sessions integer := 0;
  v_inserted_anomalies integer := 0;
  v_start_ts timestamptz;
  v_start_event_id uuid;
  v_start_content numeric;
  v_net numeric;
  v_direction text;
  v_is_valid boolean;
  v_reason text;
  leftover record;
  v_prev_event_id uuid;
  v_prev_start timestamptz;
begin
  delete from public.device_bowl_sessions s
  using public.devices d
  where s.device_uuid = d.id
    and (p_device_uuid is null or d.id = p_device_uuid)
    and (p_device_code is null or d.device_id = p_device_code);

  delete from public.device_bowl_session_anomalies a
  using public.devices d
  where a.device_uuid = d.id
    and (p_device_uuid is null or d.id = p_device_uuid)
    and (p_device_code is null or d.device_id = p_device_code);

  for rec in
    select
      ae.id as event_id,
      ae.created_at,
      ae.payload,
      ae.entity_id as device_uuid,
      d.device_id as device_code,
      d.owner_id,
      d.pet_id,
      ae.payload->>'source' as source,
      ae.payload->>'category' as category,
      public.resolve_event_content_grams(ae.entity_id, ae.payload, ae.created_at) as content_grams
    from public.audit_events ae
    join public.devices d
      on d.id = ae.entity_id
    where ae.event_type = 'manual_bowl_category'
      and ae.entity_type = 'device'
      and (ae.payload->>'category') in (
        'inicio_alimentacion',
        'termino_alimentacion',
        'inicio_servido',
        'termino_servido',
        'inicio_hidratacion',
        'termino_hidratacion'
      )
      and (p_device_uuid is null or ae.entity_id = p_device_uuid)
      and (p_device_code is null or d.device_id = p_device_code)
    order by ae.entity_id, ae.created_at, ae.id
  loop
    v_phase := split_part(rec.category, '_', 1);
    v_type := regexp_replace(rec.category, '^(inicio|termino)_', '');

    if v_type not in ('alimentacion', 'servido', 'hidratacion') then
      continue;
    end if;

    v_key := rec.device_uuid::text || '|' || v_type;

    if v_phase = 'inicio' then
      if v_open ? v_key then
        v_info := v_open -> v_key;
        begin
          v_prev_event_id := (v_info->>'event_id')::uuid;
        exception when others then
          v_prev_event_id := null;
        end;
        begin
          v_prev_start := (v_info->>'start_ts')::timestamptz;
        exception when others then
          v_prev_start := rec.created_at;
        end;

        insert into public.device_bowl_session_anomalies (
          device_uuid,
          device_code,
          owner_id,
          pet_id,
          session_type,
          anomaly_type,
          event_id,
          related_event_id,
          event_at,
          details
        ) values (
          rec.device_uuid,
          rec.device_code,
          rec.owner_id,
          rec.pet_id,
          v_type,
          'inicio_duplicado_reemplazado_por_inicio_mas_reciente',
          coalesce(v_prev_event_id, rec.event_id),
          rec.event_id,
          coalesce(v_prev_start, rec.created_at),
          jsonb_build_object(
            'previous_start', v_prev_start,
            'replacement_start', rec.created_at,
            'source', coalesce(rec.source, 'manual_bowl_category')
          )
        );
        v_inserted_anomalies := v_inserted_anomalies + 1;
      end if;

      v_open := jsonb_set(
        v_open,
        array[v_key],
        jsonb_build_object(
          'event_id', rec.event_id,
          'start_ts', rec.created_at,
          'start_content_grams', rec.content_grams,
          'source', rec.source,
          'device_uuid', rec.device_uuid,
          'device_code', rec.device_code,
          'owner_id', rec.owner_id,
          'pet_id', rec.pet_id,
          'session_type', v_type
        ),
        true
      );

    elsif v_phase = 'termino' then
      if not (v_open ? v_key) then
        insert into public.device_bowl_session_anomalies (
          device_uuid,
          device_code,
          owner_id,
          pet_id,
          session_type,
          anomaly_type,
          event_id,
          event_at,
          details
        ) values (
          rec.device_uuid,
          rec.device_code,
          rec.owner_id,
          rec.pet_id,
          v_type,
          'termino_sin_inicio_correspondiente',
          rec.event_id,
          rec.created_at,
          jsonb_build_object('source', coalesce(rec.source, 'manual_bowl_category'))
        );
        v_inserted_anomalies := v_inserted_anomalies + 1;
      else
        v_info := v_open -> v_key;
        begin
          v_start_ts := (v_info->>'start_ts')::timestamptz;
        exception when others then
          v_start_ts := null;
        end;
        begin
          v_start_event_id := (v_info->>'event_id')::uuid;
        exception when others then
          v_start_event_id := null;
        end;
        begin
          v_start_content := nullif(trim(v_info->>'start_content_grams'), '')::numeric;
        exception when others then
          v_start_content := null;
        end;

        if v_start_ts is null or rec.created_at <= v_start_ts then
          insert into public.device_bowl_session_anomalies (
            device_uuid,
            device_code,
            owner_id,
            pet_id,
            session_type,
            anomaly_type,
            event_id,
            related_event_id,
            event_at,
            details
          ) values (
            rec.device_uuid,
            rec.device_code,
            rec.owner_id,
            rec.pet_id,
            v_type,
            'termino_sin_inicio_correspondiente',
            rec.event_id,
            v_start_event_id,
            rec.created_at,
            jsonb_build_object('reason', 'termino_menor_o_igual_a_inicio')
          );
          v_inserted_anomalies := v_inserted_anomalies + 1;
        else
          if v_type = 'servido' then
            if v_start_content is not null and rec.content_grams is not null then
              v_net := greatest(0, round((rec.content_grams - v_start_content)::numeric, 3));
              v_direction := 'increase';
            else
              v_net := null;
              v_direction := 'unknown';
            end if;
          else
            if v_start_content is not null and rec.content_grams is not null then
              v_net := greatest(0, round((v_start_content - rec.content_grams)::numeric, 3));
              v_direction := 'decrease';
            else
              v_net := null;
              v_direction := 'unknown';
            end if;
          end if;

          v_is_valid := extract(epoch from (rec.created_at - v_start_ts)) > 0
                        and (v_net is null or v_net >= 0);

          v_reason := case
            when extract(epoch from (rec.created_at - v_start_ts)) <= 0 then 'duracion_no_positiva'
            when v_net is null then 'sin_referencia_de_peso'
            else 'ok'
          end;

          insert into public.device_bowl_sessions (
            device_uuid,
            device_code,
            owner_id,
            pet_id,
            session_type,
            source,
            start_event_id,
            end_event_id,
            session_start_at,
            session_end_at,
            duration_seconds,
            start_content_grams,
            end_content_grams,
            net_grams,
            measurement_direction,
            is_valid,
            validation_reason
          ) values (
            rec.device_uuid,
            rec.device_code,
            rec.owner_id,
            rec.pet_id,
            v_type,
            coalesce(v_info->>'source', rec.source, 'manual_bowl_category'),
            v_start_event_id,
            rec.event_id,
            v_start_ts,
            rec.created_at,
            round(extract(epoch from (rec.created_at - v_start_ts))::numeric, 3),
            v_start_content,
            rec.content_grams,
            v_net,
            v_direction,
            v_is_valid,
            v_reason
          );
          v_inserted_sessions := v_inserted_sessions + 1;
        end if;

        v_open := v_open - v_key;
      end if;
    end if;
  end loop;

  for leftover in
    select key, value
    from jsonb_each(v_open)
  loop
    insert into public.device_bowl_session_anomalies (
      device_uuid,
      device_code,
      owner_id,
      pet_id,
      session_type,
      anomaly_type,
      event_id,
      event_at,
      details
    )
    select
      (leftover.value->>'device_uuid')::uuid,
      leftover.value->>'device_code',
      (leftover.value->>'owner_id')::uuid,
      nullif(leftover.value->>'pet_id', '')::uuid,
      leftover.value->>'session_type',
      'inicio_sin_termino_correspondiente',
      nullif(leftover.value->>'event_id', '')::uuid,
      (leftover.value->>'start_ts')::timestamptz,
      jsonb_build_object('source', coalesce(leftover.value->>'source', 'manual_bowl_category'));

    v_inserted_anomalies := v_inserted_anomalies + 1;
  end loop;

  return query
  select v_inserted_sessions, v_inserted_anomalies;
end;
$$;

grant execute on function public.rebuild_device_bowl_sessions(uuid, text) to service_role;

create or replace view public.device_bowl_sessions_today as
select
  s.*,
  case
    when s.session_type = 'servido' then 'realidad_servido'
    else 'realidad_alimentacion'
  end as reality_group
from public.device_bowl_sessions s
where s.session_start_at >= date_trunc('day', timezone('America/Santiago', now())) at time zone 'America/Santiago'
order by s.session_start_at desc;

comment on table public.device_bowl_sessions is
'Operational table built from public.audit_events manual_bowl_category, pairing inicio_* -> termino_* for alimentacion/servido/hidratacion.';

comment on table public.device_bowl_session_anomalies is
'Anomalies found while pairing manual audit events into bowl sessions.';

comment on function public.rebuild_device_bowl_sessions(uuid, text) is
'Rebuilds operational bowl sessions and anomalies from public.audit_events manual categories.';

select * from public.rebuild_device_bowl_sessions(null, null);
