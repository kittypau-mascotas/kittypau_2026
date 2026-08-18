# Research: Calibración Automática del Peso del Plato (por Tara)

## Contexto de código real (leído completo antes de este research)

- `kittypau_app/src/app/api/devices/[id]/tare/route.ts` — el comando ya existe.
- `kittypau_app/src/app/api/devices/route.ts` y `.../[id]/route.ts` — creación/edición de `devices`, incluida la validación de `plate_weight_grams`.
- `iot_firmware/javier_1a/firmware-esp8266/src/mqtt_manager.cpp` y `src/sensors.cpp` — recepción y ejecución real de `CALIBRATE_WEIGHT`/`tare`.
- `kittypau_app/src/app/(app)/bowl/page.tsx` (fragmentos relevantes: botón "Tarar", suscripción Realtime a `readings`).
- `kittypau_app/src/app/(app)/today/page.tsx` — cálculo real de contenido del plato, ambas ramas (con y sin `plate_weight_grams`).
- `Knowledge/06_BaseDatos/README_BaseDatos.md` — ciclo de vida de `device_commands` (`pending` → `executed`, marcado por el bridge).

## Hallazgo clave: la convivencia manual/tara YA está resuelta en el código existente, sin cambios

- Decision: no tocar `today/page.tsx` (ni ningún otro cálculo de contenido) — su fórmula ya existente es exactamente la correcta para ambos caminos:
  ```
  contenido = plate_weight_grams != null
    ? max(0, peso_bruto - plate_weight_grams)   // camino manual
    : peso_bruto                                 // camino tara (plate_weight_grams queda null)
  ```
  (`today/page.tsx` líneas ~1347-1361, y su equivalente para eventos históricos en `getSnapshotContentWeight`, líneas ~398-407).
- Rationale: un dispositivo calibrado por tara nunca necesita que se le mande `plate_weight_grams` — simplemente no se envía (queda `null` en `devices`), y el cálculo ya existente lo trata como "el peso bruto ES el contenido", que es exactamente el efecto de la tara real. `POST /api/devices` ya acepta `plate_weight_grams` como opcional (la validación de rango solo corre si el valor está presente) — no hace falta ningún cambio de API para que el camino tara simplemente no lo mande.
- Alternatives considered: escribir `plate_weight_grams = 0` explícitamente tras la tara — rechazado, es una escritura extra innecesaria y además `0` no es un valor natural para una columna que hoy se valida como `> 0` en el camino manual (`plate_weight_grams > 0` en la validación existente) — dejarlo `null` es semánticamente más correcto ("no aplica un peso de plato que restar") y ya es el comportamiento por defecto de una fila nueva.

## Orden real de los pasos: vincular el dispositivo ANTES de poder calibrar por tara

- Decision: `POST /api/devices/[id]/tare` requiere que el dispositivo YA exista en `devices` con `owner_id` del usuario (la ruta hace `select(...).eq("id", id).eq("owner_id", user.id)`) — no se puede tarar un dispositivo que todavía no se vinculó. Esto obliga a reordenar el paso 3 visible del registro en 2 sub-pasos, en vez del formulario atómico único de hoy:
  1. **Vincular** (elegir dispositivo vía `DevicePicker`, elegir tipo comida/agua, enviar `POST /api/devices` — **sin** `plate_weight_grams` todavía). El dispositivo queda creado.
  2. **Calibrar** (secuencia guiada de tara: conexión → colocar plato → tara → confirmar 0), usando el `id` real ya creado en el paso anterior.
- Rationale: es la única forma de que el comando de tara y la lectura de confirmación tengan un dispositivo real al cual apuntar — no hay atajo posible dado que las RLS y el propio endpoint de tara exigen que el dispositivo ya pertenezca al usuario.
- Alternatives considered: pre-crear un dispositivo "placeholder" antes de que la persona elija cuál — rechazado, más complejo y no resuelve nada (igual habría que vincular el dispositivo real elegido antes de poder tararlo).

## Cómo verificar que la tara dio ~0 (FR-004)

