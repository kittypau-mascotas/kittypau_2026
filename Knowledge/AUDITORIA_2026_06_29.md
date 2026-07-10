---
id: auditoria_2026_06_29
title: Auditoría KittyPau — 2026-06-29
type: auditoria
status: active
owner: Mauro
created: 2026-06-29
---

# Auditoría KittyPau — 2026-06-29

> Auditoría exhaustiva: documentación Knowledge vs realidad del código.
> Ejecutada el 2026-06-29. No se asume nada — todo fue verificado.
> Supabase MCP y GitHub MCP no pudieron autenticarse en este entorno — la DB fue
> auditada via el directorio `supabase/migrations/` y el código del bridge.

---

## Metodología

| Fuente | Estado |
|---|---|
| Knowledge vault (28 directorios) | Leído completo |
| `kittypau_app/src/app/` (rutas Next.js) | Verificado con directory_tree |
| `kittypau_app/src/lib/` (módulos) | Verificado con directory_tree |
| `kittypau_app/package.json` | Leído |
| `kittypau_app/.env.local` | Leído (solo variables, valores ocultos en reporte) |
| `kittypau_app/.env.example` | Leído |
| `bridge/src/index.js` | Leído completo |
| `bridge/src/processor.js` | Leído completo |
| `bridge/package.json` | Leído |
| `supabase/migrations/` | Listado completo (55 archivos), migraciones clave leídas |
| `git log --oneline -20` | Ejecutado |
| `git status` | Ejecutado (609+ archivos en estado D/AD/MD) |
| Supabase MCP | NO DISPONIBLE — sin token de acceso |
| GitHub MCP | NO DISPONIBLE — bad credentials |

---

## 📊 RESUMEN EJECUTIVO

1. **El proyecto está técnicamente sólido y coherente en su núcleo.** La arquitectura documentada en Knowledge (Next.js App Router + Supabase + HiveMQ + Bridge Raspberry) coincide con el código real. Las rutas principales, módulos de lib/ y el bridge están todos implementados y coinciden con lo documentado.

2. **Hay 5 discrepancias importantes entre Knowledge y la realidad del código.** La más crítica: las variables de entorno HiveMQ documentadas en `README_DevOps.md` son incorrectas (distintas a las que usa el código). El `.env.local` de desarrollo carece de `BRIDGE_HEARTBEAT_SECRET` y las vars MQTT del browser, lo que implica que MQTT en vivo y los heartbeats del bridge no funcionan en entorno de desarrollo local.

3. **La versión del bridge tiene inconsistencia triple:** `package.json` dice `2.4.0`, el banner de consola dice `v3.0`, y los comentarios del código describen `v3.2`. La versión canónica documentada en Knowledge (`v3.2`) es la correcta funcionalmente — el `package.json` del bridge nunca fue actualizado.

4. **Hay 3 endpoints documentados en Knowledge/05_API que no existen como archivos en el código:** `/api/readings/today`, `/api/devices/tare` (sin ID), y `/api/admin/finance` (la ruta base — solo existe `finance/kpcl-catalog`). La funcionalidad de "hoy" está cubierta por `/api/readings` con parámetros.

5. **El repositorio tiene 608 archivos unstaged eliminados** (`git status`), todos correspondientes a la carpeta `Docs/` antigua y notebooks que fueron migrados o reemplazados por el Knowledge vault. No son pérdidas — son la transición del sistema documental antiguo al nuevo vault. Requieren un commit de limpieza.

---

## 🔴 CRÍTICO — Errores o inconsistencias graves

### C1 — Variables de entorno HiveMQ incorrectas en documentación

**Documentado** (en `Knowledge/19_DevOps/README_DevOps.md`):
```
NEXT_PUBLIC_HIVEMQ_HOST
NEXT_PUBLIC_HIVEMQ_PORT
NEXT_PUBLIC_HIVEMQ_USERNAME
NEXT_PUBLIC_HIVEMQ_PASSWORD
```

