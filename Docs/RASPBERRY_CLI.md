# Raspberry CLI (Kittypau Bridge)

## Objetivo
Operar y diagnosticar el bridge en Raspberry Pi.

## Acceso
```bash
ssh pi@<RASPBERRY_IP>
```

## Sistema y red
```bash
uname -a
uptime
df -h
ip a
ping -c 3 8.8.8.8
```

## Servicios (systemd)
Ver estado:
```bash
systemctl status kittypau-bridge
```

Reiniciar:
```bash
sudo systemctl restart kittypau-bridge
```

Logs:
```bash
journalctl -u kittypau-bridge -n 200 --no-pager
```

## MQTT (si se usa cliente local)
Suscribirse:
```bash
mqtt sub -h <HOST> -p 8883 -t "+/SENSORS" -u <USER> -P <PASS> --ssl
```

Publicar:
```bash
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/SENSORS" -m '{"weight":3500,"temp":23.5,"hum":65}' -u <USER> -P <PASS> --ssl
```

Ejemplo Kittypau:
```bash
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/SENSORS" -m '{"timestamp":"2026-02-08T02:00:00Z","weight":3500,"temp":23.5,"hum":65}' -u <USER> -P <PASS> --ssl
```

## Buenas practicas
- No guardar secretos en el repo.
- Usar `.env` local en la Raspberry.
