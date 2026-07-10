---
id: adr_005_alphav2_categorias
title: "ADR-005: Las 4 categorías de anotación (alim / serv / ruido / ciclo)"
type: adr
status: accepted
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - adr
  - categorias
  - anotacion
  - alpha-v2
related:
  - [[23_Decisiones/MOC_ADR]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
  - [[13_Features/README_ShapeFeatures]]
---

# ADR-005: Las 4 categorías de anotación

**Estado:** Accepted  
**Fecha:** 2026 (Alpha v2)  
**Área:** IA / Anotación de datos

---

## Contexto

El sensor KPCL0034 registra variaciones de peso en el plato de comida de Bandida.
Se necesita un esquema de categorías que capture todos los eventos relevantes con
semántica clara y sin ambigüedad entre categorías.

---

## Categorías definidas

| Categoría | Emoji | Color hex | Descripción |
|-----------|-------|-----------|-------------|
| `alimentacion` | 🍽️ | `#00b45a` | Bandida comiendo: el peso baja porque el gato consume alimento |
| `servido` | 🫙 | `#1e64ff` | Llenado del plato: el peso sube porque el operador agrega alimento |
| `ruido` | ⚡ | `#ef4444` | Falsa actividad: variación sin causa real (vibración, interferencia, etc.) |
| `ciclo_servido_alimento` | 🟡 | `#facc15` | Ciclo completo: un servido seguido de una o más alimentaciones |

---

## Decisión

Cuatro categorías mutuamente excluyentes a nivel de evento individual. Los ciclos
(`ciclo_servido_alimento`) son una capa de análisis sobre pares servido+alimentacion —
no se anotan como eventos individuales sino que se registran en `ciclos_servido_alimento.csv`.

---

## Consecuencias

**Positivas:**
- Separación clara: alim vs serv en 7.63σ (`tpl_doble_rampa`) — las categorías son discriminables
- `ruido` actúa como clase negativa limpia — mejora la separación A/R y S/R
- Los ciclos permiten análisis temporal de patrones de alimentación (Tab 7 / Tab 8)

**Negativas / trade-offs:**
- Eventos ambiguos (ej. movimiento del plato sin consumo) requieren criterio del anotador
- `ciclo_servido_alimento` como entidad separada agrega complejidad al pipeline (CSV adicional)

---

## Ver también

- [[14_Experimentos/EXP_AlphaV2_Pipeline]]
- [[15_Resultados/RESULT_AlphaV2_Snapshots]]
