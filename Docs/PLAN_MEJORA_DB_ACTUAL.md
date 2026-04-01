# Plan de mejora de base actual (Supabase)

## Objetivo
Mejorar la base actual sin romper el frontend ni el bridge. Se mantiene:
- readings como tabla de app.
- sensor_readings como tabla de telemetria cruda.
- devices.device_id (KPCL texto) y devices.id (UUID).

## Alcance
- Alinear columnas entre sensor_readings y readings.
- Robustecer el pipeline de ingestion.
- Mejorar indices y vistas de lectura.
- Agregar queries de verificacion de integridad.

## No se hace (por ahora)
- Cambios de arquitectura IoT (particiones o time-series).
- Eliminacion de tablas actuales.
- Cambios de nombres que rompan el frontend.

---

## Fase 0 â€” Seguridad antes de cambios
1. Backup o export de esquema.
2. Verificar conteos basicos:
   - select count(*) from devices;
   - select count(*) from sensor_readings;
   - select count(*) from readings;

---

## Fase 1 â€” Alinear esquema de readings con sensor_readings
Asegurar que readings tenga todos los campos que existen en sensor_readings:

```sql
alter table public.readings
  add column if not exists light_lux real,
  add column if not exists light_percent integer,
  add column if not exists light_condition text,
  add column if not exists device_timestamp text;
```

Indices recomendados (sin romper front):

```sql
create index if not exists idx_readings_device_time
  on public.readings (device_id, recorded_at desc);

create index if not exists idx_readings_pet_time
  on public.readings (pet_id, recorded_at desc);

create index if not exists idx_readings_ingested
  on public.readings (ingested_at desc);
```

---

## Fase 2 â€” Pipeline robusto (sensor_readings -> readings)
Objetivo: copiar datos crudos a readings para que la app lea una sola tabla.

Reglas:
- sensor_readings.device_id (KPCL texto) se mapea a devices.device_id.
- readings.device_id usa devices.id (UUID).
- pet_id se obtiene desde devices.pet_id.
- ingested_at = now().
- clock_invalid = true si device_timestamp no parsea.

Pseudo-SQL (a implementar en SQL Editor):

```sql
create or replace function public.sync_sensor_reading_to_readings()
returns trigger as $$
declare
  v_device_uuid uuid;
  v_pet_id uuid;
  v_clock_invalid boolean := false;
  v_ts timestamptz;
begin
  select id, pet_id into v_device_uuid, v_pet_id
  from public.devices
  where device_id = new.device_id;

  if v_device_uuid is null then
    return null; -- device desconocido, no insertar
  end if;

  begin
    v_ts := new.recorded_at;
  exception when others then
    v_ts := now();
    v_clock_invalid := true;
  end;

  insert into public.readings(
    id, device_id, pet_id, weight_grams, water_ml, temperature, humidity,
    battery_level, recorded_at, flow_rate, ingested_at, clock_invalid,
    light_lux, light_percent, light_condition, device_timestamp
  ) values (
    gen_random_uuid(), v_device_uuid, v_pet_id,
    new.weight_grams, new.water_ml, new.temperature, new.humidity,
    new.battery_level, v_ts, null, now(), v_clock_invalid,
    new.light_lux, new.light_percent, new.light_condition, new.device_timestamp
  );

  return null;
end;
$$ language plpgsql;

create trigger trg_sync_sensor_reading
  after insert on public.sensor_readings
  for each row execute function public.sync_sensor_reading_to_readings();
```

---

## Fase 3 â€” Backfill controlado (sin duplicar)
Si ya existe data en sensor_readings, copiar a readings solo si no existe:

```sql
insert into public.readings(
  id, device_id, pet_id, weight_grams, water_ml, temperature, humidity,
  battery_level, recorded_at, flow_rate, ingested_at, clock_invalid,
  light_lux, light_percent, light_condition, device_timestamp
)
select
  gen_random_uuid(), d.id, d.pet_id,
  sr.weight_grams, sr.water_ml, sr.temperature, sr.humidity,
  sr.battery_level, sr.recorded_at, null, sr.recorded_at, false,
  sr.light_lux, sr.light_percent, sr.light_condition, sr.device_timestamp
from public.sensor_readings sr
join public.devices d on d.device_id = sr.device_id
where not exists (
  select 1 from public.readings r
  where r.device_id = d.id and r.recorded_at = sr.recorded_at
);
```

---

