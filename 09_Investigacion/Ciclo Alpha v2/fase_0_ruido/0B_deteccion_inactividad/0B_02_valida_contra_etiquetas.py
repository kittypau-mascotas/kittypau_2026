"""
0B_02 — Validación de segmentos de reposo contra etiquetas humanas.

Calcula Precision y Recall del detector automático (0B_01) usando
public.audit_events como ground truth.

Criterio de aceptación: Precision ≥ 0.90
Si Precision < 0.90 → ajustar parámetros en 0B_01 (subir percentil o duración mínima)

Requiere:
  - outputs/segmentos_reposo.parquet (de 0B_01)
  - sessions_labeled.parquet (ground truth de Ciclo Alpha)

Salida: outputs/validacion_report.json
"""

import json
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[4]
SESSIONS_PATH = (
    ROOT
    / "09_Investigacion/Ciclo Alpha"
    / "fase_1_extraccion/data/raw/sessions_labeled.parquet"
)
SEGMENTOS_REPOSO = Path(__file__).parent / "outputs" / "segmentos_reposo.parquet"
DETECCION_PARAMS = Path(__file__).parent / "outputs" / "deteccion_params.json"
OUT_DIR = Path(__file__).parent / "outputs"

# ---------------------------------------------------------------------------
# Umbral de solapamiento para considerar que un segmento "cae" en una sesión
# ---------------------------------------------------------------------------
OVERLAP_MINIMO = 0.30   # 30% del segmento dentro de una sesión activa → NO es reposo

# Precision mínima para continuar a 0C
PRECISION_MINIMA = 0.90


def cargar_sesiones() -> pd.DataFrame:
    """Carga sesiones etiquetadas (alimentacion + servido). Todo lo fuera de ellas = reposo."""
    df = pd.read_parquet(SESSIONS_PATH)

    # Normalizar timestamps
    for col in ["t_inicio", "t_fin", "inicio", "fin", "start_time", "end_time"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True)

    # Detectar nombres de columna de inicio/fin
    col_inicio = next((c for c in ["t_inicio", "inicio", "start_time"] if c in df.columns), None)
    col_fin = next((c for c in ["t_fin", "fin", "end_time"] if c in df.columns), None)

    if not col_inicio or not col_fin:
        raise ValueError(f"Columnas de tiempo no encontradas. Columnas: {list(df.columns)}")

    df = df.rename(columns={col_inicio: "t_inicio", col_fin: "t_fin"})
    print(f"  Sesiones etiquetadas cargadas: {len(df)}")

    if "tipo" in df.columns or "event_type" in df.columns:
        col_tipo = "tipo" if "tipo" in df.columns else "event_type"
        print(f"  Distribución por tipo:\n{df[col_tipo].value_counts().to_string()}")

    return df


def calcular_overlap_pct(seg_ini: pd.Timestamp, seg_fin: pd.Timestamp,
                          ses_ini: pd.Timestamp, ses_fin: pd.Timestamp) -> float:
    """Fracción del segmento que solapa con la sesión."""
    overlap_ini = max(seg_ini, ses_ini)
    overlap_fin = min(seg_fin, ses_fin)

    if overlap_fin <= overlap_ini:
        return 0.0

    duracion_overlap = (overlap_fin - overlap_ini).total_seconds()
    duracion_segmento = (seg_fin - seg_ini).total_seconds()

    if duracion_segmento <= 0:
        return 0.0

    return duracion_overlap / duracion_segmento


def evaluar_segmento(row: pd.Series, sesiones: pd.DataFrame) -> bool:
    """
    Devuelve True si el segmento detectado como reposo es realmente reposo
    (no solapa ≥ OVERLAP_MINIMO con ninguna sesión activa).
    """
    seg_ini = pd.Timestamp(row["t_inicio"]).tz_localize("UTC") if pd.Timestamp(row["t_inicio"]).tzinfo is None else pd.Timestamp(row["t_inicio"])
    seg_fin = pd.Timestamp(row["t_fin"]).tz_localize("UTC") if pd.Timestamp(row["t_fin"]).tzinfo is None else pd.Timestamp(row["t_fin"])

    for _, sesion in sesiones.iterrows():
        overlap = calcular_overlap_pct(seg_ini, seg_fin, sesion["t_inicio"], sesion["t_fin"])
        if overlap >= OVERLAP_MINIMO:
            return False   # hay solapamiento → no es reposo real

    return True


def construir_segmentos_reposo_humanos(sesiones: pd.DataFrame,
                                        rango_inicio: pd.Timestamp,
                                        rango_fin: pd.Timestamp) -> list[tuple]:
    """
    Los "reposos humanos" son los intervalos entre sesiones etiquetadas.
    Necesario para calcular Recall.
    """
    sesiones_ord = sesiones.sort_values("t_inicio").reset_index(drop=True)
    intervalos_reposo = []

    prev_fin = rango_inicio
    for _, ses in sesiones_ord.iterrows():
        if ses["t_inicio"] > prev_fin:
            intervalos_reposo.append((prev_fin, ses["t_inicio"]))
        prev_fin = max(prev_fin, ses["t_fin"])

    if prev_fin < rango_fin:
        intervalos_reposo.append((prev_fin, rango_fin))

    return intervalos_reposo


