# Plan de Calidad — Kittypau IoT
**Proceso PMBOK**: 8.1 Planificar la Gestion de la Calidad | 8.2 Gestionar la Calidad
**Dominio PMBOK 7**: Entrega / Trabajo del Proyecto
**Version**: 1.0 | Fecha: 2026-03-05

---

## 1. Politica de Calidad

Kittypau garantiza calidad en tres dimensiones:

1. **Precision del dato**: el valor leido por el sensor refleja la realidad fisica del plato con error tolerable
2. **Confiabilidad del sistema**: el stack completo (firmware → bridge → backend → app) opera sin interrupciones no planificadas
3. **Experiencia de usuario**: el flujo de onboarding y el dashboard funcionan correctamente en todos los navegadores modernos

Todo entregable debe pasar su criterio de aceptacion antes de considerse completo.
No se mergea a `main` sin revision de codigo y CI verde.

---

## 2. Estandares de Calidad Aplicables

| Area | Estandar / Referencia |
|------|----------------------|
| Firmware | PlatformIO + C++ idiomatico, sin warnings de compilacion |
| API REST | Respuestas con `request_id`, codigos HTTP estandar, errores estructurados |
| Base de datos | Migraciones versionadas, RLS activo, constraints validados |
| Frontend | ESLint (Next.js rules), TypeScript strict mode, 0 errores de build |
| Hardware | Calibracion HX711 documentada, error < ±5g en rango 0-1000g |
| Seguridad | Sin secretos en repositorio, RLS en todas las tablas, rate limiting activo |

---

## 3. Metricas de Calidad

### Software

| Metrica | Umbral aceptable | Herramienta de medicion |
|---------|-----------------|------------------------|
| Errores de lint | 0 errores (warnings permitidos) | ESLint / GitHub Actions |
| Build exitoso | 100% de PRs deben buildear | Next.js / GitHub Actions |
| Cobertura de tipos TypeScript | Sin `any` explicito en codigo nuevo | ESLint no-explicit-any |
| Latencia API (p95) | < 500ms | Vercel Analytics |
| Latencia datos IoT (sensor → dashboard) | < 10 segundos | Medicion manual en pruebas |
| Uptime del bridge | > 99% (< 7h de inactividad/mes) | Panel admin / bridge_heartbeats |
| Tasa de error webhook | < 0.5% de mensajes procesados | Logs Vercel + audit_events |

### Hardware

| Metrica | Umbral aceptable | Metodo de medicion |
|---------|-----------------|-------------------|
| Error de medicion peso | < ±5g (rango 0-200g) | Pesas de referencia calibradas |
| Error de temperatura | < ±1°C | Termometro de referencia |
| Error de humedad | < ±5% HR | Higrómetro de referencia |
| Tiempo de reconexion MQTT | < 30 segundos | Monitor serie + MQTT client |
| Tiempo entre lecturas | 5s (SENSORS), 30s (STATUS) | Logs MQTT |
| Duracion sin reinicio espontaneo | > 7 dias continuos | Uptime MQTT / last_seen |

---

## 4. Proceso de Calidad de Software

### 4.1 Control en Pull Requests (CI/CD)

Cada PR a `main` pasa obligatoriamente:

```
PR creado
    |
    v
[GitHub Actions: pr-quality.yml]
    |
    ├── Repo Policy Checks
    │   ├── Sin archivos .env trackeados
    │   ├── SQL solo en supabase/migrations/ o Docs/
    │   └── Sin tokens o secretos detectados
    |
    ├── App Lint + Build
    │   ├── npm run lint (0 errors)
    │   └── npm run build (compilacion exitosa)
    |
    └── Vercel Preview Deploy
        └── Preview funcional accesible para revision
```

**Estado actual**: App Lint + Build ✅ (corregido 2026-03-05) | Repo Policy Checks ✅

### 4.2 Code Review

- Todo PR requiere al menos 1 aprobacion (objetivo: branch protection en main)
- Areas de propiedad definidas en `.github/CODEOWNERS`:
  - `kittypau_app/**` → Mauro
  - `bridge/**` → Javier + Mauro
  - `iot_firmware/**` → Javier + Mauro
  - `supabase/migrations/**` → Mauro + Javier

### 4.3 Migraciones de base de datos

```
Cambio de schema necesario
    |
    v
Crear archivo en supabase/migrations/
con nombre: YYYYMMDDHHMMSS_descripcion.sql
    |
    v
Ejecutar: npx supabase db push
    |
    v
Validar con TEST_DB_API.ps1
    |
    v
Incluir en PR (nunca SQL manual en produccion)
```

### 4.4 Control de secretos

- Prohibido commitear `.env`, tokens o passwords (validado por Repo Policy Checks)
- Entrega de secretos solo por canal seguro (no por repositorio, no por chat publico)
- Rotacion periodica de: SUPABASE_SERVICE_ROLE_KEY, MQTT_WEBHOOK_SECRET, MQTT_PASS
- Si hay sospecha de fuga: rotar inmediatamente

---

## 5. Proceso de Calidad de Hardware

### 5.1 Checklist de QA por unidad (antes de entrega)

**Electronica**
- [ ] Continuidad en pines criticos (VCC, GND, DOUT, SCK)
- [ ] Tension de alimentacion correcta (3.3V en pines MCU)
- [ ] Sin cortocircuitos detectados con multimetro

