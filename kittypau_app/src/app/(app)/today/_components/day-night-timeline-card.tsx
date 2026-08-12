"use client";

import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions, Plugin } from "chart.js";

/**
 * Card del timeline día/noche de /today: navegación de ciclo (anterior/hoy/siguiente) +
 * el chart de Alimentación/Hidratación superpuesto sobre el fondo día/noche.
 *
 * El cálculo de `chartData`/`chartOptions`/`backgroundPlugin` sigue en `page.tsx` — dependen
 * de ~15 variables de estado de la página (sesiones, audit events, devices). Este componente
 * es solo la "carcasa" visual; no es un componente 100% autónomo todavía.
 */
export default function DayNightTimelineCard({
  dayCycleOffsetDays,
  onOffsetChange,
  rangeTitle,
  chartData,
  chartOptions,
  backgroundPlugin,
  chartLoadError,
  mqttLiveError,
  isAuthoritativeFoodDevice,
  authoritativeDeviceCode,
}: {
  dayCycleOffsetDays: number;
  onOffsetChange: (updater: (prev: number) => number) => void;
  rangeTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData: ChartData<"line", any[]>;
  chartOptions: ChartOptions<"line">;
  backgroundPlugin: Plugin<"line">;
  chartLoadError: string | null;
  mqttLiveError: string | null;
  isAuthoritativeFoodDevice: boolean;
  authoritativeDeviceCode: string;
}) {
  return (
    <section className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5">
      <div className="rounded-[calc(var(--radius)-8px)] border border-rose-100 bg-[linear-gradient(180deg,rgba(251,207,232,0.22)_0%,rgba(236,253,245,0.22)_55%,rgba(255,255,255,0.95)_100%)] p-3 shadow-[0_10px_28px_-22px_rgba(236,72,153,0.6)]">
        <div className="mb-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onOffsetChange((prev) => prev + 1)}
            className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
            aria-label="Ciclo anterior"
            title="Ciclo anterior"
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
            className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            aria-label="Volver a hoy"
            title="Volver a hoy"
          >
            {rangeTitle}
          </button>
          <button
            type="button"
            onClick={() => onOffsetChange((prev) => Math.max(0, prev - 1))}
            disabled={dayCycleOffsetDays === 0}
            className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Ciclo siguiente"
            title="Ciclo siguiente"
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
        <div className="h-[360px] w-full rounded-[calc(var(--radius)-10px)] border border-white/70 bg-gradient-to-b from-rose-50/35 via-emerald-50/20 to-white px-2 py-2">
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
        {mqttLiveError ? (
          <p className="mt-2 w-full text-center text-xs font-medium text-amber-700">
            {mqttLiveError}
          </p>
        ) : null}
        {!isAuthoritativeFoodDevice ? (
          <p className="mt-2 w-full text-center text-xs font-medium text-amber-700">
            Alimentación sin evidencia auditada: solo se confirma comida desde{" "}
            {authoritativeDeviceCode} con categorías inicio/termino.
          </p>
        ) : null}
      </div>
    </section>
  );
}