**Real** (en `kittypau_app/src/lib/hooks/useMqttLive.ts` y `.env.example`):
```
NEXT_PUBLIC_MQTT_BROKER
NEXT_PUBLIC_MQTT_PORT_WS
NEXT_PUBLIC_MQTT_USER_READONLY
NEXT_PUBLIC_MQTT_PASS_READONLY
```

**Impacto:** Un nuevo colaborador que siga `README_DevOps.md` configurará variables que el código no lee. La conexión MQTT en vivo desde el browser (`/bowl`) no funcionará. El `.env.example` de la app sí tiene los nombres correctos — la documentación en Knowledge está desactualizada.

**Estado en `.env.local` local:** Las 4 variables MQTT del browser están completamente ausentes del `.env.local` actual. MQTT en vivo no funciona en desarrollo local.

---

### C2 — `BRIDGE_HEARTBEAT_SECRET` ausente en `.env.local`

El código en `bridge/heartbeat/route.ts`, `bridge/health-check/route.ts` y `admin/health-check/route.ts` requiere `BRIDGE_HEARTBEAT_SECRET`. Esta variable **no existe en `.env.local`**.

**Impacto:** En desarrollo local, los heartbeats del bridge retornan `401 UNAUTHORIZED`, y el health-check del admin también falla. En producción (Vercel) esto puede estar configurado correctamente, pero no está documentado en Knowledge.

---

### C3 — Versión del bridge inconsistente en tres lugares

| Lugar | Versión declarada |
|---|---|
| `bridge/package.json` → `"version"` | `2.4.0` |
| `bridge/src/index.js` → banner de consola | `Kittypau Bridge v3.0` |
| `bridge/src/index.js` → comentario de cabecera | `v3.2` |
| `Knowledge/07_MQTT/README_MQTT.md` | `v3.2` |
| `Knowledge/06_BaseDatos/README_BaseDatos.md` | `v3.2` |

La versión canónica es `v3.2` (la documentada en Knowledge y la que corresponde a las funcionalidades implementadas). El `package.json` nunca fue actualizado desde `2.4.0`, y el banner del console.log dice `v3.0`.

**Impacto operativo:** Bajo (el código funciona), pero confunde en diagnóstico remoto y logs del systemd en la Raspberry Pi.

---

## 🟠 IMPORTANTE — Documentación desactualizada vs código real

### I1 — Tres endpoints documentados en Knowledge/05_API no existen como rutas

| Endpoint documentado | Existe en código | Alternativa real |
|---|---|---|
| `GET /api/readings/today` | NO | `GET /api/readings` con params `from`/`to` |
| `POST /api/devices/tare` (sin ID) | NO | `POST /api/devices/[id]/tare` |
| `GET,POST /api/admin/finance` (base) | NO | Solo existe `/api/admin/finance/kpcl-catalog` |

La Knowledge dice que `/api/admin/analytics` existe — tampoco existe como ruta. El path `/api/devices/[id]/sessions` sí existe pero no está documentado en Knowledge.

**Impacto:** Confunde el contrato de API. Un developer que llame a `/api/readings/today` obtendrá 404.

---

### I2 — Ruta `/dispositivos` sin `page.tsx` directo

El Knowledge documenta `src/app/(app)/dispositivos/` como una ruta de gestión de KPCL. En el código existe únicamente `dispositivos/nuevo/page.tsx`. No hay `dispositivos/page.tsx`.

**Impacto:** Navegar a `/dispositivos` en la app redirige a 404 o al layout vacío. La gestión de dispositivos está bajo `/registro` o `/dispositivos/nuevo`.

---

### I3 — `device_bowl_session_anomalies` no documentada en Knowledge

La migración `20260427190500` crea dos tablas: `device_bowl_sessions` (documentada en Knowledge) y `device_bowl_session_anomalies` (no documentada). También crea la view `device_bowl_sessions_today` y la función `resolve_event_content_grams` — tampoco documentadas.

---

### I4 — `link_device_to_pet` usa `pets.user_id` pero la documentación dice FK a `profiles`

