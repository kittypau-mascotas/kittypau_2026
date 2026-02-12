create table if not exists public.admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner_admin', 'ops_admin', 'support_admin', 'readonly_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_roles_role_active
  on public.admin_roles(role, active);

alter table public.admin_roles enable row level security;

drop policy if exists admin_roles_select_own on public.admin_roles;
create policy admin_roles_select_own
  on public.admin_roles
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = p_user_id
      and ar.active = true
  );
$$;

create or replace view public.admin_dashboard_live as
with kpcl_stats as (
  select
    count(*) filter (
      where d.device_id like 'KPCL%'
        and d.retired_at is null
    )::integer as kpcl_total_devices,
    count(*) filter (
      where d.device_id like 'KPCL%'
        and d.retired_at is null
        and (d.last_seen is null or d.last_seen < (now() - interval '10 minutes'))
    )::integer as kpcl_offline_devices
  from public.devices d
),
bridge_stats as (
  select
    count(*)::integer as bridge_total,
    count(*) filter (where b.bridge_status = 'active')::integer as bridge_active,
    count(*) filter (where b.bridge_status = 'degraded')::integer as bridge_degraded,
    count(*) filter (where b.bridge_status = 'offline')::integer as bridge_offline
  from public.bridge_status_live b
),
incident_stats as (
  select
    count(*) filter (
      where ae.event_type = 'general_device_outage_detected'
        and ae.created_at > now() - interval '24 hours'
    )::integer as outages_last_24h,
    count(*) filter (
      where ae.event_type in ('bridge_offline_detected', 'device_offline_detected')
        and ae.created_at > now() - interval '24 hours'
    )::integer as offline_events_last_24h
  from public.audit_events ae
)
select
  now() as generated_at,
  ks.kpcl_total_devices,
  greatest(0, ks.kpcl_total_devices - ks.kpcl_offline_devices)::integer as kpcl_online_devices,
  ks.kpcl_offline_devices,
  bs.bridge_total,
  bs.bridge_active,
  bs.bridge_degraded,
  bs.bridge_offline,
  ins.outages_last_24h,
  ins.offline_events_last_24h
from kpcl_stats ks
cross join bridge_stats bs
cross join incident_stats ins;

do $$
declare
  v_user_id uuid;
begin
  select id
    into v_user_id
  from auth.users
  where lower(email) = 'javomauro.contacto@gmail.com'
  limit 1;

  if v_user_id is not null then
    insert into public.profiles (
      id,
      email,
      user_name,
      is_owner,
      owner_name,
      city,
      country,
      user_onboarding_step
    )
    values (
      v_user_id,
      'javomauro.contacto@gmail.com',
      'Admin Kittypau',
      true,
      'Admin Kittypau',
      'Santiago',
      'CL',
      'completed'
    )
    on conflict (id) do update
      set email = excluded.email,
          user_name = coalesce(public.profiles.user_name, excluded.user_name),
          owner_name = coalesce(public.profiles.owner_name, excluded.owner_name),
          is_owner = coalesce(public.profiles.is_owner, excluded.is_owner),
          city = coalesce(public.profiles.city, excluded.city),
          country = coalesce(public.profiles.country, excluded.country),
          user_onboarding_step = coalesce(public.profiles.user_onboarding_step, excluded.user_onboarding_step);

    insert into public.admin_roles (user_id, role, active)
    values (v_user_id, 'owner_admin', true)
    on conflict (user_id) do update
      set role = 'owner_admin',
          active = true,
          updated_at = now();
  end if;
end $$;
