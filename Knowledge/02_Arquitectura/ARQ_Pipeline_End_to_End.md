---
id: arq_pipeline_end_to_end
title: Pipeline end-to-end — Firmware → Bridge → Bases de datos → Backend → Frontend → App móvil
type: architecture
status: active
owner: Mauro
created: 2026-08-14
updated: 2026-08-14
tags:
  - arquitectura
  - firmware
  - bridge
  - mqtt
  - supabase
  - backend
  - frontend
  - mobile
  - pipeline
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[07_MQTT/README_MQTT]]
  - [[08_ESP32/README_ESP32]]
  - [[06_BaseDatos/README_BaseDatos]]
  - [[03_Backend/README_Backend]]
  - [[04_Frontend/README_Frontend]]
  - [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
  - [[29_Specs/SPEC_11_Resumen_Consumo_Today]]
---

# Pipeline end-to-end — de un mordisco real a un número en pantalla

> Este documento es el mapa **de integración**, no el de detalle por capa — para el detalle
> de cada capa ya existen [[07_MQTT/README_MQTT]] (payloads MQTT completos),
> [[08_ESP32/README_ESP32]] (firmware pin por pin) y [[06_BaseDatos/README_BaseDatos]]
> (schema completo). Lo que este doc aporta que ningún otro tiene: **las 6 capas trazadas
> como una sola cadena**, con las costuras reales entre cada una (qué UUID conecta con qué
> tabla, qué credencial usa cada salto, dónde se cae la cadena hoy), escrito el 2026-08-14
> leyendo el código fuente real de cada capa — no memoria ni documentación previa.
>
> **Hallazgo crítico de esta lectura, no documentado en ningún otro lado todavía:** la base
> de datos de analytics (`pet_sessions`/`pet_daily_summary`) parece **no existir más** — ver
> §3.2. Esto cambia el estado real de [[29_Specs/SPEC_11_Resumen_Consumo_Today]] y de
> `/story`, que ya la consume hoy.
>
> **⚠️ Corrección 2026-08-14 (mismo día, sesión siguiente con SSH real a la Raspberry):**
> todo lo que sigue en §2 describe `bridge/src/index.js` **del repo git** — se confirmó por
> SSH que **el código realmente desplegado en la Pi es distinto** (versión v3.1, no v3.2;
> sin `.git`, deploy manual por copia + `.bak`). El bug de `device_type` (§2.1 punto 3) SÍ
> es idéntico entre repo y producción — esa parte del análisis sigue valiendo. Lo que NO
> vale sin re-confirmar: cualquier claim de "ya no se escribe a `sensor_readings`" — **sí se
> sigue escribiendo**, ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1 para el
> detalle completo y el diff real.

---

## 0. Las 6 capas, de un vistazo

```
┌─────────────┐   MQTT/TLS    ┌──────────────┐  MQTT/TLS+WS  ┌────────────────────┐
│  FIRMWARE   │──────────────▶│  HiveMQ      │──────────────▶│  BRIDGE             │
│  ESP8266    │◀──────────────│  Cloud       │◀──────────────│  Raspberry Pi Zero  │
│  (KPCL00xx) │   cmd topic   │  (broker)    │  suscripción  │  2W — Node.js 24/7  │
└─────────────┘               └──────────────┘   wildcard    └──────────┬──────────┘
                                      ▲                                  │ supabase-js
                                      │ WebSocket read-only              │ (service_role,
                                      │ (browser, "en vivo")             │  bypass RLS)
                                      │                                  ▼
                               ┌──────┴───────┐              ┌───────────────────────┐
                               │  FRONTEND    │◀─────HTTP────│  BASES DE DATOS        │
                               │  Next.js /   │   fetch()    │  2 proyectos Supabase  │
                               │  APK Android │              │  separados — §3        │
                               │  (Capacitor) │              └───────────┬───────────┘
                               └──────────────┘                          │
                                      ▲                                  │ supabaseServer /
                                      │ Server Components +              │ getUserClient
                                      │ API Routes (mismo                │ (RLS)
                                      │ Next.js, corre en Vercel)        ▼
                               ┌──────┴──────────────────────────────────────────┐
                               │  BACKEND — src/app/api/**  (Next.js API Routes) │
                               └──────────────────────────────────────────────────┘
```

Hay **dos caminos de datos independientes** entre el hardware y lo que ve el usuario, y
confundirlos es la fuente de más de un bug histórico del proyecto:

- **Camino A — persistido** (el que importa para historial, Hunger Bar, analytics):
  firmware → HiveMQ → bridge → Supabase → API Routes → UI. Con latencia (el bridge escribe,
  la UI hace polling/fetch).
- **Camino B — en vivo, efímero** (`useMqttLive.ts`): el navegador se conecta **directo** a
  HiveMQ por WebSocket con credenciales de solo-lectura (`NEXT_PUBLIC_MQTT_*_READONLY`),
  sin pasar por el bridge ni por Supabase. Sirve para mostrar "peso ahora mismo" sin
  esperar al siguiente ciclo de persistencia, pero **no se guarda en ningún lado** — si el
  usuario no tiene la pantalla abierta en ese instante, ese dato puntual se pierde (el
  Camino A sí lo captura vía SENSORS → `readings`, en paralelo).

---

## 1. Capa 1 — Firmware (ESP8266, `iot_firmware/javier_1a/firmware-esp8266/`)

Detalle completo de sensores/pines en [[08_ESP32/README_ESP32]]. Acá solo lo que conecta
con las capas siguientes.

### 1.1 — Identidad del dispositivo: 3 constantes que viajan hasta la UI

`include/config.h`:

```c
#ifndef DEVICE_ID
#define DEVICE_ID      "KPCL0036"
#endif
#define DEVICE_TYPE    "comedero"              // Funcion: "comedero", "bebedero"
```

`DEVICE_ID` tiene guard `#ifndef` — se puede sobreescribir por `build_flags` de PlatformIO
sin tocar el archivo (así un mismo firmware se reflashea a distintas placas). **`DEVICE_TYPE`
no tiene guard** — es un `#define` fijo, así que **ningún** `build_flags` puede cambiarlo.
Confirmado leyendo `platformio.ini`: el entorno `[env:ota_kpcl0035]` solo puede overridear
`DEVICE_ID` y `USE_DHT11`:

```ini
build_flags = -D DEVICE_ID=\"KPCL0035\" -D USE_DHT11
```

**Esta es la causa raíz física del bug que [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]]
encontró en producción y [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] diagnosticó hasta
acá:** KPCL0035 es el bebedero real de Bandida, pero como su firmware es la misma imagen que
KPCL0036 (comedero) con solo el `DEVICE_ID` cambiado, **el firmware de KPCL0035 se anuncia a
sí mismo como `"comedero"` en cada payload STATUS, para siempre, hasta que alguien le
agregue el guard y reflashee.** No es un dato que se cargó mal una vez — es una declaración
que el hardware repite cada 15 segundos.

