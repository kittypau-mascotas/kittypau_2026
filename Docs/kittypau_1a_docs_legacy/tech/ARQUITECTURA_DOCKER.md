# Arquitectura de Contenedores con Docker

Este documento describe la configuración de Docker para el proyecto KittyPaw, diseñada para crear un entorno de desarrollo local, aislado y reproducible.

## 1. Visión General

Utilizamos **Docker Compose** para orquestar un entorno multi-contenedor que simula una arquitectura de producción a nivel local. Esto nos permite desarrollar y probar la aplicación completa (frontend, backend y base de datos) de una manera consistente y aislada de la máquina del desarrollador.

La arquitectura se compone de tres servicios principales:

1.  **`db` (Base de Datos):** Un contenedor PostgreSQL que almacena todos los datos de la aplicación.
2.  **`backend` (Servidor):** Un contenedor Node.js que ejecuta el servidor de la API, se conecta a la base de datos y gestiona la comunicación con los dispositivos IoT a través de MQTT.
3.  **`frontend` (Cliente):** Un contenedor Node.js que sirve la aplicación de React (Vite) al navegador.

## 2. Servicios Detallados

### a. Servicio `db`

-   **Imagen:** `postgres:14-alpine` (una versión ligera y segura de PostgreSQL).
-   **Propósito:** Persistencia de datos. Almacena usuarios, mascotas, dispositivos, datos de sensores, etc.
-   **Volumen:** Utiliza un volumen de Docker (`postgres_data`) para que los datos de la base de datos persistan incluso si el contenedor se elimina y se vuelve a crear. Esto es crucial para no perder el trabajo.
-   **Puertos:** Mapea el puerto `5432` del contenedor al `5432` de la máquina local. Esto permite conectarse a la base de datos con herramientas externas (como DBeaver o pgAdmin) para inspección y depuración, usando `localhost:5432`.

### b. Servicio `backend`

-   **Imagen:** Construida a partir de `Dockerfile.backend`.
-   **Propósito:** Es el cerebro de la aplicación. Gestiona la lógica de negocio, la autenticación de usuarios y la ingesta de datos de los sensores.
-   **Comunicación:**
    -   Se conecta al servicio `db` a través de la red interna de Docker, usando el nombre de host `db`.
    -   Expone el puerto `5000` para recibir peticiones de la API desde el frontend.

### c. Servicio `frontend`

-   **Imagen:** Construida a partir de `Dockerfile.frontend`.
-   **Propósito:** Proporcionar la interfaz gráfica con la que interactúa el usuario.
-   **Comunicación:**
    -   Se sirve en el puerto `5173`.
    -   Realiza peticiones al `backend` para obtener y enviar datos. Docker Compose se encarga de que el frontend pueda "ver" al backend.

## 3. Colaboración y Flujo de Trabajo

Este sistema está diseñado para que cada desarrollador trabaje en un entorno local idéntico, compartiendo el código a través de Git.

**El modelo NO es que tu socio se conecte a los contenedores de tu PC.**

El flujo de trabajo correcto es:

1.  **Clonar el Repositorio:** Cada desarrollador clona la última versión del proyecto desde GitHub.
2.  **Instalar Docker Desktop:** Cada desarrollador debe tener Docker Desktop instalado y en funcionamiento en su máquina.
3.  **Levantar el Entorno:** Con un único comando, `docker-compose up --build`, cada desarrollador levanta su propio stack completo de la aplicación (base de datos, backend y frontend) en su máquina.
4.  **Desarrollar:** Los cambios en el código se reflejan localmente. Por ejemplo, si modificas un componente de React, el servidor de desarrollo de Vite en el contenedor `frontend` recargará la página automáticamente.
5.  **Compartir Cambios:** Los cambios en el código se suben a GitHub a través de commits y pull requests. El otro desarrollador simplemente necesita hacer `git pull` para obtener los cambios y, si es necesario, reconstruir las imágenes con `docker-compose up --build`.

Este enfoque garantiza que ambos trabajen con la misma arquitectura y dependencias, eliminando el clásico problema de "en mi máquina sí funciona".
