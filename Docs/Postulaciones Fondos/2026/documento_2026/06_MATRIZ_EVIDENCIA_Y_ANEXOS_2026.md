# 06 - Matriz de Evidencia y Anexos 2026

## Matriz de trazabilidad
| Claim en postulacion | Evidencia interna | Ruta | Estado |
| --- | --- | --- | --- |
| Arquitectura IoT operativa | Diagrama y flujo | Docs/ARQUITECTURA_PROYECTO.md | listo |
| Backend y contratos API | Especificaciones endpoint | Docs/FRONT_BACK_APIS.md | listo |
| Estado de avance implementacion | Registro de hitos | Docs/ESTADO_AVANCE.md | listo |
| Modelo financiero y KPIs | Formula y supuestos | Docs/ANALISIS_ECONOMICO_KITTYPAU.md | listo |
| Estrategia de negocio | Caminos A/B/C y KPI | Docs/KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md | listo |
| Experiencia de postulacion previa | Checklists y borradores 2025 | Docs/kittypau_1a_docs_legacy/.../04_Postulaciones_y_Fondos | listo |

## Anexos minimos por preparar
1. Carpeta legal actualizada 2026.
2. Carpeta tecnica (arquitectura, API, SQL, evidencia funcional).
3. Carpeta financiera (presupuesto y supuestos).
4. Carpeta comercial (mercado, competencia, GTM).
5. Carpeta equipo (CVs, roles, dedicacion).

## Regla de calidad
Cada claim relevante debe tener respaldo en una ruta concreta del repo o anexo formal.

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


