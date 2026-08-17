# Ciclo Gamma — Specs de Scripts (pre-implementación)

> Fusión de las specs `.md` de cada script del pipeline Gamma (convención documentada en [[GAMMA_INSTRUCTIVO]] regla 1: se redacta el `.md` primero, Mauro lo convierte a `.py` a mano). Cada sección corresponde a un script.


---


<!-- ==== fusionado desde g01_build_labels.md ==== -->

# g01_build_labels — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g01_build_labels.py`
**Prerequisito:** `sessions_labeled.parquet` y `readings_unificado_30s.parquet` generados (Fase 1 completa)
**Salida:** `Ciclo_Gamma/fase_2_dataset/data/interim/readings_labeled.parquet`

Notas importantes:
- Usa las sesiones **reales** (sin augmentación) para etiquetar lecturas individuales.
  La augmentación de sesiones es para checkpoints de calidad (g10), no para el dataset de filas.
- Default label = reposo (2). Solo alimentacion y servido se etiquetan desde sesiones.
- El desbalance resultante (~1-2% filas activas) se maneja con `class_weight` en Fase 3,
  no aquí.

---

```python
"""
g01_build_labels.py — Fase 2 Gamma
Asigna label de clasificación (0=alimentacion, 1=servido, 2=reposo) a cada
lectura de readings_unificado_30s.parquet basándose en sessions_labeled.parquet.
"""
import sys
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    READINGS_UNIFICADO_30S, SESSIONS_LABELED_PARQUET,
    FASE2_INTERIM, LABEL_ENCODING,
)

LABEL_DEFAULT = LABEL_ENCODING["reposo"]


def asignar_labels(readings: pd.DataFrame, sesiones: pd.DataFrame) -> pd.DataFrame:
    """
    Para cada lectura, verifica si cae dentro de alguna sesión etiquetada.
    Default: reposo. Solo alimentacion y servido producen label distinto.
    """
    readings = readings.copy()
    readings["label"] = LABEL_DEFAULT

    sesiones_validas = sesiones[
        sesiones["session_type"].isin(["alimentacion", "servido"])
    ].copy()

    print(f"Sesiones válidas para labeling: {len(sesiones_validas)}")
    print(f"  alimentacion: {len(sesiones_validas[sesiones_validas.session_type == 'alimentacion'])}")
    print(f"  servido:      {len(sesiones_validas[sesiones_validas.session_type == 'servido'])}")

    for _, ses in sesiones_validas.iterrows():
        label = LABEL_ENCODING[ses["session_type"]]
        mask  = (readings["ts_utc"] >= ses["ts_inicio"]) & (readings["ts_utc"] <= ses["ts_fin"])
        readings.loc[mask, "label"] = label

    return readings


def main():
    print("=== g01_build_labels.py — Ciclo Gamma · Fase 2 ===\n")
    FASE2_INTERIM.mkdir(parents=True, exist_ok=True)

    if not READINGS_UNIFICADO_30S.exists():
        raise FileNotFoundError("readings_unificado_30s.parquet no existe — ejecutar Fase 1 primero")
    if not SESSIONS_LABELED_PARQUET.exists():
        raise FileNotFoundError("sessions_labeled.parquet no existe — ejecutar g09 de Fase 1 primero")

    readings = pd.read_parquet(READINGS_UNIFICADO_30S)
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)
    print(f"Lecturas a etiquetar: {len(readings):,}")
    print(f"Rango: {readings['ts_utc'].min()} → {readings['ts_utc'].max()}")

    sesiones = pd.read_parquet(SESSIONS_LABELED_PARQUET)
    sesiones["ts_inicio"] = pd.to_datetime(sesiones["ts_inicio"], utc=True)
    sesiones["ts_fin"]    = pd.to_datetime(sesiones["ts_fin"],    utc=True)

    readings = asignar_labels(readings, sesiones)

    inv = {v: k for k, v in LABEL_ENCODING.items()}
    dist = readings["label"].value_counts().sort_index()
    print("\nDistribución de labels:")
    for lbl_id, count in dist.items():
        pct = count / len(readings) * 100
        print(f"  {lbl_id} ({inv.get(lbl_id, '?'):15s}): {count:7,}  ({pct:.2f}%)")

    out = FASE2_INTERIM / "readings_labeled.parquet"
    readings.to_parquet(out, index=False)
    print(f"\n✅ readings_labeled.parquet → {out}")
    print("   Próximo: g02_build_features.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g02_build_features.md ==== -->

# g02_build_features — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g02_build_features.py`
**Prerequisito:** `readings_labeled.parquet` + `_gamma_phase2_utils.py` en la misma carpeta
**Salida:** `Ciclo_Gamma/fase_2_dataset/data/interim/readings_features.parquet`

Notas importantes:
- Las lecturas ya vienen a 30s uniforme de Fase 1 (g04_resample_30s). No se resamplea de nuevo.
- Las features se calculan POR SEGMENTO (bloques separados por gap > GAP_CUTOFF_S=300s)
  para que rolling stats no crucen gaps de transmisión.
