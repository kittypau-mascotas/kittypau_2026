-- Knowledge/29_Specs/009-demo-today-en-vivo (US3): capturar leads de la demo
-- SIN email, dedupeados por visitor_id (uuid del navegador), y guardar el
-- tipo de mascota. El email sigue siendo la clave cuando existe.

-- 1) email deja de ser obligatorio ------------------------------------------
alter table public.demo_ingresos alter column email drop not null;

alter table public.demo_ingresos
  drop constraint if exists demo_ingresos_email_format;
alter table public.demo_ingresos
  add constraint demo_ingresos_email_format
  check (email is null or position('@' in email) > 1);

-- 2) columnas nuevas -------------------------------------------------------------
alter table public.demo_ingresos add column if not exists visitor_id text;
alter table public.demo_ingresos add column if not exists pet_type text;

-- Dedupe de leads anónimos: 1 fila por visitor_id ENTRE los que no tienen email
-- (el unique(email) existente ya cubre los que sí; Postgres permite varios NULL).
create unique index if not exists demo_ingresos_visitor_uniq
  on public.demo_ingresos (visitor_id)
  where email is null;

-- 3) RPC v2 -- upsert por email si hay, por visitor_id si no --------------------
create or replace function public.record_demo_ingreso_v2(
  p_visitor_id text,
  p_email text default null,
  p_owner_name text default null,
  p_pet_name text default null,
  p_pet_type text default null,
  p_source text default 'demo_app'
)
returns public.demo_ingresos
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_visitor text;
  v_owner text;
  v_pet text;
  v_type text;
  v_source text;
  v_row public.demo_ingresos;
begin
  v_email := lower(nullif(trim(p_email), ''));
  v_visitor := nullif(trim(p_visitor_id), '');
  v_owner := nullif(trim(p_owner_name), '');
  v_pet := nullif(trim(p_pet_name), '');
  v_type := lower(nullif(trim(p_pet_type), ''));
  v_source := coalesce(nullif(trim(p_source), ''), 'demo_app');

  if v_email is null and v_visitor is null then
    raise exception 'record_demo_ingreso_v2: se necesita email o visitor_id';
  end if;

  if v_email is not null then
    insert into public.demo_ingresos
      (email, visitor_id, owner_name, pet_name, pet_type, source)
    values (v_email, v_visitor, v_owner, v_pet, v_type, v_source)
    on conflict (email) do update set
      visitor_id = coalesce(public.demo_ingresos.visitor_id, excluded.visitor_id),
      owner_name = coalesce(excluded.owner_name, public.demo_ingresos.owner_name),
      pet_name   = coalesce(excluded.pet_name,   public.demo_ingresos.pet_name),
      pet_type   = coalesce(excluded.pet_type,   public.demo_ingresos.pet_type),
      source = excluded.source,
      last_seen_at = now(),
      count = public.demo_ingresos.count + 1,
      updated_at = now()
    returning * into v_row;
  else
    insert into public.demo_ingresos
      (email, visitor_id, owner_name, pet_name, pet_type, source)
    values (null, v_visitor, v_owner, v_pet, v_type, v_source)
    on conflict (visitor_id) where email is null do update set
      owner_name = coalesce(excluded.owner_name, public.demo_ingresos.owner_name),
      pet_name   = coalesce(excluded.pet_name,   public.demo_ingresos.pet_name),
      pet_type   = coalesce(excluded.pet_type,   public.demo_ingresos.pet_type),
      source = excluded.source,
      last_seen_at = now(),
      count = public.demo_ingresos.count + 1,
      updated_at = now()
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

comment on function public.record_demo_ingreso_v2(text, text, text, text, text, text)
  is 'Upsert demo_ingresos por email (si hay) o por visitor_id (lead anónimo). Reemplaza a record_demo_ingreso.';

revoke all on function public.record_demo_ingreso_v2(text, text, text, text, text, text)
  from anon, authenticated;
