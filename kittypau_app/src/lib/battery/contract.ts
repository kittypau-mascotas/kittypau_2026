export type BatterySource = "battery" | "usb" | "unknown";

export type BatteryState =
  | "optimal"
  | "medium"
  | "low"
  | "critical"
  | "charging"
  | "external_power"
  | "unknown";

export function normalizeBatteryState(value: unknown): BatteryState | null {
  if (typeof value !== "string") return null;
  const state = value.trim().toLowerCase();
  if (!state) return null;
  if (
    state === "optimal" ||
    state === "medium" ||
    state === "low" ||
    state === "critical" ||
    state === "charging" ||
    state === "external_power" ||
    state === "external-power" ||
    state === "external power" ||
    state === "unknown"
  ) {
    return state.replace(/[-\s]/g, "_") as BatteryState;
  }
  if (state === "full" || state === "charged") return "optimal";
  if (state === "plugged" || state === "plugged_in") return "external_power";
  return null;
}

export function normalizeBatterySource(value: unknown): BatterySource {
  if (typeof value !== "string") return "unknown";
  const source = value.trim().toLowerCase();
  if (!source) return "unknown";
  if (
    source.includes("usb") ||
    source.includes("ac") ||
    source.includes("external") ||
    source.includes("plug")
  ) {
    return "usb";
  }
  if (source.includes("bat")) return "battery";
  return "unknown";
}

export function resolveBatteryState(
  level: number | null,
  source: BatterySource,
  charging: boolean,
): BatteryState {
  if (charging) return "charging";
  if (source === "usb") return "external_power";
  if (level === null) return "unknown";
  if (level <= 15) return "critical";
  if (level <= 35) return "low";
  if (level <= 70) return "medium";
  return "optimal";
}

export function formatBatterySourceLabel(
  source?: BatterySource | string | null,
): string {
  if (source === "usb") return "USB";
  if (source === "battery") return "Batería";
  return "Sin fuente";
}
