# Raspberry Pi Zero 2 W - Bridge MQTT (Kittypau)

## Objetivo
Usar la Raspberry Pi Zero 2 W como puente 24/7 entre HiveMQ y la API en Vercel.

---

## Requisitos
- Raspberry Pi Zero 2 W con Raspberry Pi OS (Lite recomendado)
- Acceso SSH
- Conexion Wi-Fi estable

---

## Stack en la Raspberry
1. **Bridge MQTT -> API** (carpeta `bridge/`)
2. **systemd** para servicio 24/7
3. **Logs** locales (journald)

---

## Variables de entorno del bridge
```
MQTT_HOST=cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=Kittypau
MQTT_PASSWORD=Kittypau1234
MQTT_TOPIC=kittypau/+/telemetry
WEBHOOK_URL=https://kittypau-app.vercel.app/api/mqtt/webhook
WEBHOOK_TOKEN=3f8c9d6a7b4e2f1d0c9a8b7e6d5c4f3a
```

---

## Instalacion (resumen)
1. Instalar Node.js 18+
2. Clonar repo `kittypau_2026`
3. Entrar a `bridge/` y crear `.env`
4. `npm install`
5. Ejecutar `npm start` para prueba

---

## Servicio 24/7 (systemd)
- Crear servicio `kittypau-bridge.service`
- Habilitar auto-restart
- Ver logs con `journalctl -u kittypau-bridge -f`

---

## Extras recomendados (futuro)
- Buffer offline (guardar mensajes si se cae internet)
- Watchdog (reinicio si se cuelga)
- Mosquitto local para pruebas
