/**
 * Port 1:1 de `extraer_features()` de
 * Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py — 102
 * features en 15 familias (F00-F14). Cada familia acá replica exactamente
 * la función `_fNN_*` correspondiente del Python original; no se reordenó
 * ni simplificó ninguna fórmula. Ver
 * Knowledge/29_Specs/007-evidence-engine-hunger-bar/{research,data-model}.md.
 */
import {
  cosSim,
  diff,
  gradientUniform,
  higuchiFD,
  katzFD,
  kurtosisExcess,
  lempelZiv,
  linspace,
  mean,
  median,
  percentile,
  permutationEntropy,
  polyfit1,
  rfftPSD,
  round4,
  sampleEntropy,
  shannonEntropy,
  sign,
  skewness,
  std,
  trapz,
  findPeaksWithProminence,
} from "./math-utils";
import type { FeatureMap } from "./types";

function argmax(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}
function argmin(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[best]) best = i;
  return best;
}

// ─── F00 — Features clásicas base ──────────────────────────────────────────

function f00Clasicas(valores: number[]): FeatureMap {
  const n = valores.length;
  const dy = diff(valores);
  const monotonicity = dy.length > 0 ? mean(dy.map(sign)) : 0;

  const x = Array.from({ length: n }, (_, i) => i);
  const { slope, intercept } = polyfit1(x, valores);
  const fitted = x.map((xi) => slope * xi + intercept);
  const ssRes = valores.reduce((a, v, i) => a + (v - fitted[i]) ** 2, 0);
  const m = mean(valores);
  const ssTot = valores.reduce((a, v) => a + (v - m) ** 2, 0);
  const r2 = ssTot > 1e-6 ? round4(1 - ssRes / ssTot) : 0;

  const signDy = dy.map(sign);
  const zcr =
    dy.length > 1
      ? round4(
          diff(signDy).filter((d) => d !== 0).length / Math.max(dy.length, 1),
        )
      : 0;

  const vDelta = valores.map((v) => v - valores[0]);
  const vAbsMax = Math.max(...vDelta.map(Math.abs)) + 1e-6;
  const vNorm = vDelta.map((v) => v / vAbsMax);
  const simAlim = round4(cosSim(vNorm, linspace(0, -1, n)));
  const simServ = round4(cosSim(vNorm, linspace(0, 1, n)));

  return {
    monotonicity: round4(monotonicity),
    r2_lineal: r2,
    zcr,
    sim_alimentacion: simAlim,
    sim_servido: simServ,
  };
}

// ─── F01 — Geometría diferencial ───────────────────────────────────────────

function statsArr(arr: number[], prefix: string): FeatureMap {
  if (arr.length === 0) {
    return {
      [`${prefix}_mean`]: 0,
      [`${prefix}_std`]: 0,
      [`${prefix}_max`]: 0,
      [`${prefix}_min`]: 0,
      [`${prefix}_energy`]: 0,
      [`${prefix}_rms`]: 0,
    };
  }
  return {
    [`${prefix}_mean`]: round4(mean(arr)),
    [`${prefix}_std`]: round4(std(arr)),
    [`${prefix}_max`]: round4(Math.max(...arr)),
    [`${prefix}_min`]: round4(Math.min(...arr)),
    [`${prefix}_energy`]: round4(arr.reduce((a, v) => a + v * v, 0)),
    [`${prefix}_rms`]: round4(Math.sqrt(mean(arr.map((v) => v * v)))),
  };
}

function f01Derivadas(valores: number[], resampleS: number): FeatureMap {
  const dy = diff(valores).map((v) => v / resampleS);
  const d2y = dy.length > 1 ? diff(dy).map((v) => v / resampleS) : [0];
  const d3y = d2y.length > 1 ? diff(d2y).map((v) => v / resampleS) : [0];

  const out: FeatureMap = {
    ...statsArr(dy, "d1"),
    ...statsArr(d2y, "d2"),
    ...statsArr(d3y, "d3"),
  };

  out.d1_n_sign_changes =
    dy.length > 1 ? diff(dy.map(sign)).filter((d) => d !== 0).length : 0;
  out.d2_n_sign_changes =
    d2y.length > 1 ? diff(d2y.map(sign)).filter((d) => d !== 0).length : 0;
  out.d1_frac_pos =
    dy.length > 0 ? round4(mean(dy.map((v) => (v > 0 ? 1 : 0)))) : 0;
  out.d1_frac_neg =
    dy.length > 0 ? round4(mean(dy.map((v) => (v < 0 ? 1 : 0)))) : 0;

  return out;
}

