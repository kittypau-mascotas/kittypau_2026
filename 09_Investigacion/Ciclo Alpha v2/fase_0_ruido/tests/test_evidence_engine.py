"""
tests/test_evidence_engine.py — Regresión del Evidence Engine (shape_features_v2.py).

Antes del 2026-08-10, evidence_score() sumaba peso × valor CRUDO (sin normalizar).
Con 496 anotaciones reales acertaba 49.6% — peor que predecir siempre "alimentacion"
(51.2%, la clase mayoritaria) — porque los features viven en escalas muy distintas
(la mayoría en [-1,1], pero algunos llegan a 20+) y el de mayor magnitud dominaba la
suma sin importar el peso asignado a mano. El fix normaliza (z-score pooled) y calcula
los pesos directamente de comp_stats_v2.json (discriminante tipo Fisher).

Este test evita que una futura edición reintroduzca esa regresión sin darse cuenta.

Ejecutar: python -m pytest tests/test_evidence_engine.py -v
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

FASE0 = Path(__file__).parent.parent
sys.path.insert(0, str(FASE0))

from shape_features_v2 import evidence_score  # noqa: E402

FEATURES_CSV = FASE0 / "data" / "features_anotaciones_v2.csv"
COMP_STATS_JSON = FASE0 / "data" / "comp_stats_v2.json"

META_COLS = {"id_anotacion", "id_candidato", "t_inicio", "t_fin", "categoria", "notas", "n_lecturas"}

# Piso de accuracy fuera de muestra — 77.8% medido el 2026-08-10 sobre 496
# anotaciones (80/20 split, seed=42). Margen bajo el piso: 65%, deja lugar a
# variación por reanotación sin ser tan laxo que oculte una regresión real.
ACCURACY_FLOOR = 0.65

# Referencia: accuracy del motor legado (fallback sin comp_stats) sobre el mismo
# dataset — debe seguir siendo netamente peor que el motor normalizado. Si algún
# día el legado supera esto, algo se rompió en el motor normalizado.
LEGACY_ACCURACY_CEILING = 0.60


@pytest.fixture(scope="module")
def features_df():
    if not FEATURES_CSV.exists():
        pytest.skip("features_anotaciones_v2.csv no existe — ejecutar revisar_anotaciones_v2.py primero")
    return pd.read_csv(FEATURES_CSV)


@pytest.fixture(scope="module")
def comp_stats():
    if not COMP_STATS_JSON.exists():
        pytest.skip("comp_stats_v2.json no existe — ejecutar revisar_anotaciones_v2.py primero")
    with open(COMP_STATS_JSON, encoding="utf-8") as f:
        return json.load(f)


def _feat_cols(df):
    return [c for c in df.columns if c not in META_COLS]


def _held_out_split(df, seed=42, frac=0.2):
    rng = np.random.RandomState(seed)
    idx = df.index.to_numpy().copy()
    rng.shuffle(idx)
    n_test = int(len(idx) * frac)
    return df.loc[idx[:n_test]], df.loc[idx[n_test:]]


def _build_comp_stats(sub_df, feat_cols):
    cs = {}
    for c in feat_cols:
        cs[c] = {}
        for cat in ("alimentacion", "servido", "ruido"):
            vals = pd.to_numeric(sub_df[sub_df["categoria"] == cat][c], errors="coerce").dropna()
            if len(vals):
                cs[c][cat] = {"n": int(len(vals)), "mean": float(vals.mean()), "std": float(vals.std())}
    return cs


def _accuracy(df, comp_stats_dict, feat_cols):
    correct = 0
    for _, row in df.iterrows():
        feats = {c: row[c] for c in feat_cols if pd.notna(row[c])}
        pred = evidence_score(feats, comp_stats_dict)["prediccion"]
        if pred == row["categoria"]:
            correct += 1
    return correct / len(df)


def test_no_produce_nan(features_df, comp_stats):
    """Ninguna anotación real debe producir scores NaN (feature faltante mal manejado, etc.)."""
    feat_cols = _feat_cols(features_df)
    for _, row in features_df.iterrows():
        feats = {c: row[c] for c in feat_cols if pd.notna(row[c])}
        ev = evidence_score(feats, comp_stats)
        assert not any(
            np.isnan(v) for v in [ev["score_alimentacion"], ev["score_servido"], ev["score_ruido"]]
        ), f"NaN en evidence_score para anotación {row.get('id_anotacion')}"


def test_scores_suman_uno(features_df, comp_stats):
    feat_cols = _feat_cols(features_df)
    row = features_df.iloc[0]
    feats = {c: row[c] for c in feat_cols if pd.notna(row[c])}
    ev = evidence_score(feats, comp_stats)
    total = ev["score_alimentacion"] + ev["score_servido"] + ev["score_ruido"]
    assert abs(total - 1.0) < 0.01, f"Softmax no suma 1.0: {total}"


def test_accuracy_held_out_sobre_el_piso(features_df):
    """
    Split 80/20: los pesos se calculan SOLO con el 80% (train), se evalúa en el
    20% nunca visto. Simula comp_stats_v2.json real, honesto (sin fuga de datos).
    """
    feat_cols = _feat_cols(features_df)
    test_df, train_df = _held_out_split(features_df)
    cs_train = _build_comp_stats(train_df, feat_cols)
    acc = _accuracy(test_df, cs_train, feat_cols)
    assert acc >= ACCURACY_FLOOR, (
        f"Accuracy fuera de muestra {acc:.3f} por debajo del piso {ACCURACY_FLOOR} — "
        "revisar si se rompió la normalización o los pesos calculados."
    )


def test_motor_normalizado_supera_al_legado(features_df, comp_stats):
    """El motor normalizado (con comp_stats) debe ser claramente mejor que el
    fallback legado (EVIDENCE_WEIGHTS sobre valores crudos, sin comp_stats)."""
    feat_cols = _feat_cols(features_df)
    acc_normalizado = _accuracy(features_df, comp_stats, feat_cols)

    correct_legado = 0
    for _, row in features_df.iterrows():
        feats = {c: row[c] for c in feat_cols if pd.notna(row[c])}
        pred = evidence_score(feats, None)["prediccion"]
        if pred == row["categoria"]:
            correct_legado += 1
    acc_legado = correct_legado / len(features_df)

    assert acc_legado <= LEGACY_ACCURACY_CEILING, (
        f"El fallback legado acertó {acc_legado:.3f} — más de lo esperado "
        f"({LEGACY_ACCURACY_CEILING}), revisar si cambió el dataset base."
    )
    assert acc_normalizado > acc_legado + 0.15, (
        f"El motor normalizado ({acc_normalizado:.3f}) ya no supera claramente "
        f"al legado ({acc_legado:.3f}) — revisar la normalización/pesos calculados."
    )
