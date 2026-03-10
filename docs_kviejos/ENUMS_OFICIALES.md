# Enums Oficiales - KViejos

KViejos usa CHECK constraints (no enum types) para facilitar compatibilidad y migraciones.

## sensors.sensor_type
- `motion`
- `door`
- `gas`
- `smoke`
- `water_leak`
- `sos_button`
- `temperature`

## sensors.status
- `active`
- `inactive`
- `maintenance`

## events.event_type
- `motion`
- `door_open`
- `door_close`
- `gas_detected`
- `smoke_detected`
- `water_leak_detected`
- `medication_due`
- `sos_pressed`
- `temperature_reading`

## events.severity
- `info`
- `warn`
- `critical`

## alert_rules.rule_type
- `inactivity`
- `door_open`
- `gas`
- `smoke`
- `water_leak`
- `sos`
- `medication`
- `temperature`

## alerts.status
- `active`
- `acknowledged`
- `resolved`

## contacts.channel
- `app`
- `email`
- `sms`
- `whatsapp`
