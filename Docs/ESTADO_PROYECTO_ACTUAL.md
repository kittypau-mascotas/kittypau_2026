# Estado Proyecto Actual - Kittypau

Fecha de corte: 2026-04-01

Este documento es la foto viva del proyecto. Si hay conflicto entre planes, cronogramas o bitacoras, este resumen manda para lectura rapida.

## 1. Estado ejecutivo

- La app principal, el bridge, Supabase y el esquema oficial estan alineados.
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
- Homologar el flujo de sesiones operativas:
  - `device_operation_records`
  - `device_power_sessions`
  - `device_battery_cycles`
- `KPCL0034` ya quedo marcado manualmente como `battery_only` al desconectarse el cargador el `2026-04-01 04:36:28Z`.
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
