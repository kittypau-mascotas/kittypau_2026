import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd
from sklearn.neighbors import LocalOutlierFactor

from _delta_utils import (
    LOF_N_NEIGHBORS,
    IF_CONTAMINATION,
    FASE1_DATA_PROC,
    FASE3_OUTPUTS,
)

X_SCALED_PATH          = FASE1_DATA_PROC / "X_scaled.parquet"
READINGS_DELTA_PATH    = FASE1_DATA_PROC / "readings_delta.parquet"
ANOMALIAS_IF_PATH      = FASE3_OUTPUTS / "anomalias_if.csv"
ANOMALIAS_AE_PATH      = FASE3_OUTPUTS / "anomalias_autoencoder.csv"
ANOMALIAS_LOF_OUT      = FASE3_OUTPUTS / "anomalias_lof.csv"
ANOMALIAS_CONSENSO_OUT = FASE3_OUTPUTS / "anomalias_consenso.csv"
ANOMALIAS_FINAL_OUT    = FASE3_OUTPUTS / "anomalias_detectadas.csv"


def main():
    X = pd.read_parquet(X_SCALED_PATH).dropna()
    df = pd.read_parquet(READINGS_DELTA_PATH).loc[X.index].reset_index(
        drop=True
    )
    X_arr = X.to_numpy()

    lof = LocalOutlierFactor(
        n_neighbors=LOF_N_NEIGHBORS, contamination=IF_CONTAMINATION,
    )
    pred = lof.fit_predict(X_arr)
    score = -lof.negative_outlier_factor_

    df["anomaly_lof"] = pred
    df["score_lof"] = score

    anomalias_lof = df[df["anomaly_lof"] == -1]
    ANOMALIAS_LOF_OUT.parent.mkdir(parents=True, exist_ok=True)
    anomalias_lof.to_csv(ANOMALIAS_LOF_OUT, index=False)
    print(f"Anomalias LOF: {len(anomalias_lof)} de {len(df)}")

    if ANOMALIAS_IF_PATH.exists():
        ids_if = set(pd.read_csv(ANOMALIAS_IF_PATH)["ts"].astype(str))
    else:
        ids_if = set()
        print(f"Aviso: no se encontro {ANOMALIAS_IF_PATH}")

    if ANOMALIAS_AE_PATH.exists():
        ids_ae = set(pd.read_csv(ANOMALIAS_AE_PATH)["ts"].astype(str))
    else:
        ids_ae = set()
        print(f"Aviso: no se encontro {ANOMALIAS_AE_PATH}")

    ids_lof = set(anomalias_lof["ts"].astype(str))

    def votos(ts):
        return int(ts in ids_if) + int(ts in ids_ae) + int(ts in ids_lof)

    todos_ts = ids_if | ids_ae | ids_lof
    consenso_rows = [{"ts": ts, "votos": votos(ts)} for ts in todos_ts if votos(ts) >= 2]

    if consenso_rows:
        consenso_df = pd.DataFrame(consenso_rows).sort_values("votos", ascending=False)
    else:
        print("Aviso: sin consenso >= 2, usando union IF+LOF con votos=1.")
        consenso_rows = [{"ts": ts, "votos": votos(ts)} for ts in todos_ts]
        consenso_df = pd.DataFrame(consenso_rows).sort_values("votos", ascending=False)
    ANOMALIAS_CONSENSO_OUT.parent.mkdir(parents=True, exist_ok=True)
    consenso_df.to_csv(ANOMALIAS_CONSENSO_OUT, index=False)
    print(f"Anomalias en consenso (>=2/3 detectores): {len(consenso_df)}")

    consenso_df.to_csv(ANOMALIAS_FINAL_OUT, index=False)


if __name__ == "__main__":
    main()
