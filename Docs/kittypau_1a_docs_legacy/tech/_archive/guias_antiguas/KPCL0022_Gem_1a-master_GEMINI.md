# Resumen de Funcionalidades del Código `KPCL0022_Gem_1a`

Este documento describe las funcionalidades del código para el dispositivo ESP8266 en el proyecto `aws-esp8266-main`.

## Características Principales

El código implementa una estación de monitoreo de sensores que se conecta a AWS IoT Core para enviar y recibir datos.

### Conectividad
- **WiFi:** Se conecta a una red WiFi. Las credenciales se pueden almacenar en un archivo `wifi.txt` en el sistema de archivos LittleFS. Si el archivo no existe, utiliza credenciales predeterminadas. También permite la actualización remota de las credenciales a través de MQTT.
- **MQTT:** Utiliza el protocolo MQTT para comunicarse de forma segura con AWS IoT Core. Publica datos de sensores y se suscribe a un tema para recibir comandos.
- **NTP:** Sincroniza la hora del dispositivo con un servidor NTP para obtener timestamps precisos.

### Sensores Integrados
- **DHT11:** Mide la temperatura y la humedad del ambiente.
- **HX711 (Celda de Carga):** Mide el peso. Incluye una función de "tara" que se puede activar remotamente para calibrar el cero. El valor de la tara se guarda en la memoria del dispositivo.
- **Fotorresistencia (LDR):** Mide el nivel de luz ambiental.

### Flujo de Operación
1.  **Inicialización:** Al arrancar, el dispositivo lee las credenciales WiFi, se conecta a la red, sincroniza la hora y establece la conexión con AWS IoT Core.
2.  **Lectura de Sensores:** Periódicamente (intervalo configurable, por defecto 5 segundos), lee los valores de todos los sensores.
3.  **Publicación de Datos:** Envía los datos recolectados (ID del dispositivo, timestamp, humedad, temperatura, luz, peso y estado) en formato JSON al tema MQTT `KPCL0022/pub`.
4.  **Recepción de Comandos:** Escucha en el tema `KPCL0022/sub` para recibir comandos remotos.

### Comandos Remotos (vía MQTT)
El dispositivo puede ser controlado remotamente mediante mensajes JSON:
- **Actualizar Credenciales WiFi:** Enviando un JSON con los campos `ssid` y `password`.
- **Calibrar Balanza (Tara):** Enviando un JSON con `{ "tare": true }`.
- **Cambiar Intervalo de Muestreo:** Enviando un JSON con el campo `interval` (en milisegundos).

### Manejo de Errores y Estado
- **Reconexión Automática:** Si se pierde la conexión WiFi o MQTT, el dispositivo intenta reconectarse automáticamente con un sistema de reintentos con tiempo de espera incremental.
- **Indicador LED:** Utiliza el LED incorporado para notificar eventos como la publicación de datos o los intentos de reconexión.

### Sistema de Archivos (LittleFS)
- **`wifi.txt`:** Almacena el SSID y la contraseña de la red WiFi.
- **`scale_offset.txt`:** Guarda el valor de offset de la celda de carga para mantener la calibración entre reinicios.
