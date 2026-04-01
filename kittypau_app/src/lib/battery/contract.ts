export type BatterySource = "battery" | "usb" | "unknown";

export type BatteryState =
  | "optimal"
  | "medium"
  | "low"
  | "critical"
  | "charging"
  | "external_power"
  | "unknown";

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
