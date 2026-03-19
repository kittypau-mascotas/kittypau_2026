# Formulario startuplab.01 - Respuestas sugeridas (KittyPaw)

Fecha de preparacion: 2026-03-06  
Estado: borrador listo para completar y copiar al formulario

## 1) Datos postulante

- Nombre Completo Postulante: **Mauricio Cristian Carcamo Diaz**
- RUT Postulante (Persona Natural): **[COMPLETAR]**
- Correo electronico postulante: **mauro.carcamo89@gmail.com**
- Telefono postulante (+codigo pais): **[COMPLETAR]**

## 2) Informacion basica de la startup

- Nombre de la startup: **KittyPaw**
- Pais de origen de la startup: **Chile**
- Estado legal de tu startup: **Constituida**
- Tipo de Empresa: **SpA (Sociedad por Acciones)**
- Sitio web de la startup: **https://kittypau-app.vercel.app**
- LinkedIn de la startup: **[COMPLETAR / no disponible al 2026-03-06]**

## 3) Clasificacion tecnologica

### Descripcion de la Tecnologia y del Problema (max 200 palabras)
Los duenos de mascotas no tienen visibilidad continua sobre habitos criticos de hidratacion y alimentacion, por lo que la deteccion de problemas de salud suele ocurrir tarde. KittyPaw aborda ese problema con un ecosistema IoT + software: plato/bebedero inteligente con sensores de peso y variables de entorno, conectividad MQTT, backend cloud y app para seguimiento en tiempo real. La solucion transforma datos de consumo y contexto en alertas tempranas y trazabilidad historica para duenos y veterinarios. Los principios tecnicos se basan en sensorizacion, transmision de telemetria, procesamiento de series temporales e interpretacion con modelos de analitica incremental (base para ML predictivo). Este es el momento adecuado porque convergen tres factores: alta digitalizacion del cuidado de mascotas, madurez cloud/IoT de bajo costo, y validacion interna de un prototipo funcional con arquitectura operativa documentada y lista para pilotos controlados.

- Nivel de Madurez Tecnologia (TRL): **TRL 5 - Tecnologia validada en un entorno relevante**

### Justificacion del TRL seleccionado (seleccionar)
- [x] Se ha formulado la idea del producto.
- [x] Se ha descrito completamente la idea del producto.
- [x] Se ha demostrado y descrito completamente el concepto del producto.
- [x] Se preve probar y validar las principales caracteristicas del producto mediante procedimientos especificos.
- [x] Las principales caracteristicas del producto han sido probadas y validadas en un laboratorio o entorno simulado.
- [x] El prototipo del producto ha sido probado y validado en el entorno pertinente.
- [ ] El producto ha sido probado y validado en su entorno natural.
- [ ] El producto ha sido ampliamente probado y validado.
- [ ] El producto esta completamente maduro y listo para su uso en el mercado.

- Sector de Contribucion Climática (principal): **Urbanizacion**
- Area de accion principal: **Monitoreo (medicion y rastreo)**

## 4) Equipo fundador

- Remitente: **Tu mismo**
- Numero total de cofundadores (>=10%): **2**
- Numero de fundadores con PhD o experiencia equivalente en investigacion: **0**
- Numero de fundadores con experiencia comercial/emprendimiento: **1**
- Numero de mujeres en posiciones de liderazgo: **0**

## 5) Mercado objetivo

### Perfil del cliente ideal (max 150 palabras)
Duenos de mascotas urbanos (gatos y perros pequenos/medianos), digitalmente activos, con ingresos medios a medios-altos, que valoran el bienestar preventivo y estan dispuestos a pagar por soluciones que reduzcan incertidumbre y mejoren el cuidado diario. Priorizamos hogares en zonas metropolitanas con alta adopcion de apps moviles y ecommerce. Como segundo segmento, clinicas veterinarias y comercios pet que pueden usar KittyPaw como herramienta de fidelizacion y monitoreo complementario. El cliente ideal busca datos concretos (no percepcion subjetiva), alertas accionables y facilidad de uso.

- Han validado el problema con potenciales clientes: **Cartas de intencion o compromisos no vinculantes**

### Por que ahora es el momento correcto (max 150 palabras)
La oportunidad es favorable porque el cuidado de mascotas se esta digitalizando rapidamente y los usuarios esperan soluciones de salud preventiva, no solo productos de conveniencia. Al mismo tiempo, la infraestructura IoT/cloud hoy permite desplegar telemetria y analitica con costos iniciales accesibles para startups. KittyPaw ya cuenta con prototipo funcional, arquitectura operativa y documentacion tecnica/comercial que reduce riesgo de ejecucion. Esto permite pasar desde validacion interna a piloto controlado con foco en evidencia de uso, retencion y valor clinico-operativo.

