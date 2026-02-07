# Raspberry Pi Zero 2 W - Bridge MQTT (Kittypau)

## Objetivo
Usar la Raspberry Pi Zero 2 W como puente 24/7 entre HiveMQ y la API en Vercel.
Esta documentacion integra la construccion IoT actual (MQTT/HiveMQ) y deja preparado el flujo para cambios futuros sin romper el contrato hacia la API.

---

## Alcance (lo que hace y lo que NO hace)
**Hace**
- Se conecta a HiveMQ (MQTT).
- Escucha topics IoT (ver `Docs/TOPICOS_MQTT.md`).
- Normaliza payloads y envia `POST` a `/api/mqtt/webhook`.

**No hace**
- No consulta datos (no hace `GET`).
- No almacena datos finales (solo reenvia).
- No reemplaza la API ni la DB.
- No se conecta directamente a Supabase en produccion (el backend en Vercel es el unico que escribe en DB).

---

## Dependencias
- Raspberry Pi Zero 2 W con Raspberry Pi OS (Lite recomendado)
- Acceso SSH
- Conexion Wi-Fi estable
- Node.js 18+

---

## Variables de entorno del bridge
```
MQTT_HOST=<TU_HOST_HIVEMQ>
MQTT_PORT=8883
MQTT_USERNAME=<TU_USUARIO>
MQTT_PASSWORD=<TU_PASSWORD>
MQTT_TOPIC=+/SENSORS
WEBHOOK_URL=https://kittypau-app.vercel.app/api/mqtt/webhook
WEBHOOK_TOKEN=<TU_WEBHOOK_TOKEN>
```
**Regla**: `WEBHOOK_TOKEN` debe ser igual a `MQTT_WEBHOOK_SECRET` en Vercel.

**Nota**: si el firmware publica en otro patron (ej. `kittypau/+/telemetry`), ajustar `MQTT_TOPIC` en el bridge.

**Nota de seguridad**: las credenciales reales (WiFi, HiveMQ, Supabase) se guardan en `.env` local del bridge y no se documentan aqui.

---

## Certificados, accesos y manejo seguro (sin exponer secretos)
Este bloque define **que debe tener el codigo** del bridge respecto a certificados, accesos y envs.

### 1) Certificado TLS (HiveMQ)
- El cliente MQTT debe usar TLS y confiar en el CA (ej. ISRG Root X1).
- Se puede cargar el CA via archivo (`ca.crt`) o embebido en codigo.
- **No** hardcodear credenciales MQTT en el codigo.

### 2) Accesos y archivos locales
- `.env` vive en `/home/kittypau/kittypau-bridge/.env` (fuera de git).
- Permisos recomendados: `chmod 600 .env`.
- Usuario del proceso: `kittypau` (systemd).

### 3) Variables obligatorias (placeholders)
```
MQTT_HOST=<TU_HOST_HIVEMQ>
MQTT_PORT=8883
MQTT_USERNAME=<TU_USUARIO>
MQTT_PASSWORD=<TU_PASSWORD>
MQTT_TOPIC=+/SENSORS
WEBHOOK_URL=https://kittypau-app.vercel.app/api/mqtt/webhook
WEBHOOK_TOKEN=<TU_WEBHOOK_TOKEN>
```
- `WEBHOOK_TOKEN` = `MQTT_WEBHOOK_SECRET` (Vercel).

### 4) Reglas de no exposicion
- Nunca versionar `.env` ni claves.
- No copiar credenciales en documentación.
- Si se comparte el repo, usar placeholders.

### 5) Rotacion y cambios
- Cambiar credenciales HiveMQ y `WEBHOOK_TOKEN` si se sospecha fuga.
- Al rotar, actualizar `.env` en la Pi y variables en Vercel.

### 6) Validaciones minimas en runtime
- Verificar que envs existan al iniciar (fail fast).
- Loggear error claro si falta alguna variable.

---

## Contrato de datos (Bridge -> API)
**Endpoint**
```
POST /api/mqtt/webhook
Headers:
  x-webhook-token: <WEBHOOK_TOKEN>
  Content-Type: application/json
```

