# g04_dataset_report — PY

**Destino:** `Ciclo Gamma/fase_2_dataset/scripts/g04_dataset_report.py`
**Prerequisito:** train/val/test parquets generados (g03)
**Salidas:**
- `Ciclo Gamma/fase_2_dataset/outputs/dataset_report.json`

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
