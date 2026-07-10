"""
g01_baseline_lgbm.py — G-01 · Ciclo Gamma · Fase 3
Baseline LightGBM multiclase con is_unbalance=True y early stopping.
Configuración derivada de Alpha Exp06, adaptada a las 13 features Gamma.
Meta: F1-activo ≥ 0.75 · F1-alim ≥ 0.72 · superar Alpha Exp06 (0.7619).
Prerequisito: Fase 2 completa (X_train/val/test parquets existentes).
"""
import sys
import joblib
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FEATURES_GAMMA
from _gamma_phase3_utils import (
    cargar_dataset, evaluar_modelo, guardar_experimento, imprimir_resultados,
    MODELS_DIR, entrenar_lgbm_nativo, LGBM_NATIVE_BASE,
)

EXP_ID = "G-01"


def main():
    print(f"=== {EXP_ID} — Baseline LightGBM · Ciclo Gamma · Fase 3 ===\n")
    print("Referencia Alpha Exp06: F1-activo=0.7619  F1-alim=0.7606  AUC=0.9205\n")

    splits = cargar_dataset(splits=("train", "val"))
    X_train, y_train = splits["train"]
    X_val,   y_val   = splits["val"]
    print(f"Train: {X_train.shape}  Val: {X_val.shape}")
    print(f"Features ({len(FEATURES_GAMMA)}): {FEATURES_GAMMA}\n")

    model, best_iter = entrenar_lgbm_nativo(X_train, y_train, X_val, y_val, log_period=100)
    print(f"\nMejor iteración: {best_iter}")

    metricas_train, _ = evaluar_modelo(model, X_train, y_train, "train")
    metricas_val,   _ = evaluar_modelo(model, X_val,   y_val,   "val")
    metricas = {**metricas_train, **metricas_val}
    imprimir_resultados(EXP_ID, metricas)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / f"{EXP_ID}_lgbm.pkl"
    joblib.dump(model, model_path)
    print(f"\nModelo guardado: {model_path}")

    config = {
        "algoritmo":    "LightGBM",
        "params":       LGBM_NATIVE_BASE,
        "early_stopping": 50,
        "features":     FEATURES_GAMMA,
        "n_features":   len(FEATURES_GAMMA),
        "n_train":      int(X_train.shape[0]),
        "n_val":        int(X_val.shape[0]),
        "best_iter":    best_iter,
    }
    guardar_experimento(
        EXP_ID, config, metricas,
        notas="Baseline Gamma — is_unbalance=True, early_stopping=50, 13 features Gamma",
    )
    print(f"\nPróximo: g02_gbm_benchmark.py")


if __name__ == "__main__":
    main()
