# Project Charter — Kittypau IoT
**Proceso PMBOK**: 4.1 Desarrollar el Acta de Constitucion del Proyecto
**Dominio PMBOK 7**: Entrega de Valor / Stakeholders
**Version**: 1.0 | Fecha: 2026-03-05
**Estado**: Activo

---

## 1. Identificacion del Proyecto

| Campo | Valor |
|-------|-------|
| Nombre del proyecto | Kittypau IoT — Plataforma de Monitoreo Inteligente de Mascotas |
| Codigo | KP-2026 |
| Fecha de inicio | 2025-11-01 |
| Fecha estimada de cierre MVP | 2026-06-30 |
| Patrocinador | Equipo fundador (Javier Suarez / Mauro Carcamo) |
| Director del proyecto | Javier Suarez |
| Version del documento | 1.0 |

---

## 2. Proposito y Justificacion

### Problema que resuelve

Los duenos de mascotas en Chile no tienen forma sencilla de monitorear los habitos alimenticios e hidricos de sus animales en tiempo real. El 60% de los gatos y perros en hogares chilenos presenta problemas de salud relacionados con alimentacion inadecuada (sobrepeso, deshidratacion, anorexia). La deteccion temprana de cambios de comportamiento puede prevenir enfermedades costosas y mejorar la calidad de vida del animal.

### Solucion propuesta

Kittypau es una plataforma IoT + SaaS que combina:
- **Hardware propio**: platos inteligentes (comedero y bebedero) con sensores de peso, temperatura, humedad y camara opcional
- **Conectividad**: dispositivos ESP8266/ESP32-CAM conectados via MQTT (HiveMQ Cloud) a un bridge Raspberry Pi
- **Backend en la nube**: Supabase (PostgreSQL + Auth + Realtime) + Vercel (Next.js)
- **App web responsiva**: dashboard en tiempo real, alertas, historico y analisis por mascota

### Justificacion estrategica

- Mercado mascotas Chile: ~$350M USD anuales, crecimiento sostenido post-pandemia
- No existe competidor local con producto IoT + datos + app integrados a este precio
- Prototipo funcional ya operativo con 8 dispositivos activos
- Modelo SaaS permite recurrencia y valorizacion compuesta

---

## 3. Objetivos del Proyecto

### Objetivo general

Desarrollar, validar y escalar una plataforma IoT de monitoreo de mascotas que genere datos accionables para el dueno y que opere como negocio SaaS rentable en Chile.

### Objetivos especificos (SMART)

| # | Objetivo | Indicador | Meta | Plazo |
|---|----------|-----------|------|-------|
| O1 | Lanzar MVP funcional con app web y dispositivos | Usuarios activos con lectura en vivo | 10 usuarios piloto | Jun 2026 |
| O2 | Validar modelo de negocio | Conversion free->paid | > 20% en piloto | Sep 2026 |
| O3 | Obtener financiamiento no dilutivo | Fondo adjudicado | 1 fondo (CORFO/ANID) | Sep 2026 |
| O4 | Reducir costo unitario de produccion | COGS por kit | < $25 USD | Dic 2026 |
| O5 | Alcanzar MRR inicial | Ingreso recurrente mensual | > $200 USD | Dic 2026 |

---

## 4. Alcance de Alto Nivel

### Incluido en el proyecto

- Firmware ESP8266 y ESP32-CAM (sensores peso, temp, humedad, camara)
- Bridge MQTT-to-Supabase en Raspberry Pi Zero 2W
- Backend en Supabase: esquema de datos, RLS, autenticacion
- API Next.js en Vercel: endpoints CRUD + streaming de datos
- App web: registro, onboarding, dashboard en tiempo real, historico
- Panel admin: telemetria, finanzas, estado de dispositivos
- Documentacion tecnica y de negocio (PMO + postulacion a fondos)
- Hardware: carcasa 3D impresa, PCB, ensamblaje manual

### Excluido (fuera de alcance v1)

- App movil nativa (iOS/Android) — prevista para v2
- Integracion con veterinarias — prevista para v3
- IA/ML de prediccion de enfermedades — fase 3
- Produccion en serie industrial — post-financiamiento

---

## 5. Entregables Clave

| Entregable | Descripcion | Fase |
|-----------|-------------|------|
| E1 | Firmware v1.0 estable (ESP8266 + ESP32-CAM) | MVP |
| E2 | Bridge v2.6 deployado en produccion | MVP |
| E3 | App web con onboarding completo y dashboard | MVP |
| E4 | 8 dispositivos KPCL activos y enviando datos | MVP |
| E5 | Documentacion PMO completa | Fondos |
| E6 | Dossier de postulacion CORFO Semilla Inicia | Fondos |
| E7 | Piloto con 10 usuarios reales | Validacion |
| E8 | v2: mejoras post-piloto + reduccion COGS | Escala |

