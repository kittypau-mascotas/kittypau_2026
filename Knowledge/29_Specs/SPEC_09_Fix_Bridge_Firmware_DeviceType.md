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

## -1. Tareas para ejecutar desde la PC de Mauro (2026-08-14 — confirmado de forma independiente por 2 sesiones)

> Dos sesiones distintas verificaron esto por separado el mismo día y llegaron a la misma
> conclusión desde ángulos diferentes: una (PC de Javier) se conectó de verdad por SSH a la
> Raspberry; la otra (PC de Mauro) confirmó por `git log` que `bridge/src/index.js`,
> `config.h` y `platformio.ini` no tienen commits desde que se escribió este spec. **El fix
> de §1.1/§1.2 sigue sin aplicar.**

### ⚠️ Hallazgo mayor (PC de Javier, por SSH real): el deploy NO es `git pull` — es manual

`/home/kittypau/kittypau-bridge` **no tiene `.git`**. No es un clone del repo — es una
carpeta con `bridge.js` + `processor.js` sueltos, más una serie de backups manuales
(`bridge.js.bak`, `.bak2`, `.bak3`, `.bak4_pre_dedup_fix_20260723`). Alguien viene editando
`bridge.js` directo en la Pi (o subiéndolo por `scp`) y guardando una copia `.bak` antes de
cada cambio — nunca hubo un `git clone` ahí. **Esto invalida el `cd .../kittypau-bridge &&
git pull && npm install && sudo systemctl restart kittypau-bridge` de §1.1 tal como está
escrito** — no hay repo del que hacer pull.

**Estado real del código desplegado (diff hecho línea por línea contra `bridge/src/index.js`
del repo, normalizando line-endings):**
- El bridge corriendo es **v3.1, no v3.2** — su propio header lo dice. Diferencia real y
  activa: **sigue escribiendo a la tabla `sensor_readings` en cada `SENSORS`** — la que
  todos los docs (incluido [[06_BaseDatos/README_BaseDatos]] y
  [[02_Arquitectura/ARQ_Pipeline_End_to_End]], escritos hoy mismo antes de este hallazgo)
  asumían "retirada desde v3.2, nadie la lee". Falso para lo que corre en producción hoy.
- **La línea 355 (el bug de `device_type`, el corazón de este spec) es byte-idéntica entre
  lo desplegado y el repo** — el fix de §1.1 sigue siendo 100% válido y aplicable, este
  hallazgo no lo invalida, solo cambia CÓMO se aplica (no hay `git pull`, hay que editar/
  copiar el archivo directo).
- `processor.js` desplegado es casi idéntico al del repo — única diferencia real:
  `todayDateString()` usa `new Date().toISOString().slice(0,10)` (UTC) en vez de
  `America/Santiago` — bug de bucketing de fecha, menor mientras la DB de analytics siga
  eliminada (ver [[29_Specs/SPEC_12_Recrear_Analytics_DB]]), pero recordar corregirlo si se
  recrea esa DB.
- RAM de la Pi ajustada: 425Mi total, ~80Mi libres, **con swap activo (141Mi en uso)** —
  confirma que [[29_Specs/SPEC_05_Optimizacion_Tecnica]] tiene razón en preocuparse por el
  estado en memoria del bridge. `sudo` funciona sin password.

**Recomendación para quien ejecute esto:** antes de aplicar el fix de §1.1, evaluar
convertir `/home/kittypau/kittypau-bridge` en un clone real de git (`git init` +
`git remote add origin` + commitear el estado actual como baseline, o clonar limpio y
migrar el `.env`) — así el próximo fix sí se puede hacer con `git pull`, en vez de repetir
el patrón manual de `.bak`. Es una mejora de una sola vez, no bloqueante para aplicar el fix
de §1.1 ahora mismo a mano si hay apuro.

### ✅ SSH ya funciona sin password (hecho 2026-08-14 desde la PC de Javier)

Se generó una key ed25519 (`~/.ssh/kittypau_bridge` en la PC de Javier) y se agregó a
`~/.ssh/authorized_keys` de la Pi — probado, conecta sin pedir password. **Esto ya resuelve
la recomendación de migrar a SSH key** que se había anotado por separado — no queda
pendiente, queda ejecutada de un lado. La Raspberry **es reachable desde la red de Javier
también**, no solo la de Mauro (corrección: una nota anterior decía "solo alcanzable desde
la red de Mauro" — eso es cierto para el firmware KPCL0035 por WiFi, NO para la Raspberry,
que respondió ping/SSH directo desde la PC de Javier).

