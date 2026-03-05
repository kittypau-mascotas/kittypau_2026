# Manual de Setup del Entorno de Desarrollo (de Mauro para Javo)

¡Bienvenido al proyecto KittyPaw, Javo! Este manual te guiará para que puedas levantar todo el entorno de desarrollo en tu PC de forma rápida y sencilla usando Docker.

---

## Parte 1: ¿Qué es Docker y por qué lo usamos?

Imagina que en lugar de instalar una base de datos PostgreSQL y un entorno de Node.js directamente en tu Windows (lo cual puede ser complicado y generar conflictos), usamos unas "cajas virtuales" llamadas **contenedores**.

*   **Docker** es la herramienta que nos permite crear y gestionar estas cajas.
*   Cada caja (contenedor) tiene adentro todo lo que un servicio necesita para funcionar: la base de datos, el backend, etc.

**Beneficios para nosotros:**

1.  **Consistencia:** Tú, yo, y cualquier futuro desarrollador correremos la **misma versión exacta** de la base de datos y del backend. Se acabaron los problemas de "en mi máquina sí funciona".
2.  **Simplicidad:** En lugar de seguir 10 pasos para instalar todo, solo necesitarás ejecutar **un comando** para levantar todos los servicios.
3.  **Aislamiento:** Mantiene tu PC limpio. Todo lo relacionado con KittyPaw vive dentro de estas "cajas", no se mezcla con el resto de tus programas.

---

## Parte 2: Instalación de Docker Desktop

1.  **Ve a la página oficial:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2.  **Descarga el instalador** para Windows.
3.  **Ejecuta el instalador:** Es un proceso de instalación estándar (siguiente, siguiente, aceptar...).

**¡NOTA IMPORTANTE PARA WINDOWS!**

*   Docker en Windows usa algo llamado **WSL 2 (Windows Subsystem for Linux)** para funcionar. Es una tecnología de Microsoft que permite correr un entorno de Linux dentro de Windows.
*   Lo más probable es que el instalador de Docker se ofrezca a instalar o actualizar WSL 2 por ti. **Acepta y déjalo que lo haga.**
*   Es muy posible que después de la instalación, **necesites reiniciar tu PC**. Hazlo para que todos los cambios surtan efecto.
*   Una vez instalado y reiniciado, abre la aplicación "Docker Desktop" desde tu menú de inicio. Si ves una ballena en tu barra de tareas y la aplicación muestra un estado "Running" en verde, ¡estás listo!

---

## Parte 3: El Archivo `docker-compose.yml`

En la raíz de nuestro proyecto, hay un archivo llamado `docker-compose.yml`. Este es nuestro "plano de construcción" o la "receta" que le dice a Docker qué cajas (contenedores) debe crear.

Dentro, verás definidos los "servicios":

*   `db`: Nuestro contenedor para la base de datos **PostgreSQL**.
*   `backend`: Nuestro contenedor para el servidor de **Node.js**.

Este archivo se encarga de configurar las redes internas para que el `backend` pueda "hablar" con la `db` de forma automática.

---

## Parte 4: ¡A Correr los Servidores!

Esta es la mejor parte. Una vez que Docker Desktop esté corriendo, solo necesitas hacer una cosa:

1.  Abre una terminal (PowerShell, CMD, o la terminal de VSCode) en la raíz del proyecto KittyPaw.
2.  Ejecuta el siguiente comando:

    ```bash
    docker-compose up -d
    ```

*   **¿Qué hace este comando?** Lee el archivo `docker-compose.yml`, descarga las "imágenes" oficiales de PostgreSQL y Node (la primera vez puede tardar un poco), y crea e inicia nuestros contenedores `db` y `backend`.
*   El `-d` significa "detached", que hace que se ejecuten en segundo plano y te devuelvan el control de la terminal.

### Comandos Útiles de Docker

*   **Para construir y correr (la primera vez o cuando hay cambios en `Dockerfile`):**
    ```bash
    docker-compose up --build
    ```
    > **Nota:** Gracias al archivo `.dockerignore` que hemos añadido, este proceso será mucho más rápido después de la primera ejecución, ya que no intentará copiar archivos innecesarios como `node_modules`.

*   **Para detener todo:**
    ```bash
    docker-compose down
    ```
*   **Para ver los logs (registros) del backend en tiempo real (¡súper útil para depurar!):**
    ```bash
    docker-compose logs -f backend
    ```

---

## Parte 5: Estructura de Carpetas del Proyecto

Este proyecto es un "monorepo" gestionado con Turborepo. Esto significa que todo nuestro código (frontend, backend, firmware) vive en un solo gran repositorio, dentro de la carpeta `apps/`.

Aquí tienes un mapa de las carpetas más importantes:

