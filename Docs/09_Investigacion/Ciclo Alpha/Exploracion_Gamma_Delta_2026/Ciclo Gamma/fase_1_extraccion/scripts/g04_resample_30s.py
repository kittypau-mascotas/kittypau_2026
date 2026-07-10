"""
g04_resample_30s.py — Fase 1 Gamma
Resamplea readings_unificado_utc.parquet a cadencia uniforme de 30s,
forward-fill por segmento de continuidad (sin interpolar a través de gaps).

Nota de validación: se verificó que el modelo_a.lgb guardado (usado en g06 solo
para preselección de candidatos) incluye `cadencia_s` como feature con
importancia ~0 (gain=0.0 en feature_importance.csv) — consistente con que ya fue
entrenado sobre datos de cadencia casi constante (resampleados). Por eso resamplear
aquí a 30s antes de la inferencia de g06 no debería introducir un shift de
distribución relevante respecto a lo que el modelo aprendió.
"""
import sys
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    GAP_CUTOFF_S, RESAMPLE_TARGET_S, READINGS_UNIFICADO_UTC, READINGS_UNIFICADO_30S,
)


def resample_to_uniform(df: pd.DataFrame, target_s: int = RESAMPLE_TARGET_S) -> pd.DataFrame:
    """
    Resamplea a cadencia uniforme usando forward-fill por segmento de continuidad.
    El peso del bowl es una señal de tipo escalón — forward-fill es la
    interpolación correcta. No interpola a través de discontinuidades reales
    (gaps > GAP_CUTOFF_S). Idéntica a la función validada en Exp09A.
    """
    df = df.copy().sort_values("ts_utc")
    diff_s = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df["_segmento"] = (diff_s > GAP_CUTOFF_S).cumsum()

    resultados = []
    for seg_id, grupo in df.groupby("_segmento"):
        if len(grupo) < 2:
            continue
        t_inicio, t_fin = grupo["ts_utc"].iloc[0], grupo["ts_utc"].iloc[-1]
        nuevo_idx = pd.date_range(t_inicio, t_fin, freq=f"{target_s}s", tz="UTC")
        grupo_r = grupo.set_index("ts_utc").reindex(nuevo_idx, method="ffill")
        grupo_r.index.name = "ts_utc"
        grupo_r["_segmento"] = seg_id
        resultados.append(grupo_r.reset_index())

    if not resultados:
        raise ValueError("Ningún segmento tiene ≥2 lecturas — revisar GAP_CUTOFF_S o los datos fuente")

    df_res = pd.concat(resultados, ignore_index=True)
    print(f"Resampleo: {len(df):,} → {len(df_res):,} filas ({target_s}s cadencia)")
    return df_res


def main():
    print("=== g04_resample_30s.py — Ciclo Gamma · Fase 1 ===\n")
    if not READINGS_UNIFICADO_UTC.exists():
        raise FileNotFoundError("readings_unificado_utc.parquet no existe — ejecutar g03 primero")

    df = pd.read_parquet(READINGS_UNIFICADO_UTC)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)

    df_res = resample_to_uniform(df)

    READINGS_UNIFICADO_30S.parent.mkdir(parents=True, exist_ok=True)
    df_res.to_parquet(READINGS_UNIFICADO_30S, index=False)
    print(f"\n✅ readings_unificado_30s.parquet → {READINGS_UNIFICADO_30S}")
    print("   Próximo: g05_compute_features_12.py")


if __name__ == "__main__":
    main()