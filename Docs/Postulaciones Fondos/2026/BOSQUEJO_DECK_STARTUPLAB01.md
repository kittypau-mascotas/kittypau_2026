# Bosquejo Deck - Postulacion startuplab.01 (Kittypau)

Objetivo: preparar un deck corto, consistente con formulario y evidencia del repo.
Formato recomendado: 10-12 slides (PDF).

## Slide 1 - Portada
- Kittypau
- One-liner: Monitoreo predictivo IoT para bienestar de mascotas.
- Nombre del equipo y contacto.

## Slide 2 - Problema
- Falta de visibilidad continua de hidratacion/alimentacion.
- Deteccion tardia de problemas de salud.
- Cuidado reactivo, mayor costo y menor calidad de vida.

## Slide 3 - Solucion
- Ecosistema: dispositivo IoT + backend + app.
- Flujo: sensor -> MQTT -> bridge -> API -> DB -> app.
- Alertas tempranas + historial objetivo.

## Slide 4 - Tecnologia y TRL
- Estado actual: TRL 5.
- Validacion interna de prototipo funcional.
- Base para evolucion predictiva con analitica/ML.

## Slide 5 - Mercado objetivo
- ICP B2C: duenos urbanos digitalizados.
- Segmento B2B2C: clinicas veterinarias y comercios pet.
- Oportunidad inicial en Chile, expansion LATAM.

## Slide 6 - Modelo de negocio
- Hardware + suscripcion (HaaS).
- Ingreso por venta inicial + ingreso recurrente premium.
- KPIs foco: activacion, retencion, conversion y churn.

## Slide 7 - Competencia y diferenciacion
- Directos: pet-tech de monitoreo basico.
- Indirectos: dispensadores y apps manuales.
- Diferenciador: capa de datos accionables y enfoque preventivo/predictivo.

## Slide 8 - Validacion y traccion
- Prototipo operativo documentado.
- Interes de pilotos tempranos (cartas/compromisos).
- Evidencia de arquitectura y estado tecnico en docs del repo.

## Slide 9 - Impacto climatico (alineacion postulacion)
- Mitigacion: reduccion de desperdicio de agua/alimento.
- Monitoreo: medicion trazable de uso de recursos.
- Adaptacion y resiliencia: alertas ante condiciones ambientales de riesgo.

## Slide 10 - Roadmap 12 meses
- Hito tecnico (mes 1-4): estabilizacion piloto.
- Hito tecnico-comercial (mes 5-9): ejecucion de pilotos y metricas.
- Hito comercial (mes 10-12): lanzamiento inicial y readiness inversion.

## Slide 11 - Equipo
- Mauricio Carcamo: liderazgo negocio/producto.
- Javier Dayne: desarrollo tecnico IoT/software.
- Brechas: regulacion hardware y escalamiento comercial B2B.

## Slide 12 - Lo que buscamos en startuplab.01
- Validacion tecnica y prototipos.
- Conexion con clientes e inversionistas.
- Soporte para estrategia comercial y escalamiento.

---

## Checklist de consistencia antes de exportar PDF
1. Mismos datos que el formulario (sin contradicciones).
2. Limpiar placeholders: RUT, telefono, cap table, finanzas reales.
3. Incluir solo claims con respaldo documental.
4. Revisar ortografia y diseno visual legible.
5. Nombre final sugerido: `Deck_Kittypau_startuplab01_2026.pdf`.

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
