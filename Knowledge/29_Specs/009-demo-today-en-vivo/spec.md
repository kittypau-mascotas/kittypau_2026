# Feature Specification: Demo /today en vivo con identidad del visitante

**Feature Branch**: `009-demo-today-en-vivo`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Demo app accesible desde el login. El visitante define nombre del dueño, nombre y tipo de la mascota, y una foto. La demo renderiza una copia visual exacta de `/today` de Bandida (KPCL0034 comida + KPCL0035 agua) con LOS MISMOS DATOS REALES EN VIVO, pero reemplazando el nombre de la mascota, el nombre del dueño y la foto por lo que el visitante ingresó. Objetivo: que alguien que todavía no se registró vea el producto real funcionando, con el nombre de su mascota adentro, antes de crear la cuenta."

---

## Contexto (de `Knowledge/`)

- **`/demo` hoy** (documentado en `Knowledge/04_Frontend/ESTRUCTURA_src_app.md` §): "Demo pública sin login, acepta `?menu=today|story|pet|bowl` para mostrar cada pantalla con **datos de ejemplo**." Es decir: hoy la demo muestra datos sintéticos, no lo que está pasando en vivo. `/client-demo` y `/test` son alias que renderizan lo mismo. Además hay una capa de guía con un chatbot-gato (`TrialRpgDialog`, `DEMO_SCREEN_CONTEXT`).
- **Captura de leads**: el flujo actual de demo postea a `/api/demo/ingreso` con email + nombre de mascota, y eso alimenta `/admin/demo-ingresos` (tabla de leads: email, mascota, primer/último visto, contador).
- **`/today` real** (`(app)/today/page.tsx`): muestra el hero con identidad de la mascota (foto, nombre, origen/tamaño/edad/peso), el widget "Barras Sims" (Comida + Agua, con la barra "comió más o menos que lo habitual" en Comida), las cards de Alimentación/Hidratación de `#today-bowls`, el gráfico día/noche, la card de KPIs de consumo y la card "Consumo por período" (semana/mes). Los datos salen de `readings` reales de KPCL0034/KPCL0035 vía endpoints que hoy exigen sesión.
- **KPCL0034 = "Bandida"** es el único dispositivo con el motor de clasificación v2 validado (`Knowledge/29_Specs/007-motor-alimentacion-produccion/`) — por eso la demo tiene que ser sobre datos reales de Bandida, no sintéticos. **KPCL0035** es su bebedero; en `/today` se muestra tal cual, con el estado "Sin modelo de detección todavía".
- **No hay spec previo** en `Knowledge/29_Specs/` para una demo con datos en vivo — esta feature es nueva, confirmada explícitamente por Mauro en conversación (2026-09-09/10). El detalle de consumo semana/mes está en `Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md`; el motor de clasificación, en spec 007.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el producto real con el nombre de mi mascota (Priority: P1)

Una persona que todavía no tiene cuenta entra a la demo desde el login, escribe su nombre y el nombre de su mascota, y ve la pantalla principal de Kittypau (`/today`) funcionando con datos reales en vivo del comedero y bebedero de Bandida — pero con el nombre de su mascota, su nombre como dueño y (si la subió) su foto en lugar de los de Bandida.

**Why this priority**: Es el corazón de la feature y el único motivo de negocio: convertir a alguien que "todavía no confía" mostrándole el producto real, personalizado, sin fricción de registro. Sin esto no hay feature.