- Segmentos con < 5 filas se descartan (insuficientes para rolling_std_5).

---

```python
"""
g02_build_features.py — Fase 2 Gamma
Calcula las 13 features Gamma sobre readings_labeled.parquet por segmento.
Las lecturas ya están a 30s uniforme — no se resamplea.
"""
import sys
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FASE2_INTERIM, FEATURES_GAMMA, GAP_CUTOFF_S
from _gamma_phase2_utils import calcular_todas_features, verificar_features_gamma


def procesar_por_segmento(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula features por segmento de continuidad (gap > GAP_CUTOFF_S).
    Garantiza que rolling stats no crucen gaps de transmisión.
    """
    df = df.sort_values("ts_utc").copy()
    diff_s   = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df["_seg"] = (diff_s > GAP_CUTOFF_S).cumsum()

    resultados = []
    for seg_id, grupo in df.groupby("_seg"):
        if len(grupo) < 5:
            continue
        grupo_f = calcular_todas_features(grupo.copy())
        resultados.append(grupo_f)

    if not resultados:
        raise ValueError("No se produjeron segmentos con datos suficientes (mínimo 5 filas).")

    return pd.concat(resultados, ignore_index=True)


def main():
    print("=== g02_build_features.py — Ciclo Gamma · Fase 2 ===\n")
    FASE2_INTERIM.mkdir(parents=True, exist_ok=True)

    path_in = FASE2_INTERIM / "readings_labeled.parquet"
    if not path_in.exists():
        raise FileNotFoundError("readings_labeled.parquet no existe — ejecutar g01 primero")

    df = pd.read_parquet(path_in)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)
    print(f"Lecturas de entrada: {len(df):,}")
    print(f"Rango: {df['ts_utc'].min()} → {df['ts_utc'].max()}")

    n_segs = int((df["ts_utc"].diff().dt.total_seconds().fillna(0) > GAP_CUTOFF_S).sum()) + 1
    print(f"Segmentos detectados (gap > {GAP_CUTOFF_S}s): {n_segs}")

    df_features = procesar_por_segmento(df)
    print(f"\nLecturas post-features: {len(df_features):,}")

    verificar_features_gamma(df_features)

    dist = df_features["label"].value_counts().sort_index()
    print("\nDistribución labels tras features:")
    for lbl, cnt in dist.items():
        print(f"  {lbl}: {cnt:,} ({cnt / len(df_features) * 100:.2f}%)")

    out = FASE2_INTERIM / "readings_features.parquet"
    df_features.to_parquet(out, index=False)
    print(f"\n✅ readings_features.parquet → {out}")
    print("   Próximo: g03_build_train_dataset.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g03_build_train_dataset.md ==== -->

# g03_build_train_dataset — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g03_build_train_dataset.py`
**Prerequisito:** `readings_features.parquet` generado
**Salidas:**
- `Ciclo_Gamma/fase_2_dataset/data/train/X_train.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/y_train.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/X_val.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/y_val.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/X_test.parquet` ← **SELLAR — no abrir hasta G-Final**
- `Ciclo_Gamma/fase_2_dataset/data/train/y_test.parquet` ← **SELLAR**
- `Ciclo_Gamma/fase_2_dataset/data/train/dataset_meta.json`

Split temporal (datos: 2026-04-08 → 2026-06-14):
- **Train:** < 2026-05-25 (~7 semanas)
- **Val:**   2026-05-25 → 2026-06-07 (~2 semanas)
- **Test:**  ≥ 2026-06-07 → fin (~1 semana) — SELLADO

---

