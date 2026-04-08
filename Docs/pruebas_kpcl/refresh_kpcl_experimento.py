"""Descarga y reconstruccion canonica del experimento KPCL.

El script consulta Supabase con la ventana UTC de hoy desde las 20:00 hasta
ahora, integra lecturas y eventos manuales, y vuelve a escribir el CSV
combinado canónico usado por el gráfico de pruebas.
"""

from __future__ import annotations

import csv
import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent.parent
ENV_PATH = REPO_ROOT / ".env.local"
OUTPUT_COMBINED = ROOT / "kpcl0034_kpcl0036_prueba_sincargador.csv"
DEVICE_CODES = ("KPCL0034", "KPCL0036")
EXPORT_START_UTC = datetime(2026, 4, 4, tzinfo=timezone.utc)
READING_FIELDS = (
    "id",
    "device_id",
    "recorded_at",
    "ingested_at",
    "clock_invalid",
    "weight_grams",
    "water_ml",
    "flow_rate",
    "temperature",
    "humidity",
    "battery_level",
)
AUDIT_FIELDS = (
    "id",
    "event_type",
    "actor_id",
    "entity_type",
    "entity_id",
    "payload",
    "created_at",
)
OUTPUT_FIELDS = [
    "row_source",
    "evento",
    "device_code",
    "device_uuid",
    "event_at",
    "ingested_at",
    "event_type",
    "payload",
    "clock_invalid",
    "weight_grams",
    "food_content_g",
    "water_ml",
    "flow_rate",
    "temperature",
    "humidity",
    "battery_level",
    "plate_weight_grams_device",
    "battery_voltage",
    "battery_state",
    "battery_source",
    "device_type",
    "device_status",
    "device_state",
]

READING_EVENT_WINDOWS = {
    "KPCL0034": (
        (datetime(2026, 4, 6, 21, 42, 34, tzinfo=timezone.utc), "sin_categoria"),
        (datetime(2026, 4, 6, 21, 43, 34, tzinfo=timezone.utc), "tare_record"),
        (datetime(2026, 4, 6, 21, 44, 3, tzinfo=timezone.utc), "food_fill_start"),
        (None, "food_fill_end"),
    ),
    "KPCL0036": (
        (datetime(2026, 4, 6, 21, 42, 22, tzinfo=timezone.utc), "sin_categoria"),
        (datetime(2026, 4, 6, 21, 43, 48, tzinfo=timezone.utc), "tare_record"),
        (datetime(2026, 4, 6, 21, 44, 27, tzinfo=timezone.utc), "food_fill_start"),
        (None, "food_fill_end"),
    ),
}


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


def iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def encode_in_list(values: list[str]) -> str:
    inner = ",".join(values)
    return f"in.({inner})"


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


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def format_float(value: Any) -> str:
    if value is None or value == "":
        return ""
    return str(value)


def format_json(value: Any) -> str:
    if value in (None, ""):
        return ""
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def reading_event(device_code: str, recorded_at: datetime) -> str:
    windows = READING_EVENT_WINDOWS[device_code]
    for cutoff, label in windows:
        if cutoff is None or recorded_at < cutoff:
            return label
    return "sin_categoria"


def audit_event(event_type: str, payload: dict[str, Any] | None) -> str:
    if event_type == "manual_bowl_category":
        if isinstance(payload, dict):
            category = str(payload.get("category") or "").strip()
            if category:
                return category
        return "sin_categoria"
    if event_type == "device_online_detected":
        return "kpcl_prendido"
    if event_type == "device_offline_detected":
        return "kpcl_apagado"
    if event_type == "manual_plate_tare_start":
        return "tare_record"
    if event_type == "manual_plate_tare":
        return "plate_weight"
    if event_type == "manual_food_refill":
        return "food_fill_start"
    if event_type == "manual_food_refill_end":
        return "food_fill_end"
    if event_type == "manual_plate_observation":
        return "plate_observation"
    if event_type == "manual_food_amount":
        return "manual_food_amount"
    return event_type or "otro_evento"


