# 03 - Base Tecnica y Evidencia 2026

## Arquitectura base
Flujo operativo definido:
Dispositivo -> MQTT -> Bridge -> API -> Supabase -> App.

## Transformaciones analíticas (log10 + Fourier) - base técnica de IA
- Ingestión: aplicar `log10(x + 1)` post-validación y pre-persistencia para variables skewed (raw + log).
- Analítica/ML: Fourier/FFT en worker/batch sobre series temporales por mascota para rutinas/cambios de patrón y scoring de anomalías.

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

## Estado tecnico util para postulacion
1. API y contratos principales documentados.
2. SQL y reglas de integridad versionadas.
3. Bridge y healthcheck documentados.
4. Admin dashboard con avance operativo.

## Evidencia para anexar
- Diagrama arquitectura (fuente: `Docs/ARQUITECTURA_PROYECTO.md`).
- Estado implementacion con hitos (fuente: `Docs/ESTADO_AVANCE.md`).
- Contratos API y ejemplos (fuente: `Docs/FRONT_BACK_APIS.md`).
- Evidencia SQL/DB (fuente: `Docs/SQL_SCHEMA.sql`, `Docs/SQL_ASSERTS.md`).

## Mensaje tecnico para evaluadores
Existe base implementada y verificable para convertir el proyecto en despliegue comercial controlado.

## Marco AIoT / PetTech (Alineacion 2026)

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

### Estrategia tipo "Fitbit de mascotas"
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