**Independent Test**: Entrar a la demo sin cuenta, completar nombre de dueño y de mascota, y verificar que (a) todos los números/gráficos que se ven coinciden con los que ve la app autenticada para Bandida en ese mismo momento, y (b) en ningún lado de la pantalla aparece el nombre "Bandida", el nombre del dueño real, ni su foto — están reemplazados por lo ingresado.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión en el login, **When** activa la demo e ingresa "Marta" como dueño y "Pelusa" como mascota, **Then** ve la pantalla `/today` con "Pelusa" y "Marta" en el hero y en todo texto que en la app real diría el nombre de la mascota o del dueño.
2. **Given** el visitante está viendo la demo, **When** en paralelo se consulta la app autenticada real de Bandida, **Then** el porcentaje de la barra de hambre, la "próxima comida estimada", la barra "comió más/menos que lo habitual", el gráfico día/noche, los KPIs de consumo y el consumo semana/mes son idénticos entre ambas vistas (misma fuente de datos, mismo instante).
3. **Given** Bandida acaba de comer (evento nuevo en los datos reales), **When** el visitante recarga o la demo refresca sus datos, **Then** la demo refleja ese evento nuevo igual que lo haría la app real.
4. **Given** el visitante no sube ninguna foto, **When** entra a la demo, **Then** se muestra un avatar de reemplazo (iniciales o placeholder de marca), nunca la foto real de Bandida.
5. **Given** el bebedero KPCL0035 no tiene modelo de detección, **When** el visitante ve la sección de Hidratación en la demo, **Then** muestra exactamente el mismo estado que `/today` real ("Sin modelo de detección todavía" + nivel/lecturas crudas), sin inventar datos.

---

### User Story 2 - Pasar de la demo a crear la cuenta (Priority: P2)

Después de ver la demo con su mascota, el visitante tiene una forma clara y visible de crear su cuenta, sin perder el contexto de lo que acaba de escribir (nombre de dueño, mascota, tipo).

**Why this priority**: La demo sin salida a registro es una calle sin salida — el objetivo de negocio es la conversión. Pero la demo ya aporta valor sin esto (US1), por eso es P2.

**Independent Test**: Estando en la demo, encontrar el llamado a la acción de "Crear cuenta" y verificar que al usarlo se llega al flujo de registro con el nombre de la mascota / dueño / tipo ya precargados (o al menos disponibles para no re-tipear).

**Acceptance Scenarios**:

1. **Given** el visitante está en la demo con "Pelusa"/"Marta" cargados, **When** toca "Crear cuenta", **Then** llega al registro y el flujo ya conoce esos valores (no los vuelve a pedir desde cero).
2. **Given** el visitante entró a la demo, **When** cierra la pestaña y vuelve a entrar a la demo más tarde en el mismo navegador, **Then** no tiene que volver a escribir el nombre de la mascota y del dueño (se recordaron localmente), o se le vuelven a pedir de forma explícita — pero nunca se pierde a mitad de camino sin aviso.

---

### User Story 3 - Registro del lead para seguimiento (Priority: P3)

Cuando alguien usa la demo, el equipo puede ver ese ingreso en el panel de leads (`/admin/demo-ingresos`), ahora con más contexto: nombre del dueño y tipo de mascota además del nombre de la mascota que ya se capturaba. El email queda vacío hasta que el visitante lo deje en "Crear cuenta".

**Why this priority**: Es valor para el equipo (marketing/ventas), no para el visitante. La demo funciona igual sin esto, por eso P3. Extiende un mecanismo que ya existe.

**Independent Test**: Usar la demo con datos nuevos y verificar que aparece una fila en `/admin/demo-ingresos` con el nombre del dueño y el tipo de mascota además de los campos actuales, con el email vacío.

**Acceptance Scenarios**:

1. **Given** un visitante completa la demo con dueño "Marta", mascota "Pelusa", tipo "gato", **When** se revisa el panel de leads, **Then** hay una fila con esos tres datos y su marca de tiempo, con el email vacío.
2. **Given** el mismo navegador vuelve a la demo otro día, **When** se revisa el panel, **Then** no se crea un lead duplicado — se actualiza el "último visto" / contador del lead existente (mismo criterio que hoy).

---

### User Story 4 - Sacar el chatbot-gato del proyecto (Priority: P3)

El chatbot-gato ("gato guía" / trial dialog) es de una etapa anterior y ya no se usa: en `/demo` está apagado por un flag y en `/login` todavía se llama pero no aporta. Esta feature lo elimina por completo (carpeta, endpoint, estilos, código muerto en `/demo`, llamada en `/login`) para arrancar la demo nueva sobre código limpio.

