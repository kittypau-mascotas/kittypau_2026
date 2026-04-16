"""Vista interactiva y exportador canonico de las pruebas KPCL.

Abre una pestaña del navegador con dos paneles separados:

1. KPCL0034, para observar la evolucion del peso y sus eventos.
2. KPCL0036, para observar la evolucion del peso y sus eventos.

Ademas exporta la data filtrada de cada device desde el inicio del 2026-04-04
UTC hasta el ultimo timestamp disponible en el CSV compartido, guardandola en
la carpeta canonica de pruebas con nombre especifico por device y experimento.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timezone
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
WINDOW_START_UTC = datetime(2026, 4, 4, tzinfo=timezone.utc)
# Legacy cap from an old experiment window. We now compute a dynamic cap from
# the loaded dataset to avoid hiding new data.
WINDOW_END_CAP_UTC = datetime(2026, 4, 7, 1, 0, tzinfo=timezone.utc)
ENV_FILE = ROOT.parent.parent / ".env.local"
SUPABASE_DB_URL = "SUPABASE_DB_URL"
SUPABASE_DB_POOLER_URL = "SUPABASE_DB_POOLER_URL"

try:
    csv.field_size_limit(sys.maxsize)
except (OverflowError, ValueError):
    csv.field_size_limit(2_147_483_647)


EVENT_LABELS = {
    "sin_categoria": "Sin categoria",
    "pre_tare": "Pre tare",
    "tare_record": "Tare",
    "plate_weight": "Plato / tare",
    "food_fill_start": "Inicio servido",
    "food_fill_end": "Fin servido",
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


EVENT_COLORS = {
    "sin_categoria": "#8f9bb3",
    "pre_tare": "#7a7a7a",
    "tare_record": "#c56e57",
    "plate_weight": "#8b5cf6",
    "food_fill_start": "#2f855a",
    "food_fill_end": "#1f6feb",
    "kpcl_prendido": "#16a34a",
    "kpcl_apagado": "#dc2626",
    "kpcl_sin_plato": "#8f9bb3",
    "kpcl_con_plato": "#557a95",
    "tare_con_plato": "#c56e57",
    "inicio_servido": "#6a994e",
    "termino_servido": "#8f5db7",
    "inicio_alimentacion": "#2f855a",
    "termino_alimentacion": "#1f6feb",
    "inicio_hidratacion": "#0284c7",
    "termino_hidratacion": "#0ea5e9",
    "plate_observation": "#7a7a7a",
    "manual_food_amount": "#d97706",
    "otro_evento": "#444444",
}


@dataclass(frozen=True)
class SeriesPoint:
    timestamp: datetime
    weight: float | None
    evento: str
    device_code: str | None = None


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
        raise ValueError("No hay timestamps disponibles para la ventana de exportacion")

    end = max(timestamps)
    return WINDOW_START_UTC, end


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
      when ae.event_type = 'manual_bowl_category' then (ae.payload->>'category_key')
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
            f"No se encontro {SUPABASE_DB_URL}. Define el connection string en el entorno o en .env.local."
        )
    sql = build_supabase_sql()
    if pooler_url:
        print(f"[supabase] usando pooler: {describe_dsn(pooler_url)}")
        with connect_supabase(pooler_url) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (start, end))
                columns = [desc[0] for desc in cur.description]
                rows = [dict(zip(columns, record)) for record in cur.fetchall()]
    else:
        print(f"[supabase] usando directo: {describe_dsn(db_url)}")
        with connect_supabase(db_url) as conn:
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

        points.append(
            SeriesPoint(
                timestamp=timestamp,
                weight=parse_optional_float(row.get(spec.weight_column, "")),
                evento=(row.get("evento", "").strip() or "sin_categoria"),
                device_code=row_device,
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


def first_timestamp_for_event(points: Iterable[SeriesPoint]) -> dict[str, datetime]:
    first_seen: dict[str, datetime] = {}
    for point in points:
        if point.evento not in first_seen:
            first_seen[point.evento] = point.timestamp
    return first_seen


def event_order(points: Iterable[SeriesPoint]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for point in points:
        if point.evento not in seen:
            ordered.append(point.evento)
            seen.add(point.evento)
    return ordered


def add_power_markers(fig: go.Figure, row: int, points: list[SeriesPoint]) -> None:
    if not points:
        return
    # apagado: eventos explicitos
    off_events = [p.timestamp for p in points if p.evento in ("kpcl_apagado", "device_offline_detected")]
    if off_events:
        off_events.sort()
        for ts in off_events:
            fig.add_vline(
                x=ts,
                line_width=1,
                line_dash="dot",
                line_color=EVENT_COLORS["kpcl_apagado"],
                row=row,
                col=1,
            )
            fig.add_annotation(
                x=ts,
                y=1.02,
                xref="x",
                yref="paper",
                text=EVENT_LABELS["kpcl_apagado"],
                showarrow=False,
                xanchor="left",
                yanchor="bottom",
                font=dict(size=10, color=EVENT_COLORS["kpcl_apagado"]),
                row=row,
                col=1,
            )
    # prendido: primer reading y primer reading despues de apagado
    reading_points = [p for p in points if p.weight is not None]
    if reading_points:
        on_events = []
        on_events.append(reading_points[0].timestamp)
        for off_ts in off_events:
            next_after = next((p.timestamp for p in reading_points if p.timestamp > off_ts), None)
            if next_after:
                on_events.append(next_after)
        for ts in sorted(set(on_events)):
            fig.add_vline(
                x=ts,
                line_width=1,
                line_dash="dot",
                line_color=EVENT_COLORS["kpcl_prendido"],
                row=row,
                col=1,
            )
            fig.add_annotation(
                x=ts,
                y=1.08,
                xref="x",
                yref="paper",
                text=EVENT_LABELS["kpcl_prendido"],
                showarrow=False,
                xanchor="left",
                yanchor="bottom",
                font=dict(size=10, color=EVENT_COLORS["kpcl_prendido"]),
                row=row,
                col=1,
            )


def build_event_intervals(points: list[SeriesPoint]) -> list[tuple[datetime, datetime, str]]:
    """Return (start, end, label) windows for categorized start/end events."""
    if not points:
        return []
    sorted_points = sorted(points, key=lambda p: p.timestamp)

    start_events = {
        "food_fill_start": ("servido", "Servido"),
        "inicio_servido": ("servido", "Servido"),
        "inicio_alimentacion": ("alimentacion", "Alimentacion"),
        "inicio_hidratacion": ("hidratacion", "Hidratacion"),
    }
    end_events = {
        "food_fill_end": "servido",
        "termino_servido": "servido",
        "termino_alimentacion": "alimentacion",
        "termino_hidratacion": "hidratacion",
    }

    open_intervals: dict[str, tuple[datetime, str]] = {}
    intervals: list[tuple[datetime, datetime, str]] = []

    for point in sorted_points:
        started = start_events.get(point.evento)
        if started is not None:
            key, label = started
            # If the previous interval was never closed, restart from latest start.
            open_intervals[key] = (point.timestamp, label)
            continue

        ended_key = end_events.get(point.evento)
        if ended_key is None:
            continue
        opened = open_intervals.get(ended_key)
        if opened is None:
            continue
        start_ts, label = opened
        if point.timestamp > start_ts:
            intervals.append((start_ts, point.timestamp, label))
        open_intervals.pop(ended_key, None)

    return intervals


def add_event_bands(fig: go.Figure, row: int, points: list[SeriesPoint]) -> None:
    intervals = build_event_intervals(points)
    for start, end, label in intervals:
        # User-defined visual rule: every start/end categorized segment is green.
        color = "rgba(34,197,94,0.62)"
        fig.add_vrect(
            x0=start,
            x1=end,
            fillcolor=color,
            opacity=0.38,
            line_width=0,
            row=row,
            col=1,
            layer="below",
        )
        fig.add_annotation(
            x=start,
            y=1.02,
            xref="x",
            yref="paper",
            text=label,
            showarrow=False,
            xanchor="left",
            yanchor="bottom",
            font=dict(size=11, color="#334155"),
            row=row,
            col=1,
        )


def add_event_markers(fig: go.Figure, row: int, points: list[SeriesPoint], *, prefix_device: bool = False) -> None:
    if not points:
        return

    grouped = group_by_device(points) if prefix_device else {None: points}

    for device_code, device_points in grouped.items():
        key_events = {
            "kpcl_sin_plato",
            "kpcl_con_plato",
            "tare_con_plato",
            "tare_record",
            "plate_weight",
            "food_fill_start",
            "food_fill_end",
            "inicio_servido",
            "termino_servido",
            "inicio_alimentacion",
            "termino_alimentacion",
            "inicio_hidratacion",
            "termino_hidratacion",
            "kpcl_prendido",
            "kpcl_apagado",
        }
        # Keep marker labels focused on categorical events coming from audit rows.
        # In this dataset, audit rows don't carry a weight value.
        marker_points = [point for point in device_points if point.evento in key_events and point.weight is None]

        for idx, point in enumerate(marker_points):
            event_name = point.evento
            ts = point.timestamp
            base_label = EVENT_LABELS.get(event_name, event_name)
            label = f"{device_code} - {base_label}" if device_code else base_label
            color = EVENT_COLORS.get(event_name, "#666666")
            fig.add_vline(
                x=ts,
                line_width=1,
                line_dash="dash",
                line_color=color,
                row=row,
                col=1,
            )
            marker_y = point.weight if point.weight is not None else 0.0
            fig.add_trace(
                go.Scatter(
                    x=[ts],
                    y=[marker_y],
                    mode="markers+text",
                    text=[label],
                    textposition="top center",
                    textfont=dict(size=11, color=color),
                    marker=dict(size=10, color=color, symbol="diamond"),
                    hovertemplate=(
                        f"<b>{label}</b><br>"
                        + "%{x|%Y-%m-%d %H:%M:%S}<br>"
                        + "Peso: %{y} g<extra></extra>"
                    ),
                    showlegend=False,
                ),
                row=row,
                col=1,
            )
            label_y = 0.98 - (idx % 6) * 0.03
            fig.add_annotation(
                x=ts,
                y=label_y,
                text=label,
                showarrow=False,
                xanchor="left",
                yanchor="bottom",
                font=dict(size=11, color=color),
                bgcolor="rgba(255,255,255,0.85)",
                bordercolor=color,
                borderpad=2,
                xref="x",
                yref="paper",
                row=row,
                col=1,
            )


def add_series_traces(fig: go.Figure, row: int, points: list[SeriesPoint], *, show_legend: bool) -> None:
    grouped = group_by_device(points)
    palette = ["#c66f62", "#557a95", "#6a994e", "#8f5db7"]

    for idx, (device_code, device_points) in enumerate(sorted(grouped.items())):
        xs = [point.timestamp for point in device_points if point.weight is not None]
        ys = [point.weight for point in device_points if point.weight is not None]
        if not xs:
            continue

        fig.add_trace(
            go.Scatter(
                x=xs,
                y=ys,
                mode="lines",
                name=device_code,
                line=dict(color=palette[idx % len(palette)], width=2),
                hovertemplate="%{x|%Y-%m-%d %H:%M:%S}<br>Peso: %{y} g<extra>" + device_code + "</extra>",
                showlegend=show_legend,
            ),
            row=row,
            col=1,
        )


def build_device_window(points: list[SeriesPoint], end_cap: datetime) -> tuple[datetime, datetime]:
    if not points:
        raise ValueError("No hay puntos para calcular ventana")
    sorted_points = sorted(points, key=lambda p: p.timestamp)
    on_ts = next((p.timestamp for p in sorted_points if p.weight is not None), sorted_points[0].timestamp)
    off_ts = next(
        (p.timestamp for p in sorted_points if p.timestamp > on_ts and p.evento == "kpcl_apagado"),
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
    end = datetime(last_ts.year, last_ts.month, last_ts.day, end_hour, 0, tzinfo=timezone.utc)
    if end <= start:
        end = end.replace(day=end.day + 1)
    end = min(end, end_cap)
    if last_ts < start:
        start = start.replace(day=start.day - 1)
        if end <= start:
            end = end.replace(day=end.day - 1)
    start = min(start, end)
    return start, end


def build_full_history_window(points: list[SeriesPoint], end_cap: datetime) -> tuple[datetime, datetime]:
    if not points:
        raise ValueError("No hay puntos para calcular ventana")
    start = min(p.timestamp for p in points)
    end = min(max(p.timestamp for p in points), end_cap)
    if end < start:
        end = start
    return start, end


def build_figure(
    points_by_device: dict[str, list[SeriesPoint]],
) -> tuple[go.Figure, dict[str, float | None], dict[str, tuple[datetime, datetime]]]:
    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=False,
        vertical_spacing=0.12,
        subplot_titles=(
            "KPCL0034 - peso y categorias",
            "KPCL0036 - peso y categorias",
        ),
    )

    row_map = {
        "KPCL0034": 1,
        "KPCL0036": 2,
    }
    all_weights: list[float] = []
    window_map: dict[str, tuple[datetime, datetime]] = {}
    device_q3: dict[str, float | None] = {}
    latest_timestamp = max(
        (p.timestamp for device_points in points_by_device.values() for p in device_points),
        default=datetime.now(timezone.utc),
    )
    # Keep a sensible cap for x-range based on real data, not the old fixed date.
    dynamic_end_cap = max(WINDOW_END_CAP_UTC, latest_timestamp)
    full_history_0034 = os.environ.get("FULL_HISTORY_0034", "1").strip().lower() in {"1", "true", "yes"}

    for device_code in DEVICE_ORDER:
        device_points = points_by_device.get(device_code, [])
        weight_row = row_map[device_code]
        if device_code == "KPCL0034":
            if full_history_0034:
                window_start, window_end = build_full_history_window(device_points, dynamic_end_cap)
            else:
                window_start, window_end = build_fixed_window(
                    device_points,
                    start_hour=21,
                    end_hour=1,
                    end_cap=dynamic_end_cap,
                )
        else:
            window_start, window_end = build_device_window(device_points, dynamic_end_cap)
        window_map[device_code] = (window_start, window_end)
        raw_weights = [p.weight for p in device_points if p.weight is not None]
        q3 = quantile(raw_weights, 0.75) if raw_weights else None
        device_q3[device_code] = q3
        add_series_traces(fig, weight_row, device_points, show_legend=False)
        add_power_markers(fig, weight_row, device_points)
        add_event_bands(fig, weight_row, device_points)
        add_event_markers(fig, weight_row, device_points)

        all_weights.extend(raw_weights)

        fig.update_xaxes(
            range=[window_start, window_end],
            row=weight_row,
            col=1,
        )

    fig.update_xaxes(title_text="Tiempo (UTC)", tickformat="%m-%d %H:%M")
    fig.update_yaxes(title_text="Peso (g)", row=1, col=1)
    fig.update_yaxes(title_text="Peso (g)", row=2, col=1)
    fig.update_yaxes(range=[0, 350], row=1, col=1)
    fig.update_yaxes(range=[0, 350], row=2, col=1)
    fig.update_layout(
        template="plotly_white",
        height=1100,
        width=1900,
        title_text="KPCL - pruebas de peso por device",
        margin=dict(l=80, r=40, t=110, b=70),
        font=dict(size=15),
    )

    return fig, device_q3, window_map


def build_export_filename(device_code: str, window_start: datetime, window_end: datetime) -> str:
    start_part = window_start.strftime("%Y%m%d_%H%Mutc")
    end_part = window_end.strftime("%H%Mutc")
    return f"{device_code.lower()}_{EXPERIMENT_LABEL}_{start_part}_a_{end_part}.csv"


def write_and_open(
    fig: go.Figure,
    boxplot: go.Figure,
    *,
    window_map: dict[str, tuple[datetime, datetime]],
    q3_map: dict[str, float | None],
) -> Path:
    main_html = fig.to_html(
        full_html=False,
        include_plotlyjs="cdn",
        config={"responsive": True},
    )
    box_html = boxplot.to_html(
        full_html=False,
        include_plotlyjs=False,
        config={"responsive": True},
    )
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    window_text = "; ".join(
        f"{device}: {window_map[device][0]:%Y-%m-%d %H:%M} UTC → {window_map[device][1]:%Y-%m-%d %H:%M} UTC"
        for device in DEVICE_ORDER
        if device in window_map
    )
    q3_text = ", ".join(
        f"{device}: Q3={q3_map[device]:.2f}g" for device in DEVICE_ORDER if q3_map.get(device) is not None
    )
    html_text = f"""
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>KPCL - graficos</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 24px; }}
      .section {{ margin-bottom: 48px; }}
      h2 {{ margin: 0 0 12px 0; font-size: 18px; }}
      .meta {{ margin: 0 0 18px 0; color: #475569; font-size: 14px; }}
    </style>
  </head>
  <body>
    <div class="meta">
      Fecha: {generated} (UTC). Ventana de datos: {window_text}. Procesamiento: categorias de eventos, bandas de servido/alimentacion, boxplot y series filtradas hasta Q3. {q3_text}
    </div>
    <div class="section">
      <h2>Serie temporal con eventos</h2>
      {main_html}
    </div>
    <div class="section">
      <h2>Boxplot por device</h2>
      {box_html}
    </div>
  </body>
</html>
"""
    OUTPUT_HTML.write_text(html_text, encoding="utf-8")
    webbrowser.open_new_tab(OUTPUT_HTML.resolve().as_uri())
    return OUTPUT_HTML


def build_boxplot_figure(points_by_device: dict[str, list[SeriesPoint]]) -> go.Figure:
    fig = make_subplots(
        rows=1,
        cols=2,
        shared_yaxes=True,
        subplot_titles=(
            "KPCL0034 - boxplot de peso",
            "KPCL0036 - boxplot de peso",
        ),
    )
    device_map = {
        "KPCL0034": 1,
        "KPCL0036": 2,
    }
    all_weights: list[float] = []
    for device_code, col in device_map.items():
        points = points_by_device.get(device_code, [])
        raw_weights = [p.weight for p in points if p.weight is not None]
        if not raw_weights:
            continue
        q3 = quantile(raw_weights, 0.75)
        weights = [w for w in raw_weights if w <= q3]
        if not weights:
            continue
        all_weights.extend(weights)
        fig.add_trace(
            go.Box(
                y=weights,
                name=device_code,
                boxpoints="outliers",
                line_color="#64748b",
                fillcolor="rgba(15,118,110,0.35)" if device_code == "KPCL0034" else "rgba(99,102,241,0.35)",
                marker=dict(color="#0f766e" if device_code == "KPCL0034" else "#6366f1"),
                showlegend=False,
            ),
            row=1,
            col=col,
        )
    fig.update_yaxes(title_text="Peso (g)", range=[0, 350])
    fig.update_layout(
        template="plotly_white",
        height=600,
        width=1400,
        title_text="KPCL - distribucion de peso (boxplot)",
        margin=dict(l=80, r=40, t=90, b=60),
        font=dict(size=14),
    )
    return fig


def main() -> None:
    load_env_from_file(ENV_FILE)
    combined_spec = Dataset(
        path=COMBINED_CSV,
        title="KPCL0034 + KPCL0036 - experimento",
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
            row
            for row in raw_rows
            if (row.get("device_code", "").strip() == device_code)
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
    output = write_and_open(
        fig,
        boxplot_fig,
        window_map=window_map,
        q3_map=device_q3,
    )
    print(f"Vista interactiva abierta desde: {output}")
    for device_code in DEVICE_ORDER:
        print(f"CSV exportado: {export_paths[device_code]}")


if __name__ == "__main__":
    main()
