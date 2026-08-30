---
id: spec_05_optimizacion_tecnica
title: SPEC 05 — Optimización técnica, seguridad y calidad de código
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-13
tags:
  - spec
  - seguridad
  - performance
  - testing
  - deuda-tecnica
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_01_Errores_Prioritarios]]
  - [[07_MQTT/README_MQTT]]
  - [[06_BaseDatos/README_BaseDatos]]
---

# SPEC 05 — Optimización técnica, seguridad y calidad de código

> Backlog vivo — los items ya resueltos se sacan de este doc en cuanto se implementan (ver
> `git log` para el historial). Complementa [[29_Specs/SPEC_01_Errores_Prioritarios]] (bugs
> visibles) con lo que no se ve navegando la app.

---

## 🟡 CVEs de la toolchain de Android (no de la app web)

> ✅ **Parcial (2026-08-13):** `npm audit fix` (sin `--force`) corrido — 26 → 9
> vulnerabilidades (2 moderate, 6 high, 1 critical). Solo tocó `package-lock.json` (ningún
> bump de versión declarada en `package.json`), type-check/lint/build limpios después.
> Corrida dos veces, idempotente en 9 — confirma que el resto sí depende de que
> `@capacitor/cli`/`@trapezedev/project` publiquen versiones con las transitivas
> (`tar`, `uuid` vía `sharp`, `xcode`) parchadas, como ya se sospechaba.

Las 9 que quedan (`sharp` sin fix upstream, `tar`/`uuid` anidados bajo
`@capacitor/assets`/`@trapezedev/project`) llegan todas vía `@capacitor/cli`,
`@capacitor/assets`, `@trapezedev/project` (build de la APK). No corren en el servidor
Next.js ni en el browser del usuario — riesgo de cadena de suministro del build, no de la
app en producción.

**Sigue pendiente:** esperar releases upstream. Revisar cada 1-2 meses, no urgente.

**Esfuerzo:** S. **Impacto:** Bajo/medio.

---

## 🟠 Testing: cero tests de integración/E2E — el precedente unitario ya está sentado

> ✅ Hecho (2026-08-11): Vitest instalado, `npm run test`, wired en `pr-quality.yml` (corre
> en cada PR junto a lint/build). Primer suite real en `src/lib/hunger-bar.test.ts` — 6 tests
> sobre `detectSegments`/`computeHungerBar`, incluye test de regresión del bug de dirección
> del 2026-08-11 (percentage=100 al comer, no 0).

Nota: el Python de investigación (`fase_0_ruido/tests/`) sí tenía tests reales antes que el
lado TypeScript — ya no es el único lugar del proyecto con ese rigor.

> ✅ **Hecho (2026-08-13):** `src/lib/utils/api.test.ts` — 13 tests sobre
> `parseListResponse` y `resolveDevicePowerState` (incluye el caso borde que motivó la
> función: SPEC_01 E4, columnas `device_state`/`status` contradictorias). Primer test de
> integración real de una API route: `src/app/api/devices/[id]/tare/route.test.ts` — 4
> casos (401 sin auth, 404 device ajeno, 200 happy path, 500 si falla el insert), Supabase
> mockeado con `vi.mock` + builder encadenable mínimo. 23/23 tests pasan en total.

**Sigue pendiente — orden de bajo a alto esfuerzo:**
1. Test de integración de `/api/pets/[id]/hunger-bar` — más complejo que `tare` (pagina
   `readings`, corre `computeHungerBar` real); no se hizo en esta pasada, el patrón de
   mock de Supabase de `tare/route.test.ts` es reusable como punto de partida.
2. E2E con Playwright para el flujo de login + `/today`.

**Esfuerzo:** S-M incremental por punto. **Impacto:** Alto a mediano plazo — sin esto, cada
cambio en páginas grandes como `today/page.tsx` sigue siendo mayormente a ciegas fuera de la
lógica pura ya cubierta.

---

## ✅ Bridge: estado de sesión en memoria se pierde en cada reinicio — Resuelto (2026-08-29)

`bridge/src/processor.js`: `deviceState` y `petBaseline` eran `Map()` en memoria del proceso
Node.js. `sudo systemctl restart kittypau-bridge` los borraba por completo — si había una
sesión de alimentación abierta en el momento del reinicio, quedaba sin cerrar en la
analytics DB y el baseline de peso por mascota se reconstruía desde cero.

**Fix deployado en producción** (PC de Javier, ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
§4): `deviceState`/`petBaseline` se persisten como JSON en disco (`bridge-state.json`,
cada 30s + en shutdown) y se recargan al arrancar. De paso se agregó el handler de
`SIGTERM` que faltaba en `index.js` (es la señal real que manda `systemctl restart`, no
`SIGINT`). Verificado con un restart real en producción — log `Estado restaurado desde
disco (2 devices, 0 pets)` confirma el round-trip completo.

---

## 🟢 Base de datos: 3 tablas dormidas/compat, candidatas a limpieza (no urgente)

| Tabla | Estado | Acción sugerida |
|---|---|---|
| `sensor_readings` | compat/retirada — bridge v3.2 ya no escribe ahí | `DROP TABLE` (confirmar antes que ningún reporte/admin legacy la lea) — **destructivo, requiere confirmación explícita de Mauro antes de ejecutar** |
| `breeds`, `pet_breeds` | dormidas — frontend usa lista hardcodeada | Decidir explícitamente: ¿se activan (permitiendo razas dinámicas) o se eliminan? Hoy están en un limbo sin dueño |

**Esfuerzo:** XS (son decisiones + 1 migración). **Impacto:** Bajo funcionalmente, mejora
la señal-ruido del schema.

---

## Priorización

| # | Fix | Esfuerzo | Impacto |
|---|-----|----------|---------|
| 1 | Persistir estado del bridge en disco — ✅ hecho y deployado 2026-08-29 | M | Medio |
| 2 | `npm audit fix` en dependencias de Capacitor/Android — ✅ parcial 2026-08-13 (26→9), resto depende de releases upstream | S | Bajo/medio |
| 3 | Decidir `breeds`/`pet_breeds`, `DROP sensor_readings` | XS | Bajo |
| 4 | Tests unitarios `lib/utils/api.ts` + integración de API routes críticas — ✅ hecho 2026-08-13 (`api.test.ts` + `tare/route.test.ts`), falta `hunger-bar` | S-M | Medio |

---

## Ver también

- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs visibles al usuario (complementario a este spec)
- [[07_MQTT/README_MQTT]] — bridge v3.2
- [[06_BaseDatos/README_BaseDatos]] — tablas dormidas/compat
