-- Bridge telemetry table (server-only)
create table if not exists public.bridge_telemetry (
  id bigserial primary key,
  device_id text not null check (device_id ~ '^KPBR\d{4}$'),
  device_type text not null default 'bridge' check (device_type = 'bridge'),
  device_model text,
  hostname text,
  wifi_ssid text,
  wifi_ip text,
  uptime_min int check (uptime_min is null or uptime_min >= 0),
  ram_used_mb int check (ram_used_mb is null or ram_used_mb >= 0),
  ram_total_mb int check (ram_total_mb is null or ram_total_mb > 0),
  disk_used_pct numeric check (
    disk_used_pct is null or (disk_used_pct >= 0 and disk_used_pct <= 100)
  ),
  cpu_temp numeric,
  bridge_status text not null default 'active' check (
    bridge_status in ('active','degraded','offline','error','maintenance')
  ),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_bridge_telemetry_device_time
  on public.bridge_telemetry(device_id, recorded_at desc);

create index if not exists idx_bridge_telemetry_status_time
  on public.bridge_telemetry(bridge_status, recorded_at desc);

alter table public.bridge_telemetry enable row level security;
