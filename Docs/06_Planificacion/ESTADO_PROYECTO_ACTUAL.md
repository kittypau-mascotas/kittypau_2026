# Estado Proyecto Actual - Kittypau

Fecha de corte: 2026-04-27

Este documento es la foto viva del proyecto. Si hay conflicto entre planes, cronogramas o bitcoras, este resumen manda para lectura rpida.

## 1. Estado ejecutivo

- La app principal, el bridge, Supabase y el esquema oficial estan alneados.
- El build de `kittypau_app` vuelve a pasar y la capa `analytics` ya no bloquea cuando no existe base analitica.
- El flujo core `login -> mascota -> dispositivo -> datos` sigue siendo la ruta principal.
- La sesin de usuario ya debe persistir por dispositivo en web y APK; la app no debe pedir login en cada apertura si no hubo cierre de sesin explcito.
- La documentacin ya tiene una fuente de verdad y un indice principal para lectura rpida.
- El repo ya tiene guardrail activo de encoding: chequeo local, pre-commit y GitHub Actions para bloquear mojibake y archivos no UTF-8.
- El paquete de postulaciones 2026 sigue vivo, pero la postulacion CORFO Semilla Inicia de O'Higgins ya vencio.
- La telemetra de batera no existe todavia en el historico de `KPCL0034`; la autonoma real no puede medirse aun.

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
  - `STARTUPLAB01_2026/`
  - `CORFO_SEMILLA_INICIA_2026/`

## 3. Lo que sigue pendiente de forma real

- Cerrar la ruta ON/OFF del bridge 24/7 como operacin estable.
- Mantener el dashboard y observabilidad operativa al dia.
- Definir con telemetra real el ciclo de batera, si el hardware empieza a emitir `battery_*`.
- Finalizar o replanificar la postulacion Semilla Inicia segn nueva region o nueva convocatoria.
- Completar los entregables que sigan abiertos en los checklists de postulacion.

## 4. Estado de postulaciones

- Start-Up Chile:
  - narrativa y formulario siguen siendo la versin viva.
  - deck, checklist y anexos siguen como paquete de trabajo.
- Corfo Semilla Inicia:
  - el deadline de O'Higgins del 2026-03-16 ya paso.
  - el paquete queda como base de replanificacion o retilizacion para otra convocatoria.

## 5. Regla de lectura

- Para estado real corto: leer este documento.
- Para mapa canonico: leer `FUENTE_DE_VERDAD.md`.
- Para estrategia y plan maestro: leer `PLAN_MAESTRO.md`.
- Para siguente mejora accinable: leer `PLAN_MEJORA_PRIORIZADO.md`.
- Para backlog operativo vivo: leer `TAREAS_PENDIENTES_ACTUALES.md`.
- Para cronograma de trabajo: leer `PMO/03_SCHEDULE.md`.
- Para postulaciones 2026: leer `Postulaciones Fondos/2026/README.md`.

## 5.1 Higiene de encoding

- Script oficial: `scripts/check_encoding.py`
- Check local completo: `python scripts/check_encoding.py`
- Check app: `npm --prefix kittypau_app run encoding-check`
- Hook local: `.husky/pre-commit`
- CI remoto: `.github/workflows/pr-quality.yml`
- Regla vigente: si un archivo nuevo rompe UTF-8 o introduce mojibake, el commit/PR debe fallar antes de entrar a `main`.

## 6. Que debemos seguir ahora, por area

### Front
- Cerrar la coherencia de `/today` entre hero, navbar, selector de mascota y tarjetas.
- La sincronizacin de mascota y dispositivo en `/today` ya responde a eventos de seleccion para evitar estados cruzados.
- La vista `/today` ya qued limpia de warnings de ESLint y paso `type-check` + smoke test local en `http://localhost:3000/today`.
- Eliminar los ultimos fallbacks visuales que esconden el estado real de comida, agua y ambiente.
- Mantener el contrato de UI para `readings` estable, sin asumir columnas de batera que no existen.
- Consolidar estados vacios, loading y errores para que el usuario entienda siempre si hay datos o no.

### Back
- Mantener estable `/api/readings`, `/api/devices` y `/api/mqtt/webhook` sin romper compatibilidad.
- Cerrar observabilidad minima: health-check, timeouts, errores y recuperacion del bridge.
- La capa de borde ya usa `proxy.ts` en lugar de `middleware.ts`, eliminando el warning de deprecacion de Next 16.
- Homologar el flujo de sesiones operativas:
  - `device_operation_records`
  - `device_power_sessions`
  - `device_battery_cycles`