### Principal ventaja tecnica diferenciadora (max 150 palabras)
KittyPaw no se limita a automatizar dispensacion: integra hardware IoT, trazabilidad historica y capa analitica para detectar desvíos de hidratacion/alimentacion con contexto ambiental. Esa integracion extremo a extremo (sensor -> MQTT -> bridge -> API -> DB -> app) permite generar alertas tempranas y evolucionar a modelos predictivos. Como base de analítica robusta, aplicamos `log10(x + 1)` en ingestión (raw + log) y planificamos Fourier/FFT en un servicio analítico para rutinas/cambios de patrón. (ver `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`)

- Potencial de beneficio a poblaciones vulnerables: **Si**
- Numero de puestos de cowork requeridos: **2**
- Podrian estar en Santiago durante su residencia: **Si, sin restricciones**

## 6) Declaraciones y consentimiento

- Veracidad: **Si**
- Consentimiento de procesamiento/contacto: **Autorizo**
- Declaraciones (equity, datos, comunicaciones): **Acepto**

## 7) Cronograma tecnico-comercial (max 150 palabras)
1) **Hito tecnico (Mes 1-4):** cierre de version piloto de hardware y firmware, con estabilidad de captura y envio de datos en arquitectura productiva.  
2) **Hito tecnico-comercial (Mes 5-9):** ejecucion de piloto con early adopters y seguimiento de metricas de adopcion, uso recurrente y calidad de datos para validar propuesta de valor.  
3) **Hito comercial (Mes 10-12):** preparacion de lanzamiento inicial: paquete de pricing hardware + suscripcion, activacion de alianzas con clinicas/actores pet y readiness para levantamiento de capital semilla.

## 8) Principales riesgos (max 200 palabras)
Riesgo tecnico: variabilidad en precision y durabilidad del hardware en uso intensivo domestico. Mitigacion: pruebas de estres, calibracion y seleccion de componentes con proveedores alternativos.  
Riesgo de mercado: adopcion menor a la esperada o churn alto despues del periodo inicial. Mitigacion: onboarding guiado, educacion del usuario y foco en indicadores de valor temprano.  
Riesgo operativo-financiero: crecimiento de costos cloud y soporte antes de escalar ingresos. Mitigacion: monitoreo de costo unitario, optimizacion de arquitectura y control de burn por fase.  
Riesgo regulatorio/datos: manejo inadecuado de datos personales. Mitigacion: politicas de privacidad, seguridad por diseno y control de accesos.

## 9) Estrategia de Propiedad Intelectual

- Numero de solicitudes de patente presentadas: **0**
- Numero de patentes concedidas: **0**
- Numero de patentes provisionales: **0**
- Numero de publicaciones cientificas relacionadas: **0**

### Competidores directos e indirectos (max 150 palabras)
Directos: dispositivos pet-tech con monitoreo de alimentacion/hidratacion y apps asociadas. Indirectos: dispensadores automaticos sin analitica, apps de registro manual y wearables generales no enfocados en estos habitos. KittyPaw compite diferenciandose por su enfoque de datos accionables y arquitectura integrada para cuidado preventivo/predictivo.

### Perfiles clave de la startup (max 150 palabras)
- **Mauricio Cristian Carcamo Diaz** - Rol: liderazgo general/negocio-producto. Formacion: sociologia + ciencia de datos aplicada. Participacion: **[COMPLETAR %]**.  
- **Javier Dayne** - Rol: desarrollo tecnico (IoT/software). Formacion: ingenieria. Participacion: **[COMPLETAR %]**.

### Funciones criticas cubiertas por equipo fundador
- [x] I+D / desarrollo tecnologico
- [x] Operaciones
- [x] Ventas
- [x] Finanzas
- [ ] Regulacion
- [x] Data/Software
- [ ] Otro

### Brechas de capacidades (max 50 palabras)
Fortalecer capacidad en regulacion de hardware y escalamiento comercial B2B (canal veterinario/distribucion).

- Tecnologia requiere aprobaciones regulatorias especificas: **No (por ahora)**
- Cual(es): **No aplica en etapa actual; se evaluara certificacion segun mercado objetivo al escalar hardware.**

## 10) Posicion financiera

