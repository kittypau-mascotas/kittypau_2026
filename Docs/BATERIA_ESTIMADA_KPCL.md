# Funcionamiento de Bateria y Ciclos de Energia en Kittypau

## Objetivo
Dejar documentado como Kittypau identifica y guarda el funcionamiento de energia de los dispositivos KPCL:
- cuando estan enchufados o cargando
- cuando alcanzan carga completa
- cuando pasan a uso solo con bateria
- cuanto dura el ciclo desde que quedan al 100% hasta que dejan de estar alimentados

El modelo aplica para `KPCL0034` hoy y para cualquier `KPCL...` futuro.

---

## Estado actual del modelo

### 1) Estimacion de bateria sin fuel gauge dedicado
Ya existe soporte de bateria estimada en el schema principal:
- migration: `supabase/migrations/20260308193000_add_battery_estimation_fields.sql`
- columnas nuevas en `public.readings`:
  - `battery_voltage`
  - `battery_state`
  - `battery_source`
  - `battery_is_estimated`
- columnas nuevas en `public.devices`:
  - `battery_voltage`
  - `battery_state`
  - `battery_source`
  - `battery_is_estimated`
  - `battery_updated_at`

Estados soportados:
- `charging`
- `external_power`
- `optimal`
- `medium`
- `low`
- `critical`
- `unknown`

### 2) Registro historico de funcionamiento
Se creo una tabla para intervalos de funcionamiento observados:
- migration: `supabase/migrations/20260331150000_add_device_operation_records.sql`
- tabla: `public.device_operation_records`

Esta tabla guarda:
- `active_start`
- `active_end`
- `active_duration_seconds`
- cantidad de lecturas
- resumen por device
- bateria observada si existiera telemetria

### 3) Registro de ciclos de bateria
Se creo una tabla generica para ciclos de energia:
- migration: `supabase/migrations/20260331153000_add_device_battery_cycles.sql`
- tabla: `public.device_battery_cycles`

Esta tabla sirve para todos los devices y separa:
- enchufado / cargando
- carga completa
- uso solo con bateria
- cierre del ciclo cuando vuelve energia

Ademas, la tabla quedo coordinada con el BOM financiero de Kittypau para que cada ciclo pueda quedar ligado a las piezas reales de energia:
- migration de enlace: `supabase/migrations/20260331162000_add_device_battery_bom_context.sql`
- columnas nuevas en `public.device_battery_cycles`:
  - `battery_component_code`
  - `charger_component_code`
  - `battery_capacity_mah`
  - `battery_nominal_voltage_v`
  - `estimated_charge_current_ma`
  - `estimated_full_charge_hours`
  - `battery_bom_context`

Piezas relacionadas con la bateria en el BOM:
- `BATT_LIPO_602025` = bateria LiPo 250mAh 3.7V
- `BATT_LIPO_502030` = bateria LiPo 250mAh 3.7V
- `CHG_TP4056_TYPEC` = modulo cargador LiPo Type-C
- `CHG_LIPO_TYPEC` = cargador bateria LiPo 3.7V Type-C

Nota operativa:
- la capacidad nominal si esta identificada en la tabla
- el tiempo exacto de carga sigue dependiendo de la corriente real del cargador
- por eso `estimated_full_charge_hours` puede quedar en null hasta que se conozca el amperaje de carga o se mida en hardware

### 3.1) Suposiciones de carga
Para estimar la duracion de carga mientras no tengamos la corriente real del TP4056 medida en hardware, se agrego una tabla de escenarios:
- migration: `supabase/migrations/20260331163000_add_device_battery_charge_assumptions.sql`
- tabla: `public.device_battery_charge_assumptions`

Esta tabla guarda escenarios por device y por combinacion bateria/cargador:
- `battery_component_code`
- `charger_component_code`
- `battery_capacity_mah`
- `battery_nominal_voltage_v`
- `charge_current_ma`
- `efficiency_factor`
- `estimated_full_charge_hours`

