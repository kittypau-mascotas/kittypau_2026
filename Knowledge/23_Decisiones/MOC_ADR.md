---
id: moc_adr
title: MOC — Architecture Decision Records
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - moc
  - adr
  - decisiones
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
---

# MOC — Architecture Decision Records

> Registro de decisiones de arquitectura que explican el **por qué** detrás de las elecciones
> técnicas del proyecto. Cada ADR es inmutable una vez aceptado — se puede superseder, no editar.

---

## ADRs aceptados

| ADR | Decisión | Estado |
|-----|----------|--------|
| [[ADR_001_MQTT_vs_HTTP]] | HiveMQ + bridge Raspberry vs. REST polling | Accepted |
| [[ADR_002_Supabase]] | Supabase como backend principal | Accepted |
| [[ADR_003_MotorMatematico]] | numpy/scipy en lugar de sklearn para 102 features | Accepted |
| [[ADR_004_StreamlitAnnotation]] | Streamlit para app de anotación (offline, local) | Accepted |
| [[ADR_005_AlphaV2_Categorias]] | Las 4 categorías: alim / serv / ruido / ciclo | Accepted |

---

## Cómo agregar un ADR

1. Copiar `[[_Templates/TPL_ADR]]`
2. Nombrar `ADR_NNN_slug.md` (NNN = siguiente número en secuencia)
3. Agregar fila en este MOC
4. Enlazar desde el README del área afectada

---

## Ver también

- [[02_Arquitectura/README_Arquitectura]]
- [[01_Proyecto/README_Proyecto]]
