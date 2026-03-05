# Arquitectura General del Ecosistema KittyPaw

Este documento describe la arquitectura de alto nivel del proyecto KittyPaw, explicando cómo sus diferentes componentes se interrelacionan para formar un ecosistema completo.

El proyecto está diseñado de forma modular y se encuentra organizado en un monorepo con las siguientes aplicaciones principales en la carpeta `apps/`:

---

## 1. Los Componentes Principales

### a. `app_principal` y `iot_firmware` (El Producto Principal)
- **Propósito:** `app_principal` es la aplicación central que se entrega a los usuarios finales, mientras que `iot_firmware` es el código que se ejecuta en el dispositivo físico.
- **Contenido:**
  - `app_principal`: Contiene la aplicación web (React), el servidor backend (Node.js/Express) y la lógica de negocio.
  - `iot_firmware`: Contiene el firmware para el dispositivo físico (ESP32) que recopila los datos de los sensores.
- **Función:** Gestiona el registro de usuarios, la recepción de datos de los dispositivos vía MQTT, el almacenamiento en la base de datos y la visualización de datos en tiempo real en el dashboard del cliente.

### b. `docs/business` (El Centro de Negocios)
- **Propósito:** Centralizar toda la documentación estratégica y de planificación del proyecto.
- **Contenido:** Documentos de modelo de negocio, estrategias de marketing, análisis financieros, planes de producto, documentos legales y de postulaciones a fondos.
- **Función:** Sirve como la única fuente de verdad para la visión y gestión del negocio, separada del código técnico.

### c. `dashboard_datos` (El Dashboard de Admin/BI)
- **Propósito:** Ser la herramienta interna para el análisis de datos y la inteligencia de negocio (Business Intelligence).
- **Contenido:** Una aplicación de Streamlit (Python) que se conecta directamente a la base de datos.
- **Función:** Permite a los administradores del negocio visualizar métricas agregadas, analizar tendencias de uso, monitorear la salud del sistema y, en el futuro, entrenar y probar modelos de Machine Learning con los datos recopilados.

### d. `app_camara` (El Proyecto de I+D)
- **Propósito:** Investigar y desarrollar funcionalidades experimentales de visión por computador.
- **Contenido:** Una aplicación web independiente con TensorFlow.js.
- **Función:** Se utiliza para probar modelos de reconocimiento de imágenes (perros, gatos, etc.) usando una cámara. **Importante:** Este proyecto es autónomo y no forma parte del producto principal, pero se conecta a la API de `app_principal` para obtener datos si es necesario, actuando como un campo de pruebas para futuras características.

---

## 2. Flujo de Datos e Interconexión

El siguiente diagrama de texto ilustra cómo fluye la información entre los componentes:

```
                               +--------------------------+
                               |      Broker MQTT         |
                               | (ej. AWS IoT / EMQX)     |
                               +-------------+------------+
                                             |
                                             | (Datos de sensores desde iot_firmware)
                                             v
+------------------------+       +--------------------------+       +-------------------------+
| Dispositivo IoT        |------>|      app_principal       |<----->| App Cliente (Navegador) |
| (Hardware en casa)     |       | (Producto Principal)     |       | (React)                 |
+------------------------+       +------------+-------------+       +-------------------------+
                                              | (API)
                                              |                            
+------------------------+                      | (Acceso a BBDD)            
|       app_camara       |<--------------------+                            
| (Proyecto I+D Cámara)  |                      |                            
+------------------------+                      v                            
                               +--------------------------+                
                               |   Base de Datos (PostgreSQL) |
                               +-------------+------------+                
                                             ^                             
                                             | (Lectura directa)           
                                             |                             
                               +--------------------------+                
                               |     dashboard_datos      |                
                               | (Dashboard Admin / BI)   |                
                               +--------------------------+                
```

## 3. Resumen del Stack Tecnológico

- **Producto Principal (`app_principal` y `iot_firmware`):**
  - **Backend (`app_principal`):** Node.js, Express.js, Drizzle ORM
  - **Frontend (`app_principal`):** React, TypeScript, Vite, TailwindCSS
  - **Comunicación:** WebSockets, MQTT
  - **Base de Datos:** PostgreSQL
  - **Dispositivo IoT (`iot_firmware`):** C++ (Arduino Framework), ESP32

- **Dashboard de Datos (`dashboard_datos`):**
  - **Framework:** Streamlit (Python)
  - **Librerías:** Pandas, Matplotlib, SQLAlchemy

- **Proyecto de Cámara (`app_camara`):**
  - **Framework:** HTML, CSS, JavaScript
  - **Librerías:** TensorFlow.js
