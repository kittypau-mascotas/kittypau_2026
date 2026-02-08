-- Kittypau IoT - SQL Schema (MVP)
-- Objetivo: Usuario -> Mascota -> Dispositivo -> Lecturas (streaming)

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  auth_provider text,
  user_name text,
  is_owner boolean,
  owner_name text,
  care_rating int,
  phone_number text,
  notification_channel text,
  city text,
  country text,
  user_onboarding_step text,
  created_at timestamptz not null default now()
);

-- Pets
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cat','dog')),
  origin text,
  is_neutered boolean,
  has_neuter_tattoo boolean,
  has_microchip boolean,
  living_environment text,
  size text,
  age_range text,
  weight_kg numeric,
  activity_level text,
  alone_time text,
  has_health_condition boolean,
  health_notes text,
  photo_url text,
  pet_state text default 'created' check (pet_state in ('created','completed_profile','device_pending','device_linked','inactive','archived')),
  pet_onboarding_step text,
  created_at timestamptz not null default now()
);

-- Breeds
create table if not exists public.breeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null check (species in ('cat','dog')),
  is_mixed boolean default false,
  is_unknown boolean default false
);

-- Pet Breeds (max 3 por mascota, enforce en app)
create table if not exists public.pet_breeds (
  pet_id uuid not null references public.pets(id) on delete cascade,
  breed_id uuid not null references public.breeds(id) on delete cascade,
  primary key (pet_id, breed_id)
);

-- Devices
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete restrict,
  device_code text not null unique,
  device_type text not null check (device_type in ('food_bowl','water_bowl')),
  status text not null default 'active' check (status in ('active','inactive','maintenance')),
  device_state text default 'factory' check (device_state in ('factory','claimed','linked','offline','lost','error')),
  battery_level int,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

-- Readings (streaming)
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  -- pet_id es un snapshot opcional (no fuente de verdad)
  pet_id uuid references public.pets(id) on delete set null,
  weight_grams int,
  water_ml int,
  flow_rate numeric,
  temperature numeric,
  humidity numeric,
  battery_level int,
  recorded_at timestamptz not null default now(),
  ingested_at timestamptz not null default now(),
  clock_invalid boolean not null default false
);

