"""Backfill canonico de eventos manuales KPCL hacia Supabase.

Este script registra en `audit_events` los hitos manuales que ya existen en la
documentacion canonica, para que el export UTC de las pruebas los arrastre al
CSV combinado y a los CSV por device.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent.parent
ENV_PATH = REPO_ROOT / ".env.local"
DEVICE_CODES = ("KPCL0034", "KPCL0036")


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
        url = f"{base_url.rstrip('/')}/rest/v1/{table}?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"
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
    insert_headers.update(
        {
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
    )
    request = urllib.request.Request(url, data=payload, headers=insert_headers, method="POST")
    with urllib.request.urlopen(request, timeout=60) as response:
        response.read()


def iso_local(value: str) -> str:
    return value


def build_payload(
    device_code: str,
    device_type: str,
    device_status: str,
    device_state: str,
    extra: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "source": "manual_observation",
        "device_code": device_code,
        "device_type": device_type,
        "device_status": device_status,
        "device_state": device_state,
    }
    payload.update(extra)
    return payload


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
        filters=[("device_id", f"in.({','.join(DEVICE_CODES)})")],
        order="device_id.asc",
    )
    device_map = {str(device["device_id"]): device for device in devices}

    if len(device_map) != len(DEVICE_CODES):
        missing = [code for code in DEVICE_CODES if code not in device_map]
        raise RuntimeError(f"Missing devices in Supabase: {missing}")

    target_events = [
        {
            "event_type": "manual_plate_observation",
            "device_code": "KPCL0036",
            "created_at": "2026-04-06T20:04:27+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "plate_presence": True,
                    "food_present": False,
                    "plate_state": "mounted_empty",
                    "location": "on_kpcl",
                    "observed_at": "2026-04-06T16:04:27-04:00",
                    "notes": "Food plate is mounted on KPCL0036 and currently has no food.",
                },
            ),
        },
        {
            "event_type": "manual_plate_tare",
            "device_code": "KPCL0036",
            "created_at": "2026-04-06T20:05:00+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "tare_applied": True,
                    "plate_zeroed": True,
                    "food_amount_g": 0,
                    "food_amount_basis": "net_after_tare",
                    "observed_at": "2026-04-06T16:05:00-04:00",
                    "notes": "Plate tared to zero to keep the current food baseline at 0 g from this observation point.",
                },
            ),
        },
        {
            "event_type": "manual_food_amount",
            "device_code": "KPCL0036",
            "created_at": "2026-04-06T20:07:50+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "tare_applied": True,
                    "plate_zeroed": True,
                    "food_amount_g": 36,
                    "food_amount_basis": "net_after_tare",
                    "tare_reference_g": 0,
                    "observed_at": "2026-04-06T16:07:50-04:00",
                    "notes": "Food added after tare; current net amount recorded at 36 g.",
                },
            ),
        },
        {
            "event_type": "manual_food_amount",
            "device_code": "KPCL0036",
            "created_at": "2026-04-06T20:23:08+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "food_amount_g": 28,
                    "food_amount_basis": "net_after_tare",
                    "observed_at": "2026-04-06T16:23:08-04:00",
                    "notes": "Net food amount reduced to 28 g without observed external intervention.",
                },
            ),
        },
        {
            "event_type": "manual_food_amount",
            "device_code": "KPCL0036",
            "created_at": "2026-04-06T20:27:47+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "food_amount_g": 26,
                    "food_amount_basis": "net_after_tare",
                    "observed_at": "2026-04-06T16:27:47-04:00",
                    "notes": "Net food amount reduced to 26 g without observed external intervention.",
                },
            ),
        },
        {
            "event_type": "manual_plate_tare_start",
            "device_code": "KPCL0036",
            "created_at": "2026-04-07T00:05:12.356102+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "event": "tare_record",
                    "indicator_color": "blue",
                    "observed_at": "2026-04-06T20:05:12.356102+00:00",
                    "notes": "Beginning of tare window for KPCL0036.",
                },
            ),
        },
        {
            "event_type": "manual_plate_tare",
            "device_code": "KPCL0036",
            "created_at": "2026-04-07T00:07:00.191354+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "event": "plate_weight",
                    "food_amount_g": 0,
                    "observed_at": "2026-04-06T20:07:00.191354+00:00",
                    "notes": "Plate tared to zero; beginning of the served-food window.",
                },
            ),
        },
        {
            "event_type": "manual_food_refill",
            "device_code": "KPCL0036",
            "created_at": "2026-04-07T00:07:10.132855+00:00",
            "payload": build_payload(
                "KPCL0036",
                str(device_map["KPCL0036"]["device_type"]),
                str(device_map["KPCL0036"]["status"]),
                str(device_map["KPCL0036"]["device_state"]),
                {
                    "event": "food_fill_start",
                    "observed_at": "2026-04-06T20:07:10.132855+00:00",
                    "notes": "Food fill begins after tare.",
                },
            ),
        },
        {
            "event_type": "manual_bowl_category",
            "device_code": "KPCL0034",
            "created_at": "2026-04-07T00:17:41+00:00",
            "payload": build_payload(
                "KPCL0034",
                str(device_map["KPCL0034"]["device_type"]),
                str(device_map["KPCL0034"]["status"]),
                str(device_map["KPCL0034"]["device_state"]),
                {
                    "category": "inicio_alimentacion",
                    "category_label": "INICIO ALIMENTACION",
                    "observed_at": "2026-04-07T00:17:41+00:00",
                    "notes": "KPCL0034 was categorized as the start of feeding.",
                },
            ),
        },
        {
            "event_type": "manual_bowl_category",
            "device_code": "KPCL0034",
            "created_at": "2026-04-07T00:20:41+00:00",
            "payload": build_payload(
                "KPCL0034",
                str(device_map["KPCL0034"]["device_type"]),
                str(device_map["KPCL0034"]["status"]),
                str(device_map["KPCL0034"]["device_state"]),
                {
                    "category": "termino_alimentacion",
                    "category_label": "TERMINO ALIMENTACION",
                    "observed_at": "2026-04-07T00:20:41+00:00",
                    "notes": "KPCL0034 was categorized as the end of feeding.",
                },
            ),
        },
    ]

    existing_rows = rest_get_all(
        supabase_url,
        headers,
        "audit_events",
        select="id,event_type,entity_id,created_at",
        filters=[
            ("entity_type", "eq.device"),
            ("entity_id", f"in.({','.join(str(device_map[code]['id']) for code in DEVICE_CODES)})"),
        ],
        order="created_at.asc",
    )
    existing_keys = {
        (
            str(row.get("entity_id")),
            str(row.get("event_type")),
            str(row.get("created_at")),
        )
        for row in existing_rows
    }

    rows_to_insert: list[dict[str, Any]] = []
    for event in target_events:
        device_uuid = str(device_map[event["device_code"]]["id"])
        key = (device_uuid, event["event_type"], event["created_at"])
        if key in existing_keys:
            continue
        rows_to_insert.append(
            {
                "event_type": event["event_type"],
                "actor_id": None,
                "entity_type": "device",
                "entity_id": device_uuid,
                "payload": event["payload"],
                "created_at": event["created_at"],
            }
        )

    rest_insert(supabase_url, headers, "audit_events", rows_to_insert)
    print(f"Eventos audit insertados: {len(rows_to_insert)}")


if __name__ == "__main__":
    main()
