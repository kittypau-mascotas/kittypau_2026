
"""
g01_build_labels.py — Fase 2 Gamma
Asigna label de clasificación (0=alimentacion, 1=servido, 2=reposo) a cada
lectura de readings_unificado_30s.parquet basándose en sessions_labeled.parquet.
"""
import sys
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    READINGS_UNIFICADO_30S, SESSIONS_LABELED_PARQUET,
    FASE2_INTERIM, LABEL_ENCODING,
)

LABEL_DEFAULT = LABEL_ENCODING["reposo"]


def asignar_labels(readings: pd.DataFrame, sesiones: pd.DataFrame) -> pd.DataFrame:
    """
    Para cada lectura, verifica si cae dentro de alguna sesión etiquetada.
    Default: reposo. Solo alimentacion y servido producen label distinto.
    """
    readings = readings.copy()
    readings["label"] = LABEL_DEFAULT

    sesiones_validas = sesiones[
        sesiones["session_type"].isin(["alimentacion", "servido"])
    ].copy()

    print(f"Sesiones válidas para labeling: {len(sesiones_validas)}")
    print(f"  alimentacion: {len(sesiones_validas[sesiones_validas.session_type == 'alimentacion'])}")
    print(f"  servido:      {len(sesiones_validas[sesiones_validas.session_type == 'servido'])}")

    for _, ses in sesiones_validas.iterrows():
        label = LABEL_ENCODING[ses["session_type"]]
        mask  = (readings["ts_utc"] >= ses["ts_inicio"]) & (readings["ts_utc"] <= ses["ts_fin"])
        readings.loc[mask, "label"] = label

    return readings


def main():
    print("=== g01_build_labels.py — Ciclo Gamma · Fase 2 ===\n")
    FASE2_INTERIM.mkdir(parents=True, exist_ok=True)

    if not READINGS_UNIFICADO_30S.exists():
        raise FileNotFoundError("readings_unificado_30s.parquet no existe — ejecutar Fase 1 primero")
    if not SESSIONS_LABELED_PARQUET.exists():
        raise FileNotFoundError("sessions_labeled.parquet no existe — ejecutar g09 de Fase 1 primero")

    readings = pd.read_parquet(READINGS_UNIFICADO_30S)
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)
    print(f"Lecturas a etiquetar: {len(readings):,}")
    print(f"Rango: {readings['ts_utc'].min()} → {readings['ts_utc'].max()}")

    sesiones = pd.read_parquet(SESSIONS_LABELED_PARQUET)
    sesiones["ts_inicio"] = pd.to_datetime(sesiones["ts_inicio"], utc=True)
    sesiones["ts_fin"]    = pd.to_datetime(sesiones["ts_fin"],    utc=True)

    readings = asignar_labels(readings, sesiones)

    inv = {v: k for k, v in LABEL_ENCODING.items()}
    dist = readings["label"].value_counts().sort_index()
    print("\nDistribución de labels:")
    for lbl_id, count in dist.items():
        pct = count / len(readings) * 100
        print(f"  {lbl_id} ({inv.get(lbl_id, '?'):15s}): {count:7,}  ({pct:.2f}%)")

    out = FASE2_INTERIM / "readings_labeled.parquet"
    readings.to_parquet(out, index=False)
    print(f"\n✅ readings_labeled.parquet → {out}")
    print("   Próximo: g02_build_features.py")


if __name__ == "__main__":
    main()
