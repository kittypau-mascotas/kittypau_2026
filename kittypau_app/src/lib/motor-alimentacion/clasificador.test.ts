import { describe, expect, it } from "vitest";
import { clasificarSegmento } from "./clasificador";
import type { SegmentoCrudo } from "./segmentacion";

// Exemplares reales de KPCL0034 (Investigacion_v2/data/candidatos_clusters_duracion.csv
// + candidatos_categoria_real.csv), uno por cada rama del clasificador: cluster
// alimentación, cluster ruido puro (no mezclado), y las dos salidas del
// refinamiento sobre el cluster mezclado (ruido remanente / servido nuevo).
// Ver Knowledge/29_Specs/007-motor-alimentacion-produccion/.
function segmento(overrides: Partial<SegmentoCrudo>): SegmentoCrudo {
  return {
    startAt: "2026-04-01T00:00:00.000Z",
    endAt: "2026-04-01T00:05:00.000Z",
    nLecturas: 1,
    duracionS: 0,
    deltaNetoG: 0,
    deltaNetoReal: 0,
    maxAbsDeltaG: 0,
    nCambiosSigno: 0,
    isProvisional: false,
    ...overrides,
  };
}

describe("clasificarSegmento (motor Investigacion_v2, KPCL0034)", () => {
  it("clasifica un evento real de alimentación (cluster 0)", () => {
    const cat = clasificarSegmento(
      segmento({
        duracionS: 270.02858,
        deltaNetoReal: -14,
        maxAbsDeltaG: 5,
        nLecturas: 9,
        nCambiosSigno: 6,
      }),
    ).category;
    expect(cat).toBe("alimentacion");
  });

  it("clasifica un evento real de ruido puro (cluster 1, no mezclado)", () => {
    const cat = clasificarSegmento(
      segmento({
        duracionS: 30.083148,
        deltaNetoReal: -4,
        maxAbsDeltaG: 4,
        nLecturas: 1,
        nCambiosSigno: 0,
      }),
    ).category;
    expect(cat).toBe("ruido");
  });

  it("dentro del cluster mezclado, delta_neto_real <= 20g queda como ruido", () => {
    const cat = clasificarSegmento(
      segmento({
        duracionS: 60.047684,
        deltaNetoReal: -1,
        maxAbsDeltaG: 118,
        nLecturas: 2,
        nCambiosSigno: 1,
      }),
    ).category;
    expect(cat).toBe("ruido");
  });

  it("dentro del cluster mezclado, delta_neto_real > 20g se refina a servido", () => {
    const cat = clasificarSegmento(
      segmento({
        duracionS: 60.002905,
        deltaNetoReal: 36,
        maxAbsDeltaG: 48,
        nLecturas: 2,
        nCambiosSigno: 1,
      }),
    ).category;
    expect(cat).toBe("servido");
  });

  // Guardia física (2026-08-30): comer nunca sube el peso del plato. Estos dos
  // exemplares reales caen por distancia en el cluster de alimentación pero
  // tienen delta_neto_real >= 0 -- sin la guardia, el clasificador los habría
  // devuelto como "alimentacion" (físicamente imposible). Ver
  // calibracion-kpcl0034.json > guardia_alimentacion.
  it("redirige a ruido un candidato cercano a alimentación con peso subiendo <=20g", () => {
    const cat = clasificarSegmento(
      segmento({
        duracionS: 480.161159,
        deltaNetoReal: 14,
        maxAbsDeltaG: 24,
        nLecturas: 16,
        nCambiosSigno: 9,
      }),
    ).category;
    expect(cat).toBe("ruido"); // categoria_real real de este candidato: ruido
  });

  it("redirige a servido un candidato cercano a alimentación con peso subiendo >20g", () => {
    const cat = clasificarSegmento(
      segmento({
        duracionS: 330.013,
        deltaNetoReal: 95,
        maxAbsDeltaG: 100,
        nLecturas: 11,
        nCambiosSigno: 7,
      }),
    ).category;
    expect(cat).toBe("servido"); // categoria_real real de este candidato: servido
  });
});
