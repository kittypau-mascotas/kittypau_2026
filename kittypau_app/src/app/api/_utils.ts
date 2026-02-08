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
  details?: string
) {
  const payload: Record<string, unknown> = {
    error: message,
    code,
    request_id: getRequestId(req),
  };

  if (details) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
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
