"""
d03_features_no_supervisadas.py — Fase 1 Delta
Escala las 18 features, calcula PCA(2), PCA(10) y UMAP(2) para exploración visual.
Salidas: X_scaled, X_pca2, X_pca10, X_umap2 en processed/ + HTMLs en outputs/visualizaciones/.
"""
import sys
from pathlib import Path

import pandas as pd
from sklearn.decomposition import PCA
import umap
import plotly.express as px

sys.path.insert(0, str(Path(__file__).parent))

from _delta_utils import (
    escalar_features,
    exportar_parquet,
    FEATURES_DELTA_ALL,
    FASE1_DATA_PROC,
)

_DELTA_ROOT   = Path(__file__).resolve().parent.parent.parent
READINGS_PATH = FASE1_DATA_PROC / "readings_delta.parquet"
VIZ_DIR       = _DELTA_ROOT / "fase_1_datos" / "outputs" / "visualizaciones"


def main():
    df = pd.read_parquet(READINGS_PATH)
    X  = df[FEATURES_DELTA_ALL].fillna(0).to_numpy()

    X_scaled, scaler = escalar_features(X)
    exportar_parquet(
        pd.DataFrame(X_scaled, columns=FEATURES_DELTA_ALL),
        FASE1_DATA_PROC / "X_scaled.parquet",
    )

    pca2    = PCA(n_components=2, random_state=42)
    X_pca2  = pca2.fit_transform(X_scaled)
    print("PCA(2) explained variance ratio:", pca2.explained_variance_ratio_)
    exportar_parquet(
        pd.DataFrame(X_pca2, columns=["pc1", "pc2"]),
        FASE1_DATA_PROC / "X_pca2.parquet",
    )

    pca10   = PCA(n_components=10, random_state=42)
    X_pca10 = pca10.fit_transform(X_scaled)
    print("PCA(10) explained variance ratio:", pca10.explained_variance_ratio_)
    exportar_parquet(
        pd.DataFrame(X_pca10, columns=[f"pc{i+1}" for i in range(10)]),
        FASE1_DATA_PROC / "X_pca10.parquet",
    )

    reducer = umap.UMAP(
        n_neighbors=15, min_dist=0.1, n_components=2, random_state=42,
    )
    X_umap2  = reducer.fit_transform(X_scaled)
    df_umap  = pd.DataFrame(X_umap2, columns=["umap1", "umap2"])
    exportar_parquet(df_umap, FASE1_DATA_PROC / "X_umap2.parquet")

    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for color_col in ["is_plateau", "hour_sin", "delta_w"]:
        plot_df              = df_umap.copy()
        plot_df[color_col]   = df[color_col].values
        fig = px.scatter(
            plot_df, x="umap1", y="umap2", color=color_col,
            title=f"UMAP coloreado por {color_col}",
        )
        fig.write_html(str(VIZ_DIR / f"umap_{color_col}.html"))
        print(f"  -> {VIZ_DIR / f'umap_{color_col}.html'}")


if __name__ == "__main__":
    main()
