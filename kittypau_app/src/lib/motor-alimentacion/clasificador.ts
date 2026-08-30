/**
 * Clasificador por centroide más cercano + refinamiento por umbral calibrado —
 * puerto fiel del KMeans (k=3) + refinamiento de
 * Investigacion/Investigacion_v2/07_calibracion_duracion.ipynb. Sin librería de
 * ML en runtime: clasificar es distancia euclídea a 3 centroides fijos y, si
 * cae en el cluster "mezclado", un único umbral real (`delta_neto_real > 20g`).
 */
import calibracion from "./calibracion-kpcl0034.json";
import type { SegmentoCrudo } from "./segmentacion";

export type Categoria = "alimentacion" | "servido" | "ruido";

export type Clasificacion = {
  category: Categoria;
  // pureza medida contra anotaciones reales para el cluster asignado -- ver
  // 08_validacion_contra_anotaciones.ipynb. Sustituye al score triangular
  // ad-hoc de v1: es la precisión real medida, no un proxy inventado.
  confianzaMedida: number;
};

const FEATURES_ORDEN = calibracion.features_orden;
const LOG1P_FEATURES = new Set(calibracion.log1p_features);
const { mean, scale } = calibracion.scaler;

function featuresCrudas(
  seg: SegmentoCrudo,
): Record<(typeof FEATURES_ORDEN)[number], number> {
  return {
    duracion_s: seg.duracionS,
    delta_neto_real: seg.deltaNetoReal,
    max_abs_delta_g: seg.maxAbsDeltaG,
    n_lecturas: seg.nLecturas,
    n_cambios_signo: seg.nCambiosSigno,
  };
}

function estandarizar(seg: SegmentoCrudo): number[] {
  const crudas = featuresCrudas(seg);
  return FEATURES_ORDEN.map((nombre, i) => {
    const valor = crudas[nombre as keyof typeof crudas];
    const transformado = LOG1P_FEATURES.has(nombre) ? Math.log1p(valor) : valor;
    return (transformado - mean[i]) / scale[i];
  });
}

function distanciaCuadrada(a: number[], b: number[]): number {
  return a.reduce((acc, v, i) => acc + (v - b[i]) ** 2, 0);
}

/** Clasifica un segmento ya segmentado (post-filtro MAD) en alimentación/servido/ruido. */
export function clasificarSegmento(seg: SegmentoCrudo): Clasificacion {
  const x = estandarizar(seg);

  let mejorId = "";
  let mejorDist = Infinity;
  for (const [cid, info] of Object.entries(calibracion.clusters_kmeans_crudo)) {
    const d = distanciaCuadrada(x, info.centroide_estandarizado);
    if (d < mejorDist) {
      mejorDist = d;
      mejorId = cid;
    }
  }

  const cluster =
    calibracion.clusters_kmeans_crudo[
      mejorId as keyof typeof calibracion.clusters_kmeans_crudo
    ];
  if (!cluster.es_mezclado) {
    // Guardia física: "alimentación" exige que el peso haya bajado -- comer
    // nunca sube el peso del plato. La distancia sola no fuerza el signo (mira
    // 5 features en conjunto), así que un ~11% de los candidatos más cercanos
    // al centroide de alimentación tienen delta_neto_real >= 0 (hallazgo real
    // en producción, no hipotético). Se redirige con el mismo umbral ya
    // calibrado del refinamiento -- ver calibracion.guardia_alimentacion.
    // Medido contra las anotaciones reales: accuracy global 80.9% -> 86.3%.
    if (
      cluster.categoria_dominante === "alimentacion" &&
      seg.deltaNetoReal >= 0
    ) {
      const {
        umbral_delta_neto_real_g,
        redirigido_a_servido,
        redirigido_a_ruido,
      } = calibracion.guardia_alimentacion;
      const destino =
        seg.deltaNetoReal > umbral_delta_neto_real_g
          ? redirigido_a_servido
          : redirigido_a_ruido;
      return {
        category: destino.categoria_dominante as Categoria,
        confianzaMedida: destino.pureza_medida ?? 0,
      };
    }
    return {
      category: cluster.categoria_dominante as Categoria,
      confianzaMedida: cluster.pureza_medida ?? 0,
    };
  }

  // refinamiento: dentro del cluster mezclado, el umbral real de delta_w separa
  // servido de ruido mejor que la distancia (ver Knowledge/29_Specs/007-.../plan.md)
  const {
    umbral_delta_neto_real_g,
    cluster_servido_nuevo,
    cluster_ruido_remanente,
  } = calibracion.refinamiento;
  const esServido = seg.deltaNetoReal > umbral_delta_neto_real_g;
  const destino = esServido ? cluster_servido_nuevo : cluster_ruido_remanente;
  return {
    category: destino.categoria_dominante as Categoria,
    confianzaMedida: destino.pureza_medida ?? 0,
  };
}
