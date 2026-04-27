"""Script 02 - Calcular features sobre la serie de peso."""

from __future__ import annotations

import pandas as pd

from _phase2_utils import INTERIM_DIR, ensure_phase2_dirs, load_readings, remove_subsecond_duplicates, compute_segment_features


def main() -> None:
    ensure_phase2_dirs()
    in_path = INTERIM_DIR / "readings_labeled.parquet"
    if not in_path.exists():
        raise SystemExit("[ERROR] Falta readings_labeled.parquet. Ejecuta primero 01_build_labels.py")

    print("Cargando readings_labeled.parquet...")
    df = pd.read_parquet(in_path)
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)
    print(f"  Filas iniciales: {len(df):,}")

    df, removed = remove_subsecond_duplicates(df)
    print(f"[OK] Duplicados sub-segundo eliminados: {removed:,}")

    df = compute_segment_features(df)
    print(f"[OK] Segmentos de continuidad detectados: {int(df['segment_id'].nunique())}")
    print(f"[OK] Gaps > 5 min detectados: {int(df['segment_break'].sum())}")

    feature_cols = [
        "weight_grams",
        "delta_w",
        "delta_w_3",
        "delta_w_10",
        "rate_gs",
        "rolling_std_5",
        "rolling_std_10",
        "rolling_mean_5",
        "net_weight",
        "is_plateau",
        "plateau_duration",
        "hour_sin",
        "hour_cos",
        "clock_invalid",
        "gap_after_s",
        "segment_start",
        "segment_id",
    ]

    nan_report = df[feature_cols].isna().sum()
    nan_cols = nan_report[nan_report > 0]
    if not nan_cols.empty:
        print("[AVISO] NaN encontrados en features:")
        for col, cnt in nan_cols.items():
            print(f"  {col}: {cnt}")
    else:
        print("[OK] Sin NaN en ninguna feature.")

    out_path = INTERIM_DIR / "readings_features.parquet"
    df.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")
    print(f"     Features calculadas: {len(feature_cols)}")
    print(f"     Columnas totales: {len(df.columns)}")


if __name__ == "__main__":
    main()
