# Quickstart: validar Registro unificado end-to-end

## Prerrequisitos (requieren confirmación explícita antes de aplicarse — Principio III)

1. Migración aplicada: `supabase/migrations/<timestamp>_registro_flow_unificado_pet_detail.sql`
   (ver `data-model.md`).
2. Toggle "Confirm email" activado en el dashboard de Supabase Auth del proyecto
   (`zjdyhpntftgaynchqwfk`).
3. Plantilla "Confirm signup" editada con `mailer_subjects_confirmation` y el cuerpo del correo
   usando `{{ .Data.user_name }}` / `{{ .Data.pet_name }}` (ver `research.md` #4).
4. `npm run dev` corriendo en `kittypau_app/` (`http://localhost:3000`).

## Escenario 1 — Registro de punta a punta con correo personalizado (US1, US2)

1. Ir a `/login`, abrir "Crear cuenta".
2. Confirmar que el stepper muestra **3** posiciones: Usuario, Mascota, [logo Kittypau] — no 4.
3. En el paso 1, completar Avatar → Tu Nombre → Nombre de tu Mascota → Comuna → Email →
   Contraseña, en ese orden (FR-011). Confirmar que el botón de envío sigue deshabilitado hasta
   que Nombre y Nombre de Mascota tengan valor (FR-012).
4. Enviar. Esperado: cuenta creada en estado pendiente de confirmación (sin sesión activa
   todavía) — mensaje pidiendo revisar el correo.
5. Revisar el correo recibido: el asunto y el cuerpo deben incluir el nombre ingresado y el
   nombre de la mascota (FR-014) — no un correo genérico.
6. Click en el enlace de confirmación → vuelve a la app → el registro continúa automáticamente
   en el paso "Mascota" (paso 2), sin pedir de nuevo email/contraseña (FR-004).
7. Confirmar que el nombre de la mascota ya aparece precargado en el paso Mascota (FR-013).

## Escenario 2 — Registro Básico vs. Ficha Detallada (US4)

1. En el paso "Mascota", completar solo los campos del Registro Básico (Especie, Sexo, Origen,
   Edad + fecha según Origen, Peso, Tamaño, esterilización, microchip sin número, flag de
   salud) — sin tocar Salud ni Alimentación.
2. Confirmar que se puede avanzar al paso 3 (Kittypau) sin completar la Ficha Detallada
   (FR-016).
3. Elegir un Origen de "fecha conocida" (ej. "Nació en casa") → confirmar que el campo de
   fecha dice "Fecha de nacimiento". Cambiar a un Origen de "fecha no conocida" (ej.
   "Rescatado de la calle") → confirmar que dice "Fecha de llegada / adopción" (FR-019).

## Escenario 3 — Círculo rojo en el menú (US6)

1. Con la mascota del Escenario 2 (Ficha Detallada sin completar), navegar a cualquier pantalla
   post-login y confirmar que el ítem "Mascota" del menú tiene el círculo rojo.
2. Ir a `/pet`, completar y guardar la sección Salud únicamente. Confirmar que el círculo rojo
   **sigue** visible (falta Alimentación — FR-027).
3. Completar y guardar Alimentación también. Confirmar que el círculo rojo desaparece.

## Escenario 4 — Ajuste a pantalla + columna única (US3, US5)

1. Repetir el Escenario 1 en 3 viewports: desktop grande, laptop achicada (ej. 1366×650), y
   móvil (ej. 375×667 o el APK empaquetado).
2. En cada uno, confirmar: ningún campo se corta sin acceso (scroll disponible si hace falta),
   ningún paso muestra 2+ campos por fila, las preguntas sí/no son radio buttons apilados.
3. Medir (DevTools o script) que inputs/botones miden ≥48px y el texto de labels/inputs ≥16px.

*(Patrón de verificación ya usado en este mismo spec durante Phase 0: Playwright con
`devices['iPhone SE']` / `devices['Pixel 7']` contra el dev server local, con una cuenta de
prueba descartable tipo `qa.<contexto>.<timestamp>@kittypau-test.local` — ver evidencia citada
en `spec.md` § User Story 3.)*

## Fuera de alcance de esta validación

Comportamiento con múltiples mascotas (spec § Edge Cases, confirmado fuera de alcance por
Mauro) y migración retroactiva de cuentas creadas antes de este cambio.
