/**
 * Helpers de formato/presentación puros de /today — sin estado, sin fetch.
 * Compartidos entre page.tsx y los componentes de today/_components/.
 */

export const powerDotStyles: Record<"on" | "off" | "nodata", string> = {
  on: "bg-emerald-500 border-emerald-400",
  off: "bg-rose-500 border-rose-400",
  nodata: "bg-white border-slate-300",
};

export function getConnectivityLabel(timestamp?: string | null): string {
  if (!timestamp) return "Sin señal";
  const diffMinutes = Math.round(
    Math.max(0, Date.now() - new Date(timestamp).getTime()) / 60000,
  );
  if (!Number.isFinite(diffMinutes)) return "Sin señal";
  if (diffMinutes <= 10) return "Estable";
  if (diffMinutes <= 45) return "Reciente";
  if (diffMinutes <= 180) return "Atrasada";
  return "Sin señal";
}

export function getBatteryStateLabel(
  state: string | null | undefined,
  level: number | null | undefined,
): { text: string; className: string } {
  if (state === "charging")
    return { text: "Cargando", className: "text-emerald-600 font-medium" };
  if (state === "charged")
    return { text: "Cargado", className: "text-emerald-500 font-medium" };
  if (state === "battery_only" && level != null)
    return {
      text: `Batería ${Math.round(level)}%`,
      className: "text-slate-500",
    };
  if (level != null)
    return { text: `${Math.round(level)}%`, className: "text-slate-500" };
  return { text: "N/D", className: "text-slate-400" };
}

export function getOperationalLabel(
  powerState: "on" | "off" | "nodata",
): string {
  if (powerState === "on") return "Dispositivo encendido";
  if (powerState === "off") return "Dispositivo apagado";
  return "Sin telemetría";
}

export function getWellnessToneClasses(
  stateLabel: string,
  type: "food" | "water",
): string {
  if (stateLabel === "Confirmado") {
    return type === "food"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-sky-200 bg-sky-50 text-sky-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function renderTrend(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.001) return null;
  const up = delta > 0;
  return (
    <span
      aria-hidden="true"
      className="ml-1 inline-flex text-[9px] leading-none opacity-80 text-sky-600"
    >
      {up ? "▲" : "▼"}
    </span>
  );
}
