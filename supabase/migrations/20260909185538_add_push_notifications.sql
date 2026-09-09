-- Push notifications reales (FCM) para "comió"/"le sirvieron" -- ver
-- Knowledge/29_Specs/008-push-notifications-fcm/plan.md.
--
-- push_tokens: un token de Firebase Cloud Messaging por (usuario, celular).
-- El cron server-side (/api/cron/notify-meal-events) los lee via
-- service_role para mandar el push -- no necesita RLS especial para eso,
-- service_role la salta igual. RLS acá es solo para que el propio usuario
-- pueda registrar/borrar su token desde la app.
create table if not exists public.push_tokens (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (user_id = auth.uid());

comment on table public.push_tokens is
'Tokens FCM por (usuario, celular), registrados desde la APK nativa al abrir la app. El cron de push los lee via service_role.';

-- push_notified_meal_events: dedupe -- el cron corre cada N minutos y
-- vuelve a calcular los mismos eventos mientras sigan dentro de
-- WINDOW_DAYS (ver hunger-bar/route.ts); sin esto se reenviaría el mismo
-- push en cada corrida.
create table if not exists public.push_notified_meal_events (
  id bigserial primary key,
  pet_id uuid not null references public.pets(id) on delete cascade,
  category text not null check (category in ('alimentacion', 'servido')),
  event_started_at timestamptz not null,
  notified_at timestamptz not null default now(),
  unique (pet_id, category, event_started_at)
);

create index if not exists idx_push_notified_meal_events_pet
  on public.push_notified_meal_events (pet_id, event_started_at desc);

comment on table public.push_notified_meal_events is
'Registro de qué eventos de comida/servido ya generaron push -- evita reenviar el mismo aviso en cada corrida del cron.';
