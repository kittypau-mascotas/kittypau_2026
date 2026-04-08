import { NextRequest, NextResponse } from "next/server";
import { apiError, enforceBodySize, startRequestTimer, logRequestEnd } from "../_utils";
import { resolveChatbotGatoAiReply, type ChatbotGatoAiRequest } from "@/chatbot-gato/hf";
import type { ChatbotGatoPage } from "@/chatbot-gato/runtime";

function isChatbotGatoPage(value: unknown): value is ChatbotGatoPage {
  return value === "login" || value === "demo" || value === "inicio";
}

function parseStep(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export async function POST(req: NextRequest) {
  const sizeError = enforceBodySize(req, 8192);
  if (sizeError) return sizeError;

  const startedAt = startRequestTimer(req);
  let body: Record<string, unknown> | null = null;

  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch (error) {
    logRequestEnd(req, startedAt, 400);
    return apiError(
      req,
      400,
      "INVALID_JSON",
      "Invalid JSON body",
      error instanceof Error ? error.message : undefined,
    );
  }

  const page = body?.page;
  if (!isChatbotGatoPage(page)) {
    logRequestEnd(req, startedAt, 400);
    return apiError(req, 400, "INVALID_PAGE", "Invalid chatbot page");
  }

  const payload: ChatbotGatoAiRequest = {
    page,
    ownerName: typeof body?.ownerName === "string" ? body.ownerName : undefined,
    petName: typeof body?.petName === "string" ? body.petName : undefined,
    email: typeof body?.email === "string" ? body.email : undefined,
    recentAssistantReplies: Array.isArray(body?.recentAssistantReplies)
      ? body.recentAssistantReplies.filter(
          (value): value is string => typeof value === "string",
        )
      : undefined,
    userMessage:
      typeof body?.userMessage === "string" ? body.userMessage : undefined,
  };

  if (page === "login") {
    const loginStep = parseStep(body?.loginStep);
    if (loginStep !== null) payload.loginStep = loginStep as 0 | 1 | 2 | 3;
  } else if (page === "demo") {
    const demoStep = parseStep(body?.demoStep);
    if (demoStep !== null) payload.demoStep = demoStep as 0 | 1 | 2 | 3;
    if (body?.demoChoice === "perro" || body?.demoChoice === "gato") {
      payload.demoChoice = body.demoChoice;
    }
  } else if (page === "inicio") {
    const inicioStep = parseStep(body?.inicioStep);
    if (inicioStep !== null) payload.inicioStep = inicioStep as 0 | 1;
  }

  const reply = await resolveChatbotGatoAiReply(payload);
  logRequestEnd(req, startedAt, 200, {
    page,
    source: reply.source,
    model: reply.model,
    lines: reply.lines.length,
  });

  return NextResponse.json({
    ok: true,
    page,
    source: reply.source,
    model: reply.model,
    text: reply.text,
    lines: reply.lines,
  });
}


