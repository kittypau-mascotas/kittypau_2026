-- Allow duplicate readings only for KPCL0034.
-- Current device UUID resolved from public.devices.device_id = 'KPCL0034'.
-- If the device is recreated with a new UUID, this migration must be updated.

drop index if exists public.idx_readings_device_recorded_at_unique;

create unique index if not exists idx_readings_device_recorded_at_unique
  on public.readings(device_id, recorded_at)
  where device_id <> '9510a455-b0e9-4932-8be1-03976d31228a';

