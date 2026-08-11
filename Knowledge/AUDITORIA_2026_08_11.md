---
id: auditoria_2026_08_11
title: Auditoría KittyPau — 2026-08-11
type: auditoria
status: active
owner: Mauro
created: 2026-08-11
---

# Auditoría KittyPau — 2026-08-11

> Segunda auditoría exhaustiva del vault, esta vez incluyendo recorrido en vivo de la app
> con Playwright (`npm run dev` + navegación real con las cuentas de prueba), verificación
> directa del firmware en disco, y conteo directo de los datasets de `fase_0_ruido`.
> Reemplaza a [[AUDITORIA_2026_06_29]] como snapshot vigente — esa auditoría queda como
> referencia histórica (varios de sus hallazgos ya fueron corregidos entre junio y agosto,
> ver commits `538eebf`, `f5663f8`, `451f1c7`, `c465caf`, `eb541bd`, `bddf9a5`).

---

## Metodología

| Fuente | Cómo se verificó |
|---|---|
| Knowledge vault completo (28 directorios) | Leído — READMEs, MOCs, specs |
| `kittypau_app/src/app/` | `find` de todos los `page.tsx` y `route.ts` reales |
| App en vivo | `npm run dev` en `localhost:3000` + Playwright headless, 2 cuentas reales (tester y la cuenta admin conocida), ~35 capturas de pantalla + extracción de headings/botones/nav |
| `iot_firmware/`, `kittypau_iot_firmware/`, `kittypau_iot_firmware (antiguo)/` | `find` + lectura de `config.h`, `platformio.ini`, changelog interno, `git log` por archivo |
| `bridge/src/index.js` | Leído — versión, `DEVICES[]`, mapeo de campos |
| `Docs/09_Investigacion/Ciclo Alpha v2/fase_0_ruido/` | Leído completo (README, ARQUITECTURA_APP, ACTUALIZACION_DATA, HISTORIAL_RESULTADOS, RECOPILACION_DATOS_APP parcial) + conteo directo de CSVs |
| `git log`, `git status`, `.gitignore` | Ejecutados |
| Supabase / GitHub MCP | No usados en esta sesión (no se necesitaron — todo se verificó contra archivos y la app corriendo local) |

---

## 🔴 Hallazgo crítico — `kittypau_iot_firmware/` NO es el firmware activo

`CLAUDE.md` (instrucciones del proyecto) dice: *"`kittypau_iot_firmware/` contiene el
firmware del hardware real"*. **Es incorrecto en este momento.** Verificado:

- `kittypau_iot_firmware/` existe en disco pero está **completamente vacía** (0 archivos) y
  está en `.gitignore`.
- `kittypau_iot_firmware (antiguo)/` sí tiene contenido (incluye su propio `.git/` anidado)
  pero es legacy explícito — también gitignoreada a propósito, "se deja el contenido en
  disco sin tocar" (commit `2881934`, 2026-08-11).
- El firmware **real, activo y versionado en git** vive en `iot_firmware/javier_1a/`
  (`firmware-esp8266/` + `firmware-esp32cam/`), último commit `fc02dfc` (2026-04-28).

Este documento (Knowledge) y `README_Proyecto.md` ya apuntaban correctamente a
`iot_firmware/` — solo `CLAUDE.md` tiene la ruta vieja. Recomendación: actualizar
`CLAUDE.md` cuando Mauro lo confirme (no se tocó en esta sesión — son instrucciones del
usuario, no documentación técnica).

---

## 🟠 Documentación mal calculada — `readings.csv` nunca fue "8 024 filas de KPCL0034"

Ver detalle completo en [[10_Datasets/README_Datasets]]. Resumen: el archivo local
`Docs/11_Data/2026/readings.csv` (gitignoreado, sin historial git) tiene hoy **1 085 889
filas y 5 dispositivos distintos**, de las cuales 154 857 son de KPCL0034 — vs. las 8 024
documentadas en todo el vault. `readings_rows.csv` tiene el mismo patrón (270 001 filas
totales, 167 959 de KPCL0034, vs. 94 588 documentadas). **No es corrupción reciente**: una
memoria de sesión de hace ~45 días ya registraba el mismo conteo exacto (154 857) para
KPCL0034 — "8 024" fue siempre un número mal calculado en la documentación, probablemente
confundido con un conteo resampleado a 30s en vez de las filas crudas. Los scripts de
`fase_0_ruido/` filtran correctamente por UUID antes de procesar, así que el pipeline de
anotación no está comprometido. Lo que sí queda sin explicar: el device `3c1c6705…` domina
el archivo con 821 785 filas — pendiente de que Mauro confirme contra Supabase qué
dispositivo es y si ese volumen es esperado.

---

## 🟠 Importante — Panel admin: solo 3 rutas reales de 10 documentadas/planeadas

