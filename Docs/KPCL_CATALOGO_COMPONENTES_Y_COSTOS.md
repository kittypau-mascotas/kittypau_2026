# KPCL - Catalogo Estandar de Componentes y Costos

## Objetivo
Estandarizar la cuantificacion absoluta de cada KPCL (construccion, mantenimiento y funcionamiento), diferenciando por tipo/modelo de microcontrolador.

## Fuentes base consideradas
- `public.devices` (campos: `device_id`, `device_type`, `device_model`, `sensor_health`, `wifi_status`, `last_seen`)
- Estado operativo actual de KPCL0031..KPCL0041.
- Compra filamento PLA+: CLP 16.000 por 1kg (incluye envio), proveedor VOXEL SYSTEMICS SpA.
- Tipo de cambio operativo usado para dashboard: `1 USD = 950 CLP`.

## Familias de hardware detectadas

### 1) KPCL Comedero (ESP8266)
- Perfil: `NodeMCU v3 CP2102`
- Dispositivos observados: KPCL0033, KPCL0034, KPCL0035, KPCL0037, KPCL0038 (algunos sin modelo explicito, compatibles por tipo/telemetria).

### 2) KPCL Comedero CAM (ESP32-CAM)
- Perfil: `AI-Thinker ESP32-CAM`
- Dispositivos observados: KPCL0040, KPCL0041.

### 3) KPCL Base no tipificado
- Dispositivos con modelo faltante o incompleto: KPCL0031, KPCL0036, KPCL0039.

## Diccionario de cuantificacion (USD por unidad)

```json
{
  "nodemcu-v3": {
    "label": "KPCL Comedero (NodeMCU v3 CP2102)",
    "print_grams": 185,
    "print_hours": 6.2,
    "print_unit_cost_usd": 2.4,
    "maintenance_monthly_usd": 0.85,
    "power_monthly_usd": 0.55,
    "components": [
      { "code": "MCU_ESP8266", "name": "NodeMCU v3 CP2102 (ESP8266)", "qty": 1, "unit_cost_usd": 4.9 },
      { "code": "LOAD_CELL", "name": "Celda de carga 5kg", "qty": 1, "unit_cost_usd": 2.1 },
      { "code": "ADC_HX711", "name": "Conversor HX711", "qty": 1, "unit_cost_usd": 1.2 },
      { "code": "SENSOR_DHT", "name": "Sensor DHT temp/humedad", "qty": 1, "unit_cost_usd": 1.1 },
      { "code": "PSU_5V", "name": "Fuente 5V + plug", "qty": 1, "unit_cost_usd": 2.3 },
      { "code": "CABLING", "name": "Cables, conectores, tornillos", "qty": 1, "unit_cost_usd": 1.0 },
      { "code": "BODY_3D", "name": "Cuerpo impreso 3D", "qty": 1, "unit_cost_usd": 2.4 }
    ]
  },
  "esp32-cam": {
    "label": "KPCL Comedero CAM (AI-Thinker ESP32-CAM)",
    "print_grams": 205,
    "print_hours": 6.9,
    "print_unit_cost_usd": 2.8,
    "maintenance_monthly_usd": 1.05,
    "power_monthly_usd": 0.7,
    "components": [
      { "code": "MCU_ESP32CAM", "name": "AI-Thinker ESP32-CAM", "qty": 1, "unit_cost_usd": 7.2 },
      { "code": "LOAD_CELL", "name": "Celda de carga 5kg", "qty": 1, "unit_cost_usd": 2.1 },
      { "code": "ADC_HX711", "name": "Conversor HX711", "qty": 1, "unit_cost_usd": 1.2 },
      { "code": "SENSOR_DHT", "name": "Sensor DHT temp/humedad", "qty": 1, "unit_cost_usd": 1.1 },
      { "code": "PSU_5V", "name": "Fuente 5V + plug", "qty": 1, "unit_cost_usd": 2.3 },
      { "code": "CABLING", "name": "Cables, conectores, tornillos", "qty": 1, "unit_cost_usd": 1.1 },
      { "code": "BODY_3D", "name": "Cuerpo impreso 3D (cam)", "qty": 1, "unit_cost_usd": 2.8 }
    ]
  },
  "generic-kpcl": {
    "label": "KPCL Base (generico)",
    "print_grams": 180,
    "print_hours": 6.0,
    "print_unit_cost_usd": 2.3,
    "maintenance_monthly_usd": 0.8,
    "power_monthly_usd": 0.5
  }
}
```

## Reglas de mapeo KPCL -> perfil
1. Si `device_model` contiene `ESP32-CAM` o `device_type` contiene `cam` -> `esp32-cam`.
2. Si `device_model` contiene `NodeMCU` o `CP2102` -> `nodemcu-v3`.
3. Si no hay modelo -> `generic-kpcl`.

## Formula de costo por KPCL
- `costo_componentes_usd = sum(qty * unit_cost_usd)`
- `costo_unitario_construccion_usd = costo_componentes_usd` (incluye cuerpo 3D)
- `costo_operacion_mensual_usd = maintenance_monthly_usd + power_monthly_usd`

## Simulacion de costo cloud por KPCL (basada en data real)
Cuando plan proveedor = free (0 USD), se usa shadow-pricing para cuantificar impacto por dispositivo:

- `mb_kpcl` = MB reales del dispositivo (ventana 28d).
- `mb_total` = MB reales de todos los KPCL.
- `h_kpcl` = horas online del dispositivo (ventana 28d).
- `h_total` = horas online de todos los KPCL.

Presupuesto mensual simulado:
- `hivemq_budget_usd = mb_total * 0.06`
- `vercel_budget_usd = mb_total * 0.04 + h_total * 0.01`

Distribucion por KPCL:
- `hivemq_kpcl_usd = hivemq_budget_usd * (mb_kpcl / mb_total)`
- `vercel_kpcl_usd = vercel_budget_usd * (0.7 * mb_kpcl/mb_total + 0.3 * h_kpcl/h_total)`

Costo mensual operativo por KPCL:
- `opex_kpcl_usd = maintenance_monthly_usd + power_monthly_usd + hivemq_kpcl_usd + vercel_kpcl_usd`

## Variables clave estandarizadas
- Microcontrolador
- Celdas de carga
- Convertidor HX711
- Sensor ambiental
- Fuente/plug
- Cables y conectores
- Impresion 3D (gramos, tiempo, costo unitario)
- Mantenimiento mensual
- Costo electrico mensual aproximado
- Costo simulado de HiveMQ por KPCL
- Costo simulado de Vercel por KPCL

## Registro de compra filamento (referencia)
- Proveedor: `VOXEL SYSTEMICS SpA`
- Medio de pago: `Mercado Pago`
- Precio total: `CLP 16.000`
- Presentacion: `PLA+ eSUN 1.75mm 1Kg`
- Costo por gramo aproximado: `CLP 16/g`
- Costo por gramo aproximado en USD: `0.0168 USD/g` (a 950 CLP/USD)

## Uso en Admin
- Bajo la foto del comedero:
  - selector de KPCL,
  - lista de componentes por unidad,
  - subtotal por componente,
  - total por unidad,
  - costo de operacion mensual.
