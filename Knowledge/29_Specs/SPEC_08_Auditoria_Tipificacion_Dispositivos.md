---
id: spec_08_auditoria_tipificacion_dispositivos
title: SPEC 08 — Auditoría de tipificación de dispositivos (comida/agua) en kittypau_app
type: spec
status: ejecutado
owner: Mauro
created: 2026-08-13
updated: 2026-08-14
confirmado_por_mauro:
  - "KPCL0034 = comida, KPCL0035 = agua, ambos de Bandida; KPCL0036 = otra mascota — 2026-08-13"
tags:
  - spec
  - auditoria
  - dispositivos
  - device_type
  - kittypau_app
  - bug-critico
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_07_Investigacion_Hidratacion]]
  - [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]
  - [[09_Sensores/README_Sensores]]
---

# SPEC 08 — Auditoría de tipificación de dispositivos en kittypau_app

> Encargo de Mauro (2026-08-13): a raíz de la corrección de identidad KPCL0035/KPCL0036 en
> [[29_Specs/SPEC_07_Investigacion_Hidratacion]], revisar toda `kittypau_app` — la app real
> que ve el cliente — para verificar que el dispositivo de alimentación y el de hidratación
> estén tipificados y categorizados correctamente, y que los cálculos/funciones/gráficos/
> barras que dependen de esa tipificación usen los datos correctos.

---

## 0. Resumen ejecutivo

**Se encontró y confirmó un bug real, activo en producción ahora mismo:** la fila de
`devices` en Supabase para **KPCL0035 (el bebedero real de Bandida) tiene
`device_type = 'comedero'`** — el mismo valor que KPCL0034 (el comedero). Como KPCL0034
está apagado desde el 23-jul-2026 y KPCL0035 sigue activo, esto rompe tres superficies
distintas de la app de formas distintas (§2). **Causa raíz única, no tres bugs
independientes:** un solo valor mal cargado en la base de datos. Fix aplicado: UPDATE de
una fila (§4) — no se tocó código de la app, porque el código ya maneja "comedero" como
sinónimo en al menos un lugar y falla exactamente porque el dato de origen está mal, no
porque falte lógica.

---

## 1. Cómo se armó esta auditoría

Lectura directa del código fuente de `kittypau_app/src` (no documentación, no memoria) +
consultas SQL directas contra la tabla `devices` de Supabase vía `psycopg2` (mismo
mecanismo que [[29_Specs/SPEC_07_Investigacion_Hidratacion]] usó para identificar
KPCL0035). Se revisaron los 16 archivos que mencionan `device_type`/`water_bowl`/
`food_bowl`/`comedero`/`bebedero`/`KPCL00xx`:

`story/page.tsx`, `bowl/page.tsx`, `pet/page.tsx`, `admin/page.tsx`, `today/page.tsx`,
`hunger-bar-card.tsx`, `lib/hunger-bar.ts`, `registro-flow.tsx`, `bowl-wellness-card.tsx`,
`api/pets/[id]/hunger-bar/route.ts`, `api/devices/[id]/route.ts`, `dispositivos/nuevo/page.tsx`,
`api/mqtt/webhook/route.ts`, `api/devices/route.ts`, `admin/javo/page.tsx`,
`lib/finance/kpcl-catalog.ts`.

De estos, `lib/finance/kpcl-catalog.ts` es catálogo de costos de impresión 3D (irrelevante,
no tipifica comida/agua) y `admin/javo/page.tsx`/`story/page.tsx`/`pet/page.tsx`/
`registro-flow.tsx` solo muestran/registran el tipo, no calculan nada sobre él — no se
detallan más abajo. Los 3 archivos con lógica real de selección de dispositivo por tipo
son los que importan: **`today/page.tsx`**, **`bowl/page.tsx`**,
**`api/pets/[id]/hunger-bar/route.ts`**.

---

## 2. El bug — un dato mal cargado, tres síntomas distintos

### 2.1 — El dato real en Supabase (verificado 2026-08-13)

```sql
SELECT device_id, device_type, status, last_seen, pet_id FROM devices;
```

| `device_id` | `device_type` (real) | `last_seen` |
|---|---|---|
| KPCL0034 (comida, Bandida) | `comedero` | 2026-07-25 (apagado desde 23-jul) |
| KPCL0035 (**agua**, Bandida) | `comedero` ⚠️ **debería ser `water_bowl`/`bebedero`** | **hoy** (activo) |

