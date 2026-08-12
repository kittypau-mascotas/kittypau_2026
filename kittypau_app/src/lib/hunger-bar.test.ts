import { describe, expect, it } from "vitest";
import {
  computeHungerBar,
  detectSegments,
  ALERT_THRESHOLD_HOURS,
  type ReadingPoint,
} from "./hunger-bar";

// Fixture calibrado contra el algoritmo de detectSegments (ventana de lag de 8 min,
// ver LAG_SECONDS en hunger-bar.ts): lecturas cada 2 min desde t-20 hasta t+8, plano
// en 200g hasta t=0, baja gradualmente a 190g entre t=0 y t=8 (10g en 4 pasos, dentro
// del rango 5-15g/4-8min documentado en SPEC_HungerBar_Alimentacion.md §2), se
// estabiliza en t=8. Por el lag de 8 min, el segmento detectado arranca en t=-4 y
// cierra en t=8 -> deltaG=-10g, duracion=12min, matchea "alimentacion".
function readingsFromMeal(anchorT0: Date): ReadingPoint[] {
  const t0 = anchorT0.getTime();
  const at = (min: number) => new Date(t0 + min * 60_000).toISOString();
  return [
    { recordedAt: at(-20), weightGrams: 200 },
    { recordedAt: at(-18), weightGrams: 200 },
    { recordedAt: at(-16), weightGrams: 200 },
    { recordedAt: at(-14), weightGrams: 200 },
    { recordedAt: at(-12), weightGrams: 200 },
    { recordedAt: at(-10), weightGrams: 200 },
    { recordedAt: at(-8), weightGrams: 200 },
    { recordedAt: at(-6), weightGrams: 200 },
    { recordedAt: at(-4), weightGrams: 200 },
    { recordedAt: at(-2), weightGrams: 200 },
    { recordedAt: at(0), weightGrams: 200 },
    { recordedAt: at(2), weightGrams: 197 },
    { recordedAt: at(4), weightGrams: 194 },
    { recordedAt: at(6), weightGrams: 191 },
    { recordedAt: at(8), weightGrams: 190 },
  ];
}

// startAt real del segmento detectado en el fixture de arriba (t=-4, ver comentario).
function mealDetectedAt(anchorT0: Date): Date {
  return new Date(anchorT0.getTime() - 4 * 60_000);
}

describe("detectSegments", () => {
  it("clasifica una bajada gradual de 10g/12min (con lag de deteccion) como alimentacion", () => {
    const anchor = new Date("2026-08-01T08:00:00Z");
    const segments = detectSegments(readingsFromMeal(anchor));
    expect(segments).toHaveLength(1);
    expect(segments[0].category).toBe("alimentacion");
    expect(segments[0].deltaG).toBeCloseTo(-10, 0);
    expect(segments[0].startAt).toBe(mealDetectedAt(anchor).toISOString());
  });

  it("no detecta nada con menos de 2 lecturas", () => {
    expect(detectSegments([])).toEqual([]);
    expect(
      detectSegments([
        { recordedAt: new Date().toISOString(), weightGrams: 100 },
      ]),
    ).toEqual([]);
  });
});

describe("computeHungerBar", () => {
  it("devuelve sin_datos si no hay ninguna comida detectada", () => {
    const flat: ReadingPoint[] = [
      { recordedAt: "2026-08-01T08:00:00Z", weightGrams: 200 },
      { recordedAt: "2026-08-01T08:10:00Z", weightGrams: 200 },
    ];
    const result = computeHungerBar(flat, new Date("2026-08-01T09:00:00Z"));
    expect(result.status).toBe("sin_datos");
    expect(result.percentage).toBeNull();
  });

  it("percentage = 100 justo despues de comer, no 0 (regresion del bug del 2026-08-11)", () => {
    const anchor = new Date("2026-08-01T08:00:00Z");
    const justAfterMeal = new Date(mealDetectedAt(anchor).getTime() + 60_000);
    const result = computeHungerBar(readingsFromMeal(anchor), justAfterMeal);
    expect(result.status).toBe("ok");
    expect(result.percentage).toBe(100);
  });

  it("percentage decae hacia 0 a medida que pasa el tiempo desde la ultima comida", () => {
    const anchor = new Date("2026-08-01T08:00:00Z");
    const readings = readingsFromMeal(anchor);
    const base = mealDetectedAt(anchor).getTime();
    const early = computeHungerBar(readings, new Date(base + 1 * 3_600_000));
    const late = computeHungerBar(readings, new Date(base + 5 * 3_600_000));
    expect(early.percentage).toBeGreaterThan(late.percentage!);
  });

  it("activa la alerta solo cuando pasaron >= ALERT_THRESHOLD_HOURS desde la proxima comida estimada", () => {
    const anchor = new Date("2026-08-01T08:00:00Z");
    const readings = readingsFromMeal(anchor);
    const { estimatedNextMealAt } = computeHungerBar(
      readings,
      new Date(mealDetectedAt(anchor).getTime() + 60_000),
    );
    const nextMealMs = new Date(estimatedNextMealAt!).getTime();

    const beforeAlert = computeHungerBar(
      readings,
      new Date(nextMealMs + (ALERT_THRESHOLD_HOURS - 0.5) * 3_600_000),
    );
    const afterAlert = computeHungerBar(
      readings,
      new Date(nextMealMs + (ALERT_THRESHOLD_HOURS + 0.5) * 3_600_000),
    );
    expect(beforeAlert.alertActive).toBe(false);
    expect(afterAlert.alertActive).toBe(true);
  });
});
