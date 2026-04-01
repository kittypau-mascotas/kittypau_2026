-- ============================================================
-- Device battery cycle history for KittyPaw
-- ============================================================
-- Generic table for any KPCL device.
-- Stores one row per observed battery cycle / power transition window.
-- This is separate from device_operation_records so we can track:
--   - plugged / charging
--   - full charge
--   - battery-only usage
--   - cycle duration from 100% to depletion
-- ============================================================

create table if not exists public.device_battery_cycles (
  id bigserial primary key,
  device_uuid uuid not null references public.devices(id) on delete cascade,
  device_code text not null,
  device_label text,
  device_type text,
  device_status text,
  device_state text,

  cycle_status text not null default 'open',
  cycle_start_at timestamptz not null,
  charging_start_at timestamptz,
  full_charge_at timestamptz,
  unplugged_at timestamptz,
  battery_only_start_at timestamptz,
  battery_only_end_at timestamptz,
  cycle_end_at timestamptz,

  battery_level_at_start numeric,
  battery_level_at_full_charge numeric,
  battery_level_at_end numeric,
  battery_voltage_at_start numeric,
  battery_voltage_at_full_charge numeric,
  battery_voltage_at_end numeric,
  battery_state_at_start text,
  battery_state_at_full_charge text,
  battery_state_at_end text,
  battery_source_at_start text,
  battery_source_at_full_charge text,
  battery_source_at_end text,

  readings_count integer not null default 0,
  charging_samples integer not null default 0,
  battery_only_samples integer not null default 0,

  charging_duration_seconds numeric(12,3),
  battery_only_duration_seconds numeric(12,3),
  total_duration_seconds numeric(12,3),

  summary jsonb not null default '{}'::jsonb,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint device_battery_cycles_status_check
    check (cycle_status in ('open', 'charging', 'full', 'battery_only', 'closed', 'aborted'))
);

alter table public.device_battery_cycles
  add column if not exists device_label text,
  add column if not exists device_type text,
  add column if not exists device_status text,
  add column if not exists device_state text,
  add column if not exists cycle_status text not null default 'open',
  add column if not exists cycle_start_at timestamptz,
  add column if not exists charging_start_at timestamptz,
  add column if not exists full_charge_at timestamptz,
  add column if not exists unplugged_at timestamptz,
  add column if not exists battery_only_start_at timestamptz,
  add column if not exists battery_only_end_at timestamptz,
  add column if not exists cycle_end_at timestamptz,
  add column if not exists battery_level_at_start numeric,
  add column if not exists battery_level_at_full_charge numeric,
  add column if not exists battery_level_at_end numeric,
  add column if not exists battery_voltage_at_start numeric,
  add column if not exists battery_voltage_at_full_charge numeric,
  add column if not exists battery_voltage_at_end numeric,
  add column if not exists battery_state_at_start text,
  add column if not exists battery_state_at_full_charge text,
  add column if not exists battery_state_at_end text,
  add column if not exists battery_source_at_start text,
  add column if not exists battery_source_at_full_charge text,
  add column if not exists battery_source_at_end text,
  add column if not exists readings_count integer not null default 0,
  add column if not exists charging_samples integer not null default 0,
  add column if not exists battery_only_samples integer not null default 0,
  add column if not exists charging_duration_seconds numeric(12,3),
  add column if not exists battery_only_duration_seconds numeric(12,3),
  add column if not exists total_duration_seconds numeric(12,3),
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_device_battery_cycles_device_cycle_start
  on public.device_battery_cycles (device_uuid, cycle_start_at);

create index if not exists idx_device_battery_cycles_device_code
  on public.device_battery_cycles (device_code, cycle_start_at desc);

create index if not exists idx_device_battery_cycles_open_cycle
  on public.device_battery_cycles (device_uuid, cycle_status)
  where cycle_end_at is null;

alter table public.device_battery_cycles enable row level security;

-- No anon/authenticated policies are created.
-- This table is intended for service_role / server-side ingestion only.

