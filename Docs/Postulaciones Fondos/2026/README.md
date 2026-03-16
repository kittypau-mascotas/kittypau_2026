# Postulaciones 2026 - Kittypau

Esta carpeta contiene borradores 2026 basados en documentos reales de 2025.
No son plantillas vacias: incluyen texto reutilizable, estructura de respuesta y fuentes de referencia.

## Estructura
- `start_up_chile/`: base para postulacion Start-Up Chile 2026.
- `semilla_inicia/`: base para postulacion Corfo Semilla Inicia 2026.

## Referencias 2025 usadas
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/03_Start_Up_Chile_Build_2025/Checklist_Postulacion_Build.md`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/03_Start_Up_Chile_Build_2025/preguntas_formulario_postulacion.md`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/03_Start_Up_Chile_Build_2025/01_Descripcion_Producto_Servicio.md`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/03_Start_Up_Chile_Build_2025/02_Analisis_Competencia.md`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/01_CORFO_Semilla_Inicia/Resumen_Ejecutivo_CORFO.md`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/01_CORFO_Semilla_Inicia/3_Formularios/CORFO_Semilla_Inicia_2025_Draft.md`

## Regla de trabajo 2026
1. Mantener relato base 2025.
2. Ajustar solo lo que cambie por bases 2026 (montos, limites de caracteres, fechas, anexos obligatorios).
3. Registrar cada ajuste en el checklist del fondo.


## Paquete completo documento_2026
- `documento_2026/README.md` (indice)
- `documento_2026/00_DOCUMENTO_MAESTRO_2026.md` (fuente principal)


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
