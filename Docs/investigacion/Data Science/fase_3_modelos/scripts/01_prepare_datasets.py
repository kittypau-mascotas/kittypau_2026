"""Script 01 - Prepare datasets for Model A and Model B."""

from __future__ import annotations

import shutil

import pandas as pd

from _phase3_utils import (
    MODEL_A_DIR,
    MODEL_A_LABELS,
    MODEL_B_DIR,
    PHASE2_LABELS,
    PHASE2_TRAIN_DIR,
    ensure_phase3_dirs,
    encode_model_a_labels,
    encode_model_b_labels,
    load_phase2_train_artifacts,
    save_json,
)

SELECTED_FEATURES = [
    "weight_grams",
    "delta_w",
    "delta_w_10",
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
REMOVED_FEATURES = ["delta_w_3", "rate_gs"]


def _save_split(base_dir, name: str, frame: pd.DataFrame) -> None:
    frame.to_parquet(base_dir / f"{name}.parquet", index=False)


def _save_model_a(x_train: pd.DataFrame, x_val: pd.DataFrame, y_train, y_val, encoder: dict) -> None:
    model_a_encoder = {"classes": MODEL_A_LABELS, "encoding": {"reposo": 0, "activo": 1}}
    _save_split(MODEL_A_DIR, "X_train", x_train)
    _save_split(MODEL_A_DIR, "X_val", x_val)
    _save_split(MODEL_A_DIR, "y_train", y_train.to_frame(name="label"))
    _save_split(MODEL_A_DIR, "y_val", y_val.to_frame(name="label"))
    save_json(MODEL_A_DIR / "label_encoder.json", model_a_encoder)
    save_json(
        MODEL_A_DIR / "dataset_meta.json",
        {
            "source_train_dir": str(PHASE2_TRAIN_DIR),
            "source_classes": PHASE2_LABELS,
            "target_classes": MODEL_A_LABELS,
            "feature_cols": SELECTED_FEATURES,
            "removed_features": REMOVED_FEATURES,
            "n_train": int(len(x_train)),
            "n_val": int(len(x_val)),
        },
    )


def _save_model_b(x_train: pd.DataFrame, x_val: pd.DataFrame, y_train, y_val, encoder: dict) -> None:
    _save_split(MODEL_B_DIR, "X_train", x_train)
    _save_split(MODEL_B_DIR, "X_val", x_val)
    _save_split(MODEL_B_DIR, "y_train", y_train.to_frame(name="label"))
    _save_split(MODEL_B_DIR, "y_val", y_val.to_frame(name="label"))
    shutil.copy2(PHASE2_TRAIN_DIR / "label_encoder.json", MODEL_B_DIR / "label_encoder.json")
    save_json(
        MODEL_B_DIR / "dataset_meta.json",
        {
            "source_train_dir": str(PHASE2_TRAIN_DIR),
            "source_classes": PHASE2_LABELS,
            "target_classes": PHASE2_LABELS,
            "feature_cols": SELECTED_FEATURES,
            "removed_features": REMOVED_FEATURES,
            "n_train": int(len(x_train)),
            "n_val": int(len(x_val)),
        },
    )


def main() -> None:
    ensure_phase3_dirs()
    x_train, x_val, y_train_codes, y_val_codes, encoder = load_phase2_train_artifacts()

    print("=" * 60)
    print("PREPARACION DE DATASETS - FASE 3")
    print("=" * 60)
    print(f"Origen: {PHASE2_TRAIN_DIR}")
    print(f"Filas train: {len(x_train):,}")
    print(f"Filas val  : {len(x_val):,}")
    print(f"Features activas: {len(SELECTED_FEATURES)}")
    print(f"Features eliminadas: {', '.join(REMOVED_FEATURES)}")

    y_train_a = encode_model_a_labels(y_train_codes, encoder)
    y_val_a = encode_model_a_labels(y_val_codes, encoder)
    y_train_b = encode_model_b_labels(y_train_codes)
    y_val_b = encode_model_b_labels(y_val_codes)

    x_train = x_train[SELECTED_FEATURES].copy()
    x_val = x_val[SELECTED_FEATURES].copy()

    print("")
    print("Modelo A - binario activo vs reposo")
    print(f"  activo train: {int(y_train_a.sum()):,}")
    print(f"  reposo train: {int((y_train_a == 0).sum()):,}")
    print(f"  activo val  : {int(y_val_a.sum()):,}")
    print(f"  reposo val  : {int((y_val_a == 0).sum()):,}")

    print("")
    print("Modelo B - multiclase alimentacion / servido / reposo")
    inv = {int(v): k for k, v in encoder["encoding"].items()}
    for split_name, series in [("train", y_train_b), ("val", y_val_b)]:
        counts = series.value_counts().to_dict()
        print(f"  {split_name}:")
        for cls_id in sorted(inv):
            print(f"    {inv[cls_id]:<14}: {int(counts.get(cls_id, 0)):,}")

    _save_model_a(x_train, x_val, y_train_a, y_val_a, encoder)
    _save_model_b(x_train, x_val, y_train_b, y_val_b, encoder)

    print("")
    print(f"[OK] Modelo A preparado en {MODEL_A_DIR}")
    print(f"[OK] Modelo B preparado en {MODEL_B_DIR}")
    print("Preparacion finalizada. Continuar con los scripts 02 y 03.")


if __name__ == "__main__":
    main()