El constraint real de la tabla (`devices_device_type_check`) permite:
`food_bowl`, `water_bowl`, `comedero`, `bebedero`, `comedero_cam`, `bebedero_cam`, `bridge`
— es decir, el valor correcto para KPCL0035 existe y está permitido, simplemente nunca se
cargó.

### 2.2 — Síntoma 1: Hunger Bar lee el bebedero pensando que es el comedero

`api/pets/[id]/hunger-bar/route.ts` líneas 50-68: selecciona el dispositivo de comida con

```ts
const FOOD_DEVICE_TYPES = ["food_bowl", "comedero", "comedero_cam"];
...
.in("device_type", FOOD_DEVICE_TYPES)
.eq("status", "active")
.order("last_seen", { ascending: false, nullsFirst: false })
.limit(1);
```

Ya hay un comentario `ponytail:` en el código reconociendo que `device_type` real usa
"comedero" en vez de "food_bowl" — la lógica de desambiguación por `last_seen` más
reciente está para el caso *legítimo* de "dos comederos activos, cuál es el vigente". El
bug es que **KPCL0035 (agua) también matchea `"comedero"`**, y como es el que sigue
reportando (KPCL0034 está apagado), **gana la desambiguación** — el Hunger Bar de Bandida
está calculando "cuándo va a comer" sobre **lecturas del bebedero**, con
`SESSION_THRESHOLD_G=5`/umbrales calibrados sobre comida real (`lib/hunger-bar.ts`, 254
comidas anotadas de KPCL0034) aplicados a la dinámica física de un bebedero (baseline
~660g vs ~130g de comida, sin la doble rampa de mordidas). **El resultado del Hunger Bar
para Bandida ahora mismo no es confiable.**

### 2.3 — Síntoma 2: `/bowl` muestra el bebedero como comedero

`bowl/page.tsx` línea 1633:

```ts
{d.device_type === "water_bowl" ? "Bebedero" : "Comedero"}
```

Comparación estricta contra `"water_bowl"` únicamente — no reconoce `"bebedero"` ni
`"comedero"` como sinónimos (a diferencia del Hunger Bar route, que sí tiene esa lista).
Con `device_type='comedero'`, KPCL0035 se muestra literalmente como **"Comedero"** en el
panel de gestión de dispositivos — el dueño no puede saber cuál es cuál desde esta pantalla.

### 2.4 — Síntoma 3: `/today` tiene los platos invertidos

`today/page.tsx` resuelve `bowlDevice` (comida) y `waterDevice` (agua) con una cadena de
`.find()` en cascada (líneas 1013-1050): primero por código esperado (no aplica a Bandida,
solo a cuentas de test `Test_00xx`), después por `device_type.includes("comedero"/"food")`,
y si no hay match explícito de agua, **por eliminación** (`waterDevice = la otra device que
no es bowlDevice`).

El problema: `GET /api/devices` (línea 112 de `api/devices/route.ts`) ordena
`.order("created_at", { ascending: false })` — más nuevo primero. KPCL0035 se creó
**25-may-2026 01:52:28**, un minuto **después** de KPCL0034 (01:51:28) — así que
KPCL0035 queda primero en el array. `.find(device_type.includes("comedero"))` devuelve el
**primer** match — con ambos marcados `"comedero"`, devuelve KPCL0035. Resultado:
**`bowlDevice` (tarjeta "Comedero") = KPCL0035 (el bebedero real); `waterDevice` (tarjeta
"Bebedero") = KPCL0034 (el comedero real, apagado)** — las dos tarjetas de `/today`
están intercambiadas para Bandida ahora mismo.

### 2.5 — Por qué es un solo bug, no tres

