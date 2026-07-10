---
id: moc_modelos_ia
title: MOC — Modelos de IA
type: knowledge
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - moc
  - ia
  - modelos
related:
  - [[00_HOME]]
  - [[13_Features/README_ShapeFeatures]]
  - [[14_Experimentos/MOC_Experimentos]]
---

# MOC — Modelos de IA

---

## Modelos activos

| Documento | Versión | Estado | Descripción |
|-----------|---------|--------|-------------|
| [[MODEL_MotorMatematico]] | v2 | Activo | 102 features en 15 familias (F00–F14) — numpy/scipy only |
| [[MODEL_EvidenceEngine]] | v1 | Activo | 23 features con pesos calibrados + softmax — mejor: `tpl_doble_rampa` 7.63σ |

## Modelos futuros / en planificación

| Modelo | Propósito |
|--------|-----------|
| Clasificador supervisado | Alimentacion / Servido / Ruido automático |
| Modelo circadiano | Predicción hora siguiente alimentación |
| Reward Learning | Aprendizaje de preferencias desde feedback implícito |

---

## Relaciones

- Depende de: [[13_Features/README_ShapeFeatures]]
- Entrenado con: [[10_Datasets/README_Datasets]]
- Resultados en: [[15_Resultados/MOC_Resultados]]
- Ver papers: [[16_Papers/README_Papers]]

---

## Estado de documentación

- [ ] MODEL_MotorMatematico
- [ ] MODEL_EvidenceEngine
- [ ] Modelos futuros con ADR de arquitectura
