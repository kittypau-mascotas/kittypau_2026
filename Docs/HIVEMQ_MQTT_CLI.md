# HiveMQ MQTT CLI (mqtt-cli)

## Objetivo
Probar conectividad MQTT, publicar/suscribir payloads y vlidar topicos KPCL/KPBR.

## Referencia oficial
- `hivemq/mqtt-cli`

## 1) Instalacion

Windows:
- Descargar release de `mqtt-cli` y agregar binario al `PATH`.

macOS:
```bash
brew tap hivemq/mqtt-cli
brew install mqtt-cli
```

Linux:
```bash
sudo dpkg -i mqtt-cli-<versin>.deb
# o
sudo yum install -y mqtt-cli-<versin>.rpm
```

## 2) Verificar CLI
```bash
mqtt --help
```

## 3) Suscripcion base (sensores)
```bash
mqtt sub -h <HOST> -p 8883 -t "+/SENSORS" -u <USER> -P <PASS> --ssl
```

## 4) Suscripcion status
```bash
mqtt sub -h <HOST> -p 8883 -t "+/STATUS" -u <USER> -P <PASS> --ssl
```

## 5) Publicacion de prueba (SENSORS)
```bash
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/SENSORS" \
  -m '{"timestamp":"2026-03-02T12:00:00Z","weight":3500,"temp":23.5,"hum":65}' \
  -u <USER> -P <PASS> --ssl
```

## 6) Publicacion de prueba (STATUS)
```bash
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/STATUS" \
  -m '{"wifi_status":"Conectado","wifi_ssid":"Lab","wifi_ip":"192.168.1.50","KPCL0001":"Online","sensor_health":"OK"}' \
  -u <USER> -P <PASS> --ssl
```

## 7) Validacion esperada en Kittypau
1. Bridge recibe mensaje MQTT.
2. `/api/mqtt/webhook` responde 200.
3. Se inserta fila en `readings`.
4. `last_seen` y estado de dispositivo se actualizan.

## 8) Topicos oficiales
Revisar:
- `Docs/TOPICOS_MQTT.md`
- `Docs/RASPBERRY_BRIDGE.md`

## 9) Problems comunes
- Timeout TLS: revisar `--ssl`, host y puerto 8883.
- Sin mensajes en bridge: revisar topic exacto y wildcard.
- 400/404 en webhook: revisar formato `device_id` (`KPCL0000`) y registro del dispositivo.


