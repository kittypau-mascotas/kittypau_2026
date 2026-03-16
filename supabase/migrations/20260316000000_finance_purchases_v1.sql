-- ============================================================
-- Migration: finance_purchases_v1
-- Date: 2026-03-16
-- Author: Kittypau / IOT CHILE SpA
--
-- Purpose:
--   1. Create finance_purchases table — tracks real component
--      purchases (AliExpress, etc.) by founder, with CLP/USD costs.
--   2. Insert Javier Dayne's full AliExpress purchase history
--      filtered to Kittypau components.
--   3. Add new component codes for sensors bought in 2025-2026.
--   4. Update existing component unit costs with real purchase data.
-- ============================================================

-- ============================================================
-- 1. PURCHASES TABLE
-- ============================================================

create table if not exists public.finance_purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  supplier text not null default 'aliexpress',
  buyer text not null check (buyer in ('javier', 'mauro', 'shared')),
  product_name text not null,
  component_code text references public.finance_kit_components(component_code) on delete set null,
  qty numeric(10,2) not null default 1,
  total_clp numeric(14,2) not null default 0,
  total_usd numeric(14,4) generated always as (total_clp / 950.0) stored,
  unit_cost_clp numeric(14,4) generated always as (total_clp / qty) stored,
  unit_cost_usd numeric(14,4) generated always as (total_clp / qty / 950.0) stored,
  exchange_rate_clp_usd numeric(10,4) not null default 950.0,
  order_number text,
  category text not null check (category in ('kittypau', 'tools', 'personal')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_purchases is
  'Real component purchase history by founders. Source: AliExpress orders, 2021-2026.';

-- ============================================================
-- 2. NEW COMPONENT CODES (from 2025-2026 purchases)
-- ============================================================

insert into public.finance_kit_components
  (component_code, component_name, category, unit, unit_cost_usd, notes)
values
  -- MCU / Microcontrollers
  ('MCU_ESP8266_NODEMCU', 'NodeMCU v3 CP2102 (ESP8266 WiFi)', 'electronics', 'unit', 3.22,
   'AliExpress avg: May-2025 $9.186 CLP/3u = $3.062/u (~$3.22 USD). Maps to nodemcu-v3 profile.'),
  ('MCU_ESP32CAM_MB', 'ESP32-CAM-MB MICRO USB OV2640', 'electronics', 'unit', 5.91,
   'AliExpress Mar-2024: $11.226 CLP/2u = $5.613/u (~$5.91 USD). Maps to esp32-cam profile.'),
  ('MCU_ESP32C3_OLED', 'ESP32-C3 SuperMini con OLED 0.42" WiFi+BT', 'electronics', 'unit', 3.96,
   'AliExpress Mar-2026: $18.826 CLP/5u = $3.765/u (~$3.96 USD). Componente exploratorio Kittypau.'),

  -- Sensors — Ambient (temp/humidity)
  ('SENSOR_DHT11', 'DHT11 Sensor temperatura/humedad', 'electronics', 'unit', 1.10,
   'AliExpress avg: Mar-2025 $3.345 CLP/5u = $0.70 USD; Mar-2024 $3.090 CLP/2u = $1.63 USD. Avg ~$1.10 USD.'),
  ('SENSOR_AHT10', 'AHT10 Sensor temperatura/humedad I2C (reemplaza DHT11)', 'electronics', 'unit', 1.97,
   'AliExpress Mar-2026: $9.353 CLP/5u = $1.871/u (~$1.97 USD). Replaces DHT11 in new profiles.'),

  -- Sensors — Light
  ('SENSOR_TEMT6000', 'TEMT6000 Sensor de luz ambiental', 'electronics', 'unit', 1.53,
   'AliExpress Mar-2025: $4.348 CLP/3u = $1.449/u (~$1.53 USD).'),
  ('SENSOR_BH1750', 'BH1750 / GY-302 Sensor intensidad luz digital I2C', 'electronics', 'unit', 1.00,
   'AliExpress Mar-2026: $4.748 CLP/5u = $0.950/u (~$1.00 USD).'),
  ('SENSOR_VEML7700', 'VEML7700 Sensor luz ambiental 120k lux I2C', 'electronics', 'unit', 1.50,
   'AliExpress Mar-2026: $7.144 CLP/5u = $1.429/u (~$1.50 USD). Higher range than BH1750.'),

  -- Sensors — Weight / Load
  ('SENSOR_LOAD_500G', 'Celda de carga 500g aleacion aluminio', 'electronics', 'unit', 2.73,
   'AliExpress avg: May-2025 $5.043 CLP/2u = $2.65 USD; Mar-2024 $5.342 CLP/2u = $2.81 USD. Avg ~$2.73 USD.'),
  ('SENSOR_LOAD_50KG', 'Celda de carga cuerpo 50kg', 'electronics', 'unit', 0.98,
   'AliExpress Nov-2023: $7.432 CLP/8u = $929/u (~$0.98 USD). Bulk load cell.'),
  ('ADC_HX711', 'HX711 Modulo conversion A/D 24bit (peso)', 'electronics', 'unit', 0.70,
   'AliExpress Feb-2024: $3.336 CLP/5u = $667/u (~$0.70 USD). Pairs with any load cell.'),
  ('SENSOR_FSR_3KG', 'FSR Film Pressure Sensor 3kg', 'electronics', 'unit', 2.32,
   'AliExpress Mar-2024: $11.010 CLP/5u = $2.202/u (~$2.32 USD). Alternative to load cell.'),

  -- Sensors — Soil
  ('SENSOR_SOIL_CAP', 'Sensor humedad suelo capacitivo 3.3V (Arduino)', 'electronics', 'unit', 0.65,
   'AliExpress Mar-2026: $6.188 CLP/10u = $619/u (~$0.65 USD). Capacitive (vs resistive — no corrosion).'),

  -- Energy — Batteries
  ('BATT_LIPO_602025', 'Bateria LiPo 602025 250mAh 3.7V', 'electronics', 'unit', 3.26,
   'AliExpress Mar-2026 + Ene-2026: $12.376 CLP/4u = $3.094/u (~$3.26 USD). Small form factor.'),
  ('BATT_LIPO_502030', 'Bateria LiPo 502030 250mAh 3.7V', 'electronics', 'unit', 2.73,
   'AliExpress Apr-2025: $5.179 CLP/2u = $2.590/u (~$2.73 USD).'),

  -- Energy — Charging
  ('CHG_TP4056_TYPEC', 'TP4056 Modulo cargador LiPo Type-C', 'electronics', 'unit', 0.18,
   'AliExpress May-2025: $3.426 CLP/20u = $171/u (~$0.18 USD). Compact LiPo charger module.'),
  ('CHG_LIPO_TYPEC', 'Cargador bateria LiPo 3.7V Type-C 18650', 'electronics', 'unit', 0.86,
   'AliExpress Mar-2025: $3.280 CLP/4u = $820/u (~$0.86 USD).'),
  ('SOLAR_3W_5V', 'Panel solar 3W 5V cargador celular', 'electronics', 'unit', 3.27,
   'AliExpress Mar-2025: $3.110 CLP/1u (~$3.27 USD). Exploratory — outdoor KPCL potential.'),

  -- Actuators
  ('VALVE_SOLENOID_4V5', 'Valvula solenoide agua DC 4.5V N/C', 'electronics', 'unit', 3.27,
   'AliExpress Mar-2024: $3.103 CLP/1u (~$3.27 USD). Water dispenser prototype.'),

  -- Lighting / Prototype
  ('LED_SMD5730_5V', 'LED board 5V 3W 6xSMD5730 31mm (indicador)', 'electronics', 'unit', 2.14,
   'AliExpress Mar-2026: $6.093 CLP/3u = $2.031/u (~$2.14 USD).'),
  ('LED_SMD5730_REG', 'LED regulable 5730 SMD 5V recargable USB', 'electronics', 'unit', 3.78,
   'AliExpress Mar-2026: $17.964 CLP/5u = $3.593/u (~$3.78 USD).'),
  ('LAMP_E27_SOCKET', 'Portalamparas E27 colgante 110V/220V', 'electronics', 'unit', 4.66,
   'AliExpress Mar-2026: $22.151 CLP/5u = $4.430/u (~$4.66 USD). Prototipo iluminacion Kittypau.'),
  ('LAMP_E27_BASE', 'Base E27 portalamparas colgante', 'electronics', 'unit', 1.08,
   'AliExpress Nov-2025: $10.293 CLP/10u = $1.029/u (~$1.08 USD).'),

  -- Materials / Prototyping
  ('CABLE_DUPONT_MM', 'Cables Dupont M-M 40pin 20cm', 'electronics', 'unit', 1.97,
   'AliExpress Aug-2023: $1.866 CLP/1 pack (~$1.97 USD).'),
  ('CASE_RPIZERO', 'Caja acrilico Raspberry Pi Zero (case)', 'mechanical', 'unit', 1.16,
   'AliExpress Mar-2026: $1.099 CLP/1u (~$1.16 USD). RPi Zero 2W bridge housing.'),
  ('MAT_PVC_100X200', 'Placa PVC blanca 100x200x0.2mm', 'mechanical', 'unit', 0.50,
   'AliExpress Nov-2025: $9.443 CLP/20u = $472/u (~$0.50 USD). Prototype material.')
on conflict (component_code) do update set
  component_name = excluded.component_name,
  category = excluded.category,
  unit = excluded.unit,
  unit_cost_usd = excluded.unit_cost_usd,
  notes = excluded.notes,
  updated_at = now();

-- ============================================================
-- 3. JAVIER DAYNE — PURCHASE HISTORY (Kittypau components)
-- ============================================================
-- Exchange rate reference: 1 USD = 950 CLP (per REGISTRO_COMPRAS_JAVIER.md)
-- All amounts in CLP as recorded in AliExpress order history.

insert into public.finance_purchases
  (purchase_date, supplier, buyer, product_name, component_code, qty, total_clp, order_number, category, notes)
values
  -- ── Aug 2023 ─────────────────────────────────────────────
  ('2023-08-16','aliexpress','javier','Cables Dupont M-M 40pin 20cm','CABLE_DUPONT_MM',1,1866,'8173310001831319','kittypau',null),

  -- ── Nov 2023 ─────────────────────────────────────────────
  ('2023-11-27','aliexpress','javier','Celda de carga cuerpo 50kg (x8)','SENSOR_LOAD_50KG',8,7432,'8181151817681319','kittypau',null),

  -- ── Feb 2024 ─────────────────────────────────────────────
  ('2024-02-17','aliexpress','javier','HX711 modulo conversion A/D 24bit (x5)','ADC_HX711',5,3336,'8184407373211319','kittypau',null),

  -- ── Mar 2024 ─────────────────────────────────────────────
  ('2024-03-08','aliexpress','javier','FSR Film Pressure Sensor 3kg (x5)','SENSOR_FSR_3KG',5,11010,'8185400356601319','kittypau',null),
  ('2024-03-12','aliexpress','javier','DHT11 sensor temperatura/humedad (x2)','SENSOR_DHT11',2,3090,'8185548679251319','kittypau',null),
  ('2024-03-12','aliexpress','javier','Valvula solenoide agua DC 4.5V N/C','VALVE_SOLENOID_4V5',1,3103,'8185378819421319','kittypau',null),
  ('2024-03-12','aliexpress','javier','ESP32-CAM-MB con antena OV2640 (x1)','MCU_ESP32CAM_MB',1,7143,'8185378819441319','kittypau','Con antena externa'),
  ('2024-03-13','aliexpress','javier','ESP32-CAM-MB MICRO USB OV2640 (x2)','MCU_ESP32CAM_MB',2,11226,'8186070379121319','kittypau',null),
  ('2024-03-22','aliexpress','javier','Celda de carga 500g aleacion aluminio (x2)','SENSOR_LOAD_500G',2,5342,'8185977235351319','kittypau',null),

  -- ── Apr 2024 ─────────────────────────────────────────────
  ('2024-04-29','aliexpress','javier','NodeMCU V3 CP2102 ESP8266 WiFi (x3)','MCU_ESP8266_NODEMCU',3,10977,'8187396723781319','kittypau',null),

  -- ── Mar 2025 ─────────────────────────────────────────────
  ('2025-03-03','aliexpress','javier','Cargador bateria LiPo 3.7V Type-C 18650 (x4)','CHG_LIPO_TYPEC',4,3280,'8198335615571319','kittypau',null),
  ('2025-03-27','aliexpress','javier','DHT11 sensor temperatura/humedad (x5)','SENSOR_DHT11',5,3345,'8199702609271319','kittypau',null),
  ('2025-03-27','aliexpress','javier','TEMT6000 sensor de luz (x3)','SENSOR_TEMT6000',3,4348,'8199702609311319','kittypau',null),
  ('2025-03-27','aliexpress','javier','Panel solar 3W 5V cargador celular','SOLAR_3W_5V',1,3110,'8199702609251319','kittypau','Exploratorio: KPCL outdoor'),

  -- ── Apr 2025 ─────────────────────────────────────────────
  ('2025-04-27','aliexpress','javier','Bateria LiPo 502030 250mAh 3.7V (x2)','BATT_LIPO_502030',2,5179,'8200099122351319','kittypau',null),

  -- ── May 2025 ─────────────────────────────────────────────
  ('2025-05-27','aliexpress','javier','NodeMCU V3 CP2102 ESP8266 WiFi (x3)','MCU_ESP8266_NODEMCU',3,9186,'8201051071501319','kittypau',null),
  ('2025-05-27','aliexpress','javier','Celda de carga 500g aleacion aluminio (x2)','SENSOR_LOAD_500G',2,5043,'8201051071461319','kittypau',null),
  ('2025-05-27','aliexpress','javier','TP4056 modulo cargador LiPo Type-C (x20)','CHG_TP4056_TYPEC',20,3426,'8201051071481319','kittypau',null),

  -- ── Nov 2025 ─────────────────────────────────────────────
  ('2025-11-17','aliexpress','javier','Clips cable lampara colgante DIY (x10)',null,10,1576,'8206425470291319','tools','Lab / taller — no componente KPCL'),
  ('2025-11-17','aliexpress','javier','Base E27 portalamparas colgante (x10)','LAMP_E27_BASE',10,10293,'8206425470311319','tools','Lab / taller — no componente KPCL'),
  ('2025-11-17','aliexpress','javier','Placa PVC blanca 100x200x0.2mm (x20)','MAT_PVC_100X200',20,9443,'8206425470331319','tools','Lab / taller — no componente KPCL'),

  -- ── Ene 2026 ─────────────────────────────────────────────
  ('2026-01-16','aliexpress','javier','Bateria LiPo 602025 250mAh 3.7V (x4)','BATT_LIPO_602025',4,12376,'8208075398321319','kittypau',null),

  -- ── Mar 2026 (en camino) ─────────────────────────────────
  ('2026-03-03','aliexpress','javier','AHT10 Sensor temperatura/humedad I2C (x5)','SENSOR_AHT10',5,9353,'8209879252781319','kittypau','Reemplaza DHT11 — exploratorio Kittypau'),
  ('2026-03-03','aliexpress','javier','Sensor humedad suelo capacitivo 3.3V (x10)','SENSOR_SOIL_CAP',10,6188,'8209879252801319','kittypau','Exploratorio Kittypau'),
  ('2026-03-03','aliexpress','javier','VEML7700 Sensor luz ambiental 120k lux I2C (x5)','SENSOR_VEML7700',5,7144,'8209879252821319','kittypau','Exploratorio Kittypau'),
  ('2026-03-03','aliexpress','javier','Caja acrilico Raspberry Pi Zero (case)','CASE_RPIZERO',1,1099,'8209879252841319','kittypau','Housing para bridge RPi Zero 2W'),
  ('2026-03-03','aliexpress','javier','BH1750 / GY-302 Sensor intensidad luz digital (x5)','SENSOR_BH1750',5,4748,'8209879252701319','kittypau','Alternativa a VEML7700 para iluminacion'),
  ('2026-03-03','aliexpress','javier','LED board 5V 3W 6xSMD5730 31mm (x3)','LED_SMD5730_5V',3,6093,'8209879252881319','kittypau','Indicador / prototipo iluminacion'),
  ('2026-03-03','aliexpress','javier','ESP32-C3 SuperMini con OLED 0.42" WiFi+BT (x5)','MCU_ESP32C3_OLED',5,18826,'8209879252721319','kittypau','Exploratorio Kittypau'),
  ('2026-03-03','aliexpress','javier','LED regulable 5730 SMD 5V recargable USB (x5)','LED_SMD5730_REG',5,17964,'8209879252761319','tools','Lab / taller — reclasificado desde batch Mar 2026'),
  ('2026-03-03','aliexpress','javier','Bateria LiPo 602025 250mAh 3.7V (x4)','BATT_LIPO_602025',4,12376,'8209879252761319','kittypau','Mismo pedido que LED regulable — verificar'),
  ('2026-03-03','aliexpress','javier','Portalamparas E27 colgante 110V/220V (x5)','LAMP_E27_SOCKET',5,22151,'8209879252861319','tools','Lab / taller — reclasificado desde batch Mar 2026')
;

-- ============================================================
-- 5. SUMMARY VIEW — purchase totals by buyer
-- ============================================================

create or replace view public.finance_purchases_summary as
select
  buyer,
  category,
  count(*) as purchase_count,
  sum(qty) as total_units,
  sum(total_clp) as total_clp,
  round(sum(total_clp) / 950.0, 2) as total_usd,
  min(purchase_date) as earliest_purchase,
  max(purchase_date) as latest_purchase
from public.finance_purchases
group by buyer, category
order by buyer, category;

comment on view public.finance_purchases_summary is
  'Aggregate purchase totals by buyer and category (kittypau / tools / personal).';
