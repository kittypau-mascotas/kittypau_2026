# Reglas canónicas — Eventos de alimentación e hidratación

**Fecha:** 2026-04-16
**Aplica a:** KPCL0034 (food_bowl), KPCL0036 (water_bowl)

---

## Regla maestra

> **Una sesión de alimentación** es el intervalo definido por un par canónico
> `inicio_alimentacin` -> `termino_alimentacin` registrado en `public.audit_events`
> con `event_type = 'manual_bowl_category'` para el device correspondiente.
>
> **Una sesión de hidratación** es el intervalo análogo con
> `inicio_hidratacin` -> `termino_hidratacin`.
>
> Estas etiquetas son la **fuente de verdad** para entrenamiento supervisado,
> visualización en gráficos y evaluación de cualquier algoritmo de detección automática.

---

## Mapa de fuentes de detección actuales

El proyecto tiene **4 fuentes paralelas** que detectan o registran eventos de consumo.
Todas deben ser interpretadas en relación a la regla maestra.

---

### Fuente 1 — Etiquetas manuales en `audit_events` ✅ FUENTE DE VERDAD

**Archivo:** `kittypau_app/src/app/api/devices/[id]/category/route.ts`
**Tabla:** `public.audit_events`, `event_type = 'manual_bowl_category'`
**Origen:** botones en la vista Today (acción manual del operador)

| Categoría | Significado |
|---|---|
| `inicio_alimentacin` | El gato empieza a comer |
| `termino_alimentacin` | El gato termina de comer |
| `inicio_hidratacin` | El gato empieza a beber |
| `termino_hidratacin` | El gato termina de beber |
| `inicio_servido` | El operador empieza a llenar el bowl |
| `termino_servido` | El operador termina de llenar el bowl |
| `kpcl_sin_plato` | Snapshot de peso sin plato (setup) |
| `kpcl_con_plato` | Snapshot con plato -> calcula `plate_weight_grams` |
| `tare_con_plato` | Tara el contenido a 0 |

**Regla de uso en gráficos:**
- El tramo `inicio_alimentacin -> termino_alimentacin` es la banda de sesión
  que debe resaltarse en el gráfico del hero (food_bowl).
- El tramo `inicio_hidratacin -> termino_hidratacin` equivalente para water_bowl.
- `inicio_servido -> termino_servido` debe excluirse del consumo (no es la mascota).

---

### Fuente 2 — `detectIntakeSessions` (heurístico cliente) ⚠️ BASELINE, NO FUENTE DE VERDAD

**Archivo:** `kittypau_app/src/app/(app)/today/page.tsx`, función `detectIntakeSessions`
**Tipo:** heurístico client-side sobre la serie de peso del gráfico activo

**Lógica actual:**
- Umbral mínimo: `minDrop = 2g`
- Gap máximo entre lecturas: `maxGapMinutes = 180`
- Detecta descenso continuo de peso y agrupa en sesiones
- Resultado: array de `IntakeSession` con `startIndex`, `endIndex`, `consumed`, `durationMinutes`

**Uso actual:**
- Resaltado de zonas en el gráfico de hoy (banda de color sobre la curva)
- Tooltips al pasar el cursor: "Proceso: sin evento detectado" si no hay sesión
- Estadísticas de consumo en los cards del hero (1h, 6h, 24h, 7d, 30d)

**Limitaciones vs. regla maestra:**
- No usa etiquetas `audit_events` — puede no coincidir con lo que el operador observó
- Umbral fijo (2g), no adaptativo por animal ni por device
- No distingue servido de consumo real
- Se recalcula en el cliente a cada render, no persiste

**Alneación requerida:**
Cuando existan etiquetas `inicio_alimentacin` / `termino_alimentacin` para el tramo
visible, el gráfico debe priorizarlas sobre el heurístico. El heurístico actúa como
fallback cuando no hay etiquetas manuales.

---

### Fuente 3 — `processor.js` (state machine bridge) ⚠️ AUTO-DETECCIÓN, REQUIERE VALIDACIÓN

**Archivo:** `bridge/src/processor.js`
**Tabla destino:** `pet_sessions` (analytics DB separada)
**Tipo:** máquina de estados por device, corre en el bridge (RPi)

**Lógica actual:**
- `SESSION_THRESHOLD_G = 5g` — caída mínima para abrir sesión
- `STABLE_COUNT = 2` lecturas consecutivas estables para cerrar sesión
- `STABLE_TOLERANCE_G = 3g` — varianza máxima considerada estable
- Calcula Z-score contra baseline rolling de 30 sesiones (`BASELINE_WINDOW = 30`)
- `classification`: `'high'` | `'normal'` | `'low'` (Z > 1.5 | normal | Z < -1.5)
- Escribe `session_type: 'food'` o `'water'` según `device_type`

**Uso actual:**
- Página Story (`/story`): consume `pet_sessions` via `GET /api/analytics/sessions`
- Genera resúmenes diarios en `pet_daily_summary`

**Diferencias vs. regla maestra:**
- Detecta automáticamente, sin confirmación del operador
- Umbral 5g (processor) vs. 2g (detectIntakeSessions) — inconsistencia entre fuentes 2 y 3
- `session_start` / `session_end` son timestamps automáticos del bridge, pueden diferir
  hasta varios minutos del `inicio_alimentacin` observado por el operador
- No usa ni vlida contra `audit_events`

