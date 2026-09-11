-- Endurecimiento de seguridad a partir de los hallazgos del linter de Supabase
-- (2026-09-11). Todo lo relacionado a /admin queda explícitamente fuera de
-- este cambio (a pedido de Mauro: "admin panel esta pendiente, no trabajes
-- nada ahi") -- admin_dashboard_live, finance_purchases(_summary),
-- finance_admin_summary, admin_object_stats(), admin_roles se dejan tal cual.
--
-- Verificado antes de escribir esto (consulta directa a la DB, no solo el
-- código): device_commands se usa siempre vía `supabaseServer` (service_role)
-- en las 3 rutas que lo tocan (tare/wifi/interval) y en el bridge -- activar
-- RLS sin policies no rompe nada, solo cierra el acceso anon/authenticated.
-- Los 7 RPC de abajo no tienen ningún caller en kittypau_app/src ni en
-- bridge/ -- son triggers (sync_device_battery_cycle, sync_device_power_session,
-- lock_device_owner, update_device_from_reading -- estos 2 últimos NO se tocan
-- acá, solo search_path) o mantenimiento manual por SQL editor.

-- 1) device_commands sin RLS -- cualquiera con la anon key podía leer/escribir
--    comandos hacia los dispositivos físicos. Sin policies, service_role sigue
--    con bypass total (como ya lo usa la app); anon/authenticated quedan en 0.
alter table public.device_commands enable row level security;

-- 2) Funciones SECURITY DEFINER ejecutables por anon/authenticated sin
--    necesidad -- ninguna tiene caller en el código de la app (device_commands
--    RPCs se llaman todas vía service_role) o son triggers que no necesitan
--    grant explícito para dispararse. REVOKE de PUBLIC es el fix real: Postgres
--    otorga EXECUTE a PUBLIC automáticamente al crear una función, y revocar
--    solo de roles nombrados (anon/authenticated) no alcanza -- ya nos pasó una
--    vez con record_demo_ingreso_v2 (confirmado con el ACL real: `{=X/postgres,...}`,
--    el `=X` sin nombre de rol es el grant a PUBLIC que nunca se había revocado).
revoke all on function public.claim_device_for_pet(uuid, uuid, uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.link_device_to_pet(uuid, uuid, text, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.close_stale_device_power_sessions(integer)
  from public, anon, authenticated;
revoke all on function public.rebuild_device_bowl_sessions(uuid, text)
  from public, anon, authenticated;
revoke all on function public.rebuild_device_power_sessions(text, integer)
  from public, anon, authenticated;
revoke all on function public.sync_device_battery_cycle()
  from public, anon, authenticated;
revoke all on function public.sync_device_power_session()
  from public, anon, authenticated;
-- Reaplicado por completitud -- ya estaba revocado de anon/authenticated
-- (migración 20260910120000), pero nunca de PUBLIC.
revoke all on function public.record_demo_ingreso_v2(text, text, text, text, text, text)
  from public, anon, authenticated;

-- 3) Vista SECURITY DEFINER sin ningún caller detectado en el código --
--    bypasea el RLS de las tablas base para quien la consulte. Se revoca el
--    acceso en vez de reescribirla a SECURITY INVOKER (no se leyó la query
--    completa de la vista en esta pasada -- cambiar su semántica sin eso es
--    más riesgo del necesario para algo que hoy nadie usa desde la app).
revoke all on public.device_bowl_sessions_today from public, anon, authenticated;

-- 4) function_search_path_mutable -- mismo fix que ya se le hizo a
--    record_demo_ingreso (migración 20260311123000_fix_record_demo_ingreso_search_path).
--    DO dinámico en vez de tipear las firmas a mano: evita un error de firma
--    (p.ej. lock_device_owner() vs otra sobrecarga) y es igual de explícito
--    sobre qué 3 funciones toca.
do $$
declare
  r record;
begin
  for r in
    select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('lock_device_owner', 'update_device_from_reading', 'match_knowledge_docs')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.oid::regprocedure);
  end loop;
end $$;

-- 5) public_bucket_allows_listing -- el bucket kittypau-photos ya es público
--    (sirve fotos de mascota por URL directa via /storage/v1/object/public/...,
--    que NO depende de policies en storage.objects). La policy "Public read
--    access" solo suma la capacidad de LISTAR todos los archivos del bucket,
--    algo que la app nunca usa (siempre pide/guarda una URL puntual). Verificado
--    antes de tocar: la policy está scopeada a bucket_id = 'kittypau-photos'
--    (no es genérica a otros buckets).
drop policy if exists "Public read access" on storage.objects;

-- Fuera de alcance a propósito, documentado para retomar aparte:
-- - extension_in_public (vector): moverla de schema rompe el resolve de
--   match_knowledge_docs (usa el tipo `vector` en su firma) si no se ajusta
--   el search_path a la vez -- requiere probar el RAG end-to-end antes de
--   aplicar, no es un revoke de bajo riesgo como el resto de este archivo.
-- - auth_leaked_password_protection: toggle del dashboard de Supabase Auth,
--   no es SQL.
-- - Todo lo "admin_"/"finance_" (ver comentario del encabezado).
