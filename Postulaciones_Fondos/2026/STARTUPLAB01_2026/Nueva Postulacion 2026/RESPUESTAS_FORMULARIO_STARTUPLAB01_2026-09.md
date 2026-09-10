# startuplab.01 — Respuestas para pegar en el formulario (Airtable / vform.cl)

**Proyecto:** Kittypau · **Postula:** Mauricio Cárcamo Díaz (persona natural — Kittypau **no está
constituida** como persona jurídica) · **Fecha:** 2026-09-10
Versión corregida y consistente de `RESPUESTAS_FORMULARIO_FINAL.md` (mayo 2026), actualizada a
septiembre 2026 y ordenada por las 8 secciones reales del formulario.

> **Escenario legal (confirmado por Mauro, 2026-09):** el equipo **no está constituido**. Postula
> Mauricio Cárcamo como persona natural. Donde el formulario pida razón social / RUT de empresa /
> certificado de vigencia → "No aplica — sin constituir aún; con disposición a formalizar durante
> la residencia". Documento legal disponible: cédula de identidad del postulante.

> **`[CONFIRMAR: ...]`** = dato que hay que verificar antes de pegar (no inventar).
> Los 3 documentos viejos (`01_RESPUESTAS`, `version_mauro`, deck) daban números de dispositivos
> distintos — acá se usa una sola versión defendible; ajústala al número real de hoy.

---

## Sección 1 — Identificación y Contacto

| Campo | Respuesta |
|---|---|
| Nombre de la startup | Kittypau |
| Razón social | No aplica — sin constituir |
| RUT empresa | No aplica — sin constituir |
| Fecha de constitución | No aplica (con disposición a formalizar durante la residencia) |
| País de origen | Chile |
| Ciudad | Santiago |
| Sitio web | https://kittypau-app.vercel.app |
| Demo en vivo | https://kittypau-app.vercel.app/demo |
| Estado legal | No constituida — postula persona natural |
| Contacto principal / postulante | Mauricio Cristian Cárcamo Díaz — fundador y líder del proyecto |
| Correo | mauro.carcamo89@gmail.com |
| Teléfono | +56 9 9038 1919 |
| RUT postulante | 17.402.237-2 |
| LinkedIn empresa | https://www.linkedin.com/in/kittypau-mascotas/ |
| GitHub | https://github.com/kittypau-mascotas/kittypau_2026 |
| ¿Cómo te enteraste de la Residencia? | Redes sociales (LinkedIn) · Referencia de terceros |

---

## Sección 2 — Tecnología y Problema

**Descripción general de la startup (2–3 frases)**
Kittypau es una plataforma AIoT (IA + IoT) para el monitoreo de los hábitos de alimentación e
hidratación de las mascotas. Un plato y un bebedero con sensores capturan consumo y variables del
entorno; el sistema los analiza y los convierte, en una app web, en gráficos claros, historial y
alertas tempranas de cambios de patrón, para pasar de un cuidado reactivo a uno preventivo.

**Problema (máx. ~100 palabras)**
Los dueños de mascotas no tienen visibilidad real de los hábitos diarios de alimentación e
hidratación de su animal. Los cambios importantes se detectan tarde: cuando el plato lleva horas
intacto, cuando la ingesta baja de forma evidente o cuando ya hay síntomas clínicos. Esa falta de
datos continuos vuelve el cuidado reactivo en lugar de preventivo, aumenta las consultas de
urgencia evitables (CLP 50.000–200.000) y afecta la calidad de vida de la mascota. El vínculo cada
vez más familiar con perros y gatos eleva la expectativa de cuidado, pero las herramientas siguen
siendo intuitivas y sin datos.

**Solución**
Kittypau integra: (1) hardware KPCL — plato y bebedero con sensor de peso (celda de carga + HX711),
sensores de temperatura/humedad y luz ambiental, MCU ESP32-C3 con WiFi; (2) transporte MQTT/TLS a
un bridge local en Python con reconexión automática; (3) backend en PostgreSQL/Supabase con series
temporales; (4) un motor de clasificación de eventos de alimentación e hidratación; (5) app web
(Next.js) con dashboard en tiempo real, historial longitudinal y alertas por cambio de patrón. El
valor no es dispensar comida, sino generar inteligencia sobre los hábitos reales: frecuencia,
duración, cantidad, horarios y contexto ambiental.

**Ventaja técnica diferenciadora**
La barrera no es el sensor —eso es replicable— sino los **datos longitudinales de comportamiento
animal** y las **reglas de interpretación** que se acumulan con uso real. Un competidor puede copiar
el hardware; no puede copiar el aprendizaje operacional. A más usuarios activos, más preciso el
sistema y más difícil de replicar.

