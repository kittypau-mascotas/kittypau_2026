# Feature Specification: Motor de Alimentación en Producción (Investigacion_v2)

**Feature Branch**: `007-motor-alimentacion-produccion`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Reemplazar toda la matemática de clasificación de la Hunger Bar de
Alimentación (KPCL0034) en kittypau_app por el modelo validado en Investigacion/Investigacion_v2
(segmentación por tolerancia de pausa + agrupamiento no supervisado + refinamiento por umbral
calibrado), alojado en una carpeta nueva y dedicada, conectado primero a la app en local — no a
producción todavía. Reemplaza la dirección anterior (portar el Evidence Engine de 102 features).
Clasificación provisoria mientras se confirma un evento (~3 min), definitiva después. Reentrenable
periódicamente con un freno de calidad (nunca se despliega una recalibración peor que la vigente).
KPCL0035 (bebedero) queda fuera de alcance."

> **Decisión que reemplaza un spec anterior**: en `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md`
> §1.1 se había dejado pendiente portar el Evidence Engine (`shape_features_v2.py`, 102 features +
> `comp_stats_v2.json`, 80% accuracy validada) como camino "v2" de la Hunger Bar. Mauro decidió
> (2026-08-30) usar en su lugar el modelo de `Investigacion/Investigacion_v2`, hecho desde cero y
> ya validado por solapamiento de tiempo contra las mismas anotaciones reales de KPCL0034. Esta
> spec reemplaza esa dirección — el port del Evidence Engine no se retoma.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver clasificación confiable de alimentación en /today (Priority: P1)

Mauro (o cualquier dueño) abre `/today` y ve el estado de la Alimentación de su mascota
(KPCL0034) clasificado con el modelo ya validado en la investigación, no con las reglas simples
actuales. Cuando un evento recién terminó y todavía no se confirmó del todo, lo ve marcado como
"provisorio"; unos minutos después, sin que tenga que hacer nada, pasa a ser la clasificación
definitiva.

**Why this priority**: Es el cambio central pedido — sin esto no hay feature. Todo lo demás
(gráfico, barra de Comida) depende de que esta clasificación exista y sea correcta.

**Independent Test**: Con datos reales de Bandida (KPCL0034) corriendo en local, provocar un
evento de alimentación real y verificar que la card de Alimentación en `/today` primero muestra
un estado provisorio y, pasados ~3 minutos, la clasificación definitiva coincide con el resultado
ya validado en la investigación.

**Acceptance Scenarios**:

1. **Given** el peso de KPCL0034 baja de forma sostenida y luego se estabiliza, **When** pasan
   ~3 minutos de estabilidad, **Then** el sistema clasifica el evento (alimentación / servido /
   ruido) usando el modelo validado en `Investigacion/Investigacion_v2`, no las reglas de
   magnitud/dirección/duración usadas hasta ahora.
2. **Given** un evento recién detectado que todavía no completó la ventana de confirmación,
   **When** el usuario abre `/today`, **Then** ve una clasificación marcada visualmente como
   "provisoria", distinguible de una ya confirmada.
3. **Given** una clasificación provisoria ya mostrada, **When** se cumple la ventana de
   confirmación, **Then** la UI pasa a la clasificación definitiva sin que el usuario recargue
   nada manualmente (se actualiza en la próxima consulta/refresco normal de la página).

---

### User Story 2 - Distinguir alimentación real de plato servido en el gráfico (Priority: P2)

En el gráfico de Alimentación de `/today`, el dueño ve claramente separados los eventos de
"comió de verdad" de los eventos de "le sirvieron comida al plato" — hoy el gráfico no distingue
entre ambos.

**Why this priority**: Es la confusión concreta que la investigación ya resolvió (servido vs.
ruido vs. alimentación); no llevarla al gráfico deja el 90% del trabajo de clasificación sin uso
visible para el dueño.

**Independent Test**: Con un rango de fechas que contenga al menos un evento de alimentación y
uno de servido ya confirmados, verificar que el gráfico los dibuja con íconos distintos y que el
tooltip de cualquier punto muestra la información de ambos tipos de evento en ese rango.

