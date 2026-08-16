"""
g04_hyperopt.py — G-04 · Ciclo Gamma · Fase 3
Optimización de hiperparámetros con Optuna sobre LightGBM.
Lee el mejor subconjunto de features de G-03 (fallback: FEATURES_GAMMA).
Prerequisito: G-03 ejecutado. Requiere: pip install optuna
Meta: configuración de LightGBM que maximiza F1-activo en val.
"""
import sys
import json
import joblib
from pathlib import Path
from sklearn.metrics import f1_score

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FEATURES_GAMMA, FASE3_OUTPUTS, IDX_REPOSO
from _gamma_phase3_utils import (
    cargar_dataset, evaluar_modelo, guardar_experimento, imprimir_resultados,
    MODELS_DIR, entrenar_lgbm_nativo, LGBM_NATIVE_BASE,
)

EXP_ID    = "G-04"
N_TRIALS  = 80
TIMEOUT_S = 1800   # 30 minutos máximo


def _features_de_g03():
    g03_json = FASE3_OUTPUTS / "G-03.json"
    if g03_json.exists():
        with open(g03_json, encoding="utf-8") as f:
            data = json.load(f)
        feats = data["config"].get("mejor_features", FEATURES_GAMMA)
        sub   = data["config"].get("mejor_subconjunto", "todas")
        print(f"Features de G-03 (subconjunto '{sub}'): {feats}")
        return feats
    print("⚠️  G-03.json no encontrado — usando FEATURES_GAMMA completo")
    return list(FEATURES_GAMMA)


def main():
    print(f"=== {EXP_ID} — Hyperparameter Optimization (Optuna) · Ciclo Gamma · Fase 3 ===\n")

    try:
        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)
    except ImportError:
        print("❌ Optuna no instalado. Ejecutar: pip install optuna")
        return

    features  = _features_de_g03()
    feat_idx  = [FEATURES_GAMMA.index(f) for f in features]

    splits    = cargar_dataset(splits=("train", "val"))
    X_tr_full, y_train = splits["train"]
    X_val_full, y_val  = splits["val"]
    X_train = X_tr_full[:,  feat_idx]
    X_val   = X_val_full[:, feat_idx]
    print(f"Train: {X_train.shape}  Val: {X_val.shape}\n")

    # Objetivo de Optuna: maximizar F1-activo en val con API nativa
    def objective(trial):
        extra = {
            "learning_rate":    trial.suggest_float("learning_rate",    0.01,  0.15,  log=True),
            "num_leaves":       trial.suggest_int(  "num_leaves",        15,   127),
            "min_data_in_leaf": trial.suggest_int(  "min_data_in_leaf",   5,   100),
            "feature_fraction": trial.suggest_float("feature_fraction", 0.5,   1.0),
            "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5,   1.0),
            "bagging_freq":     trial.suggest_int(  "bagging_freq",      1,     7),
            "lambda_l1":        trial.suggest_float("lambda_l1",        1e-8, 10.0, log=True),
            "lambda_l2":        trial.suggest_float("lambda_l2",        1e-8, 10.0, log=True),
        }
        model, _ = entrenar_lgbm_nativo(
            X_train, y_train, X_val, y_val,
            extra_params=extra, log_period=9999,
        )
        y_pred  = model.predict(X_val)
        y_bin_t = (y_val  != IDX_REPOSO).astype(int)
        y_bin_p = (y_pred != IDX_REPOSO).astype(int)
        return float(f1_score(y_bin_t, y_bin_p, average="binary", pos_label=1, zero_division=0))

    print(f"Ejecutando hasta {N_TRIALS} trials (timeout {TIMEOUT_S}s)...\n")
    study = optuna.create_study(direction="maximize", study_name=EXP_ID)
    study.optimize(objective, n_trials=N_TRIALS, timeout=TIMEOUT_S, show_progress_bar=True)

    best_trial = study.best_trial
    print(f"\nMejores hiperparámetros (trial #{best_trial.number}):")
    for k, v in study.best_params.items():
        print(f"  {k:25s}: {v}")
    print(f"  F1-activo (val) trial: {study.best_value:.4f}")

    # Reentrenar con los mejores params para obtener métricas completas
    best_model, best_iter = entrenar_lgbm_nativo(
        X_train, y_train, X_val, y_val,
        extra_params=study.best_params,
        log_period=100,
    )

    metricas_train, _ = evaluar_modelo(best_model, X_train, y_train, "train")
    metricas_val,   _ = evaluar_modelo(best_model, X_val,   y_val,   "val")
    metricas = {**metricas_train, **metricas_val}
    imprimir_resultados(EXP_ID, metricas)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / f"{EXP_ID}_best_lgbm.pkl"
    joblib.dump(best_model, model_path)
    print(f"\nMejor modelo guardado: {model_path}")

    config = {
        "algoritmo":     "LightGBM",
        "n_trials_real": len(study.trials),
        "best_trial":    best_trial.number,
        "best_params":   {**LGBM_NATIVE_BASE, **study.best_params},
        "features":      features,
        "n_features":    len(features),
        "n_train":       int(X_train.shape[0]),
        "n_val":         int(X_val.shape[0]),
        "best_iter":     best_iter,
    }
    guardar_experimento(
        EXP_ID, config, metricas,
        notas=f"Optuna {len(study.trials)} trials — F1-activo-trial={study.best_value:.4f}",
    )
    print(f"\nPróximo: g05_classical_ml.py")


if __name__ == "__main__":
    main()
