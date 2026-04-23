"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { chileShortTime } from "@/lib/time/chile";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

/**
 * Filtra y mapea lecturas a la serie que ChartCard consume.
 * Compatible con ApiReading de /bowl (recorded_at: string | null)
 * y /today (recorded_at: string).
 */
export function buildSeries<T extends { recorded_at?: string | null }>(
  readings: T[],
  getValue: (reading: T) => number | null | undefined,
  windowMs: number,
  bucketMs?: number,
): { value: number; timestamp: string }[] {
  const cutoff = Date.now() - windowMs;
  const filtered = readings
    .map((reading) => ({
      value: getValue(reading),
      timestamp: reading.recorded_at ?? null,
    }))
    .filter((item): item is { value: number; timestamp: string } => {
      if (typeof item.value !== "number" || !Number.isFinite(item.value))
        return false;
      if (!item.timestamp) return false;
      const ts = new Date(item.timestamp).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= cutoff;
    });

  if (!bucketMs || bucketMs <= 0) return filtered;

  // Agrupar en buckets y promediar
  const buckets = new Map<number, number[]>();
  for (const item of filtered) {
    const ts = new Date(item.timestamp).getTime();
    const bucketTs = Math.floor(ts / bucketMs) * bucketMs;
    if (!buckets.has(bucketTs)) buckets.set(bucketTs, []);
    buckets.get(bucketTs)!.push(item.value);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => b - a) // más reciente primero (igual que el API)
    .map(([ts, values]) => ({
      value: values.reduce((s, v) => s + v, 0) / values.length,
      timestamp: new Date(ts).toISOString(),
    }));
}

/**
 * Tarjeta de gráfico de línea en vivo — estilo S1 Clean Minimal.
 * Usada en /bowl (rangeStartLabel variable, canvasClassName="h-32 sm:h-56")
 * y en /today (rangeStartLabel="-3h", canvasClassName="h-28 sm:h-40").
 */
export const ChartCard = ({
  title,
  unit,
  series,
  accent,
  latestValue,
  rangeStartLabel,
  integerDisplay = false,
  maxPoints = 30,
  canvasClassName = "h-32 sm:h-56",
  className,
}: {
  title: string;
  unit: string;
  series: { value: number; timestamp: string }[];
  accent: string;
  latestValue: number | null;
  rangeStartLabel: string;
  integerDisplay?: boolean;
  maxPoints?: number;
  canvasClassName?: string;
  className?: string;
}) => {
  const values = series.map((item) => item.value);
  const ordered = series.slice(0, maxPoints).reverse();

  const formatTooltipTime = (timestamp: string): string => {
    const ts = new Date(timestamp);
    if (Number.isNaN(ts.getTime())) return "";
    const hh = ts.getHours().toString().padStart(2, "0");
    const mi = ts.getMinutes().toString().padStart(2, "0");
    const dd = ts.getDate().toString().padStart(2, "0");
    const mo = (ts.getMonth() + 1).toString().padStart(2, "0");
    const aa = ts.getFullYear().toString().slice(2);
    return `${hh}:${mi}  ${dd}/${mo}/${aa}`;
  };

  const labels = ordered.map((item) => {
    const ts = new Date(item.timestamp);
    if (Number.isNaN(ts.getTime())) return "";
    return chileShortTime(ts);
  });
  const dataPoints = ordered.map((item) => item.value);

  const min = dataPoints.length > 0 ? Math.min(...dataPoints) : 0;
  const max = dataPoints.length > 0 ? Math.max(...dataPoints) : 1;

  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: dataPoints,
        borderColor: accent,
        backgroundColor: accent,
        borderWidth: 2.8,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 340,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        borderColor: "rgba(148, 163, 184, 0.35)",
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            const ts = idx !== undefined ? (ordered[idx]?.timestamp ?? "") : "";
            return ts ? formatTooltipTime(ts) : "";
          },
          label: (ctx) => {
            const raw = typeof ctx.parsed.y === "number" ? ctx.parsed.y : null;
            const value =
              integerDisplay && raw !== null ? Math.round(raw) : raw;
            return `${value ?? "-"} ${unit}`;
          },
        },
      },
    },
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    scales: {
      x: {
        offset: true,
        grid: { display: false },
        border: {
          display: true,
          color:
            "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)",
        },
        ticks: {
          maxTicksLimit: 2,
          color: "hsl(var(--muted-foreground))",
          font: { size: 11 },
          autoSkip: false,
          padding: 8,
          maxRotation: 0,
          minRotation: 0,
          callback: (_value, index, ticks) => {
            if (index === 0) return rangeStartLabel;
            if (index === ticks.length - 1) return "Ahora";
            return "";
          },
        },
      },
      y: {
        beginAtZero: false,
        suggestedMin: min,
        suggestedMax: max,
        grid: { drawOnChartArea: false },
        border: {
          display: true,
          color:
            "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)",
        },
        ticks: {
          color: "hsl(var(--muted-foreground))",
          font: { size: 11 },
          maxTicksLimit: 3,
          callback: (value) => {
            const numeric = Number(value);
            const rendered =
              integerDisplay && Number.isFinite(numeric)
                ? Math.round(numeric)
                : value;
            return `${rendered} ${unit}`;
          },
        },
      },
    },
  };

  return (
    <div
      className={`chart-card rounded-[calc(var(--radius)-6px)] border border-slate-200 bg-white px-5 py-5 ${
        className ?? ""
      }`}
    >
      <p className="chart-card-title text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <p className="chart-card-value mt-2 text-2xl font-semibold text-slate-900">
        {latestValue !== null
          ? `${integerDisplay ? Math.round(latestValue) : latestValue} ${unit}`
          : "Sin datos"}
      </p>
      <div
        className={`chart-card-canvas mt-4 w-full rounded-[calc(var(--radius)-8px)] bg-slate-50 px-3 py-3 ${canvasClassName}`}
      >
        {values.length > 1 ? (
          <Line data={data} options={options} />
        ) : (
          <p className="text-xs text-slate-500">Aún sin lecturas recientes.</p>
        )}
      </div>
    </div>
  );
};
