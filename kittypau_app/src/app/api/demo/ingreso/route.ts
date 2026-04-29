import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  enforceBodySize,
  logRequestEnd,
  startRequestTimer,
} from "@/app/api/_utils";

type DemoIngresoBody = {
  owner_name?: string;
  pet_name?: string;
  email?: string;
  pet_type?: string;
  source?: string;
};

function asTrimmedString(value: unknown, maxLen: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  const sizeError = enforceBodySize(req, 4096);
  if (sizeError) return sizeError;

  const startedAt = startRequestTimer(req);

  let body: DemoIngresoBody | null = null;
  try {
    body = (await req.json()) as DemoIngresoBody;
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

  const ownerName = asTrimmedString(body?.owner_name, 120);
  const petName = asTrimmedString(body?.pet_name, 120);
  const email = asTrimmedString(body?.email, 254)?.toLowerCase() ?? null;
  const petType = asTrimmedString(body?.pet_type, 32)?.toLowerCase() ?? null;
  const source = asTrimmedString(body?.source, 64) ?? "demo_app";

  if (!email) {
    logRequestEnd(req, startedAt, 400);
    return apiError(req, 400, "MISSING_EMAIL", "Email is required");
  }

  const userAgent = req.headers.get("user-agent");
  const referer = req.headers.get("referer");
  const forwardedFor = req.headers.get("x-forwarded-for");

  const { error: leadError } = await supabaseServer.rpc("record_demo_ingreso", {
    p_email: email,
    p_owner_name: ownerName,
    p_pet_name: petName,
    p_source: source,
  });

  if (leadError) {
    logRequestEnd(req, startedAt, 500);
    return apiError(req, 500, "SUPABASE_ERROR", leadError.message);
  }

  const { error: auditError } = await supabaseServer
    .from("audit_events")
    .insert({
      event_type: "Ingreso a Demo",
      actor_id: null,
      entity_type: "demo_app",
      entity_id: null,
      payload: {
        user_category: "Ingreso a Demo",
        owner_name: ownerName,
        pet_name: petName,
        email,
        pet_type: petType,
        source,
        user_agent: userAgent,
        referer,
        forwarded_for: forwardedFor,
        recorded_at: new Date().toISOString(),
      },
    });

  if (auditError) {
    logRequestEnd(req, startedAt, 500);
    return apiError(req, 500, "SUPABASE_ERROR", auditError.message);
  }

  logRequestEnd(req, startedAt, 200);
  return NextResponse.json({ ok: true });
}
