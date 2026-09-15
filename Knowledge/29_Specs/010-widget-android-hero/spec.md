# Feature Specification: Widget de Android — mini-hero de la mascota

**Feature Branch**: `010-widget-android-hero`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Widget nativo de Android (home screen widget) para la APK de Kittypau, tamaño de grilla 2 filas × 4 columnas, que muestre en vivo un 'mini-hero' de la mascota sin abrir la app: foto del gato, barra de comida, barra de agua, un círculo verde con el número de comidas de hoy (ícono de comida detrás, número que contraste) y el mismo tratamiento para agua, más 'Últ. comida (hora)' / 'Últ. agua (hora)' en texto muy chico, con los colores de marca de Kittypau."

---

## Contexto (de `Knowledge/`)

- **Ya evaluado y explícitamente pospuesto** en `Knowledge/29_Specs/SPEC_06_Mobile_APK_2026.md` § "Evaluado y descartado por ahora" (2026-08-12): *"Widgets de pantalla de inicio — requiere código nativo Kotlin/Glance por fuera de Capacitor, no hay plugin que lo resuelva; recién tendría sentido si 'ver el % del hunger bar sin abrir la app' se vuelve un pedido explícito de usuarios reales."* Ese pedido explícito llegó el 2026-09-15 — esta spec es la continuación directa de esa nota.
- **Por qué no es una tarea más de la web app**: la app es un híbrido Capacitor — el WebView carga `kittypau-app.vercel.app` en vivo (mismo doc, línea 26-33). Un widget de pantalla de inicio de Android **no corre dentro de ese WebView**: es una superficie nativa aparte que el sistema operativo dibuja directamente en el launcher, con su propio ciclo de vida y su propio mecanismo de actualización en segundo plano. No se puede "insertar" la web ahí ni reusar el marcado/CSS de los componentes React existentes.
- **Datos ya calculados y expuestos hoy, que este widget debe leer (no reinventar)**:
  - `GET /api/pets/:id/hunger-bar` — ya da el `percentage` de comida, `kpis.mealsToday` (comidas confirmadas de hoy) y `lastMealDetectedAt`. Es el mismo dato que hoy pinta el badge "comidas hoy" y la barra de Comida del hero real de `/today`.
  - El % de agua y el estado de hidratación se calculan hoy a partir de las lecturas del bebedero (`waterContentWeightGrams` sobre su máximo servido) y de `audit_events` confirmados — mismos datos que hoy alimentan la barra de Agua y el texto "Último consumo confirmado" del hero real.
  - **Regla ya vigente y no negociable del proyecto ("copy honesto"), documentada en `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md` y aplicada explícitamente en el hero real el 2026-09-14**: el badge de agua del hero de `/today` deliberadamente NO muestra un número de "veces que bebió", porque todavía no existe un modelo de detección de trago confirmado. Nunca se muestra un número inventado donde no hay evidencia real. Esta spec hereda esa regla — ver Pregunta 1 más abajo, es la decisión de diseño más importante de todo el feature.
  - El widget "Barras Sims" (`kittypau_app/src/app/(app)/today/_components/barras-sims-card.tsx`) es un componente web protegido — Mauro ya pidió revertir cambios de contenido ahí 3 veces (ver memoria del proyecto). Este widget de Android es una superficie **nueva y separada** que se inspira en los mismos datos; no modifica ni depende de cambios en ese componente web.
- **Alcance de plataforma**: la app hoy está en producción solo para Android (`Knowledge/29_Specs/SPEC_06_Mobile_APK_2026.md` línea 120: "Live Activities / Dynamic Island — es iOS-only y la app hoy es Android-only en producción"). iOS queda fuera de esta spec.

---

## Aclaraciones necesarias antes de planificar

### Pregunta 1: ¿Qué muestra el círculo de agua?

**Contexto**: Mauro pidió "2 circulos uno verde para comida con el numero de comida... y lo mismo para agua" — un círculo de agua con número, mismo tratamiento visual que el de comida. Pero hoy el proyecto tiene una regla activa de no mostrar un conteo de "veces que bebió agua" porque no hay modelo de detección de trago confirmado (ver Contexto arriba) — mostrar ese número en el widget sería inventar un dato que el resto de la app deliberadamente no muestra.

