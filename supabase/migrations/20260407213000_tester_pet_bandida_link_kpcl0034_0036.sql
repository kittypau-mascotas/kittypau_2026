-- Create tester pet "Bandida" and link KPCL0034 (food) + KPCL0036 (water)
do $$
declare
  v_owner_id uuid := '1f1c1467-60ad-44e3-88fc-bc8dc9785bea';
  v_pet_id uuid;
  v_device_col text;
begin
  select p.id
    into v_pet_id
  from public.pets p
  where p.user_id = v_owner_id
    and lower(p.name) = 'bandida'
  order by p.created_at desc
  limit 1;

  if v_pet_id is null then
    insert into public.pets (
      user_id,
      name,
      type,
      pet_state,
      created_at
    )
    values (
      v_owner_id,
      'Bandida',
      'cat',
      'device_linked',
      now()
    )
    returning id into v_pet_id;
  else
    update public.pets
    set pet_state = 'device_linked',
        pet_onboarding_step = pet_onboarding_step
    where id = v_pet_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'devices'
      and column_name = 'device_id'
  ) then
    v_device_col := 'device_id';
  else
    v_device_col := 'device_code';
  end if;

  execute format(
    'update public.devices set owner_id = $1, pet_id = $2, device_type = $3, device_state = $4, status = $5 where %I = $6',
    v_device_col
  )
  using v_owner_id, v_pet_id, 'comedero', 'linked', 'active', 'KPCL0034';

  execute format(
    'update public.devices set owner_id = $1, pet_id = $2, device_type = $3, device_state = $4, status = $5 where %I = $6',
    v_device_col
  )
  using v_owner_id, v_pet_id, 'bebedero', 'linked', 'inactive', 'KPCL0036';
end $$;