### 1.2 — Qué publica cada topic (resumen — payloads completos en [[07_MQTT/README_MQTT]])

| Topic | Frecuencia | Quién construye el payload | Contiene `device_type`? |
|---|---|---|---|
| `{DEVICE_ID}/SENSORS` | `sensor_interval_ms` (default 30 s, ajustable por `SET_INTERVAL`) | `sensors.cpp: sensorsReadAndPublish()` | No |
| `{DEVICE_ID}/STATUS` | 15 s fijo | `main.cpp: publishDeviceStatus()` | **Sí, siempre** (`doc["device_type"] = DEVICE_TYPE`) |
| `{DEVICE_ID}/cmd` | Broker → dispositivo | — | — |

`SENSORS` nunca lleva `water_ml`/`flow_rate` — el firmware solo mide **peso** (celda de
carga HX711), sea comedero o bebedero. Confirma lo que
[[29_Specs/SPEC_07_Investigacion_Hidratacion]] ya había concluido leyendo `readings.csv`:
esas dos columnas del schema existen pero ningún firmware real las llena, en ningún device.

### 1.3 — Comandos que el firmware acepta por `cmd` (`mqtt_manager.cpp: mqttCallback()`)

| Comando | Efecto en el firmware | Quién lo dispara hoy en la app |
|---|---|---|
| `ADDWIFI` | Agrega SSID/pass a `wifiManagerAddSSID()`, persiste en `/wifi.json` (LittleFS) | `/bowl` — gestión de WiFi de respaldo |
| `REMOVEWIFI` | Quita SSID de la lista conocida | `/bowl` |
| `CALIBRATE_WEIGHT` (`tare`) | `sensorsTareWeight()` — tara en caliente | Botón "Tarar" de `/bowl`, vía `POST /api/devices/[id]/tare` |
| `CALIBRATE_WEIGHT` (`set_scale`) | Escribe factor HX711 nuevo | No expuesto en UI hoy (solo modo `CALIBRATION_MODE` por serial) |
| `SET_INTERVAL` | Cambia `sensorPublishInterval`, persiste en `/interval.json` | `/bowl` — selector de intervalo |

Todos llegan como filas en la tabla `device_commands` (§3.1) que el bridge poll-ea cada 5s y
publica al topic `{device_id}/cmd` — ver §2.2.

### 1.4 — Deuda de seguridad visible en este nivel (no tocada en esta sesión, requiere
decisión de Mauro — mismo criterio que [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §3)

