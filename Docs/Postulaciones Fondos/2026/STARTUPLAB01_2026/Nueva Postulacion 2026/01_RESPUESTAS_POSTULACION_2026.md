# Start-Up Chile 2026 - Respuestas de postulación

Proyecto: **Kittypau**  
Paquete: **Nueva Postulacion 2026**

Este documento responde el formulario de postulación tomando como referencia la estructura del PDF de Airtable, el formulario vivo del repositorio y la documentación completa del proyecto en `Docs/`.

---

## 1) Identificación y contacto

- **Nombre de la startup:** Kittypau
- **Razón social:** IOT CHILE SpA
- **País de origen:** Chile
- **Sitio web:** https://kittypau-app.vercel.app
- **Correo postulante:** mauro.carcamo89@gmail.com
- **Teléfono postulante:** +56 9 9038 1919

---

## 2) Descripción de la tecnología y del problema

### Problema

Los dueños de mascotas suelen no saber con precisión si su animal está comiendo o hidratándose de forma normal durante el día. En la práctica, la detección de problemas ocurre tarde: cuando el plato sigue lleno, cuando el patrón de consumo cambia de forma evidente o cuando ya aparecen síntomas. Esa falta de visibilidad diaria vuelve reactivo el cuidado y aumenta el riesgo de consultas de urgencia evitables.

### Solución

Kittypau es una plataforma AIoT para monitoreo de alimentación e hidratación de mascotas. Integra hardware IoT, un bridge local, backend cloud y dashboard web para convertir lecturas de consumo y variables del entorno en métricas accionables, alertas tempranas e historial longitudinal.

La solución no solo automatiza dispensación. Lo relevante es la capa de inteligencia sobre hábitos reales: cambios en frecuencia, duración, cantidad consumida, patrón horario y contexto ambiental. Esa combinación permite detectar desvíos de conducta y apoyar decisiones preventivas.

### Base técnica

La arquitectura viva del proyecto ya existe y está documentada:
- dispositivo IoT con sensores de peso, ambiente y luz,
- transporte por MQTT,
- bridge local,
- persistencia en PostgreSQL/Supabase,
- visualización y análisis en la app web.

Eso sitúa a Kittypau en un nivel de madurez compatible con validación en entorno relevante y preparación para piloto controlado.

---

## 3) Nivel de madurez tecnológica

**TRL 5 - Tecnología validada en un entorno relevante**

### Justificación

- El concepto ya está formulado y operacionalizado.
- Hay prototipo y stack técnico documentado.
- El flujo extremo a extremo está definido y probado: sensor -> MQTT -> bridge -> API -> DB -> app.
- Existen pruebas y registro técnico en documentación viva del proyecto.
- El siguiente paso lógico es aumentar validación con usuarios iniciales y evidencias de uso.

### Sector de contribución climática

- **Sector principal:** Entorno construido / urbanización
- **Área de acción:** Monitoreo

### Mecanismo de impacto climático

El impacto es indirecto pero real. Kittypau puede reducir consultas de urgencia evitables, disminuir desplazamientos urbanos innecesarios, mejorar el uso de alimento y apoyar decisiones más eficientes sobre el cuidado cotidiano de mascotas.

---

## 4) Equipo fundador

- **Número total de cofundadores:** 2
- **Equipo con capacidades complementarias:** Sí
- **Número de fundadores con formación científica o técnica relevante:** 1
- **Número de fundadores con experiencia comercial/emprendimiento:** 2
- **Número de mujeres en liderazgo:** 0

### Fundador técnico

**Javier Dayne Ortiz - CTO y cofundador**
- Ingeniero en Automatización y Control Industrial
- Diplomado en Dirección de Proyectos y PMO
- 15+ años de experiencia en DCS, SCADA, IIoT y MQTT
- Lidera hardware, firmware, bridge y arquitectura técnica

### Fundador negocio/producto

**Mauricio Cristian Cárcamo Díaz - CEO y cofundador**
- Sociólogo
- Diplomado en Data Science
- Diplomado en Inteligencia Artificial
- 6+ años de experiencia en datos, producto y estrategia comercial
- Lidera negocio, producto, analítica y postulación

### Brechas y cobertura

