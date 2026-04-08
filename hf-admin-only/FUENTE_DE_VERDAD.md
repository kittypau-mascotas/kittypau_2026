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
- Ciclos de bateria en `public.device_battery_cycles` cuando exista telemetria `battery_*`.
- Inventario y costos de componentes / perfiles KPCL.

## 5) Lo que no se debe asumir

- `supabase-analytics` no es la fuente activa del producto.
- `battery_state`, `battery_source` y `battery_voltage` no existen en el historico de `KPCL0034` todavia.
- La duracion real de bateria no se puede inferir sin telemetria de energia.
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


