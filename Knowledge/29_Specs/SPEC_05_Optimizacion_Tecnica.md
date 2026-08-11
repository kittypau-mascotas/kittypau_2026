---
id: spec_05_optimizacion_tecnica
title: SPEC 05 — Optimización técnica, seguridad y calidad de código
type: spec
status: draft
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
  - [[19_DevOps/README_DevOps]]
  - [[07_MQTT/README_MQTT]]
  - [[06_BaseDatos/README_BaseDatos]]
---

## Estado de implementación (2026-08-11, misma sesión)

| # | Estado | Nota |
|---|---|---|
| §1 Next.js CVEs | ✅ Implementado | `next` y `eslint-config-next` → `16.2.12`. `npm audit` confirma que `next` ya no aparece en el reporte. Build + type-check limpios |
| §2 CVEs de toolchain Android | ⏸️ Diferido | Depende de que `@capacitor/cli`/`@trapezedev/project` publiquen fixes — no está 100% en manos del proyecto, se dejó para revisión periódica |
| §3 Rate limiting | ✅ Implementado | `/api/auth/login` (10/5min), `/api/demo/ingreso` (5/10min), `/api/chatbot-gato` (20/10min) — todos usando `_rate-limit.ts` ya existente |
| §4 Testing (Vitest) | ⏸️ Diferido | Instalar y configurar un test runner desde cero es una tarea de infraestructura aparte, no un fix puntual — no se hizo en esta pasada. Se dejó la recomendación de por dónde empezar (tal como está escrita abajo) |
| §5 Duplicación de código | ✅ Implementado | `parseListResponse`/`resolveDevicePowerState` extraídas a `lib/utils/api.ts`, 4 archivos actualizados (`today`, `bowl`, `pet`, `story`) |
| §6 Persistencia del bridge | ⏸️ Diferido | Es código que corre en producción en la Raspberry Pi — escribir el cambio sin poder probarlo contra el servicio real ni desplegarlo es más riesgo que beneficio en una sesión sin acceso a ese hardware |
| §7 Limpieza de BD | ⏸️ Diferido, a propósito | `DROP TABLE` es destructivo e irreversible — no se ejecuta sin confirmación explícita de Mauro, tal como indican las reglas del proyecto |
| §8 Corrección de docs CI/CD | ✅ Implementado | `19_DevOps/README_DevOps.md` y `01_Proyecto/ESTADO_ACTUAL.md` corregidos en la sesión anterior (auditoría), no en esta — ya estaba hecho |

Los 3 ítems implementados (§1, §3, §5) están validados con `npm run type-check`, `npm run
lint` (0 errores), `npm run build` (build de producción limpio) y un recorrido Playwright en
vivo confirmando que el badge fix (consumidor de §5) renderiza correctamente.

---

# SPEC 05 — Optimización técnica, seguridad y calidad de código

> Complementa [[29_Specs/SPEC_01_Errores_Prioritarios]] (bugs visibles para el usuario) con
> lo que **no se ve navegando la app** pero sí importa: dependencias con CVEs conocidos,
> endpoints sin rate limit, cero tests automatizados, código duplicado, y estado real del
> pipeline de CI. Todo verificado directamente hoy (`npm audit`, grep del código, lectura de
> `bridge/src/processor.js` y de `.github/workflows/`), no supuesto.

---

## 1. 🔴 Seguridad — Next.js 16.1.6 tiene ~27 CVEs conocidos, fix es un bump de versión

`npm audit` (2026-08-11) reporta **27 vulnerabilidades (2 críticas, 20 altas, 4 moderadas,
1 baja)**. La más importante por lejos: **`next` es dependencia directa de producción** (no
una herramienta de build) y está afectada por decenas de advisories, incluyendo varios de
severidad alta:

- *Middleware / Proxy bypass in App Router applications* (múltiples variantes, incluida una
  vía Turbopack)
- *Server-Side Request Forgery in Server Actions* y *en rewrites vía hostname controlado por
  el atacante*
- *Denial of Service* en Server Components, Cache Components y la API de Image Optimization
- *Null origin puede bypassear los checks CSRF de Server Actions*
- *Disclosure no autenticado de endpoints internos de Server Functions*

