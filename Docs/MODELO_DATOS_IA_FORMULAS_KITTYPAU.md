# Modelo de Datos, Formulas y Logica IA (Kittypau)

## 1) Objetivo
Definir un marco unico para transformar lecturas IoT en informacion util de comportamiento:
- Cuando empieza una ingesta (comida o agua).
- Cuando termina.
- Cuanto dura.
- Cuanto consume.
- Como evoluciona por dia/semana para alertas, recomendaciones y modelos IA.

Este documento es la base para:
- Analitica descriptiva.
- Deteccion de eventos.
- Features para Machine Learning.
- Reglas de interpretacion en la app.

Ver también (arquitectura canon): `Docs/archive/analitica/KittyPau_Arquitectura_Datos_v3.md`

## 2) Variables base (fuente)
Tabla principal: `readings`.

Campos clave:
- `recorded_at` (timestamp de lectura)
- `device_id` (UUID FK a `public.devices.id` — no confundir con el código KPCL)
- `pet_id`
- `weight_grams` (peso bruto medido)
- `water_ml` (si existe, volumen directo)
- `temperature`
- `humidity`
- `battery_level`
- `ingested_at` (timestamp servidor al persistir)
- `clock_invalid` (calidad de reloj)

Campos de dispositivo:
- `plate_weight_grams` (tara del plato superior)
- `device_id` (en `public.devices.device_id`: código humano KPCL para QR/UI)

## 3) Normalizacion y limpieza
Para cada lectura `i`:
- `t_i = timestamp(recorded_at_i)`
- `w_gross_i = weight_grams_i`
- `w_plate = plate_weight_grams` (constante por dispositivo, salvo recalibracion)

Reglas:
- Eliminar o marcar lecturas sin `t_i`.
- Eliminar o marcar lecturas con `w_gross_i` fuera de rango fisico.
- Ordenar por `t_i` ascendente para calculos de delta.
- Mantener control de duplicados (`device_id`, `recorded_at`).
- Canon temporal para series/ventanas: `effective_ts = CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END`.

### 3.2 Transformación `log10(x + 1)` (feature engineering)
Para variables altamente skewed (consumo, intervalos, deltas), usar:
- `x_log = log10(x + 1)`

Regla:
- Aplicar en ingestión server-side después de validar (ej. Zod) y antes de persistir, guardando raw + transformado.

Fourier/FFT no va en ingestión: se aplica en capa analítica/ML sobre series temporales por mascota.

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

## 3.1 Vinculo explicito con SQL (variables y campos)
Matriz minima de mapeo:

| Variable analitica | Campo SQL origen | Tabla | Nota |
|---|---|---|---|
| `t_i` | `recorded_at` | `readings` | Timestamp base de lectura |
| `device_id` | `device_id` | `readings`, `devices` | Llave de dispositivo |
| `pet_id` | `pet_id` | `readings`, `devices`, `pets` | Llave de mascota |
| `w_gross_i` | `weight_grams` | `readings` | Peso bruto |
| `water_ml_i` | `water_ml` | `readings` | Volumen directo (si existe) |
| `temp_i` | `temperature` | `readings` | Variable contextual |
| `humidity_i` | `humidity` | `readings` | Variable contextual |
| `w_plate` | `plate_weight_grams` | `devices` | Tara configurada |

Join recomendado:
- `readings.device_id = devices.id`
- `devices.pet_id = pets.id`

Observacion:
- Usar `devices.device_id` (codigo KPCL) para UI y trazabilidad humana.
- Usar `devices.id` (UUID interno) para joins y performance.

## 4) Formulas de contenido
### 4.1 Alimentacion (contenido en gramos)
Si hay tara:
- `food_content_i = max(0, w_gross_i - w_plate)`

Si no hay tara:
- `food_content_i = w_gross_i` (modo degradado con menor precision)

### 4.2 Hidratacion
Prioridad 1 (si existe sensor directo):
- `water_content_i = max(0, water_ml_i)`  (equivalente aproximado a cm3)

Prioridad 2 (sin `water_ml`, por peso):
- `water_content_i = max(0, w_gross_i - w_plate)`

Conversion aproximada:
- `1 g de agua ~ 1 cm3`

### 4.3 Formula SQL de contenido (referencia)
```sql
-- base normalizada por lectura
SELECT
  r.id,
  r.pet_id,
  r.device_id,
  r.recorded_at,
  r.weight_grams,
  r.water_ml,
  d.plate_weight_grams,
  GREATEST(0, r.weight_grams - COALESCE(d.plate_weight_grams, 0)) AS content_from_weight_g,
  CASE
    WHEN r.water_ml IS NOT NULL THEN GREATEST(0, r.water_ml)
    ELSE GREATEST(0, r.weight_grams - COALESCE(d.plate_weight_grams, 0))
  END AS water_content_cm3_approx
FROM readings r
LEFT JOIN devices d
  ON d.id = r.device_id;
```