*   `apps/`: **El corazón del proyecto. Contiene todas las aplicaciones.**
    *   `app_principal/`: La aplicación principal que usan los clientes.
        *   `client/`: El **Frontend** (React, TypeScript). **Área de Mauro.**
        *   `server/`: El **Backend** (Node.js, API, Drizzle). **Área de Ambos.**
        *   `shared/`: Esquemas y tipos compartidos entre el frontend y el backend.
    *   `iot_firmware/`: El **Firmware** para el dispositivo físico (ESP8266). **Área de Javier.**
        *   `proyecto_platformio/`: El proyecto de PlatformIO que contiene toda la lógica.
            *   `include/`: Contiene los archivos de cabecera (`.h`) de nuestras clases.
            *   `src/`: Contiene los archivos de implementación (`.cpp`) y el `main.cpp` que orquesta todo. Aquí viven los "Managers":
                *   `DeviceManager`: Gestiona el estado global del dispositivo.
                *   `WiFiManager`: Gestiona la conexión WiFi.
                *   `MqttManager`: Gestiona la comunicación con el broker MQTT.
                *   `ScaleManager`: Lógica del sensor de peso (HX711).
                *   `TemperatureHumidityManager`: Lógica del sensor de ambiente (DHT11).
                *   `LightManager`: Lógica del sensor de luz (LDR).
                *   `SelfTestManager`: Ejecuta el auto-diagnóstico en el arranque.
            *   `lib/`: Dependencias externas (librerías de terceros).
            *   `platformio.ini`: El corazón de PlatformIO. Define la placa, el framework y las dependencias.
    *   `dashboard_datos/`: El dashboard interno para análisis de negocio y datos. **Área de Mauro.**

*   `docs/`: **Toda la documentación del proyecto.**
    *   `business/`: Documentos de negocio, legales, de financiamiento, etc.
    *   `tech/`: Documentación técnica, como este manual, los diseños de arquitectura, etc.

*   **Archivos importantes en la raíz (`/`):**
    *   `PLAN_MAESTRO_KITTYPAW.md`: **El documento más importante.** Es el índice y la guía estratégica de todo el proyecto.
    *   `TASK_BOARD.md`: Nuestro tablero de tareas del día a día.
    *   `GEMINI.md`: Las instrucciones que yo, Gemini, sigo para ayudarte.
    *   `PROJECT_LOG.md`: El diario donde registramos todos los avances.
    *   `docker-compose.yml`: La "receta" para levantar los servicios del backend.
    *   `turbo.json` y `package.json`: Archivos de configuración del monorepo.

---

## Parte 6: Ejecutar la Aplicación Frontend (UI)

Mientras que `docker-compose` se encarga de levantar el backend (la base de datos y el servidor), para trabajar en la interfaz de usuario (la parte visual de la aplicación que corre en el navegador), necesitas seguir estos pasos.

Estos comandos se deben ejecutar en una **nueva terminal**, separada de la que usas para Docker.

1.  **Instalar Dependencias del Proyecto:**
    La primera vez que clonas el proyecto, o cada vez que haya nuevas librerías, necesitas instalar todas las dependencias. Este comando lee los archivos `package.json` de todo el proyecto y descarga todo lo necesario.
    ```bash
    npm install
    ```

2.  **Iniciar el Servidor de Desarrollo:**
    Este comando utiliza Turborepo para iniciar el servidor de desarrollo del frontend (y cualquier otro servicio definido). Verás un output en tu terminal que te indicará en qué dirección puedes ver la aplicación.
    ```bash
    npm run dev
    ```

3.  **Abrir la Aplicación:**
    Una vez que el comando anterior termine de compilar, tu terminal mostrará un mensaje similar a:

    > `> app_principal-client:dev:`
    > `> vite`
    >
    > `  VITE vX.X.X  ready in XXXms`
    >
    > `  ➜  Local:   http://localhost:5173/`

    Abre tu navegador web y ve a la dirección que aparece en **Local** (generalmente `http://localhost:5173/`) para ver y interactuar con la aplicación KittyPaw.

---

## Parte 7: Nuestro Flujo de Trabajo con Git y GitHub

Para mantener el código ordenado y colaborar de forma efectiva, seguiremos un flujo de trabajo simple basado en "ramas por funcionalidad" (feature branches).

**La Regla de Oro:** La rama `main` es sagrada. **Nunca trabajamos directamente sobre `main`**. Siempre debe estar estable.

### Tu Flujo de Trabajo Diario

Para cada tarea que tomes del `TASK_BOARD.md`, el proceso es el siguiente:

1.  **Sincroniza tu `main`:** Antes de empezar cualquier cosa, asegúrate de que tu rama `main` local esté actualizada con la del repositorio remoto (GitHub).
    ```bash
    git checkout main
    git pull origin main
    ```

2.  **Crea una Nueva Rama:** Crea una rama nueva para tu tarea. Usa un nombre descriptivo.
    ```bash
    # Ejemplo para una tarea de firmware
    git checkout -b javier/feature-nueva-cosa
    ```

3.  **Trabaja y Haz Commits:** Haz tu trabajo en esta nueva rama. Recuerda hacer commits pequeños y frecuentes. Usa mensajes de commit claros.
    ```bash
    git add .
    git commit -m "feat(firmware): Implementa la clase FooManager"
    ```