-- Audit events (server-only)
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Bridge heartbeats (server-only)
create table if not exists public.bridge_heartbeats (
  bridge_id text primary key,
  ip text,
  uptime_sec int,
  mqtt_connected boolean,
  last_mqtt_at timestamptz,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Migration helpers (idempotent)
-- These keep existing databases in sync when rerunning this file.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_onboarding_step text;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS pet_onboarding_step text;

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS flow_rate numeric;

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz not null default now();

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS clock_invalid boolean not null default false;

-- Data cleanup (idempotent)
-- Ensure only one active device per pet before adding unique index.
with ranked as (
  select
    id,
    pet_id,
    row_number() over (partition by pet_id order by created_at desc, id desc) as rn
  from public.devices
  where status = 'active' and pet_id is not null
)
update public.devices d
set status = 'inactive'
from ranked r
where d.id = r.id and r.rn > 1;

-- Indexes
create index if not exists idx_pets_user_id on public.pets(user_id);
create index if not exists idx_pets_user_id_created_at on public.pets(user_id, created_at desc);
create index if not exists idx_devices_owner_id on public.devices(owner_id);
create index if not exists idx_devices_owner_id_created_at on public.devices(owner_id, created_at desc);
create unique index if not exists idx_devices_active_per_pet
  on public.devices(pet_id)
  where status = 'active';
create index if not exists idx_readings_device_id on public.readings(device_id);
create index if not exists idx_readings_device_recorded_at on public.readings(device_id, recorded_at desc);
create index if not exists idx_readings_recorded_at on public.readings(recorded_at desc);
create unique index if not exists idx_readings_device_recorded_at_unique
  on public.readings(device_id, recorded_at);
create index if not exists idx_readings_device_id_recorded_at on public.readings(device_id, recorded_at desc);
create index if not exists idx_readings_device_recorded_cover
  on public.readings(device_id, recorded_at desc)
  include (weight_grams, water_ml, flow_rate, temperature, humidity, battery_level);
create index if not exists idx_pet_breeds_pet_id on public.pet_breeds(pet_id);
create index if not exists idx_devices_pet_id on public.devices(pet_id);
create index if not exists idx_audit_events_actor_id on public.audit_events(actor_id);
create index if not exists idx_audit_events_event_type on public.audit_events(event_type);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);
create index if not exists idx_bridge_heartbeats_last_seen on public.bridge_heartbeats(last_seen desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.devices enable row level security;
alter table public.readings enable row level security;
alter table public.audit_events enable row level security;
alter table public.bridge_heartbeats enable row level security;
alter table public.breeds enable row level security;
alter table public.pet_breeds enable row level security;

-- Policies: profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Policies: profiles (insert)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- Policies: pets
drop policy if exists "pets_select_own" on public.pets;
create policy "pets_select_own"
  on public.pets for select
  using (user_id = auth.uid());

drop policy if exists "pets_insert_own" on public.pets;
create policy "pets_insert_own"
  on public.pets for insert
  with check (user_id = auth.uid());

drop policy if exists "pets_update_own" on public.pets;
create policy "pets_update_own"
  on public.pets for update
  using (user_id = auth.uid());

drop policy if exists "pets_delete_own" on public.pets;
create policy "pets_delete_own"
  on public.pets for delete
  using (user_id = auth.uid());

-- Policies: devices
drop policy if exists "devices_select_own" on public.devices;
create policy "devices_select_own"
  on public.devices for select
  using (owner_id = auth.uid());

drop policy if exists "devices_insert_own" on public.devices;
create policy "devices_insert_own"
  on public.devices for insert
  with check (owner_id = auth.uid());

drop policy if exists "devices_update_own" on public.devices;
create policy "devices_update_own"
  on public.devices for update
  using (owner_id = auth.uid());

drop policy if exists "devices_delete_own" on public.devices;
create policy "devices_delete_own"
  on public.devices for delete
  using (owner_id = auth.uid());

-- Policies: readings (solo lectura del dueño vía join con devices)
drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own"
  on public.readings for select
  using (
    exists (
      select 1 from public.devices d
      where d.id = readings.device_id and d.owner_id = auth.uid()
    )
  );

-- Policies: breeds (lectura publica)
drop policy if exists "breeds_select_all" on public.breeds;
create policy "breeds_select_all"
  on public.breeds for select
  using (true);

-- Policies: pet_breeds
drop policy if exists "pet_breeds_select_own" on public.pet_breeds;
create policy "pet_breeds_select_own"
  on public.pet_breeds for select
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_breeds.pet_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "pet_breeds_insert_own" on public.pet_breeds;
create policy "pet_breeds_insert_own"
  on public.pet_breeds for insert
  with check (
    exists (
      select 1 from public.pets p
      where p.id = pet_breeds.pet_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "pet_breeds_delete_own" on public.pet_breeds;
create policy "pet_breeds_delete_own"
  on public.pet_breeds for delete
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_breeds.pet_id and p.user_id = auth.uid()
    )
  );

-- Triggers
create or replace function public.update_device_from_reading()
returns trigger as $$
begin
  update public.devices
  set last_seen = new.recorded_at,
      battery_level = coalesce(new.battery_level, battery_level),
      status = 'active',
      device_state = case
        when device_state = 'factory' then 'linked'
        else device_state
      end
  where id = new.device_id
    and (
      last_seen is null
      or new.recorded_at > last_seen + interval '1 minute'
    );
  return new;
end;
$$ language plpgsql;

-- RPC: create device + link pet_state atomically
create or replace function public.link_device_to_pet(
  p_owner_id uuid,
  p_pet_id uuid,
  p_device_code text,
  p_device_type text,
  p_status text,
  p_battery_level int
)
  returns public.devices
  language plpgsql
  security definer
  set search_path = public
  set row_security = off
  as $$
declare
  v_pet_owner uuid;
  v_device public.devices;
begin
  select user_id into v_pet_owner
  from public.pets
  where id = p_pet_id;

  if v_pet_owner is null then
    raise exception 'Pet not found';
  end if;

  if v_pet_owner <> p_owner_id then
    raise exception 'Forbidden';
  end if;

  update public.devices
  set status = 'inactive'
  where pet_id = p_pet_id
    and status = 'active';

  insert into public.devices (
    owner_id, pet_id, device_code, device_type, status, device_state, battery_level
  ) values (
    p_owner_id, p_pet_id, p_device_code, p_device_type, p_status, 'linked', p_battery_level
  )
  returning * into v_device;

  update public.pets
  set pet_state = 'device_linked'
  where id = p_pet_id;

  return v_device;
end;
$$;

drop trigger if exists trg_update_device_from_reading on public.readings;
create trigger trg_update_device_from_reading
after insert on public.readings
for each row execute function public.update_device_from_reading();

-- Inserciones de readings se harán con service role (webhook)




-- Constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devices_device_code_format_check'
  ) THEN
    ALTER TABLE public.devices
      ADD CONSTRAINT devices_device_code_format_check
      CHECK (device_code ~ '^KPCL\d{4}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_step_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_step_check
      CHECK (user_onboarding_step IS NULL OR user_onboarding_step IN (
        'not_started','user_profile','pet_profile','device_link','completed'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_care_rating_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_care_rating_check
      CHECK (care_rating IS NULL OR (care_rating >= 1 AND care_rating <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pets_onboarding_step_check'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_onboarding_step_check
      CHECK (pet_onboarding_step IS NULL OR pet_onboarding_step IN (
        'not_started','pet_type','pet_profile','pet_health','pet_confirm'
      ));
  END IF;
END $$;