**Todos los advisories se cierran actualizando a `next >= 16.2.11`** (rango afectado real:
`>=16.0.0 <16.2.11`, la mayoría `<16.2.5`). Es un bump de versión menor dentro del mismo
major (16.x), no una migración — bajo riesgo de romper nada, alto valor de seguridad.

**Fix:**
```bash
cd kittypau_app
npm install next@latest   # o pin explícito a >=16.2.11
npm run build              # confirmar que compila
```
Luego correr `npm audit` de nuevo para confirmar que la fila `next` desaparece.

**Esfuerzo:** XS-S (bump + smoke test). **Impacto:** Alto — es la única vulnerabilidad de
esta lista que vive en la superficie de ataque real de la app en producción (Vercel),
justifica tratarla como P0 aunque el resto de este spec sea de menor severidad.

---

## 2. 🟡 Seguridad — el resto de los CVEs son de la toolchain de Android, no de la app web

Los otros 21 paquetes con severidad alta/crítica (`tar`, `handlebars`, `@xmldom/xmldom`,
`mergexml`, `ip-address`, `sharp`, `tmp`, `ws`, `js-yaml`, `lodash`, `minimatch`, `nanoid`,
`picomatch`, `postcss`, `flatted`, `brace-expansion`, `uuid`, `yaml`) llegan todos vía
`@capacitor/cli`, `@capacitor/assets`, `@trapezedev/project` (herramientas de build de la
APK Android) o `eslint-plugin-sonarjs` (lint, dev-only). **No corren en el servidor Next.js
ni en el browser del usuario** — su superficie de riesgo es la máquina donde se compila la
APK, no la app en producción. Igual vale la pena limpiarlas porque:

- Corren en CI (si algún workflow llega a invocar `android:*` o `eslint-plugin-sonarjs`)
- Son riesgo de cadena de suministro para quien compile la APK localmente

**Fix:** `npm audit fix` (sin `--force`) resuelve una parte; el resto requiere esperar a que
`@capacitor/cli`/`@trapezedev/project` publiquen versiones con las dependencias
transitivas parchadas — no está 100% en manos del proyecto. Revisar cada 1-2 meses, no es
urgente.

**Esfuerzo:** S (correr `npm audit fix`, verificar que no rompe `android:*` scripts).
**Impacto:** Bajo/medio — cadena de suministro del build, no la app en producción.

---

## 3. 🟠 Rate limiting: existe la infraestructura, no está en los 3 endpoints que más la necesitan

Confirmado hoy: `kittypau_app/src/app/api/_rate-limit.ts` (Upstash Redis, ya configurado en
`.env.local` vía `UPSTASH_REDIS_REST_URL`/`_TOKEN`) está aplicado en varios endpoints de
`devices`, `pets`, `profiles`, `mqtt/webhook`. **No está aplicado en:**

| Endpoint | Riesgo sin rate limit |
|---|---|
| `/api/auth/login` | Fuerza bruta de contraseñas — Supabase Auth (GoTrue) tiene su propio rate limit interno, pero el proxy de la app no agrega ninguna capa adicional propia |
| `/api/demo/ingreso` | Público, sin auth, escribe en `demo_ingresos_leads` — spam/flood de leads falsos, sin costo para el atacante |
| `/api/chatbot-gato` | Llama a Hugging Face (Llama 3.1 8B) — cada llamada tiene costo real. Sin límite, un abuso puede generar factura inesperada |

**Fix:** envolver estos 3 con el mismo helper de `_rate-limit.ts` que ya usan los otros
endpoints — es reusar infraestructura existente, no construir nada nuevo.

**Esfuerzo:** S (una vez por endpoint). **Impacto:** Alto en `chatbot-gato` (riesgo de
costo real), medio en los otros dos.

---

## 4. 🟠 Testing: cero tests automatizados en la app web (confirmado, no solo "documentado como pendiente")

Verificado hoy: no hay archivos `*.test.*`/`*.spec.*` en `kittypau_app/src`, no hay config
de Jest/Vitest/Playwright, y `package.json` no tiene script `test`. La única validación
automática es `npm run lint` + `npm run build` en CI (ver §6). Esto ya estaba en la deuda
técnica documentada de [[01_Proyecto/ESTADO_ACTUAL]], pero vale la pena decir con precisión
qué falta, no solo "faltan tests":

