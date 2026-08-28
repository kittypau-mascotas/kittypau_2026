/**
 * Hunger Bar — detección de comidas y estimación de "próxima comida" a partir
 * de `readings` crudas, sin depender de `device_bowl_sessions` (manual) ni de
 * `pet_sessions` (DB analytics opcional/legado).
 *
 * La clasificación de segmentos (¿fue alimentación real, servido, o ruido?)
 * usa el Evidence Engine real portado en `./evidence-engine/` — mismo motor
 * calibrado (102 features en 15 familias + softmax con discriminante de
 * Fisher) que ya corre en Investigacion/Ciclo_Alpha_v2/fase_0_ruido/
 * shape_features_v2.py, 80% accuracy fuera de muestra. Ver
 * Knowledge/29_Specs/007-evidence-engine-hunger-bar/. La detección de
 * SEGMENTOS (qué ventana de tiempo es candidata) es un problema aparte y
 * sigue siendo la máquina de estados de `detectSegments()` de abajo, sin
 * cambios — solo cambió cómo se decide la categoría de cada segmento ya
 * detectado.
 *
 * Constantes de calibración: medidas sobre 254 comidas anotadas de KPCL0034
 * ("Bandida"), abril–julio 2026 — ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md.
 */
import { classifyWeightSegment } from "./evidence-engine/evidence-score";

export const SESSION_THRESHOLD_G = 5; // mismo umbral ya probado en bridge/src/processor.js
export const STABLE_TOLERANCE_G = 3;
export const STABLE_COUNT = 2;

// Filtro de intervalos entre comidas — mismas constantes que
// app_anotacion_av2.py (MIN_INTERVALO_H/MAX_INTERVALO_H).
export const MIN_INTERVALO_H = 0.33; // 20 min: probable misma comida partida en dos
export const MAX_INTERVALO_H = 36.0; // gap de datos / ausencia del dueño

export const N_MIN_MUESTRAS = 5; // comidas mínimas del propio pet antes de dejar el fallback
export const FALLBACK_MEDIANA_H = 5.78; // mediana global real, 249 intervalos válidos KPCL0034

// Clamp de display de la barra en vivo (distinto del filtro de outliers de arriba):
// evita mostrar "próxima comida en 36h" o "en 20 min" como predicción creíble.
// Valores = P10/P90 reales de los mismos 249 intervalos.
export const CLAMP_MIN_H = 2.88;
export const CLAMP_MAX_H = 12.02;

// v1.1 — alerta visual. Ver Knowledge/05_API/SPEC_HungerBar_Alertas.md.
// Dispara 2h después de que la barra llega a 0% (estimatedNextMealAt), no 2h
// desde la última comida.
export const ALERT_THRESHOLD_HOURS = 2;

export type ReadingPoint = {
  recordedAt: string;
  weightGrams: number;
};

export type SegmentCategory = "alimentacion" | "servido" | "ruido";

export type Segment = {
  startAt: string;
  endAt: string;
  deltaG: number; // peso final - peso inicial (negativo = bajó)
  durationMin: number;
  weights: ReadingPoint[]; // sub-array crudo del segmento — insumo de evidence-engine
  category: SegmentCategory;
  confidence: number; // 0-1, confianza softmax del Evidence Engine para la categoría ganadora
};

export type HungerBarResult = {
  status: "ok" | "sin_datos";
  percentage: number | null;
  lastMealDetectedAt: string | null;
  lastMealConfidence: number | null;
  estimatedNextMealAt: string | null;
  intervalUsedMinutes: number | null;
  usingFallback: boolean;
  sampleSize: number;
  alertActive: boolean; // v1.1 — nunca true si status != "ok"
  hoursOverdue: number | null; // v1.1 — null si status != "ok"
};

// Ventana de comparación para el ancla idle. No puede ser "la lectura anterior"
// (como en bridge/src/processor.js, pensado para streaming en vivo con deltas
// grandes entre lecturas): una bajada real de alimentación es GRADUAL — 5-15 g
// repartidos en 4-8 min — y con lecturas frecuentes cada paso individual queda
// muy por debajo del umbral. La ventana debe cubrir el caso más lento documentado
// (5 g repartidos en 8 min) para que la acumulada cruce el umbral — 8 min es
// también el techo de duración típico de "alimentación" en la taxonomía del
// proyecto. Al ser una ventana temporal (no paso a paso), además promedia el
// ruido aleatorio del sensor en vez de perseguirlo.
const LAG_SECONDS = 8 * 60;

/**
 * State machine idle/active sobre una ventana rezagada — variante batch del
 * algoritmo de bridge/src/processor.js, generalizada a ambas direcciones
 * (sube/baja) y corregida para detectar declives graduales sostenidos.
 */
