-- ============================================================
-- KittyPau Analytics DB — Init
-- Proyecto: kittypau-analytics (Supabase separado)
-- Propósito: almacenar solo data procesada por el Bridge
--            Raw data nunca toca esta DB.
--
-- Tablas:
--   pet_sessions      → una fila por sesión de comida/agua detectada
--   pet_daily_summary → resumen diario por mascota (generado por Bridge)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ────────────────────────────────────────────────────────────

create type session_type_enum as enum ('food', 'water');

create type classification_enum as enum (
  'normal',   -- dentro del rango del baseline ±1σ
  'low',      -- consumió menos de lo habitual
  'high',     -- consumió más de lo habitual
  'skipped'   -- el plato no fue tocado en la ventana esperada
);

-- ────────────────────────────────────────────────────────────
-- 2. pet_sessions
--    Una fila = una visita al plato detectada por el procesador
--    El procesador agrupa lecturas 30s consecutivas donde el
--    peso cambia y detecta inicio/fin de sesión.
-- ────────────────────────────────────────────────────────────

create table public.pet_sessions (
  id                uuid        primary key default gen_random_uuid(),

  -- referencias al proyecto principal (no FK, DB distinta)
  owner_id          uuid        not null,
  pet_id            uuid        not null,
  device_id         text        not null,   -- 'KPCL0031'

  session_type      session_type_enum not null,

  session_start     timestamptz not null,
  session_end       timestamptz not null,
  duration_sec      integer     generated always as (
                      extract(epoch from (session_end - session_start))::integer
                    ) stored,

  -- métricas de consumo
  grams_consumed    numeric(8,2),           -- food bowl: delta de peso
  water_ml          numeric(8,2),           -- water bowl: ml estimados

  -- análisis
  classification    classification_enum not null default 'normal',
  anomaly_score     numeric(6,3),           -- Z-score vs baseline 7 días
  baseline_grams    numeric(8,2),           -- promedio 7d del pet al momento

  -- ambiente durante la sesión
  avg_temperature   numeric(5,2),
  avg_humidity      numeric(5,2),

  -- premium gate: clientes free solo ven últimos 7 días
  -- el Bridge siempre inserta true; la API filtra por plan
  is_premium_data   boolean     not null default true,

  created_at        timestamptz not null default now(),

  constraint chk_session_end_after_start check (session_end >= session_start),
  constraint chk_grams_positive check (grams_consumed is null or grams_consumed >= 0),
  constraint chk_water_positive check (water_ml is null or water_ml >= 0)
);

comment on table public.pet_sessions is
  'Una fila por sesión de alimentación/hidratación detectada por el procesador del Bridge. No contiene lecturas raw.';

-- índices para queries frecuentes de la app
create index idx_pet_sessions_pet_date
  on public.pet_sessions (pet_id, session_start desc);

create index idx_pet_sessions_owner_date
  on public.pet_sessions (owner_id, session_start desc);

create index idx_pet_sessions_device_date
  on public.pet_sessions (device_id, session_start desc);

-- ────────────────────────────────────────────────────────────
-- 3. pet_daily_summary
--    Resumen diario por mascota. El Bridge lo genera al cierre
--    de cada día (o lo actualiza incrementalmente).
--    Fuente para gráficos de tendencia semanal/mensual.
-- ────────────────────────────────────────────────────────────

create table public.pet_daily_summary (
  id                  uuid    primary key default gen_random_uuid(),

  owner_id            uuid    not null,
  pet_id              uuid    not null,
  summary_date        date    not null,

  -- alimentación
  total_food_grams    numeric(10,2) not null default 0,
  food_sessions       integer       not null default 0,

  -- hidratación
  total_water_ml      numeric(10,2) not null default 0,
  water_sessions      integer       not null default 0,

  -- anomalías del día
  anomaly_count       integer not null default 0,
  skipped_meals       integer not null default 0,   -- sesiones tipo 'skipped'

  -- ambiente promedio del día
  avg_temperature     numeric(5,2),
  avg_humidity        numeric(5,2),

  -- primera y última actividad del día
  first_session_at    timestamptz,
  last_session_at     timestamptz,

  -- metadata del procesador
  processed_at        timestamptz not null default now(),
  readings_processed  integer     not null default 0,   -- cuántas lecturas raw se procesaron

  constraint uq_pet_daily unique (pet_id, summary_date)
);

comment on table public.pet_daily_summary is
  'Resumen diario por mascota generado por el Bridge processor. Fuente para gráficos de tendencia y feature de historial premium.';

create index idx_pet_daily_summary_pet_date
  on public.pet_daily_summary (pet_id, summary_date desc);

create index idx_pet_daily_summary_owner_date
  on public.pet_daily_summary (owner_id, summary_date desc);

-- ────────────────────────────────────────────────────────────
-- 4. RLS — acceso solo via service_role (Bridge + API)
--    Los clientes nunca consultan esta DB directamente.
--    La API Next.js usa service_role para leer y filtrar por owner_id.
-- ────────────────────────────────────────────────────────────

alter table public.pet_sessions      enable row level security;
alter table public.pet_daily_summary enable row level security;

revoke all on table public.pet_sessions      from anon, authenticated;
revoke all on table public.pet_daily_summary from anon, authenticated;

create policy kp_service_role_all on public.pet_sessions
  for all to service_role using (true) with check (true);

create policy kp_service_role_all on public.pet_daily_summary
  for all to service_role using (true) with check (true);