4.  **Sube tu Rama:** Cuando hayas terminado la tarea (o al final del día), sube tu rama a GitHub.
    ```bash
    git push origin javier/feature-nueva-cosa
    ```

5.  **Crea un Pull Request (PR):** En la página de GitHub del proyecto, verás una opción para crear un "Pull Request" desde tu rama hacia `main`. Al crearlo, asigna al otro miembro del equipo (en este caso, a Mauro) como "Reviewer".

6.  **Revisión de Código:** El otro revisará tu código, podrá dejar comentarios o solicitar cambios. Este es el paso más importante de colaboración para asegurar la calidad.

7.  **Merge:** Una vez que el PR es aprobado, se fusiona (merge) con la rama `main`. ¡Y listo! Tu código ya es parte oficial del proyecto.

Este proceso protege nuestra rama principal y nos permite a ambos revisar el trabajo del otro antes de integrarlo.

---

## Parte 8: Funcionalidades Clave del Firmware (¡Actualizado!)

Javo, el firmware ha evolucionado significativamente. La antigua "misión" del auto-diagnóstico ya está **implementada y funcionando**. Aquí tienes un resumen del estado actual para que estés al día:

### 1. Arquitectura 100% Modular
Olvídate del antiguo archivo `.ino`. El firmware ahora está organizado en **"Managers"**, que son clases de C++ con responsabilidades únicas. Esto hace que el código sea más limpio, fácil de mantener y de extender. Los encontrarás en `apps/iot_firmware/proyecto_platformio/src/`.

### 2. Lógica de Publicación Híbrida
El dispositivo es ahora mucho más inteligente en cómo y cuándo envía datos:
*   **Telemetría Periódica:** Cada 5 segundos, publica un reporte completo con los datos de todos los sensores (temperatura, humedad, luz y peso actual) en el tópico `KPCL0022/pub`. Esto nos da una visión constante del estado del dispositivo.
*   **Eventos de Consumo:** De forma paralela, el `ScaleManager` detecta activamente cuándo la mascota está comiendo o bebiendo. Cuando esto ocurre, envía un evento especial al tópico `kittypaw/events` con detalles clave como la duración y la cantidad consumida en gramos.

### 3. Auto-Diagnóstico en Arranque (POST)
El `SelfTestManager` que implementaste ahora es una parte crucial del arranque. Cada vez que el dispositivo se enciende, realiza una serie de chequeos internos (sensores, memoria, etc.) y publica un **reporte de salud** en el tópico `kittypaw/reports/health`. El backend ya está preparado para recibir y almacenar estos reportes, lo que nos permitirá monitorear la salud de toda nuestra flota de dispositivos.

---

## Parte 9: Cómo Probar el Firmware Localmente

Para poder ver los datos que envía el dispositivo en tu PC, necesitas montar un pequeño entorno local.

### Requisitos
- **Broker Mosquitto:** Asegúrate de que el broker MQTT esté corriendo en tu PC.
    1. Abre una terminal.
    2. Navega a su carpeta: `cd D:\mosquitto`
    3. Ejecuta: `.\mosquitto.exe -c mosquitto.conf -v`
    4. **Deja esta terminal abierta.**
- **Red WiFi:** Tu PC y el ESP8266 deben estar en la misma red (`VTR-2736410_2g`).
- **IP del Broker:** El PC debe tener la IP `192.168.0.6`. Si no es así, debes cambiarla en `src/main.cpp` y volver a compilar y subir el firmware.

### Pasos para Visualizar Datos
1.  **Modo Conectado (Depuración):**
    *   Conecta el ESP8266 a tu PC vía USB.
    *   En VSCode, abre el proyecto `proyecto_platformio`.
    *   Haz clic en el icono del **enchufe** (🔌) en la barra de PlatformIO para abrir el **Monitor Serial**. Verás todos los logs internos (`Serial.println`).

2.  **Modo Autónomo (Visualizar Datos MQTT):**
    *   Con el broker Mosquitto corriendo, abre una **nueva terminal**.
    *   Navega a la carpeta del proyecto de firmware:
      ```sh
      cd D:\Escritorio\Proyectos\KittyPaw\Kittypaw_1a\apps\iot_firmware\proyecto_platformio
      ```
    *   Ejecuta el script receptor que hemos preparado:
      ```sh
      python receptor_local.py
      ```
    *   Alimenta el dispositivo con su batería. En la terminal del `receptor_local.py`, verás los mensajes JSON (telemetría, eventos, reportes de salud) que el dispositivo publica en tiempo real.

---

¡Y eso es todo! Ahora sí tienes el mapa completo y actualizado. Con `docker-compose up -d` para el backend y estas instrucciones para el firmware, estás listo para seguir desarrollando.

---

**CON MUUUCHO AMOR DE MAURO PARA JAVO**

- Mauro