## 5) Deltas temporales
Entre lectura `i-1` e `i`:
- `dt_i = t_i - t_{i-1}` (seg o min)
- `delta_content_i = content_i - content_{i-1}`

Interpretacion:
- `delta_content_i < 0`: probable consumo.
- `delta_content_i > 0`: recarga/rellenado/intervencion.
- `delta_content_i ~= 0`: reposo/ruido.

### 5.1 Deltas en SQL (window functions)
```sql
WITH base AS (
  SELECT
    r.id,
    r.pet_id,
    r.device_id,
    r.recorded_at,
    GREATEST(0, r.weight_grams - COALESCE(d.plate_weight_grams, 0)) AS content_g
  FROM readings r
  LEFT JOIN devices d ON d.id = r.device_id
)
SELECT
  b.*,
  EXTRACT(EPOCH FROM (
    b.recorded_at - LAG(b.recorded_at) OVER (PARTITION BY b.device_id ORDER BY b.recorded_at)
  )) AS dt_seconds,
  b.content_g - LAG(b.content_g) OVER (PARTITION BY b.device_id ORDER BY b.recorded_at) AS delta_content_g
FROM base b;
```

## 6) Deteccion de eventos de ingesta (comida/agua)
Un evento se define como un tramo continuo de disminucion real de contenido.

Parametros recomendados (ajustables por mascota):
- `min_drop`: caida minima para considerar consumo (ej. 2 g/cm3)
- `max_gap`: separacion maxima para continuidad de evento (ej. 180 min)
- `epsilon_noise`: tolerancia al ruido de sensor

Algoritmo:
1. Recorrer lecturas ordenadas.
2. Si `delta_content_i <= -min_drop` y `dt_i <= max_gap`, abrir o continuar evento.
3. Si no cumple, cerrar evento activo.
4. Guardar solo eventos con consumo y duracion validos.

Salida por evento `e`:
- `start_time_e`
- `end_time_e`
- `duration_e = end_time_e - start_time_e`
- `start_content_e`
- `end_content_e`
- `consumed_e = max(0, start_content_e - end_content_e)`
- `rate_e = consumed_e / duration_e` (g/min o cm3/min)

### 6.1 Version SQL (segmentacion por tramos de consumo)
En SQL puro puede resolverse en 2 fases:
1. Marcar filas de consumo (`delta_content <= -min_drop` y `dt <= max_gap`).
2. Crear grupos de continuidad con running sum y agregar por grupo.

Ejemplo base:
```sql
WITH params AS (
  SELECT 2.0::numeric AS min_drop, 10800::numeric AS max_gap_seconds
),
delta AS (
  SELECT
    r.pet_id,
    r.device_id,
    r.recorded_at,
    GREATEST(0, r.weight_grams - COALESCE(d.plate_weight_grams, 0)) AS content_g,
    EXTRACT(EPOCH FROM (
      r.recorded_at - LAG(r.recorded_at) OVER (PARTITION BY r.device_id ORDER BY r.recorded_at)
    )) AS dt_seconds,
    (GREATEST(0, r.weight_grams - COALESCE(d.plate_weight_grams, 0))
     - LAG(GREATEST(0, r.weight_grams - COALESCE(d.plate_weight_grams, 0)))
       OVER (PARTITION BY r.device_id ORDER BY r.recorded_at)) AS delta_content_g
  FROM readings r
  LEFT JOIN devices d ON d.id = r.device_id
),
flags AS (
  SELECT
    x.*,
    CASE
      WHEN x.delta_content_g <= -p.min_drop
       AND COALESCE(x.dt_seconds, 0) <= p.max_gap_seconds
      THEN 1 ELSE 0
    END AS is_consumption
  FROM delta x
  CROSS JOIN params p
),
seg AS (
  SELECT
    f.*,
    SUM(
      CASE
        WHEN f.is_consumption = 1
         AND COALESCE(LAG(f.is_consumption) OVER (PARTITION BY f.device_id ORDER BY f.recorded_at),0) = 0
        THEN 1 ELSE 0
      END
    ) OVER (PARTITION BY f.device_id ORDER BY f.recorded_at) AS session_id
  FROM flags f
)
SELECT
  pet_id,
  device_id,
  session_id,
  MIN(recorded_at) AS start_time,
  MAX(recorded_at) AS end_time,
  EXTRACT(EPOCH FROM (MAX(recorded_at) - MIN(recorded_at))) AS duration_seconds,
  SUM(CASE WHEN delta_content_g < 0 THEN -delta_content_g ELSE 0 END) AS consumed_amount_g
FROM seg
WHERE is_consumption = 1
GROUP BY pet_id, device_id, session_id
HAVING SUM(CASE WHEN delta_content_g < 0 THEN -delta_content_g ELSE 0 END) > 0;
```

## 7) Metricas derivadas por ventana
### 7.1 Diario (24h)
- `total_consumed_day = sum(consumed_e)`
- `n_events_day = count(events)`
- `avg_event_duration_day`
- `first_intake_time_day`
- `last_intake_time_day`
- `max_gap_between_events_day`