---

## 6. Hitos Principales

| Hito | Descripcion | Fecha objetivo |
|------|-------------|----------------|
| M0 | Prototipo funcional (estado actual) | 2026-03-05 (alcanzado) |
| M1 | Documentacion PMO completa | 2026-03-12 |
| M2 | Postulacion CORFO Semilla Inicia | 2026-03-16 |
| M3 | MVP con 10 usuarios piloto activos | 2026-06-30 |
| M4 | Postulacion ANID Startup Ciencia | 2026-09-01 |
| M5 | Postulacion StartUp Chile BIG 12 | 2026-10-01 |
| M6 | Break-even operativo | 2026-12-31 |

---

## 7. Presupuesto de Alto Nivel

| Categoria | Estimado (USD) | Fuente |
|-----------|---------------|--------|
| Hardware (BOM x10 unidades piloto) | $300 | Fondos propios |
| Impresion 3D y manufactura | $150 | Fondos propios |
| Infraestructura cloud (12 meses) | $0 (planes free) | Shadow-price: ~$50/mes |
| Postulacion y documentacion | $0 | Trabajo propio |
| Fondo solicitado CORFO Semilla Inicia | $17.000.000 CLP (~$17.900 USD) | CORFO (75%) |
| Contrapartida emprendedor (25%) | $5.633.333 CLP (~$5.930 USD) | Fondos propios |

> Detalle completo en [05_COST_BUDGET.md](05_COST_BUDGET.md)

---

## 8. Riesgos de Alto Nivel

| Riesgo | Probabilidad | Impacto | Estrategia |
|--------|-------------|---------|------------|
| Falla de componente electronico en campo | Media | Alto | Stock de repuestos + garantia |
| No adjudicacion de fondo CORFO | Media | Medio | Postular a multiples fondos |
| Churn alto en piloto | Baja | Alto | Iteracion rapida por feedback |
| Costos cloud escalan al crecer | Baja | Medio | Shadow-pricing continuo |
| Competidor lanza producto similar | Baja | Alto | Acelerar validacion y traccion |

> Detalle completo en [06_RISK_REGISTER.md](06_RISK_REGISTER.md)

---

## 9. Interesados Clave

| Interesado | Rol | Interes principal |
|------------|-----|-------------------|
| Javier Suarez | Co-fundador / Director tecnico | Excelencia tecnica, firmware, IoT |
| Mauro Carcamo | Co-fundador / Director de producto | App, UX, estrategia de negocio |
| Duenos de mascotas (usuarios piloto) | Cliente final | Salud de su mascota, facilidad de uso |
| CORFO / ANID | Patrocinador financiero | Impacto economico, innovacion, empleo |
| Veterinarias (v3) | Canal de distribucion futuro | Herramienta profesional de monitoreo |

> Detalle completo en [07_STAKEHOLDERS.md](07_STAKEHOLDERS.md)

---

## 10. Criterios de Exito

El proyecto se considera exitoso si:

1. El MVP esta funcional y deployado con al menos 5 usuarios activos enviando datos reales
2. Se adjudica al menos un fondo concursable en 2026
3. Se valida que > 20% de usuarios piloto pagarian por el servicio
4. El costo unitario de produccion se mantiene por debajo de $30 USD
5. La plataforma opera sin incidentes criticos durante 30 dias consecutivos

---

## 11. Restricciones y Supuestos

### Restricciones

- Presupuesto inicial limitado a recursos propios hasta adjudicacion de fondos
- El equipo opera en modo part-time (trabajo paralelo a actividades personales)
- Infraestructura en planes free hasta superar umbrales de uso
- Hardware producido manualmente, no en serie industrial

### Supuestos

- La conectividad WiFi en hogares de usuarios piloto es estable
- Los precios de componentes electronicos se mantienen estables (+/- 15%)
- CORFO mantiene las bases del programa Semilla Inicia para el periodo 2026
- El equipo puede dedicar al menos 20h/semana al proyecto

---

## 12. Autorizacion

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Director del proyecto | Javier Suarez | _____________ | 2026-03-05 |
| Co-director / Producto | Mauro Carcamo | _____________ | 2026-03-05 |

---

_Referencias: PMBOK 6ta Ed. Seccion 4.1 | PMBOK 7ma Ed. Principio de Administracion Responsable y Dominio de Entrega_
_Documento siguiente: [04_BUSINESS_CASE.md](04_BUSINESS_CASE.md)_
