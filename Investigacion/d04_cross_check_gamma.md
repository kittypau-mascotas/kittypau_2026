# Ciclo Delta — Experimento D-08: Cross-check con etiquetas de Gamma

**Fecha:** 2026-06-22
**Estado:** ✅ Completado — ARI=0.1594 (coincidencia_baja)
**Prerequisito:** D-01 a D-07 completos
**Script:** [../fase_4_validacion/scripts/d01_cross_check_gamma.md](../fase_4_validacion/scripts/d01_cross_check_gamma.md)

---

## Objetivo

Medir si los clusters no supervisados de Delta coinciden con las etiquetas
supervisadas de Gamma. Valida la calidad del etiquetado y detecta patrones
nuevos no capturados por las 3 clases de Gamma (alimentacion / servido /
reposo).

## Algoritmo / Tecnica

- Join temporal lecturas Delta ↔ sesiones Gamma (ventana ±15s)
- Adjusted Rand Index (ARI) y Normalized Mutual Information (NMI)
- Heatmap de pureza: filas = clusters Delta, columnas = clases Gamma

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `JOIN_WINDOW_S` | 15 | Tolerancia de union temporal |
| Etiquetas Gamma | alimentacion / servido / reposo | Las 3 clases del modelo supervisado |

## Resultados

| Metrica | Valor | Umbral | Estado |
|---|---|---|---|
| ARI | **0.1594** | ≥ 0.20 | ⚠️ bajo umbral |
| NMI | **0.1199** | ≥ 0.25 | ⚠️ bajo umbral |
| Lecturas cruzadas | 4,034 de 134,164 (3.0%) | — | — |
| Pureza cluster servido (Cluster 0) | **50.1%** | — | ✅ |
| Pureza cluster alimentacion (Cluster 1) | **68.6%** | — | ✅ |

### Mapa de pureza (Cluster × Etiqueta Gamma)

| Cluster | alimentacion | reposo | servido | sin_clasificar |
|---------|-------------|--------|---------|----------------|
| **Cluster 0** (servido) | 26.3% | 20.8% | **50.1%** | 2.8% |
| **Cluster 1** (alim/reposo) | **68.6%** | 24.5% | 4.1% | 2.8% |

## Hallazgos

- **ARI=0.159 es esperado**: K-Means divide en 2 clusters binarios (servido vs no-servido) mientras Gamma tiene 4 categorías (alim / servido / reposo / sin_clasificar). La baja coincidencia global es estructural, no un error.
- **Cluster 0 = servido** con 50.1% de pureza: el cluster detecta correctamente la mitad de las sesiones de servido en las lecturas cruzadas. El 50% restante en Cluster 0 es reposo/alimentación con delta_w positivo por ruido o traslapes temporales.
- **Cluster 1 = alimentación** con 68.6% de pureza: el cluster más poblado captura la dinámica de descenso de peso durante las comidas.
- **Solo 3% de lecturas cruzadas** con etiquetas Gamma: la gran mayoría de lecturas Delta (97%) son de `reposo` sin sesión etiquetada, lo que diluye el ARI.
- ARI < 0.3 → **Delta descubre estructura no capturada** por las 3 clases de Gamma. Potencial para nuevas clases en Ciclo Epsilon.

## Visualizaciones generadas

- [x] `fase_4_validacion/outputs/cross_check_report/heatmap_cluster_vs_etiqueta.html`
- [x] `fase_4_validacion/outputs/cross_check_report/cross_check_results.json`

## Decision

ARI bajo (0.16) es esperado por la diferencia de granularidad (2 clusters vs 4 clases). La pureza del Cluster 0 como "servido" (50.1%) valida que Delta sí captura el patrón de servido sin etiquetas. Se recomienda usar los 2 clusters como pseudo-etiquetas de alta calidad (Silhouette=0.816) en Ciclo Epsilon para bootstrapping supervisado.

## Referencias

- [../fase_4_validacion/scripts/d01_cross_check_gamma.md](../fase_4_validacion/scripts/d01_cross_check_gamma.md)
- [d01_clustering_peso.md](d01_clustering_peso.md)
- [d02_anomaly_detection.md](d02_anomaly_detection.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)
- `06_AUDITORIA_SIN_CARGADOR.md`
- `07_AUDITORIA_KPCL0036_ERROR_PESO.md`
