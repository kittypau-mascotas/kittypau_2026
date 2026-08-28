import { describe, expect, it } from "vitest";
import {
  diff,
  findPeaksWithProminence,
  gradientUniform,
  higuchiFD,
  katzFD,
  kurtosisExcess,
  lempelZiv,
  mean,
  median,
  percentile,
  permutationEntropy,
  polyfit1,
  rfftPSD,
  sampleEntropy,
  shannonEntropy,
  skewness,
  std,
  trapz,
} from "./math-utils";

describe("mean/std/diff/median", () => {
  it("calcula mean y std poblacional", () => {
    expect(mean([1, 2, 3, 4])).toBeCloseTo(2.5, 10);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 10);
  });
  it("diff da las diferencias consecutivas", () => {
    expect(diff([1, 3, 6, 10])).toEqual([2, 3, 4]);
  });
  it("median coincide con np.median para n par e impar", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("polyfit1 / gradientUniform / trapz", () => {
  it("polyfit1 recupera pendiente e intercepto de una recta exacta", () => {
    const x = [0, 1, 2, 3];
    const y = x.map((xi) => 2 * xi + 1);
    const { slope, intercept } = polyfit1(x, y);
    expect(slope).toBeCloseTo(2, 8);
    expect(intercept).toBeCloseTo(1, 8);
  });
  it("gradientUniform de una recta da la pendiente constante en todo punto", () => {
    const y = [1, 3, 5, 7, 9]; // pendiente 2 con h=1
    expect(gradientUniform(y, 1)).toEqual([2, 2, 2, 2, 2]);
  });
  it("trapz de una señal constante = área del rectángulo", () => {
    expect(trapz([5, 5, 5, 5], 2)).toBeCloseTo(30, 8); // (n-1)*h*valor
  });
});

describe("percentile (interpolación lineal, igual a numpy)", () => {
  it("reproduce percentiles conocidos de [1,2,3,4]", () => {
    expect(percentile([1, 2, 3, 4], 25)).toBeCloseTo(1.75, 8);
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5, 8);
    expect(percentile([1, 2, 3, 4], 75)).toBeCloseTo(3.25, 8);
  });
});

describe("skewness / kurtosisExcess", () => {
  it("da 0 para una distribución simétrica", () => {
    expect(skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 8);
  });
  it("kurtosis excess de una uniforme discreta es negativa (más plana que normal)", () => {
    expect(kurtosisExcess([1, 2, 3, 4, 5])).toBeLessThan(0);
  });
});

// Valores de referencia en los 4 tests siguientes verificados ejecutando
// directamente shape_features_v2.py (Python real) sobre los mismos fixtures
// — no son suposiciones, son el output real del motor que se está portando.
describe("entropías (valores de referencia verificados contra Python real)", () => {
  it("shannonEntropy de una señal constante ~0 (ruido de punto flotante, igual que Python: -1.44e-12)", () => {
    const v = shannonEntropy([5, 5, 5, 5, 5]);
    expect(v).toBeLessThan(0);
    expect(v).toBeGreaterThan(-1e-9);
  });
  it("permutationEntropy de una secuencia monótona (siempre el mismo patrón) es 0", () => {
    expect(permutationEntropy([1, 2, 3, 4, 5, 6, 7, 8], 3, 1)).toBeCloseTo(
      0,
      8,
    );
  });
  it("sampleEntropy de una señal constante de 10 puntos da 0.2877 (Python: _sample_entropy)", () => {
    expect(sampleEntropy(new Array(10).fill(5))).toBeCloseTo(0.2877, 4);
  });
});

describe("dimensión fractal / Lempel-Ziv (valores de referencia verificados contra Python real)", () => {
  it("higuchiFD de una señal constante degenera a 0.0 (Python: _higuchi_fd)", () => {
    const flat = new Array(20).fill(10);
    expect(higuchiFD(flat)).toBeCloseTo(0.0, 4);
  });
  it("katzFD de una señal constante es 1.0 (Python: _katz_fd)", () => {
    expect(katzFD(new Array(20).fill(10))).toBeCloseTo(1.0, 4);
  });
  it("lempelZiv de una señal perfectamente alternada da 1.9449 (Python: _f08_lempel_ziv) — supera 1.0 por efecto de tamaño finito, el rango (0,1) documentado es orientativo, no una cota dura", () => {
    const alt = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 1 : 0));
    expect(lempelZiv(alt)).toBeCloseTo(1.9449, 4);
  });
});

describe("rfftPSD", () => {
  it("componente DC (k=0) es el cuadrado de la suma de la señal", () => {
    const x = [1, 2, 3, 4];
    const { freqs, psd } = rfftPSD(x, 30);
    expect(freqs[0]).toBe(0);
    expect(psd[0]).toBeCloseTo(
      Math.pow(
        x.reduce((a, b) => a + b, 0),
        2,
      ),
      6,
    );
    expect(psd.length).toBe(3); // floor(4/2)+1
  });
});

describe("findPeaksWithProminence", () => {
  it("detecta un pico único con su prominence y width esperados", () => {
    const x = [0, 0, 5, 0, 0];
    const { peaks, prominences, widths } = findPeaksWithProminence(x, 0.5, 1);
    expect(peaks).toEqual([2]);
    expect(prominences[0]).toBeCloseTo(5, 8);
    expect(widths[0]).toBeCloseTo(1.0, 8);
  });
  it("no detecta picos en una señal plana", () => {
    expect(findPeaksWithProminence([1, 1, 1, 1, 1], 0.1).peaks).toEqual([]);
  });
});
