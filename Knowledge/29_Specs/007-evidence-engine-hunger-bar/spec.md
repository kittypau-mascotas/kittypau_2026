# Feature Specification: Motor de Evidencia Real en la Barra de Hambre

**Feature Branch**: `007-evidence-engine-hunger-bar`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Portar el Evidence Engine real (Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py) a kittypau_app/src/lib/hunger-bar.ts, reemplazando las reglas simples de v1 (magnitud/dirección/duración) por la clasificación calibrada alimentacion/servido/ruido que ya funciona en Investigacion contra 417+ anotaciones reales de KPCL0034. Decisión de alcance ya tomada por Mauro (2026-08-28): 100% foco en Comida — es lo único con datos reales suficientes en Investigacion. Agua queda fuera de este spec."

## Contexto (verificado en esta sesión, no supuesto)

La Barra de Hambre de `/today` y `/pet` hoy corre una versión simplificada ("v1", reglas de
magnitud/dirección/duración) documentada en `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md`
como un "stand-in" temporal del motor real. Ese motor real (Evidence Engine,
`Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py`) ya existe, está calibrado
contra 527 anotaciones reales de comidas de Bandida (KPCL0034), y acierta **80% fuera de
muestra** — muy por encima de las reglas simples de v1, que nunca fueron medidas contra ese
mismo estándar. El objetivo de este spec es que la app deje de usar el stand-in y use el
motor real, calibrado, con la misma precisión ya validada en investigación.

Decisión de alcance explícita (Mauro, 2026-08-28): **solo Comida**. Hidratación no tiene un
pipeline de investigación ni anotaciones equivalentes todavía, así que no se le aplica este
mismo trabajo — queda fuera de este spec por completo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La Barra de Hambre detecta comidas reales con la precisión ya validada (Priority: P1)

Mauro (o cualquier dueño de mascota con un comedero Kittypau) mira `/today` o `/pet` después
de que su mascota come. La Barra de Hambre debe reconocer ese evento como una comida real
—no como ruido (la mascota olfateando o pisando el plato) ni como un simple llenado del
plato— con la misma tasa de acierto que ya se demostró en la investigación real del
proyecto, no con una aproximación más simple y sin validar.

**Why this priority**: Es el problema de fondo que dio origen a este spec — la app hoy usa
una versión deliberadamente simplificada, documentada como pendiente de reemplazo desde que
se implementó la v1.

**Independent Test**: Sobre un conjunto de segmentos de peso ya anotados manualmente como
"alimentación real" (los mismos usados para calibrar el motor en investigación), la
clasificación que corre en producción debe coincidir con la anotación humana en una
proporción igual o muy cercana a la ya medida en investigación (80% fuera de muestra).

**Acceptance Scenarios**:

1. **Given** un segmento de peso que en investigación fue anotado como "alimentación real",
   **When** la app lo procesa a través de la Barra de Hambre, **Then** lo clasifica como
   alimentación con la misma confianza relativa que el motor de investigación.
2. **Given** un segmento que en investigación fue anotado como "ruido" (la mascota tocando
   el plato sin comer), **When** la app lo procesa, **Then** no lo confunde con una comida
   real — mismo comportamiento que ya demuestra el motor de investigación.
3. **Given** un segmento anotado como "servido" (alguien llenando el plato), **When** la app
   lo procesa, **Then** lo distingue de una comida real y no dispara una falsa detección de
   alimentación.

---

### User Story 2 - La confianza de la detección queda visible, no es una caja negra (Priority: P2)

Cuando la Barra de Hambre confirma una comida, la persona puede entender (aunque sea de
forma resumida) que la detección tiene respaldo real — no es una regla arbitraria. Esto ya
es parte de lo que el motor de investigación entrega (una razón textual + nivel de
confianza) y no debería perderse al pasar a producción.

**Why this priority**: Refuerza la confianza en el dato mostrado — importante para el
producto, pero secundario frente a que la detección en sí sea correcta (US1).

**Independent Test**: Al confirmar una comida real, la respuesta de la Barra de Hambre
incluye un nivel de confianza numérico, consistente con el que entrega el motor de
investigación para el mismo segmento.

**Acceptance Scenarios**:

1. **Given** una comida real detectada, **When** se consulta el estado de la Barra de
   Hambre, **Then** el nivel de confianza reportado es coherente con el que el motor de
   investigación calcularía para ese mismo segmento de datos.

---

### User Story 3 - El comportamiento actual no se rompe mientras se reemplaza el motor (Priority: P3)

Mientras se hace este cambio, la Barra de Hambre sigue funcionando para el resto de su
comportamiento ya existente (decaimiento de 100% a 0% entre comidas, alerta de "atrasada",
aprendizaje de hábitos con pocas muestras) — el reemplazo es específicamente de "cómo se
decide si algo fue una comida real", no de toda la función.

**Why this priority**: Evita que el cambio, pensado para mejorar la precisión, termine
degradando una funcionalidad que ya funciona bien hoy.

**Independent Test**: Con el nuevo motor activo, el resto del comportamiento documentado de
la Barra de Hambre (porcentaje, umbral de alerta, modo aprendizaje) sigue funcionando igual
que antes del cambio, para los mismos datos de entrada.

**Acceptance Scenarios**:

1. **Given** una secuencia de comidas ya detectadas correctamente, **When** se calcula el
   porcentaje de la Barra de Hambre entre dos comidas, **Then** el resultado sigue la misma
   fórmula ya validada (100% al comer, decayendo hacia 0% en el intervalo estimado).

---

### Edge Cases