**¿Por qué ahora?**
Convergen tres cosas: (a) el vínculo humano-mascota se volvió familiar y sube la expectativa de
cuidado; (b) el cuidado cotidiano sigue siendo intuitivo y sin datos → brecha clara; (c) madurez
tecnológica: sensores IoT baratos, WiFi estable en el hogar, cloud escalable e IA aplicable. Además
los usuarios ya monitorean su propia salud con wearables, lo que facilita la adopción del mismo
concepto para su mascota.

---

## Sección 3 — Madurez Tecnológica

**TRL: 5** (validado en entorno relevante; con evidencia analítica en el borde superior TRL 5 / TRL 6).

**Justificación**
El sistema está desplegado en hogares reales y en uso activo. El flujo completo extremo a extremo
está probado en producción: sensor de peso HX711 + sensores ambientales → firmware ESP32-C3 →
MQTT/TLS sobre WiFi → bridge local en Python → API → PostgreSQL/Supabase → motor de clasificación
de eventos → app web con dashboard y alertas.

Evidencia concreta a septiembre 2026:
- **`[CONFIRMAR: N]` dispositivos KPCL operando en `[CONFIRMAR: N]` hogares reales.** Caso principal:
  hogar de "Bandida" (gata) con **KPCL0034** (plato de alimentación) + **KPCL0035** (bebedero),
  capturando datos continuos de consumo, temperatura, humedad y luz en condiciones cotidianas
  (WiFi variable, ciclos on/off, mascota real interactuando). Segundo hogar independiente con
  **KPCL0051**, que valida la replicabilidad del sistema en otro entorno.
- **Motor de clasificación de eventos de alimentación validado** contra ground truth sobre
  **`[CONFIRMAR: ~305]` comidas reales** del dispositivo KPCL0034 (etiquetado manual + verificación),
  con constantes recalibradas sobre ese histórico.
- **Firmware estable y autónomo**: filtro EMA sobre el ADC para compensar interferencia del radio
  WiFi en la lectura de peso; calibración, tara y credenciales persistidas en flash (LittleFS);
  **actualización remota por OTA** sobre hardware ya desplegado.
- **App desplegada en producción** (Vercel): pantalla `/today` con estado del día, barras de
  consumo, gráfico día/noche, KPIs y consumo por período; y **`/demo` en vivo** que espeja los
  datos reales para cualquiera sin cuenta.
- Infraestructura de **notificaciones push** construida (registro de token + cron server-side).

**Siguiente paso (TRL 6):** piloto controlado con 5–10 usuarios activos y métricas de retención.

**Requerimiento de laboratorio:** Dry Lab — para pruebas de estrés, calibración de sensores en
condiciones variadas y validación de durabilidad del hardware.

**Propiedad intelectual:** 0 patentes / 0 publicaciones. Estrategia actual = secreto industrial
(datos longitudinales + reglas de interpretación + know-how). Se evalúa una patente de utilidad
sobre el método de detección de desvíos de comportamiento a partir de series temporales de peso +
variables ambientales; si la residencia incluye asesoría de PI, ese análisis sería un primer
entregable.

---

## Sección 4 — Validación Comercial y Financiamiento

**Cliente ideal**
- **B2C (primario):** dueño de mascota urbano en Chile, 25–45 años, digitalmente activo, ingresos
  medios / medios-altos, considera a su perro o gato parte de la familia, valora lo preventivo
  sobre lo reactivo, con jornada laboral que lo aleja del hogar durante el día.
- **B2B2C (secundario):** clínicas veterinarias y comercios pet medianos que quieren diferenciarse
  con monitoreo como servicio complementario y herramienta de fidelización.

**Go-to-market**
Modelo híbrido B2C + B2B2C. B2C: venta del dispositivo online (web + redes) con envío a domicilio;
suscripción freemium (monitoreo básico gratis, pago por análisis avanzado, historial y alertas);
marketing de contenido y colaboraciones con referentes pet. B2B2C: contacto directo con clínicas y
comercios para acuerdos de distribución e integración; ferias del sector. La fuente principal de
ingresos proyectada es la suscripción, complementada con hardware y acuerdos con marcas.

**Modelo de ingresos**
- Hardware KPCL: precio objetivo ~USD 35–45/unidad.
- Suscripción cloud/analítica: ~USD 5–8/mes.
- Licencia B2B para clínicas: a definir en el piloto.
- A futuro: insights anonimizados y agregados para el sector.

