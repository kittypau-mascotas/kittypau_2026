# Feature Specification: Registro unificado — verificación por correo, 3 pasos, ajuste a pantalla

**Feature Branch**: `002-registro-flow-unificado`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "1- necesitamos hacer la verificacion por correo al momento de crear la cuenta, eso se debe hacer con supabase. 2- unamos cuenta y usuario. que sean 3 pasos en total Usuario - Mascota - Kittypau (reemplaza por dispositivo) (en esa parte en el flow del registro la letra de kittypau debe ser la marca y el logo en ese tamaño). 3- el contenuido de register flow debe ajustarse al tamaño de la pantalla. vamos con eso en un comienzo, despues veremos el contenido de cada uno de los pasos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear cuenta con verificación por correo (Priority: P1)

Una persona nueva completa el formulario de registro (email + contraseña) y, antes de poder
usar la cuenta, debe confirmar su dirección de correo a través de un enlace que Supabase le
envía. Solo después de confirmar, puede continuar con el resto del registro (perfil de
usuario, mascota, dispositivo).

**Why this priority**: Es la base de seguridad de todo el flujo — sin esto, cualquier persona
puede crear una cuenta con un correo que no le pertenece. Es también el requisito que el
usuario pidió primero.

**Independent Test**: Registrar una cuenta nueva con un email real, confirmar que no se puede
avanzar al paso "Usuario" sin hacer clic en el enlace de confirmación recibido por correo, y
que al hacer clic el flujo retoma automáticamente donde quedó.

**Acceptance Scenarios**:

1. **Given** una persona sin cuenta, **When** completa el formulario con email y contraseña
   válidos y lo envía, **Then** el sistema crea la cuenta en estado "pendiente de
   confirmación" y le pide revisar su correo antes de continuar.
2. **Given** una cuenta recién creada y pendiente de confirmación, **When** la persona hace
   clic en el enlace de confirmación recibido por correo, **Then** vuelve a la app y el
   registro continúa automáticamente en el paso "Usuario" (fusionado con Mascota, ver
   User Story 2), sin tener que volver a ingresar email/contraseña.
3. **Given** una cuenta pendiente de confirmación, **When** la persona no encuentra el correo,
   **Then** puede pedir que se reenvíe el correo de confirmación desde la misma pantalla.
4. **Given** una cuenta ya confirmada, **When** la persona intenta registrarse de nuevo con el
   mismo email, **Then** el sistema le indica que ya existe una cuenta y la dirige a iniciar
   sesión.
5. **Given** una persona que ya ingresó su nombre y el nombre de su mascota antes de crear la
   cuenta (ver User Story 2), **When** recibe el correo de confirmación, **Then** el asunto y
   el contenido del correo incluyen su nombre y el nombre de su mascota (no un correo
   genérico).

---

### User Story 2 - Registro en 3 pasos: Usuario, Mascota, Kittypau (Priority: P1)

Al crear la cuenta, la persona ve un flujo de **3 pasos** — no 4 — donde el primer paso ya
incluye tanto la creación de la cuenta (email/contraseña) como el perfil de usuario, en vez de
ser dos pasos separados ("Cuenta" y "Usuario"). El tercer paso, hoy llamado "Dispositivo", se
identifica en el stepper con la marca Kittypau (logo + wordmark) en vez del texto
"Dispositivo".

**Contenido definido del paso 1 "Usuario" fusionado** (reemplaza por completo los campos que
hoy tienen los pasos "Cuenta" y "Usuario" por separado), en este orden:

1. Avatar (elegir entre opciones) — se mantiene igual que hoy.
2. Tu Nombre — se mantiene igual que hoy.
3. Nombre de tu Mascota — **campo nuevo**, capturado en este primer paso (antes solo existía
   en el paso Mascota). El valor ingresado aquí se reutiliza como valor precargado en el paso
   Mascota — la persona no lo vuelve a escribir.
4. Comuna — se mantiene igual que hoy.
5. Email
6. Contraseña

**Se eliminan del flujo de registro** (existían hoy en el paso "Usuario" y no pasan a la
versión fusionada): País, Canal de notificación (Email/WhatsApp/SMS), checkbox "Soy el dueño
del plato" + Nombre del dueño condicional, Número de WhatsApp condicional.

**Regla de secuencia**: la cuenta (y por lo tanto el envío del correo de confirmación) no
puede crearse hasta que Nombre y Nombre de la Mascota estén completos — son los datos que
personalizan el correo de confirmación (ver User Story 1, escenario 5).

**Why this priority**: Elimina un paso redundante que hoy confunde al usuario (dos pantallas
separadas para lo que conceptualmente es un solo paso, "Usuario"), y alinea la UI con el
modelo de dominio ya documentado en `Knowledge/01_Proyecto/DOC_MAESTRO_DOMINIO.md`
("Usuario → Mascota → Dispositivo").

**Independent Test**: Completar un registro de punta a punta y contar que el stepper muestra
3 posiciones (no 4), que la primera combina cuenta+perfil, y que la tercera muestra el
logo/marca Kittypau en vez de la palabra "Dispositivo".

**Acceptance Scenarios**:

1. **Given** una persona que abre el formulario de registro, **When** ve el indicador de
   progreso (stepper), **Then** cuenta exactamente 3 posiciones, tituladas conceptualmente
   Usuario → Mascota → [marca Kittypau].
2. **Given** el primer paso, **When** la persona lo completa, **Then** en un solo paso se
   crea la cuenta (email/contraseña) y se registra su perfil de usuario — no hay una pantalla
   previa separada solo para email/contraseña.
3. **Given** la persona en el tercer paso, **When** observa el stepper, **Then** ve el logo y
   el nombre "Kittypau" en la posición que hoy dice "Dispositivo", en vez de ese texto.
4. **Given** una persona que cierra el registro a medias y vuelve más tarde, **When** reabre
   el flujo, **Then** retoma exactamente en el paso (de los 3) donde había quedado — el
   progreso persistente ya documentado en Knowledge se mantiene intacto con la nueva
   numeración.

---

### User Story 3 - El contenido del registro se ajusta a la pantalla disponible (Priority: P2)

En cualquier paso del registro, el contenido visible (formulario, botones, stepper) se adapta
al alto y ancho de pantalla disponibles sin recortarse ni quedar inaccesible. El scroll se
mantiene como respaldo solo para casos extremos (pantallas muy bajas o con zoom alto), igual
que el criterio ya aplicado al fondo de la página de login en una sesión anterior.

**Why this priority**: Impacta la experiencia de todos los usuarios pero no bloquea la
funcionalidad core de crear una cuenta — a diferencia de las historias 1 y 2, un contenido
apretado sigue siendo usable con scroll manual.

