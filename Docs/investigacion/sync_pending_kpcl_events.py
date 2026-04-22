"""Sincroniza eventos manuales pendientes del HTML local a Supabase.

Uso:
  python Docs/investigacion/sync_pending_kpcl_events.py --file "C:\\ruta\\kpcl_eventos_pendientes_xxx.json"

Entrada aceptada:
- Objeto {"events": [...]} (formato exportado por el HTML)
- Lista directa [...]

Cada evento debe incluir:
- device_uuid (preferido) o device_code (KPCL0034/KPCL0036)
- category
- category_label (opcional)
- created_at (ISO UTC)
- payload (opcional)
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env.local"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


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
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        if not payload:
            break
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected response shape for {table}")
        rows.extend(payload)
        if len(payload) < page_size:
            break
        offset += page_size
    return rows


def rest_insert(base_url: str, headers: dict[str, str], table: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    url = f"{base_url.rstrip('/')}/rest/v1/{table}"
    req_headers = dict(headers)
    req_headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
    req = urllib.request.Request(
        url,
        data=json.dumps(rows).encode("utf-8"),
        headers=req_headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        resp.read()


def canonical_ts(value: str) -> str:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc).isoformat()


def load_input(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        events = raw.get("events", [])
        if not isinstance(events, list):
            raise RuntimeError("Invalid payload: events must be a list")
        return events
    if isinstance(raw, list):
        return raw
    raise RuntimeError("Invalid JSON format. Expected object or list.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync pending KPCL manual events to Supabase.")
    parser.add_argument("--file", required=True, help="JSON file exported from the local HTML queue.")
    args = parser.parse_args()

    src = Path(args.file).resolve()
    if not src.exists():
        raise RuntimeError(f"File not found: {src}")

    load_env(ENV_PATH)
    supabase_url = require_env("SUPABASE_URL")
    service_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    }

    input_events = load_input(src)
    if not input_events:
        print("No hay eventos para sincronizar.")
        return

    devices = rest_get_all(
        supabase_url,
        headers,
        "devices",
        select="id,device_id",
        filters=[],
        order="device_id.asc",
    )
    uuid_by_code = {str(d["device_id"]): str(d["id"]) for d in devices}
    valid_uuids = {str(d["id"]) for d in devices}

    prepared: list[dict[str, Any]] = []
    device_uuid_set: set[str] = set()
    for item in input_events:
        category = str(item.get("category", "")).strip()
        created_at = str(item.get("created_at", "")).strip()
        if not category or not created_at:
            continue

        device_uuid = str(item.get("device_uuid", "")).strip()
        if not device_uuid:
            code = str(item.get("device_code", "")).strip()
            device_uuid = uuid_by_code.get(code, "")
        if not device_uuid or device_uuid not in valid_uuids:
            continue

        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        if "category" not in payload:
            payload["category"] = category
        if "category_label" not in payload and item.get("category_label"):
            payload["category_label"] = str(item.get("category_label"))
        if "source" not in payload:
            payload["source"] = "kpcl_plot_manual_local_queue"

        prepared.append(
            {
                "event_type": "manual_bowl_category",
                "actor_id": None,
                "entity_type": "device",
                "entity_id": device_uuid,
                "payload": payload,
                "created_at": created_at,
            }
        )
        device_uuid_set.add(device_uuid)

    if not prepared:
        print("No hubo eventos validos para insertar.")
        return

    existing_keys: set[tuple[str, str, str, str]] = set()
    for device_uuid in sorted(device_uuid_set):
        rows = rest_get_all(
            supabase_url,
            headers,
            "audit_events",
            select="entity_id,event_type,created_at,payload",
            filters=[
                ("entity_type", "eq.device"),
                ("entity_id", f"eq.{device_uuid}"),
                ("event_type", "eq.manual_bowl_category"),
            ],
            order="created_at.asc",
        )
        for row in rows:
            payload = row.get("payload") or {}
            existing_keys.add(
                (
                    str(row.get("entity_id") or ""),
                    str(row.get("event_type") or ""),
                    canonical_ts(str(row.get("created_at") or "")),
                    str(payload.get("category") or ""),
                )
            )

    to_insert: list[dict[str, Any]] = []
    for row in prepared:
        payload = row["payload"] if isinstance(row["payload"], dict) else {}
        key = (
            str(row["entity_id"]),
            str(row["event_type"]),
            canonical_ts(str(row["created_at"])),
            str(payload.get("category") or ""),
        )
        if key in existing_keys:
            continue
        to_insert.append(row)

    rest_insert(supabase_url, headers, "audit_events", to_insert)
    print(f"Archivo: {src}")
    print(f"Eventos leidos: {len(input_events)}")
    print(f"Eventos validos: {len(prepared)}")
    print(f"Insertados: {len(to_insert)}")
    print(f"Duplicados omitidos: {len(prepared) - len(to_insert)}")


if __name__ == "__main__":
    main()
