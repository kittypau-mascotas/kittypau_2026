# Bateria Estimada KPCL (sin fuel gauge)

## Objetivo
Habilitar visualizacion de bateria en web/app usando hardware KPCL actual, sin agregar medidor dedicado.

## Alcance implementado
- SQL:
  - migration `supabase/migrations/20260308193000_add_battery_estimation_fields.sql`.
  - columnas nuevas en `public.readings` y `public.devices`:
    - `battery_voltage`
    - `battery_state`
    - `battery_source`
    - `battery_is_estimated`
  - `public.devices` agrega `battery_updated_at`.
- API webhook (`POST /api/mqtt/webhook`):
  - acepta `battery_voltage`, `power_source`, `is_charging` (snake/camel).
  - si falta `battery_level`, calcula porcentaje desde voltaje:
    - referencia: `3.3V -> 0%`, `4.2V -> 100%` (clamped 0..100).
  - actualiza `readings` y `devices` con metadata de bateria.
- API lecturas (`GET /api/readings`):
  - retorna `battery_voltage`, `battery_state`, `battery_source`, `battery_is_estimated`.
- UI:
  - `/today`: muestra chip de bateria por plato con `%`, fuente y flag estimada.
  - `/bowl`: muestra resumen de bateria con detalle de fuente/voltaje/estimacion.

## Contrato sugerido para firmware/bridge
Payload recomendado:

```json
{
  "device_id": "KPCL0034",
  "battery_voltage": 3.91,
  "power_source": "battery",
  "is_charging": false,
  "timestamp": "2026-03-08T22:10:00Z"
}
```

Opcional:
- enviar `battery_level` cuando exista medicion directa.

## Estados de bateria
- `charging`
- `external_power`
- `optimal`
- `medium`
- `low`
- `critical`
- `unknown`

## Limitaciones
- La estimacion por voltaje es aproximada y depende de carga, temperatura y envejecimiento.
- Si el equipo esta solo en fuente USB sin lectura real de bateria, el dato no representa SOC exacto.
