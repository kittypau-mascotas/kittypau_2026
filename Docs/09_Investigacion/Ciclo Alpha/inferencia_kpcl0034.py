"""
inferencia_kpcl0034.py
======================
Detecta sesiones de alimentacion de Bandida sobre datos nuevos de KPCL0034.
Usa los modelos entrenados en Experimento 06 (Fase 3).

USO:
    python inferencia_kpcl0034.py --csv ruta/a/readings_nuevos.csv
    python inferencia_kpcl0034.py --parquet ruta/a/readings_raw.parquet
    python inferencia_kpcl0034.py  # usa readings_raw.parquet de Fase 1 por defecto

SALIDA:
    - Tabla de sesiones detectadas en consola
    - sesiones_detectadas.csv  (junto al script)
    - inferencia_kpcl0034.html (dashboard visual interactivo)
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ── Paths base ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent

DS_ROOT = ROOT  # el script vive en Data Science/

MODELO_A_LGB    = DS_ROOT / "fase_3_modelos/models/modelo_a/modelo_a.lgb"
MODELO_A_PARAMS = DS_ROOT / "fase_3_modelos/models/modelo_a/modelo_a_params.json"
MODELO_A_CALIB  = DS_ROOT / "fase_3_modelos/models/modelo_a/calibration_isotonic.json"

MODELO_B_LGB    = DS_ROOT / "fase_3_modelos/models/modelo_b/modelo_b.lgb"
MODELO_B_PARAMS = DS_ROOT / "fase_3_modelos/models/modelo_b/modelo_b_params.json"

LABEL_ENCODER  = DS_ROOT / "fase_2_dataset/data/train/label_encoder.json"
DEFAULT_PARQUET = DS_ROOT / "fase_1_extraccion/data/raw/readings_raw.parquet"

# ── Constantes del modelo ──────────────────────────────────────────────────────
FEATURES_12 = [
    "weight_grams", "delta_w", "delta_w_10",
    "rolling_std_5", "rolling_std_10", "rolling_mean_5",
    "net_weight", "is_plateau", "plateau_duration",
    "hour_sin", "hour_cos", "clock_invalid",
]
THRESHOLD_A      = 0.20   # threshold calibrado Exp 06
# Parámetros de Fase 2 — deben coincidir exactamente con _phase2_utils.py
GAP_CUTOFF_S     = 300    # segundos — gaps > 300s definen segmentos distintos
PLATEAU_THRESHOLD = 1.5   # g — _phase2_utils.py PLATEAU_THRESHOLD
MIN_SESSION_S    = 30     # segundos — sesiones más cortas se descartan
GAP_MERGE_S      = 60     # segundos — gaps entre predicciones activas que se fusionan
MIN_CONSUMED_G   = 3.0    # g — sanity filter: descartar sesiones con |consumido| < 3g


# ══════════════════════════════════════════════════════════════════════════════
# 1. CARGA DE DATOS
# ══════════════════════════════════════════════════════════════════════════════

def load_readings(csv_path=None, parquet_path=None):
    if csv_path:
        print(f"[INFO] Leyendo CSV: {csv_path}")
        df = pd.read_csv(csv_path, encoding="latin1", low_memory=False)
        if "device_code" in df.columns:
            df = df[df["device_code"] == "KPCL0034"].copy()
            print(f"[INFO] Filas KPCL0034: {len(df):,}")
    elif parquet_path:
        print(f"[INFO] Leyendo parquet: {parquet_path}")
        df = pd.read_parquet(parquet_path)
    else:
        print(f"[INFO] Usando parquet por defecto: {DEFAULT_PARQUET}")
        df = pd.read_parquet(DEFAULT_PARQUET)

    print(f"[INFO] Filas cargadas: {len(df):,}")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 2. PREPROCESAMIENTO
# ══════════════════════════════════════════════════════════════════════════════

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["recorded_at", "ingested_at"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True, errors="coerce")

    if "clock_invalid" not in df.columns:
        df["clock_invalid"] = False
    df["clock_invalid"] = df["clock_invalid"].fillna(False).astype(bool)

    if "ts" not in df.columns:
        df["ts"] = df.apply(
            lambda r: r["ingested_at"] if r["clock_invalid"] else r["recorded_at"],
            axis=1,
        )

    df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)

    df["weight_grams"] = pd.to_numeric(df["weight_grams"], errors="coerce")

    # Dedup idéntico a remove_subsecond_duplicates() de _phase2_utils.py:
    # elimina filas donde 0 < dt < 1s (lecturas demasiado próximas, misma lectura)
    ts_s = df["ts"]
    dt_s = ts_s.diff().dt.total_seconds()
    keep = ~((dt_s > 0) & (dt_s < 1))
    keep.iloc[0] = True
    df = df.loc[keep].reset_index(drop=True)
    df = df.drop_duplicates(subset=["ts"], keep="first").reset_index(drop=True)

    df["weight_grams"] = df["weight_grams"].ffill()

    print(f"[INFO] Filas tras preproceso: {len(df):,}")
    print(f"[INFO] Rango: {df['ts'].iloc[0]} → {df['ts'].iloc[-1]}")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 3. FEATURE ENGINEERING (espejo exacto de Fase 2)
# ══════════════════════════════════════════════════════════════════════════════

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Espejo exacto de compute_segment_features() + add_gap_segments() de _phase2_utils.py.
    Las features se calculan por segmento (gaps > GAP_CUTOFF_S) para replicar
    exactamente lo que vio el modelo en entrenamiento (Fase 2).
    """
    # Segmentos: gaps > 300s delimitan bloques independientes
    df["gap_after_s"]   = df["ts"].diff().dt.total_seconds()
    df["segment_break"] = df["gap_after_s"].gt(GAP_CUTOFF_S).fillna(False)
    df["segment_id"]    = df["segment_break"].cumsum().astype("int64")

    def seg(col, func):
        return df.groupby("segment_id", group_keys=False)[col].transform(func)

    # Interpolar peso dentro de cada segmento (igual que Fase 2)
    df["weight_grams"] = df.groupby("segment_id", group_keys=False)["weight_grams"].transform(
        lambda s: s.interpolate(limit_direction="both").ffill().bfill()
    )

    # Deltas dentro de segmento
    df["delta_w"]    = seg("weight_grams", lambda s: s.diff().fillna(0))
    df["delta_w_10"] = seg("weight_grams", lambda s: s.diff(10).fillna(0))

    # Rolling stats — min_periods idénticos a _phase2_utils.py
    df["rolling_std_5"]  = seg("weight_grams", lambda s: s.rolling(5,  min_periods=2).std().fillna(0))
    df["rolling_std_10"] = seg("weight_grams", lambda s: s.rolling(10, min_periods=3).std().fillna(0))
    df["rolling_mean_5"] = seg("weight_grams", lambda s: s.rolling(5,  min_periods=2).mean().fillna(s))

    # net_weight = peso - baseline (rolling 60 filas, percentil 10) — igual que Fase 2
    baseline_w       = seg("weight_grams", lambda s: s.rolling(60, min_periods=10).quantile(0.10).fillna(s))
    df["net_weight"] = df["weight_grams"] - baseline_w

    # Plateau con PLATEAU_THRESHOLD = 1.5 (no 2.0)
    df["is_plateau"] = (df["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)

    # plateau_duration = conteo de filas consecutivas en plateau (no segundos)
    df["plateau_duration"] = seg(
        "is_plateau",
        lambda s: s.groupby((s != s.shift()).cumsum()).cumcount().add(1).mul(s),
    )

    # hour_sin/cos en UTC sin tz_convert — igual que Fase 2
    hour = df["ts"].dt.hour + df["ts"].dt.minute / 60 + df["ts"].dt.second / 3600
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    df["clock_invalid"] = df["clock_invalid"].astype(int)

    missing = df[FEATURES_12].isna().sum()
    if missing.any():
        print("[WARN] NaN en features — rellenando con 0:")
        print(missing[missing > 0])
        df[FEATURES_12] = df[FEATURES_12].fillna(0)

    print(f"[INFO] Segmentos detectados: {int(df['segment_id'].nunique())}")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 4. CARGA DE MODELOS
# ══════════════════════════════════════════════════════════════════════════════

def load_models():
    try:
        import lightgbm as lgb
    except ImportError:
        print("[ERROR] lightgbm no instalado. Ejecutá: pip install lightgbm==4.3.0")
        sys.exit(1)

    print(f"[INFO] Cargando Modelo A: {MODELO_A_LGB.name}")
    if not MODELO_A_LGB.exists():
        print(f"[ERROR] No encontrado: {MODELO_A_LGB}")
        sys.exit(1)
    model_a = lgb.Booster(model_file=str(MODELO_A_LGB))

    print(f"[INFO] Cargando Modelo B: {MODELO_B_LGB.name}")
    if not MODELO_B_LGB.exists():
        print(f"[ERROR] No encontrado: {MODELO_B_LGB}")
        sys.exit(1)
    model_b = lgb.Booster(model_file=str(MODELO_B_LGB))

    calib_data = None
    if MODELO_A_CALIB.exists():
        with open(MODELO_A_CALIB) as f:
            calib_data = json.load(f)
        print("[INFO] Calibración isotónica cargada para Modelo A.")

    # label_encoder.json tiene estructura {"classes": [...], "encoding": {class: idx}, ...}
    label_map = {"alimentacion": 0, "servido": 1, "reposo": 2}
    if LABEL_ENCODER.exists():
        with open(LABEL_ENCODER) as f:
            enc_data = json.load(f)
        label_map = enc_data.get("encoding", label_map)

    return model_a, model_b, calib_data, label_map


# ══════════════════════════════════════════════════════════════════════════════
# 5. PREDICCIÓN
# ══════════════════════════════════════════════════════════════════════════════

def predict(df: pd.DataFrame, model_a, model_b, calib_data, label_map):
    X = df[FEATURES_12].values

    prob_a_raw = model_a.predict(X)

    if calib_data and "thresholds" in calib_data and "calibrated_probs" in calib_data:
        thr_arr = np.array(calib_data["thresholds"])
        cal_arr = np.array(calib_data["calibrated_probs"])
        prob_a  = np.interp(prob_a_raw, thr_arr, cal_arr)
    else:
        prob_a = prob_a_raw

    pred_a = (prob_a >= THRESHOLD_A).astype(int)

    prob_b     = model_b.predict(X)   # shape (N, 3)
    pred_b_idx = prob_b.argmax(axis=1)

    inv_map      = {v: k for k, v in label_map.items()}
    pred_b_label = [inv_map.get(i, str(i)) for i in pred_b_idx]

    df = df.copy()
    df["prob_activo"] = prob_a
    df["pred_activo"] = pred_a
    df["pred_clase"]  = pred_b_label
    df["prob_alim"]   = prob_b[:, label_map.get("alimentacion", 0)]
    df["prob_serv"]   = prob_b[:, label_map.get("servido", 1)]
    df["prob_reposo"] = prob_b[:, label_map.get("reposo", 2)]

    n_activo = pred_a.sum()
    print(f"[INFO] Lecturas activas detectadas: {n_activo:,} / {len(df):,} "
          f"({100*n_activo/len(df):.1f}%)")

    return df


# ══════════════════════════════════════════════════════════════════════════════
# 6. RECONSTRUCCIÓN DE SESIONES
# ══════════════════════════════════════════════════════════════════════════════

def build_sessions(df: pd.DataFrame) -> pd.DataFrame:
    activo = df[df["pred_activo"] == 1].copy()
    if activo.empty:
        print("[WARN] No se detectaron sesiones activas.")
        return pd.DataFrame()

    sesiones = []
    seg_start = activo.iloc[0]
    seg_last  = activo.iloc[0]

    for _, row in activo.iloc[1:].iterrows():
        gap = (row["ts"] - seg_last["ts"]).total_seconds()
        if gap <= GAP_MERGE_S:
            seg_last = row
        else:
            sesiones.append((seg_start, seg_last))
            seg_start = row
            seg_last  = row
    sesiones.append((seg_start, seg_last))

    rows = []
    for start_row, end_row in sesiones:
        t_start = start_row["ts"]
        t_end   = end_row["ts"]
        dur_s   = (t_end - t_start).total_seconds()

        if dur_s < MIN_SESSION_S:
            continue

        mask     = (df["ts"] >= t_start) & (df["ts"] <= t_end)
        intervalo = df[mask]

        w_start   = intervalo["weight_grams"].iloc[0]
        w_end     = intervalo["weight_grams"].iloc[-1]
        consumido = w_start - w_end

        conteo    = intervalo["pred_clase"].value_counts()
        clase_dom = conteo.index[0] if not conteo.empty else "desconocida"

        rows.append({
            "inicio":        t_start.strftime("%Y-%m-%d %H:%M:%S"),
            "fin":           t_end.strftime("%Y-%m-%d %H:%M:%S"),
            "duracion_s":    int(dur_s),
            "duracion_min":  round(dur_s / 60, 1),
            "peso_inicio_g": round(w_start, 1),
            "peso_fin_g":    round(w_end, 1),
            "consumido_g":   round(consumido, 1),
            "tipo":          clase_dom,
            "n_lecturas":    len(intervalo),
        })

    df_out = pd.DataFrame(rows)
    if df_out.empty:
        return df_out

    # Sanity filter: descartar sesiones con cambio de peso insignificante
    n_before = len(df_out)
    df_out = df_out[df_out["consumido_g"].abs() >= MIN_CONSUMED_G].reset_index(drop=True)
    n_filtered = n_before - len(df_out)
    if n_filtered > 0:
        print(f"[FILTER] {n_filtered} sesiones descartadas por |consumido_g| < {MIN_CONSUMED_G}g")

    return df_out


# ══════════════════════════════════════════════════════════════════════════════
# 7. DASHBOARD HTML
# ══════════════════════════════════════════════════════════════════════════════

def _load_gt_sessions() -> pd.DataFrame:
    """Carga sesiones manuales (GT) desde Fase 1 — sessions_labeled.parquet."""
    path = DS_ROOT / "fase_1_extraccion/data/raw/sessions_labeled.parquet"
    if not path.exists():
        return pd.DataFrame()
    try:
        df = pd.read_parquet(path)
        df["start"] = pd.to_datetime(df["start"], utc=True, errors="coerce")
        df["end"]   = pd.to_datetime(df["end"],   utc=True, errors="coerce")
        df = df.dropna(subset=["start", "end"])
        tipos = df["session_type"].value_counts().to_dict()
        print(f"[INFO] Sesiones GT cargadas: {len(df)} {tipos}")
        return df
    except Exception as e:
        print(f"[WARN] No se pudo cargar sessions_labeled.parquet: {e}")
        return pd.DataFrame()


def build_html(df: pd.DataFrame, sesiones: pd.DataFrame, out_path: Path):
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots
    except ImportError:
        print("[WARN] plotly no instalado — omitiendo dashboard HTML.")
        return

    sesiones_gt = _load_gt_sessions()

    # Rango de peso para posicionar marcadores encima de la curva
    w_min = df["weight_grams"].quantile(0.01)
    w_max = df["weight_grams"].quantile(0.99)
    w_amp = w_max - w_min
    y_bot = w_min - w_amp * 0.04
    y_top = w_max + w_amp * 0.20   # espacio para dos filas de marcadores

    # Niveles Y para los marcadores (no se superponen con la curva)
    Y_GT = w_max + w_amp * 0.06   # ▼ Manual — fila inferior
    Y_ML = w_max + w_amp * 0.14   # ▲ ML     — fila superior

    # ── Colores ────────────────────────────────────────────────────────────────
    GT_FILL = {
        "alimentacion": "rgba(39,174,96,0.20)",
        "servido":      "rgba(241,196,15,0.20)",
        "hidratacion":  "rgba(142,68,173,0.18)",
    }
    GT_LINE = {
        "alimentacion": "#27AE60",
        "servido":      "#F1C40F",
        "hidratacion":  "#9B59B6",
    }
    ML_FILL = {
        "alimentacion": "rgba(52,152,219,0.18)",
        "servido":      "rgba(230,126,34,0.18)",
        "desconocida":  "rgba(149,165,166,0.12)",
    }
    ML_LINE = {
        "alimentacion": "#3498DB",
        "servido":      "#E67E22",
        "desconocida":  "#95A5A6",
    }

    # ── Figura ─────────────────────────────────────────────────────────────────
    fig = make_subplots(
        rows=2, cols=1, shared_xaxes=True,
        row_heights=[0.75, 0.25],
        vertical_spacing=0.06,
        subplot_titles=["Peso KPCL0034 · Bandida", "P(activo) — Modelo A"],
    )

    # Curva de peso
    fig.add_trace(go.Scatter(
        x=df["ts"], y=df["weight_grams"],
        mode="lines", name="Peso (g)",
        line=dict(color="#5B9BD5", width=1),
        hovertemplate="%{x|%d/%m %H:%M:%S}  %{y:.1f} g<extra></extra>",
    ), row=1, col=1)

    # ── Bandas + marcadores GT (sesiones manuales) ────────────────────────────
    mx_gt, my_gt, mt_gt, mc_gt = [], [], [], []
    for _, s in sesiones_gt.iterrows():
        t0   = s["start"]
        t1   = s["end"]
        tipo = s.get("session_type", "alimentacion")
        dur  = float(s.get("duration_s", (t1 - t0).total_seconds()))
        fig.add_vrect(
            x0=t0, x1=t1,
            fillcolor=GT_FILL.get(tipo, "rgba(200,200,200,0.15)"),
            opacity=1, line_width=1.5,
            line_color=GT_LINE.get(tipo, "#aaa"),
            row=1, col=1,
        )
        mx_gt.append(t0 + (t1 - t0) / 2)
        my_gt.append(Y_GT)
        mc_gt.append(GT_LINE.get(tipo, "#aaa"))
        mt_gt.append(
            f"<b>▼ Manual (GT) · {tipo}</b><br>"
            f"Inicio: {t0.strftime('%d/%m %H:%M')}<br>"
            f"Fin:    {t1.strftime('%d/%m %H:%M')}<br>"
            f"Dur:    {int(dur//60)}m {int(dur%60)}s"
        )
    if mx_gt:
        fig.add_trace(go.Scatter(
            x=mx_gt, y=my_gt, mode="markers", name="▼ Manual (GT)",
            marker=dict(symbol="triangle-down", size=12, color=mc_gt,
                        line=dict(width=1, color="rgba(255,255,255,0.5)")),
            hovertemplate="%{text}<extra></extra>", text=mt_gt,
        ), row=1, col=1)

    # ── Bandas + marcadores ML (sesiones detectadas) ──────────────────────────
    mx_ml, my_ml, mt_ml, mc_ml = [], [], [], []
    for _, s in sesiones.iterrows():
        t0   = pd.to_datetime(s["inicio"], utc=True)
        t1   = pd.to_datetime(s["fin"],   utc=True)
        tipo = str(s.get("tipo", "desconocida"))
        fig.add_vrect(
            x0=s["inicio"], x1=s["fin"],
            fillcolor=ML_FILL.get(tipo, "rgba(149,165,166,0.12)"),
            opacity=1, line_width=1,
            line_color=ML_LINE.get(tipo, "#95A5A6"),
            row=1, col=1,
        )
        mx_ml.append(t0 + (t1 - t0) / 2)
        my_ml.append(Y_ML)
        mc_ml.append(ML_LINE.get(tipo, "#95A5A6"))
        mt_ml.append(
            f"<b>▲ ML detectada · {tipo}</b><br>"
            f"Inicio: {t0.strftime('%d/%m %H:%M')}<br>"
            f"Fin:    {t1.strftime('%d/%m %H:%M')}<br>"
            f"Dur:    {s['duracion_min']:.1f} min<br>"
            f"Inicio: {s['peso_inicio_g']:.1f} g → Fin: {s['peso_fin_g']:.1f} g<br>"
            f"<b>Consumido: {s['consumido_g']:+.1f} g</b>"
        )
    if mx_ml:
        fig.add_trace(go.Scatter(
            x=mx_ml, y=my_ml, mode="markers", name="▲ ML detectadas",
            marker=dict(symbol="triangle-up", size=12, color=mc_ml,
                        line=dict(width=1, color="rgba(255,255,255,0.5)")),
            hovertemplate="%{text}<extra></extra>", text=mt_ml,
        ), row=1, col=1)

    # ── Probabilidad Modelo A ──────────────────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=df["ts"], y=df["prob_activo"],
        mode="lines", name="P(activo)",
        line=dict(color="#E74C3C", width=1),
        fill="tozeroy", fillcolor="rgba(231,76,60,0.12)",
        hovertemplate="%{x|%H:%M:%S}  P=%{y:.3f}<extra></extra>",
    ), row=2, col=1)

    fig.add_hline(
        y=THRESHOLD_A, line_dash="dot",
        line_color="rgba(255,120,120,0.7)", line_width=1.5,
        annotation_text=f"thr={THRESHOLD_A}", annotation_font_size=9,
        row=2, col=1,
    )

    # ── Layout ─────────────────────────────────────────────────────────────────
    n_gt = len(sesiones_gt)
    n_ml = len(sesiones) if not sesiones.empty else 0
    fig.update_layout(
        title=dict(
            text=(
                "Inferencia KPCL0034 — Bandida<br>"
                f"<sup style='color:#8b949e'>"
                f"▼ Manuales (GT): {n_gt} sesiones"
                f" &nbsp;|&nbsp; "
                f"▲ ML detectadas: {n_ml} sesiones"
                f"</sup>"
            ),
            font=dict(size=14), x=0.5, xanchor="center",
        ),
        template="plotly_dark",
        paper_bgcolor="#0d1117",
        plot_bgcolor="#161b22",
        font=dict(family="monospace", size=11, color="#c9d1d9"),
        height=720,
        showlegend=True,
        legend=dict(
            orientation="h", y=1.07, x=0,
            bgcolor="rgba(0,0,0,0)", font=dict(size=10),
        ),
        margin=dict(t=95, b=40, l=65, r=30),
        hovermode="x",
    )
    fig.update_xaxes(gridcolor="rgba(255,255,255,0.05)", rangeslider_visible=False)
    fig.update_yaxes(gridcolor="rgba(255,255,255,0.05)")
    fig.update_yaxes(title_text="Peso (g)",    row=1, col=1, range=[y_bot, y_top])
    fig.update_yaxes(title_text="P(activo)",   row=2, col=1, range=[0, 1.05])

    fig.write_html(str(out_path), include_plotlyjs="cdn")
    print(f"[OK] Dashboard guardado en: {out_path}")


