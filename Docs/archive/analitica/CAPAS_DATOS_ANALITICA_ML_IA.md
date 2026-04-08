# KittyPau - Capas de Datos, Analitica/ML e IA (inventario historico de variables)

> Estado: documento legado. La fuente canonica actual es [FUENTE_DE_VERDAD.md](../../FUENTE_DE_VERDAD.md).
> Este archivo se conserva como referencia historica de variables y capas, no como contrato principal.

Este documento ordena **3 capas** (Datos → Analítica/ML → IA/Producto) usando las **variables que aparecen en el proyecto** (schema SQL, endpoints y documentación).

> Objetivo práctico: saber **qué variable vive dónde**, **para qué sirve**, y **en qué capa** se transforma en insight/ML.

Nota: la fuente canonica actual de activo/legacy/tablas/flujos es `Docs/FUENTE_DE_VERDAD.md`.
Este documento se mantiene como inventario rapido historico (variables + donde vive cada cosa) y debe evitar contradicciones con `Docs/SQL_SCHEMA.sql`.

---

## Arquitectura productiva de 3 capas (próxima implementación)

La clave es que cada capa tenga **responsabilidades estrictas**, **contratos claros** y evite acoplamiento.

```
[CAPA 1: EDGE/INGESTA]  ->  [CAPA 2: BACKEND API]  ->  [CAPA 3: ML ENGINE]
  real-time (segundos)       seguridad + multi-tenant     batch (inteligencia)
  valida/normaliza/persiste  expone a frontend            features + insights
```

### Cómo calza con el stack real del repo (sin Neon/AWS)

Flujo actual y recomendado:
```
[Dispositivo IoT] → [HiveMQ MQTT] → [Raspberry Bridge] → [Vercel /api/mqtt/webhook]
                                               ↓
                                       [Supabase Postgres]
                                               ↓
                                    [ML Worker (Python, batch)]
                                               ↓
                                  [tabla de insights (propuesta)]
                                               ↓
                                   [Vercel API] → [Frontend]
```

Notas:
- En este repo la ingestión “EDGE” hoy está dentro de la API server-side (Vercel) en `/api/mqtt/webhook`.
- Si a futuro se mueve a Supabase Edge Functions, el contrato y las restricciones de Capa 1 se mantienen (stateless, rápido, sin ML pesado).

### Necesidad del cliente y cómo usa estas capas (por qué importan)

**Cliente principal (B2C):** dueño/cuidador de mascota que necesita:
- Ver “qué pasó hoy” (telemetría confiable y entendible).
- Detectar cambios antes de que se transformen en urgencia (alertas y patrones).
- Tener evidencia objetiva (historial y resumen) para decisiones y/o veterinario.

**Cómo se traduce en uso dentro del producto:**
- Capa 1 asegura que la data sea **confiable** (sin picos destructivos, timestamps sanos, idempotencia).
- Capa 2 entrega **experiencia y seguridad**: solo “mis mascotas / mis dispositivos”, endpoints estables, planes/historial.
- Capa 3 produce **diferenciación**: insights que un dashboard simple no puede dar (rutinas, anomalías, predicción ligera).

**Outputs de valor (lo que el usuario consume):**
- Dashboard en vivo (últimas lecturas + estado dispositivo).
- Resúmenes diarios/semanales (tendencias: comida/agua/ambiente).
- Alertas interpretadas (micro-ingestas, ayuno, baja hidratación, cambio de patrón).
- (Opcional) “reporte” para veterinaria basado en sesiones y baseline personal.

### CAPA 1 — EDGE / Ingestión en tiempo real (server-side)

**Objetivo:** convertir telemetría IoT en datos limpios y consistentes rápidamente.

**Responsabilidades (alineadas a KittyPau):**
1) Ingesta HTTP desde Bridge (`POST /api/mqtt/webhook`).
2) Validación: estructura, `device_id` (KPCL), rangos físicos, timestamp coherente.
3) Normalización: tipos, unidades y timestamps (ISO), compat de payload.
4) Cálculo liviano: flags simples, `clock_invalid`, transformaciones `log10(x+1)` (si aplica).
5) Persistencia: escribir en `public.readings` (y/o `public.sensor_readings` para compat legacy cuando corresponda).

**Restricciones (no negociables):**
- Stateless
- No ML pesado
- Sin joins complejos
- Presupuestar ejecución corta (orden de segundos), con reintentos e idempotencia

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

### CAPA 2 — BACKEND API (Orquestación + seguridad multi-tenant)

**Objetivo:** ser el cerebro lógico del sistema y garantizar aislamiento por usuario.

