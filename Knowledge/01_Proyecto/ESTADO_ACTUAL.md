---
id: estado_actual
title: Estado Actual del Proyecto — Kittypau
type: architecture
status: active
owner: Mauro
created: 2026-06-29
updated: 2026-06-29
tags:
  - estado
  - snapshot
  - produccion
  - deuda-tecnica
related:
  - [[00_HOME]]
  - [[01_Proyecto/README_Proyecto]]
  - [[AUDITORIA_2026_06_29]]
  - [[19_DevOps/README_DevOps]]
---

# Estado Actual del Proyecto — Kittypau

> Snapshot del estado real del sistema. Verificado en auditoría 2026-06-29.
> Actualizar este documento cada vez que cambie el estado de producción.

---

## Resumen ejecutivo (2026-06-29)

| Área | Estado |
|---|---|
| App web (Vercel) | 🟢 Deployada en producción |
| Bridge Raspberry | 🟢 v3.2 corriendo en Pi Zero 2W |
| HiveMQ Cloud | 🟢 Free tier activo |
| Supabase DB | 🟢 55 migraciones aplicadas |
| APK Android | 🟡 Build manual — no en stores |
| Chatbot IA | 🟡 Implementado, sin UI final integrada |
| Tests automáticos | 🔴 Pendientes — solo inspección manual |
| CI/CD | 🔴 Sin pipeline — push manual + Vercel auto-deploy |

---

## Componentes activos en producción

### App (Vercel)
- **URL producción:** app de Kittypau en Vercel (branch `main`)
- **Framework:** Next.js 16.1.6 + React 19.2.3 + Tailwind CSS 4
- **APK:** Capacitor 8.2.0 — build manual, no publicada en Play Store

### Bridge (Raspberry Pi Zero 2W)
- **Versión:** v3.2 (`bridge/src/index.js`)
- **Servicio:** `kittypau-bridge` via systemd
- **Frecuencia:** Publica STATUS de la Pi como `KPBR0001/STATUS` cada 60s
- **Polling device_commands:** cada 5s

### Base de datos (Supabase)
- **Proyecto principal:** PostgreSQL con 55 migraciones (hasta 2026-05-24)
- **Proyecto analytics:** `supabase-analytics` — separado, credenciales opcionales
- **Tablas activas core:** `profiles`, `pets`, `devices`, `readings`, `audit_events`
- **Tablas activas bridge:** `bridge_heartbeats`, `bridge_telemetry`, `device_commands`
- **Tablas activas bowl:** `device_bowl_sessions`, `device_bowl_session_anomalies`

### Dispositivos KPCL en campo
```
KPCL0031, KPCL0033, KPCL0034 ("Bandida"), KPCL0035,
KPCL0036, KPCL0037, KPCL0038, KPCL0040, KPCL0041
```
Todos con firmware v2.0.0 (NodeMCU v3 ESP8266).  
KPCL0034 es el dispositivo de investigación principal (102.612 lecturas acumuladas).

---

## Rutas activas confirmadas (2026-06-29)

### App routes
| Ruta | Estado |
|---|---|
| `/(app)/inicio/` | ✅ |
| `/(app)/today/` | ✅ |
| `/(app)/bowl/` | ✅ (MQTT en vivo) |
| `/(app)/pet/` | ✅ |
| `/(app)/registro/` | ✅ |
| `/(app)/settings/` | ✅ |
| `/(app)/story/` | ✅ |
| `/(app)/admin/` | ✅ |
| `/(app)/dispositivos/` | ⚠️ Solo `/dispositivos/nuevo` tiene `page.tsx` |
| `/(public)/login/` | ✅ |
| `/(public)/register/` | ✅ |
| `/(public)/demo/` | ✅ |
| `/(public)/client-demo/` | ✅ |

---

## Variables de entorno críticas

### En Vercel (producción)
Las siguientes variables DEBEN estar configuradas para que la app funcione:

| Variable | Requerida por |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Todo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | API Routes server-side |
| `NEXT_PUBLIC_MQTT_BROKER` | `/bowl` — MQTT en vivo |
| `NEXT_PUBLIC_MQTT_PORT_WS` | `/bowl` — MQTT en vivo |
| `NEXT_PUBLIC_MQTT_USER_READONLY` | `/bowl` — MQTT en vivo |
| `NEXT_PUBLIC_MQTT_PASS_READONLY` | `/bowl` — MQTT en vivo |
| `BRIDGE_HEARTBEAT_SECRET` | `/api/bridge/heartbeat` |
| `ADMIN_OVERVIEW_CACHE_TTL_SEC` | Admin — debe ser un número entero (ej: `300`) |
| `HF_TOKEN` | Chatbot IA |
| `HF_MODEL` | Chatbot IA |

### En `.env` del Bridge (Raspberry Pi)
| Variable | Descripción |
|---|---|
| `MQTT_BROKER` | Host HiveMQ Cloud |
| `MQTT_PORT` | `8883` |
| `MQTT_USER` / `MQTT_PASS` | Credenciales MQTT |
| `SUPABASE_URL` | URL Supabase principal |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (bypass RLS) |
| `SUPABASE_ANALYTICS_URL` | URL analytics DB (opcional) |
| `BRIDGE_HEARTBEAT_SECRET` | Debe coincidir con la variable en Vercel |

---

## Deuda técnica activa (priorizada)

| # | Problema | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | Variables MQTT ausentes en `.env.local` de dev | `useMqttLive` falla silenciosamente en local | Bajo |
| 2 | `BRIDGE_HEARTBEAT_SECRET` ausente en `.env.local` | Heartbeats retornan 401 en dev | Bajo |
| 3 | `ADMIN_OVERVIEW_CACHE_TTL_SEC` con valor string no numérico | Admin cache retorna NaN | Bajo |
| 4 | Commit de limpieza pendiente (608 archivos `D` + 139 `AD`) | Repo remoto tiene docs legacy | Medio |
| 5 | Banner bridge dice `v3.0`, `package.json` dice `2.4.0` | Confunde en logs systemd | Bajo |
| 6 | `dispositivos/page.tsx` no existe | `/dispositivos` retorna 404 | Medio |
| 7 | `useMqttLive.ts` sin guard de vars de entorno | Error no informativo en UI | Bajo |
| 8 | Tests automáticos = cero | Sin detección de regresiones | Alto |
| 9 | Estado de sesiones del bridge en memoria | Se pierde en cada reinicio del bridge | Alto |
| 10 | 6 ramas locales obsoletas no mergeadas | Repositorio sucio | Bajo |

---

## Postulaciones activas

| Instrumento | Estado | Fecha cierre |
|---|---|---|
| CORFO Semilla Inicia RM 2026 | Cerrado (postulado) | 2026-05-29 |
| Resultados esperados | — | Julio 2026 |

---

## Motor IA (investigación)

| Componente | Estado |
|---|---|
| `shape_features_v2.py` | ✅ 102 features en 15 familias (F00–F14) |
| Evidence Engine | ✅ Implementado |
| Anotaciones KPCL0034 | ✅ 421 (alim=209 / serv=45 / ruido=167) |
| Separabilidad A/S mejor feature (`tpl_doble_rampa`) | ✅ 7.63σ |
| Modelo ML en producción | 🔴 Pendiente — motor matemático no está en la app aún |

---

## Ver también

- [[AUDITORIA_2026_06_29]] — auditoría exhaustiva con hallazgos detallados
- [[01_Proyecto/README_Proyecto]] — vocabulario canónico y tablas activas
- [[19_DevOps/README_DevOps]] — variables de entorno y checklist de deploy
