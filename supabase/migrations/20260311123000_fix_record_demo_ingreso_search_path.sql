-- Security Advisor: function_search_path_mutable
-- Fix: lock down search_path for role-executed functions.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure::text as regproc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_demo_ingreso'
  loop
    execute format(
      'alter function %s set search_path = public, pg_temp',
      fn.regproc
    );
  end loop;
end $$;

