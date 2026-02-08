# HiveMQ MQTT CLI (mqtt-cli)

## Objetivo
Probar conexiones MQTT y publicar/suscribirse a tópicos.

## Repo oficial
- Proyecto: `hivemq/mqtt-cli` (Apache 2.0)

## Instalación
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

## Comandos básicos
Ayuda:
```bash
mqtt --help
```

Suscripción:
```bash
mqtt sub -h <HOST> -p 8883 -t "+/SENSORS" -u <USER> -P <PASS> --ssl
```

Publicación:
```bash
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/SENSORS" -m '{"temperature":23.5}' -u <USER> -P <PASS> --ssl
```

## Ejemplo Kittypau (tópico real)
```bash
mqtt sub -h <HOST> -p 8883 -t "+/SENSORS" -u <USER> -P <PASS> --ssl
mqtt pub -h <HOST> -p 8883 -t "KPCL0001/SENSORS" -m '{"temperature":23.5,"humidity":65,"weight":3500,"temp":23.5,"hum":65}' -u <USER> -P <PASS> --ssl
```

## Modo shell (opcional)
```bash
mqtt shell
```

## Notas
- Usar TLS (`--ssl`) en HiveMQ Cloud.
- Reemplazar `<HOST>`, `<USER>`, `<PASS>`.
- Referencia de tópicos y payload: `Docs/TOPICOS_MQTT.md`.
