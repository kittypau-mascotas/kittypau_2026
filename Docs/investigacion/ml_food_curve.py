"""
ml_food_curve.py — Detección automática de curvas de alimentación KPCL0034.

Aprende a detectar:
  - inicio_alimentacion / termino_alimentacion   (gato comiendo)
  - inicio_servido / termino_servido             (humano sirviendo)

Dataset:
  - Lecturas de sensor: kpcl0034_kpcl0036_prueba_sincargador.csv (row_source='reading')
  - Etiquetas manuales: mismo CSV (row_source='audit_event', evento=inicio_*/termino_*)

Features (ventana deslizante sobre series de tiempo de peso):
  - weight_raw          — peso crudo en gramos
  - delta_1             — Δpeso vs lectura anterior
  - delta_3             — Δpeso vs hace 3 lecturas
  - delta_10            — Δpeso vs hace 10 lecturas
  - slope_3             — pendiente lineal últimas 3 lecturas
  - slope_10            — pendiente lineal últimas 10 lecturas
  - accel_3             — aceleración (segunda derivada) últimas 3 lecturas
  - rolling_std_5       — desviación estándar últimas 5 lecturas
  - rolling_std_20      — desviación estándar últimas 20 lecturas
  - hour_sin, hour_cos  — hora del día (codificación cíclica)
  - minute_of_day       — minuto absoluto del día (0-1439)

Labels (multi-clase):
  0 = fondo (background)
  1 = inicio_alimentacion
  2 = termino_alimentacion
  3 = inicio_servido
  4 = termino_servido

Evaluación:
  - Train/test split temporal (últimos 30% de días como test)
  - Métricas: precision, recall, F1 por clase + macro
  - Matriz de confusión
  - Importancia de features

Uso:
  python ml_food_curve.py                  # entrenar, mostrar métricas, guardar modelo
  python ml_food_curve.py --json           # output JSON para integración con HTML
  python ml_food_curve.py --predict        # predecir con modelo guardado (modo inference)
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

try:
    import pandas as pd
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.metrics import (
        classification_report,
        confusion_matrix,
        f1_score,
        precision_recall_fscore_support,
    )
    from sklearn.preprocessing import label_binarize
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "kpcl0034_kpcl0036_prueba_sincargador.csv"
MODEL_PATH = ROOT / "ml_food_curve_model.pkl"
METRICS_PATH = ROOT / "ml_food_curve_metrics.json"

DEVICE = "KPCL0034"
EVENT_WINDOW_SEC = 30  # segundos de tolerancia para alinear evento con lectura más cercana

# Estrategia de etiquetado: intervalo completo entre inicio y termino.
# Cada lectura dentro de un intervalo [inicio_X, termino_X] recibe la clase del tipo X.
# Esto da muchas mas muestras positivas y el modelo aprende la forma de la curva.
START_EVENTS = {
    "inicio_alimentacion": "alimentacion",
    "inicio_servido": "servido",
}
END_EVENTS = {
    "termino_alimentacion": "alimentacion",
    "termino_servido": "servido",
}
LABEL_MAP = {
    "alimentacion": 1,
    "servido": 2,
}
LABEL_NAMES = {
    0: "Fondo",
    1: "Alimentacion",
    2: "Servido",
}


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_csv(path: Path) -> tuple[list[dict], list[dict]]:
    readings, events = [], []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["device_code"] != DEVICE:
                continue
            if row["row_source"] == "reading" and row.get("weight_grams", ""):
                readings.append(row)
            elif row["row_source"] == "audit_event":
                ev = row.get("evento", "")
                if ev in START_EVENTS or ev in END_EVENTS:
                    events.append(row)
    return readings, events


def parse_ts(s: str) -> float:
    """Parse ISO timestamp to UTC epoch float."""
    s = s.replace(" ", "T")
    if s.endswith("+00:00"):
        s = s[:-6]
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except ValueError:
        return 0.0


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def build_features(readings: list[dict]) -> tuple[np.ndarray, np.ndarray, list[str]]:
    readings.sort(key=lambda r: r["event_at"])
    N = len(readings)
    weights = np.array([float(r["weight_grams"] or 0) for r in readings], dtype=np.float32)
    timestamps = np.array([parse_ts(r["event_at"]) for r in readings], dtype=np.float64)

    def slope(arr: np.ndarray) -> float:
        n = len(arr)
        if n < 2:
            return 0.0
        x = np.arange(n, dtype=np.float32)
        xm, ym = x.mean(), arr.mean()
        denom = ((x - xm) ** 2).sum()
        if denom == 0:
            return 0.0
        return float(((x - xm) * (arr - ym)).sum() / denom)

    rows = []
    for i in range(N):
        w = weights[i]
        ts = timestamps[i]

        d1 = w - weights[i - 1] if i >= 1 else 0.0
        d3 = w - weights[i - 3] if i >= 3 else 0.0
        d10 = w - weights[i - 10] if i >= 10 else 0.0

        sl3 = slope(weights[max(0, i - 2): i + 1])
        sl10 = slope(weights[max(0, i - 9): i + 1])

        # Aceleración: diferencia de slopes consecutivos
        sl3_prev = slope(weights[max(0, i - 3): i]) if i >= 1 else 0.0
        accel = sl3 - sl3_prev

        std5 = float(np.std(weights[max(0, i - 4): i + 1]))
        std20 = float(np.std(weights[max(0, i - 19): i + 1]))

        # Tiempo cíclico
        hour_float = (ts % 86400) / 3600
        h_sin = math.sin(2 * math.pi * hour_float / 24)
        h_cos = math.cos(2 * math.pi * hour_float / 24)
        minute_of_day = (ts % 86400) / 60

        rows.append([w, d1, d3, d10, sl3, sl10, accel, std5, std20, h_sin, h_cos, minute_of_day])

    feature_names = [
        "weight_raw", "delta_1", "delta_3", "delta_10",
        "slope_3", "slope_10", "accel_3",
        "rolling_std_5", "rolling_std_20",
        "hour_sin", "hour_cos", "minute_of_day",
    ]
    X = np.array(rows, dtype=np.float32)
    return X, timestamps, feature_names


def build_labels(timestamps: np.ndarray, events: list[dict]) -> np.ndarray:
    """Label all readings within [inicio_X, termino_X] intervals.

    All readings inside an alimentacion session → class 1.
    All readings inside a servido session → class 2.
    Overlapping intervals: last writer wins.
    """
    y = np.zeros(len(timestamps), dtype=np.int32)
    sorted_events = sorted(events, key=lambda e: parse_ts(e["event_at"]))
    # Build intervals per session type
    open_starts: dict[str, float] = {}  # session_type -> start_ts
    intervals: list[tuple[float, float, int]] = []  # (start_ts, end_ts, label)
    for ev in sorted_events:
        name = ev.get("evento", "")
        if name in START_EVENTS:
            stype = START_EVENTS[name]
            open_starts[stype] = parse_ts(ev["event_at"])
        elif name in END_EVENTS:
            stype = END_EVENTS[name]
            if stype in open_starts:
                intervals.append((open_starts[stype], parse_ts(ev["event_at"]), LABEL_MAP[stype]))
                del open_starts[stype]
    # Apply intervals to readings
    for start_ts, end_ts, label in intervals:
        mask = (timestamps >= start_ts) & (timestamps <= end_ts)
        y[mask] = label
    return y


# ---------------------------------------------------------------------------
# Training & evaluation
# ---------------------------------------------------------------------------

def temporal_split(timestamps: np.ndarray, test_frac: float = 0.30):
    """Split by time: first (1-test_frac) of days = train, rest = test."""
    sorted_ts = np.sort(timestamps)
    cutoff = sorted_ts[int(len(sorted_ts) * (1 - test_frac))]
    train_idx = np.where(timestamps <= cutoff)[0]
    test_idx = np.where(timestamps > cutoff)[0]
    return train_idx, test_idx


def train_and_evaluate(X: np.ndarray, y: np.ndarray, feature_names: list[str], timestamps: np.ndarray) -> dict:
    train_idx, test_idx = temporal_split(timestamps)

    if len(test_idx) == 0:
        return {"error": "No hay suficientes datos para el conjunto de test."}

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    present_classes = sorted(set(y_train.tolist()) | set(y_test.tolist()))

    rf = RandomForestClassifier(n_estimators=200, max_depth=10, class_weight="balanced", random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)

    gb = GradientBoostingClassifier(n_estimators=150, max_depth=4, learning_rate=0.08, random_state=42)
    gb.fit(X_train, y_train)
    y_pred_gb = gb.predict(X_test)

    def metrics_for(y_true, y_pred, name):
        p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=present_classes, zero_division=0)
        cm = confusion_matrix(y_true, y_pred, labels=present_classes).tolist()
        macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
        per_class = {}
        for i, cls in enumerate(present_classes):
            per_class[LABEL_NAMES.get(cls, str(cls))] = {
                "precision": float(round(p[i], 3)),
                "recall": float(round(r[i], 3)),
                "f1": float(round(f[i], 3)),
                "support": int(s[i]),
            }
        return {
            "model": name,
            "macro_f1": round(macro_f1, 3),
            "per_class": per_class,
            "confusion_matrix": cm,
            "confusion_labels": [LABEL_NAMES.get(c, str(c)) for c in present_classes],
        }

    rf_metrics = metrics_for(y_test, y_pred_rf, "RandomForest")
    gb_metrics = metrics_for(y_test, y_pred_gb, "GradientBoosting")

    best_model = rf if rf_metrics["macro_f1"] >= gb_metrics["macro_f1"] else gb
    best_name = "RandomForest" if best_model is rf else "GradientBoosting"

    importances = best_model.feature_importances_.tolist()
    fi = sorted(
        zip(feature_names, importances),
        key=lambda x: x[1],
        reverse=True,
    )

    label_dist = {LABEL_NAMES.get(int(k), str(k)): int(v) for k, v in zip(*np.unique(y, return_counts=True))}

    result = {
        "best_model": best_name,
        "train_samples": int(len(train_idx)),
        "test_samples": int(len(test_idx)),
        "label_distribution": label_dist,
        "models": [rf_metrics, gb_metrics],
        "feature_importance": [{"feature": f, "importance": round(imp, 4)} for f, imp in fi],
    }

    # Save best model
    with open(MODEL_PATH, "wb") as fout:
        pickle.dump({"model": best_model, "feature_names": feature_names}, fout)

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(as_json: bool = False) -> dict:
    if not HAS_SKLEARN:
        msg = {"error": "scikit-learn no instalado. Ejecuta: pip install scikit-learn pandas"}
        if as_json:
            print(json.dumps(msg))
        else:
            print(msg["error"])
        return msg

    if not CSV_PATH.exists():
        msg = {"error": f"CSV no encontrado: {CSV_PATH}"}
        if as_json:
            print(json.dumps(msg))
        else:
            print(msg["error"])
        return msg

    out = sys.stdout.buffer if as_json else None
    def log(s: str) -> None:
        if not as_json:
            print(s.encode("utf-8", "replace").decode("utf-8", "replace"))

    log(f"Cargando CSV: {CSV_PATH}")
    readings, events = load_csv(CSV_PATH)
    log(f"  Lecturas {DEVICE}: {len(readings):,}")
    log(f"  Eventos de categoria: {len(events)}")

    if len(readings) < 50:
        msg = {"error": f"Insuficientes lecturas de {DEVICE} en el CSV."}
        if as_json:
            sys.stdout.write(json.dumps(msg) + "\n")
        else:
            log(msg["error"])
        return msg

    log("Calculando features...")
    X, timestamps, feature_names = build_features(readings)
    y = build_labels(timestamps, events)

    labeled = int((y > 0).sum())
    log(f"  Muestras totales: {len(y):,} | Con etiqueta: {labeled}")
    log("Entrenando modelos (puede tomar 20-60 segundos)...")

    result = train_and_evaluate(X, y, feature_names, timestamps)

    if not as_json:
        log(f"\n=== Resultado ===")
        log(f"Mejor modelo: {result.get('best_model')}")
        log(f"Train/Test: {result.get('train_samples')} / {result.get('test_samples')}")
        for model in result.get("models", []):
            log(f"\n  [{model['model']}] macro-F1 = {model['macro_f1']}")
            for cls, m in model.get("per_class", {}).items():
                log(f"    {cls}: P={m['precision']} R={m['recall']} F1={m['f1']} (n={m['support']})")
        log("\nTop features:")
        for fi in result.get("feature_importance", [])[:6]:
            bar = "#" * int(fi["importance"] * 40)
            log(f"  {fi['feature']:20s} {fi['importance']:.4f}  {bar}")
        log(f"\nModelo guardado en: {MODEL_PATH}")
    else:
        sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ML detección curvas KPCL0034")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()
    main(as_json=args.json)
