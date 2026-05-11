# Kittypau — Respuestas Postulación CORFO Semilla Inicia RM 2026
**Última actualización:** 2026-05-11
**Entidad postulante:** IOT CHILE SpA
**Instrumento:** Semilla Inicia — Convocatoria Región Metropolitana 2026
**Monto solicitado:** $15.000.000 CLP (subsidio no reembolsable)
**Cierre:** 29 de mayo 2026

> ⚠️ Las respuestas marcadas con `[CONFIRMAR]` requieren verificación antes de enviar.
> ⚠️ Las marcadas con `[CRÍTICO]` son bloqueantes de admisibilidad.

---

## PRE-VERIFICACIÓN DE ADMISIBILIDAD

> **Antes de completar el formulario, confirmar estas dos condiciones. Si alguna falla, la postulación es inadmisible.**

| Condición | Requisito | Estado |
|---|---|---|
| Iniciación actividades SII | Posterior al **30-oct-2024** (< 18 meses desde 30-abr-2026) | `[CRÍTICO — CONFIRMAR]` |
| Sin ventas facturadas | Sin ingresos hasta **marzo 2026 inclusive** | `[CRÍTICO — CONFIRMAR]` |
| Sin Semilla Inicia previo | Primera postulación al instrumento | ✅ |
| Sin deudas tributarias/previsionales | Declaración jurada requerida | `[CONFIRMAR]` |
| Focalización RM | Ciudades inteligentes — Kittypau IoT urbano encaja | ✅ |
| Equipo mínimo | 2 personas (Javier + Mauricio) | ✅ |

---

## SECCIÓN 1 — Datos del Proyecto

**Nombre del proyecto:**
→ **Kittypau — Plataforma AIoT de monitoreo preventivo de salud para mascotas domésticas**

**Nombre del emprendimiento / empresa:**
→ **IOT CHILE SpA** (nombre fantasía: Kittypau)

**Región de ejecución:**
→ **Región Metropolitana** (Santiago)

**Duración del proyecto:**
→ **10 meses**

**Monto solicitado a CORFO:**
→ **$15.000.000 CLP** (75% del costo total)

**Aporte propio del emprendedor:**
→ **$5.000.000 CLP** (25% del costo total; valoración en trabajo y costos operativos ya incurridos)

**Costo total del proyecto:**
→ **$20.000.000 CLP**

---

## SECCIÓN 2 — Descripción del Problema u Oportunidad

> Los dueños de mascotas domésticas en Santiago no tienen acceso a herramientas digitales objetivas para monitorear los hábitos alimentarios e hídricos de sus animales. Los cambios en el consumo de alimento y agua son la primera señal clínica de enfermedades como insuficiencia renal, diabetes e hipertiroidismo en gatos y perros, pero solo se detectan cuando hay sintomatología visible, cuando ya es tarde y el tratamiento es más costoso.
>
> En Chile hay aproximadamente 4,8 millones de mascotas domésticas (INE), con alta concentración en hogares urbanos de la Región Metropolitana. El gasto per cápita en mascotas es el más alto de LATAM (Euromonitor 2024), pero las herramientas disponibles son 100% importadas, sin soporte local, sin análisis de comportamiento y sin integración con el ecosistema veterinario chileno.
>
> El problema es medible: una consulta veterinaria de urgencia en Santiago cuesta $60.000–$100.000 CLP vs. $25.000–$40.000 una consulta programada. La detección preventiva tiene impacto directo en el bolsillo del dueño y en la calidad de vida del animal.

**Alineación con los ejes del CDPR Metropolitano 2026 (fuente: ANEXO N1 oficial):**

| Eje | Tipo | Alineación Kittypau |
|---|---|---|
| **Emprendimiento orientado a ciudades inteligentes y encadenamientos productivos** | Estratégico (nuestro eje) | ✅ IoT doméstico urbano + encadenamiento productivo local (HW+FW+SW+ML desarrollado en Chile) |
| **Transformación Digital con Foco en Tecnologías Disruptivas** | Transversal | ✅ AIoT + Machine Learning aplicado a salud animal preventiva |
| **Desarrollo de Ciudades y Territorios Inteligentes** | Transversal | ✅ Dispositivo conectado que aporta inteligencia a hogares urbanos de Santiago |
| **Sustentabilidad y Resiliencia** | Transversal | ✅ Reducción desperdicio de alimento, hardware durable sin baterías de descarte |

