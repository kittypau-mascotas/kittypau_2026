"""
app_anotacion_av2.py — Alpha v2

Herramienta de anotación Y análisis visual de curvas de peso.
Sin modelos ML — el detector son reglas manuales que el operador ajusta
a medida que estudia los datos.

Tabs:
  0. Vista Global          — curva completa + toggles por categoría
  1. Revisar Candidatos    — anotar candidatos uno por uno
  2. Analizar Curva        — distribuciones + pruebas de normalidad
  3. Comparar Curvas       — spaghetti + detector de outliers
  4. Panel de Features     — observación de todas las features
  5. Motor Matemático v2   — 102 features + Atlas de Familias F00-F14
  6. Anotaciones           — lista de anotaciones guardadas
  7. Próxima Comida        — predicciones + patrón semanal
  8. Kittypau              — dashboard cliente + panel Sims

Datos: siempre desde CSV local.
Para actualizar datos desde Supabase usar el botón "🔄 Actualizar Todo".

Ejecutar:
    python -m streamlit run app_anotacion_av2.py
"""

from __future__ import annotations

import concurrent.futures
import json
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from scipy import stats as _scipy_stats

try:
    from statsmodels.stats.diagnostic import lilliefors as _lilliefors
    _HAS_LILLIEFORS = True
except Exception:
    _HAS_LILLIEFORS = False

# Motor matemático v2 (mismo directorio)
try:
    from shape_features_v2 import (
        extraer_features as _extraer_v2,
        evidence_score,
        clasificar as _clasificar_v2,
        resumen_features,
        REGISTRY,
        feature_list_by_family,
    )
    _MOTOR_V2_OK = True
except ImportError:
    _MOTOR_V2_OK = False

# Supabase / PostgreSQL — solo para sync incremental (botón "Actualizar Todo")
try:
    from supabase_client import sync_readings_incremental
    _SUPABASE_SYNC_OK = True
except ImportError:
    _SUPABASE_SYNC_OK = False
    def sync_readings_incremental(**kwargs):  # type: ignore[misc]
        return {"readings": 0, "readings_rows": 0, "since_iso": "1970-01-01T00:00:00"}

# ─── Rutas ───────────────────────────────────────────────────────────────────
SCRIPT_DIR      = Path(__file__).parent
DATA_DIR        = SCRIPT_DIR / "data"
CONFIG_DIR      = SCRIPT_DIR / "config"
CANDIDATOS_CSV  = DATA_DIR / "candidatos_av2.csv"
ANOTACIONES_CSV = DATA_DIR / "anotaciones_av2.csv"
UMBRALES_JSON   = CONFIG_DIR / "umbrales.json"
COMP_STATS_JSON = DATA_DIR / "comp_stats_v2.json"

SCRIPT_CANDIDATOS = SCRIPT_DIR / "01_genera_candidatos.py"
SCRIPT_REVISAR    = SCRIPT_DIR / "revisar_anotaciones_v2.py"

# Datos crudos en Docs/11_Data/2026/ (3 niveles arriba → Docs/)
RAW_DATA_DIR      = SCRIPT_DIR.parent.parent.parent / "11_Data" / "2026"
READINGS_CSV      = RAW_DATA_DIR / "readings.csv"
READINGS_ROWS_CSV = RAW_DATA_DIR / "readings_rows.csv"
# Cache procesado en disco — se regenera solo cuando los CSVs son más nuevos
_LECTURAS_CACHE_PARQUET = DATA_DIR / "_cache_lecturas_30s.parquet"
CICLOS_CSV              = DATA_DIR / "ciclos_servido_alimento.csv"
BACKUPS_DIR             = DATA_DIR / "backups"
BACKUPS_DIR.mkdir(exist_ok=True)

# Cache de mtime por rerun — evita N×2 llamadas stat() por cada @st.cache_data hash.
# Se limpia al inicio de main() para garantizar frescura.
_mtime_cache: dict[str, object] = {}

# UUIDs de KPCL0034 (food_bowl "Bandida")
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo-Junio 2026
}

TZ_STGO     = ZoneInfo("America/Santiago")
RESAMPLE_S  = 30
BUFFER_MIN  = 5
DEVICE_CODE = "KPCL0034"

# ─── Taxonomía ───────────────────────────────────────────────────────────────
CATEGORIAS: dict[str, tuple[str, str, str]] = {
    "alimentacion": ("🍽️ Alimentación", "#00b45a",
                     "Bandida come — peso baja 5–15 g en 4–8 min con patrón de doble rampa: come ~2 min, pausa, sigue ~2 min. "
                     "Monotonía ≈ −0.20 (baja el 60 % del tiempo), ZCR ≈ 0.67, entropy_permutation ≈ 0.75"),
    "servido":      ("🫙 Servido",       "#1e64ff",
                     "Agregan comida — peso sube 20–80 g en 30–60 s en forma de sigmoide o rampa ascendente. "
                     "Velocidad máx. ~1.9 g/s (≈5× más rápida que la bajada por alimentación). Monotonía ≈ +0.32"),
    "ruido":        ("⚡ Ruido",         "#ef4444",
                     "Movimiento del bowl o del sensor sin consumo real — perturbación brusca que regresa al nivel inicial en <1 min. "
                     "Sin bajada sostenida (d1_frac_neg < 8 %), spectral_entropy alto (≈2.74), n_plateaus ≈ 1.4"),
    "ciclo_servido_alimento": ("🟡 Ciclo Servido/Alimento", "#facc15",
                     "Período completo desde que se sirve la comida hasta el próximo servido. "
                     "Engloba todos los sub-eventos de un ciclo: servido → alimentación(es) → plateau. "
                     "Duración típica: 18–50 h. Se visualiza como banda amarilla de fondo en Vista Global."),
}

# Variables que definen el detector de curvas
VARIABLES_DETECTOR = [
    ("duracion_min",    "Duración (min)"),
    ("delta_w_g",       "Δpeso (g)"),
    ("rango_g",         "Rango (g)"),
    ("pendiente_g_min", "Pendiente (g/min)"),
    ("monotonicity",    "Monotonía [-1,1]"),
    ("r2_lineal",       "R² lineal [0,1]"),
    ("zcr",             "ZCR derivada [0,1]"),
]

METAS_AV2 = {"alimentacion": 40, "servido": 20, "ruido": 30}

# ─── Config de página ────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Alpha v2 — Curvas de peso",
    page_icon="📡",
    layout="wide",
)


# ─────────────────────────────────────────────────────────────────────────────
# Umbrales
# ─────────────────────────────────────────────────────────────────────────────
_DEFAULTS_U = {
    "umbral_std_g": 1.5, "umbral_delta_g": 5.0, "min_rango_g": 4.0,
    "min_duracion_s": 45, "gap_merge_s": 120,
    "resample_s": 30, "ventana_std_lecturas": 10, "ventana_delta_lecturas": 20,
}


def load_umbrales() -> dict:
    if UMBRALES_JSON.exists():
        with open(UMBRALES_JSON, encoding="utf-8") as f:
            data = json.load(f)
        return {**_DEFAULTS_U, **data.get("deteccion", {})}
    return _DEFAULTS_U.copy()


@st.cache_data(show_spinner=False)
def load_comp_stats() -> tuple[dict, int, int, int]:
    """Lee comp_stats_v2.json. Devuelve (stats_dict, n_alim, n_serv, n_ruido)."""
    if not COMP_STATS_JSON.exists():
        return {}, 0, 0, 0
    with open(COMP_STATS_JSON, encoding="utf-8") as f:
        raw: dict = json.load(f)
    n_a = n_s = n_r = 0
    for feat_st in raw.values():
        a = feat_st.get("alimentacion", {}) or {}
        s = feat_st.get("servido",      {}) or {}
        r = feat_st.get("ruido",        {}) or {}
        if (a.get("n") or 0) and (s.get("n") or 0) and (r.get("n") or 0):
            n_a = int(a["n"]); n_s = int(s["n"]); n_r = int(r["n"])
            break
    return raw, n_a, n_s, n_r


def _necesita_actualizacion() -> tuple[bool, bool]:
    """Devuelve (hay_data_cruda_nueva, hay_anotaciones_nuevas)."""
    raw_t = max(
        READINGS_CSV.stat().st_mtime      if READINGS_CSV.exists()      else 0.0,
        READINGS_ROWS_CSV.stat().st_mtime if READINGS_ROWS_CSV.exists() else 0.0,
    )
    cand_t  = CANDIDATOS_CSV.stat().st_mtime  if CANDIDATOS_CSV.exists()  else 0.0
    anot_t  = ANOTACIONES_CSV.stat().st_mtime if ANOTACIONES_CSV.exists() else 0.0
    stats_t = COMP_STATS_JSON.stat().st_mtime if COMP_STATS_JSON.exists() else 0.0
    return raw_t > cand_t, anot_t > stats_t


def save_umbrales(u: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    existing: dict = {}
    if UMBRALES_JSON.exists():
        with open(UMBRALES_JSON, encoding="utf-8") as f:
            existing = json.load(f)
    existing["deteccion"] = u
    with open(UMBRALES_JSON, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)


# ─────────────────────────────────────────────────────────────────────────────
# Carga de datos
# ─────────────────────────────────────────────────────────────────────────────
def _csv_max_mtime() -> float:
    """Mtime más reciente entre los dos CSVs fuente.
    Resultado cacheado en _mtime_cache para este rerun — evita N×stat() en hash_funcs."""
    if "csv" in _mtime_cache:
        return _mtime_cache["csv"]  # type: ignore[return-value]
    v = max(
        READINGS_CSV.stat().st_mtime      if READINGS_CSV.exists()      else 0.0,
        READINGS_ROWS_CSV.stat().st_mtime if READINGS_ROWS_CSV.exists() else 0.0,
    )
    _mtime_cache["csv"] = v
    return v


def _parquet_is_fresh() -> bool:
    if not _LECTURAS_CACHE_PARQUET.exists():
        return False
    return _LECTURAS_CACHE_PARQUET.stat().st_mtime >= _csv_max_mtime()


def _build_lecturas_df(pb=None) -> pd.DataFrame | None:
    """
    Lee ambos CSVs en paralelo con PyArrow (~5x más rápido que el engine C),
    filtra KPCL0034, resamplea a 30 s y guarda parquet en disco.
    `pb` es un st.progress opcional que se actualiza en cada paso.
    """
    if not READINGS_CSV.exists() or not READINGS_ROWS_CSV.exists():
        return None

    def _upd(pct: int, msg: str) -> None:
        if pb is not None:
            pb.progress(pct, text=msg)

    _USECOLS = ["device_id", "ingested_at", "weight_grams"]

    _upd(5, "📂 Leyendo CSVs en paralelo con PyArrow…")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as _ex:
        _f1 = _ex.submit(pd.read_csv, READINGS_CSV,      usecols=_USECOLS, engine="pyarrow")
        _f2 = _ex.submit(pd.read_csv, READINGS_ROWS_CSV, usecols=_USECOLS, engine="pyarrow")
        df1 = _f1.result()
        df2 = _f2.result()

    _upd(55, "🔍 Filtrando lecturas KPCL0034…")
    df = pd.concat(
        [df1[df1["device_id"].isin(KPCL0034_UUIDS)],
         df2[df2["device_id"].isin(KPCL0034_UUIDS)]],
        ignore_index=True,
    )

    _upd(68, "⏱️ Parseando timestamps…")
    df["ts"]     = pd.to_datetime(df["ingested_at"], format="ISO8601", utc=True)
    df["peso_g"] = pd.to_numeric(df["weight_grams"], errors="coerce")
    df = (
        df[["ts", "peso_g"]]
        .dropna(subset=["ts"])
        .drop_duplicates(subset=["ts"])
        .sort_values("ts")
        .reset_index(drop=True)
    )

    _upd(82, "📊 Resampleando a 30 s…")
    serie = df.set_index("ts")["peso_g"].resample(f"{RESAMPLE_S}s").mean().ffill(limit=2)
    out = serie.reset_index()
    out.columns = ["ts", "peso_g"]

    _upd(93, "💾 Guardando caché parquet…")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out.to_parquet(_LECTURAS_CACHE_PARQUET, index=False)

    _upd(100, "✅ ¡Lecturas listas!")
    return out


def load_lecturas() -> pd.DataFrame | None:
    """
    Carga lecturas KPCL0034 resampleadas a 30 s. Tres capas de caché:
      1. st.session_state  — instantáneo en reruns de la misma sesión
      2. Parquet en disco  — ~0.3 s, sobrevive reinicios del servidor
      3. Parseo CSV        — ~5–10 s con PyArrow + paralelo (solo al generar/invalidar)
    """
    csv_mtime = _csv_max_mtime()

    # Capa 1: session_state — sin I/O, retorno inmediato
    if st.session_state.get("_df_lec_mtime", 0.0) >= csv_mtime:
        return st.session_state.get("_df_lec")

    # Capa 2: parquet en disco — rápido (~0.3 s)
    if _parquet_is_fresh():
        with st.spinner("💽 Cargando caché local…"):
            df = pd.read_parquet(_LECTURAS_CACHE_PARQUET)
        st.session_state["_df_lec"]       = df
        st.session_state["_df_lec_mtime"] = csv_mtime
        return df

    # Capa 3: parseo desde CSV con barra de progreso real
    _ph = st.empty()
    with _ph.container():
        st.info("⏳ Primera carga — procesando lecturas desde CSV (solo ocurre una vez)…")
        pb = st.progress(0, text="Iniciando…")
    try:
        out = _build_lecturas_df(pb)
    finally:
        _ph.empty()

    if out is not None:
        st.session_state["_df_lec"]       = out
        st.session_state["_df_lec_mtime"] = csv_mtime
    return out



@st.cache_data(
    ttl=300, show_spinner=False,
    hash_funcs={pd.DataFrame: lambda _: _csv_max_mtime()},
)
def _evidence_ventana_cached(df_lec: pd.DataFrame, minutos: int) -> dict | None:
    """
    Calcula Evidence Engine sobre los últimos `minutos` minutos de lecturas.
    TTL=5 min y hash barato del DataFrame (mtime). Evita recalcular 102 features
    en cada rerun del Tab 7 y Tab 8.
    """
    if not _MOTOR_V2_OK:
        return None
    ventana = pd.Timestamp.now(tz="UTC") - pd.Timedelta(minutes=minutos)
    sub = df_lec[df_lec["ts"] >= ventana]["peso_g"].dropna()
    if len(sub) < 3:
        return None
    fv = _extraer_v2(sub.values, resample_s=RESAMPLE_S)
    return {
        "feats":     fv,
        "ev":        evidence_score(fv),
        "sub_len":   len(sub),
        "peso_now":  float(sub.iloc[-1]),
        "delta_now": float(sub.iloc[-1] - sub.iloc[0]),
    }


@st.cache_data(
    show_spinner=False,
    max_entries=500,
    hash_funcs={np.ndarray: lambda a: (a.tobytes(), len(a))},
)
def _calcular_features_v2_cached(valores: np.ndarray, resample_s: float) -> dict:
    """Caché de extraer_features v2 — evita recalcular 102 features en cada rerun de Streamlit."""
    return _extraer_v2(valores, resample_s=resample_s)


def load_candidatos() -> pd.DataFrame | None:
    if not CANDIDATOS_CSV.exists():
        return None
    cand_mtime = CANDIDATOS_CSV.stat().st_mtime
    if st.session_state.get("_df_cand_mtime", 0.0) >= cand_mtime:
        return st.session_state["_df_cand"]
    df = pd.read_csv(CANDIDATOS_CSV, engine="pyarrow")
    df["t_inicio"] = pd.to_datetime(df["t_inicio"], format="ISO8601", utc=True)
    df["t_fin"]    = pd.to_datetime(df["t_fin"],    format="ISO8601", utc=True)
    if "id_candidato" not in df.columns:
        df.insert(0, "id_candidato", range(len(df)))
    st.session_state["_df_cand"]       = df
    st.session_state["_df_cand_mtime"] = cand_mtime
    return df


def load_anotaciones() -> pd.DataFrame:
    _cols = ["id_anotacion", "id_candidato", "t_inicio", "t_fin",
             "categoria", "notas", "device_code", "origen", "created_at"]
    if not ANOTACIONES_CSV.exists():
        return pd.DataFrame(columns=_cols)
    anot_mtime = ANOTACIONES_CSV.stat().st_mtime
    if st.session_state.get("_df_anot_mtime", 0.0) >= anot_mtime:
        return st.session_state.get("_df_anot", pd.DataFrame(columns=_cols))
    df = pd.read_csv(ANOTACIONES_CSV, low_memory=False)
    for c in ["t_inicio", "t_fin"]:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], format="ISO8601", utc=True)
    st.session_state["_df_anot"]       = df
    st.session_state["_df_anot_mtime"] = anot_mtime
    return df


def _invalidar_cache_anot() -> None:
    st.session_state.pop("_df_anot", None)
    st.session_state.pop("_df_anot_mtime", None)
    st.session_state.pop("_items_cache_key", None)
    for _k in list(st.session_state.keys()):
        if _k.startswith("_df_anot_merged_"):
            del st.session_state[_k]


def save_anotacion(
    id_candidato: int | None,
    t_inicio: pd.Timestamp,
    t_fin: pd.Timestamp,
    categoria: str,
    notas: str,
    origen: str = "candidato_auto",
) -> None:
    # Backup diario: copia simple, solo una vez por día
    if ANOTACIONES_CSV.exists():
        bk = BACKUPS_DIR / f"anotaciones_av2_backup_{datetime.now().strftime('%Y%m%d')}.csv"
        if not bk.exists():
            shutil.copy2(ANOTACIONES_CSV, bk)

    df_cur = load_anotaciones()

    # Detectar si es re-anotación (ya existe un registro para este candidato)
    is_update = (
        id_candidato is not None
        and "id_candidato" in df_cur.columns
        and bool((df_cur["id_candidato"] == id_candidato).any())
    )

    ids_val = df_cur["id_anotacion"].dropna() if "id_anotacion" in df_cur.columns else pd.Series([], dtype=int)
    nuevo_id = int(ids_val.max() + 1) if len(ids_val) > 0 else 0

    row: dict = {
        "id_anotacion": nuevo_id,
        "id_candidato": id_candidato,
        "t_inicio":     t_inicio.isoformat(),
        "t_fin":        t_fin.isoformat(),
        "categoria":    categoria,
        "notas":        notas or "",
        "device_code":  DEVICE_CODE,
        "origen":       origen,
        "created_at":   datetime.now(timezone.utc).isoformat(),
    }

    if is_update:
        # Re-anotación: reescribir CSV completo (reemplaza la fila anterior)
        df_new = df_cur[df_cur["id_candidato"] != id_candidato].copy()
        pd.concat([df_new, pd.DataFrame([row])], ignore_index=True).to_csv(ANOTACIONES_CSV, index=False)
    else:
        # Primera anotación: append rápido, sin leer ni reescribir el CSV completo
        write_header = not ANOTACIONES_CSV.exists() or ANOTACIONES_CSV.stat().st_size == 0
        pd.DataFrame([row]).to_csv(ANOTACIONES_CSV, mode="a", header=write_header, index=False)

    _invalidar_cache_anot()


def delete_anotacion(id_anotacion: int) -> None:
    df = load_anotaciones()
    df = df[df["id_anotacion"] != id_anotacion]
    df.to_csv(ANOTACIONES_CSV, index=False)
    _invalidar_cache_anot()


@st.cache_data(show_spinner=False)
def load_ciclos() -> pd.DataFrame:
    """Carga ciclos servido/alimento desde CSV. Cada fila es un ciclo manual de ~18–50 h."""
    _cols = ["id_ciclo", "t_inicio", "t_fin", "notas"]
    if not CICLOS_CSV.exists():
        return pd.DataFrame(columns=_cols)
    df = pd.read_csv(CICLOS_CSV)
    for c in ["t_inicio", "t_fin"]:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], format="ISO8601", utc=True)
    return df


def save_ciclo(
    id_ciclo: int | None,
    t_inicio: pd.Timestamp,
    t_fin: pd.Timestamp,
    notas: str,
) -> None:
    """Guarda o sobreescribe un ciclo en ciclos_servido_alimento.csv."""
    if CICLOS_CSV.exists():
        bk = BACKUPS_DIR / f"ciclos_backup_{datetime.now().strftime('%Y%m%d')}.csv"
        if not bk.exists():
            shutil.copy2(CICLOS_CSV, bk)
        df = pd.read_csv(CICLOS_CSV)
    else:
        df = pd.DataFrame(columns=["id_ciclo", "t_inicio", "t_fin", "notas"])

    if id_ciclo is not None:
        df = df[df["id_ciclo"] != id_ciclo].copy()
    else:
        id_ciclo = int(df["id_ciclo"].max() + 1) if len(df) > 0 else 1

    row = {
        "id_ciclo": id_ciclo,
        "t_inicio": t_inicio.isoformat(),
        "t_fin":    t_fin.isoformat(),
        "notas":    "" if (not notas or notas == "nan") else notas,
    }
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df = df.sort_values("id_ciclo").reset_index(drop=True)
    df.to_csv(CICLOS_CSV, index=False)
    load_ciclos.clear()
    for _k in list(st.session_state.keys()):
        if _k.startswith("_df_anot_merged_"):
            del st.session_state[_k]


def delete_ciclo(id_ciclo: int) -> None:
    """Elimina un ciclo de ciclos_servido_alimento.csv."""
    if not CICLOS_CSV.exists():
        return
    df = pd.read_csv(CICLOS_CSV)
    df = df[df["id_ciclo"] != id_ciclo].copy()
    df.to_csv(CICLOS_CSV, index=False)
    load_ciclos.clear()
    for _k in list(st.session_state.keys()):
        if _k.startswith("_df_anot_merged_"):
            del st.session_state[_k]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers reutilizables
# ─────────────────────────────────────────────────────────────────────────────

def _ciclo_composicion_cards(n_serv: int, n_alim: int, n_ruid: int) -> None:
    """3 tarjetas de composición de ciclo: Servido / Alimentaciones / Ruido."""
    _sv_ok     = n_serv == 1
    _sv_border = "#22c55e" if _sv_ok else ("#ef4444" if n_serv == 0 else "#f97316")
    _sv_bg     = "#22c55e18" if _sv_ok else ("#ef444418" if n_serv == 0 else "#f9731618")
    _sv_badge  = (
        "✅ apertura válida" if _sv_ok
        else ("❌ falta el servido de apertura" if n_serv == 0
              else f"⚠️ {n_serv} servidos — ajustar fin del ciclo")
    )
    st.markdown("**Composición del ciclo**")
    _cs, _ca, _cr = st.columns([1, 2, 1], gap="medium")
    with _cs:
        st.markdown(
            f'<div style="border:2px solid {_sv_border};background:{_sv_bg};'
            f'border-radius:10px;padding:16px 8px;text-align:center">'
            f'<div style="font-size:1.5rem">🫙</div>'
            f'<div style="font-size:2.2rem;font-weight:800;line-height:1.1;color:{_sv_border}">{n_serv}</div>'
            f'<div style="font-size:0.7rem;font-weight:700;color:#facc15;letter-spacing:.06em;margin-top:2px">SERVIDO</div>'
            f'<div style="font-size:0.65rem;color:#aaa;margin-top:6px">{_sv_badge}</div></div>',
            unsafe_allow_html=True,
        )
    with _ca:
        st.markdown(
            '<div style="border:2px solid #22c55e;background:#22c55e18;'
            'border-radius:10px;padding:16px 8px;text-align:center">'
            '<div style="font-size:1.5rem">🍽️</div>'
            f'<div style="font-size:3rem;font-weight:800;line-height:1.1;color:#22c55e">{n_alim}</div>'
            '<div style="font-size:0.7rem;font-weight:700;color:#22c55e;letter-spacing:.06em;margin-top:2px">ALIMENTACIONES</div>'
            '<div style="font-size:0.65rem;color:#aaa;margin-top:6px">veces que comió Bandida</div></div>',
            unsafe_allow_html=True,
        )
    with _cr:
        st.markdown(
            '<div style="border:1px solid #64748b;background:#64748b18;'
            'border-radius:10px;padding:16px 8px;text-align:center">'
            '<div style="font-size:1.5rem">⚡</div>'
            f'<div style="font-size:2.2rem;font-weight:800;line-height:1.1;color:#64748b">{n_ruid}</div>'
            '<div style="font-size:0.7rem;font-weight:700;color:#64748b;letter-spacing:.06em;margin-top:2px">RUIDO</div>'
            '<div style="font-size:0.65rem;color:#aaa;margin-top:6px">descartado</div></div>',
            unsafe_allow_html=True,
        )


def _batch_metricas(df_lec: pd.DataFrame, cats_dfs: dict) -> dict:
    """Pre-computa calcular_metricas() por categoría. Devuelve {cat_k: [dict,...]} sin vacíos."""
    return {
        cat_k: [m for _, r in df_c.iterrows()
                if (m := calcular_metricas(df_lec, r["t_inicio"], r["t_fin"]))]
        for cat_k, df_c in cats_dfs.items()
    }


# Filtro de intervalos entre comidas: < 20 min = probable misma comida partida en dos,
# > 36 h = gap de datos / ausencia del dueño, no refleja el hambre real.
MIN_INTERVALO_H = 0.33
MAX_INTERVALO_H = 36.0


def _intervalos_validos_alim(
    df_alim: pd.DataFrame,
    min_h: float = MIN_INTERVALO_H,
    max_h: float = MAX_INTERVALO_H,
) -> tuple[list[float], int]:
    """
    Intervalos entre eventos de alimentación consecutivos, filtrados por min/max.
    Devuelve (intervalos_válidos, n_filtrados).
    """
    ts  = df_alim["t_inicio"].tolist()
    raw = [(ts[i + 1] - ts[i]).total_seconds() / 3600 for i in range(len(ts) - 1)]
    valid = [x for x in raw if min_h <= x <= max_h]
    return valid, len(raw) - len(valid)


# ─────────────────────────────────────────────────────────────────────────────
# Gráficos
# ─────────────────────────────────────────────────────────────────────────────
def _ts_ms(ts: pd.Timestamp) -> float:
    """Convierte Timestamp a ms desde epoch — evita bug pandas 2.x + plotly add_vline."""
    return ts.timestamp() * 1000


def _color_dir(direction: str) -> str:
    return {
        "subida": "rgba(59,130,246,0.22)",
        "bajada": "rgba(34,197,94,0.20)",
        "mixto":  "rgba(239,68,68,0.15)",
    }.get(direction, "rgba(150,150,150,0.12)")


_DARK = dict(
    plot_bgcolor  = "#111827",
    paper_bgcolor = "#1f2937",
    font_color    = "#e5e7eb",
    grid_color    = "#374151",
    line_color    = "#4b5563",
    tick_color    = "#d1d5db",
    label_color   = "#9ca3af",
    vline_color   = "#fbbf24",
)


def _combined_mtime() -> tuple[float, float]:
    """Hash barato combinado: lecturas_mtime + anotaciones_mtime. Cacheado por rerun."""
    if "combined" in _mtime_cache:
        return _mtime_cache["combined"]  # type: ignore[return-value]
    anot_mt = ANOTACIONES_CSV.stat().st_mtime if ANOTACIONES_CSV.exists() else 0.0
    v = (_csv_max_mtime(), anot_mt)
    _mtime_cache["combined"] = v
    return v


@st.cache_data(
    show_spinner=False,
    max_entries=60,
    hash_funcs={pd.DataFrame: lambda _: _combined_mtime()},
)
def build_chart(
    df_lec: pd.DataFrame,
    t_ini: pd.Timestamp,
    t_fin: pd.Timestamp,
    df_anot: pd.DataFrame | None,
    direction: str = "mixto",
    buffer_min: int = BUFFER_MIN,
    height: int = 460,
    title: str = "",
    df_ciclos: pd.DataFrame | None = None,
) -> go.Figure:
    buf  = pd.Timedelta(minutes=buffer_min)
    mask = (df_lec["ts"] >= t_ini - buf) & (df_lec["ts"] <= t_fin + buf)
    sub  = df_lec[mask].copy()
    sub["ts_stgo"] = sub["ts"].dt.tz_convert(TZ_STGO)

    t_ini_s = t_ini.astimezone(TZ_STGO)
    t_fin_s = t_fin.astimezone(TZ_STGO)

    # Rango Y con margen generoso para que la curva ocupe el gráfico
    y_range = None
    if len(sub) > 0 and not sub["peso_g"].isna().all():
        yv   = sub["peso_g"].dropna()
        span = max(float(yv.max() - yv.min()), 8.0)
        pad  = span * 0.40
        y_range = [float(yv.min()) - pad, float(yv.max()) + pad]

    fig = go.Figure()

    # Banda amarilla de ciclo S/A que contiene este candidato (capa más profunda)
    if df_ciclos is not None and len(df_ciclos) > 0:
        for _cr in df_ciclos.to_dict("records"):
            if _cr["t_fin"] >= t_ini - buf and _cr["t_inicio"] <= t_fin + buf:
                fig.add_vrect(
                    x0=_ts_ms(_cr["t_inicio"].astimezone(TZ_STGO)),
                    x1=_ts_ms(_cr["t_fin"].astimezone(TZ_STGO)),
                    fillcolor="#facc15", opacity=0.07,
                    layer="below", line_width=0,
                )

    fig.add_vrect(
        x0=_ts_ms(t_ini_s), x1=_ts_ms(t_fin_s),
        fillcolor=_color_dir(direction), opacity=1.0,
        layer="below", line_width=0,
    )
    fig.add_trace(go.Scatter(
        x=sub["ts_stgo"], y=sub["peso_g"],
        mode="lines+markers",
        line=dict(color="#f97316", width=3),
        marker=dict(size=5, color="#f97316",
                    line=dict(width=1, color="#111827")),
        name="Peso (g)",
        hovertemplate="%{x|%H:%M:%S}<br><b>%{y:.1f} g</b><extra></extra>",
    ))
    for t_s, lbl in [(t_ini_s, "Inicio"), (t_fin_s, "Fin")]:
        fig.add_vline(
            x=_ts_ms(t_s), line_width=2, line_dash="dash",
            line_color=_DARK["vline_color"],
            annotation_text=lbl, annotation_position="top right",
            annotation_font_size=12,
            annotation_font_color=_DARK["vline_color"],
        )

    # Estrellas de anotaciones cercanas
    # Los ciclos (18-50h) se omiten del overlay de estrellas — su escala temporal
    # no es comparable con candidatos de minutos y distorsionaría el gráfico.
    if df_anot is not None and len(df_anot) > 0:
        v_ini = t_ini - buf
        v_fin = t_fin + buf
        cerca = df_anot[(df_anot["t_fin"] >= v_ini) & (df_anot["t_inicio"] <= v_fin)]
        for _, anot in cerca.iterrows():
            cat   = str(anot.get("categoria", "sin_clasificar"))
            color = CATEGORIAS.get(cat, ("", "#888", ""))[1]
            label = CATEGORIAS.get(cat, (cat, "", ""))[0]
            t_mid = anot["t_inicio"] + (anot["t_fin"] - anot["t_inicio"]) / 2
            t_mid_s = t_mid.astimezone(TZ_STGO)
            y_pos = 0.0
            if len(sub) > 0:
                idx_c = (sub["ts"] - t_mid).abs().idxmin()
                y_raw = sub.loc[idx_c, "peso_g"]
                y_pos = float(y_raw) if not pd.isna(y_raw) else 0.0
            fig.add_trace(go.Scatter(
                x=[t_mid_s], y=[y_pos + 2],
                mode="markers",
                marker=dict(symbol="star", size=16, color=color,
                            line=dict(width=1.5, color="white")),
                name=label, showlegend=False,
                hovertemplate=f"<b>{label}</b><extra></extra>",
            ))

    _ax = dict(
        gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
        tickfont=dict(size=12, color=_DARK["tick_color"]),
        showgrid=True, zeroline=False,
    )
    fig.update_layout(
        height=height,
        title=dict(text=title, font=dict(size=14, color=_DARK["font_color"])) if title else None,
        xaxis=dict(
            title=dict(text="Hora (Santiago)", font=dict(size=12, color=_DARK["label_color"])),
            tickformat="%H:%M:%S", **_ax,
        ),
        yaxis=dict(
            title=dict(text="Peso (g)", font=dict(size=12, color=_DARK["label_color"])),
            **({"range": y_range} if y_range else {}), **_ax,
        ),
        showlegend=False,
        plot_bgcolor =_DARK["plot_bgcolor"],
        paper_bgcolor=_DARK["paper_bgcolor"],
        margin=dict(l=65, r=20, t=45 if title else 30, b=55),
    )
    return fig


@st.cache_data(
    show_spinner=False,
    max_entries=12,
    hash_funcs={
        pd.DataFrame: lambda df: (
            # df_lec → hash por mtime de lecturas (barato)
            _csv_max_mtime()
            if "ts" in df.columns
            # df_anot_cat → hash por (N filas, suma de índices): captura
            # cambios de longitud (nueva anotación) y outlier filtering
            # sin depender de mtime (que cambiaría en cada categoría aunque
            # la categoría visible no haya cambiado).
            else (len(df), int(df.index.to_numpy().sum()))
        ),
    },
)
def build_comparison_chart(
    df_lec: pd.DataFrame,
    df_anot_cat: pd.DataFrame,
    normalizar_tiempo: bool = True,
    normalizar_peso: bool = True,
) -> go.Figure:
    x_label = "% del evento" if normalizar_tiempo else "Minutos desde inicio"
    y_label = "Δpeso desde inicio (g)" if normalizar_peso else "Peso (g)"

    fig = go.Figure()
    n_ok = 0

    for i, (_, row) in enumerate(df_anot_cat.iterrows()):
        t_ini = row["t_inicio"]
        t_fin = row["t_fin"]
        mask  = (df_lec["ts"] >= t_ini - pd.Timedelta(seconds=30)) & \
                (df_lec["ts"] <= t_fin + pd.Timedelta(seconds=30))
        sub   = df_lec[mask].dropna(subset=["peso_g"])
        if len(sub) < 3:
            continue

        dur_s = max(1.0, (t_fin - t_ini).total_seconds())
        x_val = ((sub["ts"] - t_ini).dt.total_seconds() / dur_s * 100).values \
                if normalizar_tiempo \
                else ((sub["ts"] - t_ini).dt.total_seconds() / 60).values
        y_val = sub["peso_g"].values
        if normalizar_peso:
            y_val = y_val - y_val[0]

        label = t_ini.astimezone(TZ_STGO).strftime("%m-%d %H:%M")
        n_ok += 1
        fig.add_trace(go.Scatter(
            x=x_val, y=y_val,
            mode="lines",
            line=dict(width=1.8, color=f"hsl({(i * 41) % 360},65%,50%)"),
            opacity=0.65, name=label,
            hovertemplate=f"<b>{label}</b><br>%{{x:.0f}}<br>%{{y:.1f}} g<extra></extra>",
        ))

    if n_ok == 0:
        fig.add_annotation(text="Sin curvas con lecturas suficientes.", showarrow=False,
                           font=dict(size=14, color=_DARK["font_color"]),
                           xref="paper", yref="paper", x=0.5, y=0.5)

    _ax = dict(
        gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
        tickfont=dict(size=12, color=_DARK["tick_color"]),
        showgrid=True, zeroline=False,
    )
    fig.update_layout(
        height=440,
        xaxis=dict(title=dict(text=x_label, font=dict(size=12, color=_DARK["label_color"])), **_ax),
        yaxis=dict(title=dict(text=y_label, font=dict(size=12, color=_DARK["label_color"])), **_ax),
        plot_bgcolor =_DARK["plot_bgcolor"],
        paper_bgcolor=_DARK["paper_bgcolor"],
        margin=dict(l=65, r=140, t=25, b=55),
        legend=dict(
            orientation="v", x=1.01, y=1,
            font=dict(color=_DARK["tick_color"]),
            bgcolor="rgba(31,41,55,0.8)",
        ),
    )
    return fig


