# Kittypau - Hitos y Pendientes
**Ultima actualizacion:** 2026-02-09 (v6)

---

## Completado

### Firmware ESP8266
1. [x] **WiFi multi-red:** Conexion a redes conocidas, reconexion automatica, gestion dinamica via MQTT (ADDWIFI/REMOVEWIFI), credenciales en LittleFS.
2. [x] **MQTT/TLS:** Conexion segura a HiveMQ Cloud (puerto 8883, certificado ISRG Root X1), backoff exponencial (5s-60s), verificacion de heap (>20KB) antes de TLS.
3. [x] **Sensores:** Publicacion periodica de peso (HX711), temperatura/humedad (DHT), luz (LDR) cada 10s. Calibracion via MQTT con persistencia en LittleFS. Filtro deadband 2g para estabilidad.
4. [x] **Estado del dispositivo:** Publicacion de STATUS cada 15s (WiFi, IP, sensor_health). Online/Offline con debounce de 15 segundos. DEVICE_ID dinamico como key del payload.
5. [x] **Indicador LED:** Parpadeo no bloqueante. 3 blinks = buscando WiFi, 1 blink = publish, 2 blinks = subscribe/comando.
6. [x] **NTP:** Timestamps sincronizados en formato `MM-dd-aaaa HH:mm:ss`.
7. [x] **OTA:** Actualizacion de firmware via WiFi con ArduinoOTA.
8. [x] **Arquitectura modular:** Codigo desacoplado en wifi_manager, mqtt_manager, sensors, led_indicator. LED desacoplado de MQTT via callbacks.

### Bridge e Infraestructura
9. [x] **Bridge Node.js:** `bridge.js` con wildcard (`+/SENSORS`, `+/STATUS`), auto-registro de dispositivos, escritura en Supabase.
10. [x] **Raspberry Pi Zero 2 W:** OS Lite instalado, Node.js v20, SSH con clave ED25519, 3 redes WiFi (Jeivos, Casa 15, Suarez_Mujica_891).
11. [x] **Deploy del bridge en RPi:** Archivos copiados, npm install (56 paquetes), servicio systemd habilitado 24/7 con auto-restart. 8 dispositivos detectados (KPCL0033, 0035, 0036, 0037, 0038, 0039, 0040).
12. [x] **Supabase:** Proyecto creado, credenciales verificadas, datos fluyendo desde el bridge.
13. [x] **HiveMQ Cloud:** Broker operativo, todos los dispositivos publicando.
14. [x] **Flujo IoT verificado:** ESP8266 -> HiveMQ -> Bridge -> Supabase funcionando de extremo a extremo con 8 dispositivos.

### Documentacion
15. [x] **Mauro_Context completo:** Arquitectura, topicos MQTT, firmware, bridge, RPi, schemas SQL, evaluacion del proyecto, checklist de deploy, estilos y flujos UX.

### Schema SQL y Bridge v2.0 → v2.1
16. [x] **Schema SQL unificado:** 7 tablas (profiles, breeds, pets, pet_breeds, devices, sensor_readings, system_events) con UUID como PK, RLS, triggers, vistas y datos iniciales de razas. Archivo: `SQL_UNIFICADO.sql`.
17. [x] **Bridge v2.0:** Actualizado para schema unificado. Mapea campos (weight→weight_grams, temp→temperature, hum→humidity), cache en memoria, guarda device_timestamp.