// ─── F02 — Curvatura κ ──────────────────────────────────────────────────────

function f02Curvatura(valores: number[], resampleS: number): FeatureMap {
  const n = valores.length;
  if (n < 4) {
    return {
      curvature_mean: 0,
      curvature_max: 0,
      curvature_min: 0,
      curvature_std: 0,
      curvature_integral: 0,
    };
  }
  const dy = gradientUniform(valores, resampleS);
  const d2y = gradientUniform(dy, resampleS);
  const kappa = d2y.map((v, i) => Math.abs(v) / Math.pow(1 + dy[i] ** 2, 1.5));

  return {
    curvature_mean: Math.round(mean(kappa) * 1e6) / 1e6,
    curvature_max: Math.round(Math.max(...kappa) * 1e6) / 1e6,
    curvature_min: Math.round(Math.min(...kappa) * 1e6) / 1e6,
    curvature_std: Math.round(std(kappa) * 1e6) / 1e6,
    curvature_integral: round4(trapz(kappa, resampleS)),
  };
}

// ─── F03 — Longitud de arco ─────────────────────────────────────────────────

function f03Arco(valores: number[], resampleS: number): FeatureMap {
  const n = valores.length;
  if (n < 2) {
    return {
      arc_length: 0,
      arc_length_per_min: 0,
      arc_vs_displacement: 1,
      arc_per_n: 0,
    };
  }
  const dx = resampleS;
  const dy = diff(valores);
  const segs = dy.map((d) => Math.sqrt(dx * dx + d * d));
  const L = segs.reduce((a, b) => a + b, 0);
  const durMin = ((n - 1) * resampleS) / 60;
  const disp = Math.abs(valores[n - 1] - valores[0]);

  return {
    arc_length: Math.round(L * 1000) / 1000,
    arc_length_per_min: Math.round((L / Math.max(durMin, 1e-6)) * 1000) / 1000,
    arc_vs_displacement: Math.round((L / Math.max(disp, 1e-6)) * 1000) / 1000,
    arc_per_n: Math.round((L / n) * 1000) / 1000,
  };
}

// ─── F04 — Tortuosidad ──────────────────────────────────────────────────────

function f04Tortuosidad(valores: number[], resampleS: number): FeatureMap {
  const n = valores.length;
  const arc = f03Arco(valores, resampleS);
  const L = arc.arc_length;
  const durS = (n - 1) * resampleS;
  const disp = Math.abs(valores[n - 1] - valores[0]);
  const direct = Math.sqrt(durS * durS + disp * disp) + 1e-9;
  const tortuosity = L / direct;
  const straightness = Math.min(1, direct / Math.max(L, 1e-9));
  return { tortuosity: round4(tortuosity), straightness: round4(straightness) };
}

// ─── F05 — Energía ──────────────────────────────────────────────────────────

function f05Energia(valores: number[], resampleS: number): FeatureMap {
  const dy = diff(valores).map((v) => v / resampleS);
  const d2y = dy.length > 1 ? diff(dy).map((v) => v / resampleS) : [0];
  const eSig = valores.reduce((a, v) => a + v * v, 0);
  const eD1 = dy.reduce((a, v) => a + v * v, 0);

  return {
    energy_signal: Math.round(eSig * 100) / 100,
    energy_d1: round4(eD1),
    energy_d2: round4(d2y.reduce((a, v) => a + v * v, 0)),
    rms_signal:
      Math.round(Math.sqrt(mean(valores.map((v) => v * v))) * 1000) / 1000,
    rms_d1: round4(Math.sqrt(mean(dy.map((v) => v * v)))),
    energy_ratio_d1_signal:
      Math.round((eD1 / Math.max(eSig, 1e-9)) * 1e6) / 1e6,
  };
}