## Fase 4 â€” Vistas para lectura rapida
Si la app usa latest_readings o device_summary, incluir nuevos campos:

```sql
create or replace view public.latest_readings as
select distinct on (device_id)
  device_id, pet_id, weight_grams, water_ml, temperature, humidity,
  battery_level, recorded_at, flow_rate, ingested_at, clock_invalid,
  light_lux, light_percent, light_condition, device_timestamp
from public.readings
order by device_id, recorded_at desc;
```

---

## Fase 5 â€” Validaciones de integridad (reporte)

```sql
-- readings sin device
select r.id, r.device_id
from public.readings r
left join public.devices d on d.id = r.device_id
where d.id is null;

-- sensor_readings sin device (KPCL)
select sr.id, sr.device_id
from public.sensor_readings sr
left join public.devices d on d.device_id = sr.device_id
where d.device_id is null;

-- devices sin pet
select d.id, d.device_id
from public.devices d
left join public.pets p on p.id = d.pet_id
where d.pet_id is not null and p.id is null;
```

---

## Impacto esperado
- Frontend sigue leyendo readings.
- Bridge sigue escribiendo sensor_readings.
- Se habilita visibilidad completa (luz y timestamp) en UI sin romper.

## Checklist de ejecucion
1. Fase 1 (schema + indices).
2. Fase 2 (trigger pipeline).
3. Fase 3 (backfill).
4. Fase 4 (vistas).
5. Fase 5 (integridad).

---

## Requisito funcional: ver data real por usuario
- Verificar que cada usuario solo vea su mascota y sus dispositivos.
- Validar vinculos: profiles.id -> pets.user_id -> devices.pet_id -> readings.device_id.
- Query de verificacion (ejemplo):

`sql
select p.user_id, p.id as pet_id, d.id as device_uuid, d.device_id as device_kpcl, r.id as reading_id
from public.pets p
join public.devices d on d.pet_id = p.id
left join public.readings r on r.device_id = d.id
where p.user_id = auth.uid();
`\n

---

## Marco estrategico AIoT para Kittypau (integrado)

### Terminologia oficial recomendada
- **AIoT (Artificial Intelligence of Things)**: termino principal para Kittypau.
- **Intelligent IoT**: variante de comunicacion comercial.
- **Edge AI + IoT**: cuando parte del analisis corre en dispositivo.
- **Smart IoT**: termino marketing, menos tecnico.

### Definicion recomendada de producto
**Kittypau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

### Categoria estrategica
**PetTech AIoT** = PetTech + IoT + IA.

Esto posiciona a Kittypau no como "solo hardware", sino como:
- infraestructura de datos longitudinales de salud animal,
- analitica preventiva,
- plataforma escalable con suscripcion.

### Arquitectura actual (ya compatible con AIoT)
1. Dispositivo IoT (ESP8266/ESP32).
2. Ingestion por MQTT.
3. Bridge Node.js.
4. Persistencia en PostgreSQL/Supabase.
5. Capa de analitica/IA.
6. Dashboard web para usuario/admin.

### Estrategia tipo “Fitbit de mascotas”
- Hardware = punto de entrada.
- Datos longitudinales = ventaja competitiva.
- IA = diferencial de valor.
- Suscripcion = recurrencia (modelo SaaS).

### Casos de uso preventivos (objetivo)
- Riesgo de deshidratacion por baja de consumo de agua en ventana corta.
- Cambios de conducta alimentaria (horario/frecuencia/cantidad).
- Riesgo de sobrepeso por patrones de ingesta sostenidos.

### Modelo de negocio recomendado (3 capas)
1. **Hardware**: ingreso inicial por unidad.
2. **Suscripcion**: dashboard avanzado, recomendaciones y alertas.
3. **Data insights (futuro)**: datos anonimizados para partners (veterinarias, investigacion, marcas).

### Implicancias directas para este plan DB
- Priorizar calidad, continuidad e historial de datos (`readings` + agregados).
- Mantener trazabilidad temporal para modelos de IA (datos longitudinales).
- Diseñar retencion por capas: crudo corto plazo + consolidado largo plazo.
- Asegurar compatibilidad API para no frenar adopcion del producto AIoT.

## Contexto de expansion del ecosistema
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentacion e hidratacion de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segunda vertical, reutilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analitica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rapida de estado real (alimentacion, hidratacion, ambiente, bateria).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansion de vertical (plantas/senior) debe montarse sobre componentes reutilizables del core.
