# Pruebas End-to-End (Kittypau)

## Objetivo
Validar el flujo completo: IoT -> HiveMQ -> Raspberry Bridge -> Vercel API -> Supabase -> Realtime.

---

## Prerrequisitos
- Vercel deploy activo: `https://kittypau-app.vercel.app`
- Supabase con tablas y RLS aplicados (`Docs/SQL_SCHEMA.sql`)
- Raspberry Bridge funcionando 24/7
- Device registrado en `devices` con `device_code` real

---

## 1) Prueba de conexion MQTT (HiveMQ)
**Objetivo:** confirmar que el dispositivo publica.

**Pasos**
1. Entrar a HiveMQ Web Client.
2. Conectar con:
   - Host: `cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud`
   - Port: `8883`
   - Usuario: `Kittypau`
3. Suscribirse a topic: `kittypau/#`
4. Encender dispositivo.

**Esperado**
- Mensajes visibles en el Web Client.

---

## 2) Prueba Bridge (MQTT -> API)
**Objetivo:** confirmar que el bridge recibe mensajes.

**Pasos**
1. Revisar logs del bridge en Raspberry:
   - `journalctl -u kittypau-bridge -f`
2. Encender dispositivo.

**Esperado**
- Log: "MQTT connected"
- Log: "Subscribed to: kittypau/+/telemetry"
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
**Objetivo:** validar que el código se extrae del topic si no viene en payload.

**Pasos**
1. Publicar mensaje con topic `kittypau/KPCL001/telemetry`
2. Enviar payload sin device_code.

**Esperado**
- Se crea lectura asociada a `KPCL001`.

---

## 7) Errores comunes y solución
**No llega a HiveMQ**
- Revisar credenciales MQTT.
- Verificar topic.

**HiveMQ ok pero no llega a Vercel**
- Bridge caído.
- `WEBHOOK_URL` mal.

**Vercel ok pero no guarda en Supabase**
- `device_code` no existe en `devices`.
- `SUPABASE_SERVICE_ROLE_KEY` incorrecta.

---

## Checklist final
- [ ] MQTT ok
- [ ] Bridge ok
- [ ] Webhook ok
- [ ] Supabase ok
- [ ] Realtime ok
