# Feature Specification: Calibración Automática del Peso del Plato (por Tara)

**Feature Branch**: `005-calibracion-peso-plato`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description original: "en dispositivo en register flow, al momento de seleccionar un dispositivo, necesitamos hacer una prueba en relación al plato. al kittypau se le debe poner un plato encima, que esté un tiempo ahí, y entender que ese será el peso constante del plato. la data que nosotros necesitamos es el contenido del plato. busca si existe algo parecido, si no, dejemos esta prueba de 5 segundos en dispositivo. kittypau listo? ok agrega el plato donde irá comida o agua, listo? pesando plato......, listo ahora tenemos el peso de tu plato, (me explico?) — o definir una serie de pruebas al momento de vincular el kpcl a la cuenta. debe quedar perfecto."

**Actualización del mecanismo** (misma sesión): "utilicemos tara en dispositivo. ordenemos esa prueba: conexión de dispositivo → poner plato arriba → hacer tara → debe quedar Kittypau con plato arriba en 0 después de la tara." Ver `research.md` (fase de plan) para el detalle técnico de qué hace la tara en el firmware real y por qué el orden de esta secuencia importa — resumen: existe un comando de tara (`CALIBRATE_WEIGHT`/`tare`) ya implementado en el firmware, que **persiste el nuevo punto cero de forma permanente** (sobrevive reinicios). Antes de este pedido, el plan era leer el peso sin tocar el sensor — el usuario decidió explícitamente usar la tara real en su lugar, con pleno conocimiento de que el resultado deseado es que el dispositivo quede leyendo 0 con el plato puesto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calibrar el plato haciendo tara en vivo (Priority: P1)

Una persona está en el paso de vincular su dispositivo Kittypau durante el registro. En vez de escribir a mano cuánto pesa el plato vacío, sigue una secuencia guiada: confirma que el dispositivo está conectado, coloca el plato vacío sobre él, el sistema ejecuta la tara, y confirma que el dispositivo quedó en cero con el plato puesto — de ahí en adelante, lo que el dispositivo mida es directamente el contenido (comida o agua), sin tener que restar nada.

**Why this priority**: Es el pedido central — reemplaza el paso de mayor fricción y mayor riesgo de error humano (escribir mal el peso) por una calibración real hecha por el propio dispositivo, y además simplifica cómo se interpreta cada lectura futura (ya viene neta, sin plato).

**Independent Test**: Con un dispositivo Kittypau real conectado, iniciar la prueba, colocar un plato vacío sobre el dispositivo, ejecutar la tara, y confirmar que una lectura posterior con el plato puesto (y nada más) da ~0.

**Acceptance Scenarios**:

1. **Given** la persona llegó al paso de vincular su dispositivo y ya lo seleccionó, **When** confirma que el dispositivo está conectado e inicia la prueba, **Then** el sistema le pide colocar el plato vacío antes de continuar.
2. **Given** el plato vacío ya está puesto, **When** la persona confirma que está listo, **Then** el sistema ejecuta la tara y muestra que está confirmando el resultado.
3. **Given** la tara se ejecutó, **When** el sistema confirma con una lectura nueva, **Then** esa lectura debe dar ~0 (dispositivo + plato = cero) para dar la prueba por exitosa; si no da ~0, la prueba no se da por buena y se ofrece repetir.
4. **Given** la calibración terminó con éxito (lectura ~0 confirmada), **When** la persona continúa y completa la vinculación del dispositivo, **Then** el dispositivo queda vinculado con la tara ya aplicada — las lecturas futuras de ese dispositivo representan directamente el contenido del plato, sin necesitar restar ningún valor guardado aparte.

---

### User Story 2 - Repetir la prueba si algo salió mal (Priority: P2)

La persona coloca el plato tarde, lo mueve durante la tara, o el dispositivo todavía no está bien conectado — la confirmación de que quedó en cero no llega o no es correcta. Necesita poder repetir la secuencia completa sin tener que reiniciar todo el paso de vinculación.

**Why this priority**: Sin esto, un solo intento fallido bloquearía a la persona o la forzaría a abandonar el registro — es la red de seguridad de la User Story 1. Es especialmente importante acá porque cada tara real mueve el punto cero del sensor — repetir mal, sin saber que la anterior ya se aplicó, podría dejar el dispositivo con un cero incorrecto (ej. tarado con el plato mal puesto).

**Independent Test**: Iniciar la prueba, mover o retirar el plato durante la tara (o interrumpir la conexión), y confirmar que el sistema detecta que la confirmación de cero no llegó o no es válida, y ofrece repetir la secuencia completa desde "colocar el plato" en vez de dar por buena una tara dudosa.

