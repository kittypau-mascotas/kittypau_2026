import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { EXPERIMENTS, FEATURE_IMPORTANCE, PALETTE } from '../utils/constants'

const axisStyle = { fill: PALETTE.textMuted, fontSize: 11, fontFamily: "'DM Mono', monospace" }
const gridStyle = { stroke: PALETTE.grid, strokeWidth: 1 }
const tooltipStyle = {
  contentStyle: {
    background: PALETTE.bgCard2,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 6,
    color: PALETTE.text,
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
  },
}

// ── Evolución de 5 experimentos ───────────────────────────────────────────────
function ExperimentsChart() {
  const data = EXPERIMENTS.map(e => ({
    name:    `Exp ${e.id}`,
    f1_a:    +(e.f1_a  * 100).toFixed(1),
    auc_a:   +(e.auc_a * 100).toFixed(1),
    f1_b:    +(e.f1_b  * 100).toFixed(1),
    f1_alim: +(e.f1_alim * 100).toFixed(1),
    f1_serv: +(e.f1_serv * 100).toFixed(1),
  }))
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 60, left: 10, bottom: 10 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis domain={[0, 100]} tick={axisStyle} tickFormatter={v => `${v}%`}
            label={{ value: 'Métrica (%)', angle: -90, position: 'insideLeft', offset: 10,
              style: { fill: PALETTE.textMuted, fontSize: 11, fontFamily: "'DM Mono', monospace" } }} />
          <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v.toFixed(1)}%`, n]} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: PALETTE.textMuted }} />
          <ReferenceLine y={70} stroke={PALETTE.purple} strokeDasharray="4 3" strokeWidth={1}
            label={{ value: 'F1 activo ≥70%', position: 'right', fill: PALETTE.purple, fontSize: 9 }} />
          <ReferenceLine y={65} stroke={PALETTE.blue} strokeDasharray="4 3" strokeWidth={1}
            label={{ value: 'F1 alim ≥65%', position: 'right', fill: PALETTE.blue, fontSize: 9 }} />
          <ReferenceLine y={60} stroke={PALETTE.teal} strokeDasharray="4 3" strokeWidth={1}
            label={{ value: 'Macro F1 ≥60%', position: 'right', fill: PALETTE.teal, fontSize: 9 }} />
          <Line type="monotone" dataKey="f1_a"    name="F1 activo (Mod A)"  stroke={PALETTE.red}    strokeWidth={2.5}
            dot={{ r: 5, fill: PALETTE.red,    stroke: PALETTE.bg, strokeWidth: 2 }} activeDot={{ r: 7 }} />
          <Line type="monotone" dataKey="auc_a"   name="AUC-ROC (Mod A)"    stroke={PALETTE.orange} strokeWidth={2} strokeDasharray="5 3"
            dot={{ r: 4, fill: PALETTE.orange, stroke: PALETTE.bg, strokeWidth: 2 }} />
          <Line type="monotone" dataKey="f1_b"    name="Macro F1 (Mod B)"   stroke={PALETTE.green}  strokeWidth={2.5}
            dot={{ r: 5, fill: PALETTE.green,  stroke: PALETTE.bg, strokeWidth: 2 }} activeDot={{ r: 7 }} />
          <Line type="monotone" dataKey="f1_alim" name="F1 alimentación"    stroke={PALETTE.blue}   strokeWidth={2}
            dot={{ r: 4, fill: PALETTE.blue,   stroke: PALETTE.bg, strokeWidth: 2 }} />
          <Line type="monotone" dataKey="f1_serv" name="F1 servido"         stroke={PALETTE.purple} strokeWidth={2}
            dot={{ r: 4, fill: PALETTE.purple, stroke: PALETTE.bg, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Feature importance (datos reales de Fase 3, con fallback a hardcoded) ─────
function FeatureImportanceChart({ data }) {
  const maxImp = Math.max(...data.map(d => d.importance), 1)
  const normalized = data.slice(0, 12)
    .map(d => ({ ...d, norm: Math.round((d.importance / maxImp) * 100) }))
    .reverse()

  const descs = {
    rolling_std_5: 'Variabilidad inmediata', rolling_std_10: 'Variabilidad extendida',
    plateau_duration: 'Tiempo en plateau', hour_sin: 'Patrón horario (sin)',
    hour_cos: 'Patrón horario (cos)', weight_grams: 'Peso bruto',
    net_weight: 'Peso neto', rolling_mean_5: 'Media suavizada',
    delta_w_10: 'Delta 10 lecturas', delta_w: 'Delta inmediato',
    is_plateau: 'Flag plateau', clock_invalid: 'Flag reloj inválido',
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={normalized} layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}>
          <CartesianGrid {...gridStyle} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={axisStyle} />
          <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fontSize: 11 }} width={115} />
          <Tooltip {...tooltipStyle}
            formatter={(v, _, p) => [`Importancia: ${p.payload.importance?.toFixed?.(0) ?? p.payload.importance}`,
              descs[p.payload.name] ?? p.payload.name]} />
          <Bar dataKey="norm" name="Importancia relativa" radius={[0, 4, 4, 0]}>
            {normalized.map((_, idx) => (
              <Cell key={idx} fill={PALETTE.green} fillOpacity={0.55 + (idx / normalized.length) * 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Distribución de clases (Fase 2 → dataset_meta.json) ──────────────────────
function ClassDistributionChart({ datasetMeta }) {
  if (!datasetMeta?.class_distribution) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: PALETTE.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
      Sin datos (ejecutar prepare_data.py)
    </div>
  )

  const dist = datasetMeta.class_distribution
  const total = Object.values(dist).reduce((s, v) => s + v, 0)
  const data = Object.entries(dist).map(([cls, count]) => ({
    name: cls, count, pct: ((count / total) * 100).toFixed(2),
  }))
  const colorMap = {
    alimentacion: PALETTE.green, servido: PALETTE.orange,
    hidratacion: PALETTE.blue, reposo: PALETTE.textMuted,
  }
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid {...gridStyle} vertical={false} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} tickFormatter={v => v.toLocaleString()} />
          <Tooltip {...tooltipStyle}
            formatter={(v, n, p) => [`${v.toLocaleString()} (${p.payload.pct}%)`, 'Filas']} />
          <Bar dataKey="count" name="Filas" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={colorMap[entry.name] ?? PALETTE.blue} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Estado vs. Fase 4 ─────────────────────────────────────────────────────────
function StatusBadge({ met }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11,
      fontFamily: "'DM Mono', monospace",
      background: met ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
      color: met ? PALETTE.green : PALETTE.red,
      border: `1px solid ${met ? 'rgba(63,185,80,0.4)' : 'rgba(248,81,73,0.4)'}`,
    }}>
      {met ? '✓ OK' : '✗ Pendiente'}
    </span>
  )
}

function Fase4StatusTable() {
  const last = EXPERIMENTS[EXPERIMENTS.length - 1]
  const checks = [
    { label: 'F1 activo (Modelo A)',  current: last.f1_a,    threshold: 0.70 },
    { label: 'AUC-ROC (Modelo A)',    current: last.auc_a,   threshold: 0.85 },
    { label: 'Macro F1 (Modelo B)',   current: last.f1_b,    threshold: 0.60 },
    { label: 'F1 alimentación',       current: last.f1_alim, threshold: 0.65 },
  ]
  return (
    <table className="ml-table">
      <thead>
        <tr><th>Métrica</th><th>Actual</th><th>Umbral Fase 4</th><th>GAP</th><th>Estado</th></tr>
      </thead>
      <tbody>
        {checks.map(c => {
          const met = c.current >= c.threshold
          const gap = (c.current - c.threshold).toFixed(4)
          return (
            <tr key={c.label}>
              <td style={{ color: PALETTE.text }}>{c.label}</td>
              <td style={{ color: met ? PALETTE.green : PALETTE.red, fontFamily: "'DM Mono', monospace" }}>
                {c.current.toFixed(4)}
              </td>
              <td style={{ color: PALETTE.textMuted, fontFamily: "'DM Mono', monospace" }}>
                {c.threshold.toFixed(2)}
              </td>
              <td style={{ color: met ? PALETTE.green : PALETTE.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                {met ? `+${gap}` : gap}
              </td>
              <td><StatusBadge met={met} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Componente exportado ──────────────────────────────────────────────────────
export function MLMetrics({ featureImportance, datasetMeta }) {
  const fi_a = featureImportance?.modelo_a ?? FEATURE_IMPORTANCE
  const fi_b = featureImportance?.modelo_b ?? FEATURE_IMPORTANCE
  const hasFIFromFase3 = !!featureImportance?.modelo_a

  const tag = (label, color) => (
    <span style={{
      marginLeft: 8, fontSize: 10, color,
      fontFamily: "'DM Mono', monospace",
    }}>← {label}</span>
  )

  return (
    <div>
      <div className="ml-grid">
        <div className="chart-card">
          <h3 className="chart-subtitle">Evolución de métricas — 5 experimentos</h3>
          <p className="chart-hint">Líneas punteadas = umbrales Fase 4 · ★ Exp 03 mejor base actual</p>
          <ExperimentsChart />
        </div>
        <div className="chart-card">
          <h3 className="chart-subtitle">
            Features Modelo A (binario)
            {hasFIFromFase3 ? tag('Fase 3', PALETTE.green) : tag('hardcoded', PALETTE.textMuted)}
          </h3>
          <p className="chart-hint">Top 12 features · importancia relativa normalizada</p>
          <FeatureImportanceChart data={fi_a} />
        </div>
      </div>

      <div className="ml-grid">
        <div className="chart-card">
          <h3 className="chart-subtitle">
            Features Modelo B (multiclase)
            {hasFIFromFase3 ? tag('Fase 3', PALETTE.green) : tag('hardcoded', PALETTE.textMuted)}
          </h3>
          <p className="chart-hint">alimentacion / servido / reposo</p>
          <FeatureImportanceChart data={fi_b} />
        </div>
        <div className="chart-card">
          <h3 className="chart-subtitle">
            Distribución de clases {datasetMeta ? tag('Fase 2', PALETTE.blue) : ''}
          </h3>
          <p className="chart-hint">
            Train: {datasetMeta?.n_train?.toLocaleString() ?? '—'} ·
            Val: {datasetMeta?.n_val?.toLocaleString() ?? '—'} ·
            Test: {datasetMeta?.n_test?.toLocaleString() ?? '—'}
          </p>
          <ClassDistributionChart datasetMeta={datasetMeta} />
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 0 }}>
        <h3 className="chart-subtitle">Estado actual vs. umbrales de Fase 4</h3>
        <Fase4StatusTable />
      </div>
    </div>
  )
}
