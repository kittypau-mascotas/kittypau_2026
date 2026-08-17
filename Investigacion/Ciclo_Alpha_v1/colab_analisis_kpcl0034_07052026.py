# =============================================================================
# KPCL0034 — Análisis Exploratorio en Google Colab
# Export: kittypau_full_07-05-2026_csv
# Autor: Mauro Curcuma
# Fecha: 2026-05-07
# Docs: Docs/investigacion/ANALISIS_COLAB_KPCL0034_07052026.md
# =============================================================================
# DEPENDENCIAS:
#   !pip install psycopg2-binary plotly pandas
#
# DATOS:
#   Google Drive: Analisis de Datos/Data Raw/Data abril 2026/
#                 kittypau_full_07-05-2026_csv/
#   Tablas: audit_events.csv, devices.csv, readings.csv, sensor_readings.csv
# =============================================================================

import pandas as pd
import numpy as np
import os
import json
import warnings
warnings.filterwarnings("ignore")

from google.colab import drive
drive.mount('/content/drive')

BASE = "/content/drive/MyDrive/Analisis de Datos/Data Raw/Data abril 2026/kittypau_full_07-05-2026_csv/"


# =============================================================================
# CARGA Y EXPLORACIÓN INICIAL
# =============================================================================

def load_all_tables(base):
    """Carga todos los CSVs disponibles en la carpeta BASE."""
    tables = {}
    for f in os.listdir(base):
        if f.endswith(".csv"):
            name = f.replace(".csv", "")
            path = os.path.join(base, f)
            try:
                tables[name] = pd.read_csv(path, encoding="latin1", low_memory=False)
                print(f"{name:35} {tables[name].shape}")
            except pd.errors.EmptyDataError:
                print(f"[WARN] {f} vacío. Asignando DataFrame vacío.")
                tables[name] = pd.DataFrame()
            except Exception as e:
                print(f"[ERROR] No se pudo leer {f}: {e}")
    return tables


def compare_sensor_readings_vs_readings(tables):
    """Diff de columnas entre sensor_readings y readings."""
    sr = tables["sensor_readings"]
    rd = tables["readings"]
    cols_sr = set(sr.columns)
    cols_rd = set(rd.columns)
    all_cols = sorted(cols_sr.union(cols_rd))
    rows = []
    for c in all_cols:
        rows.append({
            "columna": c,
            "en_sensor_readings": c in cols_sr,
            "en_readings": c in cols_rd
        })
    return pd.DataFrame(rows).sort_values(
        ["en_sensor_readings", "en_readings", "columna"],
        ascending=[False, False, True]
    ).reset_index(drop=True)


def inspect_event_types(base):
    """Imprime tipos únicos y conteos de event_type en audit_events."""
    path = os.path.join(base, "audit_events.csv")
    df = pd.read_csv(path, encoding="latin1")
    event_types = df["event_type"].dropna().astype(str).str.strip()
    print("Valores únicos de event_type:\n")
    for v in sorted(event_types.unique()):
        print(f"  {v}")
    print("\nCantidad por event_type:\n")
    print(event_types.value_counts())


# =============================================================================
# FASE 1 — CARGA Y PROCESAMIENTO
# =============================================================================

def load_tables(base):
    """Carga las tres tablas principales con fallback de encoding."""
    def read(path):
        try:
            return pd.read_csv(path, encoding="utf-8", low_memory=False)
        except Exception:
            return pd.read_csv(path, encoding="latin-1", low_memory=False)

    audit   = read(f"{base}/audit_events.csv")
    devices = read(f"{base}/devices.csv")
    readings = read(f"{base}/readings.csv")
    return audit, devices, readings


def parse_payload(audit):
    """
    Normaliza el campo payload de audit_events.

    Resuelve el problema de timezones mixtos (+00, -04, -04:00, etc.)
    usando dateutil.parser. Extrae 'category' y 'device_code' del JSON
    de payload.
    """
    import dateutil.parser
    import dateutil.tz

    def safe_json(x):
        if isinstance(x, dict):
            return x
        try:
            return json.loads(x)
        except Exception:
            return {}

    def fix_timezone(s):
        if pd.isna(s):
            return pd.NaT
        try:
            dt = dateutil.parser.parse(str(s).strip())
            return dt.astimezone(dateutil.tz.UTC)
        except Exception:
            return pd.NaT

    # 1. parse JSON payload
    audit["payload"] = audit["payload"].apply(safe_json)

    # 2. extraer campos críticos del payload
    audit["category"]    = audit["payload"].apply(lambda x: x.get("category"))
    audit["device_code"] = audit["payload"].apply(lambda x: x.get("device_id"))

    # 3. fallback: si no hay category en payload, usar event_type
    audit["category"] = audit["category"].fillna(audit["event_type"])

    # 4. normalizar timestamp con manejo de zonas horarias mixtas
    audit["created_at"] = audit["created_at"].apply(fix_timezone)
    audit["created_at"] = pd.to_datetime(audit["created_at"], utc=True, errors="coerce")

    # 5. descartar filas sin timestamp válido
    audit = audit.dropna(subset=["created_at"])

    return audit


def build_timeline(audit, devices):
    """
    Construye el timeline de eventos cruzando audit_events con devices.

    Prioriza device_code del payload; fallback a device_code resuelto via join.
    """
    devices_map = devices[["id", "device_id"]].rename(
        columns={"id": "device_uuid", "device_id": "device_code_from_db"}
    )

    timeline = audit.merge(
        devices_map,
        left_on="entity_id",
        right_on="device_uuid",
        how="left"
    )

    timeline["device_code"] = timeline["device_code"].fillna(
        timeline["device_code_from_db"]
    )

    timeline = timeline[[
        "device_code",
        "category",
        "created_at"
    ]].rename(columns={"created_at": "event_at"})

    timeline = timeline.dropna(subset=["event_at", "device_code"])
    timeline = timeline.sort_values(["device_code", "event_at"]).reset_index(drop=True)

    return timeline