```python
"""
g03_build_train_dataset.py — Fase 2 Gamma
Split temporal train/val/test con fechas fijas.
Invariante: split SIEMPRE por fecha, NUNCA aleatorio.
X_test queda sellado hasta G-Final.
"""
import sys
import json
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    FASE2_INTERIM, FASE2_TRAIN, FEATURES_GAMMA, LABEL_ENCODING
)

# ── Fechas de split ───────────────────────────────────────────────────────────
# Ajustadas al rango real 2026-04-08 → 2026-06-14 para distribuir ~70/20/10.
# Cambiar estas fechas requiere documentarlo en el experimento correspondiente.
FECHA_SPLIT_VAL  = pd.Timestamp("2026-05-25", tz="UTC")  # fin de train / inicio val
FECHA_SPLIT_TEST = pd.Timestamp("2026-06-07", tz="UTC")  # fin de val  / inicio test


def split_temporal(df: pd.DataFrame):
    train = df[df["ts_utc"] <  FECHA_SPLIT_VAL].copy()
    val   = df[(df["ts_utc"] >= FECHA_SPLIT_VAL) & (df["ts_utc"] < FECHA_SPLIT_TEST)].copy()
    test  = df[df["ts_utc"] >= FECHA_SPLIT_TEST].copy()

    print(f"\nSplit temporal:")
    print(f"  Train: hasta {FECHA_SPLIT_VAL.date()}   → {len(train):,} filas")
    print(f"  Val:   {FECHA_SPLIT_VAL.date()} → {FECHA_SPLIT_TEST.date()} → {len(val):,} filas")
    print(f"  Test:  desde {FECHA_SPLIT_TEST.date()}  → {len(test):,} filas  [SELLADO]")

    if len(train) == 0:
        raise ValueError("Train set vacío — verificar FECHA_SPLIT_VAL")
    if len(val) == 0:
        raise ValueError("Val set vacío — verificar FECHA_SPLIT_TEST")
    if len(test) == 0:
        print("  ⚠️  Test set vacío — actualizar FECHA_SPLIT_TEST si hay datos más recientes")

    return train, val, test


def guardar_splits(train, val, test):
    FASE2_TRAIN.mkdir(parents=True, exist_ok=True)
    inv = {v: k for k, v in LABEL_ENCODING.items()}

    for nombre, df_split in [("train", train), ("val", val), ("test", test)]:
        X = df_split[FEATURES_GAMMA]
        y = df_split["label"].rename("label")

        X.to_parquet(FASE2_TRAIN / f"X_{nombre}.parquet", index=False)
        y.to_frame().to_parquet(FASE2_TRAIN / f"y_{nombre}.parquet", index=False)

        dist = y.value_counts().sort_index()
        print(f"\n  {nombre}: {len(X):,} filas")
        for lbl, cnt in dist.items():
            print(f"    {lbl} ({inv.get(int(lbl), '?'):15s}): {cnt:6,} ({cnt / len(y) * 100:.2f}%)")

    meta = {
        "fecha_split_val":  FECHA_SPLIT_VAL.isoformat(),
        "fecha_split_test": FECHA_SPLIT_TEST.isoformat(),
        "features":         FEATURES_GAMMA,
        "n_features":       len(FEATURES_GAMMA),
        "n_train":          int(len(train)),
        "n_val":            int(len(val)),
        "n_test":           int(len(test)),
        "label_encoding":   LABEL_ENCODING,
        "test_sellado":     True,
        "nota": "X_test NO evaluar hasta G-Final (regla 1 Ciclo Gamma)",
    }
    with open(FASE2_TRAIN / "dataset_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    print("\n✅ dataset_meta.json guardado")
    print("\n⚠️  X_test.parquet y y_test.parquet SELLADOS.")
    print("   No abrir hasta que G-Final seleccione el modelo candidato.")


def main():
    print("=== g03_build_train_dataset.py — Ciclo Gamma · Fase 2 ===\n")

    path_in = FASE2_INTERIM / "readings_features.parquet"
    if not path_in.exists():
        raise FileNotFoundError("readings_features.parquet no existe — ejecutar g02 primero")

    df = pd.read_parquet(path_in)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)

    faltantes = [f for f in FEATURES_GAMMA if f not in df.columns]
    if faltantes:
        raise AssertionError(f"Features faltantes en readings_features.parquet: {faltantes}")

    n_antes = len(df)
    df = df.dropna(subset=FEATURES_GAMMA + ["label"])
    if len(df) < n_antes:
        print(f"⚠️  Eliminadas {n_antes - len(df):,} filas con NaN en features o label")

    train, val, test = split_temporal(df)
    guardar_splits(train, val, test)

    print(f"\n✅ Dataset Gamma listo en: {FASE2_TRAIN}")
    print("   Próximo: g04_dataset_report.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g04_dataset_report.md ==== -->

# g04_dataset_report — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g04_dataset_report.py`
**Prerequisito:** train/val/test parquets generados (g03)
**Salidas:**
- `Ciclo_Gamma/fase_2_dataset/outputs/dataset_report.json`

Checkpoint de Fase 2: reporta distribución, estadísticas de features e imbalance ratio.
Si imbalance > 10x en train, avisa que se debe usar `class_weight='balanced'` en Fase 3.

---

