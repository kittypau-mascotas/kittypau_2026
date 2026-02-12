# Puente MQTT -> API (Kittypau)

Este servicio escucha en HiveMQ y reenvia los mensajes al webhook de tu API.

## Requisitos
- Node.js 18+

## Configuracion
Crear un archivo `.env` en esta carpeta con:
```
MQTT_HOST=<TU_HOST_HIVEMQ>
MQTT_PORT=8883
MQTT_USERNAME=<TU_USUARIO>
MQTT_PASSWORD=<TU_PASSWORD>
MQTT_TOPIC=kittypau/+/telemetry
WEBHOOK_URL=https://kittypau-app.vercel.app/api/mqtt/webhook
WEBHOOK_TOKEN=<TU_WEBHOOK_TOKEN>

# Heartbeat (bridge -> API)
BRIDGE_ID=KPBR0001
BRIDGE_HEARTBEAT_URL=https://kittypau-app.vercel.app/api/bridge/heartbeat
BRIDGE_HEARTBEAT_TOKEN=<TU_BRIDGE_HEARTBEAT_TOKEN>
HEARTBEAT_INTERVAL_SEC=30
```

Notas:
- `WEBHOOK_TOKEN` debe coincidir con `MQTT_WEBHOOK_SECRET` en Vercel.
- `BRIDGE_HEARTBEAT_TOKEN` debe coincidir con `BRIDGE_HEARTBEAT_SECRET` en Vercel.
- No versionar `.env`.

## Nota sobre device_code
Si el payload no trae `deviceId`/`deviceCode`, el bridge intenta obtenerlo del topic.
Ejemplo: `kittypau/KPCL001/telemetry` -> deviceCode = `KPCL001`.

## Instalar dependencias
```
npm install
```

## Ejecutar
```
npm start
```

## Notas
- Este servicio funciona como alternativa cuando HiveMQ no ofrece webhooks nativos en el plan Free.
- Si lo usas en produccion, despliega este puente en un servicio 24/7 (Railway, Render, Fly.io).

## Seguridad
Si alguna credencial se expuso por error, debes rotarla inmediatamente (HiveMQ + tokens de Vercel).
