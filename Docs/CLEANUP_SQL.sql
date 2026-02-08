-- Cleanup / Backfill helpers (manual, use with caution)
-- Always run SELECT previews first.

-- 1) Orphan readings (device missing)
-- Preview
select r.id, r.device_id, r.recorded_at
from public.readings r
left join public.devices d on d.id = r.device_id
where d.id is null
order by r.recorded_at desc
limit 100;

-- Delete (uncomment when ready)
-- delete from public.readings r
-- using public.devices d
-- where r.device_id = d.id and d.id is null;

-- 2) Test devices by code pattern
-- Preview
select id, device_code, created_at
from public.devices
where device_code like 'KPCL%';

-- Delete specific test devices (fill ids)
-- delete from public.devices
-- where id in (
--   'UUID_1',
--   'UUID_2'
-- );

-- 3) Backfill device_state based on last_seen
-- Preview
select id, device_state, last_seen
from public.devices
where device_state = 'factory' and last_seen is not null;

-- Backfill
-- update public.devices
-- set device_state = 'linked'
-- where device_state = 'factory' and last_seen is not null;
