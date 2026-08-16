"""
0A_01 — Carga y verificación de cadencia.

Lee readings_delta.parquet, verifica la cadencia real de la serie y decide
si necesita resampleo antes de pasar a limpieza.

Salida: outputs/cadencia_report.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[4]  # kittypau_2026_hivemq/
READINGS_PATH = (
    ROOT
    / "09_Investigacion/Ciclo Alpha"
    / "Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_1_datos/data/processed"
    / "readings_delta.parquet"
)
OUT_DIR = Path(__file__).parent / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Constantes validadas (Gamma)
# ---------------------------------------------------------------------------
GAP_CUTOFF_S = 300          # gap real → no rellenar
RESAMPLE_TARGET_S = 30      # cadencia objetivo
MAX_INTERVALO_ACEPTABLE_S = 60   # p95 dentro de esto → no resamplear
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",   # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # Mayo–Junio 2026
}


def main():
    print("=== 0A_01 — Carga y verificación de cadencia ===\n")

    # 1. Cargar
    print(f"Leyendo: {READINGS_PATH}")
    df = pd.read_parquet(READINGS_PATH)
    print(f"  Shape inicial: {df.shape}")
    print(f"  Columnas: {list(df.columns)}\n")

    # 2. Filtrar solo KPCL0034
    if "device_uuid" in df.columns:
        n_antes = len(df)
        df = df[df["device_uuid"].isin(KPCL0034_UUIDS)].copy()
        print(f"  Filtrado a KPCL0034: {n_antes} → {len(df)} filas")
        uuids_presentes = df["device_uuid"].unique().tolist()
        print(f"  UUIDs presentes: {uuids_presentes}\n")
    else:
        print("  AVISO: columna 'device_uuid' no encontrada — se usa toda la serie\n")
        uuids_presentes = []

    # 3. Timestamp canónico: ingested_at si existe, sino created_at
    if "ingested_at" in df.columns:
        df["ts"] = pd.to_datetime(df["ingested_at"], utc=True)
        ts_fuente = "ingested_at"
    elif "created_at" in df.columns:
        df["ts"] = pd.to_datetime(df["created_at"], utc=True)
        ts_fuente = "created_at"
    else:
        raise ValueError("No se encuentra columna de timestamp (ingested_at / created_at)")

    print(f"  Timestamp canónico: {ts_fuente}")

    # clock_invalid
    pct_clock_invalid = 0.0
    if "clock_invalid" in df.columns:
        pct_clock_invalid = df["clock_invalid"].mean() * 100
        print(f"  clock_invalid=True: {pct_clock_invalid:.1f}% de lecturas")

    # 4. Ordenar por tiempo
    df = df.sort_values("ts").reset_index(drop=True)
    rango_inicio = df["ts"].min().isoformat()
    rango_fin = df["ts"].max().isoformat()
    print(f"\n  Rango temporal: {rango_inicio} → {rango_fin}")

    # 5. Calcular intervalos entre lecturas consecutivas
    df["intervalo_s"] = df["ts"].diff().dt.total_seconds()
    intervalos = df["intervalo_s"].dropna()

    mediana = float(intervalos.median())
    p5 = float(intervalos.quantile(0.05))
    p95 = float(intervalos.quantile(0.95))
    maximo = float(intervalos.max())

    print(f"\n  Distribución de intervalos entre lecturas:")
    print(f"    mediana = {mediana:.1f}s")
    print(f"    p5      = {p5:.1f}s")
    print(f"    p95     = {p95:.1f}s")
    print(f"    máximo  = {maximo:.1f}s")

    # 6. Gaps > GAP_CUTOFF_S
    gaps = intervalos[intervalos > GAP_CUTOFF_S]
    n_gaps = len(gaps)
    gap_total_h = float(gaps.sum() / 3600)
    print(f"\n  Gaps > {GAP_CUTOFF_S}s: {n_gaps} (total {gap_total_h:.1f} h sin datos)")

    if n_gaps > 0:
        print("  Distribución de gaps:")
        for limite in [600, 3600, 86400]:
            cnt = int((gaps > limite).sum())
            print(f"    > {limite}s: {cnt}")

    # 7. Decisión de resampleo
    necesita_resampleo = not (
        abs(mediana - RESAMPLE_TARGET_S) < 5 and p95 < MAX_INTERVALO_ACEPTABLE_S
    )

    print(f"\n  ¿Necesita resampleo a {RESAMPLE_TARGET_S}s? → {'SÍ' if necesita_resampleo else 'NO'}")
    if necesita_resampleo:
        print(f"  Razón: mediana={mediana:.1f}s ≠ {RESAMPLE_TARGET_S}s  o  p95={p95:.1f}s > {MAX_INTERVALO_ACEPTABLE_S}s")

    # 8. Guardar reporte
    reporte = {
        "n_lecturas_total": int(len(df)),
        "uuids_presentes": uuids_presentes,
        "ts_fuente": ts_fuente,
        "pct_clock_invalid": round(pct_clock_invalid, 2),
        "rango_inicio": rango_inicio,
        "rango_fin": rango_fin,
        "intervalo_mediana_s": round(mediana, 2),
        "intervalo_p5_s": round(p5, 2),
        "intervalo_p95_s": round(p95, 2),
        "intervalo_max_s": round(maximo, 2),
        "n_gaps_gt_300s": n_gaps,
        "gap_total_horas": round(gap_total_h, 2),
        "necesita_resampleo": necesita_resampleo,
        "resample_target_s": RESAMPLE_TARGET_S,
    }

    out_path = OUT_DIR / "cadencia_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)

    print(f"\n  Reporte guardado: {out_path}")
    print("\n  → Próximo paso: python 0A_02_limpieza.py")


if __name__ == "__main__":
    main()
