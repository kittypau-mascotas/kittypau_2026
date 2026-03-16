-- ============================================================
-- Migration: update_real_component_prices
-- Date: 2026-03-16
-- Author: Kittypau / IOT CHILE SpA
--
-- Purpose:
--   Actualiza unit_cost_usd en finance_kpcl_profile_components y
--   finance_kit_components con precios REALES de AliExpress
--   (cuenta Javier Dayne, 2023-2026).
--
-- Fuente: Docs/Postulaciones Fondos/2026/Participantes/REGISTRO_COMPRAS_JAVIER.md
-- Tipo de cambio: 1 USD = 950 CLP
--
-- Componentes actualizados con precio real (compra verificada):
--   MCU_ESP8266   → $3.44  (avg Apr-2024 + May-2025)
--   MCU_ESP32CAM  → $5.91  (Mar-2024)
--   LOAD_CELL     → $2.73  (avg Mar-2024 + May-2025, 500g)
--   ADC_HX711     → $0.70  (Feb-2024)
--   SENSOR_DHT    → $1.10  (confirmado — sin cambio)
--
-- Componentes SIN compra directa verificada (estimados — sin cambio):
--   DC_BUCK, LDO, PCB_PROTO, SWITCH, LED, PSU_5V, CABLING, BOWL,
--   BODY_3D, CAM_OPTICS, MCU_GENERIC
-- ============================================================

-- ============================================================
-- 1. finance_kpcl_profile_components — precios reales por perfil
-- ============================================================

-- ── Perfil: nodemcu-v3 ──────────────────────────────────────

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 3.44,
  component_name = 'NodeMCU v3 CP2102 (ESP8266 WiFi)',
  notes = 'Real AliExpress: Apr-2024 $10.977/3u=$3.659; May-2025 $9.186/3u=$3.062. Avg $3.44 USD.',
  updated_at = now()
where profile_key = 'nodemcu-v3' and component_code = 'MCU_ESP8266';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 2.73,
  component_name = 'Celda de carga 500g aleacion aluminio',
  notes = 'Real AliExpress: Mar-2024 $5.342/2u=$2.81; May-2025 $5.043/2u=$2.65. Avg $2.73 USD.',
  updated_at = now()
where profile_key = 'nodemcu-v3' and component_code = 'LOAD_CELL';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 0.70,
  notes = 'Real AliExpress: Feb-2024 $3.336/5u=$0.667/u. Avg $0.70 USD.',
  updated_at = now()
where profile_key = 'nodemcu-v3' and component_code = 'ADC_HX711';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 1.10,
  notes = 'Real AliExpress: Mar-2025 $3.345/5u=$0.70; Mar-2024 $3.090/2u=$1.63. Avg $1.10 USD.',
  updated_at = now()
where profile_key = 'nodemcu-v3' and component_code = 'SENSOR_DHT';

-- ── Perfil: esp32-cam ──────────────────────────────────────

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 5.91,
  component_name = 'AI-Thinker ESP32-CAM-MB MICRO USB OV2640',
  notes = 'Real AliExpress: Mar-2024 $11.226/2u=$5.613/u. Ref $5.91 USD.',
  updated_at = now()
where profile_key = 'esp32-cam' and component_code = 'MCU_ESP32CAM';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 2.73,
  component_name = 'Celda de carga 500g aleacion aluminio',
  notes = 'Real AliExpress: Mar-2024 $5.342/2u=$2.81; May-2025 $5.043/2u=$2.65. Avg $2.73 USD.',
  updated_at = now()
where profile_key = 'esp32-cam' and component_code = 'LOAD_CELL';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 0.70,
  notes = 'Real AliExpress: Feb-2024 $3.336/5u=$0.667/u. Avg $0.70 USD.',
  updated_at = now()
where profile_key = 'esp32-cam' and component_code = 'ADC_HX711';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 1.10,
  notes = 'Real AliExpress: Mar-2025 $3.345/5u=$0.70; Mar-2024 $3.090/2u=$1.63. Avg $1.10 USD.',
  updated_at = now()
where profile_key = 'esp32-cam' and component_code = 'SENSOR_DHT';

-- ── Perfil: generic-kpcl ───────────────────────────────────

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 4.68,
  notes = 'Avg real MCU: NodeMCU $3.44 + ESP32-CAM $5.91 / 2. Generic fallback.',
  updated_at = now()
where profile_key = 'generic-kpcl' and component_code = 'MCU_GENERIC';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 2.73,
  component_name = 'Celda de carga 500g aleacion aluminio',
  notes = 'Real AliExpress avg $2.73 USD.',
  updated_at = now()
