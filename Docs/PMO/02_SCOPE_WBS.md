# Alcance y WBS — Kittypau IoT
**Proceso PMBOK**: 5.3 Definir el Alcance | 5.4 Crear la EDT/WBS
**Dominio PMBOK 7**: Planificacion / Entrega
**Version**: 1.0 | Fecha: 2026-03-05

---

## 1. Declaracion del Alcance

### Descripcion del producto

Kittypau es un sistema integrado de monitoreo inteligente de mascotas compuesto por:
- **Hardware IoT** (platos inteligentes con sensores de peso, temperatura, humedad y camara opcional)
- **Software embebido** (firmware en ESP8266/ESP32-CAM)
- **Infraestructura de conectividad** (bridge MQTT-Supabase en Raspberry Pi)
- **Backend en la nube** (API REST + base de datos PostgreSQL)
- **Aplicacion web** (dashboard en tiempo real, onboarding, historico, admin)

### Criterios de aceptacion del producto

El producto se considera aceptado cuando:

1. Un usuario puede registrarse, crear una mascota y vincular un dispositivo en < 5 minutos
2. Los datos de peso llegan al dashboard en < 10 segundos desde el evento fisico
3. El sistema opera de forma continua 24/7 sin intervencion manual del equipo
4. La precision del sensor de peso es de ±5g o mejor en el rango 0-1000g
5. La app funciona correctamente en Chrome/Safari/Firefox (desktop y mobile)

---

## 2. Lo que esta DENTRO del alcance

### Entregables de software

- Firmware v1.0 para ESP8266 (sin camara)
- Firmware v1.0 para ESP32-CAM (con camara)
- Modo de calibracion HX711 via serial
- Bridge MQTT-Supabase v2.6 (Raspberry Pi)
- API REST Next.js (10 endpoints productivos)
- App web completa: login, registro, onboarding, today, story, pet, bowl, settings
- Panel de administracion con telemetria y finanzas
- Sistema CI/CD (GitHub Actions + Vercel)
- Migraciones de base de datos versionadas

### Entregables de hardware

- Plato inteligente comedero (perfil NodeMCU v3)
- Plato inteligente bebedero (perfil NodeMCU v3)
- Plato comedero con camara (perfil ESP32-CAM)
- Carcasa 3D impresa (disenio modular, reparable)
- PCB de regulacion de energia
- Documentacion de montaje y calibracion

### Entregables de documentacion

- Set PMO completo (10 documentos)
- Dossier de postulacion para fondos concursables
- Manual de usuario
- Documentacion tecnica de arquitectura

---

## 3. Lo que esta FUERA del alcance (exclusiones)

| Exclusion | Justificacion | Version objetivo |
|-----------|--------------|-----------------|
| App movil nativa (iOS/Android) | Requiere presupuesto adicional post-fondo | v2 |
| Integracion con veterinarias | Requiere modelo B2B validado | v3 |
| IA/ML predictivo de enfermedades | Requiere dataset suficiente (> 6 meses de datos) | Fase 3 |
| Produccion industrial en serie | Post-financiamiento | Post-CORFO |
| Sistema de pagos integrado | SaaS billing via tercero (Stripe) | v2 |
| Soporte a mascotas exoticas (reptiles, aves) | Sensores distintos, fuera de MVP | v3 |
| App offline sin conexion | Complejidad no justificada en piloto | v3 |

---

## 4. Estructura de Desglose de Trabajo (WBS)

