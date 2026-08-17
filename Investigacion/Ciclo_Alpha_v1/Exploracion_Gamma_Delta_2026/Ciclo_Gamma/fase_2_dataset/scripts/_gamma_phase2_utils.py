
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
