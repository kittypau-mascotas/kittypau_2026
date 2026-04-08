import type { DemoChatContext } from "@/chatbot-gato/demo-context";

export type DemoBlockId = "hero" | "profile" | "metrics" | "actions" | "exit";

export type DemoBlockPrompt = {
  id: DemoBlockId;
  label: string;
  purpose: string;
  canSay: string[];
  mustAvoid: string[];
};

export const DEMO_BLOCK_PROMPTS: readonly DemoBlockPrompt[] = [
  {
    id: "hero",
    label: "Hero de la demo",
    purpose: "Presenta la experiencia guiada con los datos ya cargados en login.",
    canSay: [
      "Este hero usa el nombre de tu mascota y el titular que cargaste antes.",
      "Arriba ves la parte principal de la demo.",
    ],
    mustAvoid: [
      "No decir que es un formulario.",
      "No afirmar datos no cargados.",
    ],
  },
  {
    id: "profile",
    label: "Perfil de la mascota",
    purpose: "Muestra la foto, el nombre de la mascota y el titular.",
    canSay: [
      "Ese bloque identifica a la mascota y a quien registró la prueba.",
      "La foto y el nombre vienen de lo que ingresaste en login.",
    ],
    mustAvoid: [
      "No inventar otra mascota.",
      "No cambiar el significado del perfil.",
    ],
  },
  {
    id: "metrics",
    label: "Panel de estado",
    purpose: "Resume alimentacion, hidratacion y actividad de forma visual.",
    canSay: [
      "Ese panel resume el estado de comida e hidratacion.",
      "Sirve para leer la situacion de un vistazo.",
    ],
    mustAvoid: [
      "No inventar lecturas que no esten en pantalla.",
      "No hablar como si fuera un reporte tecnico completo.",
    ],
  },
  {
    id: "actions",
    label: "Acciones rapidas",
    purpose: "Lleva a story, bowl, pet o settings.",
    canSay: [
      "Desde aqui puedes saltar a las vistas operativas.",
      "Estos botones son atajos, no contenido decorativo.",
    ],
    mustAvoid: [
      "No inventar rutas nuevas.",
      "No explicar demasiado cada boton.",
    ],
  },
  {
    id: "exit",
    label: "Salida de la demo",
    purpose: "Permite salir o continuar hacia la comunidad.",
    canSay: [
      "Si ya viste suficiente, puedes seguir o salir.",
      "El cierre lleva a Instagram o de vuelta a la app.",
    ],
    mustAvoid: [
      "No forzar una accion.",
      "No ocultar la salida real.",
    ],
  },
] as const;

export function getDemoBlockPrompt(blockId: DemoBlockId): DemoBlockPrompt {
  return (
    DEMO_BLOCK_PROMPTS.find((prompt) => prompt.id === blockId) ??
    DEMO_BLOCK_PROMPTS[0]
  );
}

export function getDemoPromptSequence(
  context: Pick<DemoChatContext, "screen" | "flow">,
) {
  const hero = getDemoBlockPrompt("hero");
  const profile = getDemoBlockPrompt("profile");
  const metrics = getDemoBlockPrompt("metrics");
  const actions = getDemoBlockPrompt("actions");
  const exit = getDemoBlockPrompt("exit");

  return {
    hero,
    profile,
    metrics,
    actions,
    exit,
    screen: context.screen,
    flow: context.flow,
  } as const;
}