**Acceptance Scenarios**:

1. **Given** la tara se ejecutó pero la lectura de confirmación no da ~0, **When** el sistema lo detecta, **Then** informa que algo salió mal y ofrece repetir la secuencia completa (no solo la lectura) — la persona vuelve a colocar el plato y confirmar, para no encadenar taras sobre un estado ya confuso.
2. **Given** el dispositivo no está enviando datos (sin conexión, recién encendido), **When** la persona intenta iniciar la prueba, **Then** el sistema lo indica claramente antes de intentar ejecutar la tara, y ofrece reintentar en vez de quedarse cargando indefinidamente.

---

### User Story 3 - Alternativa manual si la prueba no es viable en este momento (Priority: P3)

La persona está registrándose pero el dispositivo físico no está a mano en ese momento (por ejemplo, lo va a instalar más tarde), o la prueba automática falla repetidamente. Necesita poder completar igual el registro sin quedar bloqueada por un paso que depende de tener el hardware presente y conectado ahí mismo.

**Why this priority**: Evita que este cambio, pensado para mejorar la experiencia, termine siendo un bloqueo nuevo para quien no puede hacer la prueba física en el momento exacto del registro — prioridad más baja porque es el camino de excepción, no el flujo esperado.

**Independent Test**: Elegir explícitamente no hacer la prueba automática (o agotar los reintentos) y confirmar que la persona puede completar la vinculación ingresando el peso del plato manualmente, igual que el comportamiento de hoy (sin tara aplicada — ver Assumptions sobre qué implica elegir este camino).

**Acceptance Scenarios**:

1. **Given** la persona no puede o no quiere hacer la prueba automática ahora, **When** elige la alternativa manual, **Then** puede ingresar el peso del plato escribiéndolo, y el registro continúa con normalidad, sin que el sistema intente ejecutar ninguna tara.

---

### Edge Cases

- ¿Qué pasa si la persona coloca comida o agua en el plato en vez de dejarlo vacío antes de la tara? El dispositivo quedaría tarado con ese contenido incluido como si fuera parte del "cero" — el sistema debe insistir explícitamente en el propio texto de la prueba en que el plato debe estar vacío, ya que no hay forma de que el sistema distinga por sí solo un plato vacío de uno con algo liviano encima.
- ¿Qué pasa si la lectura de confirmación después de la tara no da ~0 pero tampoco es un valor absurdo (ej. queda en 15g en vez de 0g)? Se trata igual como prueba no exitosa (Edge Case ya cubierto por User Story 2) — el umbral de "suficientemente cerca de cero" es un detalle a definir en la planificación técnica, no en este spec de negocio.
- ¿Qué pasa si la persona ya vinculó su dispositivo antes y quiere recalibrar el plato después (ej. cambió de plato)? Fuera de alcance de este pedido (que es sobre el momento de vincular el dispositivo durante el registro) — recalibrar un dispositivo ya en uso es un caso más delicado (mueve el cero de un dispositivo con historial de lecturas ya acumulado) y se evalúa aparte, no de paso acá.
- ¿Qué pasa si la persona tiene más de un dispositivo y repite este paso para el segundo? Cada dispositivo tiene su propia tara independiente — la prueba se repite igual para cada uno, sin relación entre ellos.
- ¿Qué pasa si esta prueba se dispara por error sobre un dispositivo que ya está vinculado y en uso, con lecturas históricas acumuladas? No debe poder pasar en el flujo normal (la prueba vive en el paso de vinculación de un dispositivo nuevo) — pero si llegara a ocurrir, movería el punto cero de ese dispositivo a mitad de su historial, haciendo que las lecturas de antes y después de ese momento dejen de ser comparables entre sí. Este spec asume que la prueba solo corre en una vinculación real de primera vez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al llegar al paso de vincular un dispositivo durante el registro, el sistema DEBE ofrecer una prueba guiada de tara del plato, en vez de exigir que la persona escriba el peso a mano como único camino.
- **FR-002**: La prueba DEBE seguir esta secuencia, en este orden, sin saltarse pasos: (1) confirmar que el dispositivo está conectado, (2) pedir que se coloque el plato vacío, (3) ejecutar la tara, (4) confirmar con una lectura nueva que el dispositivo quedó en cero con el plato puesto.
- **FR-003**: La prueba DEBE tomar solo unos segundos (no debe sentirse como una espera larga) y cada paso de la secuencia DEBE mostrarse claramente — la persona nunca debe quedar sin saber en qué parte de la secuencia está.
- **FR-004**: El sistema DEBE verificar, después de ejecutar la tara, que una lectura nueva efectivamente da ~0 antes de dar la prueba por exitosa — ejecutar la tara sin confirmar el resultado no es suficiente.
- **FR-005**: Si la confirmación de cero no llega o no es válida (dispositivo sin conexión, plato mal puesto, tara no efectiva), el sistema DEBE permitir repetir la secuencia completa desde "colocar el plato", sin perder el resto de lo ya completado en el paso de vinculación.
- **FR-006**: Una vez confirmada la tara (dispositivo en cero con el plato puesto), las lecturas futuras de ese dispositivo DEBEN representar directamente el contenido del plato (comida o agua) — sin que el sistema necesite restar ningún valor guardado aparte para obtener ese dato.
- **FR-007**: La prueba DEBE estar disponible tanto para dispositivos de comida como de agua — la secuencia es la misma sin importar cuál de los dos se esté vinculando.
- **FR-008**: Si la persona no puede completar la prueba automática en este momento (dispositivo no disponible, prueba falla repetidamente), el sistema DEBE ofrecer ingresar el peso del plato manualmente como alternativa, para no bloquear el registro — sabiendo que ese camino no aplica la tara y por lo tanto sigue necesitando restar el peso del plato en el cálculo del contenido, como ya ocurre hoy.
- **FR-009**: La tara ejecutada por esta prueba DEBE quedar como el nuevo punto de referencia permanente del dispositivo — a diferencia de una simple lectura, este paso SÍ cambia de forma duradera cómo el dispositivo mide de ahí en adelante, y por eso solo debe ejecutarse en una vinculación real de dispositivo nuevo, nunca disparada por accidente sobre un dispositivo que ya esté en uso.

