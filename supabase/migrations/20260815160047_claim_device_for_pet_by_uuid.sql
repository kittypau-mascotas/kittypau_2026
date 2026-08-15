-- SPEC_10: vincular dispositivo eligiendo de la lista real (UUID ya existente
-- en `devices`, auto-registrado por el bridge), en vez de tipear un código
-- KPCL0000 a ciegas que dispara un INSERT nuevo (ver §1 del spec — riesgo de
-- fila duplicada para el mismo hardware físico).
--
-- No se toca `link_device_to_pet` (queda como está, sin consumidores nuevos
-- después de este cambio) — se agrega una función separada porque la forma
-- de la operación es distinta (UPDATE por UUID existente, no INSERT).
create or replace function public.claim_device_for_pet(
  p_owner_id      uuid,
  p_pet_id        uuid,
  p_device_uuid   uuid,
  p_device_type   text,
  p_status        text,
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
  v_device    public.devices;
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

  -- Mismo comportamiento que link_device_to_pet: desactiva cualquier device
  -- activo del pet antes de activar el nuevo (no se toca esa lógica, fuera
  -- de alcance de este spec).
  update public.devices
  set status = 'inactive'
  where pet_id = p_pet_id
    and status = 'active';

  -- UPDATE por id, no INSERT — evita la fila duplicada del §1 del spec.
  -- `owner_id is null` en el WHERE es la defensa contra carrera: si otra
  -- cuenta reclamó el device un instante antes, esto no afecta filas y
  -- v_device queda null.
  update public.devices
  set owner_id = p_owner_id,
      pet_id = p_pet_id,
      device_type = p_device_type,
      status = p_status,
      device_state = 'linked',
      -- coalesce: no pisar telemetría real de batería con null si el
      -- formulario no manda un valor (mismo criterio que "hardware nunca es
      -- el ideal en papel" — no descartar un dato real por uno vacío del UI).
      battery_level = coalesce(p_battery_level, battery_level)
  where id = p_device_uuid
    and owner_id is null
  returning * into v_device;

  if v_device is null then
    raise exception 'Device not available';
  end if;

  update public.pets
  set pet_state = 'device_linked'
  where id = p_pet_id;

  return v_device;
end;
$$;
