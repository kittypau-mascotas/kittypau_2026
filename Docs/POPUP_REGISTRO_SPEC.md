# Mini-spec: Pop-up de Registro (Kittypau)

## Objetivo
Guiar al usuario en un solo flujo visual con progreso persistente hasta completar:
**Usuario -> Mascota -> Dispositivo**.

---

## Comportamiento general
- Se abre al click de "Registrarse".
- Modal/popup bloqueante (no permite navegar fuera del flujo).
- Puede cerrarse con confirmacion, pero **guarda progreso**.
- Reanudacion automatica al volver a abrir la app.

---

## Estados UI del pop-up
1. **Idle**: listo para iniciar.
2. **Step: Usuario**
3. **Step: Mascota**
4. **Step: Dispositivo**
5. **Loading**: guardando cambios.
6. **Success**: completo.
7. **Error**: muestra error recuperable.

---

## Barra de progreso
3 hitos visuales:
1. Usuario
2. Mascota
3. Dispositivo

- Se marca completo al terminar cada step.
- Se puede mostrar porcentaje (33% / 66% / 100%).

---

## Eventos UX esperados
- `popup_opened`
- `step_completed:user`
- `step_completed:pet`
- `step_completed:device`
- `popup_closed`
- `popup_resumed`
- `popup_completed`

---

## Persistencia de progreso
Guardar:
- `user_onboarding_step`
- `pet_onboarding_step`
- `device_onboarding_step`

Si el usuario sale:
- Reabrir en el ultimo step no completado.

---

## Errores esperados
- Sin internet -> mostrar retry.
- Email existente -> mensaje claro.
- Dispositivo ya vinculado -> pedir escanear otro QR.
- Sesion expirada -> re-login.

---

## Reglas clave
- No permitir finalizar sin QR valido y mascota asociada.
- Si el usuario no es dueno, pedir `owner_name`.
- Si el canal incluye WhatsApp, pedir `phone_number`.

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
