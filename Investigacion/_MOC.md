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

## 🚀 Ciclo Alpha v2 (sin prefijo, numerado 00–09) — ACTIVO

Sistema de detección por segmentos con reglas matemáticas. Sin ML supervisado.
El código vive en `Ciclo_Alpha_v2/fase_0_ruido/` (`app_anotacion_av2.py` es el
centro de toda la carpeta).

### Índice y arquitectura
- [[00_INDICE_AV2]] — ⭐ MOC principal del Ciclo Alpha v2 (comida)
- [[00_INDICE_AV2_AGUA]] — MOC propio para hidratación (no se mezcla con comida)
- [[01_ARQUITECTURA_PIPELINE]] — pipeline completo, fases y flujo de datos
- [[AV2_README]] — descripción de las fases + constantes del ciclo
- [[APRENDIZAJES_CONSOLIDADOS]] — ⭐ memoria de Alpha + Gamma + Delta + Exp10-NN, leer antes de escribir código nuevo

### Datos y detección
- [[02_DISPOSITIVO_Y_DATOS]] — KPCL0034, UUIDs, fuentes, período cubierto
- [[03_DETECCION_SEGMENTOS]] — algoritmo de `01_genera_candidatos.py` paso a paso

### Matemática y features
- [[04_MATEMATICA_SHAPE_FEATURES]] — ⭐ monotonía, R², ZCR, similitud coseno (con fórmulas)
- [[09_EVOLUCION_MOTOR_MATEMATICO]] — 102 features en 15 familias + Evidence Engine

### Anotación y clasificación
- [[05_ANOTACION_Y_CATEGORIAS]] — workflow de anotación, categorías
- [[06_UMBRALES_Y_REGLAS]] — `umbrales.json`, reglas del detector
- [[07_RESULTADOS_304_ANOTACIONES]] — estadísticas completas, percentiles, separación por categoría

### App y experimentos
- [[08_APP_ANOTACION_AV2]] — 8 tabs de la app Streamlit, componentes técnicos
- [[AV2_EXPERIMENTS_README]] — tracker de experimentos v2 + baselines

### Docs internos de `fase_0_ruido/` (el home de `app_anotacion_av2.py`)
- [[AV2_FASE_0_RUIDO_README]] — cómo lanzar la app, los 8 tabs, qué hace cada uno
- [[ARQUITECTURA_APP]] — arquitectura técnica interna (caché, responsabilidades por función)
- [[ACTUALIZACION_DATA]] — pipeline completo y rutas críticas de datos
- [[HISTORIAL_RESULTADOS]] — snapshots históricos por ingesta de datos (fuente canónica)
- [[RECOPILACION_DATOS_APP]] — recopilación técnica detallada, motor matemático
- [[ANALISIS_BENCHMARK]] — benchmark abril-mayo-junio, comparación de modelos
- `diagnostico_clustering.md` — análisis de clustering sobre el benchmark (referencia, no indexado individualmente)

---

## 🧪 Ciclo Alpha v1 (prefijo `A1_`) — CERRADO

Pipeline ML supervisado LightGBM. 11 experimentos. Archivado en junio 2026.
Código en `Ciclo_Alpha_v1/`.

- [[A1_README]] — guía de ejecución Fase 1→4
- [[A1_REFERENCIAS]] — bibliografía de referencia para Data Science y ML
- [[A1_PREPARACION_NUEVA_INGESTA]] — roadmap Exp 08
- [[A1_ML_PREDICCION_ALIMENTACION]] — especificación original del problema ML
- [[A1_REPORTE_SESION_2026-04-26]] — primera sesión de experimentación
- [[A1_RESUMEN_EXPERIMENTOS_FASE3]] · [[A1_REPORTE_EXPERIMENTOS_FASE3]] — resultados de Fase 3
- [[A1_ANALISIS_COLAB_KPCL0034_07052026]] — análisis exploratorio en Colab (export mayo 2026)
- [[A1_EXPERIMENT_TRACKER]] — tabla maestra de experimentos Exp01–11
- [[A1_EXPERIMENTS_README]] · [[A1_FASE_2_DATASET_README]] · [[A1_FASE_3_MODELOS_README]] — índices de subcarpetas de código

