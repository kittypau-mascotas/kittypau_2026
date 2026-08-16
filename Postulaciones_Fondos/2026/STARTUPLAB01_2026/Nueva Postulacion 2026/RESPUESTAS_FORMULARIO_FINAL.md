# startuplab.01 — Respuestas finales para el formulario Airtable
## Kittypau — IOT CHILE SpA — 2026

> Versión consolidada lista para copiar al formulario.
> Fuente primaria: version_mauro_postulacion_2026.md + respaldo técnico: 01_RESPUESTAS_POSTULACION_2026.md
> Última actualización: 2026-05-04

---

## Sección 1 — Identificación y Contacto

**1. Nombre de la startup**
Kittypau

**2. Razón social**
IOT CHILE SpA

**3. País de origen**
Chile

**4. Sitio web**
https://kittypau-app.vercel.app

**5. Estado legal**
Persona Jurídica (SpA)

**6. Nombre completo del contacto principal**
Mauricio Cristian Cárcamo Díaz

**7. RUT del contacto principal**
17402237-2

**8. Correo electrónico**
mauro.carcamo89@gmail.com

**9. Teléfono**
+56 9 9038 1919

---

## Sección 2 — Tecnología y Problema

**10. Descripción general de la startup**

Kittypau es una startup chilena que creó una nueva forma de cuidar a las mascotas a través de tecnología inteligente. Nuestro ecosistema AIoT (IA + IoT) se conforma por un plato inteligente junto con una aplicación web.

El plato utiliza sensores y un microcontrolador para detectar, enviar y manejar la información sobre la alimentación, hidratación y condiciones del entorno de la mascota. Estos datos, junto con las características individuales de cada mascota, se analizan mediante modelos estadísticos que permiten identificar patrones y generar insights sobre su comportamiento y estado de salud.

Toda esta información se traduce en la app en mensajes, gráficos y cuadros simples, claros y fáciles de entender, para que cualquier persona pueda tomar mejores decisiones sobre el cuidado de su mascota. Dependiendo del plan que elija el usuario, la aplicación ofrece distintos niveles de análisis, incluyendo alertas tempranas y monitoreo más avanzado, ayudando a detectar cambios importantes en la rutina o posibles señales de alerta en la salud de la mascota.

---

**11. Problema** *(máx. 100 palabras)*

Hoy, los dueños de mascotas no tienen visibilidad real sobre los hábitos diarios de alimentación e hidratación de sus animales. Los cambios importantes suelen detectarse demasiado tarde: cuando el plato permanece intacto por horas, cuando la ingesta disminuye de forma evidente o cuando ya aparecen síntomas clínicos. Esta falta de información continua convierte el cuidado en un proceso reactivo en lugar de preventivo. Como consecuencia, aumentan las consultas de urgencia que podrían haberse evitado y se ve afectada directamente la calidad de vida de la mascota.

---

**12. Solución y principios científicos o ingenieriles fundamentales**

Kittypau es una plataforma AIoT de monitoreo de alimentación e hidratación de mascotas. El dispositivo KPCL integra una celda de carga con amplificador HX711 para medición de peso con filtro EMA sobre el ADC, sensor AHT10 para temperatura y humedad, y sensor BH1750 para luz ambiental. El microcontrolador ESP32-C3 procesa las lecturas y las transmite por MQTT/TLS sobre WiFi a un broker cloud. Un bridge en Node.js recibe los datos, los persiste en PostgreSQL/Supabase y ejecuta un procesador de estado que detecta sesiones de consumo. Sobre esos datos opera un pipeline de Machine Learning (LightGBM con SMOTE y calibración isotónica) que clasifica el comportamiento en tiempo real: los modelos alcanzan AUC-ROC 0.90 y Macro F1 0.67, superando los umbrales de producción definidos. La app web en Next.js presenta el dashboard, el historial y las alertas al usuario final en un formato simple y accionable.

---

**13. ¿Por qué ahora es el momento adecuado para esta solución?**

Hoy convergen varias tendencias tecnológicas y sociales que hacen posible —y necesaria— una solución como Kittypau.