```python
"""
g04_dataset_report.py — Fase 2 Gamma
Reporte de distribución del dataset: clases, features, split ratios.
Checkpoint de calidad antes de Fase 3.
"""
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import GAMMA_ROOT, FASE2_TRAIN, FEATURES_GAMMA, LABEL_ENCODING

REPORT_DIR = GAMMA_ROOT / "fase_2_dataset" / "outputs"


def cargar_splits() -> dict:
    splits = {}
    for nombre in ["train", "val", "test"]:
        X = pd.read_parquet(FASE2_TRAIN / f"X_{nombre}.parquet")
        y = pd.read_parquet(FASE2_TRAIN / f"y_{nombre}.parquet").squeeze()
        splits[nombre] = (X, y)
    return splits


def reporte_distribucion(splits: dict) -> dict:
    inv = {v: k for k, v in LABEL_ENCODING.items()}
    total = sum(len(X) for X, _ in splits.values())
    reporte = {}

    for nombre, (X, y) in splits.items():
        dist = y.value_counts().sort_index().to_dict()
        reporte[nombre] = {
            "n_total": len(y),
            "pct_del_total": round(len(y) / total * 100, 1),
            "clases": {
                inv.get(int(k), str(k)): {"n": int(v), "pct": round(v / len(y) * 100, 2)}
                for k, v in dist.items()
            },
        }
    return reporte


def reporte_features(X_train: pd.DataFrame) -> dict:
    stats = {}
    for feat in FEATURES_GAMMA:
        if feat not in X_train.columns:
            continue
        col = X_train[feat]
        stats[feat] = {
            "mean":    round(float(col.mean()),          4),
            "std":     round(float(col.std()),           4),
            "min":     round(float(col.min()),           4),
            "max":     round(float(col.max()),           4),
            "pct_nan": round(float(col.isna().mean()) * 100, 2),
        }
    return stats


def main():
    print("=== g04_dataset_report.py — Ciclo Gamma · Fase 2 ===\n")
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    splits = cargar_splits()
    inv = {v: k for k, v in LABEL_ENCODING.items()}

    print("── Distribución por split ──────────────────────────────")
    dist = reporte_distribucion(splits)
    for nombre, info in dist.items():
        print(f"\n{nombre.upper()} ({info['n_total']:,} filas — {info['pct_del_total']}% del total):")
        for cls, d in info["clases"].items():
            print(f"  {cls:20s}: {d['n']:6,} ({d['pct']:.2f}%)")

    X_train, y_train = splits["train"]
    print("\n── Features Gamma — estadísticas train ─────────────────")
    feat_stats = reporte_features(X_train)
    for feat, s in feat_stats.items():
        nan_str = f"  NaN:{s['pct_nan']:.1f}%" if s["pct_nan"] > 0 else ""
        print(f"  {feat:22s}: mean={s['mean']:8.3f}  std={s['std']:7.3f}{nan_str}")

    counts = y_train.value_counts()
    imbalance_ratio = float(counts.max()) / float(counts.min()) if counts.min() > 0 else float("inf")
    print(f"\nImbalance ratio (train): {imbalance_ratio:.1f}x (max/min clases)")
    if imbalance_ratio > 10:
        print("  ⚠️  Imbalance > 10x — usar class_weight='balanced' o is_unbalance=True en Fase 3")
    else:
        print("  ✅ Imbalance manejable")

    # Exportar
    reporte_final = {
        "splits":                   dist,
        "features":                 feat_stats,
        "imbalance_ratio_train":    round(imbalance_ratio, 2),
        "n_features":               len(FEATURES_GAMMA),
        "features_lista":           FEATURES_GAMMA,
        "label_encoding":           LABEL_ENCODING,
    }
    out = REPORT_DIR / "dataset_report.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(reporte_final, f, indent=2, ensure_ascii=False)

    print(f"\n✅ dataset_report.json → {out}")
    print("   Fase 2 completa. Próximo: Fase 3 — experimentos de modelos")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g05_build_sessions.md ==== -->

# g05_build_sessions — PY [OBSOLETO]

> ⚠️ **Reemplazado el 2026-06-16.** Este script asumía que las anotaciones ya
> existían antes de Fase 1 (modelo de anotación manual desde cero, descartado).
> La Fase 1 vigente de Gamma vive en
> [`Ciclo_Gamma/fase_1_extraccion/scripts/`](../../fase_1_extraccion/scripts/),
> con la lógica equivalente repartida en `g09_build_sessions_labeled.md` (post-
> retiquetado) y el resto del pipeline de unificación + inferencia con Modelo A
> (`g01` a `g10`). Mantenido aquí solo como referencia histórica.

**Destino:** `Data Science/gamma/fase_1_extraccion/scripts/g05_build_sessions.py`
**Prerequisito:** `g03_extract_readings.py` + `g04_extract_events.py` ejecutados
**Salida:** `gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet`

---

```python
"""
g05_build_sessions.py — Fase 1 Gamma
Agrupa lecturas en sesiones usando GAP_CUTOFF_S y asigna labels desde events_labeled.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    GAMMA_ROOT, FASE1_RAW, GAP_CUTOFF_S, RESAMPLE_TARGET_S,
    MIN_CONSUMED_G, MIN_SESSION_S, KPCL0034_CODE
)

VENTANA_MATCH_S = 60  # segundos — margen para asignar evento a sesión


def cargar_artefactos():
    readings = pd.read_parquet(FASE1_RAW / "readings_raw.parquet")
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)
    readings = readings.sort_values("ts_utc").reset_index(drop=True)

    events = pd.read_parquet(FASE1_RAW / "events_labeled.parquet")
    events["ts_utc"] = pd.to_datetime(events["ts_utc"], utc=True)
    events = events.sort_values("ts_utc").reset_index(drop=True)
    return readings, events


def segmentar_en_sesiones(df: pd.DataFrame) -> pd.DataFrame:
    """
    Divide la serie en sesiones usando GAP_CUTOFF_S.
    Calcula peso inicio/fin y consumido_g por sesión.
    """
    diff_s = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df = df.copy()
    df["_gap"] = diff_s > GAP_CUTOFF_S
    df["_sesion_id"] = df["_gap"].cumsum()

    sesiones = []
    for sesion_id, grupo in df.groupby("_sesion_id"):
        if len(grupo) < 2:
            continue
        duracion_s = (grupo["ts_utc"].iloc[-1] - grupo["ts_utc"].iloc[0]).total_seconds()
        if duracion_s < MIN_SESSION_S:
            continue

        peso_inicio = grupo["weight_grams"].iloc[0]
        peso_fin    = grupo["weight_grams"].iloc[-1]
        consumido_g = peso_inicio - peso_fin  # positivo si se consumió, negativo si se sirvió

        sesiones.append({
            "sesion_id":    sesion_id,
            "ts_inicio":    grupo["ts_utc"].iloc[0],
            "ts_fin":       grupo["ts_utc"].iloc[-1],
            "duracion_s":   duracion_s,
            "n_lecturas":   len(grupo),
            "peso_inicio_g": peso_inicio,
            "peso_fin_g":    peso_fin,
            "consumido_g":   consumido_g,
            "periodo":      grupo["_periodo"].iloc[0] if "_periodo" in grupo.columns else "desconocido",
            "session_type": "reposo",  # default — se actualiza con eventos
        })

    return pd.DataFrame(sesiones)


def asignar_labels_desde_eventos(sesiones: pd.DataFrame, eventos: pd.DataFrame) -> pd.DataFrame:
    """
    Asigna session_type a cada sesión buscando el evento más cercano a ts_inicio.
    Categorías canónicas: alimentacion, servido, reposo (default).
    """
    sesiones = sesiones.copy()

    # Filtrar eventos relevantes
    ev_alim = eventos[eventos["category"].isin([
        "inicio_alimentacion", "termino_alimentacion",
        "alimentacion"  # etiqueta de sesión completa de Gamma
    ])]
    ev_serv = eventos[eventos["category"].isin([
        "inicio_servido", "termino_servido",
        "servido"
    ])]

    def tipo_por_proximidad(ts_inicio, ev_df, ventana_s=VENTANA_MATCH_S):
        if ev_df.empty:
            return False
        deltas = (ev_df["ts_utc"] - ts_inicio).abs().dt.total_seconds()
        return deltas.min() <= ventana_s

    for idx, row in sesiones.iterrows():
        if tipo_por_proximidad(row["ts_inicio"], ev_alim):
            sesiones.loc[idx, "session_type"] = "alimentacion"
        elif tipo_por_proximidad(row["ts_inicio"], ev_serv):
            sesiones.loc[idx, "session_type"] = "servido"
        elif row["consumido_g"] < -MIN_CONSUMED_G:
            # Subida de peso sin evento → candidato a servido no anotado
            sesiones.loc[idx, "session_type"] = "servido_sin_anotar"
        elif row["consumido_g"] > MIN_CONSUMED_G:
            # Bajada de peso sin evento → posible alimentación no anotada
            sesiones.loc[idx, "session_type"] = "alim_sin_anotar"

    return sesiones


def reportar_distribucion(sesiones: pd.DataFrame) -> None:
    print("\n── Distribución de sesiones ──────────────────────────")
    dist = sesiones["session_type"].value_counts()
    for tipo, n in dist.items():
        marca = "✅" if tipo in ("alimentacion", "servido", "reposo") else "⚠️ "
        print(f"  {marca} {tipo:25s}: {n:4d}")

    # Por período
    if "periodo" in sesiones.columns:
        print("\n── Por período ────────────────────────────────────────")
        tabla = sesiones.pivot_table(
            index="periodo", columns="session_type", aggfunc="size", fill_value=0
        )
        print(tabla.to_string())


def main():
    print("=== g05_build_sessions.py — Ciclo Gamma ===\n")
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    readings, eventos = cargar_artefactos()
    print(f"Lecturas: {len(readings):,}")
    print(f"Eventos:  {len(eventos):,}")

    sesiones = segmentar_en_sesiones(readings)
    print(f"\nSesiones detectadas: {len(sesiones):,}")

    sesiones = asignar_labels_desde_eventos(sesiones, eventos)
    reportar_distribucion(sesiones)

    # Anomalías de sesiones
    anom = sesiones[sesiones["consumido_g"] < 0]
    if len(anom):
        out_anom = GAMMA_ROOT / "fase_1_extraccion/outputs/anomalias_sesiones.csv"
        out_anom.parent.mkdir(parents=True, exist_ok=True)
        anom.to_csv(out_anom, index=False)
        print(f"\n⚠️  {len(anom)} sesiones con consumido_g < 0 → anomalias_sesiones.csv")

    out = FASE1_RAW / "sessions_labeled.parquet"
    sesiones.to_parquet(out, index=False)
    print(f"\n✅ sessions_labeled.parquet → {out}")
    print("   Próximo: g06_quality_report.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde _gamma_phase2_utils.md ==== -->

# _gamma_phase2_utils — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/_gamma_phase2_utils.py`
**Rol:** Funciones de cálculo de las 13 features Gamma sobre lecturas a 30s.
Importado por g02_build_features.py. No ejecutar directamente.

Correcciones clave vs Alpha:
- `plateau_duration_s` en **segundos** (no filas)
- `hour_sin/cos` en **hora Santiago** (no UTC)
- `dia_semana_sin` nueva feature
- Sin `cadencia_s` (gain ≈ 0 en todos los experimentos Alpha)

---

```python
"""
_gamma_phase2_utils.py — Utilidades de features para Fase 2 Ciclo Gamma
Cálculo de las 13 features Gamma sobre un DataFrame de lecturas a 30s cadencia.
"""
import numpy as np
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "fase_1_extraccion" / "scripts"))
from _gamma_utils import (
    PLATEAU_THRESHOLD, BASELINE_WINDOW, RESAMPLE_TARGET_S, FEATURES_GAMMA, TZ_LOCAL
)


def calcular_delta_w(df: pd.DataFrame) -> pd.DataFrame:
    df["delta_w"] = df["weight_grams"].diff().fillna(0)
    return df


def calcular_delta_w_10(df: pd.DataFrame) -> pd.DataFrame:
    df["delta_w_10"] = df["delta_w"].rolling(10, min_periods=1).mean()
    return df


def calcular_rolling_stats(df: pd.DataFrame) -> pd.DataFrame:
    df["rolling_std_5"]  = df["weight_grams"].rolling(5,  min_periods=1).std().fillna(0)
    df["rolling_std_10"] = df["weight_grams"].rolling(10, min_periods=1).std().fillna(0)
    df["rolling_mean_5"] = df["weight_grams"].rolling(5,  min_periods=1).mean()
    return df


def calcular_net_weight(df: pd.DataFrame, baseline_window: int = BASELINE_WINDOW) -> pd.DataFrame:
    baseline = df["weight_grams"].rolling(baseline_window, min_periods=1).quantile(0.1)
    df["net_weight"] = df["weight_grams"] - baseline
    return df


def calcular_plateau(
    df: pd.DataFrame,
    threshold: float = PLATEAU_THRESHOLD,
    resample_s: int   = RESAMPLE_TARGET_S,
) -> pd.DataFrame:
    df["is_plateau"] = (df["rolling_std_5"] < threshold).astype(int)

    # Grupos de continuidad (cambia cada vez que is_plateau alterna)
    df["_pg"] = (df["is_plateau"] != df["is_plateau"].shift(1).fillna(df["is_plateau"].iloc[0])).cumsum()

    # Cuenta acumulada dentro de cada grupo plateau; los de reposo quedan en 0
    df["plateau_duration_s"] = (
        df.groupby("_pg")["is_plateau"]
        .transform(lambda s: s.cumsum() * resample_s if s.iloc[0] == 1 else pd.Series(0, index=s.index))
    )
    df = df.drop(columns=["_pg"])
    return df


def calcular_hora_features(df: pd.DataFrame) -> pd.DataFrame:
    ts_local  = df["ts_utc"].dt.tz_convert(TZ_LOCAL)
    hora_dec  = ts_local.dt.hour + ts_local.dt.minute / 60
    dia_float = ts_local.dt.dayofweek.astype(float)

    df["hour_sin"]       = np.sin(2 * np.pi * hora_dec  / 24)
    df["hour_cos"]       = np.cos(2 * np.pi * hora_dec  / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * dia_float / 7)
    return df


def calcular_todas_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica el pipeline completo de features sobre un segmento sin gaps.
    Requiere columnas: ts_utc, weight_grams, clock_invalid.
    Devuelve el mismo DataFrame con las 13 features FEATURES_GAMMA añadidas.
    """
    df = calcular_delta_w(df)
    df = calcular_delta_w_10(df)
    df = calcular_rolling_stats(df)
    df = calcular_net_weight(df)
    df = calcular_plateau(df)
    df = calcular_hora_features(df)
    return df


