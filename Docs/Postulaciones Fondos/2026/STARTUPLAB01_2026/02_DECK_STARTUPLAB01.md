# Deck — Postulación startuplab.01
**KittyPau — PetTech AIoT**
Versión: 1.0 | Fecha: 2026-03-16
Formato sugerido: 10-12 slides PDF | Duración entrevista: 30 min

> Estructura alneada a los 4 criterios de evaluación ponderados de startuplab.01:
> Madurez Tecnológica (30%) · Equipo (25%) · Viabilidad Comercial (20%) · Impacto Climático (15%) · Ajuste (10%)

---

## SLIDE 1 — Portada

**KittyPau**
Monitoreo inteligente de mascotas — IoT + Cloud + Analytics

> Postulación Residencia startuplab.01 · Marzo 2026
> IOT CHILE SpA · RUT 78.203.374-3
> Mauricio Cárcamo (CEO) · Javier Dayne (CTO)

---

## SLIDE 2 — El Problema

**Los dueños de mascotas están ciegos ante los hábitos diarios de sus animales.**

- 66% de hogares chilenos tiene al menos una mascota (10M+ gatos y perros)
- La mayoría detecta problemas de salud cuando ya hay síntoms clínicos evidentes
- 60% de mascotas en Chile presenta sobrepeso (Colegio Médico Veterinario de Chile)
- La deshidratación crónica es causa frecuente de insuficiencia renal en gatos — detectada tarde
- Consultas veterinarias de emergencia: $50.000–$200.000 CLP (evitables en muchos casos)

> **El problema no es falta de amor por las mascotas — es falta de datos.**

---

## SLIDE 3 — La Solución

**KittyPau: ecosistema IoT de monitoreo de hábitos de mascotas**

Tres capas integradas:

**Hardware (KPCL)**
- Plato y bebedero inteligente con sensores de peso (HX711 + celda de carga 500g)
- Sensor temperatura/humedad ambiental (DHT11/AHT10)
- Sensor luz ambiental (BH1750/VEML7700)
- MCU ESP8266/ESP32 con conectividad WiFi

**Bridge & Telemetría**
- Raspberry Pi Zero 2W como gateway local
- Protocolo MQTT (broker HiveMQ Cloud)
- Transmisión de datos en tiempo real a plataforma cloud

**Plataforma Cloud + App**
- Backend Supabase (PostgreSQL + series temporales)
- App web Next.js con dashboard en tiempo real
- Alertas tempranas por cambio de patrón
- Historial longitudinal de comportamiento

---

## SLIDE 4 — Madurez Tecnológica (TRL 5)

**Tecnología vlidada en entorno relevante**

| Componente | Estado |
|---|---|
| Firmware IoT (ESP8266/ESP32) | ✅ Operativo — captura y envío de datos 24/7 |
| Bridge MQTT (RPi Zero 2W) | ✅ Operativo — bridge local -> cloud funcional |
| Backend Supabase | ✅ Productivo — series temporales, alertas, historial |
| App web (Next.js) | ✅ Desplegada en Vercel — dashboard en tiempo real |
| Integración extremo a extremo | ✅ Flujo completo vlidado: sensor -> MQTT -> bridge -> API -> DB -> app |

**Evidencia de vlidación:**
- 8 dispositivos KPCL activos enviando datos en ambiente doméstico real
- Stack completo documentado con arquitectura operativa y playbooks técnicos
- Migraciones de base de datos con precios reales de componentes (AliExpress 2023–2026)
- Costo BOM real: ~$20.52 USD/unidad (perfil nodemcu-v3)

**Base para TRL 6:** piloto controlado con early adopters planificado para Mes 5–9

---

## SLIDE 5 — Arquitectura Técnica

```
[KPCL Hardware]
  Sensores (peso, temp, humedad, luz)
  MCU ESP8266/ESP32
  WiFi
       ↓ MQTT
[Bridge Local]
  Raspberry Pi Zero 2W
  Cliente MQTT -> REST API
       ↓ HTTPS
[Cloud Backend]
  Supabase (PostgreSQL)
  Series temporales
  Reglas de alertas
       ↓
[App Web]
  Next.js / Vercel
  Dashboard tiempo real
  Alertas + historial
  Perfil veterinario
```

**Stack:** ESP8266/ESP32 · MQTT · Raspberry Pi · Supabase · Next.js · TypeScript · Vercel · HiveMQ

**Diferenciador clave:** integración propietaria extremo a extremo. Los datos longitudinales acumulados son la barrera competitiva real — no el hardware.

---

## SLIDE 6 — Equipo Fundador

**Mauricio Cárcamo Díaz — CEO · 50%**
- Sociólogo (U. Central de Chile)
- Diplomado Data Science (UC) · Diplomado IA (U. Autónoma)
- 6+ años en análisis de datos, proyectos y estrategia comercial
- Full stack developer (Python, React, Next.js, SQL)
- Lidera: negocio, producto, estrategia, frontend y data

**Javier Dayne Ortiz — CTO · 50%**
- Ingeniero en Automatización y Control Industrial (INACAP)
- Diplomado Dirección de Proyectos PMO (UNAB)
- 15+ años en sistems DCS, SCADA, IIoT/MQTT — Emerson Electric
- Sectores: minería, energía, celulosa
- Lidera: hardware IoT, firmware, bridge, arquitectura de sistems

