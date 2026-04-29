# startuplab.01 — Respuestas de postulación 2026

Proyecto: **Kittypau**  
Empresa: **IOT CHILE SpA**  
Paquete: **Nueva Postulacion 2026**

Este documento responde el formulario de postulación tomando como referencia la estructura del PDF de Airtable, el estado técnico actual y la documentación completa del proyecto.

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

Los dueños de mascotas no tienen visibilidad sobre los hábitos reales de alimentación e hidratación de su animal. En la práctica, los problemas se detectan tarde: cuando el plato lleva horas sin tocarse, cuando la ingesta cambió de forma visible o cuando ya aparecen síntomas clínicos. Esa falta de datos diarios convierte el cuidado en reactivo, aumenta el riesgo de consultas de urgencia evitables y reduce la calidad de vida de la mascota.

### Solución

Kittypau es una plataforma AIoT para monitoreo de alimentación e hidratación de mascotas. Integra hardware IoT, bridge local, backend cloud y dashboard web para convertir lecturas de consumo y variables del entorno en métricas accionables, alertas tempranas e historial longitudinal.

La capa de valor no es la dispensación automatizada. Es la inteligencia sobre hábitos reales: cambios en frecuencia, duración, cantidad consumida, patrón horario y contexto ambiental. Esa combinación permite detectar desvíos de conducta y apoyar decisiones preventivas antes de que aparezca el síntoma.

### Base técnica

La arquitectura está desplegada y en uso activo:
- Dispositivo IoT KPCL con sensores de peso, ambiente y luz.
- Transporte por MQTT sobre WiFi.
- Bridge local en Python con reconexión automática.
- Persistencia en PostgreSQL/Supabase con series temporales.
- App web con dashboard, alertas y visualización histórica.

Ese stack sitúa a Kittypau en un nivel de madurez real, no proyectado: datos reales capturados, flujo extremo a extremo validado y usuario activo operando el sistema.

---

## 3) Nivel de madurez tecnológica

**TRL 5 — Tecnología validada en entorno relevante**

### Justificación

- Concepto formulado, operacionalizado y desplegado.
- Hardware producido y funcionando en entorno doméstico real.
- Flujo completo probado: sensor → MQTT → bridge → API → DB → app.
- Datos reales capturados con un usuario activo (dispositivo KPCL0051).
- Firmware estable con filtros EMA para ADC y autonomía de batería validada.
- El siguiente paso es piloto con múltiples usuarios y métricas de retención.

### Sector de contribución climática

- **Sector principal:** Entorno construido / urbanización
- **Área de acción:** Monitoreo y prevención

### Mecanismo de impacto climático

El impacto de Kittypau es preventivo y cuantificable. Opera en dos ejes:

**Eje 1 — Reducción de desplazamientos urbanos de urgencia.**  
Una alerta temprana de cambio en los hábitos de la mascota permite al dueño actuar antes de que el problema escale a consulta de urgencia. En Chile existen aproximadamente 4,8 millones de mascotas domésticas (gatos y perros). Si el monitoreo preventivo evita una visita de urgencia al año en el 10% de los usuarios activos, con un desplazamiento promedio de 15 km urbanos por visita, el impacto en emisiones es calculable y reportable como métrica de seguimiento.

**Eje 2 — Optimización del uso de alimento.**  
El monitoreo de consumo real permite detectar sobreingesta, subalimentación y cambios de apetito antes de que generen desperdicio acumulado. Un usuario que ajusta la cantidad servida según datos reales reduce el desperdicio de alimento y la generación de envases asociada al ciclo de compra ineficiente.

**Métrica de seguimiento para reportes:**  
"Visitas veterinarias de urgencia evitadas estimadas por cohorte activa" y "desviación de consumo detectada antes de síntoma clínico declarado por el usuario".

---

## 4) Equipo fundador

- **Número total de cofundadores:** 2
- **Equipo con capacidades complementarias:** Sí
- **Número de fundadores con formación científica o técnica relevante:** 1
- **Número de fundadores con experiencia comercial/emprendimiento:** 2
- **Número de mujeres en liderazgo:** 0

### Javier Dayne Ortiz — CTO y cofundador

