# Mini-spec: Pop-up de Registro (Kittypau)

## Objetivo
Guiar al usuario en un solo flujo (sin salir de `/login`) con progreso persistente hasta completar:
**Cuenta -> Usuario -> Mascota -> Dispositivo**.

## Comportamiento general
- Se abre al click de "Crear cuenta" (y tambien al click de la ilustracion "Bandida").
- Modal/popup bloqueante.
- Puede cerrarse con confirmacion, pero guarda progreso.
- Reanudacion automatica al volver a abrir el pop-up.
- Si la cuenta ya esta confirmada (hay sesion Supabase), el pop-up salta automaticamente al Paso 2 (Usuario).

## Estados UI del pop-up
1. Idle: listo para iniciar.
2. Step 1: Cuenta.
3. Step 2: Usuario.
4. Step 3: Mascota.
5. Step 4: Dispositivo.
6. Loading: guardando cambios.
7. Success: completo.
8. Error: muestra error recuperable.

## Barra de progreso
4 hitos visuales:
1. Cuenta
2. Usuario
3. Mascota
4. Dispositivo

- Se marca completo al terminar cada step.
- Se muestra como "Paso X / 4" y un stepper visual.

## Persistencia de progreso
Se apoya en los estados ya existentes en DB:
- `profiles.user_onboarding_step`
- `pets.pet_onboarding_step`
- Vinculo device<->pet + `devices.device_state`

Regla UX: si el usuario cierra, al reabrir se debe continuar en el ultimo step no completado.

## Errores esperados
- Sin internet -> mostrar retry.
- Email existente -> mensaje claro.
- Dispositivo ya vinculado -> pedir escanear otro QR.
- Sesion expirada -> re-login.

## Reglas clave
- No permitir finalizar sin mascota asociada y dispositivo vinculado.
- Si el usuario no es dueno, pedir `owner_name`.
- Si el canal incluye WhatsApp, pedir `phone_number`.

## Confirmacion por correo (Supabase)
Objetivo: cuando el usuario confirma el correo, debe volver al mismo pop-up y continuar en Paso 2 (Usuario) sin usar la pagina `/onboarding`.

### Redirect URL (frontend)
- En `signUp`, `emailRedirectTo` apunta a: `/login?register=1&verified=1`

### Variantes de confirmacion soportadas
- PKCE: `/login?register=1&code=...`
  - Se usa `exchangeCodeForSession(code)` y luego se avanza a onboarding.
- OTP/hash: `/login?register=1&type=signup&token_hash=...`
  - Se usa `verifyOtp({ type, token_hash })` y luego se avanza a onboarding.
- Mensaje simple: `/login?register=1&verified=1`
  - Abre el pop-up. En cuanto exista sesion (confirmacion en otra pestaña), el pop-up avanza a Paso 2.

### Regla UX en Step 1
- Si `signUp` no entrega `session` (lo normal con confirmacion por correo), el Step 1 muestra:
  - "Revisa tu correo (y spam) para confirmar... Cuando confirmes, volveras aqui y pasaremos automaticamente al paso Usuario."

---

# Mini-spec: Modo Guia (primer ingreso)

## Objetivo
En el primer ingreso con usuario + mascota + dispositivo listos, mostrar un modo guia para aprender a usar Kittypau.

## Comportamiento
- Popup/modal con fondo difuminado.
- Se activa solo la primera vez (flag `first_time_guide_seen = true`).
- Se puede cerrar, pero recomienda completar.
- Si se cierra, puede reabrirse desde Settings.

## Estados UI
1. Intro: bienvenida.
2. Paso 1: ver dashboard.
3. Paso 2: interpretar grafico.
4. Paso 3: revisar estado del plato.
5. Final: listo.

## Persistencia
- Guardar `first_time_guide_seen` en perfil de usuario.

## Actualización UI/UX (2026-02-17)

### Stepper y navegación entre pasos
- Los pasos del stepper son clickeables en modal: `Cuenta`, `Usuario`, `Mascota`, `Dispositivo`.
- El estado completado de cada etapa se refleja en verde (`done`) con check visual.
- Se mantiene validación real por etapa (no solo navegación visual).

### Contenido superior del popup
- Se eliminó el bloque descriptivo redundante por etapa en el header del modal.
- Se conserva únicamente el banner verde de confirmación de cuenta en el paso de Cuenta cuando aplica.

### Paso Dispositivo
- Selector de tipo migrado a cards visuales:
  - `Comida` (`/illustrations/food.png`)
  - `Agua` (`/illustrations/water.png`)
- El tipo seleccionado se mantiene en el resumen final del registro.

### Finalización del flujo
- Pantalla final actualizada a `Bienvenido a Kittypau`.
- Resumen final ampliado con:
  - Cuenta
  - Perfil
  - Mascotas
  - Dispositivos
  - Foto de perfil (si existe)
  - Foto de mascota (si existe)
- Botón final: `Continuar al dashboard`.
