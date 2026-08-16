import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import numpy as np
import pandas as pd
import hdbscan
from sklearn.metrics import silhouette_score
import plotly.express as px

from _delta_utils import (
    HDBSCAN_MIN_CLUSTER,
    FASE1_DATA_PROC,
    FASE2_MODELS,
    FASE2_OUTPUTS,
    cargar_sessions_gamma,
)

X_SCALED_PATH       = FASE1_DATA_PROC / "X_scaled.parquet"
X_UMAP2_PATH        = FASE1_DATA_PROC / "X_umap2.parquet"
READINGS_DELTA_PATH = FASE1_DATA_PROC / "readings_delta.parquet"
MODEL_OUT           = FASE2_MODELS / "hdbscan" / "hdbscan_best.pkl"
METRICS_OUT         = FASE2_OUTPUTS / "cluster_report" / "hdbscan_metrics.csv"
VIZ_OUT             = FASE2_OUTPUTS / "visualizaciones" / "hdbscan_umap.html"


def main():
    X = pd.read_parquet(X_SCALED_PATH).to_numpy()
    df_umap = pd.read_parquet(X_UMAP2_PATH)

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=HDBSCAN_MIN_CLUSTER, min_samples=5,
    )
    labels = clusterer.fit_predict(X)

    mask = labels != -1
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_pct = float(np.mean(labels == -1)) * 100
    if n_clusters >= 2 and mask.sum() > 1:
        sil = silhouette_score(X[mask], labels[mask])
    else:
        sil = float("nan")

    print(f"Clusters encontrados: {n_clusters}")
    print(f"Noise: {noise_pct:.2f}%")
    print(f"Silhouette (sin noise): {sil:.4f}")

    distrib = pd.Series(labels).value_counts().sort_index()
    print("Distribucion de puntos por cluster:")
    print(distrib)

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(clusterer, f)

    METRICS_OUT.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([{
        "algoritmo": "HDBSCAN",
        "n_clusters": n_clusters,
        "silhouette": sil,
        "noise_pct": noise_pct,
    }]).to_csv(METRICS_OUT, index=False)

    df_umap["cluster_hdbscan"] = labels
    fig = px.scatter(
        df_umap, x="umap1", y="umap2", color="cluster_hdbscan",
        title="HDBSCAN sobre UMAP",
    )
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))

    cluster_mas_grande = distrib[distrib.index != -1].idxmax()
    df_readings = pd.read_parquet(READINGS_DELTA_PATH)
    df_readings["cluster_hdbscan"] = labels

    sessions = cargar_sessions_gamma()
    reposo_mask = sessions["categoria"].isin(["reposo"]) if "categoria" in sessions else None
    print(f"Cluster mas grande: {cluster_mas_grande} "
          f"({distrib[cluster_mas_grande]} puntos)")
    print("Comparar manualmente con sessions_labeled.parquet (categoria='reposo') "
          "si el cruce temporal automatico no esta implementado aun.")


if __name__ == "__main__":
    main()