> Kittypau es un dispositivo IoT doméstico que transforma hogares urbanos de Santiago en espacios de monitoreo inteligente de salud animal. La plataforma conecta sensores físicos (hardware KPCL) con analítica en la nube para generar inteligencia accionable en tiempo real. El proyecto se alinea directamente con el eje estratégico del CDPR RM 2026 al impulsar un emprendimiento dinámico con innovación aplicada a ciudades inteligentes, y con dos ejes transversales (transformación digital con tecnologías disruptivas + ciudades y territorios inteligentes). Además, fortalece el encadenamiento productivo local al desarrollar hardware, firmware, software y modelos ML íntegramente en Chile, generando valor y oportunidades tecnológicas locales.

---

## SECCIÓN 3 — Propuesta de Valor / Descripción del Producto o Servicio

> Kittypau es una plataforma AIoT (Artificial Intelligence of Things) de monitoreo preventivo para mascotas domésticas. A través de un plato inteligente conectado (hardware KPCL), capturamos en tiempo real el consumo de alimento, agua y datos del entorno de gatos y perros. Nuestros modelos de machine learning verifican ciclos de hábitos, detectan anomalías en el comportamiento alimentario y generan análisis diarios por mascota, antes de que cualquier cambio se convierta en un problema de salud visible. El dueño accede desde su cuenta —web o app— a tendencias históricas, alertas personalizadas y reportes que lo ayudan a tomar mejores decisiones y practicar una tenencia más responsable.

**Componentes del sistema:**

1. **Hardware KPCL (Plato inteligente IoT):** Dispositivo basado en ESP32-C3 con celdas de carga de alta precisión (±0,1g), sensor ambiental DHT22 (temperatura/humedad) y conectividad WiFi. Firmware en C++ (ESP-IDF/Arduino). BOM: USD 15,70. Precio venta: USD 50 (~$47.000 CLP).

2. **Bridge local:** Middleware Python/Node.js que gestiona la comunicación MQTT entre el dispositivo y la nube (HiveMQ Cloud + Supabase). Garantiza operación offline y sincronización.

3. **Plataforma cloud + IA:** Backend Next.js/Supabase con API REST. Modelos LightGBM para detección de eventos de alimentación e hidratación. Dashboard web con curvas de peso, tendencias y reportes exportables.

**Diferenciación clave:**
> Ninguna solución disponible en Chile combina: (1) hardware de medición propio desarrollado localmente, (2) analítica longitudinal de comportamiento alimentario, (3) alertas preventivas basadas en IA, y (4) contexto ambiental integrado. Somos el primer jugador Pet Tech IoT con tecnología desarrollada íntegramente en Chile para el mercado hispanohablante.

---

## SECCIÓN 4 — Grado de Innovación

**¿Por qué es innovador respecto al mercado actual?**

> Las soluciones existentes (PetKit, SureFeed, apps de registro manual) automatizan la entrega de alimento o dependen del ingreso manual de datos por el dueño. Ninguna captura el consumo real con sensores de precisión y lo analiza longitudinalmente con modelos de comportamiento. La innovación de Kittypau es la combinación de: (a) hardware de medición de precisión a precio de consumo masivo, (b) modelos ML entrenados específicamente en patrones de alimentación animal (no adaptados de otros dominios), y (c) correlación con contexto ambiental para distinguir causas fisiológicas de causas ambientales. Este enfoque no existe en LATAM y está siendo desarrollado y validado en Santiago con usuario real activo.

**Nivel TRL actual:**
→ **TRL 5** — sistema validado en entorno relevante (hogar real con usuario real KPCL0051, datos en producción).

**TRL objetivo al cierre del proyecto:**
→ **TRL 7** — sistema probado en entorno operacional con múltiples usuarios (30+ usuarios activos, >30 días de operación continua por dispositivo).

---

## SECCIÓN 5 — Mercado

