-- SPEC_10: libera el código KPCL0036 para vincularlo a una mascota real.
-- La fila real de Javier (72K lecturas, mascota "pasturri", online desde
-- 17-jul-2026) se renombra a KPCL9036 en vez de borrarse — conserva el
-- historial completo (la FK de readings es por UUID, no por este código de
-- texto, así que el rename no afecta ninguna lectura existente).
-- Autorizado explícitamente por Mauro (2026-08-16): mantener los datos,
-- solo liberar el string "KPCL0036".
update public.devices
set device_id = 'KPCL9036'
where device_id = 'KPCL0036';
