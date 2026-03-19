# Formulario startuplab.01 - Respuestas sugeridas (Kittypau)

Fecha de preparacion: 2026-03-16 (actualizado)
Estado: LISTO para copiar al formulario — pendientes marcados con [CONFIRMAR]

---

## 1) Datos postulante

- **Nombre Completo Postulante:** Mauricio Cristian Carcamo Diaz
- **RUT Postulante (Persona Natural):** 17.402.237-2
- **Correo electronico postulante:** mauro.carcamo89@gmail.com
- **Telefono postulante (+codigo pais):** +56 9 9038 1919

---

## 2) Informacion basica de la startup

- **Nombre de la startup:** Kittypau
- **Razon social legal:** IOT CHILE SpA
- **Pais de origen:** Chile
- **Region:** Region Metropolitana (Peñalolen)
- **Estado legal:** Constituida
- **Fecha de constitucion legal:** 10 de julio de 2025
- **RUT Persona Juridica:** 78.203.374-3
- **Ano de fundacion:** 2025
- **Tipo de Empresa:** Sociedad por Acciones (SpA)
- **Sitio web:** https://kittypau-app.vercel.app
- **LinkedIn de la startup:** https://www.linkedin.com/in/kittypau-mascotas/

---

## 3) Clasificacion tecnologica

### Descripcion de la Tecnologia y del Problema (max 200 palabras)

Muchos duenos de mascotas no pueden saber con claridad si sus animales estan comiendo o hidratandose de forma normal durante el dia. En la practica, la mayoria solo se da cuenta cuando el plato sigue lleno o cuando la mascota ya muestra senales de malestar, lo que hace que varios problemas de salud se detecten tarde.

KittyPau aborda esa brecha con un ecosistema IoT mas software: plato y bebedero inteligente con sensores que miden consumo de alimento y agua, ademas de variables del entorno. Los datos se transmiten mediante conectividad IoT hacia una plataforma digital donde pueden visualizarse en tiempo real.

La aplicacion convierte la informacion en metricas faciles de entender, alertas tempranas cuando se detectan cambios en los patrones habituales y un historial de comportamiento util para duenos y veterinarios.

Desde el punto de vista tecnico, la solucion se basa en sensorizacion de bajo costo, transmision de telemetria via MQTT, procesamiento de series temporales y analitica incremental, con base tecnica para evolucionar hacia modelos predictivos con ML. El momento es adecuado porque convergen la digitalizacion del cuidado de mascotas, la madurez del stack IoT/cloud accesible para startups y la existencia de un prototipo funcional listo para pilotos.

### Nivel de Madurez Tecnologia (TRL)
**TRL 5 - Tecnologia validada en un entorno relevante**

### Justificacion del TRL seleccionado
- [x] Se ha formulado la idea del producto.
- [x] Se ha descrito completamente la idea del producto.
- [x] Se ha demostrado y descrito completamente el concepto del producto.
- [x] Se preve probar y validar las principales caracteristicas del producto mediante procedimientos especificos.
- [x] Las principales caracteristicas del producto han sido probadas y validadas en un laboratorio o entorno simulado.
- [x] El prototipo del producto ha sido probado y validado en el entorno pertinente.
- [ ] El producto ha sido probado y validado en su entorno natural.
- [ ] El producto ha sido ampliamente probado y validado.
- [ ] El producto esta completamente maduro y listo para su uso en el mercado.

- Sector de Contribución Climática (principal): **Urbanización**
- Área de acción principal: **Monitoreo (medición y rastreo)**

## 4) Equipo fundador

- **Remitente:** Tu mismo
- **Numero total de cofundadores (>=10%):** 2
- **Numero de fundadores con PhD o experiencia equivalente en investigacion:** 1
  > Javier Dayne: Ingeniero en Automatizacion y Control Industrial (INACAP) + Diplomado en Direccion de Proyectos PMO (UNAB) + 15 anos en ingenieria industrial. Califica por formacion tecnica en ingenieria.
- **Numero de fundadores con experiencia comercial/emprendimiento:** 2
  > Mauro: Project Coordinator, Data Analyst, Sales Coach (6+ anos). Javier: Senior Inside Sales en Emerson Electric, gestion de contratos hasta USD 5M (15+ anos).
- **Numero de mujeres en posiciones de liderazgo:** 0

---

## 5) Mercado objetivo

