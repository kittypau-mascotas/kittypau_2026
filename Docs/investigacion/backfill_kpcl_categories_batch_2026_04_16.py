"""Backfill de categorias manuales para KPCL0034 segn lote 2026-04-16.

Inserta eventos `manual_bowl_category` en `audit_events` con deduplicacion por:
- entity_id
- event_type
- created_at

Notas de normalizacion:
- El lote fue entregado con anio 2024 y se normaliza a 2026 para coincidir con
  el historico del experimento en esta base.
- Se conserva el timestamp exacto (hora/min/seg) indicado por el usuario.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent.parent
ENV_PATH = REPO_ROOT / ".env.local"
DEVICE_CODE = "KPCL0034"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        value = value.encode("utf-8").decode("unicode_escape")
        os.environ.setdefault(key, value)


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing env var: {name}")
    return value


def rest_get_all(
    base_url: str,
    headers: dict[str, str],
    table: str,
    *,
    select: str,
    filters: list[tuple[str, str]],
    order: str,
    page_size: int = 1000,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        params = [("select", select), *filters, ("order", order), ("limit", str(page_size)), ("offset", str(offset))]
        url = f"{base_url.rstrip('/')}/rest/v1/{table}{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"
        request = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if not payload:
            break
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected response shape for {table}: {type(payload)!r}")
        rows.extend(payload)
        if len(payload) < page_size:
            break
        offset += page_size
    return rows


def rest_insert(base_url: str, headers: dict[str, str], table: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    url = f"{base_url.rstrip('/')}/rest/v1/{table}"
    payload = json.dumps(rows).encode("utf-8")
    insert_headers = dict(headers)
    insert_headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
    request = urllib.request.Request(url, data=payload, headers=insert_headers, method="POST")
    with urllib.request.urlopen(request, timeout=60) as response:
        response.read()


def normalized_utc(ts_yyyy_mm_dd_hh_mm_ss: str) -> str:
    # Incoming batch was shared as 2024 but belongs to 2026 experiment.
    fixed = ts_yyyy_mm_dd_hh_mm_ss.replace("2024-", "2026-", 1)
    return f"{fixed}Z"


def canonical_ts(value: str) -> str:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc).isoformat()


def category_row(ts: str, category: str, label: str, notes: str) -> dict[str, str]:
    return {
        "created_at": normalized_utc(ts),
        "category": category,
        "category_label": label,
        "notes": notes,
    }


def main() -> None:
    load_env(ENV_PATH)
    supabase_url = require_env("SUPABASE_URL")
    supabase_service_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Accept": "application/json",
    }

    devices = rest_get_all(
        supabase_url,
        headers,
        "devices",
        select="id,device_id,device_type,status,device_state",
        filters=[("device_id", f"eq.{DEVICE_CODE}")],
        order="device_id.asc",
    )
    if not devices:
        raise RuntimeError(f"Device not found: {DEVICE_CODE}")
    device = devices[0]
    device_uuid = str(device["id"])

    # Raw user batch (duplicate pair kept intentionally; dedup is handled below).
    batch = [
        category_row("2024-04-08 03:18:43", "inicio_servido", "INICIO SERVIDO", "batch_2026_04_16"),
        category_row("2024-04-08 03:19:13", "termino_servido", "TERMINO SERVIDO", "batch_2026_04_16"),
        category_row("2024-04-15 21:27:44", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 21:31:44", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 13:58:10", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 14:01:40", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 13:58:10", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 14:01:40", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 10:45:39", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 10:49:09", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 00:49:28", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-15 00:53:28", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 21:44:47", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 21:50:47", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 17:15:15", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 17:18:15", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 12:07:43", "inicio_servido", "INICIO SERVIDO", "batch_2026_04_16"),
        category_row("2024-04-14 12:08:14", "termino_servido", "TERMINO SERVIDO", "batch_2026_04_16"),
        category_row("2024-04-14 11:52:43", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 11:57:44", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 06:26:52", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 06:32:12", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 00:05:59", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-14 00:09:59", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-13 19:05:27", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-13 19:12:59", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-13 13:27:18", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-13 13:31:48", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-13 12:21:17", "inicio_servido", "INICIO SERVIDO", "batch_2026_04_16"),
        category_row("2024-04-14 12:25:17", "termino_servido", "TERMINO SERVIDO", "batch_2026_04_16"),
        category_row("2024-04-13 10:22:47", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-13 10:28:47", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 21:52:40", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 21:56:40", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 21:27:10", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 21:31:10", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 14:24:38", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 11:50:06", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 11:55:36", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 04:05:40", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 04:10:41", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 01:35:09", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-12 01:38:41", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 21:48:31", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 21:53:31", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 18:02:30", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 18:08:00", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 12:49:38", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 12:53:58", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 00:14:24", "inicio_alimentacin", "INICIO ALIMENTACION", "batch_2026_04_16"),
        category_row("2024-04-11 00:15:54", "termino_alimentacin", "TERMINO ALIMENTACION", "batch_2026_04_16"),
    ]

    # Intra-batch dedup.
    unique: dict[tuple[str, str], dict[str, str]] = {}
    for item in batch:
        unique[(item["created_at"], item["category"])] = item
    batch_unique = list(unique.values())

    existing_rows = rest_get_all(
        supabase_url,
        headers,
        "audit_events",
        select="id,event_type,entity_id,created_at,payload",
        filters=[("entity_type", "eq.device"), ("entity_id", f"eq.{device_uuid}"), ("event_type", "eq.manual_bowl_category")],
        order="created_at.asc",
    )
    existing_keys = set()
    for row in existing_rows:
        payload = row.get("payload") or {}
        created_at = str(row.get("created_at") or "")
        if not created_at:
            continue
        existing_keys.add(
            (
                str(row.get("entity_id")),
                str(row.get("event_type")),
                canonical_ts(created_at),
                str(payload.get("category", "")),
            )
        )

    to_insert: list[dict[str, Any]] = []
    for item in batch_unique:
        payload = {
            "source": "manual_observation",
            "device_code": DEVICE_CODE,
            "device_type": str(device.get("device_type") or ""),
            "device_status": str(device.get("status") or ""),
            "device_state": str(device.get("device_state") or ""),
            "category": item["category"],
            "category_label": item["category_label"],
            "observed_at": item["created_at"],
            "notes": item["notes"],
            "batch_ref": "2026-04-16-user-timestamps",
        }
        dedup_key = (device_uuid, "manual_bowl_category", canonical_ts(item["created_at"]), item["category"])
        if dedup_key in existing_keys:
            continue
        to_insert.append(
            {
                "event_type": "manual_bowl_category",
                "actor_id": None,
                "entity_type": "device",
                "entity_id": device_uuid,
                "payload": payload,
                "created_at": item["created_at"],
            }
        )

    rest_insert(supabase_url, headers, "audit_events", to_insert)
    print(f"Eventos del lote insertados: {len(to_insert)}")


if __name__ == "__main__":
    main()
