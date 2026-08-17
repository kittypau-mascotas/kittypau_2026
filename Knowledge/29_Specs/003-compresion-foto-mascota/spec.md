# Feature Specification: Compresión Automática de Foto de Mascota

**Feature Branch**: `003-compresion-foto-mascota`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "necesitamos revisar que funcione el boton de agregar foto en que sea de mas de 5 mb en agregar la foto de la mascota, o bajarle la calidad a la foto enviada o sacada para que pueda funcionar perfectamente eso."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir foto al editar una mascota existente (Priority: P1)

Un dueño de mascota ya registrado entra a la ficha de su mascota y usa "Cambiar foto" para subir una foto sacada con su celular. La foto pesa más de 5MB (caso común en celulares modernos, 12-48MP). Hoy la subida se rechaza de plano con un mensaje de error y la foto nunca se guarda.

**Why this priority**: Es el flujo reportado directamente como roto — el botón "Cambiar foto" no cumple su propósito para la mayoría de las fotos reales de celular. Es el punto de mayor fricción actual y el que motivó este pedido.

**Independent Test**: Seleccionar una foto de más de 5MB en el selector de archivo de la ficha de mascota y confirmar que la foto se sube y se guarda como foto de perfil, sin que el usuario tenga que reducir el archivo manualmente antes.

**Acceptance Scenarios**:

1. **Given** una mascota ya registrada sin foto, **When** el usuario selecciona una foto de 8MB desde su celular, **Then** la foto se sube exitosamente y queda visible como foto de perfil de la mascota.
2. **Given** una mascota con foto existente, **When** el usuario selecciona una foto nueva de más de 5MB para reemplazarla, **Then** la foto nueva reemplaza a la anterior sin error.

---

### User Story 2 - Subir foto durante el registro de una mascota nueva (Priority: P2)

Un usuario nuevo está completando el flujo de registro/onboarding y llega al paso de agregar la foto de su mascota (sacándola con la cámara o eligiéndola de la galería). La foto pesa más de 5MB. Hoy el sistema la rechaza antes de llegar al paso de recorte que ya existe en este flujo — el mecanismo que resolvería el problema nunca llega a usarse.

**Why this priority**: Mismo problema que la Historia 1, pero en el flujo de alta de una mascota nueva — impacta la primera impresión del producto, aunque ocurre con menos frecuencia que editar una mascota ya creada.

**Independent Test**: Durante el registro, seleccionar/tomar una foto de más de 5MB en el paso de foto de mascota y confirmar que el flujo permite continuar con esa foto (recortarla/confirmarla y avanzar), en vez de bloquear con un error de tamaño.

**Acceptance Scenarios**:

1. **Given** el usuario está en el paso de foto de mascota del registro, **When** toma o selecciona una foto de 10MB, **Then** el sistema la acepta, permite recortarla/confirmarla como hoy, y el registro continúa sin error de tamaño.

---

### User Story 3 - Comportamiento consistente y mensaje claro si igual falla (Priority: P3)

Un usuario sube una foto extremadamente grande o en un formato que el navegador no puede procesar. El sistema debe comportarse igual sin importar si está en la ficha de mascota o en el registro, y si de verdad no puede procesar la foto, debe decir por qué en vez de repetir el mismo mensaje genérico de "más de 5MB".

**Why this priority**: Cierra el caso borde y evita que la inconsistencia actual entre los dos flujos (uno comprime, el otro no) se perciba como un bug distinto en cada pantalla.

**Independent Test**: Repetir el mismo archivo de prueba (foto grande, foto en formato no soportado) en ambos flujos y confirmar que el resultado y el mensaje mostrado son equivalentes.

**Acceptance Scenarios**:

1. **Given** una foto que sigue superando el límite de subida incluso después de reducirse automáticamente, **When** el usuario intenta subirla, **Then** el sistema muestra un mensaje que explica que la foto no se pudo procesar (no el mensaje genérico de "no puede pesar más de 5MB" sobre un archivo que sí se intentó reducir).
2. **Given** el mismo archivo de foto grande, **When** se sube desde la ficha de mascota y, por separado, desde el registro, **Then** ambos flujos lo aceptan (o ambos lo rechazan con el mismo motivo) — no hay un flujo más permisivo que el otro.

---

### Edge Cases