### Perfil del cliente ideal (max 150 palabras)
Duenos de mascotas urbanos (gatos y perros), digitalmente activos, con ingresos medios a medios-altos, que valoran el bienestar preventivo y estan dispuestos a pagar por soluciones que reduzcan incertidumbre y mejoren el cuidado diario. Priorizamos hogares en zonas metropolitanas con alta adopcion de apps moviles y ecommerce. Como segundo segmento, clinicas veterinarias y comercios pet que pueden usar KittyPau como herramienta de fidelizacion y monitoreo complementario. El cliente ideal busca datos concretos, alertas accionables y facilidad de uso sin conocimiento tecnico previo.

### Han validado el problema con potenciales clientes
**Cartas de intencion o compromisos no vinculantes**

### Por que ahora es el momento correcto (max 150 palabras)
La oportunidad es favorable porque el cuidado de mascotas se esta digitalizando rapidamente y los usuarios esperan soluciones de salud preventiva, no solo productos de conveniencia. Al mismo tiempo, la infraestructura IoT/cloud permite hoy desplegar telemetria y analitica con costos iniciales accesibles para startups. KittyPau ya cuenta con prototipo funcional, arquitectura operativa documentada y equipo con experiencia real en automatizacion industrial e IoT, lo que reduce el riesgo de ejecucion. Esto permite pasar desde validacion interna a piloto controlado con foco en evidencia de uso, retencion y valor clinico-operativo.

### Principal ventaja tecnica diferenciadora (max 150 palabras)
KittyPau no se limita a automatizar dispensación: integra hardware IoT, trazabilidad histórica y capa analítica para detectar desvíos de hidratación/alimentación con contexto ambiental. Esa integración extremo a extremo (sensor -> MQTT -> bridge -> API -> DB -> app) permite alertas tempranas y evolución hacia modelos predictivos. Como base de analítica robusta, aplicamos `log10(x + 1)` en ingestión (raw + log) y planificamos Fourier/FFT en un servicio analítico para rutinas y cambios de patrón. El equipo aporta +15 años en automatización/IIoT (SCADA/DCS), acelerando ejecución con criterio industrial. (ver `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`)

### Potencial de beneficio a poblaciones vulnerables
**Si**

### Descripcion del beneficio a poblaciones vulnerables
KittyPau puede reducir el gasto veterinario de emergencia en hogares de ingresos medios-bajos mediante deteccion temprana de problemas de alimentacion e hidratacion. En Chile, muchos duenos de mascotas de menores ingresos retrasan consultas veterinarias por costo, lo que agrava condiciones tratables. Un sistema de monitoreo accesible permite actuar antes de que el problema escale, reduciendo el costo total del cuidado animal y mejorando el bienestar de mascotas en hogares vulnerables.

- **Numero de puestos de cowork requeridos:** 2
- **Podrian estar en Santiago durante su residencia:** Si, sin restricciones

---

## 6) Declaraciones y consentimiento

- **Veracidad:** Si
- **Consentimiento:** Autorizo
- **Declaraciones:** Acepto

---

## 7) Cronograma tecnico-comercial (max 150 palabras)

1) **Hito tecnico (Mes 1-4):** Cierre de version piloto de hardware y firmware con estabilidad de captura y envio de datos en arquitectura productiva. Entregable: dispositivo KPCL estable, bridge operativo 24/7 y app con lectura en tiempo real validada.

2) **Hito tecnico-comercial (Mes 5-9):** Ejecucion de piloto con early adopters, seguimiento de metricas de adopcion, uso recurrente y calidad de datos para validar propuesta de valor. Entregable: 10+ usuarios activos, datos de retencion y feedback documentado.

3) **Hito comercial (Mes 10-12):** Preparacion de lanzamiento inicial: paquete de pricing hardware mas suscripcion, activacion de alianzas con clinicas y actores pet, y readiness para levantamiento de capital semilla. Entregable: modelo de ingresos validado y pitch deck para inversionistas.

---

## 8) Principales riesgos (max 200 palabras)

**Riesgo tecnico:** Variabilidad en precision y durabilidad del hardware en uso intensivo domestico. Mitigacion: pruebas de estres, calibracion de sensores y seleccion de componentes con proveedores alternativos. El equipo cuenta con 15 anos de experiencia en ingenieria de sistemas criticos industriales, lo que reduce este riesgo significativamente.

**Riesgo de mercado:** Adopcion menor a la esperada o churn alto tras el periodo inicial. Mitigacion: onboarding guiado, educacion del usuario, vista demo y foco en indicadores de valor temprano (primera alerta util, primera deteccion de cambio de patron).

