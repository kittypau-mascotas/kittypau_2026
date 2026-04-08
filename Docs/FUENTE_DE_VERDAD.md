# Kittypau - Fuente de Verdad

> Este documento es el mapa canonico del ecosistema activo.
> Si otro doc entra en conflicto con este, este doc gana hasta que la fuente se actualice.

## 1) Que esta activo

- `kittypau_app/`: app web/nativa principal.
- `bridge/`: puente MQTT -> API.
- `supabase/`: esquema, migraciones, funciones y tablas activas.
- `iot_firmware/`: firmware y contratos del dispositivo.
- `Docs/`: solo documentos canonicos o de operacion activa.
- `.github/` y `.husky/`: automatizacion y calidad.

## 2) Que es legacy o esta archivado

- `Analisis_Estadistico_ML_IA/`: workspace de analisis ya ignorado.
- `kittypau_2026/`: snapshot historico.
- `supabase-analytics/`: esquema analitico historico.
- `boton gato/`: experimento lateral.
- `cat-movement-lab/`: experimento lateral.
- `samsung_tizen_experiment/`: experimento lateral.
- `tools/` y `Test Graficos/`: trabajo local / utilidades no productivas.
- `kittypau_app/legacy/`: residuos locales antiguos.
- `notebooks/`: placeholder documental local.

## 3) Tablas oficiales

### Core

- `public.profiles`
- `public.pets`
- `public.devices`
- `public.readings`
- `public.bridge_heartbeats`
- `public.bridge_telemetry`
- `public.audit_events`

### Operacion del dispositivo

- `public.device_operation_records`
- `public.device_power_sessions`
- `public.device_battery_cycles`
- `public.audit_events` para observaciones manuales inmutables de estado puntual, como el plato montado sin comida sobre `KPCL0036`, hasta que exista una tabla snapshot especifica para plato/dispositivo.
- `public.audit_events` tambien para tare manuales del plato y baselines puntuales de alimento, como el `KPCL0036` tared a `0 g`.
- `public.audit_events` tambien para registrar alimento neto puntual luego del tare, como el `KPCL0036` con `36 g`.
- `public.audit_events` tambien para registrar una lectura neta sucesiva del plato sin consumo observado, como el `KPCL0036` con `28 g`.
- `public.audit_events` tambien para registrar lecturas sucesivas de alimento neto, como el `KPCL0036` con `26 g`.
- `Docs/pruebas_kpcl/AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md` como auditoria canonica del CSV `Docs/pruebas_kpcl/kpcl0036_error_peso_sinbateria.csv`, cuando se necesite revisar peso bruto sin tara aplicada y su diagnostico tecnico.
- `public.audit_events` tambien para registrar secuencias manuales de tare, llenado de plato y descenso posterior, como la serie de `KPCL0036` del `2026-04-06 20:05:12.356102+00` al `2026-04-06 20:07:10.132855+00`.
- `Docs/pruebas_kpcl/SQL_VALIDACION_KPCL0036_TARE_FILL.sql` como consulta canonica para validar secuencias de tare, peso de plato, inicio de llenado a las `20:06:55+00` y termino de llenado en `KPCL0036`.
- `Docs/BATERIA_ESTIMADA_KPCL.md` como referencia canonica para la prueba controlada compartida de `KPCL0034` y `KPCL0036` con cargador conectado, sin objeto encima, y la secuencia por device del grafico 2 (`KPCL0034: tare_record -> food_fill_start -> food_fill_end` / `KPCL0036: tare_record -> food_fill_start -> food_fill_end`).
- `Docs/pruebas_kpcl/AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md` como referencia de auditoria para la misma secuencia cuando se compare `KPCL0036` con `KPCL0034`.
- Estado actual canonico de esa comparacion al `2026-04-06 17:40:13-04:00`: ambos `KPCL0034` y `KPCL0036` estan con plato encima, con el plato activo y sin cargador, listos para ejecutar la secuencia compartida.
- Tare en curso canonica al `2026-04-06 21:42:34+00:00` para `KPCL0034` y al `2026-04-06 21:42:22+00:00` para `KPCL0036` desde la app, pendiente de la lectura final posterior para cerrar el tramo.
- Inicio de servido en curso canonico al `2026-04-06 21:43:34+00:00` para `KPCL0034` y al `2026-04-06 21:43:48+00:00` para `KPCL0036` desde la app, pendiente de la lectura final posterior para cerrar el tramo.
- Termino de servido canonico al `2026-04-06 21:44:03+00:00` para `KPCL0034` y al `2026-04-06 21:44:27+00:00` para `KPCL0036` desde la app, cerrando el grafico 2 con `food_fill_end`.
- Categoria manual canonica al `2026-04-07 00:17:41+00:00` para `KPCL0034` con `inicio_alimentacion`, registrada desde la nueva capa de botones del plato.
- Categoria manual canonica al `2026-04-07 00:20:41+00:00` para `KPCL0034` con `termino_alimentacion`, registrada desde la nueva capa de botones del plato.
- `Docs/pruebas_kpcl/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql` como export canonico del tramo de experimento compartido de ambos devices, desde 5 minutos antes de la foto operativa hasta ahora.
- `Docs/pruebas_kpcl/AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md` como auditoria canonica del CSV bruto del experimento compartido sin cargador.
- Interpretacion canonica de ese CSV: se analiza la variacion de peso sin gato ni interrupcion externa directa del sensor; cualquier cambio debe priorizar hipotesis de medicion, alimentacion, mecanica o calibracion.

