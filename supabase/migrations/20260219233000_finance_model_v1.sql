-- Kittypau - Finance model v1
create extension if not exists "pgcrypto";

create table if not exists public.finance_kit_components (
  id uuid primary key default gen_random_uuid(),
  component_code text not null unique,
  component_name text not null,
  category text not null check (
    category in (
      'electronics',
      'mechanical',
      '3d_print',
      'assembly',
      'qa',
      'packaging',
      'other'
    )
  ),
  unit text not null default 'unit',
  unit_cost_usd numeric(12,4) not null default 0,
  active boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.finance_kit_components is
  'Catalog of kit parts and unit costs for BOM and manufacturing estimates.';

create table if not exists public.finance_provider_plans (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('supabase', 'vercel', 'hivemq', 'upstash', 'other')),
  plan_name text not null,
  is_free_plan boolean not null default false,
  is_active boolean not null default true,
  monthly_cost_usd numeric(12,4) not null default 0,
  limit_label text,
  usage_label text,
  source text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, plan_name)
);

comment on table public.finance_provider_plans is
  'Active provider plans and estimated monthly costs.';

create table if not exists public.finance_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_month date not null,
  currency text not null default 'USD',
  units_produced integer not null default 0,
  bom_cost_total_usd numeric(14,4) not null default 0,
  manufacturing_cost_total_usd numeric(14,4) not null default 0,
  cloud_cost_total_usd numeric(14,4) not null default 0,
  logistics_cost_total_usd numeric(14,4) not null default 0,
  support_cost_total_usd numeric(14,4) not null default 0,
  warranty_cost_total_usd numeric(14,4) not null default 0,
  total_cost_usd numeric(14,4) generated always as (
    bom_cost_total_usd +
    manufacturing_cost_total_usd +
    cloud_cost_total_usd +
    logistics_cost_total_usd +
    support_cost_total_usd +
    warranty_cost_total_usd
  ) stored,
  unit_cost_usd numeric(14,4) generated always as (
    case when units_produced > 0 then
      (
        bom_cost_total_usd +
        manufacturing_cost_total_usd +
        cloud_cost_total_usd +
        logistics_cost_total_usd +
        support_cost_total_usd +
        warranty_cost_total_usd
      ) / units_produced
    else 0 end
  ) stored,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (snapshot_month)
);

comment on table public.finance_monthly_snapshots is
  'Monthly snapshot used by admin financial summary.';

create or replace view public.finance_admin_summary as
with bom as (
  select coalesce(sum(unit_cost_usd), 0) as bom_unit_cost_usd
  from public.finance_kit_components
  where active = true
),
providers as (
  select
    coalesce(sum(monthly_cost_usd), 0) as cloud_monthly_cost_usd,
    jsonb_agg(
      jsonb_build_object(
        'provider', provider,
        'plan_name', plan_name,
        'is_free_plan', is_free_plan,
        'is_active', is_active,
        'monthly_cost_usd', monthly_cost_usd,
        'limit_label', limit_label,
        'usage_label', usage_label
      )
      order by provider
    ) as providers_json
  from public.finance_provider_plans
  where is_active = true
),
latest as (
  select *
  from public.finance_monthly_snapshots
  order by snapshot_month desc
  limit 1
)
select
  now() as generated_at,
  bom.bom_unit_cost_usd,
  providers.cloud_monthly_cost_usd,
  providers.providers_json,
  latest.snapshot_month,
  latest.units_produced,
  latest.total_cost_usd,
  latest.unit_cost_usd
from bom
cross join providers
left join latest on true;

comment on view public.finance_admin_summary is
  'Consolidated finance summary for admin dashboard.';

insert into public.finance_kit_components (component_code, component_name, category, unit, unit_cost_usd, notes)
values
  ('PCB_MAIN', 'PCB principal', 'electronics', 'unit', 4.5000, 'Estimated unit cost'),
  ('MCU_ESP32', 'MCU ESP32', 'electronics', 'unit', 3.2000, 'Estimated unit cost'),
  ('SENSOR_LOAD', 'Load sensor', 'electronics', 'unit', 2.7000, 'Estimated unit cost'),
  ('SENSOR_ENV', 'Temp/Humidity sensor', 'electronics', 'unit', 1.1000, 'Estimated unit cost'),
  ('BATTERY', 'Rechargeable battery', 'electronics', 'unit', 2.9000, 'Estimated unit cost'),
  ('PRINT_3D', '3D printed body', '3d_print', 'unit', 2.4000, 'Filament + machine time'),
  ('ASSEMBLY', 'Assembly and soldering', 'assembly', 'unit', 2.0000, 'Labor estimate'),
  ('QA_CAL', 'QA and calibration', 'qa', 'unit', 0.9000, 'Functional checks'),
  ('PACKAGING', 'Packaging', 'packaging', 'unit', 0.8000, 'Primary packaging')
on conflict (component_code) do update set
  component_name = excluded.component_name,
  category = excluded.category,
  unit = excluded.unit,
  unit_cost_usd = excluded.unit_cost_usd,
  notes = excluded.notes,
  updated_at = now();

insert into public.finance_provider_plans (provider, plan_name, is_free_plan, is_active, monthly_cost_usd, limit_label, usage_label, source)
values
  ('supabase', 'Free', true, true, 0, 'Free active', 'Monitor DB/Storage usage', 'seed'),
  ('vercel', 'Hobby', true, true, 0, 'Hobby active', 'Monitor builds/functions', 'seed'),
  ('hivemq', 'Free Tier', true, true, 0, 'Free tier active', 'Monitor connections/messages', 'seed')
on conflict (provider, plan_name) do update set
  is_free_plan = excluded.is_free_plan,
  is_active = excluded.is_active,
  monthly_cost_usd = excluded.monthly_cost_usd,
  limit_label = excluded.limit_label,
  usage_label = excluded.usage_label,
  source = excluded.source,
  updated_at = now();
