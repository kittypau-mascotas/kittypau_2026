# Kittypau IoT — PMO Index
**Estandar**: PMBOK 6ta + 7ma Edicion (PMI)
**Estado**: En construccion | Iniciado: 2026-03-05
**PM**: Javier Suarez / Mauro Carcamo
**Version**: 1.0

---

## Como usar este directorio

Cada documento cubre un area de conocimiento o dominio de desempeno del PMBOK.
Son independientes pero se referencian entre si.
Todos son adaptables a distintos fondos concursables — ver seccion de adaptacion por fondo.

---

## Documentos del proyecto

| # | Documento | Area PMBOK 6 | Dominio PMBOK 7 | Estado |
|---|-----------|-------------|-----------------|--------|
| 01 | [Project Charter](01_PROJECT_CHARTER.md) | Integracion (4.1) | Stakeholders / Entrega | Disponible |
| 02 | [Alcance y WBS](02_SCOPE_WBS.md) | Alcance (5) | Planificacion | Pendiente |
| 03 | [Cronograma de Hitos](03_SCHEDULE.md) | Tiempo (6) | Planificacion | Pendiente |
| 04 | [Business Case y Modelo de Negocio](04_BUSINESS_CASE.md) | Integracion (4.1) | Entrega de Valor | Disponible |
| 05 | [Plan de Costos y Presupuesto](05_COST_BUDGET.md) | Costos (7) | Planificacion | Pendiente |
| 06 | [Registro de Riesgos](06_RISK_REGISTER.md) | Riesgos (11) | Incertidumbre | Pendiente |
| 07 | [Registro de Interesados](07_STAKEHOLDERS.md) | Interesados (13) | Stakeholders | Pendiente |
| 08 | [Plan de Calidad](08_QUALITY_PLAN.md) | Calidad (8) | Entrega | Pendiente |
| 09 | [Plan de Comunicaciones](09_COMMUNICATIONS.md) | Comunicaciones (10) | Equipo / Stakeholders | Pendiente |
| 10 | [Guia de Adaptacion por Fondo](10_FONDOS_ADAPTACION.md) | -- | -- | Pendiente |

---

## Fondos objetivo 2026

| Fondo | Monto max | Deadline | Estado doc |
|-------|-----------|----------|------------|
| CORFO Semilla Inicia | $17M CLP | 16 Mar 2026 | URGENTE |
| StartUp Chile BIG 12 | $75M CLP | ~Oct 2026 | Planificado |
| ANID Startup Ciencia | $134M CLP | ~Sep 2026 | Planificado |
| CORFO Semilla Expande | $28M CLP | ~Feb 2027 | Futuro |

> Ver calendario completo en [kittypau_fondos_2026.ics](../kittypau_fondos_2026.ics)

---

## Principios PMBOK 7 aplicados

1. **Administracion responsable** — decisiones tecnicas documentadas y auditables
2. **Equipo colaborativo** — roles definidos, trabajo asincronico remoto
3. **Enfoque en valor** — cada entregable apunta a traccion o reduccion de riesgo
4. **Pensamiento sistemico** — IoT + SaaS + datos como sistema integrado
5. **Adaptabilidad** — arquitectura disenable para escalar sin refactoring mayor
6. **Calidad** — CI/CD, tests automatizados, migraciones versionadas
7. **Riesgo** — registro activo, mitigaciones concretas

---

## Glosario rapido

| Termino | Significado |
|---------|-------------|
| KPCL | Kittypau Connected Layer — codigo de dispositivo (ej: KPCL0036) |
| Bridge | Raspberry Pi Zero 2W que conecta MQTT con Supabase |
| Plato inteligente | Dispositivo IoT con sensor de peso, temp, humedad y camara opcional |
| MVP | Producto minimo viable actualmente funcional y deployado |
| BOM | Bill of Materials — lista de componentes por dispositivo |
| MRR | Monthly Recurring Revenue — ingreso recurrente mensual |
| LTV | Lifetime Value — valor del cliente en su ciclo de vida |
| CAC | Customer Acquisition Cost — costo de adquirir un cliente |

---

_Documento maestro PMO. Actualizar version al modificar cualquier documento hijo._
