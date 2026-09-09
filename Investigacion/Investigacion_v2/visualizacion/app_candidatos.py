"""
Anotaciones — base única de KPCL0034, con curva interactiva para editar hora
y categoría con contexto visual.

Fuente única real: `data/anotaciones_unificadas.csv` -- una sola tabla, una
sola categorización (`alimentacion`/`servido`/`ruido`), sin distinguir de
cara al usuario si una fila viene de una anotación real o de un candidato
confirmado (esa distinción de origen ya no se muestra ni se filtra, ver
migración 2026-09-09 más abajo). Cada fila tiene su propio id y un flag
`revisado`.

Puertas adentro se arma/actualiza sola en cada carga uniendo 2 fuentes
legadas que todavía existen en disco (para no romper el pipeline de
recalibración, ver más abajo):
  - anotaciones_av2.csv        anotaciones reales originales, cada una con
                                su propio id_anotacion (Ciclo_Alpha_v2/
                                fase_0_ruido, hecha en app_anotacion_av2.py).
  - revision_sin_anotacion.csv veredictos manuales sobre candidatos que NO
                                tenían ninguna anotación real cerca
                                (Investigacion_v2, candidato_id como id).
Un candidato cuyo categoria_real salió de solaparse con una anotación real
(notebook 08) NO se lista aparte -- sería el mismo evento contado dos veces.
La primera vez que corre esta app arma el archivo unificado desde cero; las
siguientes veces solo agrega filas nuevas que hayan aparecido en las fuentes
legadas (ej. una recalibración nueva promovió más candidatos), sin revisar
-- nunca pisa una fila que ya esté en la base unificada, así que una
hora/categoría/revisado ya guardados acá no se pierden.

Migración 2026-09-09: Mauro terminó de revisar a mano todas las anotaciones
de `servido`/`alimentacion` -- la primera carga después de este cambio
marca TODO lo que ya estaba en la base como `revisado=True` de una sola
vez (columna nueva) y saca la columna `origen` de la tabla. De acá en más,
cualquier anotación nueva que aparezca arranca `revisado=False` -- ver
checkbox "Solo pendientes de revisar".

Editar: elegís una anotación de la tabla (click en la fila), ves su curva
de peso real con hover (hora exacta + peso al pasar el mouse), y corregís
hora/categoría con contexto visual real -- no a ciegas. Guardar NUNCA se
bloquea por solapamiento -- el flujo real para un par sospechoso es
corregir una mientras la otra todavía existe, y recién después eliminar la
que sobra; si sigue quedando solapada avisa (toast), no impide guardar.
Escribe la base unificada Y las 2 fuentes legadas (para que
recalibrar_con_freno.py y el resto del pipeline sigan viendo la
corrección), con backup diario antes de cada primer write del día.

Correr con: streamlit run app_candidatos.py
"""
import shutil
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

NOTEBOOK_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = NOTEBOOK_DIR / "data"
BACKUPS_DIR = DATA_DIR / "backups"
CACHE_CSV = DATA_DIR / "lecturas_limpias.csv"
CANDIDATOS_CSV = DATA_DIR / "candidatos_clusters_duracion.csv"
REVISION_CSV = DATA_DIR / "revision_sin_anotacion.csv"
UNIFICADA_CSV = DATA_DIR / "anotaciones_unificadas.csv"
AV2_CSV = (
    NOTEBOOK_DIR.parent / "Ciclo_Alpha_v2" / "fase_0_ruido" / "data" / "anotaciones_av2.csv"
)

CATEGORIAS = ["alimentacion", "servido", "ruido"]
TZ_STGO = "America/Santiago"
MARGEN_GRAFICO_MIN = 15

st.set_page_config(page_title="Anotaciones - Investigacion_v2", layout="wide")


# ─────────────────────────────────────────────────────────────────────────────
# Carga de las 2 fuentes legadas + union
# ─────────────────────────────────────────────────────────────────────────────
@st.cache_data
def cargar_lecturas() -> pd.DataFrame:
    df = pd.read_csv(CACHE_CSV)
    df["ts"] = pd.to_datetime(df["ts"], format="ISO8601", utc=True)
    return df


