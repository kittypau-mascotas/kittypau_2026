export type KitComponent = {
  code: string;
  name: string;
  qty: number;
  unit_cost_usd: number;
  notes?: string;
};

export type KpclCatalog = {
  key: string;
  label: string;
  print_grams: number;
  print_hours: number;
  print_unit_cost_usd: number;
  maintenance_monthly_usd: number;
  power_monthly_usd: number;
  components: KitComponent[];
};

export const KPCL_3D_PRINT_STATUS: Record<string, boolean> = {
  KPCL0031: false,
  KPCL0033: true,
  KPCL0034: true,
  KPCL0035: true,
  KPCL0036: false,
  KPCL0037: true,
  KPCL0038: true,
  KPCL0039: false,
  KPCL0040: true,
  KPCL0041: true,
};

export function has3dPrintForKpcl(deviceId: string) {
  return KPCL_3D_PRINT_STATUS[deviceId] ?? false;
}

export const DEFAULT_KPCL_COST_CATALOG: Record<string, KpclCatalog> = {
  "nodemcu-v3": {
    key: "nodemcu-v3",
    label: "KPCL Comedero (NodeMCU v3 CP2102)",
    print_grams: 185,
    print_hours: 6.2,
    print_unit_cost_usd: 2.4,
    maintenance_monthly_usd: 0.85,
    power_monthly_usd: 0.55,
    components: [
      { code: "MCU_ESP8266", name: "NodeMCU v3 CP2102 (ESP8266)", qty: 1, unit_cost_usd: 4.9 },
      { code: "LOAD_CELL", name: "Celda de carga 5kg", qty: 1, unit_cost_usd: 2.1 },
      { code: "ADC_HX711", name: "Conversor HX711", qty: 1, unit_cost_usd: 1.2 },
      { code: "SENSOR_DHT", name: "Sensor DHT (temp/humedad)", qty: 1, unit_cost_usd: 1.1 },
      { code: "DC_BUCK", name: "Convertidor DC-DC buck 5V/3.3V", qty: 1, unit_cost_usd: 1.4 },
      { code: "LDO", name: "Regulador LDO + filtrado", qty: 1, unit_cost_usd: 0.55 },
      { code: "PCB_PROTO", name: "PCB/protoboard + headers", qty: 1, unit_cost_usd: 1.0 },
      { code: "SWITCH", name: "Interruptor encendido", qty: 1, unit_cost_usd: 0.45 },
      { code: "LED", name: "LED estado + resistencias", qty: 1, unit_cost_usd: 0.25 },
      { code: "PSU_5V", name: "Fuente 5V + plug", qty: 1, unit_cost_usd: 2.3 },
      { code: "CABLING", name: "Cables, conectores, tornillos", qty: 1, unit_cost_usd: 1.0 },
      { code: "BOWL", name: "Plato/inserto comedero", qty: 1, unit_cost_usd: 1.8 },
      { code: "BODY_3D", name: "Cuerpo impreso 3D", qty: 1, unit_cost_usd: 2.4 },
    ],
  },
  "esp32-cam": {
    key: "esp32-cam",
    label: "KPCL Comedero CAM (AI-Thinker ESP32-CAM)",
    print_grams: 205,
    print_hours: 6.9,
    print_unit_cost_usd: 2.8,
    maintenance_monthly_usd: 1.05,
    power_monthly_usd: 0.7,
    components: [
      { code: "MCU_ESP32CAM", name: "AI-Thinker ESP32-CAM", qty: 1, unit_cost_usd: 7.2 },
      { code: "LOAD_CELL", name: "Celda de carga 5kg", qty: 1, unit_cost_usd: 2.1 },
      { code: "ADC_HX711", name: "Conversor HX711", qty: 1, unit_cost_usd: 1.2 },
      { code: "SENSOR_DHT", name: "Sensor DHT (temp/humedad)", qty: 1, unit_cost_usd: 1.1 },
      { code: "DC_BUCK", name: "Convertidor DC-DC buck 5V/3.3V", qty: 1, unit_cost_usd: 1.4 },
      { code: "LDO", name: "Regulador LDO + filtrado", qty: 1, unit_cost_usd: 0.55 },
      { code: "PCB_PROTO", name: "PCB/protoboard + headers", qty: 1, unit_cost_usd: 1.0 },
      { code: "CAM_OPTICS", name: "Lente/cableado auxiliar cam", qty: 1, unit_cost_usd: 0.9 },
      { code: "SWITCH", name: "Interruptor encendido", qty: 1, unit_cost_usd: 0.45 },
      { code: "LED", name: "LED estado + resistencias", qty: 1, unit_cost_usd: 0.25 },
      { code: "PSU_5V", name: "Fuente 5V + plug", qty: 1, unit_cost_usd: 2.3 },
      { code: "CABLING", name: "Cables, conectores, tornillos", qty: 1, unit_cost_usd: 1.1 },
      { code: "BOWL", name: "Plato/inserto comedero", qty: 1, unit_cost_usd: 1.8 },
      { code: "BODY_3D", name: "Cuerpo impreso 3D (cam)", qty: 1, unit_cost_usd: 2.8 },
    ],
  },
  "generic-kpcl": {
    key: "generic-kpcl",
    label: "KPCL Base (genérico)",
    print_grams: 180,
    print_hours: 6,
    print_unit_cost_usd: 2.3,
    maintenance_monthly_usd: 0.8,
    power_monthly_usd: 0.5,
    components: [
      { code: "MCU_GENERIC", name: "Microcontrolador WiFi", qty: 1, unit_cost_usd: 5.0 },
      { code: "LOAD_CELL", name: "Celda de carga 5kg", qty: 1, unit_cost_usd: 2.1 },
      { code: "ADC_HX711", name: "Conversor HX711", qty: 1, unit_cost_usd: 1.2 },
      { code: "SENSOR_DHT", name: "Sensor DHT (temp/humedad)", qty: 1, unit_cost_usd: 1.1 },
      { code: "DC_BUCK", name: "Convertidor DC-DC buck 5V/3.3V", qty: 1, unit_cost_usd: 1.4 },
      { code: "LDO", name: "Regulador LDO + filtrado", qty: 1, unit_cost_usd: 0.55 },
      { code: "PCB_PROTO", name: "PCB/protoboard + headers", qty: 1, unit_cost_usd: 1.0 },
      { code: "SWITCH", name: "Interruptor encendido", qty: 1, unit_cost_usd: 0.45 },
      { code: "LED", name: "LED estado + resistencias", qty: 1, unit_cost_usd: 0.25 },
      { code: "PSU_5V", name: "Fuente 5V + plug", qty: 1, unit_cost_usd: 2.3 },
      { code: "CABLING", name: "Cables, conectores, tornillos", qty: 1, unit_cost_usd: 1.0 },
      { code: "BOWL", name: "Plato/inserto comedero", qty: 1, unit_cost_usd: 1.8 },
      { code: "BODY_3D", name: "Cuerpo impreso 3D", qty: 1, unit_cost_usd: 2.3 },
    ],
  },
};

export function resolveCatalogKeyByModelAndType(deviceModel: string | null, deviceType: string | null) {
  const model = (deviceModel ?? "").toLowerCase();
  const type = (deviceType ?? "").toLowerCase();
  if (model.includes("esp32-cam") || type.includes("cam")) return "esp32-cam";
  if (model.includes("nodemcu") || model.includes("cp2102")) return "nodemcu-v3";
  return "generic-kpcl";
}
