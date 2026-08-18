import { describe, expect, it } from "vitest";
import { isTareConfirmed, TARE_CONFIRM_THRESHOLD_G } from "./plate-tare-check";

describe("isTareConfirmed", () => {
  it("confirma con una lectura exactamente en 0", () => {
    expect(isTareConfirmed(0)).toBe(true);
  });

  it("confirma con una lectura pequeña positiva o negativa dentro del margen", () => {
    expect(isTareConfirmed(TARE_CONFIRM_THRESHOLD_G)).toBe(true);
    expect(isTareConfirmed(-TARE_CONFIRM_THRESHOLD_G)).toBe(true);
    expect(isTareConfirmed(2)).toBe(true);
    expect(isTareConfirmed(-2)).toBe(true);
  });

  it("rechaza una lectura fuera del margen (plato mal puesto, tara no efectiva)", () => {
    expect(isTareConfirmed(TARE_CONFIRM_THRESHOLD_G + 1)).toBe(false);
    expect(isTareConfirmed(-(TARE_CONFIRM_THRESHOLD_G + 1))).toBe(false);
    expect(isTareConfirmed(320)).toBe(false); // ej. el plato quedó sin tarar
  });

  it("rechaza valores no numéricos/infinitos en vez de aceptarlos por accidente", () => {
    expect(isTareConfirmed(NaN)).toBe(false);
    expect(isTareConfirmed(Infinity)).toBe(false);
  });

  it("respeta un umbral custom si se pasa explícito", () => {
    expect(isTareConfirmed(8, 10)).toBe(true);
    expect(isTareConfirmed(8, 5)).toBe(false);
  });
});
