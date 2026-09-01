/**
 * Motor de Alimentación — segmentación por tolerancia de pausa (τ=180s) +
 * clasificación por centroide más cercano + refinamiento por umbral calibrado.
 *
 * Validado por solapamiento de tiempo contra 743 anotaciones reales + 34
 * promovidas manualmente de KPCL0034 (cobertura 100%/82.6%/82.7%, pureza de
 * cluster 73.9%/100%/75.0% para alimentación/ruido/servido). Origen completo:
 * `Investigacion/Investigacion_v2` (rama experimento-calibracion-duracion) —
 * ver `Knowledge/29_Specs/007-motor-alimentacion-produccion/`.
 *
 * Solo válido para KPCL0034 hoy — no aplicar a otros dispositivos sin
 * recalibrar y validar contra anotaciones reales propias (ver `calibracion-
 * kpcl0034.json`, campo `device_code`).
 */
import { segmentarPorPausa } from "./segmentacion";
import { clasificarSegmento } from "./clasificador";
import type { Categoria } from "./clasificador";
import type { LecturaPeso, SegmentoCrudo } from "./segmentacion";

export type { LecturaPeso, SegmentoCrudo, Categoria };

export type EventoAlimentacion = {
  startAt: string;
  endAt: string;
  deltaG: number; // = deltaNetoReal del segmento (nivel_despues - nivel_antes)
  durationMin: number;
  category: Categoria;
  confidence: number; // pureza medida contra anotaciones reales del cluster asignado
  isProvisional: boolean;
};

// Picoteo: comidas/servidos reales separados por pocos minutos se veían como
// N eventos independientes (confuso para el usuario, y distorsiona la mediana
// de intervalos de computeHungerBar -- ver Knowledge/05_API/
// SPEC_HungerBar_Alimentacion.md §3 "Picoteo", pendiente desde v1). Umbral: el
// mismo `gap_fusion_s=120` ya calibrado en el pipeline legado
// (01_genera_candidatos.py, ver Knowledge/10_Datasets/README_Datasets.md) --
// no se inventa un número nuevo. Solo fusiona alimentación/servido
// (categorías que se muestran al usuario); ruido no se toca.
const GAP_FUSION_S = 120;

export function fusionarPicoteo(
  eventos: EventoAlimentacion[],
): EventoAlimentacion[] {
  const fusionados: EventoAlimentacion[] = [];
  for (const ev of eventos) {
    const anterior = fusionados[fusionados.length - 1];
    const mismaCategoriaFusionable =
      anterior && ev.category === anterior.category && ev.category !== "ruido";
    const gapS = anterior
      ? (new Date(ev.startAt).getTime() - new Date(anterior.endAt).getTime()) /
        1000
      : Infinity;
    if (
      anterior &&
      mismaCategoriaFusionable &&
      gapS >= 0 &&
      gapS < GAP_FUSION_S
    ) {
      anterior.endAt = ev.endAt;
      anterior.deltaG += ev.deltaG;
      anterior.durationMin =
        (new Date(ev.endAt).getTime() - new Date(anterior.startAt).getTime()) /
        60_000;
      anterior.isProvisional = anterior.isProvisional || ev.isProvisional;
      // conservador: la confianza del evento fusionado es la del mas debil,
      // no la del primero -- no queremos aparentar mas certeza de la real.
      anterior.confidence = Math.min(anterior.confidence, ev.confidence);
    } else {
      fusionados.push({ ...ev });
    }
  }
  return fusionados;
}

export function clasificarEventos(
  readings: LecturaPeso[],
): EventoAlimentacion[] {
  const eventos = segmentarPorPausa(readings)
    .map((seg) => {
      const { category, confianzaMedida } = clasificarSegmento(seg);
      return {
        startAt: seg.startAt,
        endAt: seg.endAt,
        deltaG: seg.deltaNetoReal,
        durationMin: seg.duracionS / 60,
        category,
        confidence: confianzaMedida,
        isProvisional: seg.isProvisional,
      };
    })
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  return fusionarPicoteo(eventos);
}
