---
id: spec_09_fix_bridge_firmware_devicetype
title: SPEC 09 — Fix de causa raíz (bridge + firmware) + mejoras aprovechando el acceso
type: spec
status: pendiente_ejecucion
owner: Mauro
created: 2026-08-14
updated: 2026-08-14
tags:
  - spec
  - bridge
  - firmware
  - device_type
  - bug-critico
  - seguridad
  - handoff
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]]
  - [[29_Specs/SPEC_05_Optimizacion_Tecnica]]
  - [[07_MQTT/README_MQTT]]
  - [[08_ESP32/README_ESP32]]
---

# SPEC 09 — Fix de causa raíz en bridge/firmware + mejoras aprovechando el acceso

> **Handoff para la sesión de Claude Code con acceso real al bridge (Raspberry Pi) y a la
> red del firmware (OTA).** Esta sesión (sin ese acceso) hizo la investigación completa
> leyendo el código fuente de `bridge/` e `iot_firmware/javier_1a/` en el repo — todos los
> hallazgos de abajo están confirmados por lectura directa de código, no son hipótesis.
> Ejecutar en el orden dado: P0 primero (bug activo en producción), el resto son mejoras
> que aprovechan tener la sesión abierta, no bloqueantes entre sí.

---

## 0. Contexto — no re-investigar, ya está confirmado

