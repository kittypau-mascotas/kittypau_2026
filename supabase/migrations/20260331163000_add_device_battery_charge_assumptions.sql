-- ============================================================
-- Battery charge assumptions for KittyPaw
-- ============================================================
-- Stores estimated charge-time scenarios per device using the
-- battery + charger BOM context.
--
-- This is useful when the hardware does not expose real battery
-- telemetry yet, but we still want a calibrated planning model
-- for time-to-full-charge estimations.
-- ============================================================

create table if not exists public.device_battery_charge_assumptions (
  id bigserial primary key,
  device_uuid uuid references public.devices(id) on delete cascade,
  device_code text not null,
  device_label text,
  battery_component_code text references public.finance_kit_components(component_code) on delete set null,
  charger_component_code text references public.finance_kit_components(component_code) on delete set null,
  battery_capacity_mah numeric(10,2) not null default 250,
  battery_nominal_voltage_v numeric(4,2) not null default 3.7,
  charge_current_ma numeric(10,2) not null,
  efficiency_factor numeric(4,2) not null default 1.35,
  estimated_full_charge_hours numeric(10,2) generated always as (
    case
      when charge_current_ma > 0 then (battery_capacity_mah / charge_current_ma) * efficiency_factor
      else null
    end
  ) stored,
  scenario_label text not null,
  assumption_source text not null default 'manual',
  assumption_status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_battery_charge_assumptions_status_check
    check (assumption_status in ('draft', 'validated', 'observed', 'retired'))
);

create unique index if not exists idx_device_battery_charge_assumptions_unique
  on public.device_battery_charge_assumptions (device_code, scenario_label);

create index if not exists idx_device_battery_charge_assumptions_device_code
  on public.device_battery_charge_assumptions (device_code, estimated_full_charge_hours);

alter table public.device_battery_charge_assumptions enable row level security;

-- No anon/authenticated policies are created.
-- This table is intended for service_role / server-side ingestion only.

insert into public.device_battery_charge_assumptions (
  device_code,
  device_label,
  battery_component_code,
  charger_component_code,
  battery_capacity_mah,
  battery_nominal_voltage_v,
  charge_current_ma,
  efficiency_factor,
  scenario_label,
  assumption_source,
  assumption_status,
  notes
)
values
  (
    'KPCL0034',
    'KPCL0034',
    'BATT_LIPO_602025',
    'CHG_TP4056_TYPEC',
    250,
    3.7,
    100,
    1.35,
    'tp4056_100ma',
    'bom_estimate',
    'draft',
    'Low-current charge scenario used only as a planning assumption.'
  ),
  (
    'KPCL0034',
    'KPCL0034',
    'BATT_LIPO_602025',
    'CHG_TP4056_TYPEC',
    250,
    3.7,
    250,
    1.35,
    'tp4056_250ma',
    'bom_estimate',
    'draft',
    'Balanced planning scenario for the 250mAh LiPo + TP4056 stack.'
  ),
  (
    'KPCL0034',
    'KPCL0034',
    'BATT_LIPO_602025',
    'CHG_TP4056_TYPEC',
    250,
    3.7,
    500,
    1.35,
    'tp4056_500ma',
    'bom_estimate',
    'draft',
    'Faster charge scenario; verify the real resistor/current before using as a final spec.'
  )
on conflict (device_code, scenario_label) do update set
  device_label = excluded.device_label,
  battery_component_code = excluded.battery_component_code,
  charger_component_code = excluded.charger_component_code,
  battery_capacity_mah = excluded.battery_capacity_mah,
  battery_nominal_voltage_v = excluded.battery_nominal_voltage_v,
  charge_current_ma = excluded.charge_current_ma,
  efficiency_factor = excluded.efficiency_factor,
  assumption_source = excluded.assumption_source,
  assumption_status = excluded.assumption_status,
  notes = excluded.notes,
  updated_at = now();

