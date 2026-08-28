"""
scripts_export_fixtures_evidence_engine.py — Kittypau Alpha v2

Genera los fixtures "golden" y la copia de comp_stats_v2.json que usa el
port TypeScript del Evidence Engine en
kittypau_app/src/lib/evidence-engine/ — ver
Knowledge/29_Specs/007-evidence-engine-hunger-bar/{research,quickstart}.md.

No es parte del runtime de la app — se corre una sola vez (o al recalibrar,
cuando cambie comp_stats_v2.json / features_anotaciones_v2.csv) y sus
salidas quedan congeladas como archivos de test en el repo de kittypau_app.

Salidas:
  kittypau_app/src/lib/evidence-engine/comp_stats_v2.json
  kittypau_app/src/lib/evidence-engine/__fixtures__/classification-golden.json
  kittypau_app/src/lib/evidence-engine/__fixtures__/extraction-golden.json

Uso:
    python scripts_export_fixtures_evidence_engine.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"
RAW_DATA_DIR = SCRIPT_DIR.parent.parent.parent / "11_Data" / "2026"
READINGS_CSV = RAW_DATA_DIR / "readings.csv"
READINGS_ROWS_CSV = RAW_DATA_DIR / "readings_rows.csv"

FEATURES_CSV = DATA_DIR / "features_anotaciones_v2.csv"
COMP_STATS_JSON = DATA_DIR / "comp_stats_v2.json"

KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",
    "3a460074-e7c3-41bf-ae5a-a011445f927a",
}
RESAMPLE_S = 30

APP_DIR = SCRIPT_DIR.parent.parent.parent / "kittypau_app" / "src" / "lib" / "evidence-engine"
FIXTURES_DIR = APP_DIR / "__fixtures__"

META_COLS = {"id_anotacion", "id_candidato", "t_inicio", "t_fin", "categoria", "notas", "n_lecturas"}

SAMPLES_PER_CAT = 10


def cargar_resampled() -> pd.DataFrame:
    """Espejo exacto de revisar_anotaciones_v2.py::cargar_resampled()."""
    frames = []
    for path in [READINGS_CSV, READINGS_ROWS_CSV]:
        assert path.exists(), f"No encontrado: {path}"
        df = pd.read_csv(path, low_memory=False)
        df = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
        frames.append(df)

    df = pd.concat(frames, ignore_index=True)
    df["ts"] = pd.to_datetime(df["ingested_at"], format="ISO8601", utc=True)
    df["peso_g"] = pd.to_numeric(df["weight_grams"], errors="coerce")
    df = (
        df[["ts", "peso_g"]]
        .dropna(subset=["ts"])
        .drop_duplicates("ts")
        .sort_values("ts")
        .reset_index(drop=True)
    )
    serie = df.set_index("ts")["peso_g"].resample(f"{RESAMPLE_S}s").mean().ffill(limit=2)
    out = serie.reset_index()
    out.columns = ["ts", "peso_g"]
    return out


def extraer_ventana(df_r: pd.DataFrame, t_ini: pd.Timestamp, t_fin: pd.Timestamp) -> np.ndarray | None:
    mask = (df_r["ts"] >= t_ini) & (df_r["ts"] <= t_fin)
    sub = df_r.loc[mask, "peso_g"].dropna()
    if len(sub) < 3:
        return None
    return sub.values


def main() -> None:
    if not FEATURES_CSV.exists() or not COMP_STATS_JSON.exists():
        sys.exit(f"Faltan datos base: {FEATURES_CSV} / {COMP_STATS_JSON}")

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Copiar comp_stats_v2.json tal cual — fuente de verdad:
    #    Investigacion/Ciclo_Alpha_v2/fase_0_ruido/data/comp_stats_v2.json
    #    (ver research.md §7 — recalibrar = reemplazar este archivo).
    shutil.copyfile(COMP_STATS_JSON, APP_DIR / "comp_stats_v2.json")
    print(f"Copiado: {APP_DIR / 'comp_stats_v2.json'}")

    with open(COMP_STATS_JSON, encoding="utf-8") as f:
        comp_stats = json.load(f)

    df_feat = pd.read_csv(FEATURES_CSV)
    feat_cols = [c for c in df_feat.columns if c not in META_COLS]

    # 2. classification-golden.json — capa de clasificación (research.md §8.1).
    #    No requiere pesos crudos: usa las 102 features ya extraídas por el
    #    propio pipeline de investigación para las 741 anotaciones.
    annotations = []
    for _, row in df_feat.iterrows():
        feats = {c: float(row[c]) for c in feat_cols if pd.notna(row[c])}
        annotations.append(
            {"id": int(row["id_anotacion"]), "categoria": row["categoria"], "features": feats}
        )
    classification_golden = {"compStats": comp_stats, "annotations": annotations}
    with open(FIXTURES_DIR / "classification-golden.json", "w", encoding="utf-8") as f:
        json.dump(classification_golden, f, ensure_ascii=False)
    print(f"Exportado: classification-golden.json ({len(annotations)} anotaciones)")

    # 3. extraction-golden.json — capa de extracción (research.md §8.2).
    #    Muestra de ~10 anotaciones por categoría, con el array crudo de
    #    pesos ya resampleado (mismo pipeline exacto que generó
    #    features_anotaciones_v2.csv) + las features esperadas.
    print("Cargando y resampleando lecturas crudas KPCL0034...")
    df_r = cargar_resampled()

    samples = []
    for cat in ("alimentacion", "servido", "ruido"):
        sub_df = df_feat[df_feat["categoria"] == cat].sample(
            n=min(SAMPLES_PER_CAT, len(df_feat[df_feat["categoria"] == cat])),
            random_state=42,
        )
        for _, row in sub_df.iterrows():
            t_ini = pd.Timestamp(row["t_inicio"], tz="UTC") if not pd.Timestamp(row["t_inicio"]).tzinfo else pd.Timestamp(row["t_inicio"]).tz_convert("UTC")
            t_fin = pd.Timestamp(row["t_fin"], tz="UTC") if not pd.Timestamp(row["t_fin"]).tzinfo else pd.Timestamp(row["t_fin"]).tz_convert("UTC")
            valores = extraer_ventana(df_r, t_ini, t_fin)
            if valores is None:
                continue
            features_esperadas = {c: float(row[c]) for c in feat_cols if pd.notna(row[c])}
            samples.append(
                {
                    "id": int(row["id_anotacion"]),
                    "categoria": row["categoria"],
                    "valores": [float(v) for v in valores],
                    "resampleS": RESAMPLE_S,
                    "featuresEsperadas": features_esperadas,
                }
            )

    with open(FIXTURES_DIR / "extraction-golden.json", "w", encoding="utf-8") as f:
        json.dump({"samples": samples}, f, ensure_ascii=False)
    print(f"Exportado: extraction-golden.json ({len(samples)} muestras)")


if __name__ == "__main__":
    main()
