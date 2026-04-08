-- Ensure KPCL0036 is marked as water bowl (bebedero)
update public.devices
set device_type = 'water_bowl'
where device_id = 'KPCL0036';
