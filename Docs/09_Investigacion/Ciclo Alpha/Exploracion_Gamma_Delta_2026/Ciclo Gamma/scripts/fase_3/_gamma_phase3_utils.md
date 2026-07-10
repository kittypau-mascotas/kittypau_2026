# _gamma_phase3_utils — PY

**Destino:** `Data Science/gamma/fase_3_modelos/scripts/_gamma_phase3_utils.py`
**Rol:** Funciones genéricas de entrenamiento, calibración y evaluación para cualquier clasificador.

Incluye el bloqueo del test set (`cargar_test_set()` lanza `PermissionError` hasta G-Final).

---

```python
"""
_gamma_phase3_utils.py — Utilidades de Fase 3 Ciclo Gamma
Funciones genéricas para entrenar, calibrar, evaluar y reportar cualquier modelo.
Bloqueo del test set hasta G-Final.
"""
import sys
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any, Optional

from sklearn.calibration import CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    f1_score, roc_auc_score, classification_report,
    precision_recall_fscore_support
)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    FASE2_TRAIN, FASE3_OUTPUTS, FEATURES_GAMMA,
    LABEL_ENCODING, IDX_ALIMENTACION, IDX_SERVIDO, IDX_REPOSO,
    THRESHOLD_A_INICIAL
)


# ── Carga de datos ────────────────────────────────────────────────────────────

def cargar_train_val():
    """Carga X/y de train y val. Siempre disponibles durante el ciclo."""
    X_train = pd.read_parquet(FASE2_TRAIN / "X_train.parquet")[FEATURES_GAMMA]
    y_train = pd.read_parquet(FASE2_TRAIN / "y_train.parquet").squeeze()
    X_val   = pd.read_parquet(FASE2_TRAIN / "X_val.parquet")[FEATURES_GAMMA]
    y_val   = pd.read_parquet(FASE2_TRAIN / "y_val.parquet").squeeze()
    return X_train.values, y_train.values, X_val.values, y_val.values


def cargar_test_set():
    """
    ❌ BLOQUEADO hasta G-Final.
    Ver regla 1 del Ciclo Gamma: el test set no se evalúa hasta tener modelo candidato.
    Para desbloquear: comentar el raise en g_final_evaluacion_test.py ÚNICAMENTE.
    """
    raise PermissionError(
        "❌ El test set está bloqueado hasta G-Final (regla 1 Ciclo Gamma).\n"
        "   Solo desbloquear cuando G-08 confirme el modelo candidato final."
    )


# ── Calibración isotónica ─────────────────────────────────────────────────────

def calibrar_modelo_isotonica(modelo, X_val: np.ndarray, y_val: np.ndarray):
    """
    Calibra las probabilidades del modelo con isotonic regression sobre val set.
    Devuelve (calibrado, calibrator_por_clase).
    Invariante Gamma: siempre aplicar calibración antes de tune_threshold.
    """
    proba_val = modelo.predict_proba(X_val)
    calibrators = {}
    proba_calibrada = np.zeros_like(proba_val)

    for clase in range(proba_val.shape[1]):
        iso = IsotonicRegression(out_of_bounds="clip")
        y_bin = (y_val == clase).astype(int)
        iso.fit(proba_val[:, clase], y_bin)
        proba_calibrada[:, clase] = iso.predict(proba_val[:, clase])
        calibrators[clase] = iso

    # Re-normalizar para que sumen a 1
    suma = proba_calibrada.sum(axis=1, keepdims=True)
    suma = np.where(suma == 0, 1, suma)
    proba_calibrada = proba_calibrada / suma

    return proba_calibrada, calibrators


def tune_threshold_modelo_a(proba_val: np.ndarray, y_val: np.ndarray,
                             clase_objetivo: int = IDX_ALIMENTACION,
                             metrica: str = "f1") -> float:
    """
    Busca el threshold óptimo para la clase objetivo en Modelo A (binario: activo vs reposo).
    No usar threshold default 0.50 — invariante Gamma.
    """
    best_threshold = THRESHOLD_A_INICIAL
    best_score = 0.0

    for thr in np.arange(0.05, 0.95, 0.01):
        pred = (proba_val[:, clase_objetivo] >= thr).astype(int)
        y_bin = (y_val == clase_objetivo).astype(int)
        f1 = f1_score(y_bin, pred, zero_division=0)
        if f1 > best_score:
            best_score = f1
            best_threshold = thr

    print(f"  Threshold óptimo para clase {clase_objetivo}: {best_threshold:.2f} (F1={best_score:.4f})")
    return best_threshold


# ── Evaluación ────────────────────────────────────────────────────────────────

def evaluar_modelo_a(modelo, X_val: np.ndarray, y_val: np.ndarray,
                     threshold: Optional[float] = None) -> dict:
    """
    Evalúa Modelo A (binario: activo = alimentacion+servido vs reposo).
    Retorna métricas para EXPERIMENT_TRACKER.
    """
    proba = modelo.predict_proba(X_val)
    proba_activo = proba[:, IDX_ALIMENTACION] + proba[:, IDX_SERVIDO]

    if threshold is None:
        threshold = THRESHOLD_A_INICIAL

    pred_activo = (proba_activo >= threshold).astype(int)
    y_activo    = ((y_val == IDX_ALIMENTACION) | (y_val == IDX_SERVIDO)).astype(int)

    f1_act  = f1_score(y_activo, pred_activo, zero_division=0)
    try:
        auc = roc_auc_score(y_activo, proba_activo)
    except Exception:
        auc = float("nan")

    return {
        "modelo_a": {
            "f1_activo":  round(float(f1_act), 4),
            "auc_roc":    round(float(auc),   4),
            "threshold":  round(float(threshold), 3),
        }
    }


def evaluar_modelo_b(modelo, X_val: np.ndarray, y_val: np.ndarray) -> dict:
    """
    Evalúa Modelo B (multiclase: alimentacion / servido / reposo).
    Retorna métricas para EXPERIMENT_TRACKER.
    """
    pred = modelo.predict(X_val)
    inv  = {v: k for k, v in LABEL_ENCODING.items()}

    f1_alim = f1_score(y_val, pred, labels=[IDX_ALIMENTACION], average="macro", zero_division=0)
    f1_serv = f1_score(y_val, pred, labels=[IDX_SERVIDO],      average="macro", zero_division=0)
    f1_macro = f1_score(y_val, pred, average="macro", zero_division=0)

    return {
        "modelo_b": {
            "f1_alimentacion": round(float(f1_alim), 4),
            "f1_servido":      round(float(f1_serv), 4),
            "f1_macro":        round(float(f1_macro), 4),
        }
    }


def imprimir_metricas(nombre: str, metricas: dict) -> None:
    print(f"\n── Métricas {nombre} ──────────────────────────────")
    for grupo, vals in metricas.items():
        print(f"  {grupo}:")
        for k, v in vals.items():
            marca = ""
            if k == "f1_activo"      and v >= 0.75: marca = " ✅"
            if k == "f1_activo"      and v <  0.75: marca = " ⚠️"
            if k == "f1_servido"     and v >= 0.40: marca = " ✅"
            if k == "f1_servido"     and v <  0.40: marca = " ⚠️"
            if k == "f1_alimentacion" and v >= 0.75: marca = " ✅"
            if k == "auc_roc"        and v >= 0.90: marca = " ✅"
            print(f"    {k:20s}: {v}{marca}")


# ── Persistencia de modelos ───────────────────────────────────────────────────

def guardar_lightgbm(modelo, calibrators: dict, nombre: str, metricas: dict) -> None:
    FASE3_OUTPUTS.parent.parent.joinpath("models/gbm").mkdir(parents=True, exist_ok=True)
    model_dir = FASE3_OUTPUTS.parent.parent / "models/gbm"

    modelo.booster_.save_model(str(model_dir / f"{nombre}.lgb"))
    with open(model_dir / f"{nombre}_calibrators.pkl", "wb") as f:
        pickle.dump(calibrators, f)
    with open(model_dir / f"{nombre}_metricas.json", "w") as f:
        json.dump(metricas, f, indent=2)
    print(f"  ✅ Guardado: {model_dir}/{nombre}.lgb")


def guardar_sklearn(modelo, nombre: str, metricas: dict, model_type: str = "classical") -> None:
    model_dir = FASE3_OUTPUTS.parent.parent / f"models/{model_type}"
    model_dir.mkdir(parents=True, exist_ok=True)

    with open(model_dir / f"{nombre}.pkl", "wb") as f:
        pickle.dump(modelo, f)
    with open(model_dir / f"{nombre}_metricas.json", "w") as f:
        json.dump(metricas, f, indent=2)
    print(f"  ✅ Guardado: {model_dir}/{nombre}.pkl")


def guardar_reporte_entrenamiento(nombre_exp: str, resultados: list) -> None:
    """Guarda tabla comparativa de modelos para el experimento."""
    FASE3_OUTPUTS.mkdir(parents=True, exist_ok=True)
    out = FASE3_OUTPUTS / f"{nombre_exp}_report.json"
    with open(out, "w") as f:
        json.dump(resultados, f, indent=2)
    print(f"\n✅ Reporte guardado: {out}")
```