**Validación a la fecha**
- Dispositivos operando en hogares reales con datos capturados desde el despliegue.
- Motor de clasificación validado contra ground truth (ver Sección 3).
- Feedback cualitativo de los usuarios iniciales sobre valor percibido.
- Acuerdo de uso de piloto con el 2º usuario (KPCL0051) — **`[CONFIRMAR: firmado / pendiente de firma]`**.
- Proceso en curso de cartas de intención con potenciales clientes B2C y B2B2C.

**Posición financiera**
- Capital externo levantado: ~USD 304. Rondas previas: 0.
- Ingresos últimos 12 meses: 0. Clientes que pagan: 0.
- Burn rate: mínimo (~USD 1–5/mes, costos cloud). Runway: amplio (modelo bootstrapped).
- Fuente de financiamiento: recursos propios de los fundadores + >600 h de trabajo técnico.
- Búsqueda de capital semilla: planificada dentro de los próximos 6 meses.

**Contexto:** el modelo fue bootstrapped a propósito — llegar a la residencia con validación técnica
real, sin deuda y sin dilución prematura. El activo concreto es lo construido: hardware funcional,
firmware estable, bridge, backend, app en producción y datos reales.

---

## Sección 5 — Equipo

| Campo | Respuesta |
|---|---|
| Nº cofundadores | 2 |
| Fundadores con formación científica/técnica | 2 (perfiles complementarios) |
| Fundadores con experiencia comercial/emprendimiento | 2 |
| Mujeres en liderazgo | 0 |
| Empleados (excl. cofundadores) | 0 |
| ¿Algún cofundador fundó otra startup antes? | No |

**Javier Dayne Ortiz — CTO y cofundador (50%)**
Ingeniero en Automatización y Control Industrial (INACAP) · Diplomado en Dirección de Proyectos /
PMO (UNAB). 15+ años en sistemas DCS, SCADA, IIoT y MQTT (Emerson Electric; minería, energía,
celulosa). En Kittypau desarrolla hardware, firmware (ESP32-C3), bridge local y la arquitectura del
sistema completo. LinkedIn: `[CONFIRMAR: link]`.

**Mauricio Cristian Cárcamo Díaz — CEO y cofundador (50%)**
Sociología (U. Central) · Diplomado en Data Science (UC) · Diplomado en IA (U. Autónoma). 6+ años
en análisis de datos, gestión de proyectos y estrategia comercial. Full-stack (Python, React,
Next.js, SQL). Lidera negocio, producto, analítica, frontend y la coordinación de postulaciones.
LinkedIn: `[CONFIRMAR: link]`.

**Complementariedad:** ingeniería industrial IoT (Javier) + ciencia de datos y producto (Mauro).

**Brechas reconocidas:** (1) regulación de hardware electrónico de consumo; (2) escalamiento
comercial B2B en canal veterinario; (3) diversidad de género en liderazgo — el equipo es 100%
masculino en un mercado donde la decisión de compra pet está mayormente liderada por mujeres; se
busca activamente una tercera voz femenina en producto o comercial. La residencia ayuda con (1) y
(2); la (3) es responsabilidad del equipo.

**Dedicación:** ambos fundadores trabajando en el proyecto; disponibilidad para operar desde
Santiago sin restricciones.

---

## Sección 6 — Impacto

**Sector de contribución:** entorno construido / urbanización — área de acción: monitoreo y
prevención.

**Mecanismo de impacto (acotado y honesto):**
- **Menos desplazamientos de urgencia:** una alerta temprana permite actuar antes de que el
  problema escale a consulta de urgencia. En Chile hay ~4,8 millones de perros y gatos domésticos;
  si el monitoreo evita una urgencia al año en una fracción de los usuarios activos, el ahorro de
  movilidad urbana es una métrica de seguimiento reportable.
- **Menos desperdicio de alimento:** ajustar la cantidad servida según consumo real reduce
  sobreingesta, subalimentación y el desperdicio (y los envases) del ciclo de compra ineficiente.

**Beneficio a poblaciones vulnerables:** en hogares de ingresos medios-bajos, una urgencia
veterinaria (CLP 30.000–80.000) es una carga significativa; la detección temprana permite actuar
antes y reduce ese gasto sin depender de infraestructura de urgencia.

**Métricas de seguimiento propuestas:** "urgencias veterinarias evitadas estimadas por cohorte
activa" y "desviación de consumo detectada antes de síntoma clínico declarado por el usuario".

---

## Sección 7 — Selección de Residencia

