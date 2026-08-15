---
id: spec_02_uiux_mejoras
title: SPEC 02 — Mejoras de UI/UX
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-13
tags:
  - spec
  - ux
  - ui
  - accesibilidad
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[18_UI/README_UI]]
  - [[29_Specs/SPEC_01_Errores_Prioritarios]]
---

# SPEC 02 — Mejoras de UI/UX

> Backlog vivo — los items ya resueltos se sacan de este doc en cuanto se implementan (ver
> `git log` para el historial). No repite lo que es un **error** (eso vive en
> [[29_Specs/SPEC_01_Errores_Prioritarios]]) — esto es sobre subir el piso de calidad de lo
> que ya funciona.

---

## Patrones buenos que ya existen y deberían generalizarse

> ✅ **U2 hecho (2026-08-12):** `<DiagnosticoRapidoCard>` extraído y generalizado a
> `/today` (debajo de Alimentación/Hidratación, fuera de "Barras Sims") y `/pet` (junto a
> "Platos asociados"). Ver [[18_UI/Componentes/COMP_DiagnosticoRapidoCard]].

> ✅ **U3 hecho (2026-08-13):** `<OnboardingTip screen="pet|bowl|story">` generalizado
> (`@/app/_components/onboarding-tip.tsx`), inspirado en el modal "Modo guía" de `/today`
> pero self-contained (decide solo si mostrarse, vía `localStorage` con clave
> `kittypau_tip_seen_<screen>` independiente por pantalla — no reusa `kittypau_guide_seen`
> de `/today`). Wireado con 1-2 tips reales por pantalla en `/pet`, `/bowl` y `/story`.

---

## Deuda de UX pendiente

> ✅ **I2 hecho (2026-08-13):** `<PageLoadingSkeleton>` (`@/app/_components/`, `animate-pulse`
> de Tailwind, sin librería nueva) reemplaza el texto plano de loading en `/bowl`,
> `/settings` y `/pet`. `role="status"` + label accesible para lectores de pantalla.

| # | Qué | Por qué importa | Esfuerzo |
|---|---|---|---|
| I9 | SSIDs de WiFi solo en `localStorage`, se pierden en reinstall de la APK | Pérdida de datos de configuración — requiere migración de schema (persistir en `devices`) | M |
| L-C1 | `/login` sigue siendo un monolito de ~1924 líneas | Mantenibilidad — no bloquea usuario final | XL |
| L-C3 | SVG del gato como string gigante inline con `dangerouslySetInnerHTML` en `/login` | Mantenibilidad, no seguridad (contenido estático propio) | M |
| A-C1 | `/admin` monolito, ver desarrollo completo abajo — **en curso, batch 2/N hecho 2026-08-13** | Mantenibilidad — solo lo usa Mauro/admin, no bloquea usuario final | XL |

### A-C1 — `/admin` monolito: extracción por componentes EN CURSO

> Estaba "dejado de lado a propósito" desde el 2026-08-11 — Mauro pidió explícitamente
> avanzar el 2026-08-12 (contexto: reducir el costo de tokens de sesiones futuras que
> tocan este archivo). **No es un cambio de una sola vez** — 4043 líneas con cálculos
> financieros de por medio, se hace en lotes chicos con validación entre cada uno, mismo
> método que ya funcionó para `today/_components/`.

**Arquitectura real (importante para quien siga esto):** a diferencia de `/today`/`/bowl`
(fetches independientes por sección), `/admin` es **un solo fetch grande**
(`GET /api/admin/overview`) que llena ~24 slices de estado. Cada sección de la UI lee un
`useMemo` que ya viene pre-calculado desde ese estado compartido — así que la extracción es
"mover JSX + pasar el memo ya calculado como prop" (mismo patrón que `DayNightTimelineCard`
de `/today`), **no** "extraer fetch + estado propio" (eso hubiera sido más simple pero no es
lo que hay acá).

**Hecho — batch 1/N (commit `97852f0`, 2026-08-12):** 4043 → 3799 líneas.
- `admin/_components/section-status-card.tsx` — card ok/warning/critical, compartida por
  5 secciones (Operación, Auditoría, Infraestructura, Finanzas, Tests).
- `avisos-criticos-card.tsx` — botón de health-check (el fetch real quedó en `page.tsx`
  como `runHealthCheck`, ya no inline en el `onClick`) + lista de alertas.
- `kpi-ejecutivos-card.tsx` — grilla de 5 stat cards, trivial.
- `modelos-negocio-card.tsx` — 3 caminos de negocio + escalamiento + valorización SaaS +
  3 cards de fase.