**Mercado objetivo primario:**
> Dueños urbanos de mascotas (perros y gatos) en la Región Metropolitana, entre 25–45 años, con ingresos medios-altos, acceso a smartphone y sensibilidad hacia la salud preventiva de sus animales.

**Mercado objetivo secundario:**
> Clínicas veterinarias y tiendas de mascotas en RM como canal B2B2C.

| Nivel | Definición | Tamaño |
|---|---|---|
| TAM | Mercado global Pet Tech IoT (CAGR 18%, proyección 2030) | USD 20.000 millones |
| SAM | Segmento digital IoT mascotas en LATAM (~3% del mercado pet care) | USD 240 millones |
| SOM | 0,5–1% del segmento objetivo en Chile (Años 1–3) | USD 525K–1.050K |

**Competidores y sustitutos:**
> PetKit (China, USD 80–200): automatiza dispensación, sin analítica de comportamiento. SureFeed (UK, USD 100–150): control de acceso RFID, no mide consumo real. Sustitutos: apps de registro manual (PetDesk, 11Pets), balanzas de cocina, consulta veterinaria periódica. Kittypau es la única solución local que combina medición, analítica e IA preventiva.

---

## SECCIÓN 6 — Modelo de Negocio

**Tipo de modelo:**
→ **B2C** (primario) + **B2B2C** (secundario — vía clínicas veterinarias)

**Flujos de ingresos:**

| Flujo | Precio | Margen |
|---|---|---|
| Hardware KPCL | USD 50/unidad (~$47.000 CLP) | 57% (BOM USD 21,50) |
| Suscripción premium SaaS | USD 8/mes/mascota (~$7.500 CLP/mes) | ~95% marginal |
| Datos agregados (Año 2+) | USD 30–80/mes/clínica | ~90% marginal |

**Unit Economics:**
- CAC estimado (digital): USD 15–25
- LTV (18 meses, hardware + suscripción): USD 194
- LTV/CAC: 10,7x
- MRR actual: USD 0 (pre-revenue, piloto gratuito)
- Burn rate: USD 1/mes (solo costos cloud)
- Break-even operativo: estimado nov 2026

---

## SECCIÓN 7 — Plan de Validación

**Objetivo del proyecto durante los 10 meses:**
> Completar la validación comercial del MVP con primeros usuarios pagadores reales en la Región Metropolitana, alcanzar product-market fit en el segmento B2C urbano y establecer las bases técnicas y comerciales para la escalabilidad del producto.

**Hitos y actividades por fase:**

| Fase | Meses | Actividades | Hito verificable |
|---|---|---|---|
| **Fase 1 — Preparación** | 1–2 | Mentoría iniciada. Ajuste producto v2 (BLE setup, carcasa 3B). Definición canales de venta. | Mentor asignado. Prototipo v2 fabricado. |
| **Fase 2 — Validación** | 3–6 | Venta e instalación de 15 unidades KPCL en hogares de Santiago. Onboarding y soporte activo. NPS mensual. | 15 usuarios con dispositivo activo >30 días. |
| **Fase 3 — Escala** | 7–9 | Escalar a 30 usuarios. Firmar 2 acuerdos B2B2C con clínicas veterinarias RM. Activar suscripción premium. | 30 unidades vendidas. 15 usuarios premium activos. 2 contratos B2B2C. |
| **Fase 4 — Cierre** | 10 | ML v2 en producción (F1 ≥ 0,75). Estrategia de sostenibilidad documentada. Informe final. | TRL 7. MRR USD 120+. Informe entregado. |

**KPIs al cierre del proyecto:**
1. 30 unidades KPCL vendidas (primera venta facturada en el mes 2)
2. 15 usuarios premium activos (MRR USD 120 / ~$112.000 CLP/mes)
3. TRL 7 alcanzado
4. 2 acuerdos B2B2C firmados con clínicas veterinarias RM
5. Modelo ML v2 en producción con F1 macro ≥ 0,75

---

## SECCIÓN 8 — Estrategia de Sostenibilidad (ESG)

*(Obligatorio — el evaluador lo pondera en Escalabilidad 5%)*

