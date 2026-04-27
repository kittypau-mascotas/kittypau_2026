"""Script 04 - Reporte de calidad del dataset de entrenamiento."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from _phase2_utils import REPORT_DIR, TRAIN_DIR, ensure_phase2_dirs


def log(lines: list[str], msg: str = "") -> None:
    print(msg)
    lines.append(str(msg))


def main() -> None:
    ensure_phase2_dirs()
    X_train = pd.read_parquet(TRAIN_DIR / "X_train.parquet")
    X_val = pd.read_parquet(TRAIN_DIR / "X_val.parquet")
    X_test = pd.read_parquet(TRAIN_DIR / "X_test.parquet")
    y_train = pd.read_parquet(TRAIN_DIR / "y_train.parquet")["label"]
    y_val = pd.read_parquet(TRAIN_DIR / "y_val.parquet")["label"]
    y_test = pd.read_parquet(TRAIN_DIR / "y_test.parquet")["label"]
    meta = json.loads((TRAIN_DIR / "dataset_meta.json").read_text(encoding="utf-8"))
    encoder = json.loads((TRAIN_DIR / "label_encoder.json").read_text(encoding="utf-8"))
    inv_enc = {int(v): k for k, v in encoder["encoding"].items()}

    lines: list[str] = []
    log(lines, "=" * 60)
    log(lines, "REPORTE DE DATASET - KPCL0034 - FASE 2")
    log(lines, "=" * 60)
    log(lines, "")
    log(lines, "SPLIT TEMPORAL")
    log(lines, f"  Train : {meta['n_train']:>6,} filas  {meta['train_date_range'][0][:10]} -> {meta['train_date_range'][1][:10]}")
    log(lines, f"  Val   : {meta['n_val']:>6,} filas  {meta['val_date_range'][0][:10]} -> {meta['val_date_range'][1][:10]}")
    log(lines, f"  Test  : {meta['n_test']:>6,} filas  {meta['test_date_range'][0][:10]} -> {meta['test_date_range'][1][:10]}")
    log(lines, "")
    log(lines, "DISTRIBUCION DE CLASES EN TRAIN")
    for cls_id, cnt in y_train.value_counts().items():
        lbl = inv_enc.get(int(cls_id), str(cls_id))
        log(lines, f"  {lbl:<20}: {cnt:>6,} ({cnt/len(y_train)*100:.1f}%)")
    log(lines, "")
    log(lines, "DISTRIBUCION DE CLASES EN VAL")
    for cls_id, cnt in y_val.value_counts().items():
        lbl = inv_enc.get(int(cls_id), str(cls_id))
        log(lines, f"  {lbl:<20}: {cnt:>6,} ({cnt/len(y_val)*100:.1f}%)")
    log(lines, "")
    log(lines, "DISTRIBUCION DE CLASES EN TEST")
    for cls_id, cnt in y_test.value_counts().items():
        lbl = inv_enc.get(int(cls_id), str(cls_id))
        log(lines, f"  {lbl:<20}: {cnt:>6,} ({cnt/len(y_test)*100:.1f}%)")

    log(lines, "")
    log(lines, "ESTADISTICOS DE FEATURES EN TRAIN")
    desc = X_train.describe().round(3)
    log(lines, desc.to_string())

    log(lines, "")
    log(lines, "CALIDAD DE FEATURES")
    nan_counts = X_train.isna().sum()
    bad_cols = nan_counts[nan_counts > 0]
    if bad_cols.empty:
        log(lines, "  [OK] No hay NaN en X_train.")
    else:
        for col, cnt in bad_cols.items():
            log(lines, f"  {col}: {cnt}")

    ratio = y_train.value_counts().max() / y_train.value_counts().min()
    log(lines, "")
    log(lines, "BALANCE DE CLASES")
    log(lines, f"  Ratio clase mayoritaria / minoritaria: {ratio:.1f}x")
    if ratio > 20:
        log(lines, "  [AVISO] Desbalance alto. Usar class_weight=balanced.")
    elif ratio > 10:
        log(lines, "  [AVISO] Desbalance moderado. Considerar class_weight.")
    else:
        log(lines, "  [OK] Balance aceptable.")

    if "class_weights_train" in meta:
        log(lines, "")
        log(lines, "PESOS SUGERIDOS PARA ENTRENAMIENTO")
        for label, weight in meta["class_weights_train"].items():
            log(lines, f"  {label:<20}: {weight}")

    log(lines, "")
    log(lines, "=" * 60)
    log(lines, "Fase 2 completada. Puedes continuar con la Fase 3 (entrenamiento).")
    log(lines, "=" * 60)

    out_path = REPORT_DIR / "dataset_report.txt"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Reporte guardado en: {out_path}")


if __name__ == "__main__":
    main()
