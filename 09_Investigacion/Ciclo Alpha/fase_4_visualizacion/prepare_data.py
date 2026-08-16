#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
# Forzar UTF-8 en stdout para evitar UnicodeEncodeError en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
fase_4_visualizacion/prepare_data.py
=====================================
Puente de datos entre las fases anteriores y la visualización React.

Lee los artefactos de:
  - Fase 1 (fase_1_extraccion/data/raw/)        → readings, events, sessions
  - Fase 2 (fase_2_dataset/data/train/)          → dataset_meta, label_encoder
  - Fase 3 (fase_3_modelos/models/, outputs/)    → feature_importance, training_history

Genera en public/data/:
  readings_chart.json     — lecturas decimadas LTTB (~3000 puntos)
  sessions.json           — sesiones reconstruidas con duración y consumo
  events.json             — eventos individuales etiquetados
  kpis.json               — métricas resumen del período
  daily.json              — consumo y conteo por día
  histogram.json          — distribución de duración de sesiones
  feature_importance.json — importancia de features modelos A y B
  dataset_meta.json       — meta del dataset de Fase 2 (clases, splits)

Ejecutar:
  cd "Data Science/fase_4_visualizacion"
  python prepare_data.py
"""

import json
import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np

# ── Rutas ─────────────────────────────────────────────────────────────────────
BASE       = Path(__file__).parent          # Data Science/fase_4_visualizacion/
DS_DIR     = BASE.parent                    # Data Science/
OUT_DIR    = BASE / "public" / "data"

F1_RAW     = DS_DIR / "fase_1_extraccion" / "data" / "raw"
F2_TRAIN   = DS_DIR / "fase_2_dataset"   / "data" / "train"
F3_MODELS  = DS_DIR / "fase_3_modelos"   / "models"
F3_OUTPUTS = DS_DIR / "fase_3_modelos"   / "outputs"

OUT_DIR.mkdir(parents=True, exist_ok=True)

CHART_POINTS = 3000  # lecturas decimadas para el gráfico principal

# ── Helpers ───────────────────────────────────────────────────────────────────

def ts_to_str(val):
    """Convierte un timestamp pandas a string ISO8601."""
    if pd.isna(val):
        return None
    if hasattr(val, 'isoformat'):
        return val.isoformat()
    return str(val)

def lttb(x, y, threshold):
    """
    Largest-Triangle-Three-Buckets (LTTB) downsampling.
    Preserva picos y valles visualmente relevantes.
    """
    n = len(x)
    if threshold >= n or threshold <= 2:
        return x, y

    sampled_x, sampled_y = [x[0]], [y[0]]
    bucket_size = (n - 2) / (threshold - 2)
    a = 0

    for i in range(threshold - 2):
        avg_range_start = int(np.floor((i + 1) * bucket_size)) + 1
        avg_range_end   = min(int(np.floor((i + 2) * bucket_size)) + 1, n)

        avg_x = np.mean(x[avg_range_start:avg_range_end])
        avg_y = np.mean(y[avg_range_start:avg_range_end])

        range_start = int(np.floor(i * bucket_size)) + 1
        range_end   = int(np.floor((i + 1) * bucket_size)) + 1

        ax, ay = x[a], y[a]
        max_area, max_idx = -1, range_start

        for j in range(range_start, range_end):
            area = abs((ax - avg_x) * (y[j] - ay) - (ax - x[j]) * (avg_y - ay)) * 0.5
            if area > max_area:
                max_area, max_idx = area, j

        sampled_x.append(x[max_idx])
        sampled_y.append(y[max_idx])
        a = max_idx

    sampled_x.append(x[-1])
    sampled_y.append(y[-1])
    return sampled_x, sampled_y

def save_json(obj, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, default=str)
    kb = os.path.getsize(path) / 1024
    print(f"  ✓  {path.name:35s}  {kb:.0f} KB")

# ── 1. Lecturas (readings_raw.parquet) ───────────────────────────────────────

def build_readings_chart():
    path = F1_RAW / "readings_raw.parquet"
    if not path.exists():
        print(f"  ⚠  {path} no encontrado. Saltando.")
        return None

    df = pd.read_parquet(path)

    # El parquet ya incluye columna 'ts' (timestamp resuelto por Fase 1)
    # Fallback: recalcular desde recorded_at / ingested_at
    if 'ts' not in df.columns:
        if 'clock_invalid' in df.columns and 'ingested_at' in df.columns:
            df['ts'] = np.where(
                df['clock_invalid'].fillna(False).astype(bool),
                pd.to_datetime(df['ingested_at'], utc=True, errors='coerce'),
                pd.to_datetime(df['recorded_at'], utc=True, errors='coerce'),
            )
        else:
            col = 'recorded_at' if 'recorded_at' in df.columns else 'ingested_at'
            df['ts'] = pd.to_datetime(df[col], utc=True, errors='coerce')
    else:
        df['ts'] = pd.to_datetime(df['ts'], utc=True, errors='coerce')

    df = df.dropna(subset=['ts', 'weight_grams']).sort_values('ts').reset_index(drop=True)

    n_original = len(df)
    x_ms = df['ts'].astype('int64') // 1_000_000  # ms desde epoch
    y    = df['weight_grams'].values.astype(float)

    x_s, y_s = lttb(x_ms.tolist(), y.tolist(), CHART_POINTS)

    result = {
        "n_original": n_original,
        "n_chart":    len(x_s),
        "first_ts":   ts_to_str(df['ts'].iloc[0]),
        "last_ts":    ts_to_str(df['ts'].iloc[-1]),
        "timestamps_ms": x_s,
        "weight_grams":  [round(v, 2) for v in y_s],
    }
    save_json(result, OUT_DIR / "readings_chart.json")
    return df

# ── 2. Eventos (events_labeled.parquet) ─────────────────────────────────────

def build_events(readings_df=None):
    path = F1_RAW / "events_labeled.parquet"
    if not path.exists():
        print(f"  ⚠  {path} no encontrado. Saltando.")
        return []

    df = pd.read_parquet(path)

    # Detectar columna de timestamp
    ts_col = next((c for c in ['created_at', 'event_at', 'ts'] if c in df.columns), None)
    if not ts_col:
        print(f"  ⚠  No se encontró columna de timestamp en events_labeled.parquet")
        return []

    df['ts'] = pd.to_datetime(df[ts_col], utc=True, errors='coerce')

    # Detectar columna de categoría
    cat_col = next((c for c in ['category', 'event_type', 'label'] if c in df.columns), None)

    events = []
    for _, row in df.iterrows():
        if pd.isna(row['ts']):
            continue

        cat = str(row[cat_col]) if cat_col else 'unknown'

        # Buscar peso más cercano en readings si está disponible
        weight = None
        if readings_df is not None:
            diff = (readings_df['ts'] - row['ts']).abs()
            idx_min = diff.idxmin()
            if diff[idx_min].total_seconds() < 120:
                weight = float(readings_df.loc[idx_min, 'weight_grams'])

        events.append({
            "ts":       ts_to_str(row['ts']),
            "category": cat,
            "weight":   round(weight, 2) if weight is not None else None,
        })

    save_json(events, OUT_DIR / "events.json")
    return events

# ── 3. Sesiones (sessions_labeled.parquet) ──────────────────────────────────

def build_sessions(readings_df=None):
    """
    Lee sessions_labeled.parquet (columnas reales: start, end, session_type, duration_s).
    Calcula consumed_g cruzando con readings si está disponible.
    """
    path = F1_RAW / "sessions_labeled.parquet"
    if not path.exists():
        print(f"  ⚠  {path} no encontrado. Saltando.")
        return []

    df = pd.read_parquet(path)

    # Columnas reales del pipeline de Fase 1
    start_col  = next((c for c in ['start', 'session_start_at', 'start_at'] if c in df.columns), None)
    end_col    = next((c for c in ['end',   'session_end_at',   'end_at']   if c in df.columns), None)
    type_col   = next((c for c in ['session_type', 'type', 'label']         if c in df.columns), None)
    dur_col    = next((c for c in ['duration_s', 'duration_seconds', 'duration_sec', 'duration'] if c in df.columns), None)
    cons_col   = next((c for c in ['net_grams', 'consumed_grams', 'consumed_g'] if c in df.columns), None)

    # Preparar readings para merge_asof (buscar peso en start y end)
    rd = None
    if readings_df is not None:
        rd = readings_df[['ts', 'weight_grams']].copy().sort_values('ts').reset_index(drop=True)

    def nearest_weight(ts_val):
        if rd is None or pd.isna(ts_val):
            return None
        diff = (rd['ts'] - ts_val).abs()
        idx  = diff.idxmin()
        if diff[idx].total_seconds() > 300:
            return None
        return float(rd.loc[idx, 'weight_grams'])

    sessions = []
    for _, row in df.iterrows():
        start_ts = pd.to_datetime(row[start_col], utc=True) if start_col else None
        end_ts   = pd.to_datetime(row[end_col],   utc=True) if end_col else None
        if start_ts is None or pd.isna(start_ts):
            continue

        dur_sec  = float(row[dur_col]) if dur_col and pd.notna(row.get(dur_col)) else (
            (end_ts - start_ts).total_seconds() if end_ts and not pd.isna(end_ts) else None
        )

        # Consumo: desde parquet si existe, si no calcular desde readings
        if cons_col and pd.notna(row.get(cons_col)):
            consumed = max(0.0, float(row[cons_col]))
        else:
            w_start = nearest_weight(start_ts)
            w_end   = nearest_weight(end_ts)
            stype   = str(row[type_col]).lower() if type_col else ''
            if w_start is not None and w_end is not None:
                consumed = max(0.0, w_end - w_start) if 'servido' in stype else max(0.0, w_start - w_end)
            else:
                consumed = 0.0

        sessions.append({
            "id":           f"{row[type_col]}_{int(start_ts.timestamp() * 1000)}" if type_col else f"s_{int(start_ts.timestamp() * 1000)}",
            "type":         str(row[type_col]) if type_col else 'unknown',
            "start_at":     ts_to_str(start_ts),
            "end_at":       ts_to_str(end_ts),
            "duration_sec": round(dur_sec, 1) if dur_sec is not None else None,
            "duration_min": round(dur_sec / 60, 2) if dur_sec is not None else None,
            "consumed_g":   round(consumed, 2),
            "is_valid":     True,
        })

    sessions.sort(key=lambda s: s['start_at'] or '')
    save_json(sessions, OUT_DIR / "sessions.json")
    return sessions

# ── 4. KPIs ───────────────────────────────────────────────────────────────────

def build_kpis(sessions, readings_df=None):
    alim = [s for s in sessions if s['type'] == 'alimentacion']
    serv = [s for s in sessions if s['type'] == 'servido']
    hidr = [s for s in sessions if s['type'] == 'hidratacion']

    total_consumed = sum(s['consumed_g'] for s in alim)
    total_served   = sum(s['consumed_g'] for s in serv)
    avg_duration   = np.mean([s['duration_min'] for s in alim if s['duration_min']]) if alim else 0
    valid_alim     = [s for s in alim if s['duration_min'] and s['duration_min'] > 0]
    avg_rate       = np.mean([s['consumed_g'] / s['duration_min'] for s in valid_alim]) if valid_alim else 0

    aprov = (total_consumed / total_served * 100) if total_served > 0 else None

    ses_per_day = 0
    if len(alim) >= 2:
        from datetime import datetime
        first = datetime.fromisoformat(alim[0]['start_at'].replace('Z', '+00:00'))
        last  = datetime.fromisoformat(alim[-1]['start_at'].replace('Z', '+00:00'))
        days  = max(1, (last - first).total_seconds() / 86400)
        ses_per_day = len(alim) / days

    kpis = {
        "total_alim":       len(alim),
        "total_serv":       len(serv),
        "total_hidr":       len(hidr),
        "total_consumed_g": round(total_consumed, 1),
        "total_served_g":   round(total_served, 1),
        "avg_duration_min": round(float(avg_duration), 2),
        "avg_rate_g_per_min": round(float(avg_rate), 3),
        "aprovechamiento_pct": round(float(aprov), 1) if aprov is not None else None,
        "ses_per_day":      round(ses_per_day, 1),
        "n_readings":       len(readings_df) if readings_df is not None else None,
        "n_chart_points":   CHART_POINTS,
        "first_ts":         alim[0]['start_at'] if alim else None,
        "last_ts":          alim[-1]['end_at']  if alim else None,
    }
    save_json(kpis, OUT_DIR / "kpis.json")
    return kpis

# ── 5. Daily consumption ──────────────────────────────────────────────────────

def build_daily(sessions):
    from collections import defaultdict
    daily_map = defaultdict(lambda: {'total': 0.0, 'count': 0})

    for s in sessions:
        if s['type'] != 'alimentacion' or not s['start_at']:
            continue
        day = s['start_at'][:10]
        daily_map[day]['total']  += s['consumed_g']
        daily_map[day]['count']  += 1

    daily = sorted([
        {'day': day, 'total': round(v['total'], 1), 'count': v['count']}
        for day, v in daily_map.items()
    ], key=lambda x: x['day'])

    # Media móvil 3 días
    for i, d in enumerate(daily):
        window = daily[max(0, i-2):i+1]
        d['rolling3'] = round(sum(w['total'] for w in window) / len(window), 1)

    save_json(daily, OUT_DIR / "daily.json")
    return daily

# ── 6. Histograma de duración ────────────────────────────────────────────────

def build_histogram(sessions, bucket_min=2):
    max_min = 42
    buckets = [
        {'range': f'{i}–{i+bucket_min}', 'min': i, 'alimentacion': 0, 'servido': 0}
        for i in range(0, max_min, bucket_min)
    ]
    for s in sessions:
        if s['duration_min'] is None:
            continue
        idx = min(int(s['duration_min'] // bucket_min), len(buckets) - 1)
        if s['type'] == 'alimentacion':
            buckets[idx]['alimentacion'] += 1
        elif s['type'] == 'servido':
            buckets[idx]['servido'] += 1

    histogram = [b for b in buckets if b['alimentacion'] > 0 or b['servido'] > 0]
    save_json(histogram, OUT_DIR / "histogram.json")

# ── 7. Feature importance ────────────────────────────────────────────────────

def build_feature_importance():
    result = {}
    for model_id in ('modelo_a', 'modelo_b'):
        csv_path = F3_MODELS / model_id / "feature_importance.csv"
        if not csv_path.exists():
            print(f"  ⚠  {csv_path} no encontrado.")
            continue

        df = pd.read_csv(csv_path)
        # Detectar columnas
        feat_col = next((c for c in ['feature', 'feature_name', 'name'] if c in df.columns), df.columns[0])
        imp_col  = next((c for c in ['importance', 'gain', 'value'] if c in df.columns), df.columns[1])

        df_sorted = df.sort_values(imp_col, ascending=False).head(12)
        result[model_id] = [
            {
                'name':       str(row[feat_col]),
                'importance': round(float(row[imp_col]), 2),
            }
            for _, row in df_sorted.iterrows()
        ]

    save_json(result, OUT_DIR / "feature_importance.json")

# ── 8. Dataset meta (copia de Fase 2) ────────────────────────────────────────

def build_dataset_meta():
    src = F2_TRAIN / "dataset_meta.json"
    if not src.exists():
        print(f"  ⚠  {src} no encontrado.")
        return
    import shutil
    shutil.copy(src, OUT_DIR / "dataset_meta.json")
    print(f"  ✓  {'dataset_meta.json':35s}  (copia de Fase 2)")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 55)
    print("Fase 4 — Preparación de datos")
    print(f"Origen:  Data Science/ (fases 1–3)")
    print(f"Destino: {OUT_DIR}")
    print("=" * 55)

    print("\n[1/6] Lecturas (LTTB → readings_chart.json)")
    readings_df = build_readings_chart()

    print("\n[2/6] Eventos (events_labeled.parquet)")
    build_events(readings_df)

    print("\n[3/6] Sesiones (sessions_labeled.parquet + cruce con readings)")
    sessions = build_sessions(readings_df)

    if sessions:
        print("\n[4/6] KPIs y estadísticas")
        build_kpis(sessions, readings_df)

        print("\n[5/6] Consumo diario + histograma")
        build_daily(sessions)
        build_histogram(sessions)
    else:
        print("\n[4–5/6] Sin sesiones — saltando KPIs, daily, histograma")

    print("\n[6/6] Importancia de features + dataset meta")
    build_feature_importance()
    build_dataset_meta()

    print("\n" + "=" * 55)
    print("✅  prepare_data.py completado")
    print(f"   Archivos en: {OUT_DIR}")
    print("   Siguiente paso: npm run dev")
    print("=" * 55)

if __name__ == "__main__":
    main()