def build_sessions(timeline):
    """
    Reconstruye sesiones de alimentación como pares
    inicio_alimentacion → termino_alimentacion por device.
    """
    sessions = []
    open_without_close = 0

    for device, d in timeline.groupby("device_code"):
        d = d.sort_values("event_at")
        start_time = None

        for _, row in d.iterrows():
            if row["category"] == "inicio_alimentacion":
                if start_time is not None:
                    open_without_close += 1
                start_time = row["event_at"]

            elif row["category"] == "termino_alimentacion" and start_time is not None:
                end_time = row["event_at"]
                duration = (end_time - start_time).total_seconds()
                if duration > 0:
                    sessions.append({
                        "device_code": device,
                        "start_at":    start_time,
                        "end_at":      end_time,
                        "duration_sec": duration
                    })
                start_time = None

        if start_time is not None:
            open_without_close += 1

    if open_without_close > 0:
        print(f"[WARN] Sesiones sin cierre detectadas: {open_without_close}")

    return pd.DataFrame(sessions)


def build_sessions_servido(timeline):
    """
    Reconstruye sesiones de servido como pares
    inicio_servido → termino_servido por device.
    """
    sessions = []
    open_without_close = 0

    for device, d in timeline.groupby("device_code"):
        d = d.sort_values("event_at")
        start_time = None

        for _, row in d.iterrows():
            if row["category"] == "inicio_servido":
                if start_time is not None:
                    open_without_close += 1
                start_time = row["event_at"]

            elif row["category"] == "termino_servido" and start_time is not None:
                end_time = row["event_at"]
                duration = (end_time - start_time).total_seconds()
                if duration > 0:
                    sessions.append({
                        "device_code": device,
                        "start_at":    start_time,
                        "end_at":      end_time,
                        "duration_sec": duration
                    })
                start_time = None

        if start_time is not None:
            open_without_close += 1

    if open_without_close > 0:
        print(f"[WARN] Sesiones sin cierre: {open_without_close}")

    return pd.DataFrame(sessions)


def run_fase_1():
    """Carga datos, normaliza payload, construye timeline y sesiones."""
    audit, devices, readings = load_tables(BASE)
    audit    = parse_payload(audit)
    timeline = build_timeline(audit, devices)
    sessions = build_sessions(timeline)

    print("=" * 40)
    print("QUALITY REPORT — FASE 1")
    print("=" * 40)
    print(f"TIMELINE:  {timeline.shape[0]} eventos, {timeline['device_code'].nunique()} devices")
    print(f"SESSIONS:  {sessions.shape[0]} sesiones")
    if not sessions.empty:
        print(f"  duración promedio: {sessions['duration_sec'].mean():.0f} seg")
        print(f"  duración mínima:   {sessions['duration_sec'].min():.0f} seg")
        print(f"  duración máxima:   {sessions['duration_sec'].max():.0f} seg")
    print(f"READINGS:  {readings.shape[0]} filas")
    print("=" * 40)
    print("\nCategorías en timeline:")
    print(timeline["category"].value_counts())

    return timeline, sessions, readings, devices


# =============================================================================
# FASE 2 — ENRICHMENT Y FEATURES
# =============================================================================

def prepare_readings(readings, devices):
    """
    Limpia las lecturas y hace join con devices para obtener device_code.
    Nota: descarta lecturas con clock_invalid=True (a diferencia del pipeline
    ML que usa ingested_at como fallback).
    """
    readings["recorded_at"] = pd.to_datetime(readings["recorded_at"], utc=True, errors="coerce")
    readings = readings.dropna(subset=["recorded_at", "weight_grams"])

    if "clock_invalid" in readings.columns:
        readings = readings[readings["clock_invalid"] != True]

    devices_map = devices[["id", "device_id"]].rename(
        columns={"id": "device_uuid", "device_id": "device_code"}
    )

    readings = readings.merge(
        devices_map,
        left_on="device_id",
        right_on="device_uuid",
        how="left"
    )

    readings = readings.dropna(subset=["device_code"])

    return readings[[
        "device_code", "recorded_at", "weight_grams",
        "temperature", "humidity", "battery_level", "clock_invalid"
    ]]


def enrich_sessions_with_readings(readings, sessions):
    """
    Vincula cada sesión con sus lecturas de peso dentro del intervalo.
    Solo conserva sesiones con >= 2 lecturas.
    """
    enriched = []

    for _, s in sessions.iterrows():
        device = s["device_code"]
        start  = s["start_at"]
        end    = s["end_at"]

        window = readings[
            (readings["device_code"] == device) &
            (readings["recorded_at"] >= start) &
            (readings["recorded_at"] <= end)
        ].copy()

        if len(window) >= 2:
            window["session_id"]    = f"{device}_{start.strftime('%Y%m%d%H%M%S')}"
            window["session_start"] = start
            window["session_end"]   = end
            enriched.append(window)

    if not enriched:
        print("[WARN] Ninguna sesión tiene lecturas en el intervalo.")
        return pd.DataFrame()

    return pd.concat(enriched, ignore_index=True)


def build_session_features(enriched):
    """
    Calcula features de comportamiento por sesión.

    Features:
      weight_start_g    : peso al inicio
      weight_end_g      : peso al final
      consumed_grams    : peso_inicio - peso_final (negativo = recarga)
      duration_min      : duración en minutos
      rate_g_per_min    : ritmo de consumo
      num_readings      : lecturas en el intervalo
      active_drops      : caídas > 2g entre lecturas consecutivas
      weight_variance   : varianza del peso durante la sesión
      avg_temperature   : temperatura media
      avg_humidity      : humedad media
    """
    if enriched.empty:
        return pd.DataFrame()

    features = []

    for sid, df in enriched.groupby("session_id"):
        df     = df.sort_values("recorded_at")
        weight = df["weight_grams"].values
        times  = df["recorded_at"]

        duration_min = (times.iloc[-1] - times.iloc[0]).total_seconds() / 60
        consumed     = weight[0] - weight[-1]
        rate         = consumed / duration_min if duration_min > 0 else 0

        deltas       = np.diff(weight)
        active_drops = (deltas < -2).sum()

        features.append({
            "session_id":      sid,
            "device_code":     df["device_code"].iloc[0],
            "session_start":   df["session_start"].iloc[0],
            "session_end":     df["session_end"].iloc[0],
            "weight_start_g":  round(weight[0], 1),
            "weight_end_g":    round(weight[-1], 1),
            "consumed_grams":  round(consumed, 1),
            "duration_min":    round(duration_min, 2),
            "rate_g_per_min":  round(rate, 2),
            "num_readings":    len(df),
            "active_drops":    int(active_drops),
            "weight_variance": round(float(np.var(weight)), 2),
            "avg_temperature": round(df["temperature"].mean(), 1) if "temperature" in df else None,
            "avg_humidity":    round(df["humidity"].mean(), 1)    if "humidity"    in df else None,
        })

    return pd.DataFrame(features)