Las brechas identificadas están en:
- regulación de hardware de consumo,
- escalamiento comercial B2B en canal veterinario,
- expansión de red comercial.

La residencia aporta precisamente mentoría, conexiones y estructura para cerrar esas brechas.

---

## 5) Mercado objetivo

### Perfil del cliente ideal

El cliente ideal es un dueño de mascotas urbano, especialmente de gatos y perros, digitalmente activo, con ingresos medios a medios-altos, que considera a su mascota parte de la familia y valora soluciones preventivas.

Un segundo segmento relevante son clínicas veterinarias y comercios pet medianos que pueden usar Kittypau como herramienta de fidelización, monitoreo complementario y diferenciación de servicio.

### Validación del problema

El problema ha sido validado con:
- cartas de intención o compromisos no vinculantes,
- pruebas internas del prototipo,
- documentación técnica y operativa,
- validación temprana del caso de uso y del dolor del usuario.

### Por qué ahora

La oportunidad está madura porque el cuidado de mascotas se está digitalizando y el mercado busca soluciones preventivas, no solo productos de conveniencia. Además, la infraestructura IoT/cloud actual permite desplegar telemetría y analítica con costos iniciales razonables.

Kittypau ya tiene un prototipo funcional, una base técnica operativa y un equipo con experiencia real en automatización industrial e IIoT. Eso reduce riesgo de ejecución y permite dar el salto desde validación interna a piloto.

### Principal ventaja técnica diferenciadora

Kittypau integra hardware IoT, trazabilidad histórica y capa analítica para detectar desvíos de hidratación y alimentación con contexto ambiental. La barrera competitiva no es el hardware aislado, sino los datos longitudinales y las reglas de interpretación que se acumulan con el uso real.

---

## 6) Beneficio a poblaciones vulnerables

**Sí**

Kittypau puede reducir el gasto veterinario de emergencia en hogares de ingresos medios-bajos mediante detección temprana de problemas de alimentación e hidratación. Eso ayuda a actuar antes de que el problema escale a una consulta más costosa y mejora el bienestar de la mascota.

---

## 7) Condiciones operativas

- **Número de puestos de cowork requeridos:** 2
- **Pueden estar en Santiago durante la residencia:** Sí, sin restricciones
- **Requerimiento de infraestructura:** Dry Lab

---

## 8) Declaraciones y consentimiento

- **Veracidad:** Sí
- **Consentimiento:** Autorizo
- **Declaraciones:** Acepto

---

## 9) Cronograma técnico-comercial

1. **Hito técnico, meses 1 a 4:** Cierre de la versión piloto de hardware y firmware con estabilidad de captura y envío de datos en arquitectura productiva. Entregable: dispositivo KPCL estable, bridge operativo 24/7 y app con lectura en tiempo real validada.

2. **Hito técnico-comercial, meses 5 a 9:** Ejecución de piloto con early adopters, seguimiento de métricas de adopción, uso recurrente y calidad de datos para validar propuesta de valor. Entregable: 10+ usuarios activos, métricas de retención y feedback documentado.

3. **Hito comercial, meses 10 a 12:** Preparación de lanzamiento inicial, con pricing de hardware más suscripción, activación de alianzas con clínicas y actores pet, y readiness para levantamiento de capital semilla.

---

## 10) Riesgos principales

### Riesgo técnico

Variabilidad en precisión y durabilidad del hardware en uso intensivo doméstico.

### Mitigación

Pruebas de estrés, calibración de sensores y selección de componentes alternativos.

### Riesgo de mercado

Adopción menor a la esperada o churn alto tras el periodo inicial.

### Mitigación

Onboarding guiado, foco en la primera alerta útil y validación de valor temprano.

### Riesgo operativo-financiero

Crecimiento de costos cloud y soporte antes de escalar ingresos.

### Mitigación

Monitoreo de costo unitario por dispositivo, optimización de arquitectura y control de burn rate.

### Riesgo regulatorio/datos

Manejo inadecuado de datos personales.

### Mitigación

Políticas de privacidad, autenticación por tokens y control de accesos por rol.

---

## 11) Propiedad intelectual

- **Solicitudes de patente presentadas:** 0
- **Patentes concedidas:** 0
- **Patentes provisionales:** 0
- **Publicaciones científicas relacionadas:** 0

