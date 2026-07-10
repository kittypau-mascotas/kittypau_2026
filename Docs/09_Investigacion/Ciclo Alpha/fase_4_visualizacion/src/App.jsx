import { useState }             from 'react'
import { useResearchData }      from './hooks/useResearchData'
import { PipelineDiagram }      from './components/PipelineDiagram'
import { WeightChart }          from './components/WeightChart'
import { KPICards }             from './components/KPICards'
import { DailyConsumption }     from './components/DailyConsumption'
import { SessionHistogram }     from './components/SessionHistogram'
import { MLMetrics }            from './components/MLMetrics'
import { SessionTable }         from './components/SessionTable'
import { Fase1Detail }          from './components/phases/Fase1Detail'
import { Fase2Detail }          from './components/phases/Fase2Detail'
import { Fase3Detail }          from './components/phases/Fase3Detail'
import { Annotator }            from './components/Annotator'
import { SESSION_COLORS, PALETTE } from './utils/constants'

// ── Adaptadores de datos ───────────────────────────────────────────────────────

function adaptReadings(raw) {
  if (!raw?.timestamps_ms?.length) return []
  return raw.timestamps_ms.map((ms, i) => ({ ts: new Date(ms), weight: raw.weight_grams[i] }))
}
function adaptSessions(raw) {
  return (raw || []).map(s => ({
    ...s,
    start_at:     s.start_at ? new Date(s.start_at) : null,
    end_at:       s.end_at   ? new Date(s.end_at)   : null,
    duration_min: s.duration_min ?? (s.duration_sec ? s.duration_sec / 60 : 0),
  }))
}
function adaptEvents(raw) {
  return (raw || []).map(e => ({ ts: e.ts ? new Date(e.ts) : null, category: e.category, weight: e.weight }))
    .filter(e => e.ts)
}
function adaptKpis(raw) {
  if (!raw) return null
  return {
    totalAlim:    raw.total_alim     ?? 0,
    totalServ:    raw.total_serv     ?? 0,
    totalHidr:    raw.total_hidr     ?? 0,
    totalConsumed: raw.total_consumed_g ?? 0,
    totalServed:  raw.total_served_g  ?? 0,
    avgDuration:  raw.avg_duration_min ?? 0,
    avgRate:      raw.avg_rate_g_per_min ?? 0,
    aprovPct:     raw.aprovechamiento_pct ?? null,
    sesPerDay:    raw.ses_per_day    ?? 0,
    totalReadings: raw.n_readings    ?? 0,
  }
}
function adaptMeta(raw) {
  if (!raw) return null
  return {
    totalRows:   raw.n_original ?? 0,
    chartPoints: raw.n_chart    ?? 0,
    firstTs:     raw.first_ts   ? new Date(raw.first_ts) : null,
    lastTs:      raw.last_ts    ? new Date(raw.last_ts)  : null,
  }
}

