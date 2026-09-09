/**
 * Segmentación por tolerancia de pausa (τ) — puerto fiel de
 * `construir_candidatos()` en Investigacion/Investigacion_v2/07_calibracion_duracion.ipynb
 * (rama experimento-calibracion-duracion), validada por solapamiento de tiempo
 * contra 743+34 anotaciones reales de KPCL0034 — ver
 * Knowledge/29_Specs/007-motor-alimentacion-produccion/.
 *
 * Un segmento (evento) se corta cuando el peso acumula `tau_pausa_s` segundos
 * de estabilidad consecutiva (`delta_peso === 0`), o hay un gap real de lectura
 * (`> gap_cutoff_s`), o falta el dato anterior. Antes de clasificar, se descarta
 * como ruido de sensor todo segmento cuyo `max_abs_delta_g` no supere el umbral
 * MAD calibrado (`umbral_es_candidato_g`).
 *
 * No reentrenar aquí: los números vienen congelados de `calibracion-kpcl0034.json`,
 * regenerado por `Investigacion/Investigacion_v2/exportar_calibracion_produccion.py`.
 */
import calibracion from "./calibracion-kpcl0034.json";

const {
  tau_pausa_s,
  gap_cutoff_s,
  k_margen_lecturas_estables,
  umbral_es_candidato_g,
} = calibracion.segmentacion;

export type LecturaPeso = {
  recordedAt: string;
  weightGrams: number;
};

export type SegmentoCrudo = {
  startAt: string;
  endAt: string;
  nLecturas: number;
  duracionS: number;
  deltaNetoG: number; // suma cruda de deltas del segmento (diagnóstico/UI)
  deltaNetoReal: number; // nivel_despues - nivel_antes -- lo que usa el clasificador
  maxAbsDeltaG: number;
  nCambiosSigno: number;
  isProvisional: boolean; // true = cola abierta al final del stream, aún sin confirmar
};

type Fila = {
  t: number;
  peso: number;
  deltaPeso: number | null; // null en la primera lectura (equivalente a NaN de pandas .diff())
  deltaTs: number | null; // segundos desde la lectura anterior
};

function construirFilas(readings: LecturaPeso[]): Fila[] {
  const ordenadas = [...readings].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  return ordenadas.map((r, i) => {
    const t = new Date(r.recordedAt).getTime();
    if (i === 0)
      return { t, peso: r.weightGrams, deltaPeso: null, deltaTs: null };
    const prev = ordenadas[i - 1];
    return {
      t,
      peso: r.weightGrams,
      deltaPeso: r.weightGrams - prev.weightGrams,
      deltaTs: (t - new Date(prev.recordedAt).getTime()) / 1000,
    };
  });
}

function mediana(valores: number[]): number {
  const s = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function segmentarPorPausa(readings: LecturaPeso[]): SegmentoCrudo[] {
  if (readings.length < 2) return [];
  const filas = construirFilas(readings);

  const esGap = filas.map(
    (f) => f.deltaTs !== null && f.deltaTs > gap_cutoff_s,
  );
  const pasoEstable = filas.map((f, i) => f.deltaPeso === 0 && !esGap[i]);

  // duración acumulada de la racha estable/inestable actual -- equivalente al
  // groupby(cambio_de_racha).cumsum() del notebook, hecho en streaming
  let rachaDur = 0;
  const esCorteReal: boolean[] = filas.map((f, i) => {
    if (i === 0 || pasoEstable[i] !== pasoEstable[i - 1]) rachaDur = 0;
    rachaDur += f.deltaTs ?? 0;
    return (
      esGap[i] ||
      f.deltaPeso === null ||
      (pasoEstable[i] && rachaDur >= tau_pausa_s)
    );
  });

  // índices de lecturas "estables" (paso_estable), para nivel_antes/nivel_despues
  const idxEstables = pasoEstable.reduce<number[]>((acc, v, i) => {
    if (v) acc.push(i);
    return acc;
  }, []);

  function cerrarSegmento(
    indices: number[],
    isProvisional: boolean,
  ): SegmentoCrudo | null {
    if (indices.length === 0) return null;
    const inicio = indices[0];
    const fin = indices[indices.length - 1];

    const deltas = indices.map((i) => filas[i].deltaPeso ?? 0);
    const duracionS = indices.reduce(
      (acc, i) => acc + (filas[i].deltaTs ?? 0),
      0,
    );
    const deltaNetoG = deltas.reduce((acc, d) => acc + d, 0);
    const maxAbsDeltaG = Math.max(...deltas.map((d) => Math.abs(d)));

    // n_cambios_signo: puerto fiel de (np.sign(s).diff().fillna(0) != 0).sum()
    const signos = deltas.map((d) => Math.sign(d));
    let nCambiosSigno = 0;
    for (let k = 1; k < signos.length; k++) {
      if (signos[k] !== signos[k - 1]) nCambiosSigno++;
    }

    // nivel_antes/nivel_despues: mediana de las K lecturas estables inmediatas
    // antes/después del segmento -- filtra el ruido de sensor, no el valor puntual
    const antesTodos = idxEstables.filter((i) => i < inicio);
    const antes = antesTodos.slice(
      Math.max(0, antesTodos.length - k_margen_lecturas_estables),
    );
    const despuesTodos = idxEstables.filter((i) => i > fin);
    const despues = despuesTodos.slice(0, k_margen_lecturas_estables);

    const nivelAntes =
      antes.length === k_margen_lecturas_estables
        ? mediana(antes.map((i) => filas[i].peso))
        : null;
    let nivelDespues =
      despues.length === k_margen_lecturas_estables
        ? mediana(despues.map((i) => filas[i].peso))
        : null;

    if (nivelDespues === null && isProvisional) {
      // ponytail: un segmento todavía abierto (provisorio) por definición no
      // tiene 5 lecturas estables futuras -- se usa el último peso conocido
      // como nivel_despues aproximado. Se reemplaza por el valor exacto en
      // cuanto el segmento cierra de verdad (misma lógica, sin este atajo).
      // Upgrade path: ninguno necesario, es inherente a "todavía no terminó".
      nivelDespues = filas[fin].peso;
    }

    if (nivelAntes === null || nivelDespues === null) return null; // igual que el dropna() del notebook

    const deltaNetoReal = nivelDespues - nivelAntes;
    if (Math.abs(maxAbsDeltaG) <= umbral_es_candidato_g) return null; // filtro MAD: ruido de sensor

    return {
      startAt: new Date(filas[inicio].t).toISOString(),
      endAt: new Date(filas[fin].t).toISOString(),
      nLecturas: indices.length,
      duracionS,
      deltaNetoG,
      deltaNetoReal,
      maxAbsDeltaG,
      nCambiosSigno,
      isProvisional,
    };
  }

  const segmentos: SegmentoCrudo[] = [];
  let grupo: number[] = [];
  for (let i = 0; i < filas.length; i++) {
    if (esCorteReal[i]) {
      const seg = cerrarSegmento(grupo, false);
      if (seg) segmentos.push(seg);
      grupo = [];
    } else {
      grupo.push(i);
    }
  }
  // cola abierta al final del stream = evento en curso, todavía sin confirmar
  const abierto = cerrarSegmento(grupo, true);
  if (abierto) segmentos.push(abierto);

  return segmentos;
}