```
KP-2026 Kittypau IoT
│
├── 1. HARDWARE
│   ├── 1.1 Diseno mecanico
│   │   ├── 1.1.1 Diseno carcasa comedero (Fusion 360 / FreeCAD)
│   │   ├── 1.1.2 Diseno carcasa bebedero
│   │   ├── 1.1.3 Diseno variante con camara (ESP32-CAM)
│   │   └── 1.1.4 Documentacion de diseno 3D
│   ├── 1.2 Electronica
│   │   ├── 1.2.1 Diseno esquema PCB regulacion
│   │   ├── 1.2.2 Seleccion de componentes (BOM)
│   │   └── 1.2.3 Prototipado y prueba electronica
│   ├── 1.3 Manufactura (por unidad)
│   │   ├── 1.3.1 Impresion 3D carcasa
│   │   ├── 1.3.2 Ensamblaje electronico
│   │   ├── 1.3.3 Postproceso y acabado
│   │   └── 1.3.4 QA funcional + calibracion HX711
│   └── 1.4 Empaque y etiquetado
│       ├── 1.4.1 Packaging primario
│       └── 1.4.2 Etiqueta QR con device_id
│
├── 2. FIRMWARE (IoT)
│   ├── 2.1 Firmware ESP8266
│   │   ├── 2.1.1 Sensor HX711 (peso, tara, calibracion)
│   │   ├── 2.1.2 Sensor DHT (temperatura y humedad)
│   │   ├── 2.1.3 Sensor LDR (luz ambiental)
│   │   ├── 2.1.4 Conectividad WiFi (reconexion automatica)
│   │   ├── 2.1.5 Cliente MQTT TLS (HiveMQ Cloud)
│   │   ├── 2.1.6 Publicacion topics SENSORS y STATUS
│   │   ├── 2.1.7 Modo calibracion serial
│   │   ├── 2.1.8 Persistencia en LittleFS (calibracion)
│   │   └── 2.1.9 OTA updates (ArduinoOTA)
│   └── 2.2 Firmware ESP32-CAM
│       ├── 2.2.1 Todo lo de ESP8266 (heredado)
│       └── 2.2.2 Captura y transmision de imagen
│
├── 3. BRIDGE (MQTT-Supabase)
│   ├── 3.1 Subscripcion MQTT wildcard (+/SENSORS, +/STATUS)
│   ├── 3.2 Auto-registro de dispositivos nuevos
│   ├── 3.3 Handler de datos de sensores (sensor_readings)
│   ├── 3.4 Sincronizacion a tabla readings (UUID-based)
│   ├── 3.5 Handler de estado de dispositivo (devices)
│   ├── 3.6 Historial de IPs (ip_history JSONB)
│   ├── 3.7 Publicacion de estado RPi (KPBR0001/STATUS)
│   ├── 3.8 Actualizacion bridge_heartbeats
│   └── 3.9 Deploy y servicio systemd en RPi
│
├── 4. BACKEND (Supabase + API)
│   ├── 4.1 Base de datos
│   │   ├── 4.1.1 Schema SQL (tablas, enums, constraints)
│   │   ├── 4.1.2 Politicas RLS por usuario
│   │   ├── 4.1.3 Triggers (last_seen, battery, device_state)
│   │   ├── 4.1.4 Indices (readings, devices, sensor_readings)
│   │   ├── 4.1.5 Vistas admin (bridge_status_live, admin_dashboard_live)
│   │   ├── 4.1.6 Tablas financieras (finance_kit_components, snapshots)
│   │   └── 4.1.7 Migraciones versionadas (supabase/migrations/)
│   ├── 4.2 Autenticacion
│   │   ├── 4.2.1 Supabase Auth (email + password)
│   │   ├── 4.2.2 Confirmacion de correo
│   │   ├── 4.2.3 Recuperacion de contrasena
│   │   └── 4.2.4 Refresh token silencioso
│   └── 4.3 API REST (Next.js)
│       ├── 4.3.1 POST /api/mqtt/webhook (ingesta IoT)
│       ├── 4.3.2 GET/POST /api/pets
│       ├── 4.3.3 PATCH /api/pets/:id
│       ├── 4.3.4 GET/POST /api/devices
│       ├── 4.3.5 GET /api/readings
│       ├── 4.3.6 GET/PUT /api/profiles
│       ├── 4.3.7 GET /api/bridge/heartbeat + health-check
│       ├── 4.3.8 GET /api/admin/overview
│       ├── 4.3.9 Rate limiting (Upstash Redis)
│       └── 4.3.10 Auditoria (audit_events)
│
├── 5. APLICACION WEB (Next.js)
│   ├── 5.1 Vistas publicas
│   │   ├── 5.1.1 /login (auth + hero interactivo)
│   │   └── 5.1.2 /register (ruta publica + confirmacion)
│   ├── 5.2 Onboarding
│   │   ├── 5.2.1 Popup de registro (4 pasos: Cuenta->Usuario->Mascota->Dispositivo)
│   │   ├── 5.2.2 Onboarding usuario (perfil + foto)
│   │   ├── 5.2.3 Onboarding mascota (perfil + foto)
│   │   └── 5.2.4 Onboarding dispositivo (QR + vinculacion)
│   ├── 5.3 App principal
│   │   ├── 5.3.1 /today (dashboard interpretado + Realtime)
│   │   ├── 5.3.2 /story (timeline narrativo)
│   │   ├── 5.3.3 /pet (perfil conductual)
│   │   ├── 5.3.4 /bowl (estado tecnico dispositivo)
│   │   └── 5.3.5 /settings (perfil usuario + notificaciones)
│   ├── 5.4 Panel Admin
│   │   ├── 5.4.1 KPIs ejecutivos
│   │   ├── 5.4.2 Estado de dispositivos y bridge
│   │   ├── 5.4.3 Catalogo financiero KPCL
│   │   ├── 5.4.4 Suite de tests admin
│   │   └── 5.4.5 Auditoria y logs
│   └── 5.5 Sistema de alertas (v2)
│       ├── 5.5.1 Configuracion de umbrales por usuario
│       ├── 5.5.2 Notificacion email/push
│       └── 5.5.3 Logica de deteccion de anomalias
│
├── 6. INFRAESTRUCTURA Y CI/CD
│   ├── 6.1 GitHub
│   │   ├── 6.1.1 GitHub Actions (pr-quality.yml)
│   │   ├── 6.1.2 CODEOWNERS
│   │   ├── 6.1.3 PR template
│   │   └── 6.1.4 Branch protection (main)
│   ├── 6.2 Vercel
│   │   ├── 6.2.1 Deploy automatico desde main
│   │   ├── 6.2.2 Variables de entorno
│   │   └── 6.2.3 Preview deployments por PR
│   ├── 6.3 Supabase
│   │   ├── 6.3.1 Proyecto en produccion
│   │   ├── 6.3.2 Auth + RLS configurado
│   │   └── 6.3.3 Storage (kittypau-photos)
│   └── 6.4 Upstash Redis (rate limiting distribuido)
│
├── 7. TESTING Y CALIDAD
│   ├── 7.1 Tests automaticos (CI)
│   │   ├── 7.1.1 npm run lint (ESLint)
│   │   └── 7.1.2 npm run build (TypeScript + Next.js)
│   ├── 7.2 Tests manuales
│   │   ├── 7.2.1 TEST_DB_API.ps1
│   │   ├── 7.2.2 TEST_ONBOARDING_BACKEND.ps1
│   │   └── 7.2.3 TEST_AUTH_FLOW.ps1
│   ├── 7.3 QA hardware
│   │   ├── 7.3.1 Prueba de conectividad WiFi/MQTT
│   │   ├── 7.3.2 Calibracion HX711 por unidad
│   │   └── 7.3.3 Test de lectura continua 24h
│   └── 7.4 E2E funcional
│       ├── 7.4.1 Flujo registro -> onboarding -> lectura en vivo
│       └── 7.4.2 Smoke test multi-usuario (RLS)
│
├── 8. DOCUMENTACION
│   ├── 8.1 PMO (10 documentos)
│   ├── 8.2 Documentacion tecnica (Docs/)
│   ├── 8.3 Dossier de fondos (CORFO, ANID, StartUp Chile)
│   ├── 8.4 Manual de usuario
│   └── 8.5 Guias de instalacion y calibracion
│
└── 9. GESTION DEL PROYECTO
    ├── 9.1 Kick-off y definicion
    ├── 9.2 Seguimiento semanal (GitHub + docs)
    ├── 9.3 Control de cambios
    ├── 9.4 Postulacion a fondos
    └── 9.5 Cierre de fase y lecciones aprendidas
```