**Qué necesitamos saber**: ¿el círculo de agua debe mostrar otro número real que sí existe (ej. % de nivel del bebedero, o mL actuales), quedarse sin número (solo el ícono, igual que el badge del hero real hoy), o el proyecto está listo para asumir un conteo de eventos de hidratación aunque todavía sea "provisorio"?

**Respuestas sugeridas**:

| Opción | Respuesta | Implicancia |
|--------|-----------|-------------|
| A | Círculo de agua sin número, solo el ícono (mismo criterio que el badge del hero real hoy) | Consistente con "copy honesto" en toda la app, cero riesgo de inventar un dato. El círculo se ve más vacío que el de comida — asimetría visual intencional que refleja una asimetría real de los datos. |
| B | Círculo de agua muestra el nivel actual del bebedero en % o mL (dato real y ya disponible) en vez de un conteo de "veces" | Mantiene el círculo simétrico visualmente con el de comida (ambos con número), pero el número significa algo distinto en cada círculo (comida = veces hoy, agua = nivel actual) — hay que comunicarlo bien para que no confunda. |
| Custom | Otra métrica de agua real, o el proyecto decide que el motor de detección de trago ya está lo bastante maduro para mostrar un conteo aunque sea provisorio (marcado como tal) | Requeriría primero confirmar el estado real del modelo de agua contra `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md` antes de aceptarlo. |

**Tu elección**: **Opción A — círculo de agua solo con ícono, sin número** (mismo criterio de "copy honesto" que el badge de agua del hero real hoy; asimetría visual intencional frente al círculo de comida).

### Pregunta 2: ¿Qué mascota muestra el widget si la cuenta tiene más de una?

**Contexto**: las cuentas reales del proyecto pueden tener más de una mascota (ej. la cuenta tester tiene "Bandida" y "Amanda", solo Bandida tiene dispositivos). El hero real de `/today` resuelve esto con un selector que el dueño cambia manualmente dentro de la app — un widget de home screen no tiene ese mismo espacio para un selector completo.

**Qué necesitamos saber**: ¿cada widget queda fijo a una mascota elegida al agregarlo (el dueño puede agregar varios widgets, uno por mascota, si quiere ver más de una), o siempre muestra la mascota "principal"/activa de la cuenta sin poder elegir?

**Respuestas sugeridas**:

| Opción | Respuesta | Implicancia |
|--------|-----------|-------------|
| A | El dueño elige la mascota al agregar el widget (pantalla de configuración corta antes de que el widget se coloque) — puede agregar varios widgets, uno por mascota | Más flexible y correcto para cuentas multi-mascota, pero es una pantalla/flujo adicional a diseñar e implementar. |
| B | El widget siempre muestra la mascota "principal"/activa de la cuenta (la misma que abre por default `/today`), sin poder elegir otra | Más simple de construir, pero una cuenta con 2 mascotas con dispositivo no puede ver a la segunda desde el widget sin abrir la app. |
| Custom | Otra regla (ej. mostrar la primera mascota con dispositivo asignado, aunque no sea la "principal" de la cuenta) | A definir. |

**Tu elección**: **Opción A — el dueño elige la mascota al agregar el widget**, y puede agregar más de un widget si quiere ver más de una mascota.

### Pregunta 3: ¿Qué pasa con el widget si la sesión de la cuenta deja de ser válida?

**Contexto**: el widget sigue existiendo en el home screen aunque el dueño cierre sesión en la app, desinstale y reinstale, o el token de acceso venza sin renovarse. No puede quedar mostrando datos reales de la mascota de forma indefinida si la cuenta ya no está autenticada — pero tampoco debería desaparecer sin explicación.

**Qué necesitamos saber**: cuando el widget detecta que ya no puede autenticarse contra la cuenta, ¿debe limpiar los datos y mostrar un estado neutro ("Iniciá sesión para ver a tu mascota", toca para abrir el login), seguir mostrando el último dato conocido indefinidamente, o dejar de actualizarse pero mantener visible el último dato con una marca de "desactualizado"?

**Respuestas sugeridas**:

