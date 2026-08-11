---
id: spec_01_errores_prioritarios
title: SPEC 01 — Errores prioritarios
type: spec
status: draft
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - spec
  - bugs
  - deuda-tecnica
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[AUDITORIA_2026_08_11]]
  - [[18_UI/UX_DIAGNOSTICO_2026_06_30]]
  - [[01_Proyecto/ESTADO_ACTUAL]]
---

# SPEC 01 — Errores prioritarios

> Todo ítem de esta lista fue **re-verificado contra el código o la app en vivo el
> 2026-08-11** (no se copian bugs viejos del diagnóstico de junio sin chequear si ya se
> arreglaron — varios sí, y están marcados ✅ abajo con el hallazgo de hoy).

## Estado de implementación (2026-08-11, misma sesión)

| # | Estado | Nota |
|---|---|---|
| E1 | ✅ Implementado | `admin/demo-ingresos/page.tsx` ahora usa `authFetch` en vez de `fetch` con cookies |
| E2 | 🔴 No implementado — bloqueado | Requiere verificar la tabla `admin_roles` en Supabase directamente; sin acceso a la DB en esta sesión no se puede confirmar si es un problema de datos o de código |
| E3 | ✅ Implementado | Las 7 carpetas vacías de `/admin/*` fueron eliminadas |
| E4 | ✅ Implementado | `resolveDevicePowerState()` extraído a `lib/utils/api.ts`, usado ahora también en `/pet` para texto y badge (antes leían columnas distintas). Además se corrigió el matching `food`/`water` → también acepta `comedero`/`bebedero` (el bug real detrás del badge) |
| E5 | ✅ Implementado | Nuevo `<AccessibleModal>` (`_components/accessible-modal.tsx`, patrón portado de `/login`) aplicado a los 2 modales de `/bowl`. Corrección sobre el spec original: el modal de configuración **ya tenía** la clase de scroll — solo faltaba la accesibilidad; el modal "Añadir Bebedero" sí le faltaban ambas cosas |
| E6 | ❌ Descartado — no es un bug | El backend bloquea `type` a propósito (`TYPE_IMMUTABLE` en `/api/pets/[id]`). El frontend excluye el campo correctamente. Hacerlo editable es una decisión de producto (¿qué pasa con la calibración histórica si cambia la especie?), no un fix de UI |
| E7 | ⛔ No implementado — faltan secretos reales | No se puede completar sin los valores reales de HiveMQ/`BRIDGE_HEARTBEAT_SECRET`, que no están disponibles en esta sesión |
| E8 | ✅ Implementado | `bridge/package.json` → `3.2.0`, `console.log` → `v3.2`. **Pendiente**: esto solo actualiza el código — alguien con acceso a la Raspberry debe hacer `git pull && sudo systemctl restart kittypau-bridge` para que tome efecto en producción |
| E9 | N/A | Era una nota de precaución, no una tarea |

Validado con `npm run type-check`, `npm run lint` (0 errores) y `npm run build` (build limpio), más un recorrido Playwright en vivo confirmando E4 y E5 renderizando correctamente.

---

## P0 — Bugs en producción, visibles para el usuario

### E1 — `/admin/demo-ingresos`: `Missing Authorization header`

**Confirmado en vivo hoy.** La tabla renderiza pero muestra el error en rojo antes de
poblarse. El fetch client-side a `GET /api/admin/demo-ingresos` no está adjuntando el JWT
— o dispara antes de que el token esté listo.

**Causa probable:** el componente no usa el wrapper `auth-fetch.ts` (que sí adjunta el
JWT automáticamente en el resto de la app — ver [[03_Backend/README_Backend]]), o hace el
fetch en un `useEffect` que corre antes de que la sesión de Supabase resuelva.

**Fix:** usar `authFetch()` en vez de `fetch()` plano en ese componente, o mover el fetch
detrás de un guard `if (!session) return`.

**Esfuerzo:** XS. **Impacto:** Alto — la única pantalla de demo financiera para
presentaciones comerciales está rota.

---

### E2 — `/admin` (root) no deja entrar a ninguna cuenta de prueba

**Confirmado en vivo hoy.** Tanto la cuenta tester como la cuenta que debería tener rol
admin terminan redirigidas a `/today` al navegar a `/admin`. Sin embargo `/admin/javo` y
`/admin/demo-ingresos` sí cargan directo por URL.

**Dos hipótesis, no descartadas:**
1. La fila de `admin_roles` para la cuenta admin de prueba no existe en este proyecto de
   Supabase (problema de datos, no de código).
2. El gate de `/admin` root usa una condición distinta (más estricta) que las subrutas —
   revisar si `/admin/page.tsx` valida contra `admin_roles` con una query distinta a la que
   usan `/admin/javo` y `/admin/demo-ingresos` (o si esas 2 en realidad no tienen gate propio
   y dependen solo de estar autenticado).

