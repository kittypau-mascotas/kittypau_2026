"""
supabase_client.py — Integración Supabase / PostgreSQL para app_anotacion_av2.

Dos modos de conexión:
  1. PostgreSQL directo (psycopg2)  — sync incremental y lecturas en vivo
  2. REST API (supabase-py)          — fallback si falla psycopg2

Tabla en Supabase: `readings`  (misma para abril y mayo-junio, filtrado por device_id)

Arquitectura de datos local:
  READINGS_CSV → estático abril 2026, NUNCA modificar
  ROWS_CSV     → dinámico, se appendea con sync incremental desde Supabase
"""
from __future__ import annotations

import os
from pathlib import Path
from enum import Enum

import pandas as pd

# ── Rutas ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
_ROOT        = SCRIPT_DIR.parent.parent.parent.parent   # kittypau_2026_hivemq/
_ENV_FILE    = _ROOT / ".env.local"
DATA_DIR     = _ROOT / "Docs" / "11_Data" / "2026"
READINGS_CSV = DATA_DIR / "readings.csv"       # ESTÁTICO — nunca tocar
ROWS_CSV     = DATA_DIR / "readings_rows.csv"  # dinámico — solo append

KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # Mayo-Junio 2026
]

_PAGE = 1000   # filas por página en paginación REST

# Columnas exactas de la tabla readings — orden idéntico al CSV local
# (no SELECT *, pero sí todas las columnas del esquema actual)
_COLS_SYNC_LIST = [
    "id", "device_id", "pet_id", "weight_grams", "water_ml", "flow_rate",
    "temperature", "humidity", "battery_level", "recorded_at", "ingested_at",
    "clock_invalid", "battery_voltage", "battery_state", "battery_source",
    "battery_is_estimated", "light_percent", "light_lux", "light_condition",
    "battery_updated_at",
]
_COLS_SYNC = ",".join(_COLS_SYNC_LIST)


# ── Estado de conexión ─────────────────────────────────────────────────────────
class ConexionEstado(Enum):
    EN_VIVO  = "live"    # 🟢 conectado y respondiendo
    ERROR    = "error"   # 🔴 error de conexión
    OFFLINE  = "offline" # ⚫ sin intento / modo CSV local


def dot_html(estado: ConexionEstado, tooltip: str = "") -> str:
    """Span HTML con círculo de color para indicador de estado en la UI."""
    colores = {
        ConexionEstado.EN_VIVO:  "#22c55e",
        ConexionEstado.ERROR:    "#ef4444",
        ConexionEstado.OFFLINE:  "#6b7280",
    }
    color = colores[estado]
    title = f' title="{tooltip}"' if tooltip else ""
    return (
        f'<span{title} style="display:inline-block;width:10px;height:10px;'
        f'border-radius:50%;background:{color};margin-left:6px;'
        f'vertical-align:middle;"></span>'
    )


# ── Variables de entorno (para REST API) ───────────────────────────────────────
def _load_env() -> None:
    if _ENV_FILE.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(_ENV_FILE, override=False)
        except ImportError:
            pass


def _get_rest_creds() -> tuple[str, str]:
    _load_env()
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", "")).strip()
    if not url or not key:
        raise EnvironmentError(
            f"SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no encontrados en {_ENV_FILE}"
        )
    return url, key


def _get_rest_client():
    from supabase import create_client
    url, key = _get_rest_creds()
    return create_client(url, key)


# ── Conexión PostgreSQL directa (Session pooler Supabase) ─────────────────────
def _get_pg_dsn() -> str:
    """Lee el connection string desde DATABASE_URL — nunca hardcodear credenciales."""
    _load_env()
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn or "[TU-PASSWORD]" in dsn:
        raise EnvironmentError(
            f"DATABASE_URL no configurado (o placeholder sin rellenar) en {_ENV_FILE}"
        )
    return dsn


def _pg_connect():
    """Abre una conexión psycopg2 al Session pooler de Supabase."""
    import psycopg2
    return psycopg2.connect(_get_pg_dsn(), connect_timeout=10, sslmode="require")