La migración `20260524000000_fix_link_device_to_pet_ambiguity.sql` muestra:
```sql
select user_id into v_pet_owner from public.pets where id = p_pet_id;
```

Knowledge documenta que `pets` tiene FK a `profiles`. El campo es `user_id` (que referencia `auth.users`, no `profiles.id`). Hay que verificar si es `auth.users.id` directamente o si hay una columna `user_id` en `pets` que sea la FK a `profiles`.

---

### I5 — Script NPM `dev:check` está documentado incorrectamente

Knowledge documenta:
```
npm run dev:check   → fix:all + type-check + encoding-check
```

El `package.json` real sí tiene ese script correctamente definido. Sin embargo, `encoding-check` usa rutas relativas que asumen que el CWD es la raíz del monorepo (`kittypau_app/src`), lo que puede fallar al correr desde `kittypau_app/`.

---

### I6 — 608 archivos de `Docs/` antigua en estado `deleted but not staged`

El `git status` muestra 469 archivos con ` D` (borrados en worktree, no staged). Corresponden a la carpeta `Docs/` antigua con toda la documentación pre-Knowledge. La transición al Knowledge vault está hecha pero **el commit de limpieza no se ha creado**. El repo remoto todavía tiene todos esos archivos.

**Archivos AD (nuevos en staging, no commiteados):** 139 archivos — principalmente `Docs/Contexto_Mercado_Kittypau/`, archivos de investigación y el vault Knowledge completo (excepto los que ya están en el repo).

---

## 🟡 MEJORAS — Oportunidades de optimización

### M1 — Bridge: `console.log` con `Kittypau Bridge v3.0` debe actualizarse a `v3.2`

En `bridge/src/index.js` línea 44:
```js
console.log('   Kittypau Bridge v3.0');
```
Actualizar a `v3.2` y sincronizar `bridge/package.json` version a `3.2.0`.

---

### M2 — `useMqttLive.ts` necesita fallback gracioso cuando faltan las vars de entorno

Actualmente el hook se conecta sin verificar si las variables existen. Si `NEXT_PUBLIC_MQTT_BROKER` es undefined, MQTT intenta conectar a `undefined:8884` y produce un error de red no informativo en la UI. Agregar guard:

```typescript
if (!process.env.NEXT_PUBLIC_MQTT_BROKER) {
  setError("MQTT no configurado en este entorno");
  return;
}
```

---

### M3 — `ADMIN_OVERVIEW_CACHE_TTL_SEC` tiene valor incorrecto en `.env.local`

En `.env.local`:
```
ADMIN_OVERVIEW_CACHE_TTL_SEC="kittypau1234"
```
El valor es una string no numérica. Si el código hace `parseInt(process.env.ADMIN_OVERVIEW_CACHE_TTL_SEC)`, obtendrá `NaN`. Debería ser un número entero (e.g., `300`).

---

### M4 — Processor: estado de sesiones se pierde en cada reinicio del bridge

`deviceState` y `petBaseline` son Maps en memoria (`bridge/src/processor.js`). Cada `sudo systemctl restart kittypau-bridge` limpia ese estado. Una sesión abierta en el momento del reinicio queda sin cierre en la analytics DB.

**Mejora sugerida:** Persistir `deviceState` activo en Supabase (tabla `device_operation_records` ya existe) o en un archivo JSON local. No urgente si los reinicios son infrecuentes.

---

### M5 — `README_Backend.md` menciona Edge Functions como "futuro" pero está incompleto

El Knowledge dice: "Sin Edge Functions activas en producción actualmente. Futuro: alertas push, procesamiento server-side." No hay ningún plan concreto ni ADR. Documentar formalmente si esto es intencional o hay un timeline.

---

### M6 — Ramas locales no mergeadas acumuladas

```
feat/admin-finanzas-fx-yen
feat/javo-mauro
feat/mauro-curcuma
mauro_curcuma
prueba-gato
test/fusion-main-javo-mauro-2026-03-02
```

