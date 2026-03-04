alter table public.devices
  add column if not exists plate_weight_grams int
  check (plate_weight_grams is null or (plate_weight_grams > 0 and plate_weight_grams <= 5000));

comment on column public.devices.plate_weight_grams is
  'Peso en gramos del plato auxiliar vacio (tara) para calcular contenido real.';

