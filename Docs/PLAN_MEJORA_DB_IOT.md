# Plan de Mejora DB (Supabase) sin romper front

## Objetivo
Mejorar rendimiento y estabilidad de telemetria manteniendo el esquema actual y compatibilidad con el frontend.

## Principios
- No romper endpoints existentes.
- Mantener `readings` como tabla de app.
- Ingesta sigue entrando por `sensor_readings`.
- Optimizar consultas con indices y vistas/materializaciones seguras.

## Diagnostico (hoy)
- `sensor_readings` es telemetria cruda (device_id KPCL, append-only).
- `readings` es la tabla que consume la app (device_id UUID, con ingested_at/clock_invalid).
- Ya existe pipeline de sync: `sensor_readings` -> `readings` (via trigger).

## Plan propuesto (incremental y seguro)

### Fase 1: Consolidar pipeline actual
1. Asegurar que `readings` tenga todos los campos necesarios (light_lux, light_percent, light_condition, device_timestamp).
2. Mantener trigger `trg_sync_sensor_reading` (no tocar el bridge).
3. Backfill historico idempotente cuando sea necesario.
4. Agregar indices de lectura:
   - `readings (device_id, recorded_at desc)`
   - `sensor_readings (device_id, recorded_at desc)`

### Fase 2: Capa de lectura rapida (sin romper API)
1. Crear vista o tabla agregada (1min o 5min) y usarla solo en la UI donde se requiera (opcional).
2. Mantener endpoints actuales y agregar nuevos endpoints agregados.

### Fase 3: Retencion y limpieza
1. Retencion en `sensor_readings` (p.ej. 30-90 dias) con job semanal.
2. Mantener `readings` como tabla reducida para UI (solo ultimos N dias si aplica).

## Cambios SQL sugeridos (fase 1)
- Agregar columnas faltantes en `readings`.
- Indices recomendados.
- Verificacion de integridad.

## Riesgos
- Cualquier cambio en columnas debe ser compatible con el frontend.
- No tocar FK ni nombres de columnas usadas por el front.

## Checklist de verificacion
- Insert en `sensor_readings` crea row en `readings`.
- Queries en `/api/readings` siguen funcionando.
- UI carga lecturas en /today y /story.

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
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
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