- `KPCL0034` qued marcado manualmente como tramo `battery_only` al desconectarse el cargador el `2026-04-01 04:36:28Z` y luego paso a carga manual a las `2026-04-06 12:50` hora local.
- `KPCL0036` qued registrado manualmente como ciclo de carga completa entre `2026-04-01 08:36` y `2026-04-01 12:42` hora local, con duracion observada de `4h06m` y muestreo esperado cada `10s`.
- `KPCL0036` ahora qued en `battery_only` desde `2026-04-06 15:55:23-04:00`, tras desconectar el cargador cuando el indicador segua azul / batera completa, para medir autonoma real.
- `KPCL0036` tambien qued con el plato de comida montado sobre el dispositivo y sin comida, registrado manualmente a las `2026-04-06 16:04:27-04:00` como observacion operativa puntual.
- `KPCL0036` qued con tare aplicado al plato y base de alimento en `0 g` desde las `2026-04-06 16:05:00-04:00`, para registrar mediciones netas desde ese punto.
- `KPCL0036` qued con alimento agregado y registro neto de `36 g` desde las `2026-04-06 16:07:50-04:00`, usando el tare previo como baseline.
- `KPCL0036` qued con peso neto actual de `28 g` desde las `2026-04-06 16:23:08-04:00`, sin consumo observado ni ajuste manual entre mediciones.
- `KPCL0036` qued con peso neto actual de `26 g` desde las `2026-04-06 16:27:47-04:00`, tras la lectura sucesiva ms reciente.
- `KPCL0036` qued con una nueva secuencia manual posterior de tare entre `2026-04-06 20:05:12.356102+00` y `2026-04-06 20:07:00.191354+00`, con inicio de llenado de comida a las `2026-04-06 20:06:55+00`, cierre del llenado entre `2026-04-06 20:07:00.191354+00` y `2026-04-06 20:07:10.132855+00`, y descenso de peso desde ese instante.
- `KPCL0034` ya tiene un inicio de carga manual guardado para poder medir el siguente tramo y sacar calculos.
- Al `2026-04-06 17:40:13-04:00`, `KPCL0034` y `KPCL0036` quedaron con plato encima, con el plato activo y sin cargador, listos para ejecutar la prueba compartida de tare, peso de plato e inicio/termino de llenado.
- Al `2026-04-07 00:17:41+00:00`, `KPCL0034` qued categorizado manualmente como `inicio_alimentacin` desde la nueva capa de botones del plato.
- Al `2026-04-07 00:20:41+00:00`, `KPCL0034` qued categorizado manualmente como `termino_alimentacin` desde la nueva capa de botones del plato.
- Al `2026-04-06 21:42:34+00:00`, comenzo la tare en la app para `KPCL0034`; el tramo queda abierto hasta que llegue la lectura final posterior.
- Al `2026-04-06 21:43:34+00:00`, comenzo el servido de comida en la app para `KPCL0034`; el tramo queda abierto hasta que llegue el termino y la lectura final asociada.
- Al `2026-04-06 21:44:03+00:00`, termino el servido de comida en la app para `KPCL0034`; el grafico 2 queda completo con `food_fill_end` para ese device.
- Al `2026-04-06 21:42:22+00:00`, comenzo la tare en la app para `KPCL0036`; el tramo queda abierto hasta que llegue la lectura final posterior.
- Al `2026-04-06 21:43:48+00:00`, comenzo el servido de comida en la app para `KPCL0036`; el tramo queda abierto hasta que llegue el termino y la lectura final asociada.
- Al `2026-04-06 21:44:27+00:00`, termino el servido de comida en la app para `KPCL0036`; el grafico 2 queda completo con `food_fill_end` para ese device.
- Para `KPCL0034`, el grafico 2 queda definido con `tare_record` a `2026-04-06 21:42:34+00:00`, `food_fill_start` a `2026-04-06 21:43:34+00:00` y `food_fill_end` a `2026-04-06 21:44:03+00:00`.
- Para `KPCL0036`, el grafico 2 queda definido con `tare_record` a `2026-04-06 21:42:22+00:00`, `food_fill_start` a `2026-04-06 21:43:48+00:00` y `food_fill_end` a `2026-04-06 21:44:27+00:00`.
- El CSV bruto `Docs/investigacion/kpcl0034_kpcl0036_prueba_sincargador.csv` qued guardado como snapshot del experimento compartido sin cargador, con lectura combinada de ambos devices para anlisis posterior.
- El anlisis de ese CSV se interpreta sin gato ni interrupcion externa directa del sensor; cualquier variacion de peso se toma primero como posible deriva, alimentacin, mecanica o recalibracion.
- Quedo pendiente una prueba controlada compartida de `KPCL0034` y `KPCL0036` con cargador conectado, sin objeto encima, y la misma secuencia `tare_record -> food_fill_start -> food_fill_end` para comparar comportamiento de peso con una escena comun.
- Continuar endureciendo la base sin introducir fallback oculto en produccion.

### Firmware
- Mantener el contrato de payloads de KPCL estable.
- Si el hardware lo permite, comenzar a emitir telemetra real de energa:
  - `battery_level`
  - `battery_voltage`
  - `battery_state`
  - `battery_source`