**✅ Hecho y re-verificado desde la PC de Mauro (2026-08-14, dos veces — la segunda a
pedido explícito de confirmar identidad antes de confiar en la primera):** key generada,
agregada a `authorized_keys`, y conexión re-confirmada con `hostname` (`kittypau-bridge`) +
`uname -a` (firma real de kernel Raspberry Pi, `rpt-rpi-v7 armv7l`) — es la Raspberry real,
no otro equipo en la red.

**Hallazgo de red, no menor:** la PC de Mauro **no está en una red fija** — la sesión que
verificó esto estaba conectada a WiFi `Suarez_Mujica_891_5G` (IP `192.168.100.40/24`,
**misma subred que la Raspberry**, por eso el SSH funciona directo sin routing), **no** a
`VTR-2736410_2g` (`192.168.0.x`, donde vive KPCL0035). Tabla de rutas confirma **cero ruta
a `192.168.0.0/24`** desde esa conexión. Consecuencia práctica: **§1.1 (bridge) y §1.2 (OTA
a KPCL0035) pueden necesitar que la PC de Mauro esté conectada a redes distintas según el
momento** — no asumir que "estar en la red de Mauro" alcanza para las dos tareas sin
confirmar a cuál de las dos redes está conectada la sesión que va a ejecutar cada una.

**Credenciales del bridge:** viven en `.env.local` (gitignoreado, nunca en el repo) como
`BRIDGE_SSH_HOST` / `BRIDGE_SSH_USER` / `BRIDGE_SSH_PASSWORD` / `BRIDGE_SSH_KEY` /
`BRIDGE_SSH_PATH`. Se pasan por fuera de git (no por este doc, no por ningún commit) —
pedirlas directamente si no las tenés ya en tu copia local.

**IP de OTA para KPCL0035 — confirmada por ambas sesiones, pero puede volver a cambiar:** el
`upload_port = 192.168.100.95` de `platformio.ini` está desactualizado (no respondió al
verificar). IP real verificada contra `devices.wifi_ip` en Supabase el 2026-08-14, y
confirmada por estar en la red de Mauro: **`192.168.0.8`** (red `VTR-2736410_2g` — KPCL0035
vive físicamente ahí, solo alcanzable desde esa red). **No asumir que sigue siendo esa IP**
sin re-confirmar contra Supabase el mismo día del OTA — ver detalle en §1.2.d.

**Orden sugerido al ejecutar desde la PC de Mauro:**
1. Decidir git-real vs. edición manual para el bridge (ver hallazgo de arriba) — no
   bloqueante, se puede aplicar el fix a mano igual si hay apuro.
2. §1.1 — deploy del override en el bridge (por SSH, con key si ya la configuraste, o con
   la password de `.env.local`).
3. §1.2 — fix de firmware + OTA a KPCL0035, con la IP `192.168.0.8` re-confirmada el día del OTA.
4. Resto del checklist de §7, en el orden que ya está.

### División de tareas OTA/firmware entre las 2 PCs (2026-08-14)

`iot_firmware/javier_1a/` — el propio nombre de carpeta ya lo dice — sugiere que Javier
tiene el setup de firmware (toolchain PlatformIO, y probablemente acceso físico/USB a
hardware KPCL) más establecido que Mauro. Separar qué es ejecutable desde dónde, en vez de
asumir que "acceso a OTA" es lo mismo en las 2 PCs:

**Ejecutable desde cualquiera de las 2 PCs (solo requiere el repo + PlatformIO, sin red
especial ni hardware):**
- §1.2.a — guardar `DEVICE_TYPE` con `#ifndef` en `config.h`.
- §1.2.b — agregar el `build_flags` de `DEVICE_TYPE` al env `ota_kpcl0035` en `platformio.ini`.
- §1.2.c — `pio run -e ota_kpcl0035` (compilar sin subir) para confirmar que compila limpio.

**Requiere alcance de red real al device (confirmado hoy solo desde la red de Mauro):**
- §1.2.d/e — el OTA real a KPCL0035 (`192.168.0.8`, red `VTR-2736410_2g`) — documentado en
  esta sesión como alcanzable **solo desde la red de Mauro**, no desde la de Javier. Si eso
  cambió o es incompleto (ej. Javier sí llega por VPN, o hay otro KPCL en su red — el
  `platformio.ini` también tiene `[env:ota_kpcl0036]` con IP propia), **confirmarlo desde la
  sesión de Javier antes de asumir que el OTA de KPCL0035 es tarea exclusiva de Mauro.**

**✅ Investigado (2026-08-14, sesión de Javier) — respuesta real, no asumida:**

