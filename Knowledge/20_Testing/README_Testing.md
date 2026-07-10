---
id: readme_testing
title: Testing — Estrategia y Auditorías
type: knowledge
status: draft
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - testing
  - qa
  - benchmarks
  - auditoria
related:
  - [[00_HOME]]
  - [[13_Features/ATLAS_Features_v2]]
  - [[14_Experimentos/MOC_Experimentos]]
  - [[15_Resultados/MOC_Resultados]]
---

# Testing — Estrategia y Auditorías

> Estado: **en definición** — actualmente los tests son manuales o por inspección de snapshots.

---

## Áreas de testing

### 1. Motor Matemático (shape_features_v2.py)

| Test | Tipo | Estado |
|---|---|---|
| `extraer_features()` retorna exactamente 102 keys | Unitario | ⏳ Pendiente |
| `evidence_score()` suma probabilidades = 1.0 | Unitario | ⏳ Pendiente |
| `tpl_doble_rampa` > 7σ en señales de alimentación anotadas | Regresión | ⏳ Pendiente |
| Separabilidad A/S no regresa vs snapshot v2.1 | Benchmark | ⏳ Pendiente |
| Tiempo de ejecución <100ms por candidato | Performance | ⏳ Pendiente |

**Archivo sugerido:** `tests/test_shape_features.py`

```python
import numpy as np
from shape_features_v2 import extraer_features, evidence_score

def test_feature_count():
    signal = np.random.randn(20) * 10 + 150
    feats = extraer_features(signal)
    assert len(feats) == 102

def test_evidence_sums_to_one():
    signal = np.random.randn(20) * 10 + 150
    scores = evidence_score(signal)
    assert abs(sum(scores.values()) - 1.0) < 1e-6
```

---

### 2. API Routes (Next.js)

| Endpoint | Caso a testear | Estado |
|---|---|---|
| `POST /api/auth/login` | Usuario válido → retorna `has_pets`, `next_step` | ⏳ |
| `POST /api/pets/create` | Crea mascota → `pet_state = device_pending` | ⏳ |
| `POST /api/devices/link` | Vincula dispositivo → `device_state = linked` | ⏳ |
| `GET /api/readings/latest` | Retorna última lectura del dispositivo activo | ⏳ |
| `GET /api/admin/*` | Rechaza requests sin service_role | ⏳ |

**Herramienta:** Vitest o Jest + Supertest (integración real con Supabase de test).

---

### 3. Bridge / MQTT

| Test | Tipo | Estado |
|---|---|---|
| Payload SENSORS ingestado correctamente en `readings` | Integración | ⏳ |
| Payload STATUS ingestado en `devices` | Integración | ⏳ |
| Reconexión tras caída HiveMQ (<30s) | Resiliencia | ⏳ |
| `device_commands` procesado y ACK enviado | E2E | ⏳ |

---

### 4. Frontend / UX

| Flujo | Resultado esperado | Estado |
|---|---|---|
| Onboarding completo (usuario → mascota → dispositivo) | `pet_state = device_linked` | ⏳ |
| Login con Google | Redirige a `/today` | ⏳ |
| Sin mascotas → modal de registro automático | Modal visible | ⏳ |
| Pestañas lazy loading | Solo tab activo ejecuta requests | ⏳ |

---

### 5. Datos / Pipeline

| Verificación | Cómo | Estado |
|---|---|---|
| `readings.csv` intacto (NUNCA modificar) | `md5sum readings.csv` vs hash guardado | ⏳ |
| `readings_rows.csv` solo crece (append) | `wc -l` antes y después | ⏳ |
| `anotaciones_av2.csv` backup diario existe | `ls data/backups/` | ⏳ |
| Candidatos sin duplicados por `ts_inicio` | `pandas duplicated()` | ⏳ |

---

## Auditorías realizadas

| Auditoría | Fecha | Resultado |
|---|---|---|
| **UX/UI — análisis código fuente todas las páginas** | 2026-06-30 | Ver [[18_UI/UX_DIAGNOSTICO_2026_06_30]] |
| Exhaustiva Knowledge vs código (55 migraciones + todas las rutas) | 2026-06-29 | Ver [[AUDITORIA_2026_06_29]] |
| Tablas Supabase (activa/dormida/infra) | 2026-06-28 | Ver [[06_BaseDatos/README_BaseDatos]] |
| Coherencia ecosistema (enums, estados) | 2026-06-28 | Ver [[01_Proyecto/ENUMS_OFICIALES]] |
| Separabilidad features v2.1 (417 anotaciones) | 2026-06-28 | Ver [[13_Features/ATLAS_Features_v2]] |
| Snapshot performance Motor v2 (LZ optimización) | 2026-06-28 | O(n²)→O(n log n) |