`kittypau_app/src/app/(app)/admin/` tiene 10 subcarpetas. Solo 3 tienen `page.tsx`:
`/admin` (root), `/admin/javo`, `/admin/demo-ingresos`. Las otras 7 (`alerts`, `analytics`,
`devices`, `legacy`, `overview`, `pets`, `settings`) están **completamente vacías** — ni
siquiera un `_components/`. Son 404 reales si se navega ahí. Detalle: [[18_UI/README_UI]].

Además, en este entorno **ninguna de las 2 cuentas de prueba** (`kittypau.mascotas` tester,
`javier.dayne` supuestamente admin) pudo entrar a `/admin` root — ambas terminaron
redirigidas a `/today`. Sí se pudo entrar directo por URL a `/admin/javo` y
`/admin/demo-ingresos`, lo que sugiere que esas 2 subrutas no tienen el mismo gate que la
raíz de `/admin`. No se determinó si `admin_roles` simplemente no tiene seed para
`javier.dayne` en este proyecto de Supabase, o si hay un bug de routing.

---

## 🟠 Importante — Bug confirmado: `/admin/demo-ingresos` → `Missing Authorization header`

Capturado en vivo con Playwright. La página renderiza su tabla vacía pero muestra el error
en rojo antes de la tabla. El fetch client-side a `/api/admin/demo-ingresos` no está
adjuntando el JWT (o corre antes de que el token esté listo). Ver captura y detalle en
[[18_UI/README_UI]].

---

## 🟡 Documentación desactualizada — corregida en esta sesión

| Doc | Qué estaba mal | Corregido |
|---|---|---|
| [[05_API/README_API]] | Faltaban `/api/account/type`, `/api/auth/login`, `/api/onboarding/status`, `/api/registro/status`, `/api/admin/health-check`, `/api/demo/ingreso`, `/api/chatbot-gato`. `/api/devices/category` y `/api/devices/events` estaban documentadas sin el `[id]` que sí tienen en el código real. | ✅ Agregadas y corregidas |
| [[04_Frontend/README_Frontend]] | No mencionaba que 7 de 10 subrutas de `/admin` están vacías, ni que `/client-demo` y `/test` son alias de `/demo` | ✅ Agregado |
| [[18_UI/README_UI]] | Sin verificación en vivo — todo era lectura de código | ✅ Sección completa "Recorrido en vivo verificado" con hallazgos reales de cada pantalla |
| [[08_ESP32/README_ESP32]] | No aclaraba la ruta real en disco del firmware | ✅ Sección de ubicación + tabla de entornos OTA de `platformio.ini` |
| [[01_Proyecto/README_Proyecto]], [[01_Proyecto/ESTADO_ACTUAL]] | Ruta de firmware ambigua, tabla de rutas desactualizada, conteos de investigación en v2.1 (junio) | ✅ Actualizado a snapshot 2026-08-11 |
| [[10_Datasets/README_Datasets]] | Conteos de anotaciones/candidatos en v2.1 (417/421) | ✅ Actualizado a v2.4 (496) + conteo en vivo (527) + discrepancia readings.csv documentada |
| [[15_Resultados/RESULT_AlphaV2_Snapshots]] | Se detenía en v2.1/v2.2 "pendiente" (junio) | ✅ Agregados snapshots v2.3 (fix Evidence Engine, 49.6%→78.8%) y v2.4 (4 mejoras de práctica) |

---

## 🟢 Confirmado correcto — no requirió cambios

- Stack y versiones de dependencias (Next.js 16.1.6, React 19.2.3, Supabase 2.106.1, etc.)
- [[07_MQTT/README_MQTT]] — payloads, tópicos, comandos y versión del bridge (v3.2) coinciden con el código
- [[06_BaseDatos/README_BaseDatos]] — inventario de tablas coincide con las migraciones
- [[09_Sensores/README_Sensores]] — especificación de sensores HX711/AHT10/BH1750
- Estructura de `src/lib/` documentada en [[03_Backend/README_Backend]]
- El comportamiento de degradación observado en vivo (`/today`, `/bowl`, `/story` sin
  romperse cuando faltan vars MQTT o `SUPABASE_ANALYTICS_URL`) coincide exactamente con lo
  que ya documentaba el vault — buena señal de que el código respeta sus propios contratos.

---

## Ver también

- [[AUDITORIA_2026_06_29]] — auditoría anterior (histórica)
- [[18_UI/README_UI]] — recorrido en vivo completo, pantalla por pantalla
- [[10_Datasets/README_Datasets]] — discrepancia de `readings.csv`
- [[08_ESP32/README_ESP32]] — ubicación real del firmware
- [[15_Resultados/RESULT_AlphaV2_Snapshots]] — snapshots v2.3/v2.4 del motor matemático