**Why this priority**: Habilitante y de higiene, no valor directo para el visitante — pero deja el login más limpio y evita mantener ~250 líneas de código muerto + un endpoint sin uso. Se puede hacer y verificar de forma aislada.

**Independent Test**: `grep` de `chatbot-gato` / `TrialRpg` / `trial-rpg` / `fetchChatbotGatoResponse` / `DEMO_SCREEN_CONTEXT` / `LOGIN_CHATBOT_CONTEXT` en todo el repo devuelve 0 resultados, y `/login` sigue funcionando igual (login, registro, botón de demo) — `tsc`/`eslint`/`build` limpios.

**Acceptance Scenarios**:

1. **Given** el repo después de esta feature, **When** se busca cualquier referencia al chatbot-gato, **Then** no queda ninguna (ni carpeta `src/chatbot-gato/`, ni `api/chatbot-gato/`, ni estilos `.trial-rpg-*`, ni imports).
2. **Given** un usuario en `/login`, **When** usa el login normal o abre el registro o toca "Demo App", **Then** todo funciona exactamente igual que antes, sin el gato animado.

---

### Edge Cases

- **Datos de Bandida no disponibles** (comedero/bebedero sin reportar hace mucho, o el backend de datos en vivo caído): la demo muestra los mismos estados vacíos/neutros que `/today` real en ese caso ("sin registro", "sin dispositivo", gris) — nunca una pantalla rota ni un error técnico crudo. La demo sigue mostrando la identidad del visitante y el CTA a registro.
- **Nombre de mascota o dueño vacío / solo espacios**: no se puede entrar a la vista de la demo hasta que ambos tengan al menos un carácter visible; se indica qué falta.
- **Nombre muy largo o con caracteres raros / emojis**: se trunca visualmente donde haga falta para no romper el layout, sin rechazar el ingreso.
- **El visitante llega directo a la URL de la demo sin pasar por el formulario de identidad**: se le muestra el formulario "Personaliza tu demo" primero (o se usa lo recordado del navegador si ya lo había completado).
- **Bandida deja de estar vinculada a KPCL0034/KPCL0035 o se renombra en producción**: la demo apunta al dispositivo físico designado como "dispositivo de demo", no a un nombre — si ese dispositivo cambia de mascota, el spec de implementación debe permitir reconfigurar cuál es el dispositivo de demo sin tocar código de negocio.
- **Muchos visitantes a la vez / uso abusivo del endpoint de datos en vivo**: la demo no debe permitir que se use su acceso a datos como una API pública general — solo expone los datos del dispositivo de demo, con un límite de frecuencia razonable, y nunca datos de ningún otro dispositivo o cuenta.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer, desde el login, una forma de entrar a la demo sin tener cuenta ni iniciar sesión (el botón "Demo App / No Necesitas Registrarte").
- **FR-002**: Antes de mostrar la vista, el sistema MUST pedir al visitante, en un formulario chico (el que ya existe hoy: "Personaliza tu demo"): tipo de mascota (perro / gato), nombre del dueño, nombre de la mascota, y los botones "Cancelar" / "Entrar a prueba". El visitante entra con el avatar/gif que corresponde al tipo elegido (no se sube foto). El email NO se pide acá.
- **FR-002a**: "Entrar a prueba" MUST estar habilitado solo cuando nombre del dueño y nombre de la mascota tengan al menos un carácter visible cada uno; el tipo de mascota preselecciona uno por defecto. "Cancelar" vuelve al login sin registrar nada.
- **FR-003**: El sistema MUST renderizar una copia visual de la pantalla `/today` de la mascota de demo (Bandida), incluyendo todas sus secciones de datos: hero con identidad, widget "Barras Sims" (Comida + Agua, con la barra "comió más o menos que lo habitual" en Comida), cards de Alimentación e Hidratación, gráfico día/noche, KPIs de consumo y "Consumo por período" (semana/mes).
- **FR-004**: Los datos mostrados en la demo MUST ser los mismos datos reales y en vivo que ve la app autenticada para el mismo dispositivo en el mismo instante — sin datos sintéticos, sin números "de ejemplo", sin desfase intencional. Incluye tanto KPCL0034 (comida, con el motor v2) como KPCL0035 (agua, con su estado real "sin modelo de detección todavía").
- **FR-005**: El sistema MUST reemplazar, en toda la pantalla de la demo, el nombre de la mascota real por el nombre ingresado por el visitante, el nombre / datos del dueño real por los ingresados, y la foto real de la mascota por el avatar/gif del tipo elegido — de modo que en ningún texto, imagen o etiqueta visible aparezca la identidad real de Bandida ni de su dueño.
- **FR-006**: El sistema MUST mostrar los mismos códigos de dispositivo (KPCL0034 / KPCL0035) que la app real — esos son identificadores de hardware, no datos personales, y son parte de "ver el producto real".
- **FR-007**: El sistema MUST refrescar los datos de la demo con la misma cadencia que `/today` real (la barra de hambre/consumo se actualiza periódicamente; el consumo semana/mes se pide una vez por visita) para que la demo siga reflejando lo que pasa en vivo mientras el visitante la mira.
- **FR-008**: El sistema MUST degradar de forma limpia si los datos en vivo no están disponibles: mostrar los mismos estados neutros/vacíos que `/today` real, nunca un error técnico crudo ni una pantalla en blanco, y mantener visibles la identidad del visitante y el llamado a crear cuenta.
- **FR-009**: El sistema MUST ofrecer en la demo un llamado a la acción visible para crear una cuenta. Ese CTA es **el único lugar donde se pide el email** — al usarlo, el visitante pasa al flujo de registro llevando consigo el nombre de la mascota, el nombre del dueño y el tipo ya ingresados (para no re-pedirlos).
- **FR-010**: El sistema MUST recordar, en el navegador del visitante, la identidad ingresada (dueño / mascota / tipo) de modo que recargar o volver a la demo en la misma sesión de navegador no obligue a re-tipear todo; si no hay nada recordado, se vuelve a pedir de forma explícita.
- **FR-011**: El sistema MUST registrar el ingreso a la demo como lead para seguimiento del equipo, con: nombre del dueño, nombre de la mascota, tipo de mascota, marcas de tiempo y contador de visitas. El email queda vacío en el lead salvo que el visitante llegue a dejarlo en el CTA de crear cuenta. No se crean leads duplicados para el mismo visitante recurrente — se actualiza el existente (mismo criterio que hoy).
- **FR-012**: El sistema MUST garantizar que el acceso a datos que habilita la demo NO exponga datos de ningún dispositivo, mascota o cuenta que no sea el dispositivo de demo designado, ni permita usarse como API general — con un límite de frecuencia razonable por visitante.
- **FR-013**: El sistema MUST NOT modificar la pantalla `/today` de la app autenticada ni el widget "Barras Sims" real como efecto de esta feature — la demo es un espejo visual de solo lectura, construido sobre los mismos componentes, no un cambio en la experiencia autenticada.
- **FR-014**: La demo MUST NOT mostrar elementos propios de una sesión con cuenta que no tienen sentido para un visitante anónimo (avisos de "completá tu registro", botón de cerrar sesión, modales de guía de onboarding de la cuenta, botones internos de QA). El foco es la visualización de datos + identidad + CTA a registro.
- **FR-015**: La demo MUST tener **una sola vista**: la de `/today`. No hay selector de pantallas (`?menu=story|pet|bowl`), no hay otras pantallas en versión demo. Entrar a la demo = ver `/today` de la mascota de demo con la identidad del visitante encima, y nada más.
- **FR-016**: La vista de la demo MUST ser **la misma vista de `/today` de la app** — el mismo código y los mismos componentes, parametrizados por (a) la identidad a mostrar (la del visitante en vez de la real) y (b) el origen de los datos (lectura sin sesión de la mascota de demo). El objetivo es que **cualquier cambio futuro a `/today` aparezca automáticamente en la demo**, sin un segundo lugar que mantener sincronizado a mano. Si en algún punto la implementación no puede evitar duplicar una parte, esa parte se documenta como deuda explícita, no se acepta en silencio.
- **FR-017**: La demo nueva **reemplaza** por completo a la `/demo` actual. El botón "Demo App" del login apunta a la nueva. `/client-demo` y `/test` (alias de la vieja) dejan de tener sentido y se resuelven según FR-019.
- **FR-018**: El chatbot-gato **se elimina del proyecto** como parte de esta feature (Mauro: "es del pasado, en teoría debería estar borrado"). Alcance de la eliminación: el código muerto que lo rodea en `/demo` (ya apagado por `SHOW_GUIDE_DIALOG = false`), la carpeta `src/chatbot-gato/`, el endpoint `src/app/api/chatbot-gato/route.ts`, los estilos `.trial-rpg-*` de `globals.css`, y la llamada que todavía hace `/login` a `fetchChatbotGatoResponse` (el "gato animado / easter egg" del login). El plan de implementación debe confirmar que ningún otro lugar lo usa antes de borrar (grep de `chatbot-gato`/`TrialRpg`/`trial-rpg`).
- **FR-019**: Las rutas `/client-demo` y `/test` (hoy alias de la `/demo` vieja) MUST quedar consistentes con la demo nueva: o redirigen a la demo nueva, o se eliminan. No pueden quedar renderizando una demo que ya no existe.

