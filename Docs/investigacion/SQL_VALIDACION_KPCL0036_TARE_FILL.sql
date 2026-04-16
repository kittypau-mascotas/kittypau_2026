-- ============================================================
-- Validacion canonica de secuencia KPCL0036: tare -> plato -> llenado
-- ============================================================
-- Devuelve la secuencia categorica base para comparar futuras lecturas
-- del dispositivo KPCL0036 sin mezclarla con otros tramos.
-- ============================================================

with device_ctx as (
  select
    d.id as device_uuid,
    d.device_id as device_code,
    d.device_type,
    d.status as device_status,
    d.device_state
  from public.devices d
  where d.device_id = 'KPCL0036'
  limit 1
),
expected_sequence as (
  select *
  from (
    values
      (
        1,
        'tare_record',
        'Registro de tare',
        'manual_plate_tare_start',
        timestamptz '2026-04-06 20:05:12.356102+00',
        'Inicio del tare manual.'
      ),
      (
        2,
        'food_fill_start',
        'Inicio llenado de comida',
        'manual_food_refill',
        timestamptz '2026-04-06 20:06:55+00',
        'Llenado de comida comienza antes de cerrar por completo la fase de tare.'
      ),
      (
        3,
        'plate_weight',
        'Peso del plato / tare completo',
        'manual_plate_tare',
        timestamptz '2026-04-06 20:07:00.191354+00',
        'Tara finalizada; plato en 0 g.'
      ),
      (
        4,
        'food_fill_end',
        'Termino llenado de comida',
        'manual_food_refill_end',
        timestamptz '2026-04-06 20:07:10.132855+00',
        'Llenado de comida termina; desde aqui comienza el descenso de peso.'
      )
  ) as v(
    stage_order,
    stage_key,
    stage_label,
    event_type,
    expected_at,
    expected_note
  )
),
audit_events_seq as (
  select
    ae.event_type,
    ae.created_at as observed_at,
    ae.payload,
    case
      when ae.event_type = 'manual_plate_tare_start' then 'tare_record'
      when ae.event_type = 'manual_plate_tare' then 'plate_weight'
      when ae.event_type = 'manual_food_refill' then 'food_fill_start'
      when ae.event_type = 'manual_food_refill_end' then 'food_fill_end'
      else 'other'
    end as stage_key
  from public.audit_events ae
  join device_ctx d on d.device_uuid = ae.entity_id
  where ae.entity_type = 'device'
    and ae.event_type in (
      'manual_plate_tare_start',
      'manual_plate_tare',
      'manual_food_refill',
      'manual_food_refill_end'
    )
),
reading_window as (
  select
    r.recorded_at,
    r.weight_grams,
    r.weight_grams
      - lag(r.weight_grams) over (order by r.recorded_at) as delta_weight_g,
    case
      when r.recorded_at < timestamptz '2026-04-06 20:05:12.356102+00' then 'pre_tare'
      when r.recorded_at < timestamptz '2026-04-06 20:06:55+00' then 'tare_record'
      when r.recorded_at < timestamptz '2026-04-06 20:07:10.132855+00' then 'food_fill_start'
      else 'food_fill_end'
    end as inferred_stage
  from public.readings r
  join device_ctx d on d.device_uuid = r.device_id
  where r.recorded_at >= timestamptz '2026-04-06 20:05:12.356102+00'
)
select
  e.stage_order,
  e.stage_key,
  e.stage_label,
  e.event_type as expected_event_type,
  e.expected_at,
  e.expected_note,
  a.observed_at,
  a.payload,
  rw.recorded_at as first_reading_at_or_after_stage,
  rw.weight_grams as first_reading_weight_g,
  rw.delta_weight_g as first_reading_delta_g,
  rw.inferred_stage,
  case
    when a.observed_at is not null then 'audit_event'
    when rw.recorded_at is not null then 'reading'
    else 'pending'
  end as evidence_source
from expected_sequence e
left join audit_events_seq a
  on a.stage_key = e.stage_key
left join lateral (
  select *
  from reading_window rw
  where rw.inferred_stage = e.stage_key
  order by rw.recorded_at asc
  limit 1
) rw on true
order by e.stage_order;