[[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] encontró que `KPCL0035` (el
bebedero real de Bandida) se guarda en Supabase como `device_type='comedero'` y cualquier
corrección manual se revierte sola en segundos. Esa sesión no tenía acceso a bridge/firmware
y aplicó un parche del lado de lectura en `kittypau_app` (`lib/device-role.ts`). Esta sesión
sí tiene acceso — el objetivo es cerrar el problema en la fuente.

**Causa raíz, confirmada por lectura de código (no supuesta):**

1. `iot_firmware/javier_1a/firmware-esp8266/include/config.h:28`:
   ```c
   #define DEVICE_TYPE "comedero"
   ```
   Sin guard `#ifndef`, a diferencia de `DEVICE_ID` (líneas 25-27, que sí lo tiene). El
   environment `ota_kpcl0035` de `platformio.ini` ya overridea `DEVICE_ID` y `USE_DHT11` vía
   `build_flags`, pero **no puede overridear `DEVICE_TYPE`** porque el `#define` no está
   guardado — cualquier imagen compilada reporta `"comedero"` fijo sin importar el
   environment.

2. `bridge/src/index.js:355`:
   ```js
   if (data.device_type) updateFields.device_type = data.device_type; // guardar valor raw del firmware
   ```
   Escribe el valor crudo recibido por MQTT sin filtro, pisando cualquier corrección manual
   en cada `STATUS` (cada 15s).

3. **Dato nuevo, no confirmado en SPEC_08:** `DEVICE_TYPE_MAP` (`bridge/src/index.js:26-31`,
   mapea `'comedero'→'food_bowl'` / `'bebedero'→'water_bowl'`) está **definido pero no se usa
   en ningún otro punto del archivo** — código muerto, verificado con grep sobre todo
   `bridge/src`. No es que el mapeo esté mal aplicado; simplemente nunca se aplica.

---

## 1. P0 — Bug crítico activo en producción (hacer primero)

### 1.1 Bridge — impedir que se pise la clasificación manual

En `bridge/src/index.js`, cerca de la línea 355, agregar un override explícito antes de
escribir `device_type` (mismo patrón que `DEVICE_TYPE_OVERRIDES` de
`kittypau_app/src/lib/device-role.ts` — no reinventar la heurística, espejarla del lado del
bridge):

```js
// Corrige clasificaciones que el firmware reporta mal en origen (ver SPEC_09).
// Mismo criterio que kittypau_app/src/lib/device-role.ts — mantener sincronizados.
const DEVICE_TYPE_MANUAL_OVERRIDE = { KPCL0035: 'water_bowl' };

// línea 355, reemplazar:
if (data.device_type) {
  updateFields.device_type = DEVICE_TYPE_MANUAL_OVERRIDE[deviceId] ?? data.device_type;
}
```

Deploy en la Raspberry:
```bash
cd /home/kittypau/kittypau-bridge
git pull && npm install
sudo systemctl restart kittypau-bridge
```
Nota (ya documentada en [[29_Specs/SPEC_05_Optimizacion_Tecnica]]): el restart borra
`deviceState`/`petBaseline` en memoria de `processor.js` — si hay una sesión de
alimentación/hidratación abierta en ese momento, se pierde. Hacerlo en ventana de baja
actividad si se puede, no es bloqueante.

**Verificar:** query directa a `devices` un par de minutos después, confirmar que
`device_type` de KPCL0035 se mantiene en `water_bowl` (antes volvía a `comedero` en
segundos).

### 1.2 Firmware — corregir en la fuente (requiere acceso físico/OTA)

a. `config.h:25-28` — guardar `DEVICE_TYPE` igual que `DEVICE_ID`:
   ```c
   #ifndef DEVICE_TYPE
   #define DEVICE_TYPE "comedero"
   #endif
   ```

b. `platformio.ini`, agregar a `[env:ota_kpcl0035]`:
   ```ini
   build_flags = -D DEVICE_ID=\"KPCL0035\" -D USE_DHT11 -D DEVICE_TYPE=\"bebedero\"
   ```

c. Compilar sin subir primero: `pio run -e ota_kpcl0035` — confirmar que compila limpio.

d. **Verificar la IP antes de flashear** — `upload_port = 192.168.100.95` en el archivo
   puede estar desactualizada (DHCP). Confirmar contra `devices.wifi_ip` en Supabase o el
   log del bridge antes de subir a ciegas.

e. OTA real: `pio run -e ota_kpcl0035 -t upload`. Confirmar en el próximo `STATUS` que
   `device_type` llega como `"bebedero"`.

Con 1.1 aplicado, 1.2 es la corrección definitiva pero no urgente en el mismo minuto — el
override del bridge ya deja el dato correcto en Supabase. Aun así, hacerla: mientras el
firmware siga sin el guard, cualquier reflasheo futuro de KPCL0035 (o de otro device que
necesite `bebedero`) vuelve a pisar `device_type` sin que el override lo cubra si cambia el
`deviceId`.

---

## 2. P0.5 — Hallazgo nuevo: el analytics processor hereda el mismo bug

**No estaba en el alcance de SPEC_08** porque esa sesión no leyó `bridge/src/processor.js`
(el override en `kittypau_app` no lo toca — son dos deployables distintos).

`bridge/src/processor.js:129`:
```js
const deviceType = deviceMeta?.device_type === 'water_bowl' ? 'water' : 'food';
```
Esto decide si una sesión detectada por la state machine se guarda en `pet_sessions` /
`pet_daily_summary` como `session_type: 'food'` o `'water'`. Como `deviceMeta.device_type`
viene directo de `devices` (mismo dato roto de SPEC_08), **toda sesión de KPCL0035 se viene
guardando como `'food'` en vez de `'water'` desde que el bebedero está activo** — el
`grams_consumed`/`water_ml` y el baseline de Z-score de Bandida en la analytics DB están
mezclando comida y agua bajo la etiqueta "food".

**Con el fix de §1.1 aplicado, esto se corrige hacia adelante automáticamente** (processor.js
no necesita cambios de código, solo el dato de origen correcto). Lo que **no** se corrige
solo: las sesiones **ya insertadas** en `pet_sessions`/`pet_daily_summary` con
`device_id=KPCL0035` y `session_type='food'` quedan mal etiquetadas históricamente.

**No corregir esto con un UPDATE automático** — es una decisión de datos, no un fix de
código (mismo criterio que SPEC_08 aplicó para el UPDATE en `devices`: pedir confirmación
explícita antes de escribir en tablas de producción). Reportarle a Mauro:
- Cuántas filas de `pet_sessions` tienen `device_id` = UUID de KPCL0035 y
  `session_type='food'` desde que se reconectó (10-ago-2026, ver
  [[09_Sensores/README_Sensores]]).
- Si corresponde, un `UPDATE pet_sessions SET session_type='water' WHERE ...` + recalcular
  `pet_daily_summary` de esas fechas — **solo con autorización explícita de Mauro,** como en
  SPEC_08 §4.

---

## 3. P1 — Seguridad (no negociable según CLAUDE.md, hallazgos concretos)

### 3.1 Bridge: TLS sin verificar certificado

`bridge/src/index.js:114`:
```js
const mqttOptions = {
  ...
  rejectUnauthorized: false
};
```
El firmware **sí** valida el certificado correctamente (carga el CA root de Let's Encrypt
vía `net.setTrustAnchors()` en `mqtt_manager.cpp:51,144`) — el bridge es el lado más débil
del mismo canal TLS. `rejectUnauthorized: false` desactiva la verificación de certificado,
exponiendo a MITM en la conexión bridge↔HiveMQ.

**Fix:** quitar `rejectUnauthorized: false` (o ponerlo en `true` explícito) y probar la
conexión — HiveMQ Cloud usa certificados válidos estándar, no debería requerir el bypass.
Si al hacerlo la conexión falla, investigar por qué antes de revertir (no asumir que el
bypass es necesario sin confirmarlo).

### 3.2 Firmware: credenciales WiFi en texto plano en el código fuente

`wifi_manager.cpp:37-43` — lista hardcodeada de SSID/password de múltiples redes (incluye
redes personales, ej. `"Mauro"/"mauro1234"`) committeada en el repo git. No es un bug nuevo
de esta sesión, es una decisión de diseño existente (red de fallback para que el device
siempre pueda conectar) — **flag para decisión de Mauro, no cambio automático**: sacar estas
credenciales del código fuente rompe la conectividad de fallback en devices que no tengan
ya guardadas esas redes en `/wifi.json` de LittleFS. Si se decide sacarlas, la vía segura es
moverlas a `build_flags`/variable de entorno de build (no committeada) y no como constante
en `config.h`/`wifi_manager.cpp`.

---

## 4. P2 — Deuda técnica ya identificada en SPEC_05, ahora ejecutable

[[29_Specs/SPEC_05_Optimizacion_Tecnica]] ya scopeó esto sin poder ejecutarlo (sin acceso al
bridge). Con acceso ahora:

**`bridge/src/processor.js`: `deviceState`/`petBaseline` son `Map()` en memoria** — se
pierden en cada `systemctl restart`. Fix sin sobre-ingeniería: persistir ambos como JSON en
disco local de la Pi (`fs.writeFileSync` cada N segundos o en `SIGTERM`) y recargar al
arrancar. Esfuerzo M, impacto medio (solo se manifiesta en el momento exacto de un restart,
pero pierde datos silenciosamente — y §1.1 de este spec requiere justo un restart).
Considerar hacer esto **antes** del restart de §1.1 si el esfuerzo es bajo, para no perder
una sesión abierta con el mismo deploy.

---

## 5. P3 — Housekeeping (opcional, bajo riesgo)

- **`DEVICE_TYPE_MAP` en `bridge/src/index.js:26-31`** — código muerto (§0.3). Con el fix de
  §1.1 aplicado, decidir: usarlo (reemplazar el override puntual por una traducción
  español→enum genérica + el override manual encima) o borrarlo. No dejarlo como código
  muerto que confunda a la próxima persona que lea el archivo pensando que ya traduce
  `'comedero'/'bebedero'`.
- **Versión del bridge en docs** — [[07_MQTT/README_MQTT]] dice que `package.json` marca
  `"2.4.0"` desactualizado. Verificado en esta sesión: `bridge/package.json` ya dice
  `"3.2.0"`, coincide con el `console.log` de `index.js:118`. **La inconsistencia ya no
  existe en código** — es la doc de Knowledge la que quedó vieja. Actualizar
  [[07_MQTT/README_MQTT]] quitando esa nota de "⚠️ Inconsistencia de versiones" cuando se
  confirme.

---

## 6. Lo que se revisó y NO tiene bugs (no tocar sin motivo)

`main.cpp`, `sensors.cpp`, `wifi_manager.cpp` (lógica de reconexión/captive portal),
`captive_portal.cpp` del firmware ESP8266, y el resto de `bridge/src/index.js` (auto-registro
de devices, IP history, power events, cola de comandos, heartbeats) — código sólido, sin
hallazgos. `firmware-esp32cam/` no se auditó a fondo: el propio Knowledge lo marca como
"funcional pero no integrado activamente en el producto principal" — no vale el esfuerzo
sin un motivo concreto para tocarlo (YAGNI).

---

## 7. Checklist de cierre

- [ ] §1.1 bridge override deployado y verificado (device_type no vuelve a `comedero`)
- [ ] §1.2 firmware reflasheado y verificado (STATUS reporta `bebedero`)
- [ ] §2 reportado a Mauro con conteo real de filas afectadas, esperar decisión antes de UPDATE
- [ ] §3.1 `rejectUnauthorized` corregido y conexión MQTT confirmada estable
- [ ] §3.2 decisión de Mauro registrada (mantener o migrar credenciales)
- [ ] §4 persistencia de estado implementada (o explícitamente diferida)
- [ ] §5 decisión sobre `DEVICE_TYPE_MAP` tomada
- [ ] Actualizar [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] §6 marcando los
      pendientes 1(a)/1(b) como resueltos, con fecha
- [ ] Actualizar este doc (`status: pendiente_ejecucion` → `ejecutado`) con lo que
      efectivamente se hizo vs. lo que quedó diferido

---

## Ver también

- [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] — de donde sale este spec
- [[29_Specs/SPEC_05_Optimizacion_Tecnica]] — deuda técnica de bridge ya perfilada
- [[07_MQTT/README_MQTT]] — arquitectura del bridge y payloads MQTT
- [[08_ESP32/README_ESP32]] — firmware, environments de PlatformIO
- [[09_Sensores/README_Sensores]] — roster de devices, identidad KPCL0034/0035/0036
