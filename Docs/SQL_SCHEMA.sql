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
  pet_id uuid references public.pets(id) on delete set null,
  weight_grams int,
  water_ml int,
  flow_rate numeric,
  temperature numeric,
  humidity numeric,
  battery_level int,
  recorded_at timestamptz not null default now()
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

-- Migration helpers (idempotent)
-- These keep existing databases in sync when rerunning this file.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_onboarding_step text;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS pet_onboarding_step text;

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS flow_rate numeric;

-- Indexes
create index if not exists idx_pets_user_id on public.pets(user_id);
create index if not exists idx_devices_owner_id on public.devices(owner_id);
create index if not exists idx_readings_device_id on public.readings(device_id);
create index if not exists idx_readings_recorded_at on public.readings(recorded_at desc);
create index if not exists idx_pet_breeds_pet_id on public.pet_breeds(pet_id);
create index if not exists idx_devices_pet_id on public.devices(pet_id);
create index if not exists idx_audit_events_actor_id on public.audit_events(actor_id);
create index if not exists idx_audit_events_event_type on public.audit_events(event_type);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.devices enable row level security;
alter table public.readings enable row level security;
alter table public.audit_events enable row level security;
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
  where id = new.device_id;
  return new;
end;
$$ language plpgsql;

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
    SELECT 1 FROM pg_constraint WHERE conname = 'pets_onboarding_step_check'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_onboarding_step_check
      CHECK (pet_onboarding_step IS NULL OR pet_onboarding_step IN (
        'not_started','pet_type','pet_profile','pet_health','pet_confirm'
      ));
  END IF;
END $$;