# ── Timestamp de corte (lee solo las columnas mínimas del CSV) ─────────────────
def get_max_ingested_at() -> pd.Timestamp | None:
    """
    Lee device_id + ingested_at de ambos CSVs locales y devuelve el max de KPCL0034.
    No carga el dataset completo en memoria.
    """
    max_ts: pd.Timestamp | None = None
    for csv_path in [READINGS_CSV, ROWS_CSV]:
        if not csv_path.exists():
            continue
        df = pd.read_csv(csv_path, usecols=["device_id", "ingested_at"], low_memory=False)
        sub = df[df["device_id"].isin(KPCL0034_UUIDS)]
        if sub.empty:
            continue
        ts = pd.to_datetime(sub["ingested_at"], format="ISO8601", utc=True)
        local_max = ts.max()
        if max_ts is None or local_max > max_ts:
            max_ts = local_max
    return max_ts


# ── Lecturas en vivo (últimas N minutos, solo columnas necesarias) ─────────────
def get_live_lecturas(minutes: int = 120) -> tuple[pd.DataFrame, ConexionEstado, str]:
    """
    Trae las últimas `minutes` minutos de lecturas de KPCL0034 directamente
    desde Supabase. Solo pide ingested_at y weight_grams.

    Returns:
        (df, estado, mensaje)
        df     — DataFrame con columnas [ts, peso_g] o vacío si falla
        estado — ConexionEstado.EN_VIVO / ERROR
        mensaje — descripción para mostrar al usuario
    """
    since_iso = (pd.Timestamp.now(tz="UTC") - pd.Timedelta(minutes=minutes)).isoformat()
    uuids_ph  = tuple(KPCL0034_UUIDS)   # para %s placeholder psycopg2

    # Intento 1: PostgreSQL directo
    try:
        conn = _pg_connect()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT ingested_at AS ts, weight_grams AS peso_g
            FROM readings
            WHERE device_id = ANY(%s::uuid[])
              AND ingested_at > %s
            ORDER BY ingested_at
            """,
            (list(KPCL0034_UUIDS), since_iso),
        )
        rows = cur.fetchall()
        conn.close()
        if rows:
            df = pd.DataFrame(rows, columns=["ts", "peso_g"])
            df["ts"]     = pd.to_datetime(df["ts"], utc=True)
            df["peso_g"] = pd.to_numeric(df["peso_g"], errors="coerce")
            df = df.dropna(subset=["peso_g"])
        else:
            df = pd.DataFrame(columns=["ts", "peso_g"])
        return df, ConexionEstado.EN_VIVO, f"PostgreSQL · últimos {minutes} min · {len(df)} filas"
    except Exception:
        pass

    # Intento 2: REST API (supabase-py)
    try:
        client = _get_rest_client()
        resp = (
            client.table("readings")
            .select("ingested_at,weight_grams")
            .in_("device_id", KPCL0034_UUIDS)
            .gt("ingested_at", since_iso)
            .order("ingested_at")
            .execute()
        )
        rows_data = resp.data or []
        if rows_data:
            df = pd.DataFrame(rows_data).rename(
                columns={"ingested_at": "ts", "weight_grams": "peso_g"}
            )
            df["ts"]     = pd.to_datetime(df["ts"], utc=True)
            df["peso_g"] = pd.to_numeric(df["peso_g"], errors="coerce")
            df = df[["ts", "peso_g"]].dropna(subset=["peso_g"])
        else:
            df = pd.DataFrame(columns=["ts", "peso_g"])
        return df, ConexionEstado.EN_VIVO, f"REST API · últimos {minutes} min · {len(df)} filas"
    except Exception as e_rest:
        return (
            pd.DataFrame(columns=["ts", "peso_g"]),
            ConexionEstado.ERROR,
            f"Sin conexión: {type(e_rest).__name__}",
        )


# ── Sync incremental ───────────────────────────────────────────────────────────
def _sync_via_pg(since_iso: str, progress_cb=None) -> pd.DataFrame:
    """
    Descarga filas nuevas de `readings` en Supabase usando PostgreSQL directo.
    Solo selecciona columnas en _COLS_SYNC_LIST. Pagina en bloques de _PAGE.
    """
    cols_sql = ", ".join(_COLS_SYNC_LIST)
    all_rows: list[tuple] = []
    offset = 0

    conn = _pg_connect()
    try:
        cur = conn.cursor()
        while True:
            if progress_cb:
                progress_cb(f"  readings: filas {offset}–{offset + _PAGE - 1}…")
            cur.execute(
                f"""
                SELECT {cols_sql}
                FROM readings
                WHERE device_id = ANY(%s::uuid[])
                  AND ingested_at > %s
                ORDER BY ingested_at
                LIMIT %s OFFSET %s
                """,
                (list(KPCL0034_UUIDS), since_iso, _PAGE, offset),   # uuid cast en SQL
            )
            batch = cur.fetchall()
            all_rows.extend(batch)
            if len(batch) < _PAGE:
                break
            offset += _PAGE
    finally:
        conn.close()

    if not all_rows:
        return pd.DataFrame(columns=_COLS_SYNC_LIST)
    return pd.DataFrame(all_rows, columns=_COLS_SYNC_LIST)


def _sync_via_rest(since_iso: str, progress_cb=None) -> pd.DataFrame:
    """Fallback: descarga usando REST API si PostgreSQL no está disponible."""
    client = _get_rest_client()
    rows: list[dict] = []
    offset = 0
    while True:
        if progress_cb:
            progress_cb(f"  readings (REST): filas {offset}–{offset + _PAGE - 1}…")
        resp = (
            client.table("readings")
            .select(_COLS_SYNC)
            .in_("device_id", KPCL0034_UUIDS)
            .gt("ingested_at", since_iso)
            .order("ingested_at")
            .range(offset, offset + _PAGE - 1)
            .execute()
        )
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < _PAGE:
            break
        offset += _PAGE
    return pd.DataFrame(rows) if rows else pd.DataFrame(columns=_COLS_SYNC_LIST)


def _ensure_trailing_newline(csv_path: Path) -> None:
    """Agrega \\r\\n al final del CSV si no termina en newline (evita corrupción en append)."""
    with open(csv_path, "rb+") as f:
        f.seek(-1, 2)
        last = f.read(1)
        if last not in (b"\n", b"\r"):
            f.write(b"\r\n")


def _append_to_csv(df_new: pd.DataFrame, csv_path: Path) -> None:
    """Appendea df_new al CSV local respetando columnas existentes."""
    if csv_path.exists():
        _ensure_trailing_newline(csv_path)
        existing_cols = pd.read_csv(csv_path, nrows=0).columns.tolist()
        cols = [c for c in existing_cols if c in df_new.columns]
        df_new[cols].to_csv(csv_path, mode="a", header=False, index=False)
    else:
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        df_new.to_csv(csv_path, index=False)


def sync_readings_incremental(progress_cb=None) -> dict:
    """
    Descarga solo filas nuevas desde Supabase (ingested_at > max local)
    y appendea a ROWS_CSV. READINGS_CSV nunca se toca.

    Primero intenta PostgreSQL directo; si falla, usa REST API.

    Returns dict con claves:
        since_iso, new_rows, new_max_ts, metodo ("pg" | "rest")
    """
    max_ts    = get_max_ingested_at()
    since_iso = max_ts.isoformat() if max_ts else (
        pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=90)
    ).isoformat()

    if progress_cb:
        progress_cb(f"Corte local: {since_iso[:19]} UTC")

    result: dict = {"since_iso": since_iso, "readings_rows": 0, "readings": 0}

    # Intentar PostgreSQL directo primero
    df_new = pd.DataFrame()
    metodo = "pg"
    try:
        df_new = _sync_via_pg(since_iso, progress_cb)
    except Exception as e_pg:
        if progress_cb:
            progress_cb(f"  PostgreSQL falló ({e_pg}) — intentando REST API…")
        try:
            df_new = _sync_via_rest(since_iso, progress_cb)
            metodo = "rest"
        except Exception as e_rest:
            result["error"] = str(e_rest)
            result["metodo"] = "error"
            return result

    n_new = len(df_new)
    result["readings_rows"] = n_new
    result["metodo"] = metodo

    if n_new > 0:
        _append_to_csv(df_new, ROWS_CSV)
        if progress_cb:
            progress_cb(f"  +{n_new} filas appendeadas a {ROWS_CSV.name}")

    new_max = get_max_ingested_at()
    result["new_max_ts"] = new_max.isoformat() if new_max else since_iso
    return result
