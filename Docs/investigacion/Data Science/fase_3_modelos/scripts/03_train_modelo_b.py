"""Script 03 - Train Model B: multiclass alimentacion / servido / reposo."""

from __future__ import annotations

import numpy as np
import pandas as pd
import lightgbm as lgb

from _phase3_utils import (
    MODEL_B_DIR,
    PHASE2_LABELS,
    balanced_sample_weights,
    smote_augment_minority,
    ensure_phase3_dirs,
    multiclass_f1_scores,
    save_json,
    summarize_history,
)


def main() -> None:
    ensure_phase3_dirs()
    x_train = pd.read_parquet(MODEL_B_DIR / "X_train.parquet")
    x_val = pd.read_parquet(MODEL_B_DIR / "X_val.parquet")
    y_train = pd.read_parquet(MODEL_B_DIR / "y_train.parquet")["label"].to_numpy(dtype="int64")
    y_val = pd.read_parquet(MODEL_B_DIR / "y_val.parquet")["label"].to_numpy(dtype="int64")

    x_train = x_train.apply(pd.to_numeric)
    x_val = x_val.apply(pd.to_numeric)

    if len(y_train) == 0 or len(y_val) == 0:
        raise SystemExit("[ERROR] Modelo B requiere train y val no vacios")

    y_train_series = pd.Series(y_train, name="label")
    served_count = int((y_train_series == 1).sum())
    served_target_count = max(served_count, served_count * 3)
    x_train_aug, y_train_aug_series, smote_meta = smote_augment_minority(
        x_train,
        y_train_series,
        minority_label=1,
        target_count=served_target_count,
        k_neighbors=3,
        seed=42,
    )
    x_train_aug = x_train_aug.apply(pd.to_numeric)
    y_train_aug = y_train_aug_series.to_numpy(dtype="int64")

    x_train_aug.to_parquet(MODEL_B_DIR / "X_train_smote.parquet", index=False)
    pd.DataFrame({"label": y_train_aug}).to_parquet(MODEL_B_DIR / "y_train_smote.parquet", index=False)

    weight_power = 0.40
    sample_weights = balanced_sample_weights(pd.Series(y_train_aug), labels=[0, 1, 2], power=weight_power)

    params = {
        "objective": "multiclass",
        "num_class": 3,
        "metric": "multi_logloss",
        "boosting_type": "gbdt",
        "learning_rate": 0.02,
        "num_leaves": 127,
        "max_depth": 10,
        "min_child_samples": 1,
        "feature_fraction": 0.85,
        "bagging_fraction": 0.85,
        "bagging_freq": 5,
        "lambda_l2": 2.0,
        "verbose": -1,
        "seed": 42,
    }

    print("=" * 60)
    print("MODELO B - MULTICLASE: ALIMENTACION / SERVIDO / REPOSO")
    print("=" * 60)
    print(f"Train filas originales: {len(x_train):,}")
    print(f"Train filas aumentadas : {len(x_train_aug):,}")
    print(f"Val filas  : {len(x_val):,}")
    print("Distribucion train:")
    counts = pd.Series(y_train_aug).value_counts().to_dict()
    for cls_id in [0, 1, 2]:
        print(f"  clase {cls_id}: {int(counts.get(cls_id, 0)):,}")
    print("Pesos promedio por clase:")
    for cls_id in [0, 1, 2]:
        mask = y_train_aug == cls_id
        mean_weight = float(sample_weights[mask].mean()) if mask.any() else 0.0
        print(f"  clase {cls_id}: {mean_weight:.3f}x")
    print(f"Weight power: {weight_power}")
    print(f"Servido target count: {served_target_count}")
    print(f"SMOTE synthetic count: {smote_meta['synthetic_count']}")

    dtrain = lgb.Dataset(x_train_aug, label=np.asarray(y_train_aug, dtype="float32"), weight=sample_weights)
    dval = lgb.Dataset(x_val, label=np.asarray(y_val, dtype="float32"), reference=dtrain)
    history: dict = {}

    model = lgb.train(
        params,
        dtrain,
        num_boost_round=2500,
        valid_sets=[dtrain, dval],
        valid_names=["train", "val"],
        callbacks=[
            lgb.early_stopping(stopping_rounds=120, verbose=True),
            lgb.log_evaluation(period=50),
            lgb.record_evaluation(history),
        ],
    )

    val_proba = model.predict(x_val, num_iteration=model.best_iteration)
    val_pred = np.argmax(val_proba, axis=1)
    metrics = multiclass_f1_scores(y_val, val_pred, labels=[0, 1, 2])

    print("")
    print(f"Best iteration: {model.best_iteration}")
    print(f"Best val loss  : {model.best_score['val']['multi_logloss']:.6f}")
    print(f"Val accuracy   : {metrics['accuracy']:.4f}")
    print(f"Val macro F1   : {metrics['macro_f1']:.4f}")
    print(f"Val weighted F1: {metrics['weighted_f1']:.4f}")
    for cls_id, f1 in metrics["per_class_f1"].items():
        print(f"  F1 clase {cls_id}: {f1:.4f}")

    model.save_model(str(MODEL_B_DIR / "modelo_b.lgb"))
    save_json(
        MODEL_B_DIR / "modelo_b_params.json",
        {k: (float(v) if isinstance(v, (np.floating, np.integer)) else v) for k, v in params.items()}
        | {
            "best_iteration": int(model.best_iteration),
            "best_val_loss": float(model.best_score["val"]["multi_logloss"]),
            "weight_power": weight_power,
            "served_target_count": served_target_count,
            "smote_strategy": {
                **smote_meta,
                "method": "custom_smote",
            },
            "val_metrics": metrics,
        },
    )
    save_json(
        MODEL_B_DIR / "dataset_meta.json",
        {
            "original_train_rows": int(len(x_train)),
            "augmented_train_rows": int(len(x_train_aug)),
            "served_target_count": served_target_count,
            "smote_strategy": {
                **smote_meta,
                "method": "custom_smote",
            },
            "feature_cols": list(x_train.columns),
        },
    )
    save_json(MODEL_B_DIR / "training_history.json", summarize_history(history))

    feat_imp = pd.Series(model.feature_importance(importance_type="gain"), index=x_train.columns).sort_values(
        ascending=False
    )
    feat_imp.to_csv(MODEL_B_DIR / "feature_importance.csv", header=["gain"])

    print("")
    print(f"[OK] Modelo guardado en {MODEL_B_DIR / 'modelo_b.lgb'}")
    print(f"[OK] Parametros guardados en {MODEL_B_DIR / 'modelo_b_params.json'}")
    print(f"[OK] Historial guardado en {MODEL_B_DIR / 'training_history.json'}")
    print(f"[OK] Train SMOTE guardado en {MODEL_B_DIR / 'X_train_smote.parquet'}")
    print(f"[OK] Importancia de features guardada en {MODEL_B_DIR / 'feature_importance.csv'}")


if __name__ == "__main__":
    main()
