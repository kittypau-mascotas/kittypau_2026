import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLOR = 'var(--c2)'

const FEATURES = [
  { name: 'weight_grams',    desc: 'Peso bruto del bowl',             rank_a: 5,  rank_b: 6,  active: true },
  { name: 'delta_w',         desc: 'Cambio inmediato entre lecturas', rank_a: 10, rank_b: 10, active: true },
  { name: 'delta_w_3',       desc: 'Delta a 3 lecturas (redundante)', rank_a: null, rank_b: null, active: false },
  { name: 'delta_w_10',      desc: 'Cambio acumulado en 10 lecturas', rank_a: 9,  rank_b: 9,  active: true },
  { name: 'rate_gs',         desc: 'Tasa de cambio g/s (redundante)', rank_a: null, rank_b: null, active: false },
  { name: 'rolling_std_5',   desc: 'Variabilidad inmediata (±5 pts)', rank_a: 8,  rank_b: 1,  active: true },
  { name: 'rolling_std_10',  desc: 'Variabilidad extendida (±10 pts)',rank_a: 1,  rank_b: 2,  active: true },
  { name: 'rolling_mean_5',  desc: 'Media suavizada (±5 pts)',        rank_a: 6,  rank_b: 8,  active: true },
  { name: 'net_weight',      desc: 'Peso neto del contenido',         rank_a: 7,  rank_b: 7,  active: true },
  { name: 'is_plateau',      desc: 'Flag estado estable',             rank_a: null, rank_b: null, active: true },
  { name: 'plateau_duration',desc: 'Tiempo en estado estable',        rank_a: 2,  rank_b: 3,  active: true },
  { name: 'hour_sin',        desc: 'Patrón horario cíclico (seno)',   rank_a: 4,  rank_b: 4,  active: true },
  { name: 'hour_cos',        desc: 'Patrón horario cíclico (coseno)', rank_a: 3,  rank_b: 5,  active: true },
  { name: 'clock_invalid',   desc: 'Flag de reloj inválido',          rank_a: null, rank_b: null, active: true },
]

const SPLITS = [
  { split: 'Train',    rows: 30377, start: '2026-04-08', end: '2026-04-20', pct: 70 },
  { split: 'Val',      rows: 6510,  start: '2026-04-20', end: '2026-04-22', pct: 15 },
  { split: 'Test ★',  rows: 6510,  start: '2026-04-22', end: '2026-04-25', pct: 15 },
]

