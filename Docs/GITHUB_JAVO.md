# GitHub_Javo - Bitacora de Cambios

## Uso
Documento operativo para registrar el trabajo de Javier en GitHub.
Actualizar en cada jornada y en cada PR relevante.

## Plantilla de entrada
```md
## <YYYY-MM-DD>
- Rama: feat/javo-mauro
- Objetivo:
- Cambios realizados:
- Archivos principales:
- PR/Commit:
- Pruebas ejecutadas:
- Riesgos/Pendientes:
```

## Registro

## 2026-03-04
- Rama: feat/javo-mauro
- Objetivo: Calibrar sensor HX711 (KPCL0036), configurar bridge v2.6, alinear gobernanza GitHub.
- Cambios realizados:
  - Configuración de identidad git: user.name="javo", user.email="javomauro.contacto@gmail.com"
  - Instalación y autenticación de GitHub CLI (gh v2.87.3, cuenta javo-mauro)
  - Merge de origin/main en feat/javo-mauro (fast-forward, 51 commits)
  - DEVICE_ID cambiado de KPCL0038 → KPCL0036 en config.h
  - Agregado [env:calibration] en platformio.ini para flujo de calibración HX711
  - Agregado bloque CALIBRATION_MODE en main.cpp (RAW serial + comandos T/gramos)
  - Agregada función sensorsGetRawValue() en sensors.cpp / sensors.h
  - Bridge v2.6: función writeToReadings() para sincronizar sensor_readings → readings (UUID)
  - Fix en pr-quality.yml: excluir .example del check de .env (falso positivo)
  - Calibración HX711: factor 4033.33 guardado en LittleFS, 30s de estabilización
  - Firmware production flasheado en KPCL0036 (COM10), verificado Weight=0.00 + MQTT OK
- Archivos principales:
  - iot_firmware/javier_1a/firmware-esp8266/include/config.h
  - iot_firmware/javier_1a/firmware-esp8266/platformio.ini
  - iot_firmware/javier_1a/firmware-esp8266/src/main.cpp
  - iot_firmware/javier_1a/firmware-esp8266/src/sensors.cpp
  - iot_firmware/javier_1a/firmware-esp8266/src/sensors.h
  - bridge/src/index.js
  - .github/workflows/pr-quality.yml
- PR/Commit:
  - PR #14: https://github.com/kittypau-mascotas/kittypau_2026/pull/14
  - Commits: 915530b (firmware+bridge), 904db38 (ci fix)
- Pruebas ejecutadas:
  - Firmware compilado y flasheado OK en COM10
  - KPCL0036 publica en MQTT: KPCL0036/SENSORS y KPCL0036/STATUS ✓
  - WiFi conectado a Jeivos (10.227.246.111) ✓
  - Repo Policy Checks: PASS ✓
  - App Lint + Build: FAIL (errores pre-existentes en today/page.tsx y otros, no de este PR)
  - Vercel deployments: PASS ✓
- Riesgos/Pendientes:
  - Branch protection en main: NO configurada (requiere admin Mauro en GitHub UI)
  - App lint errors: 6 errores pre-existentes en kittypau_app, requieren PR separado
  - Bridge v2.6: deploy a RPi 192.168.1.93 pendiente (sin conexión en esta sesión)
  - ERR_DHT en KPCL0036: sensor DHT no responde, verificar cableado

## 2026-03-02
- Rama: feat/javo-mauro
- Objetivo: Preparar flujo de trabajo colaborativo en repo Kittypau.
- Cambios realizados: Se definio rama personal y flujo oficial de integracion por PR.
- Archivos principales:
  - Docs/GITHUB_FLUJO_OFICIAL.md
  - Docs/ONBOARDING_JAVIER.md
- PR/Commit: Pendiente de consolidacion en PR.
- Pruebas ejecutadas: Validacion de ramas remotas y estructura documental.
- Riesgos/Pendientes:
  - Completar primeras tareas tecnicas IoT en rama personal.
  - Actualizar esta bitacora al cerrar cada PR.

## 2026-03-02 (prueba de fusion conjunta)
- Rama: feat/javo-mauro (comparada contra `main`)
- Objetivo: Validar integración conjunta Mauro/Javo en rama de test equivalente a `main`.
- Cambios realizados:
  - Se ejecutó merge de `origin/feat/javo-mauro` sobre rama test de fusión.
  - Resultado: sin diferencias adicionales (`Already up to date`) respecto de `main` en esta corrida.
- Archivos principales:
  - `Docs/REGISTRO_PRUEBA_FUSION_MAIN_JAVO_MAURO_2026-03-02.md`
- PR/Commit:
  - Referencia de prueba: `origin/test/fusion-main-javo-mauro-2026-03-02`
- Pruebas ejecutadas:
  - Simulación de fusión conjunta: OK
- Riesgos/Pendientes:
  - Cuando Javo agregue nuevos commits IoT/firmware, repetir prueba de fusión antes de merge a `main`.