**Responsabilidades:**
1) Autenticación y sesión (Supabase Auth / JWT).
2) Autorización (crítico): el usuario solo ve sus mascotas/dispositivos.
3) Exposición a frontend: endpoints para pets/devices/readings y (futuro) insights.
4) Lógica de negocio: reglas de producto, configuración por usuario, thresholds dinámicos (sin ML pesado).
5) Orquestación: unir telemetría + analítica (sesiones/resúmenes) + insights.

**Restricciones:**
- No ejecutar procesamiento ML pesado aquí.
- No depender de latencias “casi tiempo real” para entrenamiento/modelos.

### CAPA 3 — ML ENGINE (batch-first + near-real-time liviano)

**Objetivo:** transformar histórico en features, insights y predicciones reutilizables (sin exponer el motor directamente al frontend).

**Recomendación (KittyPau): modelo híbrido**
- **Batch (principal):** cada 10 min / 1 h / 24 h para sesiones, patrones, scoring.
- **Near-real-time (en Capa 1):** solo validación/flags simples (no ML complejo).

**Pipeline recomendado (propuesta mínima):**
1) Extracción por mascota (siempre multi-tenant): lecturas recientes (24h/7d/30d).
2) Feature engineering: promedios, frecuencia, `dt_seconds`, desviación estándar, baselines.
3) Modelos iniciales: reglas estadísticas, z-score/IQR/MAD, scoring de anomalías; FFT/Fourier para rutinas.
4) Persistencia de resultados: escribir insights en una tabla dedicada en Supabase (propuesta `public.insights_ml`).

**Restricciones:**
- No exponer el worker directo al frontend.
- No bloquear la ingestión por dependencia de Capa 3.

### Regla crítica (multi-tenant)

En todas las capas:
- procesar por `owner_id` / `user_id` (y/o `pet_id`), nunca “todo junto”
- persistir resultados con llaves de ownership
- reforzar con RLS/policies en DB

---

## Capa 1) Datos (Ingestión / Normalización / Feature engineering)

### 1.1 Identidad, relaciones y llaves

| Variable | Fuente (tabla/campo) | Uso |
|---|---|---|
| `devices.id` | `public.devices.id` (UUID) | FK principal para lecturas (`readings.device_id`). |
| `devices.device_id` | `public.devices.device_id` (KPCL0000) | Trazabilidad humana/UI, contrato IoT. |
| `devices.owner_id` | `public.devices.owner_id` (UUID) | Tenant: dueño/usuario. Base para RLS y aislamiento. |
| `readings.device_id` | `public.readings.device_id` (UUID FK) | Lecturas “oficiales” para app y analítica. |
| `readings.pet_id` | `public.readings.pet_id` (snapshot) | Snapshot opcional (no fuente de verdad). |
| `devices.pet_id` | `public.devices.pet_id` | Fuente de verdad del vínculo dispositivo→mascota. |
| `profiles.id` | `public.profiles.id` | Owner/usuario (Auth). |

### 1.2 Tiempos (críticos para series temporales)

| Variable | Fuente | Nota |
|---|---|---|
| `recorded_at` | `public.readings.recorded_at` | Timestamp de lectura (dispositivo o normalizado). |
| `ingested_at` | `public.readings.ingested_at` | Tiempo servidor al recibir: **fuente de verdad** en caso de clocks malos. |
| `clock_invalid` | `public.readings.clock_invalid` | Marca desvío importante entre reloj dispositivo vs servidor. |
| `effective_ts` (canon) | `CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END` | Eje temporal recomendado para series/ventanas. |
| `device_timestamp` | `public.sensor_readings.device_timestamp` | Timestamp crudo “v2.4” (compat bridge). |
| `last_seen` | `public.devices.last_seen` | Última lectura/actividad de dispositivo. |
| `bridge_heartbeats.last_seen` | `public.bridge_heartbeats.last_seen` | Observabilidad del bridge. |
| `bridge_heartbeats.last_mqtt_at` | `public.bridge_heartbeats.last_mqtt_at` | Salud de conexión MQTT. |

### 1.3 Sensores y telemetría cruda (inputs del dominio)

**Lecturas oficiales (app/DB):** `public.readings`
- `weight_grams`
- `water_ml`
- `flow_rate`
- `temperature`
- `humidity`
- `battery_level`

**Compat bridge v2.4 (ingest legacy):** `public.sensor_readings`
- `weight_grams` (numeric)
- `temperature`, `humidity`
- `light_lux`, `light_percent`, `light_condition`
- `device_timestamp`
- `ingested_at`

### 1.4 Contexto de dispositivo (config + estado + calidad de dato)

