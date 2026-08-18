# Data Model: Calibración Automática del Peso del Plato (por Tara)

Sin columnas ni tablas nuevas. Se reutilizan `devices.plate_weight_grams`
(existente, se deja `null` para dispositivos calibrados por tara),
`device_commands` (existente, se reutiliza para `CALIBRATE_WEIGHT`/`tare` y
`SET_INTERVAL`), y `readings` (existente, se lee vía Realtime para la
confirmación).

## Estado de la secuencia guiada (client-side, transitorio)

| Estado | Descripción |
|---|---|
| `esperando_conexion` | Verificando que el dispositivo recién vinculado esté enviando datos antes de ofrecer empezar. |
| `listo_para_plato` | Dispositivo conectado — pidiendo colocar el plato vacío. |
| `tarando` | Comando de tara enviado (`device_commands` insertado), esperando que el bridge lo marque `executed` y llegue una lectura nueva. |
| `confirmando` | Lectura nueva recibida — evaluando si está dentro del margen de "~0". |
| `exitoso` | Confirmado: el dispositivo quedó en cero con el plato puesto. `plate_weight_grams` permanece `null`. |
| `fallido` | La lectura de confirmación no llegó a tiempo o no dio ~0 — se ofrece repetir desde `listo_para_plato`. |
| `manual` | La persona eligió (o se le ofreció tras fallos repetidos) ingresar el peso a mano — mismo camino que existe hoy, `plate_weight_grams` se guarda con el valor escrito. |

## Reutilización de entidades existentes

| Entidad | Campo relevante | Uso en este feature |
|---|---|---|
| `devices` | `plate_weight_grams` (ya existe, nullable) | Queda `null` tras una tara exitosa (camino nuevo). Se rellena con el valor escrito si se usa el camino manual (User Story 3, sin cambios respecto a hoy). |
| `device_commands` | `command` (jsonb), `status` | Se insertan comandos `CALIBRATE_WEIGHT`/`tare` y `SET_INTERVAL` (acelerar/restaurar) — mismo mecanismo ya usado por el botón "Tarar" de `/bowl` y por el selector de intervalo. |
| `readings` | `weight_grams`, `device_id`, `recorded_at` | Se observa vía Realtime (INSERT) para confirmar que una lectura posterior a la tara da ~0. |

## Validación

- El margen de "~0" para dar la tara por confirmada (FR-004) es un umbral pequeño en gramos, coherente con la precisión del sensor ya documentada (`Knowledge/07_MQTT/README_MQTT.md`: deadband de 2g en la publicación) — no una comparación estricta a exactamente 0.
- La secuencia solo se ofrece sobre un dispositivo recién creado sin lecturas propias todavía (ver `research.md` § Cómo garantizar...) — no hay validación de negocio nueva más allá de esa comprobación.
