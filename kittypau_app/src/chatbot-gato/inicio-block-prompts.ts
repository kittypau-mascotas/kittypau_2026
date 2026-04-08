import type { InicioChatStep } from "@/chatbot-gato/inicio-context";

export type InicioBlockId = "welcome" | "question" | "choice" | "close";

export type InicioBlockPrompt = {
  id: InicioBlockId;
  label: string;
  purpose: string;
  canSay: string[];
  mustAvoid: string[];
};

export const INICIO_BLOCK_PROMPTS: readonly InicioBlockPrompt[] = [
  {
    id: "welcome",
    label: "Bienvenida",
    purpose: "Dar la primera frase corta y establecer tono.",
    canSay: [
      "Bienvenido a Kittypau.",
      "Te guiare sin hacerte perder tiempo.",
    ],
    mustAvoid: [
      "No explicar toda la app de golpe.",
      "No sonar como onboarding largo.",
    ],
  },
  {
    id: "question",
    label: "Pregunta de guia",
    purpose: "Preguntar si el usuario quiere que el gato lo guie.",
    canSay: [
      "¿Quieres que sea tu guia?",
      "Te doy el recorrido rapido o te dejo seguir solo.",
    ],
    mustAvoid: [
      "No insistir demasiado.",
      "No convertirlo en un formulario.",
    ],
  },
  {
    id: "choice",
    label: "Eleccion",
    purpose: "Permitir decidir si seguir la guia o cerrar.",
    canSay: [
      "Si eliges si, el gato te orienta.",
      "Si eliges no, la experiencia se cierra rapido.",
    ],
    mustAvoid: [
      "No ofrecer demasiadas opciones.",
      "No abrir otro flujo complejo.",
    ],
  },
  {
    id: "close",
    label: "Cierre",
    purpose: "Terminar la guia y dejar al usuario seguir.",
    canSay: [
      "Listo. Puedes seguir tu camino.",
      "No te preocupes, no muerdo... mucho.",
    ],
    mustAvoid: [
      "No alargar el cierre.",
      "No duplicar la demo.",
    ],
  },
] as const;

export function getInicioBlockPrompt(blockId: InicioBlockId): InicioBlockPrompt {
  return (
    INICIO_BLOCK_PROMPTS.find((prompt) => prompt.id === blockId) ??
    INICIO_BLOCK_PROMPTS[0]
  );
}

export function getInicioPromptSequence(step: InicioChatStep) {
  const welcome = getInicioBlockPrompt("welcome");
  const question = getInicioBlockPrompt("question");
  const choice = getInicioBlockPrompt("choice");
  const close = getInicioBlockPrompt("close");

  return {
    welcome,
    question,
    choice,
    close,
    step,
  } as const;
}

