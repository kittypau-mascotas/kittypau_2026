# Test UI Onboarding (E2E)

## Objetivo
Validar el flujo completo desde la UI:
registro → confirmación → onboarding (usuario/mascota/dispositivo) → dashboard.

## Prerrequisitos
- Deploy activo en Vercel.
- Supabase Auth configurado con redirect URLs:
  - `/login`
  - `/reset`
  - `/onboarding`
- Bucket `kittypau-photos` creado y policies aplicadas.

## Flujo manual (checklist)
1. **Registro**
   - Ir a `/login` → “Crear cuenta”.
   - Ingresar email + password.
   - Ver mensaje “Revisa tu correo”.
2. **Confirmación**
   - Abrir correo y confirmar.
   - Debe redirigir a `/onboarding`.
3. **Onboarding**
   - Paso 1 (Usuario): completar perfil + subir foto → Guardado → continúa.
   - Paso 2 (Mascota): completar datos + foto → Guardado → continúa.
   - Paso 3 (Dispositivo): `device_id` KPCL + tipo → registrar → `device_linked`.
4. **Dashboard**
   - Redirección a `/today`.
   - Debe mostrar “Modo guía” con nombre de mascota.

## Flujo automatizado (Playwright - plan)
> Pendiente de implementar. Estructura sugerida:
1. Crear usuario vía API Auth (signup).
2. Confirmar usuario vía Admin o link simulado.
3. Ejecutar onboarding con datos de prueba.
4. Verificar navegación a `/today`.

## Datos de prueba sugeridos
- Email: `e2e_<timestamp>@kittypau.test`
- Password: `Test1234!`
- Mascota: `Bandida`, tipo `cat`
- Device: `KPCL0001`, tipo `food_bowl`

