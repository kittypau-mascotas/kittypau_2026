create or replace function public.link_device_to_pet(
  p_owner_id uuid,
  p_pet_id uuid,
  p_device_code text,
  p_device_type text,
  p_status text,
  p_battery_level int
)
returns public.devices
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_pet_owner uuid;
  v_device public.devices;
begin
  select user_id into v_pet_owner
  from public.pets
  where id = p_pet_id;

  if v_pet_owner is null then
    raise exception 'Pet not found';
  end if;

  if v_pet_owner <> p_owner_id then
    raise exception 'Forbidden';
  end if;

  update public.devices
  set status = 'inactive'
  where pet_id = p_pet_id
    and status = 'active';

  insert into public.devices (
    owner_id, pet_id, device_code, device_type, status, device_state, battery_level
  ) values (
    p_owner_id, p_pet_id, p_device_code, p_device_type, p_status, 'linked', p_battery_level
  )
  returning * into v_device;

  update public.pets
  set pet_state = 'device_linked'
  where id = p_pet_id;

  return v_device;
end;
$$;