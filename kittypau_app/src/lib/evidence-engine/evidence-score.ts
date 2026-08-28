/**
 * Port 1:1 de `evidence_score()` / `compute_data_driven_weights()` /
 * `_normalize_feats()` / `_pooled_mean_std()` de
 * Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py.
 *
 * ponytail: no se porta el fallback legado `EVIDENCE_WEIGHTS` (pesos a mano
 * sobre 26 features sin normalizar, 49-58% accuracy) — en Python existe para
 * un "cold start" sin `comp_stats_v2.json` generado aún; en esta app
 * `comp_stats_v2.json` va bundleado en el build (ver research.md §7), así
 * que ese escenario no existe acá. Si algún día se necesita un fallback sin
 * datos calibrados, portar `EVIDENCE_WEIGHTS` es el upgrade path.
 */
import { extraerFeatures } from "./features";
import { RESAMPLE_S, resampleTo30s } from "./resample";
import compStatsData from "./comp_stats_v2.json";
import type {
  CompStats,
  EvidenceCategory,
  EvidenceResult,
  FeatureMap,
  WeightPoint,
} from "./types";

const CATEGORIES: EvidenceCategory[] = ["alimentacion", "servido", "ruido"];

// Perfil de referencia calibrado — copia versionada de
// Investigacion/Ciclo_Alpha_v2/fase_0_ruido/data/comp_stats_v2.json (research.md
// §7). Recalibrar = reemplazar este archivo (FR-006/SC-004), sin tocar código.
const COMP_STATS = compStatsData as CompStats;

// FR-007: mismo piso que `_evidence_ventana_cached` en investigación
// (`len(sub) < 3` → sin clasificar) — evidencia insuficiente para features
// confiables, no se fuerza una categoría de baja confianza.
const MIN_SAMPLES_AFTER_RESAMPLE = 3;

/** Tupla de pesos [alimentacion, servido, ruido] para un feature — espejo de
 * la tupla `(w_alim, w_serv, w_ruido)` de `EVIDENCE_WEIGHTS`/
 * `compute_data_driven_weights()` en Python. */
type WeightTriple = [number, number, number];

function pooledMeanStd(
  compStats: CompStats,
  fname: string,
): { mean: number; std: number } {
  const perCat = compStats[fname] ?? {};
  let totalN = 0;
  let weightedMean = 0;
  for (const cat of CATEGORIES) {
    const st = perCat[cat];
    const n = st?.n ?? 0;
    if (n) {
      weightedMean += st!.mean * n;
      totalN += n;
    }
  }
  if (totalN === 0) return { mean: 0, std: 1 };
  const pooledMean = weightedMean / totalN;
  let pooledVar = 0;
  for (const cat of CATEGORIES) {
    const st = perCat[cat];
    const n = st?.n ?? 0;
    if (n) pooledVar += n * (st!.std ** 2 + (st!.mean - pooledMean) ** 2);
  }
  pooledVar /= totalN;
  const pooledStd = Math.sqrt(pooledVar);
  return { mean: pooledMean, std: pooledStd > 1e-9 ? pooledStd : 1 };
}

/**
 * Discriminante tipo Fisher sobre valores normalizados, calculado
 * directamente desde `comp_stats_v2.json` — cubre las 102 features (no solo
 * las 26 de EVIDENCE_WEIGHTS). Recalcular es barato; queda al día
 * automáticamente cuando se reemplaza `comp_stats_v2.json` (FR-006).
 */
