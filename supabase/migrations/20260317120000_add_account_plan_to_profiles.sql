-- Add account plan to profiles (Plan A/B/C)
-- Purpose: tag each user/profile with the commercial plan they have.

alter table public.profiles
  add column if not exists account_plan text not null default 'plan_a';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_account_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_plan_check
      check (account_plan in ('plan_a','plan_b','plan_c'));
  end if;
end $$;

