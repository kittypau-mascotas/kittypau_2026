const DEFAULT_GAP_ALERT_MINUTES = 5;

export function computeReadingGapMinutes(
  previousRecordedAt: string | null | undefined,
  currentRecordedAt: string | null | undefined,
): number | null {
  if (!previousRecordedAt || !currentRecordedAt) return null;
  const previousMs = Date.parse(previousRecordedAt);
  const currentMs = Date.parse(currentRecordedAt);
  if (!Number.isFinite(previousMs) || !Number.isFinite(currentMs)) return null;
  const gapMinutes = (currentMs - previousMs) / 60_000;
  if (!Number.isFinite(gapMinutes)) return null;
  return Math.max(0, gapMinutes);
}

export function hasReadingGapExceeded(
  previousRecordedAt: string | null | undefined,
  currentRecordedAt: string | null | undefined,
  thresholdMinutes = DEFAULT_GAP_ALERT_MINUTES,
): boolean {
  const gapMinutes = computeReadingGapMinutes(
    previousRecordedAt,
    currentRecordedAt,
  );
  return gapMinutes !== null && gapMinutes >= thresholdMinutes;
}

export function getReadingGapAlertThresholdMinutes() {
  return DEFAULT_GAP_ALERT_MINUTES;
}