| Variable | Fuente | Uso |
|---|---|---|
| `plate_weight_grams` | `public.devices.plate_weight_grams` | Tara: permite pasar de “peso bruto” a “contenido”. |
| `device_type` | `public.devices.device_type` | `food_bowl` / `water_bowl` para interpretación. |
| `device_state` | `public.devices.device_state` | Estado operativo: `factory/claimed/linked/offline/...`. |
| `status` | `public.devices.status` | Activo/inactivo/maintenance. |
| `wifi_status`, `wifi_ssid`, `wifi_ip` | `public.devices.*` | Contexto de conectividad (operación). |
| `sensor_health` | `public.devices.sensor_health` | Señal de calidad/estado sensor (operación). |

### 1.5 Normalización y transformaciones (feature engineering en ingestión)

**Reglas de normalización (Capa 1):**
- Validación de rangos (payload) y tipado (string → number).
- Deduplicación por llave temporal/identidad (`device_id + recorded_at`).
- Política de timestamp: si reloj del dispositivo es malo → usar `ingested_at` y setear `clock_invalid=true`.

**Transformación recomendada para estabilidad (skew/outliers):**
- `x_log = log10(x + 1)` para variables altamente sesgadas (consumo, deltas, intervalos).
- Guardar **raw + log** (trazabilidad + estabilidad analítica).

Estado actual: el schema base (`Docs/SQL_SCHEMA.sql`) no incluye columnas `*_log` en `public.readings`. Si se necesitan para analítica/ML, preferir:
- vistas (o materialized views) que calculen `log10(x+1)` sobre demanda, o
- columnas nuevas agregadas por migración (documentadas) cuando haya un caso de uso claro.

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

---

## Capa 2) Analítica + Machine Learning (descriptiva → features → detección)

### 2.1 Derivadas por lectura (features intermedias)

Estas variables no siempre existen como columnas: se derivan en queries/servicios analíticos.

| Variable derivada | Fórmula / fuente | Uso |
|---|---|---|
| `food_content_g` | `max(0, weight_grams - plate_weight_grams)` | Contenido real estimado (comida). |
| `water_content_cm3` | `water_ml` o fallback por peso | Contenido real estimado (agua). |
| `dt_seconds` | `recorded_at - lag(recorded_at)` | Intervalos / ritmo. |
| `delta_content_g` | `content_i - lag(content_i)` | Consumo vs recarga vs ruido. |
| `rate_g_per_min` | `consumed / duration` | Intensidad de sesión. |
| `*_log` | `log10(x+1)` | Features robustas. |

### 2.2 Ventanas, baselines y comparaciones

Variables y conceptos usados en reglas/analítica:
- Ventanas: `1h`, `6h`, `24h`, `7d`, `30d`
- Baselines por mascota/especie: consumo agua/alimento esperado (ajustable por peso/actividad)
- Comparación: “hoy vs promedio”, “últimas 24h vs baseline 7d”

### 2.3 Eventos / sesiones (time series → sesiones)

En el antiguo esquema analitico `supabase-analytics/` existian estructuras tipo "sesion" (tablas `public.pet_sessions` y `public.pet_daily_summary`). Hoy se consideran legado.

| Variable | Fuente | Uso |
|---|---|---|
| `session_type` | `pet_sessions.session_type` | Tipo de sesión (comida/agua u otras clases). |
| `session_start`, `session_end` | `pet_sessions.*` | Segmentación temporal. |
| `duration_sec` | `pet_sessions.duration_sec` | Duración. |
| `grams_consumed` | `pet_sessions.grams_consumed` | Consumo comida estimado. |
| `water_ml` | `pet_sessions.water_ml` | Consumo agua. |
| `classification` | `pet_sessions.classification` | Etiqueta/clase de comportamiento. |
| `baseline_grams` | `pet_sessions.baseline_grams` | Baseline estimado para comparar sesión. |
| `anomaly_score` | `pet_sessions.anomaly_score` | Score para anomalías/cambios. |
| `avg_temperature`, `avg_humidity` | `pet_sessions.*` | Contexto ambiental promedio en sesión. |

### 2.4 Agregaciones diarias (tendencias)

