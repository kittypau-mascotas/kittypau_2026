"""
g03_feature_engineering.py — G-03 · Ciclo Gamma · Fase 3
Análisis de importancia de features y experimentos de selección.
Usa LightGBM (mejor algoritmo de G-02, o default lgbm si G-02 no existe).
Prerequisito: G-02 ejecutado.
Meta: identificar el subconjunto de features óptimo para G-04.
"""
import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FEATURES_GAMMA, FASE3_OUTPUTS
from _gamma_phase3_utils import (
    cargar_dataset, evaluar_modelo, guardar_experimento, imprimir_resultados,
    MODELS_DIR, entrenar_lgbm_nativo,
)

EXP_ID = "G-03"


def _extraer_modelo_nativo_lgbm(wrapper):
    """SHAP TreeExplainer no reconoce wrappers custom (p.ej. LGBMWrapper),
    solo objetos nativos de lightgbm (Booster / LGBMClassifier / LGBMRegressor).
    Esta función intenta localizar ese objeto nativo dentro del wrapper
    probando los nombres de atributo más comunes, y si no lo encuentra,
    inspecciona todos los atributos en busca de algo que "parezca" lightgbm.
    """
    import lightgbm as lgb

    if isinstance(wrapper, (lgb.Booster, lgb.LGBMClassifier, lgb.LGBMRegressor)):
        return wrapper

    candidatos = [
        "model", "booster", "booster_", "_model", "_booster",
        "lgb_model", "lgbm_model", "estimator", "clf", "native_model",
    ]
    for attr in candidatos:
        if hasattr(wrapper, attr):
            obj = getattr(wrapper, attr)
            if isinstance(obj, (lgb.Booster, lgb.LGBMClassifier, lgb.LGBMRegressor)):
                print(f"  (SHAP) modelo nativo encontrado en wrapper.{attr}")
                return obj

    # Última opción: barrer todos los atributos del objeto
    for attr, obj in vars(wrapper).items():
        if isinstance(obj, (lgb.Booster, lgb.LGBMClassifier, lgb.LGBMRegressor)):
            print(f"  (SHAP) modelo nativo encontrado en wrapper.{attr}")
            return obj

    raise AttributeError(
        f"No se encontró un modelo lightgbm nativo dentro de {type(wrapper)}. "
        f"Atributos disponibles: {list(vars(wrapper).keys())}"
    )

# Subconjuntos a comparar vs el set completo
SUBCONJUNTOS = {
    "sin_tiempo": [f for f in FEATURES_GAMMA if f not in ("hour_sin", "hour_cos", "dia_semana_sin")],
    "solo_peso":  ["weight_grams", "delta_w", "delta_w_10", "rolling_std_5", "rolling_std_10",
                   "rolling_mean_5", "net_weight", "is_plateau", "plateau_duration_s"],
}
# top8_gain se agrega en runtime tras calcular importancias


def _leer_mejor_alg_g02() -> str:
    g02_json = FASE3_OUTPUTS / "G-02.json"
    if g02_json.exists():
        with open(g02_json, encoding="utf-8") as f:
            data = json.load(f)
        return data["metricas"].get("mejor_algoritmo", "lgbm")
    return "lgbm"


def _entrenar_lgbm(X_tr, y_tr, X_val, y_val):
    model, _ = entrenar_lgbm_nativo(X_tr, y_tr, X_val, y_val, log_period=9999)
    return model


def _experimento_subset(nombre, feats, X_tr, y_tr, X_val, y_val):
    idx = [FEATURES_GAMMA.index(f) for f in feats]
    model = _entrenar_lgbm(X_tr[:, idx], y_tr, X_val[:, idx], y_val)
    metricas, _ = evaluar_modelo(model, X_val[:, idx], y_val, "val")
    f1a = metricas["f1_activo_val"]
    f1s = metricas["f1_serv_val"]
    print(f"  {nombre:20s}: F1-activo={f1a:.4f}  F1-serv={f1s:.4f}  ({len(feats)} features)")
    return metricas, model, idx


