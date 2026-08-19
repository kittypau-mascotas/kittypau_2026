/**
 * Umbral de confirmación para la calibración por tara del plato (spec 005).
 * Tras ejecutar CALIBRATE_WEIGHT/tare, el sensor queda en 0 físicamente, pero
 * el ruido normal del sensor (mismo deadband de 2g que ya documenta
 * Knowledge/07_MQTT/README_MQTT.md para la publicación de SENSORS) hace que
 * la siguiente lectura real rara vez sea exactamente 0.00 — se acepta un
 * margen pequeño, no una igualdad estricta.
 */

/** Margen por defecto en gramos — mismo orden de magnitud que el deadband de
 * publicación del firmware (2g), con margen extra para el redondeo del HX711. */
export const TARE_CONFIRM_THRESHOLD_G = 5;

/**
 * ¿Esta lectura post-tara confirma que el dispositivo quedó en ~0 con el
 * plato puesto? No es una igualdad estricta a 0 — un pequeño positivo o
 * negativo dentro del margen de ruido del sensor sigue siendo válido.
 */
export function isTareConfirmed(
  weightGrams: number,
  thresholdGrams: number = TARE_CONFIRM_THRESHOLD_G,
): boolean {
  if (!Number.isFinite(weightGrams)) return false;
  return Math.abs(weightGrams) <= thresholdGrams;
}
