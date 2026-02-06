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

## Pruebas de funcionamiento
1. Verificar conexion MQTT (logs de bridge).
2. Enviar mensaje desde el ESP32.
3. Confirmar insercion en `readings` (Supabase).
4. Confirmar actualizacion de `devices.last_seen`.

---

## Variables de entorno del bridge
```
MQTT_HOST=<TU_HOST_HIVEMQ>
MQTT_PORT=8883
MQTT_USERNAME=<TU_USUARIO>
MQTT_PASSWORD=<TU_PASSWORD>
MQTT_TOPIC=kittypau/+/telemetry
WEBHOOK_URL=https://kittypau-app.vercel.app/api/mqtt/webhook
WEBHOOK_TOKEN=<TU_WEBHOOK_TOKEN>
```
Nota: no guardar credenciales reales en Git. Usar `.env` local en la Raspberry.

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
