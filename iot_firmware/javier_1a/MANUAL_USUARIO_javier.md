# Manual de Usuario - Kittypau IoT
## Sistema de Monitoreo con ESP8266

**Versión:** 1.0
**Última actualización:** Febrero 2026
**Dispositivos soportados:** KPCL0036, KPCL0037

---

## Tabla de Contenidos

1. [Descripción del Sistema](#1-descripción-del-sistema)
2. [Requisitos de Hardware](#2-requisitos-de-hardware)
3. [Diagrama de Conexiones](#3-diagrama-de-conexiones)
4. [Configuración del Entorno de Desarrollo](#4-configuración-del-entorno-de-desarrollo)
5. [Configuración del Firmware](#5-configuración-del-firmware)
6. [Flasheo del Dispositivo](#6-flasheo-del-dispositivo)
7. [Configuración de HiveMQ (MQTT)](#7-configuración-de-hivemq-mqtt)
8. [Configuración de Supabase](#8-configuración-de-supabase)
9. [Bridge MQTT → Supabase](#9-bridge-mqtt--supabase)
10. [Verificación del Sistema](#10-verificación-del-sistema)
11. [Comandos MQTT](#11-comandos-mqtt)
12. [Calibración de Sensores](#12-calibración-de-sensores)
13. [Solución de Problemas](#13-solución-de-problemas)
14. [Arquitectura del Sistema](#14-arquitectura-del-sistema)

---

## 1. Descripción del Sistema

Kittypau es un sistema IoT de monitoreo que utiliza ESP8266 (NodeMCU) para recopilar datos de sensores y enviarlos a la nube mediante MQTT.

### Flujo de Datos
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ESP8266   │────▶│  HiveMQ     │────▶│   Bridge    │────▶│  Supabase   │
│  (Sensores) │     │   Cloud     │     │  (Node.js)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     WiFi              MQTT/TLS           Suscripción          REST API
```

### Sensores Soportados
- **HX711**: Celda de carga (peso en gramos)
- **DHT11/DHT22**: Temperatura y humedad
- **LDR**: Sensor de luz (lux y porcentaje)

---

## 2. Requisitos de Hardware

### Componentes Necesarios

| Componente | Cantidad | Descripción |
|------------|----------|-------------|
| NodeMCU ESP8266 | 1 | Placa de desarrollo WiFi |
| HX711 | 1 | Amplificador para celda de carga |
| Celda de carga | 1 | 1kg, 5kg o 10kg según aplicación |
| DHT11 o DHT22 | 1 | Sensor de temperatura/humedad |
| LDR | 1 | Fotoresistencia |
| Resistencia 10kΩ | 1 | Para divisor de voltaje del LDR |
| Cables Dupont | Varios | Para conexiones |
| Cable USB | 1 | Micro USB para programación |

### Herramientas
- Computadora con Windows/Mac/Linux
- Visual Studio Code con PlatformIO
- Navegador web (para HiveMQ y Supabase)

---

## 3. Diagrama de Conexiones

### Pinout del NodeMCU ESP8266

```
                    ┌─────────────────┐
                    │    NodeMCU      │
                    │    ESP8266      │
              ┌─────┤ A0          D0  ├─────┐
    LDR ──────┤     │             D1  │     │
              │     │ GND         D2  │     │
              │     │ VU          D3  │     │
              │     │ S3          D4  │     │
              │     │ S2          3V3 │     │
              │     │ S1          GND │     │
              │     │ SC          D5  ├─────┼──── DHT (Data)
              │     │ S0          D6  ├─────┼──── HX711 DOUT
              │     │ SK          D7  ├─────┼──── HX711 SCK
              │     │ GND         D8  │     │
              │     │ 3V3         RX  │     │
              │     │ EN          TX  │     │
              │     │ RST         GND │     │
              │     │ GND         3V3 │     │
              │     │ VIN              │     │
              └─────┴─────────────────┴─────┘
```

### Conexiones Detalladas

#### HX711 (Celda de Carga)
| HX711 Pin | NodeMCU Pin | GPIO |
|-----------|-------------|------|
| VCC | 3V3 | - |
| GND | GND | - |
| DOUT | D6 | GPIO12 |
| SCK | D7 | GPIO13 |

#### DHT11/DHT22 (Temperatura/Humedad)
| DHT Pin | NodeMCU Pin | GPIO |
|---------|-------------|------|
| VCC | 3V3 | - |
| GND | GND | - |
| DATA | D5 | GPIO14 |

#### LDR (Sensor de Luz)
```
    3V3 ────┬──── LDR ────┬──── A0
            │             │
            └── 10kΩ ─────┴──── GND
```

| Conexión | NodeMCU Pin |
|----------|-------------|
| Punto medio (LDR + Resistencia) | A0 |

---

## 4. Configuración del Entorno de Desarrollo

### 4.1 Instalar Visual Studio Code
1. Descargar de: https://code.visualstudio.com/
2. Instalar y abrir VS Code

### 4.2 Instalar PlatformIO
1. En VS Code, ir a **Extensions** (Ctrl+Shift+X)
2. Buscar "PlatformIO IDE"
3. Clic en **Install**
4. Esperar a que se complete la instalación
5. Reiniciar VS Code

### 4.3 Abrir el Proyecto
1. **File** → **Open Folder**
2. Navegar a la carpeta del proyecto: `6 _KPCL0036_1a Hive MQ`
3. Esperar a que PlatformIO inicialice el proyecto

### 4.4 Verificar Dependencias
El archivo `platformio.ini` ya incluye todas las dependencias:

```ini
[env:nodemcuv2]
platform = espressif8266
board = nodemcuv2
framework = arduino
lib_deps =
    knolleary/PubSubClient @ ^2.8
    bblanchon/ArduinoJson @ ^6.19.4
    bogde/HX711 @ ^0.7.5
    adafruit/DHT sensor library @ ^1.4.2
    adafruit/Adafruit Unified Sensor @ ^1.1.4
monitor_speed = 115200
board_build.filesystem = littlefs
```

---

## 5. Configuración del Firmware

### 5.1 Cambiar ID del Dispositivo

Editar `include/config.h`:

```c
// ID del dispositivo - CAMBIAR PARA CADA DISPOSITIVO
#define DEVICE_ID      "KPCL0036"   // o "KPCL0037", etc.
```

### 5.2 Configurar WiFi por Defecto

En `include/config.h`:
```c
// WiFi principal
#define WIFI_SSID      "NombreDeRed"
#define WIFI_PASS      "ContraseñaDeRed"
```

### 5.3 Redes WiFi Adicionales

El dispositivo soporta múltiples redes WiFi. Editar `src/wifi_manager.cpp`:

```cpp
void loadWifiCredentials() {
    knownNetworks.clear();
    if (!LittleFS.exists(WIFI_CRED_FILE)) {
        // Redes WiFi por defecto
        knownNetworks.push_back({WIFI_SSID, WIFI_PASS});
        knownNetworks.push_back({"Casa 15", "mateo916"});
        knownNetworks.push_back({"Suarez_Mujica_891", "SuarezMujica891"});
        // Agregar más redes aquí...
        return;
    }
    // ...
}
```

### 5.4 Configurar MQTT (HiveMQ)

En `include/config.h`:
```c
#define MQTT_BROKER    "tu-cluster.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USERNAME  "TuUsuario"
#define MQTT_PASSWORD  "TuContraseña"
```

---

## 6. Flasheo del Dispositivo

### 6.1 Conectar el NodeMCU
1. Conectar el NodeMCU al computador via USB
2. Esperar a que se instale el driver (si es necesario)
3. Verificar el puerto COM en el Administrador de Dispositivos

### 6.2 Primer Flasheo (Dispositivo Nuevo)

**Importante:** Para un dispositivo nuevo, se recomienda borrar la memoria flash primero.

1. En VS Code, abrir terminal (Ctrl+`)
2. Ejecutar:
```bash
pio run --target erase -e nodemcuv2
```

3. Compilar y subir el firmware:
```bash
pio run --target upload -e nodemcuv2
```

### 6.3 Actualización de Firmware

Si solo necesitas actualizar el código (sin borrar configuraciones):
```bash
pio run --target upload -e nodemcuv2
```

### 6.4 Ver Monitor Serie

Para ver los mensajes de debug:
```bash
pio device monitor
```

O en VS Code: clic en el icono de "Serial Monitor" en la barra inferior.

**Salida esperada en el arranque:**
```
Serial initialized. Setup starting...
Initializing LittleFS...
LittleFS iniciado.
----- Redes WiFi conocidas -----
SSID: Jeivos, PASS: ****
SSID: Casa 15, PASS: ****
SSID: Suarez_Mujica_891, PASS: ****
--------------------------
Última red exitosa: Jeivos
Intentando conectar a: Jeivos
Conectado a WiFi: Jeivos
IP: 192.168.1.105
Conectando a MQTT...
[MQTT] Conectado
```

---

## 7. Configuración de HiveMQ (MQTT)

### 7.1 Crear Cuenta en HiveMQ Cloud

1. Ir a: https://www.hivemq.com/cloud/
2. Clic en **Get Started Free**
3. Crear cuenta con email o GitHub

### 7.2 Crear Cluster

1. Seleccionar **Free Cluster**
2. Elegir región (EU o US)
3. Esperar a que se cree el cluster

### 7.3 Obtener Credenciales

1. En el dashboard, ir a **Access Management**
2. Crear credenciales:
   - Username: `Kittypau1`
   - Password: `Kittypau1234`
3. Copiar la URL del broker (ejemplo: `cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud`)

### 7.4 Topics MQTT

El sistema usa los siguientes topics:

| Topic | Dirección | Descripción |
|-------|-----------|-------------|
| `KPCL0036/SENSORS` | Dispositivo → Broker | Datos de sensores |
| `KPCL0036/STATUS` | Dispositivo → Broker | Estado del dispositivo |
| `KPCL0036/cmd` | Broker → Dispositivo | Comandos (tara, calibración) |

### 7.5 Formato de Mensajes

**SENSORS:**
```json
{
  "weight": 125.5,
  "temp": 24.3,
  "hum": 65,
  "light": {
    "lux": 450,
    "%": 45,
    "condition": "normal"
  }
}
```

**STATUS:**
```json
{
  "wifi_status": "Connected",
  "wifi_ssid": "Jeivos",
  "wifi_ip": "192.168.1.105",
  "KPCL0036": "Online",
  "sensor_health": "OK"
}
```

---

## 8. Configuración de Supabase

### 8.1 Crear Proyecto en Supabase

1. Ir a: https://supabase.com/
2. Crear cuenta o iniciar sesión
3. Clic en **New Project**
4. Configurar:
   - Nombre: `Kittypau_1a`
   - Contraseña de base de datos
   - Región más cercana

### 8.2 Crear Tablas

1. Ir a **SQL Editor** en el panel lateral
2. Copiar y ejecutar el contenido de `bridge/supabase_schema.sql`:

```sql
-- Tabla de dispositivos
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ,
  wifi_status TEXT,
  wifi_ssid TEXT,
  wifi_ip TEXT,
  status TEXT,
  sensor_health TEXT
);

-- Tabla de lecturas de sensores
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  weight REAL,
  temp REAL,
  hum REAL,
  light_lux REAL,
  light_percent INTEGER,
  light_condition TEXT
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time
ON sensor_readings(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_created
ON sensor_readings(created_at DESC);

-- Vista: Última lectura de cada dispositivo
CREATE OR REPLACE VIEW latest_readings AS
SELECT DISTINCT ON (device_id)
  device_id, created_at, weight, temp, hum,
  light_lux, light_percent, light_condition
FROM sensor_readings
ORDER BY device_id, created_at DESC;

-- Vista: Resumen de dispositivos
CREATE OR REPLACE VIEW device_summary AS
SELECT
  d.id, d.status, d.wifi_ssid, d.wifi_ip,
  d.sensor_health, d.last_seen,
  lr.weight, lr.temp, lr.hum, lr.light_condition
FROM devices d
LEFT JOIN latest_readings lr ON d.id = lr.device_id;
```

### 8.3 Obtener Credenciales

1. Ir a **Settings** → **API**
2. Copiar:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1...`

---

## 9. Bridge MQTT → Supabase

El bridge es un servicio Node.js que escucha mensajes MQTT y los guarda en Supabase.

### 9.1 Configurar Variables de Entorno

Editar `bridge/.env`:

```env
# HiveMQ Cloud
MQTT_BROKER=cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=Kittypau1
MQTT_PASS=Kittypau1234

# Supabase
SUPABASE_URL=https://zgwqtzazvkjkfocxnxsh.supabase.co
SUPABASE_KEY=tu_anon_key_aqui
```

### 9.2 Instalar Dependencias

```bash
cd bridge
npm install
```

### 9.3 Ejecutar el Bridge

```bash
npm start
```

**Salida esperada:**
```
=================================
   Kittypau Bridge v1.0
=================================
MQTT Broker: cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
Supabase: https://zgwqtzazvkjkfocxnxsh.supabase.co
Dispositivos: KPCL0036, KPCL0037
=================================

[MQTT] Conectado a HiveMQ Cloud
[MQTT] Suscrito a KPCL0036/SENSORS
[MQTT] Suscrito a KPCL0036/STATUS
[MQTT] Suscrito a KPCL0037/SENSORS
[MQTT] Suscrito a KPCL0037/STATUS
[BRIDGE] Esperando mensajes MQTT...
```

### 9.4 Agregar Nuevos Dispositivos al Bridge

Editar `bridge/bridge.js`:

```javascript
const DEVICES = ['KPCL0036', 'KPCL0037', 'KPCL0038'];  // Agregar aquí
```

---

## 10. Verificación del Sistema

### 10.1 Checklist de Verificación

- [ ] NodeMCU conectado y encendido
- [ ] LED parpadeando → buscando WiFi
- [ ] LED fijo → WiFi conectado
- [ ] Monitor serie muestra "Conectado a WiFi"
- [ ] Monitor serie muestra "MQTT Conectado"
- [ ] Bridge corriendo sin errores
- [ ] Datos aparecen en Supabase

### 10.2 Ver Datos en Supabase

1. Ir a **Table Editor**
2. Seleccionar tabla `sensor_readings`
3. Los datos deben aparecer cada 3 segundos

### 10.3 Consultas Útiles

```sql
-- Últimas 10 lecturas
SELECT * FROM sensor_readings ORDER BY created_at DESC LIMIT 10;

-- Datos de un dispositivo específico
SELECT * FROM sensor_readings WHERE device_id = 'KPCL0036';

-- Promedio de temperatura
SELECT device_id, AVG(temp) as temp_avg FROM sensor_readings GROUP BY device_id;

-- Usar vista de resumen
SELECT * FROM device_summary;
```

---

## 11. Comandos MQTT

El dispositivo escucha comandos en el topic `DEVICE_ID/cmd`.

### 11.1 Tarar la Báscula

Enviar al topic `KPCL0036/cmd`:
```json
{"cmd": "tare"}
```

### 11.2 Calibrar la Báscula

Enviar al topic `KPCL0036/cmd`:
```json
{"cmd": "calibrate", "weight": 100}
```
Donde `weight` es el peso conocido en gramos colocado en la báscula.

---

## 12. Calibración de Sensores

### 12.1 Calibrar Celda de Carga (HX711)

**Método automático (via MQTT):**

1. Asegurar que la báscula esté vacía
2. Enviar comando de tara:
   ```json
   {"cmd": "tare"}
   ```
3. Colocar un peso conocido (ej. 100g)
4. Enviar comando de calibración:
   ```json
   {"cmd": "calibrate", "weight": 100}
   ```

**Método manual:**

1. Editar `include/config.h`:
   ```c
   #define HX711_CALIBRATION_FACTOR 400.0f
   ```
2. Ajustar el valor hasta obtener lecturas correctas
3. El factor se guarda automáticamente en LittleFS

### 12.2 Verificar Calibración

En el monitor serie, verificar que el peso mostrado coincida con el peso real.

---

## 13. Solución de Problemas

### 13.1 WiFi

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| No conecta a WiFi | SSID/contraseña incorrectos | Verificar en `config.h` |
| LED parpadea constantemente | Red no encontrada | Verificar que la red esté disponible |
| Conecta y desconecta | Señal débil | Acercar el dispositivo al router |
| No encuentra red conocida | Flash con datos antiguos | Borrar flash: `pio run --target erase` |

### 13.2 MQTT

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| No conecta a MQTT | Credenciales incorrectas | Verificar usuario/contraseña en HiveMQ |
| Desconexiones frecuentes | Timeout de conexión | Verificar estabilidad de WiFi |
| "TLS handshake failed" | Problema con certificado | Verificar que usa `setInsecure()` |

### 13.3 Sensores

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| Peso siempre 0 | HX711 no conectado | Verificar conexiones DOUT/SCK |
| Peso inestable | Celda de carga mal conectada | Revisar cableado de la celda |
| Temp/Hum = 0 | DHT no responde | Verificar pin DATA |
| Luz siempre 100% | LDR mal conectado | Verificar divisor de voltaje |

### 13.4 Bridge

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| "ECONNREFUSED" | Supabase URL incorrecta | Verificar `.env` |
| "Invalid API key" | Key de Supabase incorrecta | Usar la "anon key" |
| No recibe mensajes | Topics incorrectos | Verificar que DEVICES incluya los IDs |

### 13.5 Comandos Útiles de Debug

```bash
# Ver puerto COM disponible
pio device list

# Borrar flash completamente
pio run --target erase -e nodemcuv2

# Compilar sin subir
pio run

# Subir y abrir monitor
pio run --target upload && pio device monitor
```

---

## 14. Arquitectura del Sistema

### 14.1 Estructura de Archivos del Firmware

```
6 _KPCL0036_1a Hive MQ/
├── include/
│   └── config.h              # Configuración global
├── src/
│   ├── main.cpp              # Punto de entrada
│   ├── wifi_manager.cpp/h    # Gestión de WiFi
│   ├── mqtt_manager.cpp/h    # Conexión MQTT
│   ├── sensors.cpp/h         # Lectura de sensores
│   └── led_indicator.cpp/h   # Control de LED
├── bridge/
│   ├── bridge.js             # Bridge Node.js
│   ├── package.json          # Dependencias npm
│   ├── .env                  # Variables de entorno
│   └── supabase_schema.sql   # Esquema de BD
└── platformio.ini            # Configuración PlatformIO
```

### 14.2 Intervalos de Publicación

| Tipo | Intervalo | Configurable en |
|------|-----------|-----------------|
| SENSORS | 3 segundos | `main.cpp` → `SENSOR_PUBLISH_INTERVAL` |
| STATUS | 5 segundos | `main.cpp` → `STATUS_PUBLISH_INTERVAL` |

### 14.3 Optimización de Arranque

El sistema implementa varias optimizaciones para arranque rápido:

1. **Memoria de última red WiFi**: Guarda la última red exitosa en `/last_wifi.txt`
2. **Conexión directa**: Intenta primero la última red sin escanear
3. **Escaneo inteligente**: Solo intenta redes visibles Y conocidas
4. **Timeouts reducidos**: 5 segundos por intento de conexión

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Feb 2026 | Versión inicial con soporte HiveMQ y Supabase |

---

## Pendientes

- [ ] Hosting 24/7 del bridge (Railway, Render, o Raspberry Pi)
- [ ] Dashboard de visualización de datos
- [ ] Alertas automáticas

---

**Contacto:** Para soporte técnico o mejoras, consultar el repositorio del proyecto.