def run_fase_2(timeline, sessions, readings, devices):
    """Prepara readings, enriquece sesiones y calcula features."""
    print("Preparando readings...")
    readings_clean = prepare_readings(readings, devices)
    print(f"  readings limpios: {readings_clean.shape[0]:,} filas, "
          f"{readings_clean['device_code'].nunique()} devices")

    print("Enriqueciendo sesiones...")
    enriched = enrich_sessions_with_readings(readings_clean, sessions)

    print("Calculando features...")
    features = build_session_features(enriched)

    print("\n" + "=" * 40)
    print("FASE 2 — RESULTADOS")
    print("=" * 40)
    print(f"ENRICHED:  {enriched.shape[0]:,} lecturas vinculadas")
    print(f"FEATURES:  {features.shape[0]} sesiones con métricas")

    if not features.empty:
        print(f"\n  Sesiones con consumo positivo: {(features['consumed_grams'] > 0).sum()}")
        print(f"  Sesiones con consumo negativo: {(features['consumed_grams'] < 0).sum()} (posible recarga)")
        print(f"\n  Consumo promedio: {features['consumed_grams'].mean():.1f} g")
        print(f"  Consumo máximo:   {features['consumed_grams'].max():.1f} g")
        print(f"  Consumo mínimo:   {features['consumed_grams'].min():.1f} g")
        print(f"\n  Duración promedio: {features['duration_min'].mean():.1f} min")
        print(f"  Ritmo promedio:    {features['rate_g_per_min'].mean():.2f} g/min")
        print(f"\n  Lecturas por sesión (promedio): {features['num_readings'].mean():.1f}")
    print("=" * 40)

    return enriched, features


# =============================================================================
# ANÁLISIS POR DEVICE — KPCL0034
# =============================================================================

def analyze_kpcl0034(features, features_servido):
    """
    Genera el análisis comparativo de alimentación vs. servido para KPCL0034.
    Validado dato por dato por Mauro Curcuma.
    """
    kpcl34 = features[features["device_code"] == "KPCL0034"].copy()
    kpcl34_servido = features_servido[features_servido["device_code"] == "KPCL0034"].copy()
    kpcl34_servido["served_grams"] = -kpcl34_servido["consumed_grams"]

    print("=" * 60)
    print("RESUMEN ALIMENTACIÓN — KPCL0034 (Bandida)")
    print("=" * 60)
    print(f"Sesiones:          {len(kpcl34)}")
    print(f"Consumo promedio:  {kpcl34['consumed_grams'].mean():.1f} g")
    print(f"Consumo máximo:    {kpcl34['consumed_grams'].max():.1f} g")
    print(f"Consumo mínimo:    {kpcl34['consumed_grams'].min():.1f} g")
    print(f"Duración promedio: {kpcl34['duration_min'].mean():.1f} min")
    print(f"Ritmo promedio:    {kpcl34['rate_g_per_min'].mean():.2f} g/min")

    print("\nDetalle por sesión:")
    print(kpcl34[[
        "session_start", "consumed_grams", "duration_min",
        "rate_g_per_min", "active_drops"
    ]].to_string(index=False))

    print("\n" + "=" * 60)
    print("RESUMEN SERVIDO — KPCL0034")
    print("=" * 60)
    print(f"Sesiones de servido: {len(kpcl34_servido)}")
    print(f"Servido promedio:    {kpcl34_servido['served_grams'].mean():.1f} g")
    print(f"Servido máximo:      {kpcl34_servido['served_grams'].max():.1f} g")
    print(f"Duración promedio:   {kpcl34_servido['duration_min'].mean():.1f} min")

    return kpcl34, kpcl34_servido


def daily_cross_analysis(kpcl34, kpcl34_servido):
    """
    Cruce diario: servido vs. consumido + aprovechamiento.
    """
    kpcl34 = kpcl34.copy()
    kpcl34["date"] = kpcl34["session_start"].dt.date

    kpcl34_servido = kpcl34_servido.copy()
    kpcl34_servido["date"] = kpcl34_servido["session_start"].dt.date

    daily_alim = kpcl34.groupby("date").agg(
        total_consumed=("consumed_grams", "sum"),
        n_sesiones_alim=("session_id", "count")
    ).reset_index()

    daily_serv = kpcl34_servido.groupby("date").agg(
        total_served=("served_grams", "sum"),
        n_sesiones_serv=("session_id", "count")
    ).reset_index()

    daily = daily_serv.merge(daily_alim, on="date", how="outer").fillna(0)
    daily["aprovechamiento_pct"] = (
        daily["total_consumed"] / daily["total_served"] * 100
    ).round(1)
    daily["desperdicio_grams"] = (daily["total_served"] - daily["total_consumed"]).round(1)

    # Imprimir tabla
    header = f"{'Fecha':<12} {'Servido':>9} {'Consumido':>10} {'Aprovech%':>10} {'Desperdicio':>12} {'S.Alim':>7} {'S.Serv':>7}"
    print(header)
    print("-" * 72)
    for _, row in daily.sort_values("date").iterrows():
        print(
            f"{str(row['date']):<12} "
            f"{row['total_served']:>9.1f} "
            f"{row['total_consumed']:>10.1f} "
            f"{row['aprovechamiento_pct']:>9.1f}% "
            f"{row['desperdicio_grams']:>11.1f} "
            f"{int(row['n_sesiones_alim']):>7} "
            f"{int(row['n_sesiones_serv']):>7}"
        )
    print("-" * 72)
    total_served = daily["total_served"].sum()
    total_consumed = daily["total_consumed"].sum()
    print(
        f"{'TOTAL':<12} "
        f"{total_served:>9.1f} "
        f"{total_consumed:>10.1f} "
        f"{(total_consumed / total_served * 100):>9.1f}% "
        f"{daily['desperdicio_grams'].sum():>11.1f}"
    )

    return daily


