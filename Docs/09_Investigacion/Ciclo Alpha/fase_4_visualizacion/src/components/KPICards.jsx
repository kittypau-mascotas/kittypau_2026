export function KPICards({ kpis, meta }) {
  if (!kpis) return null

  const dateRange = meta?.firstTs && meta?.lastTs
    ? `${meta.firstTs.toLocaleDateString('es-CL')} → ${meta.lastTs.toLocaleDateString('es-CL')}`
    : null

  const cards = [
    { lbl: 'Sesiones alim.', val: kpis.totalAlim,                 unit: 'alimentación',    color: 'var(--green)',  sub: null },
    { lbl: 'Sesiones servido',val: kpis.totalServ,                unit: 'servido',          color: 'var(--orange)', sub: null },
    { lbl: 'Total consumido', val: kpis.totalConsumed.toLocaleString(), unit: 'gramos totales', color: 'var(--green)',
      sub: `~${Math.round(kpis.totalConsumed / Math.max(1, kpis.totalAlim))} g/sesión` },
    { lbl: 'Duración media',  val: kpis.avgDuration.toFixed(1),   unit: 'min / sesión',     color: 'var(--orange)', sub: null },
    { lbl: 'Ritmo medio',     val: kpis.avgRate.toFixed(2),       unit: 'g / min',           color: 'var(--c2)',     sub: null },
    { lbl: 'Sesiones / día',  val: kpis.sesPerDay.toFixed(1),     unit: 'promedio',          color: 'var(--purple)', sub: null },
    { lbl: 'Aprovechamiento', val: kpis.aprovPct != null ? `${kpis.aprovPct}%` : '—',
      unit: 'consumido/servido', color: (kpis.aprovPct ?? 0) >= 70 ? 'var(--green)' : 'var(--orange)', sub: null },
    { lbl: 'F1 mejor modelo', val: '0.6712',                      unit: 'Macro F1 · Exp 03', color: 'var(--c3)',
      sub: 'Modelo B (multiclase)' },
  ]

  return (
    <div>
      {dateRange && (
        <div className="kpi-meta">
          <span className="dot-live" />
          {dateRange} · {meta.totalRows.toLocaleString()} lecturas ·{' '}
          {meta.chartPoints.toLocaleString()} pts graficados (LTTB)
        </div>
      )}
      <div className="kpi-grid">
        {cards.map(c => (
          <div className="kpi-card" key={c.lbl} style={{ '--kpi-color': c.color }}>
            <div className="kpi-lbl">{c.lbl}</div>
            <div className="kpi-val">{c.val}</div>
            <div className="kpi-unit">{c.unit}</div>
            {c.sub && <div className="kpi-sub2">{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
