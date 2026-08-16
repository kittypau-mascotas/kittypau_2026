"""
inferencia_exp07_mayo_junio.py
==============================
Experimento 07 — Inferencia sobre datos Mayo-Junio 2026 (sin etiquetar).

Lee readings_rows.csv (mismo directorio), filtra KPCL0034, calcula las 12
features invariantes (Exp 03-06) y aplica los modelos del Exp 06.

USO:
    python inferencia_exp07_mayo_junio.py

SALIDAS (en mismo directorio que este script):
    X_mayo_junio.parquet              — matrix de features (57k filas)
    sesiones_detectadas_mayo_junio.csv
    inferencia_mayo_junio.html        — dashboard visual interactivo
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent

CSV_PATH   = SCRIPT_DIR / "readings_rows.csv"

# Cuatro niveles arriba -> Data Science/
DS_ROOT    = SCRIPT_DIR.parent.parent.parent / "investigacion" / "Data Science"

MODELO_A_LGB   = DS_ROOT / "fase_3_modelos/models/modelo_a/modelo_a.lgb"
MODELO_A_CALIB = DS_ROOT / "fase_3_modelos/models/modelo_a/calibration_isotonic.json"
MODELO_B_LGB   = DS_ROOT / "fase_3_modelos/models/modelo_b/modelo_b.lgb"
LABEL_ENCODER  = DS_ROOT / "fase_2_dataset/data/train/label_encoder.json"

OUT_X_PARQUET  = SCRIPT_DIR / "X_mayo_junio.parquet"
OUT_CSV        = SCRIPT_DIR / "sesiones_detectadas_mayo_junio.csv"
OUT_HTML       = SCRIPT_DIR / "inferencia_mayo_junio.html"

# ── Constantes del pipeline ────────────────────────────────────────────────────
KPCL0034_UUID     = "3a460074-e7c3-41bf-ae5a-a011445f927a"

FEATURES_12 = [
    "weight_grams", "delta_w", "delta_w_10",
    "rolling_std_5", "rolling_std_10", "rolling_mean_5",
    "net_weight", "is_plateau", "plateau_duration",
    "hour_sin", "hour_cos", "clock_invalid",
]

GAP_CUTOFF_S      = 300    # > 5 min → segmento nuevo
PLATEAU_THRESHOLD = 1.5    # g — igual que _phase2_utils.py
THRESHOLD_A       = 0.20   # threshold calibrado Exp 06
MIN_SESSION_S     = 30     # sesiones < 30s se descartan
GAP_MERGE_S       = 60     # gap entre activos que se fusionan
MIN_CONSUMED_G    = 3.0    # cambio mínimo de peso para contar sesión


# ══════════════════════════════════════════════════════════════════════════════
# 1. CARGA Y FILTRADO
# ══════════════════════════════════════════════════════════════════════════════

def load_and_filter() -> pd.DataFrame:
    if not CSV_PATH.exists():
        raise SystemExit(f"[ERROR] No encontrado: {CSV_PATH}")

    print(f"[INFO] Leyendo: {CSV_PATH.name} …")
    try:
        df = pd.read_csv(CSV_PATH, encoding="utf-8", low_memory=False)
    except UnicodeDecodeError:
        df = pd.read_csv(CSV_PATH, encoding="latin1", low_memory=False)

    print(f"[INFO] Filas totales en CSV: {len(df):,}")

    df = df[df["device_id"] == KPCL0034_UUID].copy()
    print(f"[INFO] KPCL0034 aislado:    {len(df):,} filas")

    # clock_invalid = True en 100% → usar ingested_at siempre
    df["ts"] = pd.to_datetime(df["ingested_at"], utc=True, errors="coerce")
    df = df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)

    # Dedup sub-segundo (igual que _phase2_utils.remove_subsecond_duplicates)
    dt_s = df["ts"].diff().dt.total_seconds()
    keep = ~((dt_s > 0) & (dt_s < 1))
    keep.iloc[0] = True
    df = df.loc[keep].reset_index(drop=True)
    df = df.drop_duplicates(subset=["ts"], keep="first").reset_index(drop=True)

    df["weight_grams"] = pd.to_numeric(df["weight_grams"], errors="coerce").ffill()
    df["clock_invalid"] = True   # 100% True en este CSV; se convertirá a int más tarde

    print(f"[INFO] Rango: {df['ts'].iloc[0]} -> {df['ts'].iloc[-1]}")
    print(f"[INFO] Filas tras dedup:    {len(df):,}")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 2. FEATURE ENGINEERING — espejo exacto de compute_segment_features()
# ══════════════════════════════════════════════════════════════════════════════

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Segmentos independientes (gaps > 300s)
    df["gap_after_s"]   = df["ts"].diff().dt.total_seconds()
    df["segment_break"] = df["gap_after_s"].gt(GAP_CUTOFF_S).fillna(False)
    df["segment_id"]    = df["segment_break"].cumsum().astype("int64")

    def seg(col, func):
        return df.groupby("segment_id", group_keys=False)[col].transform(func)

    # Interpolar peso dentro de cada segmento
    df["weight_grams"] = df.groupby("segment_id", group_keys=False)["weight_grams"].transform(
        lambda s: s.interpolate(limit_direction="both").ffill().bfill()
    )

    df["delta_w"]    = seg("weight_grams", lambda s: s.diff().fillna(0))
    df["delta_w_10"] = seg("weight_grams", lambda s: s.diff(10).fillna(0))

    df["rolling_std_5"]  = seg("weight_grams", lambda s: s.rolling(5,  min_periods=2).std().fillna(0))
    df["rolling_std_10"] = seg("weight_grams", lambda s: s.rolling(10, min_periods=3).std().fillna(0))
    df["rolling_mean_5"] = seg("weight_grams", lambda s: s.rolling(5,  min_periods=2).mean().fillna(s))

    baseline_w       = seg("weight_grams", lambda s: s.rolling(60, min_periods=10).quantile(0.10).fillna(s))
    df["net_weight"] = df["weight_grams"] - baseline_w

    df["is_plateau"] = (df["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)
    df["plateau_duration"] = seg(
        "is_plateau",
        lambda s: s.groupby((s != s.shift()).cumsum()).cumcount().add(1).mul(s),
    )

    hour = df["ts"].dt.hour + df["ts"].dt.minute / 60 + df["ts"].dt.second / 3600
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    df["clock_invalid"] = df["clock_invalid"].astype(int)

    missing = df[FEATURES_12].isna().sum()
    if missing.any():
        print("[WARN] NaN en features — rellenando con 0:")
        print(missing[missing > 0].to_string())
        df[FEATURES_12] = df[FEATURES_12].fillna(0)

    n_segs = int(df["segment_id"].nunique())
    print(f"[INFO] Segmentos detectados: {n_segs}")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 3. CARGA DE MODELOS
# ══════════════════════════════════════════════════════════════════════════════

def load_models():
    try:
        import lightgbm as lgb
    except ImportError:
        raise SystemExit("[ERROR] lightgbm no instalado. Ejecutá: pip install lightgbm")

    for p in [MODELO_A_LGB, MODELO_A_CALIB, MODELO_B_LGB]:
        if not p.exists():
            raise SystemExit(f"[ERROR] Artefacto no encontrado: {p}")

    model_a = lgb.Booster(model_file=str(MODELO_A_LGB))
    model_b = lgb.Booster(model_file=str(MODELO_B_LGB))
    print(f"[INFO] Modelo A cargado: {MODELO_A_LGB.name}")
    print(f"[INFO] Modelo B cargado: {MODELO_B_LGB.name}")

    with open(MODELO_A_CALIB) as f:
        calib = json.load(f)
    print("[INFO] Calibración isotónica cargada (threshold=0.20)")

    label_map = {"alimentacion": 0, "servido": 1, "reposo": 2}
    if LABEL_ENCODER.exists():
        with open(LABEL_ENCODER) as f:
            enc = json.load(f)
        label_map = enc.get("encoding", label_map)

    return model_a, model_b, calib, label_map


# ══════════════════════════════════════════════════════════════════════════════
# 4. PREDICCIÓN
# ══════════════════════════════════════════════════════════════════════════════

def predict(df: pd.DataFrame, model_a, model_b, calib, label_map) -> pd.DataFrame:
    X = df[FEATURES_12].values

    prob_a_raw = model_a.predict(X)

    # Calibración isotónica: interpolar sobre los umbrales guardados
    calib_model = calib.get("calibration_model", {})
    x_thr = calib_model.get("x_thresholds")
    y_thr = calib_model.get("y_thresholds")
    if x_thr and y_thr:
        prob_a = np.interp(prob_a_raw, x_thr, y_thr)
    else:
        prob_a = prob_a_raw

    pred_a = (prob_a >= THRESHOLD_A).astype(int)

    prob_b     = model_b.predict(X)          # shape (N, 3)
    pred_b_idx = prob_b.argmax(axis=1)
    inv_map    = {v: k for k, v in label_map.items()}
    pred_b_lbl = [inv_map.get(i, str(i)) for i in pred_b_idx]

    df = df.copy()
    df["prob_activo"] = prob_a
    df["pred_activo"] = pred_a
    df["pred_clase"]  = pred_b_lbl
    df["prob_alim"]   = prob_b[:, label_map.get("alimentacion", 0)]
    df["prob_serv"]   = prob_b[:, label_map.get("servido", 1)]
    df["prob_reposo"] = prob_b[:, label_map.get("reposo", 2)]

    n_activo = int(pred_a.sum())
    print(f"[INFO] Lecturas activas: {n_activo:,} / {len(df):,} ({100*n_activo/len(df):.1f}%)")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 5. RECONSTRUCCIÓN DE SESIONES
# ══════════════════════════════════════════════════════════════════════════════

def build_sessions(df: pd.DataFrame) -> pd.DataFrame:
    activo = df[df["pred_activo"] == 1].copy()
    if activo.empty:
        print("[WARN] No se detectaron filas activas.")
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
    for s_row, e_row in sesiones:
        t_start = s_row["ts"]
        t_end   = e_row["ts"]
        dur_s   = (t_end - t_start).total_seconds()
        if dur_s < MIN_SESSION_S:
            continue

        mask      = (df["ts"] >= t_start) & (df["ts"] <= t_end)
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

    n_antes = len(df_out)
    df_out = df_out[df_out["consumido_g"].abs() >= MIN_CONSUMED_G].reset_index(drop=True)
    n_filt = n_antes - len(df_out)
    if n_filt > 0:
        print(f"[FILTER] {n_filt} sesiones descartadas (|consumido_g| < {MIN_CONSUMED_G}g)")

    return df_out


# ══════════════════════════════════════════════════════════════════════════════
# 6. DASHBOARD HTML
# ══════════════════════════════════════════════════════════════════════════════

def build_html(df: pd.DataFrame, sesiones: pd.DataFrame):
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots
    except ImportError:
        print("[WARN] plotly no instalado — omitiendo HTML.")
        return

    w_min  = df["weight_grams"].quantile(0.01)
    w_max  = df["weight_grams"].quantile(0.99)
    w_amp  = w_max - w_min
    y_bot  = w_min - w_amp * 0.04
    y_top  = w_max + w_amp * 0.20
    Y_ML   = w_max + w_amp * 0.10

    ML_FILL = {
        "alimentacion": "rgba(52,152,219,0.18)",
        "servido":      "rgba(230,126,34,0.18)",
        "desconocida":  "rgba(149,165,166,0.12)",
        "reposo":       "rgba(149,165,166,0.08)",
    }
    ML_LINE = {
        "alimentacion": "#3498DB",
        "servido":      "#E67E22",
        "desconocida":  "#95A5A6",
        "reposo":       "#95A5A6",
    }

    fig = make_subplots(
        rows=2, cols=1, shared_xaxes=True,
        row_heights=[0.75, 0.25],
        vertical_spacing=0.06,
        subplot_titles=["Peso KPCL0034 · Bandida — Mayo-Junio 2026", "P(activo) — Modelo A"],
    )

    # Curva de peso — submuestrear para HTML liviano (1 de cada 3 puntos)
    df_plot = df.iloc[::3].copy()
    fig.add_trace(go.Scatter(
        x=df_plot["ts"], y=df_plot["weight_grams"],
        mode="lines", name="Peso (g)",
        line=dict(color="#5B9BD5", width=1),
        hovertemplate="%{x|%d/%m %H:%M:%S}  %{y:.1f} g<extra></extra>",
    ), row=1, col=1)

    # Bandas + marcadores ML
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
            f"<b>▲ ML · {tipo}</b><br>"
            f"Inicio: {t0.strftime('%d/%m %H:%M')}<br>"
            f"Fin:    {t1.strftime('%d/%m %H:%M')}<br>"
            f"Dur:    {s['duracion_min']:.1f} min<br>"
            f"{s['peso_inicio_g']:.1f} g → {s['peso_fin_g']:.1f} g<br>"
            f"<b>Consumido: {s['consumido_g']:+.1f} g</b>"
        )
    if mx_ml:
        fig.add_trace(go.Scatter(
            x=mx_ml, y=my_ml, mode="markers", name="▲ ML detectadas",
            marker=dict(symbol="triangle-up", size=12, color=mc_ml,
                        line=dict(width=1, color="rgba(255,255,255,0.5)")),
            hovertemplate="%{text}<extra></extra>", text=mt_ml,
        ), row=1, col=1)

    # P(activo) — submuestrear igual
    fig.add_trace(go.Scatter(
        x=df_plot["ts"], y=df_plot["prob_activo"],
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

    n_alim = int((sesiones["tipo"] == "alimentacion").sum()) if not sesiones.empty else 0
    n_serv = int((sesiones["tipo"] == "servido").sum()) if not sesiones.empty else 0
    n_ml   = len(sesiones)

    fig.update_layout(
        title=dict(
            text=(
                "Exp 07 — Inferencia KPCL0034 Mayo-Junio 2026<br>"
                f"<sup style='color:#8b949e'>"
                f"ML detectadas: {n_ml} sesiones  "
                f"(alimentacion: {n_alim} | servido: {n_serv})"
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
        legend=dict(orientation="h", y=1.07, x=0,
                    bgcolor="rgba(0,0,0,0)", font=dict(size=10)),
        margin=dict(t=95, b=40, l=65, r=30),
        hovermode="x",
    )
    fig.update_xaxes(gridcolor="rgba(255,255,255,0.05)", rangeslider_visible=False)
    fig.update_yaxes(gridcolor="rgba(255,255,255,0.05)")
    fig.update_yaxes(title_text="Peso (g)",   row=1, col=1, range=[y_bot, y_top])
    fig.update_yaxes(title_text="P(activo)",  row=2, col=1, range=[0, 1.05])

    fig.write_html(str(OUT_HTML), include_plotlyjs="cdn")
    print(f"[OK] Dashboard guardado: {OUT_HTML.name}")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("EXP 07 — INFERENCIA KPCL0034 Mayo-Junio 2026")
    print("=" * 60)

    df = load_and_filter()

    print("\n[INFO] Calculando 12 features invariantes (Exp 03-06)…")
    df = build_features(df)

    # Guardar X antes de predicción
    cols_x = ["ts"] + FEATURES_12 + ["segment_id"]
    df[cols_x].to_parquet(OUT_X_PARQUET, index=False)
    print(f"[OK] X_mayo_junio.parquet guardado: {len(df):,} filas, {len(FEATURES_12)} features")

    print("\n[INFO] Cargando modelos Exp 06…")
    model_a, model_b, calib, label_map = load_models()

    print("\n[INFO] Corriendo predicción…")
    df = predict(df, model_a, model_b, calib, label_map)

    print("\n[INFO] Reconstruyendo sesiones…")
    sesiones = build_sessions(df)

    print("\n" + "=" * 60)
    print("SESIONES DETECTADAS — Exp 07")
    print("=" * 60)

    if sesiones.empty:
        print("  No se detectaron sesiones en el período.")
    else:
        alim  = sesiones[sesiones["tipo"] == "alimentacion"]
        serv  = sesiones[sesiones["tipo"] == "servido"]
        otras = sesiones[~sesiones["tipo"].isin(["alimentacion", "servido"])]

        print(f"  Total sesiones       : {len(sesiones)}")
        print(f"  Alimentacion         : {len(alim)}")
        print(f"  Servido              : {len(serv)}")
        if len(otras):
            print(f"  Otras                : {len(otras)}")

        if len(alim):
            print(f"\n  Consumo total alim   : {alim['consumido_g'].sum():.1f} g")
            print(f"  Consumo medio/sesion : {alim['consumido_g'].mean():.1f} g")
            print(f"  Duracion media       : {alim['duracion_min'].mean():.1f} min")

        print("\n  Detalle:")
        pd.set_option("display.width", 130)
        pd.set_option("display.max_rows", 200)
        print(sesiones[["inicio", "fin", "duracion_min", "consumido_g", "tipo"]].to_string(index=False))

        sesiones.to_csv(OUT_CSV, index=False)
        print(f"\n[OK] CSV guardado: {OUT_CSV.name}")

    print("\n[INFO] Generando dashboard visual…")
    if not sesiones.empty:
        build_html(df, sesiones)
    else:
        build_html(df, pd.DataFrame(columns=["inicio", "fin", "duracion_min",
                                              "peso_inicio_g", "peso_fin_g",
                                              "consumido_g", "tipo"]))

    # Resumen diario de sesiones de alimentacion
    if not sesiones.empty:
        sesiones["fecha"] = pd.to_datetime(sesiones["inicio"]).dt.date
        alim_diario = (
            sesiones[sesiones["tipo"] == "alimentacion"]
            .groupby("fecha")
            .agg(n_sesiones=("consumo_g" if "consumo_g" in sesiones.columns else "consumido_g", "count"),
                 consumo_g=("consumido_g", "sum"),
                 duracion_media_min=("duracion_min", "mean"))
            .round(1)
        ) if len(alim) else pd.DataFrame()

        if not alim_diario.empty:
            print("\n  Resumen diario (alimentacion):")
            print(alim_diario.to_string())

    print("\n" + "=" * 60)
    print("Inferencia Exp 07 completada.")
    print("=" * 60)


if __name__ == "__main__":
    main()
