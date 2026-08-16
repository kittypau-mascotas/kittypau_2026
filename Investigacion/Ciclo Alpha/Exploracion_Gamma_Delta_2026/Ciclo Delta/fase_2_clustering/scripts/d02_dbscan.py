import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
import plotly.express as px

from _delta_utils import (
    DBSCAN_EPS_RANGE,
    DBSCAN_MIN_SAMPLES,
    FASE1_DATA_PROC,
    FASE2_MODELS,
    FASE2_OUTPUTS,
)

X_SCALED_PATH = FASE1_DATA_PROC / "X_scaled.parquet"
X_UMAP2_PATH  = FASE1_DATA_PROC / "X_umap2.parquet"
METRICS_OUT   = FASE2_OUTPUTS / "cluster_report" / "dbscan_metrics.csv"
MODEL_OUT     = FASE2_MODELS / "dbscan" / "dbscan_best.pkl"
VIZ_OUT       = FASE2_OUTPUTS / "visualizaciones" / "dbscan_umap.html"


def evaluar_dbscan(X, eps, min_samples):
    db = DBSCAN(eps=eps, min_samples=min_samples)
    labels = db.fit_predict(X)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_pct = float(np.mean(labels == -1)) * 100

    mask = labels != -1
    if n_clusters >= 2 and mask.sum() > 1:
        sil = silhouette_score(X[mask], labels[mask])
    else:
        sil = float("nan")

    return db, labels, n_clusters, noise_pct, sil


def main():
    X = pd.read_parquet(X_SCALED_PATH).to_numpy()
    df_umap = pd.read_parquet(X_UMAP2_PATH)

    rows = []
    results = {}
    for eps in DBSCAN_EPS_RANGE:
        db, labels, n_clusters, noise_pct, sil = evaluar_dbscan(
            X, eps, DBSCAN_MIN_SAMPLES
        )
        rows.append({
            "eps": eps,
            "min_samples": DBSCAN_MIN_SAMPLES,
            "n_clusters": n_clusters,
            "noise_pct": noise_pct,
            "silhouette": sil,
        })
        results[eps] = (db, labels)

    metrics_df = pd.DataFrame(rows)
    METRICS_OUT.parent.mkdir(parents=True, exist_ok=True)
    metrics_df.to_csv(METRICS_OUT, index=False)
    print(metrics_df)

    valid = metrics_df.dropna(subset=["silhouette"])
    best_row = valid.loc[valid["silhouette"].idxmax()]
    best_eps = best_row["eps"]
    print(f"Mejor eps: {best_eps} (silhouette={best_row['silhouette']:.4f}, "
          f"noise={best_row['noise_pct']:.2f}%)")

    db_best, labels_best = results[best_eps]

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(db_best, f)

    df_umap["cluster_dbscan"] = labels_best
    fig = px.scatter(
        df_umap, x="umap1", y="umap2", color="cluster_dbscan",
        title=f"DBSCAN (eps={best_eps}) sobre UMAP",
        color_continuous_scale="Viridis",
    )
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))


if __name__ == "__main__":
    main()
