---
tags: [investigacion, data, analisis, moc]
area: Investigacion
tipo: MOC
---

# 🔬 Investigación — Mapa de Contenido

> Análisis de datos, ciclos de investigación (Alpha, Gamma, Delta, Alpha v2) y
> documentación técnica de KPCL0034/KPCL0036. Todos los `.md` viven planos en la
> raíz de `Investigacion/` — el prefijo del nombre dice a qué ciclo pertenece
> cada uno (ver convención en [[README]]).
>
> **Centro de esta carpeta:** [[README]] apunta directo a
> `Ciclo_Alpha_v2/fase_0_ruido/app_anotacion_av2.py` — la app que consolida el
> motor matemático y la anotación manual.

---

## 📌 Documentos maestros (sin prefijo — cross-cycle)

- [[README]] — entrada operativa completa del ecosistema
- [[GLOSARIO]] — devices, features, clases, parámetros globales (base, Alpha v1)
- [[ESTADO_PROYECTO_Y_NUEVA_DIRECCION]] — por qué se archivaron Alpha/Gamma/Delta y nació Alpha v2
- [[REGLAS_EVENTOS_ALIMENTACION]] — reglas canónicas de eventos, fuente de verdad (aplica a todos los ciclos)
- [[OPERATIVIZACION_SESIONES_SUPABASE]] — estructura SQL/API en Supabase
- [[REGISTRO_EVENTOS_2026-04-16]] — bitácora del backfill inicial de 49 eventos manuales

---

## 🖥️ Dashboard KPCL (prefijo `KPCL_`) — toolkit operativo

Scripts, CSVs y HTML del dashboard viven en [[Dashboard_KPCL]]. Docs:

- [[KPCL_GUIA_DASHBOARD]] — cómo abrir, usar y mantener el dashboard interactivo
- [[KPCL_AUDITORIA_SIN_CARGADOR]] — diagnóstico del experimento compartido sin cargador
- [[KPCL_AUDITORIA_KPCL0036_ERROR_PESO]] — diagnóstico peso anómalo KPCL0036

---

## 🚀 Ciclo Alpha v2 (prefijo `av2_`, numerado `00`–`09`) — ACTIVO

Sistema de detección por segmentos con reglas matemáticas. Sin ML supervisado.
El código vive en `Ciclo_Alpha_v2/fase_0_ruido/` (`app_anotacion_av2.py` es el
centro de toda la carpeta). Documentación fusionada de 21 archivos previos a
**exactamente 10 documentos** (2026-08-16), sin perder contenido:

| # | Documento | Contenido (fusión de) |
|---|---|---|
| 00 | [[av2_00_INDICE_Y_VISION_GENERAL]] | ⭐ Índice comida + índice agua + README de fases/constantes + tracker de experimentos |
| 01 | [[av2_01_ARQUITECTURA_Y_PIPELINE]] | Pipeline completo + arquitectura técnica de la app (caché, funciones) + cómo lanzarla + rutas críticas de datos |
| 02 | [[av2_02_DISPOSITIVO_Y_DATOS]] | KPCL0034, UUIDs, fuentes, período cubierto |
| 03 | [[av2_03_DETECCION_SEGMENTOS]] | Algoritmo de `01_genera_candidatos.py` paso a paso |
| 04 | [[av2_04_MOTOR_MATEMATICO]] | ⭐ Features F00 clásicas + evolución a 102 features/15 familias + Evidence Engine + recopilación técnica detallada |
| 05 | [[av2_05_ANOTACION_Y_CATEGORIAS]] | Workflow de anotación manual, categorías |
| 06 | [[av2_06_UMBRALES_Y_REGLAS]] | `umbrales.json`, reglas del detector y clasificador |
| 07 | [[av2_07_RESULTADOS_Y_BENCHMARKS]] | Estadísticas de anotaciones + historial de snapshots + benchmark de 20 modelos + diagnóstico de clustering |
| 08 | [[av2_08_APP_ANOTACION]] | 8 tabs de la app Streamlit, componentes técnicos |
| 09 | [[av2_09_APRENDIZAJES_CONSOLIDADOS]] | ⭐ Memoria de Alpha + Gamma + Delta + Exp10-NN, leer antes de escribir código nuevo |