def verificar_features_gamma(df: pd.DataFrame) -> None:
    faltantes = [f for f in FEATURES_GAMMA if f not in df.columns]
    if faltantes:
        raise AssertionError(f"Features faltantes: {faltantes}")

    max_plateau = df["plateau_duration_s"].max()
    if max_plateau > 0 and max_plateau < RESAMPLE_TARGET_S:
        raise AssertionError(
            f"plateau_duration_s max={max_plateau:.1f} < {RESAMPLE_TARGET_S}s — "
            "parece estar en filas en lugar de segundos."
        )

    hour_range = (df["hour_sin"].min(), df["hour_sin"].max())
    if hour_range[0] >= 0:
        print("  ⚠️  hour_sin solo positivo — verificar que ts_utc cubre todo el día")

    print(f"✅ 13 features Gamma verificadas")
    print(f"   plateau_duration_s max: {max_plateau:.0f}s ({max_plateau/RESAMPLE_TARGET_S:.0f} filas × {RESAMPLE_TARGET_S}s)")
    print(f"   hour_sin rango: [{hour_range[0]:.3f}, {hour_range[1]:.3f}]")
    print(f"   dia_semana_sin rango: [{df['dia_semana_sin'].min():.3f}, {df['dia_semana_sin'].max():.3f}]")