### Competidores

**Directos:** PetKit, SureFeed y Sure Petcare.  
**Indirectos:** dispensadores sin conectividad, apps manuales de registro y wearables no enfocados en hábitos de alimentación e hidratación.

### Diferenciación de Kittypau

Los competidores automatizan la dispensación. Kittypau genera inteligencia sobre hábitos reales de la mascota, con datos longitudinales, contexto ambiental y capacidad de evolucionar a analítica predictiva.

---

## 12) Perfiles clave

### Mauricio Cristian Cárcamo Díaz

- CEO y cofundador
- Sociología, Data Science, Inteligencia Artificial
- 6+ años en análisis de datos, gestión de proyectos y estrategia comercial
- Lidera negocio, producto, analítica y la coordinación de la postulación

### Javier Dayne Ortiz

- CTO y cofundador
- Ingeniería en Automatización y Control Industrial
- 15+ años de experiencia en automatización industrial, IIoT y MQTT
- Lidera desarrollo técnico, hardware, firmware y bridge

### Funciones cubiertas

- I+D / desarrollo tecnológico
- Operaciones
- Ventas
- Finanzas
- Data/Software

### Funciones a reforzar

- Regulación
- Escalamiento comercial B2B

---

## 13) Posición financiera

- **Capital total levantado hasta la fecha:** USD 304
- **Número de rondas previas:** 0
- **Ingresos acumulados últimos 12 meses:** 0
- **Ventas último año:** 0
- **Clientes recurrentes que pagan:** 0
- **Burn rate mensual actual:** USD 1 real
- **Runway estimado:** 36 meses

### Fuente del capital

Recursos propios de los fundadores, con gasto ya realizado en componentes, bridge y materiales del sistema.

### Modelo económico

- ingreso inicial por hardware,
- suscripción para alertas y analítica,
- opción futura de data insights anonimizados.

---

## 14) Posición de mercado

### Perfil cliente ideal

Segmento principal B2C: dueños de mascotas en zonas urbanas de Chile, entre 25 y 45 años, digitalmente activos, con ingresos medios a medios-altos y foco en salud preventiva.

Segmento secundario B2B2C: clínicas veterinarias y comercios pet pequeños y medianos.

### Ventaja competitiva sostenible

Kittypau construye ventaja acumulativa por datos longitudinales, reglas de interpretación y mejora continua. Un competidor puede copiar parte del hardware, pero no el aprendizaje operacional ni la base de datos de comportamiento acumulada.

- **Algún cofundador ha fundado otras startups:** No
- **Promedio de años de experiencia en la industria principal:** 10
- **Número total de empleados excluyendo cofundadores:** 0
- **Búsqueda de financiamiento:** Planificada dentro de los próximos 6 meses

---

## 15) Alineación con startuplab.01

### Necesidades prioritarias

- Validación técnica y desarrollo de prototipos
- Desarrollo de modelo de negocio y estrategia comercial
- Conexiones con potenciales clientes
- Preparación para levantamiento de capital
- Estrategia de propiedad intelectual
- Navegación regulatoria
- Asesoría científica o comercial

### Ajuste con la residencia

Kittypau encaja con startuplab.01 porque necesita Dry Lab, está en un TRL compatible, requiere acompañamiento técnico y comercial, y puede demostrar progreso real durante la residencia.

---

## 16) Expectativas de la residencia

Esperamos acelerar la transición desde validación técnica interna hacia un piloto controlado con evidencia real de uso y valor. Buscamos mentoría especializada en hardware, modelo de negocio y estrategia comercial; conexiones con clientes potenciales y redes de inversión; y una estructura de trabajo que acelere la ejecución.

### Cómo puede contribuir startuplab.01

- Conseguir clientes
- Conseguir inversionistas
- Acceso a redes relevantes
- Acceder a mercados internacionales

---

## 17) Resumen para carga final

Esta versión responde el formulario sobre la base del estado actual del proyecto Kittypau y de toda su documentación activa. No usa el borrador de una postulación anterior como fuente principal, sino la narrativa viva, la evidencia técnica, el modelo de negocio y la estructura real del proyecto hoy.

