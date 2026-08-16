# Semilla Inicia 2026 - Borrador prellenado (base 2025)

Fuentes principales 2025:
- `Resumen_Ejecutivo_CORFO.md`
- `CORFO_CORFO_SEMILLA_INICIA_2026_2025_Draft.md`

## 1) Titulo
Kittypau: monitoreo inteligente y predictivo de salud para mascotas con IoT e IA.

## 2) Problema
Existe una brecha en monitoreo proactivo de salud animal. Los duenos suelen detectar tarde variaciones de hidratacin y alimentacin, lo que eleva riesgos y costos.

## 3) Solucion propuesta
Kittypau combina dispositivo IoT y plataforma de datos para medir habitos clave, analizar desvíos y entregar alertas tempranas.
La propuesta evoluciona a modelos predictivos para anticipar riesgos de salud.

## 4) Innovacion y diferenciacion
- Integracion de hardware + software + analitica en un ecosistema unico.
- Enfoque preventivo/predictivo, no solo automatizacion.
- Uso de datos historicos para soporte de decisiones de cuidado.

## 5) Mercado y escalabilidad
- Mercado pet-tech en crecimiento con alta disposicion de gasto en bienestar animal.
- Segmento inicial: duenos urbanos y digitalizados.
- Escalabilidad: modelo HaaS replicable en Chile y LATAM.

## 6) Modelo de negocio
- Venta inicial de hardware.
- Suscripcion premium para funciones avanzadas.
- Estrategia de conversin mediante periodo de prueba premium.

## 7) Validacion y traccin (base 2025)
- Prototipo funcional con captura de datos de consumo/entorno.
- Interes de usuarios para pilotos.
- Base de colaboracion con actor veterinario para vlidacion.

## 8) Plan de trabajo resumido
- Fase 1: optimizacion tecnica del prototipo.
- Fase 2: piloto y recoleccion de datos.
- Fase 3: anlisis de datos y refinamiento de modelos.

## 9) Impacto
- Mejor cuidado preventivo y bienestar animal.
- Menor cuidado reactivo y mejor soporte de informacion para duenos.
- Potencial de desarrollo de tecnologa pet-tech exportable.

## Ajustes obligatorios para 2026 antes de enviar
- Confirmar criterios y ponderaciones de evaluacion 2026.
- Ajustar todo monto y categoria del presupuesto a bases vigentes.
- Sustituir toda afirmacion de traccin por evidencia documentada actual.

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



