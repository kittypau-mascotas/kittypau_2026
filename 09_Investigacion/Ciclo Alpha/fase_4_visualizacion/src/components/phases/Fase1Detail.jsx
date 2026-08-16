import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLOR = 'var(--c1)'

const QUALITY = {
  readings:  96807,
  range:     '2026-04-08 → 2026-04-27',
  clockInvalid: '48,396 (50.0%)',
  cadenceMed:   '14.6 s',
  cadenceMean:  '17.0 s',
  gapsMax:      '177,441 s (~49 h)',
  gaps5min:     9,
  nanWeight:    '0.09%',
  nanBattery:   '100% (hardware)',
}

const LABELS = [
  { category: 'inicio_alimentacion',  count: 81 },
  { category: 'termino_alimentacion', count: 81 },
  { category: 'inicio_servido',       count: 14 },
  { category: 'termino_servido',      count: 14 },
  { category: 'kpcl_con_plato',       count: 5  },
  { category: 'kpcl_sin_plato',       count: 4  },
  { category: 'tare_con_plato',       count: 3  },
]

const SCRIPTS = [
  { name: '01_setup_env.py',     desc: 'Verifica credenciales y conectividad con Supabase' },
  { name: '02_get_device_uuid.py', desc: 'Obtiene el UUID de KPCL0034 → device_uuid.txt' },
  { name: '03_extract_readings.py', desc: 'Descarga todas las lecturas → readings_raw.parquet' },
  { name: '04_extract_events.py',  desc: 'Descarga eventos manual_bowl_category → events_labeled.parquet' },
  { name: '05_build_sessions.py',  desc: 'Reconstruye pares inicio_*/termino_* → sessions_labeled.parquet' },
  { name: '06_quality_report.py',  desc: 'Valida calidad del dataset → quality_report.txt' },
  { name: '_supabase_helpers.py',  desc: 'Módulo compartido: auth, paginación, retry' },
]

