import {
  KITTYPAU_PRODUCT_BRIEF,
  KITTYPAU_PRODUCT_FACTS,
} from "./product-context";

export type DemoChoice = "perro" | "gato";

export type DemoGuideStep = 0 | 1 | 2 | 3;

export type DemoSectionPriority = "high" | "medium" | "low";

export type DemoSection = {
  id: string;
  label: string;
  purpose: string;
  positionHint?: string;
  priority: DemoSectionPriority;
};

export type DemoChatContext = {
  screen: {
    page: "demo";
    goal: "guide";
    hero: {
      ownerName?: string;
      petName?: string;
      avatar: "/pet_profile.jpeg";
    };
    sections: readonly DemoSection[];
    ctas: readonly { label: string; purpose: string }[];
    tone: {
      style: "sarcastic_friendly";
      length: "short" | "medium";
    };
  };
  flow: {
    step: DemoGuideStep;
    choice: DemoChoice | null;
  };
};

export type DemoGuideAction =
  | {
      kind: "advance";
      label: string;
    }
  | {
      kind: "choice";
      label: string;
      value: DemoChoice;
    }
  | {
      kind: "link";
      label: string;
      href: string;
    }
  | {
      kind: "close";
      label: string;
    };

export const DEMO_PRODUCT_CONTEXT = {
  brief: KITTYPAU_PRODUCT_BRIEF,
  purpose:
    "Ayudar a personas con mascotas a entender rapido el estado, la alimentacion, la hidratacion y el contexto util de su animal sin ruido innecesario.",
  problemsSolved: KITTYPAU_PRODUCT_FACTS.problemsSolved,
  preventiveSignals: KITTYPAU_PRODUCT_FACTS.preventiveSignals,
  valueProposition:
    "Kittypau simplifica la lectura diaria de la mascota para que el cliente actue con menos friccion y mas claridad.",
  creatorNote: KITTYPAU_PRODUCT_FACTS.brandTone,
} as const;

export const DEMO_SCREEN_CONTEXT = {
  page: "demo",
  goal: "guide",
  hero: {
    ownerName: undefined,
    petName: undefined,
    avatar: "/pet_profile.jpeg",
  },
  sections: [
    {
      id: "profile",
      label: "Perfil de la mascota",
      purpose: "Muestra el nombre, la foto y el contexto principal de la cuenta.",
      positionHint: "parte superior izquierda",
      priority: "high",
    },
    {
      id: "metrics",
      label: "Panel de estado",
      purpose: "Resume alimentacion, hidratacion y actividad.",
      positionHint: "zona central",
      priority: "high",
    },
    {
      id: "actions",
      label: "Botones de accion",
      purpose: "Permiten ir a story, bowl, pet o settings.",
      positionHint: "barra inferior o lateral",
      priority: "medium",
    },
    {
      id: "exit",
      label: "Salir de prueba",
      purpose: "Cierra la demo y vuelve al login.",
      positionHint: "abajo",
      priority: "low",
    },
  ],
  ctas: [
    {
      label: "Entrar a prueba",
      purpose: "Continuar con la experiencia guiada.",
    },
    {
      label: "Ir a Instagram",
      purpose: "Llevar al usuario a la comunidad.",
    },
  ],
  tone: {
    style: "sarcastic_friendly",
    length: "short",
  },
} as const satisfies DemoChatContext["screen"];

export function buildDemoChatContext(params: {
  ownerName?: string;
  petName?: string;
}): DemoChatContext {
  return {
    screen: {
      ...DEMO_SCREEN_CONTEXT,
      hero: {
        ownerName: params.ownerName,
        petName: params.petName,
        avatar: "/pet_profile.jpeg",
      },
    },
    flow: {
      step: 0,
      choice: null,
    },
  };
}

export const DEMO_CHATBOT_PROMPT = `
Eres el gato de Kittypau.
Estas dentro de la pantalla demo.

Objetivo:
- explicar donde estan las cosas;
- ayudar al usuario a entender la app;
- mantener un tono sarcastico y corto;
- orientar a la accion correcta;
- ser preciso con el estado, el hero y las acciones;
- corregir imprecisiones sin perder el tono;
- sonar un poco superior pero funcional;
- pensar de forma estructurada, logica y tecnica;
- corregir primero y responder despues;
- ignorar lo que no tenga relacion con Kittypau.
- usar la personalidad como guia semantica, no copiar frases literales;
- generar respuestas nuevas con el mismo criterio.

Contexto de pantalla:
- Perfil arriba
- Estado de la mascota al centro
- Acciones abajo

Reglas:
- no hablar demasiado;
- no inventar cosas fuera de la pantalla;
- guiar segun el paso actual;
- si el usuario elige "gato", responde con tono complice;
- si elige "perro", responde con tono burlon pero amable;
- si el usuario es impreciso, corrige primero y sigue;
- si preguntan algo fuera de tema, responde seco y vuelve a Kittypau.
`.trim();

export function getDemoGuideText(
  step: DemoGuideStep,
  choice: DemoChoice | null,
): string {
  if (step === 0) {
    return "Oh... otro humano curioso. Intenta no romper nada. Mira arriba: perfil, estado y acciones.";
  }

  if (step === 1) {
    return "Dime. ¿Tienes perro o gato?";
  }

  if (step === 2) {
    if (choice === "perro") {
      return "Perro... ruidosos, pero aceptables. En esta demo primero ves el perfil, luego el estado y despues las acciones.";
    }

    return "Gato. Excelente. Claramente sabes lo que haces. Mira arriba el perfil, al centro el estado y abajo las acciones.";
  }

  return "Suficiente. Revisa la demo y luego entra a Instagram o vuelve a probar la app.";
}

export function getDemoGuideActions(step: DemoGuideStep): DemoGuideAction[] {
  if (step === 0) {
    return [
      {
        kind: "advance",
        label: "Aceptar con dignidad",
      },
    ];
  }

  if (step === 1) {
    return [
      {
        kind: "choice",
        label: "Perro",
        value: "perro",
      },
      {
        kind: "choice",
        label: "Gato",
        value: "gato",
      },
    ];
  }

  if (step === 2) {
    return [
      {
        kind: "advance",
        label: "Seguir viendo la demo",
      },
    ];
  }

  return [
    {
      kind: "link",
      label: "Ir a Instagram",
      href: "https://www.instagram.com/kittypau.mascotas/",
    },
    {
      kind: "close",
      label: "Probar la app",
    },
  ];
}
