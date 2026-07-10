import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PALETTE } from '../utils/constants'

const axisStyle  = { fill: PALETTE.textMuted, fontSize: 11, fontFamily: "var(--mono)" }
const gridStyle  = { stroke: PALETTE.grid, strokeWidth: 1 }
const tooltipStyle = {
  contentStyle: {
    background: PALETTE.bgCard2,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 6,
    color: PALETTE.text,
    fontSize: 12,
    fontFamily: "var(--mono)",
  },
}

export function SessionHistogram({ data }) {
  if (!data?.length) return null

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 10, bottom: 30 }}>
          <CartesianGrid {...gridStyle} vertical={false} />
          <XAxis
            dataKey="range"
            tick={axisStyle}
            angle={-35}
            textAnchor="end"
            interval={0}
            label={{
              value: 'Duración (min)',
              position: 'insideBottom',
              offset: -20,
              style: { fill: PALETTE.textMuted, fontSize: 11, fontFamily: "var(--mono)" },
            }}
          />
          <YAxis
            tick={axisStyle}
            label={{
              value: 'N sesiones',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fill: PALETTE.textMuted, fontSize: 11, fontFamily: "var(--mono)" },
            }}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(v, name) => [v, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--mono)", color: PALETTE.textMuted }}
          />
          <Bar
            dataKey="alimentacion"
            name="Alimentación"
            fill={PALETTE.green}
            fillOpacity={0.8}
            radius={[3, 3, 0, 0]}
            stackId="a"
          />
          <Bar
            dataKey="servido"
            name="Servido"
            fill={PALETTE.orange}
            fillOpacity={0.8}
            radius={[3, 3, 0, 0]}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
