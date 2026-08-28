import { describe, expect, it } from "vitest";
import {
  computeHungerBar,
  detectSegments,
  mergeMealBursts,
  ALERT_THRESHOLD_HOURS,
  MIN_INTERVALO_H,
  type ReadingPoint,
  type Segment,
} from "./hunger-bar";
import { classifyWeightSegment } from "./evidence-engine/evidence-score";

function meal(startAt: string, endAt: string, deltaG = -5): Segment {
  return {
    startAt,
    endAt,
    deltaG,
    durationMin:
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000,
    weights: [],
    category: "alimentacion",
    confidence: 0.9,
  };
}

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
    // US3 (spec 007): weights se conserva para que evidence-engine pueda
    // reclasificar el segmento — no debe quedar vacío ni perderse.
    expect(segments[0].weights.length).toBeGreaterThan(0);
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

describe("mergeMealBursts — agrupar picoteo", () => {
  it("fusiona dos comidas separadas por una pausa menor a MIN_INTERVALO_H (20 min)", () => {
    const a = meal("2026-08-01T08:00:00Z", "2026-08-01T08:03:00Z", -5);
    const b = meal("2026-08-01T08:10:00Z", "2026-08-01T08:12:00Z", -4); // pausa 7 min < 20 min

    const merged = mergeMealBursts([a, b]);

    expect(merged).toHaveLength(1);
    expect(merged[0].startAt).toBe(a.startAt); // arranca en la primera bocanada
    expect(merged[0].endAt).toBe(b.endAt); // termina en la última
    expect(merged[0].deltaG).toBeCloseTo(-9, 8); // suma de ambas bajadas
  });

  it("NO fusiona comidas separadas por una pausa mayor o igual a MIN_INTERVALO_H", () => {
    const a = meal("2026-08-01T08:00:00Z", "2026-08-01T08:03:00Z");
    const pauseMin = MIN_INTERVALO_H * 60;
    const b = meal(
      new Date(new Date(a.endAt).getTime() + pauseMin * 60_000).toISOString(),
      new Date(
        new Date(a.endAt).getTime() + (pauseMin + 3) * 60_000,
      ).toISOString(),
    );

    expect(mergeMealBursts([a, b])).toHaveLength(2);
  });

  it("una cadena de 3 picoteos seguidos se fusiona en una sola comida", () => {
    const a = meal("2026-08-01T08:00:00Z", "2026-08-01T08:02:00Z", -3);
    const b = meal("2026-08-01T08:05:00Z", "2026-08-01T08:07:00Z", -3);
    const c = meal("2026-08-01T08:10:00Z", "2026-08-01T08:12:00Z", -3);

    const merged = mergeMealBursts([a, b, c]);

    expect(merged).toHaveLength(1);
    expect(merged[0].startAt).toBe(a.startAt);
    expect(merged[0].endAt).toBe(c.endAt);
    expect(merged[0].deltaG).toBeCloseTo(-9, 8);
  });

  it("lista vacía no lanza", () => {
    expect(mergeMealBursts([])).toEqual([]);
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

  // US2 (spec 007): lastMealConfidence debe ser trazable al Evidence Engine
  // real, no un score arbitrario — se compara contra classifyWeightSegment()
  // llamado directamente sobre el mismo segmento.
  it("lastMealConfidence refleja la confianza real del Evidence Engine para el segmento detectado", () => {
    const anchor = new Date("2026-08-01T08:00:00Z");
    const readings = readingsFromMeal(anchor);
    const [segment] = detectSegments(readings);
    const evidence = classifyWeightSegment(segment.weights);

    const result = computeHungerBar(
      readings,
      new Date(mealDetectedAt(anchor).getTime() + 60_000),
    );

    expect(evidence).not.toBeNull();
    expect(result.lastMealConfidence).toBeCloseTo(evidence!.confidence, 2);
  });
});
