"use client";

import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions, Plugin } from "chart.js";

/**
 * Copia de prueba de `DayNightTimelineCard` (ver ese archivo) -- vista
 * semanal en vez de diaria: 7 filas (lunes a domingo) en el eje Y, hora del
 * día (0-24) en el eje X. Se renderiza "justo abajo" del original en
 * `today-screen.tsx` para comparar lado a lado, a pedido de Mauro -- no
 * reemplaza al componente diario.
 *
 * Mismo patrón que el original: este componente es solo la "carcasa"
 * visual, el cálculo de `chartData`/`chartOptions`/`backgroundPlugin` (y el
 * nuevo `monthLabel`/`weekRangeLabel`) vive en `today-screen.tsx`.
 *
 * Usa `<Line>` con `showLine:false` por dataset en vez de `<Scatter>` --
 * es exactamente lo que ya usa el componente diario para los puntos de
 * Alimentación/Servido (ver day-night-timeline-card.tsx), Chart.js no
 * necesita un chart type distinto para esto.
 */
export default function DayNightTimelineCardWeekly({
  weekOffset,
  onOffsetChange,
  monthLabel,
  weekRangeLabel,
  chartData,
  chartOptions,
  backgroundPlugin,
  chartLoadError,
  isAuthoritativeFoodDevice,
  authoritativeDeviceCode,
}: {
  weekOffset: number;
  onOffsetChange: (updater: (prev: number) => number) => void;
  monthLabel: string;
  weekRangeLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData: ChartData<"line", any[]>;
  chartOptions: ChartOptions<"line">;
  backgroundPlugin: Plugin<"line">;
  chartLoadError: string | null;
  isAuthoritativeFoodDevice: boolean;
  authoritativeDeviceCode: string;
}) {
  return (
    <section className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Vista semanal (prueba)
      </p>
      <div className="rounded-[calc(var(--radius)-8px)] border border-rose-100 bg-[linear-gradient(180deg,rgba(251,207,232,0.22)_0%,rgba(236,253,245,0.22)_55%,rgba(255,255,255,0.95)_100%)] p-3 shadow-[0_10px_28px_-22px_rgba(236,72,153,0.6)]">
        <div className="mb-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onOffsetChange((prev) => prev + 1)}
            className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
            aria-label="Semana anterior"
            title="Semana anterior"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onOffsetChange(() => 0)}
            className="flex flex-col items-center rounded-[calc(var(--radius)-10px)] border border-slate-200 bg-white px-3 py-1 leading-tight hover:bg-slate-50"
            aria-label="Volver a esta semana"
            title="Volver a esta semana"
          >
            <span className="text-[13px] font-semibold capitalize text-slate-700">
              {monthLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {weekRangeLabel}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOffsetChange((prev) => Math.max(0, prev - 1))}
            disabled={weekOffset === 0}
            className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Semana siguiente"
            title="Semana siguiente"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        {/* 7 filas en vez de 3 carriles -- más alto que la vista diaria
            (360px) para que cada fila siga siendo legible. */}
        <div className="h-[560px] w-full rounded-[calc(var(--radius)-10px)] border border-white/70 bg-gradient-to-b from-rose-50/35 via-emerald-50/20 to-white px-2 py-2">
          <Line
            data={chartData}
            options={chartOptions}
            plugins={[backgroundPlugin]}
          />
        </div>
        {chartLoadError ? (
          <p className="mt-2 w-full text-center text-xs font-medium text-slate-500">
            {chartLoadError}
          </p>
        ) : null}
        {!isAuthoritativeFoodDevice ? (
          <p className="mt-2 w-full text-center text-xs font-medium text-slate-500">
            En este dispositivo todavía no distinguimos comida de servido: se
            muestran las lecturas de peso sin clasificar. La detección de
            comidas confirmada está por ahora solo en {authoritativeDeviceCode}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
