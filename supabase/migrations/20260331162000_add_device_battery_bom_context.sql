-- ============================================================
-- Battery BOM context for Kittypau battery cycles
-- ============================================================
-- Extends device_battery_cycles with the hardware references
-- needed to relate each cycle to the battery and charger parts
-- used by the device.
--
-- This keeps the battery history table coordinated with the
-- finance BOM catalog:
--   - public.finance_kit_components
--   - public.finance_purchases
-- ============================================================

alter table public.device_battery_cycles
  add column if not exists battery_component_code text references public.finance_kit_components(component_code) on delete set null,
  add column if not exists charger_component_code text references public.finance_kit_components(component_code) on delete set null,
  add column if not exists battery_capacity_mah numeric(10,2),
  add column if not exists battery_nominal_voltage_v numeric(4,2),
  add column if not exists estimated_charge_current_ma numeric(10,2),
  add column if not exists estimated_full_charge_hours numeric(10,2),
  add column if not exists battery_bom_context jsonb not null default '{}'::jsonb;

create index if not exists idx_device_battery_cycles_battery_component_code
  on public.device_battery_cycles (battery_component_code);

create index if not exists idx_device_battery_cycles_charger_component_code
  on public.device_battery_cycles (charger_component_code);

comment on column public.device_battery_cycles.battery_component_code is
  'Primary battery BOM component code linked to finance_kit_components.';

comment on column public.device_battery_cycles.charger_component_code is
  'Primary charger BOM component code linked to finance_kit_components.';

comment on column public.device_battery_cycles.battery_capacity_mah is
  'Nominal battery capacity in mAh for the device hardware context.';

comment on column public.device_battery_cycles.battery_nominal_voltage_v is
  'Nominal battery voltage in volts for the device hardware context.';

comment on column public.device_battery_cycles.estimated_charge_current_ma is
  'Estimated charge current in mA when known for the charger hardware.';

comment on column public.device_battery_cycles.estimated_full_charge_hours is
  'Estimated full charge duration in hours when the charge current is known.';

comment on column public.device_battery_cycles.battery_bom_context is
  'JSONB context that can store battery and charger BOM references, alternatives, and estimation notes.';

update public.device_battery_cycles
set
  battery_component_code = coalesce(battery_component_code, 'BATT_LIPO_602025'),
  charger_component_code = coalesce(charger_component_code, 'CHG_TP4056_TYPEC'),
  battery_capacity_mah = coalesce(battery_capacity_mah, 250),
  battery_nominal_voltage_v = coalesce(battery_nominal_voltage_v, 3.7),
  battery_bom_context = coalesce(battery_bom_context, '{}'::jsonb)
    || jsonb_build_object(
      'battery_component_codes', jsonb_build_array('BATT_LIPO_602025', 'BATT_LIPO_502030'),
      'charger_component_codes', jsonb_build_array('CHG_TP4056_TYPEC', 'CHG_LIPO_TYPEC'),
      'battery_capacity_mah', 250,
      'battery_nominal_voltage_v', 3.7,
      'charge_time_note', 'Charge duration cannot be calculated exactly without the charger current setting; TP4056 timing is hardware-dependent.',
      'source', 'finance_kit_components + finance_purchases'
    ),
  updated_at = now()
where device_code = 'KPCL0034';


