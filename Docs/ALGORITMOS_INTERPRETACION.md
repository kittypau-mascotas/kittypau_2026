# Algoritmos de Interpretación (Kittypau)

## Objetivo
Convertir lecturas crudas en mensajes interpretativos consistentes, evitando conclusiones clínicas.

## Entradas
- `readings`: `weight_grams`, `water_ml`, `flow_rate`, `temperature`, `humidity`, `recorded_at`, `ingested_at`, `clock_invalid`.
- `devices`: `device_type`, `battery_level`, `last_seen`, `device_state`.
- `pets`: `type`, `weight_kg`, `age_range`, `activity_level`.

## Ventanas de análisis
- Corto plazo: 1h y 6h (eventos recientes).
- Día: 24h (resumen diario).
- Base: 7d y 30d (baseline personal).

## Baselines por especie (MVP)
- Gato adulto: agua 30-60 ml/kg/día.
- Perro adulto: agua 50-80 ml/kg/día.
- Comida: se estima por disminución de `weight_grams` en bowl de comida.

## Derivadas
- Consumo agua por ventana: suma de `water_ml` y/o integración de `flow_rate`.
- Consumo comida: delta negativa en `weight_grams` (suavizado por media móvil).
- Ritmo ingestión: eventos por hora.
- Ambiente: tendencia de temperatura/humedad en 24h.

## Reglas de interpretación (MVP)
- Hidratación baja: consumo < 70% del baseline de 7d.
- Hidratación alta: consumo > 130% del baseline de 7d.
- Ingesta nocturna: eventos entre 00:00–05:00 local.
- Micro-ingestas: >6 eventos pequeños en 2h.
- Ayuno prolongado: sin eventos > 12h.
- Ambiente riesgoso: temperatura > 30°C o humedad > 75% por > 2h.

## Mensajes UX (ejemplos)
- "Bebió menos de lo habitual en las últimas 24h."
- "Se detectaron varias micro-ingestas."
- "Hubo consumo nocturno inusual."
- "Ambiente caluroso por más de 2h."

## Guardrails
- Si `clock_invalid = true`, usar `ingested_at` para ventanas.
- Si faltan datos, mostrar "Sin datos suficientes".
- No inferir diagnósticos médicos.

## Personalización (próxima iteración)
- Ajuste de baseline por peso real y actividad.
- Ajuste por estacionalidad (temperatura ambiente).
- Alertas por cambios abruptos vs baseline.

## Roadmap
- Reglas por raza y edad.
- Detección de anomalías con z-score / IQR.
- Perfiles multi-mascota con comparación cruzada.
