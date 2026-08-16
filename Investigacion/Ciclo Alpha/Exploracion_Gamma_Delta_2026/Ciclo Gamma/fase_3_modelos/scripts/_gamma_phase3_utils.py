"""
_gamma_phase3_utils.py — Fase 3 Gamma
Utilidades compartidas: carga de dataset, evaluación de modelos,
guardado de experimentos. Importar desde todos los g0x de Fase 3.
"""
import json
import datetime
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.metrics import f1_score, roc_auc_score

import sys
_FASE3_SCRIPTS = Path(__file__).parent
sys.path.insert(0, str(_FASE3_SCRIPTS.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    FASE2_TRAIN, FASE3_OUTPUTS, FEATURES_GAMMA, LABEL_ENCODING,
    IDX_ALIMENTACION, IDX_SERVIDO, IDX_REPOSO,
)

MODELS_DIR = Path(__file__).parent.parent / "models"

# Targets del Ciclo Gamma (de EXPERIMENT_TRACKER_GAMMA.md)
TARGETS_GAMMA = {
    "f1_activo_val":  0.75,
    "f1_alim_val":    0.72,
    "f1_serv_val":    0.40,
    "f1_macro_val":   0.65,
    "auc_activo_val": 0.90,
}
# Referencia Alpha Exp06 — mejor modelo en producción
ALPHA_REF = {
    "f1_activo_val":  0.7619,
    "f1_alim_val":    0.7606,
    "auc_activo_val": 0.9205,
}


def cargar_dataset(splits=("train", "val")):
    """
    Carga X/y de los splits indicados desde fase_2_dataset/data/train/.
    X se devuelve como numpy float64 con columnas en orden FEATURES_GAMMA.
    Test permanece sellado — no incluirlo aquí hasta G-Final.
    """
    resultado = {}
    for nombre in splits:
        X_path = FASE2_TRAIN / f"X_{nombre}.parquet"
        y_path = FASE2_TRAIN / f"y_{nombre}.parquet"
        if not X_path.exists():
            raise FileNotFoundError(f"X_{nombre}.parquet no encontrado — ejecutar Fase 2 primero")
        X = pd.read_parquet(X_path)
        y = pd.read_parquet(y_path)
        y = y.iloc[:, 0] if y.ndim > 1 else y.squeeze()
        resultado[nombre] = (X.values.astype(np.float64), y.values.astype(np.int32))
    return resultado


def evaluar_modelo(model, X: np.ndarray, y_true: np.ndarray, nombre_split: str = "val"):
    """
    Evalúa un modelo sobre un split.
    Devuelve (metricas_dict, y_pred).
    f1_activo = F1 binario (alimentacion+servido vs reposo).
    """
    y_pred    = model.predict(X)
    y_bin_t   = (y_true != IDX_REPOSO).astype(int)
    y_bin_p   = (y_pred != IDX_REPOSO).astype(int)

    f1_activo = float(f1_score(y_bin_t, y_bin_p, average="binary", pos_label=1, zero_division=0))
    f1_macro  = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    per_class = f1_score(y_true, y_pred, average=None, zero_division=0, labels=[0, 1, 2])
    f1_alim   = float(per_class[IDX_ALIMENTACION])
    f1_serv   = float(per_class[IDX_SERVIDO])

    metricas = {
        f"f1_activo_{nombre_split}": round(f1_activo, 4),
        f"f1_alim_{nombre_split}":   round(f1_alim,   4),
        f"f1_serv_{nombre_split}":   round(f1_serv,   4),
        f"f1_macro_{nombre_split}":  round(f1_macro,  4),
    }

    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X)
            prob_activo = proba[:, IDX_ALIMENTACION] + proba[:, IDX_SERVIDO]
            auc = float(roc_auc_score(y_bin_t, prob_activo))
            metricas[f"auc_activo_{nombre_split}"] = round(auc, 4)
        except Exception:
            pass

    return metricas, y_pred


