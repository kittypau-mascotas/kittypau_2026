"""Kittypau - Anotador de sesiones KPCL0034 — Ciclo Gamma.

Pre-G: retiquetado total de los candidatos generados por Modelo A (Exp06,
Ciclo Alpha) sobre el período unificado Abril-Mayo-Junio 2026. Ver runbook
completo en Ciclo Gamma/CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md (Paso 4.9).

A diferencia de la versión de Alpha, no hay dos datasets/modos (Exp07 vs
Abril) — Gamma ya unificó todo el período en un solo pipeline (g01-g08), así
que aquí hay una sola cola de revisión sobre sesiones_candidatas.csv.

Uso:
    streamlit run app_anotacion.py
"""

from __future__ import annotations

import sys
from datetime import datetime, time, timezone
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# ---------------------------------------------------------------------------
# Paths — importa constantes canónicas de Fase 1 Gamma
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
GAMMA_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(GAMMA_ROOT / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (  # noqa: E402
    READINGS_UNIFICADO_30S, SESIONES_CANDIDATAS_CSV, NEW_ANNOTATIONS_GAMMA_CSV,
)

ANNOT_FILE = NEW_ANNOTATIONS_GAMMA_CSV
MIN_SERVIDO_SESSIONS = 80  # ver instructivo.md §11 — cambiar requiere nuevo experimento

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

CATEGORIES = [
    "inicio_alimentacion",
    "termino_alimentacion",
    "inicio_servido",
    "termino_servido",
    "inicio_hidratacion",
    "termino_hidratacion",
    "falso_positivo",
    "sin_clasificar",
]

SESSION_CATEGORIES = ["alimentacion", "servido", "hidratacion", "falso_positivo", "sin_clasificar"]

SESSION_CAT_LABELS = {
    "alimentacion":   "🍽️ Alimentación",
    "servido":        "🫙 Servido",
    "hidratacion":    "💧 Hidratación",
    "falso_positivo": "❌ Falso positivo",
    "sin_clasificar": "⏳ Sin clasificar",
}

SESSION_TO_EVENTS = {
    "alimentacion":   ("inicio_alimentacion", "termino_alimentacion"),
    "servido":        ("inicio_servido", "termino_servido"),
    "hidratacion":    ("inicio_hidratacion", "termino_hidratacion"),
    "falso_positivo": ("falso_positivo", None),
    "sin_clasificar": ("sin_clasificar", None),
}

SESSION_FILL = {
    "alimentacion": "rgba(0, 180, 90, 0.15)",
    "servido":      "rgba(30, 100, 255, 0.15)",
    "candidato":    "rgba(255, 165, 0, 0.15)",
}
SESSION_LINE = {
    "alimentacion": "rgba(0, 180, 90, 0.70)",
    "servido":      "rgba(30, 100, 255, 0.70)",
    "candidato":    "rgba(255, 165, 0, 0.70)",
}

EVENT_COLOR = {
    "inicio_alimentacion":  "#00b45a",
    "termino_alimentacion": "#007a3d",
    "inicio_servido":       "#1e64ff",
    "termino_servido":      "#0033aa",
    "inicio_hidratacion":   "#00ccff",
    "termino_hidratacion":  "#0066aa",
    "falso_positivo":       "#dc2626",
    "sin_clasificar":       "#9ca3af",
}

WEIGHT_LINE_COLOR = "#ff6b00"
NEW_ANNOT_COLOR = "#e60000"


# ---------------------------------------------------------------------------
# Carga de datos
# ---------------------------------------------------------------------------

@st.cache_data
def load_readings() -> pd.DataFrame:
    if not READINGS_UNIFICADO_30S.exists():
        return pd.DataFrame(columns=["ts", "weight_grams"])
    df = pd.read_parquet(READINGS_UNIFICADO_30S)
    df = df.rename(columns={"ts_utc": "ts"})
    df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    return df.dropna(subset=["ts"]).sort_values("ts").reset_index(drop=True)


@st.cache_data
def load_sesiones_candidatas() -> pd.DataFrame:
    if not SESIONES_CANDIDATAS_CSV.exists():
        return pd.DataFrame()
    df = pd.read_csv(SESIONES_CANDIDATAS_CSV)
    df = df.rename(columns={"ts_inicio": "inicio", "ts_fin": "fin"})
    df["inicio"] = pd.to_datetime(df["inicio"], utc=True, errors="coerce")
    df["fin"] = pd.to_datetime(df["fin"], utc=True, errors="coerce")
    df["duracion_min"] = df["duracion_s"] / 60.0
    if "delta_peso_g" in df.columns:
        df["consumido_g"] = df["delta_peso_g"]
    else:
        df["consumido_g"] = 0.0
    return df.dropna(subset=["inicio", "fin"]).sort_values("inicio").reset_index(drop=True)


def load_new_annotations() -> pd.DataFrame:
    if ANNOT_FILE.exists():
        df = pd.read_csv(ANNOT_FILE)
        df["ts"] = pd.to_datetime(df["ts"], utc=True, errors="coerce")
        return df.dropna(subset=["ts"]).reset_index(drop=True)
    return pd.DataFrame(columns=["ts", "category", "notes", "created_at", "device_code"])


# ---------------------------------------------------------------------------
# Persistencia de anotaciones
# ---------------------------------------------------------------------------

def save_annotation(ts_str: str, category: str, notes: str) -> None:
    ANNOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": ts_str,
        "category": category,
        "notes": notes,
        "device_code": "KPCL0034",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    df = pd.read_csv(ANNOT_FILE) if ANNOT_FILE.exists() else pd.DataFrame(
        columns=["ts", "category", "notes", "device_code", "created_at"]
    )
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_csv(ANNOT_FILE, index=False)


def save_session_annotation(
    inicio: pd.Timestamp,
    fin: pd.Timestamp,
    category: str,
    notes: str,
) -> None:
    ev_i, ev_f = SESSION_TO_EVENTS.get(category, ("sin_clasificar", None))
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
    hits = df_new[(df_new["ts"] >= inicio - margin) & (df_new["ts"] <= fin + margin)]
    if hits.empty:
        return False, ""
    cat = hits.iloc[0]["category"]
    for ses_cat, (ev_i, ev_f) in SESSION_TO_EVENTS.items():
        if cat in (ev_i, ev_f):
            return True, ses_cat
    return True, cat


def count_servido_sesiones(df_new: pd.DataFrame) -> int:
    if df_new.empty:
        return 0
    return len(df_new[df_new["category"] == "inicio_servido"])


# ---------------------------------------------------------------------------
# Gráfico de sesión (zoom)
# ---------------------------------------------------------------------------

def build_session_figure(
    df_readings: pd.DataFrame,
    inicio: pd.Timestamp,
    fin: pd.Timestamp,
    df_new: pd.DataFrame,
    buffer_min: int = 5,
) -> go.Figure:
    t0 = inicio - pd.Timedelta(minutes=buffer_min)
    t1 = fin + pd.Timedelta(minutes=buffer_min)
    df_w = df_readings[(df_readings["ts"] >= t0) & (df_readings["ts"] <= t1)].copy()

    fig = go.Figure()

    fig.add_vrect(
        x0=inicio.isoformat(),
        x1=fin.isoformat(),
        fillcolor=SESSION_FILL["candidato"],
        line=dict(color=SESSION_LINE["candidato"], width=2),
        annotation_text="candidato (Modelo A)",
        annotation_position="top left",
        annotation=dict(font_size=11, font_color="#444"),
    )

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

    if not df_new.empty:
        margin = pd.Timedelta(minutes=3)
        df_near = df_new[(df_new["ts"] >= t0 - margin) & (df_new["ts"] <= t1 + margin)]
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
# Gráfico global (todo el período unificado)
# ---------------------------------------------------------------------------

def build_figure(
    df_r: pd.DataFrame,
    df_sessions: pd.DataFrame,
    df_new: pd.DataFrame,
    resample_rule: str | None = "5min",
) -> go.Figure:
    fig = go.Figure()

    if resample_rule:
        df_plot = (
            df_r.set_index("ts")["weight_grams"]
            .resample(resample_rule).mean()
            .reset_index()
        )
        df_plot.columns = ["ts", "weight_grams"]
    else:
        df_plot = df_r.copy()

    shapes: list[dict] = []
    for _, ses in df_sessions.iterrows():
        shapes.append(dict(
            type="rect", xref="x", yref="paper",
            x0=ses["inicio"].isoformat(), x1=ses["fin"].isoformat(),
            y0=0, y1=1,
            fillcolor=SESSION_FILL["candidato"],
            line=dict(color=SESSION_LINE["candidato"], width=0.5), layer="below",
        ))

    fig.add_trace(go.Scattergl(
        x=df_plot["ts"], y=df_plot["weight_grams"],
        mode="lines", name="peso (g)",
        line=dict(color=WEIGHT_LINE_COLOR, width=2),
        hovertemplate="<b>%{x|%Y-%m-%d %H:%M:%S UTC}</b><br>%{y:.1f} g<extra></extra>",
    ))

    if not df_new.empty:
        y_vals_new = []
        for ts in df_new["ts"]:
            i = (df_r["ts"] - ts).abs().idxmin() if not df_r.empty else 0
            y_vals_new.append(df_r.at[i, "weight_grams"] if not df_r.empty else 0)
        fig.add_trace(go.Scatter(
            x=df_new["ts"].tolist(), y=y_vals_new,
            mode="markers", name="Anotación Gamma",
            marker=dict(symbol="star", size=10, color=NEW_ANNOT_COLOR, line=dict(color="white", width=1)),
            hovertemplate="%{customdata}<extra></extra>",
            customdata=df_new["category"].tolist(),
        ))

    fig.update_layout(
        shapes=shapes,
        height=480,
        margin=dict(l=0, r=0, t=30, b=0),
        xaxis=dict(
            type="date",
            rangeslider=dict(visible=True, thickness=0.06),
            rangeselector=dict(buttons=[
                dict(count=1, label="1d", step="day", stepmode="backward"),
                dict(count=7, label="1sem", step="day", stepmode="backward"),
                dict(count=30, label="1mes", step="day", stepmode="backward"),
                dict(step="all", label="Todo"),
            ]),
        ),
        yaxis=dict(title="peso (g)", fixedrange=False),
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
        page_title="Kittypau - Anotador KPCL0034 (Gamma)",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    if "filt_pos" not in st.session_state:
        st.session_state.filt_pos = 0
    if "_prev_filter" not in st.session_state:
        st.session_state["_prev_filter"] = "🟠 Pendientes"

    df_r = load_readings()
    df_sessions = load_sesiones_candidatas()
    df_new = load_new_annotations()

    if not df_sessions.empty:
        ann_flags, ann_cats = [], []
        for _, ses in df_sessions.iterrows():
            is_ann, cat = get_session_status(ses["inicio"], ses["fin"], df_new)
            ann_flags.append(is_ann)
            ann_cats.append(cat)
        df_sessions = df_sessions.copy()
        df_sessions["_annotated"] = ann_flags
        df_sessions["_ann_category"] = ann_cats
        n_total = len(df_sessions)
        n_annotated = sum(ann_flags)
        n_pending = n_total - n_annotated
    else:
        n_total = n_annotated = n_pending = 0

    n_servido = count_servido_sesiones(df_new)

    st.title("KPCL0034 (Bandida) — Anotador de Sesiones — Ciclo Gamma")
    st.caption("Pre-G · Abril–Junio 2026 unificado · candidatos generados por Modelo A (Exp06, Alpha)")

    c1, c2, c3, c4 = st.columns([2, 5, 2, 2])
    with c1:
        st.metric("Categorizadas", f"{n_annotated} / {n_total}")
    with c2:
        pct = (n_annotated / n_total * 100) if n_total > 0 else 0.0
        st.progress(pct / 100, text=f"{pct:.1f}% completado — {n_pending} pendientes")
    with c3:
        st.metric("Servido anotado", f"{n_servido} / {MIN_SERVIDO_SESSIONS}")
    with c4:
        if n_servido >= MIN_SERVIDO_SESSIONS:
            st.success("✅ Meta servido OK")
        else:
            st.warning(f"⏳ Faltan {MIN_SERVIDO_SESSIONS - n_servido}")

    st.markdown("---")

    with st.expander("Contexto — qué estás anotando", expanded=False):
        st.markdown(f"""
Estás revisando **{n_total} candidatos** generados por `modelo_a.lgb` (Exp06, Ciclo
Alpha) sobre los datos unificados Abril–Junio 2026 (threshold de candidatos: 0.12,
distinto del threshold de producción). Ninguna etiqueta de Alpha se importa
automáticamente — cada candidato se clasifica de cero aquí.

**Prioridad:** `servido` es el cuello de botella del modelo (meta: ≥{MIN_SERVIDO_SESSIONS}
sesiones). Si no estás seguro de la categoría, usa "Sin clasificar" y revísalo después.

Las anotaciones se guardan en `new_annotations_gamma.csv` — fuente de verdad del
Ciclo Gamma. No se mezclan con `new_annotations.csv` de Alpha.
        """)

    with st.sidebar:
        st.header("Configuración")
        st.subheader("Estadísticas")
        st.metric("Lecturas unificadas", f"{len(df_r):,}")
        st.metric("Sesiones candidatas", n_total)
        st.metric("Nuevas anotaciones Gamma", len(df_new))

        if st.button("Refrescar datos", width="stretch"):
            st.cache_data.clear()
            st.rerun()

    tab_review, tab_global, tab_add, tab_annots, tab_table, tab_export = st.tabs([
        "🔍 Revisar Candidatos",
        "📈 Vista Global",
        "➕ Agregar Evento",
        "📋 Mis Anotaciones",
        "📊 Candidatos (tabla)",
        "📤 Exportar / Integrar",
    ])

    # =========================================================================
    # TAB 1 — COLA DE REVISIÓN
    # =========================================================================
    with tab_review:
        st.subheader("Cola de revisión — candidatos generados por Modelo A")

        if df_sessions.empty:
            st.warning(
                "No se encontró sesiones_candidatas.csv.\n\n"
                f"Ruta esperada: `{SESIONES_CANDIDATAS_CSV}`\n\n"
                "Ejecutar g06_inferencia_modelo_a.py y g07_build_sesiones_candidatas.py primero."
            )
        else:
            filter_mode = st.radio(
                "Mostrar:",
                ["🟠 Pendientes", "✅ Categorizadas", "📋 Todas"],
                horizontal=True,
                key="filter_radio",
            )

            if st.session_state["_prev_filter"] != filter_mode:
                st.session_state.filt_pos = 0
                st.session_state["_prev_filter"] = filter_mode

            if filter_mode == "🟠 Pendientes":
                filtered = df_sessions.index[~df_sessions["_annotated"]].tolist()
            elif filter_mode == "✅ Categorizadas":
                filtered = df_sessions.index[df_sessions["_annotated"]].tolist()
            else:
                filtered = df_sessions.index.tolist()

            n_filt = len(filtered)

            if n_filt == 0:
                if filter_mode == "🟠 Pendientes":
                    st.success("¡Todos los candidatos están categorizados! Ve a **Exportar / Integrar**.")
                else:
                    st.info("No hay candidatos en esta vista.")
            else:
                filt_pos = max(0, min(st.session_state.get("filt_pos", 0), n_filt - 1))

                nc1, nc2, nc3 = st.columns([2, 4, 2])
                with nc1:
                    if st.button("← Anterior", width="stretch", disabled=filt_pos == 0):
                        st.session_state.filt_pos = filt_pos - 1
                        st.rerun()
                with nc2:
                    st.markdown(
                        f"<div style='text-align:center;font-size:1.15rem;font-weight:700;padding:5px 0'>"
                        f"Candidato {filt_pos + 1} de {n_filt}</div>",
                        unsafe_allow_html=True,
                    )
                with nc3:
                    if st.button("Siguiente →", width="stretch", disabled=filt_pos == n_filt - 1):
                        st.session_state.filt_pos = filt_pos + 1
                        st.rerun()

                real_idx = filtered[filt_pos]
                ses = df_sessions.iloc[real_idx]

                is_ann = ses["_annotated"]
                ann_cat = ses["_ann_category"]
                inicio_ts, fin_ts = ses["inicio"], ses["fin"]

                if is_ann:
                    st.success(f"✅ Ya categorizada como: **{ann_cat}**")
                else:
                    st.info("⏳ Pendiente de categorización")

                mc1, mc2, mc3, mc4 = st.columns(4)
                with mc1:
                    st.metric("prob_activo (max)", f"{ses.get('prob_activo_max', 0):.2f}")
                with mc2:
                    st.metric("Duración", f"{ses['duracion_min']:.1f} min")
                with mc3:
                    st.metric("Δ peso", f"{ses['consumido_g']:.0f} g")
                with mc4:
                    st.metric("Período", ses.get("periodo", "?"))

                st.caption(
                    f"🕐 `{inicio_ts.strftime('%Y-%m-%d %H:%M:%S UTC')}`"
                    f"  ->  `{fin_ts.strftime('%Y-%m-%d %H:%M:%S UTC')}`"
                )

                if df_r.empty:
                    st.warning("Sin lecturas unificadas — ejecutar g04_resample_30s.py primero.")
                else:
                    fig_ses = build_session_figure(df_r, inicio_ts, fin_ts, df_new, buffer_min=5)
                    st.plotly_chart(fig_ses, width="stretch", key=f"ses_chart_{real_idx}")

                st.markdown("---")
                st.subheader("¿Qué ves realmente en esta sesión?")

                default_idx = SESSION_CATEGORIES.index(ann_cat) if is_ann and ann_cat in SESSION_CATEGORIES else 0
                cat_labels = [SESSION_CAT_LABELS[c] for c in SESSION_CATEGORIES]

                with st.form(f"form_rev_{real_idx}", clear_on_submit=False):
                    sel_label = st.radio("Categoría:", cat_labels, index=default_idx, horizontal=True)
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
                        save_btn = st.form_submit_button("💾 Guardar y avanzar", type="primary", width="stretch")
                    with btn2:
                        skip_btn = st.form_submit_button("⏭️ Saltar sin anotar", width="stretch")

                    if save_btn:
                        adj_inicio = pd.Timestamp(f"{adj_sd}T{adj_st.strftime('%H:%M:%S')}+00:00")
                        adj_fin = pd.Timestamp(f"{adj_ed}T{adj_et.strftime('%H:%M:%S')}+00:00")
                        save_session_annotation(adj_inicio, adj_fin, sel_cat, ev_notes)
                        st.success(
                            f"✅ **{sel_cat}** guardado "
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
        st.subheader("Vista Global — Abril–Junio 2026 unificado")
        st.caption("Línea de peso completa con candidatos y anotaciones nuevas superpuestas.")

        if df_r.empty:
            st.warning("No hay lecturas unificadas disponibles.")
        else:
            resample_opt = st.selectbox(
                "Resolución", ["1 min", "5 min (recomendado)", "30 min", "Sin resamplear (lento)"], index=1,
            )
            resample_rule = {
                "1 min": "1min", "5 min (recomendado)": "5min",
                "30 min": "30min", "Sin resamplear (lento)": None,
            }[resample_opt]
            fig = build_figure(df_r, df_sessions, df_new, resample_rule)
            st.plotly_chart(fig, width="stretch", key="global_chart")

    # =========================================================================
    # TAB 3 — AGREGAR EVENTO (avanzado)
    # =========================================================================
    with tab_add:
        st.subheader("Registrar evento manualmente")
        st.markdown(
            "Inserta un evento exacto en un timestamp específico, fuera de la cola de candidatos. "
            "Para anotar candidatos, usa la pestaña **Revisar Candidatos**."
        )

        if df_r.empty:
            st.warning("Sin lecturas unificadas disponibles.")
        else:
            d_min, d_max = df_r["ts"].min().date(), df_r["ts"].max().date()

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
                submitted = st.form_submit_button("Guardar evento", type="primary", width="stretch")
                if submitted:
                    ts_str = f"{ev_date}T{ev_time.strftime('%H:%M:%S')}+00:00"
                    save_annotation(ts_str, ev_category, ev_notes)
                    st.success(f"Guardado: **{ev_category}** @ {ts_str}")
                    st.cache_data.clear()
                    st.rerun()

    # =========================================================================
    # TAB 4 — MIS ANOTACIONES
    # =========================================================================
    with tab_annots:
        st.subheader(f"Anotaciones Gamma guardadas ({len(df_new)})")
        if df_new.empty:
            st.info("No hay anotaciones todavía. Usa **Revisar Candidatos** para empezar.")
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
    # TAB 5 — CANDIDATOS (TABLA)
    # =========================================================================
    with tab_table:
        st.subheader(f"Sesiones candidatas — {n_total} generadas por Modelo A")
        if not df_sessions.empty:
            filter_ann = st.selectbox("Estado:", ["Todas", "Pendientes", "Categorizadas"], key="tab_filter_ann")
            df_t = df_sessions.copy()
            if filter_ann == "Pendientes":
                df_t = df_t[~df_t["_annotated"]]
            elif filter_ann == "Categorizadas":
                df_t = df_t[df_t["_annotated"]]

            df_tv = df_t[["inicio", "fin", "duracion_min", "consumido_g", "prob_activo_max", "periodo", "_annotated", "_ann_category"]].copy()
            df_tv["inicio"] = df_tv["inicio"].dt.strftime("%Y-%m-%d %H:%M")
            df_tv["fin"] = df_tv["fin"].dt.strftime("%H:%M")
            df_tv["estado"] = df_tv.apply(
                lambda r: f"✅ {r['_ann_category']}" if r["_annotated"] else "⏳ pendiente", axis=1
            )
            df_tv = df_tv.drop(columns=["_annotated", "_ann_category"])
            df_tv.columns = ["Inicio (UTC)", "Fin", "Duración (min)", "Δ peso (g)", "prob_activo", "Período", "Estado"]
            st.dataframe(df_tv, width="stretch", height=500)

    # =========================================================================
    # TAB 6 — EXPORTAR / INTEGRAR
    # =========================================================================
    with tab_export:
        st.subheader("Estado de las anotaciones")

        ec1, ec2, ec3 = st.columns(3)
        with ec1:
            st.metric("Candidatos anotados", f"{n_annotated} / {n_total}")
        with ec2:
            st.metric("Servido", f"{n_servido} / {MIN_SERVIDO_SESSIONS}")
        with ec3:
            st.metric("Eventos en new_annotations_gamma.csv", len(df_new))

        if df_new.empty:
            st.info("No hay anotaciones para exportar aún. Usa **Revisar Candidatos** para empezar.")
        else:
            st.success(f"{len(df_new)} eventos guardados en {ANNOT_FILE}")
            csv_bytes = df_new.to_csv(index=False).encode("utf-8")
            st.download_button(
                "⬇️ Descargar new_annotations_gamma.csv",
                data=csv_bytes,
                file_name="new_annotations_gamma.csv",
                mime="text/csv",
                type="primary",
            )

        st.markdown("---")
        st.subheader("Siguiente paso — Fase 1 Gamma")
        st.markdown(f"""
Las anotaciones ya se guardan directamente en su ubicación final:
`{ANNOT_FILE}`

Cuando tengas **≥{MIN_SERVIDO_SESSIONS} sesiones de servido** y los demás candidatos
revisados, corre:
        """)
        st.code(
            f"""cd "{GAMMA_ROOT / 'fase_1_extraccion' / 'scripts'}"
python g09_build_sessions_labeled.py   # construye sessions_labeled.parquet + cross-check Alpha
python g10_quality_report.py           # checkpoint final + distribucion_clases_gamma.txt""",
            language="bash",
        )

        st.markdown("---")
        st.subheader("Buscar peso en un momento específico")
        ts_look = st.text_input("Timestamp (YYYY-MM-DD HH:MM:SS, UTC)", placeholder="2026-05-25 14:30:00")
        if ts_look and not df_r.empty:
            try:
                tq = pd.Timestamp(ts_look, tz="UTC")
                ri = (df_r["ts"] - tq).abs().idxmin()
                st.metric("Peso", f"{df_r.at[ri, 'weight_grams']:.1f} g")
                st.caption(f"ts exacto: {df_r.at[ri, 'ts']}")
            except Exception as e:
                st.error(f"Inválido: {e}")


if __name__ == "__main__":
    main()
