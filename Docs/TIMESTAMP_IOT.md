# TIMESTAMPS EN IOT (SQL + PIPELINE)

## Objetivo
Garantizar consistencia temporal cuando el reloj del dispositivo es inestable. En IoT, el tiempo del device no es confiable (drift, NTP off, reinicios, routers).

## Campos clave
- `recorded_at`: tiempo reportado por el dispositivo. Referencia orientativa.
- `ingested_at`: tiempo del servidor cuando se recibió la lectura. Fuente de verdad.
- `clock_invalid`: bandera cuando el tiempo del dispositivo es inválido.

## Regla de oro
- server_time manda
- device_time orienta

## Validación recomendada en webhook
Si `recorded_at` llega fuera de un rango razonable (ej. ±10 min del servidor):
- `recorded_at = ingested_at`
- `clock_invalid = true`

## Por qué esto importa
- Evita que datos “viajen en el tiempo”.
- Hace que dashboards y alertas sean confiables.
- Protege el pipeline ante hardware con reloj dañado (30–40% de dispositivos falla alguna vez).

## Uso práctico
- Consultas: ordenar por `ingested_at` para “último dato real”.
- Análisis: usar `recorded_at` solo si `clock_invalid = false`.
- Auditoría: `clock_invalid` diagnostica drift de reloj.

## SQL sugerido (modelo)
Tabla `readings`:
- `recorded_at timestamptz not null`
- `ingested_at timestamptz not null default now()`
- `clock_invalid boolean not null default false`

## Resumen
Este patrón transforma el sistema en tolerante a hardware defectuoso, sin romper histórico ni métricas.
