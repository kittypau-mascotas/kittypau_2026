"""
Anotaciones — revisión y edición unificada de TODAS las anotaciones ya hechas
de KPCL0034. Reemplaza por completo la versión anterior de este archivo (que
era un explorador de clustering/candidatos) — a pedido de Mauro, ahora es
únicamente una tabla de revisión/edición.

Une 2 fuentes que hasta ahora vivían separadas:
  - anotaciones_av2.csv        743 anotaciones reales originales, cada una
                                con su propio id_anotacion (Ciclo_Alpha_v2/
                                fase_0_ruido, hecha en app_anotacion_av2.py).
  - revision_sin_anotacion.csv veredictos manuales sobre candidatos que NO
                                tenían ninguna anotación real cerca
                                (Investigacion_v2, candidato_id como id).

Regla del pedido: "no se deben solapar categorías" — un candidato cuyo
categoria_real salió de solaparse en el tiempo con una anotación real
(notebook 08) NO se lista aparte acá: sería la misma comida/ruido/servido
contado dos veces. Solo entran los candidatos con veredicto manual PROPIO
(genuinamente sin anotación real preexistente) — el resto ya está cubierto
por su fila de anotaciones_av2.csv.

Edición vía tabla editable (st.data_editor) — cambiar hora o categoría
directo en la celda. Al guardar: valida que ninguna anotación quede
solapada en el tiempo con otra del mismo dispositivo contra la TABLA
COMPLETA (no solo lo que está filtrado en pantalla); si hay conflicto
rechaza el guardado entero y muestra cuál par choca. Si está todo bien,
escribe cada fila cambiada de vuelta a su archivo de origen, con backup
diario (una copia por día, no una por guardado) antes del primer write.

Correr con: streamlit run app_candidatos.py
"""
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st

NOTEBOOK_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = NOTEBOOK_DIR / "data"
BACKUPS_DIR = DATA_DIR / "backups"
CACHE_CSV = DATA_DIR / "lecturas_limpias.csv"
CANDIDATOS_CSV = DATA_DIR / "candidatos_clusters_duracion.csv"
REVISION_CSV = DATA_DIR / "revision_sin_anotacion.csv"
AV2_CSV = (
    NOTEBOOK_DIR.parent / "Ciclo_Alpha_v2" / "fase_0_ruido" / "data" / "anotaciones_av2.csv"
)

CATEGORIAS = ["alimentacion", "servido", "ruido"]
TZ_STGO = "America/Santiago"

st.set_page_config(page_title="Anotaciones - Investigacion_v2", layout="wide")


# ─────────────────────────────────────────────────────────────────────────────
# Carga
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


def construir_tabla_unificada() -> pd.DataFrame:
    """Une anotaciones_av2.csv + los veredictos manuales de revision_sin_anotacion.csv
    que tienen categoría real confirmada -- ver docstring del módulo para la regla
    de no-duplicar/no-solapar."""
    av2 = cargar_av2()
    filas_av2 = pd.DataFrame(
        {
            "id": "av2_" + av2["id_anotacion"].astype(str),
            "device_code": av2["device_code"],
            "ts_inicio": av2["t_inicio"],
            "ts_fin": av2["t_fin"],
            "categoria": av2["categoria"],
            "origen": "anotacion_real",
        }
    )

    revision = cargar_revision()
    confirmados = revision[revision["veredicto"].isin(CATEGORIAS)].copy()
    candidatos = cargar_candidatos()
    confirmados = confirmados.merge(candidatos, on="candidato_id", how="left")
    _sin_match = confirmados["device_code"].isna()
    if _sin_match.any():
        st.warning(
            f"{_sin_match.sum()} veredicto(s) en revision_sin_anotacion.csv no encontraron "
            "su candidato en candidatos_clusters_duracion.csv -- se omiten de la tabla "
            "(no se puede saber su hora)."
        )
        confirmados = confirmados[~_sin_match]

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
            "origen": "candidato_confirmado",
        }
    )

    tabla = pd.concat([filas_av2, filas_cand], ignore_index=True)
    return tabla.sort_values("ts_inicio").reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────────────────