// ── Pantallas de estado ────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p className="loading-text">Cargando datos del pipeline…</p>
      <p className="loading-text" style={{ opacity: .5, fontSize: 11 }}>
        Leyendo public/data/*.json generados por prepare_data.py
      </p>
    </div>
  )
}

function SetupScreen() {
  return (
    <div className="error-screen">
      <p className="error-text">
        <strong>⚙ Datos no encontrados</strong><br /><br />
        Ejecuta el script de preparación antes de iniciar el servidor:<br /><br />
        <code style={{
          display: 'block', padding: '10px 14px',
          background: 'var(--bg)', borderRadius: 6, marginTop: 8,
          fontFamily: 'var(--mono)', fontSize: 12,
        }}>
          python prepare_data.py<br />npm run dev
        </code>
        <br />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          prepare_data.py lee los artefactos de Fase 1 (parquets) y Fase 3 (feature importance)
          y genera los JSON en public/data/ que esta visualización consume.
        </span>
      </p>
    </div>
  )
}

// ── Header compartido ─────────────────────────────────────────────────────────

function AppHeader({ onBack, onAnnotator, view }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">K4</div>
        <div>
          <div className="topbar-title">KPCL0034 · Kittypau Research Pipeline</div>
          <div className="topbar-sub">
            food_bowl · Bandida · Pipeline supervisado de detección de sesiones
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <span className="badge g dot">alimentación</span>
        <span className="badge o dot">servido</span>
        <span className="badge b dot">hidratación</span>
        <span className="badge p">LightGBM 4.3.0</span>
        <span className="badge a">Exp 03 ★</span>
        {view !== 'main' && (
          <button className="detail-back" style={{ margin: 0 }} onClick={onBack}>
            ← Volver al dashboard
          </button>
        )}
        {view === 'main' && onAnnotator && (
          <button
            className="detail-back"
            style={{ margin: 0, borderColor: 'rgba(63,185,80,0.4)', color: '#3fb950' }}
            onClick={onAnnotator}
          >
            ✏ Anotador Exp 09
          </button>
        )}
      </div>
    </div>
  )
}

// ── Phase detail wrapper ───────────────────────────────────────────────────────

const PHASE_META = {
  fase1: { color: 'var(--c1)', label: 'Fase 01 — Extracción' },
  fase2: { color: 'var(--c2)', label: 'Fase 02 — Dataset' },
  fase3: { color: 'var(--c3)', label: 'Fase 03 — Modelos' },
}

function PhaseDetailPage({ phaseId, onBack, data }) {
  const meta = PHASE_META[phaseId]
  return (
    <div className="page fade-in">
      <AppHeader view={phaseId} onBack={onBack} />
      <button className="detail-back" onClick={onBack}>← Volver al dashboard</button>

      {phaseId === 'fase1' && <Fase1Detail />}
      {phaseId === 'fase2' && <Fase2Detail datasetMeta={data.datasetMeta} />}
      {phaseId === 'fase3' && <Fase3Detail featureImportance={data.featureImportance} />}

      <footer className="app-footer">
        <span>Kittypau 2026 · {meta?.label}</span>
        <span>Pipeline: Fase 1 → Fase 2 → Fase 3 → <strong>Fase 4 (Visualización)</strong></span>
      </footer>
    </div>
  )
}

// ── Leyenda de sesiones ────────────────────────────────────────────────────────

function SessionLegend() {
  return (
    <div className="session-legend">
      {Object.entries(SESSION_COLORS).map(([type, c]) => (
        <div key={type} className="legend-item">
          <div className="legend-swatch"
            style={{ background: c.fill, borderColor: c.solid }} />
          <span style={{ fontSize: 12, color: c.solid }}>{c.label}</span>
        </div>
      ))}
      <div className="legend-item">
        <div className="legend-swatch"
          style={{ background: 'rgba(248,81,73,.25)', borderColor: PALETTE.red }} />
        <span style={{ fontSize: 12, color: PALETTE.textMuted }}>Curva de peso</span>
      </div>
    </div>
  )
}

// ── Dashboard principal (Fase 4) ──────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState('main')
  const raw = useResearchData()

  if (raw.loading) return <LoadingScreen />
  if (raw.error && !raw.sessions?.length && !raw.readings) return <SetupScreen />

  if (view === 'annotator') {
    return (
      <Annotator
        sessions={adaptSessions(raw.sessions)}
        events={adaptEvents(raw.events)}
        readings={adaptReadings(raw.readings)}
        onBack={() => setView('main')}
      />
    )
  }

  if (view !== 'main') {
    return <PhaseDetailPage phaseId={view} onBack={() => setView('main')} data={raw} />
  }

  const readings  = adaptReadings(raw.readings)
  const sessions  = adaptSessions(raw.sessions)
  const events    = adaptEvents(raw.events)
  const kpis      = adaptKpis(raw.kpis)
  const meta      = adaptMeta(raw.readings)

  return (
    <div className="page">
      <AppHeader view="main" onAnnotator={() => setView('annotator')} />

      {/* ── Diagrama del pipeline ──────────────────────────────────────── */}
      <PipelineDiagram onSelectPhase={setView} />

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="fade-up d1">
        <KPICards kpis={kpis} meta={meta} />
      </div>

      {/* ── Gráfico principal ─────────────────────────────────────────── */}
      <div className="sec-label fade-up d2">
        <span className="sec-label-num">01</span>
        Curva de peso y sesiones etiquetadas
      </div>
      <div className="card fade-up d2">
        <div className="card-header">
          <div>
            <div className="card-title">Peso bruto · KPCL0034 · food_bowl</div>
            <div className="card-hint">
              {meta?.chartPoints?.toLocaleString()} puntos (LTTB desde {meta?.totalRows?.toLocaleString()}) ·{' '}
              {sessions.length} sesiones · {events.length} eventos marcados ·{' '}
              Origen: <code>readings_raw.parquet</code> + <code>sessions_labeled.parquet</code>
            </div>
          </div>
          <span className="card-source">Fase 1 → Fase 4</span>
        </div>
        <SessionLegend />
        <WeightChart readings={readings} sessions={sessions} events={events} />
      </div>

      {/* ── Consumo diario + Histograma ───────────────────────────────── */}
      <div className="sec-label fade-up d3">
        <span className="sec-label-num">02</span>
        Análisis de consumo
      </div>
      <div className="grid-2 fade-up d3">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Consumo diario de alimentación</div>
            <span className="card-source">sessions_labeled</span>
          </div>
          <div className="card-hint">Gramos consumidos por día + media móvil 3 días</div>
          <DailyConsumption data={raw.daily} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Distribución de duración por tipo</div>
            <span className="card-source">sessions_labeled</span>
          </div>
          <div className="card-hint">Histograma de duración de sesiones en minutos</div>
          <SessionHistogram data={raw.histogram} />
        </div>
      </div>

      {/* ── Resultados ML ─────────────────────────────────────────────── */}
      <div className="sec-label fade-up d4">
        <span className="sec-label-num">03</span>
        Modelos ML · LightGBM · Fase 3 → Fase 4
      </div>
      <div className="fade-up d4">
        <MLMetrics featureImportance={raw.featureImportance} datasetMeta={raw.datasetMeta} />
      </div>

      {/* ── Tabla de sesiones ─────────────────────────────────────────── */}
      <div className="sec-label fade-up d5">
        <span className="sec-label-num">04</span>
        Sesiones reconstruidas
      </div>
      <div className="card fade-up d5">
        <div className="card-header">
          <div className="card-title">Todas las sesiones etiquetadas</div>
          <span className="card-source">sessions_labeled.parquet</span>
        </div>
        <div className="card-hint">
          Pares inicio_*/termino_* · Ordenable · Filtrable por tipo
        </div>
        <SessionTable sessions={sessions} />
      </div>

      <footer className="app-footer">
        <span>KPCL0034 · Kittypau 2026 · Fase 4 Visualización</span>
        <span>
          Fase 1 (extracción) → Fase 2 (dataset) → Fase 3 (modelos) →{' '}
          <strong style={{ color: 'var(--c4)' }}>Fase 4 (visualización)</strong>
        </span>
      </footer>
    </div>
  )
}