**Experimentos** (`A1_exp_NN_*.md`):
[[A1_exp_01_linea_base]] · [[A1_exp_02_threshold_rebalanceo]] · [[A1_exp_03_mejor_base]] ·
[[A1_exp_04_smote_calibracion]] · [[A1_exp_05_nueva_ingesta]] · [[A1_exp_06_colab_dataset]] ·
[[A1_exp_07_inferencia_mayo_junio]] · [[A1_exp_08_unificacion_mayo_junio]] ·
[[A1_exp_09a_cadencia_normalizada]] · [[A1_exp_09b_threshold_por_periodo]] ·
[[A1_exp_10_nn_colab]] · [[A1_exp_11_ensemble_gru_lgbm]]

---

## 🔬 Ciclo Gamma (prefijo `GAMMA_` en los docs ambiguos, `g0N_`/`EXPERIMENT_TRACKER_GAMMA`/`GLOSARIO_GAMMA` en el resto) — ARCHIVADO

Segunda generación, supervisado multi-modelo. Código en
`Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Gamma/`.

- [[GAMMA_INSTRUCTIVO]] — guía maestra del ciclo (pipeline, errores, reglas)
- [[GAMMA_IMPLEMENTACION]] — detalle de implementación
- [[CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO]] — runbook operativo Pre-G
- [[COMO_EJECUTAR_GAMMA]] — instrucciones de ejecución
- [[EXPERIMENT_TRACKER_GAMMA]] — estado y métricas de cada experimento G-01 a G-08
- [[GLOSARIO_GAMMA]] — vocabulario específico de Gamma (complementa GLOSARIO.md)

**Experimentos** (resultados, `g0N_*.md`):
[[g01_baseline_limpio]] · [[g02_gbm_benchmark]] · [[g03_feature_engineering]] ·
[[g04_hyperparameter_optimization]] · [[g05_classical_ml_benchmark]] · [[g06_nn_baseline]]

**Specs de scripts** (pre-implementación, `— PY` en el título — Mauro convierte a `.py` a mano):
[[g01_build_labels]] · [[g02_build_features]] · [[g03_build_train_dataset]] ·
[[g04_dataset_report]] · [[g05_build_sessions]] · [[_gamma_phase2_utils]] · [[_gamma_phase3_utils]]

---

## 🌊 Ciclo Delta (prefijo `DELTA_` en el doc ambiguo, `d0N_`/`EXPERIMENT_TRACKER_DELTA`/`GLOSARIO_DELTA` en el resto) — ARCHIVADO

Exploración no supervisada (clustering + anomalías). Código en
`Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Delta/`.

- [[instructivo_delta]] — guía maestra del ciclo no supervisado
- [[inferencia_delta]] — inferencia sobre el modelo no supervisado
- [[REPORTE_EJECUCION_DELTA]] — reporte de ejecución completo
- [[reporte_final_delta]] — reporte final generado por el pipeline
- [[DELTA_ANOMALY_REPORT]] — reporte de anomalías generado (676 H/C/U)
- [[EXPERIMENT_TRACKER_DELTA]] — estado y métricas D-01 a D-Final
- [[GLOSARIO_DELTA]] — vocabulario específico de Delta (complementa GLOSARIO.md y GLOSARIO_GAMMA.md)

**Experimentos** (`d0N_*.md`):
[[d01_clustering_peso]] · [[d02_anomaly_detection]] · [[d03_patron_temporal]] ·
[[d04_cross_check_gamma]] · [[d05_candidatos_servido]]

---

## 🔗 Memoria consolidada de Gamma + Delta

- [[APRENDIZAJES_GAMMA_DELTA]] — ⭐ memoria institucional completa de ambos ciclos:
  métricas exactas, los 8 errores de Alpha que Gamma corrigió, comparación de
  features Alpha vs Gamma, por qué se archivaron. Léase antes de reabrir
  cualquier pregunta ya respondida en Gamma/Delta.

---

## 📊 Estado rápido del Ciclo Alpha v2

| Artefacto | Estado |
|---|---|
| `candidatos_av2.csv` | ✅ 417 candidatos · 2026-04-08 → 2026-06-26 |
| `anotaciones_av2.csv` | ✅ 304+ anotaciones (alim/ruido/servido) |
| `umbrales.json` | ✅ v1.2 — shape features como discriminador primario |
| Clasificador automático | ⏳ Fase 1 pendiente |