- Decision: reutilizar el mismo patrón ya usado en `/bowl/page.tsx` (líneas ~436-467) — suscripción a Supabase Realtime (`postgres_changes`, evento `INSERT`, tabla `readings`, filtro por el `device_id` del dispositivo recién vinculado) con `/api/readings` como fallback por polling si Realtime no conecta. La UI espera la primera lectura que llegue **después** de que `device_commands` marque el comando de tara como `executed` (ver `Knowledge/06_BaseDatos/README_BaseDatos.md`), y confirma éxito si esa lectura está dentro de un margen pequeño de 0.
- Rationale: es exactamente el mecanismo que ya existe en el codebase para "reaccionar a una lectura nueva de un dispositivo específico en vivo" — no se inventa un mecanismo de confirmación nuevo.
- Alternatives considered: agregar un campo de "ack" explícito al protocolo de firmware/MQTT (que el dispositivo confirme la tara por su cuenta) — rechazado, requeriría tocar firmware y el protocolo MQTT ya documentado, mucho más costoso que verificar por la próxima lectura real, que ya cumple el mismo propósito observable.
- **Actualización 2026-08-18, probado con hardware real**: la implementación original de T023 omitió el fallback por polling ("ponytail: agregar cuando en producción se vea que Realtime no conecta"). Se confirmó en producción que Realtime **nunca** entrega el INSERT (fila llega bien y a tiempo a `readings`, evento nunca llega al browser — ninguna migración habilita `readings` en `supabase_realtime`). El fallback se agregó (Phase 9, `tasks.md`) — sigue el mismo patrón ya documentado acá desde el principio.

## Acelerar el intervalo de publicación durante la calibración

- Decision: antes de pedir la tara, la secuencia guiada envía `SET_INTERVAL` (comando ya existente, `value_ms` configurable, mínimo 1000 ms) para bajar el intervalo de publicación de `SENSORS` a algo bajo (ej. 2000 ms) solo durante la prueba, y lo restaura a su valor normal (30000 ms por defecto) al terminar la secuencia (con éxito, fallo, o si la persona la abandona).
- Rationale: el intervalo por defecto de 30s haría que esperar una lectura de confirmación tomara hasta 30 segundos — incompatible con SC-001 (bajo 15 segundos). `SET_INTERVAL` ya existe exactamente para este propósito, sin necesitar ningún comando nuevo.
- Alternatives considered: dejar el intervalo en 30s y advertir que la prueba puede tardar más — rechazado, no cumple SC-001 y contradice el pedido explícito de que la prueba sea rápida ("prueba de 5 segundos").
- Riesgo a mitigar en la implementación: si la persona cierra el navegador o pierde conexión a mitad de la secuencia, el intervalo acelerado podría quedar sin restaurar — la implementación debe restaurar el intervalo normal también al reanudar sesión o como salvaguarda del lado del bridge/timeout, no solo al "cerrar bien" el flujo desde el cliente.

## Cómo garantizar que la tara solo corre en vinculación real de dispositivo nuevo (FR-009, no-negociable)

- Decision: la secuencia guiada de tara vive únicamente dentro del paso 3 del registro, inmediatamente después de crear el dispositivo (sub-paso "Calibrar" de arriba) — nunca se expone en ninguna pantalla de un dispositivo ya vinculado. Como salvaguarda adicional barata, la UI de calibración solo se muestra si el dispositivo recién creado todavía no tiene ninguna lectura propia en `readings` (chequeo simple, mismo criterio que ya existe implícitamente en el flujo: un dispositivo recién vinculado no tiene historial).
- Rationale: el botón "Tarar" que ya existe en `/bowl` (mantenimiento post-registro) es una superficie de riesgo preexistente y ya aceptada, fuera de alcance de este pedido (ver Edge Cases del spec) — no se toca ni se le agrega la misma guía, para no ampliar el alcance. La salvaguarda de "sin lecturas todavía" es una verificación barata (una consulta a `readings` limitada a 1 fila) que no requiere ningún estado nuevo ni columna nueva.
- Alternatives considered: agregar una columna nueva `calibrated_at`/`tare_locked` a `devices` para impedir re-disparar la secuencia — rechazado por ahora (YAGNI): la combinación de "solo vive en el flujo de registro" + "solo se muestra sin lecturas previas" ya cumple el requisito sin necesitar schema nuevo; si en el futuro se construye una pantalla de recalibración explícita (fuera de alcance acá), ahí sí se evaluaría un campo dedicado.

## Testing

- Decision: sin test de integración end-to-end contra hardware real (no hay infraestructura de testing con un dispositivo físico simulado en el proyecto). Cobertura vía: (a) test unitario de la función pura que decide "¿la lectura de confirmación cuenta como éxito?" dado un valor y un umbral (misma filosofía que los tests ya existentes del proyecto, Vitest); (b) `tsc`/`eslint`/`next build` sobre los archivos tocados; (c) validación manual documentada en `quickstart.md` contra un dispositivo Kittypau real, igual que specs 003/004.
- Rationale: coherente con el nivel de testing ya establecido en el resto de esta sesión para cambios de UI/flujo — el proyecto no tiene mocks de MQTT/firmware, y construir eso sería una inversión desproporcionada para esta feature puntual.