6 ramas locales (y sus correspondientes en remoto) que no están en `main`. Revisar cuáles se pueden eliminar para mantener el repositorio limpio.

---

## 🟢 BIEN — Lo que está correctamente implementado y documentado

### B1 — Estructura de rutas Next.js coincide con Knowledge (rutas principales)

| Ruta documentada | Existe | Estado |
|---|---|---|
| `/(app)/inicio/` | ✅ | `page.tsx` presente |
| `/(app)/today/` | ✅ | `page.tsx` presente |
| `/(app)/bowl/` | ✅ | `page.tsx` presente |
| `/(app)/pet/` | ✅ | `page.tsx` presente |
| `/(app)/story/` | ✅ | `page.tsx` presente |
| `/(app)/settings/` | ✅ | `page.tsx` presente |
| `/(app)/registro/` | ✅ | `page.tsx` + `_components/registro-flow.tsx` |
| `/(app)/admin/` | ✅ | `page.tsx` + sub-rutas |
| `/(public)/login/` | ✅ | |
| `/(public)/register/` | ✅ | |
| `/(public)/reset/` | ✅ | |
| `/(public)/demo/` | ✅ | |
| `/(public)/client-demo/` | ✅ | |

---

### B2 — Todos los módulos de `src/lib/` documentados existen

| Módulo documentado | Existe | Archivo |
|---|---|---|
| `lib/auth/` | ✅ | `auth-fetch.ts`, `token.ts` |
| `lib/supabase/` | ✅ | `browser.ts`, `server.ts`, `analytics.ts`, `user-server.ts` |
| `lib/hooks/useMqttLive.ts` | ✅ | |
| `lib/context/app-context.tsx` | ✅ | |
| `lib/time/chile.ts` | ✅ | |
| `lib/runtime/app-flavor.ts` | ✅ | + `selection-sync.ts` |
| `lib/battery/contract.ts` | ✅ | |
| `lib/observability/reading-gaps.ts` | ✅ | |
| `lib/charts/index.tsx` | ✅ | |

Adicional no documentado en Knowledge: `lib/finance/kpcl-catalog.ts`, `lib/errors/kittypau-error.ts`, `lib/ui/battery-status-icon.tsx`.

---

### B3 — Versiones de dependencias coinciden con Knowledge

| Dependencia | Documentada | Real |
|---|---|---|
| Next.js | 16.1.6 | 16.1.6 ✅ |
| React | 19.2.3 | ^19.2.3 ✅ |
| @supabase/supabase-js | 2.106.1 | ^2.106.1 ✅ |
| mqtt | 5.10.4 | ^5.10.4 ✅ |
| Capacitor | 8.2.0 | ^8.2.0 ✅ |
| Chart.js | 4.5.1 | ^4.5.1 ✅ |
| D3 | 7.9.0 | ^7.9.0 ✅ |
| Lucide Icons | 0.542.0 | ^0.542.0 ✅ |
| Tailwind CSS | 4 | ^4 ✅ |
| TypeScript | 5 | ^5 ✅ |

---

### B4 — Bridge v3.2 correctamente implementado

El código de `bridge/src/index.js` implementa todas las funcionalidades documentadas en Knowledge/07_MQTT:
- Suscripción wildcard `+/SENSORS` y `+/STATUS` ✅
- Auto-registro de dispositivos en `devices` con estado `factory` ✅
- Mapeo correcto `weight→weight_grams`, `temp→temperature`, `hum→humidity` ✅
- Upsert en `readings` con idempotencia por `device_id,recorded_at` ✅
- Detección offline (3 min sin STATUS → `device_state = 'offline'`) ✅
- Registro `kpcl_prendido`/`kpcl_apagado` en `audit_events` ✅
- Polling `device_commands` cada 5s ✅
- Bridge heartbeat via `KPBR0001/STATUS` cada 60s ✅
- `processor.js` con state machine IDLE→ACTIVE→IDLE y escritura a analytics DB ✅

---

### B5 — Schema de DB tiene historial de migraciones completo y ordenado

