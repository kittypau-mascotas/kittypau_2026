# Estado Proyecto Actual - Kittypau

Fecha de corte: 2026-04-01

Este documento es la foto viva del proyecto. Si hay conflicto entre planes, cronogramas o bitacoras, este resumen manda para lectura rapida.

## 1. Estado ejecutivo

- La app principal, el bridge, Supabase y el esquema oficial estan alineados.
- El build de `kittypau_app` vuelve a pasar y la capa `analytics` ya no bloquea cuando no existe base analitica.
- El flujo core `login -> mascota -> dispositivo -> datos` sigue siendo la ruta principal.
- La documentacion ya tiene una fuente de verdad y un indice principal para lectura rapida.
- El paquete de postulaciones 2026 sigue vivo, pero la postulacion CORFO Semilla Inicia de O'Higgins ya vencio.
- La telemetria de bateria no existe todavia en el historico de `KPCL0034`; la autonomia real no puede medirse aun.

## 2. Lo que esta operativo

- Frontend principal en `kittypau_app/`.
- Bridge MQTT -> API -> Supabase.
- Tablas operativas oficiales:
  - `public.readings`
  - `public.device_operation_records`
  - `public.device_power_sessions`
  - `public.device_battery_cycles`
- Documentacion canonica ordenada desde `Docs/README.md` e `INDEX.md`.
- Postulaciones 2026 separadas por paquete:
  - `documento_2026/`
  - `Staruplab01_2026/`
  - `semilla_inicia/`

## 3. Lo que sigue pendiente de forma real

- Cerrar la ruta ON/OFF del bridge 24/7 como operacion estable.
- Mantener el dashboard y observabilidad operativa al dia.
- Definir con telemetria real el ciclo de bateria, si el hardware empieza a emitir `battery_*`.
- Finalizar o replanificar la postulacion Semilla Inicia segun nueva region o nueva convocatoria.
- Completar los entregables que sigan abiertos en los checklists de postulacion.

## 4. Estado de postulaciones

- Start-Up Chile:
  - narrativa y formulario siguen siendo la version viva.
  - deck, checklist y anexos siguen como paquete de trabajo.
- Corfo Semilla Inicia:
  - el deadline de O'Higgins del 2026-03-16 ya paso.
  - el paquete queda como base de replanificacion o reutilizacion para otra convocatoria.

## 5. Regla de lectura

- Para estado real corto: leer este documento.
- Para mapa canonico: leer `FUENTE_DE_VERDAD.md`.
- Para estrategia y plan maestro: leer `PLAN_MAESTRO.md`.
- Para siguiente mejora accionable: leer `PLAN_MEJORA_PRIORIZADO.md`.
- Para backlog operativo vivo: leer `TAREAS_PENDIENTES_ACTUALES.md`.
- Para cronograma de trabajo: leer `PMO/03_SCHEDULE.md`.
- Para postulaciones 2026: leer `Postulaciones Fondos/2026/README.md`.

## 6. Que debemos seguir ahora, por area

### Front
- Cerrar la coherencia de `/today` entre hero, navbar, selector de mascota y tarjetas.
- La sincronizacion de mascota y dispositivo en `/today` ya responde a eventos de seleccion para evitar estados cruzados.
- La vista `/today` ya quedo limpia de warnings de ESLint y paso `type-check` + smoke test local en `http://localhost:3000/today`.
- Eliminar los ultimos fallbacks visuales que esconden el estado real de comida, agua y ambiente.
- Mantener el contrato de UI para `readings` estable, sin asumir columnas de bateria que no existen.
- Consolidar estados vacios, loading y errores para que el usuario entienda siempre si hay datos o no.

### Back
- Mantener estable `/api/readings`, `/api/devices` y `/api/mqtt/webhook` sin romper compatibilidad.
- Cerrar observabilidad minima: health-check, timeouts, errores y recuperacion del bridge.
- La capa de borde ya usa `proxy.ts` en lugar de `middleware.ts`, eliminando el warning de deprecacion de Next 16.
- Homologar el flujo de sesiones operativas:
  - `device_operation_records`
  - `device_power_sessions`
  - `device_battery_cycles`
