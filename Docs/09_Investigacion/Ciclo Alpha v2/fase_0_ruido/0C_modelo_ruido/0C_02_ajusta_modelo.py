"""
0C_02 — Ajuste del modelo AR(p) de ruido.

Usa AIC para seleccionar el orden p más parsimonioso.
El resultado es el modelo que describirá el "ruido normal" del sensor,
cuyo sigma² se usará como parámetro penalty en PELT (Fase 2).

Requiere:
  - outputs/caracterizacion_report.json (de 0C_01)
  - ../0B_deteccion_inactividad/outputs/segmentos_reposo_validados.parquet
  - ../0A_exploracion/outputs/serie_limpia.parquet

Salida: outputs/ar_model_report.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
CARACTERIZACION = Path(__file__).parent / "outputs" / "caracterizacion_report.json"
SEGMENTOS_VALIDADOS = (
    Path(__file__).parent.parent
    / "0B_deteccion_inactividad/outputs/segmentos_reposo_validados.parquet"
)
SERIE_LIMPIA = (
    Path(__file__).parent.parent
    / "0A_exploracion/outputs/serie_limpia.parquet"
)
OUT_DIR = Path(__file__).parent / "outputs"

# ---------------------------------------------------------------------------
# Parámetros
# ---------------------------------------------------------------------------
MAX_ORDEN_AR = 4   # explorar AR(0)..AR(MAX_ORDEN_AR), elegir por AIC


def extraer_delta_w_reposo(serie: pd.DataFrame, segmentos: pd.DataFrame) -> np.ndarray:
    serie = serie.copy()
    serie["ts"] = pd.to_datetime(serie["ts"], utc=True)
    valida = serie[serie["es_valido"] & serie["delta_w"].notna()].copy()

    mascara = pd.Series(False, index=valida.index)
    for _, seg in segmentos.iterrows():
        t_ini = pd.Timestamp(seg["t_inicio"])
        t_fin = pd.Timestamp(seg["t_fin"])
        if t_ini.tzinfo is None:
            t_ini = t_ini.tz_localize("UTC")
        if t_fin.tzinfo is None:
            t_fin = t_fin.tz_localize("UTC")
        mascara |= (valida["ts"] >= t_ini) & (valida["ts"] <= t_fin)

    return valida.loc[mascara, "delta_w"].values


def seleccionar_orden_por_aic(delta_w: np.ndarray) -> tuple[int, dict]:
    """Ajusta AR(0)..AR(MAX_ORDEN_AR) y devuelve el orden con menor AIC."""
    resultados = {}
    for p in range(0, MAX_ORDEN_AR + 1):
        try:
            modelo = ARIMA(delta_w, order=(p, 0, 0)).fit(method_kwargs={"warn_convergence": False})
            resultados[p] = {
                "aic": round(float(modelo.aic), 2),
                "bic": round(float(modelo.bic), 2),
                "sigma2": round(float(modelo.params.get("sigma2", modelo.resid.var())), 6),
            }
        except Exception as e:
            resultados[p] = {"error": str(e)}

    # Mejor AIC
    aic_validos = {p: v["aic"] for p, v in resultados.items() if "aic" in v}
    if not aic_validos:
        raise RuntimeError("Ningún modelo AR convergió.")

    mejor_p = min(aic_validos, key=aic_validos.get)
    return mejor_p, resultados


def ajustar_modelo_final(delta_w: np.ndarray, orden: int) -> dict:
    modelo = ARIMA(delta_w, order=(orden, 0, 0)).fit(method_kwargs={"warn_convergence": False})

    params = {}
    for nombre, valor in modelo.params.items():
        if nombre != "const":
            params[nombre] = round(float(valor), 6)

    sigma2 = float(modelo.params.get("sigma2", modelo.resid.var()))
    residuos = modelo.resid

    return {
        "orden": orden,
        "parametros": params,
        "sigma2": round(sigma2, 6),
        "aic": round(float(modelo.aic), 2),
        "bic": round(float(modelo.bic), 2),
        "media_residuos": round(float(residuos.mean()), 6),
        "std_residuos": round(float(residuos.std()), 6),
        "residuos": residuos,
    }


def main():
    print("=== 0C_02 — Ajuste del modelo AR(p) ===\n")

    for ruta in [CARACTERIZACION, SEGMENTOS_VALIDADOS, SERIE_LIMPIA]:
        if not ruta.exists():
            raise FileNotFoundError(f"No se encuentra {ruta}")

    with open(CARACTERIZACION, encoding="utf-8") as f:
        caract = json.load(f)

    orden_sugerido = caract.get("orden_ar_recomendado", 1)
    print(f"  Orden AR sugerido por 0C_01: {orden_sugerido}")
    print(f"  Explorando AR(0) a AR({MAX_ORDEN_AR}) por AIC...\n")

    segmentos = pd.read_parquet(SEGMENTOS_VALIDADOS)
    serie = pd.read_parquet(SERIE_LIMPIA)
    delta_w = extraer_delta_w_reposo(serie, segmentos)

    print(f"  N lecturas para ajuste: {len(delta_w)}")

    # Selección por AIC
    mejor_p, tabla_aic = seleccionar_orden_por_aic(delta_w)

    print("  Tabla AIC por orden:")
    for p, v in sorted(tabla_aic.items()):
        if "aic" in v:
            marca = " ← ELEGIDO" if p == mejor_p else ""
            print(f"    AR({p}): AIC={v['aic']:.2f}, BIC={v['bic']:.2f}{marca}")
        else:
            print(f"    AR({p}): ERROR — {v.get('error', '?')}")

    # Modelo final
    resultado = ajustar_modelo_final(delta_w, mejor_p)
    residuos = resultado.pop("residuos")

    print(f"\n  Modelo ajustado: AR({mejor_p})")
    print(f"  sigma² = {resultado['sigma2']:.6f}")
    if resultado["parametros"]:
        print(f"  Parámetros: {resultado['parametros']}")

    # Guardar residuos para 0C_03
    np.save(OUT_DIR / "residuos_ar.npy", residuos)

    # Guardar reporte
    reporte = {
        "modelo_ar": f"AR({mejor_p})",
        "orden": mejor_p,
        "parametros_ar": resultado["parametros"],
        "sigma2_proceso": resultado["sigma2"],
        "aic_final": resultado["aic"],
        "bic_final": resultado["bic"],
        "media_residuos": resultado["media_residuos"],
        "std_residuos": resultado["std_residuos"],
        "tabla_aic_completa": tabla_aic,
        "n_observaciones": int(len(delta_w)),
    }

    with open(OUT_DIR / "ar_model_report.json", "w", encoding="utf-8") as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)

    print(f"\n  Guardado: ar_model_report.json")
    print("  Guardado: residuos_ar.npy")
    print("\n  → Próximo paso: python 0C_03_valida_modelo.py")


if __name__ == "__main__":
    main()