- ¿Qué pasa si la foto original es extremadamente grande (ej. 50MB+, una foto de cámara profesional)? El sistema debe poder reducirla igual, sin que el navegador se cuelgue o tarde de forma inaceptable.
- ¿Qué pasa si el formato de la foto no se puede procesar en el navegador del usuario (ej. algunos formatos propietarios de cámara)? El usuario debe recibir un mensaje claro indicando que pruebe con otro archivo/formato, no un error técnico crudo.
- ¿Qué pasa si el usuario cancela la selección o pierde conexión mientras la foto se está reduciendo/subiendo? No debe quedar la mascota en un estado a medio guardar ni con una foto corrupta.
- ¿Qué pasa si, tras reducir la foto automáticamente, el resultado igual supera el límite (caso raro, ej. imagen con detalle muy alto)? Debe mostrarse un mensaje accionable, no un rechazo silencioso repetido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE aceptar fotos de más de 5MB reduciendo automáticamente su tamaño antes de subirlas, en vez de rechazarlas por pesar demasiado.
- **FR-002**: La reducción automática DEBE aplicarse tanto al subir/cambiar la foto de una mascota ya registrada como al subir la foto durante el registro de una mascota nueva — mismo comportamiento en los dos lugares.
- **FR-003**: La foto reducida DEBE conservar calidad visual suficiente para servir como foto de perfil reconocible de la mascota (no debe quedar pixelada o irreconocible tras la reducción).
- **FR-004**: La reducción de tamaño DEBE ocurrir antes de iniciar la subida al servidor, para no hacer esperar al usuario una subida que terminaría rechazada.
- **FR-005**: Si, después de la reducción automática, el archivo sigue sin poder subirse (por tamaño extremo o formato no soportado), el sistema DEBE mostrar un mensaje claro que explique el motivo real, distinto del mensaje de "supera el límite de tamaño" que se usa hoy para el archivo original.
- **FR-006**: El usuario NO DEBE tener que editar, comprimir o convertir la foto manualmente fuera de la aplicación antes de subirla.
- **FR-007**: El sistema DEBE seguir aceptando sin cambios las fotos que ya están dentro del límite actual (no debe introducir una regresión para fotos que hoy funcionan bien).

### Key Entities

- **Foto de mascota**: la imagen asociada al perfil de una mascota. Se origina como un archivo elegido por el usuario (cámara o galería) y termina como la imagen de perfil guardada; en el medio puede pasar por un paso de reducción de tamaño/calidad.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una foto de celular típica de hasta 20MB se sube y queda guardada como foto de perfil sin que el usuario reciba un error de tamaño.
- **SC-002**: El 100% de las fotos que hoy se rechazan solo por pesar más de 5MB (pero que son formatos de imagen válidos) se aceptan tras la reducción automática.
- **SC-003**: El resultado final de la foto guardada es reconocible como la mascota fotografiada, verificado por inspección visual antes/después de la reducción.
- **SC-004**: El comportamiento y el mensaje de error (si corresponde) son idénticos al subir la misma foto desde la ficha de mascota y desde el registro.
- **SC-005**: El tiempo entre seleccionar la foto y verla confirmada como foto de perfil no aumenta de forma perceptible respecto al flujo actual para fotos que ya estaban dentro del límite.

## Assumptions

- La reducción de tamaño se hace en el dispositivo del usuario (no requiere procesamiento adicional en el servidor ni un servicio externo nuevo) — es una extensión de un mecanismo de recorte/compresión que ya existe hoy en el flujo de registro, aplicado de forma consistente en ambos lugares.
- El límite visible de "5MB" es sobre el archivo que finalmente se sube (ya reducido), no sobre la foto original que el usuario seleccionó — el usuario no necesita saber ni pensar en el peso del archivo original.
- La ficha de mascota (edición) no necesita agregar un paso interactivo de recorte manual si no lo tiene hoy — la reducción automática de tamaño/calidad es suficiente para resolver el problema reportado; agregar recorte manual ahí es una mejora aparte, fuera de alcance de este pedido.
- Formatos de imagen estándar de cámara/celular (JPEG, PNG, y los formatos que el selector de archivos ya acepta hoy) son el foco; formatos exóticos no soportados por el navegador quedan cubiertos por el mensaje de error de FR-005, no por soporte nuevo de decodificación.
- No hay un requisito de negocio de preservar la foto original sin comprimir en ningún lugar — solo se guarda la versión ya reducida.