**Alneación requerida:**
El processor debe consultar las etiquetas `audit_events` para:
1. Validar sus sesiones detectadas (true/false positive)
2. Ajustar `SESSION_THRESHOLD_G` y `STABLE_TOLERANCE_G` por device usando el dataset etiquetado
3. Eventual reemplazo por modelo supervisado (ver `ML_PREDICCION_ALIMENTACION.md`)

---

### Fuente 4 — `health-check/route.ts` (eventos de conectividad) ℹ️ INFRAESTRUCTURA, NO CONSUMO

**Archivo:** `kittypau_app/src/app/api/bridge/health-check/route.ts`
**Tabla:** `public.audit_events`
**Tipo:** cron de Vercel, detecta devices con `last_seen` > umbral

**Eventos que genera:**
| `event_type` | Significado |
|---|---|
| `device_offline_detected` | Device sin STATUS por > umbral |
| `device_online_detected` | Device volvió a enviar STATUS |
| `bridge_offline_detected` | Bridge sin heartbeat |
| `bridge_online_detected` | Bridge volvió |
| `general_device_outage_detected` | ≥3 devices offline simultáneo |
| `general_device_outage_recovered` | Recuperación de outage general |

**Bug conocido — duplicados:**
El health-check puede ejecutarse en paralelo (varias invocaciones Vercel simultáneas)
antes de que el primer `UPDATE devices SET device_state = 'offline'` se confirme.
Resultado: múltiples `device_offline_detected` para el mismo evento físico en el mismo segndo.
Evidencia: KPCL0036 acumuló 30 eventos entre 2026-02-12 y 2026-04-10 (lotes de 2-3 en milisegndos).
**Estos 30 eventos serán eliminados** (ver `CLEANUP_MANUAL_CATEGORY_TESTS_2026-04-07.sql`).

**Regla de uso:**
- Los eventos de conectividad (`device_offline_detected` etc.) son de infraestructura.
- **No representan consumo** y deben excluirse de toda lógica de alimentación/hidratación.
- Para power events canónicos usar `device_power_event` (`kpcl_prendido`/`kpcl_apagado`)
  generados por el bridge v3.1 (ver `bridge/src/index.js`).

---

## Diagrama de prioridad para el gráfico del hero

```
¿Hay pares inicio_alimentacin/termino_alimentacin en audit_events
  para el tramo visible del gráfico
        │
        ├── SÍ -> Resaltar esa banda como sesión canónica
        │         Label: "Alimentación confirmada"
        │         Color: verde sólido
        │
        └── NO -> Usar detectIntakeSessions (heurístico)
                  Label: "Proceso detectado"
                  Color: verde transparente / punteado
```

**Para servido** (`inicio_servido -> termino_servido`):
- Mostrar como banda separada en el gráfico (color naranja/distinto)
- Excluir del cálculo de gramos consumidos por la mascota

**Para encendido/apagado** (`kpcl_prendido` / `kpcl_apagado`):
- Mostrar como líneas verticales en el gráfico (no bandas)
- Segmentar la serie temporal (no interpolar entre segmentos)

---

## Regla para el dataset supervisado

Definición operativa de "una sesión de alimentación" para ML:

```
sesin = {
  device_id:   "KPCL0034",
  inicio:      timestamp del evento inicio_alimentacin más cercano,
  termino:     timestamp del evento termino_alimentacin siguente al inicio,
  duracion_s:  termino - inicio,
  gramos:      weight(inicio) - weight(termino),   // peso neto consumido
  vlida:      duracion_s > 0 AND gramos > 0       // filtrar sesiones incompletas
}
```

Los tramos `inicio_servido -> termino_servido` entre sesiones deben marcarse como
`label = 'servido'` y excluirse del training set de consumo.

Ver `ML_PREDICCION_ALIMENTACION.md` para el pipeline completo.

---

## Inconsistencias pendientes de resolver

| # | Problema | Ubicación | Prioridad |
|---|---|---|---|
| 1 | `minDrop` del heurístico (2g) ≠ `SESSION_THRESHOLD_G` del processor (5g) | `today/page.tsx` vs `processor.js` | Media |
| 2 | Hero chart no consume etiquetas `audit_events`, solo heurístico | `today/page.tsx` | Alta |
| 3 | `pet_sessions` (processor) no se vlida contra `audit_events` | `processor.js` | Alta |
| 4 | Health-check puede escribir eventos duplicados (race condition) | `health-check/route.ts` | Media |
| 5 | `plot_kpcl_experimento.py` usa aliases legacy (`tare_record`, `food_fill_start`) | `plot_kpcl_experimento.py` | Baja |

---

## Referencias

| Archivo | Rol |
|---|---|
| `Docs/investigacion/README.md` | Taxonomía canónica de categorías |
| `Docs/investigacion/ML_PREDICCION_ALIMENTACION.md` | Especificación ML |
| `Docs/investigacion/REGISTRO_EVENTOS_KPCL0034_2026-04-16.md` | Dataset etiquetado |
| `kittypau_app/src/app/api/devices/[id]/category/route.ts` | API de registro manual |
| `kittypau_app/src/app/(app)/today/page.tsx` | Heurístico + gráfico hero |
| `kittypau_app/src/app/api/analytics/sessions/route.ts` | API de sesiones analytics |
| `bridge/src/processor.js` | State machine de detección automática |
| `bridge/src/index.js` | Power events bridge v3.1 |
