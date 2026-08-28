/**
 * Utilidades matemáticas portadas a mano desde numpy/scipy — sin librería
 * nueva (Ponytail non-negotiable). Cada función referencia la función
 * original de `shape_features_v2.py` que reemplaza. Ver
 * Knowledge/29_Specs/007-evidence-engine-hunger-bar/research.md §3-6.
 */

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Desviación estándar poblacional (ddof=0) — igual que np.std por defecto. */
export function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}

export function diff(arr: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < arr.length; i++) out.push(arr[i] - arr[i - 1]);
  return out;
}

export function sign(x: number): number {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

export function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export function linspace(start: number, end: number, n: number): number[] {
  if (n <= 1) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + step * i);
}

/** np.polyfit(x, y, 1) — regresión lineal por mínimos cuadrados. */
export function polyfit1(
  x: number[],
  y: number[],
): { slope: number; intercept: number } {
  const n = x.length;
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = y.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((a, xi, i) => a + xi * y[i], 0);
  const sxx = x.reduce((a, xi) => a + xi * xi, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/** np.gradient(y, x) con edge_order=1 (default de numpy) y x uniformemente
 * espaciado (paso h). Bordes: diferencia de un solo lado; interior: central. */
export function gradientUniform(y: number[], h: number): number[] {
  const n = y.length;
  if (n < 2) return new Array(n).fill(0);
  const out = new Array(n).fill(0);
  out[0] = (y[1] - y[0]) / h;
  out[n - 1] = (y[n - 1] - y[n - 2]) / h;
  for (let i = 1; i < n - 1; i++) out[i] = (y[i + 1] - y[i - 1]) / (2 * h);
  return out;
}

/** np.trapezoid(y, dx=h) — regla del trapecio. */
export function trapz(y: number[], h: number): number {
  if (y.length < 2) return 0;
  let sum = 0.5 * (y[0] + y[y.length - 1]);
  for (let i = 1; i < y.length - 1; i++) sum += y[i];
  return sum * h;
}

/** np.percentile(arr, p) con interpolación lineal (método default de numpy). */
export function percentile(arr: number[], p: number): number {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return NaN;
  if (n === 1) return s[0];
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  const frac = idx - lo;
  return s[lo] + frac * (s[hi] - s[lo]);
}

export function median(arr: number[]): number {
  return percentile(arr, 50);
}

function argsortIndices(arr: number[]): number[] {
  return arr.map((v, i) => i).sort((a, b) => arr[a] - arr[b]);
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function cosSim(a: number[], b: number[]): number {
  const dot = a.reduce((acc, v, i) => acc + v * b[i], 0);
  const na = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
  const nb = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
  const denom = na * nb;
  return denom > 1e-9 ? dot / denom : 0;
}

// ─── F06 — Entropías ──────────────────────────────────────────────────────

function histogramCounts(arr: number[], bins: number): number[] {
  const counts = new Array(bins).fill(0);
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) {
    counts[Math.floor(bins / 2)] = arr.length;
    return counts;
  }
  const width = (max - min) / bins;
  for (const v of arr) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return counts;
}

/** _shannon_entropy: entropía de Shannon del histograma (10 bins default). */
export function shannonEntropy(arr: number[], nBins = 10): number {
  if (arr.length < 2) return 0;
  const counts = histogramCounts(arr, nBins);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const probs = counts.map((c) => c / total).filter((p) => p > 0);
  return -probs.reduce((acc, p) => acc + p * Math.log2(p + 1e-12), 0);
}

/** _permutation_entropy (Bandt & Pompe 2002), normalizada [0,1]. */
export function permutationEntropy(arr: number[], m = 3, tau = 1): number {
  const n = arr.length;
  if (n < m * tau + 1) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < n - (m - 1) * tau; i++) {
    const window: number[] = [];
    for (let k = 0; k < m; k++) window.push(arr[i + k * tau]);
    const pattern = argsortIndices(window).join(",");
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const probs = [...counts.values()].map((v) => v / total);
  const hMax = m >= 1 ? Math.log2(factorial(m)) : 1.0;
  const h = -probs.reduce((acc, p) => acc + p * Math.log2(p + 1e-12), 0);
  return h / Math.max(hMax, 1e-9);
}

/** _sample_entropy (Richman & Moorman 2000). Limitar arr a ≤60 puntos —
 * responsabilidad del caller (ver F06 en features.ts), igual que en Python. */
export function sampleEntropy(arr: number[], m = 2, rFactor = 0.2): number {
  const n = arr.length;
  const r = rFactor * std(arr) + 1e-9;
  if (n < 2 * (m + 1)) return 0;

  function count(length: number): number {
    let cnt = 0;
    for (let i = 0; i < n - length; i++) {
      for (let j = i + 1; j < n - length; j++) {
        let maxDiff = 0;
        for (let k = 0; k < length; k++) {
          const d = Math.abs(arr[j + k] - arr[i + k]);
          if (d > maxDiff) maxDiff = d;
        }
        if (maxDiff < r) cnt++;
      }
    }
    return cnt;
  }

  const A = count(m + 1);
  const B = count(m);
  if (B === 0) return 0;
  return round4(-Math.log(Math.max(A, 1e-9) / Math.max(B, 1e-9)));
}

// ─── F07 — Dimensión fractal ──────────────────────────────────────────────

/** _higuchi_fd (Higuchi 1988). */
export function higuchiFD(arr: number[], kmax = 5): number {
  const n = arr.length;
  if (n < 2 * kmax + 2) return 1.0;
  const ks = Array.from({ length: kmax }, (_, i) => i + 1);
  const L: number[] = [];
  for (const k of ks) {
    const lk: number[] = [];
    for (let m = 1; m <= k; m++) {
      const sub: number[] = [];
      for (let idx = m - 1; idx < n; idx += k) sub.push(arr[idx]);
      if (sub.length < 2) continue;
      const norm = (n - 1) / (sub.length * k);
      let sumAbsDiff = 0;
      for (let i = 1; i < sub.length; i++)
        sumAbsDiff += Math.abs(sub[i] - sub[i - 1]);
      lk.push(sumAbsDiff * norm);
    }
    if (lk.length) L.push(mean(lk));
  }
  if (L.length < 2) return 1.0;
  const xs = ks.slice(0, L.length).map((k) => Math.log(k));
  const ys = L.map((v) => Math.log(Math.max(v, 1e-12)));
  const { slope } = polyfit1(xs, ys);
  return round4(Math.abs(slope));
}

/** _katz_fd (Katz 1988). O(n). */
export function katzFD(arr: number[]): number {
  const n = arr.length;
  if (n < 2) return 1.0;
  let L = 0;
  for (let i = 1; i < n; i++) L += Math.abs(arr[i] - arr[i - 1]);
  L += 1e-9;
  let d = 0;
  for (let i = 0; i < n; i++) d = Math.max(d, Math.abs(arr[i] - arr[0]));
  d += 1e-9;
  const logN = Math.log10(n);
  const denom = logN + Math.log10(L / d);
  return round4(denom !== 0 ? logN / denom : 1.0);
}

// ─── F08 — Complejidad Lempel-Ziv ─────────────────────────────────────────

export function lempelZiv(arr: number[]): number {
  const n = arr.length;
  if (n < 2) return 0;
  const med = median(arr);
  const binary = arr.map((v) => (v >= med ? "1" : "0")).join("");
  const seen = new Set<string>();
  let i = 0;
  let c = 1;
  while (i < n) {
    let length = 1;
    while (i + length <= n && seen.has(binary.slice(i, i + length))) length++;
    seen.add(binary.slice(i, i + length));
    c += 1;
    i += length;
  }
  const bN = n > 1 ? n / Math.log2(n) : 1.0;
  return round4(c / bN);
}

// ─── F09 — Análisis frecuencial ───────────────────────────────────────────

/**
 * DFT directa O(n²) equivalente a np.fft.rfft — research.md §3: para el
 * tamaño de ventana de un segmento de comida (≤~30 muestras) es más simple
 * y suficientemente rápido que portar un FFT real (Cooley-Tukey).
 * ponytail: si en el futuro se amplía la ventana de análisis a cientos de
 * muestras, reemplazar por un FFT real con zero-padding a potencia de 2.
 */
export function rfftPSD(
  x: number[],
  resampleS: number,
): { freqs: number[]; psd: number[] } {
  const n = x.length;
  const nFreqs = Math.floor(n / 2) + 1;
  const freqs: number[] = [];
  const psd: number[] = [];
  for (let k = 0; k < nFreqs; k++) {
    let re = 0;
    let im = 0;
    for (let j = 0; j < n; j++) {
      const angle = (-2 * Math.PI * k * j) / n;
      re += x[j] * Math.cos(angle);
      im += x[j] * Math.sin(angle);
    }
    psd.push(re * re + im * im);
    freqs.push(k / (n * resampleS));
  }
  return { freqs, psd };
}

// ─── F10 — Estadística robusta ────────────────────────────────────────────

function centralMoment(arr: number[], k: number): number {
  const m = mean(arr);
  return mean(arr.map((v) => (v - m) ** k));
}

/** scipy.stats.skew, bias=True (default) — momento poblacional. */
export function skewness(arr: number[]): number {
  if (arr.length <= 2) return 0;
  const m2 = centralMoment(arr, 2);
  const m3 = centralMoment(arr, 3);
  return m2 > 1e-12 ? m3 / Math.pow(m2, 1.5) : 0;
}

/** scipy.stats.kurtosis, fisher=True + bias=True (defaults) — excess kurtosis. */
export function kurtosisExcess(arr: number[]): number {
  if (arr.length <= 2) return 0;
  const m2 = centralMoment(arr, 2);
  const m4 = centralMoment(arr, 4);
  return m2 > 1e-12 ? m4 / (m2 * m2) - 3 : 0;
}

// ─── F11 — Topología (picos y valles) ─────────────────────────────────────

/** Picos locales, con manejo de plateaus — replica scipy `_local_maxima_1d`. */
function localMaxima(x: number[]): number[] {
  const n = x.length;
  const peaks: number[] = [];
  let i = 1;
  while (i < n - 1) {
    if (x[i - 1] < x[i]) {
      let iAhead = i + 1;
      while (iAhead < n - 1 && x[iAhead] === x[i]) iAhead++;
      if (x[iAhead] < x[i]) {
        const midpoint = Math.floor((i + (iAhead - 1)) / 2);
        peaks.push(midpoint);
        i = iAhead;
      } else {
        i = iAhead;
      }
    } else {
      i++;
    }
  }
  return peaks;
}

/** Replica scipy `_peak_prominences`: extiende desde el pico mientras los
 * valores se mantienen ≤ su altura, hasta topar con un valor mayor o el
 * borde del array — el mínimo visto en ese tramo es la "base" del lado. */
function prominenceSide(
  x: number[],
  peak: number,
  dir: 1 | -1,
): { minVal: number; baseIdx: number } {
  const n = x.length;
  let i = peak;
  let minVal = x[peak];
  let baseIdx = peak;
  while (true) {
    i += dir;
    if (i < 0 || i >= n) break;
    if (x[i] > x[peak]) break;
    if (x[i] <= minVal) {
      minVal = x[i];
      baseIdx = i;
    }
  }
  return { minVal, baseIdx };
}

/** Replica scipy `_peak_widths` a rel_height=0.5 (default). */
function peakWidth(
  x: number[],
  peak: number,
  prominence: number,
  leftBase: number,
  rightBase: number,
  relHeight = 0.5,
): number {
  const height = x[peak] - prominence * relHeight;

  let iLeft = peak;
  while (iLeft > leftBase && x[iLeft] > height) iLeft--;
  let leftInterp = iLeft;
  if (iLeft < peak && x[iLeft] < height) {
    const x0 = x[iLeft];
    const x1 = x[iLeft + 1];
    if (x1 !== x0) leftInterp = iLeft + (height - x0) / (x1 - x0);
  }

  let iRight = peak;
  while (iRight < rightBase && x[iRight] > height) iRight++;
  let rightInterp = iRight;
  if (iRight > peak && x[iRight] < height) {
    const x0 = x[iRight - 1];
    const x1 = x[iRight];
    if (x1 !== x0) rightInterp = iRight - 1 + (height - x0) / (x1 - x0);
  }

  return rightInterp - leftInterp;
}

export type PeaksResult = {
  peaks: number[];
  prominences: number[];
  widths: number[];
};

/** Port a mano de scipy.signal.find_peaks(x, prominence=minProminence, width=minWidth). */
export function findPeaksWithProminence(
  x: number[],
  minProminence: number,
  minWidth = 1,
): PeaksResult {
  const candidates = localMaxima(x);
  const peaks: number[] = [];
  const prominences: number[] = [];
  const widths: number[] = [];
  for (const p of candidates) {
    const left = prominenceSide(x, p, -1);
    const right = prominenceSide(x, p, 1);
    const prominence = x[p] - Math.max(left.minVal, right.minVal);
    if (prominence < minProminence) continue;
    const width = peakWidth(x, p, prominence, left.baseIdx, right.baseIdx);
    if (width < minWidth) continue;
    peaks.push(p);
    prominences.push(prominence);
    widths.push(width);
  }
  return { peaks, prominences, widths };
}
