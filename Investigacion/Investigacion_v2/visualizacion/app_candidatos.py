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
import mpl_toolkits.mplot3d  # noqa: F401 -- registra la proyeccion "3d", no se usa directo
import plotly.graph_objects as go
import streamlit as st
from scipy.stats import gaussian_kde

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
# Mismo patron que CATEGORIAS en app_anotacion_av2.py (Ciclo_Alpha_v2/fase_0_ruido)
# -- descripcion corta al lado de cada opcion, para clasificar sin tener que
# adivinar el criterio cada vez.
VEREDICTO_DESC = {
    "(sin revisar)": "todavía no lo miraste",
    "alimentacion": "el peso baja de forma sostenida -- comió",
    "servido": "el peso sube en segundos -- le sirvieron",
    "ruido": "oscila y vuelve casi al mismo peso -- no fue un evento real",
    "no está claro": "dudoso, dejalo para revisar de nuevo más adelante",
}

RESUMEN_MODELO_RECOMENDADO = """
**★ Modelo recomendado: KMeans + refinamiento delta_w + guardia física, sobre τ=180s**

**Todo lo de acá vale solo para KPCL0034** — es el único dispositivo con
anotaciones reales (743, Ciclo_Alpha_v2). KPCL0035 se clusteriza igual, pero
sin ninguna anotación real que lo valide — su `categoria_real` siempre sale
"sin_validar", no "confirmado que funciona".

Validado contra las 743 anotaciones reales + 37 veredictos manuales promovidos
(solapamiento de tiempo, notebook 08) — no es una preferencia estética, es el
único que se midió y funciona. Números recalculados en cada corrida de
`exportar_calibracion_produccion.py` (nunca hardcodeados), ver `data/
calibracion_kpcl0034_export.json > guardia_alimentacion.mejora_medida`:

| Cobertura (¿detectamos el evento real?) | % |
|---|---|
| Alimentación | **100%** (318/318) |
| Ruido | 82.6% (289/350) |
| Servido | 82.7% (62/75) |

| Accuracy punto a punto (contra 589 candidatos con categoría real) | Sin guardia | Con guardia |
|---|---|---|
| Global | 81.0% | **86.4%** |
| Pureza alimentación | 75.3% | **85.9%** |
| Recall servido | 67.4% | **91.8%** |
| Recall ruido | 71.0% | **79.6%** |

**Guardia física** (2026-08-30): "alimentación" exige que el peso haya bajado
— comer nunca sube el peso del plato. Un ~11% de los candidatos más cercanos
al cluster de alimentación tenían `delta_neto_real >= 0`; se redirigen con el
mismo umbral ya calibrado (no uno nuevo). El umbral `delta_w > 20g` tampoco se
inventó — es el mínimo `delta_w` observado en 496 servidos reales
(`config/umbrales.json`, Ciclo_Alpha_v2).

**No probado con:** k=4 (silhouette casi igual, no separó nada — descartado).
**Sin resolver todavía:** 112 de 783 candidatos (14%) sin ninguna anotación
real cerca — 37 ya revisados a mano y promovidos a `categoria_real` (33
ruido, 4 alimentación, cero desacuerdo con el cluster) vía el modo de
revisión.
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


@st.cache_data
def cargar_calibracion_produccion():
    """Calibración congelada que corre en kittypau_app (motor-alimentacion/) --
    se reusa acá solo para calcular incertidumbre por distancia a centroide,
    nunca se reentrena desde la app. Solo válida para KPCL0034 (ver
    calibracion['device_code'])."""
    _ruta = DATA_DIR / "calibracion_kpcl0034_export.json"
    if not _ruta.exists():
        return None
    import json
    return json.loads(_ruta.read_text(encoding="utf-8"))


def incertidumbre_candidato(row, calibracion):
    """Cociente distancia-al-cluster-mas-cercano / distancia-al-segundo-mas-
    cercano, sobre las 3 features estandarizadas del KMeans crudo (mismo fit
    que produccion). Cerca de 1.0 = ambiguo (casi empatado entre 2 clusters),
    cerca de 0 = confiado. No usa la guardia ni el refinamiento -- es sobre
    el cluster crudo, para priorizar QUE revisar, no para reclasificar."""
    _features_orden = calibracion["features_orden"]
    _log1p = set(calibracion["log1p_features"])
    _mean = calibracion["scaler"]["mean"]
    _scale = calibracion["scaler"]["scale"]
    _crudas = {
        "duracion_s": row["duracion_s"], "delta_neto_real": row["delta_neto_real"],
        "max_abs_delta_g": row["max_abs_delta_g"], "n_lecturas": row["n_lecturas"],
        "n_cambios_signo": row["n_cambios_signo"],
    }
    _x = np.array([
        (np.log1p(_crudas[_n]) if _n in _log1p else _crudas[_n]) - _mean[_i]
        for _i, _n in enumerate(_features_orden)
    ]) / np.array(_scale)
    _dists = sorted(
        float(np.sqrt(((_x - np.array(_info["centroide_estandarizado"])) ** 2).sum()))
        for _info in calibracion["clusters_kmeans_crudo"].values()
    )
    if len(_dists) < 2 or _dists[1] == 0:
        return 0.0
    return _dists[0] / _dists[1]


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
incluir_ya_categorizados = False
orden_revision = "Fecha"
calibracion_produccion = None
if modo_revision_sin_anotacion:
    incluir_ya_categorizados = st.sidebar.checkbox(
        "Incluir candidatos que ya tienen categoría real",
        help="Para corregir un candidato que ya tiene categoría real (anotación "
             "u otro veredicto tuyo) y no solo llenar huecos. Guardar acá "
             "SOBREESCRIBE esa categoría cuando promuevas los veredictos "
             "(notebook 08) -- mirá qué categoría tiene antes de cambiarla.",
    )
    calibracion_produccion = cargar_calibracion_produccion()
    _incertidumbre_disponible = (
        device_code == "KPCL0034" and calibracion_produccion is not None
        and "cluster_kmeans" in cand_device.columns
    )
    orden_revision = st.sidebar.radio(
        "Ordenar revisión por",
        ["Fecha (más antiguos primero)", "Fecha (más recientes primero)",
         "Incertidumbre del modelo (más ambiguos primero)"],
        disabled=not _incertidumbre_disponible,
        help="Incertidumbre = qué tan cerca está el candidato entre dos "
             "clusters (distancia al más cercano / al segundo más cercano). "
             "Prioriza revisar los casos ambiguos en vez de ir por fecha -- "
             "active learning, no reentrena nada. Solo disponible para "
             "KPCL0034 con la calibración de producción ya exportada."
             if _incertidumbre_disponible else
             "Solo disponible para KPCL0034 -- correr "
             "exportar_calibracion_produccion.py si falta el JSON.",
    )


REVISION_COLUMNAS_HORA = ["ts_inicio_corregido", "ts_fin_corregido"]


def cargar_revisiones_df():
    """DataFrame indexado por candidato_id con veredicto + hora corregida (si
    existe). Columnas nuevas (ts_inicio_corregido/ts_fin_corregido) se agregan
    vacías si el CSV es de antes de que existiera la corrección de hora --
    compatible hacia atrás, notebook 08 solo lee 'veredicto' y las ignora."""
    if REVISION_SIN_ANOTACION_CSV.exists():
        df = pd.read_csv(REVISION_SIN_ANOTACION_CSV)
        for _col in REVISION_COLUMNAS_HORA:
            if _col not in df.columns:
                df[_col] = pd.NA
        return df.set_index("candidato_id")
    return pd.DataFrame(columns=["veredicto", *REVISION_COLUMNAS_HORA]).rename_axis("candidato_id")


def cargar_veredictos():
    return cargar_revisiones_df()["veredicto"].dropna().to_dict()


def guardar_revision(candidato_id, veredicto=None, ts_inicio_corregido=None, ts_fin_corregido=None):
    """Guarda parcialmente -- solo pisa los campos que se pasan (no None),
    conserva lo que ya estaba guardado para ese candidato en los demás."""
    df = cargar_revisiones_df()
    if candidato_id not in df.index:
        df.loc[candidato_id] = pd.NA
    if veredicto is not None:
        df.loc[candidato_id, "veredicto"] = veredicto
    if ts_inicio_corregido is not None:
        df.loc[candidato_id, "ts_inicio_corregido"] = ts_inicio_corregido
    if ts_fin_corregido is not None:
        df.loc[candidato_id, "ts_fin_corregido"] = ts_fin_corregido
    df.reset_index().to_csv(REVISION_SIN_ANOTACION_CSV, index=False)


def guardar_veredicto(candidato_id, veredicto):
    guardar_revision(candidato_id, veredicto=veredicto)


def graficar_candidato(fila, corregido=None):
    """Grafico interactivo (Plotly) -- mismo patron de hover que build_chart en
    Investigacion/Ciclo_Alpha_v2/fase_0_ruido/app_anotacion_av2.py: pasar el
    mouse sobre un punto muestra su hora exacta y el peso, para poder leer
    la hora real y tipearla en "Corregir la hora de inicio/fin" de al lado."""
    _m = lecturas["device_code"] == fila["device_code"]
    _ini = max(lecturas.loc[_m].index.min(), fila["idx_inicio"] - MARGEN_GRAFICO_LECTURAS)
    _fin = min(lecturas.loc[_m].index.max(), fila["idx_fin"] + MARGEN_GRAFICO_LECTURAS)
    _ventana = lecturas.loc[_m].loc[_ini:_fin].copy()
    _ventana["ts_stgo"] = _ventana["ts"].dt.tz_convert("America/Santiago")

    fig = go.Figure()
    fig.add_vrect(
        x0=fila["ts_inicio"].tz_convert("America/Santiago"),
        x1=fila["ts_fin"].tz_convert("America/Santiago"),
        fillcolor="orange", opacity=0.25, layer="below", line_width=0,
        annotation_text="Corte automático", annotation_position="top left",
        annotation_font_size=10,
    )
    if corregido is not None:
        _ini_c, _fin_c = corregido
        fig.add_vrect(
            x0=_ini_c.tz_convert("America/Santiago"), x1=_fin_c.tz_convert("America/Santiago"),
            fillcolor="purple", opacity=0.15, layer="below", line_width=0,
            annotation_text="Tu corrección", annotation_position="bottom left",
            annotation_font_size=10,
        )
    fig.add_trace(go.Scatter(
        x=_ventana["ts_stgo"], y=_ventana["peso"],
        mode="lines+markers", marker=dict(size=6),
        hovertemplate="%{x|%Y-%m-%d %H:%M:%S}<br><b>%{y:.1f} g</b><extra></extra>",
    ))
    fig.update_layout(
        height=420, margin=dict(l=40, r=20, t=30, b=40),
        yaxis_title="Peso (g)", showlegend=False,
    )
    return fig


# --- Seccion 0: nube 3D + densidad (KDE) -- vista al comienzo, mismo color/borde
# que la Seccion 1 de abajo (categoria real / cluster elegido), pero con una
# tercera dimension (max_abs_delta_g) y con densidad en vez de puntos sueltos.
st.subheader(f"Nube 3D + densidad (KDE) — {device_code} — {modelo_nombre}")
st.caption(
    "Mismo criterio que el gráfico de abajo: color = categoría real (anotación "
    "verificada, solo KPCL0034), borde negro = pertenece al cluster elegido "
    "(rojo en el gráfico siguiente). Acá con una tercera dimensión "
    "(max_abs_delta_g) y con densidad KDE en vez de puntos sueltos."
)
_col_3d, _col_kde = st.columns(2)

with _col_3d:
    fig0 = plt.figure(figsize=(5.5, 5))
    ax0 = fig0.add_subplot(projection="3d")
    for _cat, _sub in cand_device.groupby("categoria_real"):
        _en_cluster_bueno = _sub[col_cluster] == cluster_bueno
        ax0.scatter(
            _sub.loc[~_en_cluster_bueno, "duracion_s"],
            _sub.loc[~_en_cluster_bueno, "delta_neto_real"],
            _sub.loc[~_en_cluster_bueno, "max_abs_delta_g"],
            color=COLOR_CATEGORIA.get(_cat, "lightgray"), alpha=0.4, s=15, label=_cat,
        )
        ax0.scatter(
            _sub.loc[_en_cluster_bueno, "duracion_s"],
            _sub.loc[_en_cluster_bueno, "delta_neto_real"],
            _sub.loc[_en_cluster_bueno, "max_abs_delta_g"],
            color=COLOR_CATEGORIA.get(_cat, "lightgray"), alpha=0.9, s=25,
            edgecolor="black", linewidth=0.8,
        )
    ax0.set_xlabel("duración (s)")
    ax0.set_ylabel("delta_neto_real (g)")
    ax0.set_zlabel("max_abs_delta_g (g)")
    ax0.set_title("Nube de puntos 3D")
    ax0.legend(fontsize=7, loc="upper left")
    st.pyplot(fig0)
    plt.close(fig0)

with _col_kde:
    fig_kde, ax_kde = plt.subplots(figsize=(5.5, 5))
    _log_dur = np.log10(cand_device["duracion_s"].clip(lower=1))
    _hubo_contorno = False
    for _cat, _sub in cand_device.groupby("categoria_real"):
        if _cat in ("sin_anotacion", "sin_validar") or len(_sub) < 5:
            continue
        try:
            _x = np.log10(_sub["duracion_s"].clip(lower=1))
            _y = _sub["delta_neto_real"]
            _kde = gaussian_kde(np.vstack([_x, _y]))
            _xg, _yg = np.mgrid[
                _log_dur.min():_log_dur.max():60j,
                cand_device["delta_neto_real"].min():cand_device["delta_neto_real"].max():60j,
            ]
            _zg = _kde(np.vstack([_xg.ravel(), _yg.ravel()])).reshape(_xg.shape)
            ax_kde.contour(
                10 ** _xg, _yg, _zg, levels=4,
                colors=[COLOR_CATEGORIA.get(_cat, "gray")], alpha=0.8,
            )
            ax_kde.plot([], [], color=COLOR_CATEGORIA.get(_cat, "gray"), label=_cat)
            _hubo_contorno = True
        except np.linalg.LinAlgError:
            continue  # categoria con varianza ~0 (todos los puntos iguales) -- sin KDE posible
    if not _hubo_contorno:
        st.caption("No hay suficientes candidatos con categoría real para estimar densidad.")
    ax_kde.set_xscale("log")
    ax_kde.axhline(0, color="gray", linewidth=0.5)
    ax_kde.set_xlabel("duración (s, log)")
    ax_kde.set_ylabel("delta_neto_real (g)")
    ax_kde.set_title("Densidad (KDE) por categoría real")
    if _hubo_contorno:
        ax_kde.legend(fontsize=7)
    st.pyplot(fig_kde)
    plt.close(fig_kde)

st.divider()

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

# categoria dominante de cada cluster (mismo criterio que el modo de revision,
# calculado siempre -- lo usan la seccion de "ultimos eventos" y la revision 1 a 1)
_con_categoria_real = cand_device[~cand_device["categoria_real"].isin(["sin_anotacion", "sin_validar"])]
categoria_dominante_por_cluster = (
    _con_categoria_real.groupby(col_cluster)["categoria_real"]
    .agg(lambda s: s.mode().iat[0] if not s.mode().empty else "?")
)
cand_device["categoria_predicha"] = cand_device[col_cluster].map(categoria_dominante_por_cluster).fillna("?")

st.divider()

# --- Seccion 2: ultimos eventos por categoria (revisar categorizacion y tiempo) -
st.subheader("Últimos eventos por categoría — revisar categorización y tiempo")
st.caption(
    "Categoría predicha = la que sugiere el cluster de cada candidato (mismo mapeo "
    "que 'Composición real de cada cluster' arriba). Columna 'gap' = minutos desde "
    "el evento anterior de la MISMA categoría -- eventos muy pegados en el tiempo "
    "suelen ser la señal de que algo no tiene sentido (ver picoteo, Knowledge "
    "SPEC_HungerBar_Alimentacion.md §3)."
)
N_ULTIMOS = st.slider("Cuántos últimos eventos por categoría", 3, 20, 8)
cols_ultimos = st.columns(3)
for _col, _categoria in zip(cols_ultimos, ["alimentacion", "servido", "ruido"]):
    with _col:
        st.markdown(f"**{_categoria}**")
        _sub = (
            cand_device[cand_device["categoria_predicha"] == _categoria]
            .sort_values("ts_inicio", ascending=False)
            .head(N_ULTIMOS)
            .sort_values("ts_inicio")
            .copy()
        )
        if _sub.empty:
            st.caption("Sin candidatos de esta categoría.")
            continue
        _sub["hora_inicio"] = _sub["ts_inicio"].dt.tz_convert("America/Santiago").dt.strftime("%d-%b %H:%M")
        _sub["dur_min"] = (_sub["duracion_s"] / 60).round(1)
        _sub["gap_min"] = _sub["ts_inicio"].diff().dt.total_seconds().div(60).round(1)
        _mostrar = _sub[["hora_inicio", "dur_min", "delta_neto_real", "gap_min", "categoria_real"]]
        _mostrar = _mostrar.rename(columns={
            "hora_inicio": "inicio", "dur_min": "dur(min)",
            "delta_neto_real": "Δg", "gap_min": "gap(min)", "categoria_real": "real",
        })
        st.dataframe(_mostrar.iloc[::-1], hide_index=True, use_container_width=True)

with st.expander("📈 Línea de tiempo de los últimos eventos (todas las categorías)", expanded=False):
    _n_timeline = cand_device.sort_values("ts_inicio").tail(N_ULTIMOS * 3)
    if _n_timeline.empty:
        st.caption("Sin candidatos para graficar.")
    else:
        _lane = {"alimentacion": 3, "servido": 2, "ruido": 1}
        fig_tl, ax_tl = plt.subplots(figsize=(10, 2.5))
        for _cat, _sub in _n_timeline.groupby("categoria_predicha"):
            ax_tl.scatter(
                _sub["ts_inicio"], [_lane.get(_cat, 0)] * len(_sub),
                color=COLOR_CATEGORIA.get(_cat, "gray"), label=_cat, s=60,
            )
        ax_tl.set_yticks(list(_lane.values()), list(_lane.keys()))
        ax_tl.set_ylim(0.5, 3.5)
        ax_tl.tick_params(axis="x", labelrotation=20)
        ax_tl.set_title(f"Últimos {len(_n_timeline)} candidatos por categoría predicha")
        st.pyplot(fig_tl)
        plt.close(fig_tl)

st.divider()

# --- Seccion 3: revision 1 a 1 -------------------------------------------------
if modo_revision_sin_anotacion:
    st.subheader("Candidatos sin anotación real — ¿el modelo acertó?")
    st.caption(
        "El modelo se corre igual que siempre; acá se muestra qué categoría "
        "sugiere el cluster de cada candidato, para que confirmes o corrijas."
    )
    # ya calculado arriba (categoria_dominante_por_cluster) -- se reusa acá
    _categoria_dominante_por_cluster = categoria_dominante_por_cluster
    _base = cand_device if incluir_ya_categorizados else cand_device[cand_device["categoria_real"] == "sin_anotacion"]
    if orden_revision.startswith("Incertidumbre") and calibracion_produccion is not None:
        vista = _base.copy()
        vista["_incertidumbre"] = vista.apply(
            lambda r: incertidumbre_candidato(r, calibracion_produccion), axis=1
        )
        vista = vista.sort_values("_incertidumbre", ascending=False).reset_index(drop=True)
        st.caption(
            "Ordenado por incertidumbre del modelo -- los más ambiguos primero "
            "(cociente distancia_1°/distancia_2° cerca de 1.0 = casi empatado "
            "entre dos clusters)."
        )
    else:
        vista = _base.sort_values(
            "ts_inicio", ascending=orden_revision != "Fecha (más recientes primero)"
        ).reset_index(drop=True)
    if len(vista):
        _predicciones_bulk = vista[col_cluster].map(_categoria_dominante_por_cluster)
        _n_guardables = int(_predicciones_bulk.notna().sum())
        if st.button(
            f"💾 Guardar los {_n_guardables} candidatos de esta lista con la "
            "categoría que sugiere el modelo",
            disabled=_n_guardables == 0,
            help="Guarda cada candidato con la categoría dominante de su cluster "
                 "(la misma que se muestra abajo en la revisión 1 a 1) -- sin "
                 "revisarlos uno por uno. Los clusters sin categoría dominante "
                 "conocida ('?') se saltan.",
        ):
            for _cid, _pred in zip(vista["candidato_id"], _predicciones_bulk):
                if pd.notna(_pred):
                    guardar_veredicto(_cid, _pred)
            st.success(f"Guardados {_n_guardables} veredictos.")
            st.rerun()
else:
    st.subheader(f"Candidatos del cluster {cluster_bueno} — uno por uno")
    vista = cand_device[cand_device[col_cluster] == cluster_bueno].sort_values("ts_inicio").reset_index(drop=True)

clave_seleccion = (
    fuente_nombre, device_code, modelo_nombre, cluster_bueno,
    modo_revision_sin_anotacion, incluir_ya_categorizados, orden_revision,
)
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

    col_atras, col_medio, col_siguiente, col_ultimo = st.columns([1, 3, 1, 1])
    with col_atras:
        if st.button("⬅ Atrás", use_container_width=True, disabled=idx == 0):
            idx -= 1
    with col_siguiente:
        if st.button("Siguiente ➡", use_container_width=True, disabled=idx >= n_vista - 1):
            idx += 1
    with col_ultimo:
        # el ultimo indice es el otro extremo cronologico de "vista" -- cual
        # sea, segun orden_revision (mas antiguo si "recientes primero", y
        # viceversa).
        if st.button("Último ⏭", use_container_width=True, disabled=idx >= n_vista - 1):
            idx = n_vista - 1
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
        if incluir_ya_categorizados:
            st.markdown(
                f"<p style='text-align:center'>Categoría real actual: "
                f"<b>{fila['categoria_real']}</b></p>",
                unsafe_allow_html=True,
            )
        if "_incertidumbre" in fila.index:
            st.markdown(
                f"<p style='text-align:center'>Incertidumbre: "
                f"<b>{fila['_incertidumbre']:.2f}</b> (1.0 = casi empatado entre 2 clusters)</p>",
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

    _revisiones_df = cargar_revisiones_df()
    _correccion_existente = (
        _revisiones_df.loc[fila["candidato_id"]]
        if fila["candidato_id"] in _revisiones_df.index else None
    )
    _corregido_plot = None
    if _correccion_existente is not None and pd.notna(_correccion_existente.get("ts_inicio_corregido")):
        try:
            _corregido_plot = (
                pd.Timestamp(_correccion_existente["ts_inicio_corregido"]),
                pd.Timestamp(_correccion_existente["ts_fin_corregido"]),
            )
        except (ValueError, TypeError):
            _corregido_plot = None

    st.plotly_chart(graficar_candidato(fila, corregido=_corregido_plot), width="stretch")

    if modo_revision_sin_anotacion:
        _veredictos_guardados = cargar_veredictos()
        _veredicto_actual = _veredictos_guardados.get(fila["candidato_id"], "(sin revisar)")
        _veredicto_elegido = st.radio(
            "Tu veredicto", VEREDICTOS,
            format_func=lambda v: f"{v}  —  {VEREDICTO_DESC[v]}",
            index=VEREDICTOS.index(_veredicto_actual) if _veredicto_actual in VEREDICTOS else 0,
            key=f"veredicto_{fila['candidato_id']}",
        )
        if _veredicto_elegido != _veredicto_actual:
            guardar_veredicto(fila["candidato_id"], _veredicto_elegido)
            # Avanza solo al elegir un veredicto real -- volver a "(sin revisar)"
            # es deshacer, no clasificar, y ahi no tiene sentido saltar de largo.
            if _veredicto_elegido != "(sin revisar)":
                st.session_state["idx_revision"] = min(idx + 1, n_vista - 1)
            st.rerun()
        st.caption(f"{len(_veredictos_guardados):,} candidatos ya revisados en total (todas las fuentes/modelos).")

        with st.expander("🕐 Corregir la hora de inicio/fin (si el corte automático está mal)", expanded=_corregido_plot is not None):
            st.caption(
                "El corte automático (franja naranja) a veces no coincide con el "
                "evento real. Corregí acá la hora real (Santiago) y guardá -- se "
                "muestra como franja violeta a rayas en el gráfico, sin tocar el "
                "candidato original ni la segmentación."
            )
            _col_h_ini, _col_h_fin = st.columns(2)
            _valor_ini_default = (
                pd.Timestamp(_correccion_existente["ts_inicio_corregido"]).strftime("%Y-%m-%d %H:%M:%S")
                if _corregido_plot is not None else f"{_ini_stgo:%Y-%m-%d %H:%M:%S}"
            )
            _valor_fin_default = (
                pd.Timestamp(_correccion_existente["ts_fin_corregido"]).strftime("%Y-%m-%d %H:%M:%S")
                if _corregido_plot is not None else f"{_fin_stgo:%Y-%m-%d %H:%M:%S}"
            )
            with _col_h_ini:
                _hora_inicio_txt = st.text_input(
                    "Inicio corregido (hora Santiago)", value=_valor_ini_default,
                    key=f"hora_ini_{fila['candidato_id']}",
                )
            with _col_h_fin:
                _hora_fin_txt = st.text_input(
                    "Fin corregido (hora Santiago)", value=_valor_fin_default,
                    key=f"hora_fin_{fila['candidato_id']}",
                )
            if st.button("💾 Guardar hora corregida", key=f"guardar_hora_{fila['candidato_id']}"):
                try:
                    _ts_ini_nuevo = pd.Timestamp(_hora_inicio_txt, tz="America/Santiago").tz_convert("UTC")
                    _ts_fin_nuevo = pd.Timestamp(_hora_fin_txt, tz="America/Santiago").tz_convert("UTC")
                except (ValueError, TypeError) as _err:
                    st.error(f"Formato de fecha/hora inválido -- usá 'YYYY-MM-DD HH:MM:SS'. ({_err})")
                else:
                    if _ts_fin_nuevo <= _ts_ini_nuevo:
                        st.error("El fin corregido tiene que ser posterior al inicio corregido.")
                    else:
                        guardar_revision(
                            fila["candidato_id"],
                            ts_inicio_corregido=_ts_ini_nuevo.isoformat(),
                            ts_fin_corregido=_ts_fin_nuevo.isoformat(),
                        )
                        st.success("Hora corregida guardada.")
                        st.rerun()
