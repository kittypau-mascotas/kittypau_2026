import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import (
    silhouette_score,
    calinski_harabasz_score,
    davies_bouldin_score,
)
import plotly.express as px

from _delta_utils import N_CLUSTERS_RANGE, FASE1_DATA_PROC, FASE2_MODELS, FASE2_OUTPUTS

X_SCALED_PATH = FASE1_DATA_PROC / "X_scaled.parquet"
X_UMAP2_PATH  = FASE1_DATA_PROC / "X_umap2.parquet"
METRICS_OUT   = FASE2_OUTPUTS / "cluster_report" / "kmeans_metrics.csv"
MODEL_OUT     = FASE2_MODELS / "kmeans" / "kmeans_best.pkl"
VIZ_OUT       = FASE2_OUTPUTS / "visualizaciones" / "kmeans_umap.html"


def main():
    X = pd.read_parquet(X_SCALED_PATH).to_numpy()
    df_umap = pd.read_parquet(X_UMAP2_PATH)

    rows = []
    for k in N_CLUSTERS_RANGE:
        km = KMeans(n_clusters=k, n_init=10, random_state=42)
        labels = km.fit_predict(X)
        rows.append({
            "k": k,
            "inertia": km.inertia_,
            "silhouette": silhouette_score(X, labels),
            "calinski_harabasz": calinski_harabasz_score(X, labels),
            "davies_bouldin": davies_bouldin_score(X, labels),
        })

    metrics_df = pd.DataFrame(rows)
    METRICS_OUT.parent.mkdir(parents=True, exist_ok=True)
    metrics_df.to_csv(METRICS_OUT, index=False)
    print(metrics_df)

    best_k = int(metrics_df.loc[metrics_df["silhouette"].idxmax(), "k"])
    print(f"K optimo (silhouette maximo): {best_k}")

    km_best = KMeans(n_clusters=best_k, n_init=10, random_state=42)
    cluster_labels = km_best.fit_predict(X)

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(km_best, f)

    df_umap["cluster_kmeans"] = cluster_labels
    fig = px.scatter(
        df_umap, x="umap1", y="umap2", color="cluster_kmeans",
        title=f"K-Means (K={best_k}) sobre UMAP",
    )
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))


if __name__ == "__main__":
    main()
