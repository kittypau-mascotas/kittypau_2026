"""
0C_01 — Caracterización estadística del ruido del sensor.

Extrae lecturas de los segmentos de reposo validados y calcula:
  - Distribución de delta_w (media, std, skewness, kurtosis, normalidad)
  - Estructura temporal (ACF, PACF, ADF)
  - Homogeneidad entre períodos (Kruskal-Wallis)

Requiere:
  - ../0B_deteccion_inactividad/outputs/segmentos_reposo_validados.parquet
  - ../0A_exploracion/outputs/serie_limpia.parquet

Salida: outputs/caracterizacion_report.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.stattools import jarque_bera
from statsmodels.tsa.stattools import acf, adfuller, pacf
from statsmodels.stats.diagnostic import acorr_ljungbox

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
SEGMENTOS_VALIDADOS = (
    Path(__file__).parent.parent
    / "0B_deteccion_inactividad/outputs/segmentos_reposo_validados.parquet"
)
SERIE_LIMPIA = (
    Path(__file__).parent.parent
    / "0A_exploracion/outputs/serie_limpia.parquet"
)
OUT_DIR = Path(__file__).parent / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Parámetros
# ---------------------------------------------------------------------------
LAGS_ACF = 10
SHAPIRO_MAX_MUESTRAS = 5000    # Shapiro-Wilk no escala bien para N grande
SHAPIRO_FRAC_RECHAZO = 0.50    # si > 50% de segmentos rechazan normalidad → no Gaussian


def extraer_delta_w_reposo(serie: pd.DataFrame, segmentos: pd.DataFrame) -> pd.Series:
    """Filtra la serie limpia a las lecturas dentro de segmentos de reposo."""
    serie = serie.copy()
    serie["ts"] = pd.to_datetime(serie["ts"], utc=True)
    serie = serie[serie["es_valido"] & serie["delta_w"].notna()].copy()

    mascara = pd.Series(False, index=serie.index)
    for _, seg in segmentos.iterrows():
        t_ini = pd.Timestamp(seg["t_inicio"]).tz_localize("UTC") if pd.Timestamp(seg["t_inicio"]).tzinfo is None else pd.Timestamp(seg["t_inicio"])
        t_fin = pd.Timestamp(seg["t_fin"]).tz_localize("UTC") if pd.Timestamp(seg["t_fin"]).tzinfo is None else pd.Timestamp(seg["t_fin"])
        mascara |= (serie["ts"] >= t_ini) & (serie["ts"] <= t_fin)

    delta_reposo = serie.loc[mascara, "delta_w"]
    return delta_reposo


def test_normalidad_por_segmento(serie: pd.DataFrame, segmentos: pd.DataFrame) -> dict:
    """Shapiro-Wilk por segmento individual."""
    serie = serie.copy()
    serie["ts"] = pd.to_datetime(serie["ts"], utc=True)

    rechazos = 0
    total = 0

    for _, seg in segmentos.iterrows():
        t_ini = pd.Timestamp(seg["t_inicio"])
        t_fin = pd.Timestamp(seg["t_fin"])
        if t_ini.tzinfo is None:
            t_ini = t_ini.tz_localize("UTC")
        if t_fin.tzinfo is None:
            t_fin = t_fin.tz_localize("UTC")

        sub = serie.loc[(serie["ts"] >= t_ini) & (serie["ts"] <= t_fin) & serie["es_valido"], "delta_w"].dropna()

        if len(sub) < 8:
            continue

        muestra = sub.values[:SHAPIRO_MAX_MUESTRAS]
        _, p_val = stats.shapiro(muestra)
        total += 1
        if p_val < 0.05:
            rechazos += 1

    frac_rechazo = rechazos / total if total > 0 else 0.0
    es_gaussian = frac_rechazo < SHAPIRO_FRAC_RECHAZO

    return {
        "n_segmentos_testados": total,
        "n_rechazos_shapiro": rechazos,
        "frac_rechazo": round(frac_rechazo, 3),
        "es_gaussian": bool(es_gaussian),
        "nota": (
            "Ruido aproximadamente Gaussian — usar σ teórico"
            if es_gaussian
            else "Ruido NO Gaussian — usar percentiles empíricos como umbral"
        ),
    }


def analizar_autocorrelacion(delta_w: pd.Series) -> dict:
    """ACF, PACF y ADF sobre la serie de delta_w en reposo."""
    valores = delta_w.dropna().values

    if len(valores) < LAGS_ACF + 10:
        return {"error": "insuficientes datos para ACF", "n_disponibles": len(valores)}

    acf_vals = acf(valores, nlags=LAGS_ACF, fft=True)
    pacf_vals = pacf(valores, nlags=min(LAGS_ACF, len(valores) // 4))

    # ADF
    adf_result = adfuller(valores, autolag="AIC")
    es_estacionaria = adf_result[1] < 0.05

    # Primer lag significativo de ACF (IC 95%)
    ic_95 = 1.96 / np.sqrt(len(valores))
    lags_sig_acf = [i for i, v in enumerate(acf_vals[1:], 1) if abs(v) > ic_95]
    lags_sig_pacf = [i for i, v in enumerate(pacf_vals[1:], 1) if abs(v) > ic_95]

    hay_autocorr = len(lags_sig_acf) > 0

    return {
        "acf_lag1": round(float(acf_vals[1]), 4),
        "acf_lag2": round(float(acf_vals[2]), 4) if len(acf_vals) > 2 else None,
        "pacf_lag1": round(float(pacf_vals[1]), 4),
        "pacf_lag2": round(float(pacf_vals[2]), 4) if len(pacf_vals) > 2 else None,
        "lags_significativos_acf": lags_sig_acf,
        "lags_significativos_pacf": lags_sig_pacf,
        "hay_autocorrelacion": bool(hay_autocorr),
        "adf_statistic": round(float(adf_result[0]), 4),
        "adf_p_value": round(float(adf_result[1]), 4),
        "es_estacionaria": bool(es_estacionaria),
        "orden_ar_sugerido": max(lags_sig_pacf) if lags_sig_pacf else 0,
        "nota": (
            f"AR({max(lags_sig_pacf)}) sugerido por PACF"
            if lags_sig_pacf
            else "Sin autocorrelación significativa — ruido blanco"
        ),
    }


def test_homogeneidad(serie: pd.DataFrame, segmentos: pd.DataFrame) -> dict:
    """Kruskal-Wallis: ¿el ruido es homogéneo entre segmentos / períodos?"""
    serie = serie.copy()
    serie["ts"] = pd.to_datetime(serie["ts"], utc=True)

    grupos = []
    for _, seg in segmentos.iterrows():
        t_ini = pd.Timestamp(seg["t_inicio"])
        t_fin = pd.Timestamp(seg["t_fin"])
        if t_ini.tzinfo is None:
            t_ini = t_ini.tz_localize("UTC")
        if t_fin.tzinfo is None:
            t_fin = t_fin.tz_localize("UTC")

        sub = serie.loc[(serie["ts"] >= t_ini) & (serie["ts"] <= t_fin) & serie["es_valido"], "delta_w"].dropna()
        if len(sub) >= 5:
            grupos.append(sub.values)

    if len(grupos) < 2:
        return {"error": "menos de 2 grupos con datos suficientes"}

    stat, p_val = stats.kruskal(*grupos)
    ruido_homogeneo = p_val >= 0.05

    return {
        "n_grupos": len(grupos),
        "kruskal_statistic": round(float(stat), 4),
        "kruskal_p_value": round(float(p_val), 4),
        "ruido_homogeneo": bool(ruido_homogeneo),
        "nota": (
            "Ruido homogéneo — un solo modelo para todo el período"
            if ruido_homogeneo
            else "Ruido heterogéneo — noise_model.json incluirá rango por período"
        ),
    }


def main():
    print("=== 0C_01 — Caracterización estadística del ruido ===\n")

    for ruta in [SEGMENTOS_VALIDADOS, SERIE_LIMPIA]:
        if not ruta.exists():
            raise FileNotFoundError(f"No se encuentra {ruta}")

    segmentos = pd.read_parquet(SEGMENTOS_VALIDADOS)
    serie = pd.read_parquet(SERIE_LIMPIA)

    print(f"  Segmentos de reposo validados: {len(segmentos)}")

    # Extraer delta_w en reposo
    delta_reposo = extraer_delta_w_reposo(serie, segmentos)
    n_lecturas = len(delta_reposo)
    print(f"  Lecturas de delta_w en reposo: {n_lecturas}\n")

    if n_lecturas < 100:
        print("  ALERTA: pocas lecturas de reposo. Revisar 0B_01.")
        return

    # Estadísticos básicos
    media = float(delta_reposo.mean())
    std = float(delta_reposo.std())
    skewness = float(delta_reposo.skew())
    kurtosis_val = float(delta_reposo.kurtosis())
    p95_abs = float(delta_reposo.abs().quantile(0.95))
    p99_abs = float(delta_reposo.abs().quantile(0.99))

    print(f"  Estadísticos básicos de delta_w:")
    print(f"    media    = {media:.4f} g")
    print(f"    std      = {std:.4f} g")
    print(f"    skewness = {skewness:.3f}")
    print(f"    kurtosis = {kurtosis_val:.3f}")
    print(f"    p95_abs  = {p95_abs:.4f} g")
    print(f"    p99_abs  = {p99_abs:.4f} g")

    # Normalidad
    print("\n  Test de normalidad (Shapiro-Wilk por segmento)...")
    normalidad = test_normalidad_por_segmento(serie, segmentos)
    print(f"    {normalidad['nota']}")
    print(f"    Frac. rechazo: {normalidad['frac_rechazo']:.1%} ({normalidad['n_rechazos_shapiro']}/{normalidad['n_segmentos_testados']})")

    # Autocorrelación
    print("\n  Análisis de autocorrelación...")
    autocorr = analizar_autocorrelacion(delta_reposo)
    print(f"    ACF lag-1: {autocorr.get('acf_lag1', 'N/A')}")
    print(f"    PACF lag-1: {autocorr.get('pacf_lag1', 'N/A')}")
    print(f"    {autocorr.get('nota', '')}")

    # Homogeneidad
    print("\n  Test de homogeneidad (Kruskal-Wallis)...")
    homogeneidad = test_homogeneidad(serie, segmentos)
    print(f"    {homogeneidad.get('nota', '')}")

    # Guardar
    reporte = {
        "n_lecturas_reposo": n_lecturas,
        "n_segmentos_reposo": len(segmentos),
        "estadisticos": {
            "media": round(media, 6),
            "std": round(std, 6),
            "skewness": round(skewness, 4),
            "kurtosis": round(kurtosis_val, 4),
            "p95_abs_delta_w": round(p95_abs, 4),
            "p99_abs_delta_w": round(p99_abs, 4),
        },
        "normalidad": normalidad,
        "autocorrelacion": autocorr,
        "homogeneidad": homogeneidad,
        "orden_ar_recomendado": autocorr.get("orden_ar_sugerido", 1),
    }

    out_path = OUT_DIR / "caracterizacion_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)

    print(f"\n  Guardado: {out_path}")
    print("\n  → Próximo paso: python 0C_02_ajusta_modelo.py")


if __name__ == "__main__":
    main()
