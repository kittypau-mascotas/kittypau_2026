# KittyPau - Capas de Datos, Analitica/ML e IA (inventario historico de variables)

> Estado: documento legado. La fuente canonica actual es [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md).
> Este archivo se conserva como referencia historica de variables y capas, no como contrato principal.

Este documento ordena **3 capas** (Datos â†’ AnalÃ­tica/ML â†’ IA/Producto) usando las **variables que aparecen en el proyecto** (schema SQL, endpoints y documentaciÃ³n).

> Objetivo prÃ¡ctico: saber **quÃ© variable vive dÃ³nde**, **para quÃ© sirve**, y **en quÃ© capa** se transforma en insight/ML.

Nota: la fuente canonica actual de activo/legacy/tablas/flujos es `Docs/FUENTE_DE_VERDAD.md`.
Este documento se mantiene como inventario rapido historico (variables + donde vive cada cosa) y debe evitar contradicciones con `Docs/SQL_SCHEMA.sql`.

---

## Arquitectura productiva de 3 capas (prÃ³xima implementaciÃ³n)

La clave es que cada capa tenga **responsabilidades estrictas**, **contratos claros** y evite acoplamiento.

```
[CAPA 1: EDGE/INGESTA]  ->  [CAPA 2: BACKEND API]  ->  [CAPA 3: ML ENGINE]
  real-time (segundos)       seguridad + multi-tenant     batch (inteligencia)
  valida/normaliza/persiste  expone a frontend            features + insights
```

### CÃ³mo calza con el stack real del repo (sin Neon/AWS)

Flujo actual y recomendado:
```
[Dispositivo IoT] â†’ [HiveMQ MQTT] â†’ [Raspberry Bridge] â†’ [Vercel /api/mqtt/webhook]
                                               â†“
                                       [Supabase Postgres]
                                               â†“
                                    [ML Worker (Python, batch)]
                                               â†“
                                  [tabla de insights (propuesta)]
                                               â†“
                                   [Vercel API] â†’ [Frontend]
```

Notas:
- En este repo la ingestiÃ³n â€œEDGEâ€ hoy estÃ¡ dentro de la API server-side (Vercel) en `/api/mqtt/webhook`.
- Si a futuro se mueve a Supabase Edge Functions, el contrato y las restricciones de Capa 1 se mantienen (stateless, rÃ¡pido, sin ML pesado).

### Necesidad del cliente y cÃ³mo usa estas capas (por quÃ© importan)

**Cliente principal (B2C):** dueÃ±o/cuidador de mascota que necesita:
- Ver â€œquÃ© pasÃ³ hoyâ€ (telemetrÃ­a confiable y entendible).
- Detectar cambios antes de que se transformen en urgencia (alertas y patrones).
- Tener evidencia objetiva (historial y resumen) para decisiones y/o veterinario.

**CÃ³mo se traduce en uso dentro del producto:**
- Capa 1 asegura que la data sea **confiable** (sin picos destructivos, timestamps sanos, idempotencia).
- Capa 2 entrega **experiencia y seguridad**: solo â€œmis mascotas / mis dispositivosâ€, endpoints estables, planes/historial.
- Capa 3 produce **diferenciaciÃ³n**: insights que un dashboard simple no puede dar (rutinas, anomalÃ­as, predicciÃ³n ligera).

**Outputs de valor (lo que el usuario consume):**
- Dashboard en vivo (Ãºltimas lecturas + estado dispositivo).
- ResÃºmenes diarios/semanales (tendencias: comida/agua/ambiente).
- Alertas interpretadas (micro-ingestas, ayuno, baja hidrataciÃ³n, cambio de patrÃ³n).
- (Opcional) â€œreporteâ€ para veterinaria basado en sesiones y baseline personal.

### CAPA 1 â€” EDGE / IngestiÃ³n en tiempo real (server-side)

**Objetivo:** convertir telemetrÃ­a IoT en datos limpios y consistentes rÃ¡pidamente.

**Responsabilidades (alineadas a KittyPau):**
1) Ingesta HTTP desde Bridge (`POST /api/mqtt/webhook`).
2) ValidaciÃ³n: estructura, `device_id` (KPCL), rangos fÃ­sicos, timestamp coherente.
3) NormalizaciÃ³n: tipos, unidades y timestamps (ISO), compat de payload.
4) CÃ¡lculo liviano: flags simples, `clock_invalid`, transformaciones `log10(x+1)` (si aplica).
5) Persistencia: escribir en `public.readings` (y/o `public.sensor_readings` para compat legacy cuando corresponda).

