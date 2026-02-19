-- KPCL catalog profiles and components for admin finance module

create table if not exists public.finance_kpcl_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null unique,
  label text not null,
  print_grams numeric(10,2) not null default 0,
  print_hours numeric(10,2) not null default 0,
  print_unit_cost_usd numeric(12,4) not null default 0,
  maintenance_monthly_usd numeric(12,4) not null default 0,
  power_monthly_usd numeric(12,4) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_kpcl_profiles is
  'KPCL hardware profiles used by admin finance (NodeMCU, ESP32-CAM, generic).';

create table if not exists public.finance_kpcl_profile_components (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.finance_kpcl_profiles(profile_key) on delete cascade,
  component_code text not null,
  component_name text not null,
  qty numeric(10,2) not null default 1,
  unit_cost_usd numeric(12,4) not null default 0,
  notes text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_key, component_code)
);

comment on table public.finance_kpcl_profile_components is
  'Component list and unit cost for each KPCL hardware profile.';

insert into public.finance_kpcl_profiles (
  profile_key,
  label,
  print_grams,
  print_hours,
  print_unit_cost_usd,
  maintenance_monthly_usd,
  power_monthly_usd,
  active
)
values
  ('nodemcu-v3', 'KPCL Comedero (NodeMCU v3 CP2102)', 185, 6.2, 2.4, 0.85, 0.55, true),
  ('esp32-cam', 'KPCL Comedero CAM (AI-Thinker ESP32-CAM)', 205, 6.9, 2.8, 1.05, 0.70, true),
  ('generic-kpcl', 'KPCL Base (genérico)', 180, 6.0, 2.3, 0.80, 0.50, true)
on conflict (profile_key) do update set
  label = excluded.label,
  print_grams = excluded.print_grams,
  print_hours = excluded.print_hours,
  print_unit_cost_usd = excluded.print_unit_cost_usd,
  maintenance_monthly_usd = excluded.maintenance_monthly_usd,
  power_monthly_usd = excluded.power_monthly_usd,
  active = excluded.active,
  updated_at = now();

insert into public.finance_kpcl_profile_components
  (profile_key, component_code, component_name, qty, unit_cost_usd, notes, sort_order)
values
  ('nodemcu-v3','MCU_ESP8266','NodeMCU v3 CP2102 (ESP8266)',1,4.90,null,10),
  ('nodemcu-v3','LOAD_CELL','Celda de carga 5kg',1,2.10,null,20),
  ('nodemcu-v3','ADC_HX711','Conversor HX711',1,1.20,null,30),
  ('nodemcu-v3','SENSOR_DHT','Sensor DHT (temp/humedad)',1,1.10,null,40),
  ('nodemcu-v3','DC_BUCK','Convertidor DC-DC buck 5V/3.3V',1,1.40,null,50),
  ('nodemcu-v3','LDO','Regulador LDO + filtrado',1,0.55,null,60),
  ('nodemcu-v3','PCB_PROTO','PCB/protoboard + headers',1,1.00,null,70),
  ('nodemcu-v3','SWITCH','Interruptor encendido',1,0.45,null,80),
  ('nodemcu-v3','LED','LED estado + resistencias',1,0.25,null,90),
  ('nodemcu-v3','PSU_5V','Fuente 5V + plug',1,2.30,null,100),
  ('nodemcu-v3','CABLING','Cables, conectores, tornillos',1,1.00,null,110),
  ('nodemcu-v3','BOWL','Plato/inserto comedero',1,1.80,null,120),
  ('nodemcu-v3','BODY_3D','Cuerpo impreso 3D',1,2.40,null,130),

  ('esp32-cam','MCU_ESP32CAM','AI-Thinker ESP32-CAM',1,7.20,null,10),
  ('esp32-cam','LOAD_CELL','Celda de carga 5kg',1,2.10,null,20),
  ('esp32-cam','ADC_HX711','Conversor HX711',1,1.20,null,30),
  ('esp32-cam','SENSOR_DHT','Sensor DHT (temp/humedad)',1,1.10,null,40),
  ('esp32-cam','DC_BUCK','Convertidor DC-DC buck 5V/3.3V',1,1.40,null,50),
  ('esp32-cam','LDO','Regulador LDO + filtrado',1,0.55,null,60),
  ('esp32-cam','PCB_PROTO','PCB/protoboard + headers',1,1.00,null,70),
  ('esp32-cam','CAM_OPTICS','Lente/cableado auxiliar cam',1,0.90,null,80),
  ('esp32-cam','SWITCH','Interruptor encendido',1,0.45,null,90),
  ('esp32-cam','LED','LED estado + resistencias',1,0.25,null,100),
  ('esp32-cam','PSU_5V','Fuente 5V + plug',1,2.30,null,110),
  ('esp32-cam','CABLING','Cables, conectores, tornillos',1,1.10,null,120),
  ('esp32-cam','BOWL','Plato/inserto comedero',1,1.80,null,130),
  ('esp32-cam','BODY_3D','Cuerpo impreso 3D (cam)',1,2.80,null,140),

  ('generic-kpcl','MCU_GENERIC','Microcontrolador WiFi',1,5.00,null,10),
  ('generic-kpcl','LOAD_CELL','Celda de carga 5kg',1,2.10,null,20),
  ('generic-kpcl','ADC_HX711','Conversor HX711',1,1.20,null,30),
  ('generic-kpcl','SENSOR_DHT','Sensor DHT (temp/humedad)',1,1.10,null,40),
  ('generic-kpcl','DC_BUCK','Convertidor DC-DC buck 5V/3.3V',1,1.40,null,50),
  ('generic-kpcl','LDO','Regulador LDO + filtrado',1,0.55,null,60),
  ('generic-kpcl','PCB_PROTO','PCB/protoboard + headers',1,1.00,null,70),
  ('generic-kpcl','SWITCH','Interruptor encendido',1,0.45,null,80),
  ('generic-kpcl','LED','LED estado + resistencias',1,0.25,null,90),
  ('generic-kpcl','PSU_5V','Fuente 5V + plug',1,2.30,null,100),
  ('generic-kpcl','CABLING','Cables, conectores, tornillos',1,1.00,null,110),
  ('generic-kpcl','BOWL','Plato/inserto comedero',1,1.80,null,120),
  ('generic-kpcl','BODY_3D','Cuerpo impreso 3D',1,2.30,null,130)
on conflict (profile_key, component_code) do update set
  component_name = excluded.component_name,
  qty = excluded.qty,
  unit_cost_usd = excluded.unit_cost_usd,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();
