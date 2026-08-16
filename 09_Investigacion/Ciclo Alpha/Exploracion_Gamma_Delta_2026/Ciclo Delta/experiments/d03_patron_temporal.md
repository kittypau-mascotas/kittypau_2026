# Ciclo Delta — Experimento D-Temporal: Patrones temporales

**Fecha:** 2026-06-21
**Estado:** ⏳ Pendiente
**Prerequisito:** Pre-D completo (readings_delta.parquet disponible)
**Script:** No tiene script de fase dedicado — analisis derivado de Fase 2 y features temporales de `_delta_utils`

---

## Objetivo

Analizar si los patrones de comportamiento de Bandida tienen estructura
temporal (hora del dia, dia de semana) que emerja de manera natural en el
espacio no supervisado, sin depender de las etiquetas de Gamma.

## Algoritmo / Tecnica

- Distribucion horaria de lecturas por cluster (K-Means ganador de D-01)
- Heatmap semana x hora con `weight_zscore` promedio
- Correlacion de `hour_sin`/`hour_cos`/`dia_semana_sin` con asignacion de cluster

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `TZ_LOCAL` | America/Santiago | Siempre hora local para features de negocio |
| Features temporales | `hour_sin`, `hour_cos`, `dia_semana_sin` | Heredadas de Gamma via FEATURES_GAMMA |

## Resultados

| Pregunta | Respuesta | Estado |
|---|---|---|
| ¿Hay cluster dominantemente nocturno? | — | ⏳ |
| ¿Hay patron semanal en el cluster de reposo? | — | ⏳ |
| ¿`dia_semana_sin` discrimina clusters? | — | ⏳ |

## Hallazgos

[Completar despues de ejecutar Fase 2 y analizar los clusters]

## Visualizaciones generadas

- [ ] `fase_2_clustering/outputs/visualizaciones/heatmap_hora_cluster.html`
- [ ] `fase_2_clustering/outputs/visualizaciones/patron_semanal.html`

## Decision

[Completar: si hay estructura temporal no capturada por Gamma, documentarla
como insumo para Ciclo Epsilon]

## Referencias

- [../fase_1_datos/scripts/_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [d01_clustering_peso.md](d01_clustering_peso.md)
- [../EXPERIMENT_TRACKER_DELTA.md](../EXPERIMENT_TRACKER_DELTA.md)
