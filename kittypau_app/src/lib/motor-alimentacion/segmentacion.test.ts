import { describe, expect, it } from "vitest";
import { segmentarPorPausa } from "./segmentacion";
import type { LecturaPeso } from "./segmentacion";

// Lecturas cada 10s. Antes del evento hace falta acumular >=180s de estabilidad
// (tau_pausa_s) para que el propio prefijo estable cierre como un "corte" real
// -- si no, el prefijo entero se trata como "movimiento" abierto (igual que en
// construir_candidatos() del notebook: una racha estable que todavía no llegó a
// tau_s sigue siendo parte del segmento activo). Después del evento pasa lo
// mismo: el corte recién ocurre 180s después (18 lecturas de 10s) y ESA fila
// se excluye del segmento -- para calcular nivel_despues hacen falta además
// K_MARGEN=5 lecturas estables MÁS allá del corte (230s en total).
function lecturas(nSegundosEstableDespues: number): LecturaPeso[] {
  const base = new Date("2026-04-01T00:00:00Z").getTime();
  const at = (s: number) => new Date(base + s * 1000).toISOString();
  const puntos: LecturaPeso[] = [];
  for (let s = -200; s <= 0; s += 10)
    puntos.push({ recordedAt: at(s), weightGrams: 200 });
  puntos.push({ recordedAt: at(10), weightGrams: 195 });
  puntos.push({ recordedAt: at(20), weightGrams: 190 });
  for (let s = 30; s <= 20 + nSegundosEstableDespues; s += 10) {
    puntos.push({ recordedAt: at(s), weightGrams: 190 });
  }
  return puntos;
}

describe("segmentarPorPausa (tau=180s, KPCL0034)", () => {
  it("cierra el segmento como DEFINITIVO cuando se acumulan >=180s de estabilidad posterior", () => {
    const segmentos = segmentarPorPausa(lecturas(250));
    const cerrados = segmentos.filter((s) => !s.isProvisional);
    expect(cerrados).toHaveLength(1);
    expect(cerrados[0].deltaNetoReal).toBeCloseTo(-10, 0);
  });

  it("marca el evento como PROVISORIO si todavía no se acumularon 180s de estabilidad", () => {
    const segmentos = segmentarPorPausa(lecturas(50));
    expect(segmentos.some((s) => s.isProvisional)).toBe(true);
    expect(segmentos.some((s) => !s.isProvisional)).toBe(false);
  });

  it("descarta como ruido de sensor un movimiento menor al umbral MAD calibrado (2.0g)", () => {
    const base = new Date("2026-04-01T00:00:00Z").getTime();
    const at = (s: number) => new Date(base + s * 1000).toISOString();
    const puntos: LecturaPeso[] = [];
    for (let s = -200; s <= 0; s += 10)
      puntos.push({ recordedAt: at(s), weightGrams: 200 });
    puntos.push({ recordedAt: at(10), weightGrams: 201 }); // 1g, bajo el umbral de 2.0g
    for (let s = 20; s <= 210; s += 10)
      puntos.push({ recordedAt: at(s), weightGrams: 201 });
    expect(segmentarPorPausa(puntos)).toEqual([]);
  });
});