Validado: type-check, lint, build limpios. **No verificado visualmente** — `/admin` sigue
bloqueado por [[29_Specs/SPEC_01_Errores_Prioritarios]] E2 (ambas cuentas de prueba
redirigen a `/today`). El type-check da confianza de que los props calzan, pero no
reemplaza verlo renderizado — priorizar resolver E2 sigue pendiente.

**Hecho — batch 2/N (2026-08-13):** 3799 → 3555 líneas.
- `auditoria-card.tsx` — "2) Auditoría e Integridad de Datos" + "Estado de registro" +
  "Registros pendientes recientes" (`auditSectionStatus`, `registrationSummary` como
  props). `formatAgo` duplicado adentro a propósito, mismo patrón que
  `section-status-card.tsx`.
- `infraestructura-card.tsx` — "3) Infraestructura y Telemetría" + "Estado de bridges" +
  "Estado KPCL (online/offline)" (`infraSectionStatus`, `infraExpanded`, `bridges`,
  `kpclDevices` como props). `infraExpanded` sigue viniendo del `page.tsx` porque también
  gatea "Tablas y Vistas", que no es parte de este extracto.

Mismo **no verificado visualmente** que el batch 1 (bloqueado por E2) — type-check, lint y
build limpios sí lo cubren.

**Hecho — batch 3/N (2026-08-15):** 3555 → 3291 líneas.
- `admin/_components/tests-admin-card.tsx` — "Suite de Tests Admin" completa: catálogo
  (`ADMIN_TEST_CATALOG`, se movió acá, ya no vive en `page.tsx`), botón de ejecución,
  tabla de última corrida, historial persistido. `testsSectionStatus`/`runAllAdminTests`
  siguen en `page.tsx` como props (mismo patrón que los batches anteriores).

Validado: `tsc --noEmit`, `eslint`, `next build` — los 3 limpios.

**Pendiente — secciones que siguen inline en `page.tsx`, en el orden en que aparecen**
(el comentario-mapa al inicio del archivo tiene el detalle actualizado a cada commit):

1. "1) Operación del Servicio" — usa `SectionStatusCard` (ya importado), simple.
2. "Resumen de Finanzas" — **la más densa del archivo**: breakdown de costos, selector de
   KPCL con tabla de componentes por unidad, break-even. Múltiples `useMemo` financieros
   (`selectedKpclCost`, `selectedKpclRuntimeSim`, `kpclRuntimeByDevice`,
   `kpclFinancialRows`, `financeSectionStatus`) — tratar con más cuidado que los batches
   anteriores, son cálculos de plata reales.
3. "Continuidad KPCL" — el gráfico SVG custom (`continuityChart`, el `useMemo` más largo
   del archivo, ~160 líneas). Candidato a extraer el SVG completo con `continuityChart` ya
   calculado como única prop.
4. "Tablas y Vistas (Uso Aproximado)" — no leída todavía en detalle.
5. "Resumen de incidentes (24h)", "Panel de acciones", "Audit events en línea" — no
   leídas todavía en detalle (después de la línea ~2500 del archivo original).

**Próximo paso sugerido:** de las que quedan, "Tablas y Vistas" (punto 4) parece la más
acotada — dejar Finanzas (punto 2) y Continuidad (punto 3) para el final por ser las de
mayor cuidado.

---

## Hallazgos sin resolver

### U5 — Inconsistencia visual de estado (mismo patrón que causaba el bug del badge de `/pet`)

Cualquier card que muestre el mismo estado por 2 caminos distintos (texto + badge, cada uno
leyendo una columna distinta) puede volver a contradecirse. Ya se corrigió un caso concreto
en `/pet` (ver historial de [[29_Specs/SPEC_01_Errores_Prioritarios]]) — **pendiente**:
revisar si hay otras cards con doble fuente de estado sin reconciliar (ej. "Estado técnico:
linked" en `/bowl` vs. el punto verde de conexión en el sidebar — confirmar que ambos leen
la misma fuente).

### U6 — `/story` comunica bien su propia limitación, usar como plantilla de "empty state honesto"

El banner *"Historial temporalmente limitado — la base analítica histórica no está
disponible en este entorno, por lo que la story muestra sólo lo que el core puede
reconstruir"* es un ejemplo bueno de comunicar una limitación técnica sin tecnicismos ni
alarmar al usuario. Usar ese tono como referencia de copy para el resto de estados
degradados de la app ("Sin evidencia real", "N/D", etc.).

---

## Ver también

- [[18_UI/README_UI]] — recorrido en vivo completo pantalla por pantalla
- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs (distinto de mejoras de calidad)
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — contexto de por qué "Barras Sims" es sensible
