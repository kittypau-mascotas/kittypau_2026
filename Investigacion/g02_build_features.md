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
