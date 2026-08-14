---
id: spec_10_vinculacion_dispositivo_lista_real
title: SPEC 10 — Vincular dispositivo eligiendo de la lista real (Supabase), no tipeando un código
type: spec
status: draft
owner: Mauro
created: 2026-08-14
updated: 2026-08-14
tags:
  - spec
  - registro
  - dispositivos
  - onboarding
  - kittypau_app
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_06_Mobile_APK_2026]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
  - [[06_BaseDatos/README_BaseDatos]]
---

# SPEC 10 — Vincular dispositivo eligiendo de la lista real, no tipeando un código

> Pedido de Mauro (2026-08-14): el paso de "vinculación del dispositivo" pasa **en el
> registro, al momento de crear el usuario** (`registro-flow.tsx`, paso 3). Hoy pide
> tipear un código `KPCL0000` a mano. Como **todavía no lanzamos la app a clientes
> nuevos**, la lista de dispositivos no es infinita ni desconocida — es la lista real y
> acotada de lo que ya existe en `devices` de Supabase. El paso debe mostrar esa lista,
> no pedir que se tipee un código a ciegas.

---

## 0. Dónde está exactamente (confirmado por lectura de código)

Dos lugares con el mismo patrón, no uno solo:

1. **`registro-flow.tsx` — paso 3 "Dispositivo"** (líneas 1269-1470): es el flujo real
   que corre **al crear una cuenta nueva** (`saveDevice()`, línea 644). Campo `device_id`
   es un `<input type="text">` libre con solo validación de formato por regex
   (`/^KPCL\d{4}$/`, línea 221) — no contra dispositivos reales.
2. **`dispositivos/nuevo/page.tsx`** (`/dispositivos/nuevo`, accesible desde Ajustes) —
   mismo patrón exacto, mismo regex, para agregar un dispositivo adicional a una cuenta
   ya existente.

Ambos terminan llamando a `POST /api/devices` → RPC `link_device_to_pet`
(`supabase/migrations/20260524000000_fix_link_device_to_pet_ambiguity.sql`).

---

## 1. Por qué "tipear el código" no es solo peor UX — es un riesgo de datos

`link_device_to_pet` hace un **`insert` puro** (líneas 41-46 de la migración), no un
`upsert`/`on conflict`. Los dispositivos reales (KPCL0031...KPCL0041) ya existen como
filas en `devices` **antes** de que cualquier usuario los vincule — el bridge los
auto-registra la primera vez que reportan por MQTT (`ensureDeviceExists()` en
`bridge/src/index.js`, ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]), con
`owner_id = null` y `device_state = 'factory'`.

Si un usuario tipea a mano un código que coincide con un device que **ya tiene fila**
(porque el bridge lo auto-registró), el `insert` de `link_device_to_pet`:
- Si `device_id` sigue teniendo constraint único (era `device_code unique` en el schema
  original de `20260208134653_apply_schema_update.sql` — **no se encontró en esta sesión
  la migración que lo renombra a `device_id`**, verificar directo en el dashboard de
  Supabase antes de asumir que sigue ahí) → falla con un error de Postgres genérico que
  hoy se muestra como "no se pudo registrar el dispositivo", sin explicar por qué.
- Si el constraint no sobrevivió el rename → **crea una segunda fila con el mismo
  `device_id`** para el mismo hardware físico — dos registros de `devices` apuntando al
  mismo KPCL, uno auto-registrado por el bridge (sin dueño) y otro reclamado por el
  usuario, con UUIDs distintos. Cualquier lugar que use `devices.id` (no `device_id`) como
  FK —`readings`, `pet_sessions`, etc.— quedaría partido entre las dos filas.

**No se confirmó cuál de los dos casos es el actual** — queda como paso de verificación
antes de tocar código (§4).

---

## 2. La corrección real: elegir de la lista, no tipear

Con la lista real en vez de un input libre, el problema de §1 se resuelve de raíz: en vez
de "insertar un `device_id` que el usuario escribió", el flujo pasa a ser "elegir una fila
que ya existe y actualizarla" (`UPDATE ... WHERE id = <uuid elegido>`, no `INSERT`). Mismo
principio que ya se aplicó en otras partes del proyecto (upserts con `on conflict`) — acá
el fix de UX y el fix de integridad de datos son el mismo cambio.

### 2.1 — Endpoint nuevo (o casi): lista de dispositivos disponibles para vincular

Ya existe el query shape correcto en `api/admin/overview/route.ts` (líneas 530-534,
560-570) — lista `devices` completo sin filtrar por `owner_id`, con `service_role`
(`supabaseServer`, bypassa RLS). Reusar el mismo patrón, no inventar uno nuevo:

```ts
// GET /api/devices/available — dispositivos sin dueño, listos para vincular
supabaseServer
  .from("devices")
  .select("id, device_id, device_type, device_state, last_seen")
  .is("owner_id", null)
  .is("retired_at", null)
  .order("device_id", { ascending: true });
```

