-- SPEC_01 E2, continuación (2026-08-15): a pedido de Mauro, reemplaza a
-- javier.dayne@gmail.com como admin por javomauro.contacto@gmail.com.
--
-- ⚠️ El usuario en auth.users y su password se crearon vía Admin API en esta
-- sesión (no reproducible solo con esta migración SQL — auth.users no se
-- puede insertar por SQL directo). Este archivo documenta el estado de
-- `admin_roles`/`profiles` resultante, no recrea la cuenta desde cero.
--
-- user_id de javomauro.contacto@gmail.com: 0c4e6e8b-5890-46c0-ba66-2d19672b52df

insert into public.profiles (
  id, email, user_name, is_owner, owner_name, city, country, user_onboarding_step
)
values (
  '0c4e6e8b-5890-46c0-ba66-2d19672b52df',
  'javomauro.contacto@gmail.com',
  'Admin Kittypau',
  true,
  'Admin Kittypau',
  'Santiago',
  'CL',
  'completed'
)
on conflict (id) do update
  set email = excluded.email;

insert into public.admin_roles (user_id, role, active)
values ('0c4e6e8b-5890-46c0-ba66-2d19672b52df', 'owner_admin', true)
on conflict (user_id) do update
  set role = 'owner_admin',
      active = true,
      updated_at = now();

-- Reemplaza a javier.dayne@gmail.com (no se borra la fila, queda inactiva —
-- reversible con un solo UPDATE si se necesita revertir).
update public.admin_roles
set active = false,
    updated_at = now()
where user_id = 'f3346342-2b84-4116-aa6f-77ee7458914b';
