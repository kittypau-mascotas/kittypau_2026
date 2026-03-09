# Start-Up Chile 2026 - Borrador prellenado (base 2025)

Fuente principal 2025:
- `01_Descripcion_Producto_Servicio.md`
- `02_Analisis_Competencia.md`
- `preguntas_formulario_postulacion.md`

## 1) One-liner (7 palabras)
Monitoreo predictivo IoT para bienestar de mascotas.

## 2) Public description
KittyPaw monitorea alimentacion e hidratacion de mascotas con IoT e IA para detectar desviaciones tempranas y apoyar decisiones preventivas de cuidado.

## 3) Problema
Los duenos de mascotas no tienen visibilidad continua de habitos criticos (agua/alimento) y suelen detectar problemas de salud tarde.
Esto genera cuidado reactivo, mayores costos veterinarios y menor calidad de vida en mascotas.

## 4) Solucion
KittyPaw integra hardware IoT (plato/bebedero inteligente), backend de datos y app para monitoreo continuo.
El sistema detecta cambios en patrones, notifica en tiempo real y construye historial objetivo para duenos y veterinarios.
A mediano plazo, incorpora modelos predictivos de riesgo.

## 5) Diferenciacion
- No solo automatiza alimentacion: prioriza monitoreo de salud basado en datos.
- Integra variables de consumo y entorno en una sola capa analitica.
- Propone modelo HaaS: hardware + suscripcion premium.

## 6) Mercado objetivo
- Duenos de mascotas urbanos y digitalizados (segmento early adopter).
- Clinicas veterinarias y actores pet-tech para alianzas.
- Entrada por Chile y escalamiento regional LATAM.

## 7) Actividades durante el programa (base 2025)
1. Validacion intensiva de MVP con pilotos controlados.
2. Mejora de funcionalidades clave (alertas, dashboard, experiencia de uso).
3. Alianzas con clinicas veterinarias para validacion y canal comercial.
4. Implementacion de estrategia de adquisicion B2C.
5. Avance en proteccion de propiedad intelectual.

## 8) Resultado esperado al cierre del programa
- MVP validado con metrica de uso y retencion.
- Evidencia de product-market fit en segmento inicial.
- Estrategia comercial y financiera lista para siguiente ronda.

## 9) Cofinanciamiento (base narrativa 2025)
- Aporte pecuniario de fundadores para gastos operativos directos.
- Aporte no pecuniario mediante dedicacion del equipo fundador.

## 10) Equipo
Equipo fundador con capacidades complementarias en tecnologia, datos, producto y ejecucion.

## Ajustes obligatorios para 2026 antes de enviar
- Reescribir cada bloque segun limite exacto de caracteres del formulario 2026.
- Reemplazar todo dato personal/legal con version vigente 2026.
- Validar consistencia con anexos y video final.

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
