"""
g06_inferencia_modelo_a.py — Fase 1 Gamma
Carga modelo_a.lgb + calibración isotónica, predice prob_activo sobre
X_inferencia_3meses.parquet y exporta candidatos_actividad.csv con threshold 0.12.

Valida contra X_inferencia_3meses.features_version.json que la versión de
features con la que se generó el parquet es compatible_con_modelo_a — si en
_gamma_utils.py se cambió ACTIVE_FEATURE_VERSION a una variante experimental,
este script se niega a inferir en vez de fallar en silencio con resultados
inválidos.
"""
import json
import sys
import lightgbm as lgb
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    MODELO_A_LGB, CALIBRATION_ISOTONIC_JSON,
    THRESHOLD_CANDIDATOS_GAMMA, X_INFERENCIA_3MESES, X_INFERENCIA_3MESES_META,
    CANDIDATOS_ACTIVIDAD_CSV,
)


def validar_version_features() -> list:
    """Lee la metadata de g05 y verifica que la versión usada es compatible con el modelo."""
    if not X_INFERENCIA_3MESES_META.exists():
        raise FileNotFoundError(
            "X_inferencia_3meses.features_version.json no existe — ejecutar g05 primero"
        )
    with open(X_INFERENCIA_3MESES_META, encoding="utf-8") as f:
        meta = json.load(f)

    if not meta["compatible_con_modelo_a"]:
        raise ValueError(
            f"X_inferencia_3meses.parquet fue generado con la versión "
            f"'{meta['version']}', marcada compatible_con_modelo_a=False en "
            f"_gamma_utils.py. No se puede inferir con modelo_a.lgb usando este "
            f"set de features sin reentrenar el modelo. Cambiar ACTIVE_FEATURE_VERSION "
            f"de vuelta a una versión compatible y re-ejecutar g05, o usar este "
            f"set de features solo para experimentos de Fase 2/3 (no para g06)."
        )

    print(f"✅ Versión de features validada: {meta['version']} (compatible_con_modelo_a=True)")
    return meta["features"]


def cargar_modelo():
    modelo = lgb.Booster(model_file=str(MODELO_A_LGB))
    with open(CALIBRATION_ISOTONIC_JSON, encoding="utf-8") as f:
        calibracion = json.load(f)
    return modelo, calibracion


def aplicar_calibracion_isotonica(prob_raw: np.ndarray, calibracion: dict) -> np.ndarray:
    """
    Aplica la calibración isotónica guardada. Formato real verificado en
    calibration_isotonic.json: {"method": "isotonic", "best_threshold": 0.26,
    "calibration_model": {"method", "out_of_bounds": "clip", "x_thresholds",
    "y_thresholds"}}. out_of_bounds="clip" coincide con el comportamiento por
    defecto de np.interp (clipea a los extremos), por eso no requiere manejo
    extra. best_threshold=0.26 es el threshold de producción de este modelo
    guardado — distinto del 0.20 documentado como referencia genérica en
    instructivo.md; no afecta THRESHOLD_CANDIDATOS_GAMMA=0.12, que sigue siendo
    más bajo que ambos para maximizar recall en este paso.
    """
    modelo_cal = calibracion["calibration_model"]
    x_thresholds = np.array(modelo_cal["x_thresholds"])
    y_thresholds = np.array(modelo_cal["y_thresholds"])
    return np.interp(prob_raw, x_thresholds, y_thresholds)


def main():
    print("=== g06_inferencia_modelo_a.py — Ciclo Gamma · Fase 1 ===\n")
    if not X_INFERENCIA_3MESES.exists():
        raise FileNotFoundError("X_inferencia_3meses.parquet no existe — ejecutar g05 primero")

    features = validar_version_features()

    df = pd.read_parquet(X_INFERENCIA_3MESES)
    X = df[features].values

    modelo, calibracion = cargar_modelo()
    prob_raw = modelo.predict(X)
    prob_calibrada = aplicar_calibracion_isotonica(prob_raw, calibracion)

    df_out = df[["ts_utc", "device_id", "_periodo"]].copy()
    df_out["prob_raw"] = prob_raw
    df_out["prob_activo"] = prob_calibrada
    df_out["es_candidato"] = (df_out["prob_activo"] >= THRESHOLD_CANDIDATOS_GAMMA).astype(int)

    n_candidatos = df_out["es_candidato"].sum()
    print(f"Filas totales: {len(df_out):,}")
    print(f"Filas candidatas (prob_activo ≥ {THRESHOLD_CANDIDATOS_GAMMA}): {n_candidatos:,} "
          f"({n_candidatos / len(df_out) * 100:.1f}%)")

    CANDIDATOS_ACTIVIDAD_CSV.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(CANDIDATOS_ACTIVIDAD_CSV, index=False, encoding="utf-8")
    print(f"\n✅ candidatos_actividad.csv → {CANDIDATOS_ACTIVIDAD_CSV}")
    print("   Próximo: g07_build_sesiones_candidatas.py")


if __name__ == "__main__":
    main()
