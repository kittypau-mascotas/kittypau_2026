/**
 * Resampleo a grilla fija de 30s — mismo preprocesamiento que generó
 * comp_stats_v2.json (ver Investigacion/.../app_anotacion_av2.py:316):
 *   df.set_index("ts")["peso_g"].resample("30s").mean().ffill(limit=2)
 *
 * research.md §2: sin esto, las features no son comparables contra las
 * estadísticas calibradas — el z-score de evidenceScore() pierde sentido.
 */
import type { WeightPoint } from "./types";

export const RESAMPLE_S = 30;
const RESAMPLE_MS = RESAMPLE_S * 1000;
const FFILL_LIMIT = 2; // máx. 2 slots (60s) de hueco rellenado por arrastre

/**
 * Bucketiza a intervalos de 30s alineados a época UNIX (equivalente al
 * origin="start_day" de pandas.resample: como 86400s es múltiplo de 30s,
 * ambos anclajes coinciden), promedia por bucket, y arrastra (forward-fill)
 * huecos de hasta 2 slots. Buckets sin dato después del ffill se descartan
 * (extraerFeatures() no puede operar sobre NaN) — ver research.md §2.
 *
 * ponytail: no replica el `drop_duplicates(subset=["ts"])` previo del
 * pipeline Python (dedup por timestamp exacto antes de resamplear) — con
 * timestamps a resolución de milisegundos, un duplicado exacto es
 * prácticamente inexistente en un segmento corto; si aparece, el promedio
 * del bucket ya lo absorbe sin cambiar el resultado de forma perceptible.
 */
export function resampleTo30s(points: WeightPoint[]): number[] {
  if (points.length === 0) return [];

  const sums = new Map<number, { sum: number; count: number }>();
  for (const p of points) {
    const t = new Date(p.recordedAt).getTime();
    const bucket = Math.floor(t / RESAMPLE_MS) * RESAMPLE_MS;
    const acc = sums.get(bucket);
    if (acc) {
      acc.sum += p.weightGrams;
      acc.count += 1;
    } else {
      sums.set(bucket, { sum: p.weightGrams, count: 1 });
    }
  }

  const buckets = [...sums.keys()].sort((a, b) => a - b);
  const first = buckets[0];
  const last = buckets[buckets.length - 1];

  const out: number[] = [];
  let lastValue: number | null = null;
  let gapCount = 0;
  for (let t = first; t <= last; t += RESAMPLE_MS) {
    const acc = sums.get(t);
    if (acc) {
      lastValue = acc.sum / acc.count;
      gapCount = 0;
      out.push(lastValue);
    } else if (lastValue !== null && gapCount < FFILL_LIMIT) {
      gapCount += 1;
      out.push(lastValue);
    }
    // gap > FFILL_LIMIT: bucket se descarta (NaN en pandas, sin ffill)
  }
  return out;
}
