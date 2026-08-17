import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { EXPERIMENTS, FEATURE_IMPORTANCE } from '../../utils/constants'

const COLOR = 'var(--c3)'

const MODELS = [
  {
    id: 'A',
    title: 'Modelo A — Binario',
    desc: 'Clasifica cada lectura en activo (alimentacion + servido) vs reposo.',
    clases: ['activo', 'reposo'],
    best: { f1: 0.5693, auc: 0.8802, threshold: 0.22 },
    target: { f1: 0.70, auc: 0.85 },
  },
  {
    id: 'B',
    title: 'Modelo B — Multiclase',
    desc: 'Clasifica cada lectura en alimentacion / servido / reposo. Más granular.',
    clases: ['alimentacion', 'servido', 'reposo'],
    best: { macro_f1: 0.6712, f1_alim: 0.5256, f1_serv: 0.5000 },
    target: { macro_f1: 0.60, f1_alim: 0.65 },
  },
]

const SCRIPTS = [
  { name: '01_prepare_datasets.py',desc: 'Lee parquets de Fase 2; colapsa alimentacion+servido→activo para Modelo A' },
  { name: '02_train_modelo_a.py',  desc: 'LightGBM binario con scale_pos_weight + threshold sweep' },
  { name: '03_train_modelo_b.py',  desc: 'LightGBM multiclase con pesos por clase + duplicación servido ×3' },
  { name: '04_training_report.py', desc: 'Compara ambos modelos en validación; nunca toca el test set' },
  { name: '_phase3_utils.py',      desc: 'Utilidades compartidas: métricas, visualización, guardado' },
]

const tooltipStyle = {
  contentStyle: {
    background: 'var(--card2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: 12,
    fontFamily: 'var(--mono)',
  },
}

