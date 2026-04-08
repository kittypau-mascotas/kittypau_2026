-- Allow multiple active devices per pet (food + water)
drop index if exists public.idx_devices_active_per_pet;
