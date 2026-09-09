/**
 * 12 KPIs de consumo de alimento para mostrar al dueño en `/today` — 9
 * originales del catálogo diseñado en
 * Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md §2.1, + 3 agregados
 * 2026-09-09 sobre el mismo `Segment[]` sin fetch aparte (servido vs.
 * comido, tendencia de apetito, ruido/día — ver §2.3 del mismo spec),
 * recalculado sobre `Segment[]` (eventos ya clasificados por el motor v2 de
 * `./hunger-bar`, on-demand desde `readings`) en vez de
 * `pet_sessions`/`pet_daily_summary` (DB de analytics eliminada, ver §2.2 del
 * mismo spec) — mismo tipo de dato, camino distinto, sin DB intermedia.
 *
 * Solo KPCL0034 (mismo alcance que el motor v2, ver `MOTOR_NUEVO_DEVICE_CODE`
 * en `./hunger-bar`) — para cualquier otro dispositivo estos números salen
 * igual (la Segment[] existe siempre, con las reglas simples de v1), pero sin
 * la validación contra anotaciones reales que respalda las constantes de
 * comparación (mediana de comidas/día, horas pico, IQR).
 */
import {
  COMIDAS_DIA_MEDIANA,
  COMIDAS_DIA_RANGO,
  HORAS_PICO,
  INTERVALO_P25_H,
  INTERVALO_P75_H,
  type Segment,
} from "./hunger-bar";
import { chileDateString, getChileHour } from "./time/chile";

export type ConsistenciaIntervalo = "mas_seguido" | "tipico" | "mas_espaciado";

export type ConsumoKpis = {
  // #1/#2 — promedios sobre toda la ventana de eventos recibida.
  avgDurationMin: number | null;
  avgSpeedGPerMin: number | null;
  // #3 — comidas de hoy vs. patrón calibrado.
  mealsToday: number;
  mealsExpectedMedian: number;
  mealsExpectedRange: [number, number];
  // #4 — ¿alguna comida de hoy cayó en una hora pico real?
  ateInPeakHourToday: boolean | null; // null = todavía no comió hoy
  // #5 — intervalo promedio entre comidas de hoy vs. IQR calibrado.
  avgIntervalTodayHours: number | null; // null = menos de 2 comidas hoy
  intervalConsistency: ConsistenciaIntervalo | null;
  // #6 — días consecutivos con al menos 1 comida, contando hacia atrás desde hoy.
  streakDays: number;
  // #7 — coeficiente de variación (desvío / media) de gramos consumidos por día.
  dailyRegularityCv: number | null; // null = menos de 2 días con datos
  // #8 — % de comidas dentro del rango que definió el dueño (si lo definió).
  withinOwnerRange: { count: number; total: number; percent: number } | null;
  // #9 — extremos del período.
  biggestMealG: number | null;
  smallestMealG: number | null;
  // #10 — cuánto sirvió el dueño vs. cuánto comió el gato en el período.
  servedTotalG: number | null; // null = 0 eventos "servido" en la ventana
  servedToEatenRatio: number | null; // null = no hay comido o servido con qué dividir
  // #11 — tendencia de apetito: pendiente de gramos/día (regresión lineal simple).
  appetiteTrendGPerDay: number | null; // null = menos de 2 días con datos
  // #12 — falsas activaciones del sensor, como proxy de qué tan sucio/ruidoso está.
  noiseEventsPerDayMedian: number | null; // null = 0 días con datos en la ventana
};