# =============================================================================
# DASHBOARD VISUAL — 4 PANELES PLOTLY
# =============================================================================

# Paleta visual (dark mode, GitHub-inspired)
PALETTE = {
    "bg_dark":       "#0d1117",
    "bg_card":       "#161b22",
    "bg_card2":      "#1c2333",
    "border":        "#30363d",
    "text_primary":  "#e6edf3",
    "text_muted":    "#7d8590",
    "accent_red":    "#f85149",
    "accent_green":  "#3fb950",
    "accent_orange": "#f0883e",
    "accent_purple": "#bc8cff",
    "accent_blue":   "#58a6ff",
    "accent_teal":   "#39d353",
    "grid":          "#21262d",
}

RANGE_BUTTONS = [
    dict(count=1,  label="1d",  step="day",  stepmode="backward"),
    dict(count=3,  label="3d",  step="day",  stepmode="backward"),
    dict(count=7,  label="7d",  step="day",  stepmode="backward"),
    dict(count=14, label="14d", step="day",  stepmode="backward"),
    dict(step="all", label="Todo"),
]

PLOT_CONFIG = {
    "responsive": True,
    "displaylogo": False,
    "toImageButtonOptions": {
        "format": "png",
        "filename": "kpcl0034_dashboard",
        "height": 1800,
        "width": 2400,
        "scale": 2,
    },
    "modeBarButtonsToRemove": ["lasso2d", "select2d", "autoScale2d"],
}


def _prep_readings_for_plot(readings, devices):
    """Prepara las lecturas de KPCL0034 para el gráfico de peso."""
    dm = devices[["id", "device_id"]].rename(
        columns={"id": "device_uuid", "device_id": "device_code"}
    )
    r = readings.merge(dm, left_on="device_id", right_on="device_uuid", how="left")
    r34 = r[r["device_code"] == "KPCL0034"].copy()
    r34["recorded_at"] = pd.to_datetime(r34["recorded_at"], utc=True, errors="coerce")
    r34 = r34.dropna(subset=["recorded_at", "weight_grams"]).sort_values("recorded_at")
    if "clock_invalid" in r34.columns:
        r34 = r34[r34["clock_invalid"] != True]
    return r34


def _daily_stats(f34, fs34):
    """Calcula estadísticas diarias de consumo y aprovechamiento."""
    f34 = f34.copy()
    f34["date"] = f34["session_start"].dt.date
    daily_alim = f34.groupby("date").agg(
        total_consumed=("consumed_grams", "sum"),
        n_sesiones=("session_id", "count"),
        avg_duration=("duration_min", "mean"),
        avg_rate=("rate_g_per_min", "mean"),
    ).reset_index()
    daily_alim["rolling3"] = daily_alim["total_consumed"].rolling(3, min_periods=1).mean()

    fs34 = fs34.copy()
    fs34["date"] = fs34["session_start"].dt.date
    daily_serv = fs34.groupby("date").agg(total_served=("served_grams", "sum")).reset_index()

    daily = daily_serv.merge(daily_alim, on="date", how="outer").fillna(0).sort_values("date")
    daily["aprov"] = (
        daily["total_consumed"] / daily["total_served"].replace(0, np.nan) * 100
    ).round(1)
    return daily_alim, daily


def _band_trace(start, end, fillcolor, line_color, name, legendgroup, showlegend, hover):
    """Genera una banda rectangular en el gráfico de peso."""
    import plotly.graph_objects as go
    return go.Scatter(
        x=[start, start, end, end, start],
        y=[0, 1e6, 1e6, 0, 0],
        fill="toself",
        fillcolor=fillcolor,
        line=dict(color=line_color, width=1),
        mode="lines",
        name=name,
        legendgroup=legendgroup,
        showlegend=showlegend,
        hovertemplate=hover + "<extra></extra>",
    )