**Fix:** confirmar primero contra la tabla `admin_roles` en Supabase (hipótesis 1, gratis de
revisar). Si la fila existe y el bug persiste, es un bug real de routing — comparar el
guard de `/admin/page.tsx` contra el de las subrutas.

**Esfuerzo:** S (una vez identificada la causa). **Impacto:** Alto — sin esto, nadie puede
QA-ear el dashboard admin real.

---

### E3 — 7 subrutas de `/admin/*` son 404 reales (carpetas vacías)

`alerts`, `analytics`, `devices`, `legacy`, `overview`, `pets`, `settings` bajo
`(app)/admin/` no tienen `page.tsx` ni ningún archivo. No es una regresión — nunca se
implementaron. Pero si hay algún link en la UI que apunte a ellas, es un dead-end
silencioso.

**Fix (elegir uno, no es urgente):**
- (a) Borrar las 7 carpetas vacías — señal más honesta de "esto no existe todavía".
- (b) Si hay roadmap real para alguna, dejar solo esa con un placeholder
  `"Próximamente"` en vez de 404 crudo.

**Esfuerzo:** XS. **Impacto:** Bajo (nadie reportó llegar ahí por navegación normal, pero
limpia la superficie del código).

---

### E4 — `/pet`: badge "BEBEDERO: OFFLINE" contradice el texto "Bebedero: active"

**Confirmado en vivo hoy.** La card "Platos asociados" en `/pet` muestra
`Comedero: active · Bebedero: active` como texto, pero los badges debajo dicen
`COMEDERO: LINKED` / `BEBEDERO: OFFLINE` — un usuario real no puede saber si su bebedero
está funcionando o no con dos señales que se contradicen en la misma card.

**Causa a investigar:** posible mezcla de dos fuentes de estado distintas para el mismo
device (`devices.status` vs. `device_state` calculado por `last_seen`, o el badge usa
`bridge_heartbeats` mientras el texto usa el campo `status` de `devices`).

**Fix:** unificar a una sola fuente de verdad de "¿está online este device?" antes de
renderizar ambos. Ver [[06_BaseDatos/README_BaseDatos]] para las columnas candidatas
(`devices.last_seen`, trigger `update_device_from_reading`).

**Esfuerzo:** S. **Impacto:** Alto — esto es exactamente el tipo de contradicción que
rompe la confianza en los datos de un producto de monitoreo (ver [[29_Specs/SPEC_03_Objetivos_Monitoreo]] §confianza).

---

## P1 — Confirmados en el código, no re-verificados visualmente hoy pero sin evidencia de fix

### E5 — Modal de configuración en `/bowl` sigue sin accesibilidad ni scroll móvil

**Re-verificado hoy contra el código** (no solo el diagnóstico de junio): `(app)/bowl/page.tsx`
sigue sin `role="dialog"`, `aria-modal`, ni clase `overflow-y-auto max-h-[90vh]` en el modal
de configuración (Báscula/Asignación/WiFi/Intervalo) ni en "Añadir Bebedero". El modal de
registro en `/login` **sí** se arregló (2026-07-01) — este quedó atrás, mismo patrón, mismo
fix ya probado y funcionando en otro lado del código.

**Fix:** portar exactamente el patrón ya implementado en el modal de registro de `/login`
(`role="dialog"`, `aria-modal`, `aria-labelledby`, foco inicial, Escape, Tab-trap) + la
clase de scroll. Es un copy-paste de un patrón ya validado, no un diseño nuevo.

**Esfuerzo:** S. **Impacto:** Alto en móvil (el modal puede quedar cortado sin forma de
hacer scroll) y en accesibilidad.

---

### E6 — Selector de tipo de mascota no se puede editar en `/pet`

**Re-verificado hoy:** `(app)/pet/page.tsx` sigue excluyendo `type` del payload de guardado
(`const { type, id, pet_state, ...sendPayload } = editPayload; void type;`). Si alguien
registró mal la especie (gato/perro), no hay forma de corregirlo desde la UI.

**Fix:** agregar `<select>` de especie al form de edición y dejar de excluir `type` del
payload.

**Esfuerzo:** S. **Impacto:** Medio — bajo volumen de casos, pero sin salida cuando ocurre.

---

## P2 — Deuda técnica de entorno/infraestructura (no bugs de UI, pero bloquean QA y producción)

### E7 — Variables MQTT y `BRIDGE_HEARTBEAT_SECRET` ausentes en `.env.local`

