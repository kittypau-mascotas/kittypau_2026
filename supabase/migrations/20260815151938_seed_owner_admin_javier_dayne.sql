-- SPEC_01 E2: admin_roles quedó vacía porque la migración original
-- (20260212080000_admin_roles_and_dashboard.sql) buscaba a
-- 'javomauro.contacto@gmail.com' en auth.users, y ese email nunca se registró.
-- La cuenta admin/tester real es javier.dayne@gmail.com (existe desde 2026-03-10).
-- No se edita la migración vieja (ya aplicada) — se suma esta.
insert into public.admin_roles (user_id, role, active)
values ('f3346342-2b84-4116-aa6f-77ee7458914b', 'owner_admin', true)
on conflict (user_id) do update
  set role = 'owner_admin',
      active = true,
      updated_at = now();
