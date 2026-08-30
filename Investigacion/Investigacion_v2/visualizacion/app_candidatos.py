"""
App de visualizacion de candidatos y clusters -- Investigacion_v2, Paso 4.

Lee:
  - ../data/lecturas_limpias.csv           (cache post-dedup de Paso 1)
  - ../data/candidatos_clusters.csv          (features propias, tau=1 lectura, notebook 05)
  - ../data/candidatos_clusters_duracion.csv (features propias, tau=180s calibrado, notebook 07)
  - ../data/candidatos_categoria_real.csv    (categoria real por candidato via
                                               solapamiento contra anotaciones reales,
                                               solo KPCL0034, notebook 08 -- opcional)
Fuente de clusters elegible desde el sidebar ("Segmentación / features usadas").

Modo "Revisar candidatos sin anotación real" (checkbox del sidebar): muestra
la categoría que el cluster elegido sugiere para cada candidato sin ninguna
anotación real cerca, y guarda el veredicto manual en
../data/revision_sin_anotacion.csv (candidato_id -> veredicto). Es el unico
guardado que hace la app -- el resto sigue siendo solo visualizacion.

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
# Orden = orden de aparicion en el sidebar; el primero es el default al abrir la app.
FUENTES_CLUSTERS = {
    "★ τ=180s calibrado, recomendado (notebook 07)": DATA_DIR / "candidatos_clusters_duracion.csv",
    "τ=1 lectura, original (notebook 05)": DATA_DIR / "candidatos_clusters.csv",
}
CATEGORIA_REAL_CSV = DATA_DIR / "candidatos_categoria_real.csv"
REVISION_SIN_ANOTACION_CSV = DATA_DIR / "revision_sin_anotacion.csv"

VEREDICTOS = ["(sin revisar)", "alimentacion", "servido", "ruido", "no está claro"]

RESUMEN_MODELO_RECOMENDADO = """
**★ Modelo recomendado: KMeans + refinamiento delta_w, sobre τ=180s**

**Todo lo de acá vale solo para KPCL0034** — es el único dispositivo con
anotaciones reales (743, Ciclo_Alpha_v2). KPCL0035 se clusteriza igual, pero
sin ninguna anotación real que lo valide — su `categoria_real` siempre sale
"sin_validar", no "confirmado que funciona".

Validado contra las 743 anotaciones reales de Ciclo_Alpha_v2 (solapamiento de
tiempo, notebook 08) — no es una preferencia estética, es el único que se
midió y funciona:

| Cobertura (¿detectamos el evento real?) | % |
|---|---|
| Alimentación | **100%** (318/318) |
| Ruido | 82.6% (289/350) |
| Servido | 82.7% (62/75) |

| Cluster refinado | Composición real |
|---|---|
| Alimentación | 73.9% alimentación |
| Ruido (resto del cluster mezclado) | **100% ruido** |
| Servido (nuevo, `delta_w > 20g`) | **75.0% servido** |

El umbral `delta_w > 20g` no se inventó — es el mínimo `delta_w` observado en
496 servidos reales (`config/umbrales.json`, Ciclo_Alpha_v2), aplicado solo
dentro del cluster que ya salía mezclado.

