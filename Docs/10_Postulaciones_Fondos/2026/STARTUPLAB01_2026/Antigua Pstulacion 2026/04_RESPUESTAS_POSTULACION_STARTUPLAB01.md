# Start-Up Chile 2026 - Respuestas de postulación

Proyecto: **KittyPau**  
Linea: **startuplab.01**  
Tipo de documento: respuestas sugeridas para copiar al formulario

> Base de trabajo: `05_STARTUPLAB01_FORMULARIO_VIVO.md`, `documento_2026/`, perfiles del equipo y paquete `STARTUPLAB01_2026/`.

---

## 1) Datos del postulante

- Nombre completo postulante: **Mauricio Cristian Carcamo Diaz**
- RUT postulante (persona natural): **17.402.237-2**
- Correo electronico postulante: **mauro.carcamo89@gmail.com**
- Telefono postulante: **+56 9 9038 1919**

---

## 2) Informacion basica de la startup

- Nombre de la startup: **Kittypau**
- Razon social legal: **IOT CHILE SpA**
- Pais de origen: **Chile**
- Region: **Region Metropolitana (Pealolen)**
- Estado legal: **Constituida**
- Fecha de constitucion legal: **10 de julio de 2025**
- RUT persona juridica: **78.203.374-3**
- Ano de fundacion: **2025**
- Tipo de empresa: **Sociedad por Acciones (SpA)**
- Sitio web: **https://kittypau-app.vercel.app**
- LinkedIn de la startup: **https://www.linkedin.com/in/kittypau-mascotas/**

---

## 3) Clasificacion tecnologica

### Descripcion de la tecnologia y del problema

Muchos duenos de mascotas no pueden saber con claridad si sus animales estan comiendo o hidratandose de forma normal durante el dia. En la practica, la mayoria solo detecta problemas cuando el plato sigue lleno o cuando la mascota ya muestra sintomas, lo que hace que varios casos se identifiquen tarde.

KittyPau aborda esa brecha con un ecosistema IoT + software: plato y bebedero inteligente con sensores que miden consumo de alimento y agua, ademas de variables del entorno. Los datos se transmiten mediante conectividad IoT hacia una plataforma digital donde pueden visualizarse en tiempo real.

La aplicacion convierte la informacion en metricas faciles de entender, alertas tempranas cuando se detectan cambios en los patrones habituales y un historial de comportamiento util para duenos y veterinarios.

Desde el punto de vista tecnico, la solucion se basa en sensorizacion de bajo costo, transmision de telemetria via MQTT, procesamiento de series temporales y analitica incremental, con base tecnica para evolucionar hacia modelos predictivos con ML. El momento es adecuado porque convergen la digitalizacion del cuidado de mascotas, la madurez del stack IoT/cloud accesible para startups y la existencia de un prototipo funcional listo para pilotos.

### Nivel de madurez tecnologica

**TRL 5 - Tecnologia validada en un entorno relevante**

### Justificacion del TRL

- Se ha formulado la idea del producto.
- Se ha descrito completamente la idea del producto.
- Se ha demostrado y descrito completamente el concepto del producto.
- Se preve probar y validar las principales caracteristicas del producto mediante procedimientos especificos.
- Las principales caracteristicas del producto han sido probadas y validadas en un laboratorio o entorno simulado.
- El prototipo del producto ha sido probado y validado en el entorno pertinente.

### Sector de contribucion climatica

- Sector principal: **Urbanizacion**
- Area de accion principal: **Monitoreo (medicion y rastreo)**

---

## 4) Equipo fundador

- Remitente: **Tu mismo**
- Numero total de cofundadores: **2**
- Numero de fundadores con PhD o experiencia equivalente en investigacion: **1**
- Numero de fundadores con experiencia comercial/emprendimiento: **2**
- Numero de mujeres en posiciones de liderazgo: **0**

---

## 5) Mercado objetivo

### Perfil del cliente ideal

