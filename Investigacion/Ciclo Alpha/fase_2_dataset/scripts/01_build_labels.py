"""Script 01 - Asignar etiqueta a cada lectura segun sesiones conocidas."""

from __future__ import annotations

from _phase2_utils import INTERIM_DIR, ensure_phase2_dirs, load_readings, load_sessions, validate_sessions


def main() -> None:
    ensure_phase2_dirs()
    print("Cargando datos de Fase 1...")
    df_r = load_readings()
    df_s = load_sessions()
    print(f"  Lecturas : {len(df_r):,}")
    print(f"  Sesiones : {len(df_s):,}")
    print(f"  Tipos    : {df_s['session_type'].value_counts().to_dict()}")

    validate_sessions(df_s)

    df_r["label"] = "reposo"
    assigned = 0
    for _, ses in df_s.iterrows():
        label = ses["session_type"]
        mask = (df_r["ts"] >= ses["start"]) & (df_r["ts"] <= ses["end"])
        matched = int(mask.sum())
        if matched:
            assigned += matched
            df_r.loc[mask, "label"] = label

    dist = df_r["label"].value_counts()
    print("")
    print("Distribucion de etiquetas:")
    for lbl, cnt in dist.items():
        pct = cnt / len(df_r) * 100
        print(f"  {lbl:<20}: {cnt:>6,} ({pct:.1f}%)")

    if dist.get("alimentacion", 0) == 0:
        raise SystemExit("[ERROR] No se encontraron lecturas etiquetadas como alimentacion.")
    if dist.get("servido", 0) == 0:
        print("[AVISO] No se encontraron lecturas etiquetadas como servido.")

    pct_reposo = dist.get("reposo", 0) / len(df_r) * 100
    if pct_reposo < 50:
        print(f"[AVISO] Solo {pct_reposo:.1f}% de lecturas son reposo.")

    print(f"[OK] Lecturas etiquetadas dentro de sesiones: {assigned:,}")

    out_path = INTERIM_DIR / "readings_labeled.parquet"
    df_r.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")
    print(f"     Columnas: {list(df_r.columns)}")


if __name__ == "__main__":
    main()
