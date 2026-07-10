"""Script 03 - Extraer lecturas de public.readings.

Modo primario : CSV dump (Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/).
Fallback      : Supabase API + Postgres directo (si el CSV no esta disponible).

Salida: fase_1_extraccion/data/raw/readings_raw.parquet
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd

DEVICE_CODE = "KPCL0034"
FECHA_INICIO = pd.Timestamp("2026-04-08T00:00:00+00:00")
# Exp 08: extendido a Jun 15 para incluir datos Mayo-Jun 2026 (etiquetados retroactivamente)
FECHA_FIN   = pd.Timestamp("2026-06-15T00:00:00+00:00")
PAGE_SIZE = 1000

# Path al dump CSV de Abril — 4 niveles arriba del script, luego Data_2026/...
CSV_DUMP_DIR = (
    Path(__file__).parent.parent.parent.parent
    / "Data_2026"
    / "Abril_2026"
    / "kittypau_full_07-05-2026_csv"
)

# Path al CSV de lecturas Mayo-Jun 2026 (Exp 07)
CSV_MAYO_JUNIO_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "Data_2026"
    / "Mayo_2026"
    / "readings_rows.csv"
)
# UUID de KPCL0034 en el dump de Mayo-Jun (distinto al de Abril por cambio de sistema)
KPCL0034_MJ_UUID = "3a460074-e7c3-41bf-ae5a-a011445f927a"


def _fix_clock_invalid(series: pd.Series) -> pd.Series:
    """Convierte la columna clock_invalid de PostgreSQL (t/f/True/False) a bool."""
    return (
        series.astype(str)
        .str.strip()
        .str.lower()
        .map({"t": True, "true": True, "1": True, "f": False, "false": False, "0": False})
        .fillna(False)
        .astype(bool)
    )


def load_from_csv() -> list[dict]:
    print(f"[CSV] Modo CSV activo. Leyendo desde:\n      {CSV_DUMP_DIR}")

    devices = pd.read_csv(CSV_DUMP_DIR / "devices.csv", encoding="latin1")
    # En devices.csv: columna 'device_id' = codigo legible (KPCL0034)
    #                 columna 'id'        = UUID interno
    mask = devices["device_id"] == DEVICE_CODE
    if not mask.any():
        raise SystemExit(f"[ERROR CSV] '{DEVICE_CODE}' no encontrado en devices.csv")
    device_uuid = str(devices.loc[mask, "id"].iloc[0])
    print(f"[CSV] UUID de {DEVICE_CODE}: {device_uuid}")

    print("[CSV] Cargando readings.csv (~242 MB), filtrando solo KPCL0034...")
    df = pd.read_csv(
        CSV_DUMP_DIR / "readings.csv",
        encoding="latin1",
        usecols=[
            "device_id", "recorded_at", "ingested_at",
            "weight_grams", "temperature", "humidity",
            "battery_level", "clock_invalid",
        ],
        dtype={"device_id": str, "clock_invalid": str},
        low_memory=False,
    )
    df = df[df["device_id"] == device_uuid].drop(columns=["device_id"]).copy()
    print(f"[CSV] Filas de {DEVICE_CODE}: {len(df):,}")
    return df.to_dict(orient="records")


def build_dataframe(all_rows: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(all_rows)
    if df.empty:
        raise SystemExit("[ERROR] No se extrajeron filas de readings")

    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, format="mixed", errors="coerce")
    df["ingested_at"] = pd.to_datetime(df["ingested_at"], utc=True, format="mixed", errors="coerce")

    bad_rows = df["recorded_at"].isna() | df["ingested_at"].isna()
    if bad_rows.any():
        print(f"[AVISO] Se descartaran {bad_rows.sum()} filas con timestamps invalidos")
        df = df[~bad_rows].copy()

    df["clock_invalid"] = _fix_clock_invalid(df["clock_invalid"])
    df["ts"] = np.where(df["clock_invalid"], df["ingested_at"], df["recorded_at"])
    df["ts"] = pd.to_datetime(df["ts"], utc=True, format="mixed", errors="coerce")
    df = df[df["ts"].notna()].copy()

    # Filtrar por rango de fechas
    df = df[(df["ts"] >= FECHA_INICIO) & (df["ts"] < FECHA_FIN)].copy()
    print(f"[INFO] Filas {FECHA_INICIO.date()} -> {FECHA_FIN.date()}: {len(df):,}")

    before = len(df)
    df = df.sort_values(["ts", "weight_grams"], ascending=[True, False])
    df = df.drop_duplicates(subset=["ts"], keep="first")
    df = df.sort_values("ts").reset_index(drop=True)
    print(f"[INFO] Duplicados eliminados: {before - len(df)} (quedan {len(df):,})")

    return df


def load_from_csv_mayo_junio() -> list[dict]:
    """Carga lecturas de Mayo-Jun 2026 desde readings_rows.csv (Exp 07).

    En este CSV clock_invalid es 100% True -> se usa ingested_at como timestamp.
    El UUID de KPCL0034 es diferente al del dump de Abril.
    """
    if not CSV_MAYO_JUNIO_PATH.exists():
        print(f"[INFO] readings_rows.csv no encontrado en {CSV_MAYO_JUNIO_PATH} — omitiendo Mayo-Jun.")
        return []

    print(f"[CSV-MJ] Leyendo: {CSV_MAYO_JUNIO_PATH.name} …")
    try:
        df = pd.read_csv(
            CSV_MAYO_JUNIO_PATH,
            encoding="utf-8",
            usecols=["device_id", "ingested_at", "weight_grams", "clock_invalid"],
            dtype={"device_id": str, "clock_invalid": str},
            low_memory=False,
        )
    except UnicodeDecodeError:
        df = pd.read_csv(
            CSV_MAYO_JUNIO_PATH,
            encoding="latin1",
            usecols=["device_id", "ingested_at", "weight_grams", "clock_invalid"],
            dtype={"device_id": str, "clock_invalid": str},
            low_memory=False,
        )

    df = df[df["device_id"] == KPCL0034_MJ_UUID].drop(columns=["device_id"]).copy()
    print(f"[CSV-MJ] KPCL0034 (UUID {KPCL0034_MJ_UUID[:8]}…): {len(df):,} filas")

    # En Mayo-Jun clock_invalid es 100% True -> normalizar para build_dataframe()
    # recorded_at no existe en este CSV, lo ponemos igual a ingested_at
    df["recorded_at"] = df["ingested_at"]
    df["temperature"] = None
    df["humidity"]    = None
    df["battery_level"] = None

    return df.to_dict(orient="records")


def load_from_supabase() -> list[dict]:
    from _supabase_helpers import connect_first_available, get_supabase_client, resolve_device_record

    device = resolve_device_record(DEVICE_CODE)
    if not device:
        raise SystemExit(f"[ERROR] No se encontro '{DEVICE_CODE}' en public.devices")
    device_uuid = device["id"]
    print(f"[SUPABASE] Extrayendo readings para UUID: {device_uuid}")

    all_rows: list[dict] = []
    offset = 0
    page = 1

    try:
        supabase = get_supabase_client()
        fecha_str = FECHA_INICIO.isoformat()
        while True:
            res = (
                supabase.table("readings")
                .select("recorded_at,ingested_at,weight_grams,temperature,humidity,battery_level,clock_invalid")
                .eq("device_id", device_uuid)
                .gte("recorded_at", fecha_str)
                .order("recorded_at", desc=False)
                .range(offset, offset + PAGE_SIZE - 1)
                .execute()
            )
            batch = res.data or []
            if not batch:
                break
            all_rows.extend(batch)
            print(f"  Pagina {page}: {len(batch)} filas (total: {len(all_rows)})")
            if len(batch) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
            page += 1
    except Exception as exc:
        print(f"[AVISO] Supabase no disponible para readings: {exc}")
        all_rows.clear()
        offset = 0
        page = 1
        db_urls = [os.getenv("SUPABASE_DB_POOLER_URL"), os.getenv("SUPABASE_DB_URL")]
        if not any(db_urls):
            raise SystemExit("[ERROR] No hay SUPABASE_DB_URL ni CSV disponible")
        import psycopg2
        import psycopg2.extras
        with connect_first_available(db_urls) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                while True:
                    cur.execute(
                        """
                        select recorded_at, ingested_at, weight_grams, temperature,
                               humidity, battery_level, clock_invalid
                        from public.readings
                        where device_id = %s and recorded_at >= %s
                        order by recorded_at
                        limit %s offset %s
                        """,
                        (device_uuid, FECHA_INICIO.isoformat(), PAGE_SIZE, offset),
                    )
                    batch = cur.fetchall()
                    if not batch:
                        break
                    all_rows.extend([dict(r) for r in batch])
                    print(f"  Pagina {page}: {len(batch)} filas (total: {len(all_rows)})")
                    if len(batch) < PAGE_SIZE:
                        break
                    offset += PAGE_SIZE
                    page += 1

    print(f"[SUPABASE] Total filas: {len(all_rows)}")
    return all_rows


def main() -> None:
    if CSV_DUMP_DIR.exists():
        all_rows = load_from_csv()
    else:
        print(f"[INFO] CSV dump no encontrado en {CSV_DUMP_DIR}")
        print("[INFO] Usando Supabase como fuente de datos")
        all_rows = load_from_supabase()

    # Exp 08: agregar lecturas Mayo-Jun 2026 si el CSV existe
    mj_rows = load_from_csv_mayo_junio()
    if mj_rows:
        all_rows = list(all_rows) + mj_rows
        print(f"[INFO] Total filas combinadas (Abril + Mayo-Jun): {len(all_rows):,}")

    df = build_dataframe(all_rows)

    out_path = Path(__file__).parent.parent / "data" / "raw" / "readings_raw.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")
    print(f"     Total: {len(df):,} filas")
    print(f"     Rango: {df['ts'].min()} -> {df['ts'].max()}")
    print(f"     Columnas: {list(df.columns)}")


if __name__ == "__main__":
    main()
