select
  ae.created_at,
  ae.payload ->> 'device_id' as device_id,
  ae.payload ->> 'category' as category_key,
  ae.payload ->> 'category_label' as category_label,
  ae.payload ->> 'source' as source
from public.audit_events ae
where ae.event_type = 'manual_bowl_category'
  and (ae.payload ->> 'category') in (
    'inicio_alimentacion',
    'termino_alimentacion',
    'inicio_hidratacion',
    'termino_hidratacion'
  )
order by ae.created_at desc
limit 50;