### Key Entities

- **Plato**: el recipiente auxiliar que va sobre el dispositivo Kittypau, donde se sirve comida o agua. Hoy su peso se guarda como un número aparte que se resta en el cálculo del contenido; con esta prueba, el propio dispositivo queda calibrado para que sus lecturas YA sean el contenido, sin necesitar ese número.
- **Prueba de calibración (tara)**: la secuencia guiada de ~5 segundos que ejecuta y confirma la tara. No es una entidad persistida en sí misma — lo que persiste es el nuevo punto cero del dispositivo (a nivel de hardware) y el hecho de que ese dispositivo quedó calibrado por esta vía (en vez de por el camino manual).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona con el dispositivo físico a mano completa la secuencia de tara (conexión → plato → tara → confirmación) en menos de 15 segundos desde que la inicia hasta ver la confirmación, sin necesitar ayuda externa ni instrucciones fuera de lo que la propia prueba muestra.
- **SC-002**: Tras una calibración exitosa, una lectura del dispositivo con el plato puesto (sin nada más) da un valor cercano a cero, dentro del margen de precisión normal del sensor.
- **SC-003**: Ninguna persona queda bloqueada en el paso de vinculación de dispositivo por no poder completar la prueba automática — siempre hay un camino para continuar (repetir o ingresar a mano).
- **SC-004**: Ningún dispositivo ya vinculado y en uso sufre un cambio de punto cero por esta prueba — solo se ejecuta en la vinculación real de un dispositivo nuevo.
- **SC-005**: La cantidad de dispositivos vinculados con una calibración de plato manifiestamente errónea (ej. contenidos negativos o absurdos en el uso normal) baja respecto al método de ingreso manual actual.

## Assumptions

- La prueba automática (tara) es el camino **por defecto y recomendado**, pero el ingreso manual del peso se mantiene disponible como alternativa (User Story 3) para quien no pueda usarla en el momento — ese camino manual sigue funcionando como hoy (resta de un peso guardado), no aplica tara.
- "Confirmar que dio ~0" usa el mismo criterio de precisión que el dispositivo ya aplica para distinguir una lectura real de ruido del sensor — no se inventa un umbral nuevo.
- Esta prueba se limita a la secuencia de tara en el momento de vincular un dispositivo nuevo (lo pedido explícitamente). Recalibrar el plato de un dispositivo ya vinculado y en uso, o construir una serie más amplia de pruebas de vinculación (batería/wifi/sensor, etc.), quedan fuera de alcance — no se encontró nada parecido ya construido más allá del mecanismo de tara en sí (que existe hoy como botón manual de mantenimiento en la configuración de un dispositivo ya vinculado, sin la guía paso a paso que este pedido agrega).
- La tara que ejecuta esta prueba es el mismo mecanismo de tara del dispositivo que ya existe para otros usos (ajuste manual post-vinculación) — este pedido lo reutiliza con una secuencia guiada nueva alrededor, no inventa un mecanismo de calibración distinto. Por tratarse del mismo mecanismo real (no una simulación), sus efectos son igual de permanentes que los que ya tiene hoy ese botón manual.