// ─── F06 — Entropías ────────────────────────────────────────────────────────

function f06Entropias(valores: number[]): FeatureMap {
  const arrShort = valores.slice(0, Math.min(valores.length, 60));
  return {
    entropy_shannon: round4(shannonEntropy(valores)),
    entropy_permutation: round4(permutationEntropy(valores, 3)),
    entropy_sample: sampleEntropy(arrShort, 2, 0.2),
  };
}

// ─── F07 — Dimensión fractal ────────────────────────────────────────────────

function f07Fractal(valores: number[]): FeatureMap {
  return { fractal_higuchi: higuchiFD(valores), fractal_katz: katzFD(valores) };
}

// ─── F08 — Complejidad Lempel-Ziv ───────────────────────────────────────────

function f08LempelZiv(valores: number[]): FeatureMap {
  return { lempel_ziv: lempelZiv(valores) };
}

// ─── F09 — Análisis frecuencial ─────────────────────────────────────────────

function f09Frecuencial(valores: number[], resampleS: number): FeatureMap {
  const n = valores.length;
  const zero: FeatureMap = {
    freq_dominant_hz: 0,
    freq_centroid_hz: 0,
    power_ratio_low: 0,
    autocorr_lag1: 0,
    autocorr_lag3: 0,
    autocorr_lag5: 0,
    spectral_entropy: 0,
  };
  if (n < 4) return zero;

  const fs = 1 / resampleS;
  const m = mean(valores);
  const { freqs, psd } = rfftPSD(
    valores.map((v) => v - m),
    resampleS,
  );

  const domIdx = psd.length > 1 ? argmax(psd.slice(1)) + 1 : 0;
  const freqDominant = domIdx < freqs.length ? freqs[domIdx] : 0;

  const totalPower = psd.reduce((a, b) => a + b, 0);
  const freqCentroid =
    totalPower > 0
      ? psd.reduce((a, p, i) => a + freqs[i] * p, 0) / totalPower
      : 0;

  const lowThreshold = fs / 4;
  const powerLow = psd.reduce(
    (a, p, i) => a + (freqs[i] < lowThreshold ? p : 0),
    0,
  );
  const powerRatioLow = powerLow / Math.max(totalPower, 1e-9);

  const psdN = psd
    .map((p) => p / Math.max(totalPower, 1e-9))
    .filter((p) => p > 0);
  const spEntropy = -psdN.reduce((a, p) => a + p * Math.log2(p + 1e-12), 0);

  function acf(lag: number): number {
    if (valores.length <= lag) return 0;
    const xc = valores.map((v) => v - m);
    const varXc = mean(xc.map((v) => v * v)); // np.var: población, mean(xc)=0
    if (varXc <= 1e-9) return 0;
    return (
      mean(xc.slice(0, xc.length - lag).map((v, i) => v * xc[i + lag])) / varXc
    );
  }

  return {
    freq_dominant_hz: Math.round(freqDominant * 1e6) / 1e6,
    freq_centroid_hz: Math.round(freqCentroid * 1e6) / 1e6,
    power_ratio_low: round4(powerRatioLow),
    autocorr_lag1: round4(acf(1)),
    autocorr_lag3: round4(acf(3)),
    autocorr_lag5: round4(acf(5)),
    spectral_entropy: round4(spEntropy),
  };
}

// ─── F10 — Estadística robusta ──────────────────────────────────────────────

function f10Robusta(valores: number[]): FeatureMap {
  const q75 = percentile(valores, 75);
  const q25 = percentile(valores, 25);
  const med = median(valores);
  const mad = median(valores.map((v) => Math.abs(v - med)));
  const sk = valores.length > 2 ? skewness(valores) : 0;
  const ku = valores.length > 2 ? kurtosisExcess(valores) : 0;

  const n10 = Math.max(1, Math.floor(valores.length * 0.1));
  const sorted = [...valores].sort((a, b) => a - b);
  const trimmed =
    valores.length > 2 * n10 ? sorted.slice(n10, sorted.length - n10) : valores;
  const m = mean(valores);
  const cv = std(valores) / Math.max(Math.abs(m), 1e-9);

  return {
    stat_median: Math.round(med * 1000) / 1000,
    stat_mad: Math.round(mad * 1000) / 1000,
    stat_iqr: Math.round((q75 - q25) * 1000) / 1000,
    stat_skewness: round4(sk),
    stat_kurtosis: round4(ku),
    stat_trimmed_mean: Math.round(mean(trimmed) * 1000) / 1000,
    stat_cv: round4(cv),
  };
}

