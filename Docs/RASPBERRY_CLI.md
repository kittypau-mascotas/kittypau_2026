# Raspberry CLI (Kittypau Bridge)

## Objetivo
Operar, diagnosticar y mantener el bridge en Raspberry Pi.

## 1) Acceso SSH
```bash
ssh kittypau@<RASPBERRY_IP>
# o con llave:
ssh -i <RUTA_KEY> kittypau@<RASPBERRY_IP>
```

## 2) Salud base del sistema
```bash
uname -a
uptime
free -h
df -h
ip a
ping -c 3 8.8.8.8
```

## 3) Servicio del bridge (systemd)
Estado:
```bash
sudo systemctl status kittypau-bridge
```

Reiniciar:
```bash
sudo systemctl restart kittypau-bridge
```

Habilitar en boot:
```bash
sudo systemctl enable kittypau-bridge
```

Logs:
```bash
journalctl -u kittypau-bridge -n 200 --no-pager
journalctl -u kittypau-bridge -f
```

## 4) Verificar env local del bridge
Ruta típica:
```bash
cat /home/kittypau/kittypau-bridge/.env
```

Permisos recomendados:
```bash
chmod 600 /home/kittypau/kittypau-bridge/.env
```

## 5) Test MQTT desde Raspberry (opcional)
Suscribirse:
```bash
mqtt sub -h <HOST> -p 8883 -t "+/SENSORS" -u <USER> -P <PASS> --ssl
```

Publicar:
```bash
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/SENSORS" \
  -m '{"timestamp":"2026-03-02T12:00:00Z","weight":3500,"temp":23.5,"hum":65}' \
  -u <USER> -P <PASS> --ssl
```

## 6) Validaciones operativas esperadas
- Bridge log:
  - `MQTT connected`
  - `Subscribed to: ...`
  - `Heartbeat ok`
  - `Webhook ok`
- API:
  - `POST /api/mqtt/webhook` 200
  - `POST /api/bridge/heartbeat` 200
- DB:
  - `bridge_heartbeats.last_seen` actualizado
  - `bridge_status_live` coherente

## 7) Health-check remoto
```bash
curl -H "x-bridge-token: <BRIDGE_HEARTBEAT_SECRET>" \
  "https://kittypau-app.vercel.app/api/bridge/health-check?stale_min=10&device_stale_min=10"
```

## 8) Problemas comunes
- Servicio caido: revisar `journalctl` y `.env`.
- Sin conexión MQTT: revisar host/credenciales/TLS.
- Webhook 401: `WEBHOOK_TOKEN` no coincide con secreto Vercel.
- Heartbeat 401: `BRIDGE_HEARTBEAT_TOKEN` no coincide con secreto Vercel.
