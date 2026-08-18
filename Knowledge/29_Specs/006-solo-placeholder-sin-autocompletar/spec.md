# Feature Specification: Solo Placeholder, Nunca Autocompletar en Login/Registro

**Feature Branch**: `006-solo-placeholder-sin-autocompletar`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "aun aparecen los registros pasados y los correos pasados guardados en las opciones, tanto en correo contraseña etc. Unicamente deja un placeholder en cada uno de estos, que jamas se rellenen con info, unicamente placeholder."

## Contexto que motivó el pedido (verificado en esta sesión, no hipotético)

Durante pruebas reales del flujo de registro con una cuenta de prueba
(`frentecalamari@gmail.com`), el campo de email del **paso 1 (Usuario) del
registro** apareció pre-llenado con ese email y el de contraseña con puntos
(●●●●●●●●), ambos sugeridos por el navegador — no por la app. Esto llevó
directamente a un error real: **"User already registered"**, porque la
persona ya había intentado registrarse antes con esa misma cuenta de prueba
y no había vuelto a borrarla — el navegador "ayudó" reofreciendo datos de un
intento anterior que ya no correspondía usar.

Investigado en el mismo momento: el campo de email del **login** ya tenía un
intento previo de acotar esto (spec 004 — sugerencias propias en vez del
autocompletado nativo, `autoComplete="off"` + `<datalist>`), pero el campo de
email y contraseña del **registro** nunca se tocaron, y siguen con
`autoComplete="email"` / `autoComplete="new-password"` — el navegador los
sigue rellenando solo. Además, ni siquiera `autoComplete="off"` en el email
de login garantiza cero sugerencias en todos los navegadores — es un punto
a resolver técnicamente en la planificación, no algo ya resuelto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Los campos de email y contraseña nunca vienen pre-llenados (Priority: P1)

Una persona abre el formulario de login, de registro, o de recuperar
contraseña. Sin importar qué haya escrito antes en ese navegador (en esa
cuenta o en otra), los campos de email y contraseña aparecen siempre vacíos,
mostrando solo el texto de ejemplo (placeholder) — nunca un valor ya
cargado.

**Why this priority**: Es el pedido explícito y el que causó el bug real
observado (reintentar un registro con datos de una prueba anterior sin
darse cuenta).

**Independent Test**: Guardar una credencial real en el navegador (iniciar
sesión una vez, o registrar una cuenta), cerrar y volver a abrir cualquiera
de los 3 formularios (login, registro, recuperar contraseña), y confirmar
que los campos de email/contraseña están vacíos con su placeholder visible,
no con el valor guardado.

**Acceptance Scenarios**:

1. **Given** el navegador ya tiene guardada una contraseña para un email
   usado antes en Kittypau, **When** la persona abre el formulario de login,
   **Then** el campo de contraseña aparece vacío (no puntos/asteriscos
   representando un valor ya cargado).
2. **Given** la misma situación, **When** la persona abre el formulario de
   **registro** de una cuenta nueva, **Then** ni el email ni la contraseña
   vienen pre-llenados con datos de un registro anterior, aunque haya sido
   con el mismo navegador momentos antes.
3. **Given** la persona empieza a escribir en el campo de email, **When**
   el navegador quisiera ofrecer una sugerencia propia, **Then** esa
   sugerencia no debe aparecer — el único texto visible antes de escribir
   es el placeholder.

---

### User Story 2 - El placeholder sigue guiando qué formato se espera (Priority: P2)

Aunque los campos nunca se pre-llenen, la persona necesita seguir sabiendo
qué tipo de dato va en cada campo (ej. formato de email) sin tener que
adivinar.

**Why this priority**: Evita que "nunca autocompletar" se confunda con
"dejar los campos sin ninguna guía" — el placeholder cumple ese rol y debe
mantenerse.

**Independent Test**: Abrir cualquiera de los 3 formularios sin haber usado
el navegador antes y confirmar que cada campo relevante muestra un
placeholder claro (ej. "tu@email.com").

**Acceptance Scenarios**:

