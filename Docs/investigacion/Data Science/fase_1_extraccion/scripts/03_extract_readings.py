"""Script 03 - Extraer lecturas de public.readings.
Salida: fase_1_extraccion/data/raw/readings_raw.parquet.
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd

from _supabase_helpers import connect_first_available, get_supabase_client, resolve_device_record

FECHA_INICIO = "2026-04-08T00:00:00+00:00"
PAGE_SIZE = 1000


def main() -> None:
    device = resolve_device_record("KPCL0034")
    if not device:
        print("[ERROR] No se encontro 'KPCL0034' en public.devices")
        raise SystemExit(1)
    device_uuid = device["id"]

    print(f"Extrayendo readings para UUID: {device_uuid}")

    all_rows: list[dict] = []
    offset = 0
    page = 1

    try:
        supabase = get_supabase_client()
        while True:
            res = (
                supabase.table("readings")
                .select("recorded_at,ingested_at,weight_grams,temperature,humidity,battery_level,clock_invalid")
                .eq("device_id", device_uuid)
                .gte("recorded_at", FECHA_INICIO)
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
        print(f"[AVISO] Cliente Supabase no disponible para readings: {exc}")
        all_rows.clear()
        offset = 0
        page = 1
        db_urls = [
            os.getenv("SUPABASE_DB_POOLER_URL"),
            os.getenv("SUPABASE_DB_URL"),
        ]
        if not any(db_urls):
            print("[ERROR] No se encontro SUPABASE_DB_URL ni SUPABASE_DB_POOLER_URL")
            raise SystemExit(1)
        print("[INFO] Reiniciando extraccion desde cero usando fallback directo a Postgres")

        try:
            import psycopg2
            import psycopg2.extras
        except Exception:  # pragma: no cover
            print("[ERROR] No hay cliente Supabase ni psycopg2 disponible para el fallback")
            raise SystemExit(1)
        with connect_first_available(db_urls) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                while True:
                    cur.execute(
                        """
                        select recorded_at, ingested_at, weight_grams, temperature, humidity, battery_level, clock_invalid
                        from public.readings
                        where device_id = %s
                          and recorded_at >= %s
                        order by recorded_at
                        limit %s offset %s
                        """,
                        (device_uuid, FECHA_INICIO, PAGE_SIZE, offset),
                    )
                    batch = cur.fetchall()
                    if not batch:
                        break
                    batch = [dict(row) for row in batch]
                    all_rows.extend(batch)
                    print(f"  Pagina {page}: {len(batch)} filas (total: {len(all_rows)})")
                    if len(batch) < PAGE_SIZE:
                        break
                    offset += PAGE_SIZE
                    page += 1

    print(f"Total filas extraidas: {len(all_rows)}")

    df = pd.DataFrame(all_rows)
    if df.empty:
        print("[ERROR] No se extrajeron filas de readings")
        raise SystemExit(1)

    # El export de Supabase mezcla timestamps con y sin microsegundos.
    # format="mixed" evita que Pandas falle al encontrar ambos formatos.
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, format="mixed", errors="coerce")
    df["ingested_at"] = pd.to_datetime(df["ingested_at"], utc=True, format="mixed", errors="coerce")
    bad_rows = df["recorded_at"].isna() | df["ingested_at"].isna()
    if bad_rows.any():
        print(f"[AVISO] Se descartaran {bad_rows.sum()} filas con timestamps invalidos")
        df = df[~bad_rows].copy()
    df["ts"] = np.where(df["clock_invalid"] == True, df["ingested_at"], df["recorded_at"])
    df["ts"] = pd.to_datetime(df["ts"], utc=True, format="mixed", errors="coerce")
    df = df[df["ts"].notna()].copy()

    before = len(df)
    df = df.sort_values(["ts", "weight_grams"], ascending=[True, False])
    df = df.drop_duplicates(subset=["ts"], keep="first")
    df = df.sort_values("ts").reset_index(drop=True)
    print(f"Duplicados eliminados: {before - len(df)} filas (quedan {len(df)})")

    out_path = Path(__file__).parent.parent / "data" / "raw" / "readings_raw.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, index=False)
    print(f"[OK] Guardado en: {out_path}")
    print(f"     Rango: {df['ts'].min()} -> {df['ts'].max()}")
    print(f"     Columnas: {list(df.columns)}")


if __name__ == "__main__":
    main()