**Acceptance Scenarios**:

1. **Given** el gráfico de Alimentación de `/today` con eventos de alimentación y de servido en
   el rango visible, **When** se renderiza, **Then** los eventos de alimentación usan el ícono
   del plato y los de servido usan un ícono distinto.
2. **Given** el usuario pasa el cursor sobre un punto del gráfico, **When** hace hover, **Then**
   ve tanto la info de alimentación como la de servido correspondiente a ese rango de tiempo,
   no solo una de las dos.

---

### User Story 3 - Barra de "Comida" y próxima comida estimada con el modelo validado (Priority: P3)

El widget de barra de "Comida" (porcentaje + "Próxima comida estimada") calcula sus valores a
partir de los eventos que el modelo validado clasificó como alimentación, no de las reglas
simples actuales.

**Why this priority**: Depende directamente de la Historia 1 (la clasificación) — es
consecuencia, no un cambio independiente de cálculo.

**Independent Test**: Con el mismo historial de eventos ya usado para verificar la Historia 1,
confirmar que el porcentaje mostrado y la fecha de "próxima comida estimada" son consistentes con
los eventos de alimentación confirmados (no con eventos de servido ni ruido).

**Acceptance Scenarios**:

1. **Given** el widget de barra de Comida, **When** se recalcula el estado, **Then** el
   porcentaje y "Próxima comida estimada" reflejan únicamente eventos de alimentación
   confirmados por el modelo.

---

### Edge Cases

- Evento que todavía no cumplió los ~3 minutos de confirmación y el usuario recarga la página
  varias veces dentro de esa ventana: debe seguir mostrando el mismo estado provisorio de forma
  consistente, sin parpadear entre valores distintos.
- KPCL0035 (bebedero): su comportamiento actual no debe cambiar en absoluto con esta entrega —
  no tiene ninguna anotación real que valide este modelo ahí.
- Mascota recién vinculada o sin historial suficiente: se mantiene el mismo comportamiento de
  fallback ya documentado hoy (estado "Aprendiendo hábitos" / "sin_datos"), no se rompe por
  este cambio.
- Recalibración periódica (fase futura, ver FR-010): si el resultado recalibrado es peor que el
  vigente contra las anotaciones reales, nunca se despliega — el usuario no debe ver nunca una
  clasificación que empeoró sin que quede registrado.
- Dispositivo offline / sin lecturas nuevas: mismo comportamiento ya documentado hoy (la barra
  no se pausa mientras haya al menos una comida histórica dentro de la ventana ya usada).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE clasificar cada evento de peso del comedero KPCL0034 en
  alimentación, servido o ruido usando el modelo validado en `Investigacion/Investigacion_v2`
  (segmentación por tolerancia de pausa + agrupamiento no supervisado + refinamiento por umbral
  calibrado contra datos reales), reemplazando la clasificación por reglas simples de
  magnitud/dirección/duración usada hasta ahora.
- **FR-002**: El sistema DEBE mostrar una clasificación **provisoria** para todo evento que
  todavía no completó su ventana de confirmación (~3 minutos de estabilidad posterior),
  visualmente diferenciada de una clasificación **definitiva**.
- **FR-003**: El sistema DEBE reemplazar automáticamente la clasificación provisoria por la
  definitiva una vez cumplida la ventana de confirmación, sin requerir ninguna acción del
  usuario.
- **FR-004**: La card de estado de Alimentación en `/today` DEBE reflejar el estado (estable,
  atrasada, etc.), el nivel de evidencia y la última comida confirmada según la clasificación de
  este modelo.
- **FR-005**: El gráfico de Alimentación de `/today` DEBE representar únicamente los eventos
  clasificados como alimentación con el ícono/serie del plato, y los eventos clasificados como
  servido con un ícono visualmente distinto — nunca mezclados en la misma serie.
- **FR-006**: Al pasar el cursor sobre cualquier punto del gráfico de Alimentación, el sistema
  DEBE mostrar tanto la información de alimentación como la de servido correspondiente a ese
  rango de tiempo.
