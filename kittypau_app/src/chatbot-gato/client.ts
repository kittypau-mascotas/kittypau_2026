import type { ChatbotGatoPage } from "./runtime";

export type ChatbotGatoClientRequest = {
  page: ChatbotGatoPage;
  ownerName?: string;
  petName?: string;
  email?: string;
  recentAssistantReplies?: string[];
  loginStep?: 0 | 1 | 2 | 3;
  demoStep?: 0 | 1 | 2 | 3;
  demoChoice?: "perro" | "gato" | null;
  inicioStep?: 0 | 1;
  userMessage?: string;
};

export type ChatbotGatoClientResponse = {
  ok: true;
  page: ChatbotGatoPage;
  source: "hf" | "fallback";
  model: string | null;
  text: string;
  lines: readonly string[];
};

export async function fetchChatbotGatoResponse(
  request: ChatbotGatoClientRequest,
  signal?: AbortSignal,
): Promise<ChatbotGatoClientResponse | null> {
  const response = await fetch("/api/chatbot-gato", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Partial<ChatbotGatoClientResponse>;
  if (
    payload?.ok !== true ||
    !payload.page ||
    !payload.text ||
    !Array.isArray(payload.lines)
  ) {
    return null;
  }

  return {
    ok: true,
    page: payload.page,
    source: payload.source ?? "fallback",
    model: payload.model ?? null,
    text: payload.text,
    lines: payload.lines,
  };
}
