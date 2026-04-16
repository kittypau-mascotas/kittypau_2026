-- Consulta canonica de categorias manuales de bowl (comida e hidratacion)
-- Fuente: public.audit_events, event_type = 'manual_bowl_category'
-- Taxonomia completa: ver Docs/investigacion/README.md

select
  ae.created_at,
  ae.payload ->> 'device_id'       as device_id,
  ae.payload ->> 'category'        as category_key,
  ae.payload ->> 'category_label'  as category_label,
  ae.payload ->> 'source'          as source,
  ae.payload ->> 'notes'           as notes
from public.audit_events ae
where ae.event_type = 'manual_bowl_category'
  and (ae.payload ->> 'category') in (
    -- Setup de dispositivo
    'kpcl_sin_plato',
    'kpcl_con_plato',
    'tare_con_plato',
    -- Servido (ambos bowls)
    'inicio_servido',
    'termino_servido',
    -- Consumo alimentacion (food_bowl)
    'inicio_alimentacion',
    'termino_alimentacion',
    -- Consumo hidratacion (water_bowl)
    'inicio_hidratacion',
    'termino_hidratacion'
  )
order by ae.created_at desc
limit 100;

-- Encendido/apagado (bridge-generated, pendiente implementar en bridge)
-- Una vez implementado, consultar con:
--
-- select created_at, payload ->> 'device_id', payload ->> 'category', payload ->> 'source'
-- from public.audit_events
-- where event_type = 'device_power_event'
-- order by created_at desc limit 50;
