"""
0B_01 — Detección automática de segmentos de reposo.

Estrategia: ventana deslizante con tres filtros de confirmación.
NO usa etiquetas humanas para detectar — las usa solo 0B_02 para validar.

Requiere: ../0A_exploracion/outputs/serie_limpia.parquet
Salida:   outputs/segmentos_reposo.parquet
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
SERIE_LIMPIA = (
    Path(__file__).parent.parent / "0A_exploracion" / "outputs" / "serie_limpia.parquet"
)
OUT_DIR = Path(__file__).parent / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Parámetros de detección
# Se documentan aquí para que 0B_02 pueda ajustarlos si Precision < 0.90
# ---------------------------------------------------------------------------
VENTANA_LECTURAS = 20          # 20 × 30s = 10 minutos
DURACION_MIN_LECTURAS = 10     # mínimo 5 minutos consecutivos estables
PERCENTIL_STD_CORTE = 25       # ventanas en el percentil 25 más estable
SIMETRIA_MIN = 0.35            # proporción de delta_w > 0 en [0.35, 0.65]
SIMETRIA_MAX = 0.65
P_VALOR_TENDENCIA_MIN = 0.05   # tendencia no significativa → reposo
NAN_SEPARADOR = True           # respetar filas NaN como límites de gap


def cargar_serie() -> pd.DataFrame:
    df = pd.read_parquet(SERIE_LIMPIA)
    df["ts"] = pd.to_datetime(df["ts"], utc=True)

    if "es_valido" not in df.columns:
        df["es_valido"] = df["peso_g"].notna()

    return df


def calcular_rolling_std(df: pd.DataFrame) -> pd.DataFrame:
    """rolling_std sobre peso_g, solo lecturas válidas, sin cruzar NaN (gaps)."""
    df = df.copy()

    # Reemplazar inválidos con NaN para que rolling no los use
    peso = df["peso_g"].where(df["es_valido"], np.nan)
    df["rolling_std"] = peso.rolling(VENTANA_LECTURAS, min_periods=VENTANA_LECTURAS // 2).std()

    return df


def identificar_candidatas(df: pd.DataFrame) -> pd.Series:
    """Marca como candidata cada lectura con rolling_std en el percentil inferior."""
    umbral = df["rolling_std"].quantile(PERCENTIL_STD_CORTE / 100)
    candidatas = (df["rolling_std"] <= umbral) & df["es_valido"]
    return candidatas


def agrupar_segmentos_continuos(df: pd.DataFrame, mascara: pd.Series) -> list[dict]:
    """Agrupa lecturas candidatas en segmentos continuos (sin saltos de gap)."""
    df = df.copy()
    df["candidata"] = mascara.values

    segmentos = []
    en_segmento = False
    inicio_idx = None

    for idx in range(len(df)):
        fila = df.iloc[idx]

        # Un NaN de gap rompe el segmento
        es_gap = not fila["es_valido"] or pd.isna(fila["peso_g"])

        if fila["candidata"] and not es_gap:
            if not en_segmento:
                en_segmento = True
                inicio_idx = idx
        else:
            if en_segmento:
                segmentos.append((inicio_idx, idx - 1))
                en_segmento = False

    if en_segmento:
        segmentos.append((inicio_idx, len(df) - 1))

    return segmentos


def validar_segmento(df: pd.DataFrame, i_ini: int, i_fin: int) -> dict | None:
    """
    Aplica los tres filtros de confirmación.
    Devuelve dict con stats si pasa, None si falla.
    """
    sub = df.iloc[i_ini : i_fin + 1]
    n = len(sub)

    # Filtro 1: duración mínima
    if n < DURACION_MIN_LECTURAS:
        return None

    pesos_validos = sub.loc[sub["es_valido"], "peso_g"].dropna()
    deltas_validos = sub.loc[sub["es_valido"], "delta_w"].dropna()

    if len(pesos_validos) < DURACION_MIN_LECTURAS:
        return None

    # Filtro 2: ausencia de tendencia
    x = np.arange(len(pesos_validos))
    slope, intercept, r_val, p_val, _ = stats.linregress(x, pesos_validos.values)
    if p_val < P_VALOR_TENDENCIA_MIN:
        return None

    # Filtro 3: simetría del ruido
    if len(deltas_validos) < 4:
        return None
    prop_positivos = float((deltas_validos > 0).mean())
    if not (SIMETRIA_MIN <= prop_positivos <= SIMETRIA_MAX):
        return None

    return {
        "t_inicio": sub["ts"].iloc[0].isoformat(),
        "t_fin": sub["ts"].iloc[-1].isoformat(),
        "n_lecturas": int(n),
        "rolling_std_interna": round(float(pesos_validos.std()), 4),
        "pendiente_g_por_lectura": round(float(slope), 6),
        "p_valor_tendencia": round(float(p_val), 4),
        "prop_delta_positivos": round(prop_positivos, 3),
        "peso_medio_g": round(float(pesos_validos.mean()), 2),
        "duracion_min": round(n * 30 / 60, 1),
    }


def main():
    print("=== 0B_01 — Detección de segmentos de reposo ===\n")

    if not SERIE_LIMPIA.exists():
        raise FileNotFoundError(
            f"No se encuentra {SERIE_LIMPIA}\n"
            "Ejecutar primero: 0A_02_limpieza.py"
        )

    df = cargar_serie()
    n_total = len(df)
    n_validas = int(df["es_valido"].sum())
    print(f"  Serie: {n_total} lecturas ({n_validas} válidas)")

    # Rolling std
    df = calcular_rolling_std(df)
    umbral_std = df["rolling_std"].quantile(PERCENTIL_STD_CORTE / 100)
    print(f"  Umbral rolling_std (p{PERCENTIL_STD_CORTE}): {umbral_std:.4f} g")

    # Candidatas
    candidatas = identificar_candidatas(df)
    n_candidatas = int(candidatas.sum())
    print(f"  Lecturas candidatas a reposo: {n_candidatas} ({n_candidatas/n_validas*100:.1f}%)")

    # Agrupar
    grupos = agrupar_segmentos_continuos(df, candidatas)
    print(f"  Grupos continuos de candidatas: {len(grupos)}")

    # Validar
    segmentos_validos = []
    n_rechazados_duracion = 0
    n_rechazados_tendencia = 0
    n_rechazados_simetria = 0

    for i_ini, i_fin in grupos:
        sub = df.iloc[i_ini : i_fin + 1]
        n = len(sub)
        pesos_v = sub.loc[sub["es_valido"], "peso_g"].dropna()
        deltas_v = sub.loc[sub["es_valido"], "delta_w"].dropna()

        # Anotar razón de rechazo para estadísticas
        if n < DURACION_MIN_LECTURAS or len(pesos_v) < DURACION_MIN_LECTURAS:
            n_rechazados_duracion += 1
            continue

        x = np.arange(len(pesos_v))
        _, _, _, p_val, _ = stats.linregress(x, pesos_v.values)
        if p_val < P_VALOR_TENDENCIA_MIN:
            n_rechazados_tendencia += 1
            continue

        if len(deltas_v) >= 4:
            prop_pos = float((deltas_v > 0).mean())
            if not (SIMETRIA_MIN <= prop_pos <= SIMETRIA_MAX):
                n_rechazados_simetria += 1
                continue

        resultado = validar_segmento(df, i_ini, i_fin)
        if resultado:
            segmentos_validos.append(resultado)

    print(f"\n  Segmentos de reposo detectados: {len(segmentos_validos)}")
    print(f"    Rechazados por duración < {DURACION_MIN_LECTURAS}: {n_rechazados_duracion}")
    print(f"    Rechazados por tendencia significativa: {n_rechazados_tendencia}")
    print(f"    Rechazados por asimetría del ruido: {n_rechazados_simetria}")

    if len(segmentos_validos) == 0:
        print("\n  ALERTA: 0 segmentos detectados. Ajustar PERCENTIL_STD_CORTE o DURACION_MIN_LECTURAS.")
        return

    # Estadísticas agregadas
    seg_df = pd.DataFrame(segmentos_validos)
    n_lecturas_reposo = int(seg_df["n_lecturas"].sum())
    pct_reposo = n_lecturas_reposo / n_validas * 100

    print(f"\n  Total lecturas en reposo: {n_lecturas_reposo} ({pct_reposo:.1f}% de válidas)")
    print(f"  Duración media por segmento: {seg_df['duracion_min'].mean():.1f} min")
    print(f"  Rolling std media interna: {seg_df['rolling_std_interna'].mean():.4f} g")

    # Guardar
    seg_df.to_parquet(OUT_DIR / "segmentos_reposo.parquet", index=False)

    params = {
        "ventana_lecturas": VENTANA_LECTURAS,
        "duracion_min_lecturas": DURACION_MIN_LECTURAS,
        "percentil_std_corte": PERCENTIL_STD_CORTE,
        "umbral_std_resultante": round(float(umbral_std), 4),
        "simetria_rango": [SIMETRIA_MIN, SIMETRIA_MAX],
        "p_valor_tendencia_min": P_VALOR_TENDENCIA_MIN,
        "n_segmentos_detectados": len(segmentos_validos),
        "n_lecturas_reposo": n_lecturas_reposo,
        "pct_lecturas_reposo": round(pct_reposo, 2),
    }
    with open(OUT_DIR / "deteccion_params.json", "w", encoding="utf-8") as f:
        json.dump(params, f, indent=2, ensure_ascii=False)

    print(f"\n  Guardado: {OUT_DIR / 'segmentos_reposo.parquet'}")
    print("\n  → Próximo paso: python 0B_02_valida_contra_etiquetas.py")


if __name__ == "__main__":
    main()
