/**
 * Zona horaria oficial de Chile Continental: America/Santiago
 * Servidor NTP de referencia: ntp.shoa.cl (Armada de Chile)
 *
 * CLT  = UTC-4 (invierno)
 * CLST = UTC-3 (verano / DST)
 *
 * REGLA: almacenamiento siempre en UTC (ISO 8601 / timestamptz),
 * display y lógica de ciclo siempre en America/Santiago.
 */

export const CHILE_TZ = "America/Santiago" as const;
export const CHILE_LOCALE = "es-CL" as const;

/** Hora actual (0-23) en zona horaria Chile. */
export function getChileHour(date: Date = new Date()): number {
  const raw = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed % 24 : 0;
}

/**
 * Ventana del ciclo diario 06:00-06:00 en hora Chile.
 * Retorna startMs y endMs como timestamps UTC.
 */
export function getChileDayNightWindow(now: Date = new Date()): {
  startMs: number;
  endMs: number;
} {
  const chileHour = getChileHour(now);
  // Minutos/segundos/ms son iguales en cualquier timezone
  const msIntoChileHour =
    (now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
  const hoursSince6 = (chileHour - 6 + 24) % 24;
  const startMs =
    now.getTime() - hoursSince6 * 60 * 60 * 1000 - msIntoChileHour;
  return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
}

/**
 * Fecha YYYY-MM-DD en hora Chile (para agrupación de sesiones diarias).
 * No usar UTC slice — un día UTC puede ser otro día en Santiago.
 */
export function chileDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Formatea cualquier fecha en locale es-CL + America/Santiago. */
export function chileFormat(
  value: Date | string | number,
  options: Omit<Intl.DateTimeFormatOptions, "timeZone">,
): string {
  const date =
    typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : value;
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat(CHILE_LOCALE, {
    timeZone: CHILE_TZ,
    ...options,
  }).format(date);
}

/** HH:mm en hora Chile. */
export function chileShortTime(value: Date | string | number): string {
  return chileFormat(value, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** dd MMM HH:mm en hora Chile. */
export function chileCompactDatetime(value: Date | string | number): string {
  return chileFormat(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Fecha corta: dd/MM/yyyy en hora Chile. */
export function chileShortDate(value: Date | string | number): string {
  return chileFormat(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Fecha larga: lun 22 abr 2026 en hora Chile. */
export function chileLongDate(value: Date | string | number): string {
  return chileFormat(value, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Timestamp ISO con offset Chile (útil para logging). */
export function chileISOString(date: Date = new Date()): string {
  const offset =
    new Intl.DateTimeFormat("en-US", {
      timeZone: CHILE_TZ,
      timeZoneName: "shortOffset",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-4";
  // Retorna ISO local aproximado para logging — el almacenamiento usa toISOString() (UTC)
  return `${date.toISOString().slice(0, 19)}${offset.replace("GMT", "")}`;
}