- Ingeniero en Automatización y Control Industrial
- Diplomado en Dirección de Proyectos y PMO
- 15+ años de experiencia en DCS, SCADA, IIoT y MQTT
- Desarrolla hardware, firmware (ESP32-C3), bridge local y arquitectura del sistema completo

### Mauricio Cristian Cárcamo Díaz — CEO y cofundador

- Sociología, Diplomado en Data Science, Diplomado en Inteligencia Artificial
- 6+ años en análisis de datos, gestión de proyectos y estrategia comercial
- Lidera negocio, producto, analítica y coordinación de la postulación

### Brechas y cobertura

Las brechas identificadas están en:
- Regulación de hardware de consumo.
- Escalamiento comercial B2B en canal veterinario.
- Diversidad de género en liderazgo: el equipo actual es 100% masculino en un mercado donde las decisiones de compra pet están lideradas en mayor proporción por mujeres. Esta brecha es reconocida y motiva la búsqueda activa de una tercera voz femenina en roles de producto o comercial.

La residencia aporta mentoría, conexiones y estructura para cerrar las dos primeras brechas. La tercera es responsabilidad del equipo.

---

## 5) Mercado objetivo

### Perfil del cliente ideal

Segmento principal B2C: dueño de mascotas urbano, especialmente de gatos y perros, entre 25 y 45 años, digitalmente activo, con ingresos medios a medios-altos, que considera a su mascota parte de la familia y valora soluciones preventivas sobre reactivas.

Segmento secundario B2B2C: clínicas veterinarias y comercios pet pequeños y medianos que pueden usar Kittypau como herramienta de fidelización, monitoreo complementario y diferenciación de servicio frente a competidores sin tecnología.

### Validación del problema

El problema ha sido validado con:
- Usuario activo operando un dispositivo KPCL en entorno doméstico real (KPCL0051), con datos de consumo y eventos capturados desde el despliegue.
- Pruebas internas del prototipo en condiciones de uso cotidiano.
- Documentación técnica con métricas de uso, eventos y alertas generadas.
- Feedback cualitativo del usuario inicial sobre valor percibido y comportamiento del sistema.
- Proceso de obtención de cartas de intención con potenciales clientes del segmento B2C y B2B2C.

### Por qué ahora

El cuidado de mascotas se está digitalizando. El mercado busca soluciones preventivas, no solo conveniencia. La infraestructura IoT/cloud actual permite desplegar telemetría y analítica con costos iniciales razonables. Kittypau ya tiene prototipo funcional, base técnica operativa y un usuario real generando datos. El momento de escalar desde validación interna a piloto controlado es ahora.

### Principal ventaja técnica diferenciadora

Kittypau integra hardware IoT, trazabilidad histórica y capa analítica para detectar desvíos de hidratación y alimentación con contexto ambiental. La barrera competitiva no es el hardware aislado —eso es replicable—, sino los datos longitudinales y las reglas de interpretación que se acumulan con el uso real. Un competidor puede copiar el sensor; no puede copiar el aprendizaje operacional acumulado sobre patrones de comportamiento real.

---

## 6) Beneficio a poblaciones vulnerables

**Sí**

Kittypau puede reducir el gasto veterinario de emergencia en hogares de ingresos medios-bajos mediante detección temprana de problemas de alimentación e hidratación. Una consulta de urgencia veterinaria en Chile tiene un costo promedio de CLP 30.000–80.000, monto que representa una carga significativa para familias en ese segmento. La alerta temprana de Kittypau permite al dueño actuar antes de que el problema escale, reduciendo ese gasto y mejorando el bienestar de la mascota sin depender de infraestructura veterinaria de emergencia.

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

**Hito 1 — Meses 1 a 4: Estabilización técnica y preparación de piloto**

Cierre de la versión piloto de hardware y firmware con estabilidad de captura y envío de datos en arquitectura productiva. Entregables: dispositivo KPCL estable con batería autónoma validada, bridge operativo 24/7, app con lectura en tiempo real y dashboard con alertas configurables. Segunda unidad KPCL desplegada con nuevo usuario en piloto controlado.

**Hito 2 — Meses 5 a 9: Piloto con early adopters y validación de propuesta de valor**

Ejecución del piloto con entre 5 y 10 usuarios activos, seguimiento de métricas de adopción, uso recurrente y calidad de datos para validar propuesta de valor. Entregables: cohorte documentada, métricas de retención, tasa de alertas útiles y feedback estructurado. Al menos 2 cartas de intención de clínicas veterinarias o comercios pet.

