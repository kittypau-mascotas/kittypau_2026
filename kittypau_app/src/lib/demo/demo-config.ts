/**
 * Dispositivo cuya data real espeja la demo pública de `/today`
 * (Knowledge/29_Specs/009-demo-today-en-vivo).
 *
 * Server-only de hecho: lee env SIN prefijo `NEXT_PUBLIC_`, así que nunca
 * llega al bundle del cliente. (El paquete `server-only` no está instalado
 * -- rompía vitest; ver hunger-bar-server.ts).
 *
 * Se referencia por CÓDIGO KPCL, no por nombre de mascota, para que sea
 * reconfigurable sin tocar código: se cambia la env var y se redeploya
 * (Edge Case "Bandida deja de estar vinculada" del spec). El endpoint
 * `GET /api/demo/today` traduce código -> `devices.id` con service_role.
 */

const DEFAULT_FOOD_CODE = "KPCL0034"; // único device con motor v2 validado (spec 007)
const DEFAULT_WATER_CODE = "KPCL0035"; // su bebedero -- "sin modelo de detección todavía"

export function getDemoDeviceCodes(): { food: string; water: string } {
  const food = process.env.DEMO_FOOD_DEVICE_CODE?.trim() || DEFAULT_FOOD_CODE;
  const water =
    process.env.DEMO_WATER_DEVICE_CODE?.trim() || DEFAULT_WATER_CODE;
  return { food: food.toUpperCase(), water: water.toUpperCase() };
}