Proyección mínima a propósito — no exponer `wifi_ip`/`battery_*`/etc. a un usuario que
todavía no es dueño del device. Requiere auth (cualquier usuario logueado, no solo admin —
a diferencia de `admin/overview` esto no es una ruta de administración).

### 2.2 — UI: reemplazar el `<input>` de código por un `<select>`/lista con estado

En ambos lugares (`registro-flow.tsx` paso 3, `dispositivos/nuevo/page.tsx`):
- Reemplazar el campo de texto libre por un `<select>` poblado desde 2.1.
- Mostrar el indicador de estado 🟢🔴⚫ ya usado en el resto de la app (online si
  `last_seen` reciente, ver umbral de 3 min de `bridge/src/index.js:OFFLINE_THRESHOLD_MS`)
  junto a cada opción — ayuda a elegir el device correcto si hay varios sin reclamar.
- Si la lista viene vacía (todos los devices ya tienen dueño), mostrarlo explícito: "No
  hay dispositivos disponibles para vincular" en vez de un select vacío silencioso.

### 2.3 — Backend: `link_device_to_pet` pasa a recibir el UUID existente, no reinsertar

Cambiar el RPC (o agregar una variante) para que reciba `p_device_uuid` (el `id` elegido
de la lista) en vez de re-insertar por `device_id` texto:

```sql
update public.devices
set owner_id = p_owner_id,
    pet_id = p_pet_id,
    device_type = p_device_type,
    status = p_status,
    device_state = 'linked'
where id = p_device_uuid
  and owner_id is null  -- evita robar un device que otro usuario reclamó en la carrera
returning *;
```

Si el `update` no afecta filas (alguien más lo reclamó primero, o ya no está disponible),
devolver un error explícito ("Este dispositivo ya fue vinculado por otra cuenta") en vez
del insert ciego actual.

---

## 3. Qué NO cambia (alcance acotado a propósito)

- El formato `KPCL0000` y su validación siguen existiendo — solo pasa de ser la fuente de
  verdad (usuario la escribe) a ser metadata mostrada junto a cada opción de la lista.
- `/bowl` (gestión de WiFi de respaldo, tare, interval) no se toca — ya opera sobre
  dispositivos ya vinculados, fuera del alcance de este spec.
- El gap de emparejamiento físico WiFi (captive portal del firmware) que quedó anotado en
  [[29_Specs/SPEC_06_Mobile_APK_2026]] (sección "Gap real: emparejamiento físico...") es un
  problema **distinto y de menor urgencia ahora**: WiFi es device↔router (conectividad),
  esto es device↔usuario (propiedad/datos). Sin clientes nuevos provisionando hardware
  propio todavía, ese gap importa cuando haya lanzamiento; este spec importa ya, porque
  Mauro y los testers usan `registro-flow.tsx` hoy.

---

## 4. Antes de escribir código

- [ ] Confirmar en el dashboard de Supabase (o `\d devices` por psql) si `device_id`
      sigue con constraint único tras el rename desde `device_code` — determina si el bug
      de §1 hoy falla ruidoso o crea filas duplicadas silenciosas. Si hay duplicados ya
      existentes, hay que auditar `devices` por `device_id` repetido antes de asumir que
      cada código tiene una sola fila.
- [ ] Confirmar cuántos dispositivos de la lista real hoy (`KPCL0031...KPCL0041`, ver
      [[09_Sensores/README_Sensores]]) ya tienen `owner_id` asignado — si son casi todos,
      la lista "disponibles para vincular" puede salir casi vacía y hay que decidir si
      además se necesita una vista de "reasignar" (mover un device de un dueño a otro),
      que es un caso distinto no cubierto por este spec.

---

## 5. Priorización

| # | Item | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Verificación de §4 (constraint + estado real de `owner_id`) | XS | Bloquea el resto — hacer primero |
| 2 | Endpoint `GET /api/devices/available` (§2.1) | S | Alto — sin esto no hay lista que mostrar |
| 3 | UI: `<select>` con estado en `registro-flow.tsx` + `dispositivos/nuevo/page.tsx` (§2.2) | S-M | Alto — es lo que Mauro pidió |
| 4 | RPC `link_device_to_pet` → `update` por UUID en vez de `insert` (§2.3) | S | Alto — cierra el riesgo de duplicados de raíz |

---

## Ver también

- [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] — cómo se auto-registran los devices
  desde el bridge antes de que cualquier usuario los reclame
- [[29_Specs/SPEC_06_Mobile_APK_2026]] — gap de emparejamiento físico WiFi, distinto y
  menos urgente que este
- [[06_BaseDatos/README_BaseDatos]] — schema de `devices` y RLS
- [[09_Sensores/README_Sensores]] — roster real de dispositivos KPCL