**No probado con:** k=4 (silhouette casi igual, no separó nada — descartado).
**Sin resolver todavía:** 149/701 candidatos (21%) sin ninguna anotación real
cerca — no necesariamente errores.
"""

COLOR_CATEGORIA = {
    "alimentacion": "tab:green",
    "servido": "tab:blue",
    "ruido": "tab:orange",
    "sin_anotacion": "lightgray",
    "sin_validar": "lightgray",
}

MODELOS = {
    "★ KMeans + refinamiento delta_w, recomendado": "cluster_kmeans_refinado",
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
def cargar_candidatos(ruta_csv: str):
    df = pd.read_csv(ruta_csv)
    df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
    df["ts_fin"] = pd.to_datetime(df["ts_fin"], format="ISO8601", utc=True)
    if CATEGORIA_REAL_CSV.exists():
        # solo existe para KPCL0034 (unica con anotaciones reales, notebook 08) --
        # las filas que no matchean (KPCL0035, u otra fuente de clusters) quedan NaN
        categorias = pd.read_csv(CATEGORIA_REAL_CSV)
        df = df.merge(categorias, on="candidato_id", how="left")
        df["categoria_real"] = df["categoria_real"].fillna("sin_validar")
    else:
        df["categoria_real"] = "sin_validar"
    return df


if not CACHE_CSV.exists():
    st.error(
        "Falta data/lecturas_limpias.csv -- correr 01_caracterizacion_fondo.ipynb primero."
    )
    st.stop()

lecturas = cargar_lecturas()

# --- Sidebar: fuente de clusters, dispositivo, modelo, cluster "bueno" ---------
st.sidebar.header("Selección")
fuente_nombre = st.sidebar.radio("Segmentación / features usadas", list(FUENTES_CLUSTERS.keys()))
clusters_csv = FUENTES_CLUSTERS[fuente_nombre]
if not clusters_csv.exists():
    st.error(
        f"Falta {clusters_csv.name} -- correr el notebook que lo genera "
        "(05_clustering_no_supervisado.ipynb o 07_calibracion_duracion.ipynb, "
        "según la fuente elegida)."
    )
    st.stop()
candidatos = cargar_candidatos(str(clusters_csv))

device_code = st.sidebar.selectbox("Dispositivo", sorted(candidatos["device_code"].unique()))
modelos_disponibles = {k: v for k, v in MODELOS.items() if v in candidatos.columns}
modelo_nombre = st.sidebar.selectbox("Modelo de clustering", list(modelos_disponibles.keys()))
col_cluster = modelos_disponibles[modelo_nombre]

cand_device = candidatos[candidatos["device_code"] == device_code].copy()
if device_code != "KPCL0034":
    st.sidebar.warning(
        f"{device_code} no tiene anotaciones reales -- se clusteriza igual, "
        "pero nada de esto está validado acá (solo KPCL0034 lo está)."
    )
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

with st.sidebar.expander("ℹ️ Por qué este es el modelo recomendado", expanded=False):
    st.markdown(RESUMEN_MODELO_RECOMENDADO)

st.sidebar.divider()
modo_revision_sin_anotacion = st.sidebar.checkbox(
    "🔍 Revisar candidatos sin anotación real",
    help="Corre el modelo elegido sobre los candidatos que no coinciden con "
         "ninguna anotación real, y deja marcar si la categoría que el "
         "cluster sugiere está bien o no.",
)


def cargar_veredictos():
    if REVISION_SIN_ANOTACION_CSV.exists():
        return pd.read_csv(REVISION_SIN_ANOTACION_CSV).set_index("candidato_id")["veredicto"].to_dict()
    return {}


def guardar_veredicto(candidato_id, veredicto):
    _veredictos = cargar_veredictos()
    _veredictos[candidato_id] = veredicto
    pd.DataFrame(
        [{"candidato_id": k, "veredicto": v} for k, v in _veredictos.items()]
    ).to_csv(REVISION_SIN_ANOTACION_CSV, index=False)


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

hay_categoria_real = (cand_device["categoria_real"] != "sin_validar").any()
if hay_categoria_real:
    st.caption(
        "Color = categoría real (anotación verificada, solo KPCL0034). "
        "Borde negro = pertenece al cluster elegido (rojo en el gráfico anterior)."
    )

fig1, ax1 = plt.subplots(figsize=(9, 5))
for _cat, _sub in cand_device.groupby("categoria_real"):
    _en_cluster_bueno = _sub[col_cluster] == cluster_bueno
    ax1.scatter(
        _sub.loc[~_en_cluster_bueno, "duracion_s"], _sub.loc[~_en_cluster_bueno, "delta_neto_real"],
        color=COLOR_CATEGORIA.get(_cat, "lightgray"), alpha=0.5, zorder=1, label=f"{_cat}",
    )
    ax1.scatter(
        _sub.loc[_en_cluster_bueno, "duracion_s"], _sub.loc[_en_cluster_bueno, "delta_neto_real"],
        color=COLOR_CATEGORIA.get(_cat, "lightgray"), alpha=0.9, zorder=3,
        edgecolor="black", linewidth=1.2,
    )
ax1.set_xscale("log")
ax1.axhline(0, color="gray", linewidth=0.5)
ax1.set_xlabel("duración (s, log)")
ax1.set_ylabel("delta_neto_real (g)")
ax1.legend(title="Categoría real" if hay_categoria_real else "categoria_real")
ax1.set_title(f"Cluster elegido: {cluster_bueno} (borde negro)")
st.pyplot(fig1)
plt.close(fig1)

if hay_categoria_real:
    with st.expander("Composición real de cada cluster (% de categoría real)", expanded=True):
        _tabla = pd.crosstab(cand_device[col_cluster], cand_device["categoria_real"])
        st.dataframe((_tabla.div(_tabla.sum(axis=1), axis=0) * 100).round(1))
        st.caption(f"Cantidad de candidatos por cluster: {dict(_tabla.sum(axis=1))}")

with st.expander("Medianas por cluster"):
    st.dataframe(
        cand_device.groupby(col_cluster)[
            ["duracion_s", "delta_neto_real", "max_abs_delta_g", "n_lecturas", "n_cambios_signo"]
        ].median().round(2)
    )

st.divider()

# --- Seccion 2: revision 1 a 1 -------------------------------------------------
if modo_revision_sin_anotacion:
    st.subheader("Candidatos sin anotación real — ¿el modelo acertó?")
    st.caption(
        "El modelo se corre igual que siempre; acá se muestra qué categoría "
        "sugiere el cluster de cada candidato, para que confirmes o corrijas."
    )
    # categoria dominante de cada cluster, calculada solo con candidatos que SI
    # tienen categoria real (para no usar "sin_anotacion" para predecir "sin_anotacion")
    _con_categoria_real = cand_device[~cand_device["categoria_real"].isin(["sin_anotacion", "sin_validar"])]
    _categoria_dominante_por_cluster = (
        _con_categoria_real.groupby(col_cluster)["categoria_real"]
        .agg(lambda s: s.mode().iat[0] if not s.mode().empty else "?")
    )
    vista = (
        cand_device[cand_device["categoria_real"] == "sin_anotacion"]
        .sort_values("ts_inicio").reset_index(drop=True)
    )
else:
    st.subheader(f"Candidatos del cluster {cluster_bueno} — uno por uno")
    vista = cand_device[cand_device[col_cluster] == cluster_bueno].sort_values("ts_inicio").reset_index(drop=True)

clave_seleccion = (fuente_nombre, device_code, modelo_nombre, cluster_bueno, modo_revision_sin_anotacion)
if st.session_state.get("clave_seleccion") != clave_seleccion:
    st.session_state["clave_seleccion"] = clave_seleccion
    st.session_state["idx_revision"] = 0

n_vista = len(vista)
if n_vista == 0:
    st.warning(
        "No hay candidatos sin anotación real acá." if modo_revision_sin_anotacion
        else "Este cluster no tiene candidatos para este dispositivo."
    )
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
    if modo_revision_sin_anotacion:
        _prediccion = _categoria_dominante_por_cluster.get(fila[col_cluster], "?")
        st.markdown(
            f"<p style='text-align:center'>El modelo dice (cluster {fila[col_cluster]}): "
            f"<b>{_prediccion}</b></p>",
            unsafe_allow_html=True,
        )
    else:
        _categoria = fila["categoria_real"]
        _etiqueta_categoria = {
            "sin_anotacion": "sin anotación real cerca",
            "sin_validar": "sin validar (dispositivo/fuente sin anotaciones reales)",
        }.get(_categoria, _categoria)
        st.markdown(
            f"<p style='text-align:center'>Categoría real (anotación): <b>{_etiqueta_categoria}</b></p>",
            unsafe_allow_html=True,
        )

    fig2, ax2 = plt.subplots(figsize=(8, 4))
    graficar_candidato(fila, ax2)
    st.pyplot(fig2)
    plt.close(fig2)

    if modo_revision_sin_anotacion:
        _veredictos_guardados = cargar_veredictos()
        _veredicto_actual = _veredictos_guardados.get(fila["candidato_id"], "(sin revisar)")
        _veredicto_elegido = st.selectbox(
            "Tu veredicto", VEREDICTOS,
            index=VEREDICTOS.index(_veredicto_actual) if _veredicto_actual in VEREDICTOS else 0,
            key=f"veredicto_{fila['candidato_id']}",
        )
        if _veredicto_elegido != _veredicto_actual:
            guardar_veredicto(fila["candidato_id"], _veredicto_elegido)
            st.rerun()
        st.caption(f"{len(_veredictos_guardados):,} candidatos ya revisados en total (todas las fuentes/modelos).")
