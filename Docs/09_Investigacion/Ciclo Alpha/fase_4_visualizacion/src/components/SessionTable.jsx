import { useState } from 'react'
import { SESSION_COLORS, PALETTE } from '../utils/constants'

const PAGE_SIZE = 25

function fmt(date) {
  if (!date) return '—'
  return date.toLocaleString('es-CL', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function TypeBadge({ type }) {
  const c = SESSION_COLORS[type] || SESSION_COLORS.alimentacion
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 999,
      fontSize: 11, fontFamily: "'DM Mono', monospace",
      background: c.fill,
      color: c.solid,
      border: `1px solid ${c.line}`,
    }}>
      {c.symbol} {c.label}
    </span>
  )
}

function MiniBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%',
    }}>
      <span style={{ minWidth: 42, textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>
        {value.toFixed(1)}g
      </span>
      <div style={{
        flex: 1, height: 7, borderRadius: 4,
        background: PALETTE.bgCard2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 4,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

export function SessionTable({ sessions }) {
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('all')
  const [sortField, setSortField] = useState('start_at')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = sessions.filter(s => filter === 'all' || s.type === filter)
  const sorted   = [...filtered].sort((a, b) => {
    let av = a[sortField], bv = b[sortField]
    if (av instanceof Date) av = av.getTime()
    if (bv instanceof Date) bv = bv.getTime()
    return sortAsc ? av - bv : bv - av
  })

  const maxConsumed = Math.max(...sorted.map(s => s.consumed_g), 1)
  const pages       = Math.ceil(sorted.length / PAGE_SIZE)
  const page_data   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(field) {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(false) }
    setPage(0)
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortAsc ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Filtro y total */}
      <div className="table-controls">
        <div className="tab-group">
          {['all', 'alimentacion', 'servido', 'hidratacion'].map(t => (
            <button
              key={t}
              className={`tab-btn ${filter === t ? 'active' : ''}`}
              onClick={() => { setFilter(t); setPage(0) }}
            >
              {t === 'all'
                ? `Todas (${sessions.length})`
                : `${SESSION_COLORS[t]?.label} (${sessions.filter(s => s.type === t).length})`
              }
            </button>
          ))}
        </div>
        <span className="table-count">
          {sorted.length} sesión{sorted.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="table-wrapper">
        <table className="session-table">
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => toggleSort('type')} className="sortable">
                Tipo <SortIcon field="type" />
              </th>
              <th onClick={() => toggleSort('start_at')} className="sortable">
                Inicio <SortIcon field="start_at" />
              </th>
              <th onClick={() => toggleSort('duration_min')} className="sortable">
                Duración <SortIcon field="duration_min" />
              </th>
              <th onClick={() => toggleSort('consumed_g')} className="sortable">
                Consumido <SortIcon field="consumed_g" />
              </th>
            </tr>
          </thead>
          <tbody>
            {page_data.map((s, i) => {
              const c = SESSION_COLORS[s.type] || SESSION_COLORS.alimentacion
              return (
                <tr key={s.id}>
                  <td className="col-num">
                    {page * PAGE_SIZE + i + 1}
                  </td>
                  <td><TypeBadge type={s.type} /></td>
                  <td className="col-mono">
                    {fmt(s.start_at)}
                  </td>
                  <td className="col-mono" style={{ color: PALETTE.orange }}>
                    {s.duration_min.toFixed(1)} min
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <MiniBar value={s.consumed_g} max={maxConsumed} color={c.solid} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            ← Anterior
          </button>
          <span className="page-info">
            Página {page + 1} de {pages}
          </span>
          <button
            className="page-btn"
            disabled={page === pages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