- **Cero tests unitarios** de lógica pura sin UI — el candidato más obvio y barato es
  `hunger-bar.ts` (`detectSegments`, `classifySegment`, `computeHungerBar`), que ya tiene un
  smoke test manual documentado en [[05_API/SPEC_HungerBar_Alimentacion]] §1.2 pero no un
  test real en el repo. Es lógica pura (sin red, sin DOM) — el test más barato posible de
  escribir primero.
- **Cero tests de integración de API routes** — ni siquiera un smoke test que pegue a
  `/api/pets`, `/api/devices` contra una DB de prueba.
- **Cero tests E2E** — nada equivalente al recorrido de Playwright hecho manualmente hoy
  para [[18_UI/README_UI]] vive como test repetible.

Nota aparte: el Python de investigación (`fase_0_ruido/tests/`) sí tiene tests reales
(`test_candidatos.py`, `test_evidence_engine.py`, `test_split_mixto.py`) — el rigor de tests
existe en el proyecto, simplemente no se trasladó al lado TypeScript/Next.js.

**Fix propuesto — orden de bajo a alto esfuerzo:**
1. Agregar Vitest (liviano, rápido, buen soporte TS/Next.js) + 1 test real sobre
   `hunger-bar.ts` — sienta el precedente de "cómo se testea acá".
2. Tests unitarios de las funciones puras duplicadas (`parseListResponse`,
   `resolveDevicePowerState`, ver §5) — doble beneficio: fuerza a extraerlas a un solo
   lugar primero.
3. 1-2 tests de integración de API routes críticas (`/api/pets/[id]/hunger-bar`,
   `/api/devices/[id]/tare`).
4. E2E con Playwright solo para el flujo de login + `/today` — el que ya se probó a mano hoy.

**Esfuerzo:** M para el punto 1 (setup + primer test), luego incremental. **Impacto:** Alto
a mediano plazo — sin esto, cada cambio en `today/page.tsx` (3493 líneas) es un cambio a
ciegas.

---

## 5. 🟡 Duplicación de código confirmada en 4 archivos, no 2

El diagnóstico de junio (Q1) mencionaba `parseListResponse` y `resolveDevicePowerState`
duplicadas "en `bowl/page.tsx` y `today/page.tsx` (y otras páginas)" sin precisar cuáles.
**Confirmado hoy con grep:** están copiadas en **4 archivos** —
`bowl/page.tsx`, `pet/page.tsx`, `story/page.tsx`, `today/page.tsx`. Cuatro copias de la
misma lógica de parseo de respuesta de API y de resolución de estado de energía del
dispositivo.

