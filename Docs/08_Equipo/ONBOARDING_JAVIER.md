# Onboarding Javier - Setup Completo (PC Local)

Documento operativo para que Javier (o una IA asistente) pueda:
- clonar,
- abrir,
- ejecutar,
- editar,
- vlidar,
- y subir cambios del proyecto `kittypau_2026`.

Fecha de referencia: 2026-03-02.

## 0) Reglas de seguridad (obligatorio)
1. No pegar secretos reales en docs, chat, commits, issues ni PR.
2. No subir archivos `.env*` con secretos.
3. Compartir credenciales por canal seguro (1Password, Vault, Signal).
4. Rotar secretos cuando termine onboarding.

Secretos criticos a rotar despues:
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_WEBHOOK_SECRET`
- `BRIDGE_HEARTBEAT_SECRET`
- `UPSTASH_REDIS_REST_TOKEN`

## 1) Requisitos de software en PC de Javier

## 1.1 Minimos
- Git
- Node.js 20 LTS (recomendado) o 18+
- npm
- VS Code

## 1.2 Para firmware (si va a compilar/subir a placas)
- VS Code extension: PlatformIO IDE
- Python (PlatformIO lo instala o lo detecta)
- Drivers USB de placa (ESP32/ESP8266), segn hardware

## 1.3 Comprobacion rpida
En terminal (PowerShell o bash):
```bash
git --versin
node -v
npm -v
```

## 2) Clonar repo y abrir workspace

## 2.1 Clonar
```bash
git clone https://github.com/kittypau-mascotas/kittypau_2026.git
cd kittypau_2026
```

## 2.2 Abrir en VS Code
```bash
code .
```

## 2.3 Confirmar estructura esperada
Deben existir estas carpetas:
- `kittypau_app/` (frontend + API Next.js)
- `bridge/` (bridge MQTT -> API webhook)
- `iot_firmware/javier_1a/` (firmware integrado de Javier)
- `supabase/` (migrations)
- `Docs/` (documentacin operativa)

## 3) Configurar app web (Next.js)

## 3.1 Instalar dependencias
```bash
cd kittypau_app
npm install
```

## 3.2 Crear env local
Crear archivo: `kittypau_app/.env.local`

Plantilla minima:
```env
NEXT_PUBLIC_SITE_URL=<URL_APP>
NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>

SUPABASE_URL=<SUPABASE_URL>
SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>

MQTT_WEBHOOK_SECRET=<MQTT_WEBHOOK_SECRET>
BRIDGE_HEARTBEAT_SECRET=<BRIDGE_HEARTBEAT_SECRET>

UPSTASH_REDIS_REST_URL=<UPSTASH_REDIS_REST_URL>
UPSTASH_REDIS_REST_TOKEN=<UPSTASH_REDIS_REST_TOKEN>
```

Notas:
- No usar comillas si no son necesarias.
- No agregar espacios al final de valores.

## 3.3 Ejecutar app
```bash
npm run dev
```

URL local esperada:
- `http://localhost:3000`

## 3.4 Verificaciones funcionales minims
1. Login carga.
2. Vista `/today` carga.
3. Si cuenta admin: `/admin` carga.
4. Menu admin incluye `Javo`: `/admin/javo`.

## 4) Configurar bridge local (Node)

## 4.1 Instalar dependencias
Desde raiz repo:
```bash
cd bridge
npm install
```

## 4.2 Crear `bridge/.env`
Basarse en `bridge/.env.example`.

Plantilla recomendada:
```env
MQTT_HOST=<TU_HOST_HIVEMQ>
MQTT_PORT=8883
MQTT_USERNAME=<TU_USUARIO>
MQTT_PASSWORD=<TU_PASSWORD>
MQTT_TOPIC=+/SENSORS

WEBHOOK_URL=<URL_APP>/api/mqtt/webhook
WEBHOOK_TOKEN=<MQTT_WEBHOOK_SECRET>

BRIDGE_ID=KPBR0001
BRIDGE_HEARTBEAT_URL=<URL_APP>/api/bridge/heartbeat
BRIDGE_HEARTBEAT_TOKEN=<BRIDGE_HEARTBEAT_SECRET>
HEARTBEAT_INTERVAL_SEC=30
BRIDGE_DEVICE_MODEL=Raspberry Pi Zero 2 W
```

## 4.3 Ejecutar bridge
```bash
npm start
```

Logs esperados:
- `MQTT connected`
- `Subscribed to: ...`
- `Heartbeat ok`
- `Webhook ok` (cuando llegan mensajes)

## 5) Firmware integrado de Javier (PlatformIO)

