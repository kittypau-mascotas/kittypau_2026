-- Agrega columna plan a profiles
-- Valores: 'free' | 'premium'
-- Default: 'free'

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'premium'));

COMMENT ON COLUMN public.profiles.plan IS 'Plan de suscripción del usuario: free (3 días historial) o premium (365 días)';
