---
id: readme_devops
title: DevOps — Deploy, CI/CD, Infraestructura
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - devops
  - vercel
  - github
  - deploy
  - ci-cd
related:
  - [[00_HOME]]
  - [[03_Backend/README_Backend]]
  - [[04_Frontend/README_Frontend]]
  - [[07_MQTT/README_MQTT]]
---

# DevOps — Deploy, CI/CD, Infraestructura

---

## Stack de deploy

| Capa | Herramienta | Ambiente |
|---|---|---|
| Frontend / API Routes | Vercel | Preview por branch + Production en `main` |
| Base de datos | Supabase Cloud | Proyecto único (no branches por ahora) |
| MQTT Broker | HiveMQ Cloud | Free tier — siempre activo |
| Bridge IoT | Raspberry Pi Zero 2W | Systemd service, 24/7 en casa |
| Android APK | Android Studio / Capacitor | Build manual por release |
| Repositorio | GitHub | branch `main` = producción |

---

## Vercel

### Deploy automático

Cada push a `main` → deploy de producción automático.  
Cada PR → deploy de preview en URL única.

### Variables de entorno requeridas

Configurar en Vercel Dashboard → Settings → Environment Variables:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server-side) |
| `SUPABASE_ANALYTICS_URL` | URL DB analytics (opcional — degrada si falta) |
| `SUPABASE_ANALYTICS_SERVICE_ROLE_KEY` | Service role key analytics |
| `NEXT_PUBLIC_MQTT_BROKER` | Host HiveMQ Cloud (ej: `abc.s1.eu.hivemq.cloud`) |
| `NEXT_PUBLIC_MQTT_PORT_WS` | `8884` — WebSocket TLS para browser |
| `NEXT_PUBLIC_MQTT_USER_READONLY` | Usuario MQTT de solo-lectura (para el browser) |
| `NEXT_PUBLIC_MQTT_PASS_READONLY` | Password MQTT de solo-lectura |
| `BRIDGE_HEARTBEAT_SECRET` | Token secreto para `/api/bridge/heartbeat` |
| `NEXT_PUBLIC_APP_FLAVOR` | `web` o `android` |
| `HF_TOKEN` | Token Hugging Face (chatbot IA) |
| `HF_MODEL` | Modelo HF a usar (ej: `meta-llama/Llama-3.1-8B-Instruct`) |
| `ADMIN_OVERVIEW_CACHE_TTL_SEC` | Segundos de caché del panel admin (número entero, ej: `300`) |

### Comandos NPM (desde `kittypau_app/`)

```bash
npm run dev              # localhost:3000 (hot reload)
npm run build            # build producción
npm run start            # serve build
npm run lint             # ESLint (sin fix)
npm run lint:fix         # ESLint con autofix
npm run format           # Prettier
npm run type-check       # TypeScript sin emit
npm run dev:check        # fix:all + type-check + encoding-check
npm run ci:check         # dev:check + build (pipeline completo)
npm run security-check   # npm audit --audit-level=high
```

---

## Supabase

### Migraciones

```bash
# Aplicar migración nueva (desde Supabase Dashboard SQL Editor o MCP)
# NO hay CLI local configurado actualmente

# Ver historial de migraciones
# Supabase Dashboard → Database → Migrations
```

### Backups

- Supabase realiza backups diarios automáticos (plan free: 7 días)
- `anotaciones_av2.csv` tiene **backup local diario** en `data/backups/` — CRÍTICO

### Edge Functions

Actualmente no usadas. Futuro: alertas push, procesamiento server-side.

---

## Bridge (Raspberry Pi)

Operaciones via SSH. Ver [[07_MQTT/README_MQTT]] para comandos completos.

```bash
# Estado
sudo systemctl status kittypau-bridge

# Reiniciar
sudo systemctl restart kittypau-bridge

# Logs en tiempo real
sudo journalctl -u kittypau-bridge -f

# Actualizar código
cd /home/pi/kittypau-bridge && git pull && sudo systemctl restart kittypau-bridge
```

---

## GitHub

```
Repo: kittypau_2026_hivemq
Branch principal: main (= producción)
```

### Convención de commits

```
feat(scope): descripción corta
fix(scope): descripción corta
docs(scope): descripción corta
refactor(scope): descripción corta
```

Ejemplos recientes:
- `fix(app): corregir login, pestañas y data para demo BIG12`
- `docs(corfo): agregar formulario completo y video pitch`

### CI/CD — corregido 2026-08-11: sí existe, pero no corre tests (porque no hay tests)

`.github/workflows/pr-quality.yml` corre en cada PR a `main`: lint + build de
`kittypau_app`, `check_encoding.py`, y un guard que bloquea archivos `.env` trackeados por
error. `.github/workflows/monthly-fusion-review.yml` corre aparte. Lo que falta no es el
pipeline — es el paso `test`, porque no hay tests automatizados que correr (ver
[[29_Specs/SPEC_05_Optimizacion_Tecnica]] §4 y §8).

---

## Android (APK)

### Flujo de build

```bash
# Desde src/
npm run build          # build Next.js
npx cap sync android   # sincronizar con Capacitor
# Luego abrir Android Studio → Build → Generate Signed APK
```

### Configuración Capacitor

- `capacitor.config.ts` en raíz de `src/`
- Package ID: `com.kittypau.app` ✅ confirmado en `capacitor.config.ts`
- Target SDK: Android 13+

---

## Monitoreo

| Servicio | Cómo revisar |
|---|---|
| Vercel | Dashboard + logs de función en tiempo real |
| Supabase | Dashboard → Logs → API / Auth / Realtime |
| HiveMQ | Dashboard web → Connections / Messages |
| Bridge | `journalctl -u kittypau-bridge` en Pi |
| Lecturas llegando | Tabla `readings` en Supabase + `audit_events` |

---

## Checklist de deploy

**Pre-deploy:**
- [ ] `npm run ci:check` pasa sin errores (type-check + build)
- [ ] Variables de entorno actualizadas en Vercel (especialmente `NEXT_PUBLIC_MQTT_*` y `BRIDGE_HEARTBEAT_SECRET`)
- [ ] `ADMIN_OVERVIEW_CACHE_TTL_SEC` tiene valor numérico (ej: `300`)
- [ ] Migraciones SQL aplicadas en Supabase (si hay cambios de schema)

**Post-deploy:**
- [ ] Bridge v3.2 corriendo (`sudo systemctl status kittypau-bridge`)
- [ ] HiveMQ broker accesible (dashboard web)
- [ ] Build sin errores en Vercel dashboard
- [ ] Test de login en URL de preview (o producción)
- [ ] `/bowl` muestra datos MQTT en vivo (confirma que vars MQTT están bien)
- [ ] `readings` llegan a Supabase — verificar en tabla
- [ ] Admin panel: `/admin` carga sin error 500

---

## Deuda técnica de DevOps pendiente

| Item | Descripción |
|---|---|
| CI/CD | Sin pipeline automático — tests solo en local antes del push |
| Android | APK no publicada en Play Store — build manual |
| Ramas obsoletas | 6 ramas locales no mergeadas pendientes de eliminar |
| Commit limpieza | 608 archivos `D` + 139 `AD` sin commitear (docs legacy → vault) |

---

## Ver también

- [[03_Backend/README_Backend]] — arquitectura de capas backend
- [[04_Frontend/README_Frontend]] — stack Next.js + Capacitor
- [[07_MQTT/README_MQTT]] — Bridge Pi y HiveMQ