# ══════════════════════════════════════════════════════════════════════════════
# 8. MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Inferencia KPCL0034 — Exp 06")
    parser.add_argument("--csv",     type=str, help="Ruta al CSV exportado de Supabase")
    parser.add_argument("--parquet", type=str, help="Ruta al parquet de readings")
    parser.add_argument("--out",     type=str, default=".", help="Carpeta de salida")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("INFERENCIA KPCL0034 — Modelos Exp 06")
    print("=" * 60)

    df = load_readings(
        csv_path=args.csv,
        parquet_path=args.parquet if args.parquet else None,
    )

    df = preprocess(df)

    print("\n[INFO] Calculando features...")
    df = build_features(df)

    print("\n[INFO] Cargando modelos...")
    model_a, model_b, calib_data, label_map = load_models()

    print("\n[INFO] Corriendo predicción...")
    df = predict(df, model_a, model_b, calib_data, label_map)

    print("\n[INFO] Reconstruyendo sesiones...")
    sesiones = build_sessions(df)

    print("\n" + "=" * 60)
    print("SESIONES DETECTADAS")
    print("=" * 60)
    if sesiones.empty:
        print("  No se detectaron sesiones en el período.")
    else:
        alim  = sesiones[sesiones["tipo"] == "alimentacion"]
        serv  = sesiones[sesiones["tipo"] == "servido"]
        otras = sesiones[~sesiones["tipo"].isin(["alimentacion", "servido"])]

        print(f"  Total sesiones       : {len(sesiones)}")
        print(f"  Alimentación         : {len(alim)}")
        print(f"  Servido              : {len(serv)}")
        if len(otras) > 0:
            print(f"  Otras                : {len(otras)}")

        if len(alim) > 0:
            print(f"\n  Consumo total alim   : {alim['consumido_g'].sum():.1f} g")
            print(f"  Consumo medio/sesión : {alim['consumido_g'].mean():.1f} g")
            print(f"  Duración media       : {alim['duracion_min'].mean():.1f} min")

        print("\n  Detalle sesiones:")
        pd.set_option("display.width", 120)
        pd.set_option("display.max_columns", 10)
        print(sesiones[["inicio", "fin", "duracion_min",
                         "consumido_g", "tipo"]].to_string(index=False))

    csv_out = out_dir / "sesiones_detectadas.csv"
    if not sesiones.empty:
        sesiones.to_csv(csv_out, index=False)
        print(f"\n[OK] CSV guardado en: {csv_out}")

    print("\n[INFO] Generando dashboard visual...")
    html_out = out_dir / "inferencia_kpcl0034.html"
    build_html(df, sesiones if not sesiones.empty else pd.DataFrame(), html_out)

    print("\n" + "=" * 60)
    print("Inferencia completada.")
    print("=" * 60)


if __name__ == "__main__":
    main()
