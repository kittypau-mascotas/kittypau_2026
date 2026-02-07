# Pruebas End-to-End (Kittypau)

## Objetivo
Validar el flujo completo: IoT -> HiveMQ -> Bridge -> Vercel API -> Supabase -> Realtime.

---

## Prerrequisitos
- Vercel deploy activo: `https://kittypau-app.vercel.app`
- Supabase con tablas y RLS aplicados (`Docs/SQL_SCHEMA.sql`)
- Device registrado en `devices` con `device_code` real

---

## 0) Prueba API directa (sin Bridge) - OK
**Objetivo:** validar Auth + API + Supabase sin depender de IoT.

**Pasos**
1. Obtener `access_token` desde Supabase Auth.
2. Crear fila en `public.profiles` (si no existe).
3. `GET /api/pets` (debe responder 200, aunque vacio).
4. `POST /api/pets` (crear mascota).
5. `PATCH /api/pets/:id` (actualizar mascota).
6. `POST /api/devices` (crear dispositivo).
7. `POST /api/mqtt/webhook` (insertar lectura de prueba).
8. `GET /api/readings?device_id=<UUID>` (leer lecturas).

**Esperado**
- `devices` contiene el `device_code` creado.
- `readings` contiene la lectura insertada.

**Resultado (2026-02-06)**
- OK Auth
- OK Profiles
- OK Devices
- OK Webhook
- OK Readings

**IDs generados (ejemplo de prueba global)**
- pet_id: `02576c11-84a1-4b78-98f8-a2568fc7e179`
- device_id: `11b5b64b-f212-4527-a9e7-c323ad59ba5c`
- reading_id: `35b5f976-abff-40a4-a673-bc5afcdec46e`

**IDs generados (corrida adicional 2026-02-06)**
- pet_id: `02576c11-84a1-4b78-98f8-a2568fc7e179`
- device_id: `90fb4851-fd08-4dc7-a16b-591172b76370`
- reading_id: `039f5519-0c16-48bd-a074-a2537cd7b387`
- recorded_at: `2026-02-06T19:41:51.147+00:00`

**IDs generados (corrida UI real 2026-02-07)**
- pet_id: `edd4e20f-afca-4b49-ab9f-dc5f345093fc`
- device_id: `7086b60a-9f1a-489b-9368-06fe373181eb`
- device_code: `KPCL0200`
- reading_id: `5ccda865-0276-4248-9767-eb2ec8b17efe`
- recorded_at: `2026-02-07T22:35:39.802+00:00`

**Recordatorio clave**
- `device_id` (UUID) **no** es `device_code` (KPCLxxxx).
- `/api/readings` requiere `device_id`.

**Cambio confirmado (2026-02-06)**
- `POST /api/devices` exige `pet_id` (schema lo requiere).
- Prueba OK con `pet_id` valido.

---

## 1) Prueba de conexion MQTT (HiveMQ)
**Objetivo:** confirmar que el dispositivo publica.

**Pasos**
1. Entrar a HiveMQ Web Client.
2. Conectar con:
   - Host: `<TU_HOST_HIVEMQ>`
   - Port: `8883`
3. Suscribirse a topic: `+/SENSORS`
4. Encender dispositivo.

**Esperado**
- Mensajes visibles en el Web Client.

---

## 2) Prueba Bridge (MQTT -> API)
**Objetivo:** confirmar que el bridge recibe mensajes.

**Pasos**
1. Revisar logs del bridge:
   - `journalctl -u kittypau-bridge -f`
2. Encender dispositivo.

**Esperado**
- Log: "MQTT connected"
- Log: "Subscribed to: +/SENSORS"
- Log: "Webhook ok"

---

## 3) Prueba Webhook (API)
**Objetivo:** confirmar que la API recibe datos.

**Pasos**
1. En Vercel -> Logs.
2. Enviar mensaje desde el dispositivo.

**Esperado**
- Log de POST a `/api/mqtt/webhook`
- Respuesta `200`

---

## 4) Prueba guardado en Supabase
**Objetivo:** confirmar que los datos se guardan.

**Pasos**
1. Abrir Supabase -> Table Editor -> `readings`
2. Verificar nueva fila.

**Esperado**
- Nueva fila con `device_id` y `recorded_at` actual.
- `devices.last_seen` actualizado.

---

## 5) Prueba Realtime
**Objetivo:** confirmar streaming en frontend.

**Pasos**
1. Abrir app web.
2. Escuchar en tiempo real (Realtime).
3. Enviar mensaje desde dispositivo.

**Esperado**
- UI se actualiza con la nueva lectura sin refrescar.

---

## 6) Prueba de integridad de device_code
**Objetivo:** validar que el `device_code` llegue en el payload (lo inyecta el Bridge).

**Pasos**
1. Publicar mensaje con topic `KPCLXXXX/SENSORS`
2. Verificar que el Bridge agregue `deviceCode` en el payload hacia `/api/mqtt/webhook`.

**Esperado**
- Se crea lectura asociada a `KPCLXXXX`.
- Si el Bridge no agrega `deviceCode`, el webhook debe responder `400`.

---

## 7) Errores comunes y solucion
**No llega a HiveMQ**
- Revisar credenciales MQTT.
- Verificar topic.

**HiveMQ ok pero no llega a Vercel**
- Bridge caido.
- `WEBHOOK_URL` mal.

**Vercel ok pero no guarda en Supabase**
- `device_code` no existe en `devices`.
- `SUPABASE_SERVICE_ROLE_KEY` incorrecta.

---

## 8) Smoke test RLS (multiusuario)
**Objetivo:** verificar que un usuario no puede leer datos de otro.

**Pasos**
1. Crear usuario B en Supabase Auth.
2. Obtener `access_token` del usuario B.
3. Con token B ejecutar:
   - `GET /api/devices` (debe devolver array vacio o 403).
   - `GET /api/pets` (debe devolver array vacio o 403).
4. Intentar `GET /api/readings?device_id=<UUID de usuario A>`.

**Esperado**
- No hay datos de usuario A.
- No se filtra ningun `device_id` ajeno.

**Resultado (2026-02-07)**
- Usuario A: `c0926551-11e9-48cd-b24f-23d009f85cb6`
- Usuario B: `1f1c1467-60ad-44e3-88fc-bc8dc9785bea`
- pet_id B: `709afc2d-bfe1-49b1-a377-70cb366f8a8a`
- device_id B: `edd4e20f-afca-4b49-ab9f-dc5f345093fc`
- `GET /api/pets` con token A -> OK (solo mascotas de A)
- `GET /api/pets` con token B -> OK (solo mascotas de B)
- `PATCH /api/devices/:id` sobre device de B con token A -> `404` (row no visible, RLS ok)
- `GET /api/readings?device_id=<device B>` con token A -> `404` (row no visible, RLS ok)

---

## Automatizacion
Ver `Docs/AUTOMATIZACION_TESTS.md`.

---

## Checklist final
- [ ] MQTT ok
- [ ] Bridge ok
- [ ] Webhook ok
- [ ] Supabase ok
- [ ] Realtime ok

**Resultado (corrida real 2026-02-07, KPCL0300)**
- Token A y B: OK
- `GET /api/pets` A/B: OK (RLS correcto)
- Device creado: `KPCL0300`
- Webhook: OK
- Readings: OK