### 7.2 Semanal
- Promedios diarios.
- Desviacion estandar de horarios de ingesta.
- Tendencia de consumo (`slope` por regresion lineal simple).

## 8) Features para IA / Ciencia de datos
Por dia y por mascota:
- `consumption_total_food_24h`
- `consumption_total_water_24h`
- `events_food_count_24h`
- `events_water_count_24h`
- `avg_duration_food`
- `avg_duration_water`
- `first_food_time`, `first_water_time`
- `last_food_time`, `last_water_time`
- `night_intake_ratio` (consumo nocturno / total)
- `temp_mean`, `temp_max`, `humidity_mean`
- `battery_stability`
- `sensor_noise_index` (variabilidad anomala)

Features de secuencia (modelo temporal):
- Serie de `content_i`, `delta_content_i`, `dt_i`
- Embeddings por franja horaria (manana/tarde/noche)

## 9) Modelos IA recomendados (roadmap)
### Fase 1: Reglas + estadistica robusta
- Deteccion de anomalias por umbrales dinamicos (MAD/IQR).
- Alertas de bajo consumo o cambios bruscos.

### Fase 2: ML supervisado
- Objetivo: clasificar dia normal vs riesgo.
- Modelos: XGBoost/RandomForest.
- Labels: definidos por veterinaria/reglas clinicas.

### Fase 3: Modelos temporales
- Forecast de consumo por hora.
- Deteccion anticipada de alteraciones.
- Modelos: Prophet/LSTM/Temporal CNN (segun volumen de datos).

## 10) Calidad de datos y validaciones minimas
Checks obligatorios:
- Monotonia temporal por dispositivo.
- Porcentaje de datos faltantes por variable.
- Distribucion de `delta_content` (ruido vs consumo real).
- Tasa de lecturas por hora.
- Coherencia `water_ml` vs `weight_grams` (cuando ambos existen).

Umbrales operativos sugeridos:
- `missing_rate < 10%` para analitica diaria confiable.
- `latency_reading < 5 min` para monitoreo casi real.

### 10.1 Queries SQL de control de calidad
```sql
-- 1) faltantes por variable (24h)
SELECT
  device_id,
  COUNT(*) AS n,
  AVG((weight_grams IS NULL)::int)::numeric(6,4) AS miss_weight,
  AVG((water_ml IS NULL)::int)::numeric(6,4) AS miss_water,
  AVG((temperature IS NULL)::int)::numeric(6,4) AS miss_temp,
  AVG((humidity IS NULL)::int)::numeric(6,4) AS miss_humidity
FROM readings
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY device_id;

-- 2) duplicados por (device_id, recorded_at)
SELECT device_id, recorded_at, COUNT(*) AS dup_count
FROM readings
GROUP BY device_id, recorded_at
HAVING COUNT(*) > 1;
```

## 11) Logica para tooltip en grafico de eventos
Para cada punto:
1. Buscar si pertenece a un evento activo detectado.
2. Si pertenece, mostrar:
- valor actual
- inicio
- fin
- duracion
- consumo del proceso
3. Si no pertenece:
- mostrar valor actual + "sin evento detectado".

## 12) Recomendaciones de implementacion
- Versionar parametros (`min_drop`, `max_gap`, etc.) por mascota.
- Guardar eventos detectados en tabla derivada (`intake_events`).
- Mantener recalculo batch diario + actualizacion incremental en tiempo real.
- Registrar trazabilidad: formula aplicada, version de regla/modelo y timestamp.

## 13) Esquema sugerido de tabla derivada
Tabla: `intake_events`
- `id`
- `pet_id`
- `device_id`
- `event_type` (`food` | `water`)
- `start_time`
- `end_time`
- `duration_seconds`
- `consumed_amount`
- `unit` (`g` | `cm3`)
- `start_content`
- `end_content`
- `algorithm_version`
- `created_at`

DDL de referencia:
```sql
CREATE TABLE IF NOT EXISTS intake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  device_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('food','water')),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_seconds numeric NOT NULL,
  consumed_amount numeric NOT NULL,
  unit text NOT NULL CHECK (unit IN ('g','cm3')),
  start_content numeric,
  end_content numeric,
  algorithm_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## 14) Criterios de exito funcional
- El sistema detecta consistentemente inicio/fin de ingesta.
- El error de consumo estimado se mantiene dentro de tolerancia definida.
- Las alertas reducen falsos positivos en comparacion con reglas fijas simples.
- El tooltip y vistas resumen explican claramente "que paso y cuando paso".

## 15) Proximos pasos al tener datos reales
1. Calibrar parametros por mascota con 2-4 semanas de datos.
2. Etiquetar casos reales (normal/anomalo) con apoyo experto.
3. Entrenar baseline ML y comparar contra reglas.
4. Implementar versionado de features y modelos.
5. Medir impacto de recomendaciones en salud/habitos.