def build_output_rows(
    devices: dict[str, dict[str, Any]],
    readings: list[dict[str, Any]],
    audits: list[dict[str, Any]],
) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for reading in readings:
        device_uuid = str(reading["device_id"])
        device = devices[device_uuid]
        device_code = str(device["device_id"])
        recorded_at = parse_timestamp(str(reading["recorded_at"]))
        weight = reading.get("weight_grams")
        plate_weight = device.get("plate_weight_grams")
        food_content = ""
        if weight is not None and plate_weight is not None:
            food_content = str(max(0, int(weight) - int(plate_weight)))

        rows.append(
            {
                "row_source": "reading",
                "evento": reading_event(device_code, recorded_at),
                "device_code": device_code,
                "device_uuid": device_uuid,
                "event_at": str(reading.get("recorded_at", "")),
                "ingested_at": str(reading.get("ingested_at") or ""),
                "event_type": "",
                "payload": "",
                "clock_invalid": str(reading.get("clock_invalid", "")).lower(),
                "weight_grams": "" if weight is None else str(weight),
                "food_content_g": food_content,
                "water_ml": "" if reading.get("water_ml") is None else str(reading.get("water_ml")),
                "flow_rate": format_float(reading.get("flow_rate")),
                "temperature": format_float(reading.get("temperature")),
                "humidity": format_float(reading.get("humidity")),
                "battery_level": "" if reading.get("battery_level") is None else str(reading.get("battery_level")),
                "plate_weight_grams_device": "" if plate_weight is None else str(plate_weight),
                "battery_voltage": "",
                "battery_state": "",
                "battery_source": "",
                "device_type": str(device.get("device_type", "")),
                "device_status": str(device.get("status", "")),
                "device_state": str(device.get("device_state", "")),
            }
        )

    for audit in audits:
        device_uuid = str(audit["entity_id"])
        device = devices[device_uuid]
        device_code = str(device["device_id"])
        payload = audit.get("payload")
        rows.append(
            {
                "row_source": "audit_event",
                "evento": audit_event(str(audit.get("event_type", "")), payload if isinstance(payload, dict) else None),
                "device_code": device_code,
                "device_uuid": device_uuid,
                "event_at": str(audit.get("created_at", "")),
                "ingested_at": "",
                "event_type": str(audit.get("event_type", "")),
                "payload": format_json(payload),
                "clock_invalid": "",
                "weight_grams": "",
                "food_content_g": "",
                "water_ml": "",
                "flow_rate": "",
                "temperature": "",
                "humidity": "",
                "battery_level": "",
                "plate_weight_grams_device": "" if device.get("plate_weight_grams") is None else str(device.get("plate_weight_grams")),
                "battery_voltage": "",
                "battery_state": "",
                "battery_source": "",
                "device_type": str(device.get("device_type", "")),
                "device_status": str(device.get("status", "")),
                "device_state": str(device.get("device_state", "")),
            }
        )

    rows.sort(key=lambda row: (row["event_at"], row["row_source"], row["device_code"]))
    return rows


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    load_env(ENV_PATH)
    supabase_url = require_env("SUPABASE_URL")
    supabase_service_key = require_env("SUPABASE_SERVICE_ROLE_KEY")

    start_at, end_at = EXPORT_START_UTC, datetime.now(timezone.utc)
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Accept": "application/json",
    }

    devices = rest_get_all(
        supabase_url,
        headers,
        "devices",
        select="id,device_id,device_type,status,device_state,plate_weight_grams",
        filters=[("device_id", encode_in_list(list(DEVICE_CODES)))],
        order="device_id.asc",
    )
    device_map = {str(device["id"]): device for device in devices}
    if len(device_map) != len(DEVICE_CODES):
        missing = [code for code in DEVICE_CODES if code not in {str(device["device_id"]) for device in devices}]
        raise RuntimeError(f"Missing devices in Supabase: {missing}")

    device_uuid_values = [str(device["id"]) for device in devices]
    start_iso = iso(start_at)
    end_iso = iso(end_at)

    readings = rest_get_all(
        supabase_url,
        headers,
        "readings",
        select=",".join(READING_FIELDS),
        filters=[
            ("device_id", encode_in_list(device_uuid_values)),
            ("recorded_at", f"gte.{start_iso}"),
            ("recorded_at", f"lte.{end_iso}"),
        ],
        order="recorded_at.asc",
    )

    audits = rest_get_all(
        supabase_url,
        headers,
        "audit_events",
        select=",".join(AUDIT_FIELDS),
        filters=[
            ("entity_type", "eq.device"),
            ("entity_id", encode_in_list(device_uuid_values)),
            ("created_at", f"gte.{start_iso}"),
            ("created_at", f"lte.{end_iso}"),
        ],
        order="created_at.asc",
    )

    output_rows = build_output_rows(device_map, readings, audits)
    write_csv(OUTPUT_COMBINED, output_rows)

    print(f"CSV combinado actualizado: {OUTPUT_COMBINED}")
    print(f"Rango UTC: {start_iso} -> {end_iso}")
    print(f"Lecturas: {len(readings)} | Eventos audit: {len(audits)} | Filas totales: {len(output_rows)}")


if __name__ == "__main__":
    main()