**Independent Test**: Abrir el modal de registro en viewports representativos (pantalla
grande, laptop con navegador con barra de herramientas, pantalla baja con zoom) y confirmar
que el contenido de cada paso se ve completo sin recortes; el scroll solo aparece en los casos
verdaderamente extremos.

**Verificación real ya hecha (Playwright, viewports de celular emulados — Pixel 7, iPhone SE,
iPhone 14 — antes de implementar nada de este spec, sobre el flujo de 4 pasos actual)**:
recorrido completo Cuenta → Usuario → Mascota en iPhone SE (320×568, el más chico de los tres).
El body del modal (`.login-register-body`) sí excede el alto visible en los pasos con más
campos (376px de contenido vs 262px visibles) pero **no corta nada** — scrollea correctamente,
confirmando que el mecanismo de scroll de respaldo (FR-010) ya funciona hoy en el flujo
vigente. Confirmado también que por debajo de 640px de ancho (breakpoint `sm:` de Tailwind) los
grids de 2-3 columnas que ataca la User Story 5 ya caen a una sola columna de forma natural —
el problema de "campos lado a lado" se nota más en tablet/laptop angosta (640-767px) que en
celular real. Esto no cambia ningún requisito, solo confirma dónde pega más cada uno.

**Acceptance Scenarios**:

1. **Given** una pantalla de tamaño normal (desktop o laptop estándar), **When** la persona
   abre cualquier paso del registro, **Then** ve el contenido completo del paso sin que se
   corte contra el borde del modal.
2. **Given** una ventana angosta en altura (ej. laptop con navegador con barra de
   herramientas visible), **When** el contenido de un paso no entra completo, **Then** el
   modal ofrece scroll para acceder al resto — nunca corta contenido sin dejar forma de
   llegar a él.
3. **Given** un dispositivo móvil o la app empaquetada (APK), **When** se abre el registro,
   **Then** el comportamiento de ajuste es equivalente al de escritorio (mismo criterio,
   sin caso aparte que quede peor).

---

### User Story 4 - Perfil de mascota: registro básico + ficha detallada opcional (Priority: P2)

En el paso "Mascota", la persona completa primero un **registro básico** (obligatorio, rápido,
lo mínimo para dar de alta a la mascota). Después se le ofrece una **ficha detallada**
(opcional) con dos grandes temas — Salud y Alimentación — que puede completar ahí mismo o
dejar para después. Si la deja para después, el sistema se lo recuerda claramente hasta que la
complete (no es un "opcional" silencioso que se olvida).

**Why this priority**: El registro básico es necesario para que el paso "Mascota" funcione
dentro del flujo de 3 pasos (User Story 2), pero exigir de entrada todo el detalle de salud y
alimentación alargaría el registro inicial — Mauro señaló que Salud es "probablemente la
categoría más importante del proyecto", por eso no se descarta, se difiere con recordatorio.

**Independent Test**: Completar solo el registro básico de una mascota, verificar que el paso
"Mascota" se da por completo (avanza al paso 3) sin haber tocado la ficha detallada, y
confirmar que queda un recordatorio visible/reabrible de que la ficha detallada sigue
pendiente.

**Campos del Registro Básico** (obligatorios, permiten avanzar el paso "Mascota"):

1. Nombre — ya capturado en el paso 1 "Usuario" (User Story 2), no se vuelve a pedir.
2. Especie (Gato / Perro — ya existe en el código como "Tipo").
3. Sexo — **campo nuevo**: Macho / Hembra / No estoy seguro.
4. Origen — ver lista curada en Assumptions (reemplaza los 4 valores actuales por una lista
   más completa).
5. Edad (rango — ya existe) + Fecha de nacimiento o Fecha de adopción/ingreso (**campo nuevo**,
   opcional, cuya etiqueta depende del Origen elegido: "Fecha de nacimiento" si el origen indica
   que se conoce desde cría/compra; "Fecha de llegada / adopción" si el origen es rescate o
   regalo).
6. Peso actual (kg — ya existe).
7. Tamaño (ya existe).
8. Esterilizado sí/no (ya existe) + tatuaje de esterilización (ya existe).
9. Microchip: sí/no (ya existe) + Número de microchip (**campo nuevo**, opcional, solo visible
   si "sí").
10. ¿Tiene alguna condición de salud relevante? sí/no (ya existe como flag rápido — el detalle
    completo se traslada a la ficha de Salud detallada, ver abajo).

**Campos de la Ficha Detallada — Salud** (opcional, con recordatorio):

- Peso ideal / rango esperado
- Condiciones de salud diagnosticadas (incluye ejemplos guiados: renal, diabetes, obesidad,
  cardíaca, otra)
- Alergias
- Medicamentos actuales
- Tratamientos en curso
- Cirugías (historial)
- Vacunas (historial / al día)
- Desparasitación (última fecha)
- Historial veterinario (notas libres)
- Fecha del último control veterinario

**Campos de la Ficha Detallada — Alimentación** (opcional, con recordatorio):

- Tipo de alimento (seco / húmedo / mixto)
- Marca
- Fórmula / variedad
- Premios / snacks (sí/no + detalle)
- Restricciones alimentarias

**Corregido 2026-08-17 (a pedido explícito de Mauro): Cantidad diaria (gramos), Número de
comidas al día y Horarios habituales NO se preguntan.** Son exactamente el dato que Kittypau
existe para medir con el dispositivo real (comedero/bebedero + sensor de peso) — pedírselo a
la persona sería reemplazar una medición real por una autodeclarada, justo lo contrario del
objetivo del producto. Esos 3 valores se derivan de las lecturas reales (`readings`,
sesiones de alimentación) una vez que el dispositivo está vinculado — ver
`Knowledge/05_API/SPEC_HungerBar_Alimentacion.md` para cómo ya se calculan hoy. Error de
diseño del propio autor de este spec (no de Mauro) — se pidieron como texto libre en la
primera versión de la Ficha Detallada sin pensar en esta distinción; corregido apenas se
notó.

*(Curación respecto a la lista original de Mauro: "Peso actual" ya vive en el Registro Básico
— no se duplica en Salud, solo se agrega "Peso ideal". "Cantidad de alimento por comida" se
omite por ser derivable de cantidad diaria ÷ número de comidas. "Alimentación húmeda/seca/
mixta" y "Tipo de alimento" se fusionan en un solo campo. Los problemas específicos —renales,
diabetes, obesidad— pasan a ser ejemplos guiados dentro de "Condiciones de salud diagnosticadas"
en vez de campos paralelos, para no duplicar el mismo dato de dos formas.)*

