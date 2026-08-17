"""Script 04 - Comparative training report for Model A and Model B."""

from __future__ import annotations

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from _phase3_utils import (
    MODEL_A_DIR,
    MODEL_B_DIR,
    REPORT_DIR,
    ensure_phase3_dirs,
    binary_confusion,
    multiclass_f1_scores,
    safe_div,
    binary_metrics,
)


def _log(lines: list[str], msg: str = "") -> None:
    print(msg)
    lines.append(str(msg))


def _format_series_top(series: pd.Series, n: int = 10) -> list[str]:
    return [f"  {name:<24}: {float(value):>12.3f}" for name, value in series.head(n).items()]


def main() -> None:
    ensure_phase3_dirs()
    lines: list[str] = []

    model_a = lgb.Booster(model_file=str(MODEL_A_DIR / "modelo_a.lgb"))
    model_b = lgb.Booster(model_file=str(MODEL_B_DIR / "modelo_b.lgb"))
    params_a = json.loads((MODEL_A_DIR / "modelo_a_params.json").read_text(encoding="utf-8"))
    params_b = json.loads((MODEL_B_DIR / "modelo_b_params.json").read_text(encoding="utf-8"))
    meta_a = json.loads((MODEL_A_DIR / "dataset_meta.json").read_text(encoding="utf-8")) if (MODEL_A_DIR / "dataset_meta.json").exists() else {}
    meta_b = json.loads((MODEL_B_DIR / "dataset_meta.json").read_text(encoding="utf-8")) if (MODEL_B_DIR / "dataset_meta.json").exists() else {}
    history_a = json.loads((MODEL_A_DIR / "training_history.json").read_text(encoding="utf-8"))
    history_b = json.loads((MODEL_B_DIR / "training_history.json").read_text(encoding="utf-8"))
    encoder_a = json.loads((MODEL_A_DIR / "label_encoder.json").read_text(encoding="utf-8"))
    encoder_b = json.loads((MODEL_B_DIR / "label_encoder.json").read_text(encoding="utf-8"))

    x_val_a = pd.read_parquet(MODEL_A_DIR / "X_val.parquet")
    y_val_a = pd.read_parquet(MODEL_A_DIR / "y_val.parquet")["label"]
    x_val_b = pd.read_parquet(MODEL_B_DIR / "X_val.parquet")
    y_val_b = pd.read_parquet(MODEL_B_DIR / "y_val.parquet")["label"]

    _log(lines, "=" * 60)
    _log(lines, "REPORTE DE ENTRENAMIENTO - KPCL0034 - FASE 3")
    _log(lines, "=" * 60)
    _log(lines, "")
    _log(lines, "MODELO A - BINARIO: activo vs reposo")
    _log(lines, "-" * 40)
    if meta_a.get("removed_features"):
        _log(lines, f"  Features removidas     : {', '.join(meta_a['removed_features'])}")
    if meta_a.get("feature_cols"):
        _log(lines, f"  Features activas       : {len(meta_a['feature_cols'])}")
    _log(lines, f"  Iteraciones entrenadas : {params_a['best_iteration']}")
    _log(lines, f"  Mejor val loss         : {params_a['best_val_loss']:.6f}")
    _log(lines, f"  Threshold por defecto  : {float(params_a.get('default_threshold', 0.5)):.2f}")
    _log(lines, f"  Threshold calibrado    : {float(params_a.get('best_threshold_calibrated', params_a.get('best_threshold', 0.5))):.2f}")
    if params_a.get("raw_default_val_metrics"):
        _log(lines, f"  F1 @ threshold default : {float(params_a['raw_default_val_metrics'].get('f1', 0.0)):.4f}")
    if params_a.get("calibrated_default_val_metrics"):
        _log(lines, f"  F1 @ threshold 0.50 cal : {float(params_a['calibrated_default_val_metrics'].get('f1', 0.0)):.4f}")
    metrics_a = params_a.get("val_metrics", {})
    _log(lines, f"  Accuracy               : {float(metrics_a.get('accuracy', 0.0)):.4f}")
    _log(lines, f"  Precision              : {float(metrics_a.get('precision', 0.0)):.4f}")
    _log(lines, f"  Recall                 : {float(metrics_a.get('recall', 0.0)):.4f}")
    _log(lines, f"  F1 activo              : {float(metrics_a.get('f1', 0.0)):.4f}")
    _log(lines, f"  AUC-ROC                : {float(metrics_a.get('auc_roc', 0.0)):.4f}")
    conf_a = params_a.get("val_confusion", {})
    tp = int(conf_a.get("tp", 0))
    tn = int(conf_a.get("tn", 0))
    fp = int(conf_a.get("fp", 0))
    fn = int(conf_a.get("fn", 0))
    _log(lines, "  Confusion matrix:")
    _log(lines, f"    TP={tp} TN={tn} FP={fp} FN={fn}")
    _log(lines, "")
    _log(lines, "  Feature importance top 10:")
    feat_a = pd.read_csv(MODEL_A_DIR / "feature_importance.csv", index_col=0).iloc[:, 0].sort_values(ascending=False)
    for row in _format_series_top(feat_a, 10):
        _log(lines, row)

    _log(lines, "")
    _log(lines, "MODELO B - MULTICLASE: alimentacion / servido / reposo")
    _log(lines, "-" * 40)
    if meta_b.get("smote_strategy"):
        smote_meta = meta_b["smote_strategy"]
        _log(lines, f"  Servido SMOTE          : {smote_meta.get('synthetic_count', 0)} sinteticas")
        _log(lines, f"  Servido target count   : {smote_meta.get('target_count', 'n/a')}")
    _log(lines, f"  Iteraciones entrenadas : {params_b['best_iteration']}")
    _log(lines, f"  Mejor val loss         : {params_b['best_val_loss']:.6f}")
    _log(lines, f"  Weight power           : {params_b.get('weight_power', 'n/a')}")
    proba_b = model_b.predict(x_val_b, num_iteration=params_b["best_iteration"])
    pred_b = np.argmax(proba_b, axis=1)
    metrics_b = multiclass_f1_scores(y_val_b, pred_b, labels=[0, 1, 2])
    _log(lines, f"  Accuracy               : {metrics_b['accuracy']:.4f}")
    _log(lines, f"  Macro F1               : {metrics_b['macro_f1']:.4f}")
    _log(lines, f"  Weighted F1            : {metrics_b['weighted_f1']:.4f}")
    inv_b = {int(v): k for k, v in encoder_b["encoding"].items()}
    for cls_id in [0, 1, 2]:
        _log(lines, f"  F1 {inv_b[cls_id]:<16}: {metrics_b['per_class_f1'][cls_id]:.4f}")
    _log(lines, "")
    _log(lines, "  Feature importance top 10:")
    feat_b = pd.read_csv(MODEL_B_DIR / "feature_importance.csv", index_col=0).iloc[:, 0].sort_values(ascending=False)
    for row in _format_series_top(feat_b, 10):
        _log(lines, row)

    _log(lines, "")
    _log(lines, "=" * 60)
    _log(lines, "COMPARACION Y RECOMENDACION PARA FASE 4")
    _log(lines, "=" * 60)
    _log(lines, f"  Modelo A - AUC-ROC : {metrics_a['auc_roc']:.4f}   F1 activo : {metrics_a['f1']:.4f}")
    _log(lines, f"  Modelo B - F1 macro: {metrics_b['macro_f1']:.4f}   F1 alimentacion: {metrics_b['per_class_f1'][0]:.4f}")
    _log(lines, "")

    model_a_ok = metrics_a["auc_roc"] >= 0.85 and metrics_a["f1"] >= 0.70
    model_b_ok = metrics_b["macro_f1"] >= 0.60 and metrics_b["per_class_f1"][0] >= 0.65

    if model_a_ok:
        _log(lines, "  [OK] Modelo A supera umbrales minimos -> LISTO para Fase 4")
    else:
        _log(lines, "  [AVISO] Modelo A no supera umbrales -> revisar features o hiperparametros")

    if model_b_ok:
        _log(lines, "  [OK] Modelo B supera umbrales minimos -> LISTO para Fase 4")
    else:
        _log(lines, "  [AVISO] Modelo B no supera umbrales -> normal con pocos datos de servido")

    _log(lines, "")
    _log(lines, "UMBRALES MINIMOS PARA PASAR A FASE 4")
    _log(lines, "  Modelo A: AUC-ROC >= 0.85  y  F1 activo >= 0.70")
    _log(lines, "  Modelo B: F1 macro >= 0.60 y  F1 alimentacion >= 0.65")
    _log(lines, "")
    _log(lines, "IMPLICACION PARA EL PRODUCTO")
    if model_a_ok:
        _log(lines, "  Modelo A listo -> lanzar deteccion de actividad y estadisticas basicas")
    else:
        _log(lines, "  Modelo A no listo -> revisar umbral, features o estrategia de balance")
    if model_b_ok:
        _log(lines, "  Modelo B listo -> lanzar distincion gato/dueno y reportes por tipo de evento")
    else:
        _log(lines, "  Modelo B no listo -> revisar clase servido y desbalance extremo")
    _log(lines, "=" * 60)

    out_path = REPORT_DIR / "training_report.txt"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Reporte guardado en: {out_path}")


if __name__ == "__main__":
    main()
