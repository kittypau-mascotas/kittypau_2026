import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
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
  labelStyle: { color: PALETTE.textMuted },
}

export function DailyConsumption({ data }) {
  if (!data?.length) return null

  const avg = Math.round(data.reduce((s, d) => s + d.total, 0) / data.length)

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 24, left: 10, bottom: 30 }}>
          <CartesianGrid {...gridStyle} vertical={false} />
          <XAxis
            dataKey="day"
            tick={axisStyle}
            tickFormatter={d => d.slice(5)}  // MM-DD
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={axisStyle}
            label={{
              value: 'Gramos (g)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fill: PALETTE.textMuted, fontSize: 11, fontFamily: "var(--mono)" },
            }}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(v, name) => [`${v.toFixed(1)} g`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--mono)", color: PALETTE.textMuted }}
          />
          <ReferenceLine
            y={avg}
            stroke={PALETTE.purple}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: `Prom: ${avg}g`,
              position: 'right',
              fill: PALETTE.purple,
              fontSize: 10,
              fontFamily: "var(--mono)",
            }}
          />
          <Bar
            dataKey="total"
            name="Consumido (g)"
            fill={PALETTE.green}
            fillOpacity={0.75}
            radius={[3, 3, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="rolling3"
            name="Media 3 días"
            stroke={PALETTE.orange}
            strokeWidth={2.5}
            dot={{ fill: PALETTE.orange, r: 4, strokeWidth: 1.5, stroke: PALETTE.bg }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