**Hito 3 — Meses 10 a 12: Preparación de lanzamiento y levantamiento de capital**

Pricing de hardware más suscripción validado con usuarios reales, activación de alianzas con clínicas y actores pet, deck y materiales de inversión listos, readiness para levantamiento de capital semilla.

---

## 10) Riesgos principales

### Riesgo técnico — Variabilidad en precisión y durabilidad del hardware

El hardware en uso doméstico intensivo puede presentar variabilidad en sensores, problemas de conectividad WiFi o degradación de batería.

**Mitigación:** Pruebas de estrés, calibración de sensores (filtros EMA en ADC), selección de componentes alternativos documentada y protocolo de reemplazo para la fase de piloto.

### Riesgo de mercado — Adopción lenta o churn alto

Los usuarios pueden no percibir el valor en los primeros días de uso.

**Mitigación:** Onboarding guiado enfocado en la primera alerta útil como momento de activación. El sistema está diseñado para entregar valor desde el primer evento detectado, no desde una acumulación de datos.

### Riesgo operativo-financiero — Crecimiento de costos antes de escalar ingresos

Costos cloud, soporte y materiales pueden crecer antes de que los ingresos los cubran.

**Mitigación:** Monitoreo de costo unitario por dispositivo activo, optimización de arquitectura cloud (Supabase tier controlado) y control de burn rate con modelo bootstrapped.

### Riesgo regulatorio y de datos

Manejo inadecuado de datos personales de usuarios.

**Mitigación:** Políticas de privacidad publicadas, autenticación por tokens JWT, control de accesos por rol y sin venta ni transferencia de datos a terceros.

---

## 11) Propiedad intelectual

- **Solicitudes de patente presentadas:** 0
- **Patentes concedidas:** 0
- **Patentes provisionales:** 0
- **Publicaciones científicas relacionadas:** 0

### Estrategia de PI

La estrategia actual prioriza el secreto industrial sobre la patente de hardware. En un mercado de IoT que evoluciona rápido, la barrera más eficiente es la acumulación de datos longitudinales de comportamiento animal, las reglas de interpretación propietarias y el know-how operativo que se construye con uso real. Esos activos no son replicables por un competidor que copie el hardware.

En paralelo, se está evaluando la viabilidad de una patente de utilidad sobre el método de detección de desvíos de comportamiento a partir de series temporales de peso y variables ambientales combinadas. Si la residencia incluye asesoría de PI, ese análisis sería uno de los primeros deliverables.

### Competidores principales

**Directos:** PetKit, SureFeed y Sure Petcare — automatizan dispensación, algunos conectados, ninguno con analítica longitudinal de comportamiento.

**Indirectos:** Dispensadores sin conectividad, apps manuales de registro y wearables no enfocados en hábitos de alimentación e hidratación.

### Diferenciación de Kittypau

Los competidores resuelven la conveniencia. Kittypau resuelve la visibilidad: genera inteligencia sobre hábitos reales con datos longitudinales, contexto ambiental y capacidad de evolucionar a analítica predictiva. Esa diferencia no es de features; es de posición estratégica.

---

## 12) Perfiles clave

### Mauricio Cristian Cárcamo Díaz — CEO y cofundador

- Sociología, Diplomado en Data Science, Diplomado en Inteligencia Artificial
- 6+ años en análisis de datos, gestión de proyectos y estrategia comercial
- Lidera negocio, producto, analítica y coordinación de la postulación

### Javier Dayne Ortiz — CTO y cofundador

- Ingeniería en Automatización y Control Industrial
- 15+ años en automatización industrial, IIoT y MQTT
- Desarrolla hardware, firmware (ESP32-C3), bridge local y arquitectura del sistema

### Funciones cubiertas

- I+D / desarrollo tecnológico
- Operaciones y soporte
- Ventas y relaciones comerciales iniciales
- Finanzas y control de costos
- Data, software y analítica

### Funciones a reforzar durante la residencia

- Regulación de hardware de consumo
- Escalamiento comercial B2B en canal veterinario
- Incorporación de perspectiva femenina en producto y comercial

---

## 13) Posición financiera

