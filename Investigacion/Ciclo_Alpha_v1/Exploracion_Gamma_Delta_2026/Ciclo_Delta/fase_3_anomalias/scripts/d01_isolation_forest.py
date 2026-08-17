import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd
from sklearn.ensemble import IsolationForest
import plotly.graph_objects as go

from _delta_utils import (
    IF_CONTAMINATION,
    FASE1_DATA_PROC,
    FASE3_MODELS,
    FASE3_OUTPUTS,
    cargar_sessions_gamma,
)

X_SCALED_PATH       = FASE1_DATA_PROC / "X_scaled.parquet"
READINGS_DELTA_PATH = FASE1_DATA_PROC / "readings_delta.parquet"
MODEL_OUT           = FASE3_MODELS / "isolation_forest.pkl"
ANOMALIAS_OUT       = FASE3_OUTPUTS / "anomalias_if.csv"
VIZ_OUT             = FASE3_OUTPUTS / "visualizaciones" / "isolation_forest_timeline.html"


def main():
    X = pd.read_parquet(X_SCALED_PATH).to_numpy()
    df = pd.read_parquet(READINGS_DELTA_PATH)

    iso = IsolationForest(
        contamination=IF_CONTAMINATION,
        random_state=42,
        n_estimators=200,
    )
    pred = iso.fit_predict(X)
    score = -iso.score_samples(X)

    df["anomaly_if"] = pred
    df["score_if"] = score

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(iso, f)

    anomalias = df[df["anomaly_if"] == -1].copy()
    ANOMALIAS_OUT.parent.mkdir(parents=True, exist_ok=True)
    anomalias.to_csv(ANOMALIAS_OUT, index=False)
    print(f"Anomalias detectadas: {len(anomalias)} de {len(df)} "
          f"({len(anomalias) / len(df) * 100:.2f}%)")

    pct_clock_invalid = anomalias["clock_invalid"].mean() * 100
    print(f"% de anomalias con clock_invalid=True: {pct_clock_invalid:.2f}%")

    sessions = cargar_sessions_gamma()
    servido_sessions = sessions[sessions["categoria"].str.contains(
        "servido", na=False
    )] if "categoria" in sessions else pd.DataFrame()
    print(f"Sesiones de servido en Gamma para cruce temporal: "
          f"{len(servido_sessions)} (implementar cruce +-30s manualmente "
          "si se requiere precision exacta).")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df["ts"], y=df["weight_grams"], mode="lines", name="peso",
        line=dict(color="steelblue"),
    ))
    fig.add_trace(go.Scatter(
        x=anomalias["ts"], y=anomalias["weight_grams"], mode="markers",
        name="anomalia", marker=dict(color="red", size=6),
    ))
    fig.update_layout(title="Isolation Forest — anomalias sobre curva de peso")
    VIZ_OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(VIZ_OUT))


if __name__ == "__main__":
    main()