### Key Entities *(include if feature involves data)*

- **Identidad de demo (del visitante)**: nombre del dueño, nombre de la mascota, tipo de mascota (perro/gato), y el avatar/gif que corresponde a ese tipo. Vive solo en el navegador del visitante durante su sesión; no es una cuenta ni un perfil real. Es lo que se superpone sobre los datos de la mascota de demo.
- **Mascota de demo**: la mascota real cuyos datos en vivo se muestran (hoy Bandida). Referenciada por el/los dispositivo(s) físico(s) designado(s) como "dispositivos de demo" (hoy KPCL0034 para comida + KPCL0035 para agua), no por su nombre, para que sea reconfigurable.
- **Datos en vivo de `/today`**: el conjunto de valores que hoy consume la pantalla `/today` para una mascota — estado de la barra de hambre, última comida, gramos de la última comida, próxima comida estimada, alerta de atraso, eventos de comida/servido clasificados, KPIs de consumo, consumo por período, nivel/lecturas del bebedero. La demo consume exactamente este conjunto, sin agregar ni quitar campos.
- **Lead de demo**: registro para el equipo de que alguien usó la demo. Campos: identidad ingresada (dueño, mascota, tipo), email (vacío salvo que se deje en el CTA de crear cuenta), primera visita, última visita, contador. Extiende el lead que hoy alimenta `/admin/demo-ingresos` (que hoy asume email presente — hay que contemplar el lead sin email).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante sin cuenta puede pasar del login a estar viendo la pantalla de la demo con el nombre de su mascota en pantalla en menos de 30 segundos (completar 2 campos obligatorios + entrar).
- **SC-002**: En una comparación lado a lado, el 100% de los valores numéricos y gráficos visibles en la demo coinciden con los de la app autenticada real de Bandida tomados en el mismo minuto (barra de hambre, próxima comida estimada, "comió más/menos que lo habitual", KPIs de consumo, consumo semana/mes, gráfico día/noche).
- **SC-003**: En 0 de los recorridos de prueba aparece el nombre "Bandida", el nombre del dueño real o la foto real de la mascota en cualquier parte visible de la demo.
- **SC-004**: Cuando los datos en vivo no están disponibles, el 100% de las veces la demo muestra un estado neutro legible (no un error técnico ni pantalla en blanco) y mantiene visible el CTA de crear cuenta.
- **SC-005**: Ningún request que haga la demo devuelve datos de un dispositivo, mascota o cuenta distinta a la mascota de demo designada (verificable revisando las respuestas).
- **SC-006**: La pantalla `/today` de la app autenticada y el widget "Barras Sims" real se ven y se comportan exactamente igual antes y después de esta feature (regresión visual y funcional sin cambios).
- **SC-007**: Cada uso de la demo con una identidad nueva produce exactamente un lead nuevo en el panel del equipo con el nombre del dueño y el tipo de mascota; los visitantes recurrentes del mismo navegador no generan leads duplicados.
- **SC-008**: Un cambio hecho en `/today` de la app real (agregar/quitar/reordenar una card, cambiar un texto, cambiar un cálculo) aparece en la demo sin ninguna edición adicional específica de la demo — verificable haciendo un cambio de prueba en `/today` y confirmando que se refleja en la demo.
- **SC-009**: Después de esta feature, `grep` de `chatbot-gato` / `TrialRpg` / `trial-rpg` / `fetchChatbotGatoResponse` / `DEMO_SCREEN_CONTEXT` / `LOGIN_CHATBOT_CONTEXT` en todo el repo devuelve 0 resultados, y el login sigue funcionando igual (login, registro, botón de demo) con `tsc`/`eslint`/`build` limpios.

