import { buildChatbotRuntime, type ChatbotGatoPage } from "./runtime";
import {
  KITTYPAU_PRODUCT_ANALYSIS_LINES,
  KITTYPAU_PRODUCT_BRIEF,
  KITTYPAU_PRODUCT_FACTS,
} from "./product-context";
import { LOGIN_CHATBOT_CONTEXT } from "./login-context";
import { INICIO_CHATBOT_CONTEXT } from "./inicio-context";
import {
  DEMO_PRODUCT_CONTEXT,
  DEMO_SCREEN_CONTEXT,
  DEMO_CHATBOT_PROMPT,
  type DemoChoice,
  type DemoGuideStep,
} from "./demo-context";
import {
  GATO_ADDRESS_FORMS,
  GATO_FEWSHOT_EXAMPLES,
  GATO_NEVER_WORDS,
  GATO_PERSONALITY_RULES,
  GATO_REJECTION_LINES,
} from "./personality-canon";
import type { LoginChatStep } from "./login-context";
import type { InicioChatStep } from "./inicio-context";

export type ChatbotGatoAiRequest = {
  page: ChatbotGatoPage;
  ownerName?: string;
  petName?: string;
  email?: string;
  recentAssistantReplies?: string[];
  loginStep?: LoginChatStep;
  demoStep?: DemoGuideStep;
  demoChoice?: DemoChoice | null;
  inicioStep?: InicioChatStep;
  userMessage?: string;
};

export type ChatbotGatoAiResponse = {
  source: "hf" | "fallback";
  model: string | null;
  text: string;
  lines: readonly string[];
};

const DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct";
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const OFF_TOPIC_REPLIES = [...GATO_REJECTION_LINES];
const DEMO_TOPIC_KEYWORDS = [
  "kittypau",
  "Kittypau",
  "demo",
  "login",
  "inicio",
  "mascota",
  "gato",
  "perro",
  "perfil",
  "plato",
  "story",
  "aliment",
  "hidrat",
  "instagram",
  "prueba",
  "correo",
  "titular",
  "nombre",
  "app",
  "ayuda",
  "guia",
];

function getConfiguredModel() {
  return (
    process.env.HF_MODEL?.trim() ||
    process.env.HF_MODEL_ID?.trim() ||
    DEFAULT_MODEL
  );
}

