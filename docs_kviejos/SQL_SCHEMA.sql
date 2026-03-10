-- KViejos - SQL_SCHEMA v1
-- Fuente canonica para un MVP (manual) o como referencia de migrations.
-- Para migraciones versionadas, ver: supabase_kviejos/migrations/

create extension if not exists "pgcrypto";

-- Core entities
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Santiago',
  address_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  full_name text not null,
  birth_year int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  full_name text not null,
  relation text,
  channel text not null check (channel in ('app','email','sms','whatsapp')),
  contact_value text not null,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sensors (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  sensor_code text not null unique,
  sensor_type text not null check (sensor_type in ('motion','door','gas','smoke','water_leak','sos_button','temperature')),
  status text not null default 'active' check (status in ('active','inactive','maintenance')),
  battery_level int,
  last_seen_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sensor_id uuid references public.sensors(id) on delete set null,
  resident_id uuid references public.residents(id) on delete set null,
  event_type text not null check (
    event_type in (
      'motion',
      'door_open','door_close',
      'gas_detected','smoke_detected','water_leak_detected',
      'medication_due',
      'sos_pressed',
      'temperature_reading'
    )
  ),
  severity text not null default 'info' check (severity in ('info','warn','critical')),
  recorded_at timestamptz not null default now(),
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  rule_name text not null,
  rule_type text not null check (
    rule_type in ('inactivity','door_open','gas','smoke','water_leak','sos','medication','temperature')
  ),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  rule_id uuid references public.alert_rules(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'active' check (status in ('active','acknowledged','resolved')),
  title text not null,
  message text,
  severity text not null default 'warn' check (severity in ('info','warn','critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.acknowledgements (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  actor_type text not null default 'contact' check (actor_type in ('contact','resident','admin','system')),
  actor_label text,
  note text,
  created_at timestamptz not null default now()
);

-- Audit log (inmutable)
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Minimal indexes (MVP)
create index if not exists idx_residents_household on public.residents(household_id);
create index if not exists idx_contacts_household on public.contacts(household_id);
create unique index if not exists ux_contacts_primary_per_household
  on public.contacts(household_id)
  where is_primary;
create index if not exists idx_sensors_household on public.sensors(household_id);
create index if not exists idx_sensors_household_status on public.sensors(household_id, status);
create index if not exists idx_sensors_resident on public.sensors(resident_id);
create index if not exists idx_events_household_recorded on public.events(household_id, recorded_at desc);
create index if not exists idx_events_sensor_recorded on public.events(sensor_id, recorded_at desc);
create index if not exists idx_events_resident_recorded on public.events(resident_id, recorded_at desc);
create index if not exists idx_alert_rules_household_enabled on public.alert_rules(household_id, enabled);
create index if not exists idx_alerts_household_status on public.alerts(household_id, status, created_at desc);
create index if not exists idx_alerts_rule_status on public.alerts(rule_id, status, created_at desc);

-- updated_at trigger
create or replace function public.kviejos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_households_updated_at') then
    create trigger trg_kviejos_households_updated_at
      before update on public.households
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_residents_updated_at') then
    create trigger trg_kviejos_residents_updated_at
      before update on public.residents
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_contacts_updated_at') then
    create trigger trg_kviejos_contacts_updated_at
      before update on public.contacts
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_sensors_updated_at') then
    create trigger trg_kviejos_sensors_updated_at
      before update on public.sensors
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_alert_rules_updated_at') then
    create trigger trg_kviejos_alert_rules_updated_at
      before update on public.alert_rules
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_alerts_updated_at') then
    create trigger trg_kviejos_alerts_updated_at
      before update on public.alerts
      for each row execute function public.kviejos_set_updated_at();
  end if;
end $$;

-- RLS enablement (policies defined later; MVP uses service_role/admin)
alter table public.households enable row level security;
alter table public.residents enable row level security;
alter table public.contacts enable row level security;
alter table public.sensors enable row level security;
alter table public.events enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alerts enable row level security;
alter table public.acknowledgements enable row level security;
alter table public.audit_events enable row level security;
