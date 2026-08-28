/**
 * Tipos compartidos del Evidence Engine portado — ver
 * Knowledge/29_Specs/007-evidence-engine-hunger-bar/data-model.md §1.
 * Espejo de las estructuras de datos de
 * Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py.
 */

export type FeatureMap = Record<string, number>;

/** Forma mínima que necesita el motor — estructuralmente compatible con
 * `ReadingPoint` de `../hunger-bar.ts` (mismo shape, sin importarlo directo
 * para evitar un ciclo de módulos entre `hunger-bar.ts` y este submódulo). */
export type WeightPoint = {
  recordedAt: string;
  weightGrams: number;
};

export type EvidenceCategory = "alimentacion" | "servido" | "ruido";

/** Estadísticas por feature × categoría, calibradas en investigación
 * (comp_stats_v2.json). Ver data-model.md §1 "Perfil de referencia calibrado". */
export type CompStatCategory = {
  n: number;
  mean: number;
  std: number;
  median: number;
};

export type CompStats = Record<
  string,
  Partial<Record<EvidenceCategory, CompStatCategory>>
>;

/** Resultado de evidenceScore() — espejo 1:1 de evidence_score() en Python
 * (nombres traducidos a camelCase, mismos campos). */
export type EvidenceResult = {
  scoreAlimentacion: number;
  scoreServido: number;
  scoreRuido: number;
  prediccion: EvidenceCategory;
  confianza: number;
  razon: string;
};