const CLASSES = [
  { name: 'reposo',       count: 42186, weight: 0.341, color: 'var(--muted)' },
  { name: 'alimentacion', count: 1139,  weight: 15.699, color: 'var(--green)' },
  { name: 'servido',      count: 72,    weight: 241.087, color: 'var(--orange)' },
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

const SCRIPTS = [
  { name: '01_build_labels.py',       desc: 'Asigna etiqueta a cada lectura desde las sesiones de Fase 1' },
  { name: '02_build_features.py',     desc: 'Calcula 14 features derivadas (deltas, rolling stats, encoding cíclico)' },
  { name: '03_build_train_dataset.py',desc: 'Split temporal 70/15/15; calcula pesos por clase; guarda parquets' },
  { name: '04_dataset_report.py',     desc: 'Genera reporte de distribución de clases y validación del split' },
  { name: '_phase2_utils.py',         desc: 'Utilidades compartidas de feature engineering' },
]

export function Fase2Detail({ datasetMeta }) {
  const total = CLASSES.reduce((s, c) => s + c.count, 0)

  return (
    <div>
      {/* Hero */}
      <div className="detail-hero" style={{ '--phase-color': COLOR }}>
        <div>
          <div className="detail-phase-num">FASE 02</div>
          <div className="detail-title">Construcción del dataset supervisado</div>
          <div className="detail-subtitle">
            Ingeniería de features sobre las lecturas de Fase 1, asignación de etiquetas
            desde las sesiones reconstruidas, y split temporal cronológico en train / val / test.
            Los datos de test quedan reservados para Fase 4 (evaluación final).
          </div>
        </div>
        <div>
          <div className="detail-big-num" style={{ color: COLOR }}>43,397</div>
          <div className="detail-big-label">filas en dataset total</div>
        </div>
      </div>

      {/* Stats */}
      <div className="detail-grid-3">
        {[
          { l: 'Features activas', v: '12', d: '14 originales − 2 eliminadas (delta_w_3, rate_gs)' },
          { l: 'Filas train',      v: '30,377', d: 'Apr 08 → Apr 20' },
          { l: 'Filas val',        v: '6,510',  d: 'Apr 20 → Apr 22' },
          { l: 'Filas test',       v: '6,510',  d: 'Apr 22 → Apr 25 · Reservado para Fase 4' },
          { l: 'Clases',           v: '3',      d: 'alimentacion · servido · reposo' },
          { l: 'Desbalance max',   v: '241×',   d: 'servido tiene 241× más peso que reposo' },
        ].map(s => (
          <div className="stat-card" key={s.l}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{ color: COLOR }}>{s.v}</div>
            <div className="stat-desc">{s.d}</div>
          </div>
        ))}
      </div>

      {/* Flujo */}
      <div className="sec-label"><span className="sec-label-num">01</span> Flujo de datos</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="io-flow">
          <div className="io-col">
            {[
              ['readings_raw.parquet',   'Fase 1 · 96,807 lecturas de peso'],
              ['events_labeled.parquet', 'Fase 1 · 202 eventos etiquetados'],
              ['sessions_labeled.parquet','Fase 1 · 95 sesiones reconstruidas'],
            ].map(([v, d]) => (
              <div className="io-item" key={v}>
                <div className="io-item-label">Entrada</div>
                <div className="io-item-val">{v}</div>
                <div className="io-item-sub">{d}</div>
              </div>
            ))}
          </div>
          <div className="io-arrow">→</div>
          <div className="io-col">
            {[
              ['X_train.parquet', '30,377 filas · 12 features'],
              ['X_val.parquet',   '6,510 filas · validación'],
              ['X_test.parquet',  '6,510 filas · reservado Fase 4'],
              ['y_train/val/test.parquet', 'Etiquetas por split'],
              ['dataset_meta.json', 'Metadatos: clases, fechas, pesos'],
              ['label_encoder.json','alimentacion→0, servido→1, reposo→2'],
            ].map(([v, d]) => (
              <div className="io-item" key={v}>
                <div className="io-item-label">Salida</div>
                <div className="io-item-val" style={{ color: COLOR }}>{v}</div>
                <div className="io-item-sub">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Distribución de clases + splits */}
      <div className="sec-label"><span className="sec-label-num">02</span> Distribución de clases y splits</div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Distribución de clases</div>
            <span className="card-source">dataset total</span>
          </div>
          <div className="card-hint">Desbalance extremo: servido representa solo el 0.17% del dataset</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={CLASSES} margin={{ top: 6, right: 20, left: 10, bottom: 6 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="name"
                  tick={{ fill: 'var(--sub)', fontSize: 11, fontFamily: 'var(--mono)' }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }}
                  tickFormatter={v => v.toLocaleString()} />
                <Tooltip {...tooltipStyle}
                  formatter={(v, n, p) => [
                    `${v.toLocaleString()} (${((v/total)*100).toFixed(2)}%)`,
                    'Filas',
                  ]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {CLASSES.map(c => (
                    <Cell key={c.name} fill={c.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Clase</th><th>Filas</th><th>%</th><th>Peso</th></tr></thead>
            <tbody>
              {CLASSES.map(c => (
                <tr key={c.name}>
                  <td style={{ color: c.color, fontFamily: 'var(--mono)' }}>{c.name}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                    {c.count.toLocaleString()}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--sub)' }}>
                    {((c.count / total) * 100).toFixed(2)}%
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--sub)' }}>
                    {c.weight.toFixed(3)}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Split temporal</div>
            <span className="card-source">cronológico 70/15/15</span>
          </div>
          <div className="card-hint">
            El test set <strong>no se usa en Fase 3</strong> — reservado para evaluación final en Fase 4
          </div>
          {SPLITS.map(s => (
            <div key={s.split} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-hi)' }}>
                  {s.split}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: COLOR }}>
                  {s.rows.toLocaleString()} filas
                </span>
              </div>
              <div style={{
                height: 8, background: 'var(--bg-alt)', borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${s.pct}%`,
                  background: s.split.includes('Test') ? 'rgba(96,165,250,.35)' : COLOR,
                  borderRadius: 4,
                  border: s.split.includes('Test') ? '1px dashed rgba(96,165,250,.5)' : 'none',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                {s.start} → {s.end} · {s.pct}%
              </div>
            </div>
          ))}
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(96,165,250,.06)',
            border: '1px solid rgba(96,165,250,.2)',
            borderRadius: 8,
            fontSize: 11, color: 'var(--c2)', fontFamily: 'var(--mono)',
          }}>
            ★ X_test y y_test nunca se cargan en Fase 3. Fase 4 los usa para evaluación honesta.
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="sec-label"><span className="sec-label-num">03</span> Features del dataset</div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">14 features calculadas → 12 activas tras Experimento 03</div>
          <span className="card-source">Fase 2 + ablación Exp 03</span>
        </div>
        <div className="card-hint">
          Rank A = posición en top-10 de Modelo A · Rank B = posición en top-10 de Modelo B
        </div>
        <div className="feature-list" style={{ '--phase-color': COLOR }}>
          {FEATURES.map(f => (
            <div
              key={f.name}
              className={`feature-row ${f.active ? '' : 'feature-removed'}`}
              style={{ '--phase-color': f.active ? COLOR : 'var(--muted)' }}
            >
              <div style={{ minWidth: 14 }}>
                {f.active
                  ? <span style={{ color: COLOR, fontSize: 10 }}>●</span>
                  : <span style={{ color: 'var(--muted)', fontSize: 10 }}>✕</span>
                }
              </div>
              <span className="feature-name">{f.name}</span>
              <span className="feature-desc">{f.desc}</span>
              <span className="feature-badge">
                {f.rank_a ? `A:#${f.rank_a}` : '—'}</span>
              <span className="feature-badge">
                {f.rank_b ? `B:#${f.rank_b}` : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scripts */}
      <div className="sec-label"><span className="sec-label-num">04</span> Scripts</div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">fase_2_dataset/scripts/</div>
          <span className="card-source">Python 3.11 · pandas · pyarrow</span>
        </div>
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
