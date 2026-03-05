# Manual de Backup y Restauración del Filesystem del ESP32

**Versión:** 1.0
**Autor:** Gemini Code Assist

Este documento explica el procedimiento para crear copias de seguridad (backup) de la configuración del dispositivo IoT y cómo restaurarlas.

---

## Contexto

El dispositivo ESP32 guarda toda su configuración (credenciales WiFi, calibración de la balanza, etc.) en archivos dentro de su memoria interna (LittleFS). Estos archivos se encuentran en la carpeta `apps/iot_firmware/data` del proyecto.

*   `wifi.json`: Credenciales de la red WiFi.
*   `config.json`: Modo de operación del dispositivo.
*   `scale_offset.txt`: Valor de la tara de la balanza.

Hacer un backup consiste en guardar una copia de estos archivos. Restaurar consiste en volver a escribirlos en el dispositivo.

---

## Procedimiento de Backup (Guardar Configuración Actual)

1.  **Crear una Carpeta de Backup:**
    En la raíz del proyecto, crea una carpeta llamada `backups` si no existe. Dentro de ella, crea una carpeta con un nombre descriptivo para tu backup, por ejemplo: `filesystem_2025-10-13_config_burgosa`.

2.  **Copiar los Archivos:**
    Copia **todo el contenido** de la carpeta `d:\Escritorio\Proyectos\KittyPaw\Kittypaw_1a\apps\iot_firmware\data\` a tu nueva carpeta de backup (ej. `backups/filesystem_2025-10-13_config_burgosa/`).

¡Listo! Ya tienes una copia segura de la configuración.

---

## Procedimiento de Restauración (Sobrescribir en el Dispositivo)

1.  **Preparar la Carpeta `data`:**
    Borra el contenido actual de la carpeta `d:\Escritorio\Proyectos\KittyPaw\Kittypaw_1a\apps\iot_firmware\data\`.

2.  **Copiar desde el Backup:**
    Copia los archivos desde la carpeta del backup que quieres restaurar (ej. `backups/filesystem_2025-10-13_config_burgosa/`) hacia la carpeta `d:\Escritorio\Proyectos\KittyPaw\Kittypaw_1a\apps\iot_firmware\data\`.

3.  **Subir al Dispositivo:**
    En VSCode, abre PlatformIO y ejecuta la tarea **"Upload Filesystem Image"**. Esto borrará la memoria del dispositivo y escribirá la nueva configuración que copiaste desde tu backup.

4.  **Reiniciar:**
    Reinicia el dispositivo ESP32 para que cargue la configuración restaurada.