@st.cache_data(
    show_spinner=False,
    max_entries=30,
    hash_funcs={
        pd.DataFrame: lambda df: (
            _csv_max_mtime() if "ts_stgo" in df.columns
            else (_combined_mtime()[1], len(df),
                  int(df.index.to_numpy().sum()) if len(df) > 0 else 0)
        ),
    },
)
def build_global_chart(
    df_lec_vg: pd.DataFrame,
    df_anot_vis: pd.DataFrame | None,
    y_range: tuple | None,
    cats_visible: tuple = (),
    df_ciclos_vis: pd.DataFrame | None = None,
) -> go.Figure:
    """Gráfico de Vista Global cacheado — evita reconstruir vrects en cada rerun."""
    fig = go.Figure()

    # Ciclos servido/alimento primero — quedan en el fondo más alejado (amarillo)
    if df_ciclos_vis is not None and len(df_ciclos_vis) > 0:
        _ciclo_color = CATEGORIAS["ciclo_servido_alimento"][1]
        for _, _crow in df_ciclos_vis.iterrows():
            _ci_s  = _crow["t_inicio"].astimezone(TZ_STGO)
            _cf_s  = _crow["t_fin"].astimezone(TZ_STGO)
            _cid   = int(_crow["id_ciclo"]) if "id_ciclo" in _crow.index else ""
            _dur_h = (_crow["t_fin"] - _crow["t_inicio"]).total_seconds() / 3600
            fig.add_vrect(
                x0=_ts_ms(_ci_s), x1=_ts_ms(_cf_s),
                fillcolor=_ciclo_color, opacity=0.12,
                layer="below",
                line_width=1, line_color="#d97706",
                annotation_text=f"C{_cid}<br>{_dur_h:.0f}h",
                annotation_position="top left",
                annotation_font=dict(size=9, color="#b45309"),
            )

    if df_anot_vis is not None and len(df_anot_vis) > 0:
        for _, _row in df_anot_vis.iterrows():
            _cat   = str(_row["categoria"])
            _color = CATEGORIAS.get(_cat, ("", "#888", ""))[1]
            _ti_s  = _row["t_inicio"].astimezone(TZ_STGO)
            _tf_s  = _row["t_fin"].astimezone(TZ_STGO)
            fig.add_vrect(
                x0=_ts_ms(_ti_s), x1=_ts_ms(_tf_s),
                fillcolor=_color, opacity=0.25,
                layer="below", line_width=0,
                annotation_text="",
            )

    fig.add_trace(go.Scatter(
        x=df_lec_vg["ts_stgo"],
        y=df_lec_vg["peso_g"],
        mode="lines",
        line=dict(color="#f97316", width=1.5),
        name="Peso (g)",
        hovertemplate="%{x|%Y-%m-%d %H:%M}<br><b>%{y:.1f} g</b><extra></extra>",
    ))

    _ax = dict(
        gridcolor=_DARK["grid_color"],
        linecolor=_DARK["line_color"],
        tickfont=dict(size=11, color=_DARK["tick_color"]),
        showgrid=True, zeroline=False,
    )
    fig.update_layout(
        height=480,
        xaxis=dict(
            title=dict(text="Hora (Santiago)", font=dict(size=12, color=_DARK["label_color"])),
            tickformat="%d-%b %H:%M",
            rangeslider=dict(visible=True, thickness=0.06),
            **_ax,
        ),
        yaxis=dict(
            title=dict(text="Peso (g)", font=dict(size=12, color=_DARK["label_color"])),
            **({"range": list(y_range)} if y_range else {}),
            **_ax,
        ),
        plot_bgcolor =_DARK["plot_bgcolor"],
        paper_bgcolor=_DARK["paper_bgcolor"],
        margin=dict(l=65, r=20, t=20, b=60),
        showlegend=False,
    )
    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Métricas de curva
# ─────────────────────────────────────────────────────────────────────────────
METRICAS_LABELS = {
    "duracion_min":    "Duración (min)",
    "delta_w_g":       "Δpeso (g)",
    "peso_inicio_g":   "Peso ini (g)",
    "peso_fin_g":      "Peso fin (g)",
    "peso_max_g":      "Máx (g)",
    "peso_min_g":      "Mín (g)",
    "rango_g":         "Rango (g)",
    "pendiente_g_min": "Pendiente (g/min)",
    "n_lecturas":      "N lecturas",
    "monotonicity":    "Monotonía [-1,1]",
    "r2_lineal":       "R² lineal",
    "zcr":             "ZCR derivada",
    "sim_alimentacion": "Sim. alimentación",
    "sim_servido":     "Sim. servido",
}


def _shape_features_app(valores: np.ndarray) -> dict:
    n  = len(valores)
    dy = np.diff(valores)
    monotonicity = float(np.mean(np.sign(dy))) if len(dy) > 0 else 0.0

    x      = np.arange(n, dtype=float)
    coef   = np.polyfit(x, valores, 1)
    fitted = np.polyval(coef, x)
    ss_res = float(np.sum((valores - fitted) ** 2))
    ss_tot = float(np.sum((valores - valores.mean()) ** 2))
    r2     = round(1.0 - ss_res / ss_tot, 3) if ss_tot > 1e-6 else 0.0

    zcr = round(float(np.sum(np.diff(np.sign(dy)) != 0) / max(len(dy), 1)), 3) \
          if len(dy) > 1 else 0.0

    v_delta   = valores - valores[0]
    v_abs_max = float(np.max(np.abs(v_delta))) + 1e-6
    v_norm    = v_delta / v_abs_max

    def _cos(a: np.ndarray, b: np.ndarray) -> float:
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0

    return {
        "monotonicity":     round(monotonicity, 3),
        "r2_lineal":        r2,
        "zcr":              zcr,
        "sim_alimentacion": round(_cos(v_norm, np.linspace(0.0, -1.0, n)), 3),
        "sim_servido":      round(_cos(v_norm, np.linspace(0.0, +1.0, n)), 3),
    }


@st.cache_data(
    show_spinner=False,
    max_entries=2000,
    # Evita hashear 250k filas en cada llamada: usa el mtime del CSV como fingerprint del DataFrame.
    # El mtime cambia solo cuando hay sync nuevo → invalidación automática y correcta.
    hash_funcs={pd.DataFrame: lambda _: _csv_max_mtime()},
)
def calcular_metricas(df_lec: pd.DataFrame, t_ini: pd.Timestamp, t_fin: pd.Timestamp) -> dict:
    mask = (df_lec["ts"] >= t_ini) & (df_lec["ts"] <= t_fin)
    sub  = df_lec[mask]["peso_g"].dropna()
    if len(sub) < 2:
        return {}

    dur_s = (t_fin - t_ini).total_seconds()
    p_ini = float(sub.iloc[0])
    p_fin = float(sub.iloc[-1])
    p_max = float(sub.max())
    p_min = float(sub.min())
    x_min = np.arange(len(sub)) * (RESAMPLE_S / 60)
    pend  = float(np.polyfit(x_min, sub.values, 1)[0]) if len(sub) >= 2 else 0.0

    return {
        "duracion_min":    round(dur_s / 60, 2),
        "delta_w_g":       round(p_fin - p_ini, 1),
        "peso_inicio_g":   round(p_ini, 1),
        "peso_fin_g":      round(p_fin, 1),
        "peso_max_g":      round(p_max, 1),
        "peso_min_g":      round(p_min, 1),
        "rango_g":         round(p_max - p_min, 1),
        "pendiente_g_min": round(pend, 3),
        "n_lecturas":      len(sub),
        **_shape_features_app(sub.values),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Estado de sesión
# ─────────────────────────────────────────────────────────────────────────────
def init_state():
    for k, v in {
        "idx_actual": 0,
        "filtro_estado": "pendiente",
        "filtro_categoria": "todas",
        "orden": "cronologico",
    }.items():
        if k not in st.session_state:
            st.session_state[k] = v


def get_filtrados(df_cand: pd.DataFrame, df_anot: pd.DataFrame) -> pd.DataFrame:
    anot_ids: set[int] = set()
    anot_cat: dict[int, str] = {}
    if len(df_anot) > 0 and "id_candidato" in df_anot.columns:
        _last = df_anot.dropna(subset=["id_candidato"]).drop_duplicates("id_candidato", keep="last")
        anot_ids = set(_last["id_candidato"].astype(int).tolist())
        anot_cat = dict(zip(_last["id_candidato"].astype(int), _last["categoria"].astype(str)))

    df = df_cand.copy()
    df["estado"] = np.where(df["id_candidato"].isin(anot_ids), "anotado", "pendiente")

    fe = st.session_state.filtro_estado
    if fe != "todos":
        df = df[df["estado"] == fe]

    fc = st.session_state.get("filtro_categoria", "todas")
    if fc != "todas":
        if fe in ("anotado", "todos"):
            df = df[df["id_candidato"].map(lambda cid: anot_cat.get(int(cid), "") == fc)]
        elif "direction" in df.columns:
            # pendientes: usar dirección como proxy de categoría
            _proxy = {"alimentacion": "bajada", "servido": "subida", "ruido": "mixto"}
            if fc in _proxy:
                df = df[df["direction"] == _proxy[fc]]

    orden = st.session_state.orden
    if orden == "mayor_movimiento" and "rango_g" in df.columns:
        df = df.sort_values("rango_g", ascending=False)
    elif orden == "mas_largo" and "duracion_min" in df.columns:
        df = df.sort_values("duracion_min", ascending=False)
    else:
        df = df.sort_values("t_inicio")

    return df.reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────────────────
# App principal
# ─────────────────────────────────────────────────────────────────────────────
def main():
    # Limpiar cache de mtime al inicio de cada rerun — garantiza que stat()
    # se llame solo una vez por rerun aunque se llame N veces en hash_funcs.
    _mtime_cache.clear()
    init_state()

    # ── CSS: botones de acción en verde ────────────────────────────────────────
    st.markdown("""
<style>
button[kind="primary"] {
    background-color: #16a34a !important;
    border-color: #16a34a !important;
    color: #ffffff !important;
}
button[kind="primary"]:hover {
    background-color: #15803d !important;
    border-color: #15803d !important;
}
/* Botón Actualizar Todo — más alto y prominente */
div[data-testid="stHorizontalBlock"]:first-of-type div.stButton > button {
    height: 68px !important;
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    border-radius: 10px !important;
    letter-spacing: 0.01em !important;
}
/* Navegación lazy — radio como tabs */
div[data-testid="stRadio"][data-key="tab_nav"] > div {
    gap: 2px;
    flex-wrap: wrap;
}
div[data-testid="stRadio"][data-key="tab_nav"] label {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-bottom: 2px solid #334155;
    border-radius: 8px 8px 0 0;
    padding: 6px 14px !important;
    cursor: pointer;
    font-size: 0.87rem !important;
    transition: background-color 0.12s;
}
div[data-testid="stRadio"][data-key="tab_nav"] label:has(input:checked) {
    background-color: #334155;
    border-bottom-color: #f97316;
    color: #fb923c !important;
    font-weight: 600 !important;
}
div[data-testid="stRadio"][data-key="tab_nav"] label:hover:not(:has(input:checked)) {
    background-color: #273040;
}
div[data-testid="stRadio"][data-key="tab_nav"] input[type="radio"] {
    width: 0; height: 0; position: absolute; opacity: 0;
}
div[data-testid="stRadio"][data-key="tab_nav"] label p { margin: 0; }
</style>""", unsafe_allow_html=True)

    col_title, col_btn = st.columns([7, 2])
    with col_title:
        st.title("📡 Alpha v2 — Anotación y análisis de curvas")
        st.caption(f"Device: {DEVICE_CODE}  |  Sin modelos ML — reglas definidas a partir de lo que ves")
    with col_btn:
        st.markdown("<div style='margin-top:26px'></div>", unsafe_allow_html=True)
        if st.button("🔄 Actualizar Todo", type="primary", width='stretch',
                     key="btn_actualizar_todo"):

            # ── PASO 0: Descarga incremental desde Supabase ────────────────
            if not _SUPABASE_SYNC_OK:
                st.warning("⚠️ `supabase_client` no disponible — saltar sync. Ejecutar: `pip install supabase python-dotenv`")
            else:
                try:
                    with st.spinner("📡 0/3 · Sincronizando lecturas desde Supabase…"):
                        _sync = sync_readings_incremental()
                    _n_r  = _sync.get("readings", 0)
                    _n_rr = _sync.get("readings_rows", 0)
                    _n_tot = _n_r + _n_rr
                    if _n_tot > 0:
                        st.success(
                            f"📡 Supabase sync: **+{_n_r}** readings  ·  "
                            f"**+{_n_rr}** readings_rows  ·  "
                            f"corte: `{_sync['since_iso'][:19]} UTC`"
                        )
                    else:
                        st.info(f"📡 Supabase: sin filas nuevas desde `{_sync['since_iso'][:19]} UTC`")
                except EnvironmentError as _env_err:
                    st.warning(f"⚠️ Credenciales Supabase no configuradas: {_env_err}")
                except Exception as _exc:
                    st.warning(f"⚠️ Supabase no disponible ({type(_exc).__name__}): {_exc}")

            # ── PASOS 1/3 y 2/3: flujo local existente ─────────────────────
            hay_raw, hay_anot = _necesita_actualizacion()
            if not hay_raw and not hay_anot:
                st.info("Sin datos nuevos — los artefactos ya están al día con los CSV.")
            else:
                _ok = True
                if hay_raw:
                    with st.spinner("1/3 · Regenerando candidatos…"):
                        res1 = subprocess.run(
                            [sys.executable, str(SCRIPT_CANDIDATOS)],
                            capture_output=True, text=True,
                            encoding="utf-8", errors="replace",
                            cwd=str(SCRIPT_DIR),
                        )
                    if res1.returncode != 0:
                        st.error(f"Error en `01_genera_candidatos.py`:\n```\n{res1.stderr[-2000:]}\n```")
                        _ok = False
                if _ok:
                    with st.spinner("2/3 · Recalculando features y estadísticas…"):
                        res2 = subprocess.run(
                            [sys.executable, str(SCRIPT_REVISAR)],
                            capture_output=True, text=True,
                            encoding="utf-8", errors="replace",
                            cwd=str(SCRIPT_DIR),
                        )
                    if res2.returncode != 0:
                        st.error(f"Error en `revisar_anotaciones_v2.py`:\n```\n{res2.stderr[-2000:]}\n```")
                        _ok = False
                if _ok:
                    # Limpiar solo las cachés afectadas (no st.cache_data.clear() global)
                    load_comp_stats.clear()
                    _evidence_ventana_cached.clear()
                    if hay_raw:
                        build_chart.clear()
                        build_comparison_chart.clear()
                        build_global_chart.clear()
                        calcular_metricas.clear()
                        _calcular_features_v2_cached.clear()
                        if _LECTURAS_CACHE_PARQUET.exists():
                            _LECTURAS_CACHE_PARQUET.unlink()
                        st.session_state.pop("_df_lec", None)
                        st.session_state.pop("_df_lec_mtime", None)
                    # Limpiar cachés de session_state de tabs pesados
                    for _k in list(st.session_state.keys()):
                        if _k.startswith("_sscache_"):
                            del st.session_state[_k]
                    st.toast("✅ Todo actualizado. Recargando…", icon="✅")
                    st.rerun()

    # Verificar prerequisito
    if not CANDIDATOS_CSV.exists():
        st.error("**candidatos_av2.csv no encontrado.** Ejecutar primero:")
        st.code("python 01_genera_candidatos.py")
        if not READINGS_CSV.exists():
            st.warning(
                f"Además falta **lecturas.csv** en `{DATA_DIR}`.  \n"
                "Exportar desde Supabase y copiar como `data/lecturas.csv`."
            )
        st.stop()

    # Cargar datos
    df_lec   = load_lecturas()
    df_cand  = load_candidatos()
    df_anot  = load_anotaciones()
    df_ciclos = load_ciclos()
    umbrales = load_umbrales()
    cs_dict, cs_n_alim, cs_n_serv, cs_n_ruido = load_comp_stats()

    # Fusionar ciclos en df_anot — cacheado en session_state para evitar pd.concat en cada rerun.
    # Clave: anot_mtime + n_ciclos → invalida si hay nuevas anotaciones o cambió el CSV de ciclos.
    _anot_mt_key = st.session_state.get("_df_anot_mtime", 0.0)
    _merged_ss_key = f"_df_anot_merged_{_anot_mt_key}_{len(df_ciclos)}"
    if _merged_ss_key in st.session_state:
        df_anot = st.session_state[_merged_ss_key]
    elif len(df_ciclos) > 0:
        _n_cic = len(df_ciclos)
        _ciclos_rows = df_ciclos[["t_inicio", "t_fin"]].copy()
        _ciclos_rows["id_anotacion"] = range(-_n_cic, 0)
        _ciclos_rows["id_candidato"] = None
        _ciclos_rows["categoria"]    = "ciclo_servido_alimento"
        _ciclos_rows["notas"]        = df_ciclos["notas"].fillna("").values
        _ciclos_rows["device_code"]  = DEVICE_CODE
        _ciclos_rows["origen"]       = "ciclo_manual"
        _ciclos_rows["created_at"]   = None
        df_anot = pd.concat([df_anot, _ciclos_rows], ignore_index=True)
        st.session_state[_merged_ss_key] = df_anot
        for _k in list(st.session_state.keys()):
            if _k.startswith("_df_anot_merged_") and _k != _merged_ss_key:
                del st.session_state[_k]

    if df_cand is None or len(df_cand) == 0:
        st.warning("candidatos_av2.csv vacío. Revisar 01_genera_candidatos.py.")
        st.stop()

    # Header: métricas globales
    anot_ids: set[int] = set()
    if len(df_anot) > 0 and "id_candidato" in df_anot.columns:
        anot_ids = set(df_anot["id_candidato"].dropna().astype(int).tolist())

    n_tot   = len(df_cand)
    n_an    = len(anot_ids)
    # Un solo value_counts() reemplaza 7 scans individuales con .sum()
    _cat_counts = df_anot["categoria"].value_counts() if len(df_anot) > 0 else pd.Series(dtype=int)
    n_alim  = int(_cat_counts.get("alimentacion",          0))
    n_serv  = int(_cat_counts.get("servido",               0))
    n_ruid  = int(_cat_counts.get("ruido",                 0))
    n_ciclo = int(_cat_counts.get("ciclo_servido_alimento", 0))

    hc = st.columns(6)
    hc[0].metric("Candidatos",   n_tot)
    hc[1].metric("Anotados",     n_an)
    hc[2].metric("Pendientes",   n_tot - n_an)
    hc[3].metric("Alimentación", n_alim, delta=f"/{METAS_AV2['alimentacion']}")
    hc[4].metric("Servido",      n_serv, delta=f"/{METAS_AV2['servido']}")
    hc[5].metric("🟡 Ciclos S/A", n_ciclo)

    pct = n_an / n_tot if n_tot > 0 else 0.0
    st.progress(pct, text=f"{pct:.0%} anotado  ({n_an}/{n_tot})")

    # Metas por categoría
    _mc = st.columns(3)
    for _i, (_cat, _meta) in enumerate(METAS_AV2.items()):
        _actual = int(_cat_counts.get(_cat, 0))
        _mc[_i].progress(
            min(1.0, _actual / _meta),
            text=f"{CATEGORIAS[_cat][0]}  {_actual}/{_meta}",
        )
    st.divider()

    # Navegación lazy — solo el tab activo ejecuta su código
    _tab = st.radio(
        "Navegación",
        [
            "🌐 Vista Global",
            "🔍 Revisar Candidatos",
            "📏 Analizar Curva",
            "🔄 Comparar Curvas",
            "📊 Panel de Features",
            "🧮 Motor Matemático",
            "📋 Anotaciones",
            "🕐 Próxima Comida",
            "🐱 Kittypau",
        ],
        horizontal=True,
        label_visibility="collapsed",
        key="tab_nav",
    )

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 0 — VISTA GLOBAL
    # ═══════════════════════════════════════════════════════════════════════
    if _tab == "🌐 Vista Global":
        st.subheader("🌐 Vista global — curva de peso completa")
        st.caption(
            "Serie temporal completa de KPCL0034 'Bandida' (food bowl). "
            "Cada punto es una lectura de peso (g) tomada cada ~30 s. "
            "Las **bandas de color** marcan eventos: 🟡 amarillo = ciclo servido/alimento (fondo), "
            "🟢 verde = Bandida come, 🔵 azul = agregan comida, 🔴 rojo = ruido/falso positivo. "
            "Usa los controles para filtrar categorías y ajustar el rango de tiempo."
        )

        if df_lec is None:
            st.warning("Lecturas no disponibles.")
        else:
            # ── Controles ──────────────────────────────────────────────────
            vg_col1, vg_col2, vg_col3 = st.columns([4, 3, 2])

            with vg_col1:
                st.markdown("**Categorías visibles**")
                vg_cc = st.columns(4)
                vg_show_alim = vg_cc[0].checkbox(
                    "🍽️ Alimentación", value=True, key="vg_alim"
                )
                vg_show_serv = vg_cc[1].checkbox(
                    "🫙 Servido", value=True, key="vg_serv"
                )
                vg_show_ruid = vg_cc[2].checkbox(
                    "⚡ Ruido", value=True, key="vg_ruid"
                )
                vg_show_ciclo = vg_cc[3].checkbox(
                    "🟡 Ciclo S/A", value=True, key="vg_ciclo"
                )

            with vg_col2:
                st.markdown("**Rango de tiempo**")
                vg_rango_opts = ["1D", "3D", "1S", "1M", "Todo"]
                vg_rango = st.radio(
                    "Rango", vg_rango_opts, horizontal=True,
                    index=4, key="vg_rango", label_visibility="collapsed",
                )

            with vg_col3:
                st.markdown("&nbsp;", unsafe_allow_html=True)
                vg_perfecta = st.button(
                    "⭐ Vista perfecta", width='stretch', key="vg_fit"
                )

            # ── Calcular ventana de tiempo ─────────────────────────────────
            _vg_now = df_lec["ts"].max()
            _vg_deltas = {
                "1D": pd.Timedelta(days=1),
                "3D": pd.Timedelta(days=3),
                "1S": pd.Timedelta(weeks=1),
                "1M": pd.Timedelta(days=30),
                "Todo": None,
            }
            _vg_delta = _vg_deltas[vg_rango]
            if _vg_delta is not None:
                _vg_t_ini = _vg_now - _vg_delta
                df_lec_vg = df_lec[df_lec["ts"] >= _vg_t_ini].copy()
            else:
                _vg_t_ini = df_lec["ts"].min()
                df_lec_vg = df_lec.copy()

            # ── Vista perfecta: Y = P5–P95 de la ventana visible ───────────
            _vg_y_range = None
            if vg_perfecta or vg_rango != "Todo":
                _vg_vals = df_lec_vg["peso_g"].dropna()
                if len(_vg_vals) > 10:
                    _p5  = float(_vg_vals.quantile(0.05))
                    _p95 = float(_vg_vals.quantile(0.95))
                    _pad = (_p95 - _p5) * 0.15
                    _vg_y_range = [_p5 - _pad, _p95 + _pad]

            # ── Construir gráfico ──────────────────────────────────────────
            df_lec_vg["ts_stgo"] = df_lec_vg["ts"].dt.tz_convert(TZ_STGO)

            _vg_cats = []
            if vg_show_alim: _vg_cats.append("alimentacion")
            if vg_show_serv: _vg_cats.append("servido")
            if vg_show_ruid: _vg_cats.append("ruido")

            _vg_anot_vis = (
                df_anot[
                    (df_anot["categoria"].isin(_vg_cats)) &
                    (df_anot["t_fin"] >= _vg_t_ini)
                ]
                if len(df_anot) > 0 else pd.DataFrame()
            )

            # Ciclos servido/alimento — filtrados por ventana visible
            _vg_ciclos_vis = None
            if vg_show_ciclo and len(df_ciclos) > 0:
                _vg_ciclos_vis = df_ciclos[df_ciclos["t_fin"] >= _vg_t_ini].copy()
                if len(_vg_ciclos_vis) == 0:
                    _vg_ciclos_vis = None

            fig_vg = build_global_chart(
                df_lec_vg,
                _vg_anot_vis if len(_vg_anot_vis) > 0 else None,
                tuple(_vg_y_range) if _vg_y_range else None,
                tuple(_vg_cats),
                _vg_ciclos_vis,
            )
            st.plotly_chart(fig_vg, width='stretch')

            # ── Leyenda explicativa ────────────────────────────────────────
            with st.expander("¿Cómo leer este gráfico?", expanded=False):
                st.markdown(
                    "**Qué es la línea naranja:** el peso del bowl en gramos a lo largo del tiempo. "
                    "El bowl pesa ~120–160 g con comida; vacío ~90–100 g.\n\n"
                    "**Qué son las bandas de color:**\n"
                    "- 🟡 **Amarillo (ciclo servido/alimento):** Período completo desde un servido hasta el siguiente. "
                    "Banda de fondo — engloba todos los sub-eventos del ciclo. Duración típica: 18–50 h.\n"
                    "- 🟢 **Verde (alimentación):** Bandida comió. El peso baja gradualmente 5–15 g en 4–8 min. "
                    "El patrón típico es una 'doble rampa': come ~2 min, pausa, sigue ~2 min.\n"
                    "- 🔵 **Azul (servido):** Alguien agregó comida. El peso sube 20–80 g en 30–60 s "
                    "con forma de sigmoide o rampa ascendente. La subida es ~5× más rápida que la bajada por comida.\n"
                    "- 🔴 **Rojo (ruido):** Movimiento del bowl o del sensor sin consumo real. "
                    "El peso fluctúa brevemente y regresa al nivel original en <1 min.\n"
                    "- ⬜ **Gris:** Evento detectado pero aún no anotado — úsalo como guía para ir a Tab 1.\n\n"
                    "**Orden de capas:** el amarillo está siempre detrás — encima se ven verde, azul y rojo. "
                    "Una banda azul seguida de una verde dentro de una zona amarilla = ciclo completo normal."
                )

            # ── Resumen de la ventana visible ──────────────────────────────
            _vg_dias = max(1, (_vg_now - _vg_t_ini).days)
            _vg_n_ciclos_vis = len(_vg_ciclos_vis) if _vg_ciclos_vis is not None else 0
            if len(df_anot) > 0:
                _vg_anot_win = df_anot[df_anot["t_fin"] >= _vg_t_ini]
                _vg_n_alim = int((_vg_anot_win["categoria"] == "alimentacion").sum())
                _vg_n_serv = int((_vg_anot_win["categoria"] == "servido").sum())
                _vg_n_ruid = int((_vg_anot_win["categoria"] == "ruido").sum())
                st.caption(
                    f"**Ventana:** {vg_rango}  ·  "
                    f"🟡 Ciclos S/A: **{_vg_n_ciclos_vis}**  ·  "
                    f"🍽️ Alimentación: **{_vg_n_alim}** eventos  ·  "
                    f"🫙 Servido: **{_vg_n_serv}**  ·  "
                    f"⚡ Ruido: **{_vg_n_ruid}**  ·  "
                    f"Período: **{_vg_dias} días**"
                )
            else:
                st.caption(
                    f"**Ventana:** {vg_rango}  ·  "
                    f"🟡 Ciclos S/A: **{_vg_n_ciclos_vis}**  ·  "
                    f"Período: **{_vg_dias} días**"
                )

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 1 — REVISAR CANDIDATOS
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "🔍 Revisar Candidatos":
        _pb1 = st.progress(0, "🔍 Iniciando…")

        _t1_modo = st.radio(
            "Modo",
            ["candidatos", "ciclos"],
            format_func=lambda x: {"candidatos": "📋 Candidatos", "ciclos": "🟡 Ciclos S/A"}[x],
            horizontal=True,
            key="tab1_modo",
        )
        st.divider()

        # ── MODO: CANDIDATOS ────────────────────────────────────────────────
        if _t1_modo == "candidatos":
            fc1, fc2, fc3 = st.columns([2, 2, 2])
            with fc1:
                e_opts = ["pendiente", "anotado", "todos"]
                e_lbl  = {"pendiente": "🟠 Pendientes", "anotado": "✅ Anotados", "todos": "📋 Todos"}
                ne = st.selectbox("Cola", e_opts, format_func=lambda x: e_lbl[x],
                                  index=e_opts.index(st.session_state.filtro_estado))
                if ne != st.session_state.filtro_estado:
                    st.session_state.filtro_estado = ne
                    st.session_state.idx_actual = 0
                    st.rerun()
            with fc2:
                cat_f_opts = ["todas", "alimentacion", "servido", "ruido", "ciclo_servido_alimento"]
                cat_f_lbl  = {
                    "todas":                "📋 Todas",
                    "alimentacion":         "🍽️ Alimentación",
                    "servido":              "🫙 Servido",
                    "ruido":                "⚡ Ruido",
                    "ciclo_servido_alimento": "🟡 Ciclo S/A",
                }
                ncat = st.selectbox("Filtrar categoría", cat_f_opts,
                                    format_func=lambda x: cat_f_lbl[x],
                                    index=cat_f_opts.index(st.session_state.get("filtro_categoria", "todas")))
                if ncat != st.session_state.get("filtro_categoria", "todas"):
                    st.session_state.filtro_categoria = ncat
                    st.session_state.idx_actual = 0
                    st.rerun()
            with fc3:
                o_opts = ["cronologico", "mayor_movimiento", "mas_largo"]
                o_lbl  = {"cronologico": "🕐 Cronológico", "mayor_movimiento": "📈 Mayor mov.",
                          "mas_largo": "⏱️ Más largo"}
                no = st.selectbox("Orden", o_opts, format_func=lambda x: o_lbl[x],
                                  index=o_opts.index(st.session_state.orden))
                if no != st.session_state.orden:
                    st.session_state.orden = no
                    st.session_state.idx_actual = 0
                    st.rerun()

            # Progreso hacia metas — una sola línea de texto
            if len(df_anot) > 0 and "categoria" in df_anot.columns:
                _cat_counts = df_anot["categoria"].value_counts()
            else:
                _cat_counts = pd.Series(dtype=int)
            _prog = "  ·  ".join(
                f"{CATEGORIAS[c][0].split()[0]} **{int(_cat_counts.get(c, 0))}/{t}**"
                for c, t in METAS_AV2.items()
            ) + f"  ·  🟡 **{len(df_ciclos)}**"
            st.caption(f"Progreso:  {_prog}")

            st.divider()

            _pb1.progress(25, "📋 Filtrando candidatos…")

            # ── Lista combinada con caché en session_state ──────────────────────
            # La clave cubre todos los inputs: filtros + mtimes de los 3 CSVs.
            # _invalidar_cache_anot() limpia "_items_cache_key" al guardar.
            _ciclos_mt = str(CICLOS_CSV.stat().st_mtime) if CICLOS_CSV.exists() else "0"
            _items_key = (
                f"{st.session_state.filtro_estado}|{st.session_state.get('filtro_categoria', 'todas')}"
                f"|{st.session_state.orden}"
                f"|{st.session_state.get('_df_cand_mtime', '')}"
                f"|{st.session_state.get('_df_anot_mtime', '')}"
                f"|{_ciclos_mt}"
            )
            if st.session_state.get("_items_cache_key") == _items_key:
                _items: list[dict] = st.session_state["_items_cache_val"]
            else:
                df_filt = get_filtrados(df_cand, df_anot)
                _items = [
                    {"tipo": "candidato", "t_sort": _r["t_inicio"], "row": _r}
                    for _r in df_filt.to_dict("records")
                ]
                if len(df_ciclos) > 0:
                    for _cr in df_ciclos.sort_values("id_ciclo").to_dict("records"):
                        _items.append({
                            "tipo":     "ciclo",
                            "t_sort":   _cr["t_inicio"],
                            "id_ciclo": int(_cr["id_ciclo"]),
                            "t_inicio": _cr["t_inicio"],
                            "t_fin":    _cr["t_fin"],
                            "notas":    "" if pd.isna(_cr.get("notas")) else str(_cr.get("notas", "") or ""),
                        })
                _items.sort(key=lambda x: x["t_sort"])
                st.session_state["_items_cache_key"] = _items_key
                st.session_state["_items_cache_val"] = _items

            n_filt = len(_items)
            _n_cands_pendientes = sum(1 for i in _items if i["tipo"] == "candidato")

            if n_filt == 0:
                _pb1.empty()
                st.success(
                    "🏁 **¡NO QUEDAN MÁS CANDIDATOS!**  \n"
                    "Todos los candidatos han sido anotados. "
                    "Puedes cambiar el filtro a *Anotados* o *Todos* para revisar lo guardado."
                )
            else:
                if st.session_state.filtro_estado == "pendiente" and _n_cands_pendientes == 0:
                    st.info(
                        "✅ No quedan candidatos pendientes — la lista muestra solo los 🟡 Ciclos S/A.  \n"
                        "Cambia el filtro a *Todos* para ver también los candidatos anotados."
                    )
                if st.session_state.idx_actual >= n_filt:
                    st.session_state.idx_actual = 0

                nav1, nav2, nav3 = st.columns([1, 6, 1])
                with nav1:
                    if st.button("← Ant", width="stretch"):
                        st.session_state.idx_actual = max(0, st.session_state.idx_actual - 1)
                        st.rerun()
                with nav2:
                    _item_preview = _items[st.session_state.idx_actual]
                    _nav_lbl = (
                        f"🟡 Ciclo C{_item_preview['id_ciclo']}  —  {st.session_state.idx_actual + 1} / {n_filt}"
                        if _item_preview["tipo"] == "ciclo"
                        else f"Candidato  {st.session_state.idx_actual + 1} / {n_filt}"
                    )
                    if n_filt > 1:
                        nuevo_idx = st.slider(
                            _nav_lbl, 1, n_filt, st.session_state.idx_actual + 1,
                        ) - 1
                        if nuevo_idx != st.session_state.idx_actual:
                            st.session_state.idx_actual = nuevo_idx
                            st.rerun()
                    else:
                        st.markdown(f"**{_nav_lbl}**")
                with nav3:
                    _es_ultimo = (st.session_state.idx_actual == n_filt - 1)
                    if st.button("Sig →", width="stretch", disabled=_es_ultimo):
                        st.session_state.idx_actual = min(n_filt - 1, st.session_state.idx_actual + 1)
                        st.rerun()
                    if _es_ultimo:
                        st.caption("🏁 fin")

                _pb1.progress(55, "🔢 Cargando candidato…")
                _item = _items[st.session_state.idx_actual]

                # ══ CANDIDATO REGULAR ══════════════════════════════════════════
                if _item["tipo"] == "candidato":
                    cand      = _item["row"]
                    t_ini     = cand["t_inicio"]
                    t_fin     = cand["t_fin"]
                    id_cand   = int(cand["id_candidato"])
                    direction = str(cand.get("direction", "mixto"))
                    t_ini_s   = t_ini.astimezone(TZ_STGO)
                    t_fin_s   = t_fin.astimezone(TZ_STGO)

                    # ── Métricas compactas ──────────────────────────────────────
                    dir_ico = {"subida": "↑", "bajada": "↓", "mixto": "↕"}.get(direction, "↕")
                    ic = st.columns(5)
                    ic[0].metric("Dirección",   f"{dir_ico} {direction.capitalize()}")
                    ic[1].metric("Δpeso",       f"{cand.get('delta_w_total', 0):+.1f} g")
                    ic[2].metric("Duración",    f"{cand.get('duracion_min', 0):.1f} min")
                    ic[3].metric("Rango",       f"{cand.get('rango_g', 0):.1f} g")
                    ic[4].metric("Hora (stgo)", t_ini_s.strftime("%H:%M"))

                    # Métricas de forma (del CSV si ya se regeneró, si no se calculan en vivo)
                    mono_val = cand.get("monotonicity", None)
                    r2_val   = cand.get("r2_lineal", None)
                    zcr_val  = cand.get("zcr", None)
                    if mono_val is None and df_lec is not None:
                        m_live = calcular_metricas(df_lec, t_ini, t_fin)
                        mono_val = m_live.get("monotonicity")
                        r2_val   = m_live.get("r2_lineal")
                        zcr_val  = m_live.get("zcr")
                    if mono_val is not None:
                        sf = st.columns(3)
                        mono_desc = "↓ baja consistente" if mono_val < -0.5 else ("↑ sube consistente" if mono_val > 0.5 else "↕ oscila")
                        sf[0].metric(
                            "Monotonía", f"{mono_val:+.2f}",
                            help=(
                                f"{mono_desc}.\n\n"
                                "Rango: −1 (baja en cada muestra) → +1 (sube en cada muestra).\n"
                                "Empírico: alim ≈ −0.20 (baja el 60 % del tiempo con pausas), "
                                "serv ≈ +0.32, ruido ≈ −0.01 (sin tendencia).\n"
                                "Separación alim/serv: 3.38σ — buen discriminador."
                            ),
                        )
                        sf[1].metric(
                            "R² lineal", f"{r2_val:.2f}",
                            help=(
                                "Bondad del ajuste a una línea recta (0–1).\n\n"
                                "1 = tendencia perfectamente lineal; 0 = sin tendencia.\n"
                                "Empírico: alim ≈ 0.61 (bajista pero no perfectamente lineal), "
                                "serv ≈ 0.73 (subida más lineal y consistente), "
                                "ruido ≈ 0.24 (sin tendencia definida).\n"
                                "R² bajo + monotonía cercana a 0 = probable ruido."
                            ),
                        )
                        sf[2].metric(
                            "ZCR deriv.", f"{zcr_val:.2f}",
                            help=(
                                "Tasa de cambios de signo en la 1ª derivada (0–1).\n\n"
                                "Alto = la señal cambia de dirección muchas veces por muestra.\n"
                                "Empírico: alim ≈ 0.67 (Bandida come en bocados, hay muchos cambios), "
                                "serv ≈ 0.45, ruido ≈ 0.23.\n"
                                "Separación alim/ruido: 3.68σ — el mejor separador de esas dos categorías. "
                                "ZCR bajo con amplitud alta = ruido típico (pocas oscilaciones pero grandes)."
                            ),
                        )

                    st.caption(
                        f"📅 {t_ini_s.strftime('%Y-%m-%d')}  "
                        f"{t_ini_s.strftime('%H:%M:%S')} → {t_fin_s.strftime('%H:%M:%S')}  "
                        f"(id_cand={id_cand})"
                    )

                    anot_este = df_anot[df_anot["id_candidato"] == id_cand] \
                                if len(df_anot) > 0 else pd.DataFrame()
                    if len(anot_este) > 0:
                        cat_act = str(anot_este.iloc[-1]["categoria"])
                        st.success(f"✅ Ya anotado como **{CATEGORIAS.get(cat_act, (cat_act,))[0]}**")

                    # ── Layout: gráfico izquierda | formulario derecha ──────────
                    col_chart, col_form = st.columns([3, 2], gap="medium")

                    with col_chart:
                        if df_lec is not None:
                            _pb1.progress(80, "📈 Construyendo gráfico…")
                            fig = build_chart(df_lec, t_ini, t_fin, df_anot, direction, height=520,
                                              df_ciclos=df_ciclos if len(df_ciclos) > 0 else None)
                            st.plotly_chart(fig, width="stretch")
                            _pb1.progress(100, "✅")
                            _pb1.empty()
                            if len(df_ciclos) > 0:
                                _cand_mid = t_ini + (t_fin - t_ini) / 2
                                _in_cic   = df_ciclos[
                                    (df_ciclos["t_inicio"] <= _cand_mid) &
                                    (df_ciclos["t_fin"]    >= _cand_mid)
                                ]
                                if len(_in_cic) > 0:
                                    _cr      = _in_cic.iloc[0]
                                    _cic_ini = _cr["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                                    _cic_fin = _cr["t_fin"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                                    _cic_dur = (_cr["t_fin"] - _cr["t_inicio"]).total_seconds() / 3600
                                    st.caption(
                                        f"🟡 Ciclo C{int(_cr['id_ciclo'])}: "
                                        f"{_cic_ini} → {_cic_fin}  ({_cic_dur:.0f}h)"
                                    )
                        else:
                            _pb1.empty()
                            st.warning("Lecturas no disponibles.")

                    with col_form:
                        st.markdown("#### Clasificar segmento")
                        st.caption(
                            "Observa la curva y asigna la categoría. "
                            "**Claves rápidas:** ¿el peso baja? → probable alim. "
                            "¿el peso sube en segundos? → servido. "
                            "¿oscila y regresa al origen? → ruido. "
                            "Si hay duda, revisa Monotonía y ZCR arriba."
                        )

                        cat_opts = [k for k in CATEGORIAS if k != "ciclo_servido_alimento"]
                        cat_def  = 0
                        if len(anot_este) > 0:
                            prev = str(anot_este.iloc[-1]["categoria"])
                            if prev in cat_opts:
                                cat_def = cat_opts.index(prev)

                        # Placeholder para errores de validación — se muestra dentro de la columna
                        _form_error = st.empty()

                        with st.form(key=f"form_{id_cand}"):
                            categoria = st.radio(
                                "Categoría",
                                cat_opts,
                                format_func=lambda k: f"{CATEGORIAS[k][0]}  —  {CATEGORIAS[k][2]}",
                                index=cat_def,
                            )

                            st.markdown("**Ajustar tiempos** *(opcional)*")
                            c_fi, c_hi = st.columns(2)
                            with c_fi:
                                f_ini = st.date_input("Fecha ini", value=t_ini_s.date())
                            with c_hi:
                                h_ini = st.time_input("Hora ini", value=t_ini_s.time(),
                                                      step=timedelta(minutes=1))
                            c_ff, c_hf = st.columns(2)
                            with c_ff:
                                f_fin = st.date_input("Fecha fin", value=t_fin_s.date())
                            with c_hf:
                                h_fin = st.time_input("Hora fin", value=t_fin_s.time(),
                                                      step=timedelta(minutes=1))

                            notas = st.text_input(
                                "Notas",
                                placeholder="curva limpia, spike, duda...",
                            )

                            guardar = st.form_submit_button(
                                "💾 Guardar y siguiente", type="primary",
                                width="stretch",
                            )
                            saltar = st.form_submit_button(
                                "⏭️ Saltar", width="stretch",
                            )

                    if guardar:
                        try:
                            t_i = pd.Timestamp(f"{f_ini}T{h_ini}").tz_localize(TZ_STGO).tz_convert("UTC")
                            t_f = pd.Timestamp(f"{f_fin}T{h_fin}").tz_localize(TZ_STGO).tz_convert("UTC")
                            if t_i >= t_f:
                                _form_error.error("⚠️ t_inicio debe ser anterior a t_fin")
                            elif (t_f - t_i).total_seconds() < 15:
                                _form_error.error("⚠️ Segmento demasiado corto (< 15s)")
                            else:
                                save_anotacion(id_cand, t_i, t_f, categoria, notas)
                                st.toast(f"✅ {CATEGORIAS[categoria][0]} guardado", icon="✅")
                                n_nuevo = len(df_anot) + 1
                                if n_nuevo in (20, 40, 60, 80, 100):
                                    st.balloons()
                                # En modo "pendiente" el candidato anotado sale de la lista al
                                # rebuildearse, y el siguiente ocupa el mismo índice — no avanzar.
                                if st.session_state.filtro_estado != "pendiente":
                                    st.session_state.idx_actual = min(n_filt - 1, st.session_state.idx_actual + 1)
                                st.rerun()
                        except Exception as exc:
                            _form_error.error(f"Error al guardar: {exc}")

                    if saltar:
                        st.session_state.idx_actual = min(n_filt - 1, st.session_state.idx_actual + 1)
                        st.rerun()

                # ══ CICLO S/A ══════════════════════════════════════════════════
                else:
                    _cic_id  = _item["id_ciclo"]
                    _cic_t0  = _item["t_inicio"]
                    _cic_t1  = _item["t_fin"]
                    _cic_t0s = _cic_t0.astimezone(TZ_STGO)
                    _cic_t1s = _cic_t1.astimezone(TZ_STGO)
                    _cic_dur = (_cic_t1 - _cic_t0).total_seconds() / 3600

                    # Eventos anotados dentro de la ventana del ciclo
                    _n_alim = _n_serv = _n_ruid = 0
                    if len(df_anot) > 0:
                        _ev_in = df_anot[
                            (df_anot["categoria"] != "ciclo_servido_alimento") &
                            (df_anot["t_inicio"] >= _cic_t0) &
                            (df_anot["t_fin"]    <= _cic_t1)
                        ]
                        _n_alim = len(_ev_in[_ev_in["categoria"] == "alimentacion"])
                        _n_serv = len(_ev_in[_ev_in["categoria"] == "servido"])
                        _n_ruid = len(_ev_in[_ev_in["categoria"] == "ruido"])

                    # Features cuantitativas del ciclo desde las lecturas
                    _cic_w_ini = _cic_w_fin = _cic_delta_w = _cic_tasa = None
                    if df_lec is not None:
                        _mask_cic = (df_lec["ts"] >= _cic_t0) & (df_lec["ts"] <= _cic_t1)
                        _lec_cic  = df_lec[_mask_cic]["peso_g"].dropna()
                        if len(_lec_cic) >= 4:
                            _n10         = max(1, min(10, len(_lec_cic) // 4))
                            _cic_w_ini   = float(_lec_cic.iloc[:_n10].mean())
                            _cic_w_fin   = float(_lec_cic.iloc[-_n10:].mean())
                            _cic_delta_w = _cic_w_fin - _cic_w_ini
                            _cic_tasa    = _cic_delta_w / _cic_dur if _cic_dur > 0 else 0.0

                    # ── Identidad + temporalidad ────────────────────────────────
                    _kc = st.columns(4)
                    _kc[0].metric("🟡 Ciclo",      f"C{_cic_id}")
                    _kc[1].metric("Duración",      f"{_cic_dur:.1f} h")
                    _kc[2].metric("Inicio (stgo)", _cic_t0s.strftime("%d-%b %H:%M"))
                    _kc[3].metric("Fin (stgo)",    _cic_t1s.strftime("%d-%b %H:%M"))

                    # ── Composición visual del ciclo ─────────────────────────────
                    _ciclo_composicion_cards(_n_serv, _n_alim, _n_ruid)

                    # ── Features de peso ─────────────────────────────────────────
                    if _cic_w_ini is not None:
                        st.markdown("")
                        _kf = st.columns(4)
                        _kf[0].metric("Peso inicial", f"{_cic_w_ini:.0f} g",
                                      help="Media de las primeras lecturas del ciclo")
                        _kf[1].metric("Peso final",   f"{_cic_w_fin:.0f} g",
                                      help="Media de las últimas lecturas del ciclo")
                        _kf[2].metric("Δ peso",       f"{_cic_delta_w:+.0f} g",
                                      help="Peso final − peso inicial (negativo = consumo neto)")
                        _kf[3].metric("Tasa consumo", f"{_cic_tasa:+.1f} g/h",
                                      help="Variación media de peso por hora durante el ciclo")

                    # ── Caption con contexto temporal ─────────────────────────────
                    if len(df_anot) > 0:
                        _sv_in_c = df_anot[
                            (df_anot["categoria"] == "servido") &
                            (df_anot["t_inicio"] >= _cic_t0) &
                            (df_anot["t_inicio"] <= _cic_t1)
                        ].sort_values("t_inicio")
                        _sv_next = df_anot[
                            (df_anot["categoria"] == "servido") &
                            (df_anot["t_inicio"] > _cic_t1)
                        ].sort_values("t_inicio")
                        if len(_sv_in_c) == 1:
                            _sv0_s  = _sv_in_c.iloc[0]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                            _ns_txt = (
                                _sv_next.iloc[0]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                                if len(_sv_next) > 0 else "no registrado"
                            )
                            st.caption(
                                f"🫙 Apertura: **{_sv0_s}**  ·  "
                                f"📅 {_cic_t0s.strftime('%Y-%m-%d %H:%M')} → {_cic_t1s.strftime('%H:%M')}  "
                                f"(C{_cic_id})  ·  Próximo servido: {_ns_txt}"
                            )
                        elif len(_sv_in_c) > 1:
                            _sv2_s = _sv_in_c.iloc[1]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                            st.caption(
                                f"⚠️ 2º servido en {_sv2_s} — el fin del ciclo debería estar antes  ·  "
                                f"📅 (C{_cic_id})"
                            )
                        else:
                            st.caption(
                                f"📅 {_cic_t0s.strftime('%Y-%m-%d')}  "
                                f"{_cic_t0s.strftime('%H:%M')} → {_cic_t1s.strftime('%H:%M')}  "
                                f"(C{_cic_id})"
                            )
                    else:
                        st.caption(
                            f"📅 {_cic_t0s.strftime('%Y-%m-%d')}  "
                            f"{_cic_t0s.strftime('%H:%M')} → {_cic_t1s.strftime('%H:%M')}  "
                            f"(C{_cic_id})"
                        )

                    # ── Layout: gráfico izquierda | formulario derecha ──────────
                    col_chart, col_form = st.columns([3, 2], gap="medium")

                    with col_chart:
                        if df_lec is not None:
                            _pb1.progress(80, "📈 Construyendo gráfico…")
                            _fig_cic = build_chart(
                                df_lec, _cic_t0, _cic_t1, df_anot,
                                direction="mixto",
                                title=(
                                    f"🟡 C{_cic_id} — "
                                    f"{_cic_t0s.strftime('%Y-%m-%d %H:%M')} → "
                                    f"{_cic_t1s.strftime('%Y-%m-%d %H:%M')}  "
                                    f"({_cic_dur:.1f}h)"
                                ),
                                height=520,
                            )
                            st.plotly_chart(_fig_cic, width="stretch")
                            _pb1.progress(100, "✅")
                            _pb1.empty()
                        else:
                            _pb1.empty()
                            st.warning("Lecturas no disponibles.")

                    with col_form:
                        st.markdown("#### Editar ciclo S/A")
                        st.caption(
                            "Período completo desde que se sirve alimento hasta vaciado (~18–50 h). "
                            "Los tiempos se ingresan en hora local Santiago."
                        )
                        with st.form(key=f"form_cic_cand_{_cic_id}"):
                            st.markdown("**Inicio del ciclo**")
                            _fc_fi = st.date_input("Fecha inicio", value=_cic_t0s.date(),
                                                   label_visibility="collapsed")
                            _fc_hi = st.time_input("Hora inicio", value=_cic_t0s.time(),
                                                   step=timedelta(minutes=1))
                            st.markdown("**Fin del ciclo**")
                            _fc_ff = st.date_input("Fecha fin", value=_cic_t1s.date(),
                                                   label_visibility="collapsed")
                            _fc_hf = st.time_input("Hora fin", value=_cic_t1s.time(),
                                                   step=timedelta(minutes=1))
                            _fc_notas_c = st.text_input(
                                "Notas", value=_item["notas"],
                                placeholder="inicio nuevo saco, vaciado, etc.",
                            )
                            _btn_guardar_cic2 = st.form_submit_button(
                                "💾 Guardar ciclo", type="primary", width="stretch"
                            )
                            _btn_elim_cic2 = st.form_submit_button(
                                "🗑️ Eliminar ciclo", width="stretch"
                            )

                    if _btn_guardar_cic2:
                        try:
                            _t_i = pd.Timestamp(f"{_fc_fi}T{_fc_hi}").tz_localize(TZ_STGO).tz_convert("UTC")
                            _t_f = pd.Timestamp(f"{_fc_ff}T{_fc_hf}").tz_localize(TZ_STGO).tz_convert("UTC")
                            if _t_i >= _t_f:
                                st.error("t_inicio debe ser anterior a t_fin")
                            elif (_t_f - _t_i).total_seconds() < 3600:
                                st.error("Un ciclo debe durar al menos 1 hora")
                            else:
                                _sv_save2 = df_anot[
                                    (df_anot["categoria"] == "servido") &
                                    (df_anot["t_inicio"] >= _t_i) &
                                    (df_anot["t_inicio"] <= _t_f)
                                ] if len(df_anot) > 0 else pd.DataFrame()
                                if len(_sv_save2) == 0:
                                    st.error(
                                        "❌ No hay evento *servido* en la ventana del ciclo. "
                                        "Ajusta el inicio para que incluya el servido de apertura."
                                    )
                                else:
                                    if len(_sv_save2) > 1:
                                        _sv2e_s = _sv_save2.sort_values("t_inicio").iloc[1]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                                        st.warning(
                                            f"⚠️ El ciclo contiene {len(_sv_save2)} servidos. "
                                            f"El 2º servido está en {_sv2e_s} — considera ajustar el fin antes de esa hora."
                                        )
                                    save_ciclo(_cic_id, _t_i, _t_f, _fc_notas_c)
                                    _dur_g = (_t_f - _t_i).total_seconds() / 3600
                                    st.toast(f"✅ Ciclo C{_cic_id} actualizado ({_dur_g:.1f} h)", icon="✅")
                                    st.session_state.idx_actual = min(n_filt - 1, st.session_state.idx_actual + 1)
                                    st.rerun()
                        except Exception as exc:
                            st.error(f"Error al guardar: {exc}")

                    if _btn_elim_cic2:
                        try:
                            delete_ciclo(_cic_id)
                            st.toast(f"🗑️ Ciclo C{_cic_id} eliminado", icon="🗑️")
                            st.session_state.idx_actual = max(0, st.session_state.idx_actual - 1)
                            st.rerun()
                        except Exception as exc:
                            st.error(f"Error al eliminar: {exc}")

        # ── MODO: CICLOS S/A ────────────────────────────────────────────────
        else:
            _pb1.progress(30, "🟡 Cargando ciclos…")

            # Opciones del selector: "➕ Nuevo" + ciclos existentes ordenados
            _cic_opts_lbl: list[str]            = ["➕ Nuevo ciclo S/A"]
            _cic_id_map:   list[int | None]     = [None]
            if len(df_ciclos) > 0:
                for _, _crow in df_ciclos.sort_values("id_ciclo").iterrows():
                    _ci_s = _crow["t_inicio"].astimezone(TZ_STGO)
                    _cf_s = _crow["t_fin"].astimezone(TZ_STGO)
                    _dur  = (_crow["t_fin"] - _crow["t_inicio"]).total_seconds() / 3600
                    _cic_opts_lbl.append(
                        f"C{int(_crow['id_ciclo'])}: "
                        f"{_ci_s.strftime('%d-%b %H:%M')} → {_cf_s.strftime('%d-%b %H:%M')}  "
                        f"({_dur:.1f}h)"
                    )
                    _cic_id_map.append(int(_crow["id_ciclo"]))

            _cic_sel_idx = st.selectbox(
                "Ciclo",
                range(len(_cic_opts_lbl)),
                format_func=lambda i: _cic_opts_lbl[i],
                key="cic_sel_idx",
            )
            _cic_sel_id = _cic_id_map[_cic_sel_idx]

            # Valores para el formulario: desde ciclo existente o defaults vacíos
            if _cic_sel_id is not None:
                _cic_row     = df_ciclos[df_ciclos["id_ciclo"] == _cic_sel_id].iloc[0]
                _cic_t0      = _cic_row["t_inicio"]
                _cic_t1      = _cic_row["t_fin"]
                _cic_t0s     = _cic_t0.astimezone(TZ_STGO)
                _cic_t1s     = _cic_t1.astimezone(TZ_STGO)
                _cic_dur_h   = (_cic_t1 - _cic_t0).total_seconds() / 3600
                _cic_notas_d = str(_cic_row.get("notas", "") or "")
            else:
                _now_s       = datetime.now(TZ_STGO)
                _cic_t0      = None
                _cic_t1      = None
                _cic_t0s     = _now_s - timedelta(hours=24)
                _cic_t1s     = _now_s
                _cic_dur_h   = 24.0
                _cic_notas_d = ""

            st.divider()

            _cic_col_g, _cic_col_f = st.columns([3, 2], gap="medium")

            with _cic_col_g:
                if _cic_sel_id is not None:
                    # Identidad + temporalidad
                    _ck = st.columns(4)
                    _ck[0].metric("🟡 Ciclo",      f"C{_cic_sel_id}")
                    _ck[1].metric("Duración",      f"{_cic_dur_h:.1f} h")
                    _ck[2].metric("Inicio (stgo)", _cic_t0s.strftime("%d-%b %H:%M"))
                    _ck[3].metric("Fin (stgo)",    _cic_t1s.strftime("%d-%b %H:%M"))

                    # Composición visual del ciclo
                    if len(df_anot) > 0 and _cic_t0 is not None:
                        _ev_in = df_anot[
                            (df_anot["categoria"] != "ciclo_servido_alimento") &
                            (df_anot["t_inicio"] >= _cic_t0) &
                            (df_anot["t_fin"]    <= _cic_t1)
                        ]
                        _mn_alim = len(_ev_in[_ev_in["categoria"] == "alimentacion"])
                        _mn_serv = len(_ev_in[_ev_in["categoria"] == "servido"])
                        _mn_ruid = len(_ev_in[_ev_in["categoria"] == "ruido"])

                        _sv_in_m = df_anot[
                            (df_anot["categoria"] == "servido") &
                            (df_anot["t_inicio"] >= _cic_t0) &
                            (df_anot["t_inicio"] <= _cic_t1)
                        ].sort_values("t_inicio")
                        _sv_next_m = df_anot[
                            (df_anot["categoria"] == "servido") &
                            (df_anot["t_inicio"] > _cic_t1)
                        ].sort_values("t_inicio")

                        _ciclo_composicion_cards(_mn_serv, _mn_alim, _mn_ruid)

                        st.markdown("")
                        if len(_sv_in_m) == 1:
                            _sv0m_s   = _sv_in_m.iloc[0]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                            _ns_m_txt = (
                                _sv_next_m.iloc[0]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                                if len(_sv_next_m) > 0 else "no registrado"
                            )
                            st.caption(f"🫙 Apertura: **{_sv0m_s}**  ·  Próximo servido: **{_ns_m_txt}**")
                        elif len(_sv_in_m) > 1:
                            _sv2m_s = _sv_in_m.iloc[1]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                            st.caption(f"⚠️ 2º servido en {_sv2m_s} — ajusta el fin antes de esa hora")

                    if df_lec is not None:
                        _pb1.progress(70, "📈 Construyendo gráfico…")
                        _fig_cic = build_chart(
                            df_lec, _cic_t0, _cic_t1, df_anot,
                            direction="mixto",
                            title=(
                                f"🟡 C{_cic_sel_id} — "
                                f"{_cic_t0s.strftime('%Y-%m-%d %H:%M')} → "
                                f"{_cic_t1s.strftime('%Y-%m-%d %H:%M')}  "
                                f"({_cic_dur_h:.1f}h)"
                            ),
                            height=480,
                        )
                        st.plotly_chart(_fig_cic, width="stretch")
                    else:
                        st.warning("Lecturas no disponibles para mostrar el gráfico.")
                else:
                    st.info(
                        "Define inicio y fin en el formulario y pulsa **Guardar ciclo** "
                        "para registrar un nuevo ciclo S/A."
                    )

            with _cic_col_f:
                st.markdown(
                    "#### Editar ciclo" if _cic_sel_id is not None else "#### Nuevo ciclo S/A"
                )
                st.caption(
                    "Un ciclo S/A es el período completo desde que se sirve alimento "
                    "hasta que el bol queda vacío (~18–50 h). "
                    "Los tiempos se ingresan en hora local Santiago."
                )
                with st.form(key=f"form_ciclo_{_cic_sel_id}"):
                    st.markdown("**Inicio del ciclo**")
                    _fc_fi = st.date_input("Fecha inicio cic", value=_cic_t0s.date(),
                                           label_visibility="collapsed")
                    _fc_hi = st.time_input("Hora inicio cic", value=_cic_t0s.time(),
                                           step=timedelta(minutes=1))
                    st.markdown("**Fin del ciclo**")
                    _fc_ff = st.date_input("Fecha fin cic", value=_cic_t1s.date(),
                                           label_visibility="collapsed")
                    _fc_hf = st.time_input("Hora fin cic", value=_cic_t1s.time(),
                                           step=timedelta(minutes=1))
                    _fc_notas = st.text_input(
                        "Notas", value=_cic_notas_d,
                        placeholder="inicio nuevo saco, vaciado, etc.",
                    )
                    _btn_guardar_cic = st.form_submit_button(
                        "💾 Guardar ciclo", type="primary", width="stretch"
                    )
                    _btn_elim_cic = (
                        st.form_submit_button("🗑️ Eliminar ciclo", width="stretch")
                        if _cic_sel_id is not None else False
                    )

            _pb1.progress(100, "✅")
            _pb1.empty()

            if _btn_guardar_cic:
                try:
                    _t_i = pd.Timestamp(f"{_fc_fi}T{_fc_hi}").tz_localize(TZ_STGO).tz_convert("UTC")
                    _t_f = pd.Timestamp(f"{_fc_ff}T{_fc_hf}").tz_localize(TZ_STGO).tz_convert("UTC")
                    if _t_i >= _t_f:
                        st.error("t_inicio debe ser anterior a t_fin")
                    elif (_t_f - _t_i).total_seconds() < 3600:
                        st.error("Un ciclo debe durar al menos 1 hora")
                    else:
                        _sv_save = df_anot[
                            (df_anot["categoria"] == "servido") &
                            (df_anot["t_inicio"] >= _t_i) &
                            (df_anot["t_inicio"] <= _t_f)
                        ].sort_values("t_inicio") if len(df_anot) > 0 else pd.DataFrame()
                        if len(_sv_save) == 0:
                            st.error(
                                "❌ No hay evento *servido* en la ventana del ciclo. "
                                "Ajusta el inicio para que incluya el servido de apertura."
                            )
                        else:
                            if len(_sv_save) > 1:
                                _sv2s_s = _sv_save.iloc[1]["t_inicio"].astimezone(TZ_STGO).strftime("%d-%b %H:%M")
                                st.warning(
                                    f"⚠️ El ciclo contiene {len(_sv_save)} servidos. "
                                    f"El 2º servido está en {_sv2s_s} — considera ajustar el fin antes de esa hora."
                                )
                            save_ciclo(_cic_sel_id, _t_i, _t_f, _fc_notas)
                            _dur_g = (_t_f - _t_i).total_seconds() / 3600
                            _acc   = "actualizado" if _cic_sel_id is not None else "creado"
                            st.toast(f"✅ Ciclo {_acc} ({_dur_g:.1f} h)", icon="✅")
                            st.rerun()
                except Exception as exc:
                    st.error(f"Error al guardar: {exc}")

            if _btn_elim_cic:
                try:
                    delete_ciclo(_cic_sel_id)
                    st.toast(f"🗑️ Ciclo C{_cic_sel_id} eliminado", icon="🗑️")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Error al eliminar: {exc}")

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 2 — ANALIZAR CURVA
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "📏 Analizar Curva":
        _pb2 = st.progress(0, "📏 Cargando Analizar Curva…")
        st.subheader("📏 Análisis de curvas — material para el detector")
        st.caption(
            "Compara las estadísticas de las 3 categorías (alim / serv / ruido) para entender "
            "qué hace distinta a cada una. Los valores de µ ± σ que emergen aquí son la base "
            "para calibrar los umbrales del detector y el Evidence Engine. "
            "**Guía de lectura:** una diferencia grande entre columnas (ej. Δpeso muy negativo en alim "
            "y muy positivo en serv) indica un buen discriminador. Una diferencia pequeña = las categorías "
            "se solapan en esa variable → esa variable sola no es suficiente para clasificar."
        )

        if len(df_anot) == 0:
            st.info("Anota al menos una curva en '🔍 Revisar Candidatos' para ver análisis.")
        elif df_lec is None:
            st.warning("Lecturas no disponibles.")
        else:
            # ── Tabla comparativa de las 3 categorías ──────────────────────
            # Los ciclos (18-50h) no son candidatos; calcular_metricas sobre esas
            # ventanas no aporta información útil y es computacionalmente costoso.
            cats_con_data = {
                k: df_anot[df_anot["categoria"] == k]
                for k in CATEGORIAS
                if k in df_anot["categoria"].values and k != "ciclo_servido_alimento"
            }
            if cats_con_data:
                st.markdown("#### Comparación entre categorías")
                st.caption(
                    "Media ± desv. estándar de cada variable sobre todas las anotaciones. "
                    "**Valores de referencia empíricos (421 anotaciones):**\n"
                    "- Duración: alim ≈ 6.0 min · serv ≈ 1.5 min · ruido ≈ 3.8 min\n"
                    "- Δpeso: alim ≈ −8 g (baja) · serv ≈ +35 g (sube) · ruido ≈ ±3 g (oscila)\n"
                    "- Monotonía: alim ≈ −0.20 · serv ≈ +0.32 · ruido ≈ −0.005\n"
                    "- R²: alim ≈ 0.61 · serv ≈ 0.73 · ruido ≈ 0.24\n"
                    "Una diferencia de >2σ entre columnas indica un buen discriminador para el detector."
                )

                _pb2.progress(30, "🔢 Calculando métricas por categoría…")
                _mets_comp = _batch_metricas(df_lec, cats_con_data)
                rows = []
                for var_key, var_lbl in VARIABLES_DETECTOR:
                    row = {"Variable": var_lbl}
                    for cat_k, mets in _mets_comp.items():
                        vals = [m[var_key] for m in mets if m and var_key in m]
                        if vals:
                            mu, sd = float(np.mean(vals)), float(np.std(vals))
                            row[CATEGORIAS[cat_k][0]] = f"{mu:+.2f} ± {sd:.2f}"
                        else:
                            row[CATEGORIAS[cat_k][0]] = "—"
                    rows.append(row)

                df_comp = pd.DataFrame(rows).set_index("Variable")
                st.dataframe(df_comp, width="stretch")
                _pb2.progress(100, "✅")
                _pb2.empty()
                st.divider()

            # ── Análisis individual por categoría ──────────────────────────
            cats_an = [k for k in CATEGORIAS if k in df_anot["categoria"].values]
            if not cats_an:
                st.info("Aún no hay curvas anotadas en ninguna categoría.")
            else:
                ac1, ac2 = st.columns([2, 5])
                with ac1:
                    cat_an = st.selectbox(
                        "Categoría", cats_an,
                        format_func=lambda k: CATEGORIAS[k][0],
                        key="cat_analizar",
                    )
                df_cat = df_anot[df_anot["categoria"] == cat_an].sort_values("t_inicio").reset_index(drop=True)
                if cat_an == "ciclo_servido_alimento":
                    # ── Análisis de Ciclos S/A (duración en horas, sin calcular_metricas) ──────
                    _df_cic = df_cat.copy()
                    _df_cic["dur_h"]   = (_df_cic["t_fin"] - _df_cic["t_inicio"]).dt.total_seconds() / 3600
                    _df_cic["hora_ini"] = _df_cic["t_inicio"].dt.tz_convert(TZ_STGO).dt.hour
                    with ac2:
                        _c_m = st.columns(4)
                        _c_m[0].metric("N ciclos",       len(_df_cic))
                        _c_m[1].metric("Duración media", f"{_df_cic['dur_h'].mean():.1f} h")
                        _c_m[2].metric("Duración mín.",  f"{_df_cic['dur_h'].min():.1f} h")
                        _c_m[3].metric("Duración máx.",  f"{_df_cic['dur_h'].max():.1f} h")
                    st.divider()
                    if len(_df_cic) > 0:
                        def _lbl_cic(row) -> str:
                            _t  = row["t_inicio"].astimezone(TZ_STGO).strftime("%m-%d %H:%M")
                            _dh = (row["t_fin"] - row["t_inicio"]).total_seconds() / 3600
                            _n  = str(row.get("notas", "") or "")
                            return f"{_t}  ({_dh:.1f}h)" + (f"  [{_n[:20]}]" if _n else "")
                        _idx_cic = st.selectbox(
                            "Ver ciclo individual",
                            range(len(_df_cic)),
                            format_func=lambda i: _lbl_cic(_df_cic.iloc[i]),
                        )
                        _cic_row   = _df_cic.iloc[_idx_cic]
                        _cic_t0    = _cic_row["t_inicio"]; _cic_t1 = _cic_row["t_fin"]
                        _cic_dur_h = (_cic_t1 - _cic_t0).total_seconds() / 3600
                        _ci1, _ci2, _ci3 = st.columns(3)
                        _ci1.metric("Inicio",   _cic_t0.astimezone(TZ_STGO).strftime("%Y-%m-%d %H:%M"))
                        _ci2.metric("Fin",      _cic_t1.astimezone(TZ_STGO).strftime("%Y-%m-%d %H:%M"))
                        _ci3.metric("Duración", f"{_cic_dur_h:.1f} h")
                        if df_lec is not None:
                            _fig_cic = build_chart(
                                df_lec, _cic_t0, _cic_t1, None, direction="mixto",
                                title=(f"🟡 Ciclo S/A — "
                                       f"{_cic_t0.astimezone(TZ_STGO).strftime('%Y-%m-%d %H:%M')}"
                                       f"  ({_cic_dur_h:.1f} h)"),
                                height=360,
                            )
                            st.plotly_chart(_fig_cic, width="stretch")
                    if len(_df_cic) >= 2:
                        st.divider()
                        st.markdown("**Distribuciones de los ciclos**")
                        _ax_cic = dict(
                            gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                            tickfont=dict(size=11, color=_DARK["tick_color"]), zeroline=False,
                        )
                        _dd1, _dd2 = st.columns(2)
                        with _dd1:
                            _fd_cic = go.Figure(go.Histogram(
                                x=_df_cic["dur_h"], nbinsx=min(14, len(_df_cic)),
                                marker_color=CATEGORIAS["ciclo_servido_alimento"][1], opacity=0.85,
                            ))
                            _fd_cic.update_layout(
                                height=240,
                                title=dict(text="Duración de ciclo (h)", font=dict(color=_DARK["font_color"])),
                                xaxis=dict(title="h", **_ax_cic), yaxis=dict(title="N", **_ax_cic),
                                plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                                margin=dict(l=40, r=10, t=40, b=40),
                            )
                            st.plotly_chart(_fd_cic, width="stretch")
                        with _dd2:
                            _fh_cic = go.Figure(go.Histogram(
                                x=_df_cic["hora_ini"], nbinsx=24,
                                marker_color=CATEGORIAS["ciclo_servido_alimento"][1], opacity=0.85,
                            ))
                            _fh_cic.update_layout(
                                height=240,
                                title=dict(text="Hora de inicio del ciclo (Santiago)",
                                           font=dict(color=_DARK["font_color"])),
                                xaxis=dict(title="hora", tickvals=list(range(0, 24, 3)), **_ax_cic),
                                yaxis=dict(title="N", **_ax_cic),
                                plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                                margin=dict(l=40, r=10, t=40, b=40),
                            )
                            st.plotly_chart(_fh_cic, width="stretch")
                        st.markdown("**Estadísticas completas**")
                        st.dataframe(
                            _df_cic[["dur_h"]].rename(columns={"dur_h": "Duración (h)"})
                            .describe().round(2),
                            width="stretch",
                        )

                else:
                    mets_all = [calcular_metricas(df_lec, r["t_inicio"], r["t_fin"]) for _, r in df_cat.iterrows()]
                    mets_all = [m for m in mets_all if m]

                    with ac2:
                        if mets_all:
                            df_met = pd.DataFrame(mets_all)
                            sm = st.columns(4)
                            sm[0].metric("Duración",   f"{df_met['duracion_min'].mean():.2f} min",
                                         delta=f"±{df_met['duracion_min'].std():.2f}")
                            sm[1].metric("Δpeso",      f"{df_met['delta_w_g'].mean():+.1f} g",
                                         delta=f"±{df_met['delta_w_g'].std():.1f}")
                            sm[2].metric("Rango",      f"{df_met['rango_g'].mean():.1f} g",
                                         delta=f"±{df_met['rango_g'].std():.1f}")
                            sm[3].metric("Pendiente",  f"{df_met['pendiente_g_min'].mean():+.3f} g/min")

                    st.divider()

                    if len(df_cat) == 0:
                        st.info(f"No hay curvas de '{cat_an}' aún.")
                    else:
                        def _lbl(row) -> str:
                            t = row["t_inicio"].astimezone(TZ_STGO).strftime("%m-%d %H:%M")
                            n = str(row.get("notas", "") or "")
                            return t + (f"  [{n[:25]}]" if n else "")

                        idx_c = st.selectbox(
                            "Ver curva individual",
                            range(len(df_cat)),
                            format_func=lambda i: _lbl(df_cat.iloc[i]),
                        )
                        curva  = df_cat.iloc[idx_c]
                        t_ini_c, t_fin_c = curva["t_inicio"], curva["t_fin"]
                        m = calcular_metricas(df_lec, t_ini_c, t_fin_c)
                        if m:
                            cm = st.columns(len(m))
                            for j, (key, val) in enumerate(m.items()):
                                cm[j].metric(METRICAS_LABELS.get(key, key), val)

                        dir_c = str(curva.get("direction", "mixto") if "direction" in curva.index else "mixto")
                        fig_i = build_chart(
                            df_lec, t_ini_c, t_fin_c, None, direction=dir_c,
                            title=f"{CATEGORIAS[cat_an][0]}  —  "
                                  f"{t_ini_c.astimezone(TZ_STGO).strftime('%Y-%m-%d %H:%M')}",
                            height=360,
                        )
                        st.plotly_chart(fig_i, width="stretch")

                        # Distribuciones con tema oscuro
                        if len(mets_all) >= 2:
                            st.divider()
                            st.markdown("**Distribuciones de todas las curvas de esta categoría**")
                            st.caption(
                                "Histogramas de duración (min) y Δpeso (g) para todas las curvas de esta categoría. "
                                "**¿Qué buscar?** Distribuciones angostas (baja σ) indican que la categoría tiene un patrón muy consistente — "
                                "más fácil de detectar automáticamente. Distribuciones anchas (alta σ) indican alta variabilidad — "
                                "el detector necesitará más features para separar casos extremos. "
                                "Outliers visibles en el histograma (barras aisladas a los extremos) son candidatos a revisar manualmente."
                            )
                            df_met = pd.DataFrame(mets_all)
                            _ax_h = dict(
                                gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                                tickfont=dict(size=11, color=_DARK["tick_color"]), zeroline=False,
                            )
                            dd1, dd2 = st.columns(2)
                            with dd1:
                                fd = go.Figure(go.Histogram(
                                    x=df_met["duracion_min"], nbinsx=min(20, len(df_met)),
                                    marker_color=CATEGORIAS[cat_an][1], opacity=0.85,
                                ))
                                fd.update_layout(
                                    height=240, title=dict(text="Duración (min)", font=dict(color=_DARK["font_color"])),
                                    xaxis=dict(title="min", **_ax_h), yaxis=dict(title="N", **_ax_h),
                                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                                    margin=dict(l=40, r=10, t=40, b=40),
                                )
                                st.plotly_chart(fd, width="stretch")
                            with dd2:
                                fdw = go.Figure(go.Histogram(
                                    x=df_met["delta_w_g"], nbinsx=min(20, len(df_met)),
                                    marker_color=CATEGORIAS[cat_an][1], opacity=0.85,
                                ))
                                fdw.update_layout(
                                    height=240, title=dict(text="Δpeso (g)", font=dict(color=_DARK["font_color"])),
                                    xaxis=dict(title="g", **_ax_h), yaxis=dict(title="N", **_ax_h),
                                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                                    margin=dict(l=40, r=10, t=40, b=40),
                                )
                                st.plotly_chart(fdw, width="stretch")

                            st.markdown("**Estadísticas completas**")
                            st.dataframe(
                                df_met[["duracion_min", "delta_w_g", "rango_g", "pendiente_g_min"]]
                                .describe().round(3)
                                .rename(columns={
                                    "duracion_min":    "Duración (min)",
                                    "delta_w_g":       "Δpeso (g)",
                                    "rango_g":         "Rango (g)",
                                    "pendiente_g_min": "Pendiente (g/min)",
                                }),
                                width="stretch",
                            )

                            with st.expander("Scatter: Duración vs Δpeso — ¿existe correlación?"):
                                fsc = go.Figure(go.Scatter(
                                    x=df_met["duracion_min"], y=df_met["delta_w_g"],
                                    mode="markers",
                                    marker=dict(size=10, color=CATEGORIAS[cat_an][1], opacity=0.8),
                                    hovertemplate="dur=%{x:.2f} min<br>Δ=%{y:.1f} g<extra></extra>",
                                ))
                                fsc.update_layout(
                                    height=320,
                                    xaxis=dict(title="Duración (min)", **_ax_h),
                                    yaxis=dict(title="Δpeso (g)", **_ax_h),
                                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                                    margin=dict(l=50, r=10, t=20, b=50),
                                )
                                st.plotly_chart(fsc, width="stretch")

                            # ── Pruebas de normalidad ───────────────────────────
                            st.divider()
                            st.markdown("**Pruebas de normalidad**")
                            st.caption(
                                "Testea si la distribución de duración y Δpeso sigue una gaussiana (campana de Gauss). "
                                "**Shapiro-Wilk** es el test más potente para muestras pequeñas (n < 50). "
                                "**Lilliefors** es una variante del test KS recomendada cuando la media y σ se estiman de los datos. "
                                "**p < 0.05** → se rechaza la normalidad → los umbrales deben basarse en percentiles (P25/P75) "
                                "en lugar de µ ± 2σ, porque la distribución tiene colas más pesadas de lo esperado. "
                                "Empíricamente, la duración de alimentaciones y ruido no son normales (distribución con cola derecha larga)."
                            )

                            _NORM_VARS = {
                                "duracion_min":    "Duración (min)",
                                "delta_w_g":       "Δpeso (g)",
                                "rango_g":         "Rango (g)",
                                "pendiente_g_min": "Pendiente (g/min)",
                            }

                            _norm_rows = []
                            for _nv_key, _nv_lbl in _NORM_VARS.items():
                                _nv_vals = df_met[_nv_key].dropna().values
                                if len(_nv_vals) < 3:
                                    _norm_rows.append({
                                        "Variable": _nv_lbl, "N": len(_nv_vals),
                                        "Shapiro-Wilk p": "—", "KS p": "—", "Lilliefors p": "—",
                                        "¿Normal?": "🔘 pocos datos",
                                    })
                                    continue

                                # Shapiro-Wilk (mejor para N < 50)
                                _sw_stat, _sw_p = _scipy_stats.shapiro(_nv_vals)

                                # Kolmogorov-Smirnov contra normal estándar
                                _nv_z = (_nv_vals - _nv_vals.mean()) / (_nv_vals.std() + 1e-9)
                                _ks_stat, _ks_p = _scipy_stats.kstest(_nv_z, "norm")

                                # Lilliefors (KS corregido para distribución ajustada)
                                if _HAS_LILLIEFORS and len(_nv_vals) >= 4:
                                    _lf_stat, _lf_p = _lilliefors(_nv_vals, dist="norm")
                                    _lf_str = f"{_lf_p:.4f}"
                                else:
                                    _lf_p = None
                                    _lf_str = "—"

                                # ¿Normal? si al menos 2 de 3 tests no rechazan H0 (p > 0.05)
                                _votes = sum([
                                    _sw_p > 0.05,
                                    _ks_p > 0.05,
                                    (_lf_p > 0.05 if _lf_p is not None else True),
                                ])
                                _es_normal = "✅ Normal" if _votes >= 2 else "⚠️ No normal"

                                _norm_rows.append({
                                    "Variable": _nv_lbl,
                                    "N": len(_nv_vals),
                                    "Shapiro-Wilk p": f"{_sw_p:.4f}",
                                    "KS p": f"{_ks_p:.4f}",
                                    "Lilliefors p": _lf_str,
                                    "¿Normal?": _es_normal,
                                })

                            st.dataframe(pd.DataFrame(_norm_rows), width="stretch", hide_index=True)

                            # Q-Q plots en columnas
                            st.markdown("**Q-Q plots (cuantil vs normal teórica)**")
                            _qq_vars = [
                                ("duracion_min", "Duración (min)"),
                                ("delta_w_g",    "Δpeso (g)"),
                            ]
                            _qq_cols = st.columns(len(_qq_vars))
                            for _qi, (_qk, _ql) in enumerate(_qq_vars):
                                _qvals = df_met[_qk].dropna().values
                                if len(_qvals) < 3:
                                    _qq_cols[_qi].info(f"{_ql}: pocos datos")
                                    continue
                                (_q_x, _q_y), (_q_slope, _q_intercept, _) = _scipy_stats.probplot(_qvals, dist="norm")

                                _fig_qq = go.Figure()
                                _fig_qq.add_trace(go.Scatter(
                                    x=_q_x, y=_q_y, mode="markers",
                                    marker=dict(color=CATEGORIAS[cat_an][1], size=8, opacity=0.8),
                                    name="datos", hovertemplate="Z=%{x:.2f}<br>obs=%{y:.2f}<extra></extra>",
                                ))
                                _fig_qq.add_trace(go.Scatter(
                                    x=[float(_q_x.min()), float(_q_x.max())],
                                    y=[_q_slope * float(_q_x.min()) + _q_intercept,
                                       _q_slope * float(_q_x.max()) + _q_intercept],
                                    mode="lines",
                                    line=dict(color="#6b7280", dash="dash", width=1.5),
                                    name="referencia normal",
                                ))
                                _fig_qq.update_layout(
                                    height=250,
                                    title=dict(text=_ql, font=dict(size=13, color=_DARK["font_color"])),
                                    xaxis=dict(title="Cuantiles teóricos", **_ax_h),
                                    yaxis=dict(title="Cuantiles ordenados", **_ax_h),
                                    plot_bgcolor=_DARK["plot_bgcolor"],
                                    paper_bgcolor=_DARK["paper_bgcolor"],
                                    margin=dict(l=50, r=10, t=40, b=50),
                                    showlegend=False,
                                )
                                _qq_cols[_qi].plotly_chart(_fig_qq, width='stretch')

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 3 — COMPARAR CURVAS
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "🔄 Comparar Curvas":
        _pb3 = st.progress(0, "🔄 Cargando Comparar Curvas…")
        st.subheader("🔄 Comparación de curvas del mismo tipo — spaghetti plot")
        st.caption(
            "Superpone múltiples curvas de la misma categoría para revelar el patrón de forma compartido. "
            "**'Normalizar tiempo'** estira o comprime cada curva al mismo eje X (0–100 %), "
            "permitiendo comparar la *forma* independientemente de la duración. "
            "**'Normalizar peso'** desplaza cada curva para que empiece en 0 g — compara *cambio relativo*, "
            "no nivel absoluto.\n\n"
            "**¿Qué buscar?** Si todas las curvas de una categoría tienen forma similar (ej. todas bajan), "
            "el motor matemático podrá discriminar bien. Las curvas que van en dirección opuesta a las demás "
            "son outliers — probables errores de anotación o eventos atípicos. "
            "Usa el filtro de outliers (abajo) para aislarlos y revisarlos en Tab 1."
        )

        if df_lec is None:
            st.warning("lecturas.csv no disponible.")
        elif len(df_anot) < 2:
            st.info("Se necesitan al menos 2 anotaciones.")
        else:
            cats_multi = df_anot["categoria"].value_counts()
            cats_multi = cats_multi[cats_multi >= 2].index.tolist()

            if not cats_multi:
                st.info("Se necesitan al menos 2 curvas de la misma categoría.")
            else:
                cc1, cc2, cc3 = st.columns([3, 2, 2])
                with cc1:
                    cat_comp = st.selectbox(
                        "Categoría", cats_multi,
                        format_func=lambda k: CATEGORIAS.get(k, (k,))[0],
                    )
                with cc2:
                    norm_t = st.checkbox("Normalizar tiempo (0→100%)", value=True)
                with cc3:
                    norm_p = st.checkbox("Normalizar peso (inicio=0)", value=True)

                df_cc = df_anot[df_anot["categoria"] == cat_comp]
                st.caption(f"{len(df_cc)} curvas de '{CATEGORIAS.get(cat_comp, (cat_comp,))[0]}'")

                # ── Selector de outliers ────────────────────────────────────
                _mc_all = []
                for _oi, (_or, _orow) in enumerate(df_cc.iterrows()):
                    if cat_comp == "ciclo_servido_alimento":
                        _dur_h_oi = (_orow["t_fin"] - _orow["t_inicio"]).total_seconds() / 3600
                        _om = {
                            "duracion_min": _dur_h_oi * 60,
                            "duracion_h":   _dur_h_oi,
                            "delta_w_g":    0.0,
                            "rango_g":      0.0,
                            "pendiente_g_min": 0.0,
                        }
                    else:
                        _om = calcular_metricas(df_lec, _orow["t_inicio"], _orow["t_fin"])
                    if _om:
                        _om["_idx"]   = _oi
                        _lbl_suf = (f"  ({_om['duracion_h']:.1f}h)"
                                    if cat_comp == "ciclo_servido_alimento" else "")
                        _om["_label"] = (_orow["t_inicio"].astimezone(TZ_STGO).strftime("%m-%d %H:%M")
                                         + _lbl_suf)
                        _mc_all.append(_om)

                _ocultar_outliers: set[int] = set()
                if len(_mc_all) >= 3:
                    with st.expander("⚠️ Filtrar outliers del spaghetti", expanded=False):
                        st.caption(
                            "Selecciona la métrica para identificar curvas atípicas usando el criterio de Tukey: "
                            "una curva es outlier si su valor está fuera de [Q1 − k×IQR, Q3 + k×IQR]. "
                            "Factor k = 1.5 es el criterio estándar (los puntos más allá de las 'vallas de Tukey'). "
                            "Subir k a 2.0–3.0 es más permisivo (solo excluye los extremos más extremos). "
                            "Las curvas marcadas en rojo (×) se excluyen del spaghetti — "
                            "deselecciónalas si quieres incluirlas de nuevo. "
                            "**Nota:** un outlier de duración o Δpeso no necesariamente es una mala anotación — "
                            "puede ser un evento genuinamente largo o una comida muy pequeña."
                        )
                        _out_df = pd.DataFrame(_mc_all)
                        _out_metric_opts = (
                            ["duracion_min"]
                            if cat_comp == "ciclo_servido_alimento"
                            else ["duracion_min", "delta_w_g", "rango_g", "pendiente_g_min"]
                        )
                        _out_metric = st.selectbox(
                            "Métrica para detectar outliers",
                            _out_metric_opts,
                            format_func=lambda k: (
                                "Duración (h)"
                                if k == "duracion_min" and cat_comp == "ciclo_servido_alimento"
                                else METRICAS_LABELS.get(k, k)
                            ),
                            key="outlier_metric",
                        )
                        _out_vals = _out_df[_out_metric].values
                        _out_q1   = float(pd.Series(_out_vals).quantile(0.25))
                        _out_q3   = float(pd.Series(_out_vals).quantile(0.75))
                        _out_iqr  = _out_q3 - _out_q1
                        _out_k    = st.slider("Factor IQR", 0.5, 3.0, 1.5, 0.25, key="outlier_k",
                                              help="1.5 = criterio de Tukey estándar. Aumentar para ser más permisivo.")
                        _out_lo   = _out_q1 - _out_k * _out_iqr
                        _out_hi   = _out_q3 + _out_k * _out_iqr

                        _out_df["es_outlier"] = (
                            (_out_df[_out_metric] < _out_lo) | (_out_df[_out_metric] > _out_hi)
                        )
                        _out_n = int(_out_df["es_outlier"].sum())
                        st.caption(
                            f"Límites: [{_out_lo:.2f}, {_out_hi:.2f}]  ·  "
                            f"**{_out_n} outlier{'s' if _out_n != 1 else ''}** detectado{'s' if _out_n != 1 else ''}"
                        )

                        if _out_n > 0:
                            _out_labels = _out_df[_out_df["es_outlier"]]["_label"].tolist()
                            _out_default = _out_df[_out_df["es_outlier"]]["_idx"].tolist()
                            _excluir = st.multiselect(
                                "Curvas marcadas como outliers (deseleccionar para incluir)",
                                options=_out_df["_idx"].tolist(),
                                default=_out_default,
                                format_func=lambda i: _out_df[_out_df["_idx"] == i]["_label"].values[0]
                                           if i in _out_df["_idx"].values else str(i),
                                key="outlier_excluir",
                            )
                            _ocultar_outliers = set(_excluir)

                        # Gráfico de distribución con outliers marcados
                        _fig_out = go.Figure()
                        for _, _orow in _out_df.iterrows():
                            _is_out = bool(_orow["es_outlier"])
                            _fig_out.add_trace(go.Scatter(
                                x=[_orow["_idx"]], y=[_orow[_out_metric]],
                                mode="markers",
                                marker=dict(
                                    size=12,
                                    color="#ef4444" if _is_out else CATEGORIAS[cat_comp][1],
                                    symbol="x" if _is_out else "circle",
                                    line=dict(width=2, color="#ef4444" if _is_out else "rgba(0,0,0,0)"),
                                ),
                                name=_orow["_label"],
                                hovertemplate=f"{_orow['_label']}<br>{METRICAS_LABELS.get(_out_metric, _out_metric)}: "
                                              f"{_orow[_out_metric]:.2f}<extra></extra>",
                                showlegend=False,
                            ))
                        _ax_out = dict(
                            gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                            tickfont=dict(size=10, color=_DARK["tick_color"]), zeroline=False,
                        )
                        _fig_out.add_hline(y=_out_lo, line_dash="dash", line_color="#f87171", opacity=0.6,
                                           annotation_text=f"límite inf {_out_lo:.2f}")
                        _fig_out.add_hline(y=_out_hi, line_dash="dash", line_color="#f87171", opacity=0.6,
                                           annotation_text=f"límite sup {_out_hi:.2f}")
                        _fig_out.update_layout(
                            height=240,
                            xaxis=dict(title="Curva #", **_ax_out),
                            yaxis=dict(title=METRICAS_LABELS.get(_out_metric, _out_metric), **_ax_out),
                            plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=60, r=10, t=15, b=40),
                        )
                        st.plotly_chart(_fig_out, width='stretch')

                # Spaghetti filtrado (sin outliers seleccionados para exclusión)
                _df_cc_filtrado = df_cc.reset_index(drop=True)
                if _ocultar_outliers:
                    _df_cc_filtrado = _df_cc_filtrado[
                        ~_df_cc_filtrado.index.isin(_ocultar_outliers)
                    ]
                    st.caption(f"Spaghetti: {len(_df_cc_filtrado)} curvas (excluyendo {len(_ocultar_outliers)} outlier/s)")

                _pb3.progress(60, "🔄 Construyendo gráfico spaghetti…")
                st.plotly_chart(build_comparison_chart(df_lec, _df_cc_filtrado, norm_t, norm_p), width="stretch")
                _pb3.progress(100, "✅")
                _pb3.empty()

                with st.expander("Métricas individuales"):
                    # Reusar _mc_all ya calculado — evita segunda pasada de calcular_metricas
                    if _mc_all:
                        _mc_rows = [
                            {**{k: v for k, v in m.items() if not k.startswith("_")},
                             "Inicio": m["_label"]}
                            for m in _mc_all
                        ]
                        st.dataframe(
                            pd.DataFrame(_mc_rows).set_index("Inicio")
                            .rename(columns=METRICAS_LABELS),
                            width="stretch",
                        )

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 4 — PANEL DE FEATURES
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "📊 Panel de Features":
        _pb4 = st.progress(0, "📊 Cargando Panel de Features…")
        st.subheader("📊 Panel de Features — distribuciones y separabilidad")
        _t4_n_anot = cs_n_alim + cs_n_serv + cs_n_ruido
        st.caption(
            f"Compara las distribuciones de features entre categorías y calibra los umbrales del detector. "
            f"**Las features más discriminativas** (según {_t4_n_anot or '421'} anotaciones) son las de la familia F12 (templates canónicos): "
            "`tpl_doble_rampa` separa alimentación vs. servido en **7.63σ**, "
            "`tpl_sigmoide` en **6.03σ**, y `sim_alimentacion`/`sim_servido` en **5.80σ**. "
            "Fuera de templates, `time_to_min_s` tiene 3.59σ y `entropy_permutation` tiene 3.73σ (mejor A/R: 2.94σ). "
            "Features con <1σ de separación (ej. `stat_skewness`, `power_ratio_low`) aportan poco por sí solas."
        )

        # ── Umbrales de detección (colapsado) ─────────────────────────────
        u = umbrales
        with st.expander("⚙️ Umbrales de detección (avanzado)", expanded=False):
            st.caption(
                "Controlan qué detecta `01_genera_candidatos.py`.  \n"
                "Tras guardar, ejecutar `python 01_genera_candidatos.py` para regenerar la cola."
            )
            au1, au2 = st.columns(2)
            with au1:
                new_std = st.slider(
                    "Umbral rolling std (g)",
                    0.1, 5.0, float(u.get("umbral_std_g", 1.5)), 0.1,
                    help="Desviación estándar del peso en ventana de 5 min. Subir = menos candidatos, menos ruido.",
                )
                new_delta = st.slider(
                    "Umbral Δpeso en ventana 10 min (g)",
                    0.5, 20.0, float(u.get("umbral_delta_g", 5.0)), 0.5,
                    help="Diferencia max-min del peso en ventana de 10 min. Mínimo recomendado: 5 g.",
                )
            with au2:
                new_min_dur = st.slider(
                    "Duración mínima candidato (s)",
                    10, 300, int(u.get("min_duracion_s", 45)), 5,
                    help="Candidatos más cortos se descartan automáticamente.",
                )
                new_gap_merge = st.slider(
                    "Fusionar segmentos con gap < (s)",
                    30, 600, int(u.get("gap_merge_s", 120)), 15,
                    help="Dos segmentos separados por menos de este tiempo se fusionan en uno.",
                )
            new_min_rango = st.slider(
                "Rango mínimo del segmento (g)  ← **filtra ruido pequeño**",
                0.0, 15.0, float(u.get("min_rango_g", 4.0)), 0.5,
                help="Candidatos cuyo rango total (máx−mín) sea menor que este valor se descartan. "
                     "Un segmento de 2 g de rango en 10 min es ruido del sensor.",
            )
            if df_lec is not None and st.button("🔍 Estimar lecturas activas con estos umbrales", key="btn_est_lec"):
                with st.spinner("Calculando..."):
                    vs = max(1, u.get("ventana_std_lecturas", 10))
                    vd = max(1, u.get("ventana_delta_lecturas", 20))
                    rs = df_lec["peso_g"].rolling(vs, min_periods=2).std().fillna(0)
                    rd = (df_lec["peso_g"].rolling(vd, min_periods=2).max()
                          - df_lec["peso_g"].rolling(vd, min_periods=2).min()).fillna(0)
                    n_a = int(((rs > new_std) | (rd > new_delta)).sum())
                st.info(
                    f"**{n_a:,}** lecturas activas ({n_a/len(df_lec)*100:.1f}% de la señal).  \n"
                    f"El filtro `rango_min={new_min_rango}g` se aplica después sobre cada segmento.  \n"
                    "Ejecutar `python 01_genera_candidatos.py` para el conteo exacto de candidatos."
                )
            st.divider()
            if st.button("💾 Guardar umbrales de detección", type="primary", key="btn_guardar_umb"):
                save_umbrales({
                    **u,
                    "umbral_std_g":   new_std,
                    "umbral_delta_g": new_delta,
                    "min_rango_g":    new_min_rango,
                    "min_duracion_s": new_min_dur,
                    "gap_merge_s":    new_gap_merge,
                })
                st.success(
                    "✅ Guardado en `config/umbrales.json`.  \n"
                    "Ejecutar `python 01_genera_candidatos.py` para regenerar candidatos."
                )

        st.divider()
        st.markdown("#### Características observadas por categoría")
        st.caption("Emergen directamente de tus anotaciones. Son la base del detector de curvas.")

        if len(df_anot) == 0 or df_lec is None:
            st.caption("Aparecerán aquí a medida que anotes curvas.")
        else:
            stats_rows = []
            cats_stats = {k: df_anot[df_anot["categoria"] == k] for k in CATEGORIAS
                          if k in df_anot["categoria"].values}

            _pb4.progress(40, "📊 Calculando features por categoría…")
            _stats_mets = _batch_metricas(df_lec, cats_stats)

            for var_key, var_lbl in VARIABLES_DETECTOR:
                row = {"Variable": var_lbl}
                for cat_k, mets in _stats_mets.items():
                    vals = [m[var_key] for m in mets if var_key in m]
                    lbl_cat = CATEGORIAS[cat_k][0]
                    if len(vals) >= 2:
                        mu, sd = float(np.mean(vals)), float(np.std(vals))
                        v_min, v_max = float(np.min(vals)), float(np.max(vals))
                        row[lbl_cat] = f"{mu:+.2f} ± {sd:.2f}  [{v_min:+.1f} / {v_max:+.1f}]"
                    elif len(vals) == 1:
                        row[lbl_cat] = f"{vals[0]:+.2f}  (1 dato)"
                    else:
                        row[lbl_cat] = "—"
                row["N"] = " / ".join(str(len(cats_stats[k])) for k in cats_stats)
                stats_rows.append(row)

            if stats_rows:
                st.dataframe(pd.DataFrame(stats_rows).set_index("Variable"), width="stretch")
                _pb4.progress(100, "✅")
                _pb4.empty()

            # Reglas emergentes del detector
            st.markdown("#### Reglas emergentes del detector")
            st.caption("Se calculan automáticamente desde tus anotaciones. Copiar a `config/umbrales.json` cuando tengas suficientes datos.")
            reglas = {}
            for cat_k, mets in _stats_mets.items():
                if len(mets) < 2:
                    continue
                df_m = pd.DataFrame(mets)
                reglas[cat_k] = {
                    "n":                len(mets),
                    "duracion_min_min": round(float(df_m["duracion_min"].min()), 1),
                    "duracion_min_max": round(float(df_m["duracion_min"].max()), 1),
                    "delta_w_min":      round(float(df_m["delta_w_g"].min()), 1),
                    "delta_w_max":      round(float(df_m["delta_w_g"].max()), 1),
                    "rango_min":        round(float(df_m["rango_g"].min()), 1),
                    "pendiente_media":  round(float(df_m["pendiente_g_min"].mean()), 3),
                    "mono_media":       round(float(df_m["monotonicity"].mean()), 3) if "monotonicity" in df_m else None,
                    "mono_min":         round(float(df_m["monotonicity"].min()), 3)  if "monotonicity" in df_m else None,
                    "mono_max":         round(float(df_m["monotonicity"].max()), 3)  if "monotonicity" in df_m else None,
                    "r2_media":         round(float(df_m["r2_lineal"].mean()), 3)    if "r2_lineal" in df_m else None,
                    "zcr_media":        round(float(df_m["zcr"].mean()), 3)          if "zcr" in df_m else None,
                }

            for cat_k, r in reglas.items():
                with st.expander(f"{CATEGORIAS[cat_k][0]}  (n={r['n']})", expanded=True):
                    c1, c2, c3, c4 = st.columns(4)
                    c1.metric("Duración", f"{r['duracion_min_min']}–{r['duracion_min_max']} min")
                    c2.metric("Δpeso",    f"{r['delta_w_min']:+.1f} / {r['delta_w_max']:+.1f} g")
                    c3.metric("Rango ≥",  f"{r['rango_min']} g")
                    c4.metric("Pendiente media", f"{r['pendiente_media']:+.3f} g/min")
                    if r["mono_media"] is not None:
                        sf1, sf2, sf3 = st.columns(3)
                        sf1.metric("Monotonía media",
                                   f"{r['mono_media']:+.3f}",
                                   help=f"Rango observado: {r['mono_min']:+.2f} / {r['mono_max']:+.2f}")
                        sf2.metric("R² lineal medio", f"{r['r2_media']:.3f}",
                                   help="Cercano a 1 = tendencia muy lineal")
                        sf3.metric("ZCR derivada media", f"{r['zcr_media']:.3f}",
                                   help="Alto = señal oscilante (ruido), bajo = tendencia limpia")

            if not reglas:
                st.caption("Se necesitan ≥ 2 anotaciones por categoría para calcular reglas.")

            # ── Guía visual de features de forma ──────────────────────────────
            st.divider()
            with st.expander("📖 Guía visual — ¿qué mide cada feature de forma?", expanded=True):

                # ── Curvas template ────────────────────────────────────────────
                st.markdown("##### Curvas ideales por categoría")
                st.caption(
                    "Cada categoría tiene una 'firma de forma' característica. "
                    "Las 5 features capturan estas diferencias matemáticamente, "
                    "sin necesidad de modelos ML."
                )

                @st.cache_data(show_spinner=False)
                def _build_demo_charts():
                    t = np.linspace(0, 100, 60)
                    rng = np.random.default_rng(42)
                    # Ciclo: pre-servido bajo → salto brusco (servido) → descenso escalonado
                    _step   = np.where(t < 6, 0.0, np.where(t < 10, (t - 6) / 4, 1.0))
                    _cb     = 25 + 130 * _step
                    _drift  = -1.35 * np.clip(t - 10, 0, None)
                    _d1     = -15 * np.clip((t - 28) / 3, 0, 1)
                    _d2     = -12 * np.clip((t - 55) / 3, 0, 1)
                    _d3     = -8  * np.clip((t - 78) / 3, 0, 1)
                    ys = {
                        "alim":  200 - 0.14 * t + rng.normal(0, 0.9, 60),
                        "serv":  155 + 75 * (1 - np.exp(-0.06 * t)) + rng.normal(0, 1.2, 60),
                        "ruido": 175 + 6 * np.sin(0.25 * t) + 4 * np.sin(0.65 * t + 1.2) + rng.normal(0, 1.8, 60),
                        "ciclo": np.clip(_cb + _drift + _d1 + _d2 + _d3 + rng.normal(0, 1.5, 60), 10, 170),
                    }
                    ax = dict(
                        gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                        tickfont=dict(size=10, color=_DARK["tick_color"]),
                        showgrid=True, zeroline=False,
                    )
                    specs = {
                        "alim":  (CATEGORIAS["alimentacion"][1],          "🍽️ Alimentación"),
                        "serv":  (CATEGORIAS["servido"][1],               "🫙 Servido"),
                        "ruido": (CATEGORIAS["ruido"][1],                 "⚡ Ruido"),
                        "ciclo": (CATEGORIAS["ciclo_servido_alimento"][1], "🟡 Ciclo S/A"),
                    }
                    figs = {}
                    for key, (color, label) in specs.items():
                        fig = go.Figure()
                        fig.add_trace(go.Scatter(x=t, y=ys[key], mode="lines",
                                                  line=dict(color=color, width=2.5)))
                        fig.update_layout(
                            height=200,
                            title=dict(text=f"<b>{label}</b>",
                                       font=dict(size=13, color=_DARK["font_color"])),
                            xaxis=dict(title="% del evento", **ax),
                            yaxis=dict(title="Peso (g)", **ax),
                            plot_bgcolor=_DARK["plot_bgcolor"],
                            paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=50, r=10, t=40, b=40),
                            showlegend=False,
                        )
                        figs[key] = fig
                    return figs

                tc1, tc2, tc3 = st.columns(3)
                _demo_figs = _build_demo_charts()
                with tc1:
                    st.plotly_chart(_demo_figs["alim"], width="stretch")
                    st.markdown(
                        "**Firma típica** *(datos reales)*\n"
                        "- Monotonía ≈ **−0.09** *(baja consistente)*\n"
                        "- R² ≈ **0.57** *(sigue una recta)*\n"
                        "- ZCR ≈ **0.28** *(pocos rebotes)*\n"
                        "- Sim. alim. ≈ **+0.88**\n"
                        "- Sim. serv. ≈ **−0.88**"
                    )
                with tc2:
                    st.plotly_chart(_demo_figs["serv"], width="stretch")
                    st.markdown(
                        "**Firma típica** *(datos reales)*\n"
                        "- Monotonía ≈ **0.00** *(sube rápido, luego plana)*\n"
                        "- R² ≈ **0.24** *(no es lineal puro)*\n"
                        "- ZCR ≈ **0.20** *(pocos cambios de signo)*\n"
                        "- Sim. alim. ≈ **−0.86**\n"
                        "- Sim. serv. ≈ **+0.86**"
                    )
                with tc3:
                    st.plotly_chart(_demo_figs["ruido"], width="stretch")
                    st.markdown(
                        "**Firma típica** *(datos reales)*\n"
                        "- Monotonía ≈ **0.00** *(va y viene sin dirección)*\n"
                        "- R² ≈ **0.22** *(recta no explica nada)*\n"
                        "- ZCR ≈ **0.19** *(oscilación constante)*\n"
                        "- Sim. alim. ≈ **~0**\n"
                        "- Sim. serv. ≈ **~0**"
                    )

                st.divider()
                st.markdown("##### 🟡 Ciclo Servido/Alimento — contenedor multi-evento")
                st.caption(
                    "El ciclo **no es un candidato corto** — es el período completo desde que se sirve la comida "
                    "hasta el próximo servido (18–50 h). Engloba varios sub-eventos: "
                    "1 servido → múltiples alimentaciones → plateau final. "
                    "Sus shape features (monotonía, R², sim_coseno) **no aplican** directamente; "
                    "se caracteriza por duración, composición y tasa de consumo."
                )
                cc1, cc2, cc3 = st.columns([2, 1, 1])
                with cc1:
                    st.plotly_chart(_demo_figs["ciclo"], width="stretch")
                with cc2:
                    st.markdown(
                        "**Firma típica** *(C1 real)*\n"
                        "- Duración ≈ **18–50 h**\n"
                        "- 1 🫙 servido al inicio\n"
                        "- 8 🍽️ alimentaciones (C1)\n"
                        "- 4 ⚡ ruidos descartados\n"
                        "- Δ peso total ≈ **−34 g**\n"
                        "- Tasa consumo ≈ **−0.7 g/h**"
                    )
                with cc3:
                    st.markdown(
                        "**Detectado por:**\n"
                        "- Ventana de **18–50 h**\n"
                        "- Inicio = evento 🫙 Servido\n"
                        "- Fin = siguiente 🫙 Servido\n"
                        "- Peso inicial >> peso final\n"
                        "- Visualizado como **banda 🟡** en Vista Global"
                    )

                # ── Box plots distribución real ────────────────────────────────
                df_merged_feat = None
                if df_cand is not None and "monotonicity" in df_cand.columns and len(df_anot) > 0:
                    df_merged_feat = df_cand.merge(
                        df_anot[["id_candidato", "categoria"]].dropna(),
                        on="id_candidato", how="inner",
                    )

                if df_merged_feat is not None and len(df_merged_feat) > 0:
                    st.divider()
                    st.markdown("##### Distribución real por categoría")
                    st.caption(
                        f"Box plots calculados desde las {len(df_merged_feat)} anotaciones actuales. "
                        "La separación entre cajas = capacidad discriminadora de la feature."
                    )

                    _cat_colors = {k: v[1] for k, v in CATEGORIAS.items()}
                    _cat_order  = ["alimentacion", "servido", "ruido", "ciclo_servido_alimento"]

                    def _boxplot(col, title, caption_txt):
                        fig = go.Figure()
                        for cat_k in _cat_order:
                            sub = df_merged_feat[df_merged_feat["categoria"] == cat_k][col].dropna()
                            if len(sub) == 0:
                                continue
                            fig.add_trace(go.Box(
                                y=sub, name=CATEGORIAS[cat_k][0],
                                marker_color=_cat_colors[cat_k],
                                boxpoints="outliers", jitter=0.35,
                                whiskerwidth=0.6, line_width=2,
                            ))
                        fig.update_layout(
                            height=280,
                            title=dict(text=f"<b>{title}</b>",
                                       font=dict(size=12, color=_DARK["font_color"])),
                            yaxis=dict(
                                gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                                tickfont=dict(size=10, color=_DARK["tick_color"]),
                                showgrid=True, zeroline=False,
                            ),
                            xaxis=dict(tickfont=dict(size=10, color=_DARK["tick_color"])),
                            plot_bgcolor=_DARK["plot_bgcolor"],
                            paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=45, r=10, t=40, b=10),
                            showlegend=False,
                        )
                        return fig

                    bp1, bp2, bp3 = st.columns(3)
                    with bp1:
                        st.plotly_chart(_boxplot("monotonicity", "Monotonía [-1, +1]", ""), width="stretch")
                        st.caption("**Alimentación negativa, ruido/servido en 0.** El discriminador más claro para separar alimentación.")
                    with bp2:
                        st.plotly_chart(_boxplot("r2_lineal", "R² lineal [0, 1]", ""), width="stretch")
                        st.caption("**Alimentación ajusta mejor a recta.** Ruido y servido tienen R² bajo — sus curvas no son lineales.")
                    with bp3:
                        st.plotly_chart(_boxplot("zcr", "ZCR derivada [0, 1]", ""), width="stretch")
                        st.caption("**Feature complementaria.** Sola no discrimina bien, pero combinada con monotonía y R² refuerza la regla.")

                    # ── Mapa 2D de similitud coseno ────────────────────────────
                    st.divider()
                    st.markdown("##### Mapa 2D — similitud coseno")
                    st.caption(
                        "**El mejor separador visual de alimentación, servido y ruido en un solo gráfico.** "
                        "Cada punto es un candidato corto anotado. "
                        "El eje X mide cuánto se parece a una rampa de bajada (alimentación ideal), "
                        "el eje Y a una rampa de subida (servido ideal). "
                        "Ruido queda atrapado cerca del origen porque no se parece a ninguna. "
                        "🟡 Ciclo S/A no aparece aquí — es un contenedor multi-hora sin shape features de candidato."
                    )

                    fig_cos = go.Figure()
                    for cat_k in _cat_order:
                        sub = df_merged_feat[df_merged_feat["categoria"] == cat_k]
                        if len(sub) == 0:
                            continue
                        fig_cos.add_trace(go.Scatter(
                            x=sub["sim_alimentacion"], y=sub["sim_servido"],
                            mode="markers",
                            name=CATEGORIAS[cat_k][0],
                            marker=dict(
                                size=9, color=_cat_colors[cat_k], opacity=0.78,
                                line=dict(width=1, color="white"),
                            ),
                            hovertemplate=(
                                f"<b>{CATEGORIAS[cat_k][0]}</b><br>"
                                "sim_alim=%{x:.2f}<br>sim_serv=%{y:.2f}<extra></extra>"
                            ),
                        ))

                    # Líneas de cuadrante y zonas de decisión
                    fig_cos.add_hline(y=0.0, line_dash="dot",
                                      line_color="rgba(255,255,255,0.15)", line_width=1)
                    fig_cos.add_vline(x=0.0, line_dash="dot",
                                      line_color="rgba(255,255,255,0.15)", line_width=1)
                    # Umbrales de decisión
                    fig_cos.add_vline(x=0.7,  line_dash="dash",
                                      line_color="rgba(0,180,90,0.4)", line_width=1.5,
                                      annotation_text="umbral alim.",
                                      annotation_font=dict(color=CATEGORIAS["alimentacion"][1], size=10),
                                      annotation_position="top right")
                    fig_cos.add_hline(y=0.7, line_dash="dash",
                                      line_color="rgba(30,100,255,0.4)", line_width=1.5,
                                      annotation_text="umbral serv.",
                                      annotation_font=dict(color=CATEGORIAS["servido"][1], size=10),
                                      annotation_position="top right")

                    _ax_cos = dict(
                        gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                        tickfont=dict(size=11, color=_DARK["tick_color"]),
                        showgrid=True, zeroline=False, range=[-1.05, 1.05],
                    )
                    fig_cos.update_layout(
                        height=430,
                        xaxis=dict(title=dict(text="Similitud con template Alimentación →", font=dict(size=12, color=_DARK["label_color"])), **_ax_cos),
                        yaxis=dict(title=dict(text="← Similitud con template Servido →",   font=dict(size=12, color=_DARK["label_color"])), **_ax_cos),
                        plot_bgcolor=_DARK["plot_bgcolor"],
                        paper_bgcolor=_DARK["paper_bgcolor"],
                        margin=dict(l=65, r=20, t=20, b=70),
                        legend=dict(
                            orientation="h", y=1.04, x=0,
                            font=dict(color=_DARK["tick_color"]),
                            bgcolor="rgba(0,0,0,0)",
                        ),
                    )
                    st.plotly_chart(fig_cos, width="stretch")

                    # ── Scatter monotonía vs R² ────────────────────────────────
                    with st.expander("Scatter: Monotonía vs R² lineal"):
                        fig_sc2 = go.Figure()
                        for cat_k in _cat_order:
                            sub = df_merged_feat[df_merged_feat["categoria"] == cat_k]
                            if len(sub) == 0:
                                continue
                            fig_sc2.add_trace(go.Scatter(
                                x=sub["monotonicity"], y=sub["r2_lineal"],
                                mode="markers",
                                name=CATEGORIAS[cat_k][0],
                                marker=dict(size=8, color=_cat_colors[cat_k], opacity=0.75,
                                            line=dict(width=1, color="white")),
                                hovertemplate=(
                                    f"<b>{CATEGORIAS[cat_k][0]}</b><br>"
                                    "mono=%{x:.3f}<br>R²=%{y:.3f}<extra></extra>"
                                ),
                            ))
                        _ax_s2 = dict(
                            gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                            tickfont=dict(size=11, color=_DARK["tick_color"]),
                            showgrid=True, zeroline=False,
                        )
                        fig_sc2.update_layout(
                            height=340,
                            xaxis=dict(title=dict(text="Monotonía [-1, +1]", font=dict(size=12, color=_DARK["label_color"])), **_ax_s2),
                            yaxis=dict(title=dict(text="R² lineal [0, 1]",   font=dict(size=12, color=_DARK["label_color"])), **_ax_s2),
                            plot_bgcolor=_DARK["plot_bgcolor"],
                            paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=65, r=20, t=20, b=65),
                            legend=dict(orientation="h", y=1.04, x=0,
                                        font=dict(color=_DARK["tick_color"]),
                                        bgcolor="rgba(0,0,0,0)"),
                        )
                        st.plotly_chart(fig_sc2, width="stretch")
                        st.caption(
                            "Alimentación se concentra en la región **monotonía < −0.05 y R² > 0.4** "
                            "(bajada consistente y lineal). Ruido y servido se solapan más — "
                            "por eso la similitud coseno los separa mejor."
                        )

        # ── Glosario ────────────────────────────────────────────────────────
        with st.expander("📚 Glosario — conceptos y métricas utilizados", expanded=False):
            st.markdown("""
### ¿Qué mide cada métrica?

Esta sección explica cada concepto usado en el detector de eventos del comedero inteligente,
con links para profundizar.

---

#### 🔢 Métricas de forma de curva (*shape features*)

| Métrica | Rango | Qué mide |
|---|---|---|
| **Monotonía** | −1 a +1 | Consistencia de dirección: −1 baja siempre, +1 sube siempre, 0 oscila |
| **R² lineal** | 0 a 1 | Qué tan bien describe una recta la tendencia: alto = tendencia limpia, bajo = ruido |
| **ZCR derivada** | 0 a 1 | Tasa de cambios de signo en la derivada: alto = muchos rebotes (ruido) |
| **Similitud coseno** | −1 a +1 | Parecido del segmento con una rampa ideal de bajada (alim.) o subida (serv.) |

---

#### 📖 Descripción detallada

**Monotonía (Monotonicity Index)**
Promedio del signo de la derivada discreta `mean(sign(diff(valores)))`.
Si la señal baja de forma consistente → −1. Si sube → +1. Si oscila → cerca de 0.
Alimentación: media=−0.090 (p10=−0.148, p90=−0.027). Servido: +0.008. Ruido: −0.008.
Umbral detector: monotonicity < −0.03 confirma que hay bajada sostenida.
🔗 [Función monótona — Wikipedia](https://es.wikipedia.org/wiki/Funci%C3%B3n_mon%C3%B3tona)

---

**R² — Coeficiente de determinación**
Mide qué proporción de la varianza de la señal explica una recta ajustada por mínimos cuadrados.
`R² = 1 − SS_res / SS_tot`. R² = 1 → ajuste perfecto. R² = 0 → la recta no explica nada.
Alimentación: media=0.570 (p10=0.391, p90=0.726). Servido: 0.240. Ruido: 0.233.
Umbral detector: r2 > 0.35 complementa la detección de alimentación.
🔗 [Coeficiente de determinación — Wikipedia](https://es.wikipedia.org/wiki/Coeficiente_de_determinaci%C3%B3n)
🔗 [numpy.polyfit — documentación](https://numpy.org/doc/stable/reference/generated/numpy.polyfit.html)

---

**ZCR — Zero-Crossing Rate de la derivada**
Fracción de muestras de la derivada donde el signo cambia respecto a la muestra anterior.
`ZCR = count(diff(sign(dy)) ≠ 0) / len(dy)`. Alto → señal muy ruidosa con muchos cambios de dirección.
Alimentación: media=0.277. Servido: 0.185. Ruido: 0.208. Discriminador complementario, no primario.
🔗 [Zero-crossing rate — Wikipedia (EN)](https://en.wikipedia.org/wiki/Zero-crossing_rate)

---

**Similitud coseno con templates ideales** *(mejor discriminador)*
Se normaliza el segmento (relativo a su punto de inicio) y se compara contra dos plantillas:
- **Template bajada**: rampa lineal de 0 a −1 → ideal de alimentación
- **Template subida**: rampa lineal de 0 a +1 → ideal de servido

`cos(θ) = (a · b) / (||a|| · ||b||)`. Valor +1 = alineado perfecto, 0 = sin relación, −1 = opuesto.
Alimentación: sim_alim=+0.881 (p10=+0.800). Servido: sim_serv=+0.875 (p10=+0.826). Ruido: ~0 en ambas.
Umbral detector: sim > 0.70 como regla primaria (cubre 90%+ de casos reales).
🔗 [Similitud coseno — Wikipedia](https://es.wikipedia.org/wiki/Similitud_coseno)

---

**Pendiente lineal (g/min)**
Coeficiente angular del ajuste de mínimos cuadrados sobre el segmento, convertido a g/min.
Alimentación: −1.61 g/min media. Servido: +39.4 g/min media. Ruido: +0.02 g/min.
🔗 [Regresión lineal simple — Wikipedia](https://es.wikipedia.org/wiki/Regresi%C3%B3n_lineal_simple)

---

#### 🛠️ Conceptos del pipeline de detección

**Resampleo a 30s**
Las lecturas del sensor llegan de forma irregular. Se re-discretiza a intervalos fijos de 30 segundos
usando el promedio de cada ventana y *forward-fill* de máximo 2 slots (60s) para rellenar pequeños huecos.
Gaps > 60s quedan como NaN y marcan posibles cortes de energía.
🔗 [pandas.resample — documentación](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.resample.html)

---

**Detección de actividad (std + delta rodante)**
Se calcula la desviación estándar rodante y el rango rodante de la señal.
Si cualquiera supera el umbral (`umbral_std_g` o `umbral_delta_g`), la ventana se marca "activa".
El resultado se extiende ±1 min para no cortar inicio/fin de eventos reales.

---

**Fusión de segmentos cercanos (gap_merge_s)**
Segmentos activos separados por menos de `gap_merge_s` segundos (default: 120s) se unen en uno solo.
Esto evita partir un evento de alimentación largo en múltiples fragmentos por una pausa breve del sensor.

---

**CUSUM — Cumulative SUM control chart** *(propuesto para mejora futura)*
Técnica de control estadístico de procesos que acumula la diferencia entre la señal y una media objetivo.
Detecta cambios de nivel de forma muy sensible incluso con señales ruidosas.
🔗 [CUSUM — Wikipedia (EN)](https://en.wikipedia.org/wiki/CUSUM)
🔗 [ruptures — librería Python para detección de cambios](https://centre-borelli.github.io/ruptures-docs/)

---

#### 🗂️ Categorías de eventos

| Categoría | Criterio principal | Valores típicos |
|---|---|---|
| **Alimentación** | sim_alim > 0.70, monotonía < −0.03, Δpeso < −3g, duración 1–20 min | −12.2g media, 6.9 min, n=160 |
| **Servido** | sim_serv > 0.70, Δpeso > +20g, duración < 15 min | +64.8g media, 4.1 min, n=31 |
| **Ruido** | Todo lo demás — sin forma clara (sim_alim ≈ 0 y sim_serv ≈ 0) | Δpeso ~+0.8g, rango ~30g, n=113 |
| **🟡 Ciclo S/A** | Contenedor multi-evento: desde un servido hasta el siguiente. Inicio = 🫙 Servido, fin = próximo 🫙 Servido. Duración 18–50 h. | 27 ciclos, media ~29 h, Δpeso promedio −34 g, tasa −0.7 g/h |

---

🔗 **Recursos adicionales**
- [Detección de anomalías en series de tiempo — Towards Data Science](https://towardsdatascience.com/time-series-anomaly-detection-algorithms-1cc4f9c87b7d)
- [Feature engineering para señales de sensores — Medium](https://medium.com/@daniel.klotz/feature-engineering-for-time-series-forecasting-with-pandas-and-numpy-b0e97e7e9fbe)
- [scipy.signal — procesamiento de señales](https://docs.scipy.org/doc/scipy/reference/signal.html)
- [Plotly — gráficos interactivos en Python](https://plotly.com/python/)
""")

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 5 — MOTOR MATEMÁTICO V2
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "🧮 Motor Matemático":
        _pb5 = st.progress(0, "🧮 Iniciando Motor Matemático…")
        st.subheader("🧮 Motor Matemático v2 — Análisis completo de curvas")
        st.caption(
            "102 features matemáticas organizadas en 15 familias (F00–F14). "
            "Sin ML — geometría diferencial, entropías, análisis frecuencial, templates y más. "
            "Basado en `shape_features_v2.py`."
        )

        if not _MOTOR_V2_OK:
            st.error(
                "❌ `shape_features_v2.py` no encontrado en el mismo directorio.  \n"
                "Copiar junto a `app_anotacion_av2.py` y reiniciar la app."
            )
        elif df_lec is None:
            st.warning("Lecturas no disponibles — colocar readings.csv y readings_rows.csv.")
        else:
            # ── Selector de candidato ──────────────────────────────────────
            st.markdown("#### Seleccionar segmento a analizar")
            mm_col1, mm_col2 = st.columns([2, 3])
            with mm_col1:
                cand_ids = df_cand["id_candidato"].tolist()
                cand_sel = st.selectbox(
                    "ID candidato",
                    cand_ids,
                    index=min(st.session_state.idx_actual, len(cand_ids) - 1),
                    key="motor_cand_id",
                    format_func=lambda x: f"#{x}  {df_cand[df_cand['id_candidato']==x]['t_inicio'].iloc[0].astimezone(TZ_STGO).strftime('%m-%d %H:%M') if len(df_cand[df_cand['id_candidato']==x])>0 else ''}",
                )

            cand_row = df_cand[df_cand["id_candidato"] == cand_sel]
            if len(cand_row) == 0:
                st.warning("Candidato no encontrado.")
                st.stop()

            cand_r  = cand_row.iloc[0]
            t_ini_m = cand_r["t_inicio"]
            t_fin_m = cand_r["t_fin"]
            dir_m   = str(cand_r.get("direction", "mixto"))

            with mm_col2:
                t_s = t_ini_m.astimezone(TZ_STGO)
                t_e = t_fin_m.astimezone(TZ_STGO)
                st.info(
                    f"**{t_s.strftime('%Y-%m-%d %H:%M')} → {t_e.strftime('%H:%M')}**  |  "
                    f"Dirección: {dir_m}  |  "
                    f"Δpeso: {cand_r.get('delta_w_total', 0):+.1f} g  |  "
                    f"Duración: {cand_r.get('duracion_min', 0):.1f} min"
                )

            # ── Extraer lecturas y calcular features v2 ────────────────────
            mask_m  = (df_lec["ts"] >= t_ini_m) & (df_lec["ts"] <= t_fin_m)
            sub_m   = df_lec[mask_m]["peso_g"].dropna().values
            feats_v2: dict = {}

            if len(sub_m) >= 2:
                _pb5.progress(40, "⚙️ Calculando 102 features…")
                feats_v2 = _calcular_features_v2_cached(sub_m, resample_s=RESAMPLE_S)
                feats_v2["delta_w_g"]    = round(float(sub_m[-1] - sub_m[0]), 2)
                feats_v2["duracion_min"] = round((t_fin_m - t_ini_m).total_seconds() / 60, 2)
                _pb5.progress(75, "📊 Construyendo visualizaciones…")
            else:
                st.warning("Segmento demasiado corto para calcular features.")

            if feats_v2:
                # ── Gráfico del segmento ───────────────────────────────────
                fig_m = build_chart(df_lec, t_ini_m, t_fin_m, df_anot, dir_m,
                                    height=320, title="Curva de peso del segmento")
                st.plotly_chart(fig_m, width="stretch")
                _pb5.progress(100, "✅")
                _pb5.empty()

                # ── Evidence Engine ────────────────────────────────────────
                st.markdown("---")
                st.markdown("#### Predicción — Evidence Engine")
                _ev_n_anot = cs_n_alim + cs_n_serv + cs_n_ruido
                st.caption(
                    f"El Evidence Engine combina **23 features con pesos calibrados** "
                    f"sobre {_ev_n_anot or '417'} anotaciones (alim={cs_n_alim} · serv={cs_n_serv} · ruido={cs_n_ruido}). "
                    "Fórmula: para cada categoría se acumula `Σ(w_i × feature_i)`, con un prior leve de +0.5 hacia 'ruido'. "
                    "Luego se aplica **softmax** para convertir los scores en probabilidades (suman 100 %). "
                    "**Cómo interpretar los scores:** Score Alim. > 70 % = el motor está bastante seguro de que Bandida comió. "
                    "Score < 50 % en todas = caso ambiguo, revisar manualmente. "
                    "Los **pesos más fuertes** son `sim_alimentacion` y `sim_servido` (±5.0): "
                    "la dirección y forma general de la curva es la evidencia más potente."
                )
                ev = evidence_score(feats_v2)
                eg1, eg2, eg3, eg4 = st.columns(4)
                col_pred = {
                    "alimentacion": CATEGORIAS["alimentacion"][1],
                    "servido":      CATEGORIAS["servido"][1],
                    "ruido":        CATEGORIAS["ruido"][1],
                }.get(ev["prediccion"], "#888")
                eg1.metric("Predicción", CATEGORIAS.get(ev["prediccion"], (ev["prediccion"],))[0],
                           help=ev["razon"])
                eg2.metric("Score Alimentación", f"{ev['score_alimentacion']:.1%}")
                eg3.metric("Score Servido",      f"{ev['score_servido']:.1%}")
                eg4.metric("Score Ruido",        f"{ev['score_ruido']:.1%}")

                # Barras de evidencia
                fig_ev = go.Figure()
                cats_ev  = ["🍽️ Alimentación", "🫙 Servido", "⚡ Ruido"]
                scores_v = [ev["score_alimentacion"], ev["score_servido"], ev["score_ruido"]]
                colors_v = [CATEGORIAS["alimentacion"][1], CATEGORIAS["servido"][1], CATEGORIAS["ruido"][1]]
                fig_ev.add_trace(go.Bar(
                    x=cats_ev, y=scores_v,
                    marker_color=colors_v, opacity=0.85,
                    text=[f"{v:.1%}" for v in scores_v],
                    textposition="outside",
                ))
                fig_ev.update_layout(
                    height=240,
                    yaxis=dict(range=[0, 1.1], title="Score", tickformat=".0%",
                               gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    xaxis=dict(tickfont=dict(color=_DARK["tick_color"])),
                    plot_bgcolor=_DARK["plot_bgcolor"],
                    paper_bgcolor=_DARK["paper_bgcolor"],
                    margin=dict(l=50, r=20, t=20, b=40),
                    showlegend=False,
                )
                st.plotly_chart(fig_ev, width="stretch")

                # Clasificador determinístico
                det_v2 = _clasificar_v2(feats_v2)
                st.caption(
                    f"🔎 **Clasificador determinístico v1.2:** {CATEGORIAS.get(det_v2, (det_v2,))[0]}  |  "
                    f"🧠 **Evidence Engine:** {CATEGORIAS.get(ev['prediccion'], (ev['prediccion'],))[0]} "
                    f"(confianza {ev['confianza']:.1%})  \n"
                    "El **clasificador determinístico** aplica reglas de umbral directas sobre `sim_alimentacion`, "
                    "`sim_servido`, `monotonicity` y `zcr` — rápido y totalmente interpretable. "
                    "El **Evidence Engine** usa softmax sobre 23 features ponderadas — más matizado en casos borderline. "
                    "Cuando difieren, el Evidence Engine suele ser más confiable; "
                    "el determinístico puede usarse como verificación rápida de cordura."
                )

                # ── Resumen textual ────────────────────────────────────────
                st.markdown("---")
                st.markdown("#### Resumen del vector de features")
                st.code(resumen_features(feats_v2))

                # ── Vector de features por familia (tabla expandible) ──────
                st.markdown("---")
                st.markdown("#### Vector de features completo")
                st.caption(
                    f"**{len(feats_v2)} features** calculadas para el segmento seleccionado, "
                    "organizadas por las 14 familias del Motor Matemático v2."
                )

                families = feature_list_by_family()
                fam_order = [
                    "F00_clasicas", "F01_derivadas", "F02_curvatura", "F03_arco",
                    "F04_tortuosidad", "F05_energia", "F06_entropias", "F07_fractal",
                    "F08_lempel_ziv", "F09_frecuencial", "F10_robusta", "F11_topologia",
                    "F12_templates", "F13_dinamica", "F14_compuestos",
                ]
                fam_labels = {
                    "F00_clasicas":   "F00 — Clásicas base (v1)",
                    "F01_derivadas":  "F01 — Geometría diferencial",
                    "F02_curvatura":  "F02 — Curvatura κ",
                    "F03_arco":       "F03 — Longitud de arco",
                    "F04_tortuosidad":"F04 — Tortuosidad",
                    "F05_energia":    "F05 — Energía",
                    "F06_entropias":  "F06 — Entropías",
                    "F07_fractal":    "F07 — Dimensión fractal",
                    "F08_lempel_ziv": "F08 — Complejidad Lempel-Ziv",
                    "F09_frecuencial":"F09 — Análisis frecuencial",
                    "F10_robusta":    "F10 — Estadística robusta",
                    "F11_topologia":  "F11 — Topología (picos/valles)",
                    "F12_templates":  "F12 — Templates canónicos (cos)",
                    "F13_dinamica":   "F13 — Dinámica temporal",
                    "F14_compuestos": "F14 — Features derivadas",
                }
                for fam in fam_order:
                    fnames = families.get(fam, [])
                    fnames_here = [f for f in fnames if f in feats_v2]
                    if not fnames_here:
                        continue
                    label = fam_labels.get(fam, fam)
                    with st.expander(f"{label}  ({len(fnames_here)} features)", expanded=(fam == "F00_clasicas")):
                        rows_f = []
                        for fname in fnames_here:
                            val  = feats_v2[fname]
                            meta = REGISTRY.get(fname, {})
                            rows_f.append({
                                "Feature":      fname,
                                "Valor":        val,
                                "Unidad":       meta.get("unidad", ""),
                                "Rango típico": str(meta.get("rango", "")),
                                "Fórmula":      meta.get("formula", ""),
                                "Significado":  meta.get("significado", ""),
                            })
                        df_fam = pd.DataFrame(rows_f)
                        st.dataframe(df_fam.set_index("Feature"), width="stretch")

                # ── Cuadro comparativo entre categorías ───────────────────
                st.markdown("---")
                st.markdown("#### Cuadro comparativo — todas las features × categoría")
                _cs_total = cs_n_alim + cs_n_serv + cs_n_ruido
                st.caption(
                    "Compara el valor del candidato con los promedios empíricos de cada categoría "
                    f"(basados en **{_cs_total} anotaciones** del Ciclo Alpha v2).  \n"
                    "**🟢 Verde** = el candidato está dentro de µ ± 1σ de esa categoría (valor 'normal' para esa clase).  \n"
                    "**sep_AS** = separación Alim/Serv en σ pooled: `|µ_A − µ_S| / √((σ_A² + σ_S²)/2)`. "
                    "**>3σ** = feature muy discriminativa; **<1σ** = las categorías se solapan en esa feature.  \n"
                    "**sep_AR** = separación Alim/Ruido. Las features con alto sep_AR ayudan a distinguir "
                    "alimentaciones de falsos positivos. Top: `d1_frac_neg` (4.08σ), `zcr` (3.68σ), "
                    "`entropy_permutation` (3.05σ), `entropy_shannon` (2.65σ)."
                )

                # Estadísticas cargadas dinámicamente desde comp_stats_v2.json
                COMP_STATS = cs_dict  # todas las 102 features; se actualiza con "🔄 Actualizar Todo"
                if not COMP_STATS:
                    st.warning(
                        "`comp_stats_v2.json` no encontrado. "
                        "Presiona **🔄 Actualizar Todo** en el encabezado para generarlo."
                    )
                n_alim = cs_n_alim; n_serv = cs_n_serv; n_ruido = cs_n_ruido
                comp_rows = []
                for fname, cat_stats in COMP_STATS.items():
                    val_cand = feats_v2.get(fname, None)
                    st_a = cat_stats.get("alimentacion", {})
                    st_s = cat_stats.get("servido",      {})
                    st_r = cat_stats.get("ruido",        {})
                    mu_a = st_a.get("mean", 0) or 0
                    sd_a = st_a.get("std",  1) or 1
                    mu_s = st_s.get("mean", 0) or 0
                    sd_s = st_s.get("std",  1) or 1
                    mu_r = st_r.get("mean", 0) or 0
                    sd_r = st_r.get("std",  1) or 1
                    n_a  = st_a.get("n", 0)
                    n_s  = st_s.get("n", 0)
                    n_r  = st_r.get("n", 0)

                    sep_as = abs(mu_a - mu_s) / max((sd_a + sd_s) / 2, 1e-6)
                    sep_ar = abs(mu_a - mu_r) / max((sd_a + sd_r) / 2, 1e-6)

                    comp_rows.append({
                        "Feature":                    fname,
                        "Familia":                    cat_stats.get("familia", REGISTRY.get(fname, {}).get("familia", "—")),
                        "Valor candidato":             f"{val_cand:+.3f}" if val_cand is not None else "—",
                        f"Alim. µ±σ (n={n_a})":      f"{mu_a:+.3f} ± {sd_a:.3f}",
                        f"Servido µ±σ (n={n_s})":     f"{mu_s:+.3f} ± {sd_s:.3f}",
                        f"Ruido µ±σ (n={n_r})":       f"{mu_r:+.3f} ± {sd_r:.3f}",
                        "Sep. alim/serv (σ)":          f"{sep_as:.1f}σ",
                        "Sep. alim/ruido (σ)":         f"{sep_ar:.1f}σ",
                        "Fórmula":                    REGISTRY.get(fname, {}).get("formula", "—"),
                        "Significado":                REGISTRY.get(fname, {}).get("significado", "—"),
                    })

                if comp_rows:
                    df_comp_v2 = pd.DataFrame(comp_rows).set_index("Feature")
                    st.dataframe(df_comp_v2, width="stretch")

                # ── Cálculo en vivo del cuadro comparativo ─────────────────
                with st.expander("📊 Calcular cuadro comparativo completo (puede tardar ~2 min)", expanded=False):
                    st.caption(
                        "Extrae las 102 features para TODAS las anotaciones y calcula media ± std "
                        "por categoría. Se limita a 40 anotaciones por categoría para que sea rápido."
                    )
                    max_per_cat = st.slider("Máx anotaciones por categoría", 5, 60, 20, 5,
                                            key="mm_max_per_cat")
                    if st.button("▶ Calcular cuadro comparativo", type="primary", key="btn_calc_comp"):
                        if len(df_anot) == 0:
                            st.warning("No hay anotaciones disponibles.")
                        else:
                            prog = st.progress(0.0, text="Calculando features…")
                            cat_feats: dict[str, list[dict]] = {k: [] for k in CATEGORIAS}

                            df_anot_s = df_anot.copy()
                            # Limitar por categoría
                            df_sample = pd.concat([
                                df_anot_s[df_anot_s["categoria"] == cat].head(max_per_cat)
                                for cat in CATEGORIAS
                            ]).reset_index(drop=True)
                            n_total = len(df_sample)

                            for i_row, (_, row) in enumerate(df_sample.iterrows()):
                                prog.progress((i_row + 1) / max(n_total, 1),
                                              text=f"Fila {i_row+1}/{n_total}…")
                                cat = str(row.get("categoria", ""))
                                if cat not in CATEGORIAS:
                                    continue
                                mask_r = (df_lec["ts"] >= row["t_inicio"]) & \
                                         (df_lec["ts"] <= row["t_fin"])
                                sub_r = df_lec[mask_r]["peso_g"].dropna().values
                                if len(sub_r) < 3:
                                    continue
                                try:
                                    fv = _extraer_v2(sub_r, resample_s=RESAMPLE_S)
                                    cat_feats[cat].append(fv)
                                except Exception:
                                    pass

                            prog.empty()

                            # Construir cuadro comparativo
                            all_feat_names = sorted(set(
                                k for lst in cat_feats.values() for d in lst for k in d
                            ))
                            comp_live = []
                            for fname in all_feat_names:
                                row_c: dict = {
                                    "Feature":  fname,
                                    "Familia":  REGISTRY.get(fname, {}).get("familia", "—"),
                                    "Valor":    f"{feats_v2.get(fname, 0):+.4f}" if fname in feats_v2 else "—",
                                }
                                for cat in CATEGORIAS:
                                    vals_c = [d[fname] for d in cat_feats[cat] if fname in d]
                                    if len(vals_c) >= 2:
                                        mu_c = float(np.mean(vals_c))
                                        sd_c = float(np.std(vals_c))
                                        row_c[f"{CATEGORIAS[cat][0]}"] = f"{mu_c:+.3f}±{sd_c:.3f}"
                                    elif len(vals_c) == 1:
                                        row_c[f"{CATEGORIAS[cat][0]}"] = f"{vals_c[0]:+.3f} (n=1)"
                                    else:
                                        row_c[f"{CATEGORIAS[cat][0]}"] = "—"
                                # Separación alim vs servido
                                va = [d[fname] for d in cat_feats["alimentacion"] if fname in d]
                                vs = [d[fname] for d in cat_feats["servido"]      if fname in d]
                                vr = [d[fname] for d in cat_feats["ruido"]        if fname in d]
                                if va and vs:
                                    sep = abs(np.mean(va) - np.mean(vs)) / max((np.std(va) + np.std(vs)) / 2, 1e-6)
                                    row_c["Sep A/S (σ)"] = f"{sep:.1f}σ"
                                else:
                                    row_c["Sep A/S (σ)"] = "—"
                                row_c["Significado"] = REGISTRY.get(fname, {}).get("significado", "")[:60]
                                comp_live.append(row_c)

                            st.success(f"✅ Cuadro comparativo calculado: {len(comp_live)} features × 3 categorías")
                            df_live = pd.DataFrame(comp_live).set_index("Feature")
                            st.dataframe(df_live, width="stretch", height=520)

                            # Descargar CSV
                            st.download_button(
                                "📥 Descargar cuadro comparativo (.csv)",
                                df_live.to_csv().encode(),
                                file_name=f"cuadro_comparativo_motor_v2_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                                mime="text/csv",
                            )

                # ── Visualizaciones ────────────────────────────────────────
                st.markdown("---")
                st.markdown("#### Visualizaciones del vector de features")

                # Gráfico de radar con las 8 features más discriminativas (F00 + top F12)
                radar_features = [
                    ("sim_alimentacion", "Sim.Alim"),
                    ("sim_servido",      "Sim.Serv"),
                    ("monotonicity",     "Monotonía"),
                    ("r2_lineal",        "R²"),
                    ("tpl_ramp_down",    "Tpl↓"),
                    ("tpl_ramp_up",      "Tpl↑"),
                    ("straightness",     "Rectitud"),
                    ("idx_linearity",    "Linealidad"),
                    ("autocorr_lag1",    "ACF lag1"),
                    ("power_ratio_low",  "P bajas frec"),
                ]
                radar_vals = [float(feats_v2.get(k, 0.0)) for k, _ in radar_features]
                radar_lbls = [lbl for _, lbl in radar_features]

                # Normalizar a [0, 1] para el radar (shift: +1)/2 para features ∈ [-1,1]
                radar_norm = [min(max((v + 1) / 2, 0), 1) for v in radar_vals]

                fig_radar = go.Figure(go.Scatterpolar(
                    r=radar_norm + [radar_norm[0]],
                    theta=radar_lbls + [radar_lbls[0]],
                    fill="toself",
                    fillcolor="rgba(249,115,22,0.15)",
                    line=dict(color="#f97316", width=2.5),
                    name="Candidato",
                ))
                # Referencias por categoría (valores normalizados)
                _ref = {
                    "alimentacion": [0.881, -0.881, -0.090, 0.570, 0.881, -0.881, 0.70, 0.40, 0.70, 0.65],
                    "servido":      [-0.875, 0.875, 0.008, 0.240, -0.875, 0.875, 0.50, 0.05, 0.50, 0.40],
                    "ruido":        [0.021, -0.021, -0.008, 0.233, 0.021, -0.021, 0.30, 0.02, 0.30, 0.45],
                }
                for cat_k, cat_ref in _ref.items():
                    ref_norm = [min(max((v + 1) / 2, 0), 1) for v in cat_ref]
                    fig_radar.add_trace(go.Scatterpolar(
                        r=ref_norm + [ref_norm[0]],
                        theta=radar_lbls + [radar_lbls[0]],
                        mode="lines",
                        line=dict(color=CATEGORIAS[cat_k][1], width=1.5, dash="dash"),
                        name=CATEGORIAS[cat_k][0],
                        opacity=0.6,
                    ))
                fig_radar.update_layout(
                    height=420,
                    polar=dict(
                        bgcolor=_DARK["plot_bgcolor"],
                        radialaxis=dict(visible=True, range=[0, 1],
                                        tickfont=dict(color=_DARK["tick_color"], size=9),
                                        gridcolor=_DARK["grid_color"]),
                        angularaxis=dict(tickfont=dict(color=_DARK["font_color"], size=11),
                                         gridcolor=_DARK["grid_color"]),
                    ),
                    paper_bgcolor=_DARK["paper_bgcolor"],
                    legend=dict(orientation="h", y=-0.08, font=dict(color=_DARK["tick_color"])),
                    margin=dict(l=30, r=30, t=20, b=20),
                    title=dict(
                        text="Radar — 10 features clave (líneas punteadas = media de cada categoría)",
                        font=dict(size=12, color=_DARK["font_color"]),
                    ),
                )
                st.plotly_chart(fig_radar, width="stretch")

                # ── Bar chart de familias — features por familia en el candidato
                vb1, vb2 = st.columns(2)

                with vb1:
                    # Comparativa de similitudes coseno (F12 templates)
                    tpl_keys = [k for k in feats_v2 if k.startswith("tpl_")]
                    if tpl_keys:
                        tpl_vals = [feats_v2[k] for k in tpl_keys]
                        tpl_lbls = [k.replace("tpl_", "") for k in tpl_keys]
                        colors_tpl = ["#00b45a" if v > 0.5 else ("#1e64ff" if v < -0.5 else "#ef4444")
                                      for v in tpl_vals]
                        fig_tpl = go.Figure(go.Bar(
                            x=tpl_vals, y=tpl_lbls,
                            orientation="h",
                            marker_color=colors_tpl, opacity=0.85,
                        ))
                        fig_tpl.add_vline(x=0.7, line_dash="dash",
                                          line_color="rgba(0,180,90,0.5)", line_width=1.5)
                        fig_tpl.add_vline(x=-0.7, line_dash="dash",
                                          line_color="rgba(239,68,68,0.5)", line_width=1.5)
                        fig_tpl.update_layout(
                            height=320, title=dict(text="F12 — Similitudes coseno con templates",
                                                   font=dict(color=_DARK["font_color"], size=12)),
                            xaxis=dict(range=[-1.1, 1.1], title="cos(θ)", zeroline=True,
                                       zerolinecolor=_DARK["line_color"],
                                       gridcolor=_DARK["grid_color"],
                                       tickfont=dict(color=_DARK["tick_color"])),
                            yaxis=dict(tickfont=dict(color=_DARK["tick_color"], size=10)),
                            plot_bgcolor=_DARK["plot_bgcolor"],
                            paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=140, r=20, t=40, b=40),
                            showlegend=False,
                        )
                        st.plotly_chart(fig_tpl, width="stretch")

                with vb2:
                    # Entropías + Fractal + Complejidad comparadas
                    cmplx_keys = [
                        ("entropy_shannon",     "Shannon (bits)"),
                        ("entropy_permutation", "Permutation"),
                        ("entropy_sample",      "Sample"),
                        ("fractal_higuchi",     "FD Higuchi"),
                        ("fractal_katz",        "FD Katz"),
                        ("lempel_ziv",          "Lempel-Ziv"),
                        ("tortuosity",          "Tortuosidad"),
                        ("idx_complexity",      "Idx Complejidad"),
                    ]
                    cmplx_vals = [feats_v2.get(k, 0) for k, _ in cmplx_keys]
                    cmplx_lbls = [lbl for _, lbl in cmplx_keys]

                    fig_cx = go.Figure(go.Bar(
                        x=cmplx_vals, y=cmplx_lbls,
                        orientation="h",
                        marker_color="#ef4444", opacity=0.80,
                    ))
                    fig_cx.update_layout(
                        height=320, title=dict(text="F06/F07/F08/F14 — Complejidad y Entropía",
                                               font=dict(color=_DARK["font_color"], size=12)),
                        xaxis=dict(title="Valor", gridcolor=_DARK["grid_color"],
                                   tickfont=dict(color=_DARK["tick_color"])),
                        yaxis=dict(tickfont=dict(color=_DARK["tick_color"], size=10)),
                        plot_bgcolor=_DARK["plot_bgcolor"],
                        paper_bgcolor=_DARK["paper_bgcolor"],
                        margin=dict(l=140, r=20, t=40, b=40),
                        showlegend=False,
                    )
                    st.plotly_chart(fig_cx, width="stretch")

                # ── Dinámica temporal ──────────────────────────────────────
                with st.expander("⏱️ Dinámica temporal (F13) y Energía (F05)"):
                    dyn_keys = [
                        ("time_to_max_s",       "Tiempo al máx (s)"),
                        ("time_to_min_s",       "Tiempo al mín (s)"),
                        ("time_to_25pct_s",     "Tiempo al 25% Δ (s)"),
                        ("time_to_50pct_s",     "Tiempo al 50% Δ (s)"),
                        ("time_to_75pct_s",     "Tiempo al 75% Δ (s)"),
                        ("rise_time_s",         "Rise time 10→90% (s)"),
                        ("settling_time_s",     "Settling time (s)"),
                        ("overshoot_g",         "Overshoot (g)"),
                        ("undershoot_g",        "Undershoot (g)"),
                        ("initial_slope_g_min", "Pendiente inicial (g/min)"),
                        ("final_slope_g_min",   "Pendiente final (g/min)"),
                    ]
                    dyn_rows = [{"Métrica": lbl, "Valor": feats_v2.get(k, "—"),
                                 "Significado": REGISTRY.get(k, {}).get("significado", "")}
                                for k, lbl in dyn_keys]
                    st.dataframe(pd.DataFrame(dyn_rows).set_index("Métrica"), width="stretch")

                # ── Feature registry ───────────────────────────────────────
                with st.expander("📚 Feature Registry — catálogo completo de las 14 familias"):
                    reg_rows = [
                        {
                            "Feature":      fname,
                            "Familia":      meta["familia"],
                            "Fórmula":      meta["formula"],
                            "Rango":        str(meta["rango"]),
                            "Unidad":       meta["unidad"],
                            "Complejidad":  meta["complejidad"],
                            "Significado":  meta["significado"],
                        }
                        for fname, meta in REGISTRY.items()
                    ]
                    st.dataframe(pd.DataFrame(reg_rows).set_index("Feature"), width="stretch", height=400)
                    st.caption(f"Total: {len(REGISTRY)} features registradas en 14 familias.")

            # ── Atlas de Familias F00-F14 ──────────────────────────────────
            st.markdown("---")
            st.markdown("#### 🗺️ Atlas de Familias F00-F14")
            st.caption(
                "Descripción, objetivo y top métricas de cada familia del Motor Matemático v2. "
                "Para cada familia se explica qué captura y por qué importa para clasificar "
                "curvas de peso del sensor KPCL0034."
            )

            _ATLAS = [
                ("F00", "Estadísticas clásicas",
                 "Media, mediana, desviación, rango, sesgo y curtosis del vector de peso. "
                 "Son el punto de partida: establecen la escala y simetría de la curva.",
                 ["mean_g", "std_g", "delta_w_g", "skewness", "kurtosis"]),
                ("F01", "Derivadas (velocidad y aceleración)",
                 "25 features de la primera y segunda derivada discreta: velocidades de cambio, "
                 "aceleraciones, cruces por cero. Captura si el peso baja/sube rápido o con oscilaciones.",
                 ["mean_deriv1", "max_deriv1", "mean_deriv2", "zcr_deriv1", "accel_range"]),
                ("F02", "Curvatura (cambio de dirección)",
                 "Curvatura media y máxima de la señal. Alta curvatura = muchos cambios de dirección = ruido. "
                 "Baja curvatura = tendencia limpia = alimentación o servido.",
                 ["mean_curvature", "max_curvature", "curvature_range"]),
                ("F03", "Longitud de arco",
                 "Longitud total del camino recorrido por la señal. "
                 "Un servido tiene arco corto (subida limpia), el ruido tiene arco muy largo.",
                 ["arc_length", "arc_per_range", "normalized_arc"]),
                ("F04", "Tortuosidad",
                 "Relación entre la longitud de arco y la distancia en línea recta entre inicio y fin. "
                 "Alta tortuosidad = oscilación constante. Baja = tendencia limpia.",
                 ["tortuosity", "fractal_dimension_est"]),
                ("F05", "Energía y potencia",
                 "Energía total de la señal y distribución por frecuencias. "
                 "Detecta si la energía está concentrada en bajas frecuencias (tendencia) "
                 "o altas frecuencias (ruido/oscilación).",
                 ["energy", "power_ratio_low", "power_ratio_high", "spectral_energy"]),
                ("F06", "Entropías (Shannon, Permutación, Sample)",
                 "Tres medidas de información/desorden de la señal. "
                 "Baja entropía = señal predecible (subida o bajada limpia). "
                 "Alta entropía = señal caótica (ruido). Complementan las features frecuenciales.",
                 ["entropy_shannon", "entropy_permutation", "entropy_sample"]),
                ("F07", "Dimensión fractal (Higuchi y Katz)",
                 "Mide la autosimilaridad de la curva. Señales de ruido tienen FD mayor (~1.5-2.0). "
                 "Tendencias limpias tienen FD cercana a 1. Higuchi es más sensible que Katz.",
                 ["fractal_higuchi", "fractal_katz"]),
                ("F08", "Lempel-Ziv (complejidad de secuencia)",
                 "Complejidad algorítmica de la señal binarizada: cuenta los patrones únicos que aparecen. "
                 "Alto L-Z = señal impredecible = ruido. Bajo L-Z = patrón repetitivo = evento claro.",
                 ["lempel_ziv"]),
                ("F09", "Frecuencial (FFT y autocorrelación)",
                 "Frecuencia dominante, ancho de banda, decaimiento espectral y autocorrelación lag 1, 2, 3. "
                 "La autocorrelación captura periodicidad a corto plazo: alimentación tiene lag1 alto.",
                 ["dominant_freq", "spectral_bandwidth", "autocorr_lag1", "autocorr_lag2", "freq_centroid"]),
                ("F10", "Estadística robusta (cuantiles e IQR)",
                 "Percentiles 5, 25, 75, 95 e IQR. Más robustos a outliers que media/std. "
                 "El IQR relativo es un discriminador clave: servido tiene IQR alto, alimentación bajo.",
                 ["q25", "q75", "iqr", "iqr_relative", "p5", "p95"]),
                ("F11", "Topología (cruces por nivel y monotonía)",
                 "Monotonía (fracción de cambios en la dirección dominante) y conteo de cruces por la mediana. "
                 "Alimentación: monotonía negativa fuerte (~-0.8). Ruido: monotonía ≈ 0.",
                 ["monotonicity", "zero_cross_rate", "median_crossings", "straightness"]),
                ("F12", "Templates canónicos (similitud coseno)",
                 "12 vectores prototipo (rampa bajada, rampa subida, U, arco, escalón, zigzag, etc.). "
                 "La similitud coseno con cada template captura la 'forma' global de la curva. "
                 "Las más importantes: sim_alimentacion y sim_servido.",
                 ["sim_alimentacion", "sim_servido", "tpl_ramp_down", "tpl_ramp_up", "tpl_u_shape"]),
                ("F13", "Dinámica temporal (rise time, settling, overshoot)",
                 "Tiempo al máximo, al mínimo, al 50% del cambio, rise time 10→90%, settling time. "
                 "Servido tiene rise time muy corto (~5-15s). Alimentación tiene bajada lenta (~3-8 min).",
                 ["time_to_min_s", "time_to_max_s", "rise_time_s", "settling_time_s",
                  "initial_slope_g_min", "final_slope_g_min"]),
                ("F14", "Features compuestas",
                 "Combinaciones no lineales de otras familias: índice de linealidad (R² × monotonía), "
                 "índice de complejidad (entropía × FD), índice de impulso (pico / media). "
                 "Tienen el mayor poder discriminativo con menos features.",
                 ["idx_linearity", "idx_complexity", "r2_lineal", "idx_impulse"]),
            ]

            for _fam_id, _fam_nom, _fam_desc, _fam_top in _ATLAS:
                _fam_color = "#f97316" if _fam_id < "F08" else "#3b82f6"
                with st.expander(f"**{_fam_id}** — {_fam_nom}", expanded=False):
                    st.markdown(_fam_desc)
                    if feats_v2:
                        _top_vals = {k: feats_v2.get(k) for k in _fam_top if k in feats_v2}
                        if _top_vals:
                            _fam_cols = st.columns(min(len(_top_vals), 5))
                            for _fi, (_fk, _fv) in enumerate(_top_vals.items()):
                                if _fv is not None:
                                    _fam_cols[_fi % len(_fam_cols)].metric(
                                        REGISTRY.get(_fk, {}).get("significado", _fk)[:20] or _fk,
                                        f"{float(_fv):+.4f}",
                                    )

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 6 — ANOTACIONES
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "📋 Anotaciones":
        st.subheader("📋 Lista de anotaciones — registro histórico")
        st.caption(
            "Todas las anotaciones guardadas en `anotaciones_av2.csv`. Solo lectura. "
            "Cada fila es un evento que el operador auditó manualmente y clasificó como alim / serv / ruido. "
            "**Estas anotaciones son el dataset de entrenamiento del Motor Matemático v2:** "
            "cuantas más haya, más precisos son los promedios (µ/σ) que alimentan el Evidence Engine y el cuadro comparativo de Tab 5. "
            "Para agregar datos nuevos desde Supabase o regenerar las estadísticas, usar **🔄 Actualizar Todo**."
        )

        if len(df_anot) == 0:
            st.info("Sin anotaciones todavía.")
        else:
            cats_f = st.multiselect(
                "Filtrar por categoría",
                df_anot["categoria"].unique().tolist(),
                default=df_anot["categoria"].unique().tolist(),
                format_func=lambda k: CATEGORIAS.get(k, (k,))[0],
            )
            df_sh = df_anot[df_anot["categoria"].isin(cats_f)].copy()
            df_sh["Hora (Santiago)"] = df_sh["t_inicio"].dt.tz_convert(TZ_STGO).dt.strftime("%Y-%m-%d %H:%M")
            df_sh["Duración"]  = ((df_sh["t_fin"] - df_sh["t_inicio"]).dt.total_seconds() / 60).round(1).astype(str) + " min"
            df_sh["Categoría"] = df_sh["categoria"].apply(lambda k: CATEGORIAS.get(k, (k,))[0])
            df_sh["Notas"]     = df_sh["notas"].fillna("").astype(str)

            st.dataframe(
                df_sh[["id_anotacion", "Hora (Santiago)", "Duración", "Categoría", "Notas"]].rename(columns={"id_anotacion": "ID"}),
                width="stretch", hide_index=True,
            )
            _sh_counts = df_sh["categoria"].value_counts()
            _sh_parts  = [
                f"{CATEGORIAS[k][0]}: **{int(_sh_counts.get(k, 0))}**"
                for k in ("alimentacion", "servido", "ruido")
                if k in cats_f
            ]
            st.caption(
                f"**{len(df_sh)}** anotaciones mostradas  ·  "
                + "  ·  ".join(_sh_parts)
                + f"  ·  Guardado en `{ANOTACIONES_CSV.name}`"
            )

        # ── Resumen estadístico de ciclos servido/alimento ─────────────────
        st.divider()
        st.markdown("#### 🟡 Ciclos Servido/Alimento — estadísticas")
        st.caption(
            "Los ciclos se muestran también en la tabla de arriba (categoría 🟡 Ciclo Servido/Alimento). "
            "Aquí se muestran métricas específicas de duración. "
            f"Fuente: `{CICLOS_CSV.name}` · integrado en df_anot con id_anotacion negativo."
        )
        _c6_ciclo = df_anot[df_anot["categoria"] == "ciclo_servido_alimento"].copy()
        if len(_c6_ciclo) == 0:
            st.info("No se encontraron ciclos en el dataset.")
        else:
            _c6_dur_h = (_c6_ciclo["t_fin"] - _c6_ciclo["t_inicio"]).dt.total_seconds() / 3600
            _c6m = st.columns(4)
            _c6m[0].metric("Total ciclos",     len(_c6_ciclo))
            _c6m[1].metric("Duración mediana", f"{float(_c6_dur_h.median()):.1f} h")
            _c6m[2].metric("Duración mínima",  f"{float(_c6_dur_h.min()):.1f} h")
            _c6m[3].metric("Duración máxima",  f"{float(_c6_dur_h.max()):.1f} h")
            with st.expander("Ver tabla completa de ciclos"):
                _c6_tbl = _c6_ciclo.copy()
                _c6_tbl["Inicio (Santiago)"] = _c6_tbl["t_inicio"].dt.tz_convert(TZ_STGO).dt.strftime("%Y-%m-%d %H:%M")
                _c6_tbl["Fin (Santiago)"]    = _c6_tbl["t_fin"].dt.tz_convert(TZ_STGO).dt.strftime("%Y-%m-%d %H:%M")
                _c6_tbl["Duración (h)"]      = _c6_dur_h.values.round(1)
                _c6_tbl["Notas"]             = _c6_tbl["notas"].fillna("").astype(str)
                st.dataframe(
                    _c6_tbl[["id_anotacion", "Inicio (Santiago)", "Fin (Santiago)", "Duración (h)", "Notas"]]
                    .rename(columns={"id_anotacion": "ID"}),
                    width="stretch", hide_index=True,
                )

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 7 — PRÓXIMA COMIDA
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "🕐 Próxima Comida":
        _pb7 = st.progress(0, "🕐 Cargando Próxima Comida…")
        st.subheader("🕐 Predictor de Próxima Comida")
        st.caption(
            "Predicción puramente estadística — sin ML. Usa solo las anotaciones de tipo **alimentación** "
            "de `anotaciones_av2.csv`. Cuatro métodos de predicción complementarios: "
            "(1) media de intervalos, (2) mediana (robusta a outliers), "
            "(3) modelo circadiano (picos horarios históricos), y (4) regresión por cantidad consumida. "
            "El modelo circadiano es el más preciso para Bandida porque su rutina de comidas "
            "sigue el ritmo del dueño — la hora del día predice mejor que el intervalo fijo."
        )

        NOW_UTC  = pd.Timestamp.now(tz="UTC")
        NOW_STGO = NOW_UTC.astimezone(TZ_STGO)

        df_alim   = df_anot[df_anot["categoria"] == "alimentacion"].copy()
        df_alim   = df_alim.sort_values("t_inicio").reset_index(drop=True)
        n_alim_ev = len(df_alim)

        if n_alim_ev < 3:
            st.info(
                f"Se necesitan al menos 3 eventos de alimentación anotados para calcular predicciones. "
                f"Hay {n_alim_ev} disponibles."
            )
        else:
            t_starts = df_alim["t_inicio"].tolist()
            t_ends   = df_alim["t_fin"].tolist()
            intervalos_h_raw = [
                (t_starts[i + 1] - t_starts[i]).total_seconds() / 3600
                for i in range(len(t_starts) - 1)
            ]

            _pb7.progress(30, "📊 Calculando intervalos entre comidas…")
            intervalos_validos, n_filt = _intervalos_validos_alim(df_alim)
            n_valid = len(intervalos_validos)

            if n_valid < 2:
                st.warning("Muy pocos intervalos válidos (< 2) para calcular estadísticas.")
            else:
                iv        = np.array(intervalos_validos)
                media_h   = float(np.mean(iv))
                mediana_h = float(np.median(iv))
                std_h     = float(np.std(iv))
                p10_h     = float(np.percentile(iv, 10))
                p25_h     = float(np.percentile(iv, 25))
                p75_h     = float(np.percentile(iv, 75))
                p90_h     = float(np.percentile(iv, 90))

                # ── BLOQUE 1: Estadísticas de intervalos ─────────────────
                st.markdown("---")
                st.markdown("#### 1. Estadísticas de intervalos entre comidas")
                st.caption(
                    "Tiempo entre comidas consecutivas (en horas). "
                    "**Filtros aplicados:** se excluyen intervalos < 20 min (probable misma comida partido en dos) "
                    "y > 36 h (gap de datos o ausencia del dueño, no refleja el hambre real). "
                    "**Mediana vs. media:** la mediana es más robusta porque un solo intervalo largo "
                    "(ej. fin de semana largo) puede inflar la media sin representar el patrón habitual. "
                    "**IQR (P75−P25):** el rango del 50 % central — cuanto más estrecho, más predecible es el horario."
                )

                ic1, ic2, ic3, ic4 = st.columns(4)
                ic1.metric("N eventos alimentación", n_alim_ev)
                ic2.metric("N intervalos válidos", n_valid,
                           delta=f"{n_filt} filtrados" if n_filt else None,
                           delta_color="off")
                ic3.metric("Mediana", f"{mediana_h:.2f} h",
                           help="P50 — más robusta ante gaps de datos que la media")
                ic4.metric("IQR", f"{p75_h - p25_h:.2f} h",
                           help="Rango intercuartil (P75 − P25) = dispersión del 50% central")

                with st.expander("Tabla completa de estadísticas de intervalos"):
                    df_stats = pd.DataFrame({
                        "Estadístico": [
                            "N intervalos válidos", "Filtrados (< 20 min o > 36 h)",
                            "Media (h)", "Mediana (h)", "Std (h)",
                            "Mínimo (h)", "P10 (h)", "P25 (h)",
                            "P75 (h)", "P90 (h)", "Máximo (h)",
                        ],
                        "Valor": [
                            n_valid, n_filt,
                            round(media_h, 3), round(mediana_h, 3), round(std_h, 3),
                            round(float(np.min(iv)), 3), round(p10_h, 3), round(p25_h, 3),
                            round(p75_h, 3), round(p90_h, 3), round(float(np.max(iv)), 3),
                        ],
                    })
                    st.dataframe(df_stats, width="stretch", hide_index=True)

                with st.expander("Todos los intervalos calculados (comida a comida)"):
                    df_intervals = pd.DataFrame({
                        "Desde (Stgo)": [
                            t_starts[i].astimezone(TZ_STGO).strftime("%m-%d %H:%M")
                            for i in range(n_alim_ev - 1)
                        ],
                        "Hasta (Stgo)": [
                            t_starts[i + 1].astimezone(TZ_STGO).strftime("%m-%d %H:%M")
                            for i in range(n_alim_ev - 1)
                        ],
                        "Intervalo (h)":  [round(x, 2) for x in intervalos_h_raw],
                        "Válido":         [
                            "✓" if MIN_INTERVALO_H <= x <= MAX_INTERVALO_H else "✗"
                            for x in intervalos_h_raw
                        ],
                    })
                    st.dataframe(df_intervals, width="stretch", hide_index=True)

                # ── BLOQUE 2: Modelo circadiano ───────────────────────────
                st.markdown("---")
                st.markdown("#### 2. Modelo circadiano — distribución de horas de alimentación")
                st.caption(
                    "Frecuencia histórica de eventos de alimentación por franja horaria (hora Santiago). "
                    "**Cómo se usa para predecir:** dado el momento actual, el modelo busca la franja de alta probabilidad "
                    "más cercana hacia el futuro (ponderando por probabilidad histórica y proximidad temporal). "
                    "**Horas pico empíricas de Bandida** (basado en 209 eventos): típicamente ~07:00, ~13:00, ~19:00 "
                    "y un snack nocturno ocasional ~02:00 — refleja la rutina del dueño. "
                    "Si el histograma cambia significativamente respecto a meses anteriores, "
                    "puede indicar un cambio en la rutina del hogar."
                )

                horas_float = [
                    t.astimezone(TZ_STGO).hour + t.astimezone(TZ_STGO).minute / 60
                    for t in t_starts
                ]
                conteo_h = np.zeros(24, dtype=int)
                for h in horas_float:
                    conteo_h[int(h)] += 1
                prob_h = conteo_h / max(conteo_h.sum(), 1)

                top3 = np.argsort(conteo_h)[::-1][:3]
                tc1, tc2, tc3 = st.columns(3)
                tc1.metric("Franja más frecuente",
                           f"{top3[0]:02d}:00–{top3[0]+1:02d}:00",
                           delta=f"n={conteo_h[top3[0]]} eventos",
                           delta_color="off")
                tc2.metric("2ª más frecuente",
                           f"{top3[1]:02d}:00–{top3[1]+1:02d}:00",
                           delta=f"n={conteo_h[top3[1]]} eventos",
                           delta_color="off")
                tc3.metric("3ª más frecuente",
                           f"{top3[2]:02d}:00–{top3[2]+1:02d}:00",
                           delta=f"n={conteo_h[top3[2]]} eventos",
                           delta_color="off")

                with st.expander("Tabla circadiana completa (24 franjas)"):
                    df_circ = pd.DataFrame({
                        "Franja horaria": [f"{h:02d}:00–{h+1:02d}:00" for h in range(24)],
                        "N eventos":      conteo_h.tolist(),
                        "Probabilidad":   [f"{p:.1%}" for p in prob_h],
                    })
                    st.dataframe(df_circ, width="stretch", hide_index=True)

                # ── BLOQUE 3: Predicción puntual ──────────────────────────
                st.markdown("---")
                st.markdown("#### 3. Predicción de próxima comida")
                st.caption(
                    "Cuatro métodos de predicción a partir de la **última alimentación registrada**: "
                    "**Mediana** (P50 de todos los intervalos — robusta a outliers), "
                    "**Media** (promedio simple — más sensible a intervalos excepcionales), "
                    "**P25** (límite temprano: 25 % de las veces Bandida comió *antes* de este tiempo), "
                    "**P75** (límite tardío: 75 % de las veces Bandida comió antes de este tiempo). "
                    "La **barra de hambre** muestra qué porcentaje del intervalo mediano ha transcurrido. "
                    "Al llegar al 100 % significa que Bandida 'debería haber comido' según el patrón histórico."
                )

                ultima_t       = df_alim.iloc[-1]["t_inicio"]
                ultima_stgo    = ultima_t.astimezone(TZ_STGO)
                tiempo_desde_h = (NOW_UTC - ultima_t).total_seconds() / 3600
                hunger_pct     = min(100.0, tiempo_desde_h / mediana_h * 100)

                pred_mediana = ultima_t + pd.Timedelta(hours=mediana_h)
                pred_media   = ultima_t + pd.Timedelta(hours=media_h)
                pred_p25_t   = ultima_t + pd.Timedelta(hours=p25_h)
                pred_p75_t   = ultima_t + pd.Timedelta(hours=p75_h)

                t_rest_mediana = mediana_h - tiempo_desde_h
                t_rest_media   = media_h   - tiempo_desde_h

                pc1, pc2 = st.columns(2)
                pc1.metric(
                    "Última comida registrada",
                    ultima_stgo.strftime("%m-%d %H:%M"),
                    delta=f"hace {tiempo_desde_h:.1f} h",
                    delta_color="off",
                )
                pc2.metric(
                    "Índice de hambre",
                    f"{hunger_pct:.0f}%",
                    delta="sobrepasado" if hunger_pct >= 100 else f"restan {abs(t_rest_mediana):.1f} h",
                    delta_color="inverse" if hunger_pct >= 100 else "off",
                    help="Porcentaje del intervalo mediano que ha transcurrido desde la última comida",
                )
                st.progress(min(hunger_pct / 100, 1.0))

                if hunger_pct >= 100:
                    st.warning("⚠️ Bandida debería haber comido según el patrón histórico.")
                elif hunger_pct >= 80:
                    st.info("🟡 Próximo evento esperado en breve.")
                else:
                    st.success("🟢 Dentro del intervalo normal.")

                pr1, pr2, pr3, pr4 = st.columns(4)
                pr1.metric(
                    "Predicción (mediana)",
                    pred_mediana.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),
                    delta=f"{'en' if t_rest_mediana > 0 else 'hace'} {abs(t_rest_mediana):.1f} h",
                    delta_color="normal" if t_rest_mediana > 0 else "inverse",
                )
                pr2.metric(
                    "Predicción (media)",
                    pred_media.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),
                    delta=f"{'en' if t_rest_media > 0 else 'hace'} {abs(t_rest_media):.1f} h",
                    delta_color="normal" if t_rest_media > 0 else "inverse",
                )
                pr3.metric(
                    "Límite temprano (P25)",
                    pred_p25_t.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),
                    help="25% de las comidas históricas ocurrió antes de este intervalo",
                )
                pr4.metric(
                    "Límite tardío (P75)",
                    pred_p75_t.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),
                    help="75% de las comidas históricas ocurrió antes de este intervalo",
                )

                # Ajuste circadiano: próxima franja de alta probabilidad
                hora_ahora = NOW_STGO.hour
                candidatas_circ = []
                for dh in range(0, 25):
                    h_c = (hora_ahora + dh) % 24
                    if prob_h[h_c] > 0:
                        score_c = prob_h[h_c] / (dh + 0.5)
                        candidatas_circ.append((h_c, prob_h[h_c], dh, score_c))
                if candidatas_circ:
                    candidatas_circ.sort(key=lambda x: x[3], reverse=True)
                    h_best, p_best, dh_best, _ = candidatas_circ[0]
                    st.info(
                        f"**Modelo circadiano:** La próxima franja de alta probabilidad es "
                        f"**{h_best:02d}:00–{h_best+1:02d}:00** "
                        f"(prob. histórica {p_best:.1%}, aproximadamente en {dh_best} horas)"
                    )

                # ── BLOQUE 4: Cantidad consumida × intervalo siguiente ────
                st.markdown("---")
                st.markdown("#### 4. Cantidad consumida → intervalo siguiente")
                st.caption(
                    "¿Comer más ahora retrasa la próxima comida? "
                    "Se calcula la correlación de Pearson entre el Δpeso de cada alimentación (cuánto comió) "
                    "y el intervalo hasta la siguiente. "
                    "**Resultado empírico:** correlación débil (r ≈ −0.1 a −0.2) — la cantidad consumida "
                    "predice *poco* el siguiente intervalo. La rutina horaria del dueño importa más que el apetito puntual. "
                    "**Regresión lineal:** `intervalo_h = a + b × Δpeso_g` — se aplica a la última comida "
                    "para generar una predicción ajustada por cantidad. Solo tiene sentido si |r| > 0.3."
                )

                if df_lec is not None:
                    # Caché de sesión para evitar recalcular en cada rerun dentro del tab
                    _t7_cache_key = f"t7_deltas_{len(df_alim)}_{_csv_max_mtime()}"
                    if st.session_state.get("_sscache_t7_key") == _t7_cache_key:
                        deltas_g, durs_min, ints_sig_h, etiq_alim = st.session_state["_sscache_t7_vals"]
                    else:
                        deltas_g   = []
                        durs_min   = []
                        ints_sig_h = []
                        etiq_alim  = []

                        for i, (_, row) in enumerate(df_alim.iloc[:-1].iterrows()):
                            t0, t1 = row["t_inicio"], row["t_fin"]
                            # Usar calcular_metricas (cacheado) en vez de mask directo
                            _m7 = calcular_metricas(df_lec, t0, t1)
                            if not _m7:
                                continue
                            delta_r = _m7["delta_w_g"]
                            dur_r   = _m7["duracion_min"]
                            int_sig = (df_alim.iloc[i + 1]["t_inicio"] - t1).total_seconds() / 3600
                            if MIN_INTERVALO_H <= int_sig <= MAX_INTERVALO_H:
                                deltas_g.append(delta_r)
                                durs_min.append(dur_r)
                                ints_sig_h.append(int_sig)
                                etiq_alim.append(t0.astimezone(TZ_STGO).strftime("%m-%d %H:%M"))

                        st.session_state["_sscache_t7_key"]  = _t7_cache_key
                        st.session_state["_sscache_t7_vals"] = (deltas_g, durs_min, ints_sig_h, etiq_alim)

                    if len(deltas_g) >= 3:
                        dg = np.array(deltas_g)
                        du = np.array(durs_min)
                        ih = np.array(ints_sig_h)

                        corr_dg = float(np.corrcoef(dg, ih)[0, 1])
                        corr_du = float(np.corrcoef(du, ih)[0, 1])

                        qa1, qa2, qa3 = st.columns(3)
                        qa1.metric("N pares analizados", len(deltas_g))
                        qa2.metric("Corr. Δpeso vs. sig. intervalo", f"{corr_dg:+.3f}",
                                   help="Negativo = a más comida consumida, más tiempo hasta la siguiente")
                        qa3.metric("Corr. duración vs. sig. intervalo", f"{corr_du:+.3f}",
                                   help="Positivo = comidas más largas → siguiente comida más tarde")

                        # Regresión lineal Δpeso → intervalo siguiente
                        b_dg, a_int = np.polyfit(dg, ih, 1)

                        # Aplicar predicción ajustada a la última comida registrada
                        last_row  = df_alim.iloc[-1]
                        mask_last = (df_lec["ts"] >= last_row["t_inicio"]) & (df_lec["ts"] <= last_row["t_fin"])
                        sub_last  = df_lec[mask_last]["peso_g"].dropna()

                        if len(sub_last) >= 2:
                            delta_last = float(sub_last.iloc[-1] - sub_last.iloc[0])
                            dur_last   = (last_row["t_fin"] - last_row["t_inicio"]).total_seconds() / 60
                            int_ajust  = float(np.clip(a_int + b_dg * delta_last, p25_h * 0.5, p90_h * 1.5))
                            pred_ajust = last_row["t_inicio"] + pd.Timedelta(hours=int_ajust)
                            t_rest_aj  = int_ajust - tiempo_desde_h

                            st.markdown(
                                f"**Última comida:** Δpeso = **{delta_last:+.1f} g** "
                                f"en **{dur_last:.1f} min**  \n"
                                f"**Predicción ajustada por cantidad consumida:** "
                                f"**{pred_ajust.astimezone(TZ_STGO).strftime('%m-%d %H:%M')}** "
                                f"— intervalo estimado {int_ajust:.2f} h "
                                f"({'en' if t_rest_aj > 0 else 'hace'} {abs(t_rest_aj):.1f} h)"
                            )

                        with st.expander("Tabla detallada: Δpeso por comida × siguiente intervalo"):
                            df_det = pd.DataFrame({
                                "Comida (inicio Stgo)":        etiq_alim,
                                "Δpeso (g)":                   [round(x, 1) for x in deltas_g],
                                "Duración (min)":              [round(x, 1) for x in durs_min],
                                "Intervalo siguiente (h)":     [round(x, 2) for x in ints_sig_h],
                            })
                            st.dataframe(df_det, width="stretch", hide_index=True)

                        with st.expander("Parámetros de la regresión lineal (Δpeso → intervalo)"):
                            st.code(
                                f"Modelo: intervalo_h = {a_int:.4f} + ({b_dg:.4f}) × Δpeso_g\n"
                                f"Interpretación: por cada +1 g consumido, el intervalo cambia {b_dg:.4f} h\n"
                                f"R² = {float(np.corrcoef(dg, ih)[0, 1])**2:.4f}\n"
                                f"N puntos = {len(deltas_g)}"
                            )
                    else:
                        st.caption("Se necesitan al menos 3 pares (comida → siguiente intervalo) para calcular correlaciones.")
                else:
                    st.caption("Lecturas no disponibles — no se puede calcular Δpeso por evento.")

                # ── BLOQUE 5: Estado actual del sensor ───────────────────
                if df_lec is not None and _MOTOR_V2_OK:
                    st.markdown("---")
                    st.markdown("#### 5. Estado actual del sensor (últimos 10 min)")
                    st.caption(
                        "El Evidence Engine analiza la ventana de los **últimos 10 min de datos locales** "
                        "para detectar si Bandida está comiendo ahora mismo. "
                        "Extrae las 102 features del Motor v2 sobre ese segmento y calcula las probabilidades softmax. "
                        "**Limitación importante:** el sensor no está en tiempo real en este contexto — "
                        "solo hay datos hasta el último sync con Supabase (botón 🔄). "
                        "**Score Alim. > 65 %** con alta confianza = alimentación activa detectada. "
                        "Δpeso negativo en los últimos 10 min + score alim. alto = señal clara. "
                        "N < 3 muestras = ventana demasiado corta para calcular features confiables."
                    )

                    _ev10 = _evidence_ventana_cached(df_lec, 10)

                    if _ev10 is not None:
                        ev_now = _ev10["ev"]
                        sa1, sa2, sa3, sa4 = st.columns(4)
                        sa1.metric(
                            "Estado actual",
                            CATEGORIAS.get(ev_now["prediccion"], (ev_now["prediccion"],))[0],
                        )
                        sa2.metric("Score alim.",  f"{ev_now['score_alimentacion']:.1%}")
                        sa3.metric("Score serv.",  f"{ev_now['score_servido']:.1%}")
                        sa4.metric("Score ruido",  f"{ev_now['score_ruido']:.1%}")

                        st.caption(
                            f"Peso actual: **{_ev10['peso_now']:.1f} g**  |  "
                            f"Δpeso últimos 10 min: **{_ev10['delta_now']:+.1f} g**  |  "
                            f"N lecturas: {_ev10['sub_len']}  |  "
                            f"Confianza: {ev_now['confianza']:.1%}"
                        )

                        if ev_now["prediccion"] == "alimentacion":
                            st.success("✅ Bandida está comiendo en este momento.")
                        elif ev_now["prediccion"] == "servido":
                            st.info("🫙 Se detecta servido de comida en este momento.")
                        else:
                            st.caption("Sin actividad de alimentación detectada en la ventana actual.")
                    else:
                        st.caption("Sin lecturas recientes del sensor (< 3 muestras en los últimos 10 min).")

                # ── BLOQUE 6: Patrón semanal ─────────────────────────────
                st.markdown("---")
                st.markdown("#### 6. Patrón semanal")
                st.caption(
                    "Número total de alimentaciones por día de la semana (acumulado en todo el período). "
                    "**Qué revela:** si hay más comidas los fines de semana (Sáb/Dom), indica que el dueño "
                    "está más en casa y sirve con más frecuencia. Una diferencia Lun–Vie vs. Sáb–Dom > 20 % "
                    "sugiere que el modelo circadiano debería tener versiones separadas para días de semana "
                    "y fin de semana. "
                    "**Rojo** = días en rojo → pocos eventos totales ese día — puede indicar sesgo de anotación "
                    "(no hubo data esos días, no que Bandida no comió)."
                )

                _DIAS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
                conteo_dia = np.zeros(7, dtype=int)
                for _ts in t_starts:
                    conteo_dia[_ts.astimezone(TZ_STGO).weekday()] += 1

                _fig_sem = go.Figure(go.Bar(
                    x=_DIAS_ES, y=conteo_dia.tolist(),
                    marker_color=[
                        "#ef4444" if _i >= 5 else "#f97316"
                        for _i in range(7)
                    ],
                    opacity=0.85,
                    text=conteo_dia.tolist(), textposition="outside",
                ))
                _ax_sem = dict(
                    gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                    tickfont=dict(size=12, color=_DARK["tick_color"]), zeroline=False,
                )
                _fig_sem.update_layout(
                    height=280,
                    xaxis=dict(title="Día", **_ax_sem),
                    yaxis=dict(title="N eventos", **_ax_sem),
                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                    margin=dict(l=50, r=20, t=20, b=50),
                    showlegend=False,
                )
                st.plotly_chart(_fig_sem, width='stretch')
                _dia_max = int(np.argmax(conteo_dia))
                _dia_min = int(np.argmin(conteo_dia))
                st.caption(
                    f"Día más activo: **{_DIAS_ES[_dia_max]}** ({conteo_dia[_dia_max]} eventos)  ·  "
                    f"Día menos activo: **{_DIAS_ES[_dia_min]}** ({conteo_dia[_dia_min]} eventos)"
                )

                # ── BLOQUE 7: Predicción de 3 próximas comidas ───────────
                st.markdown("---")
                st.markdown("#### 7. Predicción de las próximas 3 comidas")
                st.caption(
                    "Proyección de las 3 próximas comidas usando 3 métodos: "
                    "**Mediana** (última comida + k × mediana_intervalo), "
                    "**Media** (última comida + k × media_intervalo), "
                    "**Circadiano** (próximas 3 franjas horarias de alta probabilidad histórica). "
                    "Los gráficos de 'Curva real vs predicción' muestran el error histórico del predictor: "
                    "la curva naranja es cuándo Bandida comió realmente, la línea azul punteada es cuándo "
                    "el modelo predijo que comería (basado en la comida anterior). "
                    "El error en minutos es la distancia horizontal entre ambas. "
                    "Un error MAE < 30 min indica que el modelo es útil para notificaciones de pre-alerta."
                )

                _ultima_alim = df_alim.iloc[-1]["t_inicio"]

                _pred3_mediana = [
                    _ultima_alim + pd.Timedelta(hours=mediana_h * k) for k in range(1, 4)
                ]
                _pred3_media = [
                    _ultima_alim + pd.Timedelta(hours=media_h * k) for k in range(1, 4)
                ]

                # Circadiano: próximas 3 franjas de alta probabilidad
                _pred3_circ = []
                _hora_base = _ultima_alim.astimezone(TZ_STGO).hour
                _offset_h  = mediana_h
                for _k in range(3):
                    _t_base = _ultima_alim + pd.Timedelta(hours=_offset_h)
                    _h_b    = _t_base.astimezone(TZ_STGO).hour
                    _cands  = [
                        (_h_b + _dh) % 24
                        for _dh in range(0, 25)
                        if prob_h[(_h_b + _dh) % 24] > 0
                    ]
                    _h_circ = _cands[0] if _cands else _h_b
                    _diff_h = (_h_circ - _h_b) % 24
                    _t_circ = _t_base + pd.Timedelta(hours=_diff_h)
                    _pred3_circ.append(_t_circ)
                    _offset_h += max((_t_circ - _ultima_alim).total_seconds() / 3600 - _offset_h + mediana_h, mediana_h * 0.5)

                # Tabla de 3 predicciones
                _pred3_rows = []
                for _k in range(3):
                    _pm = _pred3_mediana[_k].astimezone(TZ_STGO)
                    _pa = _pred3_media[_k].astimezone(TZ_STGO)
                    _pc = _pred3_circ[_k].astimezone(TZ_STGO)
                    _t_rest_m = (_pred3_mediana[_k] - NOW_UTC).total_seconds() / 3600
                    _pred3_rows.append({
                        "Comida": f"#{_k + 1}",
                        "Mediana (h)": f"{_pm.strftime('%m-%d %H:%M')} (en {_t_rest_m:.1f}h)",
                        "Media (h)": _pa.strftime("%m-%d %H:%M"),
                        "Circadiano": _pc.strftime("%m-%d %H:%M"),
                    })
                st.dataframe(pd.DataFrame(_pred3_rows), width="stretch", hide_index=True)

                # ── Gráficos de predicción vs real ─────────────────────────
                st.markdown("**Backtest — últimas 4 comidas vs predicción**")
                st.caption(
                    "Cada gráfico muestra la curva de peso real (🟠 naranja) para una comida reciente "
                    "y la línea de predicción temporal (🔵 azul punteado) calculada *antes* de que ocurriera. "
                    "La predicción se hizo con: `última_comida_anterior + mediana_intervalo`. "
                    "La distancia horizontal entre el inicio de la curva naranja y la línea azul = error del predictor.  \n"
                    "**Métricas de error (% del intervalo mediano):** "
                    "Error medio <15 % = predictor confiable para notificaciones; "
                    "15–30 % = moderado; >30 % = alta variabilidad en el horario de Bandida — "
                    "cambiar al modelo circadiano como método primario."
                )

                if df_lec is not None and len(df_alim) >= 4:
                    _pred_graf_cols = st.columns(2)
                    _errores_pct = []

                    for _gi in range(min(4, len(df_alim) - 1)):
                        _row_g = df_alim.iloc[-(2 + _gi)]   # comida para predecir
                        _row_prev = df_alim.iloc[-(3 + _gi)] if (3 + _gi) < len(df_alim) else None

                        _t_real = _row_g["t_inicio"]
                        _t_pred = _row_prev["t_inicio"] + pd.Timedelta(hours=mediana_h) if _row_prev is not None else None

                        if _t_pred is None:
                            continue

                        _err_h = (_t_real - _t_pred).total_seconds() / 3600
                        _err_pct = abs(_err_h) / mediana_h * 100
                        _errores_pct.append(abs(_err_pct))

                        # Segmento de la curva real
                        _t0_g = _row_g["t_inicio"]
                        _t1_g = _row_g["t_fin"]
                        _mask_g = (df_lec["ts"] >= _t0_g) & (df_lec["ts"] <= _t1_g)
                        _sub_g = df_lec[_mask_g].copy()
                        _sub_g["ts_s"] = _sub_g["ts"].dt.tz_convert(TZ_STGO)

                        _fig_g = go.Figure()

                        # Curva real
                        if len(_sub_g) > 0:
                            _fig_g.add_trace(go.Scatter(
                                x=_sub_g["ts_s"], y=_sub_g["peso_g"],
                                mode="lines", line=dict(color="#f97316", width=2),
                                name="Real",
                            ))

                        # Línea vertical: predicción vs real
                        _t_pred_s = _t_pred.astimezone(TZ_STGO)
                        _t_real_s = _t_real.astimezone(TZ_STGO)
                        _ax_g = dict(
                            gridcolor=_DARK["grid_color"], linecolor=_DARK["line_color"],
                            tickfont=dict(size=9, color=_DARK["tick_color"]), zeroline=False,
                        )
                        _fig_g.add_vline(x=_ts_ms(_t_pred_s), line_dash="dash",
                                         line_color="#3b82f6", line_width=2,
                                         annotation_text=f"Pred {_t_pred_s.strftime('%H:%M')}",
                                         annotation_font=dict(color="#3b82f6", size=9))
                        _fig_g.add_vline(x=_ts_ms(_t_real_s), line_dash="solid",
                                         line_color="#22c55e", line_width=2,
                                         annotation_text=f"Real {_t_real_s.strftime('%H:%M')}",
                                         annotation_font=dict(color="#22c55e", size=9))
                        _fig_g.update_layout(
                            height=200,
                            title=dict(
                                text=f"Comida #{len(df_alim) - 1 - _gi}  ·  Error: {_err_h:+.1f} h ({_err_pct:.0f}%)",
                                font=dict(size=11, color=_DARK["font_color"]),
                            ),
                            xaxis=dict(tickformat="%H:%M", **_ax_g),
                            yaxis=dict(title="g", **_ax_g),
                            plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=40, r=10, t=40, b=30),
                            showlegend=False,
                        )
                        _pred_graf_cols[_gi % 2].plotly_chart(_fig_g, width='stretch')

                    # ── Sistema de error y mejora ─────────────────────────
                    if _errores_pct:
                        st.markdown("---")
                        st.markdown("#### 8. Sistema de error y mejora del predictor")
                        st.caption(
                            "Evalúa qué tan preciso es el predictor usando las últimas 4 comidas. "
                            "Muestra el error promedio y sugiere cómo reducirlo."
                        )

                        _err_mean  = float(np.mean(_errores_pct))
                        _err_std   = float(np.std(_errores_pct))
                        _err_max   = float(np.max(_errores_pct))
                        _err_trend = _errores_pct[-1] - _errores_pct[0] if len(_errores_pct) > 1 else 0

                        _e1, _e2, _e3, _e4 = st.columns(4)
                        _e1.metric("Error medio", f"{_err_mean:.1f}%",
                                   help="% del intervalo mediano")
                        _e2.metric("Desv. std del error", f"{_err_std:.1f}%")
                        _e3.metric("Error máximo", f"{_err_max:.1f}%")
                        _e4.metric(
                            "Tendencia del error",
                            f"{'↗ subiendo' if _err_trend > 5 else '↘ bajando' if _err_trend < -5 else '→ estable'}",
                            delta=f"{_err_trend:+.1f}%",
                            delta_color="inverse" if _err_trend > 5 else "normal" if _err_trend < -5 else "off",
                        )

                        # Recomendaciones de mejora
                        st.markdown("**Cómo mejorar el predictor:**")
                        _sugs = []
                        if _err_mean > 30:
                            _sugs.append("🔴 Error alto (>30%) — el patrón de horarios varía mucho. "
                                         "Intentar usar el modelo circadiano en lugar de la mediana fija.")
                        elif _err_mean > 15:
                            _sugs.append("🟡 Error moderado (15-30%) — agregar más anotaciones mejorará la mediana.")
                        else:
                            _sugs.append("🟢 Error bajo (<15%) — el predictor funciona bien con los datos actuales.")

                        if abs(corr_dg) > 0.3 and df_lec is not None:
                            _sugs.append(
                                f"📊 Correlación Δpeso→intervalo = **{corr_dg:+.3f}**: "
                                "usar predicción ajustada por cantidad consumida reduce el error."
                            )
                        if n_alim_ev < 20:
                            _sugs.append(
                                f"📈 Solo {n_alim_ev} eventos anotados. "
                                "Con ≥50 eventos la mediana es mucho más estable."
                            )
                        if _err_trend > 10:
                            _sugs.append(
                                "⚠️ El error está aumentando en los últimos eventos. "
                                "Posible cambio de rutina de Bandida — actualizar el dataset."
                            )

                        for _s in _sugs:
                            st.markdown(f"- {_s}")

                # ── RESUMEN FINAL ─────────────────────────────────────────
                st.markdown("---")
                st.markdown("#### Resumen de predicciones — cuándo comerá Bandida")
                st.caption(
                    "Las 4 filas son 4 estimaciones de la próxima comida usando distintos métodos. "
                    "**Cuándo confiar en cada uno:**  \n"
                    "- **Mediana** — mejor estimación central, robusta a días atípicos (recomendada para push notifications)  \n"
                    "- **Media** — puede ser más alta si hubo semanas con rutina distendida  \n"
                    "- **P25 (límite temprano)** — 25 % de probabilidad de que ya haya comido; útil para pre-alerta suave  \n"
                    "- **P75 (límite tardío)** — 75 % de probabilidad de que ya haya comido; punto de alerta fuerte"
                )

                pred_rows = [
                    ("Por mediana del intervalo",    pred_mediana.astimezone(TZ_STGO).strftime("%m-%d %H:%M"), f"{t_rest_mediana:+.1f} h"),
                    ("Por media del intervalo",      pred_media.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),   f"{t_rest_media:+.1f} h"),
                    ("Límite temprano (P25)",        pred_p25_t.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),  "—"),
                    ("Límite tardío (P75)",          pred_p75_t.astimezone(TZ_STGO).strftime("%m-%d %H:%M"),  "—"),
                ]
                df_pred = pd.DataFrame(pred_rows, columns=["Método", "Predicción (Stgo)", "Tiempo restante"])
                st.dataframe(df_pred, width="stretch", hide_index=True)
                _pb7.progress(100, "✅")
                _pb7.empty()

    # ═══════════════════════════════════════════════════════════════════════
    # TAB 8 — KITTYPAU DASHBOARD
    # ═══════════════════════════════════════════════════════════════════════
    elif _tab == "🐱 Kittypau":
        _pb8 = st.progress(0, "🐱 Cargando Kittypau…")
        _NOW_UTC_KP  = pd.Timestamp.now(tz="UTC")
        _NOW_STGO_KP = _NOW_UTC_KP.astimezone(TZ_STGO)

        # ── Preparar datos por categoría ─────────────────────────────────
        _kp_alim  = df_anot[df_anot["categoria"] == "alimentacion"].copy()
        _kp_serv  = df_anot[df_anot["categoria"] == "servido"].copy()
        _kp_ruid  = df_anot[df_anot["categoria"] == "ruido"].copy()
        _kp_ciclo = df_anot[df_anot["categoria"] == "ciclo_servido_alimento"].copy()

        for _kp_df in [_kp_alim, _kp_serv, _kp_ruid, _kp_ciclo]:
            if len(_kp_df) > 0:
                _kp_df["t_ini_s"]  = _kp_df["t_inicio"].dt.tz_convert(TZ_STGO)
                _kp_df["t_fin_s"]  = _kp_df["t_fin"].dt.tz_convert(TZ_STGO)
                _kp_df["fecha"]    = _kp_df["t_ini_s"].dt.date
                _kp_df["hora"]     = _kp_df["t_ini_s"].dt.hour
                _kp_df["dur_min"]  = (_kp_df["t_fin"] - _kp_df["t_inicio"]).dt.total_seconds() / 60

        _kp_today    = _NOW_STGO_KP.date()
        _kp_alim_hoy = _kp_alim[_kp_alim["fecha"] == _kp_today] if len(_kp_alim) > 0 else pd.DataFrame()
        _kp_serv_hoy = _kp_serv[_kp_serv["fecha"] == _kp_today] if len(_kp_serv) > 0 else pd.DataFrame()

        # Última lectura válida
        _kp_peso_act = None
        _kp_ts_act   = None
        if df_lec is not None and len(df_lec) > 0:
            _kp_lv = df_lec.dropna(subset=["peso_g"])
            if len(_kp_lv) > 0:
                _kp_peso_act = float(_kp_lv.iloc[-1]["peso_g"])
                _kp_ts_act   = _kp_lv.iloc[-1]["ts"].astimezone(TZ_STGO)

        # ── Fecha del último dato CSV ─────────────────────────────────────
        _kp_csv_ts = None
        if READINGS_ROWS_CSV.exists():
            _kp_csv_ts = (
                pd.Timestamp(READINGS_ROWS_CSV.stat().st_mtime, unit="s", tz="UTC")
                .astimezone(TZ_STGO)
            )
        _kp_csv_str = _kp_csv_ts.strftime("datos al %d-%b %H:%M") if _kp_csv_ts else "fecha desconocida"

        _kp_n_ciclo = len(_kp_ciclo)

        # ── Header ───────────────────────────────────────────────────────
        st.subheader("🐱 Dashboard Kittypau — Bandida · KPCL0034")
        st.caption(
            f"Métricas calculadas sobre datos locales del sensor IoT · "
            f"**{len(df_anot)} registros** ({len(df_anot) - _kp_n_ciclo} anotaciones + {_kp_n_ciclo} ciclos S/A) · "
            f"Motor Matemático v2 (102 features) · "
            f"Ciclo Alpha v2 · {_NOW_STGO_KP.strftime('%d-%b-%Y %H:%M')} · {_kp_csv_str}  \n"
            "**Cómo leer este dashboard:** la parte superior (Panel Sims) es el resumen de bienestar para el usuario final. "
            "Las secciones A–I son el análisis técnico detallado para el operador/investigador. "
            "Todos los cálculos son determinísticos (sin ML): estadística básica sobre las anotaciones reales."
        )

        # ══════════════════════════════════════════════════════════════════
        # PANEL SIMS — 10 barras de bienestar
        # ══════════════════════════════════════════════════════════════════
        st.markdown("### 🎮 Panel de Bienestar (The Sims)")
        st.caption(
            "10 indicadores de bienestar calculados en tiempo real desde los datos del sensor. "
            "**Cada barra = 0–100 %** donde 100 % = estado óptimo. 🟢 ≥70 % · 🟡 40–70 % · 🔴 <40 %.  \n"
            "Fórmulas clave: "
            "**Hambre** = 100 − (h_desde_última_alim / mediana_intervalo × 100) — llega a 0 % cuando el tiempo supera el intervalo normal. "
            "**Rutina** = 100 − std_horas_comida × 10 — alta cuando Bandida come siempre a la misma hora. "
            "**Apetito** = Δpeso_7d / Δpeso_histórico × 100 — compara el consumo reciente vs. el promedio histórico. "
            "**Datos frescos** disminuye 4 % por cada hora sin sync con Supabase (llega a 0 % tras 25 h)."
        )

        # Calcular indicadores
        _pb8.progress(40, "📊 Calculando indicadores de bienestar…")
        _kp_alim_s = _kp_alim.sort_values("t_inicio") if len(_kp_alim) > 0 else pd.DataFrame()
        _kp_ultima_alim = _kp_alim_s.iloc[-1]["t_inicio"] if len(_kp_alim_s) > 0 else None
        _kp_h_desde_alim = ((_NOW_UTC_KP - _kp_ultima_alim).total_seconds() / 3600
                            if _kp_ultima_alim else 99.0)
        _kp_mediana_iv = 6.0   # horas — fallback si no hay datos suficientes

        if len(_kp_alim_s) >= 3:
            _kp_ivs, _ = _intervalos_validos_alim(_kp_alim_s)
            if _kp_ivs:
                _kp_mediana_iv = float(np.median(_kp_ivs))

        # 1. Hambre (inverso del tiempo desde última comida vs mediana)
        _sims_hambre    = max(0, 100 - (_kp_h_desde_alim / _kp_mediana_iv * 100))
        # 2. Saciedad (si comió hoy)
        _sims_saciedad  = min(100, len(_kp_alim_hoy) / max(round(_kp_mediana_iv and 24 / _kp_mediana_iv, 1), 1) * 100)
        # 3. Hidratación — proxy por peso estable (no hay sensor de agua)
        _sims_agua      = 70.0   # sin datos directos — valor neutro

        # 4. Actividad (comidas hoy vs mediana diaria)
        _kp_med_dia = float(np.median(_kp_alim.groupby("fecha").size())) if len(_kp_alim) > 0 else 3.0
        _sims_activ = min(100, len(_kp_alim_hoy) / max(_kp_med_dia, 1) * 100)

        # 5. Sueño/reposo — proxy: N lecturas activas últimas 8h
        _kp_t8h = _NOW_UTC_KP - pd.Timedelta(hours=8)
        _kp_lec_8h = df_lec[df_lec["ts"] >= _kp_t8h]["peso_g"].dropna() if df_lec is not None else pd.Series()
        _kp_actividad_8h = 0.0
        if len(_kp_lec_8h) > 5:
            _kp_actividad_8h = float((_kp_lec_8h.diff().abs() > 1.0).sum() / len(_kp_lec_8h) * 100)
        _sims_sueno = max(0, 100 - _kp_actividad_8h)

        # 6. Rutina (regularidad circadiana — std de horas de comida)
        if len(_kp_alim_s) >= 5:
            _kp_horas_f = [t.astimezone(TZ_STGO).hour + t.astimezone(TZ_STGO).minute / 60
                           for t in _kp_alim_s["t_inicio"]]
            _kp_std_h = float(np.std(_kp_horas_f))
            _sims_rutina = max(0, 100 - _kp_std_h * 10)
        else:
            _sims_rutina = 50.0

        # 7. Apetito (Δpeso promedio última semana vs histórico)
        _kp_t7d    = _NOW_UTC_KP - pd.Timedelta(days=7)
        _kp_alim7d = _kp_alim_s[_kp_alim_s["t_inicio"] >= _kp_t7d] if len(_kp_alim_s) > 0 else pd.DataFrame()
        if len(_kp_alim7d) >= 2 and df_lec is not None:
            _kp_dws = []
            for _, _r7 in _kp_alim7d.iterrows():
                _m7 = calcular_metricas(df_lec, _r7["t_inicio"], _r7["t_fin"])
                if _m7:
                    _kp_dws.append(abs(_m7["delta_w_g"]))
            _hist_vals = [
                abs(m["delta_w_g"])
                for _, _r in _kp_alim_s.head(20).iterrows()
                if (m := calcular_metricas(df_lec, _r["t_inicio"], _r["t_fin"]))
            ]
            _kp_dw_hist = float(np.median(_hist_vals)) if _hist_vals else 10.0
            _sims_apetito = min(100, (np.mean(_kp_dws) / max(_kp_dw_hist, 1)) * 100) if _kp_dws else 50.0
        else:
            _sims_apetito = 60.0

        # 8. Energía (N comidas últimas 24h vs mediana diaria)
        _sims_energia = min(100, _sims_activ)

        # 9. Salud general (media ponderada de indicadores clave)
        _sims_salud = float(np.mean([_sims_hambre, _sims_saciedad, _sims_activ, _sims_rutina, _sims_apetito]))

        # 10. Frescura del dataset (horas desde el último sync con Supabase)
        if _kp_csv_ts is not None:
            _kp_data_age_h = (_NOW_UTC_KP - _kp_csv_ts.astimezone(timezone.utc)).total_seconds() / 3600
            _sims_sensor = max(0.0, 100.0 - _kp_data_age_h * 4)  # 100% < 1h, 0% > 25h
        else:
            _sims_sensor = 0.0

        _SIMS_BARS = [
            ("🍽️ Hambre",        _sims_hambre,    "#f97316", "Tiempo desde última comida vs intervalo normal"),
            ("😋 Saciedad",       _sims_saciedad,  "#22c55e", "Comidas de hoy vs frecuencia diaria esperada"),
            ("💧 Hidratación",    _sims_agua,      "#3b82f6", "Sin sensor de agua — valor estimado"),
            ("⚡ Actividad",      _sims_activ,     "#a78bfa", "Comidas hoy vs mediana diaria histórica"),
            ("😴 Sueño/reposo",   _sims_sueno,     "#6b7280", "Inverso de la actividad en las últimas 8 horas"),
            ("📅 Rutina",         _sims_rutina,    "#fbbf24", "Regularidad de horas de comida (baja std = alta rutina)"),
            ("🥩 Apetito",        _sims_apetito,   "#ef4444", "Δpeso promedio última semana vs histórico"),
            ("⚡ Energía",        _sims_energia,   "#f59e0b", "Frecuencia de comidas recientes"),
            ("💚 Salud general",  _sims_salud,     "#00b45a", "Media ponderada de indicadores clave"),
            ("📡 Datos frescos",   _sims_sensor,    "#60a5fa", "Frescura del dataset — disminuye con cada hora sin sync"),
        ]

        # Renderizar como barras con HTML + st.markdown
        _sims_html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;">'
        for _sims_lbl, _sims_val, _sims_color, _sims_tip in _SIMS_BARS:
            _sims_pct = max(0, min(100, float(_sims_val)))
            _sims_status = "🟢" if _sims_pct >= 70 else ("🟡" if _sims_pct >= 40 else "🔴")
            _sims_html += (
                f'<div title="{_sims_tip}" style="margin-bottom:2px;">'
                f'<div style="display:flex;justify-content:space-between;margin-bottom:2px;">'
                f'<span style="font-size:13px;color:#e5e7eb;">{_sims_lbl}</span>'
                f'<span style="font-size:12px;color:#9ca3af;">{_sims_status} {_sims_pct:.0f}%</span>'
                f'</div>'
                f'<div style="background:#1f2937;border-radius:4px;height:10px;width:100%;">'
                f'<div style="background:{_sims_color};border-radius:4px;height:10px;'
                f'width:{_sims_pct:.0f}%;transition:width 0.3s;"></div>'
                f'</div></div>'
            )
        _sims_html += '</div>'
        st.markdown(_sims_html, unsafe_allow_html=True)

        # KPIs destacados
        st.divider()
        _kp_kpi1, _kp_kpi2, _kp_kpi3 = st.columns(3)
        _kp_kpi1.metric(
            "🕐 Próxima comida estimada",
            ((_kp_ultima_alim + pd.Timedelta(hours=_kp_mediana_iv)).astimezone(TZ_STGO).strftime("%H:%M")
             if _kp_ultima_alim else "N/D"),
            delta=f"en {max(0, _kp_mediana_iv - _kp_h_desde_alim):.1f} h",
            delta_color="normal" if _kp_mediana_iv > _kp_h_desde_alim else "inverse",
        )
        _kp_kpi2.metric(
            "🍽️ Comidas esta semana",
            len(_kp_alim7d) if len(_kp_alim7d) > 0 else "N/D",
            delta=f"vs {_kp_med_dia:.1f}/día esperadas",
            delta_color="off",
        )
        _kp_kpi3.metric(
            "⚖️ Peso en plato (CSV)",
            f"{_kp_peso_act:.0f} g" if _kp_peso_act else "N/D",
            help=f"Última lectura local: {_kp_ts_act.strftime('%H:%M') if _kp_ts_act else 'N/D'} · Actualizar con 🔄",
        )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # A — ESTADO ACTUAL DEL SENSOR
        # ════════════════════════════════════════════════════════════════
        st.markdown("### A · Estado actual del sensor")
        _kpa_col, _kpa_exp = st.columns([3, 2])

        with _kpa_col:
            _m1, _m2, _m3, _m4 = st.columns(4)
            _m1.metric(
                "Peso en plato",
                f"{_kp_peso_act:.0f} g" if _kp_peso_act is not None else "N/D",
            )
            _m2.metric("Comidas hoy", len(_kp_alim_hoy))
            _m3.metric("Servidos hoy", len(_kp_serv_hoy))
            _m4.metric(
                "Última lectura",
                _kp_ts_act.strftime("%H:%M") if _kp_ts_act else "N/D",
                help="Hora Santiago",
            )

        with _kpa_exp:
            st.info(
                "**¿Por qué es el dato más crítico?**  \n"
                "El peso actual es el único indicador **en tiempo real** disponible sin cámara. "
                "Saber cuántas veces comió hoy y si el bowl fue servido permite detectar "
                "anomalías operacionales: si hay un 🔵 servido registrado pero el peso no bajó después, "
                "Bandida no comió — posible pérdida de apetito.  \n\n"
                "**Cómo interpretar 'Última lectura':** si lleva >5 min sin actualizarse, "
                "puede haber problema de conectividad WiFi o batería baja en el sensor. "
                ">60 min = sensor offline → los datos del dashboard pueden estar desactualizados.  \n\n"
                "**Nota:** estos datos son locales (CSV). Para sincronizar con los datos más recientes "
                "de Supabase, presionar **🔄 Actualizar Todo**."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # B — SEÑAL DEL DÍA
        # ════════════════════════════════════════════════════════════════
        st.markdown("### B · Señal de peso — hoy")
        _kpb_col, _kpb_exp = st.columns([3, 2])

        with _kpb_col:
            if df_lec is not None:
                _kp_t0_today  = pd.Timestamp(_kp_today, tz=TZ_STGO)
                _kp_mask_hoy  = (df_lec["ts"] >= _kp_t0_today) & (df_lec["ts"] <= _NOW_UTC_KP)
                _kp_df_hoy    = df_lec[_kp_mask_hoy].copy()
                if len(_kp_df_hoy) > 0:
                    _kp_df_hoy["ts_s"] = _kp_df_hoy["ts"].dt.tz_convert(TZ_STGO)

                if len(_kp_df_hoy) > 1:
                    _fig_b = go.Figure()
                    _fig_b.add_trace(go.Scatter(
                        x=_kp_df_hoy["ts_s"], y=_kp_df_hoy["peso_g"],
                        mode="lines",
                        line=dict(color="#60a5fa", width=2),
                        name="Peso (g)",
                    ))
                    for _, _r in _kp_alim_hoy.iterrows():
                        _fig_b.add_vrect(x0=_r["t_ini_s"], x1=_r["t_fin_s"],
                                         fillcolor="rgba(0,180,90,0.20)", line_width=0)
                    for _, _r in _kp_serv_hoy.iterrows():
                        _fig_b.add_vrect(x0=_r["t_ini_s"], x1=_r["t_fin_s"],
                                         fillcolor="rgba(30,100,255,0.20)", line_width=0)
                    _fig_b.update_layout(
                        height=280,
                        plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                        font=dict(color=_DARK["font_color"]),
                        xaxis=dict(gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                        yaxis=dict(title="g", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                        margin=dict(l=50, r=20, t=20, b=40), showlegend=False,
                    )
                    st.plotly_chart(_fig_b, width="stretch")
                    st.caption("🟢 banda verde = alimentación confirmada · 🔵 banda azul = servido confirmado")
                else:
                    st.info("Sin lecturas del sensor para hoy.")
            else:
                st.info("Lecturas no disponibles.")

        with _kpb_exp:
            st.info(
                "**¿Por qué importa la curva del día?**  \n"
                "La señal cruda revela el ciclo completo de un día: "
                "**🔵 servido** (peso sube 20–80 g en <1 min) → "
                "**🟢 alimentación** (peso baja 5–15 g en 4–8 min, doble rampa) → "
                "**plateau** (peso estable entre eventos).  \n\n"
                "**Señales de alerta en la curva:**  \n"
                "- Bajada de peso **sin banda verde** = candidato pendiente de anotar en Tab 1  \n"
                "- Banda azul **sin bajada posterior en 30–60 min** = Bandida no comió después del servido  \n"
                "- Peso cayendo continuamente todo el día = posible bowl vacío o fuga de sensor  \n"
                "- Múltiples oscilaciones pequeñas = eventos de ruido (sensor moviéndose)  \n\n"
                "Este gráfico es el 'registro diario' que el app móvil debe mostrar de forma prominente."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # C — RITMO CIRCADIANO
        # ════════════════════════════════════════════════════════════════
        st.markdown("### C · Ritmo circadiano — ¿a qué hora come Bandida?")
        _kpc_col, _kpc_exp = st.columns([3, 2])

        with _kpc_col:
            if len(_kp_alim) > 0:
                _kp_hora_cnt = _kp_alim["hora"].value_counts().sort_index()
                _kp_horas    = list(range(24))
                _kp_vals_h   = [int(_kp_hora_cnt.get(h, 0)) for h in _kp_horas]
                _kp_colors_h = [
                    "#f97316" if 6  <= h < 12 else
                    "#60a5fa" if 12 <= h < 18 else
                    "#a78bfa" if 18 <= h < 24 else "#374151"
                    for h in _kp_horas
                ]
                _fig_c = go.Figure(go.Bar(
                    x=_kp_horas, y=_kp_vals_h,
                    marker_color=_kp_colors_h, opacity=0.85,
                ))
                _kp_peak_h = int(_kp_hora_cnt.idxmax()) if len(_kp_hora_cnt) > 0 else 0
                _fig_c.add_vline(x=_kp_peak_h, line_dash="dash", line_color="#fbbf24",
                                 annotation_text=f"pico {_kp_peak_h:02d}h",
                                 annotation_font_color="#fbbf24")
                _fig_c.update_layout(
                    height=260,
                    xaxis=dict(title="Hora del día (Santiago)", tickvals=list(range(0, 24, 2)),
                               gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    yaxis=dict(title="N comidas", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                    font=dict(color=_DARK["font_color"]),
                    margin=dict(l=50, r=20, t=20, b=40),
                )
                st.plotly_chart(_fig_c, width="stretch")
                st.caption(
                    f"🟠 mañana (6–12h) · 🔵 tarde (12–18h) · 🟣 noche (18–24h) · ⬛ madrugada (0–6h) · "
                    f"Hora pico: **{_kp_peak_h:02d}:00** · N eventos: {len(_kp_alim)}"
                )
            else:
                st.info("Sin eventos de alimentación anotados.")

        with _kpc_exp:
            st.info(
                "**¿Por qué es la firma más valiosa?**  \n"
                f"El ritmo circadiano de Bandida es su **huella de comportamiento única**, "
                f"construida con {len(_kp_alim)} eventos reales. Muestra en qué horas come habitualmente.  \n\n"
                "**Cómo leer el gráfico:** cada barra es el total de alimentaciones registradas en esa franja horaria "
                "durante todo el período (Abr–Jun 2026). La barra más alta = hora pico = la hora más probable de comer.  \n\n"
                "**Uso para notificaciones:** si la hora actual está dentro de una franja de alta probabilidad "
                "y no ha habido alimentación en las últimas 2 h, el sistema puede enviar una pre-alerta. "
                "Si 2 h después del pico histórico Bandida todavía no comió, es una alerta de nivel medio.  \n\n"
                "**Colores del histograma:** 🟠 mañana (6–12h), 🔵 tarde (12–18h), 🟣 noche (18–24h), ⬛ madrugada (0–6h)."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # D — FRECUENCIA DIARIA DE COMIDAS
        # ════════════════════════════════════════════════════════════════
        st.markdown("### D · Frecuencia de comidas por día")
        _kpd_col, _kpd_exp = st.columns([3, 2])

        with _kpd_col:
            if len(_kp_alim) > 0:
                _kp_freq = _kp_alim.groupby("fecha").size().reset_index(name="n")
                _kp_freq = _kp_freq.sort_values("fecha").tail(60)
                _kp_colors_d = [
                    "#ef4444" if n <= 1 else ("#fbbf24" if n == 2 else "#00b45a")
                    for n in _kp_freq["n"]
                ]
                _kp_med_d = float(_kp_freq["n"].median())
                _fig_d = go.Figure(go.Bar(
                    x=_kp_freq["fecha"].astype(str), y=_kp_freq["n"],
                    marker_color=_kp_colors_d, opacity=0.85,
                ))
                _fig_d.add_hline(y=_kp_med_d, line_dash="dash", line_color="#fbbf24",
                                 annotation_text=f"Mediana {_kp_med_d:.1f}/día",
                                 annotation_font_color="#fbbf24")
                _fig_d.update_layout(
                    height=260,
                    xaxis=dict(title="Fecha", tickangle=-45,
                               gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"], size=9)),
                    yaxis=dict(title="N comidas/día", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                    font=dict(color=_DARK["font_color"]),
                    margin=dict(l=50, r=20, t=20, b=60),
                )
                st.plotly_chart(_fig_d, width="stretch")
                _kp_dias_rojo = int((_kp_freq["n"] <= 1).sum())
                st.caption(
                    f"🟢 ≥3 comidas · 🟡 2 comidas · 🔴 ≤1 comida  |  "
                    f"Mediana: {_kp_med_d:.1f}/día  |  "
                    f"Rango: {_kp_freq['n'].min()}–{_kp_freq['n'].max()}  |  "
                    f"Días en rojo: {_kp_dias_rojo}"
                )
            else:
                st.info("Sin datos de alimentación.")

        with _kpd_exp:
            st.info(
                "**¿Por qué es el KPI principal?**  \n"
                "La frecuencia diaria es el **indicador de bienestar más simple y potente**: "
                "cualquier cambio en el apetito de Bandida se refleja aquí antes que en cualquier otra métrica.  \n\n"
                "**Cómo leer el gráfico:**  \n"
                "- 🟢 **Verde** (3–4 comidas/día) = rango habitual de Bandida  \n"
                "- 🟡 **Amarillo** (2 comidas) = por debajo de lo normal — observar  \n"
                "- 🔴 **Rojo** (≤1 comida) = alarma: posible gap de datos, sin hambre o problema de salud  \n\n"
                "**Línea amarilla** = media móvil 7 días = 'lo normal' de Bandida en la semana reciente.  \n"
                "Cualquier tendencia descendente sostenida (≥3 días consecutivos por debajo de la línea) "
                "debe disparar una alerta de nivel alto en el dashboard del dueño."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # E — DURACIÓN Y Δpeso POR COMIDA
        # ════════════════════════════════════════════════════════════════
        st.markdown("### E · Duración y consumo (Δpeso) por comida")
        _kpe_col, _kpe_exp = st.columns([3, 2])

        with _kpe_col:
            if len(_kp_alim) > 0 and df_lec is not None:
                # Caché de sesión — se invalida solo si cambian los datos
                _kpe_key = f"kp_deltas_{len(_kp_alim)}_{_csv_max_mtime()}"
                if st.session_state.get("_sscache_kpe_key") == _kpe_key:
                    _kp_deltas = st.session_state["_sscache_kpe_vals"]
                else:
                    _kp_deltas = []
                    for _, _r in _kp_alim.iterrows():
                        _m_e = calcular_metricas(df_lec, _r["t_inicio"], _r["t_fin"])
                        if _m_e:
                            _kp_deltas.append(_m_e["delta_w_g"])
                    st.session_state["_sscache_kpe_key"]  = _kpe_key
                    st.session_state["_sscache_kpe_vals"] = _kp_deltas

                _kpe_v1, _kpe_v2 = st.columns(2)
                with _kpe_v1:
                    _kp_dur_med = float(np.median(_kp_alim["dur_min"]))
                    _kp_dur_p25 = float(np.percentile(_kp_alim["dur_min"], 25))
                    _kp_dur_p75 = float(np.percentile(_kp_alim["dur_min"], 75))
                    _fig_e1 = go.Figure(go.Histogram(
                        x=_kp_alim["dur_min"].values, nbinsx=20,
                        marker_color="#00b45a", opacity=0.80,
                    ))
                    _fig_e1.add_vline(x=_kp_dur_med, line_dash="dash", line_color="#fbbf24",
                                      annotation_text=f"P50 {_kp_dur_med:.1f}m",
                                      annotation_font_color="#fbbf24")
                    _fig_e1.update_layout(
                        height=240,
                        title=dict(text="Duración de comida (min)", font=dict(color=_DARK["font_color"], size=12)),
                        xaxis=dict(title="min", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                        yaxis=dict(title="N", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                        plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                        margin=dict(l=40, r=20, t=40, b=40), showlegend=False,
                        font=dict(color=_DARK["font_color"]),
                    )
                    st.plotly_chart(_fig_e1, width="stretch")
                    st.caption(f"P25–P75: {_kp_dur_p25:.1f}–{_kp_dur_p75:.1f} min")

                with _kpe_v2:
                    if _kp_deltas:
                        _kp_dw_med = float(np.median(_kp_deltas))
                        _fig_e2 = go.Figure(go.Histogram(
                            x=_kp_deltas, nbinsx=20,
                            marker_color="#60a5fa", opacity=0.80,
                        ))
                        _fig_e2.add_vline(x=_kp_dw_med, line_dash="dash", line_color="#fbbf24",
                                          annotation_text=f"P50 {_kp_dw_med:+.1f}g",
                                          annotation_font_color="#fbbf24")
                        _fig_e2.update_layout(
                            height=240,
                            title=dict(text="Δpeso por comida (g)", font=dict(color=_DARK["font_color"], size=12)),
                            xaxis=dict(title="g", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                            yaxis=dict(title="N", gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                            plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                            margin=dict(l=40, r=20, t=40, b=40), showlegend=False,
                            font=dict(color=_DARK["font_color"]),
                        )
                        st.plotly_chart(_fig_e2, width="stretch")
                        st.caption(f"Mediana: {_kp_dw_med:+.1f} g · N={len(_kp_deltas)}")
                    else:
                        st.info("No se pudo calcular Δpeso.")
            else:
                st.info("Sin datos suficientes.")

        with _kpe_exp:
            st.info(
                "**¿Por qué ambas distribuciones?**  \n"
                "La **duración** define el tiempo normal que Bandida tarda en comer. "
                "Empírico: mediana ≈ 6 min, P25–P75 ≈ 4–8 min.  \n"
                "- Comida muy corta (<2 min) → comió poco o fue interrumpida  \n"
                "- Comida muy larga (>12 min) → bowl posiblemente estaba vacío, siguió lamiendo  \n\n"
                "El **Δpeso** es el proxy del consumo real sin cámara. "
                "Empírico: mediana ≈ −8 g, rango normal −5 a −15 g.  \n"
                "- Δpeso > −3 g = apenas comió (sospecha de inapetencia)  \n"
                "- Δpeso < −20 g = comida muy grande (inusual, verificar en Tab 0)  \n\n"
                "Ambas métricas juntas definen el **perfil de comida normal** de Bandida — "
                "la base para detectar cambios de apetito antes de que el dueño los note."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # F — INTERVALOS ENTRE COMIDAS
        # ════════════════════════════════════════════════════════════════
        st.markdown("### F · Distribución de intervalos entre comidas")
        _kpf_col, _kpf_exp = st.columns([3, 2])

        with _kpf_col:
            if len(_kp_alim) >= 3:
                _kp_ts_sorted = _kp_alim.sort_values("t_inicio")["t_inicio"].tolist()
                _kp_ints_h = [
                    (_kp_ts_sorted[i+1] - _kp_ts_sorted[i]).total_seconds() / 3600
                    for i in range(len(_kp_ts_sorted) - 1)
                ]
                _kp_ints_h = [x for x in _kp_ints_h if 0.33 <= x <= 36.0]

                if _kp_ints_h:
                    _kp_int_med = float(np.median(_kp_ints_h))
                    _kp_int_p25 = float(np.percentile(_kp_ints_h, 25))
                    _kp_int_p75 = float(np.percentile(_kp_ints_h, 75))

                    _fig_f = go.Figure()
                    _fig_f.add_trace(go.Histogram(
                        x=_kp_ints_h, nbinsx=24,
                        marker_color="#a78bfa", opacity=0.80,
                    ))
                    _fig_f.add_vline(x=_kp_int_med, line_dash="dash", line_color="#fbbf24",
                                     annotation_text=f"P50 {_kp_int_med:.1f}h",
                                     annotation_font_color="#fbbf24")
                    _fig_f.add_vrect(x0=_kp_int_p25, x1=_kp_int_p75,
                                     fillcolor="rgba(167,139,250,0.12)", line_width=0)
                    _fig_f.update_layout(
                        height=260,
                        xaxis=dict(title="Horas entre comidas", gridcolor=_DARK["grid_color"],
                                   tickfont=dict(color=_DARK["tick_color"])),
                        yaxis=dict(title="N intervalos", gridcolor=_DARK["grid_color"],
                                   tickfont=dict(color=_DARK["tick_color"])),
                        plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                        font=dict(color=_DARK["font_color"]),
                        margin=dict(l=50, r=20, t=20, b=40), showlegend=False,
                    )
                    st.plotly_chart(_fig_f, width="stretch")
                    st.caption(
                        f"Banda morada = zona normal (P25–P75): {_kp_int_p25:.1f}–{_kp_int_p75:.1f} h  |  "
                        f"Mediana: **{_kp_int_med:.1f} h**  |  N intervalos válidos: {len(_kp_ints_h)}"
                    )
                else:
                    st.info("Sin intervalos válidos (todos fuera del rango 20 min–36 h).")
            else:
                st.info("Se necesitan ≥ 3 eventos de alimentación.")

        with _kpf_exp:
            st.info(
                "**¿Por qué es el predictor clave?**  \n"
                "El intervalo entre comidas es el **reloj biológico de Bandida**. "
                "La mediana (línea amarilla) es la predicción base: 'comerá de nuevo en X horas'.  \n\n"
                "**La banda morada (P25–P75)** es el rango 'normal':  \n"
                "- Un intervalo **< P25** = comió antes de lo habitual (puede indicar que la comida anterior fue pequeña)  \n"
                "- Un intervalo **> P75** = tardó más de lo habitual — pre-alerta suave  \n"
                "- Un intervalo **> 2× mediana** = alerta fuerte (puede no haber comido por error u olvido del dueño)  \n\n"
                "**Filtro aplicado:** se excluyen intervalos < 20 min y > 36 h para evitar que los gaps "
                "de datos distorsionen la distribución.  \n\n"
                "Combinado con el ritmo circadiano (sección C), el sistema puede predecir tanto "
                "'cuándo' (intervalo) como 'a qué hora' (circadiano) — sin ML, solo estadística básica."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # G — TOP FEATURES DISCRIMINATIVAS (Motor Matemático v2)
        # ════════════════════════════════════════════════════════════════
        st.markdown("### G · Features más discriminativas del Motor Matemático v2")
        _kpg_col, _kpg_exp = st.columns([3, 2])

        with _kpg_col:
            if cs_dict:
                _kp_disc = []
                for _fn, _fst in cs_dict.items():
                    _a = _fst.get("alimentacion", {}) or {}
                    _s = _fst.get("servido",      {}) or {}
                    _mu_a = _a.get("mean"); _sd_a = _a.get("std")
                    _mu_s = _s.get("mean"); _sd_s = _s.get("std")
                    if None in (_mu_a, _mu_s, _sd_a, _sd_s):
                        continue
                    _pool = ((_sd_a**2 + _sd_s**2) / 2) ** 0.5
                    _sep  = abs(_mu_a - _mu_s) / _pool if _pool > 1e-6 else 0.0
                    _kp_disc.append({"feature": _fn, "sep_AS": round(_sep, 2)})

                _kp_df_disc = pd.DataFrame(_kp_disc).sort_values("sep_AS", ascending=False).head(15)
                _kp_df_disc_r = _kp_df_disc[::-1]

                _fig_g = go.Figure(go.Bar(
                    y=_kp_df_disc_r["feature"].tolist(),
                    x=_kp_df_disc_r["sep_AS"].tolist(),
                    orientation="h",
                    marker_color=[
                        "#00b45a" if v >= 5 else ("#fbbf24" if v >= 3 else "#60a5fa")
                        for v in _kp_df_disc_r["sep_AS"]
                    ],
                    opacity=0.85,
                    text=[f"{v:.2f}σ" for v in _kp_df_disc_r["sep_AS"]],
                    textposition="outside",
                    textfont=dict(color=_DARK["font_color"], size=10),
                ))
                _fig_g.add_vline(x=3.0, line_dash="dot", line_color="#ef4444",
                                 annotation_text="umbral 3σ", annotation_font_color="#ef4444")
                _fig_g.update_layout(
                    height=420,
                    xaxis=dict(title="Separación alim/serv (σ pooled)",
                               range=[0, _kp_df_disc_r["sep_AS"].max() * 1.22],
                               gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    yaxis=dict(tickfont=dict(color=_DARK["tick_color"], size=10)),
                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                    font=dict(color=_DARK["font_color"]),
                    margin=dict(l=170, r=70, t=20, b=40), showlegend=False,
                )
                st.plotly_chart(_fig_g, width="stretch")
                st.caption(
                    f"🟢 ≥5σ (excelente) · 🟡 3–5σ (bueno) · 🔵 <3σ (moderado)  |  "
                    f"Total features: {len(cs_dict)}  |  "
                    f"Basado en {cs_n_alim} alim / {cs_n_serv} serv / {cs_n_ruido} ruido"
                )
            else:
                st.warning("`comp_stats_v2.json` no encontrado. Presionar **🔄 Actualizar Todo**.")

        with _kpg_exp:
            st.info(
                "**¿Por qué esta gráfica es el corazón del sistema?**  \n"
                "Cada barra es una 'palanca matemática' del Evidence Engine. "
                "La métrica `sep_AS` (σ pooled) mide qué tan bien cada feature separa alimentación de servido:  \n\n"
                "- 🟢 **≥5σ** (Verde): feature excelente — `tpl_doble_rampa` (7.6σ), `tpl_sigmoide` (6.0σ)  \n"
                "  → Detectan si la curva bajó en doble rampa (alimentación) o subió en sigmoide (servido)  \n"
                "- 🟡 **3–5σ** (Amarillo): buena — `entropy_shannon` (4.3σ), `time_to_min_s` (3.6σ)  \n"
                "  → Capturan la entropía (qué tan 'caótica' es la señal) y la velocidad de bajada  \n"
                "- 🔵 **<3σ** (Azul): moderada — útil solo combinada con otras  \n\n"
                "**En el Evidence Engine:** features ≥5σ tienen peso ±5.0, "
                "las de 3–5σ tienen peso ±2–3, las <3σ tienen peso ±0.5–1.5. "
                "Este gráfico valida empíricamente qué features confiar y cuáles revisar."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # H — EVIDENCE ENGINE EN TIEMPO REAL
        # ════════════════════════════════════════════════════════════════
        st.markdown("### H · Evidence Engine — último estado en CSV (últimos 15 min de datos locales)")
        _kph_col, _kph_exp = st.columns([3, 2])

        with _kph_col:
            if df_lec is not None and _MOTOR_V2_OK:
                _ev15 = _evidence_ventana_cached(df_lec, 15)

                if _ev15 is not None:
                    _kp_ev = _ev15["ev"]
                    _kph_m1, _kph_m2, _kph_m3, _kph_m4 = st.columns(4)
                    _kph_m1.metric("Estado ahora",
                                   CATEGORIAS.get(_kp_ev["prediccion"], (_kp_ev["prediccion"],))[0])
                    _kph_m2.metric("Score Alim.",  f"{_kp_ev['score_alimentacion']:.1%}")
                    _kph_m3.metric("Score Serv.",  f"{_kp_ev['score_servido']:.1%}")
                    _kph_m4.metric("Confianza",    f"{_kp_ev['confianza']:.1%}")

                    _fig_h = go.Figure(go.Bar(
                        x=["🍽️ Alimentación", "🫙 Servido", "⚡ Ruido"],
                        y=[_kp_ev["score_alimentacion"], _kp_ev["score_servido"], _kp_ev["score_ruido"]],
                        marker_color=[
                            CATEGORIAS["alimentacion"][1],
                            CATEGORIAS["servido"][1],
                            CATEGORIAS["ruido"][1],
                        ],
                        opacity=0.85,
                        text=[f"{v:.1%}" for v in [
                            _kp_ev["score_alimentacion"],
                            _kp_ev["score_servido"],
                            _kp_ev["score_ruido"],
                        ]],
                        textposition="outside",
                    ))
                    _fig_h.add_hline(y=0.5, line_dash="dash", line_color="#6b7280",
                                     annotation_text="umbral 50%", annotation_font_color="#6b7280")
                    _fig_h.update_layout(
                        height=240,
                        yaxis=dict(range=[0, 1.18], title="Score", tickformat=".0%",
                                   gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                        xaxis=dict(tickfont=dict(color=_DARK["tick_color"])),
                        plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                        font=dict(color=_DARK["font_color"]),
                        margin=dict(l=50, r=20, t=20, b=40), showlegend=False,
                    )
                    st.plotly_chart(_fig_h, width="stretch")

                    st.caption(
                        f"Peso actual: **{_ev15['peso_now']:.1f} g**  |  "
                        f"Δ15 min: **{_ev15['delta_now']:+.1f} g**  |  "
                        f"Muestras: {_ev15['sub_len']}  |  "
                        f"Razón: {_kp_ev.get('razon', '—')}"
                    )

                    if _kp_ev["prediccion"] == "alimentacion" and _kp_ev["confianza"] > 0.65:
                        st.success("✅ Bandida está comiendo en este momento (alta confianza).")
                    elif _kp_ev["prediccion"] == "servido":
                        st.info("🫙 Se detecta servido de comida ahora.")
                    else:
                        st.caption("Sin actividad de alimentación detectada en la ventana actual.")
                else:
                    st.info("Sin lecturas recientes suficientes (< 3 muestras en últimos 15 min).")
            else:
                st.info("Motor v2 o lecturas no disponibles.")

        with _kph_exp:
            st.info(
                "**¿Por qué es el widget principal del home?**  \n"
                "El Evidence Engine clasifica la señal de los **últimos 15 min** usando las 102 features "
                "del Motor v2. Sin cámara, sin ML externo — 100 % matemática sobre el sensor de peso.  \n\n"
                "**Cómo interpretar los scores (3 barras):**  \n"
                "- **Alim. > 65 %** con confianza alta → Bandida está comiendo → notificación push al dueño  \n"
                "- **Serv. > 65 %** → alguien agregó comida al bowl → no notificar  \n"
                "- **Ruido > 65 %** → falso positivo (bowl movido) → el sistema lo suprime  \n"
                "- Los 3 scores < 50 % → señal ambigua → el sistema espera más datos  \n\n"
                "**Campo 'Razón':** la feature más influyente que determinó la predicción actual.  \n"
                "**Δ15 min negativo + Score Alim. alto** = señal clara de alimentación activa.  \n\n"
                "En producción, este widget se refresca con cada sync Supabase "
                "y es la única fuente de notificaciones en tiempo real."
            )
        st.divider()

        # ════════════════════════════════════════════════════════════════
        # I — CALIDAD DEL DATASET DE ANOTACIONES
        # ════════════════════════════════════════════════════════════════
        st.markdown("### I · Calidad del dataset — balance de clases")
        _kpi_col, _kpi_exp = st.columns([3, 2])

        with _kpi_col:
            _kp_n_alim  = len(_kp_alim)
            _kp_n_serv  = len(_kp_serv)
            _kp_n_ruid  = len(_kp_ruid)
            _kp_n_ciclo = len(_kp_ciclo)
            _kp_n_tot   = _kp_n_alim + _kp_n_serv + _kp_n_ruid + _kp_n_ciclo

            _kpi_m = st.columns(5)
            _kpi_m[0].metric("Total registros", _kp_n_tot)
            _kpi_m[1].metric("Alimentación", _kp_n_alim,
                             delta=f"{_kp_n_alim/_kp_n_tot:.0%}" if _kp_n_tot else None,
                             delta_color="off")
            _kpi_m[2].metric("Servido",      _kp_n_serv,
                             delta=f"{_kp_n_serv/_kp_n_tot:.0%}" if _kp_n_tot else None,
                             delta_color="off")
            _kpi_m[3].metric("Ruido",        _kp_n_ruid,
                             delta=f"{_kp_n_ruid/_kp_n_tot:.0%}" if _kp_n_tot else None,
                             delta_color="off")
            _kpi_m[4].metric("🟡 Ciclos S/A", _kp_n_ciclo,
                             delta=f"{_kp_n_ciclo/_kp_n_tot:.0%}" if _kp_n_tot else None,
                             delta_color="off")

            _fig_i = go.Figure(go.Pie(
                labels=["🍽️ Alimentación", "🫙 Servido", "⚡ Ruido", "🟡 Ciclo S/A"],
                values=[_kp_n_alim, _kp_n_serv, _kp_n_ruid, _kp_n_ciclo],
                hole=0.55,
                marker_colors=[
                    CATEGORIAS["alimentacion"][1],
                    CATEGORIAS["servido"][1],
                    CATEGORIAS["ruido"][1],
                    CATEGORIAS["ciclo_servido_alimento"][1],
                ],
                textfont=dict(color="#e5e7eb", size=12),
            ))
            _kp_rango_str = "—"
            if len(_kp_alim) > 0:
                _kp_t_min = _kp_alim["t_ini_s"].min()
                _kp_t_max = _kp_alim["t_ini_s"].max()
                _kp_rango_str = f"{_kp_t_min.strftime('%d-%b')} → {_kp_t_max.strftime('%d-%b-%Y')}"
            _fig_i.update_layout(
                height=260,
                paper_bgcolor=_DARK["paper_bgcolor"],
                font=dict(color=_DARK["font_color"]),
                margin=dict(l=20, r=20, t=20, b=20),
                showlegend=True,
                legend=dict(orientation="h", y=-0.05, font=dict(color=_DARK["font_color"])),
                annotations=[dict(
                    text=f"{_kp_n_tot}<br>total",
                    x=0.5, y=0.5, font_size=14, showarrow=False,
                    font=dict(color=_DARK["font_color"]),
                )],
            )
            st.plotly_chart(_fig_i, width="stretch")
            st.caption(f"Período cubierto: {_kp_rango_str}")

            # ── Histograma de duración de ciclos ────────────────────────
            if _kp_n_ciclo >= 2:
                st.divider()
                st.markdown("**Distribución de duración de Ciclos S/A**")
                _kp_dur_h_vals = (_kp_ciclo["t_fin"] - _kp_ciclo["t_inicio"]).dt.total_seconds() / 3600
                _kp_dur_med_h  = float(_kp_dur_h_vals.median())
                _fig_i2 = go.Figure(go.Histogram(
                    x=_kp_dur_h_vals, nbinsx=min(14, _kp_n_ciclo),
                    marker_color=CATEGORIAS["ciclo_servido_alimento"][1], opacity=0.85,
                ))
                _fig_i2.add_vline(x=_kp_dur_med_h, line_dash="dash", line_color="#e5e7eb",
                                  annotation_text=f"P50 {_kp_dur_med_h:.1f}h",
                                  annotation_font_color="#e5e7eb")
                _fig_i2.update_layout(
                    height=220,
                    xaxis=dict(title="Duración del ciclo (h)",
                               gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    yaxis=dict(title="N ciclos",
                               gridcolor=_DARK["grid_color"], tickfont=dict(color=_DARK["tick_color"])),
                    plot_bgcolor=_DARK["plot_bgcolor"], paper_bgcolor=_DARK["paper_bgcolor"],
                    font=dict(color=_DARK["font_color"]),
                    margin=dict(l=50, r=20, t=15, b=40), showlegend=False,
                )
                st.plotly_chart(_fig_i2, width="stretch")
                st.caption(
                    f"Mediana: **{_kp_dur_med_h:.1f} h**  ·  "
                    f"Rango: {float(_kp_dur_h_vals.min()):.1f}–{float(_kp_dur_h_vals.max()):.1f} h  ·  "
                    f"N = {_kp_n_ciclo} ciclos"
                )

        with _kpi_exp:
            _kp_meta_alim = METAS_AV2.get("alimentacion", 40)
            _kp_meta_serv = METAS_AV2.get("servido", 20)
            _kp_meta_ruid = METAS_AV2.get("ruido", 30)
            _kp_dur_ciclo_str = "—"
            if _kp_n_ciclo > 0:
                _kp_dur_h = (_kp_ciclo["t_fin"] - _kp_ciclo["t_inicio"]).dt.total_seconds() / 3600
                _kp_dur_ciclo_str = f"mediana {float(_kp_dur_h.median()):.1f} h · rango {float(_kp_dur_h.min()):.1f}–{float(_kp_dur_h.max()):.1f} h"
            st.info(
                "**¿Por qué el balance de clases importa?**  \n"
                "Un dataset desbalanceado (ej. 5:1 alimentación:servido) sesga el clasificador "
                "hacia la clase mayoritaria. El Evidence Engine funciona mejor cuando "
                "las distribuciones de µ/σ por categoría son estadísticamente robustas.  \n\n"
                f"**Metas Ciclo Alpha v2:**  \n"
                f"· Alimentación: {_kp_n_alim}/{_kp_meta_alim} ({'✅' if _kp_n_alim >= _kp_meta_alim else '🔄'})  \n"
                f"· Servido: {_kp_n_serv}/{_kp_meta_serv} ({'✅' if _kp_n_serv >= _kp_meta_serv else '🔄'})  \n"
                f"· Ruido: {_kp_n_ruid}/{_kp_meta_ruid} ({'✅' if _kp_n_ruid >= _kp_meta_ruid else '🔄'})  \n"
                f"· Ciclos S/A: {_kp_n_ciclo}/28 ({'✅' if _kp_n_ciclo >= 28 else '🔄'}) — {_kp_dur_ciclo_str}  \n\n"
                "Cuando las tres categorías de eventos alcancen sus metas, el sistema "
                "estará listo para Fase 1 (entrenamiento formal)."
            )

        st.divider()

        # ════════════════════════════════════════════════════════════════
        # J — NECESIDADES DE BANDIDA (estilo Sims)
        # ════════════════════════════════════════════════════════════════
        st.markdown("### J · Necesidades de Bandida 🎮")
        st.caption(
            "8 indicadores de bienestar calculados en tiempo real desde la señal IoT. "
            "Inspirado en el panel de necesidades de Los Sims — sin cámara, solo señal de peso."
        )

        # ── 1. Hambre: peso actual vs P95 histórico (estimado lleno) ────
        _j_cap    = 400.0
        if df_lec is not None and len(df_lec) > 0:
            _j_p95 = df_lec["peso_g"].quantile(0.95)
            if not pd.isna(_j_p95) and float(_j_p95) > 50:
                _j_cap = float(_j_p95)
        _j_hunger = min(100, max(0, round((_kp_peso_act / _j_cap) * 100))) if _kp_peso_act else 0
        _j_h_lbl  = "Saciada" if _j_hunger >= 70 else ("Tiene hambre" if _j_hunger >= 30 else "Hambrienta")
        _j_h_col  = "#16a34a" if _j_hunger >= 70 else ("#f59e0b" if _j_hunger >= 30 else "#ef4444")
        _j_h_hint = (f"{_kp_peso_act:.0f} g en plato · referencia lleno ≈ {_j_cap:.0f} g (P95 histórico)"
                     if _kp_peso_act else "Peso no disponible")

        # ── 2. Reloj biológico: elapsed vs P75 del intervalo normal ─────
        _j_elapsed = 0.0
        _j_p50int  = 8.0
        _j_p75int  = 12.0
        _j_clock   = 50
        if len(_kp_alim) >= 3:
            _j_last_t  = _kp_alim.sort_values("t_inicio").iloc[-1]["t_inicio"]
            _j_elapsed = (_NOW_UTC_KP - _j_last_t).total_seconds() / 3600
            _j_tslst   = _kp_alim.sort_values("t_inicio")["t_inicio"].tolist()
            _j_ivs     = [(_j_tslst[i+1]-_j_tslst[i]).total_seconds()/3600
                          for i in range(len(_j_tslst)-1)]
            _j_ivs     = [x for x in _j_ivs if 0.33 <= x <= 36]
            if _j_ivs:
                _j_p50int = float(np.median(_j_ivs))
                _j_p75int = float(np.percentile(_j_ivs, 75))
            _j_clock = max(0, min(100, round((1 - _j_elapsed / max(_j_p75int, 1)) * 100)))
        _j_ck_lbl  = "En tiempo ✓" if _j_clock >= 60 else ("Por comer" if _j_clock >= 30 else "¡Hora de comer!")
        _j_ck_col  = "#16a34a" if _j_clock >= 60 else ("#f59e0b" if _j_clock >= 30 else "#ef4444")
        _j_ck_hint = f"Hace {_j_elapsed:.1f} h · P50 intervalo normal = {_j_p50int:.1f} h"

        # ── 3. Rutina hoy: comidas en franjas mañana/tarde/noche ────────
        _j_frm = _j_frt = _j_frn = 0
        for _, _jr in (_kp_alim_hoy.iterrows() if len(_kp_alim_hoy) > 0 else iter([])):
            _jh = int(_jr.get("hora", 0))
            if 6 <= _jh < 12:    _j_frm += 1
            elif 12 <= _jh < 20: _j_frt += 1
            else:                 _j_frn += 1
        _j_nfr     = sum(1 for v in [_j_frm, _j_frt, _j_frn] if v > 0)
        _j_routine = min(100, _j_nfr * 28 + min(16, len(_kp_alim_hoy) * 8))
        _j_rt_lbl  = ("Perfecta" if _j_routine >= 80 else
                      ("Parcial" if _j_routine >= 40 else
                       ("Mínima" if _j_routine >= 15 else "Sin comidas")))
        _j_rt_col  = "#16a34a" if _j_routine >= 80 else ("#f59e0b" if _j_routine >= 40 else "#ef4444")
        _j_rt_hint = (f"{len(_kp_alim_hoy)} comidas hoy · {_j_nfr}/3 franjas · "
                      f"mañ:{_j_frm} tard:{_j_frt} noch:{_j_frn}")

        # ── 4. Apetito semanal: prom. 7d vs mediana global ──────────────
        _j_avg7  = 0.0
        _j_medg  = 1.0
        _j_appet = 50
        if len(_kp_alim) > 0:
            _j_7cut  = _kp_today - timedelta(days=7)
            _j_a7    = _kp_alim[_kp_alim["fecha"] >= _j_7cut]
            _j_f7    = _j_a7.groupby("fecha").size()
            _j_avg7  = float(_j_f7.mean()) if len(_j_f7) > 0 else 0.0
            _j_medg  = float(_kp_alim.groupby("fecha").size().median())
            _j_appet = min(100, max(0, round(_j_avg7 / max(_j_medg, 0.1) * 100)))
        _j_ap_lbl  = ("Excelente" if _j_appet >= 90 else
                      ("Normal" if _j_appet >= 70 else
                       ("Reducido" if _j_appet >= 40 else "Bajo")))
        _j_ap_col  = "#16a34a" if _j_appet >= 70 else ("#f59e0b" if _j_appet >= 40 else "#ef4444")
        _j_ap_hint = f"Últimos 7 días: {_j_avg7:.1f} comidas/día · mediana global: {_j_medg:.1f}/día"

        # ── 5. Poder discriminativo del Motor v2 (top sep A/S → 0–100%) ─
        _j_topsep  = 0.0
        _j_discrim = 0
        if cs_dict:
            _j_sps = []
            for _jfn, _jst in cs_dict.items():
                _ja = _jst.get("alimentacion", {}) or {}
                _js = _jst.get("servido",      {}) or {}
                _jma = _ja.get("mean"); _jsa = _ja.get("std")
                _jms = _js.get("mean"); _jss = _js.get("std")
                if None in (_jma, _jms, _jsa, _jss): continue
                _jp = ((_jsa**2 + _jss**2) / 2) ** 0.5
                _j_sps.append(abs(_jma - _jms) / _jp if _jp > 1e-6 else 0.0)
            if _j_sps:
                _j_topsep  = max(_j_sps)
                _j_discrim = min(100, round(_j_topsep / 10 * 100))
        _j_dm_lbl  = "Muy alto" if _j_discrim >= 70 else ("Bueno" if _j_discrim >= 45 else "Moderado")
        _j_dm_col  = "#16a34a" if _j_discrim >= 70 else ("#f59e0b" if _j_discrim >= 45 else "#ef4444")
        _j_dm_hint = (f"Top sep A/S: {_j_topsep:.2f}σ · {len(cs_dict)} features activas"
                      if cs_dict else "Sin comp_stats — ejecutar Actualizar Todo")

        # ── 6. Frescura del dato: minutos desde última lectura ───────────
        _j_freshm = 9999.0
        _j_fresh  = 0
        if _kp_ts_act:
            _j_freshm = (_NOW_STGO_KP - _kp_ts_act).total_seconds() / 60
            _j_fresh  = max(0, min(100, round((1 - _j_freshm / 60) * 100)))
        _j_fl_lbl = ("En vivo" if _j_freshm < 5 else
                     ("Reciente" if _j_freshm < 30 else
                      ("Retrasado" if _j_freshm < 120 else "Sin señal")))
        _j_fl_col = "#16a34a" if _j_freshm < 5 else ("#f59e0b" if _j_freshm < 30 else "#ef4444")
        _j_fl_hint = (f"Hace {_j_freshm:.0f} min · "
                      f"{_kp_ts_act.strftime('%d-%b %H:%M') if _kp_ts_act else 'N/D'}")

        # ── 7. Semana activa: días con comidas en últimos 7 días ─────────
        _j_diasact = 0
        _j_week    = 0
        if len(_kp_alim) > 0:
            _j_fset   = set(_kp_alim["fecha"].tolist())
            _j_7dias  = [(_NOW_STGO_KP - timedelta(days=i)).date() for i in range(7)]
            _j_diasact = sum(1 for d in _j_7dias if d in _j_fset)
            _j_week    = round(_j_diasact / 7 * 100)
        _j_wk_lbl  = "Activa" if _j_week >= 85 else ("Parcial" if _j_week >= 57 else "Irregular")
        _j_wk_col  = "#16a34a" if _j_week >= 85 else ("#f59e0b" if _j_week >= 57 else "#ef4444")
        _j_wk_hint = f"{_j_diasact}/7 días con comidas detectadas esta semana"

        # ── 8. Tendencia de apetito: pendiente lineal 14 días ───────────
        _j_slope = 0.0
        _j_trend = 50
        if len(_kp_alim) >= 5:
            _j_f14 = (_kp_alim.groupby("fecha").size()
                      .reset_index(name="n")
                      .sort_values("fecha")
                      .tail(14))
            if len(_j_f14) >= 4:
                _j_x14   = np.arange(len(_j_f14), dtype=float)
                _j_slope = float(np.polyfit(_j_x14, _j_f14["n"].values, 1)[0])
                _j_trend = min(100, max(0, round(50 + _j_slope * 30)))
        _j_tr_lbl  = ("Creciendo ↑" if _j_slope > 0.05 else
                      ("Estable →" if abs(_j_slope) <= 0.05 else "Bajando ↓"))
        _j_tr_col  = "#16a34a" if _j_slope > 0.05 else ("#f59e0b" if abs(_j_slope) <= 0.05 else "#ef4444")
        _j_tr_hint = f"Pendiente 14 días: {_j_slope:+.3f} comidas/día · base: {_j_medg:.1f}/día"

        # ── Score general ponderado ──────────────────────────────────────
        _j_score = round(
            _j_hunger  * 0.25 +
            _j_clock   * 0.20 +
            _j_routine * 0.15 +
            _j_appet   * 0.15 +
            _j_week    * 0.10 +
            _j_discrim * 0.05 +
            _j_fresh   * 0.05 +
            _j_trend   * 0.05
        )
        if _j_freshm > 120:
            _j_mood, _j_mc = "📡 Sensor offline", "#6b7280"
        elif _j_score >= 75:
            _j_mood, _j_mc = "😸 Muy bien", "#16a34a"
        elif _j_score >= 50:
            _j_mood, _j_mc = "😺 Bien", "#22c55e"
        elif _j_score >= 30:
            _j_mood, _j_mc = "😿 Atención", "#f59e0b"
        else:
            _j_mood, _j_mc = "🚨 Necesita ayuda", "#ef4444"

        # ── Primera alerta activa ────────────────────────────────────────
        _j_alert = next((msg for msg, cond in [
            (f"🍽️ Plato casi vacío ({_kp_peso_act:.0f} g). Rellenar pronto.",
             bool(_kp_peso_act) and _j_hunger < 25),
            (f"⏱️ Lleva {_j_elapsed:.1f} h sin comer — superó P75 habitual ({_j_p75int:.1f} h).",
             _j_clock < 15 and len(_kp_alim) >= 3),
            (f"📡 Sin lecturas hace {_j_freshm:.0f} min. Verifica conexión del sensor.",
             _j_freshm > 120),
        ] if cond), None)

        # ── Helper HTML de cada barra ────────────────────────────────────
        def _j_bar(icon, label, pct, lbl, bar_color, lbl_color, hint):
            _p = max(3, min(100, int(pct)))
            return (
                f'<div style="min-width:0;">'
                f'<div style="display:flex;justify-content:space-between;'
                f'align-items:baseline;margin-bottom:5px;">'
                f'<span style="color:#e5e7eb;font-size:13px;font-weight:600;">'
                f'{icon} {label}</span>'
                f'<span style="color:{lbl_color};font-size:11px;font-weight:700;'
                f'white-space:nowrap;margin-left:6px;">{lbl}</span></div>'
                f'<div style="background:#374151;border-radius:999px;height:10px;'
                f'overflow:hidden;border:1px solid #4b5563;">'
                f'<div style="width:{_p}%;height:100%;background:{bar_color};'
                f'border-radius:999px;transition:width 0.7s ease;"></div></div>'
                f'<div style="color:#6b7280;font-size:10.5px;margin-top:4px;'
                f'line-height:1.3;">{hint}</div></div>'
            )

        _j_alert_html = (
            f'<div style="margin-top:18px;background:#7f1d1d33;border:1px solid #ef4444;'
            f'border-radius:10px;padding:10px 14px;">'
            f'<span style="color:#fca5a5;font-size:12.5px;">⚠️ {_j_alert}</span></div>'
        ) if _j_alert else ""

        _j_ts_str = _kp_ts_act.strftime("%d-%b %H:%M") if _kp_ts_act else "N/D"
        _j_html = (
            '<div style="background:#111827;border:1px solid #374151;'
            'border-radius:18px;padding:22px 24px;margin-top:8px;">'
            '<div style="display:flex;justify-content:space-between;'
            'align-items:center;margin-bottom:5px;">'
            '<span style="color:#f9fafb;font-size:16px;font-weight:700;">'
            '🐱 Necesidades de Bandida</span>'
            f'<span style="background:{_j_mc}22;color:{_j_mc};'
            f'border:1px solid {_j_mc}55;border-radius:20px;padding:4px 14px;'
            f'font-size:13px;font-weight:700;">{_j_mood}</span></div>'
            f'<div style="color:#6b7280;font-size:11px;margin-bottom:18px;">'
            f'Score general: <b style="color:#d1d5db;">{_j_score}%</b> &nbsp;·&nbsp; '
            f'Última lectura: <b style="color:#d1d5db;">{_j_ts_str}</b> &nbsp;·&nbsp; '
            f'{len(df_anot)} anotaciones · Motor v2</div>'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 32px;">'
            + _j_bar("🍽️", "Hambre",              _j_hunger,  _j_h_lbl,  "#D4537E", _j_h_col,  _j_h_hint)
            + _j_bar("⏱️", "Reloj biológico",     _j_clock,   _j_ck_lbl, "#a78bfa", _j_ck_col, _j_ck_hint)
            + _j_bar("📅", "Rutina hoy",           _j_routine, _j_rt_lbl, "#7F77DD", _j_rt_col, _j_rt_hint)
            + _j_bar("📊", "Apetito semanal",      _j_appet,   _j_ap_lbl, "#1D9E75", _j_ap_col, _j_ap_hint)
            + _j_bar("🧮", "Motor discriminativo", _j_discrim, _j_dm_lbl, "#f97316", _j_dm_col, _j_dm_hint)
            + _j_bar("📡", "Frescura del dato",    _j_fresh,   _j_fl_lbl, "#60a5fa", _j_fl_col, _j_fl_hint)
            + _j_bar("📆", "Semana activa",        _j_week,    _j_wk_lbl, "#fbbf24", _j_wk_col, _j_wk_hint)
            + _j_bar("📈", "Tendencia de apetito", _j_trend,   _j_tr_lbl, "#34d399", _j_tr_col, _j_tr_hint)
            + '</div>'
            + _j_alert_html
            + '</div>'
        )
        st.markdown(_j_html, unsafe_allow_html=True)
        _pb8.progress(100, "✅")
        _pb8.empty()
        st.caption(
            "🟢 bien · 🟡 atención · 🔴 alerta  |  "
            "Hambre 25% · Reloj 20% · Rutina 15% · Apetito 15% · Semana 10% · Motor/Frescura/Tendencia 15%"
        )


if __name__ == "__main__":
    main()
