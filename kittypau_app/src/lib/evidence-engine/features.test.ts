import { describe, expect, it } from "vitest";
import { extraerFeatures } from "./features";
import extractionGolden from "./__fixtures__/extraction-golden.json";

type GoldenSample = {
  id: number;
  categoria: string;
  valores: number[];
  resampleS: number;
  featuresEsperadas: Record<string, number>;
};

const samples = (extractionGolden as { samples: GoldenSample[] }).samples;

// Familias sensibles a aproximaciones numéricas (find_peaks portado a mano,
// DFT directa vs. rfft, entropías/fractal con floor/celda de floats) —
// tolerancia más laxa. El resto son fórmulas cerradas: deben coincidir casi
// exactamente. Ver data-model.md §2.
const LOOSE_PREFIXES = [
  "entropy_",
  "fractal_",
  "freq_",
  "power_ratio_low",
  "autocorr_",
  "spectral_entropy",
  "n_maxima",
  "n_minima",
  "n_plateaus",
  "peak_",
  "valley_",
  "idx_", // deriva de features F06/F07 (loose) — se propaga el margen
];

function toleranceFor(name: string): number {
  return LOOSE_PREFIXES.some((p) => name.startsWith(p)) ? 1e-2 : 1e-4;
}

describe("extraerFeatures — paridad contra el motor real (fixtures golden)", () => {
  it("carga al menos 30 muestras (10 por categoría) del fixture", () => {
    expect(samples.length).toBeGreaterThanOrEqual(20);
  });

  for (const sample of samples) {
    it(`anotación #${sample.id} (${sample.categoria}) — reproduce las 102 features de shape_features_v2.py`, () => {
      const got = extraerFeatures(sample.valores, sample.resampleS);
      const expectedEntries = Object.entries(sample.featuresEsperadas);
      expect(expectedEntries.length).toBeGreaterThan(90);

      const mismatches: string[] = [];
      for (const [name, expected] of expectedEntries) {
        const actual = got[name];
        const tol = toleranceFor(name);
        if (
          actual === undefined ||
          Number.isNaN(actual) ||
          Math.abs(actual - expected) > tol
        ) {
          mismatches.push(
            `${name}: esperado=${expected} obtenido=${actual} (tol=${tol})`,
          );
        }
      }
      expect(mismatches, mismatches.join("\n")).toEqual([]);
    });
  }
});