- **Capital total levantado hasta la fecha:** USD 304
- **Número de rondas previas:** 0
- **Ingresos acumulados últimos 12 meses:** 0
- **Ventas último año:** 0
- **Clientes recurrentes que pagan:** 0
- **Burn rate mensual actual:** USD 1 real (costos cloud mínimos)
- **Runway estimado:** 36 meses

### Contexto del capital

USD 304 en capital externo, con trabajo técnico de los fundadores equivalente a más de 600 horas de desarrollo. El modelo ha sido bootstrapped intencionalmente: el objetivo fue llegar a la residencia con validación técnica real, sin deuda y sin dilución prematura. Lo que se ha construido con ese capital —hardware funcional, firmware estable, bridge local, backend cloud, app web y base de datos con datos reales— es el activo concreto que Kittypau presenta como evidencia de ejecución.

### Modelo económico

- Ingreso inicial por hardware (venta del dispositivo KPCL).
- Suscripción para alertas avanzadas y analítica longitudinal.
- Opción futura de data insights anonimizados para veterinarias y sector pet.

---

## 14) Posición de mercado

### Perfil cliente ideal

Segmento principal B2C: dueños de mascotas en zonas urbanas de Chile, entre 25 y 45 años, digitalmente activos, con ingresos medios a medios-altos y foco en salud preventiva.

Segmento secundario B2B2C: clínicas veterinarias y comercios pet pequeños y medianos.

### Ventaja competitiva sostenible

La ventaja de Kittypau es acumulativa: datos longitudinales, reglas de interpretación y mejora continua del modelo de detección. Un competidor puede copiar el hardware; no puede copiar el aprendizaje operacional ni la base de comportamiento acumulada con uso real. A mayor cantidad de usuarios activos, más preciso el sistema y más difícil de replicar.

- **Algún cofundador ha fundado otras startups:** No
- **Promedio de años de experiencia en la industria principal:** 10
- **Número total de empleados excluyendo cofundadores:** 0
- **Búsqueda de financiamiento:** Planificada dentro de los próximos 6 meses

---

## 15) Alineación con startuplab.01

### Necesidades prioritarias

- Validación técnica con usuarios reales y Dry Lab para prueba de hardware
- Desarrollo del modelo de negocio y estrategia comercial B2B
- Conexiones con clínicas veterinarias y actores del sector pet
- Preparación para levantamiento de capital semilla
- Estrategia de propiedad intelectual
- Navegación regulatoria para hardware de consumo
- Mentoría en escalamiento comercial

### Ajuste con la residencia

Kittypau encaja con startuplab.01 porque necesita Dry Lab, está en TRL 5 compatible con el programa, requiere acompañamiento técnico y comercial, tiene un usuario activo real y puede demostrar progreso concreto durante la residencia. No llegamos con una idea: llegamos con hardware funcionando y datos reales.

---

## 16) Expectativas de la residencia

Esperamos acelerar la transición desde validación técnica interna hacia un piloto controlado con evidencia real de adopción y valor. Buscamos mentoría en hardware, modelo de negocio y estrategia comercial; conexiones con veterinarias, comercios pet y redes de inversión; y una estructura de trabajo que acelere la ejecución sin aumentar el burn rate.

El resultado esperado al terminar la residencia es: cohorte de 5–10 usuarios activos documentada, al menos 2 alianzas con actores del sector, deck de inversión listo y proceso de levantamiento capital semilla iniciado.

### Cómo puede contribuir startuplab.01

- Acceso a primeros clientes del sector pet y veterinario
- Conexiones con inversionistas seed en deep tech / IoT
- Mentoría en escalamiento B2B y regulación de hardware
- Infraestructura Dry Lab para prueba y calibración de hardware
- Red de startups y pares para feedback de producto

---

## 17) Resumen para carga final

Esta versión responde el formulario desde el estado actual real del proyecto Kittypau: hardware desplegado, datos capturados, usuario activo y equipo con ejecución técnica demostrada. La narrativa es consistente con la evidencia disponible y con los entregables que se pueden demostrar durante la residencia.

Los puntos más fuertes de esta postulación son la madurez técnica real (TRL 5 con evidencia), la complementariedad del equipo y la claridad del cronograma. Los puntos que requieren refuerzo antes de la carga son la documentación de evidencia comercial (carta de uso activo KPCL0051) y los materiales de presentación (deck y video pitch).
