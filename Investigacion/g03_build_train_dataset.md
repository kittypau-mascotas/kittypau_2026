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