export function detectSegments(readings: ReadingPoint[]): Segment[] {
  const segments: Segment[] = [];
  if (readings.length < 2) return segments;

  const times = readings.map((r) => new Date(r.recordedAt).getTime());

  let phase: "idle" | "active" = "idle";
  let lagIdx = 0; // ancla: puntero rezagado ~LAG_SECONDS detrás de i
  let sessionStartIdx = -1;
  let lastWeight = readings[0].weightGrams;
  let stableCount = 0;

  for (let i = 1; i < readings.length; i++) {
    while (
      lagIdx < i - 1 &&
      times[i] - times[lagIdx + 1] >= LAG_SECONDS * 1000
    ) {
      lagIdx++;
    }
    const baseline = readings[lagIdx].weightGrams;
    const weight = readings[i].weightGrams;

    if (phase === "idle") {
      if (Math.abs(weight - baseline) >= SESSION_THRESHOLD_G) {
        phase = "active";
        sessionStartIdx = lagIdx;
        lastWeight = weight;
        stableCount = 0;
      }
      continue;
    }

    // phase === "active"
    const isStable = Math.abs(weight - lastWeight) <= STABLE_TOLERANCE_G;
    stableCount = isStable ? stableCount + 1 : 0;
    lastWeight = weight;

    if (stableCount >= STABLE_COUNT) {
      const startPoint = readings[sessionStartIdx];
      const endPoint = readings[i];
      const deltaG = endPoint.weightGrams - startPoint.weightGrams;
      const durationMin =
        (new Date(endPoint.recordedAt).getTime() -
          new Date(startPoint.recordedAt).getTime()) /
        60_000;
      const segmentWeights = readings.slice(sessionStartIdx, i + 1);

      // FR-007: datos insuficientes tras resamplear -> no clasificar como
      // alimentación (evita forzar una categoría con baja confianza).
      const evidence = classifyWeightSegment(segmentWeights);
      const category: SegmentCategory = evidence?.category ?? "ruido";
      const confidence = evidence?.confidence ?? 0;

      segments.push({
        startAt: startPoint.recordedAt,
        endAt: endPoint.recordedAt,
        deltaG,
        durationMin,
        weights: segmentWeights,
        category,
        confidence,
      });

      phase = "idle";
      lagIdx = i;
    }
  }

  return segments;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Agrupa picoteo: comidas consecutivas separadas por una pausa menor a
 * MIN_INTERVALO_H (20 min) son la misma sesión de alimentación partida en
 * varios segmentos por el detector, no comidas independientes — mismo
 * criterio que ya declaraba el comentario de MIN_INTERVALO_H, ahora aplicado
 * de verdad en vez de solo excluir el intervalo corto del cálculo de mediana.
 * El resultado fusionado conserva el inicio de la primera bocanada (ahí
 * arranca el 100% de la barra) y el fin de la última.
 */
export function mergeMealBursts(meals: Segment[]): Segment[] {
  if (meals.length === 0) return [];
  const merged: Segment[] = [meals[0]];

  for (let i = 1; i < meals.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = meals[i];
    const pauseH =
      (new Date(curr.startAt).getTime() - new Date(prev.endAt).getTime()) /
      3_600_000;

    if (pauseH < MIN_INTERVALO_H) {
      merged[merged.length - 1] = {
        startAt: prev.startAt,
        endAt: curr.endAt,
        deltaG: prev.deltaG + curr.deltaG,
        durationMin:
          (new Date(curr.endAt).getTime() - new Date(prev.startAt).getTime()) /
          60_000,
        weights: [...prev.weights, ...curr.weights],
        category: "alimentacion",
        confidence: Math.max(prev.confidence, curr.confidence),
      };
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

export function computeHungerBar(
  readings: ReadingPoint[],
  now: Date = new Date(),
): HungerBarResult {
  const segments = detectSegments(readings);
  const rawMeals = segments
    .filter((s) => s.category === "alimentacion")
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  const meals = mergeMealBursts(rawMeals);

  if (meals.length === 0) {
    return {
      status: "sin_datos",
      percentage: null,
      lastMealDetectedAt: null,
      lastMealConfidence: null,
      estimatedNextMealAt: null,
      intervalUsedMinutes: null,
      usingFallback: false,
      sampleSize: 0,
      alertActive: false,
      hoursOverdue: null,
    };
  }

  const intervalsH: number[] = [];
  for (let i = 1; i < meals.length; i++) {
    const h =
      (new Date(meals[i].startAt).getTime() -
        new Date(meals[i - 1].startAt).getTime()) /
      3_600_000;
    if (h >= MIN_INTERVALO_H && h <= MAX_INTERVALO_H) intervalsH.push(h);
  }

  const usingFallback = intervalsH.length < N_MIN_MUESTRAS;
  const rawIntervalH = usingFallback ? FALLBACK_MEDIANA_H : median(intervalsH);
  const intervalH = Math.min(CLAMP_MAX_H, Math.max(CLAMP_MIN_H, rawIntervalH));

  const lastMeal = meals[meals.length - 1];
  const lastMealAt = new Date(lastMeal.startAt);
  const hoursSince = (now.getTime() - lastMealAt.getTime()) / 3_600_000;
  // barra(t) = 100 × (1 − (t − última_comida) / intervalo) — spec §2. 100% al
  // comer (verde), decae hacia 0% (rojo) hasta la próxima comida detectada.
  // BUG corregido 2026-08-11: estaba implementado al revés (0% al comer,
  // subiendo a 100% con el tiempo) — Mauro lo reportó viendo la app en vivo.
  const percentage = Math.min(
    100,
    Math.max(0, 100 * (1 - hoursSince / intervalH)),
  );
  const estimatedNextMealAt = new Date(
    lastMealAt.getTime() + intervalH * 3_600_000,
  );

  const hoursOverdue = Math.max(
    0,
    (now.getTime() - estimatedNextMealAt.getTime()) / 3_600_000,
  );
  const alertActive = hoursOverdue >= ALERT_THRESHOLD_HOURS;

  return {
    status: "ok",
    percentage: Math.round(percentage),
    lastMealDetectedAt: lastMeal.startAt,
    lastMealConfidence: Math.round(lastMeal.confidence * 100) / 100,
    estimatedNextMealAt: estimatedNextMealAt.toISOString(),
    intervalUsedMinutes: Math.round(intervalH * 60),
    usingFallback,
    sampleSize: meals.length,
    alertActive,
    hoursOverdue: Math.round(hoursOverdue * 100) / 100,
  };
}
