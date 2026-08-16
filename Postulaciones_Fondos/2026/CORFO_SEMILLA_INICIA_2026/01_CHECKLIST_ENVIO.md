# Semilla Inicia 2026 - Checklist operativo (basado en 2025)

## Referencias 2025 directas
- `.../01_CORFO_CORFO_SEMILLA_INICIA_2026/Resumen_Ejecutivo_CORFO.md`
- `.../01_CORFO_CORFO_SEMILLA_INICIA_2026/3_Formularios/CORFO_CORFO_SEMILLA_INICIA_2026_2025_Draft.md`
- `.../00_Estrategia_y_Material_General/ROADMAP_POSTULACION_FONDOS.md`

## 1) Elegibilidad y bases
- [ ] Descargar bases oficiales 2026.
- [x] Base narrativa 2025 lista (problema, solucion, mercado, impacto).
- [ ] Ajustar a requisitos 2026 (beneficiario, antiguedad, incompatibilidades, foco regional).

## 2) Proyecto tecnico-comercial
- [x] Secciones prellenadas desde 2025 en borrador 2026.
- [ ] Actualizar TRL actual y objetivo real 2026.
- [ ] Validar hitos del plan de trabajo con tiempos y responsables actuales.

## 3) Presupuesto y cofinanciamiento
- [x] Estructura heredada de 2025 disponible.
- [ ] Ajustar montos a topes 2026 y categorias financiables oficiales.
- [ ] Adjuntar cotizaciones vigentes.

## 4) Anexos y cierre
- [ ] Consolidar anexos legales actualizados.
- [ ] Consolidar anexos tecnicos y evidencia de vlidacion.
- [ ] Revision final por criterio de evaluacion Corfo.

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