El vínculo entre humanos y mascotas ha evolucionado: las mascotas ya no son solo compañía, sino parte del núcleo familiar. Este cambio, junto con la baja en la natalidad y el aumento en la adopción de animales, ha elevado las expectativas sobre su cuidado. Al mismo tiempo, el cuidado cotidiano sigue siendo mayormente intuitivo y reactivo, sin acceso a datos objetivos que permitan anticipar problemas.

Desde el punto de vista tecnológico, hoy contamos con condiciones que antes no estaban maduras: sensores IoT accesibles y de bajo costo, conectividad WiFi estable en el hogar, infraestructura cloud escalable y herramientas de inteligencia artificial aplicables a problemas reales. Además, los usuarios están cada vez más familiarizados con apps que monitorean su propia salud, lo que facilita la adopción de soluciones similares para sus mascotas.

Kittypau no proyecta esta convergencia: ya opera en producción con usuarios reales y datos capturados. El momento de escalar es ahora.

---

**14. Describe a tu cliente ideal**

Nuestro cliente ideal es el dueño de mascota urbano en Chile, entre 25 y 45 años, digitalmente activo, con ingresos medios a medios-altos, que considera a su perro o gato parte de la familia y valora las decisiones preventivas sobre las reactivas. En su mayoría son personas con jornada laboral que las aleja del hogar durante el día y que carecen de visibilidad sobre los hábitos de su mascota mientras no están presentes. Un segundo segmento relevante son clínicas veterinarias y comercios pet medianos que buscan diferenciarse ofreciendo tecnología de monitoreo como servicio complementario a sus clientes.

---

**15. ¿Cuál es tu estrategia go-to-market para llegar a este cliente?**

Nuestra estrategia se enfoca en un modelo híbrido B2C y B2B2C.

Para el segmento B2C: venta del dispositivo inicialmente online a través de nuestra plataforma web y redes sociales (Instagram, TikTok), con envío a domicilio. A futuro, expansión a puntos de venta físicos en pet shops y clínicas. Suscripción freemium con versión básica gratuita y versión de pago para análisis avanzado, historial longitudinal y alertas personalizadas. Marketing digital con contenido en video y colaboraciones con referentes del sector pet.

Para el segmento B2B2C: contacto directo con actores del sector para acuerdos de distribución y alianzas estratégicas. Integración de Kittypau como herramienta de fidelización y monitoreo complementario para clientes de clínicas. Participación en ferias y eventos del sector pet.

---

## Sección 3 — Madurez Tecnológica

**16. Madurez tecnológica**
TRL 5

---

**17. Justifique el TRL indicado**

El sistema Kittypau está desplegado en entorno doméstico real y en uso activo con más de un usuario. El flujo completo extremo a extremo ha sido probado y validado en producción:

sensor HX711 + sensores ambientales → firmware ESP32-C3 → MQTT/TLS sobre WiFi → bridge Node.js → API → PostgreSQL/Supabase → pipeline de Machine Learning → app web con dashboard y alertas

Los dispositivos KPCL0034 y KPCL0036 operan en el hogar de un primer usuario real —Bandida, gata, 4 años— capturando datos continuos en condiciones cotidianas: variabilidad de WiFi doméstico, ciclos de encendido y apagado, y comportamiento real de la mascota. El dispositivo KPCL0051 opera de forma independiente en el hogar de un segundo usuario, validando la replicabilidad del sistema en un entorno diferente. En total, 3 dispositivos físicos desplegados en campo, lo que supera el criterio mínimo de TRL 5.

El firmware incorpora filtro EMA sobre el ADC para compensar interferencia del radio WiFi, con calibración y credenciales persistentes en LittleFS y actualización remota OTA sin retiro físico del dispositivo.

Sobre los datos capturados se construyó y validó un pipeline analítico con ~97.000 lecturas reales, 19 días de captura continua y 202 etiquetas supervisadas por humanos. Los modelos LightGBM entrenados superan los umbrales de producción definidos:

