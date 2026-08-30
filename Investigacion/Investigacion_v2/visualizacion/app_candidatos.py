"""
App de visualizacion de candidatos y clusters -- Investigacion_v2, Paso 4.

Solo visualiza, no guarda nada todavia (a proposito). Lee:
  - ../data/lecturas_limpias.csv     (cache post-dedup de Paso 1)
  - ../data/candidatos_clusters.csv  (candidatos + etiquetas de 4 modelos, Paso 4)

Cada candidato ya tiene un `candidato_id` unico (device_code + timestamp de
inicio) -- pensado para cuando se agregue el guardado real, poder marcar
"ya revisado" sin volver a tocar esas mismas lecturas.

Correr con: streamlit run app_candidatos.py
"""
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_CSV = DATA_DIR / "lecturas_limpias.csv"
CLUSTERS_CSV = DATA_DIR / "candidatos_clusters.csv"

MODELOS = {
    "KMeans": "cluster_kmeans",
    "Agglomerative": "cluster_agg",
    "GMM": "cluster_gmm",
    "DBSCAN": "cluster_dbscan",
}
MARGEN_GRAFICO_LECTURAS = 10

st.set_page_config(page_title="Candidatos - Investigacion_v2", layout="wide")


@st.cache_data
def cargar_lecturas():
    df = pd.read_csv(CACHE_CSV)
    df["device_code"] = df["device_code"].astype("category")
    df["ts"] = pd.to_datetime(df["ts"], format="ISO8601", utc=True)
    return df


@st.cache_data
def cargar_candidatos():
    df = pd.read_csv(CLUSTERS_CSV)
    df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
    df["ts_fin"] = pd.to_datetime(df["ts_fin"], format="ISO8601", utc=True)
    return df


if not CACHE_CSV.exists() or not CLUSTERS_CSV.exists():
    st.error(
        "Faltan los CSV de datos. Correr en orden: "
        "01_caracterizacion_fondo.ipynb (genera lecturas_limpias.csv) y "
        "05_clustering_no_supervisado.ipynb (genera candidatos_clusters.csv)."
    )
    st.stop()

lecturas = cargar_lecturas()
candidatos = cargar_candidatos()

# --- Sidebar: dispositivo, modelo, cluster "bueno" -----------------------------
st.sidebar.header("Selección")
device_code = st.sidebar.selectbox("Dispositivo", sorted(candidatos["device_code"].unique()))
modelo_nombre = st.sidebar.selectbox("Modelo de clustering", list(MODELOS.keys()))
col_cluster = MODELOS[modelo_nombre]

cand_device = candidatos[candidatos["device_code"] == device_code].copy()
clusters_disponibles = sorted(cand_device[col_cluster].unique())
cluster_bueno = st.sidebar.selectbox(
    "Cluster que mejor funciona (se marca en rojo)",
    clusters_disponibles,
    help="Elegilo mirando el gráfico de la derecha -- no hay un default correcto, es criterio tuyo.",
)

st.sidebar.caption(
    f"{len(cand_device):,} candidatos de {device_code} · "
    f"{len(clusters_disponibles)} clusters en {modelo_nombre}"
)


def graficar_candidato(fila, ax):
    _m = lecturas["device_code"] == fila["device_code"]
    _ini = max(lecturas.loc[_m].index.min(), fila["idx_inicio"] - MARGEN_GRAFICO_LECTURAS)
    _fin = min(lecturas.loc[_m].index.max(), fila["idx_fin"] + MARGEN_GRAFICO_LECTURAS)
    _ventana = lecturas.loc[_m].loc[_ini:_fin]
    ax.plot(_ventana["ts"], _ventana["peso"], marker="o", markersize=4)
    ax.axvspan(fila["ts_inicio"], fila["ts_fin"], color="orange", alpha=0.25)
    ax.tick_params(axis="x", labelrotation=20)


# --- Seccion 1: vista general de clusters --------------------------------------
st.subheader(f"Clusters — {device_code} — {modelo_nombre}")

fig1, ax1 = plt.subplots(figsize=(9, 5))
for _c in clusters_disponibles:
    _sub = cand_device[cand_device[col_cluster] == _c]
    if _c == cluster_bueno:
        ax1.scatter(
            _sub["duracion_s"], _sub["delta_neto_real"],
            color="red", label=f"cluster {_c} (elegido)", alpha=0.8, zorder=3,
        )
    else:
        ax1.scatter(
            _sub["duracion_s"], _sub["delta_neto_real"],
            color="lightgray", label=f"cluster {_c}", alpha=0.6, zorder=1,
        )
ax1.set_xscale("log")
ax1.axhline(0, color="gray", linewidth=0.5)
ax1.set_xlabel("duración (s, log)")
ax1.set_ylabel("delta_neto_real (g)")
ax1.legend()
st.pyplot(fig1)
plt.close(fig1)

with st.expander("Medianas por cluster"):
    st.dataframe(
        cand_device.groupby(col_cluster)[
            ["duracion_s", "delta_neto_real", "max_abs_delta_g", "n_lecturas", "n_cambios_signo"]
        ].median().round(2)
    )

st.divider()

# --- Seccion 2: revision 1 a 1 del cluster elegido -----------------------------
st.subheader(f"Candidatos del cluster {cluster_bueno} — uno por uno")

vista = cand_device[cand_device[col_cluster] == cluster_bueno].sort_values("ts_inicio").reset_index(drop=True)

clave_seleccion = (device_code, modelo_nombre, cluster_bueno)
if st.session_state.get("clave_seleccion") != clave_seleccion:
    st.session_state["clave_seleccion"] = clave_seleccion
    st.session_state["idx_revision"] = 0

n_vista = len(vista)
if n_vista == 0:
    st.warning("Este cluster no tiene candidatos para este dispositivo.")
else:
    idx = st.session_state["idx_revision"]
    idx = max(0, min(idx, n_vista - 1))

    col_atras, col_medio, col_siguiente = st.columns([1, 3, 1])
    with col_atras:
        if st.button("⬅ Atrás", use_container_width=True, disabled=idx == 0):
            idx -= 1
    with col_siguiente:
        if st.button("Siguiente ➡", use_container_width=True, disabled=idx >= n_vista - 1):
            idx += 1
    with col_medio:
        st.markdown(f"<p style='text-align:center'>Candidato {idx + 1} de {n_vista}</p>", unsafe_allow_html=True)

    st.session_state["idx_revision"] = idx

    fila = vista.iloc[idx]
    _ini_stgo = fila["ts_inicio"].tz_convert("America/Santiago")
    _fin_stgo = fila["ts_fin"].tz_convert("America/Santiago")
    st.markdown(
        f"<p style='text-align:center'>Inicio: {_ini_stgo:%Y-%m-%d %H:%M:%S} &nbsp;→&nbsp; "
        f"Fin: {_fin_stgo:%Y-%m-%d %H:%M:%S} &nbsp;(hora Santiago)</p>",
        unsafe_allow_html=True,
    )

    fig2, ax2 = plt.subplots(figsize=(8, 4))
    graficar_candidato(fila, ax2)
    st.pyplot(fig2)
    plt.close(fig2)
