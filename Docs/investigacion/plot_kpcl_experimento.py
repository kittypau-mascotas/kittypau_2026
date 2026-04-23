"""Vista interactiva y exportador canonico de las pruebas KPCL.

Abre una pestaña del navegador con tres paneles:

1. KPCL0034 — peso bruto + contenido neto de comida + eventos.
2. KPCL0036 — peso bruto + eventos.
3. Nivel de batera de ambos dispositivos.

Adems exporta la data filtrada de cada device desde el inicio del 2026-04-04
UTC hasta el ultimo timestamp disponible en el CSV compartido.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import glob
import os
from pathlib import Path
import sys
from typing import Iterable
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
import webbrowser

import psycopg2
import plotly.graph_objects as go
from plotly.subplots import make_subplots


ROOT = Path(__file__).resolve().parent
COMBINED_CSV = ROOT / "kpcl0034_kpcl0036_prueba_sincargador.csv"
HTTP_PORT = 8765
OUTPUT_HTML = ROOT / "kpcl_pruebas_eventos.html"
EXPERIMENT_LABEL = "sin_batera"
DEVICE_ORDER = ("KPCL0034",)
WINDOW_START_UTC = datetime(2020, 1, 1, tzinfo=timezone.utc)
ENV_FILE = ROOT.parent.parent / ".env.local"
SUPABASE_DB_URL = "SUPABASE_DB_URL"
SUPABASE_DB_POOLER_URL = "SUPABASE_DB_POOLER_URL"

# plotly subplot axis names: row -> (xaxis_name, yaxis_name)
ROW_AXES: dict[int, tuple[str, str]] = {
    1: ("x", "y"),
    2: ("x2", "y2"),
    3: ("x3", "y3"),
}

DEVICE_TYPE: dict[str, str] = {
    "KPCL0034": "food_bowl",
    "KPCL0036": "water_bowl",
}

try:
    csv.field_size_limit(sys.maxsize)
except (OverflowError, ValueError):
    csv.field_size_limit(2_147_483_647)


EVENT_LABELS: dict[str, str] = {
    "sin_categoria": "Sin categoria",
    "pre_tare": "Pre tare",
    "tare_record": "Tare [legacy]",
    "plate_weight": "Plato / tare [legacy]",
    "food_fill_start": "Inicio servido [legacy]",
    "food_fill_end": "Fin servido [legacy]",
    "kpcl_prendido": "KPCL prendido",
    "kpcl_apagado": "KPCL apagado",
    "kpcl_sin_plato": "KPCL sin plato",
    "kpcl_con_plato": "KPCL con plato",
    "tare_con_plato": "Tare con plato",
    "inicio_servido": "Inicio servido",
    "termino_servido": "Termino servido",
    "inicio_alimentacion": "Inicio alimentación",
    "termino_alimentacion": "Termino alimentación",
    "inicio_hidratacion": "Inicio hidratación",
    "termino_hidratacion": "Termino hidratación",
    "plate_observation": "Plato observado",
    "manual_food_amount": "Cantidad manual",
    "otro_evento": "Otro evento",
}

EVENT_COLORS: dict[str, str] = {
    "sin_categoria": "#8f9bb3",
    "pre_tare": "#7a7a7a",
    "tare_record": "#c56e57",
    "plate_weight": "#8b5cf6",
    "food_fill_start": "#6a994e",
    "food_fill_end": "#8f5db7",
    "kpcl_prendido": "#16a34a",
    "kpcl_apagado": "#dc2626",
    "kpcl_sin_plato": "#8f9bb3",
    "kpcl_con_plato": "#557a95",
    "tare_con_plato": "#c56e57",
    "inicio_servido": "#f97316",
    "termino_servido": "#ea580c",
    "inicio_alimentacion": "#16a34a",
    "termino_alimentacion": "#15803d",
    "inicio_hidratacion": "#0284c7",
    "termino_hidratacion": "#0369a1",
    "plate_observation": "#7a7a7a",
    "manual_food_amount": "#d97706",
    "otro_evento": "#444444",
}

# Band style per interval type: fillcolor, border color, label
BAND_STYLES: dict[str, dict[str, str]] = {
    "alimentacion": {
        "fillcolor": "rgba(34,197,94,0.18)",
        "line_color": "#16a34a",
        "label": "Alimentación",
    },
    "hidratacion": {
        "fillcolor": "rgba(14,165,233,0.18)",
        "line_color": "#0284c7",
        "label": "Hidratación",
    },
    "servido": {
        "fillcolor": "rgba(249,115,22,0.16)",
        "line_color": "#ea580c",
        "label": "Servido",
    },
}


@dataclass(frozen=True)
class SeriesPoint:
    timestamp: datetime
    weight: float | None
    evento: str
    device_code: str | None = None
    is_audit: bool = False
    battery_level: float | None = None
    food_content: float | None = None


@dataclass(frozen=True)
class Dataset:
    path: Path
    title: str
    time_column: str
    weight_column: str
    device_column: str | None


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value)


def parse_optional_float(value: str) -> float | None:
    cleaned = (value or "").strip()
    if not cleaned or cleaned.lower() == "null":
        return None
    return float(cleaned)


def quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    if q <= 0:
        return min(values)
    if q >= 1:
        return max(values)
    ordered = sorted(values)
    pos = (len(ordered) - 1) * q
    lower = int(pos)
    upper = min(lower + 1, len(ordered) - 1)
    if lower == upper:
        return ordered[lower]
    frac = pos - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * frac


def utc_window_from_points(points: Iterable[SeriesPoint]) -> tuple[datetime, datetime]:
    timestamps = [point.timestamp for point in points]
    if not timestamps:
        raise ValueError("No hay timestamps disponibles")
    return WINDOW_START_UTC, max(timestamps)


def load_rows(spec: Dataset) -> list[dict[str, str]]:
    with spec.path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def load_env_from_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        clean = line.strip()
        if not clean or clean.startswith("#") or "=" not in clean:
            continue
        key, value = clean.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def build_supabase_sql() -> str:
    return """
