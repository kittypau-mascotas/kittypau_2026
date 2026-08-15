import { NextRequest, NextResponse } from "next/server";
import { apiError, getUserClient } from "../../_utils";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "edge";

// SPEC_10 §2.1 — dispositivos sin dueño, listos para vincular. Cualquier
// usuario logueado (no solo admin, a diferencia de admin/overview) — es
// parte del flujo normal de registro/alta de dispositivo.
export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { data, error } = await supabaseServer
    .from("devices")
    .select("id, device_id, device_type, device_state, last_seen")
    .is("owner_id", null)
    .order("device_id", { ascending: true });

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