**Payload obligatorio**
```json
{
  "deviceCode": "KPCL0001",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "water_ml": 120,
  "flow_rate": 120,
  "timestamp": "2026-02-03T18:30:00Z"
}
```
Notas:
- `deviceCode` **es obligatorio**. Si el payload del IoT no lo trae, el Bridge debe inferirlo del topic y agregarlo.
- `timestamp` es opcional. Si no se envia, la API usa hora actual.
- La API acepta `deviceCode`, `deviceId` o `device_id`, pero **recomendacion oficial**: enviar `deviceCode`.

**Validaciones de rango (API)**
- `temperature`: -10 a 60
- `humidity`: 0 a 100
- `battery_level`: 0 a 100
- `weight_grams`: 0 a 20000
- `water_ml`: 0 a 5000
- `flow_rate`: 0 a 1000
- `deviceCode`: formato `KPCL0000`

**Errores esperados**
- `401 Unauthorized`: token invalido o faltante.
- `400 Bad Request`: payload invalido (campos faltantes o fuera de rango).
- `404 Not Found`: `deviceCode` no existe en `devices`.

---

## Mapeo de topics IoT -> payload API
El firmware actual publica en:
- `KPCLXXXX/SENSORS` (sensores)
- `KPCLXXXX/STATUS` (estado)
- `KPCLXXXX/cmd` (comandos)

El bridge debe traducir los mensajes de `SENSORS` al contrato del webhook:

| IoT (SENSORS) | API (webhook) |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `ldr` | (opcional, no se persiste hoy) |
| `timestamp` | `timestamp` |

Para `STATUS`, hoy **no** se guarda un payload separado en la DB. Si se necesita, se recomienda:
- Usar `devices` para `last_seen` y `battery_level` (ya existe trigger).
- Extender schema con columnas de `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`.

---

## Requisitos del codigo del Bridge (Raspberry)
El bridge debe cumplir estos puntos para mantener compatibilidad con HiveMQ, Vercel y Supabase:

### 1) Conexion HiveMQ
- Conectar por TLS a `MQTT_HOST:MQTT_PORT`.
- Suscribirse al topic configurable `MQTT_TOPIC`.
- Reconectar automaticamente con backoff.

### 2) Normalizacion del payload
- Convertir el payload IoT (`SENSORS`) al contrato del webhook.
- Inyectar `deviceCode` desde el topic (`KPCLXXXX`).
- Validar que `deviceCode` respete formato `KPCL0000`.

### 3) Integracion con Vercel (API)
- Enviar `POST` a `WEBHOOK_URL` con header `x-webhook-token`.
- Manejar respuestas `200/400/401/404` y loggear errores.
- Reintentar en errores transitorios.

### 4) Supabase (relacion indirecta)
- El bridge **no** escribe en Supabase directamente.
- Toda escritura pasa por `/api/mqtt/webhook`.
- Esto permite mantener RLS/validaciones centralizadas.

### 5) Observabilidad minima
- Logs para: conecto MQTT, recibio mensaje, envio webhook, respuesta.
- Si falla, dejar codigo/razon en log.

---

## Flujo completo
1. Dispositivo publica MQTT en HiveMQ.
2. Bridge recibe mensaje.
3. Bridge construye payload y agrega `deviceCode`.
4. Bridge hace `POST` a `/api/mqtt/webhook`.
5. API guarda en `readings` y actualiza `devices.last_seen`.

---

## Estrategia para cambios futuros
**Si cambia el firmware o el payload IoT**:
- Actualizar el mapeo de payload en el Bridge.
- Mantener estable el contrato hacia la API.

**Si cambia la API**:
- Ajustar el Bridge para cumplir el nuevo contrato.
- Versionar el payload en docs si se rompe compatibilidad.

---

## Observabilidad
- Logs del Bridge (journald):
  `journalctl -u kittypau-bridge -f`
- Logs en Vercel: buscar POST a `/api/mqtt/webhook`
- Supabase: tabla `readings`

---

## Service 24/7 (referencia)
> Esta parte queda para el equipo de infraestructura.
- `systemd` con auto-restart.
- watchdog opcional.
- buffer offline opcional.

---

## Pruebas de funcionamiento (minimas)
1. Enviar mensaje MQTT desde un simulador.
2. Ver log de POST exitoso.
3. Ver nueva fila en `readings`.

