import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import numpy as np
import pandas as pd
from plotly.subplots import make_subplots
import plotly.graph_objects as go

from _delta_utils import FASE1_DATA_PROC, FASE2_MODELS, FASE2_OUTPUTS

X_UMAP2_PATH    = FASE1_DATA_PROC / "X_umap2.parquet"
KMEANS_METRICS  = FASE2_OUTPUTS / "cluster_report" / "kmeans_metrics.csv"
DBSCAN_METRICS  = FASE2_OUTPUTS / "cluster_report" / "dbscan_metrics.csv"
HDBSCAN_METRICS = FASE2_OUTPUTS / "cluster_report" / "hdbscan_metrics.csv"
GMM_METRICS     = FASE2_OUTPUTS / "cluster_report" / "gmm_bic_aic.csv"
COMPARISON_OUT  = FASE2_OUTPUTS / "cluster_report" / "clustering_comparison.csv"
VIZ_OUT         = FASE2_OUTPUTS / "visualizaciones" / "clustering_comparison_grid.html"

NOISE_THRESHOLD_PCT = 15.0


def build_comparison_row(nombre, n_clusters, silhouette, noise_pct, obs):
    return {
        "algoritmo": nombre,
        "clusters": n_clusters,
        "silhouette": silhouette,
        "noise_pct": noise_pct,
        "observacion": obs,
    }


def main():
    rows = []

    kmeans_metrics = pd.read_csv(KMEANS_METRICS)
    best_kmeans = kmeans_metrics.loc[kmeans_metrics["silhouette"].idxmax()]
    rows.append(build_comparison_row(
        "K-Means", int(best_kmeans["k"]), best_kmeans["silhouette"], 0.0, "—"
    ))

    dbscan_metrics = pd.read_csv(DBSCAN_METRICS)
    valid_dbscan = dbscan_metrics.dropna(subset=["silhouette"])
    best_dbscan = valid_dbscan.loc[valid_dbscan["silhouette"].idxmax()]
    rows.append(build_comparison_row(
        "DBSCAN", int(best_dbscan["n_clusters"]), best_dbscan["silhouette"],
        best_dbscan["noise_pct"], f"eps={best_dbscan['eps']}",
    ))

    if HDBSCAN_METRICS.exists():
        hdbscan_row = pd.read_csv(HDBSCAN_METRICS).iloc[0]
        rows.append(build_comparison_row(
            "HDBSCAN",
            int(hdbscan_row["n_clusters"]) if not pd.isna(hdbscan_row["n_clusters"]) else None,
            hdbscan_row["silhouette"],
            hdbscan_row["noise_pct"],
            "—",
        ))
    else:
        rows.append(build_comparison_row(
            "HDBSCAN", None, None, None, "Ejecutar d03_hdbscan.py primero",
        ))

    gmm_metrics = pd.read_csv(GMM_METRICS)
    best_gmm = gmm_metrics.loc[gmm_metrics["bic"].idxmin()]
    rows.append(build_comparison_row(
        "GMM", int(best_gmm["n_components"]), None, 0.0, "BIC minimo",
    ))

    comparison_df = pd.DataFrame(rows)
    COMPARISON_OUT.parent.mkdir(parents=True, exist_ok=True)
    comparison_df.to_csv(COMPARISON_OUT, index=False)
    print(comparison_df)

    candidatos = comparison_df[
        (comparison_df["noise_pct"].fillna(0) < NOISE_THRESHOLD_PCT)
        & comparison_df["silhouette"].notna()
    ]
    ganador = None
    if not candidatos.empty:
        ganador = candidatos.loc[candidatos["silhouette"].idxmax(), "algoritmo"]
        print(f"Algoritmo ganador (mejor silhouette, noise < "
              f"{NOISE_THRESHOLD_PCT}%): {ganador}")
    else:
        print("Ningun algoritmo cumple el criterio de noise < "
              f"{NOISE_THRESHOLD_PCT}%. Revisar manualmente.")

    if ganador is not None:
        _guardar_cluster_ganador(ganador)


def _guardar_cluster_ganador(ganador: str) -> None:
    X = pd.read_parquet(FASE1_DATA_PROC / "X_scaled.parquet").to_numpy()
    df = pd.read_parquet(FASE1_DATA_PROC / "readings_delta.parquet")

    model_map = {
        "K-Means": FASE2_MODELS / "kmeans"  / "kmeans_best.pkl",
        "DBSCAN":  FASE2_MODELS / "dbscan"  / "dbscan_best.pkl",
        "HDBSCAN": FASE2_MODELS / "hdbscan" / "hdbscan_best.pkl",
        "GMM":     FASE2_MODELS / "gmm"     / "gmm_best.pkl",
    }
    model_path = model_map.get(ganador)
    if model_path is None or not model_path.exists():
        print(f"Aviso: modelo para {ganador} no encontrado en {model_path}.")
        return

    with open(model_path, "rb") as f:
        model = pickle.load(f)

    if ganador in ("K-Means", "GMM"):
        labels = model.predict(X)
    else:
        labels = model.fit_predict(X)

    df["cluster_ganador"] = labels
    df.to_parquet(FASE1_DATA_PROC / "readings_delta.parquet", index=False)
    print(f"cluster_ganador ({ganador}) guardado en readings_delta.parquet")


if __name__ == "__main__":
    main()
