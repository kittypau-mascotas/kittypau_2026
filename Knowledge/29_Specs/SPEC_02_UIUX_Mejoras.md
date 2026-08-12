---
id: spec_02_uiux_mejoras
title: SPEC 02 — Mejoras de UI/UX
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
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

### U2 — El panel "Diagnóstico rápido" de `/bowl` es el mejor patrón de confianza-en-los-datos que tiene la app

3 columnas (Conexión/Energía/Firmware) + "Acciones recomendadas" en lenguaje simple ("Todo
estable. Mantén el plato conectado."). Es exactamente el tipo de comunicación que un
producto de monitoreo necesita en **todas** las pantallas con datos de sensor, no solo
`/bowl`. `/today` y `/pet` muestran datos "sin evidencia real" o "N/D" sin ese mismo nivel
de explicación accionable.

**Propuesta:** extraer `<DiagnosticoRapidoCard>` reusable y mostrarlo también en `/today`
(junto a la card de Alimentación/Hidratación) y en `/pet` (junto a "Platos asociados").
**Nota:** el panel "Barras Sims" de `/today` es sensible a cambios — proponer antes de
implementar, ver [[29_Specs/SPEC_04_Metricas_Today_Investigacion]].

### U3 — El modal "MODO GUÍA" de onboarding en `/today` es un buen patrón sin continuación

`/today` tiene un modal de bienvenida con tips + `Completar registro`. Es un modal aislado
en una sola pantalla: `/pet`, `/bowl` y `/story` no tienen su propio tip de bienvenida
contextual, así que un usuario nuevo que llega directo a `/pet` (ej. desde un link
compartido) no recibe la misma guía.

**Propuesta:** generalizar a un patrón `<OnboardingTip screen="pet|bowl|story">` con 1-2
tips específicos por pantalla, reusando el mismo componente modal de `/today`.

---

## Deuda de UX pendiente

| # | Qué | Por qué importa | Esfuerzo |
|---|---|---|---|
| I2 | Loading en texto plano (`"Cargando estado..."`) sin skeleton en `/bowl`, `/settings`, `/pet` | Se siente más lento de lo que es | M |
| I9 | SSIDs de WiFi solo en `localStorage`, se pierden en reinstall de la APK | Pérdida de datos de configuración — requiere migración de schema (persistir en `devices`) | M |
| L-C1 | `/login` sigue siendo un monolito de ~1924 líneas | Mantenibilidad — no bloquea usuario final | XL |
| L-C3 | SVG del gato como string gigante inline con `dangerouslySetInnerHTML` en `/login` | Mantenibilidad, no seguridad (contenido estático propio) | M |
| A-C1 | `/admin` es un monolito de ~4043 líneas — el más grande de la app, mayor que `/login` (L-C1) y `/today` antes de su extracción | Mantenibilidad — solo lo usa Mauro/admin, no bloquea usuario final. Estructura ya inspeccionada: ~15 secciones delimitadas por `<h2>` (Salud del sistema, Integridad de datos, Infraestructura, Tablas y Vistas, Uso KPCL, etc.), cada una con su propio fetch/estado local — mismo patrón que hizo segura la extracción de `today/_components/`. **Evaluado 2026-08-11, dejado de lado a propósito por Mauro — no priorizar sin pedido explícito.** | XL |

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