export function Fase3Detail({ featureImportance }) {
  const fi_b = featureImportance?.modelo_b ?? FEATURE_IMPORTANCE
  const maxImp = Math.max(...fi_b.map(d => d.importance), 1)
  const fi_norm = fi_b.slice(0, 10)
    .map(d => ({ ...d, norm: Math.round((d.importance / maxImp) * 100) }))
    .reverse()

  const expData = EXPERIMENTS.map(e => ({
    name:    `Exp ${e.id}`,
    f1_a:    +(e.f1_a  * 100).toFixed(1),
    auc_a:   +(e.auc_a * 100).toFixed(1),
    f1_b:    +(e.f1_b  * 100).toFixed(1),
    f1_alim: +(e.f1_alim * 100).toFixed(1),
    f1_serv: +(e.f1_serv * 100).toFixed(1),
    best:    !!e.best,
  }))

  return (
    <div>
      {/* Hero */}
      <div className="detail-hero" style={{ '--phase-color': COLOR }}>
        <div>
          <div className="detail-phase-num">FASE 03</div>
          <div className="detail-title">Entrenamiento de modelos</div>
          <div className="detail-subtitle">
            Entrena dos variantes de LightGBM sobre el dataset supervisado de Fase 2.
            5 experimentos iterativos documentados. El mejor resultado hasta ahora es el
            Experimento 03 para Modelo B (Macro F1 = 0.6712).
          </div>
        </div>
        <div>
          <div className="detail-big-num" style={{ color: COLOR }}>5</div>
          <div className="detail-big-label">experimentos documentados</div>
        </div>
      </div>

      {/* Stats */}
      <div className="detail-grid-3">
        {[
          { l: 'Framework',         v: 'LightGBM',  d: 'versión 4.3.0 · Python 3.11' },
          { l: 'Mejor Modelo A',    v: 'F1: 0.569', d: 'AUC-ROC: 0.880 · Exp 04/05' },
          { l: 'Mejor Modelo B',    v: 'F1: 0.671', d: 'Macro F1 · Exp 03 ★' },
          { l: 'F1 alimentación',   v: '0.549',     d: 'Exp 04/05 · objetivo ≥ 0.65' },
          { l: 'F1 servido',        v: '0.500',     d: 'Exp 03 · mejor conseguido' },
          { l: 'Threshold óptimo',  v: '0.22',      d: 'Modelo A · Exp 04/05' },
        ].map(s => (
          <div className="stat-card" key={s.l}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{ color: COLOR }}>{s.v}</div>
            <div className="stat-desc">{s.d}</div>
          </div>
        ))}
      </div>

      {/* Arquitectura de modelos */}
      <div className="sec-label"><span className="sec-label-num">01</span> Arquitectura</div>
      <div className="grid-2">
        {MODELS.map(m => (
          <div className="card" key={m.id}>
            <div className="card-title">{m.title}</div>
            <p style={{ fontSize: 13, color: 'var(--sub)', margin: '8px 0 14px', lineHeight: 1.6 }}>
              {m.desc}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {m.clases.map(c => (
                <span key={c} style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  padding: '3px 10px', borderRadius: 4,
                  background: 'var(--card3)', color: 'var(--sub)',
                  border: '1px solid var(--border)',
                }}>
                  {c}
                </span>
              ))}
            </div>
            <div className="data-table">
              <table style={{ width: '100%' }}>
                <thead><tr><th>Métrica</th><th>Actual</th><th>Umbral F4</th><th>Estado</th></tr></thead>
                <tbody>
                  {m.id === 'A' ? (
                    <>
                      <tr>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>F1 activo</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{m.best.f1.toFixed(4)}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{m.target.f1.toFixed(2)}</td>
                        <td><span className="status-badge status-fail">✗ Pendiente</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>AUC-ROC</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{m.best.auc.toFixed(4)}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{m.target.auc.toFixed(2)}</td>
                        <td><span className="status-badge status-ok">✓ OK</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>Threshold</td>
                        <td style={{ fontFamily: 'var(--mono)', color: COLOR }}>{m.best.threshold}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>0.5 (default)</td>
                        <td style={{ fontSize: 11, color: 'var(--sub)', fontFamily: 'var(--mono)' }}>tuning</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>Macro F1</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{m.best.macro_f1.toFixed(4)}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{m.target.macro_f1.toFixed(2)}</td>
                        <td><span className="status-badge status-ok">✓ OK</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>F1 alimentación</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{m.best.f1_alim.toFixed(4)}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{m.target.f1_alim.toFixed(2)}</td>
                        <td><span className="status-badge status-fail">✗ Pendiente</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>F1 servido</td>
                        <td style={{ fontFamily: 'var(--mono)', color: COLOR }}>{m.best.f1_serv.toFixed(4)}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>—</td>
                        <td style={{ fontSize: 11, color: 'var(--sub)', fontFamily: 'var(--mono)' }}>referencia</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Evolución de experimentos */}
      <div className="sec-label"><span className="sec-label-num">02</span> Evolución de métricas</div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">5 experimentos — progresión de F1 y AUC</div>
          <span className="card-source">Exp 03 = mejor base ★</span>
        </div>
        <div className="card-hint">
          Líneas punteadas = umbrales de Fase 4 · Todos los valores sobre el set de validación
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={expData} margin={{ top: 16, right: 60, left: 10, bottom: 10 }}>
              <CartesianGrid stroke="var(--grid)" />
              <XAxis dataKey="name"
                tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }} />
              <YAxis domain={[0, 100]}
                tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }}
                tickFormatter={v => `${v}%`} />
              <Tooltip {...tooltipStyle}
                formatter={(v, n) => [`${v.toFixed(1)}%`, n]} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)' }} />
              <ReferenceLine y={70} stroke="var(--c3)" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: '≥70%', position: 'right', fill: 'var(--c3)', fontSize: 9 }} />
              <ReferenceLine y={65} stroke="var(--c2)" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: '≥65%', position: 'right', fill: 'var(--c2)', fontSize: 9 }} />
              <ReferenceLine y={60} stroke="var(--teal)" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: '≥60%', position: 'right', fill: 'var(--teal)', fontSize: 9 }} />
              <Line type="monotone" dataKey="f1_a" name="F1 activo (A)" stroke="var(--red)" strokeWidth={2.5}
                dot={{ r: 5, fill: 'var(--red)', stroke: 'var(--bg)', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="auc_a" name="AUC-ROC (A)" stroke="var(--orange)" strokeWidth={2} strokeDasharray="5 3"
                dot={{ r: 4, fill: 'var(--orange)', stroke: 'var(--bg)', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="f1_b" name="Macro F1 (B)" stroke="var(--c3)" strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  return payload.best
                    ? <polygon key={payload.name} points={`${cx},${cy-8} ${cx+7},${cy+5} ${cx-7},${cy+5}`}
                        fill="var(--c3)" stroke="var(--bg)" strokeWidth={2} />
                    : <circle key={payload.name} cx={cx} cy={cy} r={5} fill="var(--c3)" stroke="var(--bg)" strokeWidth={2} />
                }}
              />
              <Line type="monotone" dataKey="f1_alim" name="F1 alimentación" stroke="var(--c2)" strokeWidth={2}
                dot={{ r: 4, fill: 'var(--c2)', stroke: 'var(--bg)', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="f1_serv" name="F1 servido" stroke="var(--purple)" strokeWidth={2}
                dot={{ r: 4, fill: 'var(--purple)', stroke: 'var(--bg)', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Experimentos detalle */}
      <div className="sec-label"><span className="sec-label-num">03</span> Detalle por experimento</div>
      <div className="card">
        <table className="data-table ml-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Experimento</th><th>F1 activo</th><th>AUC-ROC</th>
              <th>Macro F1</th><th>F1 alim</th><th>F1 serv</th><th>Cambio clave</th>
            </tr>
          </thead>
          <tbody>
            {EXPERIMENTS.map(e => (
              <tr key={e.id} style={{ background: e.best ? 'rgba(192,132,252,.05)' : 'transparent' }}>
                <td style={{ color: e.best ? 'var(--c3)' : 'var(--text)', fontWeight: e.best ? 600 : 400 }}>
                  Exp {e.id} {e.best ? '★' : ''}
                </td>
                <td style={{ color: e.f1_a >= 0.55 ? 'var(--green)' : 'var(--red)' }}>
                  {e.f1_a.toFixed(4)}
                </td>
                <td style={{ color: e.auc_a >= 0.85 ? 'var(--green)' : 'var(--sub)' }}>
                  {e.auc_a.toFixed(4)}
                </td>
                <td style={{ color: e.f1_b >= 0.60 ? 'var(--green)' : 'var(--sub)' }}>
                  {e.f1_b.toFixed(4)}
                </td>
                <td style={{ color: e.f1_alim >= 0.65 ? 'var(--green)' : 'var(--sub)' }}>
                  {e.f1_alim.toFixed(4)}
                </td>
                <td style={{ color: 'var(--sub)' }}>{e.f1_serv.toFixed(4)}</td>
                <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 220 }}>{e.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature importance */}
      <div className="sec-label"><span className="sec-label-num">04</span> Importancia de features (Modelo B)</div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Top 10 features — Modelo B multiclase</div>
          <span className="card-source">feature_importance.csv · Fase 3</span>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={fi_norm} layout="vertical"
              margin={{ top: 6, right: 30, left: 130, bottom: 6 }}>
              <CartesianGrid stroke="var(--grid)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]}
                tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }} />
              <YAxis type="category" dataKey="name" width={125}
                tick={{ fill: 'var(--sub)', fontSize: 11, fontFamily: 'var(--mono)' }} />
              <Tooltip {...tooltipStyle}
                formatter={(v, _, p) => [
                  `Importancia: ${p.payload.importance?.toFixed?.(0) ?? p.payload.importance}`,
                  p.payload.name,
                ]} />
              <Bar dataKey="norm" radius={[0, 4, 4, 0]}>
                {fi_norm.map((_, idx) => (
                  <Cell key={idx} fill="var(--c3)"
                    fillOpacity={0.45 + (idx / fi_norm.length) * 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scripts */}
      <div className="sec-label"><span className="sec-label-num">05</span> Scripts</div>
      <div className="card">
        <div className="feature-list">
          {SCRIPTS.map((s, i) => (
            <div key={s.name} className="feature-row">
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: COLOR, minWidth: 22, opacity: .7 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="feature-name">{s.name}</span>
              <span className="feature-desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
