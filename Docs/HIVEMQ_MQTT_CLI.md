# HiveMQ MQTT CLI (mqtt-cli)

## Objetivo
Probar conexiones MQTT y publicar/suscribirse a topicos.

## Repo oficial
- Proyecto: `hivemq/mqtt-cli` (Apache 2.0)

## Instalacion
Windows:
- Descargar ZIP desde releases y ejecutar `mqtt-cli.exe`.

macOS (Homebrew):
```bash
brew tap hivemq/mqtt-cli
brew install mqtt-cli
```

Linux (deb/rpm):
```bash
sudo dpkg -i mqtt-cli-<version>.deb
# o
sudo yum install -y mqtt-cli-<version>.rpm
```

## Comandos basicos
Ayuda:
```bash
mqtt --help
```

Suscripcion:
```bash
mqtt sub -h <HOST> -p 8883 -t "kittypau/+/telemetry" -u <USER> -P <PASS> --ssl
```

Publicacion:
```bash
mqtt pub -h <HOST> -p 8883 -t "kittypau/<DEVICE_CODE>/telemetry" -m '{"temperature":23.5}' -u <USER> -P <PASS> --ssl
```

## Ejemplo Kittypau (topico real)
```bash
mqtt sub -h <HOST> -p 8883 -t "kittypau/+/telemetry" -u <USER> -P <PASS> --ssl
mqtt pub -h <HOST> -p 8883 -t "kittypau/KPCL0001/telemetry" -m '{"temperature":23.5,"humidity":65,"weight_grams":3500,"battery_level":85,"flow_rate":120}' -u <USER> -P <PASS> --ssl
```

## Modo shell (opcional)
```bash
mqtt shell
```

## Notas
- Usar TLS (`--ssl`) en HiveMQ Cloud.
- Reemplazar `<HOST>`, `<USER>`, `<PASS>`.
