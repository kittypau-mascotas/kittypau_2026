# Kittypau ML — Ciclo Gamma: Guía de Implementación Completa

> ⚠️ **Actualización 2026-06-16:** el Pre-G de Gamma cambió de estrategia — ver
> [`CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`](CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md).
> En vez de anotación manual desde cero (§7 `app_anotacion_gamma.py` mostrando
> sesiones cronológicas, §8 `generar_candidatos_servido.py` con heurística de
> subida de peso ≥5g), Gamma genera candidatos con inferencia del Modelo A de
> Exp06 sobre los 3 meses unificados. La implementación vigente de Fase 1 está en
> [`Ciclo Gamma/fase_1_extraccion/scripts/`](fase_1_extraccion/scripts/) (`g01` a
> `g10`). Las secciones 2 (rutas y carga de datos), 4 (`g03_extract_readings.py`)
> y los gaps 1-4 de la sección 1 siguen siendo una referencia útil para el manejo
> de columnas/encoding/timezone de los dos CSV fuente — esa lógica se reutilizó
> en `g03_unify_readings.py`. Las secciones 7, 8 y 9 (app de anotación a ciegas,
> heurística de candidatos por subida de peso, quality report post-anotación
> directa) están **superseded** por el flujo de inferencia con Modelo A.

**Fecha:** 2026-06-15  
**Estado:** Pre-G — listo para ejecutar  
**Rutas de datos canónicas:**

```
Abril 2026 → D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv
Mayo-Jun 2026 → D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv
```

---

## Por qué este documento existe

El instructivo original (`instructivo.md`) y los archivos de experimentos Gamma (`g01` a `g06`) cubren la arquitectura y los objetivos. Lo que falta —y lo que aquí se documenta— son los **detalles de implementación concretos** que se descubrieron durante Alpha y que no quedaron capturados explícitamente: cómo cargar exactamente los dos CSVs de datos, qué hacer con sus columnas inconsistentes, qué orden de operaciones falla en silencio si no se sigue, y qué decisiones de código específicas bloquean errores conocidos antes de que ocurran.

---

## Índice