| Opción | Respuesta | Implicancia |
|--------|-----------|-------------|
| A | Estado neutro explícito ("Iniciá sesión para ver a tu mascota") en cuanto la sesión deja de ser válida, tocar abre el login | Más seguro y honesto — nunca muestra un dato que ya no se puede verificar. Requiere que el widget sepa distinguir "sin conexión momentánea" de "sesión realmente inválida". |
| B | Mantiene el último dato conocido visible indefinidamente, con una marca visual de "desactualizado" a partir de cierto tiempo sin poder refrescar | Menos brusco para el dueño, pero puede mostrar datos viejos por mucho tiempo si nunca vuelve a abrir la app. |
| Custom | Otra regla de expiración (ej. mostrar el último dato hasta X días, después limpiar) | A definir. |

**Tu elección**: **Opción A — estado neutro explícito** ("Iniciá sesión para ver a tu mascota") en cuanto la sesión deja de ser válida; tocar el widget en ese estado abre el login.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el estado de mi mascota sin abrir la app (Priority: P1)

Un dueño con la APK de Kittypau instalada agrega el widget a la pantalla de inicio de su celular Android. Sin abrir la app, ve de un vistazo la foto de su mascota, cuánta comida y agua le quedan en el plato/bebedero, cuántas veces comió hoy y a qué hora fue la última comida.

**Why this priority**: Es el motivo de negocio completo del feature — "ver el % del hunger bar sin abrir la app". Sin esto no hay widget.

**Independent Test**: Agregar el widget al home screen con una cuenta que ya tiene una mascota con datos reales, y verificar que la foto, las dos barras, el círculo de comida y las horas mostradas coinciden con lo que muestra `/today` para esa misma mascota en ese momento.

**Acceptance Scenarios**:

1. **Given** un dueño con sesión iniciada y una mascota con comedero y bebedero vinculados, **When** agrega el widget al home screen, **Then** ve la foto de su mascota, la barra de comida, la barra de agua, el círculo de comida con el número de comidas de hoy, y las horas de última comida/agua, todo con los colores de marca de Kittypau.
2. **Given** el widget ya está agregado, **When** el dueño lo mira sin desbloquear ni abrir ninguna app más allá de ver la pantalla de inicio, **Then** toda la información es legible a simple vista, incluyendo que el número dentro del círculo de comida contrasta claramente contra el ícono de fondo y el color del círculo.
3. **Given** la mascota no tiene ninguna comida confirmada todavía hoy, **When** se muestra el widget, **Then** el círculo y el texto de "última comida" lo comunican de forma honesta (ej. "0" y "sin registro hoy"), nunca con un dato inventado.

---

### User Story 2 - El widget se actualiza solo (Priority: P2)

Después de agregar el widget, el dueño no tiene que abrir la app ni tocar nada para que la información se mantenga al día — cuando el comedero o el bebedero confirman un evento nuevo, el widget lo refleja por su cuenta en un tiempo razonable.

**Why this priority**: Sin actualización automática, el widget es una foto fija del momento en que se agregó — pierde la mayor parte de su valor ("en vivo"), pero el feature igual entrega algo útil sin esto (US1), por eso es P2 y no P1.

**Independent Test**: Con el widget ya agregado y mostrando un estado conocido, provocar un evento real de comida o agua en el dispositivo de prueba, y verificar que el widget refleja el cambio sin que nadie abra la app, dentro de la ventana definida en Success Criteria.

**Acceptance Scenarios**:

1. **Given** el widget muestra el estado de comida de antes de un evento nuevo, **When** el comedero confirma que la mascota comió, **Then** el widget actualiza la barra de comida, el círculo con el número de comidas y la hora de "última comida" sin intervención del dueño.
2. **Given** el celular no tiene conexión a internet en el momento en que correspondería actualizar, **When** el dueño mira el widget, **Then** sigue viendo el último dato conocido (no una pantalla en blanco ni un error), y ese dato se actualiza apenas vuelve la conexión.

---

### User Story 3 - Ir al detalle completo desde el widget (Priority: P3)

Cuando el vistazo rápido del widget no alcanza (el dueño quiere ver el gráfico del día, el historial, o cualquier otro detalle), tocar el widget lo lleva directo a la pantalla "Hoy" de esa mascota dentro de la app.