with params as (
  select
    %s::timestamptz as from_at,
    %s::timestamptz as to_at
),
device_ctx as (
  select
    d.id as device_uuid,
    d.device_id as device_code,
    d.device_type,
    d.status as device_status,
    d.device_state,
    d.plate_weight_grams
  from public.devices d
  where d.device_id in ('KPCL0034', 'KPCL0036')
),
reading_rows as (
  select
    'reading'::text as row_source,
    d.device_code,
    d.device_uuid,
    r.recorded_at as event_at,
    r.ingested_at,
    null::text as event_type,
    null::jsonb as payload,
    r.clock_invalid,
    r.weight_grams,
    case
      when r.weight_grams is not null and d.plate_weight_grams is not null
        then greatest(0, r.weight_grams - d.plate_weight_grams)
      else null
    end as food_content_g,
    r.water_ml,
    r.flow_rate,
    r.temperature,
    r.humidity,
    r.battery_level,
    d.plate_weight_grams as plate_weight_grams_device,
    r.battery_voltage,
    r.battery_state,
    r.battery_source,
    d.device_type,
    d.device_status,
    d.device_state,
    null::text as evento
  from public.readings r
  join device_ctx d
    on d.device_uuid = r.device_id
  join params p
    on r.recorded_at >= p.from_at
   and r.recorded_at <= p.to_at
),
audit_rows as (
  select
    'audit_event'::text as row_source,
    d.device_code,
    d.device_uuid,
    ae.created_at as event_at,
    null::timestamptz as ingested_at,
    ae.event_type,
    ae.payload,
    null::boolean as clock_invalid,
    null::int as weight_grams,
    null::int as food_content_g,
    null::int as water_ml,
    null::numeric as flow_rate,
    null::numeric as temperature,
    null::numeric as humidity,
    null::int as battery_level,
    d.plate_weight_grams as plate_weight_grams_device,
    null::numeric as battery_voltage,
    null::text as battery_state,
    null::text as battery_source,
    d.device_type,
    d.device_status,
    d.device_state,
    case
      when ae.event_type = 'manual_bowl_category' then (ae.payload->>'category')
      when ae.event_type = 'device_online_detected'  then 'kpcl_prendido'
      when ae.event_type = 'device_offline_detected' then 'kpcl_apagado'
      when ae.event_type = 'device_power_event'
        then coalesce(ae.payload->>'category', ae.event_type)
      else ae.event_type
    end as evento
  from public.audit_events ae
  join device_ctx d
    on d.device_uuid = ae.entity_id
  join params p
    on ae.created_at >= p.from_at
   and ae.created_at <= p.to_at
  where ae.entity_type = 'device'
),
combined as (
  select * from reading_rows
  union all
  select * from audit_rows
)
select *
from combined
order by event_at asc, row_source asc, device_code asc;
"""


import json
import urllib.request as _urllib_request

SUPABASE_URL_KEY = "SUPABASE_URL"
SUPABASE_SERVICE_ROLE_KEY_KEY = "SUPABASE_SERVICE_ROLE_KEY"


def normalize_row(row: dict[str, object]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in row.items():
        if value is None:
            normalized[key] = ""
        elif isinstance(value, datetime):
            normalized[key] = value.isoformat()
        else:
            normalized[key] = str(value)
    return normalized


def ensure_sslmode(dsn: str) -> str:
    parsed = urlparse(dsn)
    if not parsed.scheme or not parsed.netloc:
        return dsn
    query = dict(parse_qsl(parsed.query))
    if "sslmode" not in query:
        query["sslmode"] = "require"
    updated = parsed._replace(query=urlencode(query))
    return urlunparse(updated)


def connect_supabase(db_url: str) -> psycopg2.extensions.connection:
    return psycopg2.connect(ensure_sslmode(db_url))


def describe_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    if not parsed.scheme or not parsed.netloc:
        return "<dsn invalido>"
    return f"{parsed.username or 'unknown'}@{parsed.hostname or 'unknown'}:{parsed.port or ''}"


def _fetch_sql(url: str, sql: str, params: tuple) -> list[dict[str, object]]:
    with connect_supabase(url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, record)) for record in cur.fetchall()]


def _rest_get_all(
    base_url: str,
    headers: dict[str, str],
    table: str,
    *,
    select: str,
    filters: list[tuple[str, str]],
    order: str,
    page_size: int = 1000,
) -> list[dict]:
    from urllib.parse import urlencode, quote
    rows: list[dict] = []
    offset = 0
    while True:
        params = [("select", select), *filters, ("order", order),
                  ("limit", str(page_size)), ("offset", str(offset))]
        url = f"{base_url.rstrip('/')}/rest/v1/{table}?{urlencode(params, quote_via=quote)}"
        req = _urllib_request.Request(url, headers=headers, method="GET")
        with _urllib_request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        if not payload:
            break
        rows.extend(payload)
        if len(payload) < page_size:
            break
        offset += page_size
    return rows


def _audit_evento(event_type: str, payload: dict | None) -> str:
    if event_type == "manual_bowl_category":
        cat = (payload or {}).get("category", "")
        return str(cat).strip() or "sin_categoria"
    mapping = {
        "device_online_detected": "kpcl_prendido",
        "device_offline_detected": "kpcl_apagado",
        "device_power_event": None,
        "manual_plate_tare_start": "tare_record",
        "manual_plate_tare": "plate_weight",
        "manual_food_refill": "food_fill_start",
        "manual_food_refill_end": "food_fill_end",
    }
    if event_type == "device_power_event" and payload:
        return str(payload.get("category", event_type)).strip()
    return mapping.get(event_type, event_type or "otro_evento")


def load_rows_from_rest(*, start: datetime, end: datetime) -> list[dict[str, str]]:
    base_url = os.environ.get(SUPABASE_URL_KEY, "").rstrip("/")
    service_key = os.environ.get(SUPABASE_SERVICE_ROLE_KEY_KEY, "")
    if not base_url or not service_key:
        raise ValueError("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidos.")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    iso_start = start.isoformat().replace("+00:00", "Z")
    iso_end = end.isoformat().replace("+00:00", "Z")
    device_codes = list(DEVICE_ORDER)

    print(f"[rest] cargando devices ({', '.join(device_codes)})...")
    raw_devices = _rest_get_all(
        base_url, headers, "devices",
        select="id,device_id,device_type,status,device_state,plate_weight_grams",
        filters=[("device_id", f"in.({','.join(device_codes)})")],
        order="device_id.asc",
    )
    devices_by_uuid = {str(d["id"]): d for d in raw_devices}
    devices_by_code = {str(d["device_id"]): d for d in raw_devices}
    uuids = [str(d["id"]) for d in raw_devices]
    if not uuids:
        raise ValueError(f"No se encontraron devices para {device_codes}")

    print(f"[rest] cargando readings ({len(uuids)} devices)...")
    raw_readings = _rest_get_all(
        base_url, headers, "readings",
        select="device_id,recorded_at,ingested_at,clock_invalid,weight_grams,"
               "water_ml,flow_rate,temperature,humidity,battery_level,"
               "battery_voltage,battery_state,battery_source",
        filters=[
            ("device_id", f"in.({','.join(uuids)})"),
            ("recorded_at", f"gte.{iso_start}"),
            ("recorded_at", f"lte.{iso_end}"),
        ],
        order="recorded_at.asc",
    )

    print(f"[rest] cargando audit_events ({len(uuids)} devices)...")
    raw_audits = _rest_get_all(
        base_url, headers, "audit_events",
        select="id,event_type,entity_id,created_at,payload",
        filters=[
            ("entity_id", f"in.({','.join(uuids)})"),
            ("entity_type", "eq.device"),
            ("created_at", f"gte.{iso_start}"),
            ("created_at", f"lte.{iso_end}"),
        ],
        order="created_at.asc",
    )

    rows: list[dict[str, str]] = []

    for r in raw_readings:
        uuid = str(r.get("device_id", ""))
        dev = devices_by_uuid.get(uuid, {})
        dev_code = str(dev.get("device_id", ""))
        weight = r.get("weight_grams")
        plate = dev.get("plate_weight_grams")
        food_content = ""
        if weight is not None and plate is not None:
            food_content = str(max(0, int(weight) - int(plate)))
        rows.append({
            "row_source": "reading",
            "evento": "",
            "device_code": dev_code,
            "device_uuid": uuid,
            "event_at": str(r.get("recorded_at", "")),
            "ingested_at": str(r.get("ingested_at") or ""),
            "event_type": "",
            "payload": "",
            "clock_invalid": str(r.get("clock_invalid", "")).lower(),
            "weight_grams": "" if weight is None else str(weight),
            "food_content_g": food_content,
            "water_ml": "" if r.get("water_ml") is None else str(r["water_ml"]),
            "flow_rate": str(r.get("flow_rate") or ""),
            "temperature": str(r.get("temperature") or ""),
            "humidity": str(r.get("humidity") or ""),
            "battery_level": "" if r.get("battery_level") is None else str(r["battery_level"]),
            "plate_weight_grams_device": "" if plate is None else str(plate),
            "battery_voltage": str(r.get("battery_voltage") or ""),
            "battery_state": str(r.get("battery_state") or ""),
            "battery_source": str(r.get("battery_source") or ""),
            "device_type": str(dev.get("device_type", "")),
            "device_status": str(dev.get("status", "")),
            "device_state": str(dev.get("device_state", "")),
        })

    for a in raw_audits:
        uuid = str(a.get("entity_id", ""))
        dev = devices_by_uuid.get(uuid, {})
        dev_code = str(dev.get("device_id", ""))
        raw_payload = a.get("payload")
        payload_dict = raw_payload if isinstance(raw_payload, dict) else {}
        evento = _audit_evento(str(a.get("event_type", "")), payload_dict)
        rows.append({
            "row_source": "audit_event",
            "evento": evento,
            "device_code": dev_code,
            "device_uuid": uuid,
            "event_at": str(a.get("created_at", "")),
            "ingested_at": "",
            "event_type": str(a.get("event_type", "")),
            "payload": json.dumps(payload_dict, ensure_ascii=False) if payload_dict else "",
            "clock_invalid": "",
            "weight_grams": "",
            "food_content_g": "",
            "water_ml": "",
            "flow_rate": "",
            "temperature": "",
            "humidity": "",
            "battery_level": "",
            "plate_weight_grams_device": str(dev.get("plate_weight_grams") or ""),
            "battery_voltage": "",
            "battery_state": "",
            "battery_source": "",
            "device_type": str(dev.get("device_type", "")),
            "device_status": str(dev.get("status", "")),
            "device_state": str(dev.get("device_state", "")),
        })

    rows.sort(key=lambda r: (r["event_at"], r["row_source"]))
    print(f"[rest] {len(rows)} filas ({len(raw_readings)} readings + {len(raw_audits)} audit events)")
    return rows


def load_rows_from_supabase(*, start: datetime, end: datetime) -> list[dict[str, str]]:
    """Intenta psycopg2 (pooler -> directo) y si falla cae a REST API."""
    db_url = os.environ.get(SUPABASE_DB_URL)
    pooler_url = os.environ.get(SUPABASE_DB_POOLER_URL) or None
    sql = build_supabase_sql()
    params = (start, end)
    errors: list[str] = []

    if pooler_url and db_url:
        try:
            print(f"[supabase] pooler: {describe_dsn(pooler_url)}")
            return [normalize_row(r) for r in _fetch_sql(pooler_url, sql, params)]
        except Exception as exc:
            errors.append(f"pooler: {exc!s:.80}")

    if db_url:
        try:
            print(f"[supabase] directo: {describe_dsn(db_url)}")
            return [normalize_row(r) for r in _fetch_sql(db_url, sql, params)]
        except Exception as exc:
            errors.append(f"directo: {exc!s:.80}")

    print(f"[supabase] psycopg2 no disponible ({'; '.join(errors)}) — usando REST API...")
    return load_rows_from_rest(start=start, end=end)


def rows_to_points(
    rows: Iterable[dict[str, str]],
    spec: Dataset,
    *,
    device_code: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[SeriesPoint]:
    points: list[SeriesPoint] = []

    for row in rows:
        raw_timestamp = row.get(spec.time_column, "").strip()
        if not raw_timestamp:
            continue

        timestamp = parse_timestamp(raw_timestamp)
        if start is not None and timestamp < start:
            continue
        if end is not None and timestamp > end:
            continue

        row_device = (row.get(spec.device_column, "").strip() if spec.device_column else None) or None
        if device_code is not None and row_device != device_code:
            continue

        is_audit = row.get("row_source", "").strip() == "audit_event"
        evento_raw = row.get("evento", "").strip()
        # Only assign event labels to audit rows; reading rows get empty evento to avoid
        # spurious markers from timestamp-window assignments in the legacy CSV.
        evento = (evento_raw or "sin_categoria") if is_audit else ""

        points.append(
            SeriesPoint(
                timestamp=timestamp,
                weight=parse_optional_float(row.get(spec.weight_column, "")),
                evento=evento,
                device_code=row_device,
                is_audit=is_audit,
                battery_level=parse_optional_float(row.get("battery_level", "")),
                food_content=parse_optional_float(row.get("food_content_g", "")),
            )
        )

    points.sort(key=lambda item: item.timestamp)
    return points


def export_rows(
    rows: Iterable[dict[str, str]],
    *,
    output_path: Path,
    fieldnames: list[str],
) -> None:
    output_path.write_text("", encoding="utf-8")
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def group_by_device(points: Iterable[SeriesPoint]) -> dict[str, list[SeriesPoint]]:
    groups: dict[str, list[SeriesPoint]] = {}
    for point in points:
        key = point.device_code or "unknown"
        groups.setdefault(key, []).append(point)
    return groups


def _annotation_refs(row: int) -> tuple[str, str]:
    xaxis, yaxis = ROW_AXES.get(row, ("x", "y"))
    return xaxis, f"{yaxis} domain"


def _weight_at(points: list[SeriesPoint], ts: datetime, window_s: float = 90) -> float | None:
    candidates = [
        p for p in points
        if not p.is_audit and p.weight is not None
        and abs((p.timestamp - ts).total_seconds()) <= window_s
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda p: abs((p.timestamp - ts).total_seconds())).weight


def add_power_markers(fig: go.Figure, row: int, points: list[SeriesPoint]) -> None:
    if not points:
        return
    xref, yref = _annotation_refs(row)

    off_events = sorted(
        p.timestamp for p in points
        if p.is_audit and p.evento in ("kpcl_apagado", "device_offline_detected")
    )
    for ts in off_events:
        fig.add_vline(
            x=ts, line_width=1.5, line_dash="dot",
            line_color=EVENT_COLORS["kpcl_apagado"], row=row, col=1,
        )
        fig.add_annotation(
            x=ts, y=0.99, xref=xref, yref=yref,
            text="⏻ Apagado",
            showarrow=False, xanchor="left", yanchor="top",
            font=dict(size=10, color=EVENT_COLORS["kpcl_apagado"]),
            bgcolor="rgba(255,255,255,0.85)", bordercolor=EVENT_COLORS["kpcl_apagado"],
            borderpad=2,
        )

    on_explicit = [p.timestamp for p in points if p.is_audit and p.evento == "kpcl_prendido"]
    if on_explicit:
        on_events = sorted(set(on_explicit))
    else:
        reading_points = [p for p in points if p.weight is not None]
        on_events = []
        if reading_points:
            on_events.append(reading_points[0].timestamp)
            for off_ts in off_events:
                nxt = next((p.timestamp for p in reading_points if p.timestamp > off_ts), None)
                if nxt:
                    on_events.append(nxt)
        on_events = sorted(set(on_events))

    for ts in on_events:
        fig.add_vline(
            x=ts, line_width=1.5, line_dash="dot",
            line_color=EVENT_COLORS["kpcl_prendido"], row=row, col=1,
        )
        fig.add_annotation(
            x=ts, y=0.92, xref=xref, yref=yref,
            text="⏻ Encendido",
            showarrow=False, xanchor="left", yanchor="top",
            font=dict(size=10, color=EVENT_COLORS["kpcl_prendido"]),
            bgcolor="rgba(255,255,255,0.85)", bordercolor=EVENT_COLORS["kpcl_prendido"],
            borderpad=2,
        )


def build_event_intervals(points: list[SeriesPoint]) -> list[tuple[datetime, datetime, str]]:
    """Return (start, end, band_key) windows using only audit event points."""
    audit_points = [p for p in points if p.is_audit]
    if not audit_points:
        return []
    sorted_points = sorted(audit_points, key=lambda p: p.timestamp)

    start_events: dict[str, tuple[str, str]] = {
        "food_fill_start": ("servido", "servido"),
        "inicio_servido":  ("servido", "servido"),
        "inicio_alimentacion": ("alimentacion", "alimentacion"),
        "inicio_hidratacion":  ("hidratacion", "hidratacion"),
    }
    end_events: dict[str, str] = {
        "food_fill_end":      "servido",
        "termino_servido":    "servido",
        "termino_alimentacion": "alimentacion",
        "termino_hidratacion":  "hidratacion",
    }

    open_intervals: dict[str, datetime] = {}
    intervals: list[tuple[datetime, datetime, str]] = []

    for point in sorted_points:
        started = start_events.get(point.evento)
        if started is not None:
            band_key, _ = started
            open_intervals[band_key] = point.timestamp
            continue

        ended_key = end_events.get(point.evento)
        if ended_key is None:
            continue
        start_ts = open_intervals.get(ended_key)
        if start_ts is None:
            continue
        if point.timestamp > start_ts:
            intervals.append((start_ts, point.timestamp, ended_key))
        open_intervals.pop(ended_key, None)

    return intervals


def add_event_bands(
    fig: go.Figure,
    row: int,
    points: list[SeriesPoint],
    *,
    y_lo: float,
    y_hi: float,
    seen_bands: set[str],
) -> None:
    """Agrega bandas como Scatter traces para que sean toggleables en la leyenda."""
    xref, yref = _annotation_refs(row)
    intervals = build_event_intervals(points)
    band_keys_order = list(BAND_STYLES.keys())
    label_offset = 0
    for start, end, band_key in intervals:
        style = BAND_STYLES.get(band_key, BAND_STYLES["servido"])
        show_leg = band_key not in seen_bands
        if show_leg:
            seen_bands.add(band_key)

        w_start = _weight_at(points, start)
        w_end = _weight_at(points, end)
        duration_min = (end - start).total_seconds() / 60
        parts = [style["label"]]
        if w_start is not None and w_end is not None:
            delta = w_start - w_end
            if abs(delta) > 0.5:
                sign = "−" if delta > 0 else "+"
                parts.append(f"{sign}{abs(delta):.0f}g")
        if duration_min >= 0.5:
            parts.append(f"{duration_min:.0f}min")
        hover_text = " · ".join(parts)

        # Banda como Scatter fill toself -> aparece en leyenda y es toggleable
        rank_base = 200 + (band_keys_order.index(band_key) if band_key in band_keys_order else 9)
        fig.add_trace(
            go.Scatter(
                x=[start, start, end, end, start],
                y=[y_lo, y_hi * 0.999, y_hi * 0.999, y_lo, y_lo],
                fill="toself",
                fillcolor=style["fillcolor"],
                line=dict(color=style["line_color"], width=1.5),
                mode="lines",
                name=style["label"],
                legendgroup=f"band_{band_key}",
                showlegend=show_leg,
                legendrank=rank_base,
                hovertemplate=(
                    f"<b>{hover_text}</b><br>"
                    "Inicio: %{x|%d %b %H:%M}<extra></extra>"
                ),
            ),
            row=row, col=1,
        )

        y_pos = 0.85 - (label_offset % 4) * 0.09
        label_offset += 1
        fig.add_annotation(
            x=start, y=y_pos,
            xref=xref, yref=yref,
            text=hover_text,
            showarrow=False, xanchor="left", yanchor="bottom",
            font=dict(size=11, color=style["line_color"], family="Arial, sans-serif"),
            bgcolor="rgba(255,255,255,0.88)",
            bordercolor=style["line_color"],
            borderpad=3,
        )


def add_event_markers(fig: go.Figure, row: int, points: list[SeriesPoint]) -> None:
    xref, yref = _annotation_refs(row)
    key_events = {
        "kpcl_sin_plato", "kpcl_con_plato", "tare_con_plato",
        "tare_record", "plate_weight",
        "food_fill_start", "food_fill_end",
        "inicio_servido", "termino_servido",
        "inicio_alimentacion", "termino_alimentacion",
        "inicio_hidratacion", "termino_hidratacion",
    }
    marker_points = [p for p in points if p.is_audit and p.evento in key_events]

    deduped: list[SeriesPoint] = []
    last_seen: dict[str, datetime] = {}
    for point in sorted(marker_points, key=lambda p: p.timestamp):
        prev = last_seen.get(point.evento)
        if prev is not None and (point.timestamp - prev).total_seconds() < 60:
            continue
        deduped.append(point)
        last_seen[point.evento] = point.timestamp

    for idx, point in enumerate(deduped):
        event_name = point.evento
        ts = point.timestamp
        label = EVENT_LABELS.get(event_name, event_name)
        color = EVENT_COLORS.get(event_name, "#666666")

        # Find the actual weight at this timestamp to place the marker on the curve.
        y_data = _weight_at(points, ts, window_s=120)

        fig.add_vline(
            x=ts, line_width=1, line_dash="dash",
            line_color=color, row=row, col=1,
        )

        if y_data is not None:
            # Diamond marker pinned to the curve with an arrow label.
            fig.add_trace(
                go.Scatter(
                    x=[ts], y=[y_data],
                    mode="markers",
                    marker=dict(size=10, color=color, symbol="diamond",
                                line=dict(color="white", width=1.5)),
                    hovertemplate=(
                        f"<b>{label}</b><br>"
                        "%{x|%Y-%m-%d %H:%M:%S}<br>"
                        "Peso: %{y:.1f} g<extra></extra>"
                    ),
                    showlegend=False,
                ),
                row=row, col=1,
            )
            # Label with arrow pointing to the diamond.
            fig.add_annotation(
                x=ts, y=y_data,
                xref=xref.replace("domain", ""), yref=ROW_AXES.get(row, ("x", "y"))[1],
                text=f"<b>{label}</b>",
                showarrow=True, arrowhead=2, arrowsize=0.8,
                arrowcolor=color, arrowwidth=1.2,
                ax=28, ay=-32 - (idx % 4) * 18,
                font=dict(size=10, color=color),
                bgcolor="rgba(255,255,255,0.90)",
                bordercolor=color, borderpad=2,
            )
        else:
            # Fallback: annotation at fixed paper position when no nearby reading.
            y_pos = 0.68 - (idx % 6) * 0.09
            fig.add_annotation(
                x=ts, y=y_pos,
                xref=xref, yref=yref,
                text=label,
                showarrow=False, xanchor="left", yanchor="bottom",
                font=dict(size=10, color=color),
                bgcolor="rgba(255,255,255,0.88)",
                bordercolor=color, borderpad=2,
            )


def add_series_traces(
    fig: go.Figure,
    row: int,
    points: list[SeriesPoint],
    *,
    show_legend: bool,
    device_code: str,
) -> None:
    palette = {"KPCL0034": "#e05c4a", "KPCL0036": "#3b82f6"}
    color = palette.get(device_code, "#6a994e")
    fill_color = {"KPCL0034": "rgba(224,92,74,0.08)", "KPCL0036": "rgba(59,130,246,0.08)"}

    xs = [p.timestamp for p in points if p.weight is not None]
    ys = [p.weight for p in points if p.weight is not None]
    if xs:
        fig.add_trace(
            go.Scatter(
                x=xs, y=ys,
                mode="lines",
                name=f"{device_code} — Peso bruto",
                line=dict(color=color, width=2, shape="hv"),
                fill="tozeroy",
                fillcolor=fill_color.get(device_code, "rgba(100,116,139,0.07)"),
                hovertemplate=(
                    "<b>" + device_code + "</b><br>"
                    "%{x|%d %b %H:%M:%S}<br>"
                    "Peso: <b>%{y:.1f} g</b><extra></extra>"
                ),
                showlegend=show_legend,
            ),
            row=row, col=1,
        )

    # Net food content — food bowls only, filled area under curve.
    if DEVICE_TYPE.get(device_code) == "food_bowl":
        fc_xs = [p.timestamp for p in points if p.food_content is not None]
        fc_ys = [p.food_content for p in points if p.food_content is not None]
        if fc_xs:
            fig.add_trace(
                go.Scatter(
                    x=fc_xs, y=fc_ys,
                    mode="lines",
                    name=f"{device_code} — Contenido neto",
                    line=dict(color="#a78bfa", width=1.5, shape="hv"),
                    fill="tozeroy",
                    fillcolor="rgba(167,139,250,0.12)",
                    hovertemplate=(
                        "Contenido neto<br>"
                        "%{x|%d %b %H:%M:%S}<br>"
                        "<b>%{y:.1f} g</b><extra></extra>"
                    ),
                    showlegend=show_legend,
                ),
                row=row, col=1,
            )


def add_battery_traces(
    fig: go.Figure,
    row: int,
    points_by_device: dict[str, list[SeriesPoint]],
) -> None:
    palette = {"KPCL0034": "#e05c4a", "KPCL0036": "#3b82f6"}
    for device_code in DEVICE_ORDER:
        device_points = points_by_device.get(device_code, [])
        batt_xs = [p.timestamp for p in device_points if p.battery_level is not None]
        batt_ys = [p.battery_level for p in device_points if p.battery_level is not None]
        if not batt_xs:
            continue
        color = palette.get(device_code, "#64748b")
        fig.add_trace(
            go.Scatter(
                x=batt_xs, y=batt_ys,
                mode="lines",
                name=f"{device_code} — Batería",
                line=dict(color=color, width=1.5, shape="hv"),
                fill="tozeroy",
                fillcolor=color.replace(")", ",0.10)").replace("rgb", "rgba") if color.startswith("rgb") else color + "1a",
                hovertemplate=(
                    "<b>" + device_code + "</b> batería<br>"
                    "%{x|%d %b %H:%M}<br>"
                    "<b>%{y:.0f}%%</b><extra></extra>"
                ),
                showlegend=True,
            ),
            row=row, col=1,
        )
    # Low-battery reference line at 20%
    fig.add_hline(
        y=20, line_width=1, line_dash="dot",
        line_color="#ef4444",
        row=row, col=1,
        annotation_text="20%", annotation_position="right",
        annotation_font=dict(size=10, color="#ef4444"),
    )


def build_device_window(points: list[SeriesPoint], end_cap: datetime) -> tuple[datetime, datetime]:
    if not points:
        raise ValueError("No hay puntos para calcular ventana")
    sorted_points = sorted(points, key=lambda p: p.timestamp)
    on_ts = next((p.timestamp for p in sorted_points if p.weight is not None), sorted_points[0].timestamp)
    off_ts = next(
        (p.timestamp for p in sorted_points if p.timestamp > on_ts and p.is_audit and p.evento == "kpcl_apagado"),
        sorted_points[-1].timestamp,
    )
    end = min(off_ts, end_cap)
    start = min(on_ts, end)
    return start, end


def build_fixed_window(
    points: list[SeriesPoint], *, start_hour: int, end_hour: int, end_cap: datetime
) -> tuple[datetime, datetime]:
    if not points:
        raise ValueError("No hay puntos para calcular ventana")
    last_ts = max(p.timestamp for p in points)
    start = datetime(last_ts.year, last_ts.month, last_ts.day, start_hour, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=(end_hour - start_hour) % 24 or 24)
    end = min(end, end_cap)
    if last_ts < start:
        start -= timedelta(days=1)
        end -= timedelta(days=1)
    start = min(start, end)
    return start, end


def build_full_history_window(points: list[SeriesPoint], end_cap: datetime) -> tuple[datetime, datetime]:
    if not points:
        raise ValueError("No hay puntos para calcular ventana")
    start = min(p.timestamp for p in points)
    end = min(max(p.timestamp for p in points), end_cap)
    return start, max(start, end)


def _auto_yrange(points: list[SeriesPoint], *, padding: float = 0.12) -> tuple[float, float]:
    weights = [p.weight for p in points if p.weight is not None]
    if not weights:
        return 0.0, 350.0
    lo, hi = min(weights), max(weights)
    span = max(hi - lo, 10.0)
    return max(0.0, lo - span * padding), hi + span * padding


_RANGE_BUTTONS = [
    dict(count=1,  label="1h",  step="hour", stepmode="backward"),
    dict(count=6,  label="6h",  step="hour", stepmode="backward"),
    dict(count=24, label="24h", step="hour", stepmode="backward"),
    dict(count=7,  label="7d",  step="day",  stepmode="backward"),
    dict(step="all", label="Todo"),
]


def build_device_figure(
    device_code: str,
    points: list[SeriesPoint],
    *,
    end_cap: datetime,
) -> tuple[go.Figure, float | None, tuple[datetime, datetime]]:
    titles = {
        "KPCL0034": "KPCL0034 · Comedero — Peso bruto / Contenido neto / Eventos",
        "KPCL0036": "KPCL0036 · Bebedero — Peso bruto / Eventos",
    }
    fig = make_subplots(rows=1, cols=1, subplot_titles=(titles.get(device_code, device_code),))

    full_history = os.environ.get("FULL_HISTORY_0034", "1").strip().lower() in {"1", "true", "yes"}
    if device_code == "KPCL0034" and full_history:
        window_start, window_end = build_full_history_window(points, end_cap)
    elif device_code == "KPCL0034":
        window_start, window_end = build_fixed_window(points, start_hour=21, end_hour=1, end_cap=end_cap)
    else:
        window_start, window_end = build_device_window(points, end_cap)

    raw_weights = [p.weight for p in points if p.weight is not None]
    device_q3 = quantile(raw_weights, 0.75) if raw_weights else None

    seen_bands: set[str] = set()
    y_lo, y_hi = _auto_yrange(points)

    add_series_traces(fig, 1, points, show_legend=True, device_code=device_code)
    add_power_markers(fig, 1, points)
    add_event_bands(fig, 1, points, y_lo=y_lo, y_hi=y_hi, seen_bands=seen_bands)
    add_event_markers(fig, 1, points)

    fig.update_xaxes(
        range=[window_start, window_end],
        tickformat="%d %b\n%H:%M",
        tickangle=0,
        rangeselector=dict(
            buttons=_RANGE_BUTTONS,
            bgcolor="#f1f5f9",
            activecolor="#3b82f6",
            font=dict(size=11, color="#334155"),
        ),
        rangeslider=dict(visible=True, thickness=0.03, bgcolor="#f8fafc"),
        row=1, col=1,
    )
    fig.update_yaxes(
        range=[y_lo, y_hi],
        title_text="Peso (g)",
        gridcolor="#f1f5f9",
        zerolinecolor="#e2e8f0",
        row=1, col=1,
    )
    fig.update_layout(
        template="plotly_white",
        height=540,
        width=1920,
        legend=dict(
            orientation="h",
            yanchor="bottom", y=1.02,
            xanchor="right", x=1,
            bgcolor="rgba(255,255,255,0.85)",
            bordercolor="#e2e8f0",
            borderwidth=1,
            font=dict(size=12),
        ),
        margin=dict(l=80, r=50, t=80, b=60),
        font=dict(size=13, family="Inter, Arial, sans-serif"),
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
        hoverlabel=dict(bgcolor="white", font_size=12,
                        font_family="Inter, Arial, sans-serif", bordercolor="#e2e8f0"),
    )
    fig.update_xaxes(showgrid=True, gridcolor="#f1f5f9", gridwidth=1)
    return fig, device_q3, (window_start, window_end)


def build_battery_figure(points_by_device: dict[str, list[SeriesPoint]]) -> go.Figure:
    fig = make_subplots(rows=1, cols=1)
    add_battery_traces(fig, 1, points_by_device)
    fig.update_xaxes(
        tickformat="%d %b\n%H:%M",
        rangeselector=dict(
            buttons=_RANGE_BUTTONS,
            bgcolor="#f1f5f9",
            activecolor="#3b82f6",
            font=dict(size=11, color="#334155"),
        ),
        rangeslider=dict(visible=True, thickness=0.04, bgcolor="#f8fafc"),
        row=1, col=1,
    )
    fig.update_yaxes(title_text="Batería (%)", range=[0, 108], gridcolor="#f1f5f9", row=1, col=1)
    fig.update_layout(
        template="plotly_white",
        height=300,
        width=1920,
        title=dict(text="Nivel de batería (%)", font=dict(size=14, color="#0f172a"), x=0.02),
        legend=dict(
            orientation="h",
            yanchor="bottom", y=1.02,
            xanchor="right", x=1,
            bgcolor="rgba(255,255,255,0.85)",
            bordercolor="#e2e8f0",
            borderwidth=1,
            font=dict(size=12),
        ),
        margin=dict(l=80, r=50, t=60, b=50),
        font=dict(size=13, family="Inter, Arial, sans-serif"),
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
    )
    fig.update_xaxes(showgrid=True, gridcolor="#f1f5f9", gridwidth=1)
    return fig


def build_export_filename(device_code: str, window_start: datetime, window_end: datetime) -> str:
    # Regla: mantener solo un CSV "actual" por dispositivo.
    return f"{device_code.lower()}_{EXPERIMENT_LABEL}_actual.csv"


def cleanup_old_device_exports(device_code: str, keep_path: Path) -> None:
    pattern = str(ROOT / f"{device_code.lower()}_{EXPERIMENT_LABEL}_*.csv")
    for candidate in glob.glob(pattern):
        path = Path(candidate)
        if path.resolve() == keep_path.resolve():
            continue
        try:
            path.unlink(missing_ok=True)
        except OSError:
            # Best-effort cleanup: no bloquear el flujo por un archivo en uso.
            pass


def build_boxplot_figure(points_by_device: dict[str, list[SeriesPoint]]) -> go.Figure:
    active_devices = [d for d in DEVICE_ORDER if d in points_by_device]
    if not active_devices:
        active_devices = list(DEVICE_ORDER)
    fig = make_subplots(
        rows=1, cols=max(1, len(active_devices)),
        shared_yaxes=True,
        subplot_titles=tuple(f"{d} — boxplot de peso" for d in active_devices),
    )
    device_map = {device_code: idx + 1 for idx, device_code in enumerate(active_devices)}
    fill_colors = {"KPCL0034": "rgba(15,118,110,0.35)", "KPCL0036": "rgba(99,102,241,0.35)"}
    marker_colors = {"KPCL0034": "#0f766e", "KPCL0036": "#6366f1"}

    for device_code, col in device_map.items():
        points = points_by_device.get(device_code, [])
        raw_weights = [p.weight for p in points if p.weight is not None]
        if not raw_weights:
            continue
        q3 = quantile(raw_weights, 0.75)
        weights = [w for w in raw_weights if w <= q3]
        if not weights:
            continue
        fig.add_trace(
            go.Box(
                y=weights,
                name=device_code,
                boxpoints="outliers",
                line_color="#64748b",
                fillcolor=fill_colors[device_code],
                marker=dict(color=marker_colors[device_code]),
                showlegend=False,
            ),
            row=1, col=col,
        )

    lo = min(
        (min(p.weight for p in pts if p.weight is not None) for pts in points_by_device.values() if any(p.weight is not None for p in pts)),
        default=0,
    )
    hi = max(
        (max(p.weight for p in pts if p.weight is not None) for pts in points_by_device.values() if any(p.weight is not None for p in pts)),
        default=350,
    )
    fig.update_yaxes(title_text="Peso (g)", range=[max(0.0, lo * 0.9), hi * 1.1])
    fig.update_layout(
        template="plotly_white",
        height=600,
        width=1400,
        title_text="KPCL — distribución de peso (boxplot, ≤ Q3)",
        margin=dict(l=80, r=40, t=90, b=60),
        font=dict(size=14),
    )
    return fig


def _interval_stats(ivs: list[tuple[datetime, datetime]]) -> dict:
    if not ivs:
        return {"count": 0}
    durations = [(e - s).total_seconds() / 60 for s, e in ivs]
    return {
        "count": len(ivs),
        "dur_avg": sum(durations) / len(durations),
        "dur_min": min(durations),
        "dur_max": max(durations),
        "dur_total": sum(durations),
    }


def _fmt_interval_stats(st: dict) -> str:
    if st["count"] == 0:
        return "Sin datos"
    return (
        f"<b>{st['count']}</b> sesiones · "
        f"prom <b>{st['dur_avg']:.1f} min</b> · "
        f"min {st['dur_min']:.1f} · max {st['dur_max']:.1f} · "
        f"total {st['dur_total']:.0f} min"
    )


def build_stats_html(points_by_device: dict[str, list[SeriesPoint]]) -> str:
    sections: list[str] = []

    for device_code in DEVICE_ORDER:
        points = points_by_device.get(device_code, [])
        audit_pts = [p for p in points if p.is_audit]
        intervals = build_event_intervals(points)
        n_readings = sum(1 for p in points if not p.is_audit and p.weight is not None)

        alim_ivs = [(s, e) for s, e, k in intervals if k == "alimentacion"]
        hidr_ivs = [(s, e) for s, e, k in intervals if k == "hidratacion"]
        serv_ivs = [(s, e) for s, e, k in intervals if k == "servido"]

        alim_st = _interval_stats(alim_ivs)
        hidr_st = _interval_stats(hidr_ivs)
        serv_st = _interval_stats(serv_ivs)

        # Per-session alimentacin table rows
        session_rows_html = ""
        consumed_values: list[float] = []
        for i, (s, e) in enumerate(sorted(alim_ivs, key=lambda x: x[0]), 1):
            dur = (e - s).total_seconds() / 60
            w_start = _weight_at(points, s)
            w_end = _weight_at(points, e)
            consumed_str = "—"
            if w_start is not None and w_end is not None:
                delta = w_start - w_end
                consumed_str = f"{delta:.0f} g" if abs(delta) > 0.5 else "~0 g"
                if abs(delta) > 0.5:
                    consumed_values.append(delta)
            s_iso = s.isoformat().replace("+00:00", "Z")
            e_iso = e.isoformat().replace("+00:00", "Z")
            session_rows_html += (
                f"<tr class='session-row' data-device='{device_code}' "
                f"data-start='{s_iso}' data-end='{e_iso}' "
                f"onclick='zoomToEvent(this)' "
                f"style='cursor:pointer' title='Click para ver en el gráfico'>"
                f"<td style='padding:5px 10px;border-bottom:1px solid #e2e8f0'>{i}</td>"
                f"<td style='padding:5px 10px;border-bottom:1px solid #e2e8f0'>{s.strftime('%Y-%m-%d %H:%M')} UTC</td>"
                f"<td style='padding:5px 10px;border-bottom:1px solid #e2e8f0'>{e.strftime('%H:%M')} UTC</td>"
                f"<td style='padding:5px 10px;border-bottom:1px solid #e2e8f0'>{dur:.1f} min</td>"
                f"<td style='padding:5px 10px;border-bottom:1px solid #e2e8f0'>{consumed_str}</td>"
                f"</tr>"
            )

        consumed_summary = ""
        if consumed_values:
            consumed_summary = (
                f"· consumo prom <b>{sum(consumed_values)/len(consumed_values):.0f}g</b> "
                f"(min {min(consumed_values):.0f}g · max {max(consumed_values):.0f}g · "
                f"total {sum(consumed_values):.0f}g)"
            )

        session_table = ""
        if alim_ivs:
            session_table = f"""
          <details open style="margin-top:14px">
            <summary style="cursor:pointer;font-size:13px;font-weight:500;color:#334155;padding:4px 0;user-select:none">
              Detalle sesiones de alimentación ({len(alim_ivs)}) {consumed_summary}
            </summary>
            <table style="border-collapse:collapse;font-size:13px;width:100%;max-width:680px;margin-top:8px">
              <thead>
                <tr style="background:#f0fdf4;text-align:left">
                  <th style="padding:5px 10px;border-bottom:1px solid #bbf7d0">#</th>
                  <th style="padding:5px 10px;border-bottom:1px solid #bbf7d0">Inicio</th>
                  <th style="padding:5px 10px;border-bottom:1px solid #bbf7d0">Fin</th>
                  <th style="padding:5px 10px;border-bottom:1px solid #bbf7d0">Duración</th>
                  <th style="padding:5px 10px;border-bottom:1px solid #bbf7d0">Consumido (Δpeso)</th>
                </tr>
              </thead>
              <tbody>{session_rows_html}</tbody>
            </table>
          </details>"""

        section = f"""
        <div style="margin-bottom:30px;padding-bottom:20px;border-bottom:1px solid #e2e8f0">
          <h3 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px">
            {device_code} · {DEVICE_TYPE.get(device_code, "")}
            <span style="font-size:11px;font-weight:400;color:#64748b;margin-left:10px">
              {n_readings:,} lecturas · {len(audit_pts)} audit events
            </span>
          </h3>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 18px;min-width:240px">
              <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Alimentación</div>
              <div style="font-size:13px;color:#0f172a;margin-top:6px">{_fmt_interval_stats(alim_st)}</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 18px;min-width:240px">
              <div style="font-size:11px;color:#0284c7;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Hidratación</div>
              <div style="font-size:13px;color:#0f172a;margin-top:6px">{_fmt_interval_stats(hidr_st)}</div>
            </div>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 18px;min-width:200px">
              <div style="font-size:11px;color:#ea580c;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Servido</div>
              <div style="font-size:13px;color:#0f172a;margin-top:6px">{_fmt_interval_stats(serv_st)}</div>
            </div>
          </div>
          {session_table}
        </div>"""
        sections.append(section)

    return "\n".join(sections)


_PLOT_CONFIG = {
    "responsive": True,
    "displaylogo": False,
    "toImageButtonOptions": {"format": "svg", "filename": "kpcl_plot", "height": 1380, "width": 1920},
    "modeBarButtonsToRemove": ["autoScale2d", "lasso2d", "select2d"],
}


def write_and_open(
    device_figs: dict[str, go.Figure],
    battery_fig: go.Figure,
    boxplot: go.Figure,
    *,
    window_map: dict[str, tuple[datetime, datetime]],
    q3_map: dict[str, float | None],
    stats_html: str,
    supabase_url: str = "",
    device_uuid_map: dict[str, str] | None = None,
    open_browser: bool = True,
) -> Path:
    import json as _json
    device_uuid_json = _json.dumps(device_uuid_map or {})
    sb_url = supabase_url.rstrip("/")
    device_codes_js = "var codes = " + _json.dumps(list(DEVICE_ORDER)) + ";"
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    now_utc = datetime.now(timezone.utc)

    # First figure carries plotly.js; rest reference it.
    device_htmls: dict[str, str] = {}
    for idx, device_code in enumerate(DEVICE_ORDER):
        fig = device_figs[device_code]
        include_js = "cdn" if idx == 0 else False
        device_htmls[device_code] = fig.to_html(
            full_html=False, include_plotlyjs=include_js, config=_PLOT_CONFIG,
            div_id=f"chart_{device_code}",
        )
    batt_html = battery_fig.to_html(
        full_html=False, include_plotlyjs=False, config=_PLOT_CONFIG,
        div_id="chart_battery",
    )
    box_html = boxplot.to_html(full_html=False, include_plotlyjs=False, config=_PLOT_CONFIG)

    def _stale_badge(fin_dt: datetime) -> str:
        days = (now_utc.date() - fin_dt.date()).days
        if days <= 0:
            return ""
        color = "#dc2626" if days >= 3 else "#f59e0b"
        tip = f"{days}d sin datos nuevos — último: {fin_dt:%Y-%m-%d}"
        return (
            f' <span title="{tip}" style="cursor:help;background:{color};color:#fff;'
            f'border-radius:50%;width:18px;height:18px;display:inline-flex;'
            f'align-items:center;justify-content:center;font-size:11px;font-weight:bold'
            f';vertical-align:middle;margin-left:4px">?</span>'
        )

    window_rows = "".join(
        f"<tr><td><b>{device}</b></td>"
        f"<td>{window_map[device][0]:%Y-%m-%d %H:%M} UTC</td>"
        f"<td>{window_map[device][1]:%Y-%m-%d %H:%M} UTC{_stale_badge(window_map[device][1])}</td>"
        f"<td>{'Q3: ' + f'{q3_map[device]:.1f}g' if q3_map.get(device) is not None else '—'}</td></tr>"
        for device in DEVICE_ORDER if device in window_map
    )

    device_cards = ""
    for device_code in DEVICE_ORDER:
        label = {"KPCL0034": "Comedero", "KPCL0036": "Bebedero"}.get(device_code, device_code)
        device_cards += f"""
    <div class="card">
      <h2>{device_code} · {label}</h2>
      {device_htmls[device_code]}
    </div>"""

    html_text = f"""<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>KPCL — Análisis de peso</title>
  <style>
    :root {{
      --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
      --text: #0f172a; --muted: #64748b; --accent: #3b82f6;
    }}
    [data-theme="dark"] {{
      --bg: #0f172a; --surface: #1e293b; --border: #334155;
      --text: #f1f5f9; --muted: #94a3b8; --accent: #60a5fa;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: Inter, -apple-system, Arial, sans-serif;
            background: var(--bg); color: var(--text); font-size: 14px; }}
    header {{ position: sticky; top: 0; z-index: 100;
              background: var(--surface); border-bottom: 1px solid var(--border);
              padding: 10px 28px; display: flex; align-items: center;
              justify-content: space-between; gap: 16px; }}
    header h1 {{ font-size: 15px; font-weight: 600; color: var(--text); }}
    .badge {{ font-size: 11px; color: var(--muted); }}
    .theme-btn {{ cursor: pointer; border: 1px solid var(--border); border-radius: 6px;
                  padding: 4px 10px; background: var(--surface); color: var(--text);
                  font-size: 12px; white-space: nowrap; }}
    main {{ padding: 24px 28px; max-width: 2000px; }}
    .card {{ background: var(--surface); border: 1px solid var(--border);
             border-radius: 10px; padding: 18px 22px; margin-bottom: 28px; }}
    .card h2 {{ font-size: 13px; font-weight: 600; color: var(--muted);
                text-transform: uppercase; letter-spacing: .05em; margin-bottom: 14px; }}
    table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
    th {{ padding: 7px 14px; background: var(--bg); color: var(--muted);
          font-weight: 500; font-size: 11px; text-transform: uppercase;
          letter-spacing: .04em; text-align: left; border-bottom: 1px solid var(--border); }}
    td {{ padding: 7px 14px; border-bottom: 1px solid var(--border); }}
    tr:last-child td {{ border-bottom: none; }}
    .legend {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }}
    .legend-item {{ display: flex; align-items: center; gap: 7px; font-size: 12px;
                    color: var(--muted); }}
    .swatch {{ width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0; }}
    .meta-table td {{ padding: 3px 14px; border: none; color: var(--muted); font-size: 12px; }}
    .meta-table td:first-child {{ color: var(--text); font-weight: 500; }}
    details summary::-webkit-details-marker {{ display: none; }}
    details summary::before {{ content: "▶ "; font-size: 10px; }}
    details[open] summary::before {{ content: "▼ "; }}
    .session-row:hover {{ background: #f0fdf4; }}
    .session-row.row-active {{ background: #dcfce7 !important; outline: 2px solid #16a34a; outline-offset: -2px; }}
    /* ── Modal categorización ── */
    #cat-modal {{ display:none;position:fixed;inset:0;background:rgba(15,23,42,0.6);
                  z-index:1000;align-items:center;justify-content:center; }}
    #cat-modal.open {{ display:flex; }}
    .modal-card {{ background:#fff;border-radius:14px;padding:28px 30px;max-width:540px;
                   width:94%;box-shadow:0 24px 64px rgba(0,0,0,0.28);position:relative; }}
    .modal-card h3 {{ font-size:15px;font-weight:600;color:#0f172a;margin-bottom:16px; }}
    .modal-meta {{ display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
                   background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:20px; }}
    .modal-meta span {{ font-size:11px;color:#64748b;display:block;margin-bottom:3px; }}
    .modal-meta b {{ font-size:13px;color:#0f172a; }}
    .cat-group {{ margin-bottom:16px; }}
    .cat-group-label {{ font-size:11px;color:#64748b;font-weight:600;
                        text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px; }}
    .cat-btn {{ padding:7px 14px;border-radius:6px;border:1.5px solid #cbd5e1;
                background:#fff;color:#334155;cursor:pointer;font-size:13px;
                transition:all .15s; }}
    .cat-btn:hover {{ border-color:#94a3b8;background:#f8fafc; }}
    .cat-btn.active {{ border-color:#16a34a;background:#f0fdf4;color:#15803d;font-weight:600; }}
    .cat-btn.blue.active {{ border-color:#0284c7;background:#eff6ff;color:#0369a1; }}
    .cat-btn.orange.active {{ border-color:#ea580c;background:#fff7ed;color:#c2410c; }}
    .modal-footer {{ display:flex;justify-content:flex-end;gap:10px;margin-top:20px; }}
    .btn-cancel {{ padding:8px 18px;border-radius:6px;border:1px solid #cbd5e1;
                   background:#fff;color:#64748b;cursor:pointer;font-size:13px; }}
    .btn-save {{ padding:8px 20px;border-radius:6px;border:none;background:#16a34a;
                 color:#fff;cursor:pointer;font-size:13px;font-weight:500; }}
    .btn-save:disabled {{ background:#86efac;cursor:not-allowed; }}
    #toast {{ position:fixed;bottom:28px;right:28px;background:#0f172a;color:#fff;
              padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;
              z-index:2000;opacity:0;transform:translateY(16px);
              transition:opacity .3s,transform .3s;pointer-events:none; }}
  </style>
</head>
<body>
  <header>
    <h1>KPCL — Análisis de peso y eventos</h1>
    <span class="badge">Generado: {generated}</span>
    <button id="refresh-btn" class="theme-btn" style="background:#16a34a;color:#fff;border-color:#15803d" onclick="refreshDataAndCsv()">Actualizar CSV + vista</button>
    <button class="theme-btn" onclick="
      const h=document.documentElement;
      h.dataset.theme=h.dataset.theme==='dark'?'light':'dark';
      this.textContent=h.dataset.theme==='dark'?'☀ Claro':'☾ Oscuro';
    ">☾ Oscuro</button>
  </header>
  <main>
    <div class="card">
      <h2>Ventana de datos</h2>
      <div id="refresh-wrap" style="display:none;margin-bottom:10px;max-width:560px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Actualizando desde Supabase...</div>
        <div style="height:10px;background:#dcfce7;border:1px solid #86efac;border-radius:999px;overflow:hidden">
          <div id="refresh-bar" style="height:100%;width:6%;background:#16a34a;transition:width .45s ease"></div>
        </div>
        <div id="refresh-status" style="font-size:12px;color:#166534;margin-top:6px"></div>
      </div>
      <table class="meta-table">
        <tr><th>Device</th><th>Inicio</th><th>Fin</th><th>Q3 peso</th></tr>
        {window_rows}
      </table>
    </div>

    <div class="card">
      <h2>Leyenda de bandas</h2>
      <div class="legend">
        <div class="legend-item">
          <div class="swatch" style="background:rgba(34,197,94,0.45);border:2px solid #16a34a"></div>
          Alimentación — verde
        </div>
        <div class="legend-item">
          <div class="swatch" style="background:rgba(14,165,233,0.45);border:2px solid #0284c7"></div>
          Hidratación — azul
        </div>
        <div class="legend-item">
          <div class="swatch" style="background:rgba(249,115,22,0.40);border:2px solid #ea580c"></div>
          Servido — naranja
        </div>
        <div class="legend-item">
          <div class="swatch" style="background:#e05c4a;border-radius:50%"></div>
          KPCL0034 comedero
        </div>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:8px">
        Línea continua = peso bruto · Área morada = contenido neto ·
        ◆ = evento manual · Cada gráfico tiene su propio selector de rango independiente.
      </p>
    </div>

    <div class="card">
      <h2>Datos descriptivos — sesiones de alimentación e hidratación</h2>
      {stats_html}
    </div>

    {device_cards}

    <div class="card">
      <h2>Distribución de peso — boxplot (≤ Q3)</h2>
      {box_html}
    </div>
  </main>

  <!-- ── Modal de categorización ── -->
  <div id="cat-modal">
    <div class="modal-card">
      <h3>Categorizar punto</h3>
      <div class="modal-meta">
        <div><span>Device</span><b id="m-device"></b></div>
        <div><span>Timestamp (UTC)</span><b id="m-ts"></b></div>
        <div><span>Peso</span><b id="m-weight"></b></div>
      </div>
      <div class="cat-group">
        <div class="cat-group-label" style="color:#16a34a">Alimentación</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="cat-btn" onclick="selectCat(this,'inicio_alimentacion','Inicio alimentacion')">&#9654; Inicio alimentacion</button>
          <button class="cat-btn" onclick="selectCat(this,'termino_alimentacion','Termino alimentacion')">&#9632; Termino alimentacion</button>
        </div>
      </div>
      <div class="cat-group">
        <div class="cat-group-label" style="color:#0284c7">Hidratación</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="cat-btn blue" onclick="selectCat(this,'inicio_hidratacion','Inicio hidratacion')">&#9654; Inicio hidratacion</button>
          <button class="cat-btn blue" onclick="selectCat(this,'termino_hidratacion','Termino hidratacion')">&#9632; Termino hidratacion</button>
        </div>
      </div>
      <div class="cat-group">
        <div class="cat-group-label" style="color:#ea580c">Servido / Plato</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="cat-btn orange" onclick="selectCat(this,'inicio_servido','Inicio servido')">▶ Inicio servido</button>
          <button class="cat-btn orange" onclick="selectCat(this,'termino_servido','Término servido')">■ Término servido</button>
          <button class="cat-btn orange" onclick="selectCat(this,'kpcl_sin_plato','KPCL sin plato')">Sin plato</button>
          <button class="cat-btn orange" onclick="selectCat(this,'kpcl_con_plato','KPCL con plato')">Con plato</button>
          <button class="cat-btn orange" onclick="selectCat(this,'tare_con_plato','Tare con plato')">Tare con plato</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
        <button class="btn-cancel" onclick="downloadPendingEvents()">Descargar pendientes</button>
        <button class="btn-save" id="m-save" disabled onclick="saveEvent()">Guardar evento</button>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:10px">
        Sin credenciales en este HTML: se guarda localmente y luego se sincroniza en lote.
      </p>
    </div>
  </div>

  <div id="toast"></div>

  <script>
  var KPCL = {{
    supabaseUrl: "{sb_url}",
    supabaseKey: "",
    deviceUuids: {device_uuid_json}
  }};
  var KPCL_PENDING_KEY = 'kpcl_manual_events_pending_v1';
  var _ev = null;

  /* ── Zoom desde tabla de sesiones ── */
  function zoomToEvent(row) {{
    var device = row.dataset.device;
    var t0 = new Date(new Date(row.dataset.start).getTime() - 5*60*1000).toISOString();
    var t1 = new Date(new Date(row.dataset.end).getTime()   + 5*60*1000).toISOString();
    var el = document.getElementById('chart_' + device);
    if (!el) return;
    el.scrollIntoView({{ behavior:'smooth', block:'center' }});
    Plotly.relayout('chart_' + device, {{'xaxis.range': [t0, t1]}});
    document.querySelectorAll('.session-row').forEach(function(r) {{ r.classList.remove('row-active'); }});
    row.classList.add('row-active');
  }}

  /* ── Click en punto del gráfico -> abrir modal ── */
  function attachClicks() {{
    {device_codes_js}
    codes.forEach(function(code) {{
      var el = document.getElementById('chart_' + code);
      if (!el || !el.on) return;
      el.on('plotly_click', function(data) {{
        var pt = data.points[0];
        var name = (pt.data && pt.data.name) || '';
        /* ignorar clics en bandas de eventos */
        if (name === 'Alimentación' || name === 'Hidratación' || name === 'Servido') return;
        /* normalizar timestamp a ISO UTC */
        var raw = pt.x;
        var ts;
        if (typeof raw === 'number') {{
          ts = new Date(raw).toISOString();
        }} else {{
          ts = String(raw).replace(' ','T');
          if (!ts.endsWith('Z') && ts.indexOf('+') === -1) ts += 'Z';
        }}
        openModal(code, ts, pt.y);
      }});
    }});
  }}
  document.addEventListener('DOMContentLoaded', function() {{
    /* Plotly divs se renderizan síncronamente, pero esperamos un tick */
    setTimeout(attachClicks, 500);
  }});

  /* ── Modal ── */
  function openModal(deviceCode, ts, weight) {{
    _ev = {{ deviceCode: deviceCode, ts: ts, weight: weight, category: null, label: null }};
    document.getElementById('m-device').textContent = deviceCode;
    document.getElementById('m-ts').textContent = ts.replace('T',' ').slice(0,19);
    document.getElementById('m-weight').textContent = (weight != null ? weight.toFixed(1) + ' g' : '-');
    document.querySelectorAll('.cat-btn').forEach(function(b) {{ b.classList.remove('active'); }});
    document.getElementById('m-save').disabled = true;
    document.getElementById('cat-modal').classList.add('open');
  }}
  function closeModal() {{
    document.getElementById('cat-modal').classList.remove('open');
    _ev = null;
  }}
  /* cerrar con click fuera */
  document.getElementById('cat-modal').addEventListener('click', function(e) {{
    if (e.target === this) closeModal();
  }});

  function selectCat(btn, category, label) {{
    document.querySelectorAll('.cat-btn').forEach(function(b) {{ b.classList.remove('active'); }});
    btn.classList.add('active');
    _ev.category = category;
    _ev.label = label;
    document.getElementById('m-save').disabled = false;
  }}

  function getPendingEvents() {{
    try {{
      var raw = localStorage.getItem(KPCL_PENDING_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }} catch (e) {{
      return [];
    }}
  }}

  function setPendingEvents(items) {{
    localStorage.setItem(KPCL_PENDING_KEY, JSON.stringify(items));
  }}

  function enqueuePendingEvent(item) {{
    var queue = getPendingEvents();
    var key = [item.device_uuid, item.created_at, item.category].join('|');
    var exists = queue.some(function(x) {{
      return [x.device_uuid, x.created_at, x.category].join('|') === key;
    }});
    if (!exists) {{
      queue.push(item);
      setPendingEvents(queue);
    }}
    return queue.length;
  }}

  function downloadPendingEvents() {{
    var queue = getPendingEvents();
    if (!queue.length) {{
      showToast('No hay eventos pendientes para exportar.');
      return;
    }}
    var payload = {{
      exported_at: new Date().toISOString(),
      source: 'kpcl_plot_local_queue',
      count: queue.length,
      events: queue
    }};
    var blob = new Blob([JSON.stringify(payload, null, 2)], {{ type: 'application/json' }});
    var a = document.createElement('a');
    var stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = 'kpcl_eventos_pendientes_' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {{
      URL.revokeObjectURL(a.href);
      a.remove();
    }}, 0);
    showToast('Pendientes exportados: ' + queue.length);
  }}

  async function saveEvent() {{
    if (!_ev || !_ev.category) return;
    var uuid = KPCL.deviceUuids[_ev.deviceCode];
    if (!uuid) {{ alert('UUID de device no disponible — recarga tras cargar desde Supabase.'); return; }}
    var btn = document.getElementById('m-save');
    btn.disabled = true; btn.textContent = 'Guardando…';
    var body = JSON.stringify({{
      event_type: 'manual_bowl_category',
      entity_type: 'device',
      entity_id: uuid,
      payload: {{ category: _ev.category, category_label: _ev.label, source: 'kpcl_plot_manual',
                  weight_at_event: _ev.weight }},
      created_at: _ev.ts
    }});
    try {{
      if (!KPCL.supabaseKey) throw new Error('NO_KEY');
      var resp = await fetch(KPCL.supabaseUrl + '/rest/v1/audit_events', {{
        method: 'POST',
        headers: {{
          'apikey': KPCL.supabaseKey,
          'Authorization': 'Bearer ' + KPCL.supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }},
        body: body
      }});
      if (!resp.ok) {{ var txt = await resp.text(); throw new Error(resp.status + ': ' + txt); }}
      closeModal();
      showToast('✓ Guardado en Supabase: "' + _ev.label + '" en ' + _ev.ts.slice(0,16) + ' UTC');
    }} catch(e) {{
      var pendingCount = enqueuePendingEvent({{
        device_code: _ev.deviceCode,
        device_uuid: uuid,
        category: _ev.category,
        category_label: _ev.label,
        created_at: _ev.ts,
        payload: {{
          category: _ev.category,
          category_label: _ev.label,
          source: 'kpcl_plot_manual_local_queue',
          weight_at_event: _ev.weight
        }}
      }});
      closeModal();
      showToast('Guardado local (pendiente sync): ' + _ev.label + ' · pendientes ' + pendingCount);
    }} finally {{
      btn.disabled = false; btn.textContent = 'Guardar evento';
    }}
  }}

  /* ── Toast ── */
  function showToast(msg) {{
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function() {{ t.style.opacity='0'; t.style.transform='translateY(16px)'; }}, 4500);
  }}

  async function refreshDataAndCsv() {{
    if (window.location.protocol === 'file:') {{
      showToast('Abre el dashboard en http://127.0.0.1:8765/ para actualizar.');
      window.open('http://127.0.0.1:8765/', '_blank');
      return;
    }}
    var btn = document.getElementById('refresh-btn');
    var wrap = document.getElementById('refresh-wrap');
    var bar = document.getElementById('refresh-bar');
    var status = document.getElementById('refresh-status');
    btn.disabled = true;
    btn.textContent = 'Actualizando...';
    wrap.style.display = 'block';
    status.textContent = '';
    var pct = 6;
    bar.style.width = pct + '%';
    var timer = setInterval(function() {{
      pct = Math.min(92, pct + (pct < 40 ? 9 : pct < 70 ? 5 : 2));
      bar.style.width = pct + '%';
    }}, 450);
    try {{
      var resp = await fetch('/refresh', {{ method: 'POST' }});
      if (!resp.ok) {{
        var txt = await resp.text();
        throw new Error('HTTP ' + resp.status + ' ' + txt);
      }}
      bar.style.width = '100%';
      status.textContent = 'Actualizado';
      setTimeout(function() {{
        var u = new URL(window.location.href);
        u.searchParams.set('v', Date.now().toString());
        window.location.href = u.toString();
      }}, 700);
    }} catch (e) {{
      status.textContent = 'No se pudo actualizar automáticamente. Ejecuta: python Docs/investigacion/plot_kpcl_experimento.py';
      showToast('Error de actualización local: ' + e.message);
    }} finally {{
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = 'Actualizar CSV + vista';
    }}
  }}
  </script>
</body>
</html>"""
    # Use UTF-8 with BOM to improve compatibility when opening local HTML files
    # directly in browsers/OS configurations that mis-detect plain UTF-8.
    OUTPUT_HTML.write_text(html_text, encoding="utf-8-sig")
    if open_browser:
        webbrowser.open_new_tab(OUTPUT_HTML.resolve().as_uri())
    return OUTPUT_HTML


def generate_dashboard(*, open_browser: bool = True) -> Path:
    load_env_from_file(ENV_FILE)
    combined_spec = Dataset(
        path=COMBINED_CSV,
        title="KPCL0034 + KPCL0036 — experimento",
        time_column="event_at",
        weight_column="weight_grams",
        device_column="device_code",
    )

    force_local_csv = os.environ.get("FORCE_LOCAL_CSV", "").strip() in {"1", "true", "TRUE", "yes", "YES"}
    data_source = ""
    if not force_local_csv and (os.environ.get(SUPABASE_DB_URL) or os.environ.get(SUPABASE_URL_KEY)):
        try:
            fetch_end = datetime.now(timezone.utc)
            raw_rows = load_rows_from_supabase(start=WINDOW_START_UTC, end=fetch_end)
            data_source = "supabase"
        except Exception as exc:
            print(f"[warn] Supabase no disponible ({exc!s:.120})")
            print("[warn] Usando CSV local como fallback.")
            raw_rows = load_rows(combined_spec)
            data_source = "csv (fallback)"
    else:
        raw_rows = load_rows(combined_spec)
        data_source = "csv"
    print(f"[info] Fuente de datos: {data_source} — {len(raw_rows)} filas")

    raw_points = rows_to_points(raw_rows, combined_spec)
    window_start, window_end = utc_window_from_points(raw_points)

    filtered_rows = {
        device_code: [
            row for row in raw_rows
            if row.get("device_code", "").strip() == device_code
            and window_start <= parse_timestamp(row.get("event_at", "").strip()) <= window_end
        ]
        for device_code in DEVICE_ORDER
    }
    fieldnames = list(raw_rows[0].keys()) if raw_rows else []
    export_paths = {
        device_code: ROOT / build_export_filename(device_code, window_start, window_end)
        for device_code in DEVICE_ORDER
    }
    for device_code, rows in filtered_rows.items():
        export_rows(rows, output_path=export_paths[device_code], fieldnames=fieldnames)
        cleanup_old_device_exports(device_code, export_paths[device_code])

    points_by_device = {
        device_code: rows_to_points(filtered_rows[device_code], combined_spec, device_code=device_code)
        for device_code in DEVICE_ORDER
    }

    end_cap = max(
        (p.timestamp for dp in points_by_device.values() for p in dp),
        default=datetime.now(timezone.utc),
    )
    device_figs: dict[str, go.Figure] = {}
    device_q3: dict[str, float | None] = {}
    window_map: dict[str, tuple[datetime, datetime]] = {}
    for device_code in DEVICE_ORDER:
        pts = points_by_device.get(device_code, [])
        dfig, q3, win = build_device_figure(device_code, pts, end_cap=end_cap)
        device_figs[device_code] = dfig
        device_q3[device_code] = q3
        window_map[device_code] = win
    battery_fig = build_battery_figure(points_by_device)
    boxplot_fig = build_boxplot_figure(points_by_device)
    stats = build_stats_html(points_by_device)

    device_uuid_map: dict[str, str] = {}
    for row in raw_rows:
        code = row.get("device_code", "").strip()
        uuid = row.get("device_uuid", "").strip()
        if code and uuid and code not in device_uuid_map:
            device_uuid_map[code] = uuid

    output = write_and_open(
        device_figs, battery_fig, boxplot_fig,
        window_map=window_map, q3_map=device_q3, stats_html=stats,
        supabase_url=os.environ.get(SUPABASE_URL_KEY, ""),
        device_uuid_map=device_uuid_map,
        open_browser=open_browser,
    )
    print(f"Vista interactiva abierta: {output}")
    for device_code in DEVICE_ORDER:
        print(f"CSV exportado: {export_paths[device_code]}")
    return output


_refresh_lock = threading.Lock()


class _DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):  # noqa: A002
        pass  # silenciar logs HTTP por defecto

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/?"):
            try:
                content = OUTPUT_HTML.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except Exception as exc:
                self.send_error(500, str(exc))
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/refresh":
            if not _refresh_lock.acquire(blocking=False):
                self.send_error(503, "Refresh ya en curso")
                return
            try:
                generate_dashboard(open_browser=False)
                body = b'{"ok":true}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:
                self.send_error(500, str(exc))
            finally:
                _refresh_lock.release()
        else:
            self.send_error(404)


def main() -> None:
    generate_dashboard(open_browser=False)
    try:
        server = HTTPServer(("127.0.0.1", HTTP_PORT), _DashboardHandler)
    except OSError:
        # Puerto ocupado — abre directo como file:// (fallback)
        print(f"[warn] Puerto {HTTP_PORT} ocupado — abriendo como file://")
        webbrowser.open_new_tab(OUTPUT_HTML.resolve().as_uri())
        return
    url = f"http://127.0.0.1:{HTTP_PORT}/"
    print(f"[server] Dashboard en {url}  (Ctrl+C para salir)")
    webbrowser.open_new_tab(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[server] Servidor detenido.")


if __name__ == "__main__":
    main()
