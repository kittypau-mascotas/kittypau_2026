import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import numpy as np
import pandas as pd
from sklearn.mixture import GaussianMixture
import plotly.express as px

from _delta_utils import (
    N_CLUSTERS_RANGE,
    FASE1_DATA_PROC,
    FASE2_MODELS,
    FASE2_OUTPUTS,
    FASE3_OUTPUTS,
)

X_SCALED_PATH  = FASE1_DATA_PROC / "X_scaled.parquet"
X_UMAP2_PATH   = FASE1_DATA_PROC / "X_umap2.parquet"
BIC_AIC_OUT    = FASE2_OUTPUTS / "cluster_report" / "gmm_bic_aic.csv"
MODEL_OUT      = FASE2_MODELS / "gmm" / "gmm_best.pkl"
VIZ_OUT        = FASE2_OUTPUTS / "visualizaciones" / "gmm_umap.html"
CANDIDATOS_OUT = FASE3_OUTPUTS / "candidatos_gmm.csv"

PROB_THRESHOLD = 0.6


def main():
    X = pd.read_parquet(X_SCALED_PATH).to_numpy()
    df_umap = pd.read_parquet(X_UMAP2_PATH)

    rows = []
    for n in N_CLUSTERS_RANGE:
        gmm = GaussianMixture(n_components=n, random_state=42)
        gmm.fit(X)
        rows.append({"n_components": n, "bic": gmm.bic(X), "aic": gmm.aic(X)})

    metrics_df = pd.DataFrame(rows)
    BIC_AIC_OUT.parent.mkdir(parents=True, exist_ok=True)
    metrics_df.to_csv(BIC_AIC_OUT, index=False)
    print(metrics_df)

    best_n = int(metrics_df.loc[metrics_df["bic"].idxmin(), "n_components"])
    print(f"n_components optimo (BIC minimo): {best_n}")

    gmm_best = GaussianMixture(n_components=best_n, random_state=42)
    gmm_best.fit(X)
    cluster_labels = gmm_best.predict(X)
    probs = gmm_best.predict_proba(X)

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(gmm_best, f)

    df_umap["cluster_gmm"] = cluster_labels
    for i in range(best_n):
        df_umap[f"prob_gmm_{i}"] = probs[:, i]

    fig = px.scatter(
        df_umap, x="umap1", y="umap2", color="cluster_gmm",
        title=f"GMM (n_components={best_n}) sobre UMAP",
    )
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))

    max_prob = probs.max(axis=1)
    candidatos_mask = max_prob < PROB_THRESHOLD
    print(f"Candidatos a anomalia (max prob < {PROB_THRESHOLD}): "
          f"{candidatos_mask.sum()} de {len(max_prob)}")

    df_candidatos = df_umap.loc[candidatos_mask].copy()
    df_candidatos["max_prob"] = max_prob[candidatos_mask]
    CANDIDATOS_OUT.parent.mkdir(parents=True, exist_ok=True)
    df_candidatos.to_csv(CANDIDATOS_OUT, index=False)


if __name__ == "__main__":
    main()
