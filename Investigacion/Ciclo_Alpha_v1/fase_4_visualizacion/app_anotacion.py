"""Kittypau - Anotador de sesiones KPCL0034.

Fase 4: Revisión manual de las sesiones detectadas por Exp 07
(Mayo–Junio 2026) para generar ground truth y habilitar Exp 08.

Uso:
    streamlit run app_anotacion.py
"""

from __future__ import annotations

from datetime import datetime, time, timezone
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
DS_DIR = SCRIPT_DIR.parent
F1_RAW = DS_DIR / "fase_1_extraccion" / "data" / "raw"
ANNOT_DIR = SCRIPT_DIR / "data"
ANNOT_FILE = ANNOT_DIR / "new_annotations.csv"

DATA_2026 = DS_DIR.parent / "Data_2026" / "Mayo_2026"
SESSIONS_EXP07 = DATA_2026 / "sesiones_detectadas_mayo_junio.csv"
READINGS_MJ = DATA_2026 / "readings_rows.csv"

DATA_ABRIL = DS_DIR.parent / "Data_2026" / "Abril_2026"
SESSIONS_ABRIL     = DATA_ABRIL / "sesiones_detectadas_abril.csv"
AUDIT_EVENTS_ABRIL = DATA_ABRIL / "audit_events_ref.csv"

KPCL0034_UUID = "3a460074-e7c3-41bf-ae5a-a011445f927a"

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

CATEGORIES = [
    "inicio_alimentacion",
    "termino_alimentacion",
    "inicio_servido",
    "termino_servido",
    "kpcl_sin_plato",
    "kpcl_con_plato",
    "tare_con_plato",
    "inicio_hidratacion",
    "termino_hidratacion",
    "falso_positivo",
    "sin_categorizar",
]

SESSION_CATEGORIES = ["alimentacion", "servido", "hidratacion", "falso_positivo", "sin_categorizar"]

SESSION_CAT_LABELS = {
    "alimentacion":    "🍽️ Alimentación",
    "servido":         "🫙 Servido",
    "hidratacion":     "💧 Hidratación",
    "falso_positivo":  "❌ Falso positivo",
    "sin_categorizar": "⏳ Sin categorizar",
}

SESSION_TO_EVENTS = {
    "alimentacion":    ("inicio_alimentacion",  "termino_alimentacion"),
    "servido":         ("inicio_servido",        "termino_servido"),
    "hidratacion":     ("inicio_hidratacion",    "termino_hidratacion"),
    "falso_positivo":  ("falso_positivo",        None),
    "sin_categorizar": ("sin_categorizar",       None),
}

SESSION_FILL = {
    "alimentacion": "rgba(0, 180, 90, 0.15)",
    "servido":      "rgba(30, 100, 255, 0.15)",
}
SESSION_LINE = {
    "alimentacion": "rgba(0, 180, 90, 0.70)",
    "servido":      "rgba(30, 100, 255, 0.70)",
}

EVENT_COLOR = {
    "inicio_alimentacion":  "#00b45a",
    "termino_alimentacion": "#007a3d",
    "inicio_servido":       "#1e64ff",
    "termino_servido":      "#0033aa",
    "kpcl_sin_plato":       "#ff6600",
    "kpcl_con_plato":       "#cc5200",
    "tare_con_plato":       "#9933ff",
    "inicio_hidratacion":   "#00ccff",
    "termino_hidratacion":  "#0066aa",
    "falso_positivo":       "#dc2626",
    "sin_categorizar":      "#9ca3af",
}

WEIGHT_LINE_COLOR = "#ff6b00"   # naranja vívido — línea de peso llamativa
NEW_ANNOT_COLOR   = "#e60000"


# ---------------------------------------------------------------------------
# Carga de datos
# ---------------------------------------------------------------------------

@st.cache_data
def load_readings() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW / "readings_raw.parquet")
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    return df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)


@st.cache_data
def load_readings_mayo_junio() -> pd.DataFrame:
    if not READINGS_MJ.exists():
        return pd.DataFrame(columns=["ts", "weight_grams"])
    df = pd.read_csv(READINGS_MJ, low_memory=False)
    if "device_id" in df.columns:
        df = df[df["device_id"] == KPCL0034_UUID]
    df["ts"] = pd.to_datetime(df["ingested_at"], utc=True, errors="coerce")
    df["weight_grams"] = pd.to_numeric(df["weight_grams"], errors="coerce")
    return df[["ts", "weight_grams"]].dropna().sort_values("ts").reset_index(drop=True)


@st.cache_data
def load_sessions_exp07() -> pd.DataFrame:
    if not SESSIONS_EXP07.exists():
        return pd.DataFrame()
    df = pd.read_csv(SESSIONS_EXP07)
    df["inicio"] = pd.to_datetime(df["inicio"], utc=True, errors="coerce")
    df["fin"]    = pd.to_datetime(df["fin"],    utc=True, errors="coerce")
    return df.dropna(subset=["inicio", "fin"]).sort_values("inicio").reset_index(drop=True)


@st.cache_data
def load_sessions_abril() -> pd.DataFrame:
    if not SESSIONS_ABRIL.exists():
        return pd.DataFrame()
    df = pd.read_csv(SESSIONS_ABRIL)
    df["inicio"] = pd.to_datetime(df["inicio"], utc=True, errors="coerce")
    df["fin"]    = pd.to_datetime(df["fin"],    utc=True, errors="coerce")
    return df.dropna(subset=["inicio", "fin"]).sort_values("inicio").reset_index(drop=True)


@st.cache_data
def load_audit_events_ref() -> pd.DataFrame:
    if not AUDIT_EVENTS_ABRIL.exists():
        return pd.DataFrame(columns=["ts", "category"])
    df = pd.read_csv(AUDIT_EVENTS_ABRIL)
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    return df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)


@st.cache_data
def load_events() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW / "events_labeled.parquet")
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    return df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)


@st.cache_data
def load_sessions() -> pd.DataFrame:
    df = pd.read_parquet(F1_RAW / "sessions_labeled.parquet")
    df["start"] = pd.to_datetime(df["start"], utc=True, errors="coerce")
    df["end"]   = pd.to_datetime(df["end"],   utc=True, errors="coerce")
    return df.dropna(subset=["start", "end"]).sort_values("start").reset_index(drop=True)


