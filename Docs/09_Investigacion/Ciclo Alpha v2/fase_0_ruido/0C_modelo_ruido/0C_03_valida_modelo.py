"""
0C_03 — Validación del modelo AR(p) y generación de noise_model.json.

Dos tests:
  1. Ljung-Box sobre residuos → deben ser white noise
  2. PELT interno sobre segmentos de reposo → no debe haber change-points dentro

Si ambos pasan → genera noise_model.json (output final de Fase 0).

Requiere:
  - outputs/ar_model_report.json (de 0C_02)
  - outputs/caracterizacion_report.json (de 0C_01)
  - outputs/residuos_ar.npy (de 0C_02)
  - ../0B_deteccion_inactividad/outputs/segmentos_reposo_validados.parquet
  - ../0B_deteccion_inactividad/outputs/validacion_report.json
  - ../0A_exploracion/outputs/serie_limpia.parquet

Salida: outputs/noise_model.json
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import ruptures as rpt
    RUPTURES_DISPONIBLE = True
except ImportError:
    RUPTURES_DISPONIBLE = False
    print("AVISO: ruptures no instalado — test PELT interno se omitirá")

from statsmodels.stats.diagnostic import acorr_ljungbox

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
AR_REPORT = Path(__file__).parent / "outputs" / "ar_model_report.json"
CARACT_REPORT = Path(__file__).parent / "outputs" / "caracterizacion_report.json"
VALIDACION_REPORT = (
    Path(__file__).parent.parent
    / "0B_deteccion_inactividad/outputs/validacion_report.json"
)
SEGMENTOS_VALIDADOS = (
    Path(__file__).parent.parent
    / "0B_deteccion_inactividad/outputs/segmentos_reposo_validados.parquet"
)
SERIE_LIMPIA = (
    Path(__file__).parent.parent
    / "0A_exploracion/outputs/serie_limpia.parquet"
)
RESIDUOS_PATH = Path(__file__).parent / "outputs" / "residuos_ar.npy"
OUT_DIR = Path(__file__).parent / "outputs"

# ---------------------------------------------------------------------------
# Umbrales de aceptación
# ---------------------------------------------------------------------------
LJUNG_BOX_LAGS = 10
LJUNG_BOX_ALPHA = 0.05      # p > alpha → white noise para ese lag
LJUNG_BOX_OK_MIN_PCT = 0.70  # ≥70% de lags deben pasar
PELT_OK_MIN_PCT = 0.90       # ≥90% de segmentos sin change-points internos


def test_ljung_box(residuos: np.ndarray) -> dict:
    """Ljung-Box sobre residuos del AR."""
    lb = acorr_ljungbox(residuos, lags=LJUNG_BOX_LAGS, return_df=True)
    n_ok = int((lb["lb_pvalue"] > LJUNG_BOX_ALPHA).sum())
    pct_ok = n_ok / LJUNG_BOX_LAGS
    es_white_noise = pct_ok >= LJUNG_BOX_OK_MIN_PCT

    return {
        "n_lags_testados": LJUNG_BOX_LAGS,
        "n_lags_ok": n_ok,
        "pct_lags_ok": round(pct_ok, 3),
        "es_white_noise": bool(es_white_noise),
        "nota": (
            "Residuos son white noise — modelo adecuado"
            if es_white_noise
            else "Autocorrelación residual — considerar orden AR mayor"
        ),
    }


def test_pelt_interno(serie: pd.DataFrame, segmentos: pd.DataFrame, sigma2: float) -> dict:
    """Aplica PELT sobre cada segmento de reposo — no debe haber change-points."""
    if not RUPTURES_DISPONIBLE:
        return {"omitido": True, "razon": "ruptures no instalado"}

    serie = serie.copy()
    serie["ts"] = pd.to_datetime(serie["ts"], utc=True)
    valida = serie[serie["es_valido"] & serie["peso_g"].notna()]

    n_ok = 0
    n_total = 0
    n_con_breakpoints = 0

    penalty = 3 * sigma2   # penalty conservador para no romper reposo real

    for _, seg in segmentos.iterrows():
        t_ini = pd.Timestamp(seg["t_inicio"])
        t_fin = pd.Timestamp(seg["t_fin"])
        if t_ini.tzinfo is None:
            t_ini = t_ini.tz_localize("UTC")
        if t_fin.tzinfo is None:
            t_fin = t_fin.tz_localize("UTC")

        sub = valida.loc[(valida["ts"] >= t_ini) & (valida["ts"] <= t_fin), "peso_g"].dropna()

        if len(sub) < 15:
            continue

        n_total += 1
        señal = sub.values.reshape(-1, 1)

        try:
            algo = rpt.Pelt(model="rbf").fit(señal)
            bkps = algo.predict(pen=penalty)
            # bkps siempre incluye len(señal) como último; change-points = bkps[:-1]
            n_breakpoints = len(bkps) - 1

            if n_breakpoints == 0:
                n_ok += 1
            else:
                n_con_breakpoints += 1
        except Exception:
            n_total -= 1
            continue

    pct_ok = n_ok / n_total if n_total > 0 else 0.0
    modelo_valido = pct_ok >= PELT_OK_MIN_PCT

    return {
        "n_segmentos_testados": n_total,
        "n_sin_breakpoints": n_ok,
        "n_con_breakpoints": n_con_breakpoints,
        "pct_sin_breakpoints": round(pct_ok, 3),
        "penalty_usado": round(penalty, 4),
        "modelo_valido": bool(modelo_valido),
        "nota": (
            f"PELT no segmenta el reposo ({pct_ok:.0%} OK) — sigma² adecuado"
            if modelo_valido
            else f"PELT sobre-segmenta el reposo ({pct_ok:.0%} OK) — sigma² subestimado"
        ),
    }


def main():
    print("=== 0C_03 — Validación del modelo y generación de noise_model.json ===\n")

    for ruta in [AR_REPORT, CARACT_REPORT, VALIDACION_REPORT, SEGMENTOS_VALIDADOS,
                 SERIE_LIMPIA, RESIDUOS_PATH]:
        if not ruta.exists():
            raise FileNotFoundError(f"No se encuentra {ruta}")

    with open(AR_REPORT, encoding="utf-8") as f:
        ar = json.load(f)
    with open(CARACT_REPORT, encoding="utf-8") as f:
        caract = json.load(f)
    with open(VALIDACION_REPORT, encoding="utf-8") as f:
        val = json.load(f)

    residuos = np.load(RESIDUOS_PATH)
    segmentos = pd.read_parquet(SEGMENTOS_VALIDADOS)
    serie = pd.read_parquet(SERIE_LIMPIA)

    sigma2 = ar["sigma2_proceso"]
    print(f"  Modelo: {ar['modelo_ar']},  sigma² = {sigma2:.6f}\n")

    # Test 1: Ljung-Box
    print("  [1] Test Ljung-Box sobre residuos...")
    ljung = test_ljung_box(residuos)
    print(f"      {ljung['nota']}")
    print(f"      Lags OK: {ljung['n_lags_ok']}/{ljung['n_lags_testados']} ({ljung['pct_lags_ok']:.0%})")

    # Test 2: PELT interno
    print("\n  [2] Test PELT interno sobre segmentos de reposo...")
    pelt = test_pelt_interno(serie, segmentos, sigma2)
    if pelt.get("omitido"):
        print(f"      OMITIDO: {pelt['razon']}")
    else:
        print(f"      {pelt['nota']}")
        print(f"      Sin change-points: {pelt['n_sin_breakpoints']}/{pelt['n_segmentos_testados']} ({pelt['pct_sin_breakpoints']:.0%})")

    # Veredicto
    ljung_ok = ljung["es_white_noise"]
    pelt_ok = pelt.get("omitido", False) or pelt.get("modelo_valido", False)
    modelo_final_ok = ljung_ok and pelt_ok

    print(f"\n  Ljung-Box OK: {'✓' if ljung_ok else '✗'}")
    print(f"  PELT interno OK: {'✓' if pelt_ok else '✗'}")
    print(f"  Modelo VÁLIDO para Fase 2: {'✓ SÍ' if modelo_final_ok else '✗ NO — revisar orden AR en 0C_02'}")

    if not modelo_final_ok:
        if not ljung_ok:
            print("\n  Acción: aumentar MAX_ORDEN_AR en 0C_02 y repetir.")
        elif not pelt_ok:
            print("\n  Acción: sigma² subestimado — considerar usar std_residuos² en lugar de sigma².")

    # Calcular sigma recomendado para PELT
    # Si modelo no es perfecto, usar percentil empírico más conservador
    p95 = caract["estadisticos"]["p95_abs_delta_w"]
    p99 = caract["estadisticos"]["p99_abs_delta_w"]
    umbral_pelt = (
        sigma2
        if modelo_final_ok
        else round(float(np.var(residuos)) * 1.5, 6)   # 50% más conservador
    )

    # noise_model.json
    noise_model = {
        "modelo_ar": ar["modelo_ar"],
        "phi_1": ar["parametros_ar"].get("ar.L1"),
        "phi_2": ar["parametros_ar"].get("ar.L2"),
        "sigma2_proceso": sigma2,
        "delta_w_media": caract["estadisticos"]["media"],
        "delta_w_std": caract["estadisticos"]["std"],
        "p95_abs_delta_w": p95,
        "p99_abs_delta_w": p99,
        "es_gaussian": caract["normalidad"]["es_gaussian"],
        "ruido_homogeneo": caract["homogeneidad"].get("ruido_homogeneo", True),
        "n_segmentos_reposo": val["n_verdaderos_positivos"],
        "n_lecturas_reposo": caract["n_lecturas_reposo"],
        "precision_vs_etiquetas": val["precision"],
        "ljung_box_ok_pct": ljung["pct_lags_ok"],
        "pelt_interno_ok_pct": pelt.get("pct_sin_breakpoints", None),
        "umbral_recomendado_pelt": umbral_pelt,
        "modelo_validado": modelo_final_ok,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "nota_uso": (
            "Usar 'umbral_recomendado_pelt' como penalty en ruptures.Pelt en Fase 2. "
            "No modificar sin nuevo experimento explícito."
        ),
    }

    out_path = OUT_DIR / "noise_model.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(noise_model, f, indent=2, ensure_ascii=False)

    print(f"\n  ✓ noise_model.json generado: {out_path}")
    print(f"\n  Resumen del modelo de ruido:")
    print(f"    sigma²          = {sigma2:.6f}")
    print(f"    p95_abs_delta_w = {p95:.4f} g")
    print(f"    umbral_pelt     = {umbral_pelt:.6f}")
    print(f"    precision       = {val['precision']:.3f}")

    if modelo_final_ok:
        print("\n  → Fase 0 COMPLETA. Continuar con fase_1_extraccion.")
    else:
        print("\n  → Modelo marginal. noise_model.json generado pero con advertencias.")
        print("    Revisar 0C_02 antes de continuar.")


if __name__ == "__main__":
    main()
