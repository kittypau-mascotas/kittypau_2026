import { supabaseServer } from "@/lib/supabase/server";

type AuditEvent = {
  event_type: string;
  actor_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function logAudit(event: AuditEvent) {
  try {
    await supabaseServer.from("audit_events").insert({
      event_type: event.event_type,
      actor_id: event.actor_id ?? null,
      entity_type: event.entity_type ?? null,
      entity_id: event.entity_id ?? null,
      payload: event.payload ?? null,
    });
  } catch {
    // Avoid breaking core flow on audit failures.
  }
}