# Validación
# ─────────────────────────────────────────────────────────────────────────────
def encontrar_solapamiento(
    tabla: pd.DataFrame, ids_cambiados: set[str] | None = None
) -> tuple[str, str] | None:
    """Barre por dispositivo, ordenado por ts_inicio, y devuelve el primer par
    de ids que se solapa en el tiempo (o None si no hay ninguno). No es
    exhaustivo (puede haber más de un par) -- alcanza para bloquear el guardado
    y que el operador corrija de a uno, igual que un linter.

    Si se pasa `ids_cambiados`, solo cuenta como conflicto un par donde AL
    MENOS uno de los dos ids está en ese set -- es decir, solo bloquea
    solapamientos NUEVOS causados por esta edición, no los 232 pares que ya
    existían de antes en anotaciones_av2.csv (hallazgo real, ver README --
    exigir que estén todos resueltos antes de poder guardar cualquier cosa
    haría la tabla imposible de usar)."""
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
    """Mismo cálculo que calcular_metricas() de app_anotacion_av2.py, sobre las
    columnas de Investigacion_v2 (ts/peso en vez de ts/peso_g)."""
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


def guardar_cambios_av2(lecturas: pd.DataFrame, filas_cambiadas: pd.DataFrame) -> None:
    """filas_cambiadas: id/device_code/ts_inicio/ts_fin/categoria de las filas
    origen=anotacion_real que cambiaron. Reescribe anotaciones_av2.csv completo
    (mismo patrón que save_anotacion() de app_anotacion_av2.py), preservando
    todas las columnas que esta app no edita (notas, created_at, etc.)."""
    if filas_cambiadas.empty:
        return
    _backup_diario(AV2_CSV)
    av2 = cargar_av2()
    av2 = av2.set_index("id_anotacion")
    for _, fila in filas_cambiadas.iterrows():
        id_anot = int(fila["id"].removeprefix("av2_"))
        metricas = _metricas_desde_lecturas(
            lecturas, fila["device_code"], fila["ts_inicio"], fila["ts_fin"]
        )
        av2.loc[id_anot, "t_inicio"] = fila["ts_inicio"].isoformat()
        av2.loc[id_anot, "t_fin"] = fila["ts_fin"].isoformat()
        av2.loc[id_anot, "categoria"] = fila["categoria"]
        for campo, valor in metricas.items():
            av2.loc[id_anot, campo] = valor
    av2.reset_index().to_csv(AV2_CSV, index=False)


def guardar_cambios_candidatos(filas_cambiadas: pd.DataFrame) -> None:
    """filas_cambiadas: id/ts_inicio/ts_fin/categoria de las filas
    origen=candidato_confirmado que cambiaron. Actualiza revision_sin_anotacion.csv
    (veredicto + ts_*_corregido) -- guardar_revision() ya existía con este mismo
    patrón parcial (solo pisa lo que se pasa)."""
    if filas_cambiadas.empty:
        return
    _backup_diario(REVISION_CSV)
    revision = cargar_revision()
    if "candidato_id" not in revision.columns:
        revision = pd.DataFrame(
            columns=["candidato_id", "veredicto", "ts_inicio_corregido", "ts_fin_corregido"]
        )
    revision = revision.set_index("candidato_id")
    for _, fila in filas_cambiadas.iterrows():
        cid = fila["id"].removeprefix("cand_")
        if cid not in revision.index:
            revision.loc[cid] = pd.NA
        revision.loc[cid, "veredicto"] = fila["categoria"]
        revision.loc[cid, "ts_inicio_corregido"] = fila["ts_inicio"].isoformat()
        revision.loc[cid, "ts_fin_corregido"] = fila["ts_fin"].isoformat()
    revision.reset_index().to_csv(REVISION_CSV, index=False)


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
st.title("Anotaciones")
st.caption(
    "Todas las anotaciones ya hechas de KPCL0034 -- 743 reales "
    "(`anotaciones_av2.csv`) + los veredictos manuales confirmados que no "
    "tenían anotación real cerca (`revision_sin_anotacion.csv`). Editá hora "
    "o categoría directo en la tabla y guardá; no se permite que dos "
    "anotaciones queden solapadas en el tiempo."
)

lecturas = cargar_lecturas()
tabla = construir_tabla_unificada()

col_f1, col_f2 = st.columns([2, 1])
with col_f1:
    categorias_filtro = st.multiselect("Categoría", CATEGORIAS, default=CATEGORIAS)
with col_f2:
    origenes_filtro = st.multiselect(
        "Origen",
        ["anotacion_real", "candidato_confirmado"],
        default=["anotacion_real", "candidato_confirmado"],
    )

