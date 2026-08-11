"""
03_recalibrar_umbrales.py — Alpha v2

Regenera la sección `clasificacion_referencia` de config/umbrales.json contra
las anotaciones actuales (496, antes calibrado con 304 — 2026-06-26).

IMPORTANTE: duracion/delta_w/rango se recalculan desde las lecturas crudas
usando el t_inicio/t_fin REAL de cada anotación (columna en
features_anotaciones_v2.csv) — no desde candidatos_av2.csv. El candidato
original suele tener una ventana más ancha que la anotación confirmada (el
operador la ajusta al guardar en Tab 1, "Ajustar tiempos"); usar la ventana
del candidato infla la duración (verificado: 48/55 servidos difieren >1 min,
media candidato=14.0min vs. real=3.4min — hubiera quedado calibrado con
metadata de la ventana equivocada).

No toca la sección `deteccion` (umbrales que controlan qué se detecta como
candidato en 01_genera_candidatos.py) — esa recalibración es de otra naturaleza
(cambia qué se genera, no cómo se documenta lo ya clasificado) y queda fuera de
alcance de este script a propósito.

Uso:
    python 03_recalibrar_umbrales.py
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from importlib import import_module  # noqa: E402
_gen = import_module("01_genera_candidatos")  # noqa: N816 — nombre empieza con dígito

DATA_DIR = Path(__file__).parent / "data"
CONFIG_DIR = Path(__file__).parent / "config"
FEATURES_CSV = DATA_DIR / "features_anotaciones_v2.csv"
UMBRALES_JSON = CONFIG_DIR / "umbrales.json"

RESAMPLE_S = 30


def pct(vals: pd.Series, q: float) -> float:
    return round(float(np.percentile(vals, q)), 2)


def metrica_ventana(df_res: pd.DataFrame, t_inicio: pd.Timestamp, t_fin: pd.Timestamp) -> dict | None:
    """Métricas crudas (peso) dentro de [t_inicio, t_fin] — sin gates de detección,
    a diferencia de calcular_metadata() de 01_genera_candidatos.py (esa función
    descarta ventanas cortas/pequeñas, pensada para candidatos nuevos, no para
    recalcular sobre anotaciones ya confirmadas)."""
    sub = df_res[(df_res["ts"] >= t_inicio) & (df_res["ts"] <= t_fin)]["peso_g"].dropna()
    if len(sub) < 2:
        return None
    peso_ini, peso_fin = float(sub.iloc[0]), float(sub.iloc[-1])
    dur_min = (t_fin - t_inicio).total_seconds() / 60
    return {
        "duracion_min": dur_min,
        "delta_w_total": peso_fin - peso_ini,
        "rango_g": float(sub.max() - sub.min()),
        "pendiente_g_min": (peso_fin - peso_ini) / dur_min if dur_min > 0 else np.nan,
    }


def main() -> int:
    if not FEATURES_CSV.exists() or not UMBRALES_JSON.exists():
        print("Falta features_anotaciones_v2.csv o umbrales.json.")
        return 1

    feats = pd.read_csv(FEATURES_CSV)
    feats["t_inicio"] = pd.to_datetime(feats["t_inicio"], format="ISO8601", utc=True)
    feats["t_fin"]    = pd.to_datetime(feats["t_fin"], format="ISO8601", utc=True)

    print("Cargando lecturas crudas (única vez, ~5-10s)...")
    df_lec = _gen.cargar_lecturas()
    df_res = _gen.resamplear(df_lec, RESAMPLE_S)

    metricas = feats.apply(
        lambda row: metrica_ventana(df_res, row["t_inicio"], row["t_fin"]), axis=1
    )
    metricas_df = pd.DataFrame(list(metricas))
    df = pd.concat([feats.reset_index(drop=True), metricas_df], axis=1)
    n_sin_metrica = df["duracion_min"].isna().sum()
    if n_sin_metrica:
        print(f"AVISO: {n_sin_metrica} anotaciones sin lecturas suficientes en su ventana — excluidas de los stats.")
    df = df.dropna(subset=["duracion_min"])

    with open(UMBRALES_JSON, encoding="utf-8") as f:
        umbrales = json.load(f)

    n_total = len(df)
    n_alim = int((df["categoria"] == "alimentacion").sum())
    n_serv = int((df["categoria"] == "servido").sum())
    n_ruido = int((df["categoria"] == "ruido").sum())

    umbrales["_version"] = "1.3"
    umbrales["_nota"] = (
        f"Umbrales actualizados empíricamente desde {n_total} anotaciones "
        f"(alimentacion={n_alim}, ruido={n_ruido}, servido={n_serv}). "
        f"Fecha: {date.today().isoformat()}."
    )

    ref = umbrales["clasificacion_referencia"]

    # ── SERVIDO ──────────────────────────────────────────────────────────
    s = df[df["categoria"] == "servido"]
    ref["servido"]["_n_anotaciones"] = int(len(s))
    ref["servido"]["sim_servido_min"] = round(float(pct(s["sim_servido"], 10)), 2)
    ref["servido"]["_stats"] = {
        "duracion_media_min": round(float(s["duracion_min"].mean()), 2),
        "duracion_std_min": round(float(s["duracion_min"].std()), 2),
        "duracion_min_obs_min": round(float(s["duracion_min"].min()), 2),
        "duracion_max_obs_min": round(float(s["duracion_min"].max()), 2),
        "delta_w_media_g": round(float(s["delta_w_total"].mean()), 2),
        "delta_w_std_g": round(float(s["delta_w_total"].std()), 2),
        "delta_w_min_obs_g": round(float(s["delta_w_total"].min()), 2),
        "delta_w_max_obs_g": round(float(s["delta_w_total"].max()), 2),
        "delta_w_p10_g": pct(s["delta_w_total"], 10),
        "rango_media_g": round(float(s["rango_g"].mean()), 2),
        "pendiente_media_g_min": round(float(s["pendiente_g_min"].mean()), 2),
        "pendiente_min_obs_g_min": round(float(s["pendiente_g_min"].min()), 2),
        "pendiente_max_obs_g_min": round(float(s["pendiente_g_min"].max()), 2),
        "monotonicity_media": round(float(s["monotonicity"].mean()), 3),
        "r2_lineal_media": round(float(s["r2_lineal"].mean()), 3),
        "zcr_media": round(float(s["zcr"].mean()), 3),
        "sim_servido_media": round(float(s["sim_servido"].mean()), 3),
        "sim_servido_p10": pct(s["sim_servido"], 10),
        "sim_servido_p90": pct(s["sim_servido"], 90),
    }

    # ── ALIMENTACION ─────────────────────────────────────────────────────
    a = df[df["categoria"] == "alimentacion"]
    ref["alimentacion"]["_n_anotaciones"] = int(len(a))
    ref["alimentacion"]["sim_alimentacion_min"] = round(float(pct(a["sim_alimentacion"], 10)), 2)
    ref["alimentacion"]["monotonicity_max"] = round(float(pct(a["monotonicity"], 90)), 3)
    ref["alimentacion"]["r2_lineal_min"] = round(float(pct(a["r2_lineal"], 10)), 3)
    ref["alimentacion"]["_stats"] = {
        "duracion_media_min": round(float(a["duracion_min"].mean()), 2),
        "duracion_std_min": round(float(a["duracion_min"].std()), 2),
        "duracion_min_obs_min": round(float(a["duracion_min"].min()), 2),
        "duracion_max_obs_min": round(float(a["duracion_min"].max()), 2),
        "delta_w_media_g": round(float(a["delta_w_total"].mean()), 2),
        "delta_w_std_g": round(float(a["delta_w_total"].std()), 2),
        "delta_w_min_obs_g": round(float(a["delta_w_total"].min()), 2),
        "delta_w_max_obs_g": round(float(a["delta_w_total"].max()), 2),
        "delta_w_p10_g": pct(a["delta_w_total"], 10),
        "delta_w_p90_g": pct(a["delta_w_total"], 90),
        "rango_media_g": round(float(a["rango_g"].mean()), 2),
        "pendiente_media_g_min": round(float(a["pendiente_g_min"].mean()), 2),
        "pendiente_min_obs_g_min": round(float(a["pendiente_g_min"].min()), 2),
        "pendiente_max_obs_g_min": round(float(a["pendiente_g_min"].max()), 2),
        "monotonicity_media": round(float(a["monotonicity"].mean()), 3),
        "monotonicity_std": round(float(a["monotonicity"].std()), 3),
        "monotonicity_p10": pct(a["monotonicity"], 10),
        "monotonicity_p90": pct(a["monotonicity"], 90),
        "r2_lineal_media": round(float(a["r2_lineal"].mean()), 3),
        "r2_lineal_std": round(float(a["r2_lineal"].std()), 3),
        "r2_lineal_p10": pct(a["r2_lineal"], 10),
        "r2_lineal_p90": pct(a["r2_lineal"], 90),
        "zcr_media": round(float(a["zcr"].mean()), 3),
        "sim_alimentacion_media": round(float(a["sim_alimentacion"].mean()), 3),
        "sim_alimentacion_p10": pct(a["sim_alimentacion"], 10),
        "sim_alimentacion_p90": pct(a["sim_alimentacion"], 90),
    }

    # ── RUIDO ────────────────────────────────────────────────────────────
    r = df[df["categoria"] == "ruido"]
    ref["ruido"]["_n_anotaciones"] = int(len(r))
    ref["ruido"]["pendiente_abs_max_g_min"] = round(float(pct(r["pendiente_g_min"].abs(), 90)), 2)
    ref["ruido"]["_stats"] = {
        "duracion_media_min": round(float(r["duracion_min"].mean()), 2),
        "duracion_std_min": round(float(r["duracion_min"].std()), 2),
        "duracion_min_obs_min": round(float(r["duracion_min"].min()), 2),
        "duracion_max_obs_min": round(float(r["duracion_min"].max()), 2),
        "delta_w_media_g": round(float(r["delta_w_total"].mean()), 2),
        "delta_w_std_g": round(float(r["delta_w_total"].std()), 2),
        "delta_w_p10_g": pct(r["delta_w_total"], 10),
        "delta_w_p90_g": pct(r["delta_w_total"], 90),
        "rango_media_g": round(float(r["rango_g"].mean()), 2),
        "pendiente_media_g_min": round(float(r["pendiente_g_min"].mean()), 2),
        "pendiente_min_obs_g_min": round(float(r["pendiente_g_min"].min()), 2),
        "pendiente_max_obs_g_min": round(float(r["pendiente_g_min"].max()), 2),
        "monotonicity_media": round(float(r["monotonicity"].mean()), 3),
        "r2_lineal_media": round(float(r["r2_lineal"].mean()), 3),
        "zcr_media": round(float(r["zcr"].mean()), 3),
        "sim_alimentacion_media": round(float(r["sim_alimentacion"].mean()), 3),
        "sim_servido_media": round(float(r["sim_servido"].mean()), 3),
    }

    # ── notas_detector.mejores_discriminadores ─────────────────────────────
    umbrales["notas_detector"]["mejores_discriminadores"] = [
        f"sim_servido:      alim={ref['alimentacion']['_stats']['sim_alimentacion_media']*-1:+.3f}"
        f" | serv={ref['servido']['_stats']['sim_servido_media']:+.3f}"
        f" | ruido={ref['ruido']['_stats']['sim_servido_media']:+.3f}  → mejor feature para SERVIDO",
        f"sim_alimentacion: alim={ref['alimentacion']['_stats']['sim_alimentacion_media']:+.3f}"
        f" | serv={ref['servido']['_stats'].get('sim_alimentacion_media', -ref['servido']['_stats']['sim_servido_media']):+.3f}"
        f" | ruido={ref['ruido']['_stats']['sim_alimentacion_media']:+.3f}  → mejor feature para ALIMENTACION",
        f"monotonicity:     alim={ref['alimentacion']['_stats']['monotonicity_media']:+.3f}"
        f" | serv={ref['servido']['_stats']['monotonicity_media']:+.3f}"
        f" | ruido={ref['ruido']['_stats']['monotonicity_media']:+.3f}  → complementario (confirma bajada)",
        f"r2_lineal:        alim={ref['alimentacion']['_stats']['r2_lineal_media']: .3f}"
        f" | serv={ref['servido']['_stats']['r2_lineal_media']: .3f}"
        f" | ruido={ref['ruido']['_stats']['r2_lineal_media']: .3f}  → confirma tendencia lineal en alim",
    ]
    umbrales["notas_detector"]["proximos_pasos"] = [
        f"Recalibrado {date.today().isoformat()} sobre {n_total} anotaciones "
        f"(antes: 304). Revisar data/auditoria_discrepancias.csv "
        "(02_auditar_discrepancias.py) para posibles mislabels en vez de "
        "buscarlos a mano.",
        f"Metas Ciclo Alpha v2: servido={n_serv}/20, ruido={n_ruido}/30, "
        f"alimentacion={n_alim}/40 — todas superadas ampliamente.",
    ]

    with open(UMBRALES_JSON, "w", encoding="utf-8") as f:
        json.dump(umbrales, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"umbrales.json recalibrado: {n_total} anotaciones (alim={n_alim}, serv={n_serv}, ruido={n_ruido})")
    print(f"Guardado en {UMBRALES_JSON}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
