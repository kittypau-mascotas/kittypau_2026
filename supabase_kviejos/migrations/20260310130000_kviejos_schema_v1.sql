-- KViejos - schema v1 (core)
-- Nota: KViejos vive en `supabase_kviejos/` para no mezclar con Kittypau (`supabase/`).

create extension if not exists "pgcrypto";

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

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);
