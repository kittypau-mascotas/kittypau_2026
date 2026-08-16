# Análisis Colab — KPCL0034 · Export 07-05-2026

**Autor:** Mauro Curcuma  
**Entorno:** Google Colab  
**Fecha del análisis:** 2026-05-07  
**Script:** [`Ciclo Alpha/colab_analisis_kpcl0034_07052026.py`](Ciclo%20Alpha/colab_analisis_kpcl0034_07052026.py)  
**Fuente de datos:** Google Drive → `Analisis de Datos/Data Raw/Data abril 2026/kittypau_full_07-05-2026_csv/`

---

## Contexto y propósito

Este análisis es un **pipeline exploratorio independiente** ejecutado en Google Colab sobre un export completo de las tablas de Supabase al 2026-05-07. A diferencia del pipeline ML de fases (que descarga via API y entrena modelos LightGBM), este análisis:

- Lee directamente desde **CSVs exportados** cargados en Google Drive.
- Reconstruye sesiones de alimentación y servido desde `audit_events`.
- Calcula **features de comportamiento** por sesión (consumo, duración, ritmo, varianza).
- Genera un **dashboard visual profesional interactivo** con cuatro paneles (Plotly + HTML).
- Produce un **informe de aprovechamiento diario** (servido vs. consumido) calculado por Mauro dato por dato.

**Diferencia clave con el pipeline ML:** Este análisis no genera artefactos `.parquet` ni entrena modelos. Es una exploración analítica y visual de los datos de comportamiento de Bandida.

---

## Datos de entrada

### Fuente

```
Google Drive:
/content/drive/MyDrive/Analisis de Datos/Data Raw/Data abril 2026/
kittypau_full_07-05-2026_csv/
├── audit_events.csv      ← eventos manuales y de bridge
├── devices.csv           ← metadata de dispositivos
├── readings.csv          ← lecturas de peso y ambiente
└── sensor_readings.csv   ← tabla legacy (comparada vs. readings)
```

> **Nota de encoding:** Los CSVs se cargan con `encoding="latin1"` para evitar errores de caracteres especiales en los exports de Supabase.

### Comparación `sensor_readings` vs `readings`

Al inicio del análisis se hace un diff de columnas entre ambas tablas. La diferencia canónica es:
- `readings` es la tabla activa del proyecto con columnas modernas (`clock_invalid`, `ingested_at`, etc.).
- `sensor_readings` es una tabla legacy con esquema anterior.

### Tipos de eventos en `audit_events`

Categorías presentes en el export del 07-05-2026:

| event_type | Descripción |
|---|---|
| `manual_bowl_category` | Eventos manuales: inicio/termino alimentacion/servido/hidratacion, setup de plato |
| `device_offline_detected` | Health-check: device sin STATUS |
| `device_online_detected` | Health-check: device volvió |
| `bridge_offline_detected` | Health-check: bridge sin heartbeat |
| `bridge_online_detected` | Health-check: bridge volvió |

---

## Pipeline del análisis — Fase 1

### Carga de datos (`load_tables`)

Lee las tres tablas principales (audit, devices, readings) con manejo de encoding automático (intenta UTF-8, cae a latin-1).

### Normalización del payload (`parse_payload`)

Esta es la función más crítica del pipeline. Resuelve el problema de los timestamps con zonas horarias mixtas en `audit_events`:

**Problema:** El campo `created_at` de `audit_events` puede tener zonas horarias en diferentes formatos (`+00`, `-04`, `-04:00`, etc.) dependiendo del momento en que se registró el evento.

**Solución aplicada:**
```python
def fix_timezone(s):
    dt = dateutil.parser.parse(str(s).strip())
    return dt.astimezone(dateutil.tz.UTC)
```

**Extracción del payload:**
- `category` ← `payload.category` (key canónica del evento)
- `device_code` ← `payload.device_id` (fallback por device si `entity_id` no está)
- Si `category` es null, se usa `event_type` como fallback

### Construcción del timeline (`build_timeline`)

Hace join de `audit_events` con `devices` para resolver `entity_id` (UUID interno) → `device_code` (ej: "KPCL0034"). Prioriza el `device_code` del payload sobre el del join.

### Construcción de sesiones (`build_sessions`)

Reconstruye sesiones de alimentación como pares `inicio_alimentacion` → `termino_alimentacion` por device. Lógica:
- Si aparece un nuevo `inicio_alimentacion` sin haber cerrado el anterior → incrementa contador de `open_without_close` (advertencia).
- Solo guarda sesiones con `duration > 0`.
- Sesiones al final del dataset sin cierre → también se cuentan como `open_without_close`.