1. **Given** un campo de email vacío, **When** la persona todavía no
   escribió nada, **Then** ve un placeholder tipo "tu@email.com" (ya existe
   en el login, debe existir también en registro y recuperar contraseña).

---

### Edge Cases

- ¿Qué pasa con el autocompletado propio ya construido en spec 004 (sugerencias
  de email del login, acotadas a "usado en este dispositivo")? Esa función
  seguía siendo útil (login legítimo, no un dato de prueba obsoleto) — este
  pedido es más estricto que aquel: acá se pide cero sugerencias de ningún
  tipo, ni siquiera las propias. Ver Assumptions para cómo se concilia.
- ¿Qué pasa si el navegador, pese a todo, sigue ofreciendo autocompletar por su
  cuenta (algunos navegadores ignoran las señales de la página para campos de
  contraseña)? Es una limitación real conocida — el pedido es "hacer lo que la
  plataforma permita para desalentarlo al máximo", no una garantía absoluta
  imposible de dar en todos los navegadores.
- ¿Aplica esto también a otros campos no relacionados a credenciales (nombre,
  comuna, etc.)? El pedido menciona explícitamente "correo contraseña etc." —
  se interpreta como acotado a los campos de identidad/credenciales de
  login-registro-reset, no a todo el formulario de registro (nombre de
  mascota, comuna, etc. no tienen el mismo riesgo de mezclar cuentas de
  prueba).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Los campos de email en login, registro y recuperar contraseña
  DEBEN aparecer siempre vacíos al cargar el formulario, mostrando solo su
  placeholder — nunca un valor recordado por el navegador o por la app.
- **FR-002**: Los campos de contraseña en login y registro DEBEN aparecer
  siempre vacíos al cargar el formulario — nunca un valor guardado por el
  gestor de contraseñas del navegador.
- **FR-003**: El sistema DEBE desalentar activamente cualquier sugerencia de
  autocompletado del navegador sobre estos campos (no alcanza con dejarlos
  en blanco al cargar si el navegador igual muestra un dropdown de
  sugerencias al hacer foco).
- **FR-004**: El placeholder de cada campo (texto de ejemplo) DEBE seguir
  visible y sin cambios de contenido — este pedido solo elimina el
  pre-llenado con datos reales, no la guía de formato.
- **FR-005**: El comportamiento DEBE ser consistente entre los 3
  formularios (login, registro, recuperar contraseña) — ninguno debe quedar
  más permisivo que los otros.

### Key Entities

No aplica — este pedido es puramente de comportamiento de UI en formularios
ya existentes, sin datos nuevos ni cambios de schema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al reabrir cualquiera de los 3 formularios después de haber
  usado el navegador para iniciar sesión o registrarse antes, el 100% de las
  veces los campos de email/contraseña están vacíos.
- **SC-002**: Cero casos de "reintenté sin darme cuenta con datos de una
  prueba anterior" — el error real que motivó este pedido no debería volver
  a ocurrir por esta causa específica.
- **SC-003**: El placeholder de cada campo sigue siendo legible y útil
  (formato de ejemplo) en los 3 formularios.

## Assumptions

- Esto reemplaza/endurece el comportamiento de spec 004 (autocompletado
  propio del email de login) — spec 004 quería sugerencias acotadas al
  dispositivo; este pedido pide directamente ninguna sugerencia. Se
  resuelve a favor de este pedido, más reciente y explícito: el email de
  login tampoco debe mostrar sugerencias, ni siquiera las propias.
- El campo de contraseña nunca debe mostrar un valor pre-cargado en ningún
  formulario — no hay un caso legítimo (a diferencia del email) donde
  "recordar la contraseña visualmente" sea deseable acá.
- Suprimir el autocompletado del navegador es una cuestión de "hacer lo
  posible con las herramientas que da la plataforma web", no algo 100%
  garantizable en todos los navegadores — se documenta como limitación
  conocida, no se promete una solución perfecta universal.
- No se pide deshabilitar el gestor de contraseñas del navegador en general
  (fuera del alcance de una página web) — solo evitar que ESTOS formularios
  específicos se pre-llenen o sugieran activamente.