**Dimensión Social:**
> Kittypau democratiza el acceso a tecnología preventiva de salud animal, históricamente disponible solo para hogares de ingresos altos mediante consultas veterinarias frecuentes. Al hacer detección preventiva accesible a USD 50 de hardware + USD 8/mes, reducimos la brecha de atención veterinaria en hogares urbanos de ingresos medios. El proyecto genera además un empleo tecnológico junior en Chile (firmware engineer o data scientist, Año 1).

**Dimensión Ambiental:**
> El monitoreo de consumo reduce el desperdicio de alimento: los dueños ajustan las porciones basándose en datos reales, no en estimaciones visuales. Menor desperdicio de alimento = menor huella de producción. Los dispositivos KPCL están diseñados para durabilidad (no descartables), con componentes estándar reemplazables y sin baterías de litio de descarte (alimentados por USB).

**Dimensión Gobierno Corporativo:**
> IOT CHILE SpA opera con dos co-fundadores con participación equitativa. No se aplicará reducción de jornada anticipada (Ley 21.561) en esta fase dado que aún no hay empleados con contrato, pero se adoptará como política al primer contrato formal. Los datos de usuarios se almacenan en servidores con cumplimiento de Ley 19.628 (protección de datos Chile). Política de privacidad publicada en el sitio web.

---

## SECCIÓN 9 — Equipo

### Mauricio Cárcamo Díaz — CEO / Co-fundador

| Campo | Detalle |
|---|---|
| RUT | 17402237-2 |
| Email | mauro.carcamo89@gmail.com |
| Teléfono | +56990381919 |
| Formación | Lic. Sociología (UC Central) + Diplomado Data Science (U. de Chile) + Diplomado IA (UNAB) |
| Experiencia | 7 años en análisis de datos, gestión de proyectos y consultoría (Conectados SA, 2018–2022) |
| Rol en el proyecto | CEO: estrategia comercial, producto digital (dashboard React/Next.js), pipeline analytics (Python, LightGBM) |
| Dedicación | `[CONFIRMAR]` Full-time o parcial — declarar horas/semana |

### Javier Alejandro Dayne Ortiz — CTO / Co-fundador

| Campo | Detalle |
|---|---|
| Email | javier.dayne@gmail.com |
| Formación | Ingeniería Automatización Industrial (INACAP, 2009–2013) + Diplomado PMO (UNAB, 2024) |
| Experiencia | 15+ años en automatización industrial (DCS, SCADA, IIoT, MQTT) — Emerson Electric y otros |
| Rol en el proyecto | CTO: hardware KPCL (PCB, firmware ESP32-C3), bridge Python/Node.js, arquitectura sistema |
| Dedicación | `[CONFIRMAR]` Full-time o parcial — declarar horas/semana |

**¿Por qué este equipo puede ejecutar el proyecto?**
> El equipo combina las dos competencias críticas para un proyecto AIoT: hardware industrial confiable (Javier, 15 años automatización) y analítica de datos aplicada a comportamiento (Mauricio, 7 años data science). La división de responsabilidades es clara y sin solapamiento. El proyecto ya está en producción real (KPCL0051 activo, datos capturados, modelo ML entrenado) — no es un proyecto teórico, es un MVP funcionando. El único recurso crítico faltante para escalar es financiamiento para manufactura y validación comercial, que es exactamente lo que Semilla Inicia provee.

---

## SECCIÓN 10 — Presupuesto REFERENCIAL

*(El presupuesto debe ingresarse en el formulario online con cotizaciones por ítem — esta tabla es orientativa)*