**Salida del Quality Report de Fase 1:**
```
TIMELINE:  N eventos, M devices
SESSIONS:  X sesiones
  duración promedio: Y seg
  duración mínima:   Z seg
  duración máxima:   W seg
READINGS:  K filas
```

---

## Pipeline del análisis — Fase 2

### Preparación de readings (`prepare_readings`)

- Convierte `recorded_at` a UTC.
- **Excluye lecturas con `clock_invalid = True`** — diferencia importante vs. el pipeline ML (que las incluye usando `ingested_at` como fallback). En este análisis, se descartan directamente para simplificar.
- Hace join con `devices` para obtener `device_code`.

### Enrichment sensorial (`enrich_sessions_with_readings`)

Para cada sesión, encuentra las lecturas de peso dentro del intervalo `[start_at, end_at]`. Solo conserva sesiones con al menos **2 lecturas** (requisito mínimo para calcular consumo).

### Features por sesión (`build_session_features`)

Para cada sesión enriquecida calcula:

| Feature | Fórmula | Descripción |
|---|---|---|
| `weight_start_g` | `weight[0]` | Peso al inicio de la sesión |
| `weight_end_g` | `weight[-1]` | Peso al final de la sesión |
| `consumed_grams` | `weight[0] - weight[-1]` | Gramos consumidos (positivo = comió) |
| `duration_min` | `(t_end - t_start) / 60` | Duración en minutos |
| `rate_g_per_min` | `consumed / duration_min` | Ritmo de consumo (g/min) |
| `num_readings` | `len(window)` | Lecturas dentro del intervalo |
| `active_drops` | `count(delta < -2g)` | Caídas de peso > 2g entre lecturas consecutivas |
| `weight_variance` | `np.var(weight)` | Varianza del peso durante la sesión |
| `avg_temperature` | `mean(temperature)` | Temperatura ambiente durante la sesión |
| `avg_humidity` | `mean(humidity)` | Humedad durante la sesión |

> **Nota:** `consumed_grams` puede ser **negativo** si el peso subió durante la sesión (indica un servido mal categorizado o un error de etiquetado). El análisis los identifica y los reporta.

### Sesiones de servido (`build_sessions_servido`)

Usa el mismo algoritmo que `build_sessions` pero para `inicio_servido` / `termino_servido`. El campo `served_grams` se calcula como `abs(consumed_grams)` porque el peso sube cuando se sirve.

---

## Resultados del análisis KPCL0034

### Resumen de sesiones de alimentación

El análisis produce una tabla por sesión con las siguientes columnas clave:

```
session_start | consumed_grams | duration_min | rate_g_per_min | active_drops
```

Este reporte fue revisado y validado **dato por dato por Mauro** (indicado en el comentario del código: `#KPCL0034 ESTO LO HIZO MAURO A MANO, DAAAAAAAAAATO POR DAAAAAAAAAAAATO`).

### Cruce diario: Servido vs. Consumido

El análisis calcula por día:

| Columna | Descripción |
|---|---|
| `total_served` | Total de gramos servidos (suma de sesiones de servido del día) |
| `total_consumed` | Total de gramos consumidos (suma de sesiones de alimentación del día) |
| `aprovechamiento_pct` | `(consumido / servido) × 100` |
| `desperdicio_grams` | `servido - consumido` |
| `n_sesiones_alim` | Número de sesiones de alimentación del día |
| `n_sesiones_serv` | Número de sesiones de servido del día |

La tabla de totales cierra con el aprovechamiento global del período.

---

## Dashboard visual (4 paneles)

El análisis genera un dashboard HTML standalone con fondo oscuro (`#0d1117`) y tipografía `DM Mono` / `DM Sans`.

### Panel 1 — Peso bruto + Sesiones etiquetadas

**Tipo:** Timeseries interactivo (Plotly) con range slider y botones 1d/3d/7d/14d/Todo

**Contenido:**
- Curva de `peso bruto` (rojo, fill hacia el eje X)
- Bandas verdes translúcidas = sesiones de alimentación
- Bandas naranjas translúcidas = sesiones de servido
- Marcadores diamante verde = inicio/fin de alimentación
- Marcadores triángulo naranja = inicio/fin de servido
- Rango Y ajustado automáticamente por percentiles (p0.1% → p99.9%)
- Hover con timestamp, peso, gramos consumidos/servidos

