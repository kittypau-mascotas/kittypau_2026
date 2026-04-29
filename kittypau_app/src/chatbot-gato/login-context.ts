export type LoginChatStep = 0 | 1 | 2 | 3;

export type LoginChatContext = {
  page: "login";
  goal: "onboard" | "trial" | "register";
  modal: {
    title: string;
    body: string;
    primaryCta: string;
  };
  trialDialog: {
    step: LoginChatStep;
    lines: readonly string[];
    tone: {
      style: "sarcastic_friendly";
      length: "short";
    };
  };
};

export const LOGIN_CHATBOT_CONTEXT = {
  page: "login",
  goal: "trial",
  modal: {
    title: "Personaliza tu demo",
    body: "",
    primaryCta: "Entrar a prueba",
  },
  trialDialog: {
    step: 0 as LoginChatStep,
    lines: [
      "Ah... perfecto, humano. Justo lo que necesitaba.",
      "Gracias. Muchas gracias por despertarme. De verdad.",
      "¿Estas probando la app?",
      "Guarda tus datos, entra a la demo y siguenos en Instagram. Pensare en seguirte tambien.",
    ] as const,
    tone: {
      style: "sarcastic_friendly",
      length: "short",
    },
  },
} as const satisfies LoginChatContext;

export function getLoginTrialLines() {
  return LOGIN_CHATBOT_CONTEXT.trialDialog.lines;
}

export function getLoginTrialIntro() {
  return LOGIN_CHATBOT_CONTEXT.modal;
}
