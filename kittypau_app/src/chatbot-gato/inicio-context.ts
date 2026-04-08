export type InicioChatStep = 0 | 1;

export type InicioChatContext = {
  page: "inicio";
  goal: "orientation";
  lines: readonly string[];
  tone: {
    style: "sarcastic_friendly";
    length: "short";
  };
};

export const INICIO_CHATBOT_CONTEXT = {
  page: "inicio",
  goal: "orientation",
  lines: [
    "Bienvenido a Kittypau",
    "¿Quieres que sea tu guía? 1 Sí / 2 No",
  ] as const,
  tone: {
    style: "sarcastic_friendly",
    length: "short",
  },
} as const satisfies InicioChatContext;

export function getInicioGuideLines() {
  return INICIO_CHATBOT_CONTEXT.lines;
}
