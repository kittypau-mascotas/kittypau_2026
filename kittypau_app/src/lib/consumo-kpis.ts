/**
 * 9 KPIs de consumo de alimento para mostrar al dueño en `/today` — mismo
 * catálogo diseñado en Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md
 * §2.1, recalculado sobre `Segment[]` (eventos ya clasificados por el motor
 * v2 de `./hunger-bar`, on-demand desde `readings`) en vez de
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
  };
}