---

## 5. Diccionario WBS (entregables criticos)

### 1.3.4 QA funcional + calibracion HX711

**Descripcion**: Proceso de prueba y calibracion de cada unidad antes de entrega.
**Criterio de aceptacion**: Error de medicion < ±5g con peso de referencia de 100g. Conectividad WiFi estable por 30 minutos. MQTT publicando correctamente a HiveMQ.
**Duracion estimada**: 30 minutos por unidad
**Responsable**: Javier Suarez

### 3.4 Sincronizacion a tabla readings

**Descripcion**: El bridge procesa datos de sensor_readings y los sincroniza a la tabla readings (UUID) para consumo de la app web.
**Criterio de aceptacion**: Latencia < 5 segundos entre lectura del dispositivo y disponibilidad en la app. Manejo correcto de clock_invalid cuando el reloj del dispositivo difiere > 10 minutos.
**Responsable**: Javier Suarez / Mauro Carcamo

### 5.3.1 /today (dashboard interpretado)

**Descripcion**: Vista principal de la app. Muestra estado interpretado del dia para la mascota activa. Conectada a Supabase Realtime para actualizaciones en vivo.
**Criterio de aceptacion**: Datos se actualizan sin recargar la pagina. Muestra correctamente cuando el dispositivo esta offline. Funciona con selector de mascota y mapeo KPCL. Tiempo de carga inicial < 3 segundos.
**Responsable**: Mauro Carcamo