def main():
    print("=== 0B_02 — Validación contra etiquetas humanas ===\n")

    if not SEGMENTOS_REPOSO.exists():
        raise FileNotFoundError(f"No se encuentra {SEGMENTOS_REPOSO}\nEjecutar primero: 0B_01_detecta_reposo.py")

    seg_df = pd.read_parquet(SEGMENTOS_REPOSO)
    print(f"  Segmentos de reposo detectados: {len(seg_df)}")

    sesiones = cargar_sesiones()

    with open(DETECCION_PARAMS, encoding="utf-8") as f:
        params = json.load(f)

    # --- Precision ---
    print("\n  Evaluando Precision (¿los detectados son realmente reposo?)...")
    resultados = []
    for _, row in seg_df.iterrows():
        es_reposo_real = evaluar_segmento(row, sesiones)
        resultados.append(es_reposo_real)

    seg_df["es_reposo_real"] = resultados
    n_verdaderos_positivos = int(seg_df["es_reposo_real"].sum())
    n_falsos_positivos = int((~seg_df["es_reposo_real"]).sum())
    precision = n_verdaderos_positivos / len(seg_df) if len(seg_df) > 0 else 0.0

    print(f"    Verdaderos positivos: {n_verdaderos_positivos}")
    print(f"    Falsos positivos: {n_falsos_positivos}")
    print(f"    Precision: {precision:.3f}")

    # --- Recall ---
    print("\n  Evaluando Recall (¿cuánto reposo real capturamos?)...")
    seg_df["t_inicio_ts"] = pd.to_datetime(seg_df["t_inicio"], utc=True)
    seg_df["t_fin_ts"] = pd.to_datetime(seg_df["t_fin"], utc=True)

    rango_ini = sesiones["t_inicio"].min() - pd.Timedelta(hours=1)
    rango_fin = sesiones["t_fin"].max() + pd.Timedelta(hours=1)

    reposos_humanos = construir_segmentos_reposo_humanos(sesiones, rango_ini, rango_fin)
    duracion_reposo_humano_s = sum((f - i).total_seconds() for i, f in reposos_humanos)

    duracion_detectada_reposo_s = 0.0
    for _, row in seg_df[seg_df["es_reposo_real"]].iterrows():
        for rh_ini, rh_fin in reposos_humanos:
            overlap = calcular_overlap_pct(row["t_inicio_ts"], row["t_fin_ts"], rh_ini, rh_fin)
            duracion_detectada_reposo_s += overlap * (row["t_fin_ts"] - row["t_inicio_ts"]).total_seconds()

    recall = (
        min(duracion_detectada_reposo_s / duracion_reposo_humano_s, 1.0)
        if duracion_reposo_humano_s > 0 else 0.0
    )
    print(f"    Duración reposo humano total: {duracion_reposo_humano_s/3600:.1f} h")
    print(f"    Duración detectada correctamente: {duracion_detectada_reposo_s/3600:.1f} h")
    print(f"    Recall: {recall:.3f}")

    # --- Veredicto ---
    print(f"\n  {'✓' if precision >= PRECISION_MINIMA else '✗'} Precision={precision:.3f} (mínimo {PRECISION_MINIMA})")
    continuar = precision >= PRECISION_MINIMA

    if continuar:
        print("  → PASAR A 0C: modelo de ruido con segmentos validados")
    else:
        print("  → VOLVER A 0B_01 y ajustar parámetros:")
        print(f"     - Subir PERCENTIL_STD_CORTE de {params['percentil_std_corte']} a {params['percentil_std_corte']-5}")
        print(f"     - O aumentar DURACION_MIN_LECTURAS de {params['duracion_min_lecturas']} a {params['duracion_min_lecturas']+4}")

    # Guardar reporte
    reporte = {
        "n_segmentos_detectados": len(seg_df),
        "n_verdaderos_positivos": n_verdaderos_positivos,
        "n_falsos_positivos": n_falsos_positivos,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "duracion_reposo_humano_h": round(duracion_reposo_humano_s / 3600, 2),
        "duracion_detectada_ok_h": round(duracion_detectada_reposo_s / 3600, 2),
        "precision_minima_requerida": PRECISION_MINIMA,
        "apto_para_0C": continuar,
        "params_usados": params,
    }

    with open(OUT_DIR / "validacion_report.json", "w", encoding="utf-8") as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)

    # Guardar solo los segmentos validados para 0C
    if continuar:
        seg_validos = seg_df[seg_df["es_reposo_real"]].drop(columns=["es_reposo_real", "t_inicio_ts", "t_fin_ts"])
        seg_validos.to_parquet(OUT_DIR / "segmentos_reposo_validados.parquet", index=False)
        print(f"\n  Guardado: segmentos_reposo_validados.parquet ({len(seg_validos)} segmentos)")

    print(f"  Reporte guardado: {OUT_DIR / 'validacion_report.json'}")


if __name__ == "__main__":
    main()