**Riesgo operativo-financiero:** Crecimiento de costos cloud y soporte antes de escalar ingresos. Mitigacion: monitoreo de costo unitario por dispositivo, optimizacion de arquitectura y control de burn rate por fase.

**Riesgo regulatorio/datos:** Manejo inadecuado de datos personales. Mitigacion: politicas de privacidad implementadas, seguridad por diseno, autenticacion por tokens y control de accesos por rol.

---

## 9) Estrategia de Propiedad Intelectual

- **Numero de solicitudes de patente presentadas:** 0
- **Numero de patentes concedidas:** 0
- **Numero de patentes provisionales:** 0
- **Numero de publicaciones cientificas relacionadas:** 0

### Competidores directos e indirectos (max 150 palabras)
**Directos:** PetKit (China, dispensadores inteligentes con app), SureFeed y Sure Petcare (UK, alimentadores y puertas conectadas). Ninguno ofrece integracion local, analitica preventiva ni arquitectura orientada al mercado latinoamericano.

**Indirectos:** Dispensadores automaticos sin conectividad (PetSafe, Catit), apps de registro manual sin hardware asociado y wearables generales no enfocados en habitos de alimentacion e hidratacion.

**Diferenciacion de KittyPau:** integracion extremo a extremo (sensor, MQTT, cloud, app), capa de datos longitudinales accionables y enfoque preventivo/predictivo. Los competidores automatizan la dispensacion; KittyPau genera inteligencia sobre los habitos reales de la mascota.

### Perfiles clave de la startup (max 150 palabras)
**Mauricio Carcamo Diaz — CEO y Co-fundador (50%).** Sociologo (Universidad Central de Chile), Diplomado en Data Science (UC) e Inteligencia Artificial (U. Autonoma). 6+ anos en analisis de datos, gestion de proyectos y estrategia comercial. Lidera negocio, producto y estrategia de KittyPau.

**Javier Dayne Ortiz — CTO y Co-fundador (50%).** Ingeniero en Automatizacion y Control Industrial (INACAP), Diplomado en Direccion de Proyectos PMO (UNAB). 15+ anos en sistemas DCS, SCADA, IIoT y MQTT en sectores mineria, energia y celulosa (Emerson Electric). Lidera el desarrollo tecnico de hardware IoT, firmware, bridge y arquitectura de software de KittyPau.

### Funciones criticas cubiertas por equipo fundador
- [x] I+D / desarrollo tecnologico
- [x] Operaciones
- [x] Ventas
- [x] Finanzas
- [ ] Regulacion
- [x] Data/Software

### Brechas de capacidades (max 50 palabras)
Fortalecer capacidad en regulacion de hardware electronico de consumo y escalamiento comercial B2B en canal veterinario y distribucion especializada. Ambas brechas son prioritarias para la siguiente fase de crecimiento y se esperan cubrir con mentoria y red de startuplab.01.

- **Tecnologia requiere aprobaciones regulatorias especificas:** No
- **Cual(es):** No aplica en etapa actual. Se evaluara certificacion tecnica segun mercado objetivo al escalar hardware a produccion.

---

## 10) Posicion financiera

- **Capital total levantado hasta la fecha (USD):** 304
  > Inversion propia verificada: Javier Dayne $244 USD (componentes Kittypau $190 + RPi bridge $20 + filamento $34) + Mauro Carcamo $60 USD (50% compras pre-Mar-2026 ya liquidadas). Fuente: REGISTRO_COMPRAS_JAVIER.md + acuerdo 50/50.
- **Numero de rondas de financiamiento previas:** 0
- **Tipos de ronda de financiamiento:** No aplica (recursos propios, no dilutivo)
- **Ano de la ultima ronda:** 0
- **Caja disponible (runway, meses en USD):** 36
  > Equipo autosustentado hasta año 3. Burn rate real $1 USD/mes (todos los servicios en plan free). Shadow-price $44 USD/mes. Runway = 36 meses a $1/mes = $36 USD comprometidos en cloud; ingresos propios de ambos fundadores cubren operacion hasta año 3.
- **Burn rate mensual actual (USD):** 1
  > Costo cloud facturado: $1 USD/mes (Supabase Free, Vercel Hobby, HiveMQ Free, dominio). Shadow-price operacional: ~$44 USD/mes.
- **Ingresos acumulados ultimos 12 meses (USD):** 0
- **Volumen de ventas ultimo ano (USD):** 0
- **Volumen de ventas ultimos 3 meses (USD):** 0
- **Otras fuentes de financiamiento:** Ahorros o recursos propios
- **Numero de clientes actuales recurrentes que pagan:** 0

---

