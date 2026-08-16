import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fase_1_datos" / "scripts"))

import pandas as pd

from _delta_utils import (
    GAP_CUTOFF_S,
    FASE1_DATA_PROC,
    FASE4_OUTPUTS,
    cargar_sessions_gamma,
)

READINGS_DELTA_PATH   = FASE1_DATA_PROC / "readings_delta.parquet"
CANDIDATOS_OUT        = FASE4_OUTPUTS / "candidatos_servido_delta.csv"
CANDIDATOS_NUEVOS_OUT = FASE4_OUTPUTS / "candidatos_servido_delta_nuevos.csv"

CLUSTER_COLUMN   = "cluster_ganador"
MIN_LECTURAS     = 3
MIN_DELTA_PESO_G = 5.0
MIN_DURACION_S   = 30


def identificar_cluster_servido(df):
    promedios = df.groupby(CLUSTER_COLUMN)["delta_w"].mean()
    cluster_servido = promedios.idxmax()
    print(f"Cluster identificado como 'servido': {cluster_servido} "
          f"(delta_w medio={promedios[cluster_servido]:.3f})")
    return cluster_servido


def agrupar_consecutivos(df_cluster):
    df_cluster = df_cluster.sort_values("ts").reset_index(drop=True)
    df_cluster["gap_s"] = (
        df_cluster["ts"].diff().dt.total_seconds().fillna(0)
    )
    df_cluster["nuevo_grupo"] = df_cluster["gap_s"] > GAP_CUTOFF_S
    df_cluster["grupo_id"] = df_cluster["nuevo_grupo"].cumsum()
    return df_cluster


def construir_candidatos(df_grouped):
    rows = []
    for grupo_id, grupo in df_grouped.groupby("grupo_id"):
        if len(grupo) < MIN_LECTURAS:
            continue
        ts_inicio  = grupo["ts"].iloc[0]
        ts_termino = grupo["ts"].iloc[-1]
        duracion_s   = (ts_termino - ts_inicio).total_seconds()
        delta_peso_g = grupo["weight_grams"].iloc[-1] - grupo["weight_grams"].iloc[0]

        if duracion_s < MIN_DURACION_S or delta_peso_g < MIN_DELTA_PESO_G:
            continue

        rows.append({
            "ts_inicio":    ts_inicio,
            "ts_termino":   ts_termino,
            "delta_peso_g": delta_peso_g,
            "duracion_s":   duracion_s,
            "n_lecturas":   len(grupo),
            "cluster_id":   grupo[CLUSTER_COLUMN].iloc[0],
        })
    return pd.DataFrame(rows)


def marcar_ya_etiquetados(candidatos, sessions):
    servido_sessions = sessions[
        sessions["session_type"].str.contains("servido", na=False)
    ] if "session_type" in sessions.columns else pd.DataFrame()

    ya_etiquetado = []
    for _, cand in candidatos.iterrows():
        match = servido_sessions[
            (servido_sessions["ts_inicio"] <= cand["ts_termino"])
            & (servido_sessions["ts_fin"] >= cand["ts_inicio"])
        ]
        ya_etiquetado.append(len(match) > 0)
    candidatos["ya_etiquetado_gamma"] = ya_etiquetado
    return candidatos


def main():
    df = pd.read_parquet(READINGS_DELTA_PATH)
    cluster_servido = identificar_cluster_servido(df)

    df_cluster = df[df[CLUSTER_COLUMN] == cluster_servido].copy()
    df_grouped  = agrupar_consecutivos(df_cluster)
    candidatos  = construir_candidatos(df_grouped)

    CANDIDATOS_OUT.parent.mkdir(parents=True, exist_ok=True)
    candidatos.to_csv(CANDIDATOS_OUT, index=False)
    print(f"Candidatos de servido totales: {len(candidatos)}")

    sessions   = cargar_sessions_gamma()
    candidatos = marcar_ya_etiquetados(candidatos, sessions)

    nuevos = candidatos[~candidatos["ya_etiquetado_gamma"]]
    nuevos.to_csv(CANDIDATOS_NUEVOS_OUT, index=False)
    print(f"Candidatos de servido NUEVOS (no etiquetados en Gamma): "
          f"{len(nuevos)}")


if __name__ == "__main__":
    main()
