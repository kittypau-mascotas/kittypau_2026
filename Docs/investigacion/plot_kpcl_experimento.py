"""Vista interactiva y exportador canonico de las pruebas KPCL.

Abre una pestaña del navegador con tres paneles:

1. KPCL0034 — peso bruto + contenido neto de comida + eventos.
2. KPCL0036 — peso bruto + eventos.
3. Nivel de bateria de ambos dispositivos.

Ademas exporta la data filtrada de cada device desde el inicio del 2026-04-04
UTC hasta el ultimo timestamp disponible en el CSV compartido.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import sys
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
import webbrowser

import psycopg2
import plotly.graph_objects as go
from plotly.subplots import make_subplots


ROOT = Path(__file__).resolve().parent
COMBINED_CSV = ROOT / "kpcl0034_kpcl0036_prueba_sincargador.csv"
OUTPUT_HTML = ROOT / "kpcl_pruebas_eventos.html"
EXPERIMENT_LABEL = "sin_bateria"
DEVICE_ORDER = ("KPCL0034", "KPCL0036")
WINDOW_START_UTC = datetime(2020, 1, 1, tzinfo=timezone.utc)
ENV_FILE = ROOT.parent.parent / ".env.local"
SUPABASE_DB_URL = "SUPABASE_DB_URL"
SUPABASE_DB_POOLER_URL = "SUPABASE_DB_POOLER_URL"

# plotly subplot axis names: row → (xaxis_name, yaxis_name)
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
    "inicio_alimentacion": "Inicio alimentacion",
    "termino_alimentacion": "Termino alimentacion",
    "inicio_hidratacion": "Inicio hidratacion",
    "termino_hidratacion": "Termino hidratacion",
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


def load_rows_from_supabase(*, start: datetime, end: datetime) -> list[dict[str, str]]:
    db_url = os.environ.get(SUPABASE_DB_URL)
    pooler_url = os.environ.get(SUPABASE_DB_POOLER_URL)
    if not db_url:
        raise ValueError(
            f"No se encontro {SUPABASE_DB_URL}. Define el connection string en .env.local."
        )
    sql = build_supabase_sql()
    chosen_url = pooler_url or db_url
    label = "pooler" if pooler_url else "directo"
    print(f"[supabase] usando {label}: {describe_dsn(chosen_url)}")
    with connect_supabase(chosen_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (start, end))
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, record)) for record in cur.fetchall()]
    return [normalize_row(row) for row in rows]


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
    """Return (xref, yref) for placing annotations at the top of a subplot."""
    xaxis, yaxis = ROW_AXES.get(row, ("x", "y"))
    return xaxis, f"{yaxis} domain"


def add_power_markers(fig: go.Figure, row: int, points: list[SeriesPoint]) -> None:
    if not points:
        return
    xref, yref = _annotation_refs(row)

    # Prefer explicit kpcl_apagado audit events; fall back to device_offline_detected.
    off_events = sorted(
        p.timestamp for p in points
        if p.is_audit and p.evento in ("kpcl_apagado", "device_offline_detected")
    )
    for ts in off_events:
        fig.add_vline(
            x=ts, line_width=1, line_dash="dot",
            line_color=EVENT_COLORS["kpcl_apagado"], row=row, col=1,
        )
        fig.add_annotation(
            x=ts, y=0.98, xref=xref, yref=yref,
            text=EVENT_LABELS["kpcl_apagado"],
            showarrow=False, xanchor="left", yanchor="top",
            font=dict(size=10, color=EVENT_COLORS["kpcl_apagado"]),
        )

    # Prefer explicit kpcl_prendido events; fall back to first reading + reading after offline.
    on_explicit = [p.timestamp for p in points if p.is_audit and p.evento == "kpcl_prendido"]
    if on_explicit:
        on_events = sorted(set(on_explicit))
    else:
        reading_points = [p for p in points if p.weight is not None]
        on_events = []
        if reading_points:
            on_events.append(reading_points[0].timestamp)
            for off_ts in off_events:
                next_after = next((p.timestamp for p in reading_points if p.timestamp > off_ts), None)
                if next_after:
                    on_events.append(next_after)
        on_events = sorted(set(on_events))

    for ts in on_events:
        fig.add_vline(
            x=ts, line_width=1, line_dash="dot",
            line_color=EVENT_COLORS["kpcl_prendido"], row=row, col=1,
        )
        fig.add_annotation(
            x=ts, y=0.92, xref=xref, yref=yref,
            text=EVENT_LABELS["kpcl_prendido"],
            showarrow=False, xanchor="left", yanchor="top",
            font=dict(size=10, color=EVENT_COLORS["kpcl_prendido"]),
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


def add_event_bands(fig: go.Figure, row: int, points: list[SeriesPoint]) -> None:
    xref, yref = _annotation_refs(row)
    intervals = build_event_intervals(points)
    label_offset = 0
    for start, end, band_key in intervals:
        style = BAND_STYLES.get(band_key, BAND_STYLES["servido"])
        fig.add_vrect(
            x0=start, x1=end,
            fillcolor=style["fillcolor"],
            opacity=1.0,
            line_width=1.5,
            line_color=style["line_color"],
            row=row, col=1,
            layer="below",
        )
        y_pos = 0.84 - (label_offset % 4) * 0.08
        label_offset += 1
        fig.add_annotation(
            x=start, y=y_pos,
            xref=xref, yref=yref,
            text=style["label"],
            showarrow=False, xanchor="left", yanchor="bottom",
            font=dict(size=11, color=style["line_color"], family="Arial"),
            bgcolor="rgba(255,255,255,0.82)",
            bordercolor=style["line_color"],
            borderpad=2,
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
    # Only show markers for audit events — never for sensor reading rows.
    marker_points = [p for p in points if p.is_audit and p.evento in key_events]

    # Deduplicate: same category within 60 s → keep only the first occurrence.
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

        fig.add_vline(
            x=ts, line_width=1, line_dash="dash",
            line_color=color, row=row, col=1,
        )
        y_pos = 0.72 - (idx % 6) * 0.09
        fig.add_annotation(
            x=ts, y=y_pos,
            xref=xref, yref=yref,
            text=label,
            showarrow=False, xanchor="left", yanchor="bottom",
            font=dict(size=10, color=color),
            bgcolor="rgba(255,255,255,0.88)",
            bordercolor=color,
            borderpad=2,
        )


def add_series_traces(
    fig: go.Figure,
    row: int,
    points: list[SeriesPoint],
    *,
    show_legend: bool,
    device_code: str,
) -> None:
    palette = {"KPCL0034": "#c66f62", "KPCL0036": "#557a95"}
    color = palette.get(device_code, "#6a994e")

    xs = [p.timestamp for p in points if p.weight is not None]
    ys = [p.weight for p in points if p.weight is not None]
    if xs:
        fig.add_trace(
            go.Scatter(
                x=xs, y=ys,
                mode="lines",
                name=f"{device_code} — Peso bruto",
                line=dict(color=color, width=2),
                hovertemplate="%{x|%Y-%m-%d %H:%M:%S}<br>Peso: %{y} g<extra>" + device_code + "</extra>",
                showlegend=show_legend,
            ),
            row=row, col=1,
        )

    # Food content (net weight) — only for food bowls when plate_weight is configured.
    if DEVICE_TYPE.get(device_code) == "food_bowl":
        fc_xs = [p.timestamp for p in points if p.food_content is not None]
        fc_ys = [p.food_content for p in points if p.food_content is not None]
        if fc_xs:
            fig.add_trace(
                go.Scatter(
                    x=fc_xs, y=fc_ys,
                    mode="lines",
                    name=f"{device_code} — Contenido neto",
                    line=dict(color="#a78bfa", width=1.5, dash="dot"),
                    hovertemplate="%{x|%Y-%m-%d %H:%M:%S}<br>Contenido neto: %{y} g<extra>neto</extra>",
                    showlegend=show_legend,
                ),
                row=row, col=1,
            )


def add_battery_traces(
    fig: go.Figure,
    row: int,
    points_by_device: dict[str, list[SeriesPoint]],
) -> None:
    palette = {"KPCL0034": "#f97316", "KPCL0036": "#8b5cf6"}
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
                name=f"{device_code} — Batería %",
                line=dict(color=color, width=1.5),
                hovertemplate="%{x|%Y-%m-%d %H:%M:%S}<br>Batería: %{y}%<extra>" + device_code + "</extra>",
                showlegend=True,
            ),
            row=row, col=1,
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


def build_figure(
    points_by_device: dict[str, list[SeriesPoint]],
) -> tuple[go.Figure, dict[str, float | None], dict[str, tuple[datetime, datetime]]]:
    fig = make_subplots(
        rows=3,
        cols=1,
        shared_xaxes=False,
        row_heights=[0.42, 0.42, 0.16],
        vertical_spacing=0.08,
        subplot_titles=(
            "KPCL0034 — peso bruto / contenido neto / eventos",
            "KPCL0036 — peso bruto / eventos",
            "Batería (%)",
        ),
    )

    row_map = {"KPCL0034": 1, "KPCL0036": 2}
    window_map: dict[str, tuple[datetime, datetime]] = {}
    device_q3: dict[str, float | None] = {}
    latest_timestamp = max(
        (p.timestamp for device_points in points_by_device.values() for p in device_points),
        default=datetime.now(timezone.utc),
    )
    end_cap = latest_timestamp
    full_history_0034 = os.environ.get("FULL_HISTORY_0034", "1").strip().lower() in {"1", "true", "yes"}

    for device_code in DEVICE_ORDER:
        device_points = points_by_device.get(device_code, [])
        weight_row = row_map[device_code]

        if device_code == "KPCL0034":
            if full_history_0034:
                window_start, window_end = build_full_history_window(device_points, end_cap)
            else:
                window_start, window_end = build_fixed_window(
                    device_points, start_hour=21, end_hour=1, end_cap=end_cap,
                )
        else:
            window_start, window_end = build_device_window(device_points, end_cap)
        window_map[device_code] = (window_start, window_end)

        raw_weights = [p.weight for p in device_points if p.weight is not None]
        device_q3[device_code] = quantile(raw_weights, 0.75) if raw_weights else None

        add_series_traces(fig, weight_row, device_points, show_legend=True, device_code=device_code)
        add_power_markers(fig, weight_row, device_points)
        add_event_bands(fig, weight_row, device_points)
        add_event_markers(fig, weight_row, device_points)

        y_lo, y_hi = _auto_yrange(device_points)
        fig.update_xaxes(range=[window_start, window_end], row=weight_row, col=1)
        fig.update_yaxes(range=[y_lo, y_hi], row=weight_row, col=1)

    add_battery_traces(fig, 3, points_by_device)

    fig.update_xaxes(title_text="Tiempo (UTC)", tickformat="%m-%d %H:%M")
    fig.update_yaxes(title_text="Peso (g)", row=1, col=1)
    fig.update_yaxes(title_text="Peso (g)", row=2, col=1)
    fig.update_yaxes(title_text="Batería (%)", range=[0, 105], row=3, col=1)
    fig.update_layout(
        template="plotly_white",
        height=1300,
        width=1900,
        title_text="KPCL — pruebas de peso por device",
        legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="right", x=1),
        margin=dict(l=80, r=40, t=120, b=70),
        font=dict(size=14),
    )

    return fig, device_q3, window_map


def build_export_filename(device_code: str, window_start: datetime, window_end: datetime) -> str:
    start_part = window_start.strftime("%Y%m%d_%H%Mutc")
    end_part = window_end.strftime("%H%Mutc")
    return f"{device_code.lower()}_{EXPERIMENT_LABEL}_{start_part}_a_{end_part}.csv"


def build_boxplot_figure(points_by_device: dict[str, list[SeriesPoint]]) -> go.Figure:
    fig = make_subplots(
        rows=1, cols=2,
        shared_yaxes=True,
        subplot_titles=(
            "KPCL0034 — boxplot de peso",
            "KPCL0036 — boxplot de peso",
        ),
    )
    device_map = {"KPCL0034": 1, "KPCL0036": 2}
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


def build_stats_html(points_by_device: dict[str, list[SeriesPoint]]) -> str:
    rows_html = ""
    for device_code in DEVICE_ORDER:
        points = points_by_device.get(device_code, [])
        audit_pts = [p for p in points if p.is_audit]
        intervals = build_event_intervals(points)

        n_alimentacion = sum(1 for _, _, k in intervals if k == "alimentacion")
        n_hidratacion = sum(1 for _, _, k in intervals if k == "hidratacion")
        n_servido = sum(1 for _, _, k in intervals if k == "servido")

        durations = [
            (end - start).total_seconds() / 60
            for start, end, _ in intervals
        ]
        avg_dur = f"{sum(durations) / len(durations):.1f} min" if durations else "—"
        n_readings = sum(1 for p in points if not p.is_audit and p.weight is not None)
        n_audit = len(audit_pts)

        rows_html += f"""
        <tr>
          <td><b>{device_code}</b></td>
          <td>{DEVICE_TYPE.get(device_code, "—")}</td>
          <td>{n_readings:,}</td>
          <td>{n_audit}</td>
          <td>{n_alimentacion}</td>
          <td>{n_hidratacion}</td>
          <td>{n_servido}</td>
          <td>{avg_dur}</td>
        </tr>"""
    return f"""
    <table style="border-collapse:collapse;font-size:13px;width:100%;max-width:900px">
      <thead>
        <tr style="background:#f1f5f9;text-align:left">
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Device</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Tipo</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Lecturas</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Audit events</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Sesiones alim.</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Sesiones hidrat.</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Servidos</th>
          <th style="padding:6px 12px;border-bottom:1px solid #cbd5e1">Duración prom.</th>
        </tr>
      </thead>
      <tbody>{rows_html}</tbody>
    </table>"""


def write_and_open(
    fig: go.Figure,
    boxplot: go.Figure,
    *,
    window_map: dict[str, tuple[datetime, datetime]],
    q3_map: dict[str, float | None],
    stats_html: str,
) -> Path:
    main_html = fig.to_html(full_html=False, include_plotlyjs="cdn", config={"responsive": True})
    box_html = boxplot.to_html(full_html=False, include_plotlyjs=False, config={"responsive": True})
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    window_text = "; ".join(
        f"{device}: {window_map[device][0]:%Y-%m-%d %H:%M} → {window_map[device][1]:%Y-%m-%d %H:%M} UTC"
        for device in DEVICE_ORDER
        if device in window_map
    )
    q3_text = ", ".join(
        f"{device}: Q3={q3_map[device]:.1f}g" for device in DEVICE_ORDER if q3_map.get(device) is not None
    )
    html_text = f"""<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>KPCL — gráficos</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 24px; background: #fff; color: #1e293b; }}
      .section {{ margin-bottom: 48px; }}
      h2 {{ margin: 0 0 10px 0; font-size: 17px; color: #334155; }}
      .meta {{ margin: 0 0 20px 0; color: #475569; font-size: 13px; line-height: 1.6; }}
      .legend {{ display:flex; gap:18px; flex-wrap:wrap; margin-bottom:14px; font-size:12px; }}
      .legend-item {{ display:flex; align-items:center; gap:6px; }}
      .swatch {{ width:14px; height:14px; border-radius:3px; }}
    </style>
  </head>
  <body>
    <div class="meta">
      <b>Generado:</b> {generated}<br>
      <b>Ventana:</b> {window_text}<br>
      <b>Q3 peso:</b> {q3_text}
    </div>
    <div class="section">
      <h2>Resumen por device</h2>
      {stats_html}
    </div>
    <div class="legend">
      <div class="legend-item"><div class="swatch" style="background:rgba(34,197,94,0.55);border:1.5px solid #16a34a"></div>Alimentación</div>
      <div class="legend-item"><div class="swatch" style="background:rgba(14,165,233,0.55);border:1.5px solid #0284c7"></div>Hidratación</div>
      <div class="legend-item"><div class="swatch" style="background:rgba(249,115,22,0.45);border:1.5px solid #ea580c"></div>Servido</div>
    </div>
    <div class="section">
      <h2>Serie temporal con eventos</h2>
      {main_html}
    </div>
    <div class="section">
      <h2>Boxplot por device (≤ Q3)</h2>
      {box_html}
    </div>
  </body>
</html>"""
    OUTPUT_HTML.write_text(html_text, encoding="utf-8")
    webbrowser.open_new_tab(OUTPUT_HTML.resolve().as_uri())
    return OUTPUT_HTML


def main() -> None:
    load_env_from_file(ENV_FILE)
    combined_spec = Dataset(
        path=COMBINED_CSV,
        title="KPCL0034 + KPCL0036 — experimento",
        time_column="event_at",
        weight_column="weight_grams",
        device_column="device_code",
    )

    force_local_csv = os.environ.get("FORCE_LOCAL_CSV", "").strip() in {"1", "true", "TRUE", "yes", "YES"}
    if os.environ.get(SUPABASE_DB_URL) and not force_local_csv:
        fetch_end = datetime.now(timezone.utc)
        raw_rows = load_rows_from_supabase(start=WINDOW_START_UTC, end=fetch_end)
    else:
        raw_rows = load_rows(combined_spec)

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

    points_by_device = {
        device_code: rows_to_points(filtered_rows[device_code], combined_spec, device_code=device_code)
        for device_code in DEVICE_ORDER
    }

    fig, device_q3, window_map = build_figure(points_by_device)
    boxplot_fig = build_boxplot_figure(points_by_device)
    stats = build_stats_html(points_by_device)
    output = write_and_open(fig, boxplot_fig, window_map=window_map, q3_map=device_q3, stats_html=stats)
    print(f"Vista interactiva abierta: {output}")
    for device_code in DEVICE_ORDER:
        print(f"CSV exportado: {export_paths[device_code]}")


if __name__ == "__main__":
    main()