**Restricciones (no negociables):**
- Stateless
- No ML pesado
- Sin joins complejos
- Presupuestar ejecuciÃ³n corta (orden de segundos), con reintentos e idempotencia

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

### CAPA 2 â€” BACKEND API (OrquestaciÃ³n + seguridad multi-tenant)

**Objetivo:** ser el cerebro lÃ³gico del sistema y garantizar aislamiento por usuario.

**Responsabilidades:**
1) AutenticaciÃ³n y sesiÃ³n (Supabase Auth / JWT).
2) AutorizaciÃ³n (crÃ­tico): el usuario solo ve sus mascotas/dispositivos.
3) ExposiciÃ³n a frontend: endpoints para pets/devices/readings y (futuro) insights.
4) LÃ³gica de negocio: reglas de producto, configuraciÃ³n por usuario, thresholds dinÃ¡micos (sin ML pesado).
5) OrquestaciÃ³n: unir telemetrÃ­a + analÃ­tica (sesiones/resÃºmenes) + insights.

**Restricciones:**
- No ejecutar procesamiento ML pesado aquÃ­.
- No depender de latencias â€œcasi tiempo realâ€ para entrenamiento/modelos.

### CAPA 3 â€” ML ENGINE (batch-first + near-real-time liviano)

**Objetivo:** transformar histÃ³rico en features, insights y predicciones reutilizables (sin exponer el motor directamente al frontend).

**RecomendaciÃ³n (KittyPau): modelo hÃ­brido**
- **Batch (principal):** cada 10 min / 1 h / 24 h para sesiones, patrones, scoring.
- **Near-real-time (en Capa 1):** solo validaciÃ³n/flags simples (no ML complejo).

**Pipeline recomendado (propuesta mÃ­nima):**
1) ExtracciÃ³n por mascota (siempre multi-tenant): lecturas recientes (24h/7d/30d).
2) Feature engineering: promedios, frecuencia, `dt_seconds`, desviaciÃ³n estÃ¡ndar, baselines.
3) Modelos iniciales: reglas estadÃ­sticas, z-score/IQR/MAD, scoring de anomalÃ­as; FFT/Fourier para rutinas.
4) Persistencia de resultados: escribir insights en una tabla dedicada en Supabase (propuesta `public.insights_ml`).

**Restricciones:**
- No exponer el worker directo al frontend.
- No bloquear la ingestiÃ³n por dependencia de Capa 3.

### Regla crÃ­tica (multi-tenant)

En todas las capas:
- procesar por `owner_id` / `user_id` (y/o `pet_id`), nunca â€œtodo juntoâ€
- persistir resultados con llaves de ownership
- reforzar con RLS/policies en DB

---

## Capa 1) Datos (IngestiÃ³n / NormalizaciÃ³n / Feature engineering)

### 1.1 Identidad, relaciones y llaves

| Variable | Fuente (tabla/campo) | Uso |
|---|---|---|
| `devices.id` | `public.devices.id` (UUID) | FK principal para lecturas (`readings.device_id`). |
| `devices.device_id` | `public.devices.device_id` (KPCL0000) | Trazabilidad humana/UI, contrato IoT. |
| `devices.owner_id` | `public.devices.owner_id` (UUID) | Tenant: dueÃ±o/usuario. Base para RLS y aislamiento. |
| `readings.device_id` | `public.readings.device_id` (UUID FK) | Lecturas â€œoficialesâ€ para app y analÃ­tica. |
| `readings.pet_id` | `public.readings.pet_id` (snapshot) | Snapshot opcional (no fuente de verdad). |
| `devices.pet_id` | `public.devices.pet_id` | Fuente de verdad del vÃ­nculo dispositivoâ†’mascota. |
| `profiles.id` | `public.profiles.id` | Owner/usuario (Auth). |

### 1.2 Tiempos (crÃ­ticos para series temporales)

| Variable | Fuente | Nota |
|---|---|---|
| `recorded_at` | `public.readings.recorded_at` | Timestamp de lectura (dispositivo o normalizado). |
| `ingested_at` | `public.readings.ingested_at` | Tiempo servidor al recibir: **fuente de verdad** en caso de clocks malos. |
| `clock_invalid` | `public.readings.clock_invalid` | Marca desvÃ­o importante entre reloj dispositivo vs servidor. |
| `effective_ts` (canon) | `CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END` | Eje temporal recomendado para series/ventanas. |
| `device_timestamp` | `public.sensor_readings.device_timestamp` | Timestamp crudo â€œv2.4â€ (compat bridge). |
| `last_seen` | `public.devices.last_seen` | Ãšltima lectura/actividad de dispositivo. |
| `bridge_heartbeats.last_seen` | `public.bridge_heartbeats.last_seen` | Observabilidad del bridge. |
| `bridge_heartbeats.last_mqtt_at` | `public.bridge_heartbeats.last_mqtt_at` | Salud de conexiÃ³n MQTT. |

