/**
 * Hunger Bar — detección de comidas y estimación de "próxima comida" a partir
 * de `readings` crudas, sin depender de `device_bowl_sessions` (manual) ni de
 * `pet_sessions` (DB analytics opcional/legado).
 *
 * ponytail: la clasificación de segmentos usa reglas simples de magnitud/dirección/
 * duración (rangos documentados en Knowledge/SPEC_HungerBar_Alimentacion.md), NO el
 * Motor Matemático v2 / Evidence Engine (shape_features_v2.py, 23 features + softmax
 * calibrado contra 417 anotaciones reales). Ese motor es Python/numpy y no está
 * portado a la app — decisión de arquitectura pendiente (microservicio / port a TS /
 * job batch). Techo de este v1: no distingue tan bien "comida real" de un roce/
 * ruido cerca del plato como el Evidence Engine (~7σ de separación medida).
 * Upgrade path: reemplazar `classifySegment()` por una llamada al motor real
 * cuando se resuelva la integración.
 *
 * Constantes de calibración: medidas sobre 254 comidas anotadas de KPCL0034
 * ("Bandida"), abril–julio 2026 — ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md.
 */

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
  category: SegmentCategory;
  confidence: number; // 0-1, qué tanto matchea el rango típico documentado — no es el score del Evidence Engine
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

function triangularScore(
  x: number,
  lo: number,
  mid: number,
  hi: number,
): number {
  if (x <= lo || x >= hi) return 0;
  if (x <= mid) return (x - lo) / (mid - lo);
  return (hi - x) / (hi - mid);
}

function classifySegment(
  deltaG: number,
  durationMin: number,
): { category: SegmentCategory; confidence: number } {
  if (deltaG < 0) {
    // candidato a alimentación: baja 5–15 g en 4–8 min (rango documentado, con margen)
    const mag = -deltaG;
    if (mag >= 3 && mag <= 25 && durationMin >= 1.5 && durationMin <= 15) {
      const magScore = triangularScore(mag, 3, 10, 25);
      const durScore = triangularScore(durationMin, 1.5, 6, 15);
      return {
        category: "alimentacion",
        confidence: (magScore + durScore) / 2,
      };
    }
    return { category: "ruido", confidence: 0 };
  }
  // candidato a servido: sube ≥15 g rápido (<3 min) — no se usa para la barra,
  // solo se detecta (ver Knowledge spec §4: uso de "servido" como señal secundaria
  // — no implementado en v1).
  if (deltaG >= 15) {
    return { category: "servido", confidence: 0.6 };
  }
  return { category: "ruido", confidence: 0 };
}

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

      const { category, confidence } = classifySegment(deltaG, durationMin);
      segments.push({
        startAt: startPoint.recordedAt,
        endAt: endPoint.recordedAt,
        deltaG,
        durationMin,
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

export function computeHungerBar(
  readings: ReadingPoint[],
  now: Date = new Date(),
): HungerBarResult {
  const segments = detectSegments(readings);
  const meals = segments
    .filter((s) => s.category === "alimentacion")
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );

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
  const percentage = Math.min(100, Math.max(0, (hoursSince / intervalH) * 100));
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
