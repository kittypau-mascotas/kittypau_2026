/**
 * Diagnóstico rápido de un dispositivo KPCL — conexión, batería, acciones
 * recomendadas. Extraído tal cual de bowl/page.tsx (SPEC_02 U2, Knowledge/
 * 29_Specs/SPEC_02_UIUX_Mejoras.md) para reusar el mismo patrón de
 * confianza-en-los-datos en /today y /pet. Cero cambio de comportamiento
 * respecto al original — mismos umbrales, mismo texto.
 */
import { formatBatterySourceLabel } from "@/lib/battery/contract";

export type DiagnosticStatusTone = "ok" | "warn" | "muted";

export function batteryHealthLabel(level: number | null): string {
  if (level === null || Number.isNaN(level)) return "Sin datos";
  if (level <= 15) return "Crítica";
  if (level <= 35) return "Baja";
  if (level <= 70) return "Media";
  return "Óptima";
}

export function getConnectionHint(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "Sin check-in reciente.";
  const last = new Date(lastSeen).getTime();
  if (Number.isNaN(last)) return "Sin check-in reciente.";
  const diffMin = Math.round((Date.now() - last) / 60000);
  if (diffMin <= 5) return "Conectado en tiempo real.";
  if (diffMin <= 30) return "Conectado recientemente.";
  return "Conexión inestable o apagado.";
}

export function getStatusSummary(params: {
  hasDevice: boolean;
  batteryLevel: number | null;
  lastSeen: string | null;
}): { label: string; tone: DiagnosticStatusTone } {
  if (!params.hasDevice) return { label: "Sin datos", tone: "muted" };
  const last = params.lastSeen ? new Date(params.lastSeen).getTime() : null;
  const offline =
    last === null || Number.isNaN(last) || Date.now() - last > 30 * 60 * 1000;
  if (offline) return { label: "Atención", tone: "warn" };
  if (params.batteryLevel !== null && params.batteryLevel <= 15) {
    return { label: "Crítico", tone: "warn" };
  }
  if (params.batteryLevel !== null && params.batteryLevel <= 35) {
    return { label: "Requiere cuidado", tone: "warn" };
  }
  return { label: "Estable", tone: "ok" };
}

export function getActionNotes(params: {
  batteryLevel: number | null;
  lastSeen: string | null;
}): string[] {
  const notes: string[] = [];
  if (params.batteryLevel !== null) {
    if (params.batteryLevel <= 15) {
      notes.push("Carga el plato en las próximas horas.");
    } else if (params.batteryLevel <= 35) {
      notes.push("Planifica una carga hoy para evitar apagados.");
    }
  }
  if (!params.lastSeen) {
    notes.push("Revisa energía y Wi-Fi antes de usarlo.");
  }
  if (notes.length === 0) {
    notes.push("Todo estable. Mantén el plato conectado.");
  }
  return notes;
}

export function getStatusBlurb(
  hasDevice: boolean,
  tone: DiagnosticStatusTone,
): string {
  if (!hasDevice) return "Sin diagnóstico disponible.";
  if (tone === "warn") {
    return "Se detectó un riesgo operativo. Revisa batería, conexión y última señal.";
  }
  if (tone === "ok") return "Plato estable y conectado. Todo en orden.";
  return "Todavía no hay suficientes lecturas para un diagnóstico completo. Cuando el plato siga publicando datos, aquí verás una lectura más precisa.";
}

export function getBatterySummary(params: {
  level: number | null;
  voltage: number | null;
  source: string | null;
  isEstimated: boolean;
}): { summary: string; extra: string } {
  const summary =
    params.level !== null && params.level !== undefined
      ? `${params.level}% · ${batteryHealthLabel(params.level)}`
      : "Sin datos";
  const extra = [
    params.isEstimated ? "estimada" : null,
    formatBatterySourceLabel(params.source),
    typeof params.voltage === "number" ? `${params.voltage.toFixed(2)}V` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { summary, extra };
}