- **Credenciales MQTT y WiFi en texto plano, committeadas en `config.h`/`wifi_manager.cpp`**
  — incluye redes personales. El firmware **sí** valida el certificado TLS del broker
  correctamente (`net.setTrustAnchors()` con el CA root de Let's Encrypt embebido) — el
  problema es solo el texto plano en git, no el transporte.
- **NTP sin sincronizar → fallback silencioso a 2024-01-01** (`mqtt_manager.cpp:200-206`) si
  no hay red 15s tras conectar WiFi — el certificado TLS sigue validando (rango 2015-2035)
  pero cualquier `timestamp` que el firmware ponga en ese arranque queda mal. El bridge ya
  tiene una defensa contra esto (`clock_invalid`, ver §2.2), así que no llega a corromper
  `readings`, pero vale saber que la fecha del dispositivo mismo puede estar mal por un rato
  tras cada reinicio sin red.

---

## 2. Capa 2 — Bridge (`bridge/`, corre 24/7 en la Raspberry Pi Zero 2W, systemd `kittypau-bridge`)

Es el único componente de todo el sistema que **no vive en Vercel ni en el navegador** —
corre en hardware físico propio. Documentación operativa (comandos systemd, variables de
entorno) ya está completa en [[07_MQTT/README_MQTT]]; acá el foco es qué transforma y a
dónde escribe.

### 2.1 — `index.js` (605 líneas) — el traductor MQTT → Postgres

Se suscribe a `+/SENSORS` y `+/STATUS` (wildcard sobre todos los `KPCL*`, más `KPBR0001` que
es la propia Raspberry). Usa **`SUPABASE_SERVICE_ROLE_KEY`** — bypassa RLS por completo, es
el único componente del sistema (junto al analytics processor) con esa autoridad.

**Al recibir `SENSORS`** (`handleSensorData`, línea 238):
1. `ensureDeviceExists(deviceId)` — si es la primera vez que ve ese `device_id` (texto,
   ej. `"KPCL0037"`), lo **auto-registra** en `devices` con `device_state='factory'`,
   `owner_id=null`. Este es el mecanismo que [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]]
   describe como el origen de las filas "sin dueño" que un usuario después reclama.
2. `writeToReadings()` — **solo escribe si `device.owner_id` no es null** (línea 268:
   `if (!device?.owner_id) return;`). Un device en `factory` (recién auto-registrado, nadie
   lo reclamó) genera tráfico MQTT que el bridge recibe pero **descarta silenciosamente**
   para `readings` — no es un bug, es la barrera de "no acumular historial de un device que
   todavía no es de nadie".
3. Valida reloj: si `|ahora_servidor − timestamp_firmware| > 10 min`, marca
   `clock_invalid=true` y usa la hora del servidor en vez de la del device — la defensa
   contra el fallback NTP de §1.4.
4. `upsert` en `readings` con `onConflict: 'device_id,recorded_at', ignoreDuplicates: true`
   — dedupe automático si el mismo device manda el mismo timestamp dos veces.
5. Dispara `processor.processReading()` **best-effort** (no bloquea, no espera) — ver §2.3.

**Al recibir `STATUS`** (`handleStatusData`, línea 318):
1. Detecta cambio de IP → `ip_history` (JSONB, append).
2. `update` sobre `devices` **solo con los campos que el payload trae** (cada línea es un
   `if (data.x !== undefined)`) — así un firmware viejo que no manda `device_model` no borra
   el valor existente con `null`.
3. **Línea 355, la causa raíz que [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]]
   encontró y [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] diagnosticó del todo:**
   ```js
   if (data.device_type) updateFields.device_type = data.device_type; // guardar valor raw del firmware
   ```
   Escribe el `device_type` **crudo** del firmware sin traducir ni filtrar. Existe
   `DEVICE_TYPE_MAP` (línea 26-31, `'comedero'→'food_bowl'`, `'bebedero'→'water_bowl'`) —
   **nunca se usa en ningún otro punto del archivo** (código muerto, confirmado por grep).
   Con KPCL0035 anunciándose como `"comedero"` cada 15s (§1.1), cualquier corrección manual
   en `devices.device_type` dura, como mucho, 15 segundos.
4. Si el device volvía de `offline`, registra `kpcl_prendido` en `audit_events`.

### 2.2 — Auto-offline (independiente de los mensajes MQTT)

`setInterval(checkOfflineDevices, 30_000)` — cada 30s, cualquier device `linked` sin `STATUS`
en los últimos `OFFLINE_THRESHOLD_MS = 3 min` pasa a `device_state='offline'` +
`kpcl_apagado` en `audit_events`. Esto es lo que finalmente hace que
`bowl/page.tsx`/`device-diagnostics.ts` vean un device como caído — no hay lógica de
"offline" del lado de Next.js, todo el cálculo de frescura vive acá y en el frontend
(umbrales distintos entre sí, ver §5.2).

### 2.3 — `processor.js` (306 líneas) — sesiones + analytics, **DB separada** (§3.2)

State machine por device (`Map` en memoria, se pierde en cada `systemctl restart` — deuda ya
trackeada en [[29_Specs/SPEC_05_Optimizacion_Tecnica]]):

```
IDLE ──(peso cae ≥ 5g)──▶ ACTIVE ──(2 lecturas estables, ±3g)──▶ cierra sesión ──▶ IDLE
```

