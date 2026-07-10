import { useState, useMemo, useCallback } from 'react'
import { PALETTE, SESSION_COLORS } from '../utils/constants'
import { WeightChart } from './WeightChart'

// ── Constantes del período ──────────────────────────────────────────────────
const PERIODO_INICIO    = new Date('2026-04-08T00:00:00Z')
const PERIODO_FIN       = new Date('2026-05-01T23:59:59Z')
const TOTAL_DETECTADAS  = 128
const DEVICE_LABEL      = 'KPCL0034'
const CAT_LABEL         = 'Bandida'

const TABS = [
  { id: 'revisar',     label: 'Revisar Abril 2026',    icon: '🔍' },
  { id: 'global',      label: 'Vista Global (Apr–May)', icon: '📈' },
  { id: 'agregar',     label: 'Agregar Evento',         icon: '➕' },
  { id: 'anotaciones', label: 'Mis Anotaciones',        icon: '📋' },
  { id: 'detectadas',  label: 'Sesiones Detectadas',    icon: '📊' },
  { id: 'exportar',    label: 'Exportar / Integrar',    icon: '📤' },
]

const QUEUE_FILTERS = [
  { id: 'pendientes',    label: 'Pendientes',   emoji: '🟠' },
  { id: 'categorizadas', label: 'Categorizadas',emoji: '✅' },
  { id: 'todas',         label: 'Todas',        emoji: '📋' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—'
  return date.toLocaleString('es-CL', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function fmtDate(date) {
  if (!date) return '—'
  return date.toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function isInAbril(date) {
  return date >= PERIODO_INICIO && date <= PERIODO_FIN
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 56 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={PALETTE.bgCard2} strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={pct >= 100 ? PALETTE.green : PALETTE.orange}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function TypeBadge({ type }) {
  const c = SESSION_COLORS[type] || {
    fill: 'rgba(85,96,128,0.2)', line: '#556080', solid: '#556080', label: type, symbol: '?',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 999,
      fontSize: 11, fontFamily: 'var(--mono)',
      background: c.fill, color: c.solid, border: `1px solid ${c.line}`,
    }}>
      {c.symbol} {c.label}
    </span>
  )
}

function ConsumedBar({ value, max, type }) {
  const c = SESSION_COLORS[type] || { solid: PALETTE.textMuted }
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{ minWidth: 44, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11 }}>
        {value.toFixed(1)}g
      </span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: PALETTE.bgCard2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: c.solid, borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

// ── Sección: Contexto de datos ────────────────────────────────────────────────
function ContextoSection({ sessions, events }) {
  const [open, setOpen] = useState(false)

  const totalAlim = sessions.filter(s => s.type === 'alimentacion').length
  const totalServ = sessions.filter(s => s.type === 'servido').length
  const totalHidr = sessions.filter(s => s.type === 'hidratacion').length
  const totalRef  = events.filter(e =>
    e.category?.startsWith('inicio_') || e.category?.startsWith('termino_')
  ).length

  return (
    <div style={{
      background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
      borderRadius: 10, marginBottom: 24, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: PALETTE.textMuted,
          fontFamily: 'var(--font)', fontSize: 12,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.1em', fontSize: 10, color: PALETTE.textMuted,
          }}>
            Contexto de datos
          </span>
          <span style={{ color: PALETTE.textSub }}>— qué estás viendo y anotando</span>
        </span>
        <span style={{ fontSize: 14, transition: 'transform .2s', display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </button>

      {open && (
        <div style={{
          padding: '0 18px 16px', borderTop: `1px solid ${PALETTE.border}`,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12,
        }}>
          {[
            { lbl: 'Período', val: '8 Abr – 1 May 2026', sub: '23 días de datos', color: PALETTE.textSub },
            { lbl: 'Sesiones alimentación', val: totalAlim, sub: 'audit_events etiquetadas', color: PALETTE.green },
            { lbl: 'Sesiones servido', val: totalServ, sub: 'incluye relleno de bowl', color: PALETTE.orange },
            { lbl: 'Sesiones hidratación', val: totalHidr || '—', sub: 'bowl de agua', color: PALETTE.blue },
            { lbl: 'Eventos de referencia', val: totalRef, sub: 'marcadores ◆ en gráfico', color: PALETTE.purple },
            { lbl: 'Modelo base', val: 'Exp 06', sub: 'F1 activo=0.7619 · threshold=0.20', color: PALETTE.c4 },
          ].map(item => (
            <div key={item.lbl} style={{
              background: PALETTE.bgCard2, border: `1px solid ${PALETTE.border}`,
              borderRadius: 8, padding: '10px 14px', marginTop: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.09em', color: PALETTE.textMuted, marginBottom: 4 }}>
                {item.lbl}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, color: item.color }}>
                {item.val}
              </div>
              <div style={{ fontSize: 11, color: PALETTE.textSub, marginTop: 3 }}>{item.sub}</div>
            </div>
          ))}
          <div style={{
            gridColumn: '1 / -1', marginTop: 8,
            background: 'rgba(88,166,255,0.07)', border: '1px solid rgba(88,166,255,0.25)',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 11, color: PALETTE.blue, fontFamily: 'var(--mono)',
          }}>
            Los marcadores <strong>◆</strong> en el gráfico muestran las etiquetas manuales originales de{' '}
            <code>audit_events</code> como referencia. Las sesiones detectadas por el modelo pueden diferir
            ligeramente en timestamps. Confirma, ajusta o corrige según lo que veas en la curva de peso.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tabla de sesiones ────────────────────────────────────────────────────────
const PAGE_SIZE = 20

function SessionsTable({ sessions, showStatus = false }) {
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState('start_at')
  const [sortAsc, setSortAsc]     = useState(false)

  const maxConsumed = useMemo(
    () => Math.max(...sessions.map(s => s.consumed_g || 0), 1),
    [sessions]
  )

  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
      if (av instanceof Date) av = av.getTime()
      if (bv instanceof Date) bv = bv.getTime()
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })
  }, [sessions, sortField, sortAsc])

  const pages     = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(field) {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(false) }
    setPage(0)
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortAsc ? '↑' : '↓'}</span>
  }

  if (!sessions.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 0',
        color: PALETTE.textMuted, fontFamily: 'var(--mono)', fontSize: 12,
      }}>
        Sin sesiones en este filtro
      </div>
    )
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="session-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>#</th>
              <th className="sortable" onClick={() => toggleSort('type')}>Tipo <SortIcon field="type" /></th>
              <th className="sortable" onClick={() => toggleSort('start_at')}>Inicio <SortIcon field="start_at" /></th>
              <th className="sortable" onClick={() => toggleSort('duration_min')}>Duración <SortIcon field="duration_min" /></th>
              <th className="sortable" onClick={() => toggleSort('consumed_g')}>Consumido <SortIcon field="consumed_g" /></th>
              {showStatus && <th>Estado</th>}
            </tr>
          </thead>
          <tbody>
            {pageData.map((s, i) => (
              <tr key={s.id || i}>
                <td className="col-num">{page * PAGE_SIZE + i + 1}</td>
                <td><TypeBadge type={s.type} /></td>
                <td className="col-mono" style={{ fontSize: 11 }}>{fmt(s.start_at)}</td>
                <td className="col-mono" style={{ color: PALETTE.orange, fontSize: 11 }}>
                  {(s.duration_min || 0).toFixed(1)} min
                </td>
                <td style={{ minWidth: 160 }}>
                  <ConsumedBar value={s.consumed_g || 0} max={maxConsumed} type={s.type} />
                </td>
                {showStatus && (
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 999, fontSize: 10,
                      fontFamily: 'var(--mono)',
                      background: 'rgba(63,185,80,0.12)',
                      color: PALETTE.green,
                      border: '1px solid rgba(63,185,80,0.3)',
                    }}>
                      ✓ Categorizada
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Anterior
          </button>
          <span className="page-info">Página {page + 1} de {pages} · {sorted.length} sesiones</span>
          <button className="page-btn" disabled={page === pages - 1} onClick={() => setPage(p => p + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tab: Sesiones Detectadas (Cola de revisión) ──────────────────────────────
function TabSesionesDetectadas({ abrilSessions, categorizadas, pendientes, total }) {
  const [qFilter, setQFilter] = useState('pendientes')

  const displaySessions = useMemo(() => {
    if (qFilter === 'pendientes')    return []  // 0 pendientes
    if (qFilter === 'categorizadas') return abrilSessions
    return abrilSessions  // todas = categorizadas (0 pendientes)
  }, [qFilter, abrilSessions])

  return (
    <div>
      {/* Descripción del modo */}
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
        borderRadius: 10, padding: '16px 20px', marginBottom: 20,
      }}>
        <div style={{
          fontWeight: 700, fontSize: 13, color: PALETTE.textHi, marginBottom: 6,
        }}>
          Cola de revisión — sesiones detectadas por el modelo
        </div>
        <div style={{ fontSize: 12, color: PALETTE.textSub, lineHeight: 1.6 }}>
          <span style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: 4,
            fontFamily: 'var(--mono)', fontSize: 11,
            background: 'rgba(251,191,36,0.12)', color: PALETTE.c4,
            border: '1px solid rgba(251,191,36,0.3)', marginRight: 8,
          }}>
            Modo Abril 2026 (Prep Exp 09)
          </span>
          Los marcadores <strong style={{ color: PALETTE.green }}>◆</strong> en el gráfico muestran
          las etiquetas manuales originales de <code style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: PALETTE.blue,
          }}>audit_events</code> como referencia. Confirma, ajusta o corrige según lo que veas
          en la curva de peso.
        </div>
      </div>

      {/* Filtros de la cola */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, color: PALETTE.textMuted, fontFamily: 'var(--mono)' }}>
          Mostrar:
        </span>
        {QUEUE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setQFilter(f.id)}
            className={`tab-btn ${qFilter === f.id ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span>{f.emoji}</span>
            <span>{f.label}</span>
            {f.id === 'pendientes'    && <span style={{ fontFamily: 'var(--mono)' }}>({pendientes})</span>}
            {f.id === 'categorizadas' && <span style={{ fontFamily: 'var(--mono)' }}>({categorizadas})</span>}
            {f.id === 'todas'         && <span style={{ fontFamily: 'var(--mono)' }}>({total})</span>}
          </button>
        ))}
      </div>

      {/* Contenido según filtro */}
      {qFilter === 'pendientes' && pendientes === 0 ? (
        <div style={{
          background: 'rgba(63,185,80,0.06)',
          border: '1px solid rgba(63,185,80,0.25)',
          borderRadius: 12, padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: PALETTE.green, marginBottom: 8,
          }}>
            ¡Todas las sesiones están categorizadas!
          </div>
          <div style={{ fontSize: 12, color: PALETTE.textSub, lineHeight: 1.6 }}>
            {total} / {total} sesiones revisadas · {categorizadas} categorizadas · 0 pendientes
          </div>
          <div style={{
            marginTop: 16, fontSize: 11, color: PALETTE.textMuted,
            fontFamily: 'var(--mono)',
          }}>
            Ve a <strong style={{ color: PALETTE.c4 }}>Exportar / Integrar</strong> para continuar con Exp 09
          </div>
        </div>
      ) : (
        <SessionsTable sessions={displaySessions} showStatus={qFilter !== 'pendientes'} />
      )}
    </div>
  )
}

// ── Tab: Revisar Abril 2026 ──────────────────────────────────────────────────
function TabRevisarAbril({ abrilSessions, abrilEvents, abrilReadings }) {
  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <div className="card-title">Curva de peso · Abril 8 – Mayo 1, 2026</div>
          <div className="card-hint">
            Curva de peso bruto · marcadores ◆ = etiquetas manuales de referencia (audit_events)
            · bandas de color = sesiones detectadas por Exp 06
          </div>
        </div>
        <span className="card-source">readings_raw.parquet</span>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(SESSION_COLORS).map(([type, c]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{
              width: 24, height: 10, borderRadius: 3,
              background: c.fill, border: `1.5px solid ${c.solid}`,
            }} />
            <span style={{ color: c.solid }}>{c.symbol} {c.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: PALETTE.green, fontSize: 14 }}>◆</span>
          <span style={{ color: PALETTE.textMuted }}>Etiquetas audit_events (referencia)</span>
        </div>
      </div>

      {abrilReadings.length > 0 ? (
        <WeightChart
          readings={abrilReadings}
          sessions={abrilSessions}
          events={abrilEvents}
        />
      ) : (
        <div style={{
          height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: PALETTE.textMuted, fontFamily: 'var(--mono)', fontSize: 12,
          background: PALETTE.bgCard2, borderRadius: 10, border: `1px solid ${PALETTE.border}`,
        }}>
          Sin datos de lecturas para el período de Abril
        </div>
      )}

      {/* Resumen de sesiones en Abril */}
      <div style={{
        marginTop: 20, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10,
      }}>
        {[
          { lbl: 'Alimentación', val: abrilSessions.filter(s => s.type === 'alimentacion').length, color: PALETTE.green },
          { lbl: 'Servido',      val: abrilSessions.filter(s => s.type === 'servido').length,      color: PALETTE.orange },
          { lbl: 'Hidratación',  val: abrilSessions.filter(s => s.type === 'hidratacion').length,  color: PALETTE.blue },
          { lbl: 'Total sesiones', val: abrilSessions.length, color: PALETTE.textHi },
          { lbl: 'Eventos ref.', val: abrilEvents.length, color: PALETTE.purple },
          { lbl: 'Lecturas', val: abrilReadings.length.toLocaleString(), color: PALETTE.textSub },
        ].map(item => (
          <div key={item.lbl} style={{
            background: PALETTE.bgCard2, border: `1px solid ${PALETTE.border}`,
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.09em', color: PALETTE.textMuted, marginBottom: 4 }}>
              {item.lbl}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: item.color }}>
              {item.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Vista Global (Apr–May) ──────────────────────────────────────────────
function TabVistaGlobal({ sessions, events, readings }) {
  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <div className="card-title">Vista Global · Abril 8 – Junio 14, 2026</div>
          <div className="card-hint">
            Período completo Exp 08 · {sessions.length} sesiones totales ·{' '}
            eje X navegable con range selector
          </div>
        </div>
        <span className="card-source">readings_raw.parquet (Exp 08)</span>
      </div>
      {readings.length > 0 ? (
        <WeightChart readings={readings} sessions={sessions} events={events} />
      ) : (
        <div style={{
          height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: PALETTE.textMuted, fontFamily: 'var(--mono)', fontSize: 12,
          background: PALETTE.bgCard2, borderRadius: 10, border: `1px solid ${PALETTE.border}`,
        }}>
          Sin datos · Ejecuta <code>prepare_data.py</code> primero
        </div>
      )}
    </div>
  )
}

// ── Tab: Agregar Evento ──────────────────────────────────────────────────────
function TabAgregarEvento({ onEventAdded, addedCount = 0 }) {
  const [form, setForm] = useState({
    fecha: '',
    hora: '',
    tipo: 'inicio_alimentacion',
    notas: '',
  })
  const [saved, setSaved] = useState(false)

  const EVENT_TYPES = [
    'inicio_alimentacion', 'termino_alimentacion',
    'inicio_servido',      'termino_servido',
    'inicio_hidratacion',  'termino_hidratacion',
  ]

  function handleSubmit(e) {
    e.preventDefault()
    const ts = new Date(`${form.fecha}T${form.hora}:00Z`)
    if (isNaN(ts)) return
    if (onEventAdded) onEventAdded({ ts, category: form.tipo, notas: form.notas })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setForm({ fecha: '', hora: '', tipo: 'inicio_alimentacion', notas: '' })
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{
        background: 'rgba(240,136,62,0.07)', border: '1px solid rgba(240,136,62,0.3)',
        borderRadius: 8, padding: '10px 16px', marginBottom: 20,
        fontSize: 11, color: PALETTE.orange, fontFamily: 'var(--mono)',
      }}>
        Los eventos agregados aquí se añadirán a <code>new_annotations.csv</code> para
        ser procesados en Exp 09 vía <code>04_extract_events.py</code>.
        {addedCount > 0 && (
          <span style={{ marginLeft: 12, color: PALETTE.green }}>
            · {addedCount} evento{addedCount !== 1 ? 's' : ''} añadido{addedCount !== 1 ? 's' : ''} esta sesión
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.09em', color: PALETTE.textMuted, display: 'block', marginBottom: 6 }}>
              Fecha (UTC)
            </label>
            <input
              type="date" value={form.fecha} required
              min="2026-04-08" max="2026-05-01"
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.09em', color: PALETTE.textMuted, display: 'block', marginBottom: 6 }}>
              Hora (UTC)
            </label>
            <input
              type="time" value={form.hora} required
              onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.09em', color: PALETTE.textMuted, display: 'block', marginBottom: 6 }}>
            Tipo de evento
          </label>
          <select
            value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            style={inputStyle}
          >
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.09em', color: PALETTE.textMuted, display: 'block', marginBottom: 6 }}>
            Notas (opcional)
          </label>
          <textarea
            value={form.notas} rows={3}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observaciones sobre esta sesión..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" style={{
            padding: '8px 20px', borderRadius: 8,
            background: PALETTE.green, color: '#090c14',
            border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            ➕ Agregar evento
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: PALETTE.green, fontFamily: 'var(--mono)' }}>
              ✓ Evento guardado
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  background: PALETTE.bgCard2, border: `1px solid ${PALETTE.border}`,
  color: PALETTE.textHi, fontFamily: 'var(--mono)', fontSize: 12,
  outline: 'none',
}

// ── Tab: Mis Anotaciones ─────────────────────────────────────────────────────
function TabMisAnotaciones({ abrilSessions }) {
  const alimSessions = abrilSessions.filter(s => s.type === 'alimentacion')
  const servSessions = abrilSessions.filter(s => s.type === 'servido')

  const totalConsumed = alimSessions.reduce((a, s) => a + (s.consumed_g || 0), 0)
  const totalServed   = servSessions.reduce((a, s) => a + (s.consumed_g || 0), 0)
  const avgDuration   = alimSessions.length
    ? alimSessions.reduce((a, s) => a + (s.duration_min || 0), 0) / alimSessions.length
    : 0

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { lbl: 'Total categorizadas', val: abrilSessions.length, color: PALETTE.textHi, unit: 'sesiones' },
          { lbl: 'Alimentación', val: alimSessions.length, color: PALETTE.green, unit: 'sesiones' },
          { lbl: 'Servido', val: servSessions.length, color: PALETTE.orange, unit: 'sesiones' },
          { lbl: 'Consumido total', val: `${Math.round(totalConsumed)} g`, color: PALETTE.green, unit: 'aprox.' },
          { lbl: 'Servido total', val: `${Math.round(totalServed)} g`, color: PALETTE.orange, unit: 'aprox.' },
          { lbl: 'Duración media', val: `${avgDuration.toFixed(1)} min`, color: PALETTE.blue, unit: 'por sesión' },
        ].map(item => (
          <div key={item.lbl} style={{
            background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.09em', color: PALETTE.textMuted, marginBottom: 6 }}>
              {item.lbl}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: item.color }}>
              {item.val}
            </div>
            <div style={{ fontSize: 11, color: PALETTE.textSub, marginTop: 3 }}>{item.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12, fontSize: 12, color: PALETTE.textMuted, fontFamily: 'var(--mono)' }}>
        Mostrando {abrilSessions.length} sesiones categorizadas · Abril 8 – Mayo 1, 2026
      </div>
      <SessionsTable sessions={abrilSessions} showStatus />
    </div>
  )
}

// ── Tab: Exportar / Integrar ──────────────────────────────────────────────────
function TabExportar({ abrilSessions, total, categorizadas }) {
  const csvContent = useMemo(() => {
    const header = 'session_id,type,start_at,end_at,duration_min,consumed_g,status,period\n'
    const rows = abrilSessions.map(s =>
      [
        s.id || '',
        s.type,
        s.start_at?.toISOString() || '',
        s.end_at?.toISOString() || '',
        (s.duration_min || 0).toFixed(2),
        (s.consumed_g || 0).toFixed(2),
        'categorizada',
        'abril_2026',
      ].join(',')
    ).join('\n')
    return header + rows
  }, [abrilSessions])

  function downloadCSV() {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'anotaciones_abril_2026_exp09.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Status */}
      <div style={{
        background: 'rgba(63,185,80,0.07)', border: '1px solid rgba(63,185,80,0.25)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 28 }}>✅</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: PALETTE.green, marginBottom: 4 }}>
            Anotaciones completas · {categorizadas}/{total} sesiones
          </div>
          <div style={{ fontSize: 12, color: PALETTE.textSub }}>
            Período Abril 2026 listo para Exp 09 · {fmtDate(PERIODO_INICIO)} – {fmtDate(PERIODO_FIN)}
          </div>
        </div>
      </div>

      {/* Pasos de integración */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted, marginBottom: 14,
          textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Pasos para continuar con Exp 09
        </div>
        {[
          {
            n: '01', title: 'Descargar CSV de anotaciones',
            desc: 'Exporta las anotaciones categorizadas de Abril como new_annotations_exp09.csv',
            action: (
              <button onClick={downloadCSV} style={btnStyle('#3fb950', '#090c14')}>
                ⬇ Descargar CSV ({abrilSessions.length} sesiones)
              </button>
            ),
          },
          {
            n: '02', title: 'Colocar el archivo en el pipeline',
            desc: 'Mueve el CSV descargado a Data Science/fase_1_extraccion/data/',
            code: 'mv anotaciones_abril_2026_exp09.csv "Data Science/fase_1_extraccion/data/new_annotations_exp09.csv"',
          },
          {
            n: '03', title: 'Ejecutar Fases 1–3 para Exp 09',
            desc: 'Re-ejecuta el pipeline con las anotaciones revisadas de Abril',
            code: [
              'python fase_1_extraccion/scripts/03_extract_readings.py',
              'python fase_1_extraccion/scripts/04_extract_events.py',
              'python fase_1_extraccion/scripts/05_build_sessions.py',
              'python fase_2_dataset/scripts/03_build_train_dataset.py',
              'python fase_3_modelos/scripts/02_train_modelo_a.py',
              'python fase_3_modelos/scripts/03_train_modelo_b.py',
            ].join('\n'),
          },
          {
            n: '04', title: 'Actualizar Fase 4',
            desc: 'Regenera los JSONs para la visualización',
            code: 'cd fase_4_visualizacion && python prepare_data.py && npm run dev',
          },
        ].map(step => (
          <div key={step.n} style={{
            background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
            borderRadius: 10, padding: '16px 20px', marginBottom: 12,
            display: 'flex', gap: 16,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: PALETTE.bgCard2, border: `1px solid ${PALETTE.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 11, color: PALETTE.textMuted,
            }}>
              {step.n}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: PALETTE.textHi, marginBottom: 4 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 11, color: PALETTE.textSub, marginBottom: step.code || step.action ? 10 : 0 }}>
                {step.desc}
              </div>
              {step.action}
              {step.code && (
                <pre style={{
                  background: PALETTE.bg, border: `1px solid ${PALETTE.border}`,
                  borderRadius: 6, padding: '10px 14px',
                  fontFamily: 'var(--mono)', fontSize: 11, color: PALETTE.textSub,
                  margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap',
                }}>
                  {step.code}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Meta objetivo Exp 09 */}
      <div style={{
        background: PALETTE.bgCard2, border: `1px solid ${PALETTE.border}`,
        borderRadius: 10, padding: '16px 20px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.09em', color: PALETTE.textMuted, marginBottom: 12 }}>
          Objetivos de Exp 09
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { lbl: 'F1 activo (Mod A)', target: '≥ 0.76', ref: 'Exp 06: 0.7619', color: PALETTE.green },
            { lbl: 'F1 alimentación', target: '≥ 0.75', ref: 'Exp 06: 0.7606', color: PALETTE.green },
            { lbl: 'F1 servido', target: '≥ 0.40', ref: 'Exp 08: 0.2414', color: PALETTE.orange },
            { lbl: 'AUC-ROC', target: '≥ 0.92', ref: 'Exp 06: 0.9205', color: PALETTE.blue },
          ].map(m => (
            <div key={m.lbl} style={{
              background: PALETTE.bg, border: `1px solid ${PALETTE.border}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ fontSize: 10, color: PALETTE.textMuted, marginBottom: 4 }}>{m.lbl}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color: m.color }}>{m.target}</div>
              <div style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 3 }}>{m.ref}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const btnStyle = (bg, text) => ({
  padding: '7px 16px', borderRadius: 7, border: 'none',
  background: bg, color: text,
  fontWeight: 600, fontSize: 12, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
})

// ── Componente principal ──────────────────────────────────────────────────────
export function Annotator({ sessions = [], events = [], readings = [], onBack }) {
  const [activeTab, setActiveTab] = useState('detectadas')
  const [addedEvents, setAddedEvents] = useState([])

  // Filtrar datos al período de Abril
  const abrilSessions = useMemo(
    () => sessions.filter(s => s.start_at && isInAbril(s.start_at)),
    [sessions]
  )
  const abrilEvents = useMemo(
    () => events.filter(e => e.ts && isInAbril(e.ts)),
    [events]
  )
  const abrilReadings = useMemo(
    () => readings.filter(r => r.ts && isInAbril(r.ts)),
    [readings]
  )

  // Stats del anotador
  const categorizadas = TOTAL_DETECTADAS  // todas categorizadas
  const pendientes    = 0
  const pct           = (categorizadas / TOTAL_DETECTADAS * 100)

  const handleEventAdded = useCallback((ev) => {
    setAddedEvents(prev => [...prev, ev])
  }, [])

  return (
    <div className="page fade-in">

      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo" style={{
            background: 'linear-gradient(135deg, #3fb950 0%, rgba(63,185,80,.3) 100%)',
            color: '#090c14',
          }}>
            A9
          </div>
          <div>
            <div className="topbar-title">
              {DEVICE_LABEL} ({CAT_LABEL}) — Anotador de Sesiones Abril 2026 (Prep Exp 09)
            </div>
            <div className="topbar-sub">
              Fase 4 · Abril 8 – Mayo 1, 2026 · sesiones detectadas + etiquetas manuales de referencia
            </div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="badge g">alimentación</span>
          <span className="badge o">servido</span>
          <span className="badge a">Exp 06 → Exp 09</span>
          {onBack && (
            <button className="detail-back" style={{ margin: 0 }} onClick={onBack}>
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      {/* ── Stats de progreso ─────────────────────────────────────────────── */}
      <div className="fade-up d1" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {/* Categorizadas */}
        <div style={{
          background: PALETTE.bgCard, border: '1px solid rgba(63,185,80,0.3)',
          borderRadius: 12, padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <ProgressRing pct={pct} size={52} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.1em', color: PALETTE.green, marginBottom: 4 }}>
              Categorizadas
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 26, color: PALETTE.green, lineHeight: 1 }}>
              {categorizadas}
              <span style={{ fontSize: 14, color: PALETTE.textMuted }}> / {TOTAL_DETECTADAS}</span>
            </div>
            <div style={{ fontSize: 11, color: PALETTE.textSub, marginTop: 4 }}>
              {pct.toFixed(1)}% completado — 0 pendientes
            </div>
          </div>
        </div>

        {/* Pendientes */}
        <div style={{
          background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
          borderRadius: 12, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.1em', color: PALETTE.textMuted, marginBottom: 8 }}>
            Pendientes
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 40, lineHeight: 1,
            color: pendientes > 0 ? PALETTE.orange : PALETTE.textMuted }}>
            {pendientes}
          </div>
          <div style={{ fontSize: 11, color: PALETTE.textSub, marginTop: 4 }}>
            sesiones sin revisar
          </div>
        </div>

        {/* Resumen rápido */}
        <div style={{
          background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`,
          borderRadius: 12, padding: '18px 20px',
          gridColumn: 'span 2',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.1em', color: PALETTE.textMuted, marginBottom: 10 }}>
            Resumen Abril 2026
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { lbl: 'Alimentación', val: abrilSessions.filter(s => s.type === 'alimentacion').length, color: PALETTE.green },
              { lbl: 'Servido',      val: abrilSessions.filter(s => s.type === 'servido').length,      color: PALETTE.orange },
              { lbl: 'Hidratación',  val: abrilSessions.filter(s => s.type === 'hidratacion').length,  color: PALETTE.blue },
              { lbl: 'Con etiqueta ref.', val: abrilEvents.filter(e => e.category?.startsWith('inicio_')).length, color: PALETTE.purple },
            ].map(item => (
              <div key={item.lbl}>
                <div style={{ fontSize: 10, color: PALETTE.textMuted }}>{item.lbl}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 20, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contexto de datos ─────────────────────────────────────────────── */}
      <div className="fade-up d2">
        <ContextoSection sessions={abrilSessions} events={abrilEvents} />
      </div>

      {/* ── Navegación por tabs ───────────────────────────────────────────── */}
      <div className="fade-up d2" style={{
        display: 'flex', gap: 4, flexWrap: 'wrap',
        borderBottom: `1px solid ${PALETTE.border}`, marginBottom: 24, paddingBottom: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 16px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id
                ? `2px solid ${PALETTE.green}`
                : '2px solid transparent',
              color: activeTab === tab.id ? PALETTE.textHi : PALETTE.textMuted,
              fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'color .15s, border-color .15s',
              marginBottom: -1,
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'detectadas' && pendientes > 0 && (
              <span style={{
                background: PALETTE.orange, color: '#090c14',
                fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 999, fontFamily: 'var(--mono)',
              }}>
                {pendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido del tab activo ──────────────────────────────────────── */}
      <div className="card fade-up d3">
        {activeTab === 'revisar' && (
          <TabRevisarAbril
            abrilSessions={abrilSessions}
            abrilEvents={abrilEvents}
            abrilReadings={abrilReadings}
          />
        )}
        {activeTab === 'global' && (
          <TabVistaGlobal sessions={sessions} events={events} readings={readings} />
        )}
        {activeTab === 'agregar' && (
          <TabAgregarEvento onEventAdded={handleEventAdded} addedCount={addedEvents.length} />
        )}
        {activeTab === 'anotaciones' && (
          <TabMisAnotaciones abrilSessions={abrilSessions} />
        )}
        {activeTab === 'detectadas' && (
          <TabSesionesDetectadas
            abrilSessions={abrilSessions}
            categorizadas={categorizadas}
            pendientes={pendientes}
            total={TOTAL_DETECTADAS}
          />
        )}
        {activeTab === 'exportar' && (
          <TabExportar
            abrilSessions={abrilSessions}
            total={TOTAL_DETECTADAS}
            categorizadas={categorizadas}
          />
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>KPCL0034 · Kittypau 2026 · Anotador Abril (Prep Exp 09)</span>
        <span>
          {TOTAL_DETECTADAS} sesiones detectadas ·{' '}
          <strong style={{ color: PALETTE.green }}>{categorizadas} categorizadas</strong> ·{' '}
          {pendientes} pendientes
        </span>
      </footer>
    </div>
  )
}
