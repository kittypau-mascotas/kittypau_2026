# Calidad de datos (estadística operacional)

## Canon temporal
Usar `effective_ts = CASE WHEN clock_invalid THEN ingested_at ELSE recorded_at END` para series, ventanas y “frescura”.

## Checks mínimos (por dispositivo y por mascota)
- Frescura: `now - max(effective_ts)`
- Missing rate por variable (24h / 7d)
- Duplicados: idempotencia por `(device_id, recorded_at)`
- Monotonía temporal (por `device_id`)
- Outliers físicos (rangos) + spikes (deltas)

## Umbrales sugeridos (MVP)
- Missing rate < 10% para resúmenes diarios confiables
- Frescura p95 < 2 min (ajustable por despliegue)

## Salidas
- Flags de calidad por ventana (para UI y para evitar falsos positivos ML)