---

## Assumptions

- **Fuente de la mascota de demo**: se usa Bandida (KPCL0034 comida + KPCL0035 agua) porque es el único conjunto con el motor de clasificación v2 validado (spec 007) y con historial real suficiente. El spec de implementación debe permitir designar cuál es el "dispositivo de demo" de forma configurable, no hardcodeada a un nombre.
- **Copia exacta, no copia paralela**: "copia exacta de `/today`" se entiende como **el mismo código de `/today` reutilizado**, no una segunda pantalla que hay que mantener a la par. La demo es `/today` con dos cosas cambiadas: la identidad que se muestra (visitante en vez de real) y de dónde salen los datos (lectura sin sesión de la mascota de demo). Todo lo demás — layout, cards, gráfico, cálculos, textos, estados vacíos — es literalmente lo mismo. Ver FR-016 y SC-008.
- **Avatar de la mascota**: NO hay subida de foto en el formulario de entrada. El visitante elige perro o gato y entra con el avatar/gif que corresponde a ese tipo (se reutiliza el que ya usa el formulario "Personaliza tu demo" actual). Poder subir una foto real queda como mejora futura, fuera de alcance de esta feature.
- **Persistencia**: la identidad del visitante se guarda solo en el navegador (mismo mecanismo local que ya usa el flag de modo demo actual), sin nada en el servidor más allá del lead. Expira/limpia con los criterios estándar del navegador.
- **KPCL0035 / Hidratación**: se muestra tal cual está en `/today` hoy — con su estado real "Sin modelo de detección todavía" y sus lecturas crudas. No se le construye un modelo ni datos para la demo.
- **Eliminación del chatbot-gato**: en scope de esta feature (FR-018). Antes de borrar, el plan debe hacer un grep completo (`chatbot-gato`, `TrialRpg`, `trial-rpg`, `fetchChatbotGatoResponse`, `DEMO_SCREEN_CONTEXT`, `LOGIN_CHATBOT_CONTEXT`) para confirmar que no queda ningún consumidor legítimo. `/login` es un archivo grande y sensible — el cambio ahí se limita a sacar la llamada al chatbot y su UI asociada, sin tocar el resto del login (cambio quirúrgico, Principio I de la constitución).
- **Alcance excluido**: no entran en esta feature — las otras pantallas de la app (`/story`, `/pet`, `/bowl`) en cualquier versión demo (la demo es de una sola vista, `/today`, ver FR-015); subir foto real de la mascota en la demo; recibir notificaciones push en la demo; editar/guardar cualquier dato real de Bandida desde la demo (es solo lectura).
- **Dependencia**: la demo depende de que exista una forma de leer los datos en vivo de la mascota de demo sin una sesión de usuario. Hoy los endpoints que alimentan `/today` exigen sesión; habilitar esto es parte del trabajo de implementación (con el límite de FR-012), no un supuesto de que ya está resuelto.
- **Conocimiento**: `Knowledge/` documenta la `/demo` actual (datos de ejemplo) y las piezas de `/today` (SPEC_11, spec 007), pero no tiene un spec previo para una demo con datos en vivo — esta es la primera vez que se especifica, sobre pedido explícito de Mauro.
