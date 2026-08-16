# 04 - Modelo de Negocio y Finanzas 2026

## Modelo recomendado
Camino A: hardware + suscripcion.

## KPIs eje
- margen unitario
- MRR
- churn
- CAC
- LTV
- LTV/CAC
- break-even

## Formulas operativas base
- `MRR = usuarios_premium * precio_mensual`
- `LTV = ARPU * (1/churn)`
- `LTV/CAC = LTV/CAC`
- `costo_unitario_kit = BOM + manufactura + overhead_unitario`

## Estructura de costos
1. Costo unitario (BOM + manufactura).
2. Cloud mensual (Supabase, Vercel, HiveMQ).
3. Operacion (logistica, soporte, garantias).

## Evidencia financiera interna
- `Docs/ANALISIS_ECONOMICO_KITTYPAU.md`
- `Docs/KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md`
- `Docs/KPCL_CATALOGO_COMPONENTES_Y_COSTOS.md`

## Regla para postulacion 2026
Toda cifra declarada en formulario debe tener fuente interna y supuesto explcito.

## Marco AIoT / PetTech (Alneacion 2026)

### Terminologia oficial recomendada
- **AIoT (Artificial Intelligence of Things)**: termino principal para Kittypau.
- **Intelligent IoT**: variante de comunicacion comercial.
- **Edge AI + IoT**: cuando parte del anlisis corre en dispositivo.
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
- Riesgo de deshidratacin por baja de consumo de agua en ventana corta.
- Cambios de conducta alimentaria (horario/frecuencia/cantidad).
- Riesgo de sobrepeso por patrnes de ingesta sostenidos.

### Modelo de negocio recomendado (3 capas)
1. **Hardware**: ingreso inicial por unidad.
2. **Suscripcion**: dashboard avanzado, recomendaciones y alertas.
3. **Data insights (futuro)**: datos anonimizados para partners (veterinarias, investigacion, marcas).
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentacin e hidratacin de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segnda vertical, retilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analitica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rpida de estado real (alimentacin, hidratacin, ambiente, batera).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansin de vertical (plantas/senior) debe montarse sobre componentes retilizables del core.


