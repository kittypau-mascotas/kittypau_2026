import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd
import numpy as np
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score
import plotly.express as px

from _delta_utils import (
    FASE1_DATA_PROC,
    FASE4_OUTPUTS,
    cargar_sessions_gamma,
)

READINGS_DELTA_PATH = FASE1_DATA_PROC / "readings_delta.parquet"
RESULTS_OUT         = FASE4_OUTPUTS / "cross_check_report" / "cross_check_results.json"
HEATMAP_OUT         = FASE4_OUTPUTS / "cross_check_report" / "heatmap_cluster_vs_etiqueta.html"

JOIN_WINDOW_S  = 15
CLUSTER_COLUMN = "cluster_ganador"


def asignar_etiqueta_gamma(df_delta, sessions):
    """
    Para cada fila de df_delta, busca si su 'ts' cae dentro de un
    intervalo [ts_inicio - JOIN_WINDOW_S, ts_fin + JOIN_WINDOW_S] de
    alguna sesion en `sessions`. Asigna la categoria correspondiente o
    NaN si no hay match.
    """
    etiquetas = pd.Series([None] * len(df_delta), index=df_delta.index)
    for _, sesion in sessions.iterrows():
        ventana_inicio = pd.Timestamp(sesion["ts_inicio"]) - pd.Timedelta(
            seconds=JOIN_WINDOW_S
        )
        ventana_fin = pd.Timestamp(sesion["ts_fin"]) + pd.Timedelta(
            seconds=JOIN_WINDOW_S
        )
        mask = (df_delta["ts"] >= ventana_inicio) & (
            df_delta["ts"] <= ventana_fin
        )
        etiquetas.loc[mask] = sesion["session_type"]
    return etiquetas


def main():
    df_delta = pd.read_parquet(READINGS_DELTA_PATH)
    sessions = cargar_sessions_gamma()

    df_delta["etiqueta_gamma"] = asignar_etiqueta_gamma(df_delta, sessions)

    df_etiquetado = df_delta.dropna(subset=["etiqueta_gamma", CLUSTER_COLUMN])
    print(f"Lecturas con etiqueta Gamma cruzada: {len(df_etiquetado)} de "
          f"{len(df_delta)}")

    ari = adjusted_rand_score(
        df_etiquetado["etiqueta_gamma"], df_etiquetado[CLUSTER_COLUMN]
    )
    nmi = normalized_mutual_info_score(
        df_etiquetado["etiqueta_gamma"], df_etiquetado[CLUSTER_COLUMN]
    )
    print(f"ARI: {ari:.4f}")
    print(f"NMI: {nmi:.4f}")

    tabla = pd.crosstab(
        df_etiquetado[CLUSTER_COLUMN], df_etiquetado["etiqueta_gamma"],
        normalize="index",
    )
    print(tabla)

    pureza = {}
    for clase in ["servido", "reposo"]:
        if clase in tabla.columns:
            pureza[clase] = float(tabla[clase].max())
        else:
            pureza[clase] = None

    resultados = {
        "ari": ari,
        "nmi": nmi,
        "pureza_alimentacion": pureza.get("alimentacion"),
        "pureza_servido": pureza.get("servido"),
        "n_lecturas_cruzadas": len(df_etiquetado),
        "interpretacion": (
            "coincidencia_alta" if ari > 0.5 else
            "coincidencia_baja" if ari < 0.3 else
            "coincidencia_media"
        ),
    }

    RESULTS_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_OUT, "w", encoding="utf-8") as f:
        json.dump(resultados, f, indent=2, ensure_ascii=False)

    fig = px.imshow(
        tabla, text_auto=".2f", aspect="auto",
        title="Heatmap: cluster Delta vs etiqueta Gamma (frecuencia normalizada)",
    )
    HEATMAP_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(HEATMAP_OUT))


if __name__ == "__main__":
    main()
