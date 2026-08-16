-- SPEC_10: devices.owner_id era NOT NULL sin default desde la migración
-- original (20260208134653_apply_schema_update.sql:67) — esto rompía de
-- raíz el auto-registro del bridge (ensureDeviceExists() en
-- bridge/src/index.js ya inserta devices nuevos sin owner_id tal cual está
-- escrito hoy, sin necesitar cambios ahí). Sin este fix, GET
-- /api/devices/available nunca podía tener resultados reales — ningún
-- device auto-registrado por el bridge llegaba a existir en la tabla.
alter table public.devices alter column owner_id drop not null;
