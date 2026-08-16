-- Spec: Knowledge/29_Specs/002-registro-flow-unificado (data-model.md)
-- Aditivo: agrega la 3ra sección de la Ficha Detallada (Origen y Hábitat) a public.pets.
-- origin y living_environment YA existen (no se tocan) — solo se agrega el jsonb de
-- Estado al llegar / Convivencia + su timestamp de completado, mismo patrón que
-- health_profile/feeding_profile. No modifica ni elimina ninguna columna existente.

alter table public.pets
  add column if not exists origin_habitat_profile jsonb not null default '{}'::jsonb,
  add column if not exists origin_habitat_completed_at timestamptz;