def cargar_av2() -> pd.DataFrame:
    df = pd.read_csv(AV2_CSV)
    df["t_inicio"] = pd.to_datetime(df["t_inicio"], format="ISO8601", utc=True)
    df["t_fin"] = pd.to_datetime(df["t_fin"], format="ISO8601", utc=True)
    return df


def cargar_candidatos() -> pd.DataFrame:
    df = pd.read_csv(CANDIDATOS_CSV)
    df["ts_inicio"] = pd.to_datetime(df["ts_inicio"], format="ISO8601", utc=True)
    df["ts_fin"] = pd.to_datetime(df["ts_fin"], format="ISO8601", utc=True)
    return df[["candidato_id", "device_code", "ts_inicio", "ts_fin"]]


def cargar_revision() -> pd.DataFrame:
    if not REVISION_CSV.exists():
        return pd.DataFrame(
            columns=["candidato_id", "veredicto", "ts_inicio_corregido", "ts_fin_corregido"]
        )
    return pd.read_csv(REVISION_CSV)


def construir_tabla_desde_fuentes() -> pd.DataFrame:
    """Reconstruye la union completa desde las 2 fuentes legadas (no lee ni
    escribe la base unificada) -- usado para migrar y para detectar filas
    nuevas que hayan aparecido ahi desde la ultima vez. Sin columna "origen"
    -- de cara al usuario todas las filas son una sola categoría de dato
    (anotación de KPCL0034), el origen legado solo importa puertas adentro
    de guardar_anotacion()/borrar_anotacion() (por el prefijo del id, no
    por esta función) para saber a qué archivo sincronizar."""
    av2 = cargar_av2()
    filas_av2 = pd.DataFrame(
        {
            "id": "av2_" + av2["id_anotacion"].astype(str),
            "device_code": av2["device_code"],
            "ts_inicio": av2["t_inicio"],
            "ts_fin": av2["t_fin"],
            "categoria": av2["categoria"],
            "revisado": False,
        }
    )

    revision = cargar_revision()
    confirmados = revision[revision["veredicto"].isin(CATEGORIAS)].copy()
    candidatos = cargar_candidatos()
    confirmados = confirmados.merge(candidatos, on="candidato_id", how="left")
    confirmados = confirmados[confirmados["device_code"].notna()]

    confirmados["ts_inicio_corregido"] = pd.to_datetime(
        confirmados.get("ts_inicio_corregido"), format="ISO8601", utc=True, errors="coerce"
    )
    confirmados["ts_fin_corregido"] = pd.to_datetime(
        confirmados.get("ts_fin_corregido"), format="ISO8601", utc=True, errors="coerce"
    )
    filas_cand = pd.DataFrame(
        {
            "id": "cand_" + confirmados["candidato_id"].astype(str),
            "device_code": confirmados["device_code"],
            "ts_inicio": confirmados["ts_inicio_corregido"].fillna(confirmados["ts_inicio"]),
            "ts_fin": confirmados["ts_fin_corregido"].fillna(confirmados["ts_fin"]),
            "categoria": confirmados["veredicto"],
            "revisado": False,
        }
    )

    return pd.concat([filas_av2, filas_cand], ignore_index=True)


