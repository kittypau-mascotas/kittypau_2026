# KittyPaw - Arquitectura de Datos, Analitica/ML e IA (v3)

> Estado actual: referencia tecnica profunda; la fuente canonica de activos/legacy/tablas/flujos es [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md).

> **Audiencia:** equipo tÃ©cnico (devs + ML engineers).
> **PropÃ³sito:** contrato de diseÃ±o entre ingestiÃ³n, backend y ML. Define quÃ© variable vive dÃ³nde, cÃ³mo fluye la data, y cÃ³mo se validan los modelos estadÃ­sticos.

---

## Ãndice

1. [VisiÃ³n general de 3 capas](#1-visiÃ³n-general-de-3-capas)
2. [Stack tÃ©cnico y flujo de datos](#2-stack-tÃ©cnico-y-flujo-de-datos)
3. [Convenciones de datos (IDs, timestamps y calidad)](#21-convenciones-de-datos-ids-timestamps-y-calidad)
4. [Gobernanza, observabilidad y SLOs](#22-gobernanza-observabilidad-y-slos)
5. [Versionado (schema, features y modelos)](#23-versionado-schema-features-y-modelos)
6. [Capa 1 â€” IngestiÃ³n y normalizaciÃ³n](#3-capa-1--ingestiÃ³n-y-normalizaciÃ³n)
7. [Capa 2 â€” Backend API y analÃ­tica](#4-capa-2--backend-api-y-analÃ­tica)
8. [Capa 3 â€” ML Engine: features, modelos e insights](#5-capa-3--ml-engine-features-modelos-e-insights)
9. [Pruebas estadÃ­sticas y validaciÃ³n de modelos](#6-pruebas-estadÃ­sticas-y-validaciÃ³n-de-modelos)
10. [Regla crÃ­tica: multi-tenant en todas las capas](#7-regla-crÃ­tica-multi-tenant)
11. [Inventario de variables por tabla](#8-inventario-de-variables-por-tabla)
12. [Checklist de coherencia entre capas](#9-checklist-de-coherencia-entre-capas)
13. [Decisiones de diseÃ±o y justificaciones](#10-decisiones-de-diseÃ±o-y-justificaciones)

---

## 1. VisiÃ³n general de 3 capas

### Diagrama de capas y responsabilidades

```mermaid
graph TD
    subgraph CAPA1["CAPA 1 â€” EDGE / IngestiÃ³n (Vercel, ~segundos)"]
        A1[Valida estructura y rangos fÃ­sicos]
        A2[Valida y normaliza timestamps]
        A3[Normaliza tipos y unidades]
        A4[CÃ¡lculos livianos: flags + log10]
        A5[Persistencia idempotente en Supabase]
        A1 --> A2 --> A3 --> A4 --> A5
    end

    subgraph CAPA2["CAPA 2 â€” Backend API (Vercel, ~ms por request)"]
        B1[AutenticaciÃ³n JWT]
        B2[AutorizaciÃ³n: owner_id en todo query]
        B3[Endpoints REST para frontend]
        B4[Derivadas por lectura: food_content_g, dt_seconds, delta]
        B5[OrquestaciÃ³n: readings + sessions + insights]
        B1 --> B2 --> B3
        B2 --> B4
        B4 --> B5
    end

    subgraph CAPA3["CAPA 3 â€” ML Engine (Python batch, 10minâ€“24h)"]
        C1[ExtracciÃ³n por pet_id + owner_id]
        C2[Feature engineering: promedios, std, frecuencia]
        C3[DetecciÃ³n de anomalÃ­as: z-score, IQR, MAD]
        C4[AnÃ¡lisis de rutinas: FFT/Fourier]
        C5[Scoring y clasificaciÃ³n de insights]
        C6[Persistencia en pet_sessions / pet_daily_summary / insights_ml]
        C1 --> C2 --> C3 --> C5
        C2 --> C4 --> C5
        C5 --> C6
    end

    A5 -->|escribe en| DB[(Supabase Postgres)]
    DB -->|lee para| C1
    C6 -->|escribe en| DB
    DB -->|expone vÃ­a| B3

    style CAPA1 fill:#e8f4f8,stroke:#2980b9
    style CAPA2 fill:#e8f8e8,stroke:#27ae60
    style CAPA3 fill:#f8f0e8,stroke:#e67e22
```

### Restricciones por capa (no negociables)

| RestricciÃ³n | Capa 1 | Capa 2 | Capa 3 |
|---|:---:|:---:|:---:|
| Stateless | âœ… | âœ… | âŒ (batch con estado) |
| Sin ML pesado | âœ… | âœ… | N/A |
| Sin joins complejos sobre historial | âœ… | âŒ (puede hacer joins) | âŒ (pipeline completo) |
| No bloquea ingestiÃ³n | â€” | âœ… | âœ… (asÃ­ncrono) |
| Multi-tenant obligatorio | âœ… | âœ… | âœ… |
| Idempotente / re-run seguro | âœ… | âœ… | âœ… |

---

## 2. Stack tÃ©cnico y flujo de datos

### Flujo completo (producciÃ³n actual)

```mermaid
flowchart TD
    IOT[Dispositivo IoT\nfood_bowl / water_bowl]
    MQTT[HiveMQ Cloud\nbroker MQTT]
    BRIDGE[Raspberry Bridge\nservicio local]
    HEARTBEATS[(bridge_heartbeats\nbridge_telemetry)]
    WEBHOOK[Vercel\nPOST /api/mqtt/webhook\nâ€” CAPA 1 â€”]
    READINGS[(public.readings\noficial app + analÃ­tica)]
    SENSOR_R[(public.sensor_readings\ncompat bridge v2.4)]
    ML[ML Worker\nPython batch]
    SESSIONS[(public.pet_sessions)]
    DAILY[(public.pet_daily_summary)]
    INSIGHTS_ML[(public.insights_ml\npropuesto)]
    API[Vercel API endpoints\nâ€” CAPA 2 â€”]
    FRONTEND[Frontend / Dashboard]

    IOT -->|MQTT publish| MQTT
    MQTT -->|suscripciÃ³n| BRIDGE
    BRIDGE -->|heartbeats periÃ³dicos| HEARTBEATS
    BRIDGE -->|HTTP POST payload| WEBHOOK
    WEBHOOK -->|upsert oficial| READINGS
    WEBHOOK -->|write v2.4 compat| SENSOR_R
    READINGS -->|batch extracciÃ³n| ML
    ML -->|write resultados| SESSIONS
    ML -->|write resultados| DAILY
    ML -->|write insights| INSIGHTS_ML
    SESSIONS -->|expone| API
    DAILY -->|expone| API
    INSIGHTS_ML -->|expone| API
    READINGS -->|expone lecturas| API
    API -->|respuestas JSON| FRONTEND

    style WEBHOOK fill:#dbeafe,stroke:#2563eb
    style API fill:#dcfce7,stroke:#16a34a
    style ML fill:#fef3c7,stroke:#d97706
```

### Decisiones de implementaciÃ³n relevantes

- **IngestiÃ³n en Vercel** (no en Supabase Edge Functions): menor cold start, mismo contrato si se migra.
- **ML Worker separado**: no bloquea ingestiÃ³n; escribe resultados en Supabase y el frontend los consume por Capa 2.
- **Supabase RLS**: backstop de seguridad â€” activo siempre, aunque Capa 2 ya filtre por `owner_id`.
- **Dos tablas de lecturas**: `readings` (oficial, UUID) y `sensor_readings` (legacy TEXT device_id, bridge v2.4).

## 2.1 Convenciones de datos (IDs, timestamps y calidad)

Esta secciÃ³n evita inconsistencias entre docs, schema SQL y cÃ³digo. Es el â€œcontrato semÃ¡nticoâ€ mÃ­nimo.

### Identificadores (canon)

| Concepto | Campo | DÃ³nde vive | Regla |
|---|---|---|---|
| Usuario dueÃ±o (tenant) | `owner_id` | `public.devices`, derivadas (`pet_sessions`, `pet_daily_summary`, `insights_ml`) | Todo query â€œde usuarioâ€ filtra por `owner_id` (RLS + backend). |
| Dispositivo (ID interno) | `devices.id` (UUID) | `public.devices` | Clave tÃ©cnica para joins y FK. |
| Dispositivo (cÃ³digo humano) | `devices.device_id` (TEXT, ej. `KPCL0001`) | `public.devices` | Se usa en UI, QR y trazabilidad humana. Ãšnico. |
| Lecturas â€œoficialesâ€ | `readings.device_id` (UUID) | `public.readings` | FK a `public.devices(id)`. **No** es el cÃ³digo KPCL. |
| Lecturas legacy bridge v2.4 | `sensor_readings.device_id` (TEXT KPCL) | `public.sensor_readings` | Compatibilidad: si existe, se normaliza a `devices.id` en procesos de consolidaciÃ³n. |
| Mascota (fuente de verdad) | `pets.id` (UUID) | `public.pets` | `devices.pet_id` es obligatorio; `readings.pet_id` es snapshot opcional. |

### Timestamps y â€œcalidad de relojâ€

- `recorded_at` (DB): timestamp reportado por el dispositivo/bridge (o derivado desde payload).
- `ingested_at` (DB): timestamp del servidor al persistir.
- `clock_invalid` (DB): se marca cuando el timestamp del payload es inconsistente (desfase, retroceso, valor imposible).
- Canon para series temporales: usar `effective_ts`:
  - `effective_ts = CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END`

### Idempotencia y deduplicaciÃ³n

- La llave de idempotencia de lecturas es `(device_id, recorded_at)` en `public.readings` (Ãºnico / upsert).
- En Capa 1, un â€œreintentoâ€ debe convertirse en upsert, no en inserciÃ³n duplicada.

### Estado â€œimplementado vs propuestoâ€ (importante)

- Implementado en `Docs/SQL_SCHEMA.sql`: `devices`, `readings`, `sensor_readings`, `bridge_heartbeats`, `bridge_telemetry`, RLS base.
- Propuesto / futuro cercano: `public.insights_ml` y tablas/eventos derivados (ej. `intake_events`).
- Transformaciones `*_log` (`log10(x+1)`) se recomiendan, pero **no estÃ¡n** en el schema base actual: preferir vistas/derivadas o agregar columnas vÃ­a migraciÃ³n cuando sea necesario.

## 2.2 Gobernanza, observabilidad y SLOs

### Gobernanza (mÃ­nimo viable)

- **RLS como backstop**: `public.devices` y `public.readings` con polÃ­ticas por `owner_id`.
- **Service role solo server-side**: la ingesta (webhook) escribe con credenciales server-only.
- **Auditabilidad**: eventos crÃ­ticos en `public.audit_events` (server-only).

### Observabilidad (quÃ© medir)

- Webhook (`/api/mqtt/webhook`): latencia p50/p95, tasa de error, tasa de duplicados (upserts), tasa de rechazos por validaciÃ³n.
- Bridge: frescura de `bridge_heartbeats`/`bridge_telemetry`, `mqtt_connected`, `last_mqtt_at`, recursos (RAM/disk/temp).
- Datos: frescura por dispositivo (`now - latest_readings.recorded_at/ingested_at`), missing rate por sensor, monotonicidad temporal.

### SLOs sugeridos (ajustables)

- Frescura dashboard: `effective_ts` de la Ãºltima lectura por dispositivo < **2 min** (p95).
- Latencia de ingesta: payload â†’ persistencia < **10 s** (p95).
- Completitud mÃ­nima para analÃ­tica diaria: missing rate por variable < **10%**.

## 2.3 Versionado (schema, features y modelos)

- **Schema**: cambios solo por migraciones (ver guÃ­as SQL del repo). Cada migraciÃ³n documenta impacto en Capa 1/2/3.
- **Contrato de payload**: incluir `payload_version` (ej. `v1`) cuando el bridge evoluciona campos/unidades.
- **Tablas derivadas / insights**: persistir `algorithm_version` y/o `model_version` en cada fila, mÃ¡s `created_at`.
- **Backfills**: todo batch/worker debe ser re-ejecutable (upsert + ventanas determinÃ­sticas).

---

## 3. Capa 1 â€” IngestiÃ³n y normalizaciÃ³n

### Flujo interno del webhook

```mermaid
flowchart TD
    RECV[Recibe payload HTTP POST\ndel Raspberry Bridge]
    V1{Â¿device_id existe\ny es formato KPCL????}
    V2{Â¿Campos requeridos\npresentes?}
    V3{Â¿Valores en rangos\nfÃ­sicos vÃ¡lidos?}
    V4{Â¿DesvÃ­o timestamp\n> umbral?}
    N1[Normaliza tipos:\nstring â†’ number\nUnidades homogÃ©neas\nISO 8601 UTC]
    CALC[CÃ¡lculos livianos:\nclock_invalid flag\nlog10 de variables sesgadas]
    UPSERT[Upsert idempotente\nLlave: device_id + recorded_at]
    ERR_400[HTTP 400\nlog + descarta]
    ERR_422[HTTP 422\nlog + descarta]

    RECV --> V1
    V1 -->|No| ERR_400
    V1 -->|SÃ­| V2
    V2 -->|No| ERR_400
    V2 -->|SÃ­| V3
    V3 -->|No| ERR_422
    V3 -->|SÃ­| V4
    V4 -->|SÃ­: clock_invalid=true| N1
    V4 -->|No| N1
    N1 --> CALC
    CALC --> UPSERT

    style ERR_400 fill:#fee2e2,stroke:#dc2626
    style ERR_422 fill:#fee2e2,stroke:#dc2626
    style UPSERT fill:#dcfce7,stroke:#16a34a
```

### Variables de identidad y llaves

| Variable | Tabla.Campo | Tipo | Rol |
|---|---|---|---|
| `devices.id` | `public.devices.id` | UUID PK | FK principal â€” todas las lecturas referencian este campo |
| `devices.device_id` | `public.devices.device_id` | TEXT (KPCL0000) | ID humano/UI y contrato IoT |
| `readings.device_id` | `public.readings.device_id` | UUID FK | Lecturas oficiales â†’ referencia `devices.id` |
| `readings.pet_id` | `public.readings.pet_id` | UUID | Snapshot desnormalizado (no fuente de verdad) |
| `devices.pet_id` | `public.devices.pet_id` | UUID FK | **Fuente de verdad** del vÃ­nculo dispositivo â†’ mascota |
| `profiles.id` | `public.profiles.id` | UUID | Owner â€” base del aislamiento multi-tenant |

> âš ï¸ Si hay discrepancia entre `readings.pet_id` y `devices.pet_id`, siempre usar `devices.pet_id`.

### Variables de tiempo

| Variable | Fuente | CuÃ¡ndo usar |
|---|---|---|
| `recorded_at` | `public.readings` | Series temporales cuando `clock_invalid = false` |
| `ingested_at` | `public.readings` | Fuente de verdad cuando `clock_invalid = true` |
| `clock_invalid` | `public.readings` | BifurcaciÃ³n de queries de series temporales |
| `device_timestamp` | `public.sensor_readings` | Solo compat legacy bridge v2.4 |
| `last_seen` | `public.devices` | DetecciÃ³n de dispositivos offline |
| `bridge_heartbeats.last_seen` | `public.bridge_heartbeats` | Observabilidad del bridge |
| `bridge_heartbeats.last_mqtt_at` | `public.bridge_heartbeats` | DiagnÃ³stico de salud MQTT |

**Regla de bifurcaciÃ³n de timestamp:**
```sql
-- En todos los queries de series temporales:
CASE
  WHEN clock_invalid = true THEN ingested_at
  ELSE recorded_at
END AS effective_ts
```

### Variables de sensores y rangos vÃ¡lidos

| Variable | Tabla | Tipo | Unidad | Rango vÃ¡lido | TransformaciÃ³n log |
|---|---|---|---|---|---|
| `weight_grams` | `readings` | numeric | g | 0 â€“ 5000 | `log10(weight_grams + 1)` |
| `water_ml` | `readings` | numeric | ml | 0 â€“ 2000 | `log10(water_ml + 1)` |
| `flow_rate` | `readings` | numeric | ml/s | 0 â€“ 100 | `log10(flow_rate + 1)` |
| `temperature` | `readings` | numeric | Â°C | -10 â€“ 60 | No aplica |
| `humidity` | `readings` | numeric | % | 0 â€“ 100 | No aplica |
| `light_lux` | `readings` | numeric | lux | 0 â€“ 100000 | `log10(light_lux + 1)` |
| `light_percent` | `readings` | numeric | % | 0 â€“ 100 | No aplica |
| `light_condition` | `readings` | text | â€” | `dark/dim/bright` | N/A |
| `battery_level` | `readings` | numeric | % | 0 â€“ 100 | No aplica |

**JustificaciÃ³n de `log10(x + 1)`:** las variables de consumo tienen distribuciones fuertemente sesgadas a la derecha (muchas lecturas en 0 o valores bajos, colas largas). La transformaciÃ³n log estabiliza la varianza y mejora el rendimiento de z-score, IQR y modelos de regresiÃ³n.

```
DistribuciÃ³n raw de weight_grams:
  â”‚â–“â–“â–“â–“â–“â–“â–“â–“â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘
  â”‚â–“â–“â–“â–“â–“â–“â–“â–“â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘
  â”‚â–“â–“â–“â–“â–“â–“â–“â–“â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘
  0    500   1000  2000  5000

DistribuciÃ³n log10(weight_grams + 1):
  â”‚  â–“â–“â–“â–“â–“â–“â–“â–“â–“â–‘â–‘
  â”‚â–‘â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–‘
  â”‚â–‘â–‘â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–“â–‘â–‘
  0   0.5   1.0  1.5  2.0  2.5  3.0  3.5
```

### Variables de contexto del dispositivo

| Variable | Tabla | Uso en Capa 1 |
|---|---|---|
| `plate_weight_grams` | `devices` | Tara â€” permite calcular `food_content_g` en Capa 2 |
| `device_type` | `devices` | `food_bowl`/`water_bowl` â€” determina sensores relevantes |
| `device_state` | `devices` | Rechazar lecturas de dispositivos no en estado `linked` |
| `status` | `devices` | Rechazar lecturas de dispositivos `inactive/maintenance` |
| `sensor_health` | `devices` | Flag de calidad adicional en la lectura |

---

## 4. Capa 2 â€” Backend API y analÃ­tica

### Flujo de un request de frontend

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Vercel API (Capa 2)
    participant DB as Supabase Postgres
    participant ML_TABLE as pet_sessions / insights_ml

    FE->>API: GET /pets/:id/dashboard\n(Authorization: Bearer JWT)
    API->>API: Valida JWT (Supabase Auth)
    API->>API: Extrae owner_id del JWT
    API->>DB: SELECT readings WHERE device_id IN\n(SELECT id FROM devices WHERE owner_id = $owner_id)
    DB-->>API: Lecturas recientes
    API->>ML_TABLE: SELECT * FROM pet_sessions\nWHERE pet_id = $pet_id AND owner_id = $owner_id
    ML_TABLE-->>API: Sesiones analÃ­ticas
    API->>API: Calcula food_content_g, dt_seconds, delta_content_g
    API->>API: Bucketiza lecturas para grÃ¡ficos
    API->>API: Combina readings + sessions + insights
    API-->>FE: JSON unificado con telemetrÃ­a + analÃ­tica
```

### Endpoints expuestos

| Endpoint | DescripciÃ³n | Variables principales |
|---|---|---|
| `GET /pets` | Mascotas del usuario | `pets.id`, `name`, `species`, `weight_kg` |
| `GET /pets/:id/devices` | Dispositivos de una mascota | `device_id`, `device_type`, `status`, `last_seen` |
| `GET /pets/:id/readings` | Lecturas recientes (raw o bucketizadas) | `weight_grams`, `water_ml`, `temperature`, `recorded_at` |
| `GET /pets/:id/sessions` | Sesiones analÃ­ticas (de Capa 3) | `session_type`, `grams_consumed`, `duration_sec`, `anomaly_score` |
| `GET /pets/:id/summary` | Resumen diario/semanal | `total_food_grams`, `total_water_ml`, `anomaly_count` |
| `GET /pets/:id/insights` | Insights ML (propuesto) | `insight_type`, `severity`, `message`, `context` |

### Variables derivadas (calculadas en Capa 2, no persistidas)

| Variable | FÃ³rmula SQL | DescripciÃ³n |
|---|---|---|
| `food_content_g` | `GREATEST(0, weight_grams - plate_weight_grams)` | Contenido real (descuenta tara) |
| `water_content_cm3` | `water_ml` | Contenido real de agua |
| `dt_seconds` | `EXTRACT(EPOCH FROM recorded_at - LAG(recorded_at) OVER (ORDER BY recorded_at))` | Intervalo entre lecturas |
| `delta_content_g` | `food_content_g - LAG(food_content_g) OVER (ORDER BY recorded_at)` | Cambio de contenido (negativo = consumo, positivo = recarga) |
| `rate_g_per_min` | `ABS(delta_content_g) / NULLIF(dt_seconds / 60.0, 0)` | Intensidad de ingesta |

### BucketizaciÃ³n para grÃ¡ficos

```sql
-- Lecturas bucketizadas por hora (Ãºltimos 7 dÃ­as)
SELECT
  DATE_TRUNC('hour', CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END) AS bucket,
  AVG(weight_grams)   AS avg_weight,
  AVG(temperature)    AS avg_temperature,
  AVG(humidity)       AS avg_humidity,
  AVG(light_percent)  AS avg_light
FROM readings
WHERE device_id IN (
  SELECT id FROM devices WHERE owner_id = $owner_id
)
AND CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END
    >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

### Ventanas temporales estÃ¡ndar

```
1h   â†’ estado en vivo / alertas inmediatas
6h   â†’ micro-tendencias del dÃ­a
24h  â†’ resumen diario
7d   â†’ baseline de referencia semanal
30d  â†’ tendencias mensuales / contexto veterinario

Comparaciones estÃ¡ndar:
  "hoy vs promedio_7d"
  "Ãºltimas_24h vs baseline_grams de pet_sessions"
  "frecuencia_sesiones_esta_semana vs semana_anterior"
```

---

## 5. Capa 3 â€” ML Engine: features, modelos e insights

### Pipeline completo del ML Worker

```mermaid
flowchart TD
    SCHED[Scheduler\n10min / 1h / 24h]

    subgraph EXTRACT["1. ExtracciÃ³n (por pet_id + owner_id)"]
        E1[Lecturas 24h: detectar sesiones nuevas]
        E2[Lecturas 7d: baseline semanal]
        E3[Lecturas 30d: tendencias largas]
    end

    subgraph FEATURE["2. Feature Engineering"]
        F1[Promedios y medianas por ventana]
        F2[Frecuencia de eventos por hora del dÃ­a]
        F3[dt_seconds entre eventos]
        F4[DesviaciÃ³n estÃ¡ndar de consumo]
        F5[Baseline personal: media mÃ³vil 7d/30d]
        F6[TransformaciÃ³n log10: variables sesgadas]
    end

    subgraph MODELS["3. Modelos"]
        M1[SegmentaciÃ³n de sesiones\nthreshold + gap temporal]
        M2[DetecciÃ³n de anomalÃ­as\nz-score / IQR / MAD]
        M3[AnÃ¡lisis de rutinas\nFFT / Fourier]
        M4[Scoring de anomalÃ­as\ncontinuo 0â€“1]
    end

    subgraph INSIGHTS["4. GeneraciÃ³n de Insights"]
        I1[Clasifica tipo: hidrataciÃ³n / ayuno /\nmicro-ingesta / cambio de patrÃ³n / nocturna]
        I2[Asigna severidad: info / warning / alert]
        I3[Genera mensaje legible por usuario]
        I4[Adjunta contexto JSON: mÃ©tricas de soporte]
    end

    subgraph PERSIST["5. Persistencia (upsert)"]
        P1[(public.pet_sessions)]
        P2[(public.pet_daily_summary)]
        P3[(public.insights_ml)]
    end

    SCHED --> EXTRACT
    EXTRACT --> FEATURE
    FEATURE --> MODELS
    MODELS --> INSIGHTS
    INSIGHTS --> PERSIST

    style EXTRACT fill:#eff6ff,stroke:#3b82f6
    style FEATURE fill:#f0fdf4,stroke:#22c55e
    style MODELS fill:#fefce8,stroke:#eab308
    style INSIGHTS fill:#fff7ed,stroke:#f97316
    style PERSIST fill:#fdf4ff,stroke:#a855f7
```

### Feature engineering: detalle de variables

| Feature | Ventana | FÃ³rmula | Uso en modelo |
|---|---|---|---|
| `mean_food_g` | 7d | `AVG(food_content_g)` | Baseline de comparaciÃ³n |
| `std_food_g` | 7d | `STDDEV(food_content_g)` | Denominador de z-score |
| `median_food_g` | 7d | `PERCENTILE_CONT(0.5)` | Baseline robusto a outliers |
| `mad_food_g` | 7d | `MEDIAN(ABS(x - MEDIAN(x)))` | Denominador de MAD-score |
| `session_count_daily` | 24h | `COUNT(sessions)` | Frecuencia de ingestas |
| `mean_dt_seconds` | 7d | `AVG(dt_seconds)` | Ritmo de alimentaciÃ³n |
| `dominant_freq_hz` | 7d | `argmax(FFT(event_ts))` | PerÃ­odo predominante de rutina |
| `frequency_power` | 7d | `max(FFT_magnitude)` | Regularidad de la rutina |
| `anomaly_score_z` | â€” | z-score sobre `food_content_g` | Score de anomalÃ­a por z |
| `anomaly_score_mad` | â€” | MAD-score sobre `food_content_g` | Score robusto a outliers |

### Variables de sesiones (`public.pet_sessions`)

| Variable | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | UUID PK | â€” |
| `pet_id` | UUID FK | Referencia a la mascota |
| `owner_id` | UUID FK | Multi-tenant: owner de la mascota |
| `session_type` | text | `food` / `water` / `other` |
| `session_start` | timestamptz | Inicio detectado |
| `session_end` | timestamptz | Fin detectado |
| `duration_sec` | numeric | DuraciÃ³n total |
| `grams_consumed` | numeric | EstimaciÃ³n de consumo de comida |
| `water_ml` | numeric | EstimaciÃ³n de consumo de agua |
| `classification` | text | `micro_ingesta` / `normal` / `ayuno` / `recarga` |
| `baseline_grams` | numeric | Baseline personal al momento de la sesiÃ³n |
| `anomaly_score` | numeric | Score continuo 0â€“1 |
| `avg_temperature` | numeric | Temperatura promedio durante sesiÃ³n |
| `avg_humidity` | numeric | Humedad promedio durante sesiÃ³n |

### Variables de resumen diario (`public.pet_daily_summary`)

| Variable | Tipo | DescripciÃ³n |
|---|---|---|
| `id` | UUID PK | â€” |
| `pet_id` | UUID FK | â€” |
| `owner_id` | UUID FK | Multi-tenant |
| `summary_date` | date | Fecha del resumen |
| `total_food_grams` | numeric | Total comida consumida |
| `food_sessions` | integer | NÃºmero de sesiones de comida |
| `total_water_ml` | numeric | Total agua consumida |
| `water_sessions` | integer | NÃºmero de sesiones de agua |
| `anomaly_count` | integer | AnomalÃ­as detectadas en el dÃ­a |
| `skipped_meals` | integer | Comidas omitidas vs rutina esperada |
| `first_session_at` | timestamptz | Primera actividad del dÃ­a |
| `last_session_at` | timestamptz | Ãšltima actividad del dÃ­a |
| `avg_temperature` | numeric | Temperatura promedio |
| `avg_humidity` | numeric | Humedad promedio |

### Schema propuesto: `public.insights_ml`

```sql
CREATE TABLE public.insights_ml (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID NOT NULL REFERENCES pets(id),
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  insight_type    TEXT NOT NULL,        -- 'hydration_low' | 'fasting' | 'micro_ingesta' | 'pattern_change' | 'nocturnal'
  severity        TEXT NOT NULL,        -- 'info' | 'warning' | 'alert'
  message         TEXT NOT NULL,        -- Texto legible por el usuario
  context         JSONB,                -- MÃ©tricas de soporte: {actual, baseline, delta_pct, window}
  period_start    TIMESTAMPTZ,          -- Inicio del perÃ­odo analizado
  period_end      TIMESTAMPTZ,          -- Fin del perÃ­odo analizado
  dismissed_at    TIMESTAMPTZ,          -- NULL = activo, NOT NULL = descartado por usuario
  model_version   TEXT                  -- VersiÃ³n del worker que generÃ³ el insight
);

-- RLS obligatorio
ALTER TABLE public.insights_ml ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON public.insights_ml
  USING (owner_id = auth.uid());
```

---

## 6. Pruebas estadÃ­sticas y validaciÃ³n de modelos

Esta secciÃ³n documenta los tests estadÃ­sticos que el ML Worker debe ejecutar y cÃ³mo interpretar sus resultados.

---

### 6.1 DetecciÃ³n de anomalÃ­as: z-score vs IQR vs MAD

Los tres mÃ©todos se aplican en paralelo sobre las mismas variables. El `anomaly_score` final es el promedio ponderado de los tres scores normalizados.

```
MÃ‰TODO 1: Z-SCORE (sensible a outliers extremos)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  z = (x - Î¼) / Ïƒ

  DistribuciÃ³n de referencia (7d):
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚                    â•­â”€â”€â”€â”€â”€â•®                           â”‚
  â”‚                 â•­â”€â”€â•¯     â•°â”€â”€â•®                        â”‚
  â”‚              â•­â”€â”€â•¯           â•°â”€â”€â•®                     â”‚
  â”‚           â•­â”€â”€â•¯                 â•°â”€â”€â•®                  â”‚
  â”‚        â•­â”€â”€â•¯                       â•°â”€â”€â•®               â”‚
  â”‚     â•­â”€â”€â•¯                             â•°â”€â”€â•®            â”‚
  â”‚  â•­â”€â”€â•¯                                   â•°â”€â”€â•®         â”‚
  â”‚â”€â”€â•¯â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•°â”€â”€       â”‚
  â”‚  -3Ïƒ  -2Ïƒ  -1Ïƒ   Î¼   +1Ïƒ  +2Ïƒ  +3Ïƒ                  â”‚
  â”‚                                                      â”‚
  â”‚  Umbral anomalÃ­a:  |z| > 2.5  â†’ score proporcional   â”‚
  â”‚  Umbral alerta:    |z| > 3.0  â†’ severity = alert      â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  âš ï¸ LimitaciÃ³n: Î¼ y Ïƒ son muy sensibles a outliers previos.
     Usar SOLO si el historial estÃ¡ limpio o se filtran outliers previos.


MÃ‰TODO 2: IQR (robusto, recomendado como baseline)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Q1 = percentil 25, Q3 = percentil 75
  IQR = Q3 - Q1
  LÃ­mites: [Q1 - 1.5*IQR,  Q3 + 1.5*IQR]

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚                                                      â”‚
  â”‚  [â”€â”€outliersâ”€â”€]â”‚â”€â”€whiskerâ”€â”€â”¤ Q1 â”‚â”€medianâ”€â”‚ Q3 â”œâ”€â”€whiskerâ”€â”€â”‚[â”€â”€outliersâ”€â”€] â”‚
  â”‚                                                      â”‚
  â”‚  Ejemplo con datos de comida (7 dÃ­as):               â”‚
  â”‚                                                      â”‚
  â”‚  Q1=42g  median=58g  Q3=74g  IQR=32g                 â”‚
  â”‚  LÃ­mite inferior: 42 - 48 = -6  â†’ clamp a 0g         â”‚
  â”‚  LÃ­mite superior: 74 + 48 = 122g                     â”‚
  â”‚                                                      â”‚
  â”‚  Lectura actual: 8g â†’ estÃ¡ FUERA del lÃ­mite inferior  â”‚
  â”‚  â†’ score IQR = (Q1 - 8) / IQR = (42-8)/32 = 1.06    â”‚
  â”‚  â†’ clamp a 1.0  â†’ severity = warning                 â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜


MÃ‰TODO 3: MAD-SCORE (mÃ¡s robusto que z-score, mejor para series cortas)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  MAD = median(|xi - median(x)|)
  score_MAD = 0.6745 * (x - median) / MAD

  El factor 0.6745 = 1/Î¦â»Â¹(0.75) hace que MAD-score â‰ˆ z-score
  bajo normalidad, pero es mucho mÃ¡s robusto en presencia de outliers.

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  ComparaciÃ³n z-score vs MAD-score con outlier:        â”‚
  â”‚                                                      â”‚
  â”‚  Datos: [50, 52, 48, 51, 49, 300]  (300 = outlier)   â”‚
  â”‚                                                      â”‚
  â”‚  z-score de 49:                                      â”‚
  â”‚    Î¼ = 91.7,  Ïƒ = 103.4                              â”‚
  â”‚    z = (49 - 91.7) / 103.4 = -0.41 â†’ parece normal   â”‚
  â”‚    â† z-score "contamina" su propio baseline          â”‚
  â”‚                                                      â”‚
  â”‚  MAD-score de 49:                                    â”‚
  â”‚    median = 50.5,  MAD = 1.5                         â”‚
  â”‚    score = 0.6745 * (49 - 50.5) / 1.5 = -0.67       â”‚
  â”‚    â† MAD preserva la escala real de la distribuciÃ³n  â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜


SCORE FINAL COMBINADO
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  anomaly_score = 0.3 * score_z_norm + 0.4 * score_iqr_norm + 0.3 * score_mad_norm
  (todos normalizados a [0, 1] antes de combinar)

  Umbral de acciÃ³n:
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  0.0 â”€â”€â”€â”€ 0.4 â”€â”€â”€â”€â”€â”€â”€â”€ 0.7 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 1.0      â”‚
  â”‚  â”‚        â”‚            â”‚                 â”‚         â”‚
  â”‚  normal   info         warning           alert     â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

### 6.2 Prueba de normalidad (pre-requisito para z-score)

Antes de aplicar z-score, verificar si la distribuciÃ³n del historial es aproximadamente normal. Si no lo es, usar MAD-score o IQR exclusivamente.

```
TEST DE SHAPIRO-WILK (recomendado para n < 50)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Hâ‚€: los datos provienen de una distribuciÃ³n normal
  Hâ‚: los datos NO son normales

  ImplementaciÃ³n Python:
    from scipy.stats import shapiro
    stat, p_value = shapiro(food_data_7d)
    is_normal = p_value > 0.05

  InterpretaciÃ³n:
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  p-value > 0.05  â†’ No rechazamos Hâ‚€ â†’ usar z-score   â”‚
  â”‚  p-value â‰¤ 0.05  â†’ Rechazamos Hâ‚€   â†’ usar MAD / IQR  â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  Ejemplo visual de Q-Q plot (cuantil-cuantil):

  Si normal:              Si NO normal (sesgado):
  Cuantiles teÃ³ricos      Cuantiles teÃ³ricos
      â†‘                       â†‘
    3 â”‚      â•±               3 â”‚        â•±â•±
    2 â”‚    â•±                 2 â”‚      â•±â•±
    1 â”‚  â•±                   1 â”‚   â•±â•±
    0 â”‚â•±                     0 â”‚â•±â•±
   -1 â”‚                     -1 â”‚
      â””â”€â”€â”€â”€â†’                   â””â”€â”€â”€â”€â†’
      Cuantiles observados    Cuantiles observados
      (puntos sobre la lÃ­nea) (curva â†’ no normal)
```

---

### 6.3 AnÃ¡lisis de rutinas: FFT / Fourier

```
OBJETIVO: detectar si la mascota tiene una rutina periÃ³dica de alimentaciÃ³n
y cuÃ¡l es su perÃ­odo dominante (ej: cada 8h, cada 12h).

ENTRADA: serie temporal de eventos de sesiÃ³n (timestamps)
PROCESO:
  1. Convertir timestamps a seÃ±al de presencia binaria por bucket (ej: 30min)
  2. Aplicar FFT sobre la seÃ±al
  3. Identificar la frecuencia de mayor magnitud (dominant_frequency)
  4. Calcular el perÃ­odo = 1 / dominant_frequency

VISUALIZACIÃ“N DE MAGNITUDES FFT:
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Magnitud
    â”‚
  5 â”‚          â–ˆâ–ˆâ–ˆâ–ˆ
  4 â”‚          â–ˆâ–ˆâ–ˆâ–ˆ
  3 â”‚     â–ˆâ–ˆ   â–ˆâ–ˆâ–ˆâ–ˆ   â–ˆâ–ˆ
  2 â”‚     â–ˆâ–ˆ   â–ˆâ–ˆâ–ˆâ–ˆ   â–ˆâ–ˆ   â–ˆâ–ˆ
  1 â”‚  â–ˆâ–ˆ â–ˆâ–ˆ   â–ˆâ–ˆâ–ˆâ–ˆ   â–ˆâ–ˆ   â–ˆâ–ˆ  â–ˆâ–ˆ
    â””â”€â”€â”¬â”€â”€â”¬â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”¬â”€â”€â”¬â”€â”€â”€â”¬â”€â”€â”€â”¬â”€â”€â†’ Frecuencia (ciclos/hora)
       0.04  0.125  0.25  0.5  1.0

  Pico en 0.125 ciclos/hora â†’ perÃ­odo = 8h â†’ rutina cada 8 horas âœ“

INTERPRETACIÃ“N DE dominant_frequency:
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  dominant_frequency  â”‚  PerÃ­odo  â”‚  InterpretaciÃ³n        â”‚
  â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
  â”‚  0.083 ciclos/h      â”‚  ~12h     â”‚  Rutina 2x al dÃ­a      â”‚
  â”‚  0.125 ciclos/h      â”‚  ~8h      â”‚  Rutina 3x al dÃ­a âœ“    â”‚
  â”‚  0.167 ciclos/h      â”‚  ~6h      â”‚  Rutina 4x al dÃ­a      â”‚
  â”‚  0.500 ciclos/h      â”‚  ~2h      â”‚  Micro-ingestas         â”‚
  â”‚  < 0.05 ciclos/h     â”‚  > 20h    â”‚  Sin rutina clara       â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

frequency_power: magnitud del pico dominante (normalizada 0â€“1)
  > 0.7 â†’ rutina muy estable
  0.4â€“0.7 â†’ rutina moderada
  < 0.4 â†’ sin rutina o rutina muy irregular

CÃ³digo de referencia (Python):
  import numpy as np

  def compute_fft_rutina(event_timestamps, bucket_minutes=30, window_days=7):
      # 1. Crear seÃ±al binaria
      n_buckets = window_days * 24 * (60 // bucket_minutes)
      signal = np.zeros(n_buckets)
      for ts in event_timestamps:
          idx = int((ts - window_start).total_seconds() / (bucket_minutes * 60))
          if 0 <= idx < n_buckets:
              signal[idx] = 1

      # 2. FFT
      fft_result = np.fft.rfft(signal)
      magnitudes = np.abs(fft_result)
      freqs = np.fft.rfftfreq(n_buckets, d=bucket_minutes/60)  # ciclos/hora

      # 3. Ignorar componente DC (freq=0)
      magnitudes[0] = 0

      # 4. Resultado
      dominant_idx = np.argmax(magnitudes)
      return {
          "dominant_frequency": freqs[dominant_idx],
          "frequency_power": magnitudes[dominant_idx] / magnitudes.sum(),
          "period_hours": 1 / freqs[dominant_idx] if freqs[dominant_idx] > 0 else None
      }
```

---

### 6.4 Prueba de cambio de patrÃ³n: Mann-Whitney U / Kolmogorov-Smirnov

Cuando `anomaly_score` es alto, verificar si hay un cambio real en la distribuciÃ³n de consumo entre dos perÃ­odos.

```
TEST DE MANN-WHITNEY U (no paramÃ©trico, no asume normalidad)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Hâ‚€: las dos muestras provienen de la misma distribuciÃ³n
  Hâ‚: hay una diferencia significativa entre los perÃ­odos

  Uso: comparar consumo de los Ãºltimas 3 dÃ­as vs baseline de 7-30 dÃ­as previos

  from scipy.stats import mannwhitneyu
  stat, p_value = mannwhitneyu(recent_3d, baseline_7d, alternative='two-sided')
  pattern_changed = p_value < 0.05

  VisualizaciÃ³n:
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Baseline 7d:    â”¤â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”œâ”‚
  â”‚  Ãšltimos 3d:              â”¤â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤  â”‚
  â”‚                                                          â”‚
  â”‚  Sin cambio (p > 0.05):   Cambio detectado (p â‰¤ 0.05):  â”‚
  â”‚  Baseline: â”¤â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”œ   Baseline: â”¤â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”œ  â”‚
  â”‚  Reciente: â”¤â”€â”€â”€â”€â”€â”€â”€â”œ    Reciente:             â”¤â”€â”€â”€â”€â”€â”€â”œ  â”‚
  â”‚  (solapan bien)          (distribuciones separadas)      â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜


TEST DE KOLMOGOROV-SMIRNOV (detecta diferencias en forma, no solo media)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Hâ‚€: las dos muestras tienen la misma distribuciÃ³n
  Hâ‚: las distribuciones difieren

  from scipy.stats import ks_2samp
  stat, p_value = ks_2samp(recent_3d, baseline_7d)
  distribution_changed = p_value < 0.05

  EstadÃ­stico KS = distancia mÃ¡xima entre CDFs acumuladas:

  CDF  1.0 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
       0.8 â”€            â•±â”€â”€â”€â”€â”€â”€â”€ baseline
       0.6 â”€         â•±â”€â”€     reciente â”€â”€â”€â”€â”€â•²
       0.4 â”€      â•±â”€â”€          â•²
       0.2 â”€   â•±â”€â”€              â•²
       0.0 â”€â•±â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
              0   20  40  60  80  100g

             â†‘â”€â”€â”€â”€ KS stat = distancia mÃ¡xima â”€â”€â”€â”€â†‘
             Si KS stat es grande y p â‰¤ 0.05 â†’ cambio detectado
```

---

### 6.5 ValidaciÃ³n de modelos: mÃ©tricas de evaluaciÃ³n

El ML Worker debe loguear estas mÃ©tricas en cada ciclo batch para monitoreo de calidad.

```
MÃ‰TRICAS DE DETECCIÃ“N DE ANOMALÃAS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  (Requiere un set de ground truth etiquetado manualmente o por veterinario)

  Precision = TP / (TP + FP)
    â†’ Â¿QuÃ© fracciÃ³n de las anomalÃ­as alertadas eran reales?
    â†’ Objetivo: Precision > 0.80 (evitar falsos positivos que generen fatiga de alertas)

  Recall = TP / (TP + FN)
    â†’ Â¿QuÃ© fracciÃ³n de las anomalÃ­as reales fueron detectadas?
    â†’ Objetivo: Recall > 0.70 (no perder eventos importantes)

  F1 = 2 * (Precision * Recall) / (Precision + Recall)
    â†’ Balance entre precision y recall
    â†’ Objetivo: F1 > 0.75

  Matriz de confusiÃ³n esperada:
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚                  Predicho                   â”‚
  â”‚              Normal    AnomalÃ­a             â”‚
  â”‚  Real Normal â”‚  TN   â”‚   FP  â”‚              â”‚
  â”‚  Real Anomal â”‚  FN   â”‚   TP  â”‚              â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

MÃ‰TRICAS DE DETECCIÃ“N DE RUTINAS (FFT)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  MAE del perÃ­odo detectado vs perÃ­odo real:
    MAE = mean(|perÃ­odo_detectado - perÃ­odo_real|) en horas
    Objetivo: MAE < 1.5h

  Estabilidad del score: coeficiente de variaciÃ³n entre runs consecutivos
    CV = std(frequency_power_Ãºltimos_7_runs) / mean(...)
    Objetivo: CV < 0.15 (score estable)

MONITOREO DE DRIFT (data drift en producciÃ³n)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Population Stability Index (PSI) â€” detecta si la distribuciÃ³n
  de los features cambiÃ³ respecto al perÃ­odo de entrenamiento:

  PSI = Î£ (actual% - esperado%) * ln(actual% / esperado%)

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  PSI < 0.10   â†’ Sin drift         â”‚
  â”‚  0.10â€“0.25    â†’ Monitorear        â”‚
  â”‚  PSI > 0.25   â†’ Reentrenar modelo â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  Aplicar PSI sobre: food_content_g, water_ml, dt_seconds (cada semana)
```

---

### 6.6 SeÃ±ales producto: condiciones, umbrales y severidades

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  INSIGHT TYPE       â”‚ CONDICIÃ“N                           â”‚ SEVERIDAD â”‚ MENSAJE  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ hydration_low       â”‚ total_water_ml_24h <                â”‚ warning   â”‚ "BebiÃ³   â”‚
â”‚                     â”‚ 0.7 * baseline_water_ml_7d          â”‚           â”‚ menos    â”‚
â”‚                     â”‚                                     â”‚           â”‚ agua que â”‚
â”‚                     â”‚                                     â”‚           â”‚ lo usual"â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ micro_ingesta       â”‚ food_sessions > 2 * baseline_sess   â”‚ info      â”‚ "Micro-  â”‚
â”‚                     â”‚ AND AVG(duration_sec) < 60          â”‚           â”‚ ingestas â”‚
â”‚                     â”‚                                     â”‚           â”‚ detecta- â”‚
â”‚                     â”‚                                     â”‚           â”‚ das"     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ fasting_prolonged   â”‚ tiempo_sin_sesion > 12 * 3600       â”‚ alert     â”‚ "Sin     â”‚
â”‚                     â”‚                                     â”‚           â”‚ actividadâ”‚
â”‚                     â”‚                                     â”‚           â”‚ >12h"    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ nocturnal_activity  â”‚ session_start BETWEEN               â”‚ info      â”‚ "Activi- â”‚
â”‚                     â”‚ '00:00' AND '05:00'                 â”‚           â”‚ dad noc- â”‚
â”‚                     â”‚                                     â”‚           â”‚ turna"   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ pattern_change      â”‚ anomaly_score > 0.7 AND             â”‚ alert     â”‚ "Cambio  â”‚
â”‚                     â”‚ mannwhitney_p < 0.05 (3d vs 7d)     â”‚           â”‚ signifi- â”‚
â”‚                     â”‚                                     â”‚           â”‚ cativo   â”‚
â”‚                     â”‚                                     â”‚           â”‚ en patrÃ³nâ”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 7. Regla crÃ­tica: multi-tenant

**Esta regla aplica en todas las capas sin excepciÃ³n. No hay "modo admin" que la omita.**

```
âŒ MAL:  SELECT * FROM readings WHERE device_id = $1

âœ… BIEN: SELECT * FROM readings
         WHERE device_id = $1
           AND device_id IN (
             SELECT id FROM devices WHERE owner_id = $current_user_id
           )

âœ… BIEN (ML Worker): procesar_mascota(pet_id=X, owner_id=Y)
                     persistir(pet_id=X, owner_id=Y, ...)
```

```mermaid
graph LR
    subgraph "Capa 1 (IngestiÃ³n)"
        C1V[Verificar que device_id\npertenece a un owner\nantes de persistir]
    end
    subgraph "Capa 2 (API)"
        C2V[Filtrar por owner_id\nen TODOS los queries\nJWT obligatorio]
    end
    subgraph "Capa 3 (ML)"
        C3V[Procesar por pet_id + owner_id\nPersistir ambas llaves]
    end
    subgraph "DB (Supabase)"
        RLS[RLS activo en todas las tablas\nBackstop final]
    end
    C1V --> C2V --> C3V --> RLS
```

---

## 8. Inventario de variables por tabla

### `public.devices`
```
Identidad:    id (UUID PK), owner_id (UUID FK â†’ profiles.id),
              pet_id (UUID FK â†’ pets.id), device_id (TEXT KPCL0000),
              device_type (food_bowl | water_bowl)
Estado:       status (active | inactive | maintenance),
              device_state (factory | claimed | linked | offline | ...),
              last_seen (timestamptz), battery_level (numeric 0â€“100)
CalibraciÃ³n:  plate_weight_grams (numeric)
Conectividad: wifi_status, wifi_ssid, wifi_ip, ip_history (jsonb)
OperaciÃ³n:    sensor_health, retired_at (timestamptz)
```

### `public.readings`
```
Identidad:    id (UUID PK), device_id (UUID FK â†’ devices.id),
              pet_id (UUID, snapshot)
Sensores:     weight_grams, water_ml, flow_rate, temperature, humidity,
              light_lux, light_percent, light_condition, battery_level
Tiempo/calidad: recorded_at (timestamptz), ingested_at (timestamptz),
                clock_invalid (boolean)
```

### `public.sensor_readings` (legacy bridge v2.4)
```
Identidad:  id, device_id (TEXT formato KPCL)
Sensores:   weight_grams, temperature, humidity, light_lux, light_percent,
            light_condition
Tiempo:     device_timestamp, ingested_at
```

### `public.bridge_heartbeats` / `public.bridge_telemetry`
```
Conectividad: mqtt_connected, last_mqtt_at, wifi_ssid, wifi_ip, ip, hostname
Recursos:     uptime_sec (o uptime_min), ram_used_mb, ram_total_mb,
              disk_used_pct, cpu_temp
Estado:       bridge_status, last_seen, recorded_at
```

### `public.pet_sessions`
```
Identidad:   id (UUID PK), pet_id (UUID FK), owner_id (UUID FK)
SesiÃ³n:      session_type, session_start, session_end, duration_sec
Consumo:     grams_consumed, water_ml
AnalÃ­tica:   classification, anomaly_score, baseline_grams
Ambiente:    avg_temperature, avg_humidity
```

### `public.pet_daily_summary`
```
Identidad:  id (UUID PK), pet_id (UUID FK), owner_id (UUID FK), summary_date (date)
Comida:     total_food_grams, food_sessions, skipped_meals
Agua:       total_water_ml, water_sessions
AnomalÃ­as:  anomaly_count
Rutina:     first_session_at, last_session_at
Ambiente:   avg_temperature, avg_humidity
```

### `public.insights_ml` (propuesto)
```
Identidad:   id (UUID PK), pet_id (UUID FK), owner_id (UUID FK)
Insight:     insight_type, severity (info | warning | alert),
             message (text legible), context (jsonb con mÃ©tricas de soporte)
PerÃ­odo:     period_start (timestamptz), period_end (timestamptz)
Control:     created_at, dismissed_at, model_version
```

---

## 9. Checklist de coherencia entre capas

Usar antes de cada deploy o cambio de schema.

**Capa 1:**
- [ ] Â¿Se validan rangos fÃ­sicos de todos los sensores antes de persistir?
- [ ] Â¿Se guarda `ingested_at` en todas las filas?
- [ ] Â¿Se marca `clock_invalid` cuando hay desvÃ­o de timestamp?
- [ ] Â¿El upsert usa llave compuesta `device_id + recorded_at`?
- [ ] Â¿Se verifica que `device_id` pertenece a un owner activo antes de persistir?

**Capa 2:**
- [ ] Â¿Todos los endpoints requieren JWT vÃ¡lido?
- [ ] Â¿Todos los queries filtran por `owner_id`?
- [ ] Â¿`food_content_g` usa `GREATEST(0, weight_grams - plate_weight_grams)`?
- [ ] Â¿Los endpoints de resumen unen readings + sessions + daily_summary?
- [ ] Â¿Los queries de series temporales usan `effective_ts` (bifurcaciÃ³n por `clock_invalid`)?

**Capa 3:**
- [ ] Â¿El worker siempre procesa por `pet_id` y persiste con `owner_id`?
- [ ] Â¿Los re-runs son seguros (upsert, no insert duplicado)?
- [ ] Â¿El worker nunca bloquea el flujo de ingestiÃ³n?
- [ ] Â¿Se ejecuta Shapiro-Wilk antes de decidir usar z-score vs MAD?
- [ ] Â¿Los insights incluyen `period_start`/`period_end` y `model_version`?
- [ ] Â¿Se loguean mÃ©tricas de validaciÃ³n (Precision, Recall, F1, PSI) en cada ciclo?

**DB:**
- [ ] Â¿RLS activo en `readings`, `pet_sessions`, `pet_daily_summary`, `insights_ml`?
- [ ] Â¿`devices.plate_weight_grams` actualizado para todos los dispositivos activos?
- [ ] Â¿`public.insights_ml` existe con schema propuesto y polÃ­ticas RLS?

---

## 10. Decisiones de diseÃ±o y justificaciones

| DecisiÃ³n | Alternativa considerada | Por quÃ© se eligiÃ³ esto |
|---|---|---|
| IngestiÃ³n en Vercel (no Edge Functions) | Supabase Edge Functions | Menor cold start en Vercel; contrato de validaciÃ³n idÃ©ntico si se migra |
| ML Worker batch (no streaming) | Kafka/Flink streaming | Volumen actual no justifica streaming; batch 10min es suficiente para el valor de producto |
| `readings` + `sensor_readings` separadas | Una tabla con flag de versiÃ³n | Compatibilidad backward con bridge v2.4 sin modificar schema oficial |
| `insights_ml` separada (no columnas en `readings`) | Agregar columnas en `readings` | Insights son resultados de ventanas temporales, no propiedades de una lectura puntual |
| `log10(x+1)` guardado junto al raw | Calcular al vuelo en cada query | Evita recalcular en cada anÃ¡lisis; permite comparaciones directas en SQL |
| `anomaly_score` continuo (0â€“1) | Flag binario normal/anÃ³malo | Permite umbrales ajustables; UI graduada por severidad |
| MAD-score como mÃ©todo primario | Solo z-score | MÃ¡s robusto ante outliers; datos de mascotas tienen distribuciÃ³n no normal |
| Mann-Whitney U para cambio de patrÃ³n | t-test de Student | No asume normalidad; mÃ¡s apropiado para series de comportamiento |

---

*VersiÃ³n 3 â€” Mejorada con diagramas Mermaid, pruebas estadÃ­sticas visualizadas, y especificaciones completas del ML pipeline.*
*Complemento: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`*



