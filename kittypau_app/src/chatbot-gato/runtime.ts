import {
  buildDemoChatContext,
  DEMO_CHATBOT_PROMPT,
  DEMO_SCREEN_CONTEXT,
  getDemoGuideActions,
  getDemoGuideText,
  type DemoChatContext,
  type DemoChoice,
  type DemoGuideAction,
  type DemoGuideStep,
} from "@/chatbot-gato/demo-context";
import {
  getInicioGuideLines,
  INICIO_CHATBOT_CONTEXT,
  type InicioChatStep,
} from "@/chatbot-gato/inicio-context";
import {
  getLoginTrialIntro,
  getLoginTrialLines,
  LOGIN_CHATBOT_CONTEXT,
  type LoginChatStep,
} from "@/chatbot-gato/login-context";

export type ChatbotGatoPage = "login" | "demo" | "inicio";

export type ChatbotGatoRuntime =
  | {
      page: "login";
      context: typeof LOGIN_CHATBOT_CONTEXT;
      intro: ReturnType<typeof getLoginTrialIntro>;
      lines: ReturnType<typeof getLoginTrialLines>;
      step: LoginChatStep;
    }
  | {
      page: "demo";
      context: DemoChatContext;
      prompt: typeof DEMO_CHATBOT_PROMPT;
      screen: typeof DEMO_SCREEN_CONTEXT;
      step: DemoGuideStep;
      choice: DemoChoice | null;
      text: string;
      actions: DemoGuideAction[];
    }
  | {
      page: "inicio";
      context: typeof INICIO_CHATBOT_CONTEXT;
      lines: ReturnType<typeof getInicioGuideLines>;
      step: InicioChatStep;
    };

export function buildChatbotRuntime(params: {
  page: "login";
  loginStep?: LoginChatStep;
}): Extract<ChatbotGatoRuntime, { page: "login" }>;
export function buildChatbotRuntime(params: {
  page: "demo";
  ownerName?: string;
  petName?: string;
  demoStep?: DemoGuideStep;
  demoChoice?: DemoChoice | null;
}): Extract<ChatbotGatoRuntime, { page: "demo" }>;
export function buildChatbotRuntime(params: {
  page: "inicio";
  inicioStep?: InicioChatStep;
}): Extract<ChatbotGatoRuntime, { page: "inicio" }>;
export function buildChatbotRuntime(params: {
  page: ChatbotGatoPage;
  ownerName?: string;
  petName?: string;
  loginStep?: LoginChatStep;
  demoStep?: DemoGuideStep;
  demoChoice?: DemoChoice | null;
  inicioStep?: InicioChatStep;
}): ChatbotGatoRuntime {
  if (params.page === "login") {
    return {
      page: "login",
      context: LOGIN_CHATBOT_CONTEXT,
      intro: getLoginTrialIntro(),
      lines: getLoginTrialLines(),
      step: params.loginStep ?? 0,
    };
  }

  if (params.page === "inicio") {
    return {
      page: "inicio",
      context: INICIO_CHATBOT_CONTEXT,
      lines: getInicioGuideLines(),
      step: params.inicioStep ?? 0,
    };
  }

  const step = params.demoStep ?? 0;
  const choice = params.demoChoice ?? null;
  const context = buildDemoChatContext({
    ownerName: params.ownerName,
    petName: params.petName,
  });

  return {
    page: "demo",
    context,
    prompt: DEMO_CHATBOT_PROMPT,
    screen: DEMO_SCREEN_CONTEXT,
    step,
    choice,
    text: getDemoGuideText(step, choice),
    actions: getDemoGuideActions(step),
  };
}

