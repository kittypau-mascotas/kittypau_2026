
"""
g07_build_sesiones_candidatas.py — Fase 1 Gamma
Agrupa filas candidatas (prob_activo >= threshold) en sesiones de actividad,
sin clasificar todavía en alimentacion/servido — eso lo decide el humano.
"""
import sys
import pandas as pd

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    GAP_MERGE_S, MIN_SESSION_S, MIN_CONSUMED_G,
    CANDIDATOS_ACTIVIDAD_CSV, SESIONES_CANDIDATAS_CSV,
)


def agrupar_en_sesiones(df: pd.DataFrame) -> pd.DataFrame:
    """
    Agrupa filas consecutivas con es_candidato=1, fusionando sesiones separadas
    por un gap <= GAP_MERGE_S. Descarta solo por duración (MIN_SESSION_S);
    MIN_CONSUMED_G se reporta pero NO filtra (puede ser un sorbo de agua real
    o un picoteo — que lo decida el humano en app_anotacion.py).
    """
    df = df.sort_values("ts_utc").reset_index(drop=True)
    df["_gap_s"] = df["ts_utc"].diff().dt.total_seconds().fillna(0)

    # Nuevo grupo si: la fila actual no es candidata, o el gap desde la última
    # fila candidata supera GAP_MERGE_S
    es_cand = df["es_candidato"] == 1
    es_cand_prev = es_cand.shift(1, fill_value=False)
    nuevo_grupo = (~es_cand) | (es_cand & (df["_gap_s"] > GAP_MERGE_S) & es_cand_prev)
    df["_grupo"] = nuevo_grupo.cumsum()

    sesiones = []
    for grupo_id, grupo in df[df["es_candidato"] == 1].groupby("_grupo"):
        ts_inicio, ts_fin = grupo["ts_utc"].iloc[0], grupo["ts_utc"].iloc[-1]
        duracion_s = (ts_fin - ts_inicio).total_seconds()
        if duracion_s < MIN_SESSION_S:
            continue

        if "weight_grams" in grupo.columns:
            delta_peso_g = grupo["weight_grams"].iloc[0] - grupo["weight_grams"].iloc[-1]
        else:
            delta_peso_g = None

        sesiones.append({
            "sesion_id": grupo_id,
            "ts_inicio": ts_inicio,
            "ts_fin": ts_fin,
            "duracion_s": duracion_s,
            "n_lecturas": len(grupo),
            "prob_activo_max": grupo["prob_activo"].max(),
            "prob_activo_mean": grupo["prob_activo"].mean(),
            "periodo": grupo["_periodo"].iloc[0] if "_periodo" in grupo.columns else "desconocido",
            "delta_peso_g": delta_peso_g,
        })

    return pd.DataFrame(sesiones)


def main():
    print("=== g07_build_sesiones_candidatas.py — Ciclo Gamma · Fase 1 ===\n")
    if not CANDIDATOS_ACTIVIDAD_CSV.exists():
        raise FileNotFoundError("candidatos_actividad.csv no existe — ejecutar g06 primero")

    df = pd.read_csv(CANDIDATOS_ACTIVIDAD_CSV)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)

    sesiones = agrupar_en_sesiones(df)
    print(f"Sesiones candidatas detectadas: {len(sesiones):,}")

    if len(sesiones):
        print(f"\nDuración media: {sesiones['duracion_s'].mean():.0f}s")
        print(f"Por período:\n{sesiones['periodo'].value_counts().to_string()}")
        print(f"\n⚠️  MIN_CONSUMED_G ({MIN_CONSUMED_G}g) es informativo — no se aplicó como filtro.")
        print("   Volumen total a revisar manualmente en app_anotacion.py:", len(sesiones))

    SESIONES_CANDIDATAS_CSV.parent.mkdir(parents=True, exist_ok=True)
    sesiones.to_csv(SESIONES_CANDIDATAS_CSV, index=False, encoding="utf-8")
    print(f"\n✅ sesiones_candidatas.csv → {SESIONES_CANDIDATAS_CSV}")
    print("   Si el volumen es inviable de revisar manualmente, subir")
    print("   THRESHOLD_CANDIDATOS_GAMMA en _gamma_utils.py y re-ejecutar desde g06.")
    print("   Próximo: g08_export_anotacion.py")


if __name__ == "__main__":
    main()
