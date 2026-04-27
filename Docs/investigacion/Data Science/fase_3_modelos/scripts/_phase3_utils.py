"""Shared helpers for Fase 3 training scripts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.neighbors import NearestNeighbors

BASE_DIR = Path(__file__).resolve().parent.parent
PHASE2_TRAIN_DIR = BASE_DIR.parent / "fase_2_dataset" / "data" / "train"
MODELS_DIR = BASE_DIR / "models"
MODEL_A_DIR = MODELS_DIR / "modelo_a"
MODEL_B_DIR = MODELS_DIR / "modelo_b"
REPORT_DIR = BASE_DIR / "outputs" / "training_report"

PHASE2_LABELS = ["alimentacion", "servido", "reposo"]
MODEL_A_LABELS = ["reposo", "activo"]


def ensure_phase3_dirs() -> None:
    MODEL_A_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_B_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)


def load_phase2_train_artifacts() -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, dict]:
    x_train = pd.read_parquet(PHASE2_TRAIN_DIR / "X_train.parquet")
    x_val = pd.read_parquet(PHASE2_TRAIN_DIR / "X_val.parquet")
    y_train = pd.read_parquet(PHASE2_TRAIN_DIR / "y_train.parquet")["label"]
    y_val = pd.read_parquet(PHASE2_TRAIN_DIR / "y_val.parquet")["label"]
    encoder = json.loads((PHASE2_TRAIN_DIR / "label_encoder.json").read_text(encoding="utf-8"))
    return x_train, x_val, y_train, y_val, encoder


def save_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def code_to_label_map(encoder: dict) -> dict[int, str]:
    return {int(v): k for k, v in encoder["encoding"].items()}


def encode_model_a_labels(y_codes: pd.Series, encoder: dict) -> pd.Series:
    inv = code_to_label_map(encoder)
    labels = y_codes.map(inv)
    mapped = labels.map(lambda lbl: 1 if lbl in {"alimentacion", "servido"} else 0)
    return mapped.astype("int64")


def encode_model_b_labels(y_codes: pd.Series) -> pd.Series:
    return y_codes.astype("int64")


def balanced_sample_weights(y: pd.Series, labels: Iterable[int], power: float = 1.0) -> np.ndarray:
    counts = y.value_counts().to_dict()
    n_classes = len(list(labels))
    total = float(len(y))
    weights = np.ones(len(y), dtype="float64")
    for label in labels:
        count = float(counts.get(label, 0))
        if count <= 0:
            continue
        base_weight = total / (n_classes * count)
        weights[y.to_numpy() == label] = base_weight**power
    return weights


def fit_isotonic_calibrator(y_true: pd.Series, proba: np.ndarray) -> IsotonicRegression:
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(np.asarray(proba, dtype="float64"), np.asarray(y_true, dtype="int64"))
    return calibrator


def apply_isotonic_calibrator(calibrator: IsotonicRegression, proba: np.ndarray) -> np.ndarray:
    return np.asarray(calibrator.transform(np.asarray(proba, dtype="float64")), dtype="float64")


def serialize_isotonic_calibrator(calibrator: IsotonicRegression) -> dict:
    return {
        "method": "isotonic",
        "out_of_bounds": getattr(calibrator, "out_of_bounds", "clip"),
        "x_thresholds": [float(v) for v in getattr(calibrator, "X_thresholds_", [])],
        "y_thresholds": [float(v) for v in getattr(calibrator, "y_thresholds_", [])],
    }


def smote_augment_minority(
    x: pd.DataFrame,
    y: pd.Series,
    minority_label: int,
    target_count: int,
    k_neighbors: int = 3,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.Series, dict]:
    x = x.reset_index(drop=True)
    y = y.reset_index(drop=True)
    minority_mask = y == minority_label
    x_minority = x.loc[minority_mask].reset_index(drop=True)
    y_minority = y.loc[minority_mask].reset_index(drop=True)
    n_minority = len(x_minority)

    if n_minority == 0:
        raise ValueError("minority class has no samples")
    if target_count <= n_minority:
        return x.copy(), y.copy(), {
            "minority_label": int(minority_label),
            "original_count": int(n_minority),
            "target_count": int(target_count),
            "synthetic_count": 0,
            "k_neighbors": int(k_neighbors),
            "seed": int(seed),
        }
    if n_minority == 1:
        raise ValueError("minority class needs at least 2 samples for SMOTE")

    n_neighbors = min(max(1, k_neighbors), n_minority - 1)
    nn = NearestNeighbors(n_neighbors=n_neighbors + 1)
    nn.fit(x_minority.to_numpy(dtype="float64"))
    neighbors = nn.kneighbors(return_distance=False)

    rng = np.random.default_rng(seed)
    synthetic_rows = []
    n_synthetic = target_count - n_minority
    for _ in range(n_synthetic):
        i = int(rng.integers(0, n_minority))
        neighbor_choices = neighbors[i][1:]
        if len(neighbor_choices) == 0:
            neighbor_idx = i
        else:
            neighbor_idx = int(rng.choice(neighbor_choices))
        xi = x_minority.iloc[i].to_numpy(dtype="float64")
        xj = x_minority.iloc[neighbor_idx].to_numpy(dtype="float64")
        gap = float(rng.random())
        synthetic_rows.append(xi + gap * (xj - xi))

    x_synth = pd.DataFrame(synthetic_rows, columns=x.columns)
    y_synth = pd.Series([minority_label] * n_synthetic, name=y.name)
    x_aug = pd.concat([x, x_synth], ignore_index=True)
    y_aug = pd.concat([y, y_synth], ignore_index=True)
    meta = {
        "minority_label": int(minority_label),
        "original_count": int(n_minority),
        "target_count": int(target_count),
        "synthetic_count": int(n_synthetic),
        "k_neighbors": int(k_neighbors),
        "seed": int(seed),
    }
    return x_aug, y_aug, meta


def safe_div(numerator: float, denominator: float) -> float:
    return float(numerator / denominator) if denominator else 0.0


def binary_confusion(y_true: pd.Series, y_pred: np.ndarray) -> tuple[int, int, int, int]:
    y_true_arr = np.asarray(y_true, dtype="int64")
    y_pred_arr = y_pred.astype("int64")
    tp = int(((y_true_arr == 1) & (y_pred_arr == 1)).sum())
    tn = int(((y_true_arr == 0) & (y_pred_arr == 0)).sum())
    fp = int(((y_true_arr == 0) & (y_pred_arr == 1)).sum())
    fn = int(((y_true_arr == 1) & (y_pred_arr == 0)).sum())
    return tp, tn, fp, fn


def binary_metrics(y_true: pd.Series, proba: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    y_pred = (proba >= threshold).astype("int64")
    tp, tn, fp, fn = binary_confusion(y_true, y_pred)
    precision = safe_div(tp, tp + fp)
    recall = safe_div(tp, tp + fn)
    f1 = safe_div(2 * precision * recall, precision + recall)
    accuracy = safe_div(tp + tn, tp + tn + fp + fn)
    auc = roc_auc_score_binary(np.asarray(y_true, dtype="int64"), proba)
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "auc_roc": auc,
    }


def find_best_binary_threshold(
    y_true: pd.Series,
    proba: np.ndarray,
    min_threshold: float = 0.01,
    max_threshold: float = 0.5,
    step: float = 0.01,
) -> tuple[float, dict[str, float]]:
    best_threshold = min_threshold
    best_metrics = binary_metrics(y_true, proba, threshold=min_threshold)
    best_f1 = best_metrics["f1"]
    thresholds = np.arange(min_threshold, max_threshold + 1e-9, step)
    for threshold in thresholds:
        metrics = binary_metrics(y_true, proba, threshold=float(threshold))
        if metrics["f1"] > best_f1:
            best_threshold = float(threshold)
            best_metrics = metrics
            best_f1 = metrics["f1"]
    return best_threshold, best_metrics


def multiclass_confusion(y_true: pd.Series, y_pred: np.ndarray, labels: list[int]) -> dict[int, dict[str, int]]:
    y_true_arr = np.asarray(y_true, dtype="int64")
    y_pred_arr = y_pred.astype("int64")
    out: dict[int, dict[str, int]] = {}
    for label in labels:
        tp = int(((y_true_arr == label) & (y_pred_arr == label)).sum())
        fp = int(((y_true_arr != label) & (y_pred_arr == label)).sum())
        fn = int(((y_true_arr == label) & (y_pred_arr != label)).sum())
        tn = int(((y_true_arr != label) & (y_pred_arr != label)).sum())
        out[label] = {"tp": tp, "fp": fp, "fn": fn, "tn": tn}
    return out


def multiclass_f1_scores(y_true: pd.Series, y_pred: np.ndarray, labels: list[int]) -> dict[str, dict[int, float] | float]:
    stats = multiclass_confusion(y_true, y_pred, labels)
    per_class: dict[int, float] = {}
    supports: dict[int, int] = {}
    total_support = len(np.asarray(y_true, dtype="int64"))
    for label in labels:
        tp = stats[label]["tp"]
        fp = stats[label]["fp"]
        fn = stats[label]["fn"]
        precision = safe_div(tp, tp + fp)
        recall = safe_div(tp, tp + fn)
        per_class[label] = safe_div(2 * precision * recall, precision + recall)
        supports[label] = tp + fn

    macro_f1 = sum(per_class.values()) / len(labels) if labels else 0.0
    weighted_f1 = safe_div(sum(per_class[lbl] * supports[lbl] for lbl in labels), total_support)
    accuracy = safe_div(sum(stats[label]["tp"] for label in labels), total_support)
    return {
        "per_class_f1": per_class,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "accuracy": accuracy,
    }


def roc_auc_score_binary(y_true: np.ndarray, y_score: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype="int64")
    y_score = np.asarray(y_score, dtype="float64")
    pos = int((y_true == 1).sum())
    neg = int((y_true == 0).sum())
    if pos == 0 or neg == 0:
        return 0.0
    order = np.argsort(y_score)
    ranks = np.empty_like(order, dtype="float64")
    ranks[order] = np.arange(1, len(y_score) + 1, dtype="float64")
    pos_ranks = ranks[y_true == 1].sum()
    auc = (pos_ranks - pos * (pos + 1) / 2.0) / (pos * neg)
    return float(auc)


def summarize_history(history: dict) -> dict:
    out: dict[str, dict[str, list[float]]] = {}
    for split, metrics in history.items():
        out[split] = {}
        for metric, values in metrics.items():
            out[split][metric] = [float(v) for v in values]
    return out
