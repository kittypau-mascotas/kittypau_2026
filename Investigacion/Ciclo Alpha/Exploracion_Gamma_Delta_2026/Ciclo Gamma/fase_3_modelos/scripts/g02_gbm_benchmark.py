"""
g02_gbm_benchmark.py — G-02 · Ciclo Gamma · Fase 3
Benchmark de 4 algoritmos GBM: LightGBM · XGBoost · CatBoost · RandomForest.
XGBoost y CatBoost se omiten si no están instalados.
Prerequisito: G-01 ejecutado (baseline de referencia establecido).
Meta: identificar el mejor algoritmo para G-03 y G-04.
"""
import sys
import time
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FEATURES_GAMMA
from _gamma_phase3_utils import (
    cargar_dataset, evaluar_modelo, guardar_experimento, imprimir_resultados,
    MODELS_DIR, entrenar_lgbm_nativo,
)

EXP_ID = "G-02"


def _construir_algoritmos_sklearn(X_val, y_val):
    """Algoritmos con interfaz sklearn — lgbm se entrena aparte con API nativa."""
    algoritmos = {}

    algoritmos["random_forest"] = {
        "model": RandomForestClassifier(
            n_estimators=500, class_weight="balanced",
            max_depth=20, n_jobs=-1, random_state=42,
        ),
        "fit_kwargs": {},
    }

    try:
        import xgboost as xgb
        algoritmos["xgboost"] = {
            "model": xgb.XGBClassifier(
                objective="multi:softmax", num_class=3,
                learning_rate=0.05, n_estimators=1000,
                early_stopping_rounds=50, eval_metric="mlogloss",
                verbosity=0, random_state=42, n_jobs=-1,
            ),
            "fit_kwargs": {"eval_set": [(X_val, y_val)], "verbose": False},
        }
    except ImportError:
        print("⚠️  xgboost no instalado — omitido del benchmark")

    try:
        from catboost import CatBoostClassifier
        algoritmos["catboost"] = {
            "model": CatBoostClassifier(
                loss_function="MultiClass", classes_count=3,
                auto_class_weights="Balanced", learning_rate=0.05,
                iterations=1000, early_stopping_rounds=50,
                random_seed=42, verbose=0,
            ),
            "fit_kwargs": {"eval_set": (X_val, y_val)},
        }
    except ImportError:
        print("⚠️  catboost no instalado — omitido del benchmark")

    return algoritmos


def main():
    print(f"=== {EXP_ID} — GBM Benchmark · Ciclo Gamma · Fase 3 ===\n")

    splits = cargar_dataset(splits=("train", "val"))
    X_train, y_train = splits["train"]
    X_val,   y_val   = splits["val"]
    print(f"Train: {X_train.shape}  Val: {X_val.shape}\n")

    resultados = {}
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # ── LightGBM con API nativa ───────────────────────────────────────────
    print(f"── LGBM {'─'*38}")
    t0 = time.time()
    model_lgbm, _ = entrenar_lgbm_nativo(X_train, y_train, X_val, y_val, log_period=200)
    elapsed = round(time.time() - t0, 1)
    print(f"  Tiempo: {elapsed}s")
    metricas, _ = evaluar_modelo(model_lgbm, X_val, y_val, "val")
    resultados["lgbm"] = {"metricas": metricas, "tiempo_s": elapsed}
    imprimir_resultados(f"{EXP_ID}/lgbm", metricas)
    joblib.dump(model_lgbm, MODELS_DIR / f"{EXP_ID}_lgbm.pkl")

    # ── Algoritmos sklearn ────────────────────────────────────────────────
    algoritmos = _construir_algoritmos_sklearn(X_val, y_val)
    print(f"\nAlgoritmos sklearn adicionales: {list(algoritmos.keys())}\n")

    for nombre, cfg in algoritmos.items():
        print(f"── {nombre.upper()} {'─'*(40-len(nombre))}")
        t0 = time.time()
        cfg["model"].fit(X_train, y_train, **cfg["fit_kwargs"])
        elapsed = round(time.time() - t0, 1)
        print(f"  Tiempo: {elapsed}s")

        metricas, _ = evaluar_modelo(cfg["model"], X_val, y_val, "val")
        resultados[nombre] = {"metricas": metricas, "tiempo_s": elapsed}
        imprimir_resultados(f"{EXP_ID}/{nombre}", metricas)
        joblib.dump(cfg["model"], MODELS_DIR / f"{EXP_ID}_{nombre}.pkl")

    print(f"\n{'═'*55}")
    print("  RANKING — F1-activo (val)")
    print(f"{'═'*55}")
    ranking = sorted(
        resultados.items(),
        key=lambda x: x[1]["metricas"].get("f1_activo_val", 0),
        reverse=True,
    )
    for pos, (nombre, res) in enumerate(ranking, 1):
        f1 = res["metricas"].get("f1_activo_val", 0)
        t  = res["tiempo_s"]
        print(f"  #{pos}  {nombre:20s}: F1-activo={f1:.4f}  ({t}s)")
    mejor = ranking[0][0]
    print(f"\n  → Mejor algoritmo: {mejor.upper()}")
    print(f"{'═'*55}")

    metricas_flat = {
        f"{nombre}_{k}": v
        for nombre, res in resultados.items()
        for k, v in res["metricas"].items()
    }
    metricas_flat["mejor_algoritmo"] = mejor
    metricas_flat["tiempos_s"] = {n: r["tiempo_s"] for n, r in resultados.items()}

    config = {
        "algoritmos": list(algoritmos.keys()),
        "features":   FEATURES_GAMMA,
        "n_features": len(FEATURES_GAMMA),
        "n_train":    int(X_train.shape[0]),
        "n_val":      int(X_val.shape[0]),
    }
    guardar_experimento(
        EXP_ID, config, metricas_flat,
        notas=f"Benchmark {len(algoritmos)} algoritmos — mejor: {mejor}",
    )
    print(f"\nPróximo: g03_feature_engineering.py con {mejor.upper()} como base.")


if __name__ == "__main__":
    main()
