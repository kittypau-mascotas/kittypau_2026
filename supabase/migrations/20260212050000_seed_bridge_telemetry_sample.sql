-- Seed initial bridge telemetry sample row
insert into public.bridge_telemetry (
  device_id,
  device_type,
  device_model,
  hostname,
  wifi_ssid,
  wifi_ip,
  uptime_min,
  ram_used_mb,
  ram_total_mb,
  disk_used_pct,
  cpu_temp,
  bridge_status,
  recorded_at
)
values (
  'KPBR0001',
  'bridge',
  'Raspberry Pi Zero 2 W',
  'kittypau-bridge',
  'Casa 15',
  '192.168.1.90',
  444,
  221,
  426,
  19,
  46.698,
  'active',
  '2026-02-12T04:22:00.661Z'::timestamptz
)
on conflict do nothing;
