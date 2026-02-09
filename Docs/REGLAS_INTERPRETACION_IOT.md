# Reglas de Interpretacion IoT -> UX (Kittypau)

## Objetivo
Convertir lecturas crudas en eventos e interpretaciones utiles para el usuario.

---

## Fuente de datos
- `readings` (peso comida, agua, timestamps)
- Estados de `devices` (bateria, last_seen)

---

## Validaciones y rangos oficiales (payload)
Estos limites se aplican en el webhook:
- `temperature`: -10 a 60
- `humidity`: 0 a 100
- `battery_level`: 0 a 100
- `weight_grams`: 0 a 20000
- `water_ml`: 0 a 5000
- `flow_rate`: 0 a 1000
- `device_id`: formato `KPCL0000`

Si falta `device_id` en el payload, el Bridge debe inyectarlo.

---

## Reglas base (agua + comida)
| Patron detectado | Interpretacion UX |
|---|---|
| muchas micro ingestas | ansiedad |
| ingesta nocturna | estres o aburrimiento |
| baja hidratacion | alerta salud |
| cambio horario | cambio rutina casa |
| comer al irte | apego |
| comer al volver | confianza |
| picos de agua | actividad intensa |
| ayuno prolongado | posible problema |

---

## Eventos generados (ejemplos)
- `meal_small_frequent` -> "Muchas visitas al plato"
- `hydration_low` -> "Bebio menos de lo habitual"
- `night_eating` -> "Comio de madrugada"
- `long_fasting` -> "Ayuno prolongado"

---

## Salida esperada (para /today y /story)
1. Mensajes interpretados (texto humano).
2. Ultimo evento relevante.
3. Comparacion historica (hoy vs promedio).

---

## Nota
Estas reglas no cambian el backend. Solo transforman la capa de presentacion.