**Acceptance Scenarios**:

1. **Given** una persona en el paso "Mascota", **When** completa solo los campos del Registro
   Básico, **Then** puede avanzar al paso 3 sin haber tocado Salud ni Alimentación.
2. **Given** una persona que terminó el Registro Básico, **When** se le presenta la Ficha
   Detallada, **Then** ve claramente que es opcional y que cubre Salud y Alimentación.
3. **Given** una persona que dejó la Ficha Detallada sin completar, **When** vuelve a usar la
   app más adelante, **Then** ve un recordatorio claro de que sigue pendiente, con acceso
   directo para completarla (reutilizando el mecanismo "reabrible desde Settings" ya
   documentado para el onboarding).
4. **Given** el campo Origen, **When** la persona lo selecciona, **Then** la etiqueta del campo
   de fecha cambia entre "Fecha de nacimiento" y "Fecha de llegada / adopción" según
   corresponda.
5. **Given** el campo Microchip marcado como "sí", **When** la persona no conoce el número,
   **Then** puede continuar sin ingresarlo — el número nunca bloquea el avance.

---

### User Story 5 - Estilo de formulario alineado a mejores prácticas UX (Priority: P2)

El estilo visual e interactivo del formulario cambia en **los 3 pasos del registro** (no solo
uno): un campo por fila (nunca preguntas lado a lado), controles binarios sí/no como
radio/toggle en vez de desplegables, tamaños táctiles y de texto que cumplen mínimos de
accesibilidad móvil, y botones con texto orientado al resultado.

**Why this priority**: Mauro pidió explícitamente cambiar el estilo actual ("no me gusta") y
aplicarlo a todo el register flow — es una historia propia porque cruza los 3 pasos, no un
detalle de una sola pantalla.

**Curación aplicada**: la guía que compartió Mauro tiene 58 recomendaciones; de ahí se
seleccionaron solo las que aplican a este formulario concreto y no contradicen decisiones ya
tomadas en este mismo spec. Se descartaron explícitamente por no aplicar: búsqueda de código
postal (no se piden direcciones), sellos de seguridad de pago y prueba social (no hay cobro en
este flujo), chat en vivo, CAPTCHA (no se usa hoy, no se agrega). "Eliminar campos no
esenciales" y "agrupar en secciones/pasos" ya están cubiertos por la User Story 4 (Básico +
Detallado) — no se repiten aquí.

**Hallazgos reales en el código hoy** (gaps concretos frente a la guía, confirmados leyendo
`registro-flow.tsx`):

| Recomendación de la guía | Estado real hoy | Cambio |
|---|---|---|
| Un campo por fila, nunca lado a lado | `grid sm:grid-cols-2/3`, `md:grid-cols-2/4` en los 3 pasos (perfil, mascota, dispositivo, y el paso "Cuenta" en `page.tsx`) agrupan 2-4 campos por fila | Pasar a columna única en todos los pasos |
| Sí/no como radio, no desplegable | Esterilizado, tatuaje de esterilización, microchip, condición de salud usan `<select>` de 2 opciones | Cambiar a radio buttons apilados verticalmente |
| Altura táctil mínima 48px | Inputs a 44px (`h-11`), botones a 40px (`h-10`) | Subir ambos a 48px mínimo |
| Texto de formulario ≥16px | Etiquetas de `FieldCard` a 11px, texto de inputs a 14px | Subir etiquetas y contenido a 16px mínimo (evita además el auto-zoom de iOS en inputs <16px) |
| Autocompletado del navegador habilitado | No confirmado en email/contraseña | Agregar `autoComplete="email"` / `"new-password"` |
| CTA describe el resultado, no un verbo genérico | Botones dicen "Guardar perfil", "Guardar mascota" (genéricos pero no incorrectos) | Reformular a resultado desde la perspectiva del usuario (ej. "Guardar mi perfil") |

**Ya cumple hoy** (verificado en el código, no se toca): etiquetas alineadas arriba-izquierda
(`FieldCard`), indicador de progreso por pasos (stepper), botón de envío deshabilitado mientras
se procesa (`isSavingProfile`/`isSavingPet`/`isSavingDevice`), un solo campo de contraseña sin
pedir confirmación duplicada, validación en línea junto al campo (no solo al enviar).

**Independent Test**: Recorrer los 3 pasos del registro y confirmar que ningún paso muestra más
de un campo de captura por fila, que los sí/no son radio buttons, y que los controles táctiles
cumplen los mínimos de tamaño.

**Acceptance Scenarios**:

1. **Given** cualquier paso del registro, **When** la persona lo recorre, **Then** ve un campo
   por fila — ninguna fila con dos o más campos de captura de datos lado a lado.
2. **Given** una pregunta binaria (ej. "¿Esterilizado/a?"), **When** la persona responde,
   **Then** elige entre opciones visibles como radio buttons apilados, no un desplegable.
3. **Given** cualquier input o botón del registro, **When** se mide su altura, **Then** es de
   al menos 48px.
4. **Given** cualquier etiqueta o texto de campo, **When** se mide su tamaño de fuente,
   **Then** es de al menos 16px.
5. **Given** el campo Email en el paso 1, **When** la persona empieza a escribir, **Then** el
   navegador ofrece autocompletar con direcciones guardadas.

---

### User Story 6 - Indicador rojo de "pendiente" en el menú principal (Priority: P2)

Después de iniciar sesión, el ítem "Mascota" del menú principal de la app (hoy en
`app-nav.tsx`, apunta a `/pet`) muestra un círculo rojo de notificación — igual al patrón que
usan otras apps para avisos pendientes — mientras la Ficha Detallada (Salud o Alimentación, ver
User Story 4) de la mascota no esté completa. La persona puede entrar a `/pet` en cualquier
momento para completar y guardar esa información, no solo durante el registro.

**Why this priority**: Es el mecanismo concreto que resuelve el recordatorio persistente ya
comprometido en FR-017 (antes sin definir) — convierte un "opcional silencioso" en algo visible
cada vez que la persona usa la app.

**Grounding real**: `app-nav.tsx` ya define `navItems` con `{ href: "/pet", label: "Mascota" }`
(tanto en `specialNavItems` como en `demoNavItems`), y la página `/pet` ya existe (1004 líneas)
pero hoy no tiene ninguna sección de Salud ni Alimentación — es contenido nuevo a agregar ahí,
no una ruta nueva.

**Independent Test**: Con una mascota que tiene el Registro Básico completo pero la Ficha
Detallada sin completar, verificar que el ítem "Mascota" del menú muestra el círculo rojo;
completar Salud y Alimentación desde `/pet`, y verificar que el círculo desaparece.

