
# Anexo: Especificaciones Técnicas del Ecosistema Kittypau

## 1. Resumen de la Arquitectura

El ecosistema Kittypau se basa en una arquitectura de tres componentes principales: el dispositivo físico (IoT), un backend en la nube y una aplicación de usuario (frontend). La comunicación se realiza en tiempo real a través del protocolo MQTT, un estándar de la industria para IoT, garantizando una comunicación eficiente y segura.

- **Dispositivo IoT:** Captura datos de los sensores (peso, temperatura, humedad) y los publica en un canal seguro de MQTT.
- **Backend:** Se suscribe a los datos del dispositivo, los procesa, los almacena en una base de datos y los retransmite a la aplicación del usuario.
- **Frontend:** Recibe los datos en tiempo real y los presenta al usuario en un dashboard interactivo.

---

## 2. Especificaciones del Dispositivo Físico (Hardware y Firmware)

### 2.1. Hardware

- **Microcontrolador:** El prototipo actual utiliza un **NodeMCU v2 (basado en el chip ESP8266)**. Es un microcontrolador de bajo costo con conectividad WiFi integrada, ideal para aplicaciones IoT.
- **Sensores Principales:**
    - **Balanza de Precisión:** Se utiliza un sensor de celda de carga (strain gauge) con un amplificador **HX711** para medir con precisión la cantidad de comida o agua en el plato.
    - **Sensor Ambiental:** Un sensor **DHT11/DHT22** para medir la temperatura y humedad del entorno cercano al plato, asegurando que las condiciones sean óptimas para la mascota.
- **Alimentación:** El dispositivo se alimenta a través de un puerto micro-USB (5V).

### 2.2. Firmware

- **Lenguaje y Entorno:** El firmware está desarrollado en **C++** sobre el framework de **Arduino**, lo que facilita el desarrollo y la iteración.
- **Plataforma de Desarrollo:** Se utiliza **PlatformIO** para la gestión de dependencias y la compilación del proyecto.
- **Funcionalidades Clave:**
    - **Conectividad:** Gestión de conexión a redes WiFi.
    - **Comunicación MQTT:** Utiliza la librería `PubSubClient` para publicar los datos de los sensores en formato **JSON** de manera segura y eficiente.
    - **Lectura de Sensores:** Implementación de librerías para la lectura y calibración de los sensores HX711 y DHT.
    - **Lógica de Operación:** El firmware opera en un ciclo de lectura y publicación, optimizado para un bajo consumo de energía.

---

## 3. Especificaciones del Backend (Servidor en la Nube)

### 3.1. Pila Tecnológica (Tech Stack)

- **Entorno de Ejecución:** **Node.js**
- **Lenguaje:** **TypeScript**, que añade tipado estático a JavaScript para un código más robusto y mantenible.
- **Framework:** **Express.js**, un framework minimalista y rápido para la creación de APIs.
- **Base de Datos:** **PostgreSQL**, una base de datos relacional de código abierto potente y escalable.
- **ORM (Object-Relational Mapping):** **Drizzle ORM**, una herramienta moderna para interactuar con la base de datos de forma segura y eficiente.

### 3.2. Funcionalidades Clave

- **API REST:** Provee endpoints para la gestión de usuarios, mascotas y dispositivos.
- **Autenticación:** Sistema de autenticación de usuarios para proteger el acceso a los datos.
- **Cliente MQTT:** Un servicio robusto que se conecta de forma segura al broker MQTT (compatible con **AWS IoT Core**), se suscribe a los tópicos de cada dispositivo y procesa los mensajes entrantes.
- **Comunicación en Tiempo Real con el Frontend:** Utiliza **WebSockets** para enviar los datos recibidos del dispositivo directamente a la aplicación del usuario sin necesidad de que este recargue la página.
- **Contenerización:** El backend está completamente **dockerizado**, lo que permite un despliegue sencillo, consistente y escalable en cualquier proveedor de nube.

---

## 4. Especificaciones del Frontend (Aplicación de Usuario)

### 4.1. Pila Tecnológica (Tech Stack)

- **Framework:** **React**, la librería líder en el mercado para la construcción de interfaces de usuario interactivas.
- **Lenguaje:** **TypeScript**.
- **Empaquetador (Bundler):** **Vite**, que ofrece una experiencia de desarrollo extremadamente rápida.
- **Librerías de Visualización:** Se utiliza **Recharts** para crear gráficos y visualizaciones de datos atractivas e informativas.

### 4.2. Funcionalidades Clave

- **Dashboard en Tiempo Real:** La interfaz principal muestra los datos de consumo de la mascota (comida, agua) y las condiciones ambientales actualizándose en tiempo real.
- **Gestión de Perfiles:** Permite al usuario crear y gestionar perfiles para sus mascotas y dispositivos.
- **Visualización de Históricos:** Muestra gráficos con la evolución del consumo y otros datos a lo largo del tiempo.
- **Compatibilidad Multiplataforma:** Gracias al uso de **Capacitor**, la misma base de código del frontend está preparada para ser compilada y desplegada como una **aplicación móvil nativa para iOS y Android**.

---

## 5. Diseño del Producto Físico (Plato)

*Esta sección describe las consideraciones de diseño para el producto físico. Un modelo 3D detallado se encuentra en desarrollo.*

### 5.1. Principios de Diseño

- **Ergonomía y Seguridad para la Mascota:** El diseño del plato prioriza la comodidad y seguridad de la mascota. La altura y profundidad están pensadas para facilitar el acceso al alimento sin forzar posturas. Se utilizarán materiales de grado alimenticio, no tóxicos y resistentes.
- **Modularidad y Facilidad de Limpieza:** El plato se diseñará de forma modular, permitiendo que la parte que contiene el alimento se separe fácilmente de la base electrónica para poder lavarla sin riesgo de dañar los componentes.
- **Integración de Sensores:** La base del dispositivo alojará la celda de carga y la electrónica de forma discreta y protegida de derrames. El sensor de ambiente estará posicionado para medir las condiciones del entorno inmediato sin ser afectado por el contenido del plato.
- **Estética y Experiencia de Usuario:** El diseño será minimalista y moderno, buscando integrarse de forma armónica en el hogar del usuario. Un indicador LED sutil informará sobre el estado de la conexión del dispositivo.