## 5.0 Referencia oficial de origen (repo Javier)
Si hay dudas funcionales o falta contexto de implementación IoT/firmware, la referencia fuente es:
- `https://github.com/javo-mauro/kittypau_1a.git`

Clonado estándar:
```bash
git clone https://github.com/javo-mauro/kittypau_1a.git
```
Esto crea carpeta `kittypau_1a` en el directorio actual.

Clonado con carpeta destino explícita:
```bash
git clone https://github.com/javo-mauro/kittypau_1a.git <nombre-carpeta>
```

Uso recomendado en este proyecto:
- Tomar `kittypau_1a` como referencia técnica.
- No mezclar directo en `main`; cualquier incorporación debe pasar por PR y checklist.

Rutas:
- `iot_firmware/javier_1a/firmware-esp32cam/platformio.ini`
- `iot_firmware/javier_1a/firmware-esp8266/platformio.ini`

## 5.1 Abrir proyecto de firmware
En VS Code:
1. `File -> Open Folder...`
2. Elegir una carpeta firmware (ejemplo `firmware-esp32cam`).
3. PlatformIO detecta `platformio.ini`.

## 5.2 Archivos que normalmente editara
- `include/config.h`
- `src/main.cpp`
- `src/mqtt_manager.*`
- `src/wifi_manager.*`

## 5.3 Archivos sensibles que NO se deben commitear
- `data/wifi.json` (si contiene credenciales)
- cualquier `.env` local

## 5.4 Validacion tecnica minima firmware
1. Compilar sin error.
2. Publicar en topicos esperados:
   - `KPCLxxxx/SENSORS`
   - `KPCLxxxx/STATUS`
3. Bridge recibe y reenvia.
4. API responde 200.

## 6) Flujo Git obligatorio (equipo)

Regla: nunca trabajar en `main`.

## 6.1 Crear rama de trabajo
```bash
git checkout main
git pull origin main
git checkout -b feat/javier-iot/<mdulo>
```

## 6.2 Commit y push
```bash
git add .
git commit -m "feat(iot): <descripcion-clara>"
git push -u origin feat/javier-iot/<mdulo>
```

## 6.3 Pull Request
- Base recomendada: rama de integracion (si aplica) o `main`.
- Adjuntar evidencia de pruebas.
- No mergear si fallan checks criticos.

### 6.3.1 Crear PR con GitHub CLI (`gh`) - flujo vlidado
Si `gh` no esta instalado:
```bash
winget install --id GitHub.cli -e
```

Login web:
```bash
gh auth login -h github.com -p https -w
```

Esperado en salida:
- `✓ Logged in as javo-mauro` (en PC de Javier)

Crear PR hacia `main` desde rama activa:
```bash
gh pr create --base main --head feat/javo-mauro --title "feat(admin): integrar mdulo Javo en dashboard admin" --fill
```

Esperado en salida:
- `Creating pull request for feat/javo-mauro into main ...`
- URL del PR, por ejemplo: `https://github.com/kittypau-mascotas/kittypau_2026/pull/<numero>`

## 6.4 Rams oficiales de trabajo (Kittypau)
Rams creadas para separar trabajo por persona:
- `feat/mauro-curcuma`
- `feat/javo-mauro`

Identidad Git recomendada por usuario:
```bash
# Mauro
git config user.name "Mauro Curcuma"
git config user.email "mauro.carcamo89@gmail.com"

# Javo
git config user.name "javo"
git config user.email "javomauro.contacto@gmail.com"
```

Cambio de rama en cada PC:
```bash
# Mauro
git checkout feat/mauro-curcuma
git pull origin feat/mauro-curcuma

# Javo
git checkout feat/javo-mauro
git pull origin feat/javo-mauro
```

## 6.5 Bitacoras obligatorias de cambios (GitHub_javo / GitHub_mauro)
Cada persona debe registrar su trabajo en:
- `Docs/GITHUB_JAVO.md`
- `Docs/GITHUB_MAURO.md`
- `Docs/AVANCE_PUSHES_GITHUB.md` (consolidado de ambos)

Regla de uso:
1. Al iniciar jornada: registrar objetivo del dia.
2. Al cerrar PR/cambios: registrar resumen, archivos tocados, pruebas y riesgos.
3. Tras cada `git push`: actualizar `AVANCE_PUSHES_GITHUB.md`.
4. No cerrar una jornada sin actualizar la bitacora correspondiente.

Formato mnimo por entrada:
- Fecha
- Rama
- Objetivo
- Cambios
- Archivos
- PR/Commit
- Pruebas
- Riesgos/Pendientes