1. [Gaps identificados respecto al instructivo existente](#1-gaps-identificados)
2. [Rutas de datos y cómo cargar cada archivo](#2-rutas-y-carga-de-datos)
3. [_gamma_utils.py — código completo listo para copiar](#3-_gamma_utilspy)
4. [g03_extract_readings.py — lógica completa de extracción](#4-g03_extract_readingspy)
5. [g04_extract_events.py — fusión de fuentes de etiquetas](#5-g04_extract_eventspy)
6. [_gamma_phase2_utils.py — resampleo, features y timezone](#6-_gamma_phase2_utilspy)
7. [app_anotacion_gamma.py — qué debe tener para funcionar](#7-app_anotacion_gammappy)
8. [generar_candidatos_servido.py](#8-generar_candidatos_servidopy)
9. [g06_quality_report.py — checkpoints obligatorios](#9-g06_quality_reportpy)
10. [Análisis de distribución por período (KS-test)](#10-análisis-de-distribución)
11. [Split temporal Gamma — fechas y lógica](#11-split-temporal-gamma)
12. [Checklist de arranque paso a paso](#12-checklist-de-arranque)
13. [Errores silenciosos conocidos y cómo evitarlos](#13-errores-silenciosos)
14. [Dependencias y entorno](#14-dependencias)
15. [Preguntas frecuentes de implementación](#15-faq)

---

## 1. Gaps identificados

Lo que el instructivo existente no resuelve explícitamente:

**Gap 1 — Las dos rutas de datos no están integradas en ningún script.**  
`readings.csv` (Abril) y `readings_rows.csv` (Mayo-Jun) tienen esquemas ligeramente distintos y deben concatenarse de una forma específica antes de filtrar por UUID. Ningún script existente hace eso todavía.

**Gap 2 — El UUID de KPCL0034 en Abril es diferente al de Mayo-Jun.**  
Esto está documentado en el glosario pero no hay ningún script que verifique automáticamente que ambos UUIDs están presentes en el CSV antes de continuar. Si se filtra por un solo UUID, la mitad de los datos desaparece en silencio.

**Gap 3 — `readings.csv` de Abril tiene la columna `light_percent` y `light_lux` en cero para todas las filas.**  
`readings_rows.csv` de Mayo-Jun las tiene con valores reales. Si se concatenan sin control, el análisis de distribución de features de luz reporta shift cuando en realidad no hay shift — hay ausencia de dato.

**Gap 4 — El campo `created_at` de `audit_events.csv` tiene tres formatos de timezone distintos.**  
`+00`, `-04`, `-04:00` aparecen mezclados en el mismo archivo. `pd.to_datetime()` sin parámetros extra falla silenciosamente en algunos de ellos.

**Gap 5 — `app_anotacion_gamma.py` no existe todavía.**  
El instructivo la referencia pero no hay código. Este documento especifica qué debe contener para que funcione correctamente.

**Gap 6 — El split temporal para Gamma no tiene fechas concretas.**  
El instructivo dice "train→May 31 / val→Jun 7 / test→Jun 14" pero esas fechas asumen datos hasta Jun 14. Si se descarga un nuevo dump que cubre hasta Jun 15 o más tarde, el split debe actualizarse. Aquí se define la lógica para calcularlo dinámicamente.

**Gap 7 — `plateau_duration_s` en segundos no es directamente calculable desde el resampleo.**  
El resampleo a 30s hace que cada fila represente 30s, por lo que `plateau_duration` en filas × 30 = segundos. Pero la lógica de acumulación de plateau debe reiniciarse en los gaps. Esto necesita implementación explícita.

**Gap 8 — No hay script `generar_candidatos_servido.py`.**  
Está referenciado pero no existe. Es crítico para identificar sesiones de servido no etiquetadas antes de empezar a anotar.

**Gap 9 — La `app_anotacion_gamma.py` debe mostrar los candidatos de servido priorizados, no todas las sesiones.**  
El flujo de Alpha mostraba sesiones en orden cronológico. Gamma necesita mostrar primero los candidatos de servido detectados por `generar_candidatos_servido.py`.

**Gap 10 — No hay definición de qué hacer cuando `g06_quality_report.py` falla una assertion.**  
El instructivo dice que bloquea el avance pero no dice cómo resolver el bloqueo en cada caso.

---

## 2. Rutas y carga de datos

### Archivo Abril 2026

```python
ABRIL_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv"
AUDIT_EVENTS_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\audit_events.csv"
DEVICES_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\devices.csv"
```

**Columnas presentes en `readings.csv` de Abril:**
`id`, `device_id`, `pet_id`, `weight_grams`, `water_ml`, `flow_rate`, `temperature`, `humidity`, `battery_level`, `recorded_at`, `ingested_at`, `clock_invalid`, `battery_voltage`, `battery_state`, `battery_source`, `battery_is_estimated`, `light_percent`, `light_lux`, `light_condition`

**Nota crítica:** `light_percent`, `light_lux` y `light_condition` están presentes en el CSV de Abril pero con valores `0` / `"dark"` para KPCL0034. No confundir con ausencia de columna.

### Archivo Mayo-Jun 2026

```python
MAYO_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv"
```

**Columnas presentes en `readings_rows.csv` de Mayo-Jun:**
Mismo esquema que Abril. `light_percent` y `light_lux` tienen valores reales desde Mayo 2026.

**Diferencia clave con Abril:** `clock_invalid = True` en el 100% de las filas. El UUID de KPCL0034 es diferente (`3a460074-...` en lugar de `9510a455-...`).

### Carga correcta (concatenar ambos archivos)

```python
import pandas as pd
from pathlib import Path

ABRIL_CSV  = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv")
MAYO_CSV   = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv")

KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",  # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # UUID Mayo-Jun 2026 y posterior
]

def cargar_readings_combinados() -> pd.DataFrame:
    """
    Carga y concatena los dos CSVs de readings.
    Filtra por KPCL0034_UUIDS, resuelve timestamps, descarta columnas vestigiales.
    """
    print("Cargando Abril 2026...")
    df_abril = pd.read_csv(ABRIL_CSV, encoding="latin1", low_memory=False)
    df_abril["_fuente"] = "abril"

    print("Cargando Mayo-Jun 2026...")
    df_mayo = pd.read_csv(MAYO_CSV, encoding="latin1", low_memory=False)
    df_mayo["_fuente"] = "mayo_jun"

    # Alinear columnas — ambos tienen el mismo esquema, pero por seguridad:
    cols_comunes = list(set(df_abril.columns) & set(df_mayo.columns))
    df = pd.concat([df_abril[cols_comunes + ["_fuente"]], 
                    df_mayo[cols_comunes + ["_fuente"]]], 
                   ignore_index=True)

    # Filtrar por ambos UUIDs de KPCL0034
    df = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
    print(f"Filas KPCL0034 combinadas: {len(df):,}")

    # Verificar que ambos UUIDs están representados
    uuids_presentes = set(df["device_id"].unique())
    for uuid in KPCL0034_UUIDS:
        if uuid not in uuids_presentes:
            print(f"⚠️  UUID no encontrado en datos: {uuid}")
        else:
            n = (df["device_id"] == uuid).sum()
            print(f"  {uuid[:8]}...: {n:,} filas")

    # Resolver timestamp
    pct_clock_invalid = df["clock_invalid"].mean()
    print(f"clock_invalid: {pct_clock_invalid*100:.1f}%")

    if pct_clock_invalid > 0.95:
        print("→ Forzando ingested_at para todo el conjunto")
        df["ts_utc"] = pd.to_datetime(df["ingested_at"], utc=True)
    else:
        df["ts_utc"] = df.apply(
            lambda r: pd.to_datetime(r["ingested_at"], utc=True)
            if r["clock_invalid"]
            else pd.to_datetime(r["recorded_at"], utc=True),
            axis=1
        )

    # Eliminar columnas vestigiales
    cols_vestigiales = ["water_ml", "flow_rate", "battery_is_estimated"]
    df = df.drop(columns=[c for c in cols_vestigiales if c in df.columns])

    # Ordenar por timestamp
    df = df.sort_values("ts_utc").reset_index(drop=True)

    return df
```

---

## 3. `_gamma_utils.py`

Fuente canónica de todas las constantes. Crear en `gamma/fase_1_extraccion/scripts/_gamma_utils.py` y también en `gamma/fase_2_dataset/scripts/` y `gamma/fase_3_modelos/scripts/` (o importar con path relativo desde un único archivo).

```python
# _gamma_utils.py — FUENTE CANÓNICA DE CONSTANTES CICLO GAMMA
# Cambiar cualquier valor aquí requiere crear un nuevo experimento numerado.

from pathlib import Path
from zoneinfo import ZoneInfo

# ── Raíz del proyecto ────────────────────────────────────────────────────────
ROOT = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq")
DATA_SCIENCE = ROOT / "Docs" / "investigacion" / "Data Science"
GAMMA_ROOT   = DATA_SCIENCE / "gamma"

# ── Rutas de datos fuente ────────────────────────────────────────────────────
ABRIL_READINGS_CSV = ROOT / "Docs" / "investigacion" / "Data_2026" / "Abril_2026" / \
                     "kittypau_full_07-05-2026_csv" / "readings.csv"
ABRIL_AUDIT_CSV    = ROOT / "Docs" / "investigacion" / "Data_2026" / "Abril_2026" / \
                     "kittypau_full_07-05-2026_csv" / "audit_events.csv"
ABRIL_DEVICES_CSV  = ROOT / "Docs" / "investigacion" / "Data_2026" / "Abril_2026" / \
                     "kittypau_full_07-05-2026_csv" / "devices.csv"
MAYO_READINGS_CSV  = ROOT / "Docs" / "investigacion" / "Data_2026" / \
                     "Mayo_2026" / "readings_rows.csv"

# ── Dispositivos ─────────────────────────────────────────────────────────────
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
KPCL0034_CODE = "KPCL0034"

# Devices excluidos del pipeline activo
KPCL0036_EXCLUIDO = True
DEVICE_DESCONOCIDO_UUID = "418565e7-6683-440c-80e6-666363574cec"  # no identificado en exp07

# ── Parámetros del pipeline ───────────────────────────────────────────────────
GAP_CUTOFF_S      = 300     # segundos — gap que crea nuevo segmento
PLATEAU_THRESHOLD = 1.5     # gramos — umbral is_plateau
RESAMPLE_TARGET_S = 30      # segundos — cadencia uniforme post-resampleo
BASELINE_WINDOW   = 60      # lecturas — ventana percentil 10 para net_weight

# ── Parámetros de inferencia ──────────────────────────────────────────────────
MIN_SESSION_S  = 30         # duración mínima de sesión válida
GAP_MERGE_S    = 60         # gap entre activos que se fusionan en misma sesión
MIN_CONSUMED_G = 3.0        # cambio mínimo de peso para sesión válida

# ── Umbrales de datos antes de entrenar ──────────────────────────────────────
MIN_SERVIDO_SESSIONS = 80   # sesiones reales de servido etiquetadas
MIN_ALIM_SESSIONS    = 200  # sesiones de alimentación etiquetadas
MIN_ALIM_FOR_NN      = 300  # sesiones alim para habilitar G-06 (redes neuronales)

# ── Features (orden fijo — no cambiar sin nuevo experimento) ─────────────────
FEATURES_GAMMA = [
    "weight_grams",
    "delta_w",
    "delta_w_10",
    "rolling_std_5",
    "rolling_std_10",
    "rolling_mean_5",
    "net_weight",
    "is_plateau",
    "plateau_duration_s",    # en segundos (no filas) — corrección vs Alpha
    "hour_sin",              # hora Santiago (no UTC) — corrección vs Alpha
    "hour_cos",
    "clock_invalid",
    "dia_semana_sin",        # nueva en Gamma — captura rutinas semanales
]
# NOTA: cadencia_s excluida intencionalmente (error α-8: importancia baja)

# ── Encoding de clases ───────────────────────────────────────────────────────
LABEL_ENCODING = {
    "alimentacion": 0,
    "servido":      1,
    "reposo":       2,
}
IDX_ALIMENTACION = 0
IDX_SERVIDO      = 1
IDX_REPOSO       = 2

# ── Threshold inicial Modelo A ───────────────────────────────────────────────
# Recalibrar con isotonic regression en cada experimento. 0.20 es punto de partida.
THRESHOLD_A_INICIAL = 0.20

# ── Timezone ─────────────────────────────────────────────────────────────────
TZ_LOCAL = ZoneInfo("America/Santiago")
TZ_UTC   = "UTC"

# ── CSV encoding (exports Supabase) ──────────────────────────────────────────
CSV_ENCODING = "latin1"

# ── Rutas de salida ──────────────────────────────────────────────────────────
FASE1_RAW         = GAMMA_ROOT / "fase_1_extraccion" / "data" / "raw"
FASE1_OUTPUTS     = GAMMA_ROOT / "fase_1_extraccion" / "outputs"
FASE2_INTERIM     = GAMMA_ROOT / "fase_2_dataset" / "data" / "interim"
FASE2_TRAIN       = GAMMA_ROOT / "fase_2_dataset" / "data" / "train"
FASE3_MODELS_GBM  = GAMMA_ROOT / "fase_3_modelos" / "models" / "gbm"
FASE3_MODELS_NN   = GAMMA_ROOT / "fase_3_modelos" / "models" / "nn"
FASE3_MODELS_ENS  = GAMMA_ROOT / "fase_3_modelos" / "models" / "ensemble"
FASE3_OUTPUTS     = GAMMA_ROOT / "fase_3_modelos" / "outputs" / "training_report"
FASE4_DATA        = GAMMA_ROOT / "fase_4_anotacion" / "data"

ANNOTATIONS_GAMMA = FASE4_DATA / "new_annotations_gamma.csv"
SERVIDO_CANDIDATES = FASE4_DATA / "servido_candidates.csv"
```

---

## 4. `g03_extract_readings.py`

Este script reemplaza el `03_extract_readings.py` de Alpha. La diferencia principal es que lee desde los dos CSVs locales en lugar de la API de Supabase.

```python
"""
g03_extract_readings.py — Fase 1 Gamma
Carga readings desde CSV Abril + CSV Mayo-Jun, filtra KPCL0034 (ambos UUIDs),
resuelve timestamps, detecta anomalías y exporta readings_raw.parquet.
"""
import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats as scipy_stats

# Añadir ruta para importar _gamma_utils
sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import *

def cargar_y_concatenar() -> pd.DataFrame:
    """Carga ambos CSVs, filtra por KPCL0034_UUIDS, resuelve timestamps."""
    print("=" * 60)
    print("Cargando readings.csv (Abril 2026)...")
    df_abril = pd.read_csv(ABRIL_READINGS_CSV, encoding=CSV_ENCODING, low_memory=False)
    df_abril["_periodo"] = "abril"
    print(f"  Filas totales: {len(df_abril):,}")

    print("Cargando readings_rows.csv (Mayo-Jun 2026)...")
    df_mayo = pd.read_csv(MAYO_READINGS_CSV, encoding=CSV_ENCODING, low_memory=False)
    df_mayo["_periodo"] = "mayo_jun"
    print(f"  Filas totales: {len(df_mayo):,}")

    # Alinear columnas (mayo_jun puede tener columnas extra o faltantes)
    cols_comunes = sorted(set(df_abril.columns) & set(df_mayo.columns))
    df = pd.concat(
        [df_abril[cols_comunes + ["_periodo"]], df_mayo[cols_comunes + ["_periodo"]]],
        ignore_index=True
    )

    # Filtrar por ambos UUIDs de KPCL0034
    df_kpcl = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
    print(f"\nFilas KPCL0034 combinadas: {len(df_kpcl):,}")

    # Verificar presencia de ambos UUIDs
    for uuid in KPCL0034_UUIDS:
        n = (df_kpcl["device_id"] == uuid).sum()
        periodo = "Abril" if "9510" in uuid else "Mayo-Jun"
        if n == 0:
            print(f"  ⚠️  UUID {periodo} NO encontrado — verificar CSV")
        else:
            print(f"  ✅ UUID {periodo}: {n:,} filas")

    return df_kpcl

def resolver_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    """
    Resuelve el timestamp canónico usando clock_invalid.
    Si el período tiene >95% clock_invalid, fuerza ingested_at sin condición.
    Esto resuelve el error α-5.
    """
    df = df.copy()
    pct_invalid = df["clock_invalid"].mean()
    print(f"\nclock_invalid: {pct_invalid*100:.1f}%")

    if pct_invalid > 0.95:
        print("  → 100% clock_invalid — forzando ingested_at para todo el dataset")
        df["ts_utc"] = pd.to_datetime(df["ingested_at"], utc=True, errors="coerce")
    else:
        # Por período
        for periodo in ["abril", "mayo_jun"]:
            mask = df["_periodo"] == periodo
            sub = df.loc[mask]
            pct = sub["clock_invalid"].mean()
            if pct > 0.95:
                df.loc[mask, "ts_utc"] = pd.to_datetime(
                    sub["ingested_at"], utc=True, errors="coerce"
                )
            else:
                df.loc[mask, "ts_utc"] = sub.apply(
                    lambda r: pd.to_datetime(r["ingested_at"], utc=True)
                    if r["clock_invalid"]
                    else pd.to_datetime(r["recorded_at"], utc=True),
                    axis=1
                )

    # Verificar NaT
    n_nat = df["ts_utc"].isna().sum()
    if n_nat > 0:
        print(f"  ⚠️  {n_nat} timestamps NaT — se eliminarán")
        df = df.dropna(subset=["ts_utc"])

    df = df.sort_values("ts_utc").reset_index(drop=True)
    print(f"  Rango: {df['ts_utc'].min()} → {df['ts_utc'].max()}")
    return df

def detectar_anomalias_peso(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detecta y reporta lecturas de peso anómalas.
    No elimina — exporta a anomalias_peso.csv para revisión manual.
    """
    anomalias = []

    # Valores negativos
    neg = df[df["weight_grams"] < 0]
    if len(neg):
        anomalias.append(neg.assign(tipo_anomalia="peso_negativo"))

    # Spikes extremos (Z-score > 5 dentro de cada segmento)
    df_sorted = df.copy()
    z_scores = np.abs(scipy_stats.zscore(df_sorted["weight_grams"].fillna(0)))
    spikes = df_sorted[z_scores > 5]
    if len(spikes):
        anomalias.append(spikes.assign(tipo_anomalia="spike_zscore_gt5"))

    # NaN en weight_grams
    nans = df[df["weight_grams"].isna()]
    if len(nans):
        anomalias.append(nans.assign(tipo_anomalia="nan_weight"))

    if anomalias:
        df_anom = pd.concat(anomalias, ignore_index=True)
        out = FASE1_OUTPUTS / "anomalias_peso.csv"
        out.parent.mkdir(parents=True, exist_ok=True)
        df_anom.to_csv(out, index=False, encoding="utf-8")
        print(f"\n⚠️  {len(df_anom)} anomalías de peso → {out}")
        print("  Revisar manualmente antes de continuar con Fase 2.")
    else:
        print("\n✅ Sin anomalías de peso detectadas.")

    return df

def calcular_gaps(df: pd.DataFrame) -> None:
    """Reporta gaps mayores a GAP_CUTOFF_S."""
    diff_s = df["ts_utc"].diff().dt.total_seconds()
    gaps = diff_s[diff_s > GAP_CUTOFF_S]
    print(f"\nGaps > {GAP_CUTOFF_S}s: {len(gaps)}")
    for idx, secs in gaps.items():
        ts = df.loc[idx, "ts_utc"]
        print(f"  {ts} — {secs/3600:.1f} horas")

def main():
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    df = cargar_y_concatenar()
    df = resolver_timestamps(df)
    detectar_anomalias_peso(df)
    calcular_gaps(df)

    # Cadencia
    diff_s = df["ts_utc"].diff().dt.total_seconds()
    print(f"\nCadencia mediana: {diff_s.median():.1f}s")
    print(f"Cadencia media:   {diff_s.mean():.1f}s")

    # Guardar
    out = FASE1_RAW / "readings_raw.parquet"
    df.to_parquet(out, index=False)
    print(f"\n✅ readings_raw.parquet guardado: {len(df):,} filas → {out}")

if __name__ == "__main__":
    main()
```

---

## 5. `g04_extract_events.py`

Resuelve el problema de las timezone mixtas en `audit_events.csv` (gap crítico de Alpha).

```python
"""
g04_extract_events.py — Fase 1 Gamma
Carga audit_events.csv, parsea payload JSON, normaliza timezone a UTC,
fusiona con new_annotations_gamma.csv, exporta events_labeled.parquet.
"""
import json
import sys
import pandas as pd
from pathlib import Path
from dateutil import parser as dateutil_parser, tz as dateutil_tz

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import *

def fix_timezone(s: str):
    """
    Parsea cualquier formato de timestamp con timezone mixta y devuelve UTC.
    Resuelve el error α-3 / gap crítico de audit_events.
    Maneja: '+00', '-04', '-04:00', 'Z', sin zona (asume UTC).
    """
    try:
        dt = dateutil_parser.parse(str(s).strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dateutil_tz.UTC)
        return dt.astimezone(dateutil_tz.UTC)
    except Exception:
        return None

def cargar_audit_events() -> pd.DataFrame:
    """Carga y normaliza audit_events.csv de Abril."""
    print("Cargando audit_events.csv...")
    df = pd.read_csv(ABRIL_AUDIT_CSV, encoding=CSV_ENCODING, low_memory=False)
    print(f"  Total eventos: {len(df):,}")

    # Parsear payload JSON
    def parse_payload(raw):
        if pd.isna(raw):
            return {}
        try:
            return json.loads(raw)
        except Exception:
            return {}

    df["payload_parsed"] = df["payload"].apply(parse_payload)
    df["category"] = df["payload_parsed"].apply(
        lambda x: x.get("category") or x.get("event_type")
    )
    df["device_code_payload"] = df["payload_parsed"].apply(
        lambda x: x.get("device_id") or x.get("device_code")
    )

    # Cargar devices para resolver entity_id → device_code
    devices = pd.read_csv(ABRIL_DEVICES_CSV, encoding=CSV_ENCODING, low_memory=False)
    devices = devices[["id", "device_id"]].rename(
        columns={"id": "entity_id", "device_id": "device_code_devices"}
    )
    df = df.merge(devices, on="entity_id", how="left")

    # Priorizar device_code del payload sobre el del join
    df["device_code"] = df["device_code_payload"].fillna(df["device_code_devices"])

    # Normalizar timestamps (error α-3: timezone mixta)
    print("  Normalizando timestamps a UTC...")
    df["ts_utc"] = df["created_at"].apply(fix_timezone)
    n_null = df["ts_utc"].isna().sum()
    if n_null:
        print(f"  ⚠️  {n_null} timestamps no parseados — se eliminarán")
    df = df.dropna(subset=["ts_utc"])

    # Filtrar solo manual_bowl_category de KPCL0034
    mask = (
        (df["event_type"] == "manual_bowl_category") &
        (df["device_code"] == KPCL0034_CODE)
    )
    df_kpcl = df[mask].copy()
    print(f"  Eventos KPCL0034 manual_bowl_category: {len(df_kpcl):,}")
    print(f"  Categorías: {df_kpcl['category'].value_counts().to_dict()}")
    return df_kpcl

def cargar_annotations_gamma() -> pd.DataFrame:
    """Carga new_annotations_gamma.csv si existe."""
    if not ANNOTATIONS_GAMMA.exists():
        print("  new_annotations_gamma.csv no existe aún — solo usando audit_events")
        return pd.DataFrame()

    df = pd.read_csv(ANNOTATIONS_GAMMA, encoding="utf-8")
    print(f"  new_annotations_gamma.csv: {len(df)} filas")

    # Normalizar — debe tener columnas: ts_utc, category, device_code
    required = ["ts_utc", "category", "device_code"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"new_annotations_gamma.csv le falta la columna: {col}")

    df["ts_utc"] = df["ts_utc"].apply(fix_timezone)
    df = df[df["device_code"] == KPCL0034_CODE].copy()
    print(f"  Anotaciones Gamma KPCL0034: {len(df)}")
    return df

def main():
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    df_audit = cargar_audit_events()
    df_gamma = cargar_annotations_gamma()

    if len(df_gamma):
        # Fusionar — columnas comunes: ts_utc, category, device_code
        cols_merge = ["ts_utc", "category", "device_code"]
        df_audit_min = df_audit[cols_merge].copy()
        df_gamma_min = df_gamma[cols_merge].copy()
        df_all = pd.concat([df_audit_min, df_gamma_min], ignore_index=True)
        # Deduplicar por timestamp + categoría (margen de ±1s)
        df_all = df_all.drop_duplicates(subset=["category"]).sort_values("ts_utc")
        print(f"\nTotal eventos fusionados: {len(df_all)}")
    else:
        df_all = df_audit[["ts_utc", "category", "device_code"]].copy()

    out = FASE1_RAW / "events_labeled.parquet"
    df_all.to_parquet(out, index=False)
    print(f"✅ events_labeled.parquet: {len(df_all)} eventos → {out}")

if __name__ == "__main__":
    main()
```

---

## 6. `_gamma_phase2_utils.py`

Implementación del resampleo a 30s, features en hora Santiago, y `plateau_duration_s` en segundos.

```python
"""
_gamma_phase2_utils.py — Utilidades de feature engineering Gamma
Resuelve: resampleo 30s, timezone Santiago, plateau_duration_s en segundos,
dia_semana_sin nueva feature, sin cadencia_s.
"""
import numpy as np
import pandas as pd
from zoneinfo import ZoneInfo

from _gamma_utils import (
    RESAMPLE_TARGET_S, GAP_CUTOFF_S, PLATEAU_THRESHOLD,
    BASELINE_WINDOW, FEATURES_GAMMA, TZ_LOCAL
)

def resample_to_uniform(df: pd.DataFrame, target_s: int = RESAMPLE_TARGET_S) -> pd.DataFrame:
    """
    Resamplea a cadencia uniforme usando forward-fill por segmento de continuidad.
    No interpola a través de gaps > GAP_CUTOFF_S (discontinuidades reales).
    
    El peso del bowl es una señal de tipo escalón — forward-fill es la interpolación correcta.
    Esta función resuelve el shift de distribución entre Abril (~14.7s) y Mayo-Jun (~30s).
    """
    df = df.copy().sort_values("ts_utc")

    # Detectar gaps para segmentar
    diff_s = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df["_segmento"] = (diff_s > GAP_CUTOFF_S).cumsum()

    resultados = []
    for seg_id, grupo in df.groupby("_segmento"):
        if len(grupo) < 2:
            continue
        t_inicio = grupo["ts_utc"].iloc[0]
        t_fin    = grupo["ts_utc"].iloc[-1]
        nuevo_idx = pd.date_range(t_inicio, t_fin, freq=f"{target_s}s", tz="UTC")
        grupo_r = grupo.set_index("ts_utc").reindex(nuevo_idx, method="ffill")
        grupo_r.index.name = "ts_utc"
        grupo_r["_segmento"] = seg_id
        resultados.append(grupo_r.reset_index())

    if not resultados:
        return df

    df_res = pd.concat(resultados, ignore_index=True)
    print(f"  Resampleo: {len(df):,} → {len(df_res):,} filas ({target_s}s cadencia)")
    return df_res

def calcular_features_temporales(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula hour_sin, hour_cos en hora Santiago (no UTC).
    Añade dia_semana_sin (nueva en Gamma).
    Resuelve el error α-3: rutinas de Bandida estaban desplazadas 3-4h en Alpha.
    """
    df = df.copy()
    ts_santiago = df["ts_utc"].dt.tz_convert(TZ_LOCAL)
    
    hour_local = ts_santiago.dt.hour + ts_santiago.dt.minute / 60.0
    dia        = ts_santiago.dt.dayofweek  # 0=Lunes, 6=Domingo

    df["hour_sin"]       = np.sin(2 * np.pi * hour_local / 24)
    df["hour_cos"]       = np.cos(2 * np.pi * hour_local / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * dia / 7)
    return df

def calcular_features_peso(df: pd.DataFrame) -> pd.DataFrame:
    """Calcula todas las features derivadas del peso."""
    df = df.copy()
    w = df["weight_grams"]

    # Deltas
    df["delta_w"]    = w.diff(1)
    df["delta_w_10"] = w.diff(10)

    # Rolling stats
    df["rolling_std_5"]  = w.rolling(5,  min_periods=1).std()
    df["rolling_std_10"] = w.rolling(10, min_periods=1).std()
    df["rolling_mean_5"] = w.rolling(5,  min_periods=1).mean()

    # Net weight: peso neto sobre baseline local (percentil 10, ventana 60)
    df["net_weight"] = w - w.rolling(BASELINE_WINDOW, min_periods=1).quantile(0.10)

    # Plateau
    df["is_plateau"] = (df["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)

    # plateau_duration_s en SEGUNDOS (no filas — corrección vs Alpha)
    # Con resampleo a 30s, cada fila = 30s
    plateau_count = []
    count = 0
    for val in df["is_plateau"]:
        if val == 1:
            count += RESAMPLE_TARGET_S  # acumula en segundos
        else:
            count = 0
        plateau_count.append(count)
    df["plateau_duration_s"] = plateau_count

    # Interpolación de NaN en weight (máx 3 consecutivos)
    df["weight_grams"] = df["weight_grams"].interpolate(
        method="linear", limit=3, limit_direction="forward"
    )

    return df

def calcular_todas_features(df: pd.DataFrame) -> pd.DataFrame:
    """Pipeline completo de features. Llama en orden correcto."""
    df = calcular_features_temporales(df)
    df = calcular_features_peso(df)

    # Verificar que todas las features Gamma están presentes
    faltantes = [f for f in FEATURES_GAMMA if f not in df.columns]
    if faltantes:
        raise ValueError(f"Features faltantes en el dataframe: {faltantes}")

    return df[["ts_utc", "device_id", "_periodo", "_segmento", "label"] +
              FEATURES_GAMMA + ["clock_invalid"]]
```

---

## 7. `app_anotacion_gamma.py`

Especificación de lo que debe contener la app de anotación. El archivo completo está pendiente de crear; aquí están los requisitos de implementación.

**Estructura mínima requerida:**

```python
"""
app_anotacion_gamma.py — Streamlit app para anotación manual Gamma
Ejecutar: streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
URL: http://localhost:8501

Diferencias vs. app_anotacion.py de Alpha:
1. Lee desde readings_raw.parquet de Gamma (ya resampleado)
2. Muestra timestamps en hora Santiago (no UTC)
3. Prioriza candidatos de servido en el panel de navegación
4. Barra de progreso hasta 80 sesiones de servido
5. Guarda en new_annotations_gamma.csv (no en new_annotations.csv de Alpha)
6. Columnas de salida: ts_utc (UTC), category, device_code, notas
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[2] / "fase_1_extraccion" / "scripts"))
from _gamma_utils import (
    FASE1_RAW, FASE4_DATA, ANNOTATIONS_GAMMA, SERVIDO_CANDIDATES,
    MIN_SERVIDO_SESSIONS, KPCL0034_CODE, TZ_LOCAL, RESAMPLE_TARGET_S
)

# ── Configuración de la app ──────────────────────────────────────────────────
st.set_page_config(page_title="Anotación Gamma — Kittypau", layout="wide")
st.title("Kittypau ML — Ciclo Gamma · Anotación de Sesiones")

# ── Barra de progreso ────────────────────────────────────────────────────────
# IMPORTANTE: mostrar esto prominentemente — es el KPI más crítico del Pre-G
annotations = pd.read_csv(ANNOTATIONS_GAMMA) if ANNOTATIONS_GAMMA.exists() else pd.DataFrame()
n_servido = len(annotations[annotations["category"].isin(
    ["inicio_servido", "termino_servido"])]) // 2 if len(annotations) else 0
st.metric("Sesiones de servido anotadas", f"{n_servido} / {MIN_SERVIDO_SESSIONS}")
st.progress(min(n_servido / MIN_SERVIDO_SESSIONS, 1.0))
if n_servido >= MIN_SERVIDO_SESSIONS:
    st.success(f"✅ Meta alcanzada. G-01 desbloqueado.")
else:
    st.warning(f"⏳ Faltan {MIN_SERVIDO_SESSIONS - n_servido} sesiones de servido.")

# ── Panel de navegación ──────────────────────────────────────────────────────
# Mostrar primero candidatos de servido, luego sesiones sin clasificar
# El orden es CRÍTICO: servido primero porque es la clase más escasa

# ── Visualización ────────────────────────────────────────────────────────────
# Mostrar curva de peso en hora Santiago (no UTC)
# Colorear bandas de sesiones ya anotadas
# Permitir click para marcar inicio/término

# ── Formulario de anotación ──────────────────────────────────────────────────
# Categorías disponibles: inicio_alimentacion, termino_alimentacion,
#                         inicio_servido, termino_servido, sin_clasificar
# NUNCA dejar un inicio_* sin su termino_* correspondiente

# ── Guardado ─────────────────────────────────────────────────────────────────
# Columnas del CSV de salida:
# ts_utc: timestamp en UTC (formato ISO 8601 con timezone +00:00)
# category: string de la categoría canónica
# device_code: siempre KPCL0034
# notas: texto libre opcional
```

**Regla de validación que la app debe enforzar:**  
Antes de guardar un `termino_*`, verificar que existe el `inicio_*` correspondiente en la misma sesión. Si no existe, mostrar error y no guardar.

**Formato del CSV de salida (`new_annotations_gamma.csv`):**

```
ts_utc,category,device_code,notas
2026-04-28T15:32:10+00:00,inicio_servido,KPCL0034,
2026-04-28T15:34:45+00:00,termino_servido,KPCL0034,
```

---

## 8. `generar_candidatos_servido.py`

Este script detecta tramos con subida de peso ≥5g no anotados y los exporta para revisión en la app.

```python
"""
generar_candidatos_servido.py
Detecta candidatos de sesiones de servido (subida de peso >=5g) en readings_raw
que todavía no tienen anotación en new_annotations_gamma.csv.
Exporta servido_candidates.csv para priorizar en app_anotacion_gamma.py.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "fase_1_extraccion" / "scripts"))
from _gamma_utils import *

UMBRAL_SUBIDA_G   = 5.0    # gramos — subida mínima para considerar candidato
VENTANA_SUBIDA    = 10     # filas — ventana para calcular subida (10 × 30s = 5 min)
MIN_DURACION_S    = 30     # segundos — duración mínima del evento de subida

def detectar_candidatos(df_readings: pd.DataFrame,
                         df_anotaciones: pd.DataFrame) -> pd.DataFrame:
    """
    Detecta tramos de subida de peso que no están ya anotados como servido.
    """
    df = df_readings.copy().sort_values("ts_utc")
    df["delta_subida"] = df["weight_grams"].diff(VENTANA_SUBIDA)

    # Candidatos: subida > UMBRAL en ventana
    candidatos_mask = df["delta_subida"] >= UMBRAL_SUBIDA_G
    df["es_candidato"] = candidatos_mask.astype(int)

    # Agrupar candidatos consecutivos en sesiones
    df["cambio_estado"] = df["es_candidato"].diff().fillna(0)
    df["grupo_candidato"] = (df["cambio_estado"] == 1).cumsum()
    df_cand = df[df["es_candidato"] == 1]

    sesiones = []
    for grupo_id, grupo in df_cand.groupby("grupo_candidato"):
        ts_inicio = grupo["ts_utc"].min()
        ts_fin    = grupo["ts_utc"].max()
        duracion  = (ts_fin - ts_inicio).total_seconds()
        if duracion < MIN_DURACION_S:
            continue
        peso_inicio = grupo["weight_grams"].iloc[0]
        peso_fin    = grupo["weight_grams"].iloc[-1]
        subida_g    = peso_fin - peso_inicio
        sesiones.append({
            "ts_inicio": ts_inicio,
            "ts_fin": ts_fin,
            "duracion_s": duracion,
            "subida_g": subida_g,
            "ya_anotado": False
        })

    df_sesiones = pd.DataFrame(sesiones)
    if df_sesiones.empty:
        print("No se detectaron candidatos de servido.")
        return df_sesiones

    # Marcar los ya anotados
    if len(df_anotaciones):
        ts_anotados = pd.to_datetime(df_anotaciones[
            df_anotaciones["category"] == "inicio_servido"
        ]["ts_utc"], utc=True)
        for idx, row in df_sesiones.iterrows():
            cerca = any(
                abs((ts_anotados - row["ts_inicio"]).dt.total_seconds()) < 300
            )
            df_sesiones.loc[idx, "ya_anotado"] = cerca

    df_nuevos = df_sesiones[~df_sesiones["ya_anotado"]].copy()
    print(f"Candidatos de servido no anotados: {len(df_nuevos)}")
    return df_nuevos

def main():
    FASE4_DATA.mkdir(parents=True, exist_ok=True)

    readings_path = FASE1_RAW / "readings_raw.parquet"
    if not readings_path.exists():
        print("❌ readings_raw.parquet no existe. Ejecutar g03_extract_readings.py primero.")
        return

    df_readings = pd.read_parquet(readings_path)
    df_readings["ts_utc"] = pd.to_datetime(df_readings["ts_utc"], utc=True)

    df_anotaciones = pd.DataFrame()
    if ANNOTATIONS_GAMMA.exists():
        df_anotaciones = pd.read_csv(ANNOTATIONS_GAMMA)

    df_candidatos = detectar_candidatos(df_readings, df_anotaciones)
    df_candidatos.to_csv(SERVIDO_CANDIDATES, index=False, encoding="utf-8")
    print(f"✅ Exportado: {SERVIDO_CANDIDATES}")

if __name__ == "__main__":
    main()
```

---

## 9. `g06_quality_report.py`

Checkpoints obligatorios que bloquean el avance a Fase 2.

```python
"""
g06_quality_report.py — Fase 1 Gamma
Valida calidad del dataset y bloquea si no se cumplen los prerequisitos de Gamma.
TODOS los assert deben pasar antes de ejecutar g01_build_labels.py (Fase 2).
"""
import sys
import json
import pandas as pd
from pathlib import Path
from scipy import stats as scipy_stats

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import *

def main():
    print("=" * 60)
    print("G06 — Quality Report Gamma")
    print("=" * 60)

    errores = []

    # ── 1. Verificar artefactos de Fase 1 ───────────────────────────────────
    for artefacto in ["readings_raw.parquet", "events_labeled.parquet", "sessions_labeled.parquet"]:
        path = FASE1_RAW / artefacto
        if not path.exists():
            errores.append(f"Falta artefacto: {path}")

    if errores:
        for e in errores:
            print(f"❌ {e}")
        raise FileNotFoundError("Artefactos de Fase 1 incompletos. Ejecutar g03-g05 primero.")

    # ── 2. Cargar sesiones ───────────────────────────────────────────────────
    sesiones = pd.read_parquet(FASE1_RAW / "sessions_labeled.parquet")
    n_alim   = len(sesiones[sesiones["session_type"] == "alimentacion"])
    n_serv   = len(sesiones[sesiones["session_type"] == "servido"])

    print(f"\nSesiones alimentacion: {n_alim}")
    print(f"Sesiones servido:      {n_serv}")
    print(f"Meta servido:          {MIN_SERVIDO_SESSIONS}")
    print(f"Meta alimentacion:     {MIN_ALIM_SESSIONS}")

    # ── CHECKPOINT 1: Sesiones de servido ────────────────────────────────────
    if n_serv < MIN_SERVIDO_SESSIONS:
        print(f"\n❌ BLOQUEADO: {n_serv} sesiones servido < {MIN_SERVIDO_SESSIONS}")
        print("   Acción: anotar más sesiones con app_anotacion_gamma.py")
        print("   → streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py")
        raise AssertionError(f"Sesiones servido insuficientes: {n_serv}/{MIN_SERVIDO_SESSIONS}")

    # ── CHECKPOINT 2: Sesiones de alimentación ───────────────────────────────
    if n_alim < MIN_ALIM_SESSIONS:
        print(f"\n❌ BLOQUEADO: {n_alim} sesiones alim < {MIN_ALIM_SESSIONS}")
        print("   Acción: anotar más sesiones de alimentación")
        raise AssertionError(f"Sesiones alim insuficientes: {n_alim}/{MIN_ALIM_SESSIONS}")

    print(f"\n✅ CHECKPOINT 1 OK: {n_serv} sesiones servido ≥ {MIN_SERVIDO_SESSIONS}")
    print(f"✅ CHECKPOINT 2 OK: {n_alim} sesiones alim ≥ {MIN_ALIM_SESSIONS}")

    # ── 3. Análisis de distribución por período (OBLIGATORIO) ────────────────
    readings = pd.read_parquet(FASE1_RAW / "readings_raw.parquet")
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)

    if "_periodo" not in readings.columns:
        print("\n⚠️  Columna '_periodo' no encontrada — análisis por período omitido")
    else:
        print("\n── Análisis KS por período ─────────────────────────────────")
        features_para_ks = ["weight_grams", "rolling_std_5", "rolling_std_10"]
        # Estas features se calculan si existen, si no solo weight_grams
        features_disponibles = [f for f in features_para_ks if f in readings.columns]

        resultados_ks = {}
        df_abril   = readings[readings["_periodo"] == "abril"]
        df_mayo    = readings[readings["_periodo"] == "mayo_jun"]

        if len(df_abril) and len(df_mayo):
            for feat in features_disponibles:
                a = df_abril[feat].dropna()
                b = df_mayo[feat].dropna()
                if len(a) < 10 or len(b) < 10:
                    continue
                stat, pval = scipy_stats.ks_2samp(a, b)
                shift = pval < 0.05
                resultados_ks[feat] = {"ks_stat": round(stat, 4), "p_value": round(pval, 4), "shift": shift}
                marca = "⚠️ SHIFT" if shift else "✅ OK"
                print(f"  {feat:20s}: KS={stat:.4f}  p={pval:.4f}  {marca}")

            # Guardar resultado
            out_ks = FASE1_OUTPUTS / "distribucion_por_periodo.json"
            out_ks.parent.mkdir(parents=True, exist_ok=True)
            with open(out_ks, "w") as f:
                json.dump(resultados_ks, f, indent=2)
            print(f"\n  → Guardado: {out_ks}")

            features_con_shift = [k for k, v in resultados_ks.items() if v["shift"]]
            if features_con_shift:
                print(f"\n⚠️  Shift detectado en: {features_con_shift}")
                print("   Esto es esperado entre Abril y Mayo-Jun por diferencia de cadencia.")
                print("   El resampleo a 30s en Fase 2 debería mitigarlo.")
                print("   Revisar distribucion_por_periodo.json antes de continuar.")

    # ── CHECKPOINT 3: Anomalías de peso ──────────────────────────────────────
    anom_path = FASE1_OUTPUTS / "anomalias_peso.csv"
    if anom_path.exists():
        df_anom = pd.read_csv(anom_path)
        print(f"\n⚠️  {len(df_anom)} anomalías de peso en anomalias_peso.csv")
        print("   Revisar manualmente. No bloquea, pero debe documentarse.")
    else:
        print("\n✅ CHECKPOINT 3 OK: sin anomalías de peso")

    print("\n" + "=" * 60)
    print("✅ Quality Report completado. Prerequisitos de Fase 1 cumplidos.")
    print("   Próximo paso: ejecutar Fase 2 (g01_build_labels.py)")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

---

## 10. Análisis de distribución

El análisis KS ya está integrado en `g06_quality_report.py`. Lo que falta saber es **cómo interpretar el resultado**:

El shift entre Abril y Mayo-Jun es esperado y conocido. No bloquea el avance. Lo que sí bloquea es encontrar shift en un tercer período de datos (datos nuevos descargados después de Jun 14) sin que el resampleo lo corrija.

**Regla de decisión:**

```
Si distribucion_por_periodo.json muestra shift en weight_grams (la señal principal):
  → El resampleo a 30s debería corregirlo si la causa es cadencia diferente
  → Si persiste el shift DESPUÉS del resampleo en Fase 2 → documentar en el experimento
  → No reentrenar ignorando el shift — causa la misma caída de F1 que α-08

Si el shift es en hour_sin/hour_cos:
  → Verificar que se está usando hora Santiago, no UTC
  → Si es hora Santiago y hay shift, puede ser cambio de horario de verano/invierno
  → Chile cambia de horario — verificar que ZoneInfo("America/Santiago") maneja DST
```

---

## 11. Split temporal Gamma

El split temporal depende de cuándo termina el nuevo dump de datos. La lógica correcta:

```python
def calcular_split_temporal(df_readings: pd.DataFrame) -> dict:
    """
    Calcula fechas de corte para train/val/test de forma dinámica.
    Split 70% / 15% / 15% por tiempo (no por filas, porque la cadencia varía).
    
    Invariantes desde Exp 08:
      train: hasta May 31 (o el 70% temporal de los datos disponibles)
      val:   hasta Jun 7  (o el 85% temporal)
      test:  hasta fin de datos (sellado hasta G-Final)
    """
    t_inicio = df_readings["ts_utc"].min()
    t_fin    = df_readings["ts_utc"].max()
    rango_total = (t_fin - t_inicio).total_seconds()

    # Fechas fijas desde Exp 08 (invariantes mientras el dataset no cambie radicalmente)
    # Si se descarga un dump que va más allá de Jun 14, extender test set
    TRAIN_FIN = pd.Timestamp("2026-05-31", tz="UTC")
    VAL_FIN   = pd.Timestamp("2026-06-07", tz="UTC")
    TEST_FIN  = t_fin  # todo lo que haya hasta el final del dump

    print(f"Split temporal:")
    print(f"  Train: {t_inicio.date()} → {TRAIN_FIN.date()}")
    print(f"  Val:   {TRAIN_FIN.date()} → {VAL_FIN.date()}")
    print(f"  Test:  {VAL_FIN.date()} → {TEST_FIN.date()} (SELLADO)")

    return {
        "train_inicio": t_inicio,
        "train_fin":    TRAIN_FIN,
        "val_inicio":   TRAIN_FIN,
        "val_fin":      VAL_FIN,
        "test_inicio":  VAL_FIN,
        "test_fin":     TEST_FIN,
    }
```

**Si se descarga un nuevo dump después de Jun 14:** Extender `TEST_FIN` automáticamente. El test set se vuelve más grande, lo cual es bueno para la evaluación final en G-Final.

---

## 12. Checklist de arranque paso a paso

Seguir este orden estrictamente. Cada paso tiene una verificación antes de continuar.

### Pre-G: Preparación

```
□ PASO 0 — Crear estructura de carpetas Gamma
  cd "D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data Science"
  
  PowerShell:
  New-Item -ItemType Directory -Force -Path @(
    "gamma/fase_1_extraccion/scripts",
    "gamma/fase_1_extraccion/data/raw",
    "gamma/fase_1_extraccion/outputs",
    "gamma/fase_2_dataset/scripts",
    "gamma/fase_2_dataset/data/interim",
    "gamma/fase_2_dataset/data/train",
    "gamma/fase_2_dataset/outputs/dataset_report",
    "gamma/fase_3_modelos/scripts",
    "gamma/fase_3_modelos/models/gbm",
    "gamma/fase_3_modelos/models/classical",
    "gamma/fase_3_modelos/models/nn",
    "gamma/fase_3_modelos/models/ensemble",
    "gamma/fase_3_modelos/outputs/training_report",
    "gamma/fase_4_anotacion/data",
    "gamma/experiments"
  )

□ PASO 1 — Instalar dependencias del entorno Gamma
  cd "gamma"
  python -m venv venv_gamma
  .\venv_gamma\Scripts\Activate.ps1
  pip install pandas numpy scipy lightgbm xgboost catboost scikit-learn \
              streamlit plotly pyarrow python-dateutil zoneinfo optuna
  pip install imbalanced-learn  # para SMOTE en G-06

  Verificar:
  python -c "import lightgbm, xgboost, catboost, streamlit; print('OK')"

□ PASO 2 — Copiar _gamma_utils.py a las tres carpetas de scripts
  Copiar el contenido de la sección 3 de este documento a:
  - gamma/fase_1_extraccion/scripts/_gamma_utils.py
  - gamma/fase_2_dataset/scripts/_gamma_utils.py     (o importar con sys.path)
  - gamma/fase_3_modelos/scripts/_gamma_utils.py

□ PASO 3 — Verificar que los dos CSVs de datos son accesibles
  python -c "
  import pandas as pd
  df = pd.read_csv(r'D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv', 
                   encoding='latin1', nrows=5)
  print('Abril OK:', df.shape)
  df2 = pd.read_csv(r'D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv',
                    encoding='latin1', nrows=5)
  print('Mayo OK:', df2.shape)
  "

□ PASO 4 — Lanzar app de anotación y anotar hasta ≥80 sesiones de servido
  streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
  
  ⚠️  NO continuar al Paso 5 hasta que la barra muestre ≥ 80 sesiones de servido.
  Esto puede tomar varias sesiones de trabajo. Es normal.

□ PASO 5 — Generar candidatos de servido (antes de anotar, para priorizar)
  python gamma/fase_4_anotacion/generar_candidatos_servido.py
  → Revisa servido_candidates.csv y úsalo para priorizar qué anotar en la app
```

### Fase 1 Gamma

```
□ PASO 6 — Extraer readings
  python gamma/fase_1_extraccion/scripts/g03_extract_readings.py
  
  Verificar salida:
  python -c "
  import pandas as pd
  df = pd.read_parquet('gamma/fase_1_extraccion/data/raw/readings_raw.parquet')
  print(f'Filas: {len(df):,}')
  print(f'Rango: {df.ts_utc.min()} → {df.ts_utc.max()}')
  print(f'UUIDs: {df.device_id.unique()}')
  "
  ✓ Debe mostrar AMBOS UUIDs de KPCL0034

□ PASO 7 — Revisar anomalías de peso
  Abrir: gamma/fase_1_extraccion/outputs/anomalias_peso.csv
  Documentar cualquier anomalía relevante en el MD del experimento Pre-G.

□ PASO 8 — Extraer y fusionar eventos
  python gamma/fase_1_extraccion/scripts/g04_extract_events.py
  
  Verificar:
  python -c "
  import pandas as pd
  df = pd.read_parquet('gamma/fase_1_extraccion/data/raw/events_labeled.parquet')
  print(df.category.value_counts())
  "

□ PASO 9 — Construir sesiones
  python gamma/fase_1_extraccion/scripts/g05_build_sessions.py
  
  (Este script es genérico — copiar de Alpha con ajuste de rutas)

□ PASO 10 — Quality Report (checkpoint de bloqueo)
  python gamma/fase_1_extraccion/scripts/g06_quality_report.py
  
  ✓ Debe terminar sin AssertionError
  ✓ Revisar distribucion_por_periodo.json antes de continuar
```

### Fase 2 Gamma

```
□ PASO 11 — Construir labels
  python gamma/fase_2_dataset/scripts/g01_build_labels.py

□ PASO 12 — Calcular features (con resampleo + hora Santiago)
  python gamma/fase_2_dataset/scripts/g02_build_features.py
  
  Verificar que plateau_duration_s está en segundos (no filas):
  python -c "
  import pandas as pd
  df = pd.read_parquet('gamma/fase_2_dataset/data/interim/readings_features.parquet')
  print('plateau_duration_s max:', df.plateau_duration_s.max())
  print('Debe ser múltiplo de 30 (30s por fila resampleada)')
  "

□ PASO 13 — Construir train/val/test
  python gamma/fase_2_dataset/scripts/g03_build_train_dataset.py
  
  Verificar distribución de clases:
  python -c "
  import pandas as pd
  y = pd.read_parquet('gamma/fase_2_dataset/data/train/y_train.parquet')
  print(y.value_counts(normalize=True))
  "
  
  ⚠️  SELLAR X_test y y_test — NO cargar hasta G-Final

□ PASO 14 — Dataset report
  python gamma/fase_2_dataset/scripts/g04_dataset_report.py
```

### Fase 3 Gamma — G-01

```
□ PASO 15 — G-01: Baseline Gamma (solo LightGBM)
  python gamma/fase_3_modelos/scripts/g01_prepare_datasets.py
  python gamma/fase_3_modelos/scripts/g02_train_modelo_a_gbm.py
  python gamma/fase_3_modelos/scripts/g03_train_modelo_b_gbm.py
  python gamma/fase_3_modelos/scripts/g09_training_report.py
  
  Registrar resultados en:
  - gamma/experiments/g01_baseline_limpio.md (sección "7. Resultados")
  - gamma/EXPERIMENT_TRACKER_GAMMA.md (fila G-01)

□ PASO 16 — Evaluar contra umbrales G-01
  F1 activo ≥ 0.75? (referencia α-06: 0.7619)
  F1 alim ≥ 0.72?   (referencia α-06: 0.7606)
  F1 servido ≥ 0.25? (referencia α-06: 0.1395)
  
  Si G-01 NO supera a α-06 en F1 activo y F1 alim:
  → Revisar calidad de anotaciones Gamma (hora Santiago correcta?)
  → Verificar que ambos UUIDs están en el dataset
  → No avanzar a G-02 hasta entender la causa
```

---

## 13. Errores silenciosos conocidos y cómo evitarlos

Estos errores no lanzan excepciones pero producen resultados incorrectos:

**Error silencioso 1 — Filtrar por UUID único**  
Si en algún script se filtra `df[df["device_id"] == "3a460074-..."]` en lugar de `df[df["device_id"].isin(KPCL0034_UUIDS)]`, el dataset de Abril desaparece completamente sin warning. El modelo verá la mitad de los datos.

Prevención: en `_gamma_utils.py` definir `KPCL0034_UUIDS` como lista y usar siempre `.isin()`.

**Error silencioso 2 — Timezone UTC en features temporales**  
Si `hour_sin` se calcula con `df["ts_utc"].dt.hour` sin convertir a Santiago, el modelo aprende que Bandida come a las 12:00 UTC cuando en realidad come a las 8:00 Santiago. No da error, el modelo simplemente aprende un patrón desplazado.

Prevención: siempre `df["ts_utc"].dt.tz_convert(TZ_LOCAL)` antes de calcular `hour_sin`.

**Error silencioso 3 — Light features con zeros en Abril**  
`light_percent` y `light_lux` están en el CSV de Abril con valor 0 para KPCL0034. Si se incluyen en el ablation study de G-03, el "shift" detectado en luz entre Abril y Mayo-Jun es artefacto de datos ausentes, no información real.

Prevención: en G-03, evaluar features de luz solo sobre datos de Mayo-Jun (mascarar Abril como NaN para esas columnas).

**Error silencioso 4 — `pd.to_datetime()` con zonas horarias mixtas**  
`pd.to_datetime("2026-04-15 10:30:00-04")` puede devolver un objeto no-UTC dependiendo de la versión de pandas. Usar siempre `dateutil.parser.parse()` con `.astimezone(UTC)` para `audit_events.csv`.

**Error silencioso 5 — SMOTE aplicado sobre el val set**  
En Alpha, SMOTE se aplicaba correctamente solo al train set. En Gamma, si se copia el script sin revisar, podría aplicarse al val también. El F1 parecería mejor pero sería inflado.

Prevención: `g06_quality_report.py` puede verificar que `X_val` tiene el mismo número de filas antes y después de cargar.

**Error silencioso 6 — `plateau_duration` en filas en lugar de segundos**  
Si se copia el script de Fase 2 de Alpha sin modificar, `plateau_duration` queda en filas (número de filas consecutivas en plateau). Con datos de Abril a 14.7s, una fila = 14.7s. Con datos de Mayo a 30s, una fila = 30s. El mismo valor numérico representa duraciones diferentes.

Prevención: en `_gamma_phase2_utils.py`, calcular como `count × RESAMPLE_TARGET_S` donde `RESAMPLE_TARGET_S = 30`.

**Error silencioso 7 — Test set cargado accidentalmente**  
Ningún error, pero contamina la evaluación final.

Prevención: en `_gamma_phase3_utils.py`, la función `cargar_test_set()` lanza `PermissionError` siempre. Solo se descomenta en `g_final_evaluacion_test.py`.

---

## 14. Dependencias

### Entorno Python mínimo para Gamma

```
python>=3.11
pandas>=2.0
numpy>=1.24
scipy>=1.10
lightgbm>=4.3.0
xgboost>=2.0
catboost>=1.2
scikit-learn>=1.3
streamlit>=1.30
plotly>=5.18
pyarrow>=14.0
python-dateutil>=2.8
optuna>=3.4
imbalanced-learn>=0.11
```

### Para redes neuronales (G-06, solo en Colab)

```
torch>=2.0
lightning>=2.0
keras-tcn
```

### Verificación rápida del entorno

```python
# Ejecutar esto antes de empezar
import sys
print(f"Python: {sys.version}")

packages = {
    "pandas": "2.0", "numpy": "1.24", "scipy": "1.10",
    "lightgbm": "4.3.0", "xgboost": "2.0", "catboost": "1.2",
    "sklearn": "1.3", "streamlit": "1.30", "optuna": "3.4"
}
for pkg, version_min in packages.items():
    try:
        mod = __import__(pkg if pkg != "sklearn" else "sklearn")
        v = getattr(mod, "__version__", "?")
        print(f"  ✅ {pkg}: {v}")
    except ImportError:
        print(f"  ❌ {pkg}: NO INSTALADO")

# Verificar timezone
from zoneinfo import ZoneInfo
import datetime
tz = ZoneInfo("America/Santiago")
ahora = datetime.datetime.now(tz=tz)
print(f"\nHora actual Santiago: {ahora.strftime('%Y-%m-%d %H:%M %Z')}")
print("Si muestra CLT o CLST, timezone está correcto.")
```

---

## 15. FAQ de implementación

**P: ¿Cuánto tarda en cargar el CSV de Abril (242 MB)?**  
R: Con `pd.read_csv(..., low_memory=False)`, entre 15 y 45 segundos en un equipo normal. Si se tarda más de 2 minutos, verificar que el disco no está fragmentado. Una vez convertido a parquet, los usos posteriores son instantáneos (~1s).

**P: ¿Qué pasa si `generar_candidatos_servido.py` no encuentra candidatos?**  
R: Puede pasar si todos los tramos de subida de peso ya están anotados, o si el umbral de 5g es demasiado alto para el device. En ese caso, bajar `UMBRAL_SUBIDA_G` a 3g y volver a correr. Si sigue sin candidatos, revisar la curva de peso en el dashboard para encontrar servidos manualmente.

**P: ¿La app de anotación debe guardar directamente en Supabase o en CSV local?**  
R: En CSV local (`new_annotations_gamma.csv`). El pipeline de Gamma usa el CSV local como fuente, no Supabase directamente. Esto garantiza reproducibilidad — los mismos datos siempre producen los mismos resultados. La diferencia con Alpha es que Alpha guardaba en Supabase y luego descargaba.

**P: Si G-01 supera a α-06, ¿saltamos directamente a G-04?**  
R: No. El orden G-01 → G-02 → G-03 → G-04 es secuencial por diseño. G-02 puede encontrar un algoritmo mejor que LightGBM. G-03 puede encontrar features que mejoren más. Saltarse pasos significa perder información diagnóstica.

**P: ¿Qué hacer si el assertion de servido falla y no hay forma de anotar más sesiones rápidamente?**  
R: Documentar el número actual de sesiones y abrir el checklist Pre-G como "parcialmente completo". No ejecutar G-01 con menos de 80 sesiones de servido. La regla existe por una razón: con menos sesiones, el F1 de servido es estadísticamente inestable (varía ±0.20 entre corridas por azar). No tiene valor científico ni operativo.

**P: ¿El `dia_semana_sin` es realmente necesario?**  
R: Es una hipótesis a verificar en G-03. Si no mejora el F1 en el ablation study, se puede excluir en G-04. Está incluido en las 13 features Gamma porque la literatura de comportamiento animal sugiere que los gatos tienen rutinas semanales además de diarias. Con más datos, la señal debería ser capturable.

**P: ¿Cuándo se puede lanzar G-06 (redes neuronales)?**  
R: Solo cuando `sessions_labeled.parquet` muestre ≥300 alim + ≥80 serv. El quality report de G-05 debe verificar esto explícitamente. Antes de ese punto, las NN tienen ventaja estructural de LGBM por el tamaño del dataset — exactamente el error α-7.

---

## Resumen de archivos a crear (en orden)

| Orden | Archivo | Acción |
|---|---|---|
| 1 | `gamma/fase_1_extraccion/scripts/_gamma_utils.py` | Copiar sección 3 de este documento |
| 2 | `gamma/fase_1_extraccion/scripts/g03_extract_readings.py` | Copiar sección 4 |
| 3 | `gamma/fase_1_extraccion/scripts/g04_extract_events.py` | Copiar sección 5 |
| 4 | `gamma/fase_2_dataset/scripts/_gamma_phase2_utils.py` | Copiar sección 6 |
| 5 | `gamma/fase_4_anotacion/app_anotacion_gamma.py` | Implementar según sección 7 |
| 6 | `gamma/fase_4_anotacion/generar_candidatos_servido.py` | Copiar sección 8 |
| 7 | `gamma/fase_1_extraccion/scripts/g06_quality_report.py` | Copiar sección 9 |
| 8 | `gamma/fase_2_dataset/scripts/_gamma_phase2_utils.py` | Ya en sección 6 |
| 9 | `gamma/fase_3_modelos/scripts/_gamma_phase3_utils.py` | Adaptar de Alpha + agregar bloqueo test set |
| 10 | Scripts g05, g01-g04 Fase 2, g01-g09 Fase 3 | Copiar de Alpha con ajustes de rutas y features |

---

*Documento generado el 2026-06-15. Actualizar cuando cambien rutas o cuando un experimento numerado modifique invariantes.*