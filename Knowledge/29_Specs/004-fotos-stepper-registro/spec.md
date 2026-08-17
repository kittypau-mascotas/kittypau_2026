# Feature Specification: Fotos en el Stepper de Registro

**Feature Branch**: `004-fotos-stepper-registro`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "1- en register flow, cuando completas el primer punto de usuario, al momento de seleccionar un perfil, y terminar ese punto, al pasar a mascotas, el 1 en circulo de usuario se transformara en la foto de perfil que elegiste. 2- lo mismo ocurrira cuando terminemos en mascota, se vera en el circulo de la barra de progreso la foto de la mascota."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el avatar propio al completar el paso de Usuario (Priority: P1)

Una persona está registrándose en Kittypau. En el primer paso ("Usuario") elige uno de los avatares disponibles y completa su nombre y el de su mascota. Al continuar al segundo paso ("Mascota"), el círculo del paso 1 en la barra de progreso —que hasta ahora mostraba un número o un check genérico— muestra el avatar que eligió.

**Why this priority**: Es el primero de los 2 pasos del pedido y el que se ve inmediatamente al avanzar — confirma visualmente "esto es lo que elegiste" apenas se completa, sin necesidad de haber tocado nada del paso 2 todavía.

**Independent Test**: Completar el paso 1 del registro eligiendo un avatar específico, avanzar al paso 2, y verificar que el círculo del paso 1 en la barra de progreso muestra ese avatar (no un número ni un check).

**Acceptance Scenarios**:

1. **Given** la persona está en el paso 1 del registro con la barra de progreso visible, **When** elige un avatar y completa el paso (avanza al paso 2), **Then** el círculo del paso 1 en la barra de progreso muestra el avatar elegido.
2. **Given** la persona ya avanzó al paso 2, **When** vuelve a mirar la barra de progreso, **Then** el círculo del paso 1 sigue mostrando su avatar (no vuelve a mostrar el número ni el check).

---

### User Story 2 - Ver la foto de la mascota al completar el paso de Mascota (Priority: P2)

La misma persona, ya en el paso 2 ("Mascota"), sube o toma una foto de su mascota (o deja el placeholder si no sube ninguna) y completa el paso. Al avanzar al paso 3, el círculo del paso 2 en la barra de progreso muestra la foto de la mascota en vez del check genérico.

**Why this priority**: Depende de completar el paso 2, que ocurre después del paso 1 — mismo tipo de mejora, aplicada al siguiente paso de la barra.

**Independent Test**: Completar el paso 2 subiendo una foto de mascota específica, avanzar al paso 3, y verificar que el círculo del paso 2 en la barra de progreso muestra esa foto.

**Acceptance Scenarios**:

1. **Given** la persona está en el paso 2 con una foto de mascota ya seleccionada, **When** completa el paso (avanza al paso 3), **Then** el círculo del paso 2 en la barra de progreso muestra la foto de la mascota.
2. **Given** la persona completó el paso 2 sin subir ninguna foto de mascota, **When** avanza al paso 3, **Then** el círculo del paso 2 muestra el check genérico (comportamiento actual) en vez de un espacio vacío o roto — no hay foto que mostrar.

---

### Edge Cases

- ¿Qué pasa si la persona vuelve hacia atrás a un paso ya completado (usando la barra de progreso) y cambia el avatar o la foto de mascota? El círculo correspondiente debe actualizarse con la elección nueva, no quedar pegado a la anterior.
- ¿Qué pasa si el paso tiene un error activo (hoy se muestra "⚠")? El aviso de error sigue teniendo prioridad sobre la foto — un paso con error no debe mostrar la foto como si estuviera todo bien.
- ¿Qué pasa con el paso 3 (marca Kittypau), que hoy muestra el logo de la app en vez de un número? Ese paso no tiene una foto elegida por la persona asociada — se mantiene sin cambios (fuera de alcance de este pedido, que habla solo de Usuario y Mascota).
- ¿Qué pasa si la imagen (avatar o foto de mascota) tarda en cargar o falla al cargar? El círculo no debe quedar roto o vacío — ver Assumptions para el comportamiento de respaldo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al completarse el paso 1 (Usuario) del registro, el círculo correspondiente en la barra de progreso DEBE mostrar el avatar que la persona eligió en ese paso, en vez del check genérico que se muestra hoy.
- **FR-002**: Al completarse el paso 2 (Mascota) del registro, el círculo correspondiente en la barra de progreso DEBE mostrar la foto de la mascota que la persona seleccionó en ese paso, en vez del check genérico.
- **FR-003**: Si el paso 2 se completa sin que la persona haya seleccionado ninguna foto de mascota, el círculo DEBE seguir mostrando el check genérico (comportamiento actual) — no debe mostrar un ícono roto ni un espacio vacío.
- **FR-004**: El aviso de error de un paso (ícono de advertencia) DEBE seguir teniendo prioridad visual sobre la foto — un paso con error activo muestra el aviso, no la foto, incluso si ya había una foto elegida antes del error.
- **FR-005**: El paso 3 (marca Kittypau) NO cambia de comportamiento — sigue mostrando el logo de la app como hasta ahora.
- **FR-006**: Si la persona cambia el avatar o la foto de mascota después de haber completado el paso correspondiente (por ejemplo, volviendo atrás con la barra de progreso), el círculo DEBE reflejar la elección más reciente.

### Key Entities

- **Avatar de usuario**: la imagen que la persona elige entre las opciones predefinidas en el paso 1 — ya existe como concepto, se guarda como la foto de perfil de la cuenta.
- **Foto de mascota**: la imagen que la persona sube o toma en el paso 2 — ya existe como concepto (ver spec 003, que ya cubrió que esta foto se reduce de tamaño automáticamente antes de guardarse).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al completar el paso 1, el 100% de las veces el círculo del paso 1 muestra el avatar elegido, no un número ni un check, mientras el paso permanezca completado.
- **SC-002**: Al completar el paso 2 con una foto de mascota seleccionada, el 100% de las veces el círculo del paso 2 muestra esa foto.
- **SC-003**: Ningún caso borde (paso completado sin foto, paso con error, paso 3) produce un círculo roto o vacío — siempre hay algo coherente mostrándose (foto, check, aviso, o logo, según corresponda).
- **SC-004**: Una persona que vuelve a mirar la barra de progreso reconoce de un vistazo, sin leer texto, que el paso 1 y el paso 2 corresponden a "su" cuenta y "su" mascota gracias a ver las fotos elegidas.

## Assumptions

- Si la imagen (avatar o foto de mascota) no carga por algún motivo (red lenta, URL rota), el círculo cae de vuelta al check genérico en vez de mostrar un ícono de imagen rota — mismo tipo de respaldo silencioso que ya usan otros lugares de la app con fotos opcionales.
- El tamaño del círculo del stepper es pequeño (mismo contenedor circular que ya usa el logo de Kittypau en el paso 3 hoy) — la foto se recorta/ajusta a ese círculo sin necesitar controles nuevos de encuadre; no se pide una vista previa grande.
- Este pedido es puramente visual/de progreso — no cambia qué datos se guardan, cuándo se guardan, ni la validación de ningún paso del registro.