**Complementariedad:** ingeniería industrial IoT (Javier) + ciencia de datos y producto (Mauro)

**Brechas identificadas:** regulación de hardware electrónico de consumo · escalamiento B2B canal veterinario

---

## SLIDE 7 — Mercado y Cliente

**Mercado objetivo**

| Segmento | Perfil | Tamaño referencial |
|---|---|---|
| B2C primario | Dueños mascotas urbanos, 25–45 años, ingresos medios-altos, digitalmente activos | ~2.5M hogares RM |
| B2B2C secundario | Clínicas veterinarias y comercios pet medianos | ~3.500 clínicas en Chile |
| Expansión LATAM | Argentina, Colombia, México — perfil similar | Mercado pet LATAM USD 8B+ |

**Industria pet care en Chile:** ~USD 600M anuales · crecimiento doble dígito en salud preventiva

**Validación de problema:**
- Entrevistas exploratorias con dueños de mascotas
- Cartas de intención de potenciales usuarios early adopter

**Modelo de ingresos:**
- Hardware KPCL: precio objetivo ~$35–45 USD/unidad
- Suscripción cloud/analytics: ~$5–8 USD/mes
- Licencia B2B para clínicas veterinarias: por definir en piloto

---

## SLIDE 8 — Competidores

| Competidor | Fortaleza | Debilidad vs KittyPau |
|---|---|---|
| PetKit (China) | App + dispensadores conectados | Sin analítica preventiva, sin contexto ambiental, no LATAM |
| SureFeed / Sure Petcare (UK) | Alimentadores inteligentes | Alto precio, sin datos longitudinales, sin alertas predictivas |
| PetSafe / Catit | Distribución msiva | Sin conectividad IoT, sin datos |
| Apps de registro manual | Bajo costo | Sin hardware, requiere input manual del usuario |

**Ventaja sostenible de KittyPau:**
Los competidores automatizan la dispensación.
KittyPau genera **inteligencia sobre los hábitos reales** de la mascota.
La barrera competitiva son los **datos longitudinales acumulados** — no el hardware.

---

## SLIDE 9 — Cronograma 12 Meses

| Período | Tipo | Hito | Entregable |
|---|---|---|---|
| Mes 1–4 | Técnico | Cierre versión piloto hardware + firmware | Dispositivo KPCL estable · bridge 24/7 · app con lectura tiempo real vlidada |
| Mes 5–9 | Técnico-Comercial | Piloto con early adopters | 10+ usuarios activos · métricas de retención · feedback documentado |
| Mes 10–12 | Comercial | Preparación lanzamiento inicial | Pricing vlidado · alianzas clínicas/pet · pitch deck para capital semilla |

---

## SLIDE 10 — Riesgos y Mitigación

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Variabilidad hardware en uso doméstico intensivo | Media | Pruebas de estrés · calibración · proveedores alternativos documentados |
| Adopción menor / churn alto tras período inicial | Media | Onboarding guado · foco en primera alerta útil como momento de valor |
| Crecimiento costos cloud antes de escalar ingresos | Baja | Monitoreo costo unitario por dispositivo · arquitectura optimizada · burn $1/mes real |
| Regulatorio / datos personales | Baja | Políticas de privacidad implementadas · autnticación por tokens · control de accesos por rol |

---

## SLIDE 11 — Impacto Climático

**Sector:** Urbanización (entorno construido)
**Área de acción:** Monitoreo (medición y rastreo)

**Mecanismo de impacto:**
- Reducción de consultas veterinarias de emergencia innecesarias -> menor huella de movilidad urbana
- Optimización de consumo de alimento -> reducción de desperdicio alimentario asociado a mascotas
- Monitoreo de condiciones ambientales del hogar -> dato base para adaptación climática doméstica

**Beneficio a poblaciones vulnerables:**
KittyPau puede reducir el gasto veterinario de emergencia en hogares de ingresos medios-bajos mediante detección temprana de problemas de alimentación e hidratación, permitiendo actuar antes de que el problema escale a una consulta de urgencia costosa.

---

## SLIDE 12 — Por Qué startuplab.01

**Lo que buscamos en la residencia:**

1. **Validación técnica en entorno controlado** — Dry Lab para pruebas de hardware, calibración y estabilidad de sensores en condiciones variadas

2. **Red de contactos** — conexión con clientes potenciales, clínicas veterinarias y actores del ecosistema pet-tech en Chile y LATAM

3. **Mentoría especializada** — modelo de negocios hardware+SaaS, estrategia de propiedad intelectual y estructura legal para escalar

4. **Preparación para capital semilla** — pitch deck, financials y readiness para primer levantamiento al término de la residencia

**KittyPau está en el momento exacto:** prototipo funcional con arquitectura documentada, equipo técnico completo y tracción inicial — listo para pasar de vlidación interna a piloto con evidencia real.

---

## Información de contacto

**Mauricio Cárcamo Díaz** — CEO
mauro.carcamo89@gmail.com · +56 9 9038 1919

**Javier Dayne Ortiz** — CTO
javier.dayne@gmail.com · +56 9 7909 9687

**Web:** https://kittypau-app.vercel.app
**LinkedIn:** https://www.linkedin.com/in/kittypau-mascotas/
**GitHub:** https://github.com/kittypau-mascotas/kittypau_2026

---

*IOT CHILE SpA · RUT 78.203.374-3 · Constituida 10/07/2025 · Santiago, Chile*