export function computeDataDrivenWeights(
  compStats: CompStats,
): Record<string, WeightTriple> {
  const weights: Record<string, WeightTriple> = {};
  for (const fname of Object.keys(compStats)) {
    const perCat = compStats[fname] ?? {};
    const { mean: pooledMean, std: pooledStd } = pooledMeanStd(
      compStats,
      fname,
    );
    const row: number[] = [];
    for (const cat of CATEGORIES) {
      const st = perCat[cat];
      const nCat = st?.n ?? 0;
      if (!nCat) {
        row.push(0);
        continue;
      }
      const meanCatN = (st!.mean - pooledMean) / pooledStd;
      let restN = 0;
      let restWeightedMean = 0;
      for (const other of CATEGORIES) {
        if (other === cat) continue;
        const ost = perCat[other];
        const on = ost?.n ?? 0;
        if (on) {
          restWeightedMean += ost!.mean * on;
          restN += on;
        }
      }
      const meanRest = restN ? restWeightedMean / restN : pooledMean;
      const meanRestN = (meanRest - pooledMean) / pooledStd;
      row.push(Math.round((meanCatN - meanRestN) * 10000) / 10000);
    }
    weights[fname] = row as WeightTriple;
  }
  return weights;
}

function normalizeFeats(feats: FeatureMap, compStats: CompStats): FeatureMap {
  const normed: FeatureMap = {};
  for (const [fname, val] of Object.entries(feats)) {
    if (typeof val !== "number" || Number.isNaN(val)) continue;
    const { mean, std } = pooledMeanStd(compStats, fname);
    normed[fname] = (val - mean) / std;
  }
  return normed;
}

/**
 * Calcula el score de evidencia para cada hipótesis — 1:1 con
 * `evidence_score(feats, comp_stats)` de shape_features_v2.py (rama con
 * comp_stats, la única portada acá — ver comentario `ponytail:` arriba).
 */
export function evidenceScore(
  feats: FeatureMap,
  compStats: CompStats,
): EvidenceResult {
  const weights = computeDataDrivenWeights(compStats);
  const featsUsed = normalizeFeats(feats, compStats);

  const raw: Record<EvidenceCategory, number> = {
    alimentacion: 0,
    servido: 0,
    ruido: 0.5,
  };
  for (const [fname, [wA, wS, wR]] of Object.entries(weights)) {
    const val = featsUsed[fname] ?? 0;
    raw.alimentacion += wA * val;
    raw.servido += wS * val;
    raw.ruido += wR * val;
  }

  const vals = [raw.alimentacion, raw.servido, raw.ruido];
  const maxVal = Math.max(...vals);
  const expV = vals.map((v) => Math.exp(v - maxVal));
  const sumExp = expV.reduce((a, b) => a + b, 0);
  const probs = expV.map((v) => v / sumExp);

  let bestI = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[bestI]) bestI = i;
  const prediccion = CATEGORIES[bestI];
  const confianza = Math.round(probs[bestI] * 1000) / 1000;

  const influencia: Record<string, number> = {};
  for (const [fname, ws] of Object.entries(weights)) {
    influencia[fname] = Math.abs(ws[bestI] * (featsUsed[fname] ?? 0));
  }
  const top3 = Object.keys(influencia)
    .sort((a, b) => influencia[b] - influencia[a])
    .slice(0, 3);

  return {
    scoreAlimentacion: Math.round(probs[0] * 1000) / 1000,
    scoreServido: Math.round(probs[1] * 1000) / 1000,
    scoreRuido: Math.round(probs[2] * 1000) / 1000,
    prediccion,
    confianza,
    razon: `Features clave: ${top3.join(", ")}`,
  };
}

/**
 * Punto de entrada usado por `hunger-bar.ts`: clasifica un segmento crudo de
 * peso (sin resamplear) usando el Evidence Engine real ya calibrado
 * (`comp_stats_v2.json` bundleado). `null` si hay muy pocas muestras tras el
 * resampleo para extraer features confiables (FR-007) — el caller lo trata
 * como "no es alimentación", igual que hace `_evidence_ventana_cached` en
 * investigación con sus `< 3 muestras`.
 */
export function classifyWeightSegment(
  weights: WeightPoint[],
): { category: EvidenceCategory; confidence: number } | null {
  const resampled = resampleTo30s(weights);
  if (resampled.length < MIN_SAMPLES_AFTER_RESAMPLE) return null;
  const feats = extraerFeatures(resampled, RESAMPLE_S);
  const result = evidenceScore(feats, COMP_STATS);
  return { category: result.prediccion, confidence: result.confianza };
}
