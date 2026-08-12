/**
 * Helpers compartidos de parseo/estado de API, antes duplicados en
 * today/bowl/pet/story page.tsx (ver Knowledge/29_Specs/SPEC_05_Optimizacion_Tecnica.md §5).
 */

/** Normaliza una respuesta de API que puede venir como array plano o como { data: [] }. */
export function parseListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T[] }).data ?? [];
  }
  return [];
}

/**
 * Resuelve el estado de energía/conexión de un device a partir de sus dos columnas
 * (`device_state`, calculado por el bridge desde last_seen; `status`, el estado de
 * registro/ciclo de vida). Única fuente de verdad para "¿está online?" en toda la app —
 * no leer `status`/`device_state` por separado en la UI (ver SPEC_01 E4: eso es lo que
 * causaba el badge "BEBEDERO: OFFLINE" contradiciendo el texto "Bebedero: active" en /pet).
 */
export function resolveDevicePowerState(
  device:
    | { device_state?: string | null; status?: string | null }
    | null
    | undefined,
): "on" | "off" | "nodata" {
  if (!device) return "nodata";
  const state = (device.device_state ?? "").toLowerCase();
  const status = (device.status ?? "").toLowerCase();
  if (!state && !status) return "nodata";
  if (
    state.includes("offline") ||
    status === "offline" ||
    status === "inactive"
  ) {
    return "off";
  }
  if (
    state.includes("online") ||
    state.includes("linked") ||
    status === "active" ||
    status === "linked"
  ) {
    return "on";
  }
  return "nodata";
}

/** Etiqueta corta en español para mostrar `resolveDevicePowerState()` en UI. */
export function devicePowerStateLabel(state: "on" | "off" | "nodata"): string {
  if (state === "on") return "en línea";
  if (state === "off") return "desconectado";
  return "sin datos";
}