- Capital total levantado hasta la fecha (USD): **[COMPLETAR - sugerido 0 si no aplica]**
- Numero de rondas de financiamiento previas: **0**
- Tipos de ronda de financiamiento: **Subsidios (grants) [si hubo adjudicacion], de lo contrario No aplica**
- Ano de la ultima ronda: **0**
- Caja disponible (runway, meses en USD): **[COMPLETAR]**
- Burn rate mensual actual (USD): **[COMPLETAR]**
- Ingresos acumulados ultimos 12 meses (USD): **0**
- Volumen de ventas ultimo ano calendario/fiscal (USD): **0**
- Volumen de ventas ultimos 3 meses (USD): **0**
- Otras fuentes de financiamiento utilizadas: **Ahorros o recursos propios**
- Numero de clientes actuales recurrentes que pagan: **0**

## 11) Investigacion y Desarrollo (I+D)

- La startup realiza actividades de I+D formal y recurrente: **Si**

## 12) Posicion de mercado

### Perfil Cliente Ideal (max 200 palabras)
Empresa/persona natural: inicialmente B2C (duenos de mascotas), luego B2B2C con clinicas veterinarias y comercios pet. Geografia: inicio en Chile urbano (especialmente RM) y expansion regional LATAM. Industria: pet care, pet-tech y salud preventiva animal. Tamano: hogares con 1+ mascotas y alta adopcion digital; clinicas y comercios pequenos/medianos con interes en diferenciacion y fidelizacion.

- Industria o sector principal del cliente objetivo: **Pet care / Salud y bienestar animal / Pet-tech**

### Principal ventaja competitiva sostenible (max 100 palabras)
Integracion propietaria de hardware IoT + backend de datos + experiencia de usuario con enfoque preventivo/predictivo. La barrera no es solo el dispositivo, sino la capa de datos historicos, reglas de interpretacion y mejora continua del modelo analitico.

- Algun cofundador ha fundado previamente otras startups: **[COMPLETAR]**
- Promedio de anos de experiencia en la industria/sector principal: **[COMPLETAR]**
- Numero total de empleados (excluyendo cofundadores): **0**
- Busqueda de financiamiento: **Planificado iniciar dentro de los proximos 6 meses**

## 13) Alineacion con oferta de valor startuplab.01

### Necesidades prioritarias
- [x] Validacion tecnica y desarrollo de prototipos
- [ ] Acceso a infraestructura de laboratorio especializada
- [x] Desarrollo de modelo de negocio y estrategia comercial
- [x] Conexiones con potenciales clientes industriales
- [x] Preparacion para levantamiento de capital
- [x] Estrategia de propiedad intelectual
- [x] Navegacion regulatoria
- [x] Asesoria cientifica o comercial
- [ ] Otra

- Requerimiento de infraestructura de laboratorio: **Dry Lab**

## 14) Expectativas de la residencia

### Que esperas de la Residencia? (max 100 palabras)
Esperamos acelerar la validacion tecnico-comercial con mentoria especializada, red de pilotos y disciplina de ejecucion. Buscamos fortalecer prototipo, afinar modelo de ingresos hardware + suscripcion y preparar la startup para inversion, con foco en metricas y evidencia de traccion.

### Como crees que startuplab.01 contribuira al desarrollo?
- [ ] Encontrar nuevos cofundador(es)
- [x] Conseguir clientes
- [x] Conseguir inversionistas
- [ ] Conseguir empleados
- [x] Acceso a redes relevantes
- [x] Acceder a mercados internacionales
- [ ] Otra

---

## Campos criticos por confirmar antes de enviar
1. RUT y telefono del postulante.
2. LinkedIn oficial de startup (si aplica).
3. Participacion accionaria exacta por fundador.
4. Datos financieros reales (capital levantado, runway, burn rate, experiencia promedio).
5. Si corresponde marcar "Subsidios (grants)" solo con adjudicaciones efectivas.

## Pendientes criticos startuplab.01 (agregado 2026-03-06)

6. Preparar y subir **Presentacion / Deck (opcional pero altamente recomendado)**.
- Estado: **Pendiente**.
- Prioridad: **Alta**.
- Motivo: aunque es opcional, mejora la claridad de evaluacion y permite mostrar narrativa, evidencia tecnica, mercado y roadmap en formato ejecutivo.
- Entregable esperado: PDF de 10-12 slides, coherente con el formulario y sin contradicciones de datos.
- Ruta de trabajo: `Docs/Postulaciones Fondos/2026/BOSQUEJO_DECK_STARTUPLAB01.md`.

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