| Ítem | Categoría | Monto estimado CLP | Notas |
|---|---|---|---|
| Mentoría (CORFO habilitada) | Obligatorio | $1.500.000 | Red de Mentores CORFO |
| Manufactura 30 unidades KPCL | PMV / Pilotos | $4.500.000 | ~$150.000/unidad (BOM + ensamble) |
| Marketing digital (Instagram, TikTok) | Difusión comercial | $1.500.000 | Campañas de adquisición |
| Participación ferias/eventos mascotas | Validación comercial | $800.000 | ExpoMascotas RM, otros |
| Desarrollo software (ML v2, app móvil) | Desarrollo PMV | $3.000.000 | Honorarios desarrollo externo si aplica |
| Infraestructura cloud (Supabase, Vercel, HiveMQ) | Servicios tech | $500.000 | 10 meses |
| Cowork / espacio de trabajo | Arriendo espacio | $600.000 | 10 meses |
| Estrategia ESG / consultoría sostenibilidad | Sostenibilidad | $600.000 | Diagnóstico ESG obligatorio |
| Imprevistos (5%) | Contingencia | $500.000 | |
| **Subtotal financiable** | | **$13.500.000** | |
| **Overhead Entidad Patrocinadora (15%)** | | **$2.025.000** | Se descuenta del subsidio |
| **TOTAL CORFO** | | **$15.000.000** | |
| **Aporte propio emprendedor (25%)** | | **$5.000.000** | En trabajo técnico y costos previos |
| **COSTO TOTAL PROYECTO** | | **$20.000.000** | |

> ⚠️ Se deben adjuntar cotizaciones formales por cada ítem al momento de postular. Los montos son referenciales y pueden ajustarse.

---

## VIDEO DE 40 SEGUNDOS (BLOQUEANTE CRÍTICO)

**Formato:** YouTube o Vimeo, público, sin contraseña, fecha de carga visible, sin modificaciones post-postulación.

**Duración máxima:** 40 segundos.

**Contenido obligatorio:** (1) qué es el producto/servicio + (2) por qué es innovador vs. soluciones actuales del mercado.

**Guión sugerido (40 seg):**
- 0–8 seg: *"¿Sabes cuánto come y bebe realmente tu gato o perro? La mayoría de los dueños no lo sabe hasta que hay un problema de salud."*
- 8–22 seg: Mostrar el plato KPCL físico + app con datos reales. *"Kittypau captura cada gramo en tiempo real y lo analiza con IA."*
- 22–34 seg: *"A diferencia de los comederos automáticos importados, Kittypau interpreta el comportamiento, detecta anomalías y te avisa antes."* (mostrar alerta en dashboard)
- 34–40 seg: *"Hardware e IA desarrollados en Chile. Postulamos a CORFO para llegar a los primeros 30 hogares de Santiago."*

**Estado:** `[CRÍTICO — PENDIENTE]` El video aún no existe. Debe grabarse y subirse antes del 29 de mayo 2026.

---

## CHECKLIST PRE-ENVÍO CORFO

### Bloqueantes críticos (sin esto la postulación es inadmisible)
- [ ] `[CRÍTICO]` Confirmar fecha de iniciación de actividades SII de IOT CHILE SpA (debe ser posterior al 30-oct-2024)
- [ ] `[CRÍTICO]` Confirmar que no hay ventas facturadas hasta marzo 2026 inclusive (piloto KPCL0051 sin factura)
- [ ] `[CRÍTICO]` Video de 40 segundos subido a YouTube/Vimeo (público, sin contraseña, fecha visible)
- [ ] `[CRÍTICO]` Formulario online completo en corfo.gob.cl
- [ ] `[CRÍTICO]` Presupuesto con cotizaciones por cada ítem

### Documentos requeridos
- [ ] Transcripción del objeto social de IOT CHILE SpA
- [ ] Declaración jurada de no tener deudas tributarias, previsionales ni laborales
- [ ] Cotizaciones de proveedores por cada ítem del presupuesto
- [ ] Documento de inicio actividades SII

### Pendientes de confirmar
- [ ] `[CONFIRMAR]` Horas de dedicación semanal de Mauricio al proyecto (campo obligatorio del formulario)
- [ ] `[CONFIRMAR]` Horas de dedicación semanal de Javier al proyecto
- [ ] `[CONFIRMAR]` Entidad Patrocinadora habilitada CORFO RM — identificar y contactar antes del cierre (tienen 15 días hábiles post-adjudicación, pero conviene tenerla identificada antes)
- [ ] `[CONFIRMAR]` Fecha exacta de inicio del piloto KPCL0051 (para declarar en "inicio desarrollo comercial")

**Fecha límite:** 29 de mayo 2026
