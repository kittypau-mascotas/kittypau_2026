ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz not null default now();

ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS clock_invalid boolean not null default false;