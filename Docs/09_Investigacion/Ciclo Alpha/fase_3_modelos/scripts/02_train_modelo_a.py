"""Script 02 - Train Model A: binary activo vs reposo."""

from __future__ import annotations

import json

import lightgbm as lgb
import numpy as np
import pandas as pd

from _phase3_utils import (
    MODEL_A_DIR,
    binary_confusion,
    binary_metrics,
    apply_isotonic_calibrator,
    find_best_binary_threshold,
    ensure_phase3_dirs,
    fit_isotonic_calibrator,
    save_json,
    serialize_isotonic_calibrator,
    summarize_history,
)


def main() -> None:
    ensure_phase3_dirs()
    x_train = pd.read_parquet(MODEL_A_DIR / "X_train.parquet")
    x_val = pd.read_parquet(MODEL_A_DIR / "X_val.parquet")
    y_train = pd.read_parquet(MODEL_A_DIR / "y_train.parquet")["label"].to_numpy(dtype="int64")
    y_val = pd.read_parquet(MODEL_A_DIR / "y_val.parquet")["label"].to_numpy(dtype="int64")

    n_active = int((y_train == 1).sum())
    n_rest = int((y_train == 0).sum())
    if n_active == 0 or n_rest == 0:
        raise SystemExit("[ERROR] Modelo A requiere ambas clases en train")
    scale_pos_weight = n_rest / n_active

    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "boosting_type": "gbdt",
        "learning_rate": 0.01,
        "num_leaves": 63,
        "max_depth": 10,
        "min_child_samples": 15,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.9,
        "bagging_freq": 5,
        "scale_pos_weight": scale_pos_weight,
        "lambda_l2": 0.5,
        "verbose": -1,
        "seed": 42,
    }

    print("=" * 60)
    print("MODELO A - BINARIO: ACTIVO VS REPOSO")
    print("=" * 60)
    print(f"Train filas : {len(x_train):,}")
    print(f"Val filas   : {len(x_val):,}")
    print(f"Activo train: {n_active:,}")
    print(f"Reposo train : {n_rest:,}")
    print(f"scale_pos_weight: {scale_pos_weight:.3f}")

    dtrain = lgb.Dataset(x_train, label=np.asarray(y_train, dtype="float32"))
    dval = lgb.Dataset(x_val, label=np.asarray(y_val, dtype="float32"), reference=dtrain)
    history: dict = {}

    model = lgb.train(
        params,
        dtrain,
        num_boost_round=3500,
        valid_sets=[dtrain, dval],
        valid_names=["train", "val"],
        callbacks=[
            lgb.early_stopping(stopping_rounds=150, verbose=True),
            lgb.log_evaluation(period=50),
            lgb.record_evaluation(history),
        ],
    )

    raw_val_proba = model.predict(x_val, num_iteration=model.best_iteration)
    raw_default_metrics = binary_metrics(y_val, raw_val_proba, threshold=0.5)
    calibrator = fit_isotonic_calibrator(pd.Series(y_val), raw_val_proba)
    calibrated_val_proba = apply_isotonic_calibrator(calibrator, raw_val_proba)
    calibrated_default_metrics = binary_metrics(y_val, calibrated_val_proba, threshold=0.5)
    best_threshold, metrics = find_best_binary_threshold(
        y_val,
        calibrated_val_proba,
        min_threshold=0.20,
        max_threshold=0.55,
        step=0.02,
    )
    tp, tn, fp, fn = binary_confusion(pd.Series(y_val), (calibrated_val_proba >= best_threshold).astype("int64"))

    print("")
    print(f"Best iteration: {model.best_iteration}")
    print(f"Best val loss  : {model.best_score['val']['binary_logloss']:.6f}")
    print(f"Raw F1@0.50    : {raw_default_metrics['f1']:.4f}")
    print(f"Calib F1@0.50  : {calibrated_default_metrics['f1']:.4f}")
    print(f"Best threshold  : {best_threshold:.2f}")
    print(f"Val accuracy    : {metrics['accuracy']:.4f}")
    print(f"Val precision   : {metrics['precision']:.4f}")
    print(f"Val recall      : {metrics['recall']:.4f}")
    print(f"Val F1          : {metrics['f1']:.4f}")
    print(f"Val AUC-ROC    : {metrics['auc_roc']:.4f}")

    # Exp 09B: calibración de threshold por período de cadencia
    calibration_by_period: dict = {
        "threshold_abril": float(best_threshold),
        "threshold_mayo_jun": float(best_threshold),
        "f1_abril": 0.0,
        "f1_mayo_jun": 0.0,
        "criterio": "cadencia_mediana_s < 20 → threshold_abril, >= 20 → threshold_mayo_jun",
        "nota": "ts_val.parquet no encontrado — usando threshold global",
    }
    ts_val_path = MODEL_A_DIR / "ts_val.parquet"
    if ts_val_path.exists():
        ts_val = pd.to_datetime(
            pd.read_parquet(ts_val_path)["ts"], utc=True, errors="coerce"
        )
        mask_abril = ts_val < pd.Timestamp("2026-05-01", tz="UTC")
        mask_mayo_jun = ~mask_abril

        threshold_abril = float(best_threshold)
        threshold_mayo_jun = float(best_threshold)

        if mask_mayo_jun.sum() > 0:
            best_f1_mayo = 0.0
            for thr in np.arange(0.10, 0.56, 0.02):
                f1_tmp = binary_metrics(
                    pd.Series(y_val[mask_mayo_jun.to_numpy()]),
                    calibrated_val_proba[mask_mayo_jun.to_numpy()],
                    threshold=float(thr),
                )["f1"]
                if f1_tmp > best_f1_mayo:
                    best_f1_mayo = f1_tmp
                    threshold_mayo_jun = round(float(thr), 2)

        f1_abril = (
            binary_metrics(
                pd.Series(y_val[mask_abril.to_numpy()]),
                calibrated_val_proba[mask_abril.to_numpy()],
                threshold=threshold_abril,
            )["f1"]
            if mask_abril.sum() > 0
            else 0.0
        )

        calibration_by_period = {
            "threshold_abril": threshold_abril,
            "threshold_mayo_jun": threshold_mayo_jun,
            "f1_abril": round(f1_abril, 4),
            "f1_mayo_jun": round(best_f1_mayo if mask_mayo_jun.sum() > 0 else 0.0, 4),
            "n_val_abril": int(mask_abril.sum()),
            "n_val_mayo_jun": int(mask_mayo_jun.sum()),
            "criterio": "cadencia_mediana_s < 20 → threshold_abril, >= 20 → threshold_mayo_jun",
        }

        print("")
        print("Threshold por período (Exp 09B):")
        print(f"  Abril      (n={mask_abril.sum():,}): threshold={threshold_abril:.2f}  F1={f1_abril:.4f}")
        print(f"  Mayo-Jun   (n={mask_mayo_jun.sum():,}): threshold={threshold_mayo_jun:.2f}  F1={calibration_by_period['f1_mayo_jun']:.4f}")

    model.save_model(str(MODEL_A_DIR / "modelo_a.lgb"))
    save_json(
        MODEL_A_DIR / "modelo_a_params.json",
        {k: (float(v) if isinstance(v, (np.floating, np.integer)) else v) for k, v in params.items()}
        | {
            "best_iteration": int(model.best_iteration),
            "best_val_loss": float(model.best_score["val"]["binary_logloss"]),
            "best_threshold": float(best_threshold),
            "best_threshold_calibrated": float(best_threshold),
            "default_threshold": 0.5,
            "raw_default_val_metrics": raw_default_metrics,
            "calibrated_default_val_metrics": calibrated_default_metrics,
            "calibration_method": "isotonic",
            "calibration_model": serialize_isotonic_calibrator(calibrator),
            "val_metrics": metrics,
            "val_confusion": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        },
    )
    save_json(MODEL_A_DIR / "training_history.json", summarize_history(history))
    save_json(
        MODEL_A_DIR / "calibration_isotonic.json",
        {
            "method": "isotonic",
            "best_threshold": float(best_threshold),
            "calibration_model": serialize_isotonic_calibrator(calibrator),
        },
    )
    save_json(MODEL_A_DIR / "calibration_by_period.json", calibration_by_period)

    feat_imp = pd.Series(model.feature_importance(importance_type="gain"), index=x_train.columns).sort_values(
        ascending=False
    )
    feat_imp.to_csv(MODEL_A_DIR / "feature_importance.csv", header=["gain"])

    print("")
    print(f"[OK] Modelo guardado en {MODEL_A_DIR / 'modelo_a.lgb'}")
    print(f"[OK] Parametros guardados en {MODEL_A_DIR / 'modelo_a_params.json'}")
    print(f"[OK] Historial guardado en {MODEL_A_DIR / 'training_history.json'}")
    print(f"[OK] Calibracion guardada en {MODEL_A_DIR / 'calibration_isotonic.json'}")
    print(f"[OK] Calibracion por periodo guardada en {MODEL_A_DIR / 'calibration_by_period.json'}")
    print(f"[OK] Importancia de features guardada en {MODEL_A_DIR / 'feature_importance.csv'}")


if __name__ == "__main__":
    main()