---

## Hallazgos de auditoría 2026-06-29 — Issues de QA

Los siguientes problemas fueron identificados en la auditoría y requieren atención:

| # | Issue | Severidad | Estado |
|---|---|---|---|
| QA-01 | `useMqttLive.ts` sin guard para vars de entorno faltantes | 🟠 Alta | ⏳ Pendiente |
| QA-02 | `ADMIN_OVERVIEW_CACHE_TTL_SEC` con valor string no numérico en `.env.local` | 🟠 Alta | ⏳ Pendiente |
| QA-03 | `/dispositivos` retorna 404 — no hay `page.tsx` | 🟡 Media | ⏳ Pendiente |
| QA-04 | Variables MQTT (`NEXT_PUBLIC_MQTT_*`) ausentes en `.env.local` de dev | 🟠 Alta | ⏳ Pendiente |
| QA-05 | `BRIDGE_HEARTBEAT_SECRET` ausente en `.env.local` → heartbeats 401 en dev | 🟠 Alta | ⏳ Pendiente |
| QA-06 | Banner bridge dice v3.0, `package.json` dice 2.4.0 — versión real es v3.2 | 🟡 Baja | ⏳ Pendiente |
| QA-07 | Estado de sesiones del bridge en memoria → se pierde en reinicios | 🟡 Media | ⏳ Pendiente |
| QA-08 | `/inicio` renderizaba `null` (pantalla en blanco antes del redirect) | 🟡 Media | ✅ Fijo 2026-06-30 |
| QA-09 | Modal config bowl sin `overflow-y-auto` → contenido cortado en móvil | 🟡 Media | ✅ Fijo 2026-06-30 |
| QA-10 | Opción "1 semana" (604_800_000ms) en selector de intervalo IoT sin sentido | 🟡 Baja | ✅ Fijo 2026-06-30 |
| QA-11 | Botón "Ajustes" dentro de la página Ajustes (mismo nombre que la página) | 🟢 Baja | ✅ Fijo 2026-06-30 |
| QA-12 | Modales sin `role="dialog"`, sin Escape, sin focus trap | 🟠 Alta | ⏳ Pendiente (ver C5) |
| QA-13 | Formularios de edición sin `<form>` → Enter no guarda | 🟡 Media | ⏳ Pendiente (ver I4) |
| QA-14 | KPCL0034 hardcodeado como "dispositivo autoritativo" en `today/page.tsx:716` | 🟡 Media | ⏳ Pendiente (ver Q2) |
| QA-15 | `/today` es monolito 5526 líneas con D3 + Chart.js dual → TTI alto | 🟠 Alta | ⏳ Pendiente (ver C2) |

**Fix recomendado para QA-01:**
```typescript
// src/lib/hooks/useMqttLive.ts
if (!process.env.NEXT_PUBLIC_MQTT_BROKER) {
  setError("MQTT no configurado en este entorno");
  return;
}
```

**Fix recomendado para QA-02:**
Cambiar en `.env.local`:
```
ADMIN_OVERVIEW_CACHE_TTL_SEC=300
```

---

## Benchmarks de features

Ver [[13_Features/ATLAS_Features_v2]] para la tabla completa. Benchmark de referencia (snapshot v2.1):

| Feature | sep A/S | sep A/R |
|---|---:|---:|
| `tpl_doble_rampa` | **7.63σ** | 1.63σ |
| `tpl_sigmoide` | 6.03σ | 1.37σ |
| `tpl_alim_escalonada` | 5.86σ | 1.32σ |
| `tpl_plateau` | 0.00σ | 0.00σ ← candidato a eliminar |

---

## Ver también

- [[14_Experimentos/MOC_Experimentos]] — ciclos Alpha y resultados
- [[15_Resultados/MOC_Resultados]] — snapshots de métricas
- [[13_Features/ATLAS_Features_v2]] — tabla completa de separabilidades
