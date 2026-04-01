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
- Para cronograma de trabajo: leer `PMO/03_SCHEDULE.md`.
- Para postulaciones 2026: leer `Postulaciones Fondos/2026/README.md`.