| Campo | Respuesta |
|---|---|
| Tipo de Residencia solicitada | Residencia Plus |
| Puestos de cowork | 2 |
| Puestos de laboratorio | 1–2 |
| Tipo de laboratorio | Dry Lab |
| Infraestructura requerida | Dry Lab (pruebas de estrés, calibración de sensores, validación de durabilidad de hardware) |
| ¿Pueden estar en Santiago durante la residencia? | Sí, sin restricciones |
| Frecuencia estimada de uso | 15–20 días/mes |
| Fecha estimada de inicio | `[CONFIRMAR: primer día del mes siguiente al envío]` |
| Interés en programas de aceleración | Sí |

---

## Sección 8 — Compatibilidad con startuplab.01

**Necesidades prioritarias**
1. Validación técnica con usuarios reales + Dry Lab para prueba y calibración de hardware.
2. Desarrollo del modelo de negocio y estrategia comercial B2B (canal veterinario).
3. Conexiones con clínicas veterinarias y actores del sector pet.
4. Preparación para levantamiento de capital semilla (deck, financials, readiness).
5. Estrategia de propiedad intelectual.
6. Navegación regulatoria para hardware de consumo.

**Por qué encaja**
Kittypau llega con hardware funcionando y datos reales, no con una idea: TRL 5 compatible con el
programa, necesidad concreta de Dry Lab, usuarios activos y capacidad de mostrar progreso medible
durante la residencia (cohorte de 5–10 usuarios, alianzas, deck de inversión).

**Resultado esperado al terminar la residencia**
Cohorte de 5–10 usuarios activos documentada · al menos 2 alianzas con actores del sector pet ·
deck de inversión listo · proceso de levantamiento de capital semilla iniciado.

**Cronograma 12 meses**
- **Meses 1–4 — Técnico:** cierre de la versión piloto de hardware/firmware (estabilidad de captura
  y envío en arquitectura productiva); segunda/tercera unidad KPCL desplegada en piloto controlado.
- **Meses 5–9 — Técnico-comercial:** piloto con 5–10 usuarios; métricas de adopción, uso recurrente
  y calidad de datos; ≥2 cartas de intención de clínicas o comercios pet.
- **Meses 10–12 — Comercial:** pricing hardware + suscripción validado con usuarios reales;
  activación de alianzas; materiales de inversión listos; readiness para capital semilla.

**Riesgos y mitigación**
- *Variabilidad / durabilidad del hardware en uso doméstico intensivo* → pruebas de estrés,
  calibración (EMA en ADC), proveedores alternativos documentados, protocolo de reemplazo.
- *Adopción lenta / churn alto* → onboarding guiado enfocado en "la primera alerta útil" como
  momento de activación; el sistema entrega valor desde el primer evento, no desde acumulación.
- *Costos antes de escalar ingresos* → costo unitario por dispositivo monitoreado, arquitectura
  cloud controlada, burn bajo.
- *Datos personales* → política de privacidad publicada, auth por JWT, control de acceso por rol,
  sin venta ni transferencia a terceros.

**Competidores**
Directos: PetKit, SureFeed / Sure Petcare — automatizan la dispensación, ninguno con analítica
longitudinal de comportamiento ni contexto ambiental. Indirectos: dispensadores sin conectividad,
apps de registro manual, wearables no enfocados en hábitos de alimentación/hidratación.
Diferenciación: los competidores resuelven la conveniencia; Kittypau resuelve la visibilidad.

---

## Declaraciones (Términos y Condiciones)

- Veracidad de la información: **Sí**
- Consentimiento de uso de datos para evaluación: **Autorizo**
- Entiendo que startuplab.01 **no toma equity** de las startups: **Sí**
- Acepto ser contactado para comunicaciones de startuplab.01: **Sí**
- Acepto los Términos y Condiciones: **Sí** (ver `Terminos_condiciones_startuplab.01.pdf` y
  `02_VINCULACION_TERMINOS_Y_CONDICIONES_KITTYPAU.md`)

---

## Antes de pegar — checklist de 5 minutos

- [ ] Reemplazar los 5 `[CONFIRMAR: ...]` con el dato real (dispositivos, comidas validadas, links
      LinkedIn, estado del acuerdo de piloto, fecha de inicio).
- [ ] Verificar que el nº de dispositivos sea el mismo en el formulario, el deck y el video.
- [ ] Adjuntar: deck PDF · video pitch · cédula de identidad del postulante (Mauricio Cárcamo) ·
      fotos del prototipo. (Sin certificado de vigencia — la startup no está constituida.)
- [ ] Guardar comprobante de envío en esta carpeta.