---

## 🧪 Ciclo Alpha v1 (prefijo `av1_`) — CERRADO

Pipeline ML supervisado LightGBM. 11 experimentos. Archivado en junio 2026.
Código en `Ciclo_Alpha_v1/`.

- [[av1_README]] — guía de ejecución Fase 1→4
- [[av1_REFERENCIAS]] — bibliografía de referencia para Data Science y ML
- [[av1_PREPARACION_NUEVA_INGESTA]] — roadmap Exp 08
- [[av1_ML_PREDICCION_ALIMENTACION]] — especificación original del problema ML
- [[av1_REPORTE_SESION_2026-04-26]] — primera sesión de experimentación
- [[av1_RESUMEN_EXPERIMENTOS_FASE3]] · [[av1_REPORTE_EXPERIMENTOS_FASE3]] — resultados de Fase 3
- [[av1_ANALISIS_COLAB_KPCL0034_07052026]] — análisis exploratorio en Colab (export mayo 2026)
- [[av1_EXPERIMENT_TRACKER]] — tabla maestra de experimentos Exp01–11
- [[av1_EXPERIMENTS_README]] · [[av1_FASE_2_DATASET_README]] · [[av1_FASE_3_MODELOS_README]] — índices de subcarpetas de código
- [[av1_EXPERIMENTOS_DETALLE]] — bitácora completa de los 12 experimentos (Exp01–11, fusión de los `av1_exp_NN_*.md` individuales)

---

## 🔬🌊 Ciclo Gamma + Ciclo Delta — ARCHIVADO (fusionados en 1 archivo)

Segunda generación (Gamma, supervisado multi-modelo) y exploración no
supervisada (Delta, clustering + anomalías). Código en
`Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/{Ciclo_Gamma,Ciclo_Delta}/`.

- [[delta_gamma_antiguio]] — ⭐ **único documento** con todo Gamma + Delta:
  memoria institucional (métricas, los 8 errores de Alpha que Gamma corrigió,
  comparación de features Alpha vs Gamma), guías maestras de ambos ciclos,
  runbook de unificación/retiquetado, bitácoras completas de experimentos
  (G-01 a G-06, D-01 a D-05), specs de scripts, trackers y glosarios. Léase
  antes de reabrir cualquier pregunta ya respondida en Gamma/Delta.

> Fusión de 15 archivos previamente separados (`GAMMA_INSTRUCTIVO.md`,
> `GAMMA_IMPLEMENTACION.md`, `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md`,
> `COMO_EJECUTAR_GAMMA.md`, `GAMMA_EXPERIMENTOS_DETALLE.md`,
> `GAMMA_SCRIPTS_SPECS.md`, `EXPERIMENT_TRACKER_GAMMA.md`, `GLOSARIO_GAMMA.md`,
> `instructivo_delta.md`, `inferencia_delta.md`, `DELTA_EXPERIMENTOS_DETALLE.md`,
> `DELTA_ANOMALY_REPORT.md`, `EXPERIMENT_TRACKER_DELTA.md`, `GLOSARIO_DELTA.md`,
> `APRENDIZAJES_GAMMA_DELTA.md`) — todo en orden de lectura lógico dentro del
> mismo archivo, separado por `---` con comentario de procedencia.

---

## 📊 Estado rápido del Ciclo Alpha v2

| Artefacto | Estado |
|---|---|
| `candidatos_av2.csv` | ✅ 916 candidatos · 2026-04-07 → 2026-07-22 |
| `anotaciones_av2.csv` | ✅ 814 anotaciones (alim=356, ruido=374, serv=84) — actualizado 2026-08-16 |
| `umbrales.json` | ⚠️ v1.3 — calibrado contra n=496 (2026-08-11), desactualizado frente a las 814 actuales — pendiente recalibrar |
| Clasificador automático | ⏳ Fase 1 pendiente |
