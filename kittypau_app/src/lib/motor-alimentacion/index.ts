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

export function clasificarEventos(
  readings: LecturaPeso[],
): EventoAlimentacion[] {
  return segmentarPorPausa(readings)
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
}