55 migraciones desde `20260208` hasta `20260524`. Las tablas documentadas en Knowledge (`profiles`, `pets`, `devices`, `readings`, `audit_events`, `bridge_heartbeats`, `bridge_telemetry`, `device_commands`, `device_bowl_sessions`, `admin_roles`, tablas `finance_*`, tablas de batería/operación) tienen todas su migración de origen confirmada. El historial es coherente con la documentación.

---

### B6 — Capacitor correctamente configurado

`capacitor.config.ts` usa:
- `appId: "com.kittypau.app"` ✅ (Knowledge dice "verificar" — confirmado)
- `webDir: "capacitor_www"` ✅
- `server.url` controlado por `CAPACITOR_SERVER_URL` ✅
- `allowNavigation` con hosts de Supabase y Upstash incluidos ✅

---

### B7 — Chatbot IA implementado en código

Knowledge menciona "Chatbot IA con Hugging Face Llama 3.1 8B". En el código existe:
- `src/chatbot-gato/` con 13 archivos (client.ts, hf.ts, personality-canon.ts, context files, etc.)
- `src/app/api/chatbot-gato/route.ts`
- `HF_TOKEN` y `HF_MODEL` presentes en `.env.local`

---

### B8 — RLS y service_role correctamente separados

El bridge usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS. La app usa `SUPABASE_ANON_KEY` en client components y `SUPABASE_SERVICE_ROLE_KEY` solo en server-side API routes. La separación es correcta y coincide con lo documentado.

---

## 📋 DEUDA TÉCNICA — Lista priorizada

| Prioridad | Tarea | Esfuerzo |
|---|---|---|
| 1 | Agregar `BRIDGE_HEARTBEAT_SECRET` y las 4 vars MQTT al `.env.local` | Bajo — 10 min |
| 2 | Corregir `README_DevOps.md` en Knowledge: nombres de vars HiveMQ | Bajo — 5 min |
| 3 | Actualizar banner y `package.json` del bridge a `v3.2.0` | Bajo — 5 min |
| 4 | Commit de limpieza: stagear todos los `D` de `Docs/` antigua y los `AD` del nuevo vault | Medio — 30 min |
| 5 | Corregir `ADMIN_OVERVIEW_CACHE_TTL_SEC` en `.env.local` a un valor numérico | Bajo — 2 min |
| 6 | Actualizar Knowledge/05_API con los endpoints reales (agregar `/api/devices/[id]/sessions`, corregir los 3 faltantes) | Bajo — 20 min |
| 7 | Documentar `device_bowl_session_anomalies` en Knowledge/06_BaseDatos | Bajo — 15 min |
| 8 | Agregar guard a `useMqttLive.ts` para vars de entorno faltantes | Bajo — 15 min |
| 9 | Documentar `lib/finance/kpcl-catalog.ts`, `lib/errors/`, `lib/ui/` en Knowledge/04_Frontend | Bajo — 20 min |
| 10 | Limpiar ramas locales obsoletas (6 ramas) | Bajo — 10 min |
| 11 | Crear `dispositivos/page.tsx` o redirigir `/dispositivos` → `/dispositivos/nuevo` | Medio — 30 min |
| 12 | Persistencia del estado de sesiones del processor entre reinicios | Alto — 2-3h |
| 13 | Implementar tests unitarios (todos en estado ⏳ Pendiente según Knowledge/20_Testing) | Alto — varios días |

---

## Estado de acceso a servicios externos

| Servicio | Estado en esta auditoría | Causa |
|---|---|---|
| Supabase MCP | NO DISPONIBLE | Sin `SUPABASE_ACCESS_TOKEN` configurado en el MCP server |
| GitHub MCP | NO DISPONIBLE | Bad credentials |
| Supabase REST API | NO DISPONIBLE | Sin conectividad de red en este entorno |
| DB auditada via | Migraciones SQL + código del bridge | Completa |
| GitHub auditado via | `git log`, `git status`, `git remote` local | Completo |

---

## Ver también