### Migracion V2 y correcciones (2026-02-07)
18. [x] **SQL Migracion V2:** `device_id` (TEXT) como PRIMARY KEY de `devices` (reemplaza UUID). `sensor_readings` usa `device_id` como FK directa sin JOINs. Script idempotente en `SQL_MIGRACION_V2.sql`.
19. [x] **Bridge v2.1:** Escribe `device_id` directo (ej: KPCL0039) sin cache UUID ni lookups. Desplegado en RPi.
20. [x] **KPCL0039 flasheado:** Firmware cargado en nueva placa. 8 dispositivos activos (KPCL0033, 0035, 0036, 0037, 0038, 0039, 0040).
21. [x] **Fix crash bridge:** El bridge se caia porque `dotenv` buscaba `.env` en `~` en vez de `/home/kittypau/kittypau-bridge/`. Resuelto con `WorkingDirectory` en systemd.
22. [x] **Servicio systemd mejorado:** `kittypau-bridge.service` con `Restart=always`, `RestartSec=5`, logs en `journalctl`. Arranca automaticamente con la Pi.
23. [x] **SUPABASE_SERVICE_KEY corregido:** Se estaba usando el password de la DB (`sb_secret_...`) en vez del JWT service_role (`eyJ...`). Corregido en `.env` de la Pi.
24. [x] **Proceso duplicado eliminado:** Se detecto y elimino un bridge manual corriendo en paralelo al servicio systemd.

### Documentacion v4 (2026-02-08)
25. [x] **Unificar `device_code` → `device_id` en docs:** Reemplazado en 24 archivos de Mauro_Context. `device_id` (TEXT, ej: KPCL0036) es el PRIMARY KEY de `devices` en toda la documentacion.