**Riesgo real, no solo estético:** si `resolveDevicePowerState` tiene un bug o cambia la
regla de negocio (ej. el mismo tipo de inconsistencia que causó el badge "BEBEDERO:
OFFLINE" de [[29_Specs/SPEC_01_Errores_Prioritarios]] E4), hay que encontrar y corregir 4
copias en vez de 1 — y es fácil corregir 3 y olvidar la 4ª.

**Fix:** extraer ambas a `src/lib/utils/api.ts` (o similar) y hacer que los 4 archivos
importen desde ahí. Mecánico, bajo riesgo, alto valor de mantenibilidad — y es prerequisito
barato para el punto 2 del plan de testing de §4.

**Esfuerzo:** S. **Impacto:** Medio ahora, alto la próxima vez que haya que tocar esa lógica.

---

## 6. 🟡 Bridge: estado de sesión en memoria se pierde en cada reinicio (deuda ya conocida, sigue sin resolver)

Confirmado hoy leyendo `bridge/src/processor.js`: `deviceState` y `petBaseline` son
`Map()` en memoria del proceso Node.js. `sudo systemctl restart kittypau-bridge` los borra
por completo. Si hay una sesión de alimentación abierta en el momento del reinicio, queda
sin cerrar en la analytics DB — y el baseline de peso por mascota (usado para detectar
anomalías) se reconstruye desde cero, perdiendo contexto histórico de corto plazo.

**Ya documentado como deuda técnica M4 en la auditoría de junio — sigue sin resolver.**

**Fix (sin sobre-ingeniería):** no hace falta una cola distribuida — persistir
`deviceState`/`petBaseline` como JSON en disco local de la Raspberry (`fs.writeFileSync`
cada N segundos o al recibir SIGTERM) y recargarlos al arrancar. `device_operation_records`
ya existe en el schema (tabla "infraestructura" sin código activo, ver
[[06_BaseDatos/README_BaseDatos]]) como alternativa si se prefiere persistir en Supabase en
vez de un archivo local — pero el archivo JSON es la opción de menor esfuerzo real.

**Esfuerzo:** M. **Impacto:** Medio — solo se manifiesta en el momento exacto de un
`restart`, pero cuando ocurre pierde datos silenciosamente.

---

## 7. 🟢 Base de datos: 3 tablas dormidas/compat, candidatas a limpieza (no urgente)

Ya documentado en [[06_BaseDatos/README_BaseDatos]], resumido acá como tarea concreta:

| Tabla | Estado | Acción sugerida |
|---|---|---|
| `sensor_readings` | compat/retirada — bridge v3.2 ya no escribe ahí | `DROP TABLE` (confirmar antes que ningún reporte/admin legacy la lea) |
| `breeds`, `pet_breeds` | dormidas — frontend usa lista hardcodeada | Decidir explícitamente: ¿se activan (permitiendo razas dinámicas) o se eliminan? Hoy están en un limbo sin dueño |

**Esfuerzo:** XS (son decisiones + 1 migración). **Impacto:** Bajo funcionalmente, mejora
la señal-ruido del schema para cualquiera que lo lea de cero (como esta misma auditoría).

---

## 8. 🟢 CI/CD: corrección a lo documentado — sí existe, pero no corre tests (porque no hay tests)

[[19_DevOps/README_DevOps]] y [[01_Proyecto/ESTADO_ACTUAL]] dicen *"Sin CI/CD — push manual
+ Vercel auto-deploy"*. **Verificado hoy: es parcialmente incorrecto.** Existen
`.github/workflows/pr-quality.yml` (lint + build + encoding-check + bloqueo de `.env`
trackeados, en cada PR a `main`) y `monthly-fusion-review.yml`. Lo que sí es cierto: no hay
paso de `test` en el pipeline — porque no hay tests que correr (§4). Cuando se implemente
Vitest, agregar `npm run test` como step nuevo en `pr-quality.yml` es trivial (mismo job,
una línea más).

**Fix:** corregir [[19_DevOps/README_DevOps]] y [[01_Proyecto/ESTADO_ACTUAL]] para no decir
"sin CI/CD" — decir con precisión qué corre y qué falta (test step). Ya corregido en este
spec; falta reflejarlo en esos 2 docs.

**Esfuerzo:** XS (doc) + S (agregar el step de test cuando exista). **Impacto:** Bajo — es
una corrección de precisión de documentación, no un problema real de proceso.

---

## 9. Priorización consolidada

| # | Fix | Esfuerzo | Impacto | Cuándo |
|---|-----|----------|---------|--------|
| 1 | §1: `next` → `>=16.2.11` | XS-S | Alto (seguridad en producción) | Inmediato |
| 2 | §3: rate limit en `/api/chatbot-gato` | S | Alto (costo real) | Inmediato |
| 3 | §3: rate limit en `/api/auth/login`, `/api/demo/ingreso` | S | Medio | Esta semana |
| 4 | §5: extraer `parseListResponse`/`resolveDevicePowerState` a `lib/utils/` | S | Medio (previene bugs tipo E4) | Esta semana |
| 5 | §8: corregir docs de "sin CI/CD" | XS | Bajo (precisión) | Cuando se edite ese doc |
| 6 | §4: setup Vitest + primer test sobre `hunger-bar.ts` | M | Alto a mediano plazo | Sprint 1 |
| 7 | §6: persistir estado del bridge en disco | M | Medio | Sprint 1-2 |
| 8 | §2: `npm audit fix` en dependencias de Capacitor/Android | S | Bajo/medio | Cuando se toque `android:*` |
| 9 | §7: decidir `breeds`/`pet_breeds`, `DROP sensor_readings` | XS | Bajo | Sprint 2+ |

---

## Ver también

- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs visibles al usuario (complementario a este spec)
- [[19_DevOps/README_DevOps]] — pendiente de corrección por §8
- [[07_MQTT/README_MQTT]] — bridge v3.2, contexto de §6
- [[06_BaseDatos/README_BaseDatos]] — tablas dormidas/compat de §7