Para `KPCL0034` se cargaron tres supuestos iniciales con `BATT_LIPO_602025` + `CHG_TP4056_TYPEC`:
- `100 mA`
- `250 mA`
- `500 mA`

La formula usada es:
`estimated_full_charge_hours = (battery_capacity_mah / charge_current_ma) * efficiency_factor`

Esto no reemplaza una medicion real, pero nos da una base de trabajo mientras el hardware no reporte energia.

### 4) Automatizacion
Se creo el trigger automatico:
- migration: `supabase/migrations/20260331154000_add_device_battery_cycle_trigger.sql`
- funcion: `public.sync_device_battery_cycle()`
- trigger: `trg_sync_device_battery_cycle` sobre `public.readings`

Este trigger observa nuevas lecturas y actualiza `public.device_battery_cycles` cuando detecta:
- `battery_state = 'charging'`
- `battery_source = 'external_power'`
- transicion a uso con bateria
- retorno a energia externa

### 5) Sesiones de energia ON/OFF por actividad
Como hoy no tenemos telemetria de bateria real, se agrego una tabla mas util para la operacion diaria:
- migration: `supabase/migrations/20260331155000_add_device_power_sessions.sql`
- tabla: `public.device_power_sessions`

Esta tabla si se puede automatizar con los recursos actuales:
- abre una sesion `on` cuando llegan lecturas
- mantiene `last_seen_at` mientras el device sigue emitiendo datos
- cierra la sesion como `off` cuando pasa demasiado tiempo sin lecturas
- permite reconstruir sesiones historicas desde `readings`

La funcion de cierre manual o por job es:
- `public.close_stale_device_power_sessions(p_gap_minutes integer default 5)`

La funcion de reconstruccion historica es:
- `public.rebuild_device_power_sessions(p_device_code text default null, p_gap_minutes integer default 5)`

---

## Como interpreta Kittypau los estados de energia

### Enchufado o cargando
Se considera que el dispositivo esta en energia externa cuando:
- `battery_state = 'charging'`
- o `battery_source = 'external_power'`

### Carga completa
Se marca cuando:
- `battery_level = 100`

### Uso solo con bateria
Se considera uso con bateria cuando:
- no esta en `charging`
- no esta en `external_power`
- y la lectura aun representa actividad del dispositivo

### Device prendido / apagado
Con los recursos actuales, esto se puede inferir por actividad:
- `on`: llegan lecturas dentro del umbral esperado
- `off`: no llegan lecturas durante varios minutos

Esto se guarda en `public.device_power_sessions`.

### Duracion de bateria
La duracion que interesa para analisis es:
- desde `full_charge_at`
- hasta `battery_only_end_at`

Si todavia no existe telemetria de bateria en las lecturas, no se puede calcular ese ciclo con precision historica.

### Relacion con BOM
La tabla `public.device_battery_cycles` ahora tambien guarda la referencia al hardware de energia:
- bateria primaria
- cargador
- capacidad nominal
- voltaje nominal
- contexto BOM en JSONB

Esto permite que el historial de energia y el costo de componentes queden coordinados en el mismo modelo.

---

## Caso real de KPCL0034

### Identidad del device
- `device_code`: `KPCL0034`
- `device_uuid`: `9510a455-b0e9-4932-8be1-03976d31228a`
- `device_type`: `comedero`
- `status`: `active`
- `device_state`: `offline`

### Lecturas observadas
En el analisis realizado sobre `KPCL0034` se observaron:
- lecturas de peso, temperatura, humedad y luz
- `battery_level` sin datos historicos en esas lecturas

Conclusion:
- para el historial previo, el sistema puede guardar intervalo de funcionamiento observado
- para ciclos reales de bateria, hace falta que el bridge o la ingesta empiece a reportar `battery_state`, `battery_source` o `battery_voltage`
- para ON/OFF por actividad, ya se puede reconstruir desde `readings`