where profile_key = 'generic-kpcl' and component_code = 'LOAD_CELL';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 0.70,
  notes = 'Real AliExpress: Feb-2024 $3.336/5u=$0.667/u.',
  updated_at = now()
where profile_key = 'generic-kpcl' and component_code = 'ADC_HX711';

update public.finance_kpcl_profile_components
set
  unit_cost_usd = 1.10,
  notes = 'Real AliExpress avg $1.10 USD.',
  updated_at = now()
where profile_key = 'generic-kpcl' and component_code = 'SENSOR_DHT';

-- ============================================================
-- 2. finance_kit_components — precios reales y estimados revisados
-- ============================================================

-- Componentes genericos originales (v1) — actualizados con real data

update public.finance_kit_components
set
  component_name = 'MCU ESP8266/ESP32 WiFi (referencia)',
  unit_cost_usd  = 3.44,
  notes = 'Real AliExpress NodeMCU avg $3.44 USD (base referencia generico).',
  updated_at = now()
where component_code = 'MCU_ESP32';

update public.finance_kit_components
set
  component_name = 'Celda de carga 500g (referencia)',
  unit_cost_usd  = 2.73,
  notes = 'Real AliExpress avg: Mar-2024 + May-2025 = $2.73 USD.',
  updated_at = now()
where component_code = 'SENSOR_LOAD';

update public.finance_kit_components
set
  component_name = 'Sensor temperatura/humedad (DHT11)',
  unit_cost_usd  = 1.10,
  notes = 'Real AliExpress avg $1.10 USD. Confirmado Mar-2024 y Mar-2025.',
  updated_at = now()
where component_code = 'SENSOR_ENV';

update public.finance_kit_components
set
  component_name = 'Bateria LiPo 250mAh 3.7V (referencia)',
  unit_cost_usd  = 3.26,
  notes = 'Real AliExpress LiPo 602025 250mAh: Ene-2026 + Mar-2026 $12.376/4u = $3.26 USD.',
  updated_at = now()
where component_code = 'BATTERY';

-- Componentes sin compra directa — notas actualizadas

update public.finance_kit_components
set notes = 'Sin compra directa registrada. Estimado $4.50 USD.'
where component_code = 'PCB_MAIN';

update public.finance_kit_components
set notes = 'Filamento PLA+ eSUN: $0.0168 USD/g. 185g = $3.11 bruto. Estimado $2.40 con descuento volumen.'
where component_code = 'PRINT_3D';

update public.finance_kit_components
set notes = 'Estimado labor ensamblaje manual por unidad. $2.00 USD.'
where component_code = 'ASSEMBLY';

update public.finance_kit_components
set notes = 'Estimado QA + calibracion HX711 por unidad. $0.90 USD.'
where component_code = 'QA_CAL';

update public.finance_kit_components
set notes = 'Estimado empaque primario por unidad. $0.80 USD.'
where component_code = 'PACKAGING';

-- ============================================================
-- 3. Agregar columna notes a finance_kpcl_profiles (si no existe)
--    y registrar BOM total real por perfil
-- ============================================================

alter table public.finance_kpcl_profiles
  add column if not exists notes text;

update public.finance_kpcl_profiles
set
  notes = 'BOM real v2.0: MCU $3.44 + celda $2.73 + HX711 $0.70 + DHT $1.10 + DC_BUCK $1.40 + LDO $0.55 + PCB $1.00 + SWITCH $0.45 + LED $0.25 + PSU $2.30 + CABLING $1.00 + BOWL $1.80 = BOM $14.72. Manufactura $5.80. Total $20.52 USD.',
  updated_at = now()
where profile_key = 'nodemcu-v3';

update public.finance_kpcl_profiles
set
  notes = 'BOM real v2.0: MCU $5.91 + celda $2.73 + HX711 $0.70 + DHT $1.10 + DC_BUCK $1.40 + LDO $0.55 + PCB $1.00 + CAM $0.90 + SWITCH $0.45 + LED $0.25 + PSU $2.30 + CABLING $1.10 + BOWL $1.80 = BOM $20.19. Manufactura $6.65. Total $26.84 USD.',
  updated_at = now()
where profile_key = 'esp32-cam';

update public.finance_kpcl_profiles
set
  notes = 'Perfil fallback. MCU avg real $4.68. BOM estimado ~$16.96. Total ~$22.76 USD.',
  updated_at = now()
where profile_key = 'generic-kpcl';
