# Arquitectura General del Ecosistema KittyPaw

> Estado: **LEGACY**. Este documento puede no reflejar el estado actual del repo (Next.js en `kittypau_app`, Supabase, HiveMQ Cloud y Raspberry Bridge).
> Ver arquitectura vigente: `Docs/ARQUITECTURA_PROYECTO.md` y arquitectura de datos/ML: `Docs/archive/analitica/KittyPau_Arquitectura_Datos_v3.md`.

Este documento describe la arquitectura de alto nivel del proyecto KittyPaw, explicando cÃ³mo sus diferentes componentes se interrelacionan para formar un ecosistema completo.

El proyecto estÃ¡ diseÃ±ado de forma modular y se encuentra organizado en un monorepo con las siguientes aplicaciones principales en la carpeta `apps/`:

---

## 1. Los Componentes Principales

### a. `app_principal` y `iot_firmware` (El Producto Principal)
- **PropÃ³sito:** `app_principal` es la aplicaciÃ³n central que se entrega a los usuarios finales, mientras que `iot_firmware` es el cÃ³digo que se ejecuta en el dispositivo fÃ­sico.
- **Contenido:**
  - `app_principal`: Contiene la aplicaciÃ³n web (React), el servidor backend (Node.js/Express) y la lÃ³gica de negocio.
  - `iot_firmware`: Contiene el firmware para el dispositivo fÃ­sico (ESP32) que recopila los datos de los sensores.
- **FunciÃ³n:** Gestiona el registro de usuarios, la recepciÃ³n de datos de los dispositivos vÃ­a MQTT, el almacenamiento en la base de datos y la visualizaciÃ³n de datos en tiempo real en el dashboard del cliente.

### b. `docs/business` (El Centro de Negocios)
- **PropÃ³sito:** Centralizar toda la documentaciÃ³n estratÃ©gica y de planificaciÃ³n del proyecto.
- **Contenido:** Documentos de modelo de negocio, estrategias de marketing, anÃ¡lisis financieros, planes de producto, documentos legales y de postulaciones a fondos.
- **FunciÃ³n:** Sirve como la Ãºnica fuente de verdad para la visiÃ³n y gestiÃ³n del negocio, separada del cÃ³digo tÃ©cnico.

### c. `dashboard_datos` (El Dashboard de Admin/BI)
- **PropÃ³sito:** Ser la herramienta interna para el anÃ¡lisis de datos y la inteligencia de negocio (Business Intelligence).
- **Contenido:** Una aplicaciÃ³n de Streamlit (Python) que se conecta directamente a la base de datos.
- **FunciÃ³n:** Permite a los administradores del negocio visualizar mÃ©tricas agregadas, analizar tendencias de uso, monitorear la salud del sistema y, en el futuro, entrenar y probar modelos de Machine Learning con los datos recopilados.

### d. `app_camara` (El Proyecto de I+D)
- **PropÃ³sito:** Investigar y desarrollar funcionalidades experimentales de visiÃ³n por computador.
- **Contenido:** Una aplicaciÃ³n web independiente con TensorFlow.js.
- **FunciÃ³n:** Se utiliza para probar modelos de reconocimiento de imÃ¡genes (perros, gatos, etc.) usando una cÃ¡mara. **Importante:** Este proyecto es autÃ³nomo y no forma parte del producto principal, pero se conecta a la API de `app_principal` para obtener datos si es necesario, actuando como un campo de pruebas para futuras caracterÃ­sticas.

---

## 2. Flujo de Datos e InterconexiÃ³n

El siguiente diagrama de texto ilustra cÃ³mo fluye la informaciÃ³n entre los componentes:

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
| (Proyecto I+D CÃ¡mara)  |                      |                            
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

## 3. Resumen del Stack TecnolÃ³gico

- **Producto Principal (`app_principal` y `iot_firmware`):**
  - **Backend (`app_principal`):** Node.js, Express.js, Drizzle ORM
  - **Frontend (`app_principal`):** React, TypeScript, Vite, TailwindCSS
  - **ComunicaciÃ³n:** WebSockets, MQTT
  - **Base de Datos:** PostgreSQL
  - **Dispositivo IoT (`iot_firmware`):** C++ (Arduino Framework), ESP32

- **Dashboard de Datos (`dashboard_datos`):**
  - **Framework:** Streamlit (Python)
  - **LibrerÃ­as:** Pandas, Matplotlib, SQLAlchemy

- **Proyecto de CÃ¡mara (`app_camara`):**
  - **Framework:** HTML, CSS, JavaScript
  - **LibrerÃ­as:** TensorFlow.js