- **FR-007**: El widget de barra de "Comida" DEBE calcular el porcentaje y la próxima comida
  estimada a partir de los eventos de alimentación confirmados por este modelo.
- **FR-008**: El sistema NO DEBE aplicar este modelo al dispositivo KPCL0035 (bebedero) ni a
  ningún dispositivo de hidratación — su comportamiento actual queda sin cambios.
- **FR-009**: El sistema DEBE mantener el mismo comportamiento de fallback ya existente cuando no
  hay historial suficiente para una mascota.
- **FR-010**: El sistema DEBE permitir recalibrar periódicamente el modelo con datos nuevos, pero
  solo reemplazar el modelo vigente cuando el resultado recalibrado iguale o supere su precisión
  medida contra las anotaciones reales; si empeora, se descarta automáticamente sin intervención
  humana. *(Capacidad requerida por el spec; no es condición de aceptación de la primera entrega
  — ver Assumptions.)*
- **FR-011**: Esta entrega DEBE poder verificarse completamente ejecutando la aplicación en un
  entorno local, sin requerir cambios al entorno de producción (base de datos ni despliegue) para
  su validación inicial.

### Key Entities *(include if feature involves data)*

- **Evento de peso (candidato)**: un segmento de tiempo del comedero con una categoría
  (alimentación / servido / ruido), un estado de confirmación (provisorio / definitivo), peso
  inicial y final, y marcas de tiempo de inicio y fin.
- **Modelo de clasificación vigente**: la calibración actualmente en uso para categorizar eventos
  nuevos, con una versión/fecha y sus métricas de precisión de referencia (cobertura por
  categoría, pureza de agrupamiento) medidas contra anotaciones reales.
- **Intento de recalibración** *(fase futura, FR-010)*: cada recálculo periódico del modelo, con
  sus métricas resultantes y si fue promovido a vigente o descartado por no mejorar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los eventos reales de alimentación de KPCL0034 se identifican correctamente en al
  menos el mismo porcentaje ya validado en la investigación (100% de cobertura medida contra
  anotaciones reales).
- **SC-002**: Los eventos reales de servido no se confunden con alimentación en al menos el 75%
  de los casos (pureza ya medida en la investigación para ese grupo).
- **SC-003**: En el gráfico de Alimentación, un evento de servido nunca se muestra igual que uno
  de alimentación — son visualmente distinguibles en el 100% de los casos mostrados.
- **SC-004**: Toda clasificación mostrada pasa de provisoria a definitiva dentro de los 3-4
  minutos posteriores a que el evento terminó.
- **SC-005**: El comportamiento observable del bebedero (KPCL0035) no cambia en ningún aspecto
  perceptible para el usuario tras esta entrega.

## Assumptions

- "En local" significa ejecutar la aplicación con su servidor de desarrollo habitual y verificar
  el resultado de forma manual/visual — el despliegue a producción real (infraestructura, base de
  datos online) queda fuera de alcance de esta entrega y se decide después de validar en local.
- El modelo de referencia es el descrito y ya validado en `Investigacion/Investigacion_v2`
  (segmentación por tolerancia de pausa + agrupamiento no supervisado + refinamiento por umbral
  calibrado contra anotaciones reales) — no el motor anterior basado en 102 features
  (`shape_features_v2.py`), cuyo port queda descartado por esta decisión.
- KPCL0034 sigue siendo el único dispositivo con anotaciones reales suficientes para validar esta
  clasificación; KPCL0035 quedó explícitamente fuera de alcance por no tener ninguna anotación
  real que confirme que el modelo funciona ahí.
- La recalibración periódica con freno de calidad (FR-010) se documenta como capacidad requerida
  del sistema a futuro, pero no es condición de aceptación de esta primera entrega, centrada en
  clasificar en local con el modelo ya calibrado hoy.
- Se reutiliza el mismo origen de datos de peso que ya usa la aplicación — no se requiere una
  fuente de datos nueva ni cambiar cómo llegan las lecturas.
- El panel "Barras Sims" de `/today` no recibe cards ni métricas nuevas por esta entrega — el
  cambio reemplaza el cálculo interno de lo que ya existe ahí, no agrega widgets.