def load_new_annotations() -> pd.DataFrame:
    if ANNOT_FILE.exists():
        df = pd.read_csv(ANNOT_FILE)
        df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
        return df.dropna(subset=["ts"]).reset_index(drop=True)
    return pd.DataFrame(columns=["ts", "category", "notes", "created_at"])


# ---------------------------------------------------------------------------
# Persistencia de anotaciones
# ---------------------------------------------------------------------------

def save_annotation(ts_str: str, category: str, notes: str) -> None:
    ANNOT_DIR.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": ts_str,
        "category": category,
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    df = pd.read_csv(ANNOT_FILE) if ANNOT_FILE.exists() else pd.DataFrame(
        columns=["ts", "category", "notes", "created_at"]
    )
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_csv(ANNOT_FILE, index=False)


def save_session_annotation(
    inicio: pd.Timestamp,
    fin: pd.Timestamp,
    category: str,
    notes: str,
) -> None:
    ev_i, ev_f = SESSION_TO_EVENTS.get(category, ("sin_categorizar", None))
    save_annotation(inicio.isoformat(), ev_i, notes)
    if ev_f:
        save_annotation(fin.isoformat(), ev_f, notes)


def delete_annotation(idx: int) -> None:
    if ANNOT_FILE.exists():
        df = pd.read_csv(ANNOT_FILE)
        df = df.drop(index=idx).reset_index(drop=True)
        df.to_csv(ANNOT_FILE, index=False)


def get_session_status(
    inicio: pd.Timestamp,
    fin: pd.Timestamp,
    df_new: pd.DataFrame,
) -> tuple[bool, str]:
    """Devuelve (anotada, categoria_sesion)."""
    if df_new.empty:
        return False, ""
    margin = pd.Timedelta(minutes=3)
    hits = df_new[
        (df_new["ts"] >= inicio - margin) &
        (df_new["ts"] <= fin + margin)
    ]
    if hits.empty:
        return False, ""
    cat = hits.iloc[0]["category"]
    for ses_cat, (ev_i, ev_f) in SESSION_TO_EVENTS.items():
        if cat in (ev_i, ev_f):
            return True, ses_cat
    return True, cat


# ---------------------------------------------------------------------------
# Gráfico de sesión (zoom)
# ---------------------------------------------------------------------------

def build_session_figure(
    df_readings: pd.DataFrame,
    inicio: pd.Timestamp,
    fin: pd.Timestamp,
    df_new: pd.DataFrame,
    tipo_pred: str = "",
    buffer_min: int = 5,
    df_ae_ref: pd.DataFrame | None = None,
) -> go.Figure:
    t0 = inicio - pd.Timedelta(minutes=buffer_min)
    t1 = fin    + pd.Timedelta(minutes=buffer_min)
    df_w = df_readings[(df_readings["ts"] >= t0) & (df_readings["ts"] <= t1)].copy()

    fig = go.Figure()

    # Banda de sesión detectada
    fill_col = SESSION_FILL.get(tipo_pred, "rgba(255,107,0,0.15)")
    line_col = SESSION_LINE.get(tipo_pred, "rgba(255,107,0,0.70)")
    fig.add_vrect(
        x0=inicio.isoformat(),
        x1=fin.isoformat(),
        fillcolor=fill_col,
        line=dict(color=line_col, width=2),
        annotation_text=f"sesión detectada — {tipo_pred}",
        annotation_position="top left",
        annotation=dict(font_size=11, font_color="#444"),
    )

    # Línea de peso — naranja, gruesa, llamativa
    if not df_w.empty:
        fig.add_trace(go.Scattergl(
            x=df_w["ts"],
            y=df_w["weight_grams"],
            mode="lines+markers",
            name="Peso (g)",
            line=dict(color=WEIGHT_LINE_COLOR, width=3),
            marker=dict(size=4, color=WEIGHT_LINE_COLOR, opacity=0.7),
            hovertemplate="<b>%{x|%H:%M:%S UTC}</b><br>%{y:.1f} g<extra></extra>",
        ))

    # Marcadores de inicio y fin
    for ts_mark, label in [(inicio, "Inicio"), (fin, "Fin")]:
        if not df_w.empty:
            closest = (df_w["ts"] - ts_mark).abs().idxmin()
            y_mark = df_w.at[closest, "weight_grams"]
        else:
            y_mark = 0
        fig.add_trace(go.Scatter(
            x=[ts_mark], y=[y_mark],
            mode="markers+text",
            text=[label], textposition="top center",
            marker=dict(symbol="line-ns", size=18, color="#1a1a1a", line=dict(color="#1a1a1a", width=2)),
            showlegend=False,
        ))

    # Anotaciones ya guardadas en esta ventana
    if not df_new.empty:
        margin = pd.Timedelta(minutes=3)
        df_near = df_new[
            (df_new["ts"] >= t0 - margin) &
            (df_new["ts"] <= t1 + margin)
        ]
        for _, row in df_near.iterrows():
            if not df_w.empty:
                ci = (df_w["ts"] - row["ts"]).abs().idxmin()
                y_a = df_w.at[ci, "weight_grams"]
            else:
                y_a = 0
            color = EVENT_COLOR.get(row["category"], NEW_ANNOT_COLOR)
            fig.add_trace(go.Scatter(
                x=[row["ts"]], y=[y_a],
                mode="markers+text",
                text=["★"], textposition="top center",
                textfont=dict(color=color, size=16),
                marker=dict(symbol="star", size=16, color=color, line=dict(color="white", width=1)),
                name=row["category"], showlegend=False,
                hovertemplate=f"<b>{row['category']}</b><br>%{{x|%H:%M:%S UTC}}<extra></extra>",
            ))

    # Etiquetas manuales existentes de audit_events (solo en modo Abril)
    if df_ae_ref is not None and not df_ae_ref.empty:
        margin_ae = pd.Timedelta(minutes=buffer_min + 2)
        ae_near = df_ae_ref[
            (df_ae_ref["ts"] >= t0 - margin_ae) &
            (df_ae_ref["ts"] <= t1 + margin_ae)
        ]
        for _, row in ae_near.iterrows():
            if not df_w.empty:
                ci = (df_w["ts"] - row["ts"]).abs().idxmin()
                y_ae = df_w.at[ci, "weight_grams"]
            else:
                y_ae = 0
            color = EVENT_COLOR.get(row["category"], "#aaaaaa")
            fig.add_trace(go.Scatter(
                x=[row["ts"]], y=[y_ae],
                mode="markers+text",
                text=["◆"], textposition="bottom center",
                textfont=dict(color=color, size=14),
                marker=dict(symbol="diamond", size=14, color=color,
                            line=dict(color="white", width=1)),
                name=f"ref: {row['category']}", showlegend=False,
                hovertemplate=(
                    f"<b>REFERENCIA: {row['category']}</b>"
                    "<br>%{x|%H:%M:%S UTC}"
                    "<extra></extra>"
                ),
            ))

    fig.update_layout(
        height=370,
        margin=dict(l=0, r=0, t=45, b=0),
        xaxis=dict(type="date", tickformat="%H:%M:%S<br>%d %b"),
        yaxis=dict(title="peso (g)"),
        plot_bgcolor="#ffffff",
        paper_bgcolor="#ffffff",
        hovermode="x unified",
        showlegend=False,
    )
    return fig


