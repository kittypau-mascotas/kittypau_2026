# Puente MQTT -> API (Kittypau)

Este servicio escucha en HiveMQ y reenvia los mensajes al webhook de tu API.

## Requisitos
- Node.js 18+

## Configuracion
Crear un archivo `.env` en esta carpeta con:
```
MQTT_HOST=cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=Kittypau
MQTT_PASSWORD=Kittypau1234
MQTT_TOPIC=kittypau/+/telemetry
WEBHOOK_URL=https://kittypau-app.vercel.app/api/mqtt/webhook
WEBHOOK_TOKEN=3f8c9d6a7b4e2f1d0c9a8b7e6d5c4f3a
```

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
