"""
revisar_anotaciones_v2.py — Alpha v2
=====================================
Lee las 417 anotaciones finales + lecturas crudas KPCL0034,
extrae el vector completo de features v2 para cada evento anotado,
calcula µ ± σ por categoría y exporta:

  data/features_anotaciones_v2.csv   — 417 filas × ~115 columnas
  data/comp_stats_v2.json            — µ, σ, mediana, n por feature y categoría

Imprime el bloque COMP_STATS listo para pegar en app_anotacion_av2.py.

Uso:
    python revisar_anotaciones_v2.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR      = Path(__file__).parent
DATA_DIR        = SCRIPT_DIR / "data"
DATA_DIR_AGUA   = SCRIPT_DIR / "data_agua"
RAW_DATA_DIR    = SCRIPT_DIR.parent.parent.parent / "11_Data" / "2026"
READINGS_CSV    = RAW_DATA_DIR / "readings.csv"
READINGS_ROWS_CSV = RAW_DATA_DIR / "readings_rows.csv"

# ─── Perfiles de dispositivo ──────────────────────────────────────────────────
# Ver Knowledge/29_Specs/SPEC_07_Investigacion_Hidratacion.md §5.1 — paso 3 del
# roadmap: agrega el perfil KPCL0036 (agua). "cats" son las categorías reales
# de `categoria` en el CSV de anotaciones de ese perfil (§5.2 del spec).
DEVICE_PROFILES: dict[str, dict] = {
    "KPCL0034": {
        "device_code": "KPCL0034",
        "uuids": {
            "9510a455-b0e9-4932-8be1-03976d31228a",
            "3a460074-e7c3-41bf-ae5a-a011445f927a",
        },
        "anotaciones_csv": DATA_DIR / "anotaciones_av2.csv",
        "out_features": DATA_DIR / "features_anotaciones_v2.csv",
        "out_stats": DATA_DIR / "comp_stats_v2.json",
        "cats": ["alimentacion", "servido", "ruido"],
    },
    "KPCL0036": {
        "device_code": "KPCL0036",
        "uuids": {
            "3c1c6705-636d-4770-bdcf-21aa6f7225a5",  # bebedero, confirmado SPEC_07 §2.2
        },
        "anotaciones_csv": DATA_DIR_AGUA / "anotaciones_agua.csv",
        "out_features": DATA_DIR_AGUA / "features_anotaciones_agua.csv",
        "out_stats": DATA_DIR_AGUA / "comp_stats_agua.json",
        "cats": ["hidratacion", "servido", "ruido"],
    },
}

_ACTIVE_PROFILE = os.environ.get("KITTYPAU_DEVICE_PROFILE", "KPCL0034")
_ACTIVE = DEVICE_PROFILES[_ACTIVE_PROFILE]

ANOTACIONES_CSV = _ACTIVE["anotaciones_csv"]
OUT_FEATURES    = _ACTIVE["out_features"]
OUT_STATS       = _ACTIVE["out_stats"]
KPCL0034_UUIDS  = _ACTIVE["uuids"]  # nombre histórico; sigue siendo el set de UUIDs del perfil activo
DEVICE_CODE     = _ACTIVE["device_code"]
CATS            = _ACTIVE["cats"]

RESAMPLE_S = 30
MARGEN_S   = 60   # contexto extra antes/después al extraer ventana


# ── Importar motor v2 ────────────────────────────────────────────────────────
sys.path.insert(0, str(SCRIPT_DIR))
from shape_features_v2 import extraer_features, REGISTRY


# ── Cargar y resamplear lecturas crudas ──────────────────────────────────────
def cargar_resampled() -> pd.DataFrame:
    frames = []
    for path in [READINGS_CSV, READINGS_ROWS_CSV]:
        assert path.exists(), f"No encontrado: {path}"
        df = pd.read_csv(path, low_memory=False)
        df = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
        frames.append(df)

    df = pd.concat(frames, ignore_index=True)
    df["ts"]     = pd.to_datetime(df["ingested_at"], format="ISO8601", utc=True)
    df["peso_g"] = pd.to_numeric(df["weight_grams"], errors="coerce")
    df = (
        df[["ts", "peso_g"]]
        .dropna(subset=["ts"])
        .drop_duplicates("ts")
        .sort_values("ts")
        .reset_index(drop=True)
    )

    serie = df.set_index("ts")["peso_g"].resample(f"{RESAMPLE_S}s").mean()
    serie = serie.ffill(limit=2)
    df_r  = serie.reset_index()
    df_r.columns = ["ts", "peso_g"]
    print(f"  Resampled: {len(df_r):,} slots "
          f"({df_r['ts'].min().date()} → {df_r['ts'].max().date()})")
    return df_r


# ── Extraer ventana de valores para una anotación ───────────────────────────
def extraer_ventana(df_r: pd.DataFrame, t_ini: pd.Timestamp,
                    t_fin: pd.Timestamp) -> np.ndarray | None:
    mask = (df_r["ts"] >= t_ini) & (df_r["ts"] <= t_fin)
    sub  = df_r.loc[mask, "peso_g"].dropna()
    if len(sub) < 3:
        return None
    return sub.values


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=== revisar_anotaciones_v2.py ===\n")

    # Cargar anotaciones
    df_an = pd.read_csv(ANOTACIONES_CSV)
    print(f"Anotaciones: {len(df_an)} total")
    print(df_an["categoria"].value_counts().to_string())
    print()

    # Cargar data cruda resampled
    print("Cargando lecturas crudas...")
    df_r = cargar_resampled()
    print()

    # Extraer features por anotación
    resultados = []
    errores    = 0

    print(f"Extrayendo features v2 para {len(df_an)} anotaciones...")
    for i, row in df_an.iterrows():
        t_ini = pd.Timestamp(row["t_inicio"]).tz_convert("UTC") \
                if pd.Timestamp(row["t_inicio"]).tzinfo else \
                pd.Timestamp(row["t_inicio"], tz="UTC")
        t_fin = pd.Timestamp(row["t_fin"]).tz_convert("UTC") \
                if pd.Timestamp(row["t_fin"]).tzinfo else \
                pd.Timestamp(row["t_fin"], tz="UTC")

        # Usar ventana sin margen (ya es la ventana refinada por el operador)
        valores = extraer_ventana(df_r, t_ini, t_fin)
        if valores is None:
            print(f"  SKIP id_anotacion={row['id_anotacion']} — sin datos en ventana")
            errores += 1
            continue

        feats = extraer_features(valores, resample_s=float(RESAMPLE_S))
        fila  = {
            "id_anotacion": row["id_anotacion"],
            "id_candidato": row["id_candidato"],
            "t_inicio":     row["t_inicio"],
            "t_fin":        row["t_fin"],
            "categoria":    row["categoria"],
            "notas":        row.get("notas", ""),
            "n_lecturas":   len(valores),
            **feats,
        }
        resultados.append(fila)

        if (i + 1) % 50 == 0:
            print(f"  ...{i+1}/{len(df_an)}", end="\r")

    print(f"\n  OK: {len(resultados)} | Skip: {errores}")

    # DataFrame de features
    df_feat = pd.DataFrame(resultados)
    OUT_FEATURES.parent.mkdir(parents=True, exist_ok=True)
    df_feat.to_csv(OUT_FEATURES, index=False)
    print(f"\nExportado: {OUT_FEATURES.name}  ({len(df_feat)} filas × {len(df_feat.columns)} cols)")

    # Calcular µ ± σ por categoría
    feat_cols = [c for c in df_feat.columns
                 if c not in {"id_anotacion", "id_candidato", "t_inicio",
                               "t_fin", "categoria", "notas", "n_lecturas"}]

    cats = CATS  # ["alimentacion","servido","ruido"] o ["hidratacion","servido","ruido"] según perfil
    stats = {}
    for feat in feat_cols:
        stats[feat] = {}
        for cat in cats:
            sub = df_feat.loc[df_feat["categoria"] == cat, feat].dropna()
            if len(sub) == 0:
                stats[feat][cat] = {"n": 0, "mean": None, "std": None, "median": None}
            else:
                stats[feat][cat] = {
                    "n":      int(len(sub)),
                    "mean":   round(float(sub.mean()), 4),
                    "std":    round(float(sub.std()), 4),
                    "median": round(float(sub.median()), 4),
                }

    with open(OUT_STATS, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"Exportado: {OUT_STATS.name}")

    # Resumen discriminativo (CATS[0] = categoría principal de consumo del perfil activo)
    cat_principal = CATS[0]
    print(f"\n=== TOP FEATURES DISCRIMINATIVAS ({cat_principal[:3].upper()} vs SERV separación) ===")
    rows_disc = []
    for feat in feat_cols:
        s_a = stats[feat].get(cat_principal, {})
        s_s = stats[feat].get("servido", {})
        s_r = stats[feat].get("ruido", {})
        mu_a = s_a.get("mean"); sd_a = s_a.get("std")
        mu_s = s_s.get("mean"); sd_s = s_s.get("std")
        if None in (mu_a, mu_s, sd_a, sd_s):
            continue
        sd_pool = ((sd_a ** 2 + sd_s ** 2) / 2) ** 0.5
        sep = abs(mu_a - mu_s) / sd_pool if sd_pool > 1e-6 else 0.0
        rows_disc.append({
            "feature": feat,
            "alim_mean": round(mu_a, 4),
            "serv_mean": round(mu_s, 4) if mu_s is not None else None,
            "ruido_mean": round(s_r.get("mean", 0) or 0, 4),
            "sep_AS_sigma": round(sep, 2),
            "familia": REGISTRY.get(feat, {}).get("familia", "?"),
        })

    df_disc = (
        pd.DataFrame(rows_disc)
        .sort_values("sep_AS_sigma", ascending=False)
    )
    print(df_disc.head(20).to_string(index=False))

    # Generar bloque COMP_STATS para la app
    top_feats = df_disc.head(30)["feature"].tolist()
    # Siempre incluir las F00 clásicas
    for f0 in ["sim_alimentacion", "sim_servido", "monotonicity", "r2_lineal", "zcr"]:
        if f0 not in top_feats:
            top_feats.insert(0, f0)

    print("\n" + "=" * 60)
    print("# COMP_STATS — informativo (la app lee OUT_STATS.json, no este bloque)")
    print("# Generado por revisar_anotaciones_v2.py")
    print(f"# Basado en {len(df_feat)} anotaciones "
          f"({cat_principal}={len(df_feat[df_feat.categoria==cat_principal])}, "
          f"serv={len(df_feat[df_feat.categoria=='servido'])}, "
          f"ruido={len(df_feat[df_feat.categoria=='ruido'])})")
    print("=" * 60)
    print("COMP_STATS = {")
    for feat in top_feats:
        if feat not in stats:
            continue
        st = stats[feat]
        mu_a  = st.get(cat_principal, {}).get("mean")
        sd_a  = st.get(cat_principal, {}).get("std")
        mu_s  = st.get("servido",     {}).get("mean")
        sd_s  = st.get("servido",     {}).get("std")
        mu_r  = st.get("ruido",       {}).get("mean")
        sd_r  = st.get("ruido",       {}).get("std")
        n_a   = st.get(cat_principal, {}).get("n", 0)
        n_s   = st.get("servido",     {}).get("n", 0)
        n_r   = st.get("ruido",       {}).get("n", 0)
        fam   = REGISTRY.get(feat, {}).get("familia", "?")
        print(f'    "{feat}": {{')
        print(f'        "familia": "{fam}",')
        print(f'        "{cat_principal}": {{"mean": {mu_a}, "std": {sd_a}, "n": {n_a}}},')
        print(f'        "servido":      {{"mean": {mu_s}, "std": {sd_s}, "n": {n_s}}},')
        print(f'        "ruido":        {{"mean": {mu_r}, "std": {sd_r}, "n": {n_r}}},')
        print( '    },')
    print("}")
    print("=" * 60)
    print(f"\nListo. Ahora pega el bloque COMP_STATS en app_anotacion_av2.py.")


if __name__ == "__main__":
    main()
