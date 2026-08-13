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

## 🟡 Bridge: estado de sesión en memoria se pierde en cada reinicio

`bridge/src/processor.js`: `deviceState` y `petBaseline` son `Map()` en memoria del proceso
Node.js. `sudo systemctl restart kittypau-bridge` los borra por completo. Si hay una sesión
de alimentación abierta en el momento del reinicio, queda sin cerrar en la analytics DB — y
el baseline de peso por mascota se reconstruye desde cero.

**Fix (sin sobre-ingeniería):** persistir `deviceState`/`petBaseline` como JSON en disco
local de la Raspberry (`fs.writeFileSync` cada N segundos o al recibir SIGTERM) y
recargarlos al arrancar. `device_operation_records` ya existe en el schema como alternativa
si se prefiere persistir en Supabase en vez de un archivo local — pero el archivo JSON es la
opción de menor esfuerzo real. **Nota:** es código que corre en producción en la Raspberry —
cualquier cambio necesita probarse contra el servicio real antes de desplegar, no solo
compilar en local.

**Esfuerzo:** M. **Impacto:** Medio — solo se manifiesta en el momento exacto de un
`restart`, pero cuando ocurre pierde datos silenciosamente.

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
| 1 | Persistir estado del bridge en disco | M | Medio |
| 2 | `npm audit fix` en dependencias de Capacitor/Android — ✅ parcial 2026-08-13 (26→9), resto depende de releases upstream | S | Bajo/medio |
| 3 | Decidir `breeds`/`pet_breeds`, `DROP sensor_readings` | XS | Bajo |
| 4 | Tests unitarios `lib/utils/api.ts` + integración de API routes críticas — ✅ hecho 2026-08-13 (`api.test.ts` + `tare/route.test.ts`), falta `hunger-bar` | S-M | Medio |

---

## Ver también

- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs visibles al usuario (complementario a este spec)
- [[07_MQTT/README_MQTT]] — bridge v3.2
- [[06_BaseDatos/README_BaseDatos]] — tablas dormidas/compat