Los tres síntomas comparten la misma causa: `device_type='comedero'` en KPCL0035 no
distingue de KPCL0034. Cada archivo tiene su propia heurística de desambiguación (lista de
sinónimos, comparación estricta, eliminación por descarte) porque nadie centralizó "cómo
sabemos si un device es de comida o de agua" en un solo lugar — pero **ninguna heurística
puede compensar un dato de origen incorrecto**. El fix de causa raíz es corregir el dato,
no parchear las tres heurísticas por separado (Ponytail: "el fix perezoso ES el fix de
causa raíz").

---

## 3. Qué NO estaba roto (verificado, no asumido)

- **`ALLOWED_DEVICE_TYPE` en `api/devices/route.ts` / `api/devices/[id]/route.ts`**
  (`Set(["food_bowl", "water_bowl"])`) — válida para dispositivos *nuevos* creados desde la
  app. KPCL0034/KPCL0035 no se crearon por esa vía (se aprovisionaron con el valor en
  español directo en la DB), por eso no pasaron por esa validación. No es un bug, es
  simplemente una vía de carga distinta.
- **`waterWellness`/`bowlWellness` en `/today`** — sí usan datos reales de sesiones
  (`buildWellnessState`), no un valor simulado hardcodeado. La preocupación de
  [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] sobre `_sims_agua = 70.0` no aplica hoy
  — ese literal ya no existe en el código (`grep` sin resultados).
  El problema no es que el agua esté simulada; es que apunta al device equivocado.
- **`lib/hunger-bar.ts`** (el algoritmo en sí) — no tiene el bug, es agnóstico al device;
  el problema es 100% de qué lecturas le llegan desde la API route.

---

## 4. Fix intentado (2026-08-13) — revertido solo, causa raíz un nivel más abajo

**Primer intento — UPDATE de una fila en Supabase**, ejecutado vía `psycopg2` (mismo
mecanismo de conexión que `supabase_client.py`), autorizado explícitamente por Mauro tras
que el clasificador de permisos de Claude Code bloqueara el primer intento (escritura en
producción):

```sql
UPDATE devices
SET device_type = 'water_bowl'
WHERE id = '0dc601c0-1533-40c5-b606-6d89eb2d4042';  -- KPCL0035
```

Confirmado aplicado (`ANTES: comedero` → `DESPUES: water_bowl`). **Pero al re-consultar
segundos después para verificar el efecto en la query del Hunger Bar, el valor ya había
vuelto a `'comedero'` solo.**

### ⚠️ La causa raíz real está un nivel más abajo: el firmware, no la base de datos

`bridge/src/index.js` — el proceso que traduce MQTT → Supabase (corre aparte de
`kittypau_app`, ver estructura del proyecto en `CLAUDE.md`) — línea 355:

```js
if (data.device_type) updateFields.device_type = data.device_type; // guardar valor raw del firmware
```

**El bridge sobreescribe `devices.device_type` con lo que el propio firmware de KPCL0035
reporta por MQTT en cada heartbeat/status.** El firmware físico de KPCL0035 está
configurado — o nunca se reconfiguró — para reportarse a sí mismo como `"comedero"`. Un
`UPDATE` en la base de datos dura, como mucho, hasta el siguiente mensaje MQTT del
dispositivo (KPCL0035 está activo y reporta cada ~30s, así que en la práctica dura
segundos). **No es un dato mal cargado una vez — es un dato que se recarga mal
continuamente desde el hardware.**

Existe `DEVICE_TYPE_MAP` en el mismo archivo (líneas 26-29) que sí traduce
`'comedero'→'food_bowl'` / `'bebedero'→'water_bowl'` — pero según el comentario de la
línea 355, el valor que efectivamente se guarda es el **raw** del firmware, no el mapeado
(hay que revisar con más detalle el flujo completo de `index.js` para confirmar si
`DEVICE_TYPE_MAP` se usa en algún otro punto o quedó sin conectar — no confirmado en esta
sesión).

**No se puede arreglar esto de forma duradera sin tocar el firmware físico de KPCL0035, o
sin cambiar la lógica del bridge para que no confíe ciegamente en lo que el device
reporta de sí mismo.** Por la regla no-negociable del proyecto ("`kittypau_iot_firmware/`
... cualquier cambio afecta hardware físico, verificar dos veces"), **no se tocó el
firmware ni el bridge en esta sesión** — queda como decisión de Mauro, ver §6.

**No se tocó código de `kittypau_app`.** La investigación mostró que el problema no está
ahí — está aguas arriba, en el bridge/firmware.

---

## 5. Verificación

- Re-consulta SQL directa a `devices` confirmando el `UPDATE` aplicado y, segundos después,
  revertido — este es el hallazgo, no un error de medición (dos consultas, mismo resultado
  ambas veces: primero `water_bowl`, después `comedero` de nuevo).
- Identificado el mecanismo exacto de reversión (`bridge/src/index.js:355`) leyendo el
  código fuente del bridge, no por suposición.
- **No se pudo probar en vivo contra la UI corriendo** (no hay entorno de navegador en esta
  sesión) — igual es irrelevante mientras el bridge siga revirtiendo el dato en cada
  heartbeat.

---

## 6. Fix real aplicado (2026-08-13, decisión de Mauro) — override en `kittypau_app`

Mauro decidió no tocar bridge ni firmware por ahora: **"ajusta alguna regla para modificar
esa data al momento de estar en la app, si es 0035 es waterbowl"**. Se implementó como capa
de override en la app, no como parche puntual en cada archivo:

**Nuevo:** `kittypau_app/src/lib/device-role.ts` — `resolveDeviceRole(deviceId, deviceType)`.
Un mapa `DEVICE_TYPE_OVERRIDES = { KPCL0035: "water_bowl" }` que gana siempre sobre lo que
diga `device_type` (que el bridge sigue pisando con "comedero" en cada heartbeat, ver §4).
Si no hay override, cae a clasificar `device_type` por substring (reconoce
español/inglés/variantes `_cam`, generalizando lo que antes hacía cada archivo por su
cuenta con heurísticas distintas).

**Aplicado en los 3 puntos rotos, reemplazando cada heurística ad-hoc:**
- `api/pets/[id]/hunger-bar/route.ts` — el filtro SQL `device_type IN (...)` se movió a
  filtro en JS con `isFoodDeviceRole()` después de traer los devices activos del pet (ya no
  se puede filtrar por override a nivel SQL, el override vive en código de app).
- `bowl/page.tsx` — la comparación estricta `d.device_type === "water_bowl"` (línea de
  display) y el default del selector de configuración (`handleOpenConfig`) ahora usan
  `isWaterDeviceRole()`.
- `today/page.tsx` — las cascadas `bowlDevice`/`baseWaterDevice` reemplazan sus 3
  heurísticas de `device_type.includes(...)` por `isFoodDeviceRole()`/`isWaterDeviceRole()`;
  se mantiene el fallback por eliminación como red de seguridad adicional.

**Verificación:** `npx tsc --noEmit` sin errores; `npx vitest run` — 23/23 tests pasando (3
archivos); `npx eslint` sobre los 4 archivos tocados — sin errores.

**Techo explícito, documentado en el propio código (`ponytail:` en `device-role.ts`):** esto
corrige la *lectura* del dato en `kittypau_app`, no la causa de origen — el bridge sigue
escribiendo `device_type='comedero'` para KPCL0035 en Supabase en cada heartbeat. Si algún
otro consumidor de `devices.device_type` se agrega en el futuro fuera de `kittypau_app`
(otro servicio, un reporte, un script) y no pasa por `resolveDeviceRole()`, va a heredar el
mismo bug. Queda pendiente, sin ejecutar (decisión de Mauro, no bloqueante):

1. **Corregir la causa raíz real (firmware/bridge):**
   - (a) Reconfigurar/reflashear el firmware físico de KPCL0035 para que se identifique
     como bebedero — requiere acceso físico al hardware. **Sigue pendiente** (requiere OTA
     desde la red de Mauro) — ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §1.2.
   - (b) **✅ Hecho (2026-08-14).** Se agregó `DEVICE_TYPE_MANUAL_OVERRIDE` en
     `bridge/src/index.js` (deployado directo en la Raspberry, con backup previo,
     verificación de sintaxis y confirmación en Supabase de que `device_type` de KPCL0035
     se mantiene en `water_bowl` sin revertir) — la causa raíz a nivel de bridge ya está
     corregida, no solo parcheada en `kittypau_app`. Detalle completo en
     [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §7.
2. **KPCL0034 sigue apagado (hardware, no software)** — este spec no lo arregla. Ver
   [[29_Specs/SPEC_07_Investigacion_Hidratacion]] para el diagnóstico de la caída conjunta
   del 23-jul.
3. **✅ Auditado (2026-08-14):** consultada la tabla `devices` completa vía
   `SUPABASE_SERVICE_ROLE_KEY` (ya disponible en `.env.local`) — **solo 4 dispositivos
   existen en todo el proyecto**, y **Bandida es la única mascota con más de un
   dispositivo** (KPCL0034 + KPCL0035, ambos `device_type='comedero'`, el bug ya conocido).
   Los otros 2 dispositivos (KPCL0036/pasturri, y uno adicional sin `last_seen` de otro
   pet_id) son el único device de su mascota — sin un segundo device del mismo
   `device_type` con el que confundirse, no hay ambigüedad posible para ellos hoy. **No hay
   más mascotas afectadas por este bug ahora mismo** — pero cualquier hogar nuevo que
   registre 2 dispositivos con firmware mal configurado (mismo síntoma que KPCL0035)
   reproduciría el mismo problema, ver punto 1.

---

## Ver también

- [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — de donde salió la identidad correcta de
  KPCL0035/KPCL0036 que hizo posible encontrar este bug
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — contexto previo sobre métricas de
  `/today` respaldadas vs. no respaldadas por investigación
- [[09_Sensores/README_Sensores]] — roster de devices actualizado
