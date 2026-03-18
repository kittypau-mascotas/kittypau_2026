-- Agrega columnas de límites de consumo normal por mascota.
-- Usados por el frontend (story/page.tsx) para reclasificar sesiones
-- según umbrales personalizados del dueño.

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS food_normal_min_g  integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS food_normal_max_g  integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_normal_min_ml integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_normal_max_ml integer DEFAULT NULL;

COMMENT ON COLUMN public.pets.food_normal_min_g   IS 'Límite inferior de consumo normal de comida (g)';
COMMENT ON COLUMN public.pets.food_normal_max_g   IS 'Límite superior de consumo normal de comida (g)';
COMMENT ON COLUMN public.pets.water_normal_min_ml IS 'Límite inferior de consumo normal de agua (ml)';
COMMENT ON COLUMN public.pets.water_normal_max_ml IS 'Límite superior de consumo normal de agua (ml)';