Duenos de mascotas urbanos, especialmente de gatos y perros, digitalmente activos, con ingresos medios a medios-altos, que valoran el bienestar preventivo y estan dispuestos a pagar por soluciones que reduzcan incertidumbre y mejoren el cuidado diario. Priorizamos hogares en zonas metropolitanas con alta adopcion de apps moviles y ecommerce. Como segundo segmento, clinicas veterinarias y comercios pet que pueden usar KittyPau como herramienta de fidelizacion y monitoreo complementario. El cliente ideal busca datos concretos, alertas accionables y facilidad de uso sin conocimiento tecnico previo.

### Validacion del problema

**Cartas de intencion o compromisos no vinculantes**

### Por que ahora es el momento correcto

La oportunidad es favorable porque el cuidado de mascotas se esta digitalizando rapidamente y los usuarios esperan soluciones de salud preventiva, no solo productos de conveniencia. Al mismo tiempo, la infraestructura IoT/cloud permite hoy desplegar telemetria y analitica con costos iniciales accesibles para startups. KittyPau ya cuenta con prototipo funcional, arquitectura operativa documentada y equipo con experiencia real en automatizacion industrial e IoT, lo que reduce el riesgo de ejecucion. Esto permite pasar desde validacion interna a piloto controlado con foco en evidencia de uso, retencion y valor clinico-operativo.

### Principal ventaja tecnica diferenciadora

KittyPau no se limita a automatizar dispensacion: integra hardware IoT, trazabilidad historica y capa analitica para detectar desvos de hidratacion/alimentacion con contexto ambiental. Esa integracion extremo a extremo, de sensor a app, permite alertas tempranas y evolucion hacia modelos predictivos. Como base de analitica robusta, aplicamos `log10(x + 1)` en ingestion y planificamos Fourier/FFT en un servicio analitico para rutinas y cambios de patron. El equipo aporta mas de 15 anos en automatizacion/IIoT, acelerando ejecucion con criterio industrial.

### Potencial de beneficio a poblaciones vulnerables

**Si**

### Descripcion del beneficio a poblaciones vulnerables

KittyPau puede reducir el gasto veterinario de emergencia en hogares de ingresos medios-bajos mediante deteccion temprana de problemas de alimentacion e hidratacion. En Chile, muchos duenos de mascotas de menores ingresos retrasan consultas veterinarias por costo, lo que agrava condiciones tratables. Un sistema de monitoreo accesible permite actuar antes de que el problema escale, reduciendo el costo total del cuidado animal y mejorando el bienestar de mascotas en hogares vulnerables.

- Numero de puestos de cowork requeridos: **2**
- Podrian estar en Santiago durante su residencia: **Si, sin restricciones**

---

## 6) Declaraciones y consentimiento

- Veracidad: **Si**
- Consentimiento: **Autorizo**
- Declaraciones: **Acepto**

---

## 7) Cronograma tecnico-comercial

1. Hito tecnico, meses 1-4: cierre de version piloto de hardware y firmware con estabilidad de captura y envio de datos en arquitectura productiva. Entregable: dispositivo KPCL estable, bridge operativo 24/7 y app con lectura en tiempo real validada.

2. Hito tecnico-comercial, meses 5-9: ejecucion de piloto con early adopters, seguimiento de metricas de adopcion, uso recurrente y calidad de datos para validar propuesta de valor. Entregable: 10+ usuarios activos, datos de retencion y feedback documentado.

3. Hito comercial, meses 10-12: preparacion de lanzamiento inicial, con pricing de hardware mas suscripcion, activacion de alianzas con clinicas y actores pet, y readiness para levantamiento de capital semilla. Entregable: modelo de ingresos validado y pitch deck para inversionistas.

---

## 8) Principales riesgos

**Riesgo tecnico:** variabilidad en precision y durabilidad del hardware en uso intensivo domestico.  
**Mitigacion:** pruebas de estres, calibracion de sensores y seleccion de componentes con proveedores alternativos. El equipo cuenta con 15 anos de experiencia en ingenieria de sistemas criticos industriales, lo que reduce este riesgo significativamente.