```


---


<!-- ==== fusionado desde _gamma_phase3_utils.md ==== -->

# _gamma_phase3_utils — PY

**Destino:** `Data Science/gamma/fase_3_modelos/scripts/_gamma_phase3_utils.py`
**Rol:** Funciones genéricas de entrenamiento, calibración y evaluación para cualquier clasificador.

Incluye el bloqueo del test set (`cargar_test_set()` lanza `PermissionError` hasta G-Final).

---

```python
"""
_gamma_phase3_utils.py — Utilidades de Fase 3 Ciclo Gamma
Funciones genéricas para entrenar, calibrar, evaluar y reportar cualquier modelo.
Bloqueo del test set hasta G-Final.
"""
import sys
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any, Optional

from sklearn.calibration import CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    f1_score, roc_auc_score, classification_report,
    precision_recall_fscore_support
)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    FASE2_TRAIN, FASE3_OUTPUTS, FEATURES_GAMMA,
    LABEL_ENCODING, IDX_ALIMENTACION, IDX_SERVIDO, IDX_REPOSO,
    THRESHOLD_A_INICIAL
)


# ── Carga de datos ────────────────────────────────────────────────────────────

def cargar_train_val():
    """Carga X/y de train y val. Siempre disponibles durante el ciclo."""
    X_train = pd.read_parquet(FASE2_TRAIN / "X_train.parquet")[FEATURES_GAMMA]
    y_train = pd.read_parquet(FASE2_TRAIN / "y_train.parquet").squeeze()
    X_val   = pd.read_parquet(FASE2_TRAIN / "X_val.parquet")[FEATURES_GAMMA]
    y_val   = pd.read_parquet(FASE2_TRAIN / "y_val.parquet").squeeze()
    return X_train.values, y_train.values, X_val.values, y_val.values


