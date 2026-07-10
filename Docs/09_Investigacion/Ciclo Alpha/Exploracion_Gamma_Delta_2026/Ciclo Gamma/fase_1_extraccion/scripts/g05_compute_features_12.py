"""
g05_compute_features_12.py — Fase 1 Gamma
Calcula el set de features ACTIVO (ver FEATURE_SETS en _gamma_utils.py) sobre
readings_unificado_30s.parquet. Por defecto usa "v1_modelo_a_13", el único
compatible con modelo_a.lgb. Si se cambia ACTIVE_FEATURE_VERSION a una variante
nueva, este script igual calcula todo lo necesario (cadencia_s, hour_sin/cos en
UTC, plateau_duration en filas) y deja la responsabilidad de validar
compatibilidad con el modelo en g06_inferencia_modelo_a.py.
"""
import json
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    BASELINE_WINDOW, PLATEAU_THRESHOLD, ACTIVE_FEATURE_VERSION,
    get_active_feature_set, READINGS_UNIFICADO_30S, X_INFERENCIA_3MESES,
    X_INFERENCIA_3MESES_META,
)


def calcular_features_temporales_utc(df: pd.DataFrame) -> pd.DataFrame:
    """hour_sin/hour_cos en UTC — reproduce el preprocesamiento con el que se entrenó el modelo guardado."""
    df = df.copy()
    hour_utc = df["ts_utc"].dt.hour + df["ts_utc"].dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * hour_utc / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour_utc / 24)
    return df


def calcular_features_peso(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    w = df["weight_grams"].interpolate(method="linear", limit=3, limit_direction="forward")
    df["weight_grams"] = w

    df["delta_w"] = w.diff(1)
    df["delta_w_10"] = w.diff(10)
    df["rolling_std_5"] = w.rolling(5, min_periods=1).std()
    df["rolling_std_10"] = w.rolling(10, min_periods=1).std()
    df["rolling_mean_5"] = w.rolling(5, min_periods=1).mean()
    df["net_weight"] = w - w.rolling(BASELINE_WINDOW, min_periods=1).quantile(0.10)
    df["is_plateau"] = (df["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)

    # plateau_duration EN FILAS (no segundos) — esquema con el que se entrenó el modelo guardado
    count, plateau_count = 0, []
    for val in df["is_plateau"]:
        count = count + 1 if val == 1 else 0
        plateau_count.append(count)
    df["plateau_duration"] = plateau_count

    return df


def calcular_cadencia_s(df: pd.DataFrame) -> pd.DataFrame:
    """Gap en segundos entre esta lectura y la anterior (~constante tras el resampleo a 30s)."""
    df = df.copy()
    df["cadencia_s"] = df["ts_utc"].diff().dt.total_seconds()
    df["cadencia_s"] = df["cadencia_s"].fillna(df["cadencia_s"].median())
    return df


def main():
    print("=== g05_compute_features_12.py — Ciclo Gamma · Fase 1 ===\n")
    if not READINGS_UNIFICADO_30S.exists():
        raise FileNotFoundError("readings_unificado_30s.parquet no existe — ejecutar g04 primero")

    feature_set = get_active_feature_set()
    features = feature_set["features"]
    print(f"Versión de features activa: {ACTIVE_FEATURE_VERSION}")
    print(f"  {feature_set['descripcion']}")
    print(f"  Compatible con modelo_a.lgb: {feature_set['compatible_con_modelo_a']}")

    df = pd.read_parquet(READINGS_UNIFICADO_30S)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)
    df = df.sort_values("ts_utc").reset_index(drop=True)

    df = calcular_features_temporales_utc(df)
    df = calcular_features_peso(df)
    df = calcular_cadencia_s(df)

    faltantes = [f for f in features if f not in df.columns]
    if faltantes:
        raise ValueError(f"Features faltantes tras el cálculo: {faltantes}")

    cols_meta = ["ts_utc", "device_id", "_periodo"]
    df_out = df[cols_meta + features].copy()

    X_INFERENCIA_3MESES.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_parquet(X_INFERENCIA_3MESES, index=False)

    metadata = {
        "version": ACTIVE_FEATURE_VERSION,
        "descripcion": feature_set["descripcion"],
        "compatible_con_modelo_a": feature_set["compatible_con_modelo_a"],
        "features": features,
        "n_features": len(features),
        "n_filas": len(df_out),
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "fuente": str(READINGS_UNIFICADO_30S),
    }
    with open(X_INFERENCIA_3MESES_META, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\n✅ X_inferencia_3meses.parquet: {len(df_out):,} filas, "
          f"{len(features)} features ({ACTIVE_FEATURE_VERSION}) → {X_INFERENCIA_3MESES}")
    print(f"✅ Metadata de versión → {X_INFERENCIA_3MESES_META}")
    print("   Próximo: g06_inferencia_modelo_a.py")


if __name__ == "__main__":
    main()