- `KPCL0034` quedo marcado manualmente como tramo `battery_only` al desconectarse el cargador el `2026-04-01 04:36:28Z` y luego paso a carga manual a las `2026-04-06 12:50` hora local.
- `KPCL0036` quedo registrado manualmente como ciclo de carga completa entre `2026-04-01 08:36` y `2026-04-01 12:42` hora local, con duracion observada de `4h06m` y muestreo esperado cada `10s`.
- `KPCL0036` ahora quedo en `battery_only` desde `2026-04-06 15:55:23-04:00`, tras desconectar el cargador cuando el indicador seguia azul / bateria completa, para medir autonomia real.
- `KPCL0036` tambien quedo con el plato de comida montado sobre el dispositivo y sin comida, registrado manualmente a las `2026-04-06 16:04:27-04:00` como observacion operativa puntual.
- `KPCL0036` quedo con tare aplicado al plato y base de alimento en `0 g` desde las `2026-04-06 16:05:00-04:00`, para registrar mediciones netas desde ese punto.
- `KPCL0036` quedo con alimento agregado y registro neto de `36 g` desde las `2026-04-06 16:07:50-04:00`, usando el tare previo como baseline.
- `KPCL0036` quedo con peso neto actual de `28 g` desde las `2026-04-06 16:23:08-04:00`, sin consumo observado ni ajuste manual entre mediciones.
- `KPCL0036` quedo con peso neto actual de `26 g` desde las `2026-04-06 16:27:47-04:00`, tras la lectura sucesiva mas reciente.
- `KPCL0036` quedo con una nueva secuencia manual posterior de tare entre `2026-04-06 20:05:12.356102+00` y `2026-04-06 20:07:00.191354+00`, con inicio de llenado de comida a las `2026-04-06 20:06:55+00`, cierre del llenado entre `2026-04-06 20:07:00.191354+00` y `2026-04-06 20:07:10.132855+00`, y descenso de peso desde ese instante.
- `KPCL0034` ya tiene un inicio de carga manual guardado para poder medir el siguiente tramo y sacar calculos.
- Al `2026-04-06 17:40:13-04:00`, `KPCL0034` y `KPCL0036` quedaron con plato encima, con el plato activo y sin cargador, listos para ejecutar la prueba compartida de tare, peso de plato e inicio/termino de llenado.
- Al `2026-04-07 00:17:41+00:00`, `KPCL0034` quedo categorizado manualmente como `inicio_alimentacion` desde la nueva capa de botones del plato.
- Al `2026-04-07 00:20:41+00:00`, `KPCL0034` quedo categorizado manualmente como `termino_alimentacion` desde la nueva capa de botones del plato.
- Al `2026-04-06 21:42:34+00:00`, comenzo la tare en la app para `KPCL0034`; el tramo queda abierto hasta que llegue la lectura final posterior.
- Al `2026-04-06 21:43:34+00:00`, comenzo el servido de comida en la app para `KPCL0034`; el tramo queda abierto hasta que llegue el termino y la lectura final asociada.
- Al `2026-04-06 21:44:03+00:00`, termino el servido de comida en la app para `KPCL0034`; el grafico 2 queda completo con `food_fill_end` para ese device.
- Al `2026-04-06 21:42:22+00:00`, comenzo la tare en la app para `KPCL0036`; el tramo queda abierto hasta que llegue la lectura final posterior.
- Al `2026-04-06 21:43:48+00:00`, comenzo el servido de comida en la app para `KPCL0036`; el tramo queda abierto hasta que llegue el termino y la lectura final asociada.
- Al `2026-04-06 21:44:27+00:00`, termino el servido de comida en la app para `KPCL0036`; el grafico 2 queda completo con `food_fill_end` para ese device.
- Para `KPCL0034`, el grafico 2 queda definido con `tare_record` a `2026-04-06 21:42:34+00:00`, `food_fill_start` a `2026-04-06 21:43:34+00:00` y `food_fill_end` a `2026-04-06 21:44:03+00:00`.
- Para `KPCL0036`, el grafico 2 queda definido con `tare_record` a `2026-04-06 21:42:22+00:00`, `food_fill_start` a `2026-04-06 21:43:48+00:00` y `food_fill_end` a `2026-04-06 21:44:27+00:00`.
- El CSV bruto `Docs/pruebas_kpcl/kpcl0034_kpcl0036_prueba_sincargador.csv` quedo guardado como snapshot del experimento compartido sin cargador, con lectura combinada de ambos devices para analisis posterior.
- El analisis de ese CSV se interpreta sin gato ni interrupcion externa directa del sensor; cualquier variacion de peso se toma primero como posible deriva, alimentacion, mecanica o recalibracion.
- Quedo pendiente una prueba controlada compartida de `KPCL0034` y `KPCL0036` con cargador conectado, sin objeto encima, y la misma secuencia `tare_record -> food_fill_start -> food_fill_end` para comparar comportamiento de peso con una escena comun.
- Continuar endureciendo la base sin introducir fallback oculto en produccion.

### Firmware
- Mantener el contrato de payloads de KPCL estable.
- Si el hardware lo permite, comenzar a emitir telemetria real de energia:
  - `battery_level`
  - `battery_voltage`
  - `battery_state`
  - `battery_source`
- Asegurar timestamps y frecuencia consistentes para no romper la inferencia de actividad.
- Prioridad de firmware hoy: confiabilidad de lectura antes que nuevas variables.

### App web / mobile / APK
- Mantener una sola experiencia coherente entre web, mobile y APK.
- Priorizar:
  - login
  - today
  - story
  - pet
  - bowl
  - settings
- Cerrar la brecha entre UI bonita y datos reales, especialmente en `/today`.
- Para mobile/APK, validar release y QA minimo antes de agregar mas UI.

### Empresa / Finanzas / Postulaciones
- Tratar CORFO Semilla Inicia como replanificacion, no como convocatoria viva.
- Mantener Start-Up Chile como paquete vivo de trabajo.
- Mantener `FONDOS_RASTREADOS_ACTUALES.md` como radar oficial de fondos abiertos, vigentes y de vigilancia.
- Completar o cerrar los checklists que sigan abiertos en `documento_2026` y `Staruplab01_2026`.
- Continuar documentando costos, BOM, financiamiento y trazabilidad de componentes.
- Mantener el relato empresarial alineado con la realidad tecnica actual: funcionamiento, datos, traccion y capacidad de ejecucion.