### App Web v1.0 (2026-02-08 / 2026-02-09)
26. [x] **Stack decidido:** Next.js 16 (App Router, TypeScript) + Supabase client directo + Vercel. La app vieja (Vite+Express en `c:\Kittypau\1\apps\app_principal`) queda archivada.
27. [x] **Scaffold del proyecto:** `c:\Kittypau\kittypau-app\` creado con Next.js 16, Tailwind v4, Recharts, React Hook Form, Zod, Lucide React. Guia de instalacion en `GUIA_INSTALACION.md`.
28. [x] **Auth y registro:** Login/registro con Supabase Auth (email/password). Middleware de proteccion de rutas. Deteccion de email confirmation pendiente.
29. [x] **Trigger `handle_new_user`:** Verificado activo en Supabase. Auto-insert en `profiles` al registrarse. Perfil manual insertado para usuario pre-existente.
30. [x] **Dashboard `/today`:** Muestra 8 dispositivos con ultima lectura (peso, temp, humedad, luz), estado online/offline, sensor_health. Device ID clickable.
31. [x] **Detalle de dispositivo `/today/[deviceId]`:** Pagina con info cards (WiFi, IP, estado, ultima lectura) + 2 graficos Recharts: LineChart (temp/humedad/luz) y AreaChart (peso con gradiente).
32. [x] **Paginas placeholder:** `/pet`, `/bowl`, `/story`, `/settings` con estructura basica.
33. [x] **Paleta de colores Kittypau:** Rosa palido → rosa → coral → durazno → rosa polvoriento. Tokens CSS aplicados en toda la app (background, primary, secondary, accent, muted, border).
34. [x] **Logo Kittypau:** Manito_1.jpeg en header (80px) y login/register (160px). Header agrandado a h-20 con texto 3xl en Titan One.
35. [x] **Layout responsivo:** Header sticky con logo + nombre + email + logout. Bottom nav con 4 tabs (Hoy, Mascota, Plato, Config).

### OTA y re-flasheo (2026-02-09)
36. [x] **OTA verificado en produccion:** Primera actualizacion OTA exitosa. PlatformIO con `upload_protocol = espota` y `upload_port = <IP>`. Requiere PC y ESP en la misma red WiFi + regla de Firewall de Windows para Python. Upload en 18 segundos.
37. [x] **KPCL0039 re-flasheado como KPCL0031:** Firmware actualizado via OTA (sin cable USB). `config.h` con `DEVICE_ID "KPCL0031"`. Dispositivo reinicio y se auto-registro en Supabase via bridge.
38. [x] **Entorno OTA en `platformio.ini`:** Nuevo `[env:ota]` con `upload_protocol = espota`. Para flashear otro dispositivo solo cambiar `upload_port` (IP) y `DEVICE_ID` en `config.h`.
39. [x] **Historial de dispositivos (SQL V3 + Bridge v2.2):** Columnas `notes`, `ip_history` (JSONB), `retired_at` en `devices`. Bridge v2.2 detecta cambios de IP y los registra automaticamente. KPCL0039 marcado como retirado con historial de IP. Script: `SQL_MIGRACION_V3.sql`. Bridge desplegado en RPi.

---

## Pendiente

### FASE 0 - Decisiones bloqueantes
18. [x] ~~**Reconciliar schemas SQL:**~~ Resuelto con Opcion C.
19. [x] ~~**Definir stack de la app:**~~ Resuelto: Next.js + Supabase + Vercel. App vieja archivada.
20. [ ] **Definir flujo QR → claim device:** Documentar endpoint y logica para la transicion `factory → claimed → linked`. Definir que contiene el QR (device_id o token), como el usuario "reclama" un dispositivo auto-registrado por el bridge.

### FASE 1 - Infraestructura y base de datos
27. [ ] **Tailscale + acceso remoto RPi:** Instalar Tailscale para SSH desde cualquier red sin depender de estar en la misma WiFi.
28. [ ] **Proteger bridge local:** Agregar restriccion en `bridge/bridge.js` local para evitar ejecucion accidental desde Windows (el bridge productivo corre en la RPi).
32. [ ] **Limpiar credenciales de documentacion:** Eliminar contraseñas MQTT, claves Supabase y URLs de broker expuestas en archivos de Mauro_Context antes de subir a repositorio publico.
33. [ ] **Sensores fisicos con errores:** Revisar conexiones de hardware en las placas afectadas:
    - KPCL0035: `ERR_HX711` + DHT falla (solo luz funciona)
    - KPCL0037: `ERR_HX711`
    - KPCL0038: `ERR_HX711`
    - KPCL0031 (ex-KPCL0039): `ERR_HX711`
    - KPCL0036: `ERR_DHT`
    - KPCL0040: `ERR_HX711` (ESP32-CAM, firmware diferente)
    - KPCL0033: OK (unico con todos los sensores funcionando)

### FASE 2 - App Web (continuar)
34. [ ] **Formulario de perfil de usuario:** Completar datos faltantes tras registro (phone_number, city, country, is_owner, owner_name, notification_channel). Formulario editable en `/settings`.
35. [ ] **Onboarding con progreso:** Flujo 3 pasos: Usuario → Mascota (tipo, razas, peso) → Dispositivo (asociar a mascota). Guardar progreso en `profiles.onboarding_step`.
36. [ ] **CRUD mascotas:** Crear, editar, eliminar mascotas en `/pet`. Validaciones: weight_kg en rango, max 3 razas via `pet_breeds`.
37. [ ] **CRUD dispositivos:** Gestionar dispositivos en `/bowl`. Vincular dispositivo a mascota.
38. [ ] **Supabase Realtime:** Suscripcion en vivo a `sensor_readings` para datos actualizados sin recargar pagina.
39. [ ] **Timeline narrativo `/story`:** Interpretacion del dia basada en datos IoT (actividad, consumo, ambiente).

### FASE 3 - Deploy y validacion
40. [ ] **Push a GitHub:** Crear repo privado, subir `kittypau-app`.
41. [ ] **Deploy en Vercel:** Conectar repo, configurar env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).
42. [ ] **Prueba end-to-end en produccion:** Registrar usuario, ver dashboard con datos reales desde la URL publica.

### FASE 4 - Administracion y planes de usuario
43. [ ] **Sistema de roles y planes:** Definir niveles de acceso (Basic, Premium, Diamante). Agregar columna `plan` a `profiles`. Implementar middleware/RLS que limite funcionalidades segun plan.
    - **Basic (gratis):** 1 mascota, 1 dispositivo, dashboard basico (/today), historial 7 dias.
    - **Premium:** Multiples mascotas y dispositivos, historial 30 dias, /story, alertas por email.
    - **Diamante:** Todo Premium + historial ilimitado, exportacion de datos, alertas push/WhatsApp, soporte prioritario.
44. [ ] **Admin panel:** Vista para administrar usuarios, cambiar planes, ver metricas de uso. Protegida con rol `admin` en profiles.
45. [ ] **Limites y validaciones por plan:** Bloquear creacion de mascotas/dispositivos si excede el limite del plan. Mostrar CTA de upgrade.

### FASE 5 - Documentacion (inconsistencias detectadas)
46. [ ] **Actualizar refs a `kittypau_app/`:** Multiples docs (ARQUITECTURA_COMPLETA, ESTADO_AVANCE, CHECKLIST_DEPLOY, PLAN_PROYECTO) referencian una carpeta `kittypau_app/` que no existe. El proyecto real esta en `c:\Kittypau\kittypau-app\`. Corregir rutas.
47. [ ] **Aclarar que la app vieja esta archivada:** EVALUACION_PROYECTO.md documenta 3 "mundos" incompatibles. Agregar nota de que se decidio por Next.js+Supabase+Vercel y la app Express+Vite queda archivada.
48. [ ] **Corregir typo en FRONT_BACK_APIS.md:** Linea 128 dice "La API acepta `deviceId`, `deviceId` o `device_id`" (deviceId repetido).
49. [ ] **Actualizar ESTADO_AVANCE.md:** Reflejar que la app web ya existe (scaffold, auth, dashboard, graficos). Eliminar claims aspiracionales de "desplegado en Vercel" hasta que realmente se despliegue.

### Mejoras futuras
50. [ ] **Buffer local en bridge:** SQLite o JSON para datos que fallen al escribir en Supabase, con reintento automatico.
51. [ ] **Alertas de caida:** Notificacion (email/push) si el bridge deja de funcionar o un dispositivo deja de reportar.
52. [ ] **Webhook HiveMQ (alternativa futura):** URL con header x-webhook-token y topic filter +/SENSORS como alternativa o complemento al bridge.
53. [x] ~~**Historial de dispositivos:**~~ Implementado en SQL V3 + Bridge v2.2. Columnas `notes`, `ip_history`, `retired_at` en devices. Bridge registra cambios de IP automaticamente.

---

## Flujo actual (operativo)
```
ESP8266 (KPCL0031,0033,0035,0036,0037,0038,0040) --MQTT/TLS--> HiveMQ Cloud --wildcard--> RPi Bridge --REST--> Supabase
                                                                                          |
                                                                                   App Web (Next.js)
                                                                                   localhost:3000
                                                                                   Auth + Dashboard + Graficos
```

## Stack definitivo
| Capa | Tecnologia | Estado |
|------|-----------|--------|
| Firmware | ESP8266 + Arduino | Operativo |
| Broker MQTT | HiveMQ Cloud | Operativo |
| Bridge | Node.js en RPi Zero 2 W | Operativo |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) | Operativo |
| Frontend | Next.js 16 + Tailwind v4 + Recharts | En desarrollo |
| Deploy | Vercel | Pendiente |

## Documentos de referencia
| Documento | Contenido |
|-----------|-----------|
| `Mauro_Context/ARQUITECTURA_COMPLETA.md` | Arquitectura general del sistema |
| `Mauro_Context/EVALUACION_PROYECTO.md` | Analisis de las 3 arquitecturas (historico) |
| `Mauro_Context/CHECKLIST_DEPLOY.md` | Checklist paso a paso para deploy |
| `Mauro_Context/NOTAS_IMPLEMENTACION.md` | Reglas y validaciones para implementar |
| `Mauro_Context/ESTADO_AVANCE.md` | Estado general del proyecto |
| `Mauro_Context/FRONT_BACK_APIS.md` | Contratos de API y endpoints |
| `kittypau-app/GUIA_INSTALACION.md` | Guia paso a paso para instalar la app web |
