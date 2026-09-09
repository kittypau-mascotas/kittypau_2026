import { describe, expect, it } from "vitest";
import { computeConsumoKpis } from "./consumo-kpis";
import type { Segment } from "./hunger-bar";

// "Hoy" fijo para que los tests no dependan de la hora real -- 2026-04-10,
// Chile ya sin horario de verano en abril (CLT = UTC-4). 15:00 UTC = 11:00
// Santiago. El "dia" Santiago de hoy cubre ~04:00Z a ~04:00Z del dia
// siguiente -- todos los horarios de los fixtures de abajo caen ahi adentro.
const HOY = new Date("2026-04-10T15:00:00.000Z");

function comida(overrides: Partial<Segment>): Segment {
  return {
    startAt: "2026-04-10T12:00:00.000Z",
    endAt: "2026-04-10T12:05:00.000Z",
    deltaG: -30,
    durationMin: 5,
    category: "alimentacion",
    confidence: 0.9,
    isProvisional: false,
    ...overrides,
  };
}

describe("computeConsumoKpis (Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md §2.1/§2.2)", () => {
  it("sin comidas -- todo en null/0, sin reventar", () => {
    const k = computeConsumoKpis([], HOY);
    expect(k.mealsToday).toBe(0);
    expect(k.avgDurationMin).toBeNull();
    expect(k.ateInPeakHourToday).toBeNull();
    expect(k.avgIntervalTodayHours).toBeNull();
    expect(k.streakDays).toBe(0);
    expect(k.biggestMealG).toBeNull();
    expect(k.withinOwnerRange).toBeNull();
  });

  it("#1/#2 -- duracion y velocidad promedio ignoran ruido/servido", () => {
    const eventos: Segment[] = [
      comida({
        startAt: "2026-04-09T12:00:00.000Z",
        deltaG: -20,
        durationMin: 10,
      }), // 2 g/min
      comida({
        startAt: "2026-04-09T18:00:00.000Z",
        deltaG: -40,
        durationMin: 10,
      }), // 4 g/min
      { ...comida({}), category: "ruido", deltaG: -5, durationMin: 1 },
    ];
    const k = computeConsumoKpis(eventos, HOY);
    expect(k.avgDurationMin).toBe(10);
    expect(k.avgSpeedGPerMin).toBe(3);
  });

  it("#3 -- cuenta solo las comidas de HOY (hora Chile), no de ayer", () => {
    const eventos: Segment[] = [
      comida({ startAt: "2026-04-10T14:00:00.000Z" }), // hoy 11:00 Santiago
      comida({ startAt: "2026-04-09T14:00:00.000Z" }), // ayer
    ];
    const k = computeConsumoKpis(eventos, HOY);
    expect(k.mealsToday).toBe(1);
    expect(k.mealsExpectedMedian).toBe(3);
    expect(k.mealsExpectedRange).toEqual([1, 6]);
  });

  it("#4 -- detecta si comio en una hora pico real (19h Santiago = 23h UTC, CLT=UTC-4)", () => {
    const eventos: Segment[] = [
      comida({ startAt: "2026-04-10T23:00:00.000Z" }),
    ];
    const k = computeConsumoKpis(eventos, HOY);
    expect(k.ateInPeakHourToday).toBe(true);
  });

  it("#4 -- false si ninguna comida de hoy cae en hora pico", () => {
    // 14:00 Santiago = 17:00 UTC, no está en HORAS_PICO.
    const eventos: Segment[] = [
      comida({ startAt: "2026-04-10T17:00:00.000Z" }),
    ];
    const k = computeConsumoKpis(eventos, HOY);
    expect(k.ateInPeakHourToday).toBe(false);
  });

  it("#5 -- intervalo tipico/mas_seguido/mas_espaciado segun el IQR calibrado", () => {
    // Todos los horarios dentro de la ventana UTC del "hoy" Santiago (~04:00Z-28:00Z).
    const base = "2026-04-10T";
    const tipico: Segment[] = [
      comida({ startAt: `${base}14:00:00.000Z` }),
      comida({ startAt: `${base}19:30:00.000Z` }), // 5.5h -- entre P25=4.04 y P75=8.88
    ];
    expect(computeConsumoKpis(tipico, HOY).intervalConsistency).toBe("tipico");

    const seguido: Segment[] = [
      comida({ startAt: `${base}14:00:00.000Z` }),
      comida({ startAt: `${base}15:00:00.000Z` }), // 1h
    ];
    expect(computeConsumoKpis(seguido, HOY).intervalConsistency).toBe(
      "mas_seguido",
    );

    const espaciado: Segment[] = [
      comida({ startAt: `${base}06:00:00.000Z` }),
      comida({ startAt: `${base}17:00:00.000Z` }), // 11h
    ];
    expect(computeConsumoKpis(espaciado, HOY).intervalConsistency).toBe(
      "mas_espaciado",
    );
  });

  it("#6 -- racha corta cuando falta un dia intermedio", () => {
    const eventos: Segment[] = [
      comida({ startAt: "2026-04-10T14:00:00.000Z" }), // hoy
      comida({ startAt: "2026-04-09T14:00:00.000Z" }), // ayer
      // falta 2026-04-08
      comida({ startAt: "2026-04-07T14:00:00.000Z" }),
    ];
    expect(computeConsumoKpis(eventos, HOY).streakDays).toBe(2);
  });

  it("#8 -- % dentro del rango del dueno, null si no configuro rango", () => {
    const eventos: Segment[] = [
      comida({ startAt: "2026-04-09T12:00:00.000Z", deltaG: -30 }), // dentro
      comida({ startAt: "2026-04-09T18:00:00.000Z", deltaG: -100 }), // fuera
    ];
    expect(computeConsumoKpis(eventos, HOY, null).withinOwnerRange).toBeNull();
    const conRango = computeConsumoKpis(eventos, HOY, { minG: 20, maxG: 50 });
    expect(conRango.withinOwnerRange).toEqual({
      count: 1,
      total: 2,
      percent: 50,
    });
  });

  it("#9 -- comida mas grande y mas chica del periodo", () => {
    const eventos: Segment[] = [
      comida({ startAt: "2026-04-09T12:00:00.000Z", deltaG: -15 }),
      comida({ startAt: "2026-04-09T18:00:00.000Z", deltaG: -60 }),
    ];
    const k = computeConsumoKpis(eventos, HOY);
    expect(k.biggestMealG).toBe(60);
    expect(k.smallestMealG).toBe(15);
  });
});
