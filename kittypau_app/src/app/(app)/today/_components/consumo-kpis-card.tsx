"use client";

/**
 * 12 KPIs de consumo de alimento — Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md
 * §2.1/§2.2/§2.3. Sección independiente de "Barras Sims" (widget protegido, no se toca ni se
 * le agrega nada) — mismo criterio que ya define ese spec.
 *
 * Solo aparece si `kpis` no es null (hoy: solo KPCL0034, ver `MOTOR_NUEVO_DEVICE_CODE` en
 * `@/lib/hunger-bar`). Cada tile con copy honesto — "Sin datos suficientes todavía" en vez
 * de inventar un número cuando la métrica no se puede calcular con lo que hay.
 */

type ConsumoKpis = {
  avgDurationMin: number | null;
  avgSpeedGPerMin: number | null;
  mealsToday: number;
  mealsExpectedMedian: number;
  mealsExpectedRange: [number, number];
  ateInPeakHourToday: boolean | null;
  avgIntervalTodayHours: number | null;
  intervalConsistency: "mas_seguido" | "tipico" | "mas_espaciado" | null;
  streakDays: number;
  dailyRegularityCv: number | null;
  withinOwnerRange: { count: number; total: number; percent: number } | null;
  biggestMealG: number | null;
  smallestMealG: number | null;
  servedTotalG: number | null;
  servedToEatenRatio: number | null;
  appetiteTrendGPerDay: number | null;
  noiseEventsPerDayMedian: number | null;
};

const CONSISTENCY_LABEL: Record<
  NonNullable<ConsumoKpis["intervalConsistency"]>,
  string
> = {
  mas_seguido: "más seguido que lo típico",
  tipico: "dentro de lo típico",
  mas_espaciado: "más espaciado que lo típico",
};

function Tile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/80">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
        {caption}
      </p>
    </div>
  );
}

export default function ConsumoKpisCard({
  kpis,
}: {
  kpis: ConsumoKpis | null;
}) {
  if (!kpis) return null;

  const regularidadLabel =
    kpis.dailyRegularityCv === null
      ? null
      : kpis.dailyRegularityCv < 0.2
        ? "Muy regular"
        : kpis.dailyRegularityCv < 0.4
          ? "Regular"
          : "Irregular";

  return (
    <section className="rounded-[calc(var(--radius)-8px)] border border-emerald-100 bg-white p-4 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.5)]">
      <h3 className="text-sm font-semibold text-slate-800">
        Consumo de alimento
      </h3>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Calculado sobre los últimos 10 días de lecturas — todo con dato real
        detrás, nada estimado.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile
          label="Comidas hoy"
          value={`${kpis.mealsToday}`}
          caption={`Habitual: ${kpis.mealsExpectedMedian} (rango ${kpis.mealsExpectedRange[0]}-${kpis.mealsExpectedRange[1]})`}
        />
        <Tile
          label="Horario habitual"
          value={
            kpis.ateInPeakHourToday === null
              ? "—"
              : kpis.ateInPeakHourToday
                ? "Sí"
                : "No"
          }
          caption={
            kpis.ateInPeakHourToday === null
              ? "Todavía no comió hoy"
              : "¿Comió en una de sus horas pico habituales?"
          }
        />
        <Tile
          label="Intervalo de hoy"
          value={
            kpis.avgIntervalTodayHours === null
              ? "—"
              : `${kpis.avgIntervalTodayHours.toFixed(1)} h`
          }
          caption={
            kpis.intervalConsistency
              ? CONSISTENCY_LABEL[kpis.intervalConsistency]
              : "Necesita 2+ comidas hoy para calcularse"
          }
        />
        <Tile
          label="Racha"
          value={`${kpis.streakDays} ${kpis.streakDays === 1 ? "día" : "días"}`}
          caption="Días seguidos con al menos una comida detectada"
        />
        <Tile
          label="Regularidad diaria"
          value={regularidadLabel ?? "—"}
          caption={
            kpis.dailyRegularityCv === null
              ? "Necesita 2+ días con comidas"
              : "Qué tan parejo es el total de gramos día a día"
          }
        />
        <Tile
          label="Dentro de tu rango"
          value={
            kpis.withinOwnerRange === null
              ? "—"
              : `${kpis.withinOwnerRange.percent}%`
          }
          caption={
            kpis.withinOwnerRange === null
              ? "Definí un rango normal en el perfil de tu mascota"
              : `${kpis.withinOwnerRange.count} de ${kpis.withinOwnerRange.total} comidas`
          }
        />
        <Tile
          label="Duración por comida"
          value={
            kpis.avgDurationMin === null
              ? "—"
              : `${kpis.avgDurationMin.toFixed(1)} min`
          }
          caption="Promedio del período"
        />
        <Tile
          label="Velocidad al comer"
          value={
            kpis.avgSpeedGPerMin === null
              ? "—"
              : `${kpis.avgSpeedGPerMin.toFixed(1)} g/min`
          }
          caption="Promedio del período"
        />
        <Tile
          label="Mayor / menor comida"
          value={
            kpis.biggestMealG === null
              ? "—"
              : `${Math.round(kpis.biggestMealG)}g / ${Math.round(kpis.smallestMealG ?? 0)}g`
          }
          caption="Extremos del período"
        />
        <Tile
          label="Servido vs. comido"
          value={
            kpis.servedToEatenRatio === null
              ? "—"
              : `${kpis.servedToEatenRatio.toFixed(2)}x`
          }
          caption={
            kpis.servedTotalG === null
              ? "Sin eventos de servido detectados"
              : `${Math.round(kpis.servedTotalG)}g servidos en el período`
          }
        />
        <Tile
          label="Tendencia de apetito"
          value={
            kpis.appetiteTrendGPerDay === null
              ? "—"
              : `${kpis.appetiteTrendGPerDay >= 0 ? "+" : ""}${kpis.appetiteTrendGPerDay.toFixed(1)} g/día`
          }
          caption={
            kpis.appetiteTrendGPerDay === null
              ? "Necesita 2+ días con comidas"
              : Math.abs(kpis.appetiteTrendGPerDay) < 0.5
                ? "Estable"
                : kpis.appetiteTrendGPerDay > 0
                  ? "Subiendo"
                  : "Bajando"
          }
        />
        <Tile
          label="Ruido del sensor"
          value={
            kpis.noiseEventsPerDayMedian === null
              ? "—"
              : `${kpis.noiseEventsPerDayMedian}/día`
          }
          caption="Falsas activaciones detectadas, mediana por día"
        />
      </div>
    </section>
  );
}