**Acceptance Scenarios**:

1. **Given** una mascota con Salud o Alimentación sin completar, **When** la persona ve el
   menú principal, **Then** el ítem "Mascota" muestra un círculo rojo de notificación.
2. **Given** el círculo rojo visible, **When** la persona toca "Mascota", **Then** llega a
   `/pet` y puede identificar qué información falta y completarla ahí mismo.
3. **Given** la persona completa tanto Salud como Alimentación desde `/pet`, **When** guarda
   los cambios, **Then** el círculo rojo desaparece del menú.
4. **Given** una mascota con Salud completa pero Alimentación pendiente (o viceversa), **When**
   la persona ve el menú, **Then** el círculo rojo sigue visible — basta con que falte una de
   las dos fichas.

### Edge Cases

- ¿Qué pasa si la persona cierra la pestaña antes de confirmar el correo y vuelve días
  después? → El enlace de confirmación de Supabase debe seguir siendo válido según su propia
  expiración configurada; si expiró, la persona debe poder pedir un reenvío desde la pantalla
  de login (mecanismo `resendConfirmation` ya existente en el código).
- ¿Qué pasa si la persona ya tiene una sesión activa y trata de "registrarse" de nuevo? → No
  debe poder crear una segunda cuenta con el mismo correo; se le dirige a continuar su sesión
  existente.
- ¿Qué pasa con cuentas creadas *antes* de este cambio, con el toggle de confirmación
  desactivado? → Fuera de alcance de este spec definir una migración retroactiva; se declara
  como pregunta abierta (ver Assumptions) — no se debe bloquear a usuarios ya confirmados
  implícitamente por auto-confirmación previa.
- ¿Qué pasa si el contenido de un paso crece (por ejemplo, si en una iteración futura el paso
  "Usuario" fusionado termina con más campos)? → El criterio de ajuste a pantalla (User Story
  3) debe seguir sosteniéndose sin rediseñar el CSS cada vez — es un criterio de layout, no un
  ajuste puntual para el contenido de hoy.
- ¿Qué pasa si la persona nunca vuelve a abrir la ficha detallada de Salud/Alimentación? →
  Queda pendiente indefinidamente con su recordatorio visible; no se bloquea el uso del resto
  de la app por no completarla (es opcional, no un gate).
- ¿Qué pasa si la persona tiene más de una mascota? → Cada mascota tiene su propio Registro
  Básico y su propia Ficha Detallada — fuera de alcance de este spec definir el flujo de
  "agregar otra mascota" (se asume que ya existe o se cubre aparte). El comportamiento del
  círculo rojo del menú (User Story 6) con múltiples mascotas también queda fuera de alcance
  por ahora — confirmado explícitamente por Mauro.
- ¿Qué pasa con los pares de campos que hoy sí tiene sentido mostrar juntos por convención
  (ej. día/mes/año de una fecha)? → La propia guía los reconoce como excepción; hoy este
  formulario no fragmenta fechas en varios campos, así que la regla de columna única (User
  Story 5) no tiene excepciones que aplicar por ahora.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE requerir confirmación de correo electrónico antes de permitir
  que una cuenta recién creada continúe al resto del registro (perfil de usuario en adelante).
- **FR-002**: El sistema DEBE enviar el correo de confirmación a través de Supabase Auth
  (mecanismo ya soportado por el proyecto, no un servicio de correo aparte).
- **FR-003**: El sistema DEBE permitir reenviar el correo de confirmación si la persona no lo
  recibió o el enlace expiró.
- **FR-004**: Al volver del enlace de confirmación, el sistema DEBE retomar automáticamente el
  registro en el paso correspondiente, sin pedir de nuevo email/contraseña.
- **FR-005**: El flujo de registro DEBE mostrar exactamente 3 pasos en el indicador de
  progreso: Usuario, Mascota, y el paso hoy llamado "Dispositivo".
- **FR-006**: El primer paso DEBE combinar la creación de la cuenta (email/contraseña) y el
  perfil de usuario en una sola pantalla/paso — no dos pasos separados.
- **FR-007**: El tercer paso DEBE identificarse en el stepper con el logo y el nombre de marca
  "Kittypau" en vez del texto "Dispositivo".
- **FR-008**: El sistema DEBE conservar el progreso persistente del registro (retomable si la
  persona cierra y vuelve) bajo la nueva numeración de 3 pasos.
- **FR-009**: El contenido de cada paso del registro DEBE ajustarse al espacio de pantalla
  disponible en viewports comunes de escritorio, laptop, móvil y la app empaquetada (APK), sin
  recortar contenido de forma inaccesible.
- **FR-010**: El sistema DEBE mantener scroll disponible como respaldo en los casos donde el
  contenido no entra incluso después de ajustarse (pantallas muy bajas, zoom alto) — nunca
  eliminar el acceso al contenido.
- **FR-011**: El paso 1 "Usuario" fusionado DEBE capturar, en este orden: Avatar, Tu Nombre,
  Nombre de la Mascota, Comuna, Email, Contraseña — y NINGÚN otro campo de los que hoy existen
  en el paso "Usuario" (País, Canal de notificación, dueño del plato, WhatsApp quedan fuera).
- **FR-012**: El sistema NO DEBE crear la cuenta (ni disparar el correo de confirmación) hasta
  que Tu Nombre y Nombre de la Mascota estén completos.
- **FR-013**: El nombre de la mascota capturado en el paso 1 DEBE quedar precargado en el paso
  Mascota — la persona no lo vuelve a ingresar.
- **FR-014**: El correo de confirmación DEBE incluir el nombre de la persona y el nombre de su
  mascota tanto en el asunto como en el contenido del correo (no un correo genérico).
- **FR-015**: El paso "Mascota" DEBE separar sus campos en Registro Básico (obligatorio, según
  la lista de la User Story 4) y Ficha Detallada (opcional, temas Salud y Alimentación, según
  la misma User Story).
- **FR-016**: El sistema DEBE permitir avanzar del paso "Mascota" al paso 3 habiendo completado
  solo el Registro Básico — la Ficha Detallada nunca es requisito para avanzar.
- **FR-017**: El sistema DEBE mostrar un círculo rojo de notificación en el ítem "Mascota" del
  menú principal (`/pet`) mientras la Ficha Detallada (Salud o Alimentación) de la mascota no
  esté completa — desaparece únicamente cuando ambas secciones están completas.
- **FR-018**: El campo Número de microchip DEBE ser opcional incluso cuando la persona indicó
  que la mascota tiene microchip.
