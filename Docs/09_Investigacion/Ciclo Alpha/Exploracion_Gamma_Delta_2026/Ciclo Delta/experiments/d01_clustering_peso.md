# Ciclo Delta — Experimento D-01 a D-04: Clustering de peso

**Fecha:** 2026-06-22
**Estado:** ✅ Completado
**Prerequisito:** Pre-D completo
**Script:** [fase_2_clustering/scripts/d01_kmeans_baseline.md](../fase_2_clustering/scripts/d01_kmeans_baseline.md) y siguientes (d02, d03, d04, d05)

---

## Objetivo

Encontrar estructura de clusters en las 18 features de Delta (13 de Gamma +
5 propias) usando cuatro algoritmos distintos (K-Means, DBSCAN, HDBSCAN,
GMM) y seleccionar el mejor para el cruce con las etiquetas de Gamma.

## Algoritmo / Tecnica

- K-Means (baseline, D-01)
- DBSCAN (D-02)
- HDBSCAN (D-03)
- GMM (D-04)
- Reporte comparativo (D-05)

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `N_CLUSTERS_RANGE` | 2–7 | Rango razonable para explorar K/n_components |
| `DBSCAN_EPS_RANGE` | 0.3, 0.5, 0.8, 1.0, 1.5 | Sweep estandar sobre features escaladas |
| `DBSCAN_MIN_SAMPLES` | 5 | — |
| `HDBSCAN_MIN_CLUSTER` | 10 | — |

## Resultados

### K-Means sweep

| k | Silhouette | Inercia | Calinski-Harabasz | Davies-Bouldin |
|---|-----------|---------|-------------------|----------------|
| **2** | **0.8165** ✅ | 2,080,504 | 21,567 | 1.152 |
| 3 | 0.1450 | 1,889,528 | 18,653 | 1.896 |
| 4 | 0.1635 | 1,737,255 | 17,445 | 1.657 |
| 5 | 0.1424 | 1,635,408 | 15,987 | 1.816 |
| 6 | 0.1314 | 1,505,866 | 16,198 | 1.674 |
| 7 | 0.1422 | 1,371,845 | 17,002 | 1.501 |

→ **k óptimo = 2** (silhouette máximo por amplio margen)

### DBSCAN sweep

| eps | Clusters | Noise % | Silhouette |
|-----|----------|---------|-----------|
| **0.3** | 1,322 | 9.71% | **0.2418** ✅ |
| 0.5 | 941 | 6.92% | 0.1939 |
| 0.8 | 345 | 5.21% | -0.192 |
| 1.0 | 247 | 4.36% | -0.225 |
| 1.5 | 190 | 2.75% | -0.052 |

→ **eps óptimo = 0.3**

### HDBSCAN
- Clusters: 1,868 · Noise: 7.70% (10,325 pts) · Silhouette: 0.3454 ✅

### GMM sweep (BIC mínimo)

| n | BIC |
|---|-----|
| 2 | -6,033,780 |
| 3 | -8,771,631 |
| 4 | -9,264,367 |
| 5 | -10,631,516 |
| 6 | -12,111,754 |
| **7** | **-12,337,714** ✅ |

→ **n=7 componentes** (BIC mínimo) · 30 candidatos anomalía (max prob < 0.6)

### Comparación final de algoritmos

| Algoritmo | Clusters | Silhouette | Noise % | Estado umbral |
|-----------|---------|-----------|---------|---------------|
| **K-Means** | **2** | **0.816** ✅ | 0% | ✅ ≥ 0.25 |
| DBSCAN | 1,322 | 0.242 | 9.71% | ✅ ≥ 0.25 |
| HDBSCAN | 1,868 | 0.345 | 7.70% | ✅ ≥ 0.25 |
| GMM | 7 | — | 0% | — (BIC-based) |

## Hallazgos

- **K-Means k=2 es el ganador claro** con Silhouette=0.816 — muy por encima de todos los demás.
- El salto de k=2 a k=3 es drástico (0.817 → 0.145): los datos tienen una separación binaria natural.
- **Cluster 0 = perfil servido** (delta_w medio = +4.6g): lecturas con subida de peso.
- **Cluster 1 = perfil alimentación/reposo** (delta_w negativo o neutro).
- DBSCAN y HDBSCAN generan miles de micro-clusters: la estructura no es densa-local sino globalmente binaria.
- GMM con n=7 es útil para detectar candidatos ambiguos (baja probabilidad de pertenencia).

## Visualizaciones generadas

- [x] `fase_2_clustering/outputs/visualizaciones/kmeans_umap.html`
- [x] `fase_2_clustering/outputs/visualizaciones/dbscan_umap.html`
- [x] `fase_2_clustering/outputs/visualizaciones/hdbscan_umap.html`
- [x] `fase_2_clustering/outputs/visualizaciones/gmm_umap.html`
- [x] `fase_1_datos/outputs/visualizaciones/umap_delta_w.html`
- [x] `fase_1_datos/outputs/visualizaciones/umap_is_plateau.html`
- [x] `fase_1_datos/outputs/visualizaciones/umap_hour_sin.html`

## Decision

**Algoritmo ganador: K-Means k=2** (Silhouette=0.816, sin noise, separación binaria clara).
`cluster_ganador` persistido en `readings_delta.parquet` para Fases 3 y 4.
Cluster 0 = candidato servido · Cluster 1 = alimentación/reposo.

## Referencias

- [_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [EXPERIMENT_TRACKER_DELTA.md](../EXPERIMENT_TRACKER_DELTA.md)
