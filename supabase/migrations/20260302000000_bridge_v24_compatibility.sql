-- ============================================================
-- Bridge v2.4 Compatibility Migration
-- ============================================================
-- El bridge v2.4 (bridge/src/index.js) escribe directamente
-- a Supabase usando device_id TEXT (no UUID FK).
-- Esta migration:
--   1. Crea tabla sensor_readings compatible con bridge v2.4
--   2. Extiende bridge_heartbeats con telemetria del bridge
-- ============================================================

-- 1. Tabla sensor_readings (bridge v2.4 escribe aqui con device_id TEXT)
create table if not exists public.sensor_readings (
  id bigserial primary key,
  device_id text not null,
  weight_grams numeric,
  temperature numeric,
  humidity numeric,
  light_lux numeric,
  light_percent numeric,
  light_condition text,
  device_timestamp timestamptz,
  ingested_at timestamptz not null default now()
);

-- If the table already exists with a different schema (older/newer),
-- ensure `ingested_at` exists so the index creation below is idempotent.
alter table public.sensor_readings
  add column if not exists ingested_at timestamptz not null default now();

create index if not exists idx_sensor_readings_device_ingested
  on public.sensor_readings (device_id, ingested_at desc);

alter table public.sensor_readings enable row level security;

-- Solo el service_role puede leer/escribir sensor_readings
-- (el bridge usa SUPABASE_SERVICE_ROLE_KEY que bypasa RLS)
-- No crear políticas anon/authenticated para esta tabla.

-- 2. Extender bridge_heartbeats con campos de telemetria bridge v2.4
alter table public.bridge_heartbeats
  add column if not exists device_type text,
  add column if not exists device_model text,
  add column if not exists hostname text,
  add column if not exists wifi_ssid text,
  add column if not exists ram_used_mb int,
  add column if not exists ram_total_mb int,
  add column if not exists disk_used_pct numeric,
  add column if not exists cpu_temp numeric;