// ─── F11 — Topología (picos y valles) ───────────────────────────────────────

function f11Topologia(valores: number[], resampleS: number): FeatureMap {
  const n = valores.length;
  if (n < 4) {
    return {
      n_maxima: 0,
      n_minima: 0,
      n_plateaus: 0,
      peak_prominence_mean: 0,
      peak_width_mean: 0,
      peak_density: 0,
      peak_height_max: 0,
      valley_depth_min: 0,
    };
  }
  const minProm = Math.max(std(valores) * 0.3, 0.5);
  const peaksRes = findPeaksWithProminence(valores, minProm, 1);
  const valleysRes = findPeaksWithProminence(
    valores.map((v) => -v),
    minProm,
    1,
  );

  const w = Math.min(5, n);
  const half = Math.floor(w / 2);
  const plaMask = valores.map(
    (_, i) =>
      std(valores.slice(Math.max(0, i - half), Math.min(n, i + half + 1))) <
      0.5,
  );
  let nPlateaus = 0;
  for (let i = 1; i < plaMask.length; i++) {
    if (Number(plaMask[i]) - Number(plaMask[i - 1]) > 0) nPlateaus++;
  }
  const durMin = ((n - 1) * resampleS) / 60;

  return {
    n_maxima: peaksRes.peaks.length,
    n_minima: valleysRes.peaks.length,
    n_plateaus: nPlateaus,
    peak_prominence_mean:
      peaksRes.peaks.length > 0
        ? Math.round(mean(peaksRes.prominences) * 1000) / 1000
        : 0,
    peak_width_mean:
      peaksRes.peaks.length > 0
        ? Math.round(((mean(peaksRes.widths) * resampleS) / 60) * 1000) / 1000
        : 0,
    peak_density:
      Math.round((peaksRes.peaks.length / Math.max(durMin, 0.5)) * 1000) / 1000,
    peak_height_max:
      peaksRes.peaks.length > 0
        ? Math.round(Math.max(...peaksRes.peaks.map((i) => valores[i])) * 100) /
          100
        : Math.round(Math.max(...valores) * 100) / 100,
    valley_depth_min:
      valleysRes.peaks.length > 0
        ? Math.round(
            Math.min(...valleysRes.peaks.map((i) => valores[i])) * 100,
          ) / 100
        : Math.round(Math.min(...valores) * 100) / 100,
  };
}

// ─── F12 — Ajuste a templates canónicos ─────────────────────────────────────

const TPL_NAMES = [
  "tpl_ramp_down",
  "tpl_exp_decay",
  "tpl_alim_lenta",
  "tpl_alim_escalonada",
  "tpl_ramp_up",
  "tpl_exp_rise",
  "tpl_sigmoide",
  "tpl_serv_brusco",
  "tpl_plateau",
  "tpl_triangular",
  "tpl_parabola_down",
  "tpl_doble_rampa",
] as const;

