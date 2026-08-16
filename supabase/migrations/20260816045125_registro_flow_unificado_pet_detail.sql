-- Spec: Knowledge/29_Specs/002-registro-flow-unificado (data-model.md)
-- Aditivo: agrega campos de Registro Básico ampliado y Ficha Detallada (Salud/Alimentación)
-- a public.pets. No modifica ni elimina ninguna columna existente.

alter table public.pets
  add column if not exists sex text,
  add column if not exists microchip_number text,
  add column if not exists birth_date date,
  add column if not exists intake_date date,
  add column if not exists health_profile jsonb not null default '{}'::jsonb,
  add column if not exists feeding_profile jsonb not null default '{}'::jsonb,
  add column if not exists health_profile_completed_at timestamptz,
  add column if not exists feeding_profile_completed_at timestamptz;
