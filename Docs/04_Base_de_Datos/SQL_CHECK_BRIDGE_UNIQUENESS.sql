-- 1) Duplicados en bridge_heartbeats
select bridge_id, count(*) as cnt
from public.bridge_heartbeats
group by bridge_id
having count(*) > 1;

-- 2) Cuantos bridges distintos hay
select count(distinct bridge_id) as distinct_bridge_ids
from public.bridge_heartbeats;

-- 3) Valores existentes
select distinct bridge_id
from public.bridge_heartbeats
order by bridge_id;

-- 4) Telemetry: ids distintos
select count(distinct device_id) as distinct_device_ids
from public.bridge_telemetry;

-- 5) Telemetry: valores existentes
select distinct device_id
from public.bridge_telemetry
order by device_id;

-- 6) Heartbeat vs Telemetry mismatch
select h.bridge_id
from public.bridge_heartbeats h
left join (select distinct device_id from public.bridge_telemetry) t on t.device_id = h.bridge_id
where t.device_id is null;

select t.device_id
from (select distinct device_id from public.bridge_telemetry) t
left join (select distinct bridge_id from public.bridge_heartbeats) h on h.bridge_id = t.device_id
where h.bridge_id is null;
