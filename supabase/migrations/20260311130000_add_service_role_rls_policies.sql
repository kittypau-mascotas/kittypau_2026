-- Supabase Security Advisor: rls_enabled_no_policy (INFO)
-- These tables are intended to be server-only (service_role / internal services).
-- Having RLS enabled with zero policies is safe (it denies access), but the advisor
-- flags it. We add explicit policies for service_role to make intent clear and to
-- satisfy the linter without exposing data to anon/authenticated.

do $$
declare
  t_name text;
  policy_name text := 'kp_service_role_all';
begin
  foreach t_name in array array[
    'audit_events',
    'bridge_heartbeats',
    'demo_ingresos',
    'sensor_readings',
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
      -- Ensure RLS is on (idempotent) and external roles have no direct privileges.
      execute format('alter table public.%I enable row level security', t_name);
      execute format('revoke all on table public.%I from anon, authenticated', t_name);

      -- Replace policy to keep it idempotent across environments.
      execute format('drop policy if exists %I on public.%I', policy_name, t_name);
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        policy_name,
        t_name
      );
    end if;
  end loop;
end $$;

