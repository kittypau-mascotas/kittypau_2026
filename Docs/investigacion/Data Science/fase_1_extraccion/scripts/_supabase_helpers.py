"""Helpers shared by the Fase 1 extraction scripts."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

try:
    from supabase import create_client
except Exception:  # pragma: no cover
    create_client = None

try:
    import psycopg2
    import psycopg2.extras
except Exception:  # pragma: no cover
    psycopg2 = None

ENV_PATH = Path(r"D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\.env.local")


def load_project_env() -> None:
    load_dotenv(ENV_PATH)


def connect_first_available(urls: Iterable[str]):
    if psycopg2 is None:
        raise RuntimeError("psycopg2 no disponible")
    last_error: Exception | None = None
    for candidate in urls:
        if not candidate:
            continue
        try:
            return psycopg2.connect(candidate)
        except Exception as exc:
            last_error = exc
            print(f"[AVISO] No se pudo conectar con un URL de Postgres: {exc}")
    if last_error is not None:
        raise last_error
    raise RuntimeError("No hay URLs de Postgres disponibles")


def resolve_device_record(device_code: str) -> dict[str, object]:
    load_project_env()

    base_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if base_url and key and create_client is not None:
        try:
            supabase = create_client(base_url, key)
            res = (
                supabase.table("devices")
                .select("id, device_id, status, last_seen")
                .eq("device_id", device_code)
                .limit(1)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception as exc:
            print(f"[AVISO] Cliente Supabase no disponible para devices: {exc}")

    if psycopg2 is None:
        raise RuntimeError("No hay cliente Supabase ni psycopg2 disponible para el fallback")

    db_urls = [
        os.getenv("SUPABASE_DB_POOLER_URL"),
        os.getenv("SUPABASE_DB_URL"),
    ]
    if not any(db_urls):
        raise RuntimeError("No se encontro SUPABASE_DB_URL ni SUPABASE_DB_POOLER_URL")

    print("[INFO] Usando fallback directo a Postgres")
    with connect_first_available(db_urls) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "select id, device_id, status, last_seen from public.devices where device_id = %s limit 1",
                (device_code,),
            )
            row = cur.fetchone()
            if row:
                return dict(row)
    return {}


def get_supabase_client():
    load_project_env()
    base_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not key:
        raise SystemExit("[ERROR] Faltan credenciales de Supabase en .env.local")
    if create_client is None:
        raise SystemExit("[ERROR] El paquete supabase no esta disponible")
    return create_client(base_url, key)

