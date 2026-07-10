---
tags: [kittypau, ciclo-alpha-v2, kpcl0034, datos, dispositivo]
fecha_creacion: 2026-06-26
estado: activo
---

# KPCL0034 — Dispositivo y Fuentes de Datos

> Ver [[00_INDICE_AV2]] para el índice completo del ciclo.

---

## El dispositivo: KPCL0034 "Bandida"

| Campo | Valor |
|---|---|
| Código | `KPCL0034` |
| Nombre | "Bandida" |
| Tipo | `food_bowl` — comedero inteligente |
| Animal | Gata adulta (felino doméstico) |
| Sensor | Celda de carga (strain gauge) → peso en gramos |
| Frecuencia nominal | 1 lectura cada ~30 segundos |

El dispositivo mide continuamente el peso del contenido del bowl. Las variaciones en la serie temporal de peso son la señal que se analiza en el [[Ciclo Alpha v2]].

---

## UUIDs del dispositivo

KPCL0034 cambió de UUID durante el período de análisis. Ambos UUIDs corresponden al mismo dispositivo físico:

| UUID | Período activo | Tabla fuente |
|---|---|---|
| `9510a455-b0e9-4932-8be1-03976d31228a` | Abril 2026 | `readings.csv` |
| `3a460074-e7c3-41bf-ae5a-a011445f927a` | Mayo – Junio 2026 | `readings.csv` + `readings_rows.csv` |

En el código, el filtro siempre aplica **ambos UUIDs en simultáneo**:

```python
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",
    "3a460074-e7c3-41bf-ae5a-a011445f927a",
}
df_dev = df_raw[df_raw["device_id"].isin(KPCL0034_UUIDS)]
```

---

## Fuentes de datos crudos

Los datos se exportan manualmente desde Supabase y se guardan en:

```
Docs/11_Data/2026/
├── readings.csv          ← Tabla principal de lecturas
└── readings_rows.csv     ← Tabla secundaria/complementaria
```

### Estructura de las tablas

Columnas relevantes utilizadas:

| Columna | Tipo | Descripción |
|---|---|---|
| `device_id` | UUID | Identificador del dispositivo (usado para filtrar KPCL0034) |
| `ingested_at` | timestamptz | Timestamp de ingesta en Supabase (siempre válido) |
| `weight_grams` | float | Peso medido en gramos |

> **Nota sobre `clock_invalid`:** A diferencia del análisis Colab (ver [[05_ANALISIS_COLAB_KPCL0034_07052026]]), en el Ciclo Alpha v2 se usa `ingested_at` como timestamp principal. Esto evita descartar lecturas con reloj del sensor inválido.

---

## Período de datos cubierto

| Dato | Valor |
|---|---|
| Fecha inicio | 2026-04-08 |
| Fecha fin | 2026-06-26 |
| Duración | ~79 días |
| Lecturas totales (ambas tablas) | 246.130 filas de KPCL0034 |
| Slots resampleados a 30s | 227.346 |
| Slots NaN (gaps) | 58.279 (25.6%) |

Los gaps corresponden a períodos sin señal del sensor (cortes de red, reinicio del bridge, etc.).

---

## Pipeline de carga y normalización

### 1. Carga desde ambas fuentes

```python
for csv_path in [READINGS_CSV, READINGS_ROWS_CSV]:
    df_raw = pd.read_csv(csv_path, low_memory=False)
    mask = df_raw["device_id"].isin(KPCL0034_UUIDS)
    frames.append(df_raw[mask].copy())

df = pd.concat(frames, ignore_index=True)
```

### 2. Parsing de timestamps

```python
df["ts"]     = pd.to_datetime(df["ingested_at"], format="ISO8601", utc=True)
df["peso_g"] = pd.to_numeric(df["weight_grams"], errors="coerce")
```

> **Por qué `format="ISO8601"`:** Los timestamps de Supabase vienen con zonas horarias mixtas (`+00:00`, `-04:00`, etc.). El parser `ISO8601` de pandas 2.x maneja correctamente este formato sin lanzar excepciones.

### 3. Deduplicación y ordenamiento

```python
df = (
    df[["ts", "peso_g"]]
    .dropna(subset=["ts"])
    .drop_duplicates(subset=["ts"])
    .sort_values("ts")
    .reset_index(drop=True)
)
```

### 4. Resampleo a 30 segundos

```python
serie = df.set_index("ts")["peso_g"].resample("30s").mean()
serie = serie.ffill(limit=2)   # forward-fill máx. 2 slots (60s)
```

**Por qué 30s:** Es la cadencia natural del sensor. Resamplear a esta frecuencia:
- Elimina duplicados y micro-variaciones de sub-segundo
- Crea una grilla temporal uniforme necesaria para el análisis de ventanas rodantes
- El `ffill(limit=2)` rellena hasta 60s de gap sin datos (sensor momentáneamente offline)
- Gaps > 60s quedan como `NaN` y marcan posibles cortes reales

---

## Zona horaria para visualización

Todos los timestamps se almacenan internamente en **UTC**. Para mostrar al operador se convierten a:

```python
TZ_STGO = ZoneInfo("America/Santiago")
t_ini_stgo = t_inicio.astimezone(TZ_STGO)
```

**America/Santiago** ajusta automáticamente entre UTC−3 (verano) y UTC−4 (invierno) según el calendario de Chile.

---

## Ver también

- [[03_DETECCION_SEGMENTOS]] — Cómo se procesan estos datos para detectar candidatos
- [[01_ARQUITECTURA_PIPELINE]] — Flujo completo del pipeline
- [[02_REGLAS_EVENTOS_ALIMENTACION]] — Reglas canónicas de eventos de Supabase
