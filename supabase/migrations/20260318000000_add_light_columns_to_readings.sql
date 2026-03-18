-- Agrega columnas de luz a tabla readings
-- El bridge v2.4+ ya escribe estos valores desde data.light

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS light_percent numeric,
  ADD COLUMN IF NOT EXISTS light_lux numeric,
  ADD COLUMN IF NOT EXISTS light_condition text;
