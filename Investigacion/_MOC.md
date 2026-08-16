---
tags: [investigacion, data, analisis, moc]
area: Investigacion
tipo: MOC
---

# 🔬 Investigación — Mapa de Contenido

> Análisis de datos, ciclos alpha, auditorías y documentación técnica de KPCL0034/KPCL0036.
>
> **Centro de esta carpeta:** [[README]] apunta directo a `Ciclo Alpha v2/fase_0_ruido/app_anotacion_av2.py` — la app que consolida el motor matemático y la anotación manual.

---

## 📌 Documentos maestros

- [[README]] — entrada operativa completa del ecosistema
- [[GLOSARIO]] — devices, features, clases, parámetros globales, convenciones
- [[EXPERIMENT_TRACKER]] — tabla de experimentos del Ciclo Alpha (Exp01–11)
- [[ESTADO_PROYECTO_Y_NUEVA_DIRECCION]] — por qué se archivó Alpha/Gamma/Delta y nació Alpha v2

---

## 📋 Contexto y reglas canónicas

- [[01_GUIA_DASHBOARD_KPCL]] — cómo usar el dashboard interactivo
- [[02_REGLAS_EVENTOS_ALIMENTACION]] — reglas canónicas de eventos (fuente de verdad)
- [[03_ML_PREDICCION_ALIMENTACION]] — especificación original del problema ML
- [[04_OPERATIVIZACION_SESIONES_SUPABASE]] — estructura SQL/API en Supabase
- [[05_ANALISIS_COLAB_KPCL0034_07052026]] — análisis exploratorio en Colab (export Mayo 2026)
- [[06_AUDITORIA_SIN_CARGADOR]] — diagnóstico experimento sin cargador
- [[07_AUDITORIA_KPCL0036_ERROR_PESO]] — diagnóstico peso anómalo KPCL0036
- [[08_REGISTRO_EVENTOS_2026-04-16]] — bitácora del backfill inicial de 49 eventos manuales

---

## 🧪 Ciclo Alpha (v1) — CERRADO

Pipeline ML supervisado LightGBM. 11 experimentos. Archivado en Junio 2026.

- [[01_REFERENCIAS]] — bibliografía de referencia para Data Science y ML
- [[03_REPORTE_SESION_2026-04-26]] — primera sesión de experimentación
- [[05_REPORTE_EXPERIMENTOS_FASE3]] — resultados completos de Fase 3

**Experimentos:**
- [[exp_01_linea_base]] · [[exp_02_threshold_rebalanceo]] · [[exp_03_mejor_base]]
- [[exp_04_smote_calibracion]] · [[exp_05_nueva_ingesta]]

---

## 🚀 Ciclo Alpha v2 — ACTIVO

Sistema de detección por segmentos con reglas matemáticas. Sin ML supervisado.

### Índice y arquitectura
- [[00_INDICE_AV2]] — ⭐ MOC principal del Ciclo Alpha v2
- [[01_ARQUITECTURA_PIPELINE]] — pipeline completo, fases y flujo de datos

### Datos y detección
- [[02_DISPOSITIVO_Y_DATOS]] — KPCL0034, UUIDs, fuentes, período cubierto
- [[03_DETECCION_SEGMENTOS]] — algoritmo de `01_genera_candidatos.py` paso a paso

### Matemática y features
- [[04_MATEMATICA_SHAPE_FEATURES]] — ⭐ monotonía, R², ZCR, similitud coseno (con fórmulas)

### Anotación y clasificación
- [[05_ANOTACION_Y_CATEGORIAS]] — workflow de anotación, 3 categorías, 304 eventos
- [[06_UMBRALES_Y_REGLAS]] — `umbrales.json` v1.2, reglas del detector
- [[07_RESULTADOS_304_ANOTACIONES]] — estadísticas completas, percentiles, separación por categoría

### App
- [[08_APP_ANOTACION_AV2]] — 6 tabs de la app Streamlit, componentes técnicos

### Hoja de ruta
- [[09_EVOLUCION_MOTOR_MATEMATICO]] — ⏳ PENDIENTE: 14 familias, 200+ features, Evidence Engine

---

## 📊 Estado rápido del Ciclo Alpha v2

| Artefacto | Estado |
|---|---|
| `candidatos_av2.csv` | ✅ 417 candidatos · 2026-04-08 → 2026-06-26 |
| `anotaciones_av2.csv` | ✅ 304 anotaciones (alim=160, ruido=113, serv=31) |
| `umbrales.json` | ✅ v1.2 — shape features como discriminador primario |
| Clasificador automático | ⏳ Fase 1 pendiente |