def cargar_test_set():
    """
    ❌ BLOQUEADO hasta G-Final.
    Ver regla 1 del Ciclo Gamma: el test set no se evalúa hasta tener modelo candidato.
    Para desbloquear: comentar el raise en g_final_evaluacion_test.py ÚNICAMENTE.
    """
    raise PermissionError(
        "❌ El test set está bloqueado hasta G-Final (regla 1 Ciclo Gamma).\n"
        "   Solo desbloquear cuando G-08 confirme el modelo candidato final."
    )


# ── Calibración isotónica ─────────────────────────────────────────────────────

def calibrar_modelo_isotonica(modelo, X_val: np.ndarray, y_val: np.ndarray):
    """
    Calibra las probabilidades del modelo con isotonic regression sobre val set.
    Devuelve (calibrado, calibrator_por_clase).
    Invariante Gamma: siempre aplicar calibración antes de tune_threshold.
    """
    proba_val = modelo.predict_proba(X_val)
    calibrators = {}
    proba_calibrada = np.zeros_like(proba_val)

    for clase in range(proba_val.shape[1]):
        iso = IsotonicRegression(out_of_bounds="clip")
        y_bin = (y_val == clase).astype(int)
        iso.fit(proba_val[:, clase], y_bin)
        proba_calibrada[:, clase] = iso.predict(proba_val[:, clase])
        calibrators[clase] = iso

    # Re-normalizar para que sumen a 1
    suma = proba_calibrada.sum(axis=1, keepdims=True)
    suma = np.where(suma == 0, 1, suma)
    proba_calibrada = proba_calibrada / suma

    return proba_calibrada, calibrators


def tune_threshold_modelo_a(proba_val: np.ndarray, y_val: np.ndarray,
                             clase_objetivo: int = IDX_ALIMENTACION,
                             metrica: str = "f1") -> float:
    """
    Busca el threshold óptimo para la clase objetivo en Modelo A (binario: activo vs reposo).
    No usar threshold default 0.50 — invariante Gamma.
    """
    best_threshold = THRESHOLD_A_INICIAL
    best_score = 0.0

    for thr in np.arange(0.05, 0.95, 0.01):
        pred = (proba_val[:, clase_objetivo] >= thr).astype(int)
        y_bin = (y_val == clase_objetivo).astype(int)
        f1 = f1_score(y_bin, pred, zero_division=0)
        if f1 > best_score:
            best_score = f1
            best_threshold = thr

    print(f"  Threshold óptimo para clase {clase_objetivo}: {best_threshold:.2f} (F1={best_score:.4f})")
    return best_threshold


