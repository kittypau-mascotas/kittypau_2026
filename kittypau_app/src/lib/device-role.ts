/**
 * Clasificación comida/agua de un dispositivo — capa de override sobre
 * `devices.device_type`.
 *
 * ponytail: el firmware físico de KPCL0035 se reporta a sí mismo como
 * "comedero" por MQTT, y `bridge/src/index.js` copia ese valor crudo a
 * Supabase en cada heartbeat (~cada 30s) — cualquier UPDATE directo en la
 * tabla `devices` se revierte solo en segundos. No es un dato mal cargado
 * una vez, es un dato que se recarga mal continuamente desde el hardware.
 * Ver Knowledge/29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos.md §4.
 *
 * Techo de este parche: corrige la lectura a nivel de `kittypau_app`, no la
 * causa raíz. Upgrade path real — cualquiera de estos, decisión de Mauro:
 *   (a) reconfigurar/reflashear el firmware físico de KPCL0035, o
 *   (b) hacer que el bridge no pise `device_type` si ya fue clasificado
 *       manualmente.
 * Hasta entonces, DEVICE_TYPE_OVERRIDES es la fuente de verdad para estos
 * device_id específicos — gana siempre sobre `device_type` de la DB.
 */
export type DeviceRole = "food_bowl" | "water_bowl" | "other";

const DEVICE_TYPE_OVERRIDES: Record<string, DeviceRole> = {
  // Bebedero real de Bandida, confirmado por Mauro 2026-08-13 — ver SPEC_08.
  KPCL0035: "water_bowl",
};

const WATER_TYPE_HINTS = ["water_bowl", "bebedero", "water"];
const FOOD_TYPE_HINTS = ["food_bowl", "comedero", "food"];

/**
 * Resuelve el rol real de un device: override explícito primero (para los
 * casos donde el firmware miente), si no hay override cae a clasificar
 * `device_type` por substring (reconoce español/inglés/variantes _cam).
 */
export function resolveDeviceRole(
  deviceId: string | null | undefined,
  deviceType: string | null | undefined,
): DeviceRole {
  const code = (deviceId ?? "").toUpperCase();
  const override = DEVICE_TYPE_OVERRIDES[code];
  if (override) return override;

  const type = (deviceType ?? "").toLowerCase();
  if (WATER_TYPE_HINTS.some((hint) => type.includes(hint))) return "water_bowl";
  if (FOOD_TYPE_HINTS.some((hint) => type.includes(hint))) return "food_bowl";
  return "other";
}

export function isFoodDeviceRole(
  deviceId?: string | null,
  deviceType?: string | null,
): boolean {
  return resolveDeviceRole(deviceId, deviceType) === "food_bowl";
}

export function isWaterDeviceRole(
  deviceId?: string | null,
  deviceType?: string | null,
): boolean {
  return resolveDeviceRole(deviceId, deviceType) === "water_bowl";
}
