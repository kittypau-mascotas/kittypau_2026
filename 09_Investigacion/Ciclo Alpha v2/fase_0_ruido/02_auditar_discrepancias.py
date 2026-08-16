"""
02_auditar_discrepancias.py — Alpha v2

Corre el Evidence Engine (ya corregido, ver shape_features_v2.py) contra las
anotaciones humanas existentes y lista los casos donde el motor discrepa con
alta confianza — candidatos fuertes a error de etiquetado humano, no a error
del motor.

No corrige nada automáticamente: el motor todavía tiene un punto débil conocido
(alim/ruido, ~53% accuracy en ruido) — confiar ciegamente en su predicción
corrompería el dataset. Esto es solo un reporte para revisión manual en Tab 1.

Salida: data/auditoria_discrepancias.csv (id_anotacion, id_candidato, timestamps,
etiqueta humana, predicción del motor, confianza, razón) + resumen en consola.

Uso:
    python 02_auditar_discrepancias.py [--min-confianza 0.85]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from shape_features_v2 import evidence_score  # noqa: E402

DATA_DIR = Path(__file__).parent / "data"
FEATURES_CSV = DATA_DIR / "features_anotaciones_v2.csv"
COMP_STATS_JSON = DATA_DIR / "comp_stats_v2.json"
OUT_CSV = DATA_DIR / "auditoria_discrepancias.csv"

META_COLS = {"id_anotacion", "id_candidato", "t_inicio", "t_fin", "categoria", "notas", "n_lecturas"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-confianza", type=float, default=0.85,
                         help="Confianza mínima del motor para reportar discrepancia (default 0.85)")
    args = parser.parse_args()

    if not FEATURES_CSV.exists() or not COMP_STATS_JSON.exists():
        print("Faltan features_anotaciones_v2.csv o comp_stats_v2.json — correr revisar_anotaciones_v2.py primero.")
        return 1

    df = pd.read_csv(FEATURES_CSV)
    import json
    with open(COMP_STATS_JSON, encoding="utf-8") as f:
        comp_stats = json.load(f)

    feat_cols = [c for c in df.columns if c not in META_COLS]

    filas = []
    for _, row in df.iterrows():
        feats = {c: row[c] for c in feat_cols if pd.notna(row[c])}
        ev = evidence_score(feats, comp_stats)
        if ev["prediccion"] != row["categoria"] and ev["confianza"] >= args.min_confianza:
            filas.append({
                "id_anotacion":     row["id_anotacion"],
                "id_candidato":     row["id_candidato"],
                "t_inicio":         row["t_inicio"],
                "t_fin":            row["t_fin"],
                "etiqueta_humana":  row["categoria"],
                "prediccion_motor": ev["prediccion"],
                "confianza":        ev["confianza"],
                "razon":            ev["razon"],
            })

    out = pd.DataFrame(filas).sort_values("confianza", ascending=False)
    out.to_csv(OUT_CSV, index=False)

    print(f"Discrepancias (confianza >= {args.min_confianza:.0%}): {len(out)}/{len(df)} anotaciones")
    print(f"Guardado en {OUT_CSV}")
    print()
    print("Por etiqueta humana -> predicción del motor:")
    resumen = out.groupby(["etiqueta_humana", "prediccion_motor"]).size().sort_values(ascending=False)
    print(resumen.to_string())
    print()
    print("Para revisar: abrir la app, Tab 1 (Revisar Candidatos), buscar cada")
    print("id_candidato de auditoria_discrepancias.csv y confirmar o corregir la")
    print("categoría con el formulario normal.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
