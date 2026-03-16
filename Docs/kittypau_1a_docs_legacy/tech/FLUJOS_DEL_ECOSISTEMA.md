# Flujos de Datos Principales del Ecosistema KittyPaw

## 1. Introducción

Este documento detalla, paso a paso, las secuencias de interacción entre los diferentes componentes del ecosistema KittyPaw para los procesos críticos del negocio. Sirve como una guía para entender cómo viaja la información a través del sistema.

---

## 2. Flujo 1: Registro de un Nuevo Dispositivo (Onboarding)

**Objetivo:** Que un usuario (`Ana`) añada un nuevo dispositivo a su cuenta de forma segura y sencilla.

**Actores:**
*   `Usuario`: Ana, interactuando con la app.
*   `App Cliente`: La aplicación React corriendo en el navegador o móvil.
*   `Backend`: El servidor Node.js.
*   `Base de Datos`: PostgreSQL.
*   `Dispositivo Físico`: El comedero/bebedero con su QR.

**Secuencia:**

1.  **`Usuario`** -> Inicia el proceso "Añadir Dispositivo" en la `App Cliente`.
2.  **`App Cliente`** -> Abre la interfaz de la cámara.
3.  **`Usuario`** -> Escanea el código QR del `Dispositivo Físico`.
4.  **`App Cliente`** -> Extrae el `deviceId` (ej: `KPCL0022-ABC-123`) del código QR.
5.  **`App Cliente` -> `Backend`**: Realiza una petición autenticada a la API. 
    *   `POST /api/devices/claim`
    *   **Body:** `{ "deviceId": "KPCL0022-ABC-123" }`
    *   **Header:** `Authorization: Bearer [Token de Sesión de Ana]`
6.  **`Backend`** -> Valida el token de sesión para identificar al usuario (`userId` de Ana).
7.  **`Backend` -> `Base de Datos`**: Ejecuta una consulta para buscar el `deviceId`.
    *   `SELECT * FROM devices WHERE id = 'KPCL0022-ABC-123';`
8.  **`Backend`** -> Verifica que el dispositivo existe y su campo `user_id` es `NULL` (estado "unclaimed").
9.  **`Backend` -> `Base de Datos`**: Ejecuta una actualización para asociar el dispositivo con el usuario.
    *   `UPDATE devices SET user_id = [userId de Ana] WHERE id = 'KPCL0022-ABC-123';`
10. **`Backend` -> `App Cliente`**: Responde con un `200 OK` y los datos del dispositivo recién asociado.
11. **`App Cliente`** -> Muestra un mensaje de éxito ("¡Dispositivo añadido!") y actualiza la lista de dispositivos del usuario en la interfaz.

---

## 3. Flujo 2: Registro de un Evento de Consumo

**Objetivo:** Registrar un evento de consumo (la mascota come/bebe) y mostrarlo en el dashboard del usuario.

**Actores:**
*   `Mascota`: El gato, Milo.
*   `Dispositivo IoT`: El firmware corriendo en el ESP32.
*   `Broker MQTT`: El servidor MQTT (ej. AWS IoT Core).
*   `Backend (Listener)`: Un servicio en el backend suscrito a los tópicos MQTT.
*   `Base de Datos`: PostgreSQL.
*   `App Cliente`: La aplicación del usuario.

**Secuencia:**

1.  **`Mascota`** -> Come del plato.
2.  **`Dispositivo IoT`** -> El `ScaleManager` detecta el inicio, la duración y el fin del evento. Al terminar, genera un objeto `ConsumptionEvent` con los datos (ej: `{ amount: 15.5g, duration: 62s }`).
3.  **`Dispositivo IoT` -> `Broker MQTT`**: El `MqttManager` serializa el evento a JSON y lo publica en el tópico correspondiente.
    *   **Tópico:** `devices/KPCL0022-ABC-123/events`
    *   **Payload:** `{"eventType":"consumo","payload":{"amount_consumed_grams":15.5,"duration_seconds":62}}`
4.  **`Broker MQTT` -> `Backend (Listener)`**: El broker reenvía el mensaje a todos los suscriptores de ese tópico. El listener del backend es uno de ellos.
5.  **`Backend (Listener)`** -> Recibe el payload JSON. Extrae el `deviceId` del tópico.
6.  **`Backend (Listener)` -> `Base de Datos`**: Inserta un nuevo registro en la tabla `consumption_events`.
    *   `INSERT INTO consumption_events (device_id, amount, duration, timestamp) VALUES ('KPCL0022-ABC-123', 15.5, 62, NOW());`

**¿Cómo ve el usuario el dato? (Dos caminos):**

*   **Camino A (Tiempo Real):**
    7A. Si la `App Cliente` está abierta, esta tiene su propio cliente MQTT suscrito al mismo tópico (`devices/KPCL0022-ABC-123/events`).
    8A. La `App Cliente` recibe el mensaje del `Broker MQTT` al mismo tiempo que el backend y actualiza el gráfico del dashboard instantáneamente.

*   **Camino B (Carga de Datos):**
    7B. El usuario abre la `App Cliente` o navega al dashboard.
    8B. **`App Cliente` -> `Backend`**: Realiza una petición a la API para obtener los datos históricos.
        *   `GET /api/devices/KPCL0022-ABC-123/events?range=24h`
    9B. **`Backend` -> `Base de Datos`**: Consulta la tabla `consumption_events` para ese dispositivo en el rango de tiempo solicitado.
    10B. **`Backend` -> `App Cliente`**: Devuelve una lista de los eventos en formato JSON.
    11B. **`App Cliente`** -> Renderiza los datos en el gráfico del dashboard.
