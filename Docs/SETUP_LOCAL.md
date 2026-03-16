# Setup Local — Kittypau App

## Requisitos previos
- Node.js >= 18
- npm
- Acceso a Supabase (proyecto `zgwqtzazvkjkfocxnxsh`)
- Acceso a Vercel (para copiar secrets)

---

## Paso 1 — Clonar y entrar al directorio

```bash
cd kittypau_app
```

Los `node_modules` ya están instalados. Si necesitas reinstalar:

```bash
npm install
```

---

## Paso 2 — Completar el `.env.local`

El archivo `kittypau_app/.env.local` ya existe pero tiene los valores `__PENDIENTE__`.
Reemplázalos con los valores reales:

```env
# ── Supabase ──────────────────────────────────────────────
# Project URL (conocido):
NEXT_PUBLIC_SUPABASE_URL=https://zgwqtzazvkjkfocxnxsh.supabase.co
SUPABASE_URL=https://zgwqtzazvkjkfocxnxsh.supabase.co

# Supabase → Project Settings → API → "anon public"
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar desde Supabase>
SUPABASE_ANON_KEY=<copiar desde Supabase>

# Supabase → Project Settings → API → "service_role" (solo backend, nunca exponer)
SUPABASE_SERVICE_ROLE_KEY=<copiar desde Supabase>

# ── Secrets de API ────────────────────────────────────────
# Vercel → kittypau-app → Settings → Environment Variables
MQTT_WEBHOOK_SECRET=<copiar desde Vercel>
BRIDGE_HEARTBEAT_SECRET=<copiar desde Vercel>
CRON_SECRET=<copiar desde Vercel>

# ── Upstash Redis ─────────────────────────────────────────
# Upstash → tu database → REST API
UPSTASH_REDIS_REST_URL=<copiar desde Upstash>
UPSTASH_REDIS_REST_TOKEN=<copiar desde Upstash>

# ── App config ────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_FLAVOR=web
```

### Dónde encontrar cada valor

| Variable | Dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya conocida: `https://zgwqtzazvkjkfocxnxsh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Supabase](https://supabase.com/dashboard) → Project → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | [Supabase](https://supabase.com/dashboard) → Project → Settings → API → service_role |
| `MQTT_WEBHOOK_SECRET` | [Vercel](https://vercel.com/kittypaus-projects/kittypau-app/settings/environment-variables) |
| `BRIDGE_HEARTBEAT_SECRET` | [Vercel](https://vercel.com/kittypaus-projects/kittypau-app/settings/environment-variables) |
| `CRON_SECRET` | [Vercel](https://vercel.com/kittypaus-projects/kittypau-app/settings/environment-variables) |
| `UPSTASH_REDIS_REST_URL` | [Upstash](https://console.upstash.com) → tu base de datos → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | [Upstash](https://console.upstash.com) → tu base de datos → REST API |

---

## Paso 3 — Levantar el servidor de desarrollo

```bash
cd kittypau_app
npm run dev
```

Abre: [http://localhost:3000](http://localhost:3000)

---

## Paso 4 — Verificar que funciona

1. Abre [http://localhost:3000/login](http://localhost:3000/login) — debe mostrar la pantalla de login
2. Inicia sesión con `javomauro.contacto@gmail.com`
3. Navega a `/today` — debe mostrar datos desde Supabase

### Verificación rápida de API

```bash
# Debe responder 200 con JSON
curl http://localhost:3000/api/bridge/health-check
```

---

## Comandos útiles

```bash
npm run dev          # Servidor local con hot reload
npm run build        # Build de producción (igual que Vercel)
npm run lint         # Verificar errores de lint
npm run type-check   # Verificar tipos TypeScript
```

---

## Notas

- El `.env.local` está en `.gitignore` — nunca se commitea
- Para variables de producción (Vercel), los valores en `.env.local` solo aplican localmente
- Si ves errores 401/403, la `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_ANON_KEY` está mal
- Si ves errores de Redis, el `UPSTASH_REDIS_REST_TOKEN` está mal o vencido
- `MQTT_WEBHOOK_SECRET` y `BRIDGE_HEARTBEAT_SECRET` solo son necesarios si testeas el bridge local

---

*Proyecto ID Supabase: `zgwqtzazvkjkfocxnxsh`*
*Última actualización: 2026-03-16*