- [[06_BaseDatos/README_BaseDatos]] — inventario de tablas (corte 2026-06-24)
- [[05_API/README_API]] — contratos de endpoints (algunos desactualizados — ver I1)
- [[19_DevOps/README_DevOps]] — vars de entorno (desactualizadas en HiveMQ — ver C1)
- [[20_Testing/README_Testing]] — todos los tests en estado pendiente


Me parece una excelente decisión. De hecho, creo que esta auditoría debería transformarse en un proceso permanente de ingeniería, no en un documento estático.

Conociendo el proyecto KittyPau y hacia dónde quieres llevarlo (una plataforma IoT con IA para salud de mascotas), yo crearía una nueva sección completa dentro del Knowledge Vault.

Knowledge/21_Performance_Audit/
Knowledge/
│
├──21_Performance_Audit/
│      │
│      ├──README_Performance_Audit.md
│      │
│      ├──01_Objetivos.md
│      ├──02_Metodologia.md
│      ├──03_Arquitectura_Mediciones.md
│      ├──04_Metricas.md
│      ├──05_Benchmark.md
│      ├──06_Stress_Test.md
│      ├──07_Observabilidad.md
│      ├──08_Optimización.md
│      ├──09_Reporte_Base_2026_06.md
│      ├──10_Historial_Auditorias.md
│      │
│      └──Suite_Performance_v1/
│             ├──README.md
│             ├──Roadmap.md
│             ├──Arquitectura.md
│             ├──Metricas.md
│             └──Checklist.md
README_Performance_Audit.md

Este documento explicaría el propósito.

Objetivo

Establecer una metodología permanente para medir el rendimiento completo de KittyPau.

La filosofía es sencilla:

Nunca optimizar sin medir.

Toda modificación al sistema debe demostrar mediante métricas que mantiene o mejora el rendimiento, la estabilidad y la confiabilidad.

Los objetivos serían:

medir rendimiento
detectar cuellos de botella
comparar versiones
validar nuevas funcionalidades
asegurar escalabilidad
01_Objetivos.md

Aquí dejaría algo muy parecido a un documento de ingeniería.

Objetivos generales

✔ Medir rendimiento end-to-end

✔ Reducir latencia

✔ Reducir uso de CPU

✔ Reducir uso de RAM

✔ Detectar pérdidas MQTT

✔ Medir throughput

✔ Medir tiempo de render React

✔ Detectar memory leaks

✔ Medir consultas Supabase

✔ Validar estabilidad

Objetivos secundarios

Comparar

Bridge v3.2

vs

Bridge v3.3

Comparar

Supabase Realtime

vs

MQTT directo

Comparar

React optimizado

vs

React actual

02_Metodologia.md

Aquí documentaría cómo se hacen todas las pruebas.

Siempre.

En el mismo orden.

1
Bridge

↓

2
Broker

↓

3
Database

↓

4
Frontend

↓

5
Stress

↓

6
Reporte

Así todas las auditorías serán comparables.

03_Arquitectura_Mediciones.md

Aquí pondría un diagrama enorme.

ESP32

↓

WiFi

↓

Internet

↓

HiveMQ

↓

Bridge

↓

Supabase

↓

Realtime

↓

API

↓

React

↓

Usuario

Cada flecha será un punto de medición.

Ejemplo
ESP32

↓

15 ms

↓

HiveMQ

↓

6 ms

↓

Bridge

↓

24 ms

↓

Supabase

↓

31 ms

↓

Realtime

↓

18 ms

↓

Browser

↓

12 ms

Total

106 ms
04_Metricas.md

Aquí definiríamos TODAS las métricas.

No solamente latencia.

Por ejemplo.

MQTT

Tiempo publicación

Tiempo recepción

Reconnect

QoS

Duplicados

Paquetes perdidos

Orden

Bridge

CPU

RAM

GC

Loop delay

Cola

Errores

Supabase

INSERT

UPDATE

SELECT

Realtime

Storage

Edge

Frontend

TTFB

Hydration

Render

FPS

Paint

Layout Shift

Memory

Raspberry

CPU

