"""
d02_cargar_datos.py — Fase 1 Delta
Carga readings de Gamma, resamplea a 30s, calcula features Gamma (13) + Delta (5)
y exporta readings_delta.parquet a fase_1_datos/data/processed/.
"""
import sys
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from _delta_utils import (
    cargar_readings_gamma,
    aplicar_timestamp_correcto,
    calcular_features_delta_extra,
    exportar_parquet,
    FEATURES_GAMMA,
    RESAMPLE_TARGET_S,
    FASE1_DATA_PROC,
    GAP_CUTOFF_S,
    PLATEAU_THRESHOLD,
    BASELINE_WINDOW,
    TZ_LOCAL,
)


def _calcular_por_segmento(g: pd.DataFrame) -> pd.DataFrame:
    """
    Replica calcular_todas_features de _gamma_phase2_utils sobre un segmento
    sin gaps internos. Usa columna 'ts' (UTC timezone-aware) en lugar de 'ts_utc'.
    """
    g = g.copy()
    w = g["weight_grams"]

    g["delta_w"]        = w.diff().fillna(0)
    g["delta_w_10"]     = g["delta_w"].rolling(10, min_periods=1).mean()
    g["rolling_std_5"]  = w.rolling(5,  min_periods=1).std().fillna(0)
    g["rolling_std_10"] = w.rolling(10, min_periods=1).std().fillna(0)
    g["rolling_mean_5"] = w.rolling(5,  min_periods=1).mean()

    baseline        = w.rolling(BASELINE_WINDOW, min_periods=1).quantile(0.1)
    g["net_weight"] = w - baseline

    g["is_plateau"] = (g["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)
    _pg = (
        g["is_plateau"] != g["is_plateau"].shift(1).fillna(g["is_plateau"].iloc[0])
    ).cumsum()
    g["plateau_duration_s"] = g.groupby(_pg)["is_plateau"].transform(
        lambda s: s.cumsum() * RESAMPLE_TARGET_S if s.iloc[0] == 1
        else pd.Series(0, index=s.index)
    )

    ts_local        = g["ts"].dt.tz_convert(TZ_LOCAL)
    hora_dec        = ts_local.dt.hour + ts_local.dt.minute / 60
    dia_float       = ts_local.dt.dayofweek.astype(float)
    g["hour_sin"]       = np.sin(2 * np.pi * hora_dec  / 24)
    g["hour_cos"]       = np.cos(2 * np.pi * hora_dec  / 24)
    g["dia_semana_sin"] = np.sin(2 * np.pi * dia_float / 7)

    return g


def calcular_features_gamma(df: pd.DataFrame) -> pd.DataFrame:
    """
    Replica la lógica de g02_build_features (Gamma) sobre el DataFrame resampleado.
    Descarta filas con weight_grams NaN (gaps del resampleo) y procesa por segmento
    para que las ventanas rolling no crucen discontinuidades temporales.
    """
    df = df.dropna(subset=["weight_grams"]).reset_index(drop=True)

    diff_s     = df["ts"].diff().dt.total_seconds().fillna(0)
    df["_seg"] = (diff_s > GAP_CUTOFF_S).cumsum()

    resultados = []
    for _, grupo in df.groupby("_seg"):
        if len(grupo) < 5:
            continue
        resultados.append(_calcular_por_segmento(grupo))

    if not resultados:
        raise ValueError("No se produjeron segmentos con datos suficientes (mínimo 5 filas).")

    return pd.concat(resultados, ignore_index=True).drop(columns=["_seg"])


def main():
    df = cargar_readings_gamma()
    df = aplicar_timestamp_correcto(df)

    df = (
        df.set_index("ts")
        .resample(f"{RESAMPLE_TARGET_S}s")
        .mean(numeric_only=True)
        .reset_index()
    )

    df = calcular_features_gamma(df)
    df = calcular_features_delta_extra(df)

    exportar_parquet(df, FASE1_DATA_PROC / "readings_delta.parquet")

    print(f"Filas totales: {len(df)}")
    print(f"% clock_invalid: {df['clock_invalid'].mean() * 100:.2f}%")
    print(f"Rango temporal: {df['ts'].min()} -> {df['ts'].max()}")
    print("NaN por columna (features Gamma):")
    print(df[FEATURES_GAMMA].isna().sum())


if __name__ == "__main__":
    main()
