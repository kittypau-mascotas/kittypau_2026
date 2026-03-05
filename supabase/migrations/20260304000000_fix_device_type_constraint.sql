-- Fix devices_device_type_check constraint
-- Agrega 'food_bowl' y 'water_bowl' (valores enum app) además de los valores raw del firmware.
-- Ejecutado manualmente via SQL Editor 2026-03-04.

ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_type_check;

ALTER TABLE public.devices ADD CONSTRAINT devices_device_type_check
CHECK (device_type IN ('food_bowl','water_bowl','comedero','bebedero','comedero_cam','bebedero_cam','bridge'));