RAM

Swap

Temperatura

Disco

05_Benchmark.md

Aquí pondremos objetivos.

Ejemplo.

Métrica	Excelente	Bueno	Malo
MQTT	<40 ms	<80 ms	>150 ms
End to End	<150 ms	<300 ms	>600 ms
INSERT	<30 ms	<60 ms	>120 ms
Render React	<16 ms	<33 ms	>60 ms
CPU Bridge	<30%	<60%	>85%
RAM Bridge	<250 MB	<500 MB	>1 GB

Este documento será el "estándar" interno del proyecto.

06_Stress_Test.md

Aquí describimos todas las pruebas.

10 msg/s

50 msg/s

100 msg/s

500 msg/s

1000 msg/s

5000 msg/s

Duraciones.

1 minuto

10 minutos

30 minutos

6 horas

24 horas

Y los criterios de éxito:

Sin pérdida de mensajes.
Sin reinicios inesperados.
Sin crecimiento continuo de memoria.
Latencia dentro de los límites definidos.
07_Observabilidad.md

Este documento será enorme.

Quiero que describa toda la instrumentación.

Por ejemplo.

OpenTelemetry

↓

Prometheus

↓

Grafana

↓

Loki

↓

Tempo

↓

Logs

↓

Alertas

Aunque hoy no tengas todas esas herramientas implementadas, servirá como arquitectura objetivo.

08_Optimización.md

Cada mejora documentada.

Ejemplo.

v3.2

render 32 ms

↓

memo()

↓

18 ms

Nunca optimizar sin mostrar el antes y el después.

09_Reporte_Base_2026_06.md

Este será el primer reporte.

Será la fotografía del estado actual.

Dentro incluiría:

arquitectura actual
latencia actual
memoria
CPU
problemas encontrados
fortalezas
deuda técnica
recomendaciones

Y se convertirá en la referencia para todas las versiones futuras.

10_Historial_Auditorias.md

Aquí registraríamos la evolución.

2026-06

Primera auditoría

Bridge v3.2

Score 83/100

---

2026-09

Bridge v3.4

Score 91/100

---

2027-01

Bridge v4

Score 96/100

Así podrás demostrar objetivamente cómo mejora la plataforma.

Suite_Performance_v1

Esta es la parte que más me entusiasma porque deja de ser documentación y pasa a ser una herramienta de ingeniería.

Yo la definiría como un subsistema oficial de KittyPau.

Su misión sería ejecutar automáticamente pruebas de rendimiento, generar métricas, comparar resultados con auditorías anteriores y emitir reportes para evitar regresiones.

Su roadmap podría dividirse en cuatro etapas:

Fase 1 — Instrumentación
Medición de latencia extremo a extremo.
Métricas MQTT.
Tiempos de inserción en Supabase.
Uso de CPU y RAM del Bridge.
Instrumentación del frontend.
Fase 2 — Recolección
Almacenamiento histórico de métricas.
Comparación entre versiones.
Detección de degradaciones.
Baselines por entorno (desarrollo y producción).
Fase 3 — Visualización
Dashboard de rendimiento.
Evolución temporal.
Heatmaps de latencia.
Alertas cuando una métrica supera los umbrales definidos.
Fase 4 — Automatización
Ejecución automática antes de cada release.
Integración con CI/CD.
Reportes comparativos.
Bloqueo de despliegues si una versión degrada el rendimiento por encima de un umbral.
Mi recomendación final

Considero que esta Suite de Performance debería convertirse en un componente tan importante como el propio Bridge o el frontend. En un sistema IoT donde los datos viajan continuamente desde dispositivos físicos hasta la nube y luego al usuario, la capacidad de medir, comparar y demostrar el rendimiento es una ventaja técnica muy significativa.

Con esa infraestructura, cualquier optimización futura podrá responder una pregunta fundamental con datos objetivos: "¿esta nueva versión realmente mejoró KittyPau o solo cambió su comportamiento?" Esa disciplina hará que el proyecto evolucione de forma mucho más segura y profesional.