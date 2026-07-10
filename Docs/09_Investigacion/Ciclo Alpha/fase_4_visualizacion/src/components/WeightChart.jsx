import { useMemo } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { SESSION_COLORS, PALETTE } from '../utils/constants'

const Plot = createPlotlyComponent(Plotly)

const RANGE_BUTTONS = [
  { count: 1,  label: '1d',  step: 'day',  stepmode: 'backward' },
  { count: 3,  label: '3d',  step: 'day',  stepmode: 'backward' },
  { count: 7,  label: '7d',  step: 'day',  stepmode: 'backward' },
  { count: 14, label: '14d', step: 'day',  stepmode: 'backward' },
  { step: 'all', label: 'Todo' },
]

export function WeightChart({ readings, sessions, events }) {
  const { traces, layout } = useMemo(() => {
    if (!readings?.length) return { traces: [], layout: {} }

    // ── Shapes: bandas de sesión ────────────────────────────────────────────
    const shapes = sessions.map(s => {
      const c = SESSION_COLORS[s.type] || SESSION_COLORS.alimentacion
      return {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: s.start_at.toISOString(),
        x1: s.end_at.toISOString(),
        y0: 0,
        y1: 1,
        fillcolor: c.fill,
        line: { color: c.line, width: 1 },
        layer: 'below',
      }
    })

    // ── Trace: curva de peso ────────────────────────────────────────────────
    const weightTrace = {
      x: readings.map(r => r.ts.toISOString()),
      y: readings.map(r => r.weight),
      type: 'scatter',
      mode: 'lines',
      name: 'Peso (g)',
      line: { color: PALETTE.red, width: 1.4, shape: 'hv' },
      fill: 'tozeroy',
      fillcolor: PALETTE.redDim,
      hovertemplate:
        '<b>%{x|%d %b %H:%M UTC}</b><br>Peso: <b>%{y:.1f} g</b><extra></extra>',
    }

    // ── Trace: marcadores de eventos ────────────────────────────────────────
    const inicio = events.filter(e => e.category?.startsWith('inicio_'))
    const termin = events.filter(e => e.category?.startsWith('termino_'))

    const makeMarkerTrace = (evs, suffix, symbol, size) => ({
      x: evs.map(e => e.ts.toISOString()),
      y: evs.map(e => e.weight),
      type: 'scatter',
      mode: 'markers',
      name: suffix,
      marker: {
        symbol,
        size,
        color: evs.map(e => {
          if (e.category.includes('alimentacion')) return SESSION_COLORS.alimentacion.solid
          if (e.category.includes('servido'))      return SESSION_COLORS.servido.solid
          if (e.category.includes('hidratacion'))  return SESSION_COLORS.hidratacion.solid
          return PALETTE.textMuted
        }),
        line: { width: 1.5, color: PALETTE.bg },
      },
      text: evs.map(e => e.category),
      hovertemplate:
        '<b>%{text}</b><br>%{x|%d %b %H:%M}<br>Peso: %{y:.1f} g<extra></extra>',
    })

    const startTrace = makeMarkerTrace(inicio, '▶ Inicio', 'diamond', 10)
    const endTrace   = makeMarkerTrace(termin, '■ Término', 'diamond-open', 10)

    // ── Leyenda manual para tipos de sesión ─────────────────────────────────
    const legendTraces = Object.entries(SESSION_COLORS).map(([type, c]) => ({
      x: [null], y: [null],
      type: 'scatter', mode: 'markers',
      name: c.label,
      legendgroup: type,
      marker: { color: c.solid, size: 12, symbol: 'square' },
      showlegend: true,
      hoverinfo: 'skip',
    }))

    // ── Layout ───────────────────────────────────────────────────────────────
    const yVals = readings.map(r => r.weight)
    const yMin  = Math.max(0, Math.min(...yVals) - 15)
    const yMax  = Math.max(...yVals) + 30

    const layout = {
      paper_bgcolor: PALETTE.bgCard,
      plot_bgcolor:  PALETTE.bg,
      shapes,
      margin: { l: 65, r: 30, t: 20, b: 60 },
      legend: {
        orientation: 'h',
        y: -0.18,
        x: 0,
        bgcolor: 'rgba(0,0,0,0)',
        font: { color: PALETTE.text, size: 12, family: "'DM Mono', monospace" },
        itemclick: 'toggle',
        itemdoubleclick: 'toggleothers',
      },
      xaxis: {
        type: 'date',
        showgrid: true,
        gridcolor: PALETTE.grid,
        gridwidth: 1,
        tickfont:  { size: 11, color: PALETTE.textMuted, family: "'DM Mono', monospace" },
        linecolor: PALETTE.border,
        tickformat: '%d %b\n%H:%M',
        rangeselector: {
          buttons: RANGE_BUTTONS,
          bgcolor: PALETTE.bgCard2,
          activecolor: PALETTE.green,
          font: { size: 11, color: PALETTE.text, family: "'DM Mono', monospace" },
          bordercolor: PALETTE.border,
          borderwidth: 1,
          x: 0,
          y: 1.08,
        },
        rangeslider: {
          visible: true,
          thickness: 0.05,
          bgcolor: PALETTE.bgCard2,
          bordercolor: PALETTE.border,
          borderwidth: 1,
        },
      },
      yaxis: {
        title: {
          text: 'Peso (g)',
          font: { color: PALETTE.textMuted, size: 12, family: "'DM Mono', monospace" },
        },
        range: [yMin, yMax],
        showgrid: true,
        gridcolor: PALETTE.grid,
        gridwidth: 1,
        tickfont: { size: 11, color: PALETTE.textMuted, family: "'DM Mono', monospace" },
        linecolor: PALETTE.border,
        zeroline: false,
      },
      font: { family: "'DM Mono', monospace", color: PALETTE.textMuted },
      hoverlabel: {
        bgcolor: PALETTE.bgCard2,
        font: { size: 12, color: PALETTE.text, family: "'DM Mono', monospace" },
        bordercolor: PALETTE.border,
      },
      dragmode: 'pan',
    }

    return {
      traces: [...legendTraces, weightTrace, startTrace, endTrace],
      layout,
    }
  }, [readings, sessions, events])

  const config = useMemo(() => ({
    responsive:  true,
    displaylogo: false,
    scrollZoom:  true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    toImageButtonOptions: {
      format:   'png',
      filename: 'kpcl0034_peso_sesiones',
      height:   900,
      width:    1800,
      scale:    2,
    },
  }), [])

  if (!readings?.length) {
    return (
      <div style={{ height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: PALETTE.textMuted }}>Sin datos</span>
      </div>
    )
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={config}
      useResizeHandler
      style={{ width: '100%', height: '580px' }}
    />
  )
}
