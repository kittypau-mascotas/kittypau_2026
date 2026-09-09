import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  enforceBodySize,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";

// POST /api/push/register-token
// La APK nativa llama esto al abrir la app (una vez que Capacitor
// PushNotifications entrega el token de FCM) -- ver
// Knowledge/29_Specs/008-push-notifications-fcm/plan.md.
// Upsert por (user_id, token): reinstalar la app en el mismo celular puede
// dar el mismo token, no debe duplicar filas.

type RegisterTokenPayload = {
  token?: string;
  platform?: "android" | "ios";
};

export async function POST(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const tooLarge = enforceBodySize(req, 4_096);
  if (tooLarge) return tooLarge;

  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }
  const { user } = auth;

  let body: RegisterTokenPayload;
  try {
    body = await req.json();
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Body must be valid JSON");
  }

  const token = body.token?.trim();
  if (!token) {
    return apiError(req, 400, "MISSING_TOKEN", "token is required");
  }
  const platform = body.platform === "ios" ? "ios" : "android";

  const { error } = await supabaseServer.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );
  if (error) return apiError(req, 500, "SUPABASE_ERROR", error.message);

  logRequestEnd(req, startedAt, 200, { user_id: user.id, platform });
  return NextResponse.json({ ok: true });
}

// DELETE /api/push/register-token -- logout / usuario desactiva notificaciones.
export async function DELETE(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }
  const { user } = auth;

  let body: RegisterTokenPayload = {};
  try {
    body = await req.json();
  } catch {
    // sin body = borra todos los tokens del usuario (logout desde cualquier celular)
  }

  let query = supabaseServer
    .from("push_tokens")
    .delete()
    .eq("user_id", user.id);
  if (body.token?.trim()) {
    query = query.eq("token", body.token.trim());
  }
  const { error } = await query;
  if (error) return apiError(req, 500, "SUPABASE_ERROR", error.message);

  logRequestEnd(req, startedAt, 200, { user_id: user.id });
  return NextResponse.json({ ok: true });
}
