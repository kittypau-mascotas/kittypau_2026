# Feature Specification: Extracción de "Tablas y Vistas" en /admin (batch 4/N)

**Feature Branch**: `001-admin-tablas-vistas`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Continuar la extracción por componentes de
kittypau_app/src/app/(app)/admin/page.tsx — batch 4/N, sección 'Tablas y Vistas (Uso
Aproximado)', según Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md § A-C1."

**Fuente (constitución v1.1.0, obligatoria)**: `Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md`
§ "A-C1 — `/admin` monolito: extracción por componentes EN CURSO", leído completo antes de
este spec. Este documento no inventa contexto fuera de lo ya confirmado ahí.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tocar la sección sin cargar el archivo completo (Priority: P1)

Como sesión de desarrollo (humana o de agente) que necesita leer o modificar la sección
"Tablas y Vistas (Uso Aproximado)" de `/admin`, quiero que viva en su propio archivo
componente, para no tener que cargar las 3291 líneas completas de `admin/page.tsx` cuando
solo me importa esa sección — el mismo motivo por el que ya se hizo esto 3 veces antes
(`section-status-card.tsx`, `auditoria-card.tsx`/`infraestructura-card.tsx`,
`tests-admin-card.tsx`).

**Why this priority**: Es el objetivo explícito del batch — reducir costo de tokens de
sesiones futuras que tocan este archivo (razón original documentada en Knowledge al
priorizar A-C1 el 2026-08-12).

**Independent Test**: Abrir `admin/_components/tablas-vistas-card.tsx` de forma aislada y
confirmar que es autocontenido (recibe sus datos como props, no re-implementa fetch propio)
y que `admin/page.tsx` lo importa con un `import` simple, igual que los 3 componentes
anteriores.

**Acceptance Scenarios**:

1. **Given** `/admin` con la sección "Infraestructura" expandida (`infraExpanded=true`,
   mismo flag que ya gatea `infraestructura-card.tsx`), **When** se renderiza la página,
   **Then** la tabla "Tablas y Vistas (Uso Aproximado)" se ve idéntica a como se veía antes
   de la extracción.
2. **Given** el componente nuevo importado en `page.tsx`, **When** se corre `tsc --noEmit`,
   **Then** no hay errores de tipos nuevos (los props calzan con los `useMemo` ya calculados
   en `page.tsx`, mismo patrón que los 3 batches anteriores).

---

### User Story 2 - Cero regresión en el único panel de administración del negocio (Priority: P1)

Como dueño del producto, quiero que `/admin` siga funcionando exactamente igual después de
la extracción, porque es el único panel donde se ve el estado operativo, financiero y de
infraestructura real del negocio — no hay margen para que este refactor rompa algo que ya
funciona.

**Why this priority**: Mismo criterio de riesgo que ya aplicaron los 3 batches anteriores —
"mover JSX + pasar el memo ya calculado como prop" es deliberadamente el cambio de menor
riesgo posible (no se toca el fetch ni el cálculo, solo dónde vive el JSX).

**Independent Test**: Comparar el render de `/admin` antes y después del cambio con los
mismos datos reales — visualmente idéntico, sin diffs de comportamiento.

**Acceptance Scenarios**:

1. **Given** el estado compartido de `/admin` (`GET /api/admin/overview`, ~24 slices) sin
   cambios, **When** se aplica la extracción, **Then** ningún otro componente ya extraído
   (`section-status-card.tsx`, `auditoria-card.tsx`, `infraestructura-card.tsx`,
   `tests-admin-card.tsx`) cambia de comportamiento.

---

### Edge Cases

- ¿Qué pasa si `infraExpanded` es `false`? — la sección no se renderiza en absoluto, igual
  que hoy (comportamiento existente a preservar, no a rediseñar).
- ¿Qué pasa si la fuente de datos real de "Tablas y Vistas" no devuelve filas? — el
  comportamiento actual (sea cual sea) debe preservarse tal cual; no se investigó todavía
  qué maneja ese caso hoy (ver Assumptions — gap de conocimiento explícito).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La sección "Tablas y Vistas (Uso Aproximado)" MUST extraerse de
  `admin/page.tsx` a un componente propio en `admin/_components/`, siguiendo el mismo
  patrón ya usado en los 3 batches anteriores (JSX movido, datos ya calculados pasados como
  props — no "extraer fetch + estado propio").
- **FR-002**: El comportamiento visual y funcional de `/admin` MUST ser idéntico antes y
  después de la extracción — cero regresión.
- **FR-003**: El componente extraído MUST recibir como props el/los valores ya calculados
  en `page.tsx` (el `useMemo` o estado correspondiente a esta sección) — no debe
  re-implementar cálculo ni fetch propio.
- **FR-004**: La extracción MUST mantener el gating existente por `infraExpanded` — esta
  sección no es standalone, depende del mismo flag que ya usa "Infraestructura".
- **FR-005**: El cambio MUST pasar `tsc --noEmit`, `eslint`, y `next build` sin errores
  nuevos — mismo estándar de verificación que los 3 batches anteriores.
- **FR-006**: El comentario-mapa al inicio de `admin/page.tsx` (que documenta qué se
  extrajo y qué sigue inline, actualizado en cada batch anterior) MUST actualizarse para
  reflejar este batch.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `admin/page.tsx` se reduce en líneas respecto a las 3291 líneas actuales
  (medible directamente, mismo tipo de métrica ya reportada en los 3 batches anteriores:
  4043→3799→3555→3291).
- **SC-002**: Las 3 verificaciones automáticas (`tsc --noEmit`, `eslint`, `next build`)
  pasan sin errores nuevos.
- **SC-003**: Una sesión de desarrollo puede entender y modificar la sección "Tablas y
  Vistas" leyendo únicamente su archivo componente propio, sin necesitar cargar el resto de
  `admin/page.tsx`.
- **SC-004**: Cero regresión visual/funcional confirmada en `/admin` — comportamiento
  idéntico antes y después del cambio, para esta sección y para las 4 secciones ya
  extraídas previamente.

## Assumptions

- El público de este cambio es el equipo de desarrollo (Mauro/Javier/sesiones de Claude
  Code futuras) — `/admin` no es una superficie de cliente final, así que "valor de
  usuario" acá se traduce en mantenibilidad y costo de tokens, tal como ya lo documenta
  Knowledge para el batch A-C1 completo.
- El flag `infraExpanded` sigue viniendo de `page.tsx` como prop (no pasa a estado propio
  del componente nuevo) — mismo criterio ya documentado y aplicado en
  `infraestructura-card.tsx`, que también depende de ese flag.
- **Gap de conocimiento explícito** (declarado, no inventado): la estructura exacta de la
  tabla "Tablas y Vistas" — qué columnas, qué fuente de datos (`admin_object_stats_live` u
  otra) — no está detallada en `Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md`, que dice
  literalmente "no leída todavía en detalle". Se resuelve leyendo el código fuente real de
  `admin/page.tsx` en la fase de `/speckit-plan`, no se asume su forma acá.
- No se requiere verificación visual en vivo obligatoria para considerar el batch
  completo — mismo criterio aplicado en los 3 batches anteriores (bloqueados en su momento
  por el bug E2 de SPEC_01, ya resuelto el 2026-08-15) — aunque con E2 resuelto, sí es
  recomendable intentar la verificación visual esta vez si el acceso lo permite.