### Finanzas y BOM

- `public.finance_purchases`
- `public.finance_kit_components`
- `public.finance_provider_plans`
- `public.finance_monthly_snapshots`
- `public.finance_admin_summary`
- `public.finance_kpcl_profiles`
- `public.finance_kpcl_profile_components`

## 4) Flujos soportados

- Registro de usuario, mascota y dispositivo.
- Enlace dispositivo -> mascota.
- Ingesta MQTT -> bridge -> webhook -> `public.readings`.
- Seguimiento ON/OFF por actividad con `public.device_power_sessions`.
- Registro de periodos de funcionamiento en `public.device_operation_records`.
- Ciclos de bateria en `public.device_battery_cycles` cuando exista telemetria `battery_*` o cuando se carguen observaciones manuales canonicas para calculos historicos, como los ciclos de `KPCL0034` y `KPCL0036`, incluyendo el inicio manual de autonomia de `KPCL0036` tras desconectar el cargador.
- Observaciones manuales puntuales del estado del plato o del dispositivo en `public.audit_events` cuando no exista aun una tabla snapshot especifica.
- Inventario y costos de componentes / perfiles KPCL.
- Pruebas controladas de peso y carga para `KPCL0034` y `KPCL0036` como base comun de auditoria antes de derivar reglas automaticas.

## 5) Lo que no se debe asumir

- `supabase-analytics` no es la fuente activa del producto.
- `battery_state`, `battery_source` y `battery_voltage` no existen en el historico de `KPCL0034` todavia.
- La duracion real de bateria no se puede inferir sin telemetria de energia, salvo los tramos manuales canonicos que se guarden expresamente como referencia de analisis.
- `notebooks/` no forma parte del runtime de la app.
- El estado vivo resumido del proyecto vive en `ESTADO_PROYECTO_ACTUAL.md`.

## 6) Vocabulario canonico

- `activo`: componente, doc o flujo en uso dentro del producto vigente.
- `legacy`: componente o referencia antigua que puede seguir existiendo por compatibilidad.
- `archive`: documento o artefacto historico que se conserva solo como referencia.
- `ON/OFF`: estado operativo inferido por actividad de lecturas.
- `power session`: periodo continuo de actividad detectada por lecturas.
- `battery cycle`: periodo de carga o uso con bateria, cuando exista telemetria de energia.
- `battery state`: campo de telemetria esperado (`charging`, `battery_only`, etc.).
- `battery source`: fuente de energia detectada (`external_power`, `battery`, etc.).
- `battery cycles`: nombre recomendado para la tabla historica de carga y autonomia.
- `analytics` del historial: subsistema opcional/legacy; si no existe base analitica, las rutas deben degradar a vacio sin romper build ni UI.

## 7) Orden de lectura recomendado
1. [ARQUITECTURA_PROYECTO.md](ARQUITECTURA_PROYECTO.md)
2. [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md)
3. [ESTADO_PROYECTO_ACTUAL.md](ESTADO_PROYECTO_ACTUAL.md)
4. [SQL_MAESTRO.md](SQL_MAESTRO.md)
5. [FRONT_BACK_APIS.md](FRONT_BACK_APIS.md)
6. [BATERIA_ESTIMADA_KPCL.md](BATERIA_ESTIMADA_KPCL.md)