- **FR-019**: La etiqueta del campo de fecha (nacimiento vs. adopción/ingreso) DEBE derivarse
  del Origen seleccionado, no pedirse dos veces.
- **FR-020**: Ningún paso del registro (Usuario, Mascota, Dispositivo) DEBE mostrar más de un
  campo de captura de datos por fila — columna única en los 3 pasos.
- **FR-021**: Toda pregunta binaria (sí/no) DEBE usar radio buttons apilados verticalmente en
  vez de un desplegable de 2 opciones.
- **FR-022**: Todo input y botón interactivo del registro DEBE tener una altura mínima de 48px.
- **FR-023**: Toda etiqueta, marcador de posición y texto de contenido de campo DEBE tener un
  tamaño mínimo de 16px.
- **FR-024**: Los campos de Email y Contraseña DEBEN habilitar el autocompletado nativo del
  navegador.
- **FR-025**: El texto de los botones de acción principal de cada paso DEBE describir el
  resultado desde la perspectiva de la persona, no un verbo genérico.
- **FR-026**: La página `/pet` DEBE permitir completar y guardar la Ficha Detallada (Salud y
  Alimentación) en cualquier momento después del registro, no solo durante el onboarding.
- **FR-027**: El círculo rojo del ítem "Mascota" DEBE encenderse si falta Salud O Alimentación
  (no se requiere que falten ambas).

### Key Entities

- **Cuenta de usuario (auth)**: credenciales de acceso (email, contraseña) gestionadas por
  Supabase Auth; adquiere un estado de confirmación (pendiente / confirmada) que determina si
  puede avanzar en el registro.
- **Perfil de usuario**: datos de la persona dueña de la cuenta, hoy capturados en un paso
  separado ("Usuario") que este cambio fusiona con la creación de cuenta.
- **Progreso de onboarding**: el paso actual del registro (persistente), hoy modelado como
  `user_onboarding_step` / `pet_onboarding_step` según `Knowledge/01_Proyecto/ENUMS_OFICIALES.md`
  — su relación exacta con la nueva numeración de 3 pasos es una decisión de diseño para
  `/speckit-plan`, no de este spec.
- **Plantilla de correo de confirmación**: la plantilla de Supabase Auth para el correo
  "Confirm signup", configurada a nivel de proyecto (asunto + contenido), que debe
  personalizarse con el nombre de la persona y el de su mascota.
- **Registro Básico de mascota**: datos mínimos obligatorios para dar de alta a la mascota
  (identidad, físico, origen) — ver User Story 4.
