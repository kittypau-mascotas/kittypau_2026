---
id: spec_05_optimizacion_tecnica
title: SPEC 05 — Optimización técnica, seguridad y calidad de código
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
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

21 paquetes con severidad alta/crítica (`tar`, `handlebars`, `@xmldom/xmldom`, `mergexml`,
`ip-address`, `sharp`, `tmp`, `ws`, `js-yaml`, `lodash`, `minimatch`, `nanoid`, `picomatch`,
`postcss`, `flatted`, `brace-expansion`, `uuid`, `yaml`) llegan todos vía `@capacitor/cli`,
`@capacitor/assets`, `@trapezedev/project` (build de la APK) o `eslint-plugin-sonarjs`
(lint, dev-only). No corren en el servidor Next.js ni en el browser del usuario — riesgo de
cadena de suministro del build, no de la app en producción.

**Fix:** `npm audit fix` (sin `--force`) resuelve una parte; el resto requiere esperar a que
`@capacitor/cli`/`@trapezedev/project` publiquen versiones con las dependencias
transitivas parchadas. Revisar cada 1-2 meses, no urgente.

**Esfuerzo:** S. **Impacto:** Bajo/medio.

---

## 🟠 Testing: cero tests de integración/E2E — el precedente unitario ya está sentado

> ✅ Hecho (2026-08-11): Vitest instalado, `npm run test`, wired en `pr-quality.yml` (corre
> en cada PR junto a lint/build). Primer suite real en `src/lib/hunger-bar.test.ts` — 6 tests
> sobre `detectSegments`/`computeHungerBar`, incluye test de regresión del bug de dirección
> del 2026-08-11 (percentage=100 al comer, no 0).

Nota: el Python de investigación (`fase_0_ruido/tests/`) sí tenía tests reales antes que el
lado TypeScript — ya no es el único lugar del proyecto con ese rigor.

**Sigue pendiente — orden de bajo a alto esfuerzo:**
1. Tests unitarios de `lib/utils/api.ts` (`parseListResponse`, `resolveDevicePowerState`).
2. 1-2 tests de integración de API routes críticas (`/api/pets/[id]/hunger-bar`,
   `/api/devices/[id]/tare`).
3. E2E con Playwright para el flujo de login + `/today`.

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
| 2 | `npm audit fix` en dependencias de Capacitor/Android | S | Bajo/medio |
| 3 | Decidir `breeds`/`pet_breeds`, `DROP sensor_readings` | XS | Bajo |
| 4 | Tests unitarios `lib/utils/api.ts` + integración de API routes críticas | S-M | Medio |

---

## Ver también

- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs visibles al usuario (complementario a este spec)
- [[07_MQTT/README_MQTT]] — bridge v3.2
- [[06_BaseDatos/README_BaseDatos]] — tablas dormidas/compat