def guardar_experimento(exp_id: str, config: dict, metricas: dict, notas: str = "") -> Path:
    """Persiste resultado de experimento como JSON en fase_3_modelos/outputs/."""
    FASE3_OUTPUTS.mkdir(parents=True, exist_ok=True)
    resultado = {
        "exp_id":   exp_id,
        "fecha":    datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "config":   config,
        "metricas": metricas,
        "notas":    notas,
    }
    out = FASE3_OUTPUTS / f"{exp_id}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)
    print(f"✅ {exp_id}.json → {out}")
    return out


def imprimir_resultados(exp_id: str, metricas: dict):
    """Imprime tabla de métricas comparada con targets Gamma y referencia Alpha Exp06."""
    print(f"\n{'─'*60}")
    print(f"  {exp_id}")
    print(f"{'─'*60}")
    for key, val in metricas.items():
        if not isinstance(val, (int, float)):
            continue
        target = TARGETS_GAMMA.get(key)
        alpha  = ALPHA_REF.get(key)
        linea  = f"  {key:30s}: {val:.4f}"
        if target is not None:
            if val >= target:
                icono = "✅"
            elif val >= target * 0.90:
                icono = "⚠️ "
            else:
                icono = "❌"
            linea += f"  ≥{target}  {icono}"
        if alpha is not None:
            signo = "▲" if val >= alpha else "▼"
            linea += f"  α={alpha:.4f}{signo}"
        print(linea)
    print(f"{'─'*60}")


# ── LightGBM API nativa (evita incompatibilidad con sklearn wrapper en sklearn ≥1.6) ─
# LGBMClassifier llama internamente a check_X_y(force_all_finite=...) que fue
# renombrado a ensure_all_finite en sklearn 1.6 — rompe el wrapper pero no la API nativa.

class LGBMWrapper:
    """
    Envuelve lgb.Booster para compatibilidad con evaluar_modelo().
    predict()            → etiquetas de clase (argmax de probabilidades)
    predict_proba()      → probabilidades shape (n, num_class)
    feature_importances_ → importancia gain del booster
    """
    def __init__(self, booster):
        self._booster = booster

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.argmax(self._booster.predict(X), axis=1)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self._booster.predict(X)

    @property
    def feature_importances_(self) -> np.ndarray:
        return self._booster.feature_importance(importance_type="gain")


LGBM_NATIVE_BASE = {
    "objective":        "multiclass",
    "num_class":        3,
    "metric":           "multi_logloss",
    "is_unbalance":     True,
    "learning_rate":    0.05,
    "num_leaves":       63,
    "min_data_in_leaf": 20,  # equivale a min_child_samples del wrapper
    "verbosity":        -1,
    "num_threads":      -1,  # equivale a n_jobs del wrapper
    "seed":             42,  # equivale a random_state del wrapper
}


def entrenar_lgbm_nativo(
    X_tr: np.ndarray,
    y_tr: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    extra_params: dict = None,
    n_rounds: int = 1000,
    early_stopping: int = 50,
    log_period: int = 100,
):
    """
    Entrena LightGBM con lgb.train() (API nativa) en lugar de LGBMClassifier.
    Devuelve (LGBMWrapper, best_iteration).
    """
    import lightgbm as lgb
    params  = {**LGBM_NATIVE_BASE, **(extra_params or {})}
    dtrain  = lgb.Dataset(X_tr,  label=y_tr)
    dval    = lgb.Dataset(X_val, label=y_val, reference=dtrain)
    callbacks = [
        lgb.early_stopping(stopping_rounds=early_stopping, verbose=False),
        lgb.log_evaluation(period=log_period),
    ]
    booster = lgb.train(
        params, dtrain,
        num_boost_round=n_rounds,
        valid_sets=[dval],
        callbacks=callbacks,
    )
    return LGBMWrapper(booster), booster.best_iteration
