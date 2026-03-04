# Propuesta de Arquitectura Avanzada para Firmware

## 1. Objetivo

Definir una arquitectura de firmware para el dispositivo KittyPaw que sea robusta, escalable, mantenible y fácil de testear, utilizando herramientas y patrones de diseño modernos para sistemas embebidos.

## 2. Tecnologías Propuestas

*   **Entorno de Desarrollo:** **PlatformIO**.
    *   **Ventajas:** Gestión profesional de librerías (evita conflictos), integración con VSCode, sistema de builds configurable, y facilita las pruebas unitarias.
*   **Framework:** **Arduino (sobre PlatformIO)**.
    *   **Ventajas:** Mantenemos la simplicidad y la gran cantidad de librerías de Arduino, pero dentro de un entorno profesional.
*   **Lenguaje:** **C++ Moderno (11 o superior)**.
    *   **Ventajas:** Utilizaremos características como `enum class`, `auto`, y un enfoque orientado a objetos para un código más limpio y seguro.
*   **Librerías Clave:**
    *   `ArduinoJson`: Para serialización y deserialización eficiente de los mensajes MQTT.
    *   `PubSubClient`: Para la comunicación MQTT.
    *   `LittleFS`: Para el sistema de archivos.

## 3. Arquitectura de Software (Diseño Orientado a Objetos)

Proponemos abandonar el enfoque de un único archivo `.ino` y estructurar el código en clases lógicas, cada una con una única responsabilidad.

```
src/
├── main.cpp         # Archivo principal (setup y loop)
lib/
├── DeviceManager/   # Gestiona el modo (Comedero/Bebedero) y estado del dispositivo
│   ├── DeviceManager.h
│   └── DeviceManager.cpp
├── WiFiManager/     # Gestiona la conexión y reconexión WiFi
│   ├── WiFiManager.h
│   └── WiFiManager.cpp
├── MqttManager/     # Gestiona la conexión, publicación y suscripción MQTT
│   ├── MqttManager.h
│   └── MqttManager.cpp
└── ScaleManager/    # Lógica de la balanza y detección de eventos de consumo
    ├── ScaleManager.h
    └── ScaleManager.cpp
```

### `ScaleManager` - El Cerebro de la Detección

Esta clase encapsulará toda la lógica de la "Opción B" (dispositivo inteligente).

*   **Responsabilidades:**
    *   Inicializar el sensor HX711.
    *   Manejar la calibración (tara).
    *   Implementar la máquina de estados (`IDLE`, `PET_PRESENT`, `COOLDOWN`) para detectar eventos de consumo de forma no bloqueante.
    *   Devolver un objeto `ConsumptionEvent` cuando un evento finaliza.

**Ejemplo de la clase `ConsumptionEvent`:**
```cpp
struct ConsumptionEvent {
  bool valid = false;
  float amount_consumed_grams = 0.0;
  unsigned long duration_seconds = 0;
};
```

## 4. Flujo de Operación Principal (`main.cpp`)

El `loop()` en `main.cpp` será muy simple y legible. Su única tarea es orquestar las clases.

```cpp
void loop() {
  wifiManager.handleConnection();
  mqttManager.handleConnection();
  mqttManager.loop(); // Procesa mensajes entrantes

  ConsumptionEvent event = scaleManager.update();

  if (event.valid) {
    String payload = mqttManager.serializeEvent(event);
    mqttManager.publish(payload);
  }
}
```

## 5. Gestión de Configuración

La clase `DeviceManager` se encargará de:
1.  Cargar la configuración (modo "Comedero"/"Bebedero") desde un archivo JSON en LittleFS al arrancar.
2.  Escuchar un sub-tópico MQTT específico para recibir actualizaciones de configuración.
3.  Guardar la nueva configuración en LittleFS cuando se reciba una actualización.

---

Esta arquitectura nos proporciona una base sólida y profesional, mucho más fácil de mantener y expandir que un único archivo `.ino`.
