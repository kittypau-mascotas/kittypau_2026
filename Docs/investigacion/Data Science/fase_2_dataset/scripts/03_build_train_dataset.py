"""Script 03 - Construir dataset de entrenamiento con split temporal."""

from __future__ import annotations

import json

import pandas as pd

from _phase2_utils import (
    INTERIM_DIR,
    LABEL_ORDER,
    TRAIN_DIR,
    class_distribution,
    class_weights,
    ensure_phase2_dirs,
    encode_labels,
    save_json,
    split_temporal,
)

FEATURE_COLS = [
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
]


def main() -> None:
    ensure_phase2_dirs()
    in_path = INTERIM_DIR / "readings_features.parquet"
    if not in_path.exists():
        raise SystemExit("[ERROR] Falta readings_features.parquet. Ejecuta primero 02_build_features.py")

    print("Cargando readings_features.parquet...")
    df = pd.read_parquet(in_path)
    df = df.sort_values("ts").reset_index(drop=True)
    print(f"  Total filas: {len(df):,}")

    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        raise SystemExit(f"[ERROR] Features faltantes: {missing}")
    if "label" not in df.columns:
        raise SystemExit("[ERROR] Falta la columna label en readings_features.parquet")

    dist = df["label"].value_counts()
    print("")
    print("Distribucion de clases:")
    for lbl, cnt in dist.items():
        print(f"  {lbl:<20}: {cnt:>6,} ({cnt/len(df)*100:.1f}%)")

    df_train, df_val, df_test = split_temporal(df, 0.70, 0.15)

    print("")
    print("Split temporal:")
    print(f"  Train : {len(df_train):,} filas  {df_train['ts'].min()} -> {df_train['ts'].max()}")
    print(f"  Val   : {len(df_val):,} filas  {df_val['ts'].min()} -> {df_val['ts'].max()}")
    print(f"  Test  : {len(df_test):,} filas  {df_test['ts'].min()} -> {df_test['ts'].max()}")

    for nombre, subset in [("Train", df_train), ("Val", df_val), ("Test", df_test)]:
        clases = subset["label"].unique().tolist()
        if len(clases) < 2:
            print(f"[AVISO] {nombre} tiene solo {len(clases)} clase(s): {clases}")

    label_codes = encode_labels(df["label"])
    label_map = {label: idx for idx, label in enumerate(LABEL_ORDER)}
    inv_map = {idx: label for label, idx in label_map.items()}
    print("")
    print(f"Clases del modelo: {LABEL_ORDER}")
    print(f"Encoding: {label_map}")

    X_train = df_train[FEATURE_COLS].reset_index(drop=True)
    X_val = df_val[FEATURE_COLS].reset_index(drop=True)
    X_test = df_test[FEATURE_COLS].reset_index(drop=True)
    y_train = encode_labels(df_train["label"]).rename("label")
    y_val = encode_labels(df_val["label"]).rename("label")
    y_test = encode_labels(df_test["label"]).rename("label")

    for nombre, data in [
        ("X_train", X_train),
        ("X_val", X_val),
        ("X_test", X_test),
        ("y_train", y_train.to_frame()),
        ("y_val", y_val.to_frame()),
        ("y_test", y_test.to_frame()),
    ]:
        path = TRAIN_DIR / f"{nombre}.parquet"
        data.to_parquet(path, index=False)
        print(f"[OK] {nombre}.parquet -> {len(data):,} filas")

    encoder_data = {
        "classes": LABEL_ORDER,
        "encoding": label_map,
        "inverse_encoding": inv_map,
    }
    save_json(TRAIN_DIR / "label_encoder.json", encoder_data)

    meta = {
        "feature_cols": FEATURE_COLS,
        "target": "label",
        "n_train": len(X_train),
        "n_val": len(X_val),
        "n_test": len(X_test),
        "train_date_range": [str(df_train["ts"].min()), str(df_train["ts"].max())],
        "val_date_range": [str(df_val["ts"].min()), str(df_val["ts"].max())],
        "test_date_range": [str(df_test["ts"].min()), str(df_test["ts"].max())],
        "class_distribution": class_distribution(df["label"]),
        "class_weights_train": class_weights(df_train["label"]),
    }
    save_json(TRAIN_DIR / "dataset_meta.json", meta)
    print("[OK] label_encoder.json y dataset_meta.json guardados.")
    print("")
    print("Dataset de entrenamiento listo. Puedes continuar con la Fase 3.")


if __name__ == "__main__":
    main()
