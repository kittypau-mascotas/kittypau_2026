import { NextRequest, NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/user-server";

export function getRequestId(req: NextRequest) {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function apiError(
  req: NextRequest,
  status: number,
  code: string,
  message: string,
  details?: string,
  headers?: Record<string, string>
) {
  const requestId = getRequestId(req);
  const payload: Record<string, unknown> = {
    error: message,
    code,
    request_id: requestId,
  };

  console.error("[api_error]", {
    request_id: requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    status,
    code,
    message,
    details: details ?? null,
  });

  if (details) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status, headers });
}

export function logInfo(
  req: NextRequest,
  message: string,
  meta?: Record<string, unknown>
) {
  console.info("[api_info]", {
    request_id: getRequestId(req),
    method: req.method,
    path: req.nextUrl.pathname,
    message,
    ...meta,
  });
}

export function enforceBodySize(req: NextRequest, maxBytes: number) {
  const length = req.headers.get("content-length");
  if (!length) return null;
  const size = Number(length);
  if (!Number.isFinite(size)) return null;
  if (size > maxBytes) {
    return apiError(
      req,
      413,
      "PAYLOAD_TOO_LARGE",
      `Payload exceeds ${maxBytes} bytes`
    );
  }
  return null;
}

export async function getUserClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: "Missing Authorization header" as const };
  }

  const token = authHeader.slice("bearer ".length).trim();
  if (!token) {
    return { error: "Missing access token" as const };
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: "Invalid or expired token" as const };
  }

  return { supabase, user: data.user };
}