vista = tabla[
    tabla["categoria"].isin(categorias_filtro) & tabla["origen"].isin(origenes_filtro)
].copy()
st.caption(f"{len(vista):,} de {len(tabla):,} anotaciones (filtradas)")

vista["Inicio (Santiago)"] = vista["ts_inicio"].dt.tz_convert(TZ_STGO).dt.tz_localize(None)
vista["Fin (Santiago)"] = vista["ts_fin"].dt.tz_convert(TZ_STGO).dt.tz_localize(None)

editado = st.data_editor(
    vista[["id", "device_code", "Inicio (Santiago)", "Fin (Santiago)", "categoria", "origen"]],
    column_config={
        "id": st.column_config.TextColumn("ID", disabled=True),
        "device_code": st.column_config.TextColumn("Dispositivo", disabled=True),
        "Inicio (Santiago)": st.column_config.DatetimeColumn(
            "Inicio (Santiago)", step=60, format="YYYY-MM-DD HH:mm:ss"
        ),
        "Fin (Santiago)": st.column_config.DatetimeColumn(
            "Fin (Santiago)", step=60, format="YYYY-MM-DD HH:mm:ss"
        ),
        "categoria": st.column_config.SelectboxColumn("Categoría", options=CATEGORIAS),
        "origen": st.column_config.TextColumn("Origen", disabled=True),
    },
    hide_index=True,
    width="stretch",
    height=560,
    key="editor_anotaciones",
)

if st.button("💾 Guardar cambios", type="primary"):
    editado_ts = editado.copy()
    editado_ts["ts_inicio"] = (
        pd.to_datetime(editado_ts["Inicio (Santiago)"]).dt.tz_localize(TZ_STGO).dt.tz_convert("UTC")
    )
    editado_ts["ts_fin"] = (
        pd.to_datetime(editado_ts["Fin (Santiago)"]).dt.tz_localize(TZ_STGO).dt.tz_convert("UTC")
    )

    if (editado_ts["ts_fin"] <= editado_ts["ts_inicio"]).any():
        st.error("⚠️ Hay una fila donde el fin no es posterior al inicio -- corregila antes de guardar.")
    else:
        # Aplicar la edición (solo de lo filtrado en pantalla) sobre la tabla
        # COMPLETA -- el chequeo de solapamiento tiene que ver todo, no solo
        # lo que está visible con el filtro actual.
        tabla_actualizada = tabla.set_index("id")
        cambios = editado_ts.set_index("id")
        # Solo lo que está visible con el filtro actual pasó por el editor --
        # comparar contra ESE mismo subconjunto de "original", no contra toda
        # la tabla (si no, cada fila filtrada-fuera compara contra NaN y
        # parece "cambiada" por error).
        original_visible = tabla.set_index("id").loc[cambios.index]
        distintos = (
            (original_visible["ts_inicio"] != cambios["ts_inicio"])
            | (original_visible["ts_fin"] != cambios["ts_fin"])
            | (original_visible["categoria"] != cambios["categoria"])
        )
        ids_cambiados = set(cambios[distintos].index)
        tabla_actualizada.update(cambios[["ts_inicio", "ts_fin", "categoria"]])
        tabla_actualizada = tabla_actualizada.reset_index()

        if not ids_cambiados:
            st.info("No hay cambios para guardar.")
        else:
            # Solo bloquea si ESTA edición crea un solapamiento nuevo -- los
            # que ya existían de antes en anotaciones_av2.csv (232 pares, ver
            # docstring de encontrar_solapamiento) no impiden guardar algo
            # que no tiene nada que ver con ellos.
            conflicto = encontrar_solapamiento(tabla_actualizada, ids_cambiados)
            if conflicto is not None:
                st.error(
                    f"⚠️ '{conflicto[0]}' y '{conflicto[1]}' quedarían solapadas en el tiempo -- "
                    "corregí una de las dos y volvé a guardar. No se guardó nada."
                )
            else:
                actualizado_idx = tabla_actualizada.set_index("id")
                cambiadas = actualizado_idx.loc[list(ids_cambiados)].reset_index()
                guardar_cambios_av2(
                    lecturas, cambiadas[cambiadas["origen"] == "anotacion_real"]
                )
                guardar_cambios_candidatos(
                    cambiadas[cambiadas["origen"] == "candidato_confirmado"]
                )
                st.success(f"Guardadas {len(cambiadas)} anotación(es) editada(s).")
                st.rerun()
