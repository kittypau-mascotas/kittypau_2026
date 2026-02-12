create or replace view public.bridge_status_live as
with kpcl_stats as (
  select
    count(*) filter (where d.device_id like 'KPCL%')::integer as kpcl_total_devices,
    count(*) filter (
      where d.device_id like 'KPCL%'
        and (d.last_seen is null or d.last_seen < (now() - interval '5 minutes'))
    )::integer as kpcl_offline_devices
  from public.devices d
)
select
  h.bridge_id as device_id,
  coalesce(t.device_type, 'bridge') as device_type,
  t.device_model,
  t.hostname,
  t.wifi_ssid,
  coalesce(t.wifi_ip, h.ip) as wifi_ip,
  coalesce(t.uptime_min, (h.uptime_sec / 60))::integer as uptime_min,
  t.ram_used_mb,
  t.ram_total_mb,
  t.disk_used_pct,
  t.cpu_temp,
  case
    when h.last_seen is null then 'offline'
    when h.last_seen < (now() - interval '2 minutes') then 'offline'
    when h.mqtt_connected = false then 'degraded'
    else 'active'
  end as bridge_status,
  h.last_seen,
  h.last_mqtt_at,
  t.recorded_at as telemetry_recorded_at,
  h.created_at,
  s.kpcl_total_devices,
  greatest(0, s.kpcl_total_devices - s.kpcl_offline_devices)::integer as kpcl_online_devices,
  s.kpcl_offline_devices
from public.bridge_heartbeats h
left join lateral (
  select bt.*
  from public.bridge_telemetry bt
  where bt.device_id = h.bridge_id
  order by bt.recorded_at desc
  limit 1
) t on true
cross join kpcl_stats s;
