---
id: estado_actual
title: Estado Actual del Proyecto — Kittypau
type: architecture
status: active
owner: Mauro
created: 2026-06-29
updated: 2026-08-12
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
  - [[29_Specs/SPEC_06_Mobile_APK_2026]]
---

# Estado Actual del Proyecto — Kittypau

> Snapshot del estado real del sistema. Verificado en auditoría 2026-06-29, re-verificado con
> `npm run dev` + Playwright en vivo el **2026-08-11** (ver [[AUDITORIA_2026_08_11]]).
> Filas de la tabla actualizadas puntualmente el 2026-08-12 (tests, CI, push, Android 16) —
> no se repitió la auditoría completa en vivo, solo se corrigieron los ítems que cambiaron.
> Actualizar este documento cada vez que cambie el estado de producción.

---

## Resumen ejecutivo (actualizado 2026-08-12)

| Área | Estado |
|---|---|
| App web (Vercel) | 🟢 Deployada en producción |
| Bridge Raspberry | 🟢 v3.2 corriendo en Pi Zero 2W |
| HiveMQ Cloud | 🟢 Free tier activo |
| Supabase DB | 🟢 55 migraciones aplicadas |
| APK Android | 🟡 Build manual — no en stores |
| Chatbot IA | 🟡 Implementado, sin UI final integrada |
| Tests automáticos | 🟡 Primer suite real desde 2026-08-12 — Vitest, `lib/hunger-bar.test.ts` (6 tests). Falta integración de API routes y E2E. `fase_0_ruido/tests/` (Python) sigue aparte |
| CI/CD | 🟢 `pr-quality.yml` corre lint+**test**+build+encoding-check en cada PR (test agregado 2026-08-12) |
| Push notifications | 🟢 Alerta del hunger bar agendada como notificación local (Capacitor), verificada en dispositivo real 2026-08-12 — ver [[05_API/SPEC_HungerBar_Alertas]] §6 |
| APK — SDK objetivo | 🟢 Android 16 (API 36) desde 2026-08-12, antes de que Google Play lo exija (31/08/2026) — ver [[29_Specs/SPEC_06_Mobile_APK_2026]] |

---

## Componentes activos en producción

### App (Vercel)
- **URL producción:** app de Kittypau en Vercel (branch `main`)
- **Framework:** Next.js 16.1.6 + React 19.2.3 + Tailwind CSS 4
- **APK:** Capacitor 8.5.0, targetSdk 36 (Android 16) — build manual, no publicada en Play Store. Ver [[29_Specs/SPEC_06_Mobile_APK_2026]]

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
Todos con firmware v2.0.0 (NodeMCU v3 ESP8266), código en `iot_firmware/javier_1a/firmware-esp8266/`
(ver [[08_ESP32/README_ESP32]] — **no** en `kittypau_iot_firmware/`, esa carpeta está vacía).  
KPCL0034 es el dispositivo de investigación principal (más de 700k lecturas acumuladas en el
export local — ver discrepancia sin resolver en [[10_Datasets/README_Datasets]]).

> ⚠️ El array `DEVICES` hardcodeado en `bridge/src/index.js` (los que el bridge trata como
> KPCL conocidos) es `KPCL0031, KPCL0033, KPCL0035, KPCL0036, KPCL0037, KPCL0038, KPCL0040,
> KPCL0041` — **no incluye KPCL0034**. Verificar si es intencional (KPCL0034 es de
> investigación, no de campo) antes de asumir que está fuera del flujo del bridge por error.

> ⚠️ En la app en vivo (cuenta tester `kittypau.mascotas`), la mascota Bandida tiene
> **KPCL0035 como comedero (alimentación)** y **KPCL0034 como bebedero (hidratación)** —
> confirmado con Playwright el 2026-08-11. Ver [[18_UI/README_UI]].

---

## Rutas activas confirmadas (re-verificado en vivo con Playwright, 2026-08-11)

### App routes
| Ruta | Estado |
|---|---|
| `/(app)/inicio/` | ✅ redirect a `/today` |
| `/(app)/today/` | ✅ |
| `/(app)/bowl/` | ✅ (degrada a REST sin MQTT en vivo — sin `NEXT_PUBLIC_MQTT_*` en este `.env.local`) |
| `/(app)/pet/` | ✅ |
| `/(app)/registro/` | ✅ redirect a `/login?register=1` |
| `/(app)/settings/` | ✅ |
| `/(app)/story/` | ✅ (degrada con aviso si falta `SUPABASE_ANALYTICS_URL`) |
| `/(app)/admin/` | ⚠️ En este entorno, tanto la cuenta tester como la admin conocida terminan redirigidas a `/today` al navegar a `/admin` — no se pudo confirmar el dashboard visualmente. Ver [[18_UI/README_UI]]. |
| `/(app)/admin/javo` | ✅ accesible directo por URL (sin el mismo gate que `/admin` root) |
| `/(app)/admin/demo-ingresos` | ✅ carga pero 🐞 muestra `Missing Authorization header` |
| `/(app)/admin/{alerts,analytics,devices,legacy,overview,pets,settings}` | 🔴 404 real — carpetas vacías, sin `page.tsx` |
| `/(app)/dispositivos/` | 🔴 404 real — solo `/dispositivos/nuevo` tiene `page.tsx` |
| `/(app)/dispositivos/nuevo` | ✅ |
| `/(public)/login/` | ✅ |
| `/(public)/register/` | ✅ |
| `/(public)/reset/` | ✅ |
| `/(public)/demo/` | ✅ |
| `/(public)/client-demo/` | ✅ — mismo contenido que `/demo?menu=today` |
| `/(public)/test/` | ✅ — mismo contenido que `/demo?menu=today`, no es una vista de test propia |

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
| Evidence Engine | ✅ Corregido 2026-08-10 — normalización z-score + pesos calculados desde datos. Accuracy held-out: **80.0%** (recalculada en vivo 2026-08-13 sobre 527 anot., antes 58.4% sin normalizar) — ver [[11_ModelosIA/MODEL_EvidenceEngine]] |
| Anotaciones KPCL0034 | 496 cerradas en snapshot v2.4 (2026-08-11) — **527 en vivo** en `anotaciones_av2.csv` sin snapshot formal aún (alim=262 / serv=58 / ruido=207) |
| Separabilidad A/S mejor feature (`tpl_doble_rampa`) | ✅ 7.69σ (v2.3) |
| Auditoría motor↔humano | 88/496 (17.7%) discrepancias ≥85% confianza — pendiente de revisión manual, sin corrección automática |
| Split de candidatos "mixto" por giro interno | Implementado y testeado, **no aplicado** — pendiente de decisión (ver [[15_Resultados/RESULT_AlphaV2_Snapshots]]) |
| Modelo ML en producción | 🔴 Pendiente — motor matemático no está en la app Next.js todavía, solo en la app Streamlit de investigación |

> Detalle completo del historial de snapshots: [[15_Resultados/RESULT_AlphaV2_Snapshots]] y
> `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/Documentacion/HISTORIAL_RESULTADOS.md` (fuente canónica).

---

## Ver también

- [[AUDITORIA_2026_06_29]] — auditoría exhaustiva con hallazgos detallados
- [[01_Proyecto/README_Proyecto]] — vocabulario canónico y tablas activas
- [[19_DevOps/README_DevOps]] — variables de entorno y checklist de deploy