Al cerrar una sesión: calcula `grams_consumed` (o `water_ml` si `device_type='water_bowl'` —
**1g ≈ 1ml**, la misma physical proxy que ya documentó
[[29_Specs/SPEC_07_Investigacion_Hidratacion]] §3 como aproximación, no medición real de
volumen), un Z-score contra las últimas 30 sesiones de esa mascota
(`classification: 'low'|'normal'|'high'`), e inserta en `pet_sessions` +
actualiza `pet_daily_summary` (upsert incremental por día, timezone `America/Santiago`).

**Línea 129 — el mismo bug de identidad, heredado en un segundo lugar que
[[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] no llegó a auditar** (esa sesión no
leyó `processor.js`):
```js
const deviceType = deviceMeta?.device_type === 'water_bowl' ? 'water' : 'food';
```
Como `deviceMeta.device_type` viene de la misma fila de `devices` rota (§2.1 punto 3), **toda
sesión de KPCL0035 se guarda como `session_type: 'food'`** en vez de `'water'` — no es una
lectura equivocada de la UI, es un **dato histórico mal etiquetado en la analytics DB desde
que el bebedero está activo** (10-ago-2026 en adelante). El fix de causa raíz en el bridge
(§2.1, [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §1.1) corrige esto hacia adelante
automáticamente — las sesiones ya insertadas quedan mal etiquetadas hasta que alguien decida
un `UPDATE` explícito (**no automático — requiere autorización de Mauro**, mismo criterio que
todo `UPDATE` en tablas de producción de este proyecto).

---

## 3. Capa 3 — Bases de datos: **dos proyectos Supabase, no uno**

Este es el punto que más confunde a quien llega nuevo — hay dos URLs, dos service keys, dos
propósitos, y **una de las dos parece haber dejado de existir**.

### 3.1 — DB principal (`zjdyhpntftgaynchqwfk.supabase.co`) — operacional

Fuente de verdad de auth, dispositivos, lecturas crudas, comandos, admin. Schema real
**introspectado en vivo esta sesión** vía el endpoint OpenAPI de PostgREST (no asumido de
migraciones viejas, que en 60 archivos acumulan varios ALTER TABLE dispersos):

| Tabla | Columnas relevantes | Quién escribe | Quién lee |
|---|---|---|---|
| `devices` | `id (uuid, PK)`, `device_id (text)`, `owner_id`, `pet_id`, `device_type`, `status`, `device_state`, `battery_*`, `wifi_*`, `ip_history (jsonb)`, `plate_weight_grams` | Bridge (`STATUS`, auto-registro) + `kittypau_app` (`link_device_to_pet` RPC) | Todo el frontend, vía `/api/devices*` |
| `readings` | `id`, `device_id (uuid, FK)`, `pet_id`, `weight_grams`, `water_ml`, `flow_rate`, `temperature`, `humidity`, `light_*`, `battery_*`, `recorded_at`, `clock_invalid` | Bridge (`SENSORS`, solo si `owner_id` no nulo) | `/api/pets/[id]/hunger-bar`, `/api/readings*`, Motor Matemático de investigación (CSV export aparte, no esta tabla) |
| `audit_events` | `event_type`, `actor_id`, `entity_type`, `entity_id`, `payload (jsonb)` | Bridge (power events) + `kittypau_app` (`logAudit`, ver `_audit.ts`) | `/today` (Pilar 2 hidratación, `buildWellnessState`), `/admin` (auditoría) |
| `device_commands` | `device_id (text)`, `command (jsonb)`, `status`, `sent_at` | `kittypau_app` (tare, wifi, interval desde `/bowl`) | Bridge (`pollDeviceCommands`, cada 5s) |
| `bridge_heartbeats` | `bridge_id (PK)`, `ip`, `mqtt_connected`, `last_mqtt_at`, `ram_*`, `cpu_temp` | Bridge (status de la Pi misma, cada 60s) | `/admin`, `detectCriticalSystemErrorType()` en `/api/devices` |
| `admin_roles` | `user_id (FK profiles)`, `role`, `active` | Migraciones manuales / futuro panel admin | Todas las rutas `/api/admin/*` — **hoy vacía, ver nota abajo** |

> **Nota cruzada con el trabajo de hoy en esta misma sesión:** `admin_roles` está vacía
> porque la migración que debía sembrarla (`20260212080000_admin_roles_and_dashboard.sql`)
> apunta a un email que nunca se registró (`javomauro.contacto@gmail.com`) en vez de la
> cuenta real (`javier.dayne@gmail.com`) — ver [[29_Specs/SPEC_01_Errores_Prioritarios]] E2
> para el fix propuesto (una migración nueva, no aplicada todavía, pendiente de
> confirmación).

**Dos clientes distintos según el caller** (`kittypau_app/src/lib/supabase/server.ts`):
- `supabaseServer` — `SUPABASE_SERVICE_ROLE_KEY`, bypassa RLS. Usado por rutas que ya
  validaron el usuario a mano (ownership check explícito en código) o que son
  intrínsecamente admin.
- `getUserClient(req)` (`_utils.ts`) — crea un cliente con el JWT del usuario
  (`createUserClient(token)`), RLS activo. Usado en la mayoría de rutas `/api/*` de usuario
  final.

### 3.2 — ⚠️ DB analytics (`spfonxnyprjqxcxaqsbe.supabase.co`) — **parece no existir más**

**Hallazgo nuevo de esta sesión (2026-08-14), no reportado en ningún spec anterior.**
Verificado con dos resolvers DNS independientes (el del sistema y `dns.google` sobre HTTPS):

```
$ nslookup spfonxnyprjqxcxaqsbe.supabase.co
** server can't find spfonxnyprjqxcxaqsbe.supabase.co: NXDOMAIN

$ curl https://dns.google/resolve?name=spfonxnyprjqxcxaqsbe.supabase.co
{"Status":3, ...}   ← Status 3 = NXDOMAIN
```

Por comparación, el proyecto principal (`zjdyhpntftgaynchqwfk.supabase.co`) resuelve sin
problema desde la misma máquina en el mismo minuto — no es un problema de red local ni de
DNS del sistema, es específico de ese hostname. `NXDOMAIN` (a diferencia de un timeout o un
503) es el patrón típico de un **proyecto Supabase eliminado**, no solo pausado por
inactividad (un proyecto pausado normalmente sigue resolviendo y devuelve una respuesta de
error explícita, no "el dominio no existe").

**Por qué esto importa más de lo que parece — nadie lo va a notar solo:**
- `bridge/src/processor.js` trata la analytics DB como **best-effort** (`initAnalyticsClient()`
  loguea una advertencia y sigue si faltan las env vars, y cualquier error de red en
  `persistSession`/`upsertDailySummary` solo hace `console.error` — no crashea el bridge, no
  manda alerta a nadie). Si el proyecto fue eliminado, **el bridge lleva un tiempo
  indeterminado intentando escribir sesiones a un host que no existe, sin que nada lo
  reporte** salvo el log local de systemd en la Raspberry.
- `kittypau_app/src/lib/supabase/analytics.ts` (`analyticsAvailable`) **solo verifica que
  las variables de entorno no estén vacías** — no hace un ping real. Con
  `SUPABASE_ANALYTICS_URL`/`SUPABASE_ANALYTICS_SERVICE_KEY` seteadas en `.env.local` (lo
  están, ver [[29_Specs/SPEC_01_Errores_Prioritarios]] E7), `analyticsAvailable = true` hoy
  — así que `GET /api/analytics/daily` y `GET /api/analytics/sessions` **intentan la query
  real**, que falla a nivel de red, y devuelven `500 ANALYTICS_ERROR` en vez del degradado
  limpio `{ data: [], analytics_available: false }` que el código sí sabe producir cuando
  las env vars faltan.
- **`/story`** (la única pantalla que ya consume `/api/analytics/sessions` en producción,
  según [[29_Specs/SPEC_11_Resumen_Consumo_Today]] §0) probablemente está degradado o roto
  ahora mismo por esto — **no verificado contra la app en vivo en esta sesión** (sin
  browser/APK disponible), pero la cadena de causalidad es directa desde el hallazgo de DNS.
- Esto **invalida la premisa central de [[29_Specs/SPEC_11_Resumen_Consumo_Today]]**
  ("el pipeline completo ya corre en producción ahora mismo, solo falta un consumidor de
  UI") — antes de construir la sección nueva de `/today` sobre `pet_daily_summary`, hay que
  confirmar si ese proyecto Supabase existe, y si no, recrearlo (con sus tablas, RLS, y
  reconectar `SUPABASE_ANALYTICS_URL`/`_SERVICE_KEY` en `.env.local`, Vercel, **y el `.env`
  de la Raspberry** — 3 lugares distintos).

**Acción recomendada, no ejecutada en esta sesión** (requiere el dashboard de Supabase, no
solo la API — no se puede confirmar "eliminado" vs. "nunca existió con ese ref" sin entrar a
`supabase.com/dashboard` con la cuenta dueña del proyecto): confirmar en el dashboard si
`kittypau-analytics` sigue en la lista de proyectos. Si no está, decidir con Mauro si se
recrea (perdiendo el histórico de `pet_sessions` que hubiera acumulado) o si se restaura
desde un backup si Supabase todavía lo conserva.

**Schema de `pet_sessions`/`pet_daily_summary`** — no se pudo introspectar en vivo (la DB no
responde). Documentado acá **derivado de lo que `processor.js` efectivamente inserta** (código
fuente, no un dump de schema):

- `pet_sessions`: `owner_id`, `pet_id`, `device_id (text)`, `session_type ('food'|'water')`,
  `session_start`, `session_end`, `grams_consumed`, `water_ml`, `classification
  ('low'|'normal'|'high')`, `anomaly_score`, `baseline_grams`, `avg_temperature`,
  `avg_humidity`, `is_premium_data`.
- `pet_daily_summary`: `owner_id`, `pet_id`, `summary_date`, `total_food_grams`,
  `total_water_ml`, `food_sessions`, `water_sessions`, `anomaly_count`, `skipped_meals`
  (**siempre 0** — el processor nunca calcula comidas omitidas, ver
  [[29_Specs/SPEC_11_Resumen_Consumo_Today]] §4), `first_session_at`, `last_session_at`,
  `readings_processed`.
- `pet_sessions.duration_sec` aparece en el `SELECT` de `api/analytics/sessions/route.ts`
  pero **no se encontró en el objeto que `processor.js` inserta** — mismo caveat sin resolver
  que ya documentó [[29_Specs/SPEC_11_Resumen_Consumo_Today]].

---

## 4. Capa 4 — Backend (`kittypau_app/src/app/api/**`, Next.js API Routes en Vercel)

### 4.1 — Autenticación y autorización (dos capas)

1. **¿Quién sos?** — `getUserClient(req)` (`_utils.ts`) valida el header `Authorization:
   Bearer <jwt>` contra Supabase Auth. Todas las rutas de usuario final lo usan.
2. **¿Sos admin?** — `Boolean(adminRole desde admin_roles) || isAdminFallbackEmail(email)`.
   Repetido igual en `admin/overview`, `admin/tests/run-all`, `admin/demo-ingresos`,
   `admin/access`, `admin/health-check`, `admin/finance/kpcl-catalog` — los 6 importan la
   misma función de `_utils.ts`, así que el fix de `admin_roles` (§3.1) los desbloquea a
   todos de una vez, no ruta por ruta.

### 4.2 — Devices: alta, tipificación, comandos

- `POST /api/devices` → RPC `link_device_to_pet` — hoy hace un `insert` puro con
  `device_id` **tipeado a mano** por el usuario en el formulario de registro (regex
  `/^KPCL\d{4}$/`, sin validar contra la lista real de `devices`). Este es exactamente el
  gap que [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] describe — el device ya
  existe como fila `factory` (auto-registrada por el bridge, §2.1) antes de que el usuario
  lo reclame, y el `insert` (no `upsert`) puede chocar con esa fila o, peor, duplicarla.
- `kittypau_app/src/lib/device-role.ts` (`resolveDeviceRole`) — el parche de lectura que
  corrige el bug de identidad de KPCL0035 **solo del lado de la app**, sin tocar el dato de
  origen (que sigue roto por §2.1 punto 3 hasta que se aplique
  [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §1.1). `DEVICE_TYPE_OVERRIDES` gana
  siempre sobre `devices.device_type`.
- `kittypau_app/src/lib/device-diagnostics.ts` — diagnóstico compartido (`/bowl`, `/today`,
  `/pet`, vía `<DiagnosticoRapidoCard>`). **Actualizado en esta misma sesión**: el umbral de
  "dispositivo en línea" estaba duplicado con dos valores distintos (15 min en el punto del
  sidebar, 30 min acá) — ahora ambos usan `DEVICE_ONLINE_THRESHOLD_MS` exportado desde este
  archivo (ver commit de hoy, U5 de [[29_Specs/SPEC_02_UIUX_Mejoras]]).

### 4.3 — Hunger Bar: cálculo on-demand, sin tabla intermedia

`GET /api/pets/[id]/hunger-bar` — no lee de una tabla pre-calculada. Cada request:
ownership check → elige el device de comida activo vía `isFoodDeviceRole()` (§4.2) →
pagina `readings` de los últimos 10 días (con el fix de paginación real, no asumida, del
2026-08-11 — ver comentario en el código y el test de regresión agregado hoy) →
`computeHungerBar()` (`lib/hunger-bar.ts`) sobre esos puntos. Documentado en detalle en
[[05_API/SPEC_HungerBar_Alimentacion]].

### 4.4 — Analytics: el consumidor que hoy probablemente falla (ver §3.2)

`GET /api/analytics/daily` y `GET /api/analytics/sessions` — ambos dependen de
`supabaseAnalytics` (§3.1/§3.2). Gating free/premium ya implementado
(`FREE_HISTORY_DAYS=3`, `PREMIUM_HISTORY_DAYS=365`) — pero eso es secundario mientras la DB
de origen no responda.

---

## 5. Capa 5 — Frontend web (`kittypau_app/src/app/(app)/**`)

No repite acá lo que ya documentan [[04_Frontend/README_Frontend]] y
[[04_Frontend/ESTRUCTURA_src_app]] — solo cómo cada pantalla se conecta a las capas
anteriores.

| Pantalla | Fuente de datos | Camino (A persistido / B en vivo) |
|---|---|---|
| `/today` | `hunger-bar` (§4.3), `buildWellnessState()` sobre `audit_events`, `<DiagnosticoRapidoCard>` (§4.2) | A |
| `/bowl` | `GET /api/devices`, `readings` recientes para gráficos, `device_commands` (tare/wifi/interval) | A (lectura) + A (escritura de comandos, ejecutados async por el bridge) |
| `/pet` | Igual que `/today` pero por mascota, sin selector de rango | A |
| `/story` | `GET /api/analytics/sessions` — **hoy probablemente degradado, ver §3.2** | A |
| Indicador "en línea" del sidebar (`app-nav.tsx`) | `devices.last_seen` vía `useAppData()` (contexto ya cargado) | A |
| Valor de peso "ahora mismo" (si algún componente lo usa) | `useMqttLive.ts` — WebSocket directo a HiveMQ | **B** — no persiste, no pasa por Supabase |

**"Barras Sims"** (`/today`, panel de investigación) es la única superficie explícitamente
protegida contra cambios sin confirmación previa — revertida 3 veces en el historial del
proyecto. No tocar sin preguntar primero, ver [[29_Specs/SPEC_04_Metricas_Today_Investigacion]].

---

## 6. Capa 6 — App móvil (Capacitor + Android)

### 6.1 — No es una app nativa con datos embebidos — es un WebView apuntando a Vercel en vivo

`capacitor.config.ts`:
```ts
const appServerUrl = process.env.CAPACITOR_SERVER_URL || "https://kittypau-app.vercel.app";
...
server: { url: appServerUrl, ... }
```

**Esto es la distinción más importante de toda esta capa, ya documentada en
[[29_Specs/SPEC_06_Mobile_APK_2026]] pero que vale repetir acá porque conecta todo lo
anterior:** el APK instalado en un celular **no** contiene el JS de la app — cada vez que se
abre, el WebView carga `kittypau-app.vercel.app` como si fuera un browser. Consecuencia
directa para todo lo documentado en §4/§5: **cualquier cambio a una API Route o a una
página se actualiza solo, con el próximo `git push` a `main` (deploy de Vercel), sin
recompilar ni redistribuir el APK.** Lo que **sí** requiere un APK nuevo compilado e
instalado: permisos nativos, plugins de Capacitor no incluidos en el build anterior, íconos,
`targetSdkVersion`. El caso real que expuso esto: la notificación push del Hunger Bar
(`@capacitor/local-notifications`) — el JS ya llamaba la API del plugin, pero el APK
instalado no lo tenía compilado adentro, así que no hacía nada hasta el siguiente build
nativo (ver [[05_API/SPEC_HungerBar_Alertas]] §6.1).

### 6.2 — Qué toca cada capa desde el lado móvil

- **Camino A (persistido)** funciona idéntico en web y APK — son el mismo `fetch()` contra
  las mismas API Routes, el WebView no cambia esa parte.
- **Camino B (`useMqttLive`, WebSocket)** — mismo código, corre igual dentro del WebView.
  Sin diferencias conocidas móvil vs. web en este punto.
- **Plugins nativos relevantes a este pipeline:** `LocalNotifications` (alerta del Hunger
  Bar cuando `estimatedNextMealAt + ALERT_THRESHOLD_HOURS` pasa — agendada del lado del
  cliente, no empujada por el bridge ni por Supabase — ver
  [[05_API/SPEC_HungerBar_Alertas]] §6.1) y `SystemBars` (edge-to-edge, sin relación con el
  pipeline de datos, solo UI).

### 6.3 — Hallazgo menor de esta sesión: un host de Supabase que no coincide

`capacitor.config.ts`, `allowedHosts`:
```ts
const allowedHosts = [
  "kittypau-app.vercel.app",
  "zgwqtzazvkjkfocxnxsh.supabase.co",   // ← no es el proyecto principal actual
  "musical-arachnid-50372.upstash.io",
];
```

El proyecto Supabase principal real (confirmado en `.env.local`,
`NEXT_PUBLIC_SUPABASE_URL`) es **`zjdyhpntftgaynchqwfk.supabase.co`** — un ref distinto al
que está en esta lista. **No confirmado como bug funcional** en esta sesión: `allowNavigation`
de Capacitor controla navegación de nivel WebView (links, redirects), no necesariamente
`fetch()`/XHR desde JS — así que puede ser una entrada obsoleta de un proyecto Supabase
anterior sin efecto práctico hoy, no una ruta rota. Igual vale la pena que alguien con
acceso a compilar el APK confirme si algún flujo (login, storage) navega de verdad a un
host `supabase.co` en vez de solo hacer `fetch` — si es así, esta entrada desactualizada sí
rompería ese flujo específico en producción móvil.

---

## 7. Trazado real: "Bandida se puso a comer" — un dato, las 6 capas

1. **Firmware** (KPCL0034, cuando estaba activo): HX711 detecta caída de peso, cada ~30s
   publica `{DEVICE_ID}/SENSORS` con `weight`. Cada 15s publica `{DEVICE_ID}/STATUS` con
   `device_type: "comedero"`.
2. **HiveMQ**: entrega ambos topics a cualquier suscriptor — el bridge (wildcard) y
   cualquier navegador con `useMqttLive` abierto en ese momento (Camino B, no persiste).
3. **Bridge**: `handleSensorData` — upsert en `readings` (Camino A) **y**, en paralelo,
   `processor.processReading()` alimenta la state machine. Si el peso cayó ≥5g y luego se
   estabiliza, `processor.js` cierra una sesión → intenta `insert` en `pet_sessions` de la
   **DB analytics** (§3.2 — si esa DB no existe, este paso falla en silencio, el resto de la
   cadena sigue funcionando igual).
4. **DB principal**: la fila nueva en `readings` queda disponible para cualquier query
   futura filtrada por `device_id` + rango de fecha.
5. **Backend**: la próxima vez que `/today` pida `GET /api/pets/[id]/hunger-bar`, ese
   request pagina `readings` de los últimos 10 días (incluye la lectura nueva),
   `computeHungerBar()` detecta el segmento de bajada de peso como una comida real, calcula
   `percentage`, `lastMealDetectedAt`, `estimatedNextMealAt`.
6. **Frontend**: `/today` renderiza la barra actualizada. Si pasó el umbral de alerta,
   `useHungerBarPushAlert` agenda una `LocalNotification`.
7. **App móvil**: mismo paso 6, corriendo dentro del WebView — sin build nuevo, porque todo
   lo que cambió fue JS servido en vivo desde Vercel (§6.1).

---

## 8. Deuda y riesgos consolidados de este pipeline (no repetir — solo índice)

| # | Item | Dónde está el detalle | Estado |
|---|---|---|---|
| 1 | `DEVICE_TYPE` sin guard en firmware — origen de todo el bug de identidad KPCL0035 | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §1.2 | Pendiente, requiere OTA físico |
| 2 | Bridge pisa `device_type` con el valor crudo del firmware, `DEVICE_TYPE_MAP` es código muerto | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §1.1 | Pendiente, requiere deploy en la Pi |
| 3 | `processor.js:129` hereda el mismo bug — sesiones de KPCL0035 mal etiquetadas como `'food'` | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §2 | Pendiente, corrige hacia adelante solo (histórico requiere decisión) |
| 4 | **DB analytics no resuelve DNS — probablemente eliminada** | Este documento, §3.2 (hallazgo nuevo) | **No reportado en ningún spec — verificar dashboard de Supabase** |
| 5 | `admin_roles` vacía — migración semilla apunta a email inexistente | [[29_Specs/SPEC_01_Errores_Prioritarios]] E2 | Fix identificado, no aplicado (pendiente confirmación) |
| 6 | `rejectUnauthorized: false` en la conexión TLS del bridge a HiveMQ | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §3.1 | Pendiente, requiere deploy en la Pi |
| 7 | Credenciales WiFi/MQTT en texto plano en el firmware, committeadas | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §3.2 | Flag para decisión de Mauro, no bloqueante |
| 8 | Estado de sesión del bridge (`deviceState`/`petBaseline`) en memoria, se pierde en cada restart | [[29_Specs/SPEC_05_Optimizacion_Tecnica]] | Pendiente, esfuerzo M |
| 9 | `link_device_to_pet` hace `insert` ciego contra devices ya auto-registrados por el bridge | [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] | Pendiente, spec completo con diseño de fix |
| 10 | Host de Supabase desactualizado en `capacitor.config.ts allowedHosts` | Este documento, §6.3 (hallazgo nuevo, menor) | No confirmado como bug funcional — verificar en APK real |

---

## 9. Glosario de identidades (para no perderse entre UUID, código y topic)

| Cosa | Ejemplo | Dónde vive |
|---|---|---|
| Código legible del device | `KPCL0035` | Topic MQTT, `devices.device_id` (texto), UI |
| UUID real del device | `0dc601c0-1533-40c5-b606-6d89eb2d4042` | `devices.id` (PK), FK en `readings.device_id`, `pet_sessions.device_id` es texto (no UUID — inconsistente entre tablas, ver `processor.js` línea 195: guarda `deviceId` texto, no `deviceMeta.id`) |
| Rol físico corregido (parche de app) | `water_bowl` | `device-role.ts: DEVICE_TYPE_OVERRIDES`, no en la DB |
| `device_type` crudo en DB (roto para KPCL0035) | `comedero` | `devices.device_type` — lo pisa el bridge cada 15s |
| Bridge mismo | `KPBR0001` | `devices.device_id`, `bridge_heartbeats.bridge_id` |
| Proyecto Supabase principal | `zjdyhpntftgaynchqwfk` | `.env.local: SUPABASE_URL` |
| Proyecto Supabase analytics | `spfonxnyprjqxcxaqsbe` | `.env.local: SUPABASE_ANALYTICS_URL` — **ver §3.2, no resuelve hoy** |

---

## Ver también

- [[07_MQTT/README_MQTT]] — payloads MQTT completos, operación del bridge día a día
- [[08_ESP32/README_ESP32]] — firmware pin por pin, sensores, OTA
- [[06_BaseDatos/README_BaseDatos]] — schema completo de la DB principal
- [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] — origen de la investigación del bug de `device_type`
- [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] — handoff de fixes de causa raíz, pendiente de ejecución
- [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] — riesgo de datos en el alta de dispositivos
- [[29_Specs/SPEC_11_Resumen_Consumo_Today]] — plan de producto bloqueado por el hallazgo de §3.2
- [[05_API/SPEC_HungerBar_Alimentacion]] — el consumidor más maduro de este pipeline
