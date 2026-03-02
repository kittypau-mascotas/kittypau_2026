# Documentación de Tópicos MQTT

Este documento detalla los tópicos MQTT utilizados por el dispositivo `KPCL0037`, incluyendo su función, estructura de payload y ejemplos.

## Tópicos Publicados (Device to Broker)

### 1. `KPCL0037/SENSORS`
*   **Descripción:** Publica los datos de los sensores (peso, temperatura, humedad, LDR) del dispositivo.
*   **Frecuencia:** Periódica (definida por `SENSOR_PUBLISH_INTERVAL` en `main.cpp`).
*   **Payload (JSON):**
    ```json
    {
        "timestamp": "MM-dd-aaaa HH:mm:ss",
        "weight": 0.00,
        "temp": 0.00,
        "hum": 0.00,
        "ldr": 0
    }
    ```
*   **Ejemplo:**
    ```json
    {"timestamp":"01-09-2026 16:06:28","weight":0.44,"temp":26.60,"hum":39.40,"ldr":7}
    ```
*   **Consideraciones:**
    *   `temp` y `hum` pueden ser `null` si hay un error de lectura del sensor DHT.
    *   `ldr` es un valor entero.

### 2. `KPCL0037/STATUS`
*   **Descripción:** Publica el estado actual del dispositivo (conectividad WiFi, estado del dispositivo, salud de los sensores).
*   **Frecuencia:** Periódica (definida por `STATUS_PUBLISH_INTERVAL` en `main.cpp`).
*   **Payload (JSON):**
    ```json
    {
        "wifi_status": "Conectado" | "Desconectado",
        "wifi_ssid": "NombreRedWiFi",
        "wifi_ip": "192.168.1.100",
        "KPCL0037": "Online" | "Offline",
        "sensor_health": "OK" | "ERR_HX711" | "ERR_DHT" | "Initializing"
    }
    ```
*   **Ejemplo:**
    ```json
    {"wifi_status":"Conectado","wifi_ssid":"Casa 15","wifi_ip":"192.168.1.100","KPCL0037":"Online","sensor_health":"OK"}
    ```
*   **Consideraciones:**
    *   El campo `wifi_ssid` muestra el nombre de la red WiFi a la que está conectado el dispositivo (vacío si está desconectado).
    *   El campo `wifi_ip` muestra la dirección IP asignada al dispositivo (vacío si está desconectado).
    *   El campo `KPCL0037` (que representa el `DEVICE_ID`) indica si el dispositivo está "Online" o "Offline" según la lógica de `main.cpp`.

## Tópicos Suscritos (Broker to Device)

### 1. `KPCL0037/cmd`
*   **Descripción:** Recibe comandos para controlar el dispositivo.
*   **Payload (JSON):** Varía según el comando.
*   **Ejemplos de Comandos:**

    #### a) `ADDWIFI` (Añadir Credenciales WiFi)
    *   **Función:** Permite añadir nuevas redes WiFi a la lista de redes conocidas del dispositivo.
    *   **Payload:**
        ```json
        {
            "command": "ADDWIFI",
            "ssid": "nombre_de_red",
            "pass": "contraseña_de_red"
        }
        ```
    *   **Ejemplo:**
        ```json
        {"command":"ADDWIFI","ssid":"MiWiFi","pass":"MiContrasena"}
        ```

    #### b) `CALIBRATE_WEIGHT` (Calibración del Sensor de Peso)
    *   **Función:** Permite realizar operaciones de calibración en el sensor de peso (tare o establecer factor de escala).
    *   **Payload:**
        *   **Para TARE (poner a cero la báscula):**
            ```json
            {
                "command": "CALIBRATE_WEIGHT",
                "action": "tare"
            }
            ```
        *   **Para SET_SCALE (establecer factor de calibración):**
            ```json
            {
                "command": "CALIBRATE_WEIGHT",
                "action": "set_scale",
                "factor": 4205.70
            }
            ```
            (Reemplazar `4205.70` con el factor de calibración calculado).
    *   **Ejemplo:**
        ```json
        {"command":"CALIBRATE_WEIGHT","action":"tare"}
        ```
        ```json
        {"command":"CALIBRATE_WEIGHT","action":"set_scale","factor":4205.70}
        ```