**Firmware**
- [ ] Flash exitoso via PlatformIO (sin errores de compilacion)
- [ ] Monitor serie muestra inicio correcto (WiFi conectado, MQTT conectado)
- [ ] Calibracion HX711 ejecutada y factor guardado en LittleFS
- [ ] Factor de calibracion validado con pesas de referencia (100g, 200g)
- [ ] Temperatura y humedad leyendo valores en rango esperado
- [ ] Sensor de luz LDR respondiendo a cambios de iluminacion

**Conectividad**
- [ ] Dispositivo publica en topic KPCLXXXX/SENSORS cada 5 segundos
- [ ] Dispositivo publica en topic KPCLXXXX/STATUS cada 30 segundos
- [ ] Datos visibles en panel admin de Supabase (sensor_readings)
- [ ] Datos visibles en dashboard de la app (/today)

**Mecanica**
- [ ] Carcasa sin deformaciones visibles post-impresion
- [ ] Plato se asienta correctamente sobre la celda de carga (sin balanceo)
- [ ] Tornillos ajustados, sin piezas sueltas
- [ ] Cable de alimentacion sin tension sobre el conector

### 5.2 Calibracion HX711 — Procedimiento oficial

```
1. Flashear entorno [env:calibration] via PlatformIO
2. Abrir monitor serie (115200 baud)
3. Colocar plato vacio sobre la celda — comando 't' para tara
4. Esperar estabilizacion (30 segundos)
5. Colocar peso de referencia conocido (recomendado: 100g)
6. Esperar 30 segundos con peso estable
7. Ingresar el valor del peso cuando el monitor lo solicite
8. Factor calculado y guardado en /calibration.json (LittleFS)
9. Reiniciar con firmware de produccion [env:nodemcuv2]
10. Verificar que peso mostrado coincide con referencia (±5g)
```

**Factor de referencia** (KPCL0036, calibrado 2026-03-04): `4033.3274`

---

## 6. Plan de Pruebas por Fase

### Pruebas de integracion (scripts existentes)

| Script | Que verifica | Cuando ejecutar |
|--------|-------------|----------------|
| `TEST_DB_API.ps1` | Auth, CRUD pets/devices, webhook, readings | Antes de cada merge a main |
| `TEST_ONBOARDING_BACKEND.ps1` | Flujo completo registro → onboarding | Despues de cambios en auth/onboarding |
| `TEST_AUTH_FLOW.ps1` | Reset de contrasena, confirmacion email | Cambios en auth |

### Prueba E2E funcional (manual)

Ejecutar antes de cada release:

1. Registro de usuario nuevo (email no usado)
2. Confirmacion de correo
3. Completar onboarding: perfil → mascota → dispositivo (KPCL real)
4. Verificar lectura en vivo en /today (con dispositivo encendido)
5. Navegar /story, /pet, /bowl, /settings sin errores
6. Cerrar sesion y re-login
7. Verificar datos persistentes

### Prueba de humo IoT (con dispositivo real)

1. Encender dispositivo KPCL
2. Verificar en HiveMQ: mensajes llegando en KPCLXXXX/SENSORS y STATUS
3. Verificar en Supabase (SQL Editor): filas en sensor_readings y readings
4. Verificar en app /today: datos actualizados en tiempo real

---

## 7. Gestion de Defectos

### Clasificacion

| Severidad | Descripcion | Tiempo de resolucion |
|-----------|-------------|---------------------|
| Critico | El sistema no funciona. Datos perdidos. Seguridad comprometida. | < 24 horas |
| Alto | Funcionalidad principal bloqueada para el usuario | < 3 dias |
| Medio | Funcionalidad secundaria afectada, workaround posible | < 1 semana |
| Bajo | Problema estetico, typo, UX menor | Proximo sprint |

### Proceso de reporte y resolucion

```
Defecto detectado
    |
    v
Issue en GitHub (con label: bug + severidad)
    |
    v
Asignado al responsable del area afectada
    |
    v
Fix en rama personal → PR con test que reproduce el bug
    |
    v
Review + CI verde → Merge a main
    |
    v
Cerrar issue con referencia al commit
```

---

## 8. Aseguramiento de Calidad (QA Gates)

### Gate 1 — Antes de deployar a produccion

- [ ] CI verde (lint + build)
- [ ] Al menos 1 aprobacion de PR
- [ ] TEST_DB_API.ps1 ejecutado OK localmente
- [ ] Sin nuevos `any` en TypeScript
- [ ] Migraciones SQL incluidas si hubo cambios de schema

### Gate 2 — Antes de entregar hardware a usuario

- [ ] Checklist de QA por unidad completado
- [ ] Calibracion HX711 documentada con factor guardado
- [ ] Prueba de 24h de operacion continua sin reinicios
- [ ] Datos visibles en app web del dispositivo

### Gate 3 — Antes de postular a fondo concursable

- [ ] Documentacion PMO completa y revisada
- [ ] Prototipo funcional con datos reales (no simulados)
- [ ] Presupuesto justificado por categoria
- [ ] Equipo identificado con roles claros

---

_Referencias: PMBOK 6ta Ed. Cap. 8 (Gestion de la Calidad) | PMBOK 7ma Ed. Dominio de Entrega_
_Documento anterior: [07_STAKEHOLDERS.md](07_STAKEHOLDERS.md) | Siguiente: [09_COMMUNICATIONS.md](09_COMMUNICATIONS.md)_
