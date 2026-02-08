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

create index if not exists idx_bridge_heartbeats_last_seen
  on public.bridge_heartbeats(last_seen desc);

alter table public.bridge_heartbeats enable row level security;