**Riesgo de mercado:** adopcion menor a la esperada o churn alto tras el periodo inicial.  
**Mitigacion:** onboarding guiado, educacion del usuario, vista demo y foco en indicadores de valor temprano, como la primera alerta util o la primera deteccion de cambio de patron.

**Riesgo operativo-financiero:** crecimiento de costos cloud y soporte antes de escalar ingresos.  
**Mitigacion:** monitoreo de costo unitario por dispositivo, optimizacion de arquitectura y control de burn rate por fase.

**Riesgo regulatorio/datos:** manejo inadecuado de datos personales.  
**Mitigacion:** politicas de privacidad implementadas, seguridad por diseno, autenticacion por tokens y control de accesos por rol.

---

## 9) Estrategia de propiedad intelectual

- Numero de solicitudes de patente presentadas: **0**
- Numero de patentes concedidas: **0**
- Numero de patentes provisionales: **0**
- Numero de publicaciones cientificas relacionadas: **0**

### Competidores directos e indirectos

**Directos:** PetKit, SureFeed y Sure Petcare. Ninguno ofrece integracion local, analitica preventiva ni arquitectura orientada al mercado latinoamericano.

**Indirectos:** dispensadores automaticos sin conectividad, apps de registro manual sin hardware asociado y wearables generales no enfocados en habitos de alimentacion e hidratacion.

**Diferenciacion de KittyPau:** integracion extremo a extremo, capa de datos longitudinales accionables y enfoque preventivo/predictivo. Los competidores automatizan la dispensacion; KittyPau genera inteligencia sobre los habitos reales de la mascota.

### Perfiles clave de la startup

**Mauricio Carcamo Diaz - CEO y cofundador (50%).** Sociologo, diplomado en Data Science e Inteligencia Artificial. 6+ anos en analisis de datos, gestion de proyectos y estrategia comercial. Lidera negocio, producto y estrategia de KittyPau.

**Javier Dayne Ortiz - CTO y cofundador (50%).** Ingeniero en Automatizacion y Control Industrial, diplomado en Direccion de Proyectos PMO. 15+ anos en sistemas DCS, SCADA, IIoT y MQTT en sectores mineria, energia y celulosa. Lidera el desarrollo tecnico de hardware IoT, firmware, bridge y arquitectura de software de KittyPau.

### Funciones criticas cubiertas por equipo fundador

- I+D / desarrollo tecnologico
- Operaciones
- Ventas
- Finanzas
- Data/Software

### Brechas de capacidades

Fortalecer capacidad en regulacion de hardware electronico de consumo y escalamiento comercial B2B en canal veterinario y distribucion especializada. Ambas brechas son prioritarias para la siguiente fase de crecimiento y se esperan cubrir con mentoria y red de startuplab.01.

- Tecnologia requiere aprobaciones regulatorias especificas: **No**
- Cuales: **No aplica en etapa actual. Se evaluara certificacion tecnica segun mercado objetivo al escalar hardware a produccion.**

---

## 10) Posicion financiera

- Capital total levantado hasta la fecha (USD): **304**
- Numero de rondas de financiamiento previas: **0**
- Tipos de ronda de financiamiento: **No aplica, recursos propios**
- Ano de la ultima ronda: **0**
- Caja disponible / runway: **36 meses**
- Burn rate mensual actual (USD): **1**
- Ingresos acumulados ultimos 12 meses (USD): **0**
- Volumen de ventas ultimo ano (USD): **0**
- Volumen de ventas ultimos 3 meses (USD): **0**
- Otras fuentes de financiamiento: **Ahorros o recursos propios**
- Numero de clientes actuales recurrentes que pagan: **0**

---

## 11) Investigacion y desarrollo

- La startup realiza actividades de I+D formal y recurrente: **Si**