const OUTPUTS = [
  { name: 'readings_raw.parquet',     desc: 'Serie temporal de peso (96,807 filas)', size: '~12 MB' },
  { name: 'events_labeled.parquet',   desc: 'Eventos manuales etiquetados (202 filas)', size: '~50 KB' },
  { name: 'sessions_labeled.parquet', desc: 'Sesiones cerradas con duración (95 filas)', size: '~10 KB' },
  { name: 'quality_report.txt',       desc: 'Reporte de calidad del dataset', size: '~1 KB' },
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

export function Fase1Detail() {
  const catColors = {
    inicio_alimentacion: 'var(--green)',
    termino_alimentacion: 'var(--green)',
    inicio_servido: 'var(--orange)',
    termino_servido: 'var(--orange)',
    kpcl_con_plato: 'var(--blue)',
    kpcl_sin_plato: 'var(--blue)',
    tare_con_plato: 'var(--sub)',
  }

  return (
    <div>
      {/* Hero */}
      <div className="detail-hero" style={{ '--phase-color': COLOR }}>
        <div>
          <div className="detail-phase-num">FASE 01</div>
          <div className="detail-title">Extracción de datos</div>
          <div className="detail-subtitle">
            Descarga lecturas de peso, eventos manuales y sesiones reconstruidas desde Supabase
            (tabla <code>public.readings</code> + <code>public.audit_events</code>)
            y los exporta como artefactos parquet para las fases siguientes.
          </div>
        </div>
        <div>
          <div className="detail-big-num" style={{ color: COLOR }}>96,807</div>
          <div className="detail-big-label">lecturas totales</div>
        </div>
      </div>

      {/* Stats clave */}
      <div className="detail-grid-3">
        {[
          { l: 'Rango temporal',   v: '49 días',    d: '2026-04-08 → 2026-04-27' },
          { l: 'Clock inválido',   v: '50.0%',       d: '48,396 lecturas usan ingested_at' },
          { l: 'Cadencia mediana', v: '14.6 s',      d: 'Entre muestras consecutivas' },
          { l: 'Gaps > 5 min',     v: '9',           d: 'Gap máximo: ~49 horas' },
          { l: 'Eventos manuales', v: '202',         d: 'event_type = manual_bowl_category' },
          { l: 'Sesiones',         v: '95',          d: '81 alimentación · 14 servido' },
        ].map(s => (
          <div className="stat-card" key={s.l}>
            <div className="stat-lbl">{s.l}</div>
            <div className="stat-val" style={{ color: COLOR }}>{s.v}</div>
            <div className="stat-desc">{s.d}</div>
          </div>
        ))}
      </div>

      {/* Flujo entrada → salida */}
      <div className="sec-label"><span className="sec-label-num">01</span> Flujo de datos</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="io-flow">
          <div className="io-col">
            <div className="io-item">
              <div className="io-item-label">Entrada</div>
              <div className="io-item-val">public.readings</div>
              <div className="io-item-sub">96,807 lecturas de peso + sensores</div>
            </div>
            <div className="io-item">
              <div className="io-item-label">Entrada</div>
              <div className="io-item-val">public.audit_events</div>
              <div className="io-item-sub">202 eventos manual_bowl_category</div>
            </div>
            <div className="io-item">
              <div className="io-item-label">Entrada</div>
              <div className="io-item-val">public.devices</div>
              <div className="io-item-sub">UUID + plate_weight_grams de KPCL0034</div>
            </div>
          </div>
          <div className="io-arrow">→</div>
          <div className="io-col">
            {OUTPUTS.map(o => (
              <div className="io-item" key={o.name}>
                <div className="io-item-label">Salida · {o.size}</div>
                <div className="io-item-val" style={{ color: COLOR }}>{o.name}</div>
                <div className="io-item-sub">{o.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts: etiquetas */}
      <div className="sec-label"><span className="sec-label-num">02</span> Distribución de etiquetas</div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Eventos por categoría</div>
            <span className="card-source">events_labeled.parquet</span>
          </div>
          <div className="card-hint">202 eventos · pares inicio_* / termino_*</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={LABELS} layout="vertical"
                margin={{ top: 6, right: 30, left: 160, bottom: 6 }}>
                <CartesianGrid stroke="var(--grid)" horizontal={false} />
                <XAxis type="number"
                  tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }} />
                <YAxis type="category" dataKey="category" width={155}
                  tick={{ fill: 'var(--sub)', fontSize: 11, fontFamily: 'var(--mono)' }} />
                <Tooltip {...tooltipStyle}
                  formatter={(v) => [`${v} eventos`]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {LABELS.map((entry) => (
                    <Cell key={entry.category} fill={catColors[entry.category] ?? 'var(--muted)'}
                      fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Reporte de calidad</div>
            <span className="card-source">quality_report.txt</span>
          </div>
          <div className="card-hint">Métricas de calidad del dataset extraído</div>
          <table className="data-table">
            <tbody>
              {[
                ['Total lecturas',     QUALITY.readings.toLocaleString()],
                ['Rango temporal',     QUALITY.range],
                ['clock_invalid=True', QUALITY.clockInvalid],
                ['Cadencia mediana',   QUALITY.cadenceMed],
                ['Cadencia media',     QUALITY.cadenceMean],
                ['Gaps > 5 min',       `${QUALITY.gaps5min} gaps`],
                ['Gap máximo',         QUALITY.gapsMax],
                ['NaN weight_grams',   QUALITY.nanWeight],
                ['NaN battery_level',  QUALITY.nanBattery],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{k}</td>
                  <td style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sesiones */}
      <div className="sec-label"><span className="sec-label-num">03</span> Sesiones reconstruidas</div>
      <div className="grid-2">
        {[
          { type: 'alimentacion', n: 81, dur_med: '473 s (~7.9 min)', dur_max: '2,100 s (~35 min)', color: 'var(--green)' },
          { type: 'servido',      n: 14, dur_med: '167 s (~2.8 min)', dur_max: '510 s (~8.5 min)',  color: 'var(--orange)' },
        ].map(s => (
          <div className="stat-card" key={s.type}
            style={{ borderLeft: `3px solid ${s.color}` }}>
            <div className="stat-lbl" style={{ color: s.color }}>{s.type}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.n}</div>
            <div className="stat-desc" style={{ marginTop: 8 }}>
              <div>Duración media: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{s.dur_med}</span></div>
              <div>Duración máxima: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{s.dur_max}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Scripts */}
      <div className="sec-label"><span className="sec-label-num">04</span> Scripts del pipeline</div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">fase_1_extraccion/scripts/</div>
          <span className="card-source">Python 3.11</span>
        </div>
        <div className="card-hint">Ejecutar en orden: 01 → 06</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SCRIPTS.map((s, i) => (
            <div key={s.name} className="feature-row">
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, color: COLOR,
                minWidth: 22, opacity: .7,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="feature-name">{s.name}</span>
              <span className="feature-desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nota clock_invalid */}
      <div className="card" style={{ background: 'rgba(96,165,250,.05)', borderColor: 'rgba(96,165,250,.2)' }}>
        <div className="card-title" style={{ color: 'var(--c2)', marginBottom: 8 }}>
          ℹ Resolución de timestamp (clock_invalid)
        </div>
        <p style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.7 }}>
          El reloj interno del KPCL puede desincronizarse cuando el device pierde energía sin acceso a NTP.
          Cuando <code>clock_invalid = True</code>, el timestamp confiable es <code>ingested_at</code>
          (momento en que el bridge recibió el paquete), <em>no</em> <code>recorded_at</code>.
          El pipeline aplica este fallback automáticamente en el 50% de las lecturas.
        </p>
      </div>
    </div>
  )
}