def build_kpcl_dashboard(
    features, sessions, features_servido, sessions_servido,
    enriched, readings, devices
):
    """
    Genera el dashboard HTML completo con 4 paneles:
      1. Peso bruto + sesiones etiquetadas (timeseries con range slider)
      2. Consumo diario (barras + media móvil 3d)
      3. Servido vs. Consumido + aprovechamiento
      4. Duración y ritmo por sesión
    """
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    import plotly.io as pio

    # Preparar DataFrames filtrados para KPCL0034
    r34  = _prep_readings_for_plot(readings, devices)
    f34  = features[features["device_code"] == "KPCL0034"].copy()
    s34  = sessions[sessions["device_code"] == "KPCL0034"].copy()
    fs34 = features_servido[features_servido["device_code"] == "KPCL0034"].copy()
    ss34 = sessions_servido[sessions_servido["device_code"] == "KPCL0034"].copy()
    fs34["served_grams"] = fs34["consumed_grams"].abs()

    daily_alim, daily = _daily_stats(f34, fs34)
    daily_completo = daily[daily["total_served"] > 0].copy()

    # Rango Y del panel de peso
    w_vals = r34["weight_grams"].dropna()
    y_lo = max(0, w_vals.quantile(0.001) - 20)
    y_hi = w_vals.quantile(0.999) + 40

    # ── Panel 1: Peso bruto + sesiones ──────────────────────────────────────
    fig1 = make_subplots(rows=1, cols=1)

    fig1.add_trace(go.Scatter(
        x=r34["recorded_at"], y=r34["weight_grams"],
        mode="lines", name="Peso bruto",
        line=dict(color=PALETTE["accent_red"], width=1.6, shape="hv"),
        fill="tozeroy", fillcolor="rgba(248,81,73,0.06)",
        hovertemplate="<b>%{x|%d %b %H:%M UTC}</b><br>Peso: <b>%{y:.1f} g</b><extra></extra>",
    ))

    seen_alim = False
    for _, s in s34.iterrows():
        dur = (s["end_at"] - s["start_at"]).total_seconds() / 60
        fig1.add_trace(_band_trace(
            start=s["start_at"], end=s["end_at"],
            fillcolor="rgba(63,185,80,0.12)", line_color=PALETTE["accent_green"],
            name="Alimentación", legendgroup="alim", showlegend=not seen_alim,
            hover=(f"<b>🥩 Alimentación</b><br>"
                   f"Inicio: {s['start_at'].strftime('%d %b %H:%M')}<br>"
                   f"Fin: {s['end_at'].strftime('%d %b %H:%M')}<br>"
                   f"Duración: {dur:.0f} min"),
        ))
        seen_alim = True

    seen_serv = False
    for _, s in ss34.iterrows():
        dur = (s["end_at"] - s["start_at"]).total_seconds() / 60
        fig1.add_trace(_band_trace(
            start=s["start_at"], end=s["end_at"],
            fillcolor="rgba(240,136,62,0.14)", line_color=PALETTE["accent_orange"],
            name="Servido", legendgroup="serv", showlegend=not seen_serv,
            hover=(f"<b>🍽️ Servido</b><br>"
                   f"Inicio: {s['start_at'].strftime('%d %b %H:%M')}<br>"
                   f"Fin: {s['end_at'].strftime('%d %b %H:%M')}<br>"
                   f"Duración: {dur:.0f} min"),
        ))
        seen_serv = True

    fig1.add_trace(go.Scatter(
        x=f34["session_start"], y=f34["weight_start_g"],
        mode="markers", name="▶ Inicio alim.",
        marker=dict(symbol="diamond", size=11, color=PALETTE["accent_green"],
                    line=dict(color="#0d1117", width=1.5)),
        hovertemplate=("<b>▶ Inicio alimentación</b><br>%{x|%d %b %H:%M}<br>"
                       "Peso: %{y:.1f} g<extra></extra>"),
    ))
    fig1.add_trace(go.Scatter(
        x=f34["session_end"], y=f34["weight_end_g"],
        mode="markers", name="■ Fin alim.",
        marker=dict(symbol="diamond-open", size=11, color="#2ea043",
                    line=dict(color="#2ea043", width=2)),
        hovertemplate=("<b>■ Fin alimentación</b><br>%{x|%d %b %H:%M}<br>"
                       "Peso: %{y:.1f} g<br>Consumido: <b>%{customdata:.1f} g</b><extra></extra>"),
        customdata=f34["consumed_grams"],
    ))
    fig1.add_trace(go.Scatter(
        x=fs34["session_start"], y=fs34["weight_start_g"],
        mode="markers", name="▶ Inicio servido",
        marker=dict(symbol="triangle-up", size=12, color=PALETTE["accent_orange"],
                    line=dict(color="#0d1117", width=1.5)),
        hovertemplate=("<b>▶ Inicio servido</b><br>%{x|%d %b %H:%M}<br>"
                       "Servido: <b>%{customdata:.1f} g</b><extra></extra>"),
        customdata=fs34["served_grams"],
    ))
    fig1.add_trace(go.Scatter(
        x=fs34["session_end"], y=fs34["weight_end_g"],
        mode="markers", name="■ Fin servido",
        marker=dict(symbol="triangle-down", size=12, color="#d1810a",
                    line=dict(color="#0d1117", width=1.5)),
        hovertemplate=("<b>■ Fin servido</b><br>%{x|%d %b %H:%M}<br>"
                       "Peso: %{y:.1f} g<extra></extra>"),
    ))

    fig1.update_layout(
        height=520,
        title=dict(
            text="<b>Peso bruto</b> · Sesiones etiquetadas de alimentación y servido",
            font=dict(size=14, color=PALETTE["text_primary"], family="'DM Mono', monospace"),
            x=0.0, y=0.98,
        ),
        paper_bgcolor=PALETTE["bg_card"],
        plot_bgcolor=PALETTE["bg_dark"],
        font=dict(family="'DM Mono', monospace", color=PALETTE["text_muted"], size=11),
        legend=dict(orientation="h", yanchor="top", y=-0.12, xanchor="left", x=0,
                    bgcolor="rgba(0,0,0,0)", font=dict(size=11, color=PALETTE["text_primary"]),
                    itemclick="toggle", itemdoubleclick="toggleothers"),
        margin=dict(l=65, r=30, t=55, b=80),
        xaxis=dict(
            showgrid=True, gridcolor=PALETTE["grid"], gridwidth=1,
            tickformat="%d %b\n%H:%M", tickfont=dict(size=10, color=PALETTE["text_muted"]),
            linecolor=PALETTE["border"],
            rangeselector=dict(
                buttons=RANGE_BUTTONS,
                bgcolor=PALETTE["bg_card2"], activecolor=PALETTE["accent_green"],
                font=dict(size=10, color=PALETTE["text_primary"]),
                bordercolor=PALETTE["border"],
            ),
            rangeslider=dict(visible=True, thickness=0.04,
                             bgcolor=PALETTE["bg_card2"], bordercolor=PALETTE["border"]),
        ),
        yaxis=dict(
            title=dict(text="Peso (g)", font=dict(color=PALETTE["text_muted"], size=11)),
            range=[y_lo, y_hi], showgrid=True, gridcolor=PALETTE["grid"], gridwidth=1,
            tickfont=dict(size=10, color=PALETTE["text_muted"]),
            linecolor=PALETTE["border"], zeroline=False,
        ),
    )

    # ── Panel 2: Consumo diario ──────────────────────────────────────────────
    fig2 = go.Figure()
    fig2.add_trace(go.Bar(
        x=daily_alim["date"].astype(str), y=daily_alim["total_consumed"],
        name="Consumido (g)",
        marker=dict(color=PALETTE["accent_green"], opacity=0.75,
                    line=dict(color="#2ea043", width=1)),
        hovertemplate="%{x}<br>Consumido: <b>%{y:.1f} g</b><extra></extra>",
    ))
    fig2.add_trace(go.Scatter(
        x=daily_alim["date"].astype(str), y=daily_alim["rolling3"],
        mode="lines+markers", name="Media 3 días",
        line=dict(color=PALETTE["accent_orange"], width=2.5),
        marker=dict(size=7, color=PALETTE["accent_orange"],
                    line=dict(color="#0d1117", width=1.5)),
        hovertemplate="%{x}<br>Media 3d: <b>%{y:.1f} g</b><extra></extra>",
    ))
    ref_line = daily_alim["total_consumed"].mean()
    fig2.add_hline(
        y=ref_line, line_dash="dot", line_color=PALETTE["accent_purple"], line_width=1.5,
        annotation_text=f"Prom: {ref_line:.0f} g",
        annotation_position="right",
        annotation_font=dict(color=PALETTE["accent_purple"], size=10),
    )
    fig2.update_layout(
        height=320,
        title=dict(text="<b>Consumo diario</b> · Gramos consumidos por día",
                   font=dict(size=14, color=PALETTE["text_primary"],
                             family="'DM Mono', monospace"), x=0.0),
        paper_bgcolor=PALETTE["bg_card"], plot_bgcolor=PALETTE["bg_dark"],
        font=dict(family="'DM Mono', monospace", color=PALETTE["text_muted"], size=11),
        legend=dict(orientation="h", yanchor="top", y=-0.18, xanchor="left", x=0,
                    bgcolor="rgba(0,0,0,0)", font=dict(size=11, color=PALETTE["text_primary"])),
        margin=dict(l=65, r=120, t=55, b=70),
        xaxis=dict(showgrid=False, tickfont=dict(size=10, color=PALETTE["text_muted"]),
                   linecolor=PALETTE["border"]),
        yaxis=dict(title=dict(text="Gramos (g)", font=dict(color=PALETTE["text_muted"], size=11)),
                   showgrid=True, gridcolor=PALETTE["grid"], gridwidth=1,
                   tickfont=dict(size=10, color=PALETTE["text_muted"]),
                   linecolor=PALETTE["border"], zeroline=False),
        barmode="group",
    )

    # ── Panel 3: Servido vs Consumido + aprovechamiento ──────────────────────
    fig3 = go.Figure()
    fig3.add_trace(go.Bar(
        x=daily_completo["date"].astype(str), y=daily_completo["total_served"],
        name="Servido (g)",
        marker=dict(color=PALETTE["accent_orange"], opacity=0.7,
                    line=dict(color="#d1810a", width=1)),
        hovertemplate="%{x}<br>Servido: <b>%{y:.1f} g</b><extra></extra>",
    ))
    fig3.add_trace(go.Bar(
        x=daily_completo["date"].astype(str), y=daily_completo["total_consumed"],
        name="Consumido (g)",
        marker=dict(color=PALETTE["accent_green"], opacity=0.8,
                    line=dict(color="#2ea043", width=1)),
        hovertemplate="%{x}<br>Consumido: <b>%{y:.1f} g</b><extra></extra>",
    ))
    fig3.add_trace(go.Scatter(
        x=daily_completo["date"].astype(str), y=daily_completo["aprov"],
        mode="lines+markers", name="Aprovechamiento (%)",
        line=dict(color=PALETTE["accent_purple"], width=2.5),
        marker=dict(size=8, color=PALETTE["accent_purple"],
                    line=dict(color="#0d1117", width=1.5)),
        yaxis="y2",
        hovertemplate="%{x}<br>Aprovechamiento: <b>%{y:.1f}%</b><extra></extra>",
    ))
    fig3.update_layout(
        height=320,
        title=dict(text="<b>Servido vs Consumido</b> · Aprovechamiento por día",
                   font=dict(size=14, color=PALETTE["text_primary"],
                             family="'DM Mono', monospace"), x=0.0),
        paper_bgcolor=PALETTE["bg_card"], plot_bgcolor=PALETTE["bg_dark"],
        font=dict(family="'DM Mono', monospace", color=PALETTE["text_muted"], size=11),
        legend=dict(orientation="h", yanchor="top", y=-0.18, xanchor="left", x=0,
                    bgcolor="rgba(0,0,0,0)", font=dict(size=11, color=PALETTE["text_primary"])),
        margin=dict(l=65, r=80, t=55, b=70),
        xaxis=dict(showgrid=False, tickfont=dict(size=10, color=PALETTE["text_muted"]),
                   linecolor=PALETTE["border"]),
        yaxis=dict(title=dict(text="Gramos (g)", font=dict(color=PALETTE["text_muted"], size=11)),
                   showgrid=True, gridcolor=PALETTE["grid"], gridwidth=1,
                   tickfont=dict(size=10, color=PALETTE["text_muted"]),
                   linecolor=PALETTE["border"], zeroline=False),
        yaxis2=dict(
            title=dict(text="Aprovechamiento (%)",
                       font=dict(color=PALETTE["accent_purple"], size=11)),
            overlaying="y", side="right", range=[0, 150],
            showgrid=False, tickfont=dict(size=10, color=PALETTE["accent_purple"]),
            ticksuffix="%",
        ),
        barmode="group",
    )

    # ── Panel 4: Duración y ritmo por sesión ─────────────────────────────────
    f34_sorted = f34.sort_values("session_start").copy()
    x_labels = f34_sorted["session_start"].dt.strftime("%d/%m %H:%M")
    avg_rate  = f34_sorted["rate_g_per_min"].mean()

    fig4 = go.Figure()
    fig4.add_trace(go.Bar(
        x=x_labels, y=f34_sorted["duration_min"],
        name="Duración (min)",
        marker=dict(color=PALETTE["accent_blue"], opacity=0.65,
                    line=dict(color="#1f6feb", width=1)),
        hovertemplate="%{x}<br>Duración: <b>%{y:.1f} min</b><extra></extra>",
    ))
    fig4.add_trace(go.Scatter(
        x=x_labels, y=f34_sorted["rate_g_per_min"],
        mode="lines+markers", name="Ritmo (g/min)",
        line=dict(color=PALETTE["accent_red"], width=2.5),
        marker=dict(size=7, color=PALETTE["accent_red"],
                    line=dict(color="#0d1117", width=1.5)),
        yaxis="y2",
        hovertemplate="%{x}<br>Ritmo: <b>%{y:.2f} g/min</b><extra></extra>",
    ))
    fig4.add_hline(
        y=avg_rate, yref="y2",
        line_dash="dot", line_color=PALETTE["accent_orange"], line_width=1.5,
        annotation_text=f"Prom: {avg_rate:.2f} g/min",
        annotation_position="right",
        annotation_font=dict(color=PALETTE["accent_orange"], size=10),
    )
    fig4.update_layout(
        height=300,
        title=dict(text="<b>Duración y ritmo</b> · Por sesión de alimentación",
                   font=dict(size=14, color=PALETTE["text_primary"],
                             family="'DM Mono', monospace"), x=0.0),
        paper_bgcolor=PALETTE["bg_card"], plot_bgcolor=PALETTE["bg_dark"],
        font=dict(family="'DM Mono', monospace", color=PALETTE["text_muted"], size=11),
        legend=dict(orientation="h", yanchor="top", y=-0.22, xanchor="left", x=0,
                    bgcolor="rgba(0,0,0,0)", font=dict(size=11, color=PALETTE["text_primary"])),
        margin=dict(l=65, r=100, t=55, b=80),
        xaxis=dict(showgrid=False, tickfont=dict(size=9, color=PALETTE["text_muted"]),
                   tickangle=-35, linecolor=PALETTE["border"]),
        yaxis=dict(title=dict(text="Minutos", font=dict(color=PALETTE["text_muted"], size=11)),
                   showgrid=True, gridcolor=PALETTE["grid"], gridwidth=1,
                   tickfont=dict(size=10, color=PALETTE["text_muted"]),
                   linecolor=PALETTE["border"], zeroline=False),
        yaxis2=dict(
            title=dict(text="g / min", font=dict(color=PALETTE["accent_red"], size=11)),
            overlaying="y", side="right", showgrid=False,
            tickfont=dict(size=10, color=PALETTE["accent_red"]),
        ),
        barmode="group",
    )

    # ── KPIs para el header HTML ──────────────────────────────────────────────
    total_sesiones   = len(f34)
    total_consumido  = f34["consumed_grams"].sum()
    prom_consumo_dia = daily_alim["total_consumed"].mean()
    prom_duracion    = f34["duration_min"].mean()
    prom_ritmo       = f34["rate_g_per_min"].mean()
    sesiones_x_dia   = daily_alim["n_sesiones"].mean()
    aprov_prom       = daily_completo["aprov"].mean() if len(daily_completo) > 0 else 0
    fecha_inicio     = f34["session_start"].min().strftime("%d %b")
    fecha_fin        = f34["session_start"].max().strftime("%d %b %Y")

    # ── Serializar figuras ────────────────────────────────────────────────────
    html1 = pio.to_html(fig1, full_html=False, include_plotlyjs="cdn",
                        config=PLOT_CONFIG, div_id="fig_peso")
    html2 = pio.to_html(fig2, full_html=False, include_plotlyjs=False,
                        config=PLOT_CONFIG, div_id="fig_diario")
    html3 = pio.to_html(fig3, full_html=False, include_plotlyjs=False,
                        config=PLOT_CONFIG, div_id="fig_aprov")
    html4 = pio.to_html(fig4, full_html=False, include_plotlyjs=False,
                        config=PLOT_CONFIG, div_id="fig_ritmo")

    # ── Tabla de sesiones recientes ───────────────────────────────────────────
    f34_desc = f34.sort_values("session_start", ascending=False).head(20)
    session_rows = ""
    for i, (_, row) in enumerate(f34_desc.iterrows()):
        rate_color = PALETTE["accent_green"] if row["rate_g_per_min"] > prom_ritmo else PALETTE["accent_red"]
        bar_width  = min(100, row["consumed_grams"] / max(f34["consumed_grams"].max(), 1) * 100)
        session_rows += f"""
        <tr class="srow" style="animation-delay:{i*0.04:.2f}s">
          <td style="color:{PALETTE['text_muted']};font-size:11px">
            {row['session_start'].strftime('%d %b')}<br>
            <span style="color:{PALETTE['accent_blue']}">{row['session_start'].strftime('%H:%M')}</span>
          </td>
          <td style="color:{PALETTE['accent_orange']}">{row['duration_min']:.1f} min</td>
          <td style="color:{PALETTE['accent_green']};font-weight:600">{row['consumed_grams']:.1f} g</td>
          <td style="color:{rate_color}">{row['rate_g_per_min']:.2f} g/min</td>
          <td>
            <div style="background:{PALETTE['bg_dark']};border-radius:4px;height:8px;width:100px;overflow:hidden">
              <div style="background:{PALETTE['accent_green']};height:100%;border-radius:4px;width:{bar_width:.0f}%"></div>
            </div>
          </td>
        </tr>"""

    # ── HTML completo ─────────────────────────────────────────────────────────
    full_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet">
  <title>KPCL0034 · Dashboard · {fecha_fin}</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    html,body{{background:{PALETTE['bg_dark']};color:{PALETTE['text_primary']};
      font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.6}}
    @keyframes fadeSlideDown{{from{{opacity:0;transform:translateY(-16px)}}to{{opacity:1;transform:translateY(0)}}}}
    @keyframes fadeSlideUp{{from{{opacity:0;transform:translateY(20px)}}to{{opacity:1;transform:translateY(0)}}}}
    @keyframes rowFade{{from{{opacity:0;transform:translateX(-8px)}}to{{opacity:1;transform:translateX(0)}}}}
    @keyframes pulse{{0%,100%{{opacity:1}}50%{{opacity:.5}}}}
    .wrapper{{max-width:1400px;margin:0 auto;padding:28px 24px 60px}}
    .header{{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:32px;animation:fadeSlideDown .5s ease both}}
    .header h1{{font-family:'DM Mono',monospace;font-size:22px;font-weight:500;letter-spacing:-.02em;line-height:1.2}}
    .header h1 span{{color:{PALETTE['accent_green']}}}
    .header p{{color:{PALETTE['text_muted']};font-size:12px;margin-top:6px;font-family:'DM Mono',monospace}}
    .status-dot{{display:inline-block;width:7px;height:7px;border-radius:50%;background:{PALETTE['accent_green']};margin-right:6px;animation:pulse 2.5s ease-in-out infinite}}
    .kpi-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px;animation:fadeSlideUp .5s ease .1s both}}
    .kpi{{background:{PALETTE['bg_card']};border:1px solid {PALETTE['border']};border-radius:10px;padding:16px 18px;transition:border-color .2s,transform .2s}}
    .kpi:hover{{border-color:#3d444d;transform:translateY(-2px)}}
    .kpi-label{{font-size:10px;font-family:'DM Mono',monospace;color:{PALETTE['text_muted']};text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}}
    .kpi-value{{font-family:'DM Mono',monospace;font-size:26px;font-weight:500;line-height:1}}
    .kpi-unit{{font-size:12px;color:{PALETTE['text_muted']};margin-top:4px;font-family:'DM Mono',monospace}}
    .green .kpi-value{{color:{PALETTE['accent_green']}}} .orange .kpi-value{{color:{PALETTE['accent_orange']}}}
    .red .kpi-value{{color:{PALETTE['accent_red']}}} .purple .kpi-value{{color:{PALETTE['accent_purple']}}}
    .blue .kpi-value{{color:{PALETTE['accent_blue']}}}
    .card{{background:{PALETTE['bg_card']};border:1px solid {PALETTE['border']};border-radius:12px;padding:20px 22px;margin-bottom:20px;animation:fadeSlideUp .5s ease both}}
    .section-label{{font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:{PALETTE['text_muted']};margin:28px 0 14px;display:flex;align-items:center;gap:10px}}
    .section-label::after{{content:'';flex:1;height:1px;background:{PALETTE['border']}}}
    .grid-2{{display:grid;grid-template-columns:1fr 1fr;gap:20px}}
    @media(max-width:900px){{.grid-2{{grid-template-columns:1fr}}}}
    table{{width:100%;border-collapse:collapse;font-family:'DM Mono',monospace;font-size:12px}}
    th{{text-align:left;padding:8px 12px;color:{PALETTE['text_muted']};font-weight:400;font-size:10px;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid {PALETTE['border']}}}
    .srow{{animation:rowFade .4s ease both;border-bottom:1px solid rgba(48,54,61,.5);transition:background .15s}}
    .srow:hover{{background:rgba(255,255,255,.02)}}
    .srow td{{padding:9px 12px;vertical-align:middle}}
    .footer{{margin-top:40px;padding-top:20px;border-top:1px solid {PALETTE['border']};font-family:'DM Mono',monospace;font-size:10px;color:{PALETTE['text_muted']};display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div>
      <h1>KPCL<span>0034</span> · Comedero · Bandida</h1>
      <p><span class="status-dot"></span>{fecha_inicio} → {fecha_fin} · Sesiones etiquetadas manualmente</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi green"><div class="kpi-label">Sesiones</div><div class="kpi-value">{total_sesiones}</div><div class="kpi-unit">alimentación</div></div>
    <div class="kpi orange"><div class="kpi-label">Total consumido</div><div class="kpi-value">{total_consumido:.0f}</div><div class="kpi-unit">gramos totales</div></div>
    <div class="kpi blue"><div class="kpi-label">Consumo diario</div><div class="kpi-value">{prom_consumo_dia:.0f}</div><div class="kpi-unit">g promedio/día</div></div>
    <div class="kpi red"><div class="kpi-label">Duración media</div><div class="kpi-value">{prom_duracion:.1f}</div><div class="kpi-unit">min por sesión</div></div>
    <div class="kpi purple"><div class="kpi-label">Ritmo medio</div><div class="kpi-value">{prom_ritmo:.2f}</div><div class="kpi-unit">g/min</div></div>
    <div class="kpi green"><div class="kpi-label">Sesiones/día</div><div class="kpi-value">{sesiones_x_dia:.1f}</div><div class="kpi-unit">promedio</div></div>
    <div class="kpi orange"><div class="kpi-label">Aprovechamiento</div><div class="kpi-value">{aprov_prom:.0f}%</div><div class="kpi-unit">promedio días con servido</div></div>
  </div>

  <div class="section-label">Peso bruto y sesiones etiquetadas</div>
  <div class="card">{html1}</div>

  <div class="grid-2">
    <div class="card">{html2}</div>
    <div class="card">{html3}</div>
  </div>

  <div class="section-label">Dinámica por sesión</div>
  <div class="card">{html4}</div>

  <div class="section-label">Últimas 20 sesiones</div>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Fecha</th><th>Duración</th><th>Consumido</th><th>Ritmo</th><th>Barra</th>
        </tr>
      </thead>
      <tbody>{session_rows}</tbody>
    </table>
  </div>

  <div class="footer">
    <span>KPCL0034 · Kittypau · Export {fecha_fin}</span>
    <span>Generado con colab_analisis_kpcl0034_07052026.py</span>
  </div>
</div>
</body>
</html>"""

    return full_html


# =============================================================================
# MAIN — EJECUCIÓN COMPLETA
# =============================================================================

if __name__ == "__main__":
    import plotly.io as pio

    # Fase 1
    timeline, sessions, readings, devices = run_fase_1()

    # Fase 2 — alimentación
    enriched, features = run_fase_2(timeline, sessions, readings, devices)

    # Fase 2 — servido
    sessions_servido = build_sessions_servido(timeline)
    enriched_servido, features_servido = run_fase_2(
        timeline, sessions_servido, readings, devices
    )

    # Análisis KPCL0034 (validado dato por dato por Mauro)
    kpcl34, kpcl34_servido = analyze_kpcl0034(features, features_servido)

    # Cruce diario
    daily = daily_cross_analysis(kpcl34, kpcl34_servido)

    # Dashboard
    print("\nGenerando dashboard...")
    html = build_kpcl_dashboard(
        features, sessions, features_servido, sessions_servido,
        enriched, readings, devices
    )

    output_path = "kpcl0034_dashboard_colab.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Dashboard guardado en: {output_path}")