**Why this priority**: Es un atajo de conveniencia sobre un flujo que ya existe (abrir la app y navegar a "Hoy") — valioso pero no bloqueante para que el widget cumpla su propósito principal, por eso P3.

**Independent Test**: Tocar el widget en el home screen y verificar que abre la app directo en la pantalla "Hoy" de la mascota que muestra ese widget, sin pasos intermedios.

**Acceptance Scenarios**:

1. **Given** el dueño ve el widget de una mascota con sesión válida, **When** lo toca, **Then** la app abre directo en la pantalla "Hoy" de esa mascota (no en una pantalla genérica ni pidiendo login de nuevo si la sesión sigue vigente).
2. **Given** la sesión ya no es válida (ver User Story sobre sesión inválida en Edge Cases), **When** el dueño toca el widget, **Then** la app abre en el login en vez de romperse o mostrar una pantalla vacía.

---

### Edge Cases

- ¿Qué muestra el widget si la mascota vinculada no tiene comedero o bebedero asignado todavía? (mismo criterio honesto que usa hoy `/today` para "sin dispositivo asignado", no una barra vacía sin explicación).
- ¿Qué pasa si la mascota no tiene foto cargada? (usar el mismo reemplazo visual que ya usa el hero real de `/today` hoy).
- ¿Qué pasa si el dueño quita el widget del home screen y lo vuelve a agregar? (debe volver a pasar por la selección de mascota de la Pregunta 2, no asumir la última elegida).
- ¿Qué pasa si la cuenta pierde el dispositivo (se desvincula) mientras el widget ya estaba mostrando sus datos? (el widget debe reflejar "sin dispositivo asignado" en el siguiente refresco, no quedar mostrando datos de un dispositivo que ya no está vinculado).
- Sesión inválida / token vencido — cubierto por la Pregunta 3.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un widget de pantalla de inicio de Android, en un tamaño fijo de 2 filas × 4 columnas, que el dueño pueda agregar desde el selector de widgets del sistema operativo.
- **FR-002**: El widget DEBE mostrar la foto de la mascota vinculada a esa instancia del widget, con el mismo reemplazo visual que usa hoy el hero real de `/today` cuando no hay foto cargada.
- **FR-003**: El widget DEBE mostrar una barra de progreso del nivel de comida del plato, en el mismo color que el resto de la app usa para "Alimentación".
- **FR-004**: El widget DEBE mostrar una barra de progreso del nivel de agua del bebedero, en el mismo color que el resto de la app usa para "Hidratación".
- **FR-005**: El widget DEBE mostrar, dentro de un círculo de color de comida, el número de comidas confirmadas del día junto a un ícono de comida detrás, con contraste suficiente entre el número y el fondo para leerse a simple vista.
- **FR-006**: El widget DEBE mostrar un círculo equivalente de agua con el mismo ícono de agua y color de marca que la barra de Hidratación, **sin número dentro** (a diferencia del círculo de comida) — no hay modelo de detección de trago confirmado todavía, mostrar un conteo ahí sería inventar un dato (ver Pregunta 1).
- **FR-007**: El widget DEBE mostrar, en texto pequeño, la hora de la última comida confirmada, o un texto honesto ("sin registro hoy") si todavía no hay ninguna.
- **FR-008**: El widget DEBE mostrar, en texto pequeño, la hora del último evento de hidratación confirmado, o un texto honesto si todavía no hay ninguno — nunca una hora inventada.
- **FR-009**: El widget DEBE actualizarse automáticamente cuando hay un evento nuevo de comida o agua, sin que el dueño tenga que abrir la app.
- **FR-010**: El widget DEBE seguir mostrando el último dato conocido cuando no puede refrescar por falta de conexión, en vez de quedar en blanco o mostrar un error.
- **FR-011**: Tocar el widget DEBE abrir la app directamente en la pantalla "Hoy" de la mascota que ese widget muestra (o en el login, si la sesión ya no es válida).
- **FR-012**: El widget DEBE usar los mismos colores de marca (rosa de identidad, verde/esmeralda para comida, celeste/sky para agua) que ya usa el resto de la app — ninguna paleta nueva.
- **FR-013**: El dueño DEBE poder elegir qué mascota muestra el widget al agregarlo, para cuentas con más de una mascota — puede agregar más de un widget, uno por mascota (ver Pregunta 2).
- **FR-014**: El widget DEBE mostrar un estado neutro que invite a iniciar sesión (en vez de datos de mascota) en cuanto detecta que la sesión de la cuenta ya no es válida; tocarlo en ese estado abre el login (ver Pregunta 3).
- **FR-015**: El widget NO DEBE mostrar nunca un número o una hora que no corresponda a un evento real confirmado — mismo principio de "copy honesto" que ya rige el resto de la app.
- **FR-016**: El widget DEBE reflejar, en el siguiente refresco, cuando el dispositivo (comedero/bebedero) vinculado a la mascota que muestra deja de estar asignado.