- Asegurar timestamps y frecuencia consistentes para no romper la inferencia de actividad.
- Prioridad de firmware hoy: confiabilidad de lectura antes que nuevas variables.

### Auditoria y limpieza de DB (sesion 2026-04-27)

- **Bridge v3.2**: eliminada la escritura redundante a `sensor_readings`. El bridge ahora solo escribe en `readings` (UUID FK), que es la unica tabla de telemetria leida por la app. Ahorro: 1 roundtrip DB por cada lectura MQTT recibida (~cada 5-10 s por dispositivo activo).
- **`sensor_readings`**: tabla marcada como retirada en `SQL_SCHEMA.sql` y en `AUDITORIA_DB_TABLAS.md`. Candidata a DROP TABLE en una migration futura.
- **`breeds` y `pet_breeds`**: documentadas como dormidas (existe el schema, ningun endpoint las usa). No se borran — infraestructura lista para cuando se active la seleccion de raza desde DB.
- **`device_operation_records`, `device_battery_cycles`, `device_power_sessions`**: documentadas como infraestructura pendiente de firmware (no tienen uso en runtime, esperan telemetria real de bateria del firmware).
- Creado `Docs/AUDITORIA_DB_TABLAS.md`: inventario completo de todas las tablas con su estado, quien las usa y pendientes de limpieza.
- Actualizado `Docs/SQL_MAESTRO.md` con enlace al nuevo documento de auditoria.

### Optimizaciones de rendimiento (sesion 2026-04-27)

Las siguientes mejoras quedaron aplicadas y funcionando en `main_sanitized`:

**API — Latencia y cache:**
- `/api/analytics/sessions` y `/api/analytics/daily`: las consultas de plan de usuario y datos analiticos ahora corren en paralelo con `Promise.all` (eliminando ~80ms de latencia secuencial). El plan se obtiene usando el cutoff maximo (365 dias) y el filtro real se aplica en memoria segun el plan del usuario.
- `/api/readings`, `/api/analytics/sessions`, `/api/analytics/daily`: se agregaron headers `Cache-Control: private, max-age=N, stale-while-revalidate=M` para evitar roundtrips innecesarios al servidor.

**today/page.tsx — React hooks:**
- Polling de datos reducido de 5 s a 15 s (ratio de actualizacion mas razonable sin perder reactividad dado MQTT en tiempo real).
- `bowlFeedbackTimerRef` y `waterFeedbackTimerRef`: los timers de feedback visual ahora usan refs con `clearTimeout` antes de cada `setTimeout`, eliminando acumulacion de timers en clicks rapidos.
- `onPetChangeRef` / `onDeviceChangeRef`: el `useEffect` de suscripcion a eventos de ventana (`kittypau-pet-change`, `kittypau-device-change`) ahora usa el patron de handler-ref. Los handlers se asignan a los refs en cada render (closure fresca) y el `useEffect` corre solo una vez al montar con deps `[]`. Esto elimina la re-suscripcion que ocurria cada vez que `state.devices`, `state.pets`, `selectedPetId` o `selectedDeviceId` cambiaban de referencia (incluyendo cada lectura MQTT en tiempo real).

**DayCycleChart.tsx — D3:**
- `svg.interrupt().selectAll("*").interrupt()` antes de limpiar el SVG, para cancelar transiciones en vuelo y evitar solapamiento de animaciones.
- Listeners de mouse ahora usan namespace `.chart` (`.on("mousemove.chart", ...)`) para evitar acumulacion de handlers en cada redibujado.

**bowl/page.tsx — polling:**
- El polling de lecturas ahora hace merge (union incremental) en lugar de reemplazar el array completo, evitando parpadeo visual al recibir datos en el fondo.

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
- Regla vigente de auth:
  - si el usuario ya inicio sesin en ese dispositivo, debe reingresar directo a la app;
  - la raiz `/` ya no debe mandar siempre a `/login`;
  - la sesin solo debe cerrarse con `Cerrar sesin`.
- Para mobile/APK, vlidar release y QA mnimo antes de agregar ms UI.

### Empresa / Finanzas / Postulaciones
- Tratar CORFO Semilla Inicia como replanificacion, no como convocatoria viva.
- Mantener Start-Up Chile como paquete vivo de trabajo.
- Mantener `FONDOS_RASTREADOS_ACTUALES.md` como radar oficial de fondos abiertos, vigentes y de vigilancia.
- Completar o cerrar los checklists que sigan abiertos en `documento_2026` y `STARTUPLAB01_2026`.
- Continuar documentando costos, BOM, financiamiento y trazabilidad de componentes.
- Mantener el relato empresarial alneado con la realidad tecnica actual: funcionamiento, datos, traccin y capacidad de ejecucion.

