-- Security hardening (Supabase Security Advisor)
-- Report: 07 Mar 2026
-- Fixes:
-- 1) Ensure sensitive admin views run as SECURITY INVOKER (avoid privilege escalation)
-- 2) Enable RLS on finance tables exposed via PostgREST and revoke anon/authenticated access

do $$
begin
  -- Views: force security_invoker and lock down privileges.
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'admin_object_stats_live') then
    execute 'alter view public.admin_object_stats_live set (security_invoker = true)';
    -- REVOKE/GRANT for views uses ON TABLE (views are relations).
    execute 'revoke all on table public.admin_object_stats_live from anon, authenticated';
    execute 'grant select on table public.admin_object_stats_live to service_role';
  end if;

  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'finance_admin_summary') then
    execute 'alter view public.finance_admin_summary set (security_invoker = true)';
    execute 'revoke all on table public.finance_admin_summary from anon, authenticated';
    execute 'grant select on table public.finance_admin_summary to service_role';
  end if;
end $$;

do $$
declare
  t_name text;
begin
  -- Tables: enable RLS and remove external-facing access. service_role is used by server routes.
  foreach t_name in array array[
    'finance_kit_components',
    'finance_provider_plans',
    'finance_monthly_snapshots',
    'finance_kpcl_profiles',
    'finance_kpcl_profile_components'
  ]
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = t_name
    ) then
      execute format('alter table public.%I enable row level security', t_name);
      execute format('revoke all on table public.%I from anon, authenticated', t_name);
      execute format('grant select, insert, update, delete on table public.%I to service_role', t_name);
    end if;
  end loop;
end $$;