- **Ficha Detallada de mascota**: datos opcionales agrupados en Salud y Alimentación,
  completables después del registro, con recordatorio persistente — ver User Story 4. Pensada
  para crecer con más temas en iteraciones futuras (según el propio Mauro: "después podemos
  agregar más").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las cuentas nuevas quedan en estado "pendiente de confirmación" hasta
  que la persona confirma su correo — ninguna cuenta nueva puede avanzar más allá del primer
  paso sin confirmar.
- **SC-002**: Una persona puede completar el registro de punta a punta (incluyendo confirmar
  su correo) sin necesitar ayuda externa ni volver a ingresar datos ya capturados.
- **SC-003**: El stepper del registro muestra 3 pasos en el 100% de los casos, nunca 4.
- **SC-004**: En una muestra representativa de tamaños de pantalla (desktop grande, laptop
  estándar, laptop con navegador achicado, móvil), el contenido de cada paso del registro es
  completamente visible o accesible por scroll — cero casos de contenido inaccesible.
- **SC-005**: El 100% de los correos de confirmación enviados incluyen el nombre de la persona
  y el de su mascota en el asunto y en el contenido — cero correos genéricos.
- **SC-006**: El 100% de las mascotas nuevas quedan registradas con solo el Registro Básico —
  ninguna persona queda bloqueada por no completar la Ficha Detallada.
- **SC-007**: El 100% de las cuentas con la Ficha Detallada incompleta muestran un recordatorio
  visible y accesible en cualquier momento posterior.
- **SC-008**: Cero filas con más de un campo de captura de datos en los 3 pasos del registro.
- **SC-009**: El 100% de los inputs y botones interactivos del registro miden al menos 48px de
  alto; el 100% del texto de formulario mide al menos 16px.
- **SC-010**: El 100% de las mascotas con Salud o Alimentación incompleta muestran el círculo
  rojo en el menú; el 100% de las que completan ambas secciones dejan de mostrarlo.

## Assumptions

- **Punto 4 ya definido** (originalmente diferido, frase incompleta: "necesito entonces que en
  este nuevo usuario..."): el contenido exacto del paso "Usuario" fusionado quedó especificado
  por el usuario — ver User Story 2 y FR-011 a FR-014. Ya no es un gap abierto.
- **Hallazgo de investigación (Supabase Auth email templates, docs oficiales,
  `supabase.com/docs/guides/auth/auth-email-templates`)**: Supabase SÍ soporta variables
  custom en el asunto y el contenido del correo de confirmación, vía `{{ .Data.campo }}`
  (Go Templates), donde `.Data` mapea a `auth.users.user_metadata`. Los datos deben pasarse en
  `options.data` al llamar `signUp` (ej. `{ data: { user_name, pet_name } }`) — no se pueden
  agregar retroactivamente después de disparado el correo. El asunto se configura vía la clave
  de proyecto `mailer_subjects_confirmation` (también soporta `{{ .Data.campo }}`). Esto
  confirma que FR-014 es técnicamente viable sin salirse del mecanismo nativo de Supabase Auth
  (no se necesita un servicio de correo transaccional aparte). La edición de la plantilla y el
  asunto es un cambio de configuración del proyecto Supabase — requiere confirmación explícita
  antes de aplicarse en producción, igual que el toggle "Confirm email" (Principio III).
- El toggle "Confirm email" de Supabase Auth para el proyecto (zjdyhpntftgaynchqwfk) está hoy
  desactivado (confirmado por prueba directa en sesión anterior); activarlo es un cambio de
  configuración en producción que requiere confirmación explícita antes de aplicarse, según
  el Principio III (No-Negociables) de la constitución del proyecto.
- El lado cliente del flujo de verificación (`onRegister`, `resendConfirmation`, manejo del
  parámetro `verified=1`) ya existe en el código (`login/page.tsx`); este spec asume que se
  reutiliza y se ajusta solo lo que la verificación end-to-end revele necesario, sin
  reescribirlo desde cero.
- El diseño visual exacto (tamaño/posición) del logo+wordmark Kittypau dentro del stepper
  (un elemento pequeño, distinto del hero de la página de login) no está definido en Knowledge
  — se resuelve en `/speckit-plan` reutilizando el patrón `brand-logo-badge` ya existente en el
  código, ajustado de tamaño para caber en el stepper.
- La relación entre la nueva numeración de 3 pasos y los enums existentes
  (`user_onboarding_step`, `pet_onboarding_step`) es una decisión de diseño técnico, no de
  producto — se resuelve en `/speckit-plan`.
- Cuentas creadas antes de este cambio (bajo auto-confirmación) no requieren migración
  retroactiva ni se ven afectadas — quedan fuera de alcance.
- **Lista curada de Origen** (pedida explícitamente por el usuario: "crea una lista de
  posibles orígenes de cómo obtener una mascota"). Parte de los 4 valores que ya existen hoy en
  el código (`comprado`, `rescatado`, `llego_solo`, `regalado`) y los amplía/clarifica:
  1. Comprado (criador o tienda)
  2. Adoptado en refugio o protectora
  3. Rescatado de la calle
  4. Regalado / donado
  5. Nació en casa (camada propia)
  6. Otro
  Esta lista determina también la etiqueta del campo de fecha (FR-019): "Fecha de nacimiento"
  para los orígenes 1 y 5 (se conoce con certeza); "Fecha de llegada / adopción" para 2, 3, 4 y
  6 (fecha exacta de nacimiento normalmente desconocida). Es una propuesta razonable, no un
  hallazgo de Knowledge — a confirmar o ajustar antes de `/speckit-plan` si Mauro prefiere otra
  agrupación.
- **Mecanismo del recordatorio (FR-017) ya definido** (User Story 6): círculo rojo de
  notificación en el ítem "Mascota" del menú principal (`/pet`), no un banner ni un badge en
  Settings. Ya no es un gap abierto.
- **Ubicación de la Ficha Detallada ya definida** (User Story 6): vive dentro de la página
  `/pet` ya existente — se le agregan las secciones Salud y Alimentación, sin crear ruta nueva.
  Sigue abierto para `/speckit-plan` solo el diseño interno de esas secciones dentro de `/pet`
  (orden, si son sub-pestañas o un solo scroll, etc.) — no la ubicación general, que ya está
  resuelta.
- **Interacción entre User Story 3 (ajuste a pantalla) y User Story 5 (columna única)**: pasar
  a columna única alarga verticalmente cada paso (menos campos por fila = más filas) — el
  criterio de ajuste a pantalla de la User Story 3 (clamp/shrink fluido + scroll como
  respaldo) sigue aplicando igual, pero `/speckit-plan` debe considerar el layout de una sola
  columna como el caso base al calcular alturas, no como un caso extremo aparte.
- Los mensajes de error de validación en línea se mantienen **debajo** del campo (patrón
  `FieldCard` ya existente), no a la derecha como sugiere el ejemplo de la guía — decisión
  deliberada: a la derecha del campo no es viable en columna única en mobile (rompería el
  layout de una sola columna que pide FR-020). Marcado como simplificación deliberada, no como
  incumplimiento de la guía.
- **Opciones de la Ficha Detallada — Salud, investigadas 2026-08-17** (a pedido explícito de
  Mauro: "mejorar con opciones reales" en vez de texto libre). Alergias, Medicamentos,
  Tratamientos, Cirugías y Vacunas pasan de texto libre a checklist de opciones + "otra/otro"
  de texto libre — ver `data-model.md` para la forma exacta. Fuentes citadas por búsqueda web
  (no inventadas):
  - Alergias más comunes: CuidaPet, Welnia, Club de Perros y Gatos (Chile) — pulgas
    (dermatitis alérgica), ambiental (ácaros/pólenes/hongos), alimentaria, contacto.
  - Cirugías más comunes: Vistacumbre, Clínica Raza, Mascotas en Buenas Manos (Chile) —
    esterilización/castración, extracción dental, cuerpo extraño, ortopédica.
  - Medicamentos: Petvet, VetBox, VetMontt (Chile) — antiparasitario (categoría más citada,
    marcas Nexgard/Bravecto/Drontal), antibiótico, antiinflamatorio, antialérgico,
    suplemento; se listan por categoría clínica, no por marca comercial (las marcas cambian,
    la categoría no).
  - Vacunas — **cartilla real del Colegio Médico Veterinario de Chile** (vía CuidaPet):
    Antirrábica es la **única obligatoria por ley** (perro y gato). Perro: Séxtuple/Óctuple
    (moquillo, parvovirus, hepatitis, leptospirosis) + Tos de las perreras (opcional). Gato:
    Triple felina (panleucopenia, calicivirus, herpesvirus) + Leucemia felina/FeLV
    (opcional). La lista mostrada depende de `type` (perro vs. gato) — no es la misma
    cartilla para ambos.
  - Tratamientos: sin una fuente única con un "top 5" claro — se agrupó por categoría clínica
    habitual (dermatológico, dental, fisioterapia, oncológico, manejo de enfermedad crónica),
    con "otro" siempre disponible. Declarado explícitamente como el más débil de los 5 en
    términos de respaldo por fuente — a revisar si Mauro tiene mejor criterio de dominio acá.
- **Marcas de alimento (Ficha Detallada — Alimentación), investigadas 2026-08-17** (a pedido
  explícito de Mauro). Marco normativo confirmado: el SAG regula alimentos para mascotas en
  Chile vía Decreto N° 4/2016 (Reglamento de Alimentos para Animales) y exige cumplir la
  NCh2546.Of2019 — pero **no mantiene un catálogo público tipo AAFCO** con ficha nutricional
  por marca/producto; por eso el campo "Marca" lista nombres de marca/línea, no
  especificaciones nutricionales por producto (esas solo están en la etiqueta de cada
  fabricante). Lista de marcas confirmada por búsqueda web contra tiendas y sitios oficiales
  chilenos reales (Lider, Falabella, Best for Pets, Club de Perros y Gatos, Champion Dog/Cat
  oficial, Purina Chile oficial) — no inventada:
  - Económico: Master Dog/Cat, Dog Chow/Cat Chow, Pedigree, Whiskas, Felix.
  - Premium nacional: Champion Dog/Cat, Excellent (línea Purina).
  - Premium / Super Premium: Purina One, Pro Plan, Royal Canin, Hill's, Eukanuba, Advance,
    Nutrience, Bravery, Brit Care.
  - Biológicamente apropiado (grain-free, alta proteína): Orijen, Acana, Taste of the Wild
    (perro).
  - Separado por especie (`type` perro/gato) porque varias marcas usan nombre de línea
    distinto para cada una (Master Dog vs. Master Cat, Champion Dog vs. Champion Cat) — ver
    `data-model.md`. "Otra" siempre disponible con texto libre.
- **Fórmula/variedad (Ficha Detallada — Alimentación), investigada 2026-08-17**. Igual que
  con Marca, no existe catálogo público con el nombre exacto de cada línea por producto —
  pedirlo como texto libre no aportaba estructura real. Se investigó el catálogo oficial de
  8 marcas (Royal Canin, Champion Dog/Cat, Pro Plan, Hill's Science Diet/Prescription Diet,
  Master Dog/Cat, Bravery, Acana, Orijen — sitios oficiales `royalcanin.com`, `championdog.cl`,
  `purina.cl`, `hillspet.com`, más fichas de Lider/Falabella para Master Dog/Cat) y todas,
  sin excepción, organizan sus líneas con las mismas 2 dimensiones: **etapa de vida**
  (cachorro/adulto/senior, algunas con "todas las etapas") y **necesidad especial** (control
  de peso, digestión o piel sensible, urinario — comunes a ambas especies; esterilizado/indoor
  específico de gato; articular específico de perro senior/raza grande). Se reemplazó el campo
  de texto libre por 2 `<select>` con esas dimensiones reales en vez de inventar nombres de
  producto que no se pueden verificar contra una fuente única — ver `data-model.md`.
  `formula_etapa` se precarga con el `age_range` de Registro Básico si coincide con una de las
  3 etapas conocidas (evita repreguntar un dato ya declarado).
- **Origen y Hábitat (Ficha Detallada, sección nueva), investigada 2026-08-17** (a pedido
  explícito de Mauro, ubicada arriba de Salud). Origen reusa exactamente los 6 valores del
  register flow — se investigó puntualmente si faltaba un origen real ("hijo/a de otra
  mascota mía"), confirmando que `nacido_en_casa` ya lo cubre (registro-flow.tsx ya lo
  etiqueta "camada propia"; terminología confirmada contra Kennel Club de Chile
  `kennelclub.cl/crianza` — "camada" = cachorros nacidos de un mismo parto de la hembra). No
  se agregó un 7º valor, solo se aclaró el label en la nueva sección: "Nació en casa (cría de
  otra mascota mía)".
  - Estado al llegar y Tipo de vivienda: no existe estándar oficial chileno — la Ley 21.020
    "Ley Cholito" (`bcn.cl/leychile`, `chileatiende.gob.cl/fichas/51436`) regula tenencia
    responsable (microchip, registro, esterilización, vacunación) pero no categoriza
    condición de ingreso ni tipo de vivienda. Las categorías usadas son las que aparecen
    consistentemente en fichas de adopción/ingreso reales: contrato de adopción tipo de
    SUBDERE (`proactiva.subdere.gov.cl`, cubre vivienda/gastos veterinarios/transporte como
    temas del formulario) y plataformas de adopción chilenas (`dogin.cl/adopciones`,
    `petfi.io`). Declarado explícitamente como grounded en práctica común, no en normativa
    oficial — a diferencia de Vacunas (Colegio Médico Veterinario) o Alergias/Medicamentos
    (fuentes veterinarias citadas arriba).
  - `living_environment` es una columna que ya existía en el schema y en el `allowedFields`
    de `/api/pets` desde antes de este spec, pero ningún formulario la llenaba — quedaba
    siempre `null`. Esta sección es el primer `<select>` real que la escribe.
- **Auditoría "sin doble registro" (2026-08-17)**, a pedido explícito de Mauro: se comparó
  cada campo pedido en el register flow contra lo que se ve/edita en `/pet`, buscando
  preguntas duplicadas y datos que se piden y después quedan invisibles. 3 hallazgos, los 3
  corregidos con confirmación de Mauro:
  1. **Origen triple**: se pedía en el register flow (select curado), en "Editar perfil" de
     `/pet` (`<input>` de texto libre — bug preexistente, podía romper el valor curado) y en
     la nueva sección Origen y Hábitat (select curado). Se sacó el `<input>` de "Editar
     perfil" — Origen se edita solo desde Origen y Hábitat ahora; `editPayload.origin` sigue
     viajando sin cambios en el submit de "Editar perfil" (no se pierde nada, solo deja de
     ser editable ahí).
  2. **Salud duplicada y huérfana**: el register flow preguntaba "¿Tiene alguna condición de
     salud?" (Sí/No + texto libre, obligatorio) — la respuesta (`has_health_condition`/
     `health_notes`) no se mostraba ni se usaba en ningún lado de `/pet`. La sección Salud
     de la Ficha Detallada pregunta esencialmente lo mismo con checkboxes reales
     investigados. Se sacó la pregunta del register flow (deja de ser obligatoria al
     registrar) — Salud es ahora la única fuente, igual que Alimentación. Las columnas
     `has_health_condition`/`health_notes` no se eliminan (dato histórico de pets ya
     registrados, Principio "nunca truncar sin motivo"), solo se dejó de pedir en el form.
  3. **Datos invisibles**: `sex`, `size`, `is_neutered`, `has_neuter_tattoo`,
     `has_microchip`, `microchip_number`, `birth_date`/`intake_date` se piden (varios
     obligatorios) en el register flow pero no aparecían en ningún lado de `/pet`. Se agregó
     un bloque "Identificación" — ver evolución más abajo, terminó fusionado dentro de la
     propia tarjeta "Mascota seleccionada" en vez de quedar en "Editar perfil".
- **Bug de coherencia — Origen legado no reconocido (2026-08-17)**, reportado por Mauro con
  un caso real: Bandida (`pets.origin = "Adoptado"`) no aparecía reflejada en Origen y
  Hábitat. Verificado contra producción: 5 mascotas reales/QA tienen `origin` con texto
  libre de antes de que existiera el `<select>` curado — Bandida y Amanda (`"Adoptado"`),
  Benito (`"Casa"`), pasturri (`"adoptado"`), Michi QA (`"rescatado"`) — ninguno calza
  exacto con los 6 valores del enum, así que el `<select>` los mostraba en blanco
  ("Selecciona"), ocultando lo que la persona ya había declarado. Corregido en el `onClick`
  que precarga el formulario: si `pets.origin` no calza con ninguna opción conocida, el
  `<select>` cae a `"otro"` y el texto original se preserva íntegro en `origen_otro` (nunca
  se descarta ni se adivina a qué categoría curada corresponde — ver Principio "nunca
  sobreescribir sin motivo"). El valor real en `pets.origin` solo cambia a `"otro"` cuando
  la persona confirma explícitamente con "Guardar sección de Origen y Hábitat", nunca
  automáticamente. Reproducido y verificado con una mascota QA con `origin = "Adoptado"`
  (mismo valor que Bandida) antes y después del fix.
- **"No tiene sentido que no pueda editar los datos aquí" (2026-08-17)**, a pedido del
  usuario tras ver el bloque de Identificación como solo-lectura. Evolucionó en 2 pasos:
  1. El bloque pasó a ser un `<form>` editable (Sexo/Peso/Tamaño/Edad/Esterilizado/
     Microchip+número) con su propio botón "Guardar" — inicialmente como tarjeta aparte
     debajo de "Mascota seleccionada". Guarda con un payload acotado a esos 7 campos (no
     el `editPayload` completo) para no interferir con cambios sueltos a medio hacer en el
     formulario de "Editar perfil", aunque ambos leen/escriben el mismo estado
     `editPayload` (ya precargado desde el mount, no hace falta abrir nada primero).
  2. A pedido explícito del usuario, se fusionó dentro de la misma `<section>` que
     "Mascota seleccionada" (separador `border-t` en vez de tarjeta aparte).
  "Editar perfil" quedó con Nombre/Actividad/Fecha de nacimiento-llegada/Tatuaje de
  esterilización/Límites de consumo — el resto vive arriba para evitar el mismo doble
  registro ya corregido con Origen.
- **Foto de la mascota (2026-08-17)**: `photo_url` ya existía en el schema/API (se pide en
  el register flow) pero `/pet` no tenía forma de verla ni cambiarla — mismo hueco que
  `living_environment`. Se agregó avatar circular (o inicial si no hay foto) + "Cambiar
  foto" en la tarjeta "Mascota seleccionada", que sube a Supabase Storage
  (`kittypau-photos/pets/{petId}.{ext}`) y guarda `photo_url` de inmediato. Al revisar
  contra `DOC_MAESTRO_DOMINIO.md` § 7 (auditoría "sin problemas" pedida por Mauro), se
  ajustó para cumplir 2 de las 3 reglas ya documentadas que faltaban: límite de 5 MB y
  overwrite real (path por `petId`, no random, ver data-model.md). Sigue faltando la
  compresión del lado del cliente — declarado como gap, no implementado.
- **Hero de `/today` — info de la mascota (2026-08-17)**: mostraba
  `Gato · adoptado_refugio · mediano · adulto · 4 kg` pegado al lado de la foto en una
  sola línea truncada (max-width angosto), con valores de enum crudos sin decir qué
  representaba cada uno. Se corrigió en varios pasos, todos a pedido explícito del
  usuario:
  1. Cada dato pasa a tener etiqueta y valor humanizado (`Origen: Adoptado en refugio`,
     `Tamaño: Mediano`, etc.) — mapas locales `ORIGIN_LABELS`/`SIZE_LABELS`/`AGE_LABELS`
     en `today/page.tsx` (mismos labels que `ORIGEN_OPTIONS` de `/pet`; un origin legado
     no reconocido se muestra tal cual, mismo criterio que el fix de Bandida).
  2. La info pasa de estar al lado de la foto a una fila completa debajo de la foto+
     nombre, sin truncar.
  3. Nombre debajo de la foto (antes al lado) y foto agrandada de 96px a 128px.
  4. Nombre centrado respecto a la foto, características centradas respecto al nombre.
- **Razas + pelo + peso por especie (2026-08-17)**, a pedido explícito de Mauro tras la
  auditoría "revisa que no existan problemas" — 2 gaps preexistentes (documentados en
  `DOC_MAESTRO_DOMINIO.md` §§ 1, nunca implementados) más un pedido nuevo:
  1. **`breeds`** (razas, máx. 3, quiltro excluyente): investigadas las razas más comunes
     en Chile — perro vía Registro Nacional de Mascotas 2025 (mestizo/quiltro lidera con
     205.501 inscripciones de 2.113.739 perros totales, seguido de poodle, yorkshire
     terrier, dachshund, pastor alemán, chihuahua, fox terrier, bulldog francés, pug, pit
     bull terrier americano — fuentes: `cuidapet.cl/post/ranking-razas-de-perro-chile`,
     `biobiochile.cl` 2025-07-07, `t13.cl` (2 notas), `meganoticias.cl` 2025-03-06);
     gato vía notas veterinarias chilenas (doméstico de pelo corto/mestizo es el más
     común, seguido de persa, siamés, maine coon, bengalí, exótico de pelo corto, british
     shorthair, esfinge — fuentes: `meganoticias.cl/calidad-de-vida/339072`,
     `vetparquevespucio.cl`, `supergatunos.cl`). Implementado en register flow (opcional,
     no bloquea) y en "Identificación básica" de `/pet` — mismos valores en los 2 lugares
     y en la validación de la API (`text[]`, máx. 3, set curado por especie,
     `mestizo_quiltro`/`domestico_pelo_corto`/`domestico_pelo_largo` excluyentes entre sí
     y con el resto).
  2. **`weight_kg` por especie** — el rango 0-50kg genérico (documentado como gap en la
     auditoría anterior) pasa a ser perro 0.5-90kg / gato 0.5-15kg, validado en ambas
     rutas de la API y reflejado en los `<input min/max>` de ambos formularios.
  Migración aditiva aplicada y verificada en producción con autorización de Mauro
  ("sí, solucionalo"). Ver data-model.md para el detalle técnico completo.
- **"Esto es una redundancia" — se saca `coat_length` (2026-08-17, mismo día)**: el
  usuario señaló que el campo "Pelo" separado (corto/largo/sin pelo) era redundante — el
  pelo del gato doméstico ya es parte del nombre real de la raza. Se agregó
  `domestico_pelo_largo` como raza distinta (junto al ya existente
  `domestico_pelo_corto`) — "Domestic Shorthair/Longhair" es categorización estándar en
  registros felinos, no una invención — y se sacó el campo "Pelo" del register flow y de
  "Identificación básica" en `/pet`, junto con toda su validación en la API.
  `mestizo_quiltro`/`domestico_pelo_corto`/`domestico_pelo_largo` quedan excluyentes
  entre sí (elegir uno reemplaza a los otros 2, no solo bloquea razas específicas — bug
  encontrado y corregido en el mismo cambio: la condición `disabled` original bloqueaba
  *todas* las demás opciones, incluidas las mestizas hermanas, cuando debía dejarlas
  intercambiables entre ellas). La columna `coat_length` queda en el schema sin uso — ver
  data-model.md, no se hizo `DROP COLUMN` por no ser una migración necesaria (sin dato
  real de producción, solo mascotas de prueba).