- ¿Qué pasa si en el futuro se recalibra el motor de investigación con más anotaciones (el
  archivo de estadísticas cambia)? La app debería poder incorporar esa recalibración sin
  requerir un cambio de código aparte cada vez — al menos debe quedar documentado cómo se
  actualiza.
- ¿Qué pasa con un segmento de datos demasiado corto o con huecos (el comedero estuvo
  desconectado)? Debe degradar de forma segura (no alucinar una comida ni romper el cálculo
  general de la barra), igual que ya lo hace la v1 actual con `sampleSize`/`sin_datos`.
- ¿Qué pasa si el nuevo motor y el anterior (v1) discrepan sobre datos históricos ya
  mostrados a un usuario? Fuera de alcance recalcular histórico — el cambio aplica hacia
  adelante, sobre nuevas lecturas.
- Hidratación (Agua) explícitamente **fuera de alcance** — no tiene pipeline de
  investigación ni anotaciones equivalentes; no se le aplica este mismo reemplazo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La Barra de Hambre DEBE clasificar cada segmento de peso detectado como
  "alimentación real", "servido" o "ruido" usando el mismo criterio ya calibrado y validado
  en la investigación del proyecto (no una aproximación simplificada nueva ni distinta).
- **FR-002**: La clasificación en producción DEBE alcanzar, sobre los mismos datos de
  referencia ya anotados en investigación, una tasa de acierto equivalente a la ya medida
  ahí (80% fuera de muestra) — no una cifra inferior sin justificar.
- **FR-003**: Cuando se confirma una comida real, el sistema DEBE poder reportar un nivel de
  confianza asociado a esa detección, coherente con el que produce el motor de
  investigación para el mismo caso.
- **FR-004**: El resto del comportamiento ya validado de la Barra de Hambre (cálculo del
  porcentaje entre comidas, umbral de "comida atrasada", modo de aprendizaje con pocas
  muestras) DEBE seguir funcionando sin cambios de comportamiento.
- **FR-005**: El reemplazo aplica **únicamente** al pilar de Alimentación (comida) — el
  pilar de Hidratación (agua) queda fuera de este spec, sin cambios.
- **FR-006**: Debe quedar documentado el procedimiento para incorporar una recalibración
  futura del motor de investigación (cuando se sumen más anotaciones reales) sin que eso
  implique reescribir la lógica de clasificación desde cero.
- **FR-007**: Ante datos insuficientes o de baja calidad (comedero recién reconectado, sin
  historial suficiente), el sistema DEBE seguir mostrando el estado honesto "sin datos" en
  vez de forzar una clasificación con baja confianza.

### Key Entities

- **Segmento de peso**: una ventana de lecturas consecutivas del comedero (peso en gramos a
  lo largo del tiempo) sobre la que se decide si hubo alimentación, servido o ruido.
- **Perfil de referencia calibrado**: los parámetros estadísticos ya calculados en la
  investigación del proyecto (por categoría: alimentación / servido / ruido) que el
  clasificador usa para comparar cada segmento nuevo. Vive hoy en investigación, no en
  producción.
- **Predicción de comida**: el resultado de clasificar un segmento — categoría elegida,
  nivel de confianza, y la razón/evidencia que la respalda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre un split 80/20 fuera de muestra de los segmentos ya anotados manualmente en
  investigación (los pesos del clasificador se calculan solo con el 80%, se evalúa sobre el 20%
  nunca visto — misma metodología que el 80% ya medido en investigación, no accuracy "en la
  misma muestra usada para calibrar"), la clasificación coincide con la anotación humana en al
  menos el 75% de los casos. **Corrección post-implementación (2026-08-28)**: se verificó
  ejecutando el Python real que la accuracy *en la misma muestra* (sin split) da 71.5%, más baja
  que la fuera de muestra (77.0% con Python, 75.7% con el port TS, mismo dataset) — el 80%
  documentado en `Knowledge/11_ModelosIA/MODEL_EvidenceEngine.md` siempre fue fuera de muestra;
  el criterio de este SC-001 se ajustó para medir lo mismo, no una cifra in-sample más baja.
- **SC-002**: Ninguna comida real conocida (de los datos históricos de Bandida) deja de
  detectarse una vez migrado el motor, comparado contra lo que ya detectaba v1.
- **SC-003**: El comportamiento de decaimiento/alerta de la Barra de Hambre (ajeno a la
  clasificación en sí) se mantiene idéntico antes y después del cambio, verificado con los
  mismos casos de prueba ya existentes.
- **SC-004**: Actualizar el perfil de referencia calibrado (cuando investigación recalibre
  con más datos) no requiere más que reemplazar un archivo de datos — no reescribir lógica.

## Assumptions

- Alcance 100% acotado a Alimentación/Comida — Hidratación queda fuera por decisión
  explícita de Mauro (2026-08-28), documentada también en
  `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md`.
- El "perfil de referencia calibrado" y el método de clasificación que hoy vive en
  investigación (Python) son la fuente de verdad — este spec busca que producción reproduzca
  ese mismo criterio, no que invente uno nuevo ni que lo simplifique más de lo que ya está.
- La comparación con la investigación (SC-001) se hace contra los mismos datos ya anotados
  ahí — no se generan anotaciones nuevas como parte de este spec.
- No se evalúa como parte de este spec ningún cambio a la interfaz visual de la Barra de
  Hambre — el cambio es sobre la calidad de la detección subyacente, no sobre cómo se ve.
- Se asume que el entorno de producción de la app puede ejecutar el mismo tipo de cálculo
  matemático (estadística, geometría de curvas) que ya corre en investigación, sin depender
  de infraestructura adicional nueva (bases de datos extra, servicios externos).
