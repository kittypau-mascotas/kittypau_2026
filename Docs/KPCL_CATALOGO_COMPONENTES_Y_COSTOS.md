# KPCL - Catalogo Estandar de Componentes y Costos

## Objetivo
Estandarizar la cuantificacion absoluta de cada KPCL para construccion, mantenimiento y operacion.

## Fuentes base
- `public.devices` (`device_id`, `device_type`, `device_model`, `last_seen`, `sensor_health`, `wifi_status`)
- estados operativos KPCL0031..KPCL0041
- compra filamento PLA+ (CLP 16.000 / 1kg con envio)
- tipo de cambio operativo: `1 USD = 950 CLP`

## Perfiles de hardware
### A) KPCL Comedero (NodeMCU v3 CP2102)
Uso tipico: KPCL sin camara.

### B) KPCL Comedero CAM (AI-Thinker ESP32-CAM)
Uso tipico: KPCL con camara.

### C) KPCL Generico
Fallback para unidades sin modelo explicitado.

## Diccionario base (USD por unidad)

```json
{
  "nodemcu-v3": {
    "mcu": 4.90,
    "load_cell": 2.10,
    "hx711": 1.20,
    "sensor_temp_hum": 1.10,
    "pcb_regulacion": 2.20,
    "fuente_plug_5v": 2.30,
    "cables_conectores_tornillos": 1.00,
    "packaging": 0.90,
    "cuerpo_3d": 2.40,
    "ensamblaje": 1.80,
    "postproceso": 0.70,
    "qa_calibracion": 0.90,
    "maintenance_monthly": 0.85,
    "power_monthly": 0.55,
    "print_grams": 185,
    "print_hours": 6.2
  },
  "esp32-cam": {
    "mcu": 7.20,
    "load_cell": 2.10,
    "hx711": 1.20,
    "sensor_temp_hum": 1.10,
    "pcb_regulacion": 2.40,
    "fuente_plug_5v": 2.30,
    "cables_conectores_tornillos": 1.10,
    "packaging": 0.95,
    "cuerpo_3d": 2.80,
    "ensamblaje": 2.10,
    "postproceso": 0.75,
    "qa_calibracion": 1.00,
    "maintenance_monthly": 1.05,
    "power_monthly": 0.70,
    "print_grams": 205,
    "print_hours": 6.9
  },
  "generic-kpcl": {
    "maintenance_monthly": 0.80,
    "power_monthly": 0.50,
    "print_grams": 180,
    "print_hours": 6.0
  }
}
```

## Reglas de mapeo
1. Si `device_model` contiene `ESP32-CAM` o `device_type` contiene `cam` -> `esp32-cam`.
2. Si `device_model` contiene `NodeMCU` o `CP2102` -> `nodemcu-v3`.
3. Si falta modelo -> `generic-kpcl`.

## Formulas de costo
### Costo de construccion unitario
- `bom_usd = suma(componentes fisicos)`
- `manufactura_usd = ensamblaje + postproceso + qa_calibracion + cuerpo_3d`
- `costo_unitario_construccion_usd = bom_usd + manufactura_usd`

### Costo operativo mensual por KPCL
- `opex_base_kpcl_usd = maintenance_monthly + power_monthly`

### Impacto cloud por KPCL (shadow-pricing)
Con ventana de 28 dias:
- `hivemq_budget_usd = mb_total * 0.06`
- `vercel_budget_usd = (mb_total * 0.04) + (h_total * 0.01)`
- `hivemq_kpcl_usd = hivemq_budget_usd * (mb_kpcl/mb_total)`
- `vercel_kpcl_usd = vercel_budget_usd * (0.7*mb_kpcl/mb_total + 0.3*h_kpcl/h_total)`
- `opex_kpcl_usd = opex_base_kpcl_usd + hivemq_kpcl_usd + vercel_kpcl_usd`

## Diferencia de costo MCU (NodeMCU vs ESP32-CAM)
- La diferencia principal proviene del MCU y de ajustes de manufactura/cuerpo 3D.
- `esp32-cam` suele tener mayor BOM y mayor OPEX base por consumo energetico.
- Los valores exactos se controlan en `public.finance_kit_components`.

## Referencia de impresion 3D
- PLA+ eSUN 1kg (costo total CLP 16.000, envio incluido).
- Costo referencia: CLP 16/g.
- Conversion referencia: 0.0168 USD/g.

## Uso en dashboard admin
- Selector de KPCL bajo imagen del comedero (`public/illustrations/pink_food_full.png`).
- Lista por componente, costo unitario, subtotal y total de unidad.
- Bloque separado para OPEX mensual estimado por KPCL.

## Mantenimiento de este catalogo
Actualizar cuando cambie:
- proveedor o precio de componentes,
- tipo de cambio operativo,
- factores de shadow-pricing,
- perfil de hardware detectado en `public.devices`.

## Inventario en base de datos
Gestion de catalogo para BOM/manufactura:
- `public.finance_kit_components`
- `public.finance_kpcl_profiles`
- `public.finance_kpcl_profile_components`

Moneda estandar:
- USD (2 decimales) como base.
- CLP solo para visualizacion secundaria.

Control administrativo:
- selector KPCL en Admin,
- lista de componentes y subtotales,
- total de construccion por unidad,
- costo operativo mensual por KPCL.

Test recomendado en suite admin:
- `kpcl_catalog`: valida perfiles, componentes activos y mapeo de hardware.