- Modelo A (binario activo/reposo): AUC-ROC 0.9024 ✅ — umbral ≥ 0.85
- Modelo B (multiclase alimentación/servido/reposo): Macro F1 0.6712 ✅ — umbral ≥ 0.60

El sistema no solo captura datos: los transforma en predicciones de comportamiento con calidad analítica suficiente para informar alertas en la app. El siguiente paso es escalar hacia un piloto con 5–10 dispositivos activos en hogares distintos, puente explícito hacia TRL 6.

---

## Sección 4 — Validación Comercial y Financiamiento

**18. Validación con clientes**

Tenemos usuarios activos usando el producto (sin pago formal). Contamos con un usuario activo (dispositivo KPCL0051) operando el sistema en entorno doméstico real desde su despliegue. El dispositivo captura datos de consumo de alimento, hidratación y variables ambientales. El usuario interactúa con el dashboard web, tiene un acuerdo de uso piloto firmado y ha entregado feedback cualitativo sobre el valor percibido del sistema. Estamos en contacto con potenciales clientes del segmento B2C y clínicas veterinarias para cartas de intención.

---

**19. ¿La startup genera ingresos actualmente?**

No. Kittypau está en fase de validación técnica pre-revenue. El foco actual es consolidar el primer piloto controlado con evidencia documentada de adopción y valor antes de activar el modelo de ingresos.

---

**20. Financiamiento recibido**

- Tipo: Privado
- Instrumento: Recursos propios de los fundadores — USD 304 invertidos en componentes electrónicos, materiales de hardware, bridge local y desarrollo del sistema. Equivale a más de 600 horas de trabajo técnico de los fundadores no monetizadas.

---

**21. ¿Está actualmente en proceso de levantamiento de capital?**

Sí. Planificamos iniciar un proceso formal de levantamiento de capital semilla dentro de los próximos 6 meses, una vez concluida la fase de piloto con early adopters y con métricas de retención documentadas.

---

## Sección 5 — Equipo

**22. Número total de fundadores**
2

**23. Dedicación del equipo fundador**

Dedicación parcial con disponibilidad para transición a tiempo completo durante la residencia. Ambos fundadores están activamente involucrados en el desarrollo del proyecto y disponibles para estar presencialmente en Santiago durante todo el período de la residencia.

**24. Número total de empleados (incluyendo fundadores)**
2

**25. Número de mujeres en posición de liderazgo**
0

---

**26. Información fundadores**

Fundador 1
- Nombre completo: Javier Dayne Ortiz
- Rol en la startup: CTO y cofundador
- Formación y experiencia: Ingeniero en Automatización y Control Industrial, Diplomado en Dirección de Proyectos y PMO. 15+ años en DCS, SCADA, IIoT y MQTT. Lidera hardware, firmware (ESP32-C3), bridge local y arquitectura técnica del sistema.

Fundador 2
- Nombre completo: Mauricio Cristian Cárcamo Díaz
- Rol en la startup: CEO y cofundador
- Formación y experiencia: Sociólogo, Diplomado en Data Science, Diplomado en Inteligencia Artificial. 6+ años en análisis de datos, gestión de proyectos y estrategia comercial. Lidera negocio, producto, analítica y coordinación de postulaciones.

---

**27. Funciones cubiertas por el equipo fundador**

I+D y desarrollo tecnológico, operaciones, ventas y relaciones comerciales iniciales, finanzas y control de costos, data y software, analítica de producto.

---

**28. Principal brecha de competencias del equipo (máx. 50 palabras)**

Las principales brechas están en regulación de hardware de consumo doméstico y escalamiento comercial B2B en el canal veterinario y retail pet. Adicionalmente, reconocemos la ausencia de perspectiva femenina en el equipo fundador en un mercado donde la mayoría de las decisiones de compra pet son tomadas por mujeres.

---

## Sección 6 — Impacto

**29. Sector(es) de contribución principal**
Entorno construido / urbanización · Salud y bienestar

**30. Área de acción principal**
Monitoreo y prevención

---

