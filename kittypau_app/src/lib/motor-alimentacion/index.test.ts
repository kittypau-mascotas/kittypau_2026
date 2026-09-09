import { describe, expect, it } from "vitest";
import { fusionarPicoteo } from "./index";
import type { EventoAlimentacion } from "./index";

function evento(overrides: Partial<EventoAlimentacion>): EventoAlimentacion {
  return {
    startAt: "2026-04-01T00:00:00.000Z",
    endAt: "2026-04-01T00:05:00.000Z",
    deltaG: -5,
    durationMin: 5,
    category: "alimentacion",
    confidence: 0.75,
    isProvisional: false,
    ...overrides,
  };
}

describe("fusionarPicoteo (picoteo -- Knowledge/05_API/SPEC_HungerBar_Alimentacion.md §3)", () => {
  it("fusiona dos alimentaciones separadas por menos de 120s en una sola", () => {
    const a = evento({
      startAt: "2026-04-01T00:00:00.000Z",
      endAt: "2026-04-01T00:05:00.000Z",
      deltaG: -5,
      confidence: 0.9,
    });
    const b = evento({
      startAt: "2026-04-01T00:06:00.000Z", // 60s de gap desde el fin de "a"
      endAt: "2026-04-01T00:09:00.000Z",
      deltaG: -3,
      confidence: 0.6,
    });
    const resultado = fusionarPicoteo([a, b]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].startAt).toBe(a.startAt);
    expect(resultado[0].endAt).toBe(b.endAt);
    expect(resultado[0].deltaG).toBeCloseTo(-8, 5); // suma
    expect(resultado[0].durationMin).toBeCloseTo(9, 5); // 00:00 -> 00:09
    expect(resultado[0].confidence).toBe(0.6); // el mas debil, no el primero
  });

  it("NO fusiona si el gap es >= 120s", () => {
    const a = evento({ endAt: "2026-04-01T00:05:00.000Z" });
    const b = evento({ startAt: "2026-04-01T00:07:00.000Z" }); // 120s exactos
    expect(fusionarPicoteo([a, b])).toHaveLength(2);
  });

  it("NO fusiona categorías distintas aunque estén pegadas", () => {
    const a = evento({
      category: "alimentacion",
      endAt: "2026-04-01T00:05:00.000Z",
    });
    const b = evento({
      category: "servido",
      startAt: "2026-04-01T00:05:30.000Z",
    });
    expect(fusionarPicoteo([a, b])).toHaveLength(2);
  });

  it("NO fusiona ruido (no se muestra al usuario, no vale la pena)", () => {
    const a = evento({ category: "ruido", endAt: "2026-04-01T00:05:00.000Z" });
    const b = evento({
      category: "ruido",
      startAt: "2026-04-01T00:05:30.000Z",
    });
    expect(fusionarPicoteo([a, b])).toHaveLength(2);
  });

  it("encadena 3+ eventos pegados en una sola fusión", () => {
    const a = evento({
      startAt: "2026-04-01T00:00:00.000Z",
      endAt: "2026-04-01T00:02:00.000Z",
    });
    const b = evento({
      startAt: "2026-04-01T00:02:30.000Z",
      endAt: "2026-04-01T00:04:00.000Z",
    });
    const c = evento({
      startAt: "2026-04-01T00:04:30.000Z",
      endAt: "2026-04-01T00:06:00.000Z",
    });
    const resultado = fusionarPicoteo([a, b, c]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].startAt).toBe(a.startAt);
    expect(resultado[0].endAt).toBe(c.endAt);
  });
});