## 6.6 Sincronizar rama de Javo con `main` (obligatorio antes de desarrollar)
Objetivo: asegurar que Javier trabaje sobre la ultima base comun del proyecto.

Comandos:
```bash
git fetch origin --prune
git checkout feat/javo-mauro
git pull origin feat/javo-mauro
git merge origin/main
git push origin feat/javo-mauro
```

Verificacion:
```bash
git status
git branch --show-current
```

Esperado:
- rama actual: `feat/javo-mauro`
- working tree limpio o solo cambios locales intencionales

## 7) Flujo Vercel (Preview + Production)

Si Vercel esta conectado al repo GitHub:
1. Al hacer push a rama/PR -> se crea Preview Deploy.
2. Revisar URL de preview.
3. Al mergear a `main` -> deploy a Production.

Importante:
- Si cambian variables de entorno en Vercel, hacer redeploy.

## 8) Validaciones antes de abrir PR

Ejecutar o revisar:
- `Docs/PRUEBAS_E2E.md`
- `Docs/SQL_CHECK_BRIDGE_UNIQUENESS.sql`
- `Docs/PLAYBOOK_INGRESO_IOT_FIRMWARE.md`
- `Docs/INTEGRACION_JAVIER_IOT.md`

Checks funcionales recomendados:
1. App local levanta.
2. Login funciona.
3. `/admin` y `/admin/javo` cargan con usuario permitido.
4. Bridge heartbeat actualizado.
5. No hay secretos en `git diff`.

## 9) Docker: decision actual

No es necesario Docker para empezar.

Estado actual:
- No hay flujo principal dependiente de Docker en este repo.
- Para Javier basta: Node + npm + PlatformIO + git.

Docker solo seria til despues para:
- estandarizar entorno de bridge,
- correr pruebas/servicios reproducibles en equipo.

## 10) Troubleshooting rapido

## 10.1 `npm run dev` falla por variables
- Revisar `kittypau_app/.env.local`.
- Confirmar que todas las claves obligatorias existen.

## 10.2 `403` o `401` en APIs
- Revisar token de sesin.
- Revisar `MQTT_WEBHOOK_SECRET` / `BRIDGE_HEARTBEAT_SECRET`.

## 10.3 Bridge no conecta MQTT
- Verificar host/puerto/usuario/password.
- Confirmar TLS y conectividad de red.

## 10.4 PlatformIO no detecta `platformio.ini`
- Abrir la carpeta exacta del firmware.
- Reinstalar extension PlatformIO si corresponde.

## 10.5 Push rechazado
- Confirmar permisos GitHub.
- Hacer `git pull --rebase origin main` y volver a push.

## 11) Checklist final de onboarding (apto)

- [ ] Repo clonado y abierto.
- [ ] `kittypau_app` corre en local.
- [ ] Env local configurado.
- [ ] Bridge ejecuta con heartbeat/webhook.
- [ ] Firmware abre en PlatformIO (`platformio.ini` detectado).
- [ ] Rama `feat/javier-iot/...` creada y push exitoso.
- [ ] PR con evidencia de pruebas.
- [ ] No hay secretos en commit.

## 12) Referencias internas
- `Docs/INDEX.md`
- `Docs/ONBOARDING_JAVIER.md` (este archivo)
- `Docs/GITHUB_JAVO.md`
- `Docs/GITHUB_MAURO.md`
- `Docs/AVANCE_PUSHES_GITHUB.md`
- `Docs/PLAYBOOK_INGRESO_IOT_FIRMWARE.md`
- `Docs/INTEGRACION_JAVIER_IOT.md`
- `Docs/RASPBERRY_BRIDGE.md`
- `Docs/TOPICOS_MQTT.md`

## 13) Revision mensual obligatoria (fusion y coherencia)
Frecuencia: cada 1 mes calendario.

Objetivo:
- Evaluar diferencias entre rams de Mauro y Javo.
- Definir que se fusiona a `main`.
- Mantener coherencia tecnica y documental del proyecto.

Procedimiento mensual:
1. Comparar rams:
```bash
git fetch origin --prune
git log --oneline origin/main..origin/feat/mauro-curcuma
git log --oneline origin/main..origin/feat/javo-mauro
git diff --name-only origin/main...origin/feat/mauro-curcuma
git diff --name-only origin/main...origin/feat/javo-mauro
```
2. Revisar bitcoras:
- `Docs/GITHUB_MAURO.md`
- `Docs/GITHUB_JAVO.md`
3. Definir backlog de fusion mensual (PRs a `main`).
4. Validar pruebas minims antes de merge.
5. Registrar resultado de la revision mensual en ambas bitcoras.