### 1.3 Sensores y telemetrÃ­a cruda (inputs del dominio)

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
| `plate_weight_grams` | `public.devices.plate_weight_grams` | Tara: permite pasar de â€œpeso brutoâ€ a â€œcontenidoâ€. |
| `device_type` | `public.devices.device_type` | `food_bowl` / `water_bowl` para interpretaciÃ³n. |
| `device_state` | `public.devices.device_state` | Estado operativo: `factory/claimed/linked/offline/...`. |
| `status` | `public.devices.status` | Activo/inactivo/maintenance. |
| `wifi_status`, `wifi_ssid`, `wifi_ip` | `public.devices.*` | Contexto de conectividad (operaciÃ³n). |
| `sensor_health` | `public.devices.sensor_health` | SeÃ±al de calidad/estado sensor (operaciÃ³n). |

### 1.5 NormalizaciÃ³n y transformaciones (feature engineering en ingestiÃ³n)

**Reglas de normalizaciÃ³n (Capa 1):**
- ValidaciÃ³n de rangos (payload) y tipado (string â†’ number).
- DeduplicaciÃ³n por llave temporal/identidad (`device_id + recorded_at`).
- PolÃ­tica de timestamp: si reloj del dispositivo es malo â†’ usar `ingested_at` y setear `clock_invalid=true`.

**TransformaciÃ³n recomendada para estabilidad (skew/outliers):**
- `x_log = log10(x + 1)` para variables altamente sesgadas (consumo, deltas, intervalos).
- Guardar **raw + log** (trazabilidad + estabilidad analÃ­tica).

Estado actual: el schema base (`Docs/SQL_SCHEMA.sql`) no incluye columnas `*_log` en `public.readings`. Si se necesitan para analÃ­tica/ML, preferir:
- vistas (o materialized views) que calculen `log10(x+1)` sobre demanda, o
- columnas nuevas agregadas por migraciÃ³n (documentadas) cuando haya un caso de uso claro.

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

---

## Capa 2) AnalÃ­tica + Machine Learning (descriptiva â†’ features â†’ detecciÃ³n)

### 2.1 Derivadas por lectura (features intermedias)

Estas variables no siempre existen como columnas: se derivan en queries/servicios analÃ­ticos.

| Variable derivada | FÃ³rmula / fuente | Uso |
|---|---|---|
| `food_content_g` | `max(0, weight_grams - plate_weight_grams)` | Contenido real estimado (comida). |
| `water_content_cm3` | `water_ml` o fallback por peso | Contenido real estimado (agua). |
| `dt_seconds` | `recorded_at - lag(recorded_at)` | Intervalos / ritmo. |
| `delta_content_g` | `content_i - lag(content_i)` | Consumo vs recarga vs ruido. |
| `rate_g_per_min` | `consumed / duration` | Intensidad de sesiÃ³n. |
| `*_log` | `log10(x+1)` | Features robustas. |

### 2.2 Ventanas, baselines y comparaciones

Variables y conceptos usados en reglas/analÃ­tica:
- Ventanas: `1h`, `6h`, `24h`, `7d`, `30d`
- Baselines por mascota/especie: consumo agua/alimento esperado (ajustable por peso/actividad)
- ComparaciÃ³n: â€œhoy vs promedioâ€, â€œÃºltimas 24h vs baseline 7dâ€

### 2.3 Eventos / sesiones (time series â†’ sesiones)

En el antiguo esquema analitico `supabase-analytics/` existian estructuras tipo "sesion" (tablas `public.pet_sessions` y `public.pet_daily_summary`). Hoy se consideran legado.

