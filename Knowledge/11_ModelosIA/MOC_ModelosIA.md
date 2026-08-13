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
| [[13_Features/README_ShapeFeatures]] | v2 | Activo | 102 features en 15 familias (F00–F14) — numpy/scipy only |
| [[MODEL_EvidenceEngine]] | v2 (2026-08-10) | Activo | Normalización + pesos calculados desde los datos sobre las 102 features — 78.8% accuracy held-out (antes: 49.6%, peor que adivinar). Mejor: `tpl_doble_rampa` 7.69σ |

## Modelos futuros / en planificación

| Modelo | Propósito |
|--------|-----------|
| Clasificador supervisado | Alimentacion / Servido / Ruido automático |
| Modelo circadiano | Predicción hora siguiente alimentación |
| Reward Learning | Aprendizaje de preferencias desde feedback implícito |
| [[05_API/SPEC_HungerBar_Alimentacion]] | v1 implementada (2026-08-10) con reglas simples en TS, no el Evidence Engine real — port completo queda como upgrade path |

---

## Relaciones

- Depende de: [[13_Features/README_ShapeFeatures]]
- Entrenado con: [[10_Datasets/README_Datasets]]
- Resultados en: [[15_Resultados/MOC_Resultados]]
- Ver papers: [[16_Papers/README_Papers]]

---

## Estado de documentación

- [x] [[13_Features/README_ShapeFeatures]] — el "MODEL_MotorMatematico" planeado acá terminó
  documentado bajo `13_Features/` en vez de `11_ModelosIA/` (son features, no un modelo
  entrenado) — corregido el link roto 2026-08-12, apuntaba a un archivo que nunca existió.
- [x] [[MODEL_EvidenceEngine]] — creado 2026-08-10
- [ ] Modelos futuros con ADR de arquitectura