const gramsOf = (e: Segment) => Math.abs(e.deltaG);

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function computeConsumoKpis(
  events: Segment[],
  now: Date = new Date(),
  ownerRange: { minG: number; maxG: number } | null = null,
): ConsumoKpis {
  const meals = events
    .filter((e) => e.category === "alimentacion")
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );

  const todayStr = chileDateString(now);
  const mealsToday = meals.filter(
    (e) => chileDateString(new Date(e.startAt)) === todayStr,
  );

  // #1/#2
  const avgDurationMin = mean(meals.map((e) => e.durationMin));
  const speeds = meals
    .filter((e) => e.durationMin > 0)
    .map((e) => gramsOf(e) / e.durationMin);
  const avgSpeedGPerMin = mean(speeds);

  // #4
  const ateInPeakHourToday =
    mealsToday.length === 0
      ? null
      : mealsToday.some((e) =>
          HORAS_PICO.includes(getChileHour(new Date(e.startAt))),
        );

  // #5
  let avgIntervalTodayHours: number | null = null;
  let intervalConsistency: ConsistenciaIntervalo | null = null;
  if (mealsToday.length >= 2) {
    const gapsH: number[] = [];
    for (let i = 1; i < mealsToday.length; i++) {
      const gapMs =
        new Date(mealsToday[i].startAt).getTime() -
        new Date(mealsToday[i - 1].startAt).getTime();
      gapsH.push(gapMs / 3_600_000);
    }
    avgIntervalTodayHours = mean(gapsH);
    if (avgIntervalTodayHours !== null) {
      intervalConsistency =
        avgIntervalTodayHours < INTERVALO_P25_H
          ? "mas_seguido"
          : avgIntervalTodayHours > INTERVALO_P75_H
            ? "mas_espaciado"
            : "tipico";
    }
  }

  // #6 — racha: días consecutivos (hacia atrás desde hoy) con >=1 comida,
  // dentro de la ventana de eventos recibida (no inventa datos fuera de ella).
  const diasConComida = new Set(
    meals.map((e) => chileDateString(new Date(e.startAt))),
  );
  let streakDays = 0;
  for (let d = 0; ; d++) {
    const dia = chileDateString(new Date(now.getTime() - d * 86_400_000));
    if (!diasConComida.has(dia)) break;
    streakDays++;
  }

  // #7 — regularidad diaria: coeficiente de variación de gramos/día sobre
  // los días que sí tienen al menos una comida (no cuenta días sin dato
  // como "0 gramos" -- eso mediría cobertura, no regularidad).
  const gramosPorDia = new Map<string, number>();
  for (const e of meals) {
    const dia = chileDateString(new Date(e.startAt));
    gramosPorDia.set(dia, (gramosPorDia.get(dia) ?? 0) + gramsOf(e));
  }
  const totalesDiarios = [...gramosPorDia.values()];
  let dailyRegularityCv: number | null = null;
  if (totalesDiarios.length >= 2) {
    const media = mean(totalesDiarios)!;
    if (media > 0) {
      const varianza =
        totalesDiarios.reduce((acc, g) => acc + (g - media) ** 2, 0) /
        totalesDiarios.length;
      dailyRegularityCv = Math.sqrt(varianza) / media;
    }
  }

  // #8
  let withinOwnerRange: ConsumoKpis["withinOwnerRange"] = null;
  if (ownerRange && meals.length > 0) {
    const count = meals.filter(
      (e) => gramsOf(e) >= ownerRange.minG && gramsOf(e) <= ownerRange.maxG,
    ).length;
    withinOwnerRange = {
      count,
      total: meals.length,
      percent: Math.round((count / meals.length) * 100),
    };
  }

  // #9
  const gramosDeCadaComida = meals.map(gramsOf);
  const biggestMealG = gramosDeCadaComida.length
    ? Math.max(...gramosDeCadaComida)
    : null;
  const smallestMealG = gramosDeCadaComida.length
    ? Math.min(...gramosDeCadaComida)
    : null;

  // #10 — servido vs. comido. Suma simple, mismo criterio que #1/#2 (solo la
  // categoría exacta, sin mezclar con alimentación ni ruido).
  const servedEvents = events.filter((e) => e.category === "servido");
  const servedTotalG = servedEvents.length
    ? servedEvents.reduce((acc, e) => acc + gramsOf(e), 0)
    : null;
  const eatenTotalG = gramosDeCadaComida.reduce((acc, g) => acc + g, 0);
  const servedToEatenRatio =
    servedTotalG !== null && eatenTotalG > 0
      ? servedTotalG / eatenTotalG
      : null;

  // #11 — tendencia: pendiente de gramos/día contra el índice de día (regresión
  // lineal simple, mínimos cuadrados) -- mismos `gramosPorDia` que ya calcula #7.
  let appetiteTrendGPerDay: number | null = null;
  if (totalesDiarios.length >= 2) {
    const n = totalesDiarios.length;
    const xs = totalesDiarios.map((_, i) => i);
    const xMean = mean(xs)!;
    const yMean = mean(totalesDiarios)!;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (totalesDiarios[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    appetiteTrendGPerDay = den > 0 ? num / den : null;
  }

  // #12 — ruido: falsas activaciones por día, sobre los mismos días que #7
  // (con al menos una comida real -- evita que un día 100% ruido sin comida
  // cuente como "0 ruido").
  const ruidoPorDia = new Map<string, number>();
  for (const e of events) {
    if (e.category !== "ruido") continue;
    const dia = chileDateString(new Date(e.startAt));
    ruidoPorDia.set(dia, (ruidoPorDia.get(dia) ?? 0) + 1);
  }
  const diasConDato = [...gramosPorDia.keys()];
  const noiseCounts = diasConDato.map((d) => ruidoPorDia.get(d) ?? 0);
  const noiseEventsPerDayMedian = noiseCounts.length
    ? [...noiseCounts].sort((a, b) => a - b)[Math.floor(noiseCounts.length / 2)]
    : null;

  return {
    avgDurationMin,
    avgSpeedGPerMin,
    mealsToday: mealsToday.length,
    mealsExpectedMedian: COMIDAS_DIA_MEDIANA,
    mealsExpectedRange: COMIDAS_DIA_RANGO,
    ateInPeakHourToday,
    avgIntervalTodayHours,
    intervalConsistency,
    streakDays,
    dailyRegularityCv,
    withinOwnerRange,
    biggestMealG,
    smallestMealG,
    servedTotalG,
    servedToEatenRatio,
    appetiteTrendGPerDay,
    noiseEventsPerDayMedian,
  };
}