# ── Evaluación ────────────────────────────────────────────────────────────────

def evaluar_modelo_a(modelo, X_val: np.ndarray, y_val: np.ndarray,
                     threshold: Optional[float] = None) -> dict:
    """
    Evalúa Modelo A (binario: activo = alimentacion+servido vs reposo).
    Retorna métricas para EXPERIMENT_TRACKER.
    """
    proba = modelo.predict_proba(X_val)
    proba_activo = proba[:, IDX_ALIMENTACION] + proba[:, IDX_SERVIDO]

    if threshold is None:
        threshold = THRESHOLD_A_INICIAL

    pred_activo = (proba_activo >= threshold).astype(int)
    y_activo    = ((y_val == IDX_ALIMENTACION) | (y_val == IDX_SERVIDO)).astype(int)

    f1_act  = f1_score(y_activo, pred_activo, zero_division=0)
    try:
        auc = roc_auc_score(y_activo, proba_activo)
    except Exception:
        auc = float("nan")

    return {
        "modelo_a": {
            "f1_activo":  round(float(f1_act), 4),
            "auc_roc":    round(float(auc),   4),
            "threshold":  round(float(threshold), 3),
        }
    }


def evaluar_modelo_b(modelo, X_val: np.ndarray, y_val: np.ndarray) -> dict:
    """
    Evalúa Modelo B (multiclase: alimentacion / servido / reposo).
    Retorna métricas para EXPERIMENT_TRACKER.
    """
    pred = modelo.predict(X_val)
    inv  = {v: k for k, v in LABEL_ENCODING.items()}

    f1_alim = f1_score(y_val, pred, labels=[IDX_ALIMENTACION], average="macro", zero_division=0)
    f1_serv = f1_score(y_val, pred, labels=[IDX_SERVIDO],      average="macro", zero_division=0)
    f1_macro = f1_score(y_val, pred, average="macro", zero_division=0)

    return {
        "modelo_b": {
            "f1_alimentacion": round(float(f1_alim), 4),
            "f1_servido":      round(float(f1_serv), 4),
            "f1_macro":        round(float(f1_macro), 4),
        }
    }


def imprimir_metricas(nombre: str, metricas: dict) -> None:
    print(f"\n── Métricas {nombre} ──────────────────────────────")
    for grupo, vals in metricas.items():
        print(f"  {grupo}:")
        for k, v in vals.items():
            marca = ""
            if k == "f1_activo"      and v >= 0.75: marca = " ✅"
            if k == "f1_activo"      and v <  0.75: marca = " ⚠️"
            if k == "f1_servido"     and v >= 0.40: marca = " ✅"
            if k == "f1_servido"     and v <  0.40: marca = " ⚠️"
            if k == "f1_alimentacion" and v >= 0.75: marca = " ✅"
            if k == "auc_roc"        and v >= 0.90: marca = " ✅"
            print(f"    {k:20s}: {v}{marca}")


# ── Persistencia de modelos ───────────────────────────────────────────────────

def guardar_lightgbm(modelo, calibrators: dict, nombre: str, metricas: dict) -> None:
    FASE3_OUTPUTS.parent.parent.joinpath("models/gbm").mkdir(parents=True, exist_ok=True)
    model_dir = FASE3_OUTPUTS.parent.parent / "models/gbm"

    modelo.booster_.save_model(str(model_dir / f"{nombre}.lgb"))
    with open(model_dir / f"{nombre}_calibrators.pkl", "wb") as f:
        pickle.dump(calibrators, f)
    with open(model_dir / f"{nombre}_metricas.json", "w") as f:
        json.dump(metricas, f, indent=2)
    print(f"  ✅ Guardado: {model_dir}/{nombre}.lgb")


def guardar_sklearn(modelo, nombre: str, metricas: dict, model_type: str = "classical") -> None:
    model_dir = FASE3_OUTPUTS.parent.parent / f"models/{model_type}"
    model_dir.mkdir(parents=True, exist_ok=True)

    with open(model_dir / f"{nombre}.pkl", "wb") as f:
        pickle.dump(modelo, f)
    with open(model_dir / f"{nombre}_metricas.json", "w") as f:
        json.dump(metricas, f, indent=2)
    print(f"  ✅ Guardado: {model_dir}/{nombre}.pkl")


def guardar_reporte_entrenamiento(nombre_exp: str, resultados: list) -> None:
    """Guarda tabla comparativa de modelos para el experimento."""
    FASE3_OUTPUTS.mkdir(parents=True, exist_ok=True)
    out = FASE3_OUTPUTS / f"{nombre_exp}_report.json"
    with open(out, "w") as f:
        json.dump(resultados, f, indent=2)
    print(f"\n✅ Reporte guardado: {out}")
```


---