**Re-verificado hoy** (nombres de variables, sin exponer valores): `.env.local` de este
entorno no tiene `NEXT_PUBLIC_MQTT_BROKER`, `NEXT_PUBLIC_MQTT_PORT_WS`,
`NEXT_PUBLIC_MQTT_USER_READONLY`, `NEXT_PUBLIC_MQTT_PASS_READONLY`, ni
`BRIDGE_HEARTBEAT_SECRET`. Esto es lo que causa la degradación observada en `/bowl` y
`/today` (ver [[18_UI/README_UI]]) — la app degrada bien (con avisos, sin romperse), pero
bloquea probar el flujo MQTT en vivo en desarrollo local.

**Fix:** agregar las 5 variables al `.env.local` de desarrollo (pedir los valores reales a
quien tenga acceso al broker HiveMQ y al secreto compartido con la Raspberry).

**Esfuerzo:** XS (una vez con los valores). **Impacto:** Alto para poder desarrollar/probar
`/bowl` y los heartbeats del bridge localmente.

---

### E8 — Versión del bridge sigue inconsistente en 3 lugares

`bridge/package.json` dice `2.4.0`, el `console.log` de arranque dice `v3.0`, el comentario
de cabecera del archivo dice `v3.2` (la correcta). Documentado desde la auditoría de junio,
sigue sin corregirse.

**Fix:** `bridge/package.json` → `"3.2.0"`, `console.log` línea ~44 → `"Kittypau Bridge v3.2"`.

**Esfuerzo:** XS. **Impacto:** Bajo funcionalmente, alto en confusión de logs/diagnóstico
remoto en la Raspberry.

---

### E9 — `readings.csv` / `readings_rows.csv`: documentación de tamaño incorrecta desde siempre

Ver [[10_Datasets/README_Datasets]] y [[AUDITORIA_2026_08_11]]. No es un bug de código —
es documentación mal calculada que viene de antes de junio. No bloquea nada del pipeline
(los scripts filtran bien por UUID), pero **si alguien alguna vez escribe código nuevo que
asuma "readings.csv son 8000 filas de un solo device" (ej. cargarlo entero en memoria sin
filtrar primero), va a fallar o ser lentísimo** con las 1 085 889 filas reales.

**Fix:** ninguno urgente — solo asegurar que cualquier código nuevo que toque estos CSVs
filtre por `device_id` en el `read_csv`/query, nunca cargue todo el archivo primero.

**Esfuerzo:** N/A (es una nota de precaución, no una tarea). **Impacto:** Previene un bug
futuro de performance/memoria.

---

## Ya resueltos — verificado hoy, no requieren acción

| # (junio) | Qué era | Estado hoy |
|---|---|---|
| C1 | `/inicio` renderizaba `null` (pantalla en blanco) | ✅ **Resuelto** — ahora muestra `"Cargando..."` en una card antes del redirect |
| L-C2, L-C4, L-I1..L-I3, L-I7, L-Q1..L-Q3 | 9 items de `/login` (modal registro sin a11y, `window.confirm()`, inputs sin id, jerarquía de CTAs, etc.) | ✅ Resueltos 2026-07-01, confirmado en el diagnóstico — no re-verificados uno por uno hoy pero sin evidencia de regresión |
| — | `/today` monolito de 5526 líneas | 🟡 **Reducido a 3493 líneas** (confirmado hoy) — sigue siendo grande, pero hubo trabajo real de reducción desde junio. No cuenta como "resuelto" (ver [[29_Specs/SPEC_02_UIUX_Mejoras]] C2), pero tampoco es el mismo problema de junio. |

---

## Priorización sugerida

| # | Fix | Esfuerzo | Impacto | Cuándo |
|---|-----|----------|---------|--------|
| 1 | E7: vars MQTT + heartbeat secret en `.env.local` | XS | Alto (desbloquea QA local) | Inmediato |
| 2 | E1: auth bug en `/admin/demo-ingresos` | XS | Alto | Inmediato |
| 3 | E4: badge Bebedero contradictorio | S | Alto (confianza de datos) | Inmediato |
| 4 | E2: investigar por qué `/admin` root no deja entrar | S | Alto | Esta semana |
| 5 | E5: a11y + scroll modal `/bowl` (portar patrón de `/login`) | S | Alto móvil | Esta semana |
| 6 | E8: versión bridge en 3 lugares | XS | Bajo | Cuando se toque `bridge/` por otra razón |
| 7 | E6: tipo de mascota editable | S | Medio | Sprint siguiente |
| 8 | E3: limpiar 7 carpetas admin vacías | XS | Bajo | Cuando se toque `/admin` por E2 |

---

## Ver también

- [[AUDITORIA_2026_08_11]] — metodología y hallazgos completos
- [[18_UI/UX_DIAGNOSTICO_2026_06_30]] — diagnóstico previo (varios items ya resueltos)
- [[29_Specs/SPEC_02_UIUX_Mejoras]] — mejoras de UX que no son "errores" sino calidad
- [[01_Proyecto/ESTADO_ACTUAL]] — deuda técnica general del proyecto
