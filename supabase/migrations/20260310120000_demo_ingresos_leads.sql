-- Demo leads "bandeja": deduplicated by email, with counters and last_seen.
-- Keeps audit_events as immutable history log.

create table if not exists public.demo_ingresos (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  owner_name text,
  pet_name text,
  source text not null default 'demo_app',
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  count integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint demo_ingresos_email_key unique (email),
  constraint demo_ingresos_email_format check (position('@' in email) > 1)
);

create index if not exists demo_ingresos_last_seen_at_idx
  on public.demo_ingresos (last_seen_at desc);

alter table public.demo_ingresos enable row level security;

revoke all on table public.demo_ingresos from anon, authenticated;

create or replace function public.record_demo_ingreso(
  p_email text,
  p_owner_name text default null,
  p_pet_name text default null,
  p_source text default 'demo_app'
)
returns public.demo_ingresos
language plpgsql
as $$
declare
  v_email text;
  v_owner text;
  v_pet text;
  v_source text;
  v_row public.demo_ingresos;
begin
  v_email := lower(trim(p_email));
  if v_email is null or v_email = '' then
    raise exception 'email is required';
  end if;

  v_owner := nullif(trim(p_owner_name), '');
  v_pet := nullif(trim(p_pet_name), '');
  v_source := coalesce(nullif(trim(p_source), ''), 'demo_app');

  insert into public.demo_ingresos (email, owner_name, pet_name, source)
  values (v_email, v_owner, v_pet, v_source)
  on conflict (email) do update set
    owner_name = coalesce(excluded.owner_name, public.demo_ingresos.owner_name),
    pet_name = coalesce(excluded.pet_name, public.demo_ingresos.pet_name),
    source = excluded.source,
    last_seen_at = now(),
    count = public.demo_ingresos.count + 1,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

comment on table public.demo_ingresos is 'Deduplicated demo ingreses (lead inbox). Use audit_events for immutable history.';
comment on function public.record_demo_ingreso(text, text, text, text) is 'Upsert demo_ingresos by email and increment count.';

