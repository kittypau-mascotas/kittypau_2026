---
id: readme_devops
title: DevOps — Deploy, CI/CD, Infraestructura
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-14
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
  - [[29_Specs/SPEC_06_Mobile_APK_2026]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
  - [[29_Specs/README_Specs]]
  - [[19_DevOps/PENDIENTES_POR_PC]]
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
npm run test             # Vitest (hunger-bar.test.ts)
npm run dev:check        # fix:all + type-check + encoding-check
npm run ci:check         # dev:check + test + build-check (pipeline completo)
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

# Actualizar código — ⚠️ corregido 2026-08-14, confirmado por SSH real:
# /home/kittypau/kittypau-bridge NO tiene .git — "git pull" no funciona ahí.
# El deploy real es manual (editar/copiar bridge.js + guardar un .bak antes).
# Ver Knowledge/29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType.md §-1 para el detalle
# y la recomendación de convertirlo en un clone real de git.
sudo systemctl restart kittypau-bridge
```

---

## GitHub

```
Repo: kittypau_2026
Branch principal: main (= producción)
```

> Nombre de repo corregido 2026-08-14 — `kittypau_2026_hivemq` era el nombre viejo, ya no
> coincide con el directorio real ni con lo que dice `git remote -v`.

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

### Trabajo en 2 PCs (Javier + Mauro) con Claude Code en cada uno — protocolo

> Agregado 2026-08-14, a pedido de Javier. **No existe un mecanismo técnico para que dos
> sesiones de Claude Code en dos máquinas distintas se "vinculen" en vivo entre sí** —cada
> una es un proceso local, sin canal directo a la otra. El vínculo real es indirecto y ya
> existe: **el repo de git + el vault de `Knowledge/`**, que ambas sesiones leen y escriben.
> Formalizar cómo se usa ese vínculo es lo que sigue — no es una herramienta nueva, es una
> forma ordenada de usar lo que ya hay.
>
> **Ya hay precedente real de esto en el repo** — ramas remotas `feat/javo-mauro`,
> `feat/mauro-curcuma`, y una rama puente `test/fusion-main-javo-mauro-2026-03-02` muestran
> que ya se intentó (y funcionó, hasta cierto punto) un patrón de trabajo paralelo +
> fusión. Las reglas de abajo formalizan ese patrón en vez de inventar uno nuevo, y agregan
> las salvaguardas que faltaron (ver `main_sanitized`, evidencia de que hubo que limpiar
> secretos de la historia al menos una vez antes de hoy).

**1. Cada persona, su propia identidad de git** — `git config user.name`/`user.email` con
la cuenta real de cada uno en su máquina (no una cuenta compartida). Los commits de Claude
Code ya se coautorean (`Co-Authored-By: Claude ...`) — mantenerlo, da trazabilidad de qué
hizo el humano vs. el agente.

**2. Regla no-negociable: `git pull` antes de arrancar cualquier sesión de Claude Code** —
ya es el hábito reflejo ("sincronizate con el main" al inicio de esta sesión); formalizarlo
evita que una sesión trabaje horas sobre una base vieja y después el merge sea doloroso.
Si hay cambios locales sin commitear al hacer pull, la sesión debe `git stash -u` antes,
nunca descartar trabajo en progreso sin preguntar (ver Git Safety Protocol de Claude Code).

**3. Trunk-based con commits chicos, no ramas de larga vida** — dado el tamaño del equipo
(2 personas), mantener el patrón actual (commits directos a `main`, frecuentes) para
cambios chicos/documentación. **Usar una rama corta solo para cambios grandes o riesgosos**
(tocan bridge/firmware/schema de DB/flujo de auth) — mismo espíritu que
`feat/javo-mauro`/`test/fusion-...` ya usados antes, pero con el compromiso de mergear y
borrar la rama en días, no dejarla viva semanas (ver deuda de "ramas obsoletas" abajo).

**4. `Knowledge/29_Specs/` es el protocolo de handoff entre sesiones/máquinas** — ya pasó
hoy en la práctica: [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] es literalmente un
handoff escrito por una sesión sin acceso físico al bridge, para que la sesión con ese
acceso (en la PC de Mauro) lo ejecute. **Formalizar este patrón**: si una sesión no puede
terminar algo por falta de acceso/decisión pendiente, lo deja como spec nuevo o actualiza
uno existente — no un comentario suelto que se pierde entre sesiones.

**4.1. [[19_DevOps/PENDIENTES_POR_PC]] es el resumen ejecutivo de la regla 4** — mismo
espíritu, pero sin tener que releer cada spec entero para saber "¿qué me toca a mí, en esta
máquina, ahora mismo?". Es un archivo vivo: **actualizarlo en cada sesión**, apenas se hace
`pull` (leerlo) y antes de cada `push` (tachar lo hecho, sumar lo nuevo). Si un ítem de ahí
queda desactualizado respecto al spec que referencia, gana el spec — este archivo es un
índice, no la fuente de verdad.

**5. Antes de cada `push`, revisar el diff real** — `git log origin/main..HEAD` y
`git diff origin/main..HEAD --stat` — para confirmar que lo que se sube es lo esperado,
sobre todo después de una sesión larga de Claude Code con muchos archivos tocados.

**6. Nunca commitear secretos — ya pasó una vez (`main_sanitized` lo confirma) y otra vez
hoy** (`.claude/settings.local.json` con credenciales de Supabase, detectado por GitHub
push protection antes de llegar a `main` — ver historial de esta sesión). Antes de un
`git add` amplio, revisar `git status` y el contenido de cualquier archivo `.env*` o
`settings.local.json` que aparezca.

**7. Sin `git push --force` a `main`** — con dos personas pusheando a la misma rama, un
force-push puede pisar el trabajo de la otra sesión sin aviso. Si hay conflicto, resolver
con merge/rebase normal, nunca forzar.

**8. Ramas obsoletas — limpiar, no acumular** — ver ítem de deuda técnica más abajo
("Ramas obsoletas"). Cada vez que una rama de handoff (regla 3) se mergea, borrarla en el
mismo momento (`git push origin --delete <rama>` + `git branch -d <rama>` local).

**9. Archivos trackeados con valores que difieren por máquina (`.mcp.json`) — placeholder
en git + `skip-worktree` local** — pasó en la práctica el 2026-08-14: `MEMORY_FILE_PATH`
del server `memory` en `.mcp.json` tenía la ruta absoluta de la PC de Javier hardcodeada y
commiteada; la sesión de la PC de Mauro tuvo que sobreescribirla a mano para que el MCP de
memory conectara — y ese cambio, si se commiteaba, le rompía la ruta a Javier de vuelta.
**Patrón correcto, ya aplicado:**
1. En git queda un placeholder (`<TU_RUTA_ABSOLUTA_AL_REPO>/Knowledge/.mcp_memory.json`) —
   mismo criterio que ya usaba `GITHUB_PERSONAL_ACCESS_TOKEN: "<TU_GITHUB_PAT>"` en el mismo
   archivo, no es un patrón nuevo.
2. Cada máquina, **una vez**, corre `git update-index --skip-worktree .mcp.json` — le dice a
   git que deje de trackear cambios locales a ese archivo (`git status`/`git add .` dejan de
   verlo).
3. Recién ahí edita `.mcp.json` local con su ruta real. Queda funcional en esa máquina y
   nunca vuelve a aparecer en un diff ni se commitea por accidente.
Revertir con `git update-index --no-skip-worktree .mcp.json` si hace falta volver a
trackearlo. **Pendiente en la PC de Javier:** aplicar los mismos 3 pasos — su próximo `pull`
va a traer el placeholder en vez de su ruta real hasta que lo haga.

#### Prompt reusable — sincronizar/unificar una sesión de Claude Code con `origin/main`

Para pegar al arrancar una sesión en cualquiera de las 2 PCs cuando puede haber trabajo
divergente (commits locales sin pushear, ramas de handoff sin mergear, etc.):

```
Sincronizá este repo con origin/main de forma segura y dejame un reporte claro antes de
pushear nada. En orden:

1. git status, git log --oneline -10, y git branch -a — reportá qué hay: cambios sin
   commitear, commits locales no pusheados, ramas locales/remotas que no sean main.
2. Si hay cambios sin commitear: git stash push -u (nunca descartar sin preguntar).
3. git fetch origin, después mergeá o rebaseá main de la forma más segura (mismo criterio
   que el Git Safety Protocol: nunca reset --hard ni force-push sin confirmación explícita).
4. Si el stash tenía algo, restauralo y avisame si hay conflictos.
5. Revisá git status final antes de cualquier git add — si aparece algo que huela a
   secreto (.env*, settings.local.json, tokens, passwords en texto plano), avisame en vez
   de agregarlo.
6. Leé Knowledge/19_DevOps/PENDIENTES_POR_PC.md — te dice directo qué te toca a vos en esta
   máquina específica, sin releer cada spec entero. Si algo de la lista de "esta PC" ya no
   aplica (cambió el acceso, ya se hizo desde la otra máquina, etc.), decímelo.
7. Dame un resumen: qué se sincronizó, qué quedó pendiente, y qué de
   Knowledge/19_DevOps/PENDIENTES_POR_PC.md es ejecutable ahora desde esta máquina. No
   pushees a main sin que yo lo confirme.
8. Antes de terminar la sesión (si se hizo algún cambio real): actualizá
   Knowledge/19_DevOps/PENDIENTES_POR_PC.md — mové a "✅ Completado recientemente" lo que se
   cerró, agregá lo nuevo que haya aparecido, antes del push final.
```

### CI/CD — actualizado 2026-08-12: ahora sí corre tests

`.github/workflows/pr-quality.yml` corre en cada PR a `main`: lint + **test** (Vitest,
agregado 2026-08-12) + build de `kittypau_app`, `check_encoding.py`, y un guard que bloquea
archivos `.env` trackeados por error. `.github/workflows/monthly-fusion-review.yml` corre
aparte. Ver [[29_Specs/SPEC_05_Optimizacion_Tecnica]] §4 para el resto de la deuda de
testing (todavía sin tests de integración de API routes ni E2E).

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

- `capacitor.config.ts` en raíz de `kittypau_app/`
- Package ID: `com.kittypau.app` ✅ confirmado en `capacitor.config.ts`
- Target/compile SDK: **36 (Android 16)**, min SDK 24 — actualizado 2026-08-12, Google Play
  exige 36 desde el 31/08/2026. Ver [[29_Specs/SPEC_06_Mobile_APK_2026]] para la cadena
  completa de versiones (AGP 8.13.2, Gradle 8.14.5, Capacitor 8.5.0) y el pendiente de
  verificación visual en dispositivo real.
- `server.url` apunta a `kittypau-app.vercel.app` en vivo — no es un bundle offline. El JS
  se actualiza solo con cada deploy; los recursos nativos (plugins, íconos, SDK) no, ver
  nota en [[04_Frontend/README_Frontend]] § Modo web vs Android.

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
| CI/CD | ✅ Pipeline existe y corre lint+test+build en cada PR (ver arriba). Falta: tests de integración de API routes y E2E — [[29_Specs/SPEC_05_Optimizacion_Tecnica]] |
| Android | APK no publicada en Play Store — build manual, distribución por WhatsApp/USB. SDK actualizado a 36 pero falta verificar edge-to-edge en dispositivo real — [[29_Specs/SPEC_06_Mobile_APK_2026]] |
| Ramas obsoletas | 6 ramas locales no mergeadas pendientes de eliminar |
| Commit limpieza | 608 archivos `D` + 139 `AD` sin commitear (docs legacy → vault) |

---

## Ver también

- [[03_Backend/README_Backend]] — arquitectura de capas backend
- [[04_Frontend/README_Frontend]] — stack Next.js + Capacitor
- [[07_MQTT/README_MQTT]] — Bridge Pi y HiveMQ
- [[29_Specs/SPEC_06_Mobile_APK_2026]] — Android 16, edge-to-edge, plugins recomendados
