"""
0A_02 — Limpieza de la serie temporal.

Aplica tres tratamientos:
  1. Outliers extremos → marca es_valido=False (no elimina)
  2. Gaps > 300s → inserta fila NaN separadora (no rellena)
  3. Deriva de largo plazo → documenta en reporte (no corrige)

Requiere: outputs/cadencia_report.json (de 0A_01)
Salida:   outputs/serie_limpia.parquet
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[4]
READINGS_PATH = (
    ROOT
    / "09_Investigacion/Ciclo Alpha"
    / "Exploracion_Gamma_Delta_2026/Ciclo_Delta/fase_1_datos/data/processed"
    / "readings_delta.parquet"
)
OUT_DIR = Path(__file__).parent / "outputs"
CADENCIA_REPORT = OUT_DIR / "cadencia_report.json"

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
GAP_CUTOFF_S = 300
RESAMPLE_TARGET_S = 30
MAX_DELTA_FISICO_G = 50       # cambio imposible en 30s en condiciones normales
VENTANA_DRIFT_LECTURAS = 240  # 240 × 30s = 2 horas
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",
    "3a460074-e7c3-41bf-ae5a-a011445f927a",
}


def cargar_y_preparar(cadencia: dict) -> pd.DataFrame:
    df = pd.read_parquet(READINGS_PATH)

    if "device_uuid" in df.columns:
        df = df[df["device_uuid"].isin(KPCL0034_UUIDS)].copy()

    if "ingested_at" in df.columns:
        df["ts"] = pd.to_datetime(df["ingested_at"], utc=True)
    else:
        df["ts"] = pd.to_datetime(df["created_at"], utc=True)

    df = df.sort_values("ts").reset_index(drop=True)
    return df


def resamplear_30s(df: pd.DataFrame) -> pd.DataFrame:
    """Forward-fill máximo 2 períodos (60s); gaps > 300s quedan como NaN."""
    df_idx = df.set_index("ts")

    col_peso = next(
        (c for c in ["peso_g", "weight_g", "weight"] if c in df_idx.columns),
        None,
    )
    if col_peso is None:
        raise ValueError("No se encuentra columna de peso (peso_g / weight_g / weight)")

    serie = df_idx[col_peso].resample(f"{RESAMPLE_TARGET_S}s").mean()

    # Forward-fill máximo 2 slots (60s), sin cruzar gaps
    serie_ff = serie.fillna(method="ffill", limit=2)

    out = serie_ff.reset_index()
    out.columns = ["ts", "peso_g"]
    return out


def calcular_delta_w(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["intervalo_s"] = df["ts"].diff().dt.total_seconds()
    df["delta_w"] = df["peso_g"].diff()
    return df


def marcar_outliers(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    df = df.copy()
    df["es_valido"] = True

    mask_outlier = df["delta_w"].abs() > MAX_DELTA_FISICO_G
    df.loc[mask_outlier, "es_valido"] = False
    n_outliers = int(mask_outlier.sum())
    return df, n_outliers


def insertar_separadores_gap(df: pd.DataFrame) -> pd.DataFrame:
    """Inserta fila NaN justo antes de cada gap > GAP_CUTOFF_S."""
    gaps_idx = df.index[df["intervalo_s"] > GAP_CUTOFF_S]
    if len(gaps_idx) == 0:
        return df

    filas_sep = []
    for idx in gaps_idx:
        ts_gap = df.loc[idx, "ts"] - pd.Timedelta(seconds=1)
        filas_sep.append(
            {"ts": ts_gap, "peso_g": np.nan, "delta_w": np.nan,
             "intervalo_s": np.nan, "es_valido": False}
        )

    sep_df = pd.DataFrame(filas_sep)
    resultado = pd.concat([df, sep_df], ignore_index=True)
    resultado = resultado.sort_values("ts").reset_index(drop=True)
    return resultado


def detectar_deriva(df: pd.DataFrame) -> dict:
    """Media móvil larga (2h) para detectar drift acumulado."""
    validos = df[df["es_valido"] & df["peso_g"].notna()].copy()
    if len(validos) < VENTANA_DRIFT_LECTURAS:
        return {"drift_detectado": False, "razon": "insuficientes lecturas válidas"}

    rolling_mean = validos["peso_g"].rolling(VENTANA_DRIFT_LECTURAS, min_periods=60).mean()
    rango_rolling = float(rolling_mean.max() - rolling_mean.min())

    # Regresión lineal simple sobre la media móvil
    y = rolling_mean.dropna().values
    x = np.arange(len(y))
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    drift_detectado = (p_value < 0.05) and (abs(slope) > 0.01)

    return {
        "drift_detectado": bool(drift_detectado),
        "slope_g_por_lectura": round(float(slope), 6),
        "p_value": round(float(p_value), 4),
        "rango_media_movil_g": round(rango_rolling, 2),
        "nota": (
            "Drift significativo — considerar estratificar por período en 0C"
            if drift_detectado
            else "Sin deriva significativa"
        ),
    }


def main():
    print("=== 0A_02 — Limpieza de la serie ===\n")

    if not CADENCIA_REPORT.exists():
        raise FileNotFoundError(
            f"No se encuentra {CADENCIA_REPORT}\n"
            "Ejecutar primero: python 0A_01_carga_y_cadencia.py"
        )

    with open(CADENCIA_REPORT, encoding="utf-8") as f:
        cadencia = json.load(f)

    print(f"  Lecturas originales: {cadencia['n_lecturas_total']}")
    print(f"  ¿Necesita resampleo? {cadencia['necesita_resampleo']}\n")

    # Cargar
    df = cargar_y_preparar(cadencia)

    # Resamplear si es necesario
    if cadencia["necesita_resampleo"]:
        print(f"  Resampleando a {RESAMPLE_TARGET_S}s...")
        df = resamplear_30s(df)
        print(f"  Shape post-resampleo: {df.shape}")
    else:
        col_peso = next(
            (c for c in ["peso_g", "weight_g", "weight"] if c in df.columns), None
        )
        df = df[["ts", col_peso]].rename(columns={col_peso: "peso_g"})

    # Delta_w
    df = calcular_delta_w(df)

    # Outliers
    df, n_outliers = marcar_outliers(df)
    print(f"  Outliers |delta_w| > {MAX_DELTA_FISICO_G}g marcados: {n_outliers}")

    # Separadores de gap
    n_gaps = int((df["intervalo_s"] > GAP_CUTOFF_S).sum())
    df = insertar_separadores_gap(df)
    print(f"  Separadores NaN insertados en gaps > {GAP_CUTOFF_S}s: {n_gaps}")

    # Deriva
    deriva = detectar_deriva(df)
    print(f"  Deriva de largo plazo: {deriva['nota']}")

    # Resumen final
    n_validas = int(df["es_valido"].sum()) if "es_valido" in df.columns else len(df)
    pct_validas = n_validas / len(df) * 100
    print(f"\n  Lecturas válidas: {n_validas}/{len(df)} ({pct_validas:.1f}%)")

    # Guardar parquet
    out_path = OUT_DIR / "serie_limpia.parquet"
    df.to_parquet(out_path, index=False)
    print(f"  Guardado: {out_path}")

    # Guardar reporte limpieza
    reporte = {
        "n_lecturas_tras_resampleo": len(df),
        "n_lecturas_validas": n_validas,
        "pct_validas": round(pct_validas, 2),
        "n_outliers_marcados": n_outliers,
        "n_gaps_separados": n_gaps,
        "max_delta_fisico_g": MAX_DELTA_FISICO_G,
        "deriva": deriva,
    }
    with open(OUT_DIR / "limpieza_report.json", "w", encoding="utf-8") as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)

    print("\n  → Próximo paso: cd ../0B_deteccion_inactividad && python 0B_01_detecta_reposo.py")


if __name__ == "__main__":
    main()