### 5.5 Sistema de alertas (v2)

**Descripcion**: Modulo de notificaciones que detecta anomalias en patrones de alimentacion/hidratacion y las comunica al dueno via email o push.
**Criterio de aceptacion**: Alerta disparada en < 30 segundos de detectada la condicion. Tasa de falsos positivos < 5%. Usuario puede configurar umbrales.
**Estado**: Fuera del alcance v1. Planificado para Fase 2 (post-CORFO).
**Responsable**: Mauro Carcamo

---

## 6. Entregables por fase

### Fase 0 (completada)
- [x] Firmware ESP8266 v1.0 funcional
- [x] Firmware ESP32-CAM v1.0 funcional
- [x] Bridge v2.6 deployado en RPi
- [x] API REST completa (10 endpoints)
- [x] App web: login, registro, onboarding, today, story, pet, bowl, settings
- [x] Panel admin con telemetria y finanzas
- [x] CI/CD operativo (GitHub Actions + Vercel)
- [x] 8 dispositivos activos (KPCL0034-KPCL0041)

### Fase 1 (en curso — Mar 2026)
- [ ] Set PMO completo (10 documentos)
- [ ] Dossier postulacion CORFO Semilla Inicia
- [ ] Cronograma actualizado post-evaluacion

### Fase 2 (Apr-Jun 2026)
- [ ] 50 unidades producidas
- [ ] Sistema de alertas v1
- [ ] Piloto con 10 usuarios externos
- [ ] Constitucion legal empresa

### Fase 3 (Jul-Oct 2026)
- [ ] App movil v1 (React Native)
- [ ] Reduccion COGS < $20 USD
- [ ] 50+ usuarios activos
- [ ] Postulacion ANID + StartUp Chile

---

## 7. Supuestos del alcance

1. El diseno de carcasa 3D actual es reutilizable para todas las variantes del piloto
2. La API de Supabase Realtime es suficiente para la latencia requerida
3. El firmware OTA permite actualizar dispositivos ya desplegados sin intervencion fisica
4. Los usuarios del piloto tienen WiFi 2.4GHz disponible en el area donde colocan el plato

---

## 8. Restricciones del alcance

1. La app web debe funcionar en navegadores modernos sin instalacion adicional
2. El hardware debe poder ensamblarse con herramientas de maker (no fabrica industrial)
3. El sistema debe operar con los planes gratuitos de Supabase, Vercel y HiveMQ hasta el piloto
4. El firmware debe ser actualizable de forma remota (OTA) para no requerir retiro del plato

---

_Referencias: PMBOK 6ta Ed. Cap. 5 (Gestion del Alcance) | PMBOK 7ma Ed. Dominio de Planificacion_
_Documento anterior: [01_PROJECT_CHARTER.md](01_PROJECT_CHARTER.md) | Siguiente: [03_SCHEDULE.md](03_SCHEDULE.md)_