**31. ¿La solución beneficia directa o indirectamente a poblaciones vulnerables?**

Sí, de forma indirecta. Kittypau puede reducir el gasto veterinario de emergencia en hogares de ingresos medios-bajos mediante la detección temprana de problemas de alimentación e hidratación. Una consulta de urgencia veterinaria en Chile tiene un costo promedio de CLP 30.000–80.000, monto que representa una carga significativa para familias en ese segmento. La alerta temprana permite al dueño actuar antes de que el problema escale, reduciendo ese gasto y mejorando el bienestar del animal.

---

## Sección 7 — Selección de Residencia

**32. Tipo de Residencia solicitada**

Residencia Plus — 12 meses. El acceso 24/7 al laboratorio es clave para Kittypau dado el trabajo con hardware IoT. La calibración de sensores, pruebas de estrés del dispositivo KPCL, montaje y validación de nuevas versiones de hardware requieren disponibilidad flexible, no acotada a horarios fijos. Los 12 meses permiten además acceder a los programas internacionales de aceleración.

**33. Número de puestos de laboratorio requeridos**
1

**34. Número de puestos de cowork requeridos**
2

**35. Fecha estimada de inicio**
08/01/2026

**36. Frecuencia estimada de uso (días por mes)**
10

**37. Tipo de laboratorio**

Dry Lab. Kittypau no requiere Wet Lab. El trabajo es electrónico y de software: ensamblaje de hardware IoT, calibración de sensores (HX711, AHT10, BH1750), pruebas de firmware (ESP32-C3, ESP8266), integración de sistemas y validación de conectividad MQTT.

**38. Interés en programas de aceleración**

Sí, en ambos programas (Hello Tomorrow y Futuro Perfecto). Hello Tomorrow es relevante por el foco en deep tech con impacto; Futuro Perfecto por el enfoque en escalamiento en América Latina. Ambos complementan las brechas actuales del equipo en validación comercial internacional y conexiones con capital de riesgo.

---

## Sección 8 — Compatibilidad con startuplab.01

**39. Seleccione las 3 áreas donde requiere más apoyo**

1. Validación técnica y desarrollo de prototipos (acceso a Dry Lab para prueba de hardware IoT).
2. Desarrollo de modelo de negocio y estrategia comercial (escalamiento B2B en canal veterinario y retail pet).
3. Conexiones con clientes potenciales y preparación para levantamiento de capital semilla.

**40. Disponibilidad de relocalización a Santiago**

Sí. Ambos fundadores tienen disponibilidad para estar presencialmente en Santiago durante todo el período de la residencia.

---

**41. ¿Qué esperas de la residencia en startuplab.01? (máx. 150 palabras)**

Esperamos acelerar la transición desde la validación técnica interna hacia un piloto controlado con evidencia real de adopción y valor. Necesitamos acceso a infraestructura Dry Lab para prueba y calibración de hardware, mentoría especializada en modelo de negocio y estrategia comercial B2B, y conexiones con clínicas veterinarias, actores del sector pet y redes de inversión seed. Al finalizar la residencia, el objetivo concreto es tener una cohorte de 5 a 10 usuarios activos documentada, al menos 2 alianzas formales con actores del sector y un proceso de levantamiento de capital semilla iniciado. startuplab.01 ofrece exactamente la combinación de infraestructura, red y acompañamiento que Kittypau necesita para dar ese salto sin aumentar el burn rate.

---

**42. ¿Cómo te enteraste de la Residencia?**
⚠️ PENDIENTE — completar antes de enviar.

---

## Sección 9 — Declaración y Consentimiento

Toda la información proporcionada es precisa y completa. ✅
Entiendo que startuplab.01 no toma equity de las startups participantes. ✅
Consiento el procesamiento de datos para efectos de evaluación y seguimiento. ✅
Consiento la distribución de datos no sensibles con los socios fundadores de startuplab.01. ✅
Acepto ser contactado/a para comunicaciones relacionadas con startuplab.01. ✅
Acepto ser contactado/a para fines de evaluación independiente del ecosistema. ✅