### Key Entities *(include if feature involves data)*

- **Configuración del widget**: qué mascota (y, transitivamente, qué comedero/bebedero) muestra cada instancia del widget colocada en un home screen — se define al agregarlo (Pregunta 2) y persiste hasta que se quite y se vuelva a agregar.
- **Snapshot de alimentación**: % de comida, número de comidas confirmadas hoy, hora de la última — mismo dato que ya expone `/today` para el hero real, leído por el widget sin recalcularlo de cero.
- **Snapshot de hidratación**: % de agua (nivel actual del bebedero), hora del último evento de hidratación confirmado si existe — mismo dato que ya expone `/today`.
- **Estado de sesión del widget**: si la cuenta detrás del widget sigue autenticada o no, determina si se muestran datos reales o el estado neutro de "iniciá sesión" (Pregunta 3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un dueño puede ver el % de comida y agua de su mascota mirando la pantalla de inicio de su celular, sin desbloquear pantallas adicionales ni abrir ninguna app, en menos de 2 segundos.
- **SC-002**: Cuando el comedero o el bebedero confirman un evento nuevo, el widget refleja ese cambio dentro de una ventana de 30 minutos sin que el dueño haga nada — comparable al tiempo que hoy tarda en notar un cambio alguien que no tiene la app abierta.
- **SC-003**: El 100% de los números y horas que muestra el widget corresponden a un evento real confirmado, o se muestran explícitamente como "sin registro" — cero casos de datos inventados, verificable comparando cada valor mostrado contra lo que expone `/today` para la misma mascota en el mismo instante.
- **SC-004**: Tocar el widget lleva al dueño a ver el detalle completo de su mascota (o el login, si corresponde) en menos de 3 segundos.
- **SC-005**: El widget sigue mostrando información útil (el último dato conocido) incluso si el celular no tiene conexión a internet en el momento en que el dueño lo mira.
- **SC-006**: Un dueño con más de una mascota puede tener un widget por cada una en su home screen, cada uno mostrando la mascota correcta de forma independiente.

## Assumptions

- Alcance de plataforma: Android únicamente — la app hoy está en producción solo para Android (ver Contexto), iOS queda fuera de esta spec.
- El tamaño del widget es fijo en 2 filas × 4 columnas — no se ofrece reescalado ni tamaños alternativos en esta primera versión, salvo que una fase posterior de planificación lo justifique explícitamente.
- El widget requiere que el dueño ya haya iniciado sesión y vinculado al menos una mascota con dispositivo antes de poder agregarlo con datos reales útiles — no reemplaza ni acorta el flujo de registro/login existente.
- La actualización automática (FR-009, SC-002) apunta a minutos, no a segundos — el sistema operativo Android limita cuán seguido una app puede ejecutar trabajo en segundo plano; "en vivo" en este contexto significa "se pone al día solo, sin que el dueño tenga que refrescar manualmente", no una conexión permanente como la que tiene la app abierta.
- El widget reusa exactamente los mismos datos y reglas de negocio que ya calcula y expone `/today` (hunger bar, wellness de agua, umbrales de "confirmado" vs "sin evidencia") — no introduce una fuente de verdad nueva ni recalcula nada de cero.
- El widget web "Barras Sims" (`barras-sims-card.tsx`) no se modifica ni depende de este feature — son dos superficies separadas que muestran datos relacionados.
- El `admin panel` queda completamente fuera de alcance de esta spec.