# ---------------------------------------------------------------------------
# Gráfico global (Apr–May)
# ---------------------------------------------------------------------------

def build_figure(
    df_r: pd.DataFrame,
    df_sessions: pd.DataFrame,
    df_events: pd.DataFrame,
    df_new: pd.DataFrame,
    show_net: bool = False,
    resample_rule: str | None = "1min",
) -> go.Figure:
    fig = go.Figure()

    if resample_rule:
        df_plot = (
            df_r.set_index("ts")["weight_grams"]
            .resample(resample_rule).mean()
            .reset_index()
        )
        df_plot.columns = ["ts", "weight_grams"]
        if show_net and "net_weight" in df_r.columns:
            df_net = (
                df_r.set_index("ts")["net_weight"]
                .resample(resample_rule).mean()
                .reset_index()
            )
            df_net.columns = ["ts", "net_weight"]
            df_plot = df_plot.merge(df_net, on="ts", how="left")
    else:
        df_plot = df_r.copy()

    shapes: list[dict] = []
    legend_added: set[str] = set()
    for _, ses in df_sessions.iterrows():
        stype = ses["session_type"]
        fill = SESSION_FILL.get(stype, "rgba(128,128,128,0.10)")
        line = SESSION_LINE.get(stype, "rgba(128,128,128,0.50)")
        shapes.append(dict(
            type="rect", xref="x", yref="paper",
            x0=ses["start"].isoformat(), x1=ses["end"].isoformat(),
            y0=0, y1=1,
            fillcolor=fill, line=dict(color=line, width=0.5), layer="below",
        ))
        if stype not in legend_added:
            fig.add_trace(go.Scatter(
                x=[None], y=[None], mode="markers",
                marker=dict(size=12, color=fill, symbol="square", line=dict(color=line, width=1)),
                name=f"sesion {stype}", legendgroup=stype,
            ))
            legend_added.add(stype)

    # Línea de peso — naranja, gruesa
    fig.add_trace(go.Scattergl(
        x=df_plot["ts"], y=df_plot["weight_grams"],
        mode="lines", name="peso (g)",
        line=dict(color=WEIGHT_LINE_COLOR, width=2.5),
        hovertemplate="<b>%{x|%Y-%m-%d %H:%M:%S UTC}</b><br>%{y:.1f} g<extra></extra>",
    ))

    if show_net and "net_weight" in df_plot.columns:
        fig.add_trace(go.Scattergl(
            x=df_plot["ts"], y=df_plot["net_weight"],
            mode="lines", name="net_weight",
            line=dict(color="#0088cc", width=1, dash="dot"),
            hovertemplate="net: %{y:.1f} g<extra></extra>",
        ))

    if not df_events.empty:
        for cat in df_events["category"].unique():
            sub = df_events[df_events["category"] == cat]
            y_vals = []
            for ts in sub["ts"]:
                i = (df_r["ts"] - ts).abs().idxmin() if not df_r.empty else 0
                y_vals.append(df_r.at[i, "weight_grams"] if not df_r.empty else 0)
            fig.add_trace(go.Scatter(
                x=sub["ts"].tolist(), y=y_vals,
                mode="markers", name=cat.replace("_", " "),
                marker=dict(
                    symbol="triangle-down", size=10,
                    color=EVENT_COLOR.get(cat, "#888888"),
                    line=dict(color="white", width=0.5),
                ),
                hovertemplate=f"<b>{cat}</b><br>%{{x|%Y-%m-%d %H:%M:%S UTC}}<br>peso: %{{y:.1f}} g<extra></extra>",
            ))

    if not df_new.empty:
        y_vals_new = []
        for ts in df_new["ts"]:
            i = (df_r["ts"] - ts).abs().idxmin() if not df_r.empty else 0
            y_vals_new.append(df_r.at[i, "weight_grams"] if not df_r.empty else 0)
        notes_list = df_new.get("notes", pd.Series([""] * len(df_new))).fillna("").tolist()
        hover_texts = [
            f"<b>NUEVA: {row['category']}</b><br>{str(row['ts'])[:19]} UTC<br>{y_vals_new[k]:.1f} g"
            + (f"<br><i>{notes_list[k]}</i>" if notes_list[k] else "")
            for k, (_, row) in enumerate(df_new.iterrows())
        ]
        fig.add_trace(go.Scatter(
            x=df_new["ts"].tolist(), y=y_vals_new,
            mode="markers+text", name="Nueva anotacion",
            text=["★"] * len(df_new), textposition="top center",
            textfont=dict(color=NEW_ANNOT_COLOR, size=14),
            marker=dict(symbol="star", size=14, color=NEW_ANNOT_COLOR, line=dict(color="white", width=1)),
            hovertemplate="%{customdata}<extra></extra>",
            customdata=hover_texts,
        ))

    fig.update_layout(
        shapes=shapes,
        height=520,
        margin=dict(l=0, r=0, t=30, b=0),
        xaxis=dict(
            type="date",
            rangeslider=dict(visible=True, thickness=0.06),
            rangeselector=dict(buttons=[
                dict(count=1,  label="1d",   step="day", stepmode="backward"),
                dict(count=3,  label="3d",   step="day", stepmode="backward"),
                dict(count=7,  label="1sem", step="day", stepmode="backward"),
                dict(step="all", label="Todo"),
            ]),
        ),
        yaxis=dict(title="peso (g)", fixedrange=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="left", x=0),
        hovermode="x unified",
        plot_bgcolor="#fafafa",
        paper_bgcolor="#fafafa",
    )
    return fig


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    st.set_page_config(
        page_title="Kittypau - Anotador KPCL0034",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    # Estado de sesión
    if "filt_pos" not in st.session_state:
        st.session_state.filt_pos = 0
    if "_prev_filter" not in st.session_state:
        st.session_state["_prev_filter"] = "🟠 Pendientes"
    if "dataset_mode" not in st.session_state:
        st.session_state["dataset_mode"] = "exp07"
    if "_prev_dataset" not in st.session_state:
        st.session_state["_prev_dataset"] = "exp07"

    # ---------------------------------------------------------------------------
    # Carga de datos
    # ---------------------------------------------------------------------------
    df_r        = load_readings()
    df_r_mj     = load_readings_mayo_junio()
    df_exp07    = load_sessions_exp07()
    df_abril    = load_sessions_abril()
    df_ae_ref   = load_audit_events_ref()
    df_events   = load_events()
    df_sessions = load_sessions()
    df_new      = load_new_annotations()

    # Dataset activo según modo seleccionado
    dataset_mode = st.session_state.get("dataset_mode", "exp07")
    df_active_sessions = df_exp07 if dataset_mode == "exp07" else df_abril

    # Estado de anotación por sesión del dataset activo
    if not df_active_sessions.empty:
        ann_flags = []
        ann_cats  = []
        for _, ses in df_active_sessions.iterrows():
            is_ann, cat = get_session_status(ses["inicio"], ses["fin"], df_new)
            ann_flags.append(is_ann)
            ann_cats.append(cat)
        df_active_sessions = df_active_sessions.copy()
        df_active_sessions["_annotated"]    = ann_flags
        df_active_sessions["_ann_category"] = ann_cats
        n_total     = len(df_active_sessions)
        n_annotated = sum(ann_flags)
        n_pending   = n_total - n_annotated
    else:
        n_total = n_annotated = n_pending = 0

    # Sync exp07/abril con flags
    if dataset_mode == "exp07":
        df_exp07 = df_active_sessions
    else:
        df_abril = df_active_sessions

    # ---------------------------------------------------------------------------
    # Header
    # ---------------------------------------------------------------------------
    if dataset_mode == "exp07":
        st.title("KPCL0034 (Bandida) — Anotador de Sesiones Exp 07")
        st.caption("Fase 4 · Mayo 25 – Jun 14, 2026 · sesiones detectadas por el modelo")
    else:
        st.title("KPCL0034 (Bandida) — Anotador de Sesiones Abril 2026 (Prep Exp 09)")
        st.caption("Fase 4 · Abril 8 – Mayo 1, 2026 · sesiones detectadas + etiquetas manuales de referencia")

    # Barra de progreso siempre visible
    pct = (n_annotated / n_total * 100) if n_total > 0 else 0.0
    c1, c2, c3 = st.columns([2, 6, 2])
    with c1:
        st.metric("Categorizadas", f"{n_annotated} / {n_total}")
    with c2:
        st.progress(pct / 100, text=f"{pct:.1f}% completado — {n_pending} pendientes")
    with c3:
        st.metric("Pendientes", n_pending)

    st.markdown("---")

    with st.expander("Contexto de datos — qué estás viendo y anotando", expanded=False):
        st.markdown("""
| Dato | Etiquetado manual | Visto por el modelo | Período | Qué hacer aquí |
|---|:---:|:---:|---|---|
| **Train set** | ✅ Sí | ✅ Sí | Apr 8 – Apr 25 | Solo visualizar — no modificar |
| **Val set** | ✅ Sí | ✅ Sí | Apr 25 – Apr 28 | Solo visualizar — no modificar |
| **Test set** ⚠️ RESERVADO | ✅ Sí | ❌ NO — jamás visto | Apr 28 – May 1 | Reservado para evaluación Fase 4 |
| **Inferencia (Exp 07)** | ✅ Anotado | ❌ NO — dato nuevo | May 25 – Jun 14 | ✅ Completado — listo para Exp 08 |
| **Abril 2026 (Prep Exp 09)** | ⏳ En revisión | ✅ Sí (train/val/test) | Apr 8 – May 1 | **⬅ VERIFICAR / CORREGIR etiquetas** |

**Modos de anotación:**
- **Exp 07 (May-Jun)**: sesiones sin etiquetas previas — se crean desde cero. Ya completado.
- **Abril 2026 (Prep Exp 09)**: sesiones detectadas por el modelo sobre datos que YA tienen etiquetas manuales en `audit_events`. Los marcadores ◆ muestran la etiqueta original como referencia. Verifica y ajusta si es necesario.

**Flujo hacia Exp 09:** Anotar Abril → Anotar May-Jun (hecho) → `new_annotations.csv` → Fase 1 → Fase 2 → Fase 3 → **Exp 09**.
        """)

    # ---------------------------------------------------------------------------
    # Sidebar
    # ---------------------------------------------------------------------------
    with st.sidebar:
        st.header("Configuración")

        # Dataset selector
        st.subheader("Dataset a revisar")
        mode_options = {
            "Exp 07 — May-Jun 2026": "exp07",
            "Prep Exp 09 — Abril 2026": "abril",
        }
        current_label = "Exp 07 — May-Jun 2026" if dataset_mode == "exp07" else "Prep Exp 09 — Abril 2026"
        selected_label = st.radio(
            "Seleccionar dataset:",
            list(mode_options.keys()),
            index=list(mode_options.keys()).index(current_label),
            key="ds_radio",
        )
        new_mode = mode_options[selected_label]
        if new_mode != st.session_state.get("dataset_mode", "exp07"):
            st.session_state["dataset_mode"] = new_mode
            st.session_state.filt_pos = 0
            st.session_state["_prev_filter"] = "🟠 Pendientes"
            st.rerun()

        st.markdown("---")
        st.subheader("Vista Global — fechas")
        min_date = df_r["ts"].min().date()
        max_date = df_r["ts"].max().date()
        ca, cb = st.columns(2)
        with ca:
            date_from = st.date_input("Desde", value=min_date, min_value=min_date, max_value=max_date, key="g_from")
        with cb:
            date_to = st.date_input("Hasta", value=max_date, min_value=min_date, max_value=max_date, key="g_to")

        resample_opt = st.selectbox(
            "Resolución",
            ["1 min (recomendado)", "5 min", "30 min", "Sin resamplear (lento)"],
        )
        resample_rule = {"1 min (recomendado)": "1min", "5 min": "5min", "30 min": "30min", "Sin resamplear (lento)": None}[resample_opt]

        show_net          = st.checkbox("Mostrar net_weight", value=False)
        show_sessions_chk = st.checkbox("Mostrar sesiones etiquetadas", value=True)
        show_events_chk   = st.checkbox("Mostrar eventos existentes", value=True)

        st.markdown("---")
        st.subheader("Estadísticas")
        st.metric("Readings Apr–May", f"{len(df_r):,}")
        st.metric("Readings May–Jun", f"{len(df_r_mj):,}")
        alim = len(df_sessions[df_sessions["session_type"] == "alimentacion"]) if not df_sessions.empty else 0
        serv = len(df_sessions[df_sessions["session_type"] == "servido"])      if not df_sessions.empty else 0
        st.caption(f"Sesiones Exp 06: {alim} alim · {serv} serv")
        st.metric("Sesiones Exp 07 (May-Jun)", len(df_exp07))
        st.metric("Sesiones Abril 2026", len(df_abril))
        st.metric("Nuevas anotaciones", len(df_new))

        if st.button("Refrescar datos", width='stretch'):
            st.cache_data.clear()
            st.rerun()

    # ---------------------------------------------------------------------------
    # Tabs
    # ---------------------------------------------------------------------------
    review_label = "🔍 Revisar Sesiones Exp07" if dataset_mode == "exp07" else "🔍 Revisar Abril 2026"
    tab_review, tab_global, tab_add, tab_annots, tab_table, tab_export = st.tabs([
        review_label,
        "📈 Vista Global (Apr–May)",
        "➕ Agregar Evento",
        "📋 Mis Anotaciones",
        "📊 Sesiones Detectadas",
        "📤 Exportar / Integrar",
    ])

    # Lecturas y ae_ref según dataset activo
    df_readings_active = df_r_mj if dataset_mode == "exp07" else df_r
    ae_ref_active      = None    if dataset_mode == "exp07" else df_ae_ref

    # =========================================================================
    # TAB 1 — COLA DE REVISIÓN
    # =========================================================================
    with tab_review:
        sessions_path_str = str(SESSIONS_EXP07) if dataset_mode == "exp07" else str(SESSIONS_ABRIL)
        st.subheader("Cola de revisión — sesiones detectadas por el modelo")

        if dataset_mode == "abril":
            st.info(
                "**Modo Abril 2026 (Prep Exp 09):** Los marcadores ◆ en el gráfico muestran las "
                "etiquetas manuales originales de `audit_events` como referencia. "
                "Confirma, ajusta o corrige según lo que veas en la curva de peso."
            )

        if df_active_sessions.empty:
            st.warning(
                "No se encontró el archivo de sesiones detectadas.\n\n"
                f"Ruta esperada: `{sessions_path_str}`"
            )
        else:
            # Filtro
            filter_mode = st.radio(
                "Mostrar:",
                ["🟠 Pendientes", "✅ Categorizadas", "📋 Todas"],
                horizontal=True,
                key="filter_radio",
            )

            # Resetear posición cuando cambia el filtro
            if st.session_state["_prev_filter"] != filter_mode:
                st.session_state.filt_pos = 0
                st.session_state["_prev_filter"] = filter_mode

            # Lista filtrada
            if filter_mode == "🟠 Pendientes":
                filtered = df_active_sessions.index[~df_active_sessions["_annotated"]].tolist()
            elif filter_mode == "✅ Categorizadas":
                filtered = df_active_sessions.index[df_active_sessions["_annotated"]].tolist()
            else:
                filtered = df_active_sessions.index.tolist()

            n_filt = len(filtered)

            exp_label = "Exp 09" if dataset_mode == "abril" else "Exp 08"
            if n_filt == 0:
                if filter_mode == "🟠 Pendientes":
                    st.success(f"¡Todas las sesiones están categorizadas! Ve a **Exportar / Integrar** para continuar con {exp_label}.")
                else:
                    st.info("No hay sesiones en esta vista.")
            else:
                filt_pos = max(0, min(st.session_state.get("filt_pos", 0), n_filt - 1))

                # Navegación
                nc1, nc2, nc3 = st.columns([2, 4, 2])
                with nc1:
                    if st.button("← Anterior", width='stretch', disabled=filt_pos == 0):
                        st.session_state.filt_pos = filt_pos - 1
                        st.rerun()
                with nc2:
                    st.markdown(
                        f"<div style='text-align:center;font-size:1.15rem;font-weight:700;padding:5px 0'>"
                        f"Sesión {filt_pos + 1} de {n_filt}"
                        f"</div>",
                        unsafe_allow_html=True,
                    )
                with nc3:
                    if st.button("Siguiente →", width='stretch', disabled=filt_pos == n_filt - 1):
                        st.session_state.filt_pos = filt_pos + 1
                        st.rerun()

                # Sesión actual
                real_idx = filtered[filt_pos]
                ses = df_active_sessions.iloc[real_idx]

                is_ann    = ses["_annotated"]
                ann_cat   = ses["_ann_category"]
                tipo_pred = ses.get("tipo", "desconocido")
                dur_min   = ses.get("duracion_min", 0)
                consumido = ses.get("consumido_g", 0)
                n_lect    = ses.get("n_lecturas", "?")
                inicio_ts = ses["inicio"]
                fin_ts    = ses["fin"]

                # Estado
                if is_ann:
                    st.success(f"✅ Ya categorizada como: **{ann_cat}**")
                else:
                    st.info("⏳ Pendiente de categorización")

                # Etiqueta manual de referencia (solo modo Abril)
                if dataset_mode == "abril":
                    ref_label = str(ses.get("etiqueta_manual_ref", "") or "").strip()
                    if ref_label:
                        st.markdown(
                            f"**◆ Etiqueta original (audit_events):** `{ref_label}`  "
                            "— úsala como referencia, no como verdad absoluta."
                        )
                    else:
                        st.caption("◆ Sin etiqueta manual original para esta sesión.")

                # Métricas de sesión
                mc1, mc2, mc3, mc4 = st.columns(4)
                with mc1:
                    st.metric("Predicción modelo", tipo_pred)
                with mc2:
                    st.metric("Duración", f"{dur_min:.1f} min")
                with mc3:
                    st.metric("Consumido", f"{consumido:.0f} g")
                with mc4:
                    st.metric("Lecturas", n_lect)

                st.caption(
                    f"🕐 `{inicio_ts.strftime('%Y-%m-%d %H:%M:%S UTC')}`"
                    f"  ->  `{fin_ts.strftime('%Y-%m-%d %H:%M:%S UTC')}`"
                )

                # Gráfico de sesión
                if df_readings_active.empty:
                    st.warning("Sin lecturas para este período.")
                else:
                    fig_ses = build_session_figure(
                        df_readings_active, inicio_ts, fin_ts, df_new,
                        tipo_pred=tipo_pred, buffer_min=5,
                        df_ae_ref=ae_ref_active,
                    )
                    st.plotly_chart(fig_ses, width='stretch', key=f"ses_chart_{real_idx}")

                # Formulario de anotación
                st.markdown("---")
                st.subheader("¿Qué ves realmente en esta sesión?")

                if is_ann and ann_cat in SESSION_CATEGORIES:
                    default_idx = SESSION_CATEGORIES.index(ann_cat)
                elif tipo_pred in SESSION_CATEGORIES:
                    default_idx = SESSION_CATEGORIES.index(tipo_pred)
                else:
                    default_idx = 0

                cat_labels = [SESSION_CAT_LABELS[c] for c in SESSION_CATEGORIES]

                with st.form(f"form_rev_{real_idx}", clear_on_submit=False):
                    sel_label = st.radio(
                        "Categoría:",
                        cat_labels,
                        index=default_idx,
                        horizontal=True,
                    )
                    sel_cat = SESSION_CATEGORIES[cat_labels.index(sel_label)]

                    st.markdown("**Ajustar rango temporal** — modifica si el inicio/fin detectado es incorrecto:")
                    fc1, fc2, fc3, fc4 = st.columns(4)
                    with fc1:
                        adj_sd = st.date_input("Fecha inicio (UTC)", value=inicio_ts.date(), key=f"asd_{real_idx}")
                    with fc2:
                        adj_st = st.time_input("Hora inicio (UTC)", value=inicio_ts.time(), step=60, key=f"ast_{real_idx}")
                    with fc3:
                        adj_ed = st.date_input("Fecha fin (UTC)", value=fin_ts.date(), key=f"aed_{real_idx}")
                    with fc4:
                        adj_et = st.time_input("Hora fin (UTC)", value=fin_ts.time(), step=60, key=f"aet_{real_idx}")

                    ev_notes = st.text_input(
                        "Notas (opcional)",
                        placeholder="ej: inicio dudoso, Bandida comió rápido...",
                        key=f"notes_{real_idx}",
                    )

                    btn1, btn2 = st.columns(2)
                    with btn1:
                        save_btn = st.form_submit_button("💾 Guardar y avanzar", type="primary", width='stretch')
                    with btn2:
                        skip_btn = st.form_submit_button("⏭️ Saltar sin anotar", width='stretch')

                    if save_btn:
                        adj_inicio = pd.Timestamp(f"{adj_sd}T{adj_st.strftime('%H:%M:%S')}+00:00")
                        adj_fin    = pd.Timestamp(f"{adj_ed}T{adj_et.strftime('%H:%M:%S')}+00:00")
                        save_session_annotation(adj_inicio, adj_fin, sel_cat, ev_notes)
                        st.success(
                            f"✅ **{sel_cat}** guardado  "
                            f"({adj_inicio.strftime('%H:%M:%S')} → {adj_fin.strftime('%H:%M:%S')} UTC)"
                        )
                        if filt_pos < n_filt - 1:
                            st.session_state.filt_pos = filt_pos + 1
                        st.cache_data.clear()
                        st.rerun()

                    if skip_btn and filt_pos < n_filt - 1:
                        st.session_state.filt_pos = filt_pos + 1
                        st.rerun()

    # =========================================================================
    # TAB 2 — VISTA GLOBAL
    # =========================================================================
    with tab_global:
        st.subheader("Vista Global — Apr 8 – May 1, 2026 (train / val / test)")
        st.caption("Datos con etiqueta manual. Solo visualización — no modificar.")

        ts_from = pd.Timestamp(date_from, tz="UTC")
        ts_to   = pd.Timestamp(date_to,   tz="UTC") + pd.Timedelta(days=1)

        df_r_f   = df_r[(df_r["ts"] >= ts_from) & (df_r["ts"] < ts_to)]
        df_ses_f = (
            df_sessions[(df_sessions["start"] >= ts_from) & (df_sessions["start"] < ts_to)]
            if show_sessions_chk else pd.DataFrame()
        )
        df_ev_f = (
            df_events[(df_events["ts"] >= ts_from) & (df_events["ts"] < ts_to)]
            if show_events_chk else pd.DataFrame()
        )

        if df_r_f.empty:
            st.warning("No hay datos en el rango seleccionado.")
        else:
            fig = build_figure(df_r_f, df_ses_f, df_ev_f, df_new, show_net, resample_rule)
            st.plotly_chart(fig, width='stretch', key="global_chart")
            st.caption(
                "Tip: usa el range selector (1d / 3d / 1sem) para hacer zoom. "
                "La línea naranja es el peso bruto del bowl."
            )

    # =========================================================================
    # TAB 3 — AGREGAR EVENTO (avanzado)
    # =========================================================================
    with tab_add:
        st.subheader("Registrar evento manualmente")
        st.markdown(
            "Inserta un evento exacto en un timestamp específico. "
            "Para anotar sesiones de Exp 07, usa la pestaña **Revisar Sesiones**."
        )

        d_min = min(
            df_r["ts"].min().date(),
            df_r_mj["ts"].min().date() if not df_r_mj.empty else df_r["ts"].min().date(),
        )
        d_max = max(
            df_r["ts"].max().date(),
            df_r_mj["ts"].max().date() if not df_r_mj.empty else df_r["ts"].max().date(),
        )

        with st.form("form_add_event", clear_on_submit=True):
            ac1, ac2, ac3, ac4 = st.columns([2, 2, 3, 2])
            with ac1:
                ev_date = st.date_input("Fecha (UTC)", value=d_min, min_value=d_min, max_value=d_max)
            with ac2:
                ev_time = st.time_input("Hora (UTC)", value=time(0, 0, 0), step=60)
            with ac3:
                ev_category = st.selectbox("Tipo de evento", CATEGORIES)
            with ac4:
                ev_notes = st.text_input("Notas")
            submitted = st.form_submit_button("Guardar evento", type="primary", width='stretch')
            if submitted:
                ts_str = f"{ev_date}T{ev_time.strftime('%H:%M:%S')}+00:00"
                save_annotation(ts_str, ev_category, ev_notes)
                st.success(f"Guardado: **{ev_category}** @ {ts_str}")
                st.cache_data.clear()
                st.rerun()

        st.markdown("---")
        st.subheader("Atajo: marcar sesión completa (inicio + termino)")
        with st.form("form_add_session", clear_on_submit=True):
            sc1, sc2, sc3, sc4, sc5 = st.columns(5)
            with sc1:
                ses_type = st.selectbox("Tipo", ["alimentacion", "servido", "hidratacion"])
            with sc2:
                ses_sd = st.date_input("Fecha inicio", value=d_min, key="ss_d")
            with sc3:
                ses_st = st.time_input("Hora inicio (UTC)", value=time(0, 0, 0), key="ss_t", step=60)
            with sc4:
                ses_ed = st.date_input("Fecha fin", value=d_min, key="se_d")
            with sc5:
                ses_et = st.time_input("Hora fin (UTC)", value=time(0, 0, 0), key="se_t", step=60)
            ses_notes = st.text_input("Notas", key="ses_notes")
            sub_ses = st.form_submit_button("Guardar sesión (inicio + termino)", width='stretch')
            if sub_ses:
                ts_start = f"{ses_sd}T{ses_st.strftime('%H:%M:%S')}+00:00"
                ts_end   = f"{ses_ed}T{ses_et.strftime('%H:%M:%S')}+00:00"
                save_annotation(ts_start, f"inicio_{ses_type}", ses_notes)
                save_annotation(ts_end,   f"termino_{ses_type}", ses_notes)
                st.success(f"Sesión guardada: **{ses_type}** {ts_start} → {ts_end}")
                st.cache_data.clear()
                st.rerun()

    # =========================================================================
    # TAB 4 — MIS ANOTACIONES
    # =========================================================================
    with tab_annots:
        st.subheader(f"Nuevas anotaciones guardadas ({len(df_new)})")
        if df_new.empty:
            st.info("No hay anotaciones todavía. Usa **Revisar Sesiones** para empezar.")
        else:
            df_disp = df_new.copy()
            df_disp["ts_str"] = df_disp["ts"].dt.strftime("%Y-%m-%d %H:%M:%S UTC")
            for i, row in df_disp.iterrows():
                rc1, rc2, rc3, rc4 = st.columns([3, 3, 3, 1])
                with rc1:
                    st.write(f"`{row['ts_str']}`")
                with rc2:
                    color = EVENT_COLOR.get(row["category"], "#888")
                    st.markdown(
                        f"<span style='color:{color};font-weight:bold'>{row['category']}</span>",
                        unsafe_allow_html=True,
                    )
                with rc3:
                    st.write(str(row.get("notes", "") or ""))
                with rc4:
                    if st.button("✕", key=f"del_{i}", help="Borrar"):
                        delete_annotation(i)
                        st.cache_data.clear()
                        st.rerun()

    # =========================================================================
    # TAB 5 — SESIONES DETECTADAS (tabla)
    # =========================================================================
    with tab_table:
        if dataset_mode == "exp07":
            st.subheader(f"Sesiones Exp 07 (May-Jun) — {len(df_exp07)} detectadas")
            st.caption("Predicciones del Modelo A + B sobre Mayo-Jun 2026. Anotadas manualmente.")
            df_table_active = df_exp07
        else:
            st.subheader(f"Sesiones Abril 2026 (Prep Exp 09) — {len(df_abril)} detectadas")
            st.caption(
                "Predicciones del Modelo A + B sobre Abril 2026. "
                "Columna 'Etiq. original' muestra las etiquetas de audit_events como referencia."
            )
            df_table_active = df_abril

        if not df_table_active.empty:
            tf1, tf2 = st.columns(2)
            with tf1:
                filter_tipo = st.multiselect(
                    "Filtrar por tipo predicho:",
                    ["alimentacion", "servido", "reposo"],
                    default=["alimentacion", "servido", "reposo"],
                )
            with tf2:
                filter_ann = st.selectbox("Estado:", ["Todas", "Pendientes", "Categorizadas"], key="tab_filter_ann")

            df_t = df_table_active.copy()
            if filter_tipo:
                df_t = df_t[df_t["tipo"].isin(filter_tipo)]
            if filter_ann == "Pendientes":
                df_t = df_t[~df_t["_annotated"]]
            elif filter_ann == "Categorizadas":
                df_t = df_t[df_t["_annotated"]]

            cols_show = ["inicio", "fin", "duracion_min", "consumido_g", "tipo", "_annotated", "_ann_category"]
            if "etiqueta_manual_ref" in df_t.columns and dataset_mode == "abril":
                cols_show = ["inicio", "fin", "duracion_min", "consumido_g", "tipo", "etiqueta_manual_ref", "_annotated", "_ann_category"]

            df_tv = df_t[cols_show].copy()
            df_tv["inicio"] = df_tv["inicio"].dt.strftime("%Y-%m-%d %H:%M")
            df_tv["fin"]    = df_tv["fin"].dt.strftime("%H:%M")
            df_tv["estado"] = df_tv.apply(
                lambda r: f"✅ {r['_ann_category']}" if r["_annotated"] else "⏳ pendiente", axis=1
            )
            df_tv = df_tv.drop(columns=["_annotated", "_ann_category"])
            new_cols = ["Inicio (UTC)", "Fin", "Duración (min)", "Consumido (g)", "Tipo predicho"]
            if "etiqueta_manual_ref" in df_tv.columns:
                new_cols.append("Etiq. original")
            new_cols.append("Estado")
            df_tv.columns = new_cols
            st.dataframe(df_tv, width='stretch', height=500)

        st.markdown("---")
        st.subheader("Sesiones Exp 06 — train/val/test (etiquetadas manualmente)")
        if not df_sessions.empty:
            df_sv = df_sessions.copy()
            df_sv["inicio"] = df_sv["start"].dt.strftime("%Y-%m-%d %H:%M:%S")
            df_sv["fin"]    = df_sv["end"].dt.strftime("%Y-%m-%d %H:%M:%S")
            df_sv["duracion"] = df_sv["duration_s"].apply(
                lambda s: f"{int(s//60)}m {int(s%60)}s" if not pd.isna(s) else "?"
            )
            st.dataframe(
                df_sv[["inicio", "fin", "session_type", "duracion"]].rename(columns={"session_type": "tipo"}),
                width='stretch', height=350,
            )

    # =========================================================================
    # TAB 6 — EXPORTAR / INTEGRAR
    # =========================================================================
    with tab_export:
        st.subheader("Estado de las anotaciones")

        # Calcular progreso de ambos datasets para mostrar estado global
        def _count_annotated(df_ses, df_new_ann):
            if df_ses.empty:
                return 0, 0
            flags = [get_session_status(r["inicio"], r["fin"], df_new_ann)[0] for _, r in df_ses.iterrows()]
            return sum(flags), len(flags)

        n07_ann, n07_total   = _count_annotated(df_exp07, df_new)
        nabr_ann, nabr_total = _count_annotated(df_abril, df_new)

        ec1, ec2, ec3 = st.columns(3)
        with ec1:
            st.metric("Exp 07 (May-Jun) anotadas", f"{n07_ann} / {n07_total}")
        with ec2:
            st.metric("Abril 2026 anotadas", f"{nabr_ann} / {nabr_total}")
        with ec3:
            st.metric("Eventos en new_annotations.csv", len(df_new))

        if df_new.empty:
            st.info("No hay anotaciones para exportar aún. Usa **Revisar Sesiones** para empezar.")
        else:
            st.success(f"{len(df_new)} eventos guardados y listos para integrarse al pipeline.")
            csv_bytes = df_new.to_csv(index=False).encode("utf-8")
            st.download_button(
                "⬇️ Descargar new_annotations.csv",
                data=csv_bytes,
                file_name="new_annotations.csv",
                mime="text/csv",
                type="primary",
            )

        st.markdown("---")
        st.subheader("Integrar al pipeline")
        st.markdown("""
**Estado hacia Exp 09:**
- ✅ Exp 07 (May-Jun 2026) — anotado retroactivamente
- ⏳ Abril 2026 — en revisión (esta sesión de anotación)

Cuando ambos datasets estén completos, ejecuta el pipeline completo para **Exp 09**:
        """)
        st.code(
            """# Las anotaciones ya están en:
#   fase_4_visualizacion/data/new_annotations.csv

# 1. Fase 1 — fusiona new_annotations.csv automáticamente
cd fase_1_extraccion/scripts
python 03_extract_readings.py
python 04_extract_events.py     # <- lee new_annotations.csv + audit_events
python 05_build_sessions.py
python 06_quality_report.py

# 2. Fase 2
cd ../../fase_2_dataset/scripts
python 01_build_labels.py
python 02_build_features.py
python 03_build_train_dataset.py
python 04_dataset_report.py

# 3. Fase 3 — Exp 09 (datos Abril + May-Jun etiquetados)
cd ../../fase_3_modelos/scripts
python 01_prepare_datasets.py
python 02_train_modelo_a.py
python 03_train_modelo_b.py
python 04_training_report.py""",
            language="bash",
        )

        st.markdown("---")
        st.subheader("Buscar peso en un momento específico")
        lc1, lc2 = st.columns(2)
        with lc1:
            st.markdown("**Apr–May (train/val/test):**")
            ts_look = st.text_input("Timestamp (YYYY-MM-DD HH:MM:SS)", placeholder="2026-04-15 14:30:00", key="tsl_a")
            if ts_look:
                try:
                    tq = pd.Timestamp(ts_look, tz="UTC")
                    ri = (df_r["ts"] - tq).abs().idxmin()
                    st.metric("Peso", f"{df_r.at[ri, 'weight_grams']:.1f} g")
                    st.caption(f"ts exacto: {df_r.at[ri, 'ts']}")
                except Exception as e:
                    st.error(f"Inválido: {e}")
        with lc2:
            st.markdown("**May–Jun (Exp 07):**")
            ts_look2 = st.text_input("Timestamp (YYYY-MM-DD HH:MM:SS)", placeholder="2026-05-25 14:30:00", key="tsl_b")
            if ts_look2 and not df_r_mj.empty:
                try:
                    tq = pd.Timestamp(ts_look2, tz="UTC")
                    ri = (df_r_mj["ts"] - tq).abs().idxmin()
                    st.metric("Peso", f"{df_r_mj.at[ri, 'weight_grams']:.1f} g")
                    st.caption(f"ts exacto: {df_r_mj.at[ri, 'ts']}")
                except Exception as e:
                    st.error(f"Inválido: {e}")


if __name__ == "__main__":
    main()
