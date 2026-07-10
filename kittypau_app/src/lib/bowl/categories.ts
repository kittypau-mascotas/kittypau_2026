export type BowlCategoryKey =
  | "inicio_alimentacion"
  | "termino_alimentacion"
  | "inicio_hidratacion"
  | "termino_hidratacion"
  | "inicio_servido"
  | "termino_servido"
  | "kpcl_sin_plato"
  | "kpcl_con_plato"
  | "tare_con_plato";

export type BowlCategoryChoice = {
  key: BowlCategoryKey;
  label: string;
};

const BOWL_CATEGORY_LABELS: Record<BowlCategoryKey, string> = {
  inicio_alimentacion: "Inicio alimentación",
  termino_alimentacion: "Término alimentación",
  inicio_hidratacion: "Inicio hidratación",
  termino_hidratacion: "Término hidratación",
  inicio_servido: "Inicio servido",
  termino_servido: "Término servido",
  kpcl_sin_plato: "KPCL sin plato",
  kpcl_con_plato: "KPCL con plato",
  tare_con_plato: "Tara con plato",
};

export const BOWL_CATEGORY_CHOICES: BowlCategoryChoice[] = [
  { key: "inicio_servido", label: BOWL_CATEGORY_LABELS.inicio_servido },
  { key: "termino_servido", label: BOWL_CATEGORY_LABELS.termino_servido },
  {
    key: "inicio_alimentacion",
    label: BOWL_CATEGORY_LABELS.inicio_alimentacion,
  },
  {
    key: "termino_alimentacion",
    label: BOWL_CATEGORY_LABELS.termino_alimentacion,
  },
  { key: "kpcl_sin_plato", label: BOWL_CATEGORY_LABELS.kpcl_sin_plato },
  { key: "kpcl_con_plato", label: BOWL_CATEGORY_LABELS.kpcl_con_plato },
  { key: "tare_con_plato", label: BOWL_CATEGORY_LABELS.tare_con_plato },
];

export const WATER_CATEGORY_CHOICES: BowlCategoryChoice[] = [
  { key: "inicio_servido", label: BOWL_CATEGORY_LABELS.inicio_servido },
  { key: "termino_servido", label: BOWL_CATEGORY_LABELS.termino_servido },
  {
    key: "inicio_hidratacion",
    label: BOWL_CATEGORY_LABELS.inicio_hidratacion,
  },
  {
    key: "termino_hidratacion",
    label: BOWL_CATEGORY_LABELS.termino_hidratacion,
  },
  { key: "kpcl_sin_plato", label: BOWL_CATEGORY_LABELS.kpcl_sin_plato },
  { key: "kpcl_con_plato", label: BOWL_CATEGORY_LABELS.kpcl_con_plato },
  { key: "tare_con_plato", label: BOWL_CATEGORY_LABELS.tare_con_plato },
];

export const BOWL_CATEGORY_LABEL_MAP = BOWL_CATEGORY_LABELS;