function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  const frac = x - floor;
  if (frac < 0.5) return floor;
  if (frac > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

function normSeg(valores: number[]): number[] {
  const v = valores.map((x) => x - valores[0]);
  const vMax = Math.max(...v.map(Math.abs)) + 1e-6;
  return v.map((x) => x / vMax);
}

function makeTemplates(
  n: number,
): Record<(typeof TPL_NAMES)[number], number[]> {
  const t = linspace(0, 1, n);
  const thirdLen = Math.max(1, Math.floor(n / 3));
  const serv = [
    ...linspace(0, 1, thirdLen),
    ...new Array(n - thirdLen).fill(1),
  ];
  const doble = [
    ...new Array(Math.floor(n / 3)).fill(0),
    ...linspace(0, -1, n - Math.floor(n / 3)),
  ];

  return {
    tpl_ramp_down: linspace(0, -1, n),
    tpl_exp_decay: t.map((ti) => -(1 - Math.exp(-3 * ti))),
    tpl_alim_lenta: t.map((ti) => -Math.sqrt(ti)),
    tpl_alim_escalonada: t.map((ti) => -roundHalfEven(ti * 4) / 4),
    tpl_ramp_up: linspace(0, 1, n),
    tpl_exp_rise: t.map((ti) => 1 - Math.exp(-3 * ti)),
    tpl_sigmoide: t.map((ti) => 2 / (1 + Math.exp(-6 * (ti - 0.5))) - 1),
    tpl_serv_brusco: serv.map((v) => v - serv[0]),
    tpl_plateau: new Array(n).fill(0),
    tpl_triangular: t.map((ti) => Math.abs(2 * ti - 1) - 1),
    tpl_parabola_down: t.map((ti) => -(4 * ti * (1 - ti))),
    tpl_doble_rampa: doble,
  };
}

function f12Templates(valores: number[]): FeatureMap {
  const n = valores.length;
  if (n < 3) {
    const out: FeatureMap = {};
    for (const name of TPL_NAMES) out[name] = 0;
    return out;
  }
  const vNorm = normSeg(valores);
  const templates = makeTemplates(n);
  const out: FeatureMap = {};
  for (const name of TPL_NAMES) {
    const tpl = templates[name];
    const tplRel = tpl.map((v) => v - tpl[0]);
    const tplMax = Math.max(...tplRel.map(Math.abs)) + 1e-6;
    const tplNorm = tplRel.map((v) => v / tplMax);
    out[name] = round4(cosSim(vNorm, tplNorm));
  }
  return out;
}

// ─── F13 — Dinámica temporal ─────────────────────────────────────────────────

const F13_ZERO_KEYS = [
  "time_to_max_s",
  "time_to_min_s",
  "time_to_25pct_s",
  "time_to_50pct_s",
  "time_to_75pct_s",
  "rise_time_s",
  "fall_time_s",
  "settling_time_s",
  "overshoot_g",
  "undershoot_g",
  "initial_slope_g_min",
  "final_slope_g_min",
];

function f13Dinamica(valores: number[], resampleS: number): FeatureMap {
  const n = valores.length;
  if (n < 3) {
    const out: FeatureMap = {};
    for (const k of F13_ZERO_KEYS) out[k] = 0;
    return out;
  }
  const times = Array.from({ length: n }, (_, i) => i * resampleS);
  const v0 = valores[0];
  const vf = valores[n - 1];
  const delta = vf - v0;
  const idxMax = argmax(valores);
  const idxMin = argmin(valores);

  function tPct(pct: number): number {
    if (Math.abs(delta) < 0.1) return times[n - 1];
    const target = v0 + pct * delta;
    const idx = argmin(valores.map((v) => Math.abs(v - target)));
    return times[idx];
  }
  const t10 = tPct(0.1);
  const t25 = tPct(0.25);
  const t50 = tPct(0.5);
  const t75 = tPct(0.75);
  const t90 = tPct(0.9);

  const band = Math.max(Math.abs(delta) * 0.02, 0.5);
  const settled = valores.map((v) => Math.abs(v - vf) <= band);
  let settlingIdx = n - 1;
  for (let i = n - 1; i >= 0; i--) {
    if (!settled[i]) {
      settlingIdx = Math.min(i + 1, n - 1);
      break;
    }
  }

  const maxV = Math.max(...valores);
  const minV = Math.min(...valores);
  let overshoot: number;
  if (delta > 0) {
    overshoot = Math.max(0, maxV - vf);
  } else {
    overshoot = Math.max(0, maxV - v0);
  }
  const undershoot = Math.max(0, v0 - minV);

  const n20 = Math.max(2, Math.floor(n / 5));
  const xm = Array.from({ length: n20 }, (_, i) => (i * resampleS) / 60);
  const initSlope = n20 >= 2 ? polyfit1(xm, valores.slice(0, n20)).slope : 0;
  const finalSlope = n20 >= 2 ? polyfit1(xm, valores.slice(n - n20)).slope : 0;

  return {
    time_to_max_s: Math.round(times[idxMax] * 10) / 10,
    time_to_min_s: Math.round(times[idxMin] * 10) / 10,
    time_to_25pct_s: Math.round(t25 * 10) / 10,
    time_to_50pct_s: Math.round(t50 * 10) / 10,
    time_to_75pct_s: Math.round(t75 * 10) / 10,
    rise_time_s: Math.round(Math.abs(t90 - t10) * 10) / 10,
    fall_time_s: Math.round(Math.abs(t90 - t10) * 10) / 10,
    settling_time_s: Math.round(times[settlingIdx] * 10) / 10,
    overshoot_g: Math.round(overshoot * 100) / 100,
    undershoot_g: Math.round(undershoot * 100) / 100,
    initial_slope_g_min: Math.round(initSlope * 1000) / 1000,
    final_slope_g_min: Math.round(finalSlope * 1000) / 1000,
  };
}

// ─── F14 — Features derivadas (índices compuestos) ──────────────────────────

function f14Compuestos(
  valores: number[],
  resampleS: number,
  prev: FeatureMap,
): FeatureMap {
  const durMin = ((valores.length - 1) * resampleS) / 60;
  const deltaA = Math.abs(valores[valores.length - 1] - valores[0]);
  const arc = prev.arc_length ?? 1.0;
  const eD1 = prev.energy_d1 ?? 0.0;
  const entS = prev.entropy_sample ?? 0.0;
  const fdH = prev.fractal_higuchi ?? 1.0;
  const r2 = prev.r2_lineal ?? 0.0;
  const mono = Math.abs(prev.monotonicity ?? 0.0);

  let bestTpl = 0;
  for (const [k, v] of Object.entries(prev)) {
    if (k.startsWith("tpl_") && Math.abs(v) > bestTpl) bestTpl = Math.abs(v);
  }

  return {
    idx_arc_per_delta: round4(arc / Math.max(deltaA, 1.0)),
    idx_energy_per_min: round4(eD1 / Math.max(durMin, 0.5)),
    idx_complexity: round4(entS * fdH),
    idx_linearity: round4(r2 * mono),
    idx_template_max: round4(bestTpl),
    idx_shape_noise: round4(
      (prev.fractal_higuchi ?? 1.0) * (prev.lempel_ziv ?? 0.5),
    ),
  };
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Extrae el vector completo de 102 features para un segmento de peso ya
 * resampleado a paso fijo — 1:1 con `extraer_features()` de
 * shape_features_v2.py.
 *
 * @param valoresRaw lecturas de peso (g), sin NaN, paso fijo `resampleS`
 * @param resampleS segundos entre lecturas (30s — cadencia KPCL, ver resample.ts)
 */
export function extraerFeatures(
  valoresRaw: number[],
  resampleS = 30,
): FeatureMap {
  const valores = valoresRaw;
  if (valores.length < 2) return {};

  let out: FeatureMap = {};
  out = { ...out, ...f00Clasicas(valores) };
  out = { ...out, ...f01Derivadas(valores, resampleS) };
  out = { ...out, ...f02Curvatura(valores, resampleS) };
  out = { ...out, ...f03Arco(valores, resampleS) };
  out = { ...out, ...f04Tortuosidad(valores, resampleS) };
  out = { ...out, ...f05Energia(valores, resampleS) };
  out = { ...out, ...f06Entropias(valores) };
  out = { ...out, ...f07Fractal(valores) };
  out = { ...out, ...f08LempelZiv(valores) };
  out = { ...out, ...f09Frecuencial(valores, resampleS) };
  out = { ...out, ...f10Robusta(valores) };
  out = { ...out, ...f11Topologia(valores, resampleS) };
  out = { ...out, ...f12Templates(valores) };
  out = { ...out, ...f13Dinamica(valores, resampleS) };
  out = { ...out, ...f14Compuestos(valores, resampleS, out) };

  return out;
}