| Variable | Fuente | Uso |
|---|---|---|
| `summary_date` | `pet_daily_summary.summary_date` | Eje temporal (día). |
| `total_food_grams` | `pet_daily_summary.total_food_grams` | Total diario comida. |
| `food_sessions` | `pet_daily_summary.food_sessions` | Conteo sesiones. |
| `total_water_ml` | `pet_daily_summary.total_water_ml` | Total diario agua. |
| `water_sessions` | `pet_daily_summary.water_sessions` | Conteo sesiones. |
| `anomaly_count` | `pet_daily_summary.anomaly_count` | Anomalías por día. |
| `skipped_meals` | `pet_daily_summary.skipped_meals` | Señal de ayuno/omisión. |
| `first_session_at`, `last_session_at` | `pet_daily_summary.*` | Rutina/hábitos por día. |
| `avg_temperature`, `avg_humidity` | `pet_daily_summary.*` | Contexto ambiental promedio diario. |

### 2.5 Bucketización / downsampling (visualización eficiente)

Para gráficos se usan lecturas “bucketed” (promedios por ventana):
- `avg(weight_grams)`
- `avg(temperature)`
- `avg(humidity)`
- `avg(light_percent)`

---

## Capa 3) IA / Producto (insights, alertas, predicción)

### 3.1 Señales “producto” (salida a UX / insights)

Estas variables se consumen como **mensajes**, **alertas** o **indicadores**:
- “Bebió menos de lo habitual (24h vs baseline 7d)”
- “Micro-ingestas frecuentes (últimas 2h)”
- “Ingesta nocturna (00:00–05:00)”
- “Ayuno prolongado (>12h sin eventos)”
- “Cambio en patrón (frecuencia/rutina)”

### 3.2 Features/IA avanzadas (diferenciación)

| Feature IA | Fuente | Uso |
|---|---|---|
| `dominant_frequency` | Fourier/FFT (worker analítico) | Rutina: cada cuántas horas come/bebe. |
| `frequency_power` | Fourier/FFT | Fuerza del patrón/rutina. |
| `anomaly_score` | Modelo/regla ML | Alertas por cambio estructural, no solo thresholds. |

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

### 3.3 Operación inteligente (IA aplicada a confiabilidad)

Variables operativas que habilitan alertas de continuidad:
- Bridge: `mqtt_connected`, `uptime_sec`, `cpu_temp`, `ram_used_mb`, `disk_used_pct`, `last_seen`
- Dispositivo: `device_state`, `last_seen`, `battery_level`, `wifi_status`

---

## Checklist rápido (para mantener coherencia entre capas)

1) **Capa 1** guarda raw + timestamps + calidad (`clock_invalid`) y aplica normalización.
2) **Capa 2** deriva `content`, `dt`, `delta`, sesiones y baselines; expone resúmenes (`daily`, `sessions`, `bucketed`).
3) **Capa 3** convierte features en **insights/alertas** + prepara FFT/anomaly scoring.

---

## Apéndice A — Columnas/variables por tabla (inventario práctico)

### `public.devices` (contexto y estado)
- Identidad: `id`, `owner_id`, `pet_id`, `device_id`, `device_type`
- Estado: `status`, `device_state`, `last_seen`, `battery_level`
- Calibración: `plate_weight_grams`
- Operación: `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`, `ip_history`, `retired_at`

### `public.readings` (streaming “oficial”)
- Identidad: `id`, `device_id`, `pet_id`
- Sensores: `weight_grams`, `water_ml`, `flow_rate`, `temperature`, `humidity`, `light_lux`, `light_percent`, `light_condition`, `battery_level`
- Tiempos/calidad: `recorded_at`, `ingested_at`, `clock_invalid`

### `public.sensor_readings` (compat bridge v2.4 / raw)
- Identidad: `id`, `device_id` (KPCL text)
- Sensores: `weight_grams`, `temperature`, `humidity`, `light_lux`, `light_percent`, `light_condition`
- Tiempos: `device_timestamp`, `ingested_at`

### `public.bridge_heartbeats` / `public.bridge_telemetry` (observabilidad)
- Conectividad: `mqtt_connected`, `last_mqtt_at`, `wifi_ssid`, `wifi_ip`, `ip`, `hostname`
- Recursos: `uptime_sec|uptime_min`, `ram_used_mb`, `ram_total_mb`, `disk_used_pct`, `cpu_temp`
- Estado: `bridge_status`, `last_seen`, `recorded_at`

### `supabase-analytics: public.pet_sessions` / `supabase-analytics: public.pet_daily_summary` (archivo historico, no activo)
- Sesiones: `session_type`, `session_start`, `session_end`, `duration_sec`, `grams_consumed`, `water_ml`, `classification`, `anomaly_score`, `baseline_grams`, `avg_temperature`, `avg_humidity`
- Diario: `summary_date`, `total_food_grams`, `food_sessions`, `total_water_ml`, `water_sessions`, `anomaly_count`, `skipped_meals`, `first_session_at`, `last_session_at`, `avg_temperature`, `avg_humidity`






