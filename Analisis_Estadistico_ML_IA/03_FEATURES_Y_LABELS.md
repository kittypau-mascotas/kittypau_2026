# Features y labels

## Features (ejemplos)
- `food_content_g`, `water_content_cm3`
- `dt_seconds`, `delta_content_g`
- Ventanas: medias, desviación estándar, percentiles
- Rutina: `dominant_frequency`, `frequency_power` (FFT)
- Operación: frescura, estabilidad de sensor, tasa de lecturas/hora

## Labels (roadmap)
- “día normal” vs “día de riesgo” (definición veterinaria/reglas)
- “cambio de patrón” (comparación estadística vs baseline)

## Reglas
- Todo dataset debe quedar trazable por:
  - rango temporal
  - `owner_id`/`pet_id`
  - `algorithm_version`/`model_version`