- **USB directo: no.** Revisados los puertos COM de la PC de Javier (`Get-PnpDevice -Class
  Ports`) — solo hay puertos Bluetooth virtuales y uno de Intel AMT. **Ningún adaptador
  USB-serie tipo CP2102/CH340** (el que trae el NodeMCU v3) está conectado ahora mismo. Sin
  placa físicamente enchufada acá.
- **Red: sí hay algo, parcial.** La PC de Javier está en la misma subred `192.168.100.x` que
  la Raspberry del bridge (confirmado por SSH exitoso, ver arriba). La IP de OTA
  documentada para KPCL0036 (`upload_port = 192.168.100.96` en `[env:ota_kpcl0036]`) **está
  en esa misma subred** — pero no respondió al ping (`Destination host unreachable`), mismo
  patrón de IP vieja por DHCP que ya se confirmó con KPCL0035. No se puede afirmar "Javier
  llega a KPCL0036" con esto — solo que, **si** algún KPCL estuviera online en esa subred con
  una IP vigente, sería alcanzable por OTA desde acá. No confirmado con un device real vivo.
- **Conclusión para la división de tareas:** hoy, el OTA real de firmware (§1.2.d/e) sigue
  siendo tarea de la PC de Mauro — ni USB ni una IP viva confirman acceso desde la PC de
  Javier a ningún KPCL ahora mismo. Lo único que la PC de Javier aporta de más es la subred
  compartida con la Raspberry (útil para el fix del bridge, §1.1, no para firmware).

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

Deploy en la Raspberry — ⚠️ **no es `git pull`, ver §-1 arriba.** Flujo real (manual, hasta
que se migre a un clone de git):
```bash
# 1. Backup antes de tocar nada (mismo patrón que ya usan los .bak existentes)
cp /home/kittypau/kittypau-bridge/bridge.js /home/kittypau/kittypau-bridge/bridge.js.bak_$(date +%Y%m%d)

# 2. Copiar el bridge.js actualizado (con el override de arriba aplicado) a la Pi —
#    por scp desde la máquina que tiene el archivo corregido, o editar directo con nano/vim
#    por SSH. El archivo destino es bridge.js suelto, NO bridge/src/index.js.

# 3. Reiniciar el servicio
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

d. **✅ Confirmado desactualizada (2026-08-14)** — `upload_port = 192.168.100.95` en el
   archivo es vieja. IP real vía `devices.wifi_ip` (Supabase, `last_seen` de hace minutos al
   momento de esta consulta): **`192.168.0.8`**, red `VTR-2736410_2g` — subred distinta por
   completo a la del archivo (`192.168.100.x` → `192.168.0.x`), confirma el cambio por DHCP.
   **Volver a confirmar la IP justo antes de flashear** — puede haber cambiado de nuevo
   desde esta fecha, no asumir que sigue siendo `192.168.0.8` sin re-chequear.

e. OTA real: `pio run -e ota_kpcl0035 -t upload`. Confirmar en el próximo `STATUS` que
   `device_type` llega como `"bebedero"`.

Con 1.1 aplicado, 1.2 es la corrección definitiva pero no urgente en el mismo minuto — el
override del bridge ya deja el dato correcto en Supabase. Aun así, hacerla: mientras el
firmware siga sin el guard, cualquier reflasheo futuro de KPCL0035 (o de otro device que
necesite `bebedero`) vuelve a pisar `device_type` sin que el override lo cubra si cambia el
`deviceId`.

---

## 2. P0.5 — Hallazgo nuevo: el analytics processor hereda el mismo bug

> ⚠️ **Actualización 2026-08-14 (sesión siguiente):** antes de auditar cuántas filas de
> `pet_sessions` están mal etiquetadas (ver checklist más abajo), confirmar que la DB de
> analytics sigue existiendo — `spfonxnyprjqxcxaqsbe.supabase.co` no resolvía DNS al
> momento de esa sesión (verificado con dos resolvers). Puede ser que el proyecto haya sido
> eliminado, en cuyo caso no hay filas que auditar ni corregir — hay que recrear el proyecto
> primero. Detalle completo en [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2.

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

- [[02_Arquitectura/ARQ_Pipeline_End_to_End]] — las 6 capas trazadas end-to-end, incluye el hallazgo de la DB de analytics caída
- [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] — de donde sale este spec
- [[29_Specs/SPEC_05_Optimizacion_Tecnica]] — deuda técnica de bridge ya perfilada
- [[07_MQTT/README_MQTT]] — arquitectura del bridge y payloads MQTT
- [[08_ESP32/README_ESP32]] — firmware, environments de PlatformIO
- [[09_Sensores/README_Sensores]] — roster de devices, identidad KPCL0034/0035/0036