def cargar_base_unificada() -> pd.DataFrame:
    """La base unica real. Si ya existe en disco, la usa como fuente de
    verdad para las filas que ya tiene (una hora/categoría corregida acá
    nunca se pisa releyendo las fuentes legadas) y solo AGREGA las filas
    nuevas que hayan aparecido en anotaciones_av2.csv/revision_sin_anotacion.csv
    desde la última vez, sin revisar. Si no existe, la arma de cero
    (migración)."""
    fuentes = construir_tabla_desde_fuentes()
    if UNIFICADA_CSV.exists():
        existente = pd.read_csv(UNIFICADA_CSV)
        existente["ts_inicio"] = pd.to_datetime(existente["ts_inicio"], format="ISO8601", utc=True)
        existente["ts_fin"] = pd.to_datetime(existente["ts_fin"], format="ISO8601", utc=True)
        if "revisado" not in existente.columns:
            # Migración 2026-09-09: Mauro terminó de revisar todo lo que
            # había hasta ahora a mano -- lo existente pasa a revisado de
            # una sola vez; de acá en más, solo lo nuevo arranca sin
            # revisar.
            existente["revisado"] = True
            st.toast(f"{len(existente):,} anotaciones existentes marcadas como revisadas.")
        if "origen" in existente.columns:
            existente = existente.drop(columns=["origen"])
        nuevas = fuentes[~fuentes["id"].isin(existente["id"])]
        base = pd.concat([existente, nuevas], ignore_index=True)
        if len(nuevas):
            st.toast(f"{len(nuevas)} anotación(es) nueva(s) sumadas, sin revisar todavía.")
    else:
        base = fuentes
    base = base.sort_values("ts_inicio").reset_index(drop=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    base.to_csv(UNIFICADA_CSV, index=False)
    return base


# ─────────────────────────────────────────────────────────────────────────────
# Validación de solapamiento
# ─────────────────────────────────────────────────────────────────────────────
def encontrar_solapamiento(
    tabla: pd.DataFrame, ids_cambiados: set[str] | None = None
) -> tuple[str, str] | None:
    """Barre por dispositivo, ordenado por ts_inicio, y devuelve el primer par
    de ids que se solapa en el tiempo (o None si no hay ninguno). No es
    exhaustivo (puede haber más de un par) -- alcanza para bloquear el
    guardado y que el operador corrija de a uno, igual que un linter.

    Si se pasa `ids_cambiados`, solo cuenta como conflicto un par donde AL
    MENOS uno de los dos ids está en ese set -- es decir, solo bloquea
    solapamientos NUEVOS causados por esta edición, no los que ya existían
    de antes (232 pares heredados de anotaciones_av2.csv, ver checkbox "solo
    conflictos" para resolverlos de a uno)."""
    for _device, grupo in tabla.groupby("device_code"):
        g = grupo.sort_values("ts_inicio")
        fin_maximo = None
        id_fin_maximo = None
        for _, fila in g.iterrows():
            if fin_maximo is not None and fila["ts_inicio"] < fin_maximo:
                si_importa = ids_cambiados is None or (
                    fila["id"] in ids_cambiados or id_fin_maximo in ids_cambiados
                )
                if si_importa:
                    return (id_fin_maximo, fila["id"])
            if fin_maximo is None or fila["ts_fin"] > fin_maximo:
                fin_maximo = fila["ts_fin"]
                id_fin_maximo = fila["id"]
    return None


def todos_los_conflictos(
    tabla: pd.DataFrame, margen_segundos: float = 0
) -> list[tuple[str, str]]:
    """A diferencia de encontrar_solapamiento() (para en el primero, pensado
    para validar un guardado), esta barre TODOS los pares solapados -- o, si
    `margen_segundos` > 0, también los que están muy cerca sin llegar a
    solaparse -- de la tabla completa. Pensada para el filtro "solo
    conflictos/cercanos": Mauro encontró que además de los solapamientos
    exactos hay pares de candidatos (misma comida/servido detectada dos
    veces, con ids distintos) cuyas ventanas quedan pegadas pero sin
    solaparse -- el margen los agarra también."""
    margen = pd.Timedelta(seconds=margen_segundos)
    pares: list[tuple[str, str]] = []
    for _device, grupo in tabla.groupby("device_code"):
        g = grupo.sort_values("ts_inicio").reset_index(drop=True)
        for i in range(len(g)):
            for j in range(i + 1, len(g)):
                if g.loc[j, "ts_inicio"] >= g.loc[i, "ts_fin"] + margen:
                    break
                pares.append((g.loc[i, "id"], g.loc[j, "id"]))
    return pares


# ─────────────────────────────────────────────────────────────────────────────
# Gráfico
# ─────────────────────────────────────────────────────────────────────────────
def graficar_anotacion(
    lecturas: pd.DataFrame,
    device_code: str,
    ts_inicio: pd.Timestamp,
    ts_fin: pd.Timestamp,
    corregido: tuple[pd.Timestamp, pd.Timestamp] | None = None,
) -> go.Figure:
    """Curva de peso real alrededor de la anotación, con hover (hora exacta +
    peso). Mismo patrón que build_chart() de app_anotacion_av2.py."""
    margen = pd.Timedelta(minutes=MARGEN_GRAFICO_MIN)
    m = (
        (lecturas["device_code"] == device_code)
        & (lecturas["ts"] >= ts_inicio - margen)
        & (lecturas["ts"] <= ts_fin + margen)
    )
    ventana = lecturas.loc[m].copy()
    ventana["ts_stgo"] = ventana["ts"].dt.tz_convert(TZ_STGO)

    fig = go.Figure()
    fig.add_vrect(
        x0=ts_inicio.tz_convert(TZ_STGO), x1=ts_fin.tz_convert(TZ_STGO),
        fillcolor="orange", opacity=0.2, layer="below", line_width=0,
        annotation_text="Actual", annotation_position="top left", annotation_font_size=10,
    )
    if corregido is not None:
        c_ini, c_fin = corregido
        fig.add_vrect(
            x0=c_ini.tz_convert(TZ_STGO), x1=c_fin.tz_convert(TZ_STGO),
            fillcolor="purple", opacity=0.15, layer="below", line_width=0,
            annotation_text="Vista previa del cambio", annotation_position="bottom left",
            annotation_font_size=10,
        )
    fig.add_trace(go.Scatter(
        x=ventana["ts_stgo"], y=ventana["peso"],
        mode="lines+markers", marker=dict(size=6),
        hovertemplate="%{x|%Y-%m-%d %H:%M:%S}<br><b>%{y:.1f} g</b><extra></extra>",
    ))
    fig.update_layout(
        height=420, margin=dict(l=40, r=20, t=30, b=40),
        yaxis_title="Peso (g)", showlegend=False,
    )
    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Guardado
# ─────────────────────────────────────────────────────────────────────────────
def _backup_diario(ruta: Path) -> None:
    if not ruta.exists():
        return
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    bk = BACKUPS_DIR / f"{ruta.stem}_backup_{datetime.now():%Y%m%d}.csv"
    if not bk.exists():
        shutil.copy2(ruta, bk)


def _metricas_desde_lecturas(
    lecturas: pd.DataFrame, device_code: str, t_ini: pd.Timestamp, t_fin: pd.Timestamp
) -> dict:
    """Mismo cálculo que calcular_metricas() de app_anotacion_av2.py, sobre
    las columnas de Investigacion_v2 (ts/peso en vez de ts/peso_g)."""
    m = (
        (lecturas["device_code"] == device_code)
        & (lecturas["ts"] >= t_ini)
        & (lecturas["ts"] <= t_fin)
    )
    sub = lecturas.loc[m, "peso"].dropna()
    dur_min = round((t_fin - t_ini).total_seconds() / 60, 2)
    if len(sub) < 2:
        return {"duracion_min": dur_min}
    return {
        "duracion_min": dur_min,
        "delta_w_total": round(float(sub.iloc[-1]) - float(sub.iloc[0]), 1),
        "peso_inicio_g": round(float(sub.iloc[0]), 1),
        "peso_fin_g": round(float(sub.iloc[-1]), 1),
    }


def guardar_anotacion(
    lecturas: pd.DataFrame,
    fila_original: pd.Series,
    nueva_categoria: str,
    nuevo_ts_inicio: pd.Timestamp,
    nuevo_ts_fin: pd.Timestamp,
) -> None:
    """Escribe la corrección en la base unificada Y en la fuente legada que
    le corresponda (para que el pipeline de recalibración -- que sigue
    leyendo anotaciones_av2.csv/revision_sin_anotacion.csv -- vea el cambio
    en la próxima corrida)."""
    id_ = fila_original["id"]
    device_code = fila_original["device_code"]

    _backup_diario(UNIFICADA_CSV)
    base = pd.read_csv(UNIFICADA_CSV)
    base["ts_inicio"] = pd.to_datetime(base["ts_inicio"], format="ISO8601", utc=True)
    base["ts_fin"] = pd.to_datetime(base["ts_fin"], format="ISO8601", utc=True)
    idx = base.index[base["id"] == id_][0]
    base.loc[idx, "ts_inicio"] = nuevo_ts_inicio
    base.loc[idx, "ts_fin"] = nuevo_ts_fin
    base.loc[idx, "categoria"] = nueva_categoria
    base.loc[idx, "revisado"] = True  # guardar = revisar
    base.to_csv(UNIFICADA_CSV, index=False)

    if id_.startswith("av2_"):
        _backup_diario(AV2_CSV)
        av2 = cargar_av2().set_index("id_anotacion")
        id_anot = int(id_.removeprefix("av2_"))
        metricas = _metricas_desde_lecturas(lecturas, device_code, nuevo_ts_inicio, nuevo_ts_fin)
        av2.loc[id_anot, "t_inicio"] = nuevo_ts_inicio.isoformat()
        av2.loc[id_anot, "t_fin"] = nuevo_ts_fin.isoformat()
        av2.loc[id_anot, "categoria"] = nueva_categoria
        for campo, valor in metricas.items():
            av2.loc[id_anot, campo] = valor
        av2.reset_index().to_csv(AV2_CSV, index=False)
    else:
        _backup_diario(REVISION_CSV)
        cid = id_.removeprefix("cand_")
        revision = cargar_revision()
        if "candidato_id" not in revision.columns:
            revision = pd.DataFrame(
                columns=["candidato_id", "veredicto", "ts_inicio_corregido", "ts_fin_corregido"]
            )
        revision = revision.set_index("candidato_id")
        if cid not in revision.index:
            revision.loc[cid] = pd.NA
        revision.loc[cid, "veredicto"] = nueva_categoria
        revision.loc[cid, "ts_inicio_corregido"] = nuevo_ts_inicio.isoformat()
        revision.loc[cid, "ts_fin_corregido"] = nuevo_ts_fin.isoformat()
        revision.reset_index().to_csv(REVISION_CSV, index=False)


def borrar_anotacion(fila: pd.Series) -> None:
    """Elimina la anotación de la base unificada Y de su fuente legada --
    pensado para el caso real que encontró Mauro: 2 candidatos con id
    distinto que son casi el mismo evento (misma comida/servido detectada
    dos veces), donde uno de los dos sobra. Con backup diario antes de
    borrar, igual que al editar."""
    id_ = fila["id"]

    _backup_diario(UNIFICADA_CSV)
    base = pd.read_csv(UNIFICADA_CSV)
    base = base[base["id"] != id_]
    base.to_csv(UNIFICADA_CSV, index=False)

    if id_.startswith("av2_"):
        _backup_diario(AV2_CSV)
        av2 = cargar_av2()
        id_anot = int(id_.removeprefix("av2_"))
        av2 = av2[av2["id_anotacion"] != id_anot]
        av2.to_csv(AV2_CSV, index=False)
    else:
        _backup_diario(REVISION_CSV)
        cid = id_.removeprefix("cand_")
        revision = cargar_revision()
        revision = revision[revision["candidato_id"] != cid]
        revision.to_csv(REVISION_CSV, index=False)


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
st.title("Anotaciones")
st.caption(
    "Base única de KPCL0034 (`data/anotaciones_unificadas.csv`) -- una sola categorización "
    "(alimentacion/servido/ruido), sin distinguir anotación real de candidato confirmado. "
    "Elegí una fila para ver su curva y corregir hora/categoría con contexto real."
)

lecturas = cargar_lecturas()
tabla = cargar_base_unificada()

col_f1, col_f2 = st.columns([2, 1])
with col_f1:
    categorias_filtro = st.multiselect("Categoría", CATEGORIAS, default=CATEGORIAS)
with col_f2:
    solo_pendientes = st.checkbox(
        "Solo pendientes de revisar",
        help="Todo lo que ya estaba en la base quedó marcado como revisado "
             "(2026-09-09) -- esto solo va a mostrar algo cuando aparezcan "
             "anotaciones nuevas (una recalibración que promueva más "
             "candidatos, por ejemplo).",
    )

col_c1, col_c2 = st.columns([2, 1])
with col_c1:
    solo_conflictos = st.checkbox(
        "⚠️ Mostrar solo candidatos solapados o muy cerca (posibles duplicados)",
        help="Ordenadas por hora de inicio, así que cada par sospechoso queda "
             "una al lado de la otra -- elegí una, corregila o eliminala.",
    )
with col_c2:
    margen_min = st.slider(
        "Margen de cercanía (min)", min_value=0, max_value=15, value=3,
        disabled=not solo_conflictos,
        help="0 = solo los que se solapan en el tiempo. Más alto también "
             "agarra pares pegados sin llegar a solaparse -- el patrón real "
             "que encontró Mauro (misma comida/servido detectada 2 veces "
             "con id distinto).",
    )

pares_conflicto = todos_los_conflictos(tabla, margen_segundos=margen_min * 60)
ids_conflicto = {i for par in pares_conflicto for i in par}
if solo_conflictos:
    st.caption(
        f"{len(ids_conflicto):,} anotaciones en {len(pares_conflicto):,} pares "
        f"sospechosos (margen {margen_min} min)."
    )

vista = tabla[tabla["categoria"].isin(categorias_filtro)].copy()
if solo_pendientes:
    vista = vista[~vista["revisado"]]
if solo_conflictos:
    vista = vista[vista["id"].isin(ids_conflicto)]
st.caption(f"{len(vista):,} de {len(tabla):,} anotaciones (filtradas)")

vista_mostrar = vista.copy()
vista_mostrar["Inicio (Santiago)"] = vista_mostrar["ts_inicio"].dt.tz_convert(TZ_STGO).dt.strftime(
    "%Y-%m-%d %H:%M:%S"
)
vista_mostrar["Fin (Santiago)"] = vista_mostrar["ts_fin"].dt.tz_convert(TZ_STGO).dt.strftime(
    "%Y-%m-%d %H:%M:%S"
)
vista_mostrar["Revisado"] = vista_mostrar["revisado"].map({True: "✅", False: "⬜"})

# Selección trackeada por ID propio (session_state["id_seleccionado"]), NO
# por el índice posicional que devuelve st.dataframe -- 3 intentos previos
# (limpiar la variable local, limpiar session_state["tabla_anotaciones"]
# antes/después del widget) seguían rompiéndose de formas distintas después
# de un borrado o al pasar a otra anotación. Un índice posicional es frágil
# por diseño: se corre cada vez que la tabla cambia de tamaño (borrar,
# cambiar un filtro), y reescribir a mano el session_state de un widget de
# selección tan complejo como st.dataframe resultó no ser confiable. Un id
# de texto no se corre nunca -- simplemente deja de estar en `vista` cuando
# se borra, caso que ya se maneja abajo.
_limpiar = st.session_state.pop("_limpiar_seleccion", False)
if _limpiar:
    st.session_state["id_seleccionado"] = None

seleccion = st.dataframe(
    vista_mostrar[["id", "device_code", "Inicio (Santiago)", "Fin (Santiago)", "categoria", "Revisado"]],
    hide_index=True,
    width="stretch",
    height=380,
    on_select="rerun",
    selection_mode="single-row",
    key="tabla_anotaciones",
)
filas_widget = seleccion.selection.rows if seleccion and seleccion.selection else []
# No sincronizar desde el widget en la misma pasada en la que se pidió
# limpiar -- el valor que devuelve todavía puede ser el índice viejo previo
# al borrado/cambio, y pisaría el None que se acaba de setear arriba.
if not _limpiar and filas_widget and filas_widget[0] < len(vista):
    st.session_state["id_seleccionado"] = vista.iloc[filas_widget[0]]["id"]

id_seleccionado = st.session_state.get("id_seleccionado")
_ids_visibles = set(vista["id"])
if id_seleccionado is None or id_seleccionado not in _ids_visibles:
    st.info("👆 Hacé click en una fila para ver su curva y editarla.")
else:
    fila = vista[vista["id"] == id_seleccionado].iloc[0]
    st.divider()
    st.subheader(f"Anotación {fila['id']} -- {'✅ revisado' if fila['revisado'] else '⬜ pendiente de revisar'}")

    col_g, col_e = st.columns([3, 2], gap="medium")

    with col_e:
        if not fila["revisado"]:
            # Cuando la categoría sugerida ya está bien, no hay nada que
            # "editar" -- sin este botón la única forma de marcar revisado
            # era tocar el formulario y Guardar aunque no cambiara nada, y
            # en la práctica eso hacía que confirmar "está bien así" se
            # saltara sin querer (hallazgo real: 14 candidatos quedaron
            # pendientes pese a haber sido mirados).
            if st.button(
                "✅ Confirmar tal cual (el modelo acertó)", key=f"confirmar_{fila['id']}"
            ):
                guardar_anotacion(lecturas, fila, fila["categoria"], fila["ts_inicio"], fila["ts_fin"])
                st.cache_data.clear()
                st.session_state["_limpiar_seleccion"] = True
                st.toast("Confirmado.", icon="✅")
                st.rerun()
            st.caption("¿Hay que corregir hora o categoría? Editá abajo y guardá.")

        categoria_nueva = st.radio(
            "Categoría", CATEGORIAS,
            index=CATEGORIAS.index(fila["categoria"]) if fila["categoria"] in CATEGORIAS else 0,
            key=f"cat_{fila['id']}",
        )
        _ini_stgo = fila["ts_inicio"].tz_convert(TZ_STGO)
        _fin_stgo = fila["ts_fin"].tz_convert(TZ_STGO)
        c1, c2 = st.columns(2)
        with c1:
            fecha_ini = st.date_input("Fecha inicio", value=_ini_stgo.date(), key=f"fi_{fila['id']}")
            hora_ini = st.time_input("Hora inicio", value=_ini_stgo.time(), step=60, key=f"hi_{fila['id']}")
        with c2:
            fecha_fin = st.date_input("Fecha fin", value=_fin_stgo.date(), key=f"ff_{fila['id']}")
            hora_fin = st.time_input("Hora fin", value=_fin_stgo.time(), step=60, key=f"hf_{fila['id']}")

        nuevo_ini = pd.Timestamp(f"{fecha_ini}T{hora_ini}").tz_localize(TZ_STGO).tz_convert("UTC")
        nuevo_fin = pd.Timestamp(f"{fecha_fin}T{hora_fin}").tz_localize(TZ_STGO).tz_convert("UTC")

        if st.button("💾 Guardar", type="primary", key=f"guardar_{fila['id']}"):
            if nuevo_fin <= nuevo_ini:
                st.error("⚠️ El fin tiene que ser posterior al inicio.")
            else:
                # Guarda siempre -- el solapamiento NO bloquea. Trabajando un
                # par sospechoso, corregir una de las dos anotaciones
                # mientras la otra todavía existe (sin borrarla todavía) es
                # exactamente el flujo real: ajustar una, después eliminar
                # la que sobra. Solo se avisa si sigue quedando solapada.
                tabla_propuesta = tabla.set_index("id")
                tabla_propuesta.loc[fila["id"], ["ts_inicio", "ts_fin", "categoria"]] = [
                    nuevo_ini, nuevo_fin, categoria_nueva,
                ]
                conflicto = encontrar_solapamiento(
                    tabla_propuesta.reset_index(), ids_cambiados={fila["id"]}
                )
                guardar_anotacion(lecturas, fila, categoria_nueva, nuevo_ini, nuevo_fin)
                st.cache_data.clear()
                # Mismo motivo que en Eliminar: si el cambio de categoría
                # saca la fila de los filtros activos, el índice de
                # selección viejo queda inválido en el próximo rerun.
                st.session_state["_limpiar_seleccion"] = True
                if conflicto is not None:
                    # st.toast (no st.warning) porque sobrevive al st.rerun()
                    # de abajo -- un st.warning quedaría tapado al instante.
                    st.toast(
                        f"Guardado, pero '{conflicto[0]}' y '{conflicto[1]}' quedan "
                        "solapadas -- si son la misma comida/servido dos veces, "
                        "eliminá la que sobra.",
                        icon="⚠️",
                    )
                else:
                    st.toast("Guardado.", icon="✅")
                st.rerun()

        _choca_con = sorted(
            {b for a, b in pares_conflicto if a == fila["id"]}
            | {a for a, b in pares_conflicto if b == fila["id"]}
        )
        if _choca_con:
            st.caption(f"⚠️ Choca o está muy cerca de: {', '.join(_choca_con)}")

        st.divider()
        _clave_confirmar = f"confirmar_borrado_{fila['id']}"
        if not st.session_state.get(_clave_confirmar):
            # on_click, no "if st.button(): st.session_state[...] = True" --
            # ese patrón evalúa el if/else de arriba ANTES de que el propio
            # click alcance a actualizar la bandera en la misma pasada, así
            # que la confirmación recién se ve al rerun siguiente (con
            # st.rerun() explícito debería funcionar iguel, pero on_click es
            # el patrón que Streamlit documenta para esto -- corre el
            # callback ANTES del rerun automático, sin ambigüedad de orden).
            st.button(
                "🗑️ Eliminar esta anotación", key=f"borrar_{fila['id']}",
                on_click=lambda k=_clave_confirmar: st.session_state.update({k: True}),
            )
        else:
            st.warning(
                f"¿Seguro que querés eliminar **{fila['id']}** ({fila['categoria']}, "
                f"{_ini_stgo:%Y-%m-%d %H:%M:%S})? No se puede deshacer desde acá "
                "(queda en el backup diario)."
            )
            col_si, col_no = st.columns(2)
            with col_si:
                if st.button("Sí, eliminar", type="primary", key=f"borrar_si_{fila['id']}"):
                    borrar_anotacion(fila)
                    st.cache_data.clear()
                    del st.session_state[_clave_confirmar]
                    # La fila eliminada desaparece de `vista` -- si no se
                    # limpia la selección, el índice viejo queda apuntando a
                    # otra fila (o directamente fuera de rango) en el próximo
                    # rerun, y el panel entero revienta con un IndexError.
                    # Bug real que rompía "eliminar" (y también "guardar" si
                    # el filtro sacaba la fila de la vista) después de varias
                    # operaciones seguidas.
                    st.session_state["_limpiar_seleccion"] = True
                    st.toast("Eliminada.", icon="🗑️")
                    st.rerun()
            with col_no:
                if st.button("Cancelar", key=f"borrar_no_{fila['id']}"):
                    del st.session_state[_clave_confirmar]
                    st.rerun()

    with col_g:
        _corregido = (nuevo_ini, nuevo_fin) if (nuevo_ini, nuevo_fin) != (fila["ts_inicio"], fila["ts_fin"]) else None
        st.plotly_chart(
            graficar_anotacion(
                lecturas, fila["device_code"], fila["ts_inicio"], fila["ts_fin"], corregido=_corregido
            ),
            width="stretch",
        )