| Variable | Fuente | Uso |
|---|---|---|
| `session_type` | `pet_sessions.session_type` | Tipo de sesiÃ³n (comida/agua u otras clases). |
| `session_start`, `session_end` | `pet_sessions.*` | SegmentaciÃ³n temporal. |
| `duration_sec` | `pet_sessions.duration_sec` | DuraciÃ³n. |
| `grams_consumed` | `pet_sessions.grams_consumed` | Consumo comida estimado. |
| `water_ml` | `pet_sessions.water_ml` | Consumo agua. |
| `classification` | `pet_sessions.classification` | Etiqueta/clase de comportamiento. |
| `baseline_grams` | `pet_sessions.baseline_grams` | Baseline estimado para comparar sesiÃ³n. |
| `anomaly_score` | `pet_sessions.anomaly_score` | Score para anomalÃ­as/cambios. |
| `avg_temperature`, `avg_humidity` | `pet_sessions.*` | Contexto ambiental promedio en sesiÃ³n. |

### 2.4 Agregaciones diarias (tendencias)

| Variable | Fuente | Uso |
|---|---|---|
| `summary_date` | `pet_daily_summary.summary_date` | Eje temporal (dÃ­a). |
| `total_food_grams` | `pet_daily_summary.total_food_grams` | Total diario comida. |
| `food_sessions` | `pet_daily_summary.food_sessions` | Conteo sesiones. |
| `total_water_ml` | `pet_daily_summary.total_water_ml` | Total diario agua. |
| `water_sessions` | `pet_daily_summary.water_sessions` | Conteo sesiones. |
| `anomaly_count` | `pet_daily_summary.anomaly_count` | AnomalÃ­as por dÃ­a. |
| `skipped_meals` | `pet_daily_summary.skipped_meals` | SeÃ±al de ayuno/omisiÃ³n. |
| `first_session_at`, `last_session_at` | `pet_daily_summary.*` | Rutina/hÃ¡bitos por dÃ­a. |
| `avg_temperature`, `avg_humidity` | `pet_daily_summary.*` | Contexto ambiental promedio diario. |

### 2.5 BucketizaciÃ³n / downsampling (visualizaciÃ³n eficiente)

Para grÃ¡ficos se usan lecturas â€œbucketedâ€ (promedios por ventana):
- `avg(weight_grams)`
- `avg(temperature)`
- `avg(humidity)`
- `avg(light_percent)`

---

## Capa 3) IA / Producto (insights, alertas, predicciÃ³n)

### 3.1 SeÃ±ales â€œproductoâ€ (salida a UX / insights)

Estas variables se consumen como **mensajes**, **alertas** o **indicadores**:
- â€œBebiÃ³ menos de lo habitual (24h vs baseline 7d)â€
- â€œMicro-ingestas frecuentes (Ãºltimas 2h)â€
- â€œIngesta nocturna (00:00â€“05:00)â€
- â€œAyuno prolongado (>12h sin eventos)â€
- â€œCambio en patrÃ³n (frecuencia/rutina)â€

### 3.2 Features/IA avanzadas (diferenciaciÃ³n)

| Feature IA | Fuente | Uso |
|---|---|---|
| `dominant_frequency` | Fourier/FFT (worker analÃ­tico) | Rutina: cada cuÃ¡ntas horas come/bebe. |
| `frequency_power` | Fourier/FFT | Fuerza del patrÃ³n/rutina. |
| `anomaly_score` | Modelo/regla ML | Alertas por cambio estructural, no solo thresholds. |

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

### 3.3 OperaciÃ³n inteligente (IA aplicada a confiabilidad)

Variables operativas que habilitan alertas de continuidad:
- Bridge: `mqtt_connected`, `uptime_sec`, `cpu_temp`, `ram_used_mb`, `disk_used_pct`, `last_seen`
- Dispositivo: `device_state`, `last_seen`, `battery_level`, `wifi_status`

---

## Checklist rÃ¡pido (para mantener coherencia entre capas)

1) **Capa 1** guarda raw + timestamps + calidad (`clock_invalid`) y aplica normalizaciÃ³n.
2) **Capa 2** deriva `content`, `dt`, `delta`, sesiones y baselines; expone resÃºmenes (`daily`, `sessions`, `bucketed`).
3) **Capa 3** convierte features en **insights/alertas** + prepara FFT/anomaly scoring.

---

## ApÃ©ndice A â€” Columnas/variables por tabla (inventario prÃ¡ctico)

### `public.devices` (contexto y estado)
- Identidad: `id`, `owner_id`, `pet_id`, `device_id`, `device_type`
- Estado: `status`, `device_state`, `last_seen`, `battery_level`
- CalibraciÃ³n: `plate_weight_grams`
- OperaciÃ³n: `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`, `ip_history`, `retired_at`

### `public.readings` (streaming â€œoficialâ€)
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