---

## Flujo recomendado de ingesta

### Si llega una lectura nueva
1. Se guarda en `public.readings`.
2. Si hay metadata de bateria:
   - se actualiza `battery_state`
   - se actualiza `battery_source`
   - se actualiza `battery_voltage`
3. El trigger automatico revisa si:
   - arranca carga
   - se completa carga
   - el device pasa a bateria
   - se cierra el ciclo y se abre uno nuevo

### Reglas simples de negocio
- `charging` / `external_power` abre o mantiene un ciclo de carga
- `battery_level = 100` marca carga completa
- transicion a bateria cierra la fase enchufada y abre la fase `battery_only`

---

## Consultas utiles

### Ver ciclos guardados
```sql
select
  device_code,
  device_label,
  cycle_status,
  cycle_start_at,
  charging_start_at,
  full_charge_at,
  unplugged_at,
  battery_only_start_at,
  battery_only_end_at,
  cycle_end_at,
  battery_level_at_start,
  battery_level_at_full_charge,
  battery_level_at_end,
  charging_duration_seconds,
  battery_only_duration_seconds,
  total_duration_seconds,
  readings_count,
  charging_samples,
  battery_only_samples,
  notes,
  created_at,
  updated_at
from public.device_battery_cycles
where device_code = 'KPCL0034'
order by cycle_start_at desc;
```

### Ver ultimas lecturas con datos de bateria
```sql
select
  d.device_id,
  r.recorded_at,
  r.ingested_at,
  r.clock_invalid,
  r.battery_level,
  r.battery_voltage,
  r.battery_state,
  r.battery_source
from public.readings r
join public.devices d
  on d.id = r.device_id
where d.device_id = 'KPCL0034'
order by r.recorded_at desc
limit 50;
```

---

## Recomendacion operativa

Para que el sistema empiece a medir duracion real desde 100%:
- el bridge debe reportar estados de energia de forma consistente
- idealmente cada lectura deberia incluir:
  - `battery_state`
  - `battery_source`
  - `battery_voltage`
  - y cuando se pueda `battery_level`

Sin esos campos, Kittypau solo puede guardar el periodo de funcionamiento observado, pero no la duracion exacta de la bateria desde carga completa.

### Contrato de firmware / ingesta
El bridge ya quedo preparado para almacenar estos campos si el firmware los manda.

El payload ideal de `SENSORS` o `STATUS` deberia incluir:
```json
{
  "battery_level": 87,
  "battery_voltage": 3.98,
  "battery_state": "charging",
  "battery_source": "external_power",
  "battery_is_estimated": true,
  "battery_updated_at": "2026-03-31T21:30:00Z"
}
```

Si el hardware no puede medir la bateria, el firmware puede omitir esos campos y el sistema seguira funcionando con:
- `device_power_sessions` para actividad `on/off`
- `device_battery_cycles` para ciclos reales cuando existan lecturas de energia
- `device_battery_charge_assumptions` para escenarios estimados de carga

---

## Resultado esperado

Con este modelo, Kittypau podra responder:
- cuando se enchufa un device
- cuando termina la carga
- cuanto dura funcionando sin energia externa
- cuantos ciclos de bateria lleva cada device
- comparacion entre `KPCL0034` y los devices futuros
- cuando estuvo prendido o apagado por actividad

### Nota importante
Hoy no podemos detectar con precision automatica:
- el fin real de la carga
- el momento exacto en que una bateria queda al 100%

Eso requiere telemetria de bateria en `readings`. Mientras tanto, lo correcto es usar:
- `device_power_sessions` para `on/off`
- `device_operation_records` para intervalos observados
- `device_battery_cycles` para ciclos de energia y contexto de bateria/BOM
- `device_battery_charge_assumptions` para escenarios estimados de carga
