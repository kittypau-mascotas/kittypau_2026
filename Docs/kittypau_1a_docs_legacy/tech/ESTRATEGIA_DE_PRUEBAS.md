# Estrategia de Pruebas del Ecosistema KittyPaw

## 1. Introducción

El propósito de este documento es definir la estrategia y los tipos de pruebas que se aplicarán al proyecto KittyPaw para garantizar su calidad, fiabilidad y correcto funcionamiento. Una estrategia de pruebas sólida es fundamental para un desarrollo ágil y para la confianza del usuario final.

La estrategia se basa en la pirámide de testing, dando prioridad a las pruebas más rápidas y baratas (unitarias) y complementándolas con pruebas más complejas e integrales.

---

## 2. Tipos de Pruebas por Componente

### A. Firmware (`apps/iot_firmware`)

*   **Pruebas Unitarias (En Host):**
    *   **Objetivo:** Probar la lógica de las clases (`ScaleManager`, `DeviceManager`, etc.) de forma aislada, sin necesidad de flashear el hardware real.
    *   **Herramientas:** Usando PlatformIO, podemos utilizar un framework como **Unity** o **GoogleTest**. Se compilará el código para correr en la máquina de desarrollo (PC), "mockeando" o simulando las partes específicas del hardware de Arduino/ESP32.
    *   **Ejemplo:** Probar que la máquina de estados del `ScaleManager` transiciona correctamente de `IDLE` a `PET_PRESENT` cuando se le alimenta con datos simulados de peso.

*   **Pruebas de Hardware-in-the-Loop (HIL - Manuales):**
    *   **Objetivo:** Verificar que el firmware funciona correctamente en el hardware real.
    *   **Proceso:** Se definirá un "protocolo de pruebas manuales" que el desarrollador deberá seguir.
    *   **Ejemplo de Protocolo:**
        1.  Flashear el dispositivo con el último firmware.
        2.  Conectar un cliente MQTT para monitorear el tópico `devices/{deviceId}/events`.
        3.  Realizar una tara del dispositivo.
        4.  Colocar un peso de calibración conocido (ej. 100g) y retirarlo.
        5.  Verificar que no se genera un evento de consumo.
        6.  Simular un evento de consumo retirando peso lentamente.
        7.  Verificar que el payload del evento MQTT publicado es correcto en formato y contenido.

### B. Backend (`apps/app_principal/server`)

*   **Pruebas Unitarias:**
    *   **Objetivo:** Probar la lógica de negocio, rutas de la API y funciones de utilidad de forma aislada.
    *   **Herramientas:** **Jest** o **Mocha**.
    *   **Ejemplo:** Probar que una función que calcula estadísticas de consumo devuelve el promedio correcto para un conjunto de datos de entrada.

*   **Pruebas de Integración:**
    *   **Objetivo:** Probar la interacción entre la API y la base de datos.
    *   **Proceso:** Se ejecutarán pruebas contra una base de datos de prueba (separada de la de producción). Las pruebas crearán datos, los leerán a través de la API, los actualizarán y los borrarán, verificando que el estado de la base de datos sea el esperado en cada paso.
    *   **Ejemplo:** Probar que al llamar a `POST /api/devices/claim`, el registro del dispositivo en la base de datos de prueba se actualiza correctamente con el `user_id`.

### C. Frontend (`apps/app_principal/client`)

*   **Pruebas Unitarias de Componentes:**
    *   **Objetivo:** Probar que los componentes de React se renderizan correctamente y responden a las interacciones del usuario de forma aislada.
    *   **Herramientas:** **Jest** y **React Testing Library**.
    *   **Ejemplo:** Probar que un componente de gráfico se renderiza con los datos de ejemplo que se le pasan como props.

*   **Pruebas End-to-End (E2E):**
    *   **Objetivo:** Simular flujos completos del usuario en un navegador real, probando todo el ecosistema de forma integrada (Frontend -> Backend -> Base de Datos).
    *   **Herramientas:** **Cypress** o **Playwright**.
    *   **Ejemplo de Flujo E2E Automatizado:**
        1.  El script de prueba crea un usuario y un dispositivo "unclaimed" directamente en la base de datos de prueba.
        2.  El script hace login en la aplicación.
        3.  Navega a la sección "Añadir Dispositivo". (En lugar de escanear un QR, se puede simular el resultado).
        4.  Verifica que el nuevo dispositivo aparece en el dashboard.
        5.  El script simula un mensaje MQTT (publicándolo directamente o a través de una API de test).
        6.  Verifica que el dashboard se actualiza con el nuevo dato de consumo.

---

## 3. Estrategia de Implementación

1.  **Configuración Inicial:** Antes de comenzar el desarrollo de una nueva funcionalidad, se debe configurar el entorno de pruebas correspondiente (ej. Jest para un nuevo servicio del backend).
2.  **Desarrollo Guiado por Pruebas (TDD - Opcional pero Recomendado):** Para lógica de negocio crítica, se recomienda escribir la prueba primero (que fallará) y luego el código que la haga pasar.
3.  **Integración Continua (CI):** En el futuro, se configurará un pipeline (ej. GitHub Actions) que ejecute automáticamente todas las pruebas unitarias y de integración cada vez que se suba nuevo código. Una rama no se podrá fusionar a la principal si las pruebas fallan.