## 11) Investigacion y Desarrollo (I+D)

- **La startup realiza actividades de I+D formal y recurrente:** Si

---

## 12) Posicion de mercado

### Perfil Cliente Ideal (max 200 palabras)
Segmento principal B2C: personas naturales, duenos de mascotas (gatos y perros) en zonas urbanas de Chile, especialmente Region Metropolitana. Perfil: adultos entre 25 y 45 anos, digitalmente activos, con ingresos medios a medios-altos, que consideran a sus mascotas parte de la familia y estan dispuestos a invertir en su salud preventiva. Alta adopcion de apps moviles, e-commerce y servicios por suscripcion.

Segmento secundario B2B2C: clinicas veterinarias y comercios pet de tamano pequeno y mediano, interesados en diferenciacion de servicio y fidelizacion de clientes mediante herramientas de monitoreo complementario.

Expansion regional: tras validacion en Chile, el modelo es replicable en mercados LATAM con perfiles similares (Argentina, Colombia, Mexico), donde la tendencia de humanizacion de mascotas y adopcion digital crece sostenidamente. La industria pet care en Chile mueve aproximadamente USD 600M anuales, con crecimiento de doble digito en el segmento de salud preventiva y productos premium.

- **Industria o sector principal del cliente objetivo:** Pet care / Salud y bienestar animal / Pet-tech

### Principal ventaja competitiva sostenible (max 100 palabras)
KittyPau construye una ventaja acumulativa dificil de replicar: integracion propietaria de hardware IoT, backend de series temporales y analitica conductual de habitos. La barrera competitiva no es solo el dispositivo, sino los datos longitudinales de comportamiento de mascotas, las reglas de interpretacion y el modelo de mejora continua. Un competidor puede copiar el hardware, pero no los datos acumulados ni el modelo entrenado con ellos. El equipo combina 15+ anos en automatizacion industrial IoT/MQTT con capacidad en data science aplicada, acelerando la evolucion hacia modelos predictivos.

- **Algun cofundador ha fundado previamente otras startups:** No
- **Promedio de anos de experiencia en la industria/sector principal:** 10 (Mauro 6+ anos en datos/tecnologia, Javier 15+ anos en automatizacion industrial e IIoT)
- **Numero total de empleados (excluyendo cofundadores):** 0
- **Busqueda de financiamiento:** Planificado iniciar dentro de los proximos 6 meses

---

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

- **Requerimiento de infraestructura de laboratorio:** Dry Lab

---

## 14) Expectativas de la residencia

### Que esperas de la Residencia? (max 100 palabras)
Esperamos acelerar la transicion desde validacion tecnica interna hacia un piloto controlado con evidencia real de uso y valor. Buscamos mentoria especializada en hardware, modelo de negocios y estrategia comercial; conexiones con clientes potenciales y redes de inversion; y la disciplina de ejecucion que entrega una residencia estructurada. KittyPau esta en el momento preciso donde la guia de expertos y el acceso a red pueden reducir significativamente el riesgo de ejecucion y acelerar el camino hacia el primer levantamiento de capital.

### Como crees que startuplab.01 contribuira al desarrollo?
- [ ] Encontrar nuevos cofundador(es)
- [x] Conseguir clientes
- [x] Conseguir inversionistas
- [ ] Conseguir empleados
- [x] Acceso a redes relevantes
- [x] Acceder a mercados internacionales

---

## Campos pendientes antes de enviar

| Campo | Estado |
|-------|--------|
| Fecha de constitucion legal | ✅ 10 de julio de 2025 |
| RUT Persona Juridica (empresa) | ✅ 78.203.374-3 |
| Ano de fundacion | ✅ 2025 |
| Caja disponible / Runway (USD) | ✅ 36 meses (año 3) |
| Burn rate mensual (USD) | ✅ $1 USD real / ~$44 USD shadow-price |
| Deck PDF | Pendiente exportar desde BOSQUEJO_DECK_STARTUPLAB01.md |

---

## Notas estrategicas

- **PhD count:** Se cambio a 1 (Javier califica por grado universitario en ingenieria). Mauro tiene diplomas universitarios en IA y Data Science pero su titulo base es Sociologia, lo que no califica estrictamente.
- **Experiencia comercial:** Se cambio a 2 — ambos fundadores tienen experiencia comercial acreditada (Mauro: Sales Coach, Project Coordinator; Javier: Senior Inside Sales en Emerson, contratos hasta USD 5M).
- **Deck:** Aunque es opcional, es altamente recomendado subirlo. Prioridad alta.
