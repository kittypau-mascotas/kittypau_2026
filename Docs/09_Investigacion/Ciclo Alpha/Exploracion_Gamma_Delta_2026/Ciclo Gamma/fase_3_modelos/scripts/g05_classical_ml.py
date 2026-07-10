"""
g05_classical_ml.py — G-05 · Ciclo Gamma · Fase 3
Benchmark de modelos ML clásicos: ExtraTrees · LogisticRegression · LinearSVC.
Confirma que los GBM (G-01 a G-04) superan a los modelos clásicos,
justificando la elección arquitectónica para Gamma.
Prerequisito: G-04 ejecutado.
"""
import sys
import time
import joblib
from pathlib import Path
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FEATURES_GAMMA
from _gamma_phase3_utils import (
    cargar_dataset, evaluar_modelo, guardar_experimento, imprimir_resultados, MODELS_DIR,
)

EXP_ID = "G-05"

ALGORITMOS = {
    "extra_trees": ExtraTreesClassifier(
        n_estimators=500, class_weight="balanced",
        max_depth=None, n_jobs=-1, random_state=42,
    ),
    # saga: solver rápido para datasets grandes; tol=1e-2 acelera convergencia
    # LogisticRegression tiene predict_proba nativo — no necesita CalibratedClassifierCV
    "logistic_reg": LogisticRegression(
        C=1.0, class_weight="balanced",
        solver="saga", max_iter=300, tol=1e-2, random_state=42,
    ),
    # LinearSVC no tiene predict_proba — se wrappea con cv=3 para velocidad
    "linear_svc": CalibratedClassifierCV(
        LinearSVC(C=0.1, class_weight="balanced", max_iter=3000, random_state=42),
        cv=3,
    ),
}


def main():
    print(f"=== {EXP_ID} — Classical ML Benchmark · Ciclo Gamma · Fase 3 ===\n")
    print(f"Algoritmos: {list(ALGORITMOS.keys())}\n")

    splits = cargar_dataset(splits=("train", "val"))
    X_train, y_train = splits["train"]
    X_val,   y_val   = splits["val"]
    print(f"Train: {X_train.shape}  Val: {X_val.shape}\n")

    resultados = {}
    for nombre, model in ALGORITMOS.items():
        print(f"── {nombre} {'─'*(44-len(nombre))}")
        t0 = time.time()
        model.fit(X_train, y_train)
        elapsed = round(time.time() - t0, 1)
        print(f"  Tiempo: {elapsed}s")

        metricas, _ = evaluar_modelo(model, X_val, y_val, "val")
        resultados[nombre] = {"metricas": metricas, "tiempo_s": elapsed}
        imprimir_resultados(f"{EXP_ID}/{nombre}", metricas)

        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODELS_DIR / f"{EXP_ID}_{nombre}.pkl")

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
    print(f"{'═'*55}")

    metricas_flat = {
        f"{nombre}_{k}": v
        for nombre, res in resultados.items()
        for k, v in res["metricas"].items()
    }
    config = {
        "algoritmos": list(ALGORITMOS.keys()),
        "features":   FEATURES_GAMMA,
        "n_features": len(FEATURES_GAMMA),
        "n_train":    int(X_train.shape[0]),
        "n_val":      int(X_val.shape[0]),
    }
    guardar_experimento(
        EXP_ID, config, metricas_flat,
        notas="Benchmark ML clásico — comparación vs GBM (G-01 a G-04)",
    )
    print(f"\nFase B completa.")
    print("Próximo: G-06 (NN Baseline) requiere ≥300 alim + ≥80 serv reales.")
    print("         Si datos insuficientes → ir directo a G-Final con mejor G-04.")


if __name__ == "__main__":
    main()
