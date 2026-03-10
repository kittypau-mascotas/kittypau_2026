-- KViejos - rls + indexes v1

create index if not exists idx_residents_household on public.residents(household_id);
create index if not exists idx_contacts_household on public.contacts(household_id);
create unique index if not exists ux_contacts_primary_per_household
  on public.contacts(household_id)
  where is_primary;
create index if not exists idx_sensors_household on public.sensors(household_id);
create index if not exists idx_sensors_household_status on public.sensors(household_id, status);
create index if not exists idx_sensors_resident on public.sensors(resident_id);
create index if not exists idx_events_household_recorded on public.events(household_id, recorded_at desc);
create index if not exists idx_events_sensor_recorded on public.events(sensor_id, recorded_at desc);
create index if not exists idx_events_resident_recorded on public.events(resident_id, recorded_at desc);
create index if not exists idx_alert_rules_household_enabled on public.alert_rules(household_id, enabled);
create index if not exists idx_alerts_household_status on public.alerts(household_id, status, created_at desc);
create index if not exists idx_alerts_rule_status on public.alerts(rule_id, status, created_at desc);

-- updated_at trigger (same pattern as Kittypau)
create or replace function public.kviejos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_households_updated_at') then
    create trigger trg_kviejos_households_updated_at
      before update on public.households
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_residents_updated_at') then
    create trigger trg_kviejos_residents_updated_at
      before update on public.residents
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_contacts_updated_at') then
    create trigger trg_kviejos_contacts_updated_at
      before update on public.contacts
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_sensors_updated_at') then
    create trigger trg_kviejos_sensors_updated_at
      before update on public.sensors
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_alert_rules_updated_at') then
    create trigger trg_kviejos_alert_rules_updated_at
      before update on public.alert_rules
      for each row execute function public.kviejos_set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_kviejos_alerts_updated_at') then
    create trigger trg_kviejos_alerts_updated_at
      before update on public.alerts
      for each row execute function public.kviejos_set_updated_at();
  end if;
end $$;

alter table public.households enable row level security;
alter table public.residents enable row level security;
alter table public.contacts enable row level security;
alter table public.sensors enable row level security;
alter table public.events enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alerts enable row level security;
alter table public.acknowledgements enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.households from anon, authenticated;
revoke all on table public.residents from anon, authenticated;
revoke all on table public.contacts from anon, authenticated;
revoke all on table public.sensors from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.alert_rules from anon, authenticated;
revoke all on table public.alerts from anon, authenticated;
revoke all on table public.acknowledgements from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