### Panel 2 — Consumo diario

**Tipo:** Barras + línea de tendencia (media móvil 3 días)

**Contenido:**
- Barras verdes = gramos consumidos por día
- Línea naranja = media móvil de 3 días
- Línea punteada morada = promedio del período

### Panel 3 — Servido vs. Consumido + Aprovechamiento

**Tipo:** Barras agrupadas + eje Y secundario para porcentaje

**Contenido:**
- Barras naranjas = gramos servidos
- Barras verdes = gramos consumidos
- Línea morada (eje derecho) = % aprovechamiento por día
- Solo muestra días donde hubo sesiones de servido registradas

### Panel 4 — Duración y ritmo por sesión

**Tipo:** Barras + eje Y secundario para ritmo

**Contenido:**
- Barras azules = duración en minutos por sesión
- Línea roja (eje derecho) = ritmo (g/min) por sesión
- Línea punteada naranja = ritmo promedio del período

### KPIs del header

El dashboard muestra cards de resumen con:
- Total de sesiones de alimentación
- Total consumido (gramos del período)
- Promedio de consumo diario
- Duración promedio por sesión
- Ritmo promedio de consumo
- Sesiones promedio por día
- Aprovechamiento promedio (%)
- Rango de fechas cubierto

---

## Diferencias clave vs. pipeline ML existente

| Aspecto | Pipeline ML (Fase 1–3) | Este análisis Colab |
|---|---|---|
| Fuente de datos | Supabase API (REST + SQL directo) | CSVs exportados en Google Drive |
| Timestamp `clock_invalid` | Usa `ingested_at` como fallback | Descarta la lectura directamente |
| Objetivo | Entrenar modelos LightGBM | Exploración visual y features de comportamiento |
| Salidas | Artefactos `.parquet` + modelos `.lgb` | Dashboard HTML + tablas de features |
| Entorno | Windows / PowerShell local | Google Colab (cloud) |
| Export de datos | 2026-04-08 → 2026-04-27 | 2026-04-08 → 2026-05-07 |

> El export del 07-05-2026 cubre **~10 días adicionales** de datos respecto al usado en los experimentos Fase 3 del pipeline ML. Este análisis puede revelar patrones más recientes de Bandida no capturados en los modelos actuales.

---

## Cómo ejecutar en Google Colab

### Setup

```python
!pip install psycopg2-binary plotly pandas

from google.colab import drive
drive.mount('/content/drive')
```

### Ruta de datos

```python
BASE = "/content/drive/MyDrive/Analisis de Datos/Data Raw/Data abril 2026/kittypau_full_07-05-2026_csv/"
```

### Ejecutar todo el pipeline

```python
# Fase 1: cargar y procesar
timeline, sessions, readings, devices = run_fase_1()

# Fase 2: enriquecer y calcular features de alimentación
enriched, features = run_fase_2(timeline, sessions, readings, devices)

# Fase 2: sesiones de servido
sessions_servido = build_sessions_servido(timeline)
enriched_servido, features_servido = run_fase_2(timeline, sessions_servido, readings, devices)

# Filtrar KPCL0034 y generar dashboard
kpcl34 = features[features["device_code"] == "KPCL0034"].copy()
kpcl34_servido = features_servido[features_servido["device_code"] == "KPCL0034"].copy()
kpcl34_servido["served_grams"] = -kpcl34_servido["consumed_grams"]

dashboard_html = build_kpcl_dashboard(
    features, sessions, features_servido, sessions_servido,
    enriched, readings, devices
)

# Guardar dashboard
with open("kpcl0034_dashboard_colab.html", "w", encoding="utf-8") as f:
    f.write(dashboard_html)
```

---

## Archivos relacionados

| Archivo | Descripción |
|---|---|
| [`Data Science/colab_analisis_kpcl0034_07052026.py`](Data%20Science/colab_analisis_kpcl0034_07052026.py) | Script completo del análisis |
| [`Data Science/colab_fase1_fase2_pipeline.py`](Data%20Science/colab_fase1_fase2_pipeline.py) | Pipeline ML de Colab (fases 1 y 2) |
| [`Data Science/Reporte_Sesion_2026-04-26.md`](Data%20Science/Reporte_Sesion_2026-04-26.md) | Reporte de la sesión que precedió a este análisis |
| [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) | Registro del backfill inicial de eventos |
| `kpcl0034_full_eventos.csv` | Export operativo de KPCL0034 con eventos alineados |