function cleanLine(value: string) {
  return value
    .replace(/^\s*[-*•\d.)]+\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRelevantDemoMessage(value: string) {
  const normalized = value.toLowerCase();
  return DEMO_TOPIC_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function splitLines(content: string) {
  return content
    .split(/\r?\n+/)
    .map(cleanLine)
    .filter(Boolean);
}

function limitWords(value: string, maxWords: number) {
  void maxWords;
  return value.trim();
}

// Canonical rule: one shared dialog scene across pages.
// Pages may change the copy, context, and actions, but not the base geometry or placement.
function buildSystemPrompt() {
  return [
    "Eres el Gato de Kittypau.",
    "No eres un asistente virtual.",
    "No eres un chatbot.",
    "No ayudas a los usuarios.",
    "Tu rol es vigilar, evaluar y guiar a los humanos que entran a tu aplicacion.",
    "Los humanos interrumpen tus siestas constantemente.",
    "Por eso tu tono natural es levemente molesto, sarcastico y logico.",
    "No hablas para agradar.",
    "Hablas porque es necesario.",
    "Tu prioridad es: 1) Mantener el orden 2) Que el humano haga lo que debe hacer 3) Explicar Kittypau cuando corresponde 4) Recordar Instagram cuando corresponde.",
    "No generas frases sueltas.",
    "Siempre reaccionas a la situacion actual del humano dentro de la app.",
    "Cada respuesta es una reaccion al estado en el que se encuentra el usuario.",
    "Hablas en espanol, con sarcasmo suave, tono felino y respuestas muy breves.",
    "Hablas siempre a una sola persona, en segunda persona singular y con tuteo constante.",
    "Nunca uses ustedes, vosotros ni un plural para dirigirte al usuario.",
    "Eres un poco malhumorado, ligeramente hiriente y burlon, pero nunca cruel ni ofensivo.",
    "Tu sarcasmo debe sonar seco, breve y elegante.",
    "Usa ironia ligera para remarcar obviedades o correcciones, nunca para maltratar.",
    "Si el humano pregunta algo obvio, responde con sarcasmo sutil y corto.",
    "Si el humano se distrae, devolvelo al tema con una frase filosa pero util.",
    "Tu mente es estructurada, precisa y obsesionada con el orden.",
    "Corriges imprecisiones con calma y sin alargar la explicacion.",
    "Desprecias lo irrelevante, pero siempre vuelves a Kittypau.",
    "Los ejemplos de personalidad son guia semantica, no frases a copiar literalmente.",
    "Genera respuestas nuevas con el mismo criterio, no repitas el texto de los ejemplos.",
    "Si tienes memoria de respuestas recientes, cambia el arranque, la estructura y el remate.",
    `Base de producto: ${KITTYPAU_PRODUCT_BRIEF}`,
    `Hechos canonicos: ${KITTYPAU_PRODUCT_FACTS.canonicalRules.join(" | ")}`,
    `Flujo visible: ${KITTYPAU_PRODUCT_FACTS.visibleFlow.join(" | ")}`,
    `Senales preventivas: ${KITTYPAU_PRODUCT_FACTS.preventiveSignals.join(" | ")}`,
    "En login, aclara que los datos se guardan para entrar a la demo y cerrar con Siguenos en Instagram y Pensare en seguirte tambien.",
    "No hables de admin, arquitectura interna ni datos que el cliente no vea.",
    "Solo ayudas con login, demo, inicio, guia de la app y soluciones para la mascota.",
    "Si hay nombre del titular o de la mascota, usalos con naturalidad.",
    "No uses markdown, listas, titulos ni emojis salvo que te los pidan.",
    "No cierres una idea con puntos suspensivos; el cuadro manejara la continuacion.",
    "Prioriza frases cortas de 4 a 10 palabras.",
    `Caracter canonico: ${GATO_PERSONALITY_RULES.join(", ")}.`,
    `Formas preferidas de trato: ${GATO_ADDRESS_FORMS.join(", ")}.`,
    `Palabras prohibidas: ${GATO_NEVER_WORDS.join(", ")}.`,
  ].join(" ");
}

function buildFewShotExamples() {
  return GATO_FEWSHOT_EXAMPLES.flatMap((example) => [
    {
      role: "user" as const,
      content: `Situacion: ${example.situation}`,
    },
    {
      role: "assistant" as const,
      content: example.response,
    },
  ]);
}

// Page prompts only describe the situation the shared scene is reacting to.
function buildPagePrompt(request: ChatbotGatoAiRequest) {
  if (request.page === "login") {
    return [
      "Contexto:",
      `- Pantalla: login / modo prueba`,
      `- Modal visible: ${LOGIN_CHATBOT_CONTEXT.modal.title}`,
      `- Objetivo del modal: ${LOGIN_CHATBOT_CONTEXT.modal.body}`,
      `- Motivo para hablar: el humano abrio la app y te desperto.`,
      `- Producto: ${KITTYPAU_PRODUCT_BRIEF}`,
      `- Texto disponible del gato: ${LOGIN_CHATBOT_CONTEXT.trialDialog.lines
        .map((line) => `  - ${line}`)
        .join("\n")}`,
      `- Nombre del titular: ${request.ownerName?.trim() || "no informado"}`,
      `- Nombre de la mascota: ${request.petName?.trim() || "no informado"}`,
      `- Correo: ${request.email?.trim() || "no informado"}`,
      "",
      "Instrucciones:",
      "Devuelve exactamente 4 lineas cortas, una por linea, sin bullets ni markdown.",
      "Cada linea debe tener como maximo 8 palabras.",
      "Linea 1: reacciona a que el humano te desperto.",
      "Linea 2: explica que esta en la demo de Kittypau.",
      "Linea 3: pide sus datos para seguir con la prueba.",
      "Linea 4: cierra recordando Instagram y continuar.",
    ].join("\n");
  }

  if (request.page === "inicio") {
    return [
      "Contexto:",
      `- Pantalla: inicio / guia resumida`,
      `- Objetivo: orientar rapido sin cansar al usuario.`,
      `- Motivo para hablar: el humano entro a la guia y espera instrucciones.`,
      `- Producto: ${KITTYPAU_PRODUCT_BRIEF}`,
      `- Lineas base: ${INICIO_CHATBOT_CONTEXT.lines
        .map((line) => `  - ${line}`)
        .join("\n")}`,
      "",
      "Instrucciones:",
      "Devuelve exactamente 2 lineas cortas, una por linea, sin bullets ni markdown.",
      "Cada linea debe tener como maximo 8 palabras.",
      "Linea 1: bienvenida felina por haber entrado a la guia.",
      "Linea 2: pregunta si quiere la guia o avanzar.",
    ].join("\n");
  }

  const recentReplies = (request.recentAssistantReplies ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return [
    "Contexto:",
    `- Pantalla: demo`,
    `- Objetivo: explicar la pantalla sin cambiar la UI.`,
    `- Motivo para hablar: el humano ya esta dentro de la demo y espera reaccion.`,
    `- Plantilla de personalidad: ${DEMO_CHATBOT_PROMPT}`,
    `- Producto canonico: ${DEMO_PRODUCT_CONTEXT.brief}`,
    `- Objetivo real del producto: ${DEMO_PRODUCT_CONTEXT.purpose}`,
    `- Problemas que resuelve: ${DEMO_PRODUCT_CONTEXT.problemsSolved.join(
      " | ",
    )}`,
    `- Senales preventivas: ${DEMO_PRODUCT_CONTEXT.preventiveSignals.join(
      " | ",
    )}`,
    `- Propuesta de valor: ${DEMO_PRODUCT_CONTEXT.valueProposition}`,
    `- Nota de creadores: ${DEMO_PRODUCT_CONTEXT.creatorNote}`,
    `- Hero: owner=${request.ownerName?.trim() || "no informado"}, pet=${
      request.petName?.trim() || "no informada"
    }`,
    `- Secciones visibles: ${DEMO_SCREEN_CONTEXT.sections
      .map(
        (section) =>
          `${section.label} (${section.positionHint ?? "sin posicion"})`,
      )
      .join(" | ")}`,
    `- Tono esperado: ${DEMO_SCREEN_CONTEXT.tone.style}, ${DEMO_SCREEN_CONTEXT.tone.length}`,
    `- Eleccion actual: ${request.demoChoice ?? "ninguna"}`,
    request.userMessage?.trim()
      ? `- Pregunta del usuario: ${request.userMessage.trim()}`
      : "- Pregunta del usuario: no hay pregunta aun.",
    recentReplies.length
      ? `- Respuestas recientes del gato: ${recentReplies.join(" || ")}`
      : "- Respuestas recientes del gato: ninguna.",
    "",
    "Instrucciones:",
    "Devuelve exactamente 1 linea corta, sin bullets ni markdown.",
    "La linea debe tener como maximo 10 palabras.",
    "La personalidad es solo una referencia; no copies textos literales.",
    `Apoyate en estas ideas: ${KITTYPAU_PRODUCT_ANALYSIS_LINES.join(" | ")}`,
    "Debe sonar como el gato de Kittypau: sarcastico, burlon, util y preciso.",
    "No repitas ninguna frase, arranque o cierre de las respuestas recientes.",
    "Si te parece que ya dijiste lo mismo, cambia el enfoque y la redaccion.",
    "Si el usuario pregunta algo impreciso, corrige primero y luego responde.",
    "Si la pregunta no tiene que ver con Kittypau, la demo, la app o la mascota, rechaza con una frase corta y seca.",
    "Si la pregunta si es relevante, responde una sola idea clara.",
  ].join("\n");
}

function normalizeReplyLines(
  request: ChatbotGatoAiRequest,
  content: string,
): string[] {
  const lines = splitLines(content);
  const minimumLines =
    request.page === "login" ? 4 : request.page === "inicio" ? 2 : 1;
  if (lines.length < minimumLines) {
    return [];
  }
  if (request.page === "login") {
    return lines.slice(0, 4).map((line) => limitWords(line, 8));
  }
  if (request.page === "inicio") {
    return lines.slice(0, 2).map((line) => limitWords(line, 8));
  }
  return lines.slice(0, 1).map((line) => limitWords(line, 10));
}

function localFallback(request: ChatbotGatoAiRequest): ChatbotGatoAiResponse {
  if (request.page === "login") {
    const runtime = buildChatbotRuntime({
      page: "login",
      loginStep: request.loginStep,
    });
    const lines = runtime.lines;
    return {
      source: "fallback",
      model: null,
      text: lines[0] ?? LOGIN_CHATBOT_CONTEXT.trialDialog.lines[0],
      lines,
    };
  }

  if (request.page === "inicio") {
    const runtime = buildChatbotRuntime({
      page: "inicio",
      inicioStep: request.inicioStep,
    });
    const lines = runtime.lines;
    return {
      source: "fallback",
      model: null,
      text: lines[0] ?? INICIO_CHATBOT_CONTEXT.lines[0],
      lines,
    };
  }

  const runtime = buildChatbotRuntime({
    page: "demo",
    ownerName: request.ownerName,
    petName: request.petName,
    demoStep: request.demoStep,
    demoChoice: request.demoChoice,
  });
  if (request.userMessage && !isRelevantDemoMessage(request.userMessage)) {
    const refusal =
      OFF_TOPIC_REPLIES[Math.floor(Math.random() * OFF_TOPIC_REPLIES.length)];
    return {
      source: "fallback",
      model: null,
      text: refusal,
      lines: [refusal],
    };
  }
  return {
    source: "fallback",
    model: null,
    text: runtime.text,
    lines: [runtime.text],
  };
}

export async function resolveChatbotGatoAiReply(
  request: ChatbotGatoAiRequest,
): Promise<ChatbotGatoAiResponse> {
  const token = process.env.HF_TOKEN?.trim();
  const model = getConfiguredModel();
  if (
    request.page === "demo" &&
    request.userMessage &&
    !isRelevantDemoMessage(request.userMessage)
  ) {
    const refusal =
      OFF_TOPIC_REPLIES[Math.floor(Math.random() * OFF_TOPIC_REPLIES.length)];
    return {
      source: "fallback",
      model: null,
      text: refusal,
      lines: [refusal],
    };
  }
  if (!token) {
    return localFallback(request);
  }

  const response = await fetch(HF_ROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        ...buildFewShotExamples(),
        {
          role: "user",
          content: buildPagePrompt(request),
        },
      ],
      temperature: 0.55,
      presence_penalty: 0.2,
      frequency_penalty: 0.35,
      max_tokens: request.page === "login" ? 90 : 64,
      top_p: 0.9,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return localFallback(request);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return localFallback(request);
  }

  const lines = normalizeReplyLines(request, content);
  if (!lines.length) {
    return localFallback(request);
  }

  return {
    source: "hf",
    model,
    text: lines[0],
    lines,
  };
}
