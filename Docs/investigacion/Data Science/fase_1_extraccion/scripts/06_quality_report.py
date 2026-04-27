"""Script 06 - Reporte de calidad del dataset Fase 1."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

BASE = Path(__file__).parent.parent
RAW = BASE / "data" / "raw"
OUT = BASE / "outputs" / "quality_report"
OUT.mkdir(parents=True, exist_ok=True)

lines: list[str] = []


def log(msg: str = "") -> None:
    print(msg)
    lines.append(msg)


def main() -> None:
    log("=" * 60)
    log("REPORTE DE CALIDAD - KPCL0034 - FASE 1")
    log("=" * 60)

    df_r = pd.read_parquet(RAW / "readings_raw.parquet")
    log("\nREADINGS")
    log(f"  Total filas          : {len(df_r):,}")
    log(f"  Rango temporal       : {df_r['ts'].min()} -> {df_r['ts'].max()}")
    log(f"  clock_invalid=True   : {df_r['clock_invalid'].sum():,} ({df_r['clock_invalid'].mean()*100:.1f}%)")

    deltas = df_r["ts"].diff().dt.total_seconds().dropna()
    log(f"  Cadencia mediana     : {deltas.median():.1f}s")
    log(f"  Cadencia media       : {deltas.mean():.1f}s")
    log(f"  Delta max (gaps)     : {deltas.max():.0f}s ({deltas.max()/60:.1f} min)")
    gaps = deltas[deltas > 300]
    log(f"  Gaps > 5 min         : {len(gaps)}")

    log("  NaN por columna:")
    for col in ["weight_grams", "temperature", "humidity", "battery_level"]:
        pct = df_r[col].isna().mean() * 100
        log(f"    {col:<20}: {pct:.2f}%")

    df_e = pd.read_parquet(RAW / "events_labeled.parquet")
    log("\nETIQUETAS")
    log(f"  Total etiquetas      : {len(df_e)}")
    for cat, cnt in df_e["category"].value_counts().items():
        log(f"    {cat:<30}: {cnt}")

    df_s = pd.read_parquet(RAW / "sessions_labeled.parquet")
    log("\nSESIONES RECONSTRUIDAS")
    log(f"  Total sesiones       : {len(df_s)}")
    if not df_s.empty:
        for stype in df_s["session_type"].unique():
            sub = df_s[df_s["session_type"] == stype]
            log(f"  {stype}:")
            log(f"    N={len(sub)}  dur_media={sub['duration_s'].mean():.0f}s  dur_max={sub['duration_s'].max():.0f}s")

    log("\n" + "=" * 60)
    log("Fase 1 completada. Puedes continuar con la Fase 2.")
    log("=" * 60)

    report_path = OUT / "quality_report.txt"
    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Reporte guardado en: {report_path}")


if __name__ == "__main__":
    main()