---

## 12) Posicion de mercado

### Perfil cliente ideal

Segmento principal B2C: personas naturales, duenos de mascotas, en zonas urbanas de Chile, especialmente Region Metropolitana. Perfil: adultos entre 25 y 45 anos, digitalmente activos, con ingresos medios a medios-altos, que consideran a sus mascotas parte de la familia y estan dispuestos a invertir en su salud preventiva. Alta adopcion de apps moviles, ecommerce y servicios por suscripcion.

Segmento secundario B2B2C: clinicas veterinarias y comercios pet de tamano pequeno y mediano, interesados en diferenciacion de servicio y fidelizacion de clientes mediante herramientas de monitoreo complementario.

Expansion regional: tras validacion en Chile, el modelo es replicable en mercados LATAM con perfiles similares, como Argentina, Colombia y Mexico, donde la tendencia de humanizacion de mascotas y adopcion digital crece sostenidamente.

- Industria o sector principal del cliente objetivo: **Pet care / Salud y bienestar animal / Pet-tech**

### Principal ventaja competitiva sostenible

KittyPau construye una ventaja acumulativa dificil de replicar: integracion propietaria de hardware IoT, backend de series temporales y analitica conductual de habitos. La barrera competitiva no es solo el dispositivo, sino los datos longitudinales de comportamiento de mascotas, las reglas de interpretacion y el modelo de mejora continua. Un competidor puede copiar el hardware, pero no los datos acumulados ni el modelo entrenado con ellos. El equipo combina 15+ anos en automatizacion industrial IoT/MQTT con capacidad en data science aplicada, acelerando la evolucion hacia modelos predictivos.

- Alguno de los cofundadores ha fundado previamente otras startups: **No**
- Promedio de anos de experiencia en la industria/sector principal: **10**
- Numero total de empleados excluyendo cofundadores: **0**
- Busqueda de financiamiento: **Planificado iniciar dentro de los proximos 6 meses**

---

## 13) Alineacion con la oferta de valor de startuplab.01

### Necesidades prioritarias

- Validacion tecnica y desarrollo de prototipos
- Desarrollo de modelo de negocio y estrategia comercial
- Conexiones con potenciales clientes industriales
- Preparacion para levantamiento de capital
- Estrategia de propiedad intelectual
- Navegacion regulatoria
- Asesoria cientifica o comercial

- Requerimiento de infraestructura de laboratorio: **Dry Lab**

---

## 14) Expectativas de la residencia

### Que esperas de la Residencia

Esperamos acelerar la transicion desde validacion tecnica interna hacia un piloto controlado con evidencia real de uso y valor. Buscamos mentoria especializada en hardware, modelo de negocios y estrategia comercial; conexiones con clientes potenciales y redes de inversion; y la disciplina de ejecucion que entrega una residencia estructurada. KittyPau esta en el momento preciso donde la guia de expertos y el acceso a red pueden reducir significativamente el riesgo de ejecucion y acelerar el camino hacia el primer levantamiento de capital.

### Como crees que startuplab.01 contribuira al desarrollo

- Conseguir clientes
- Conseguir inversionistas
- Acceso a redes relevantes
- Acceder a mercados internacionales

---

## Campos revisados antes de envio

| Campo | Estado |
|---|---|
| Fecha de constitucion legal | OK: 10 de julio de 2025 |
| RUT persona juridica | OK: 78.203.374-3 |
| Ano de fundacion | OK: 2025 |
| Caja disponible / runway | OK: 36 meses |
| Burn rate mensual | OK: $1 USD real |
| Deck PDF | Pendiente exportar desde `02_DECK_STARTUPLAB01.md` |

---

## Nota operativa

Este archivo deja una version limpia y ordenada de las respuestas. Antes de enviar, conviene volver a revisar limites de caracteres, consistencia de nombres y cualquier campo sensible que el formulario de Start-Up Chile marque como obligatorio.