def main():
    print(f"=== {EXP_ID} — Feature Engineering · Ciclo Gamma · Fase 3 ===\n")
    mejor_alg = _leer_mejor_alg_g02()
    print(f"Algoritmo base (G-02): {mejor_alg}\n")

    splits = cargar_dataset(splits=("train", "val"))
    X_train, y_train = splits["train"]
    X_val,   y_val   = splits["val"]
    print(f"Train: {X_train.shape}  Val: {X_val.shape}\n")

    # ── 1. Modelo con todas las features ─────────────────────────────────────
    print("── 1. Modelo completo (línea base G-03) ────────────────────────")
    model_full = _entrenar_lgbm(X_train, y_train, X_val, y_val)
    metricas_full, _ = evaluar_modelo(model_full, X_val, y_val, "val")
    imprimir_resultados(f"{EXP_ID}/todas", metricas_full)

    # ── 2. Importancia de features (gain) ────────────────────────────────────
    print("\n── 2. Importancia de features (gain) ───────────────────────────")
    imp = model_full.feature_importances_
    df_imp = (
        pd.DataFrame({"feature": FEATURES_GAMMA, "importance": imp})
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )
    imp_max = df_imp["importance"].max()
    for _, row in df_imp.iterrows():
        bar = "█" * int(row["importance"] / imp_max * 24)
        print(f"  {row['feature']:25s}: {row['importance']:8.1f}  {bar}")

    top8 = df_imp.head(8)["feature"].tolist()
    SUBCONJUNTOS["top8_gain"] = top8

    # ── 3. SHAP (opcional) ───────────────────────────────────────────────────
    shap_ranking = None
    try:
        import shap
        print("\n── 3. SHAP mean |values| — muestra 5 000 filas train ───────────")
        rng = np.random.default_rng(42)
        idx_s = rng.choice(len(X_train), min(5000, len(X_train)), replace=False)
        modelo_nativo = _extraer_modelo_nativo_lgbm(model_full)
        explainer     = shap.TreeExplainer(modelo_nativo)
        shap_values   = explainer.shap_values(X_train[idx_s])
        # El formato de shap_values varía según versión de SHAP y tipo de modelo:
        #  - API antigua (multiclase): lista de arrays (n_samples, n_features), uno por clase
        #  - API nueva (multiclase):   un solo array 3D, p.ej. (n_samples, n_features, n_clases)
        #  - caso binario/single-output: array 2D (n_samples, n_features)
        n_features = X_train.shape[1]
        if isinstance(shap_values, list):
            mean_abs = np.mean([np.abs(sv).mean(axis=0) for sv in shap_values], axis=0)
        else:
            shap_values = np.asarray(shap_values)
            if shap_values.ndim == 2:
                mean_abs = np.abs(shap_values).mean(axis=0)
            elif shap_values.ndim == 3:
                # Localizamos el eje cuyo tamaño coincide con n_features
                # (evita asumir el orden de ejes, que cambió entre versiones de SHAP)
                ejes_feat = [i for i, s in enumerate(shap_values.shape) if s == n_features]
                if not ejes_feat:
                    raise ValueError(
                        f"No se identificó el eje de features en shap_values "
                        f"con forma {shap_values.shape} (n_features={n_features})"
                    )
                eje_feat = ejes_feat[0]
                otros_ejes = tuple(i for i in range(shap_values.ndim) if i != eje_feat)
                mean_abs = np.abs(shap_values).mean(axis=otros_ejes)
            else:
                raise ValueError(f"Forma inesperada de shap_values: {shap_values.shape}")
        df_shap = (
            pd.DataFrame({"feature": FEATURES_GAMMA, "shap": mean_abs})
            .sort_values("shap", ascending=False)
            .reset_index(drop=True)
        )
        shap_ranking = df_shap["feature"].tolist()
        for _, row in df_shap.iterrows():
            print(f"  {row['feature']:25s}: {row['shap']:.5f}")
    except (ImportError,):
        print("\n  ⚠️  shap no instalado — omitido (pip install shap)")
    except AttributeError as e:
        print(f"\n  ⚠️  SHAP omitido — no se pudo extraer el modelo nativo del wrapper: {e}")
    except ValueError as e:
        print(f"\n  ⚠️  SHAP omitido — forma de shap_values no reconocida: {e}")

    # ── 4. Experimentos de subconjuntos ─────────────────────────────────────
    print("\n── 4. Experimentos de subconjuntos ─────────────────────────────")
    resultados = {"todas": {"metricas": metricas_full, "features": FEATURES_GAMMA}}
    modelos_sub = {"todas": model_full}

    for nombre, feats in SUBCONJUNTOS.items():
        metricas_s, model_s, _ = _experimento_subset(nombre, feats, X_train, y_train, X_val, y_val)
        resultados[nombre]  = {"metricas": metricas_s, "features": feats}
        modelos_sub[nombre] = model_s

    # Elegir mejor por F1-activo-val
    mejor_sub = max(resultados.items(), key=lambda x: x[1]["metricas"]["f1_activo_val"])
    print(f"\n  → Mejor subconjunto: '{mejor_sub[0]}'  F1-activo={mejor_sub[1]['metricas']['f1_activo_val']:.4f}")
    print(f"    Features: {mejor_sub[1]['features']}")

    # Guardar mejor modelo
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(modelos_sub[mejor_sub[0]], MODELS_DIR / f"{EXP_ID}_best.pkl")

    # ── 5. Exportar ──────────────────────────────────────────────────────────
    metricas_flat = {f"{sub}_{k}": v for sub, res in resultados.items() for k, v in res["metricas"].items()}
    config = {
        "algoritmo":           "LightGBM",
        "features_todas":      FEATURES_GAMMA,
        "subconjuntos":        {k: v for k, v in SUBCONJUNTOS.items()},
        "mejor_subconjunto":   mejor_sub[0],
        "mejor_features":      mejor_sub[1]["features"],
        "importancias_gain":   df_imp.set_index("feature")["importance"].to_dict(),
        "shap_ranking":        shap_ranking,
    }
    guardar_experimento(EXP_ID, config, metricas_flat, notas=f"Mejor: {mejor_sub[0]}")
    print(f"\nPróximo: g04_hyperopt.py con features '{mejor_sub[0]}'")


if __name__ == "__main__":
    main()