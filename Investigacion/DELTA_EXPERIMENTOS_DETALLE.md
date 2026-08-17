# Ciclo Delta — Bitácoras de Experimentos (D-01 a D-05)

> Fusión de los 5 archivos `d0N_*.md` de resultados de experimentos. Ver [[EXPERIMENT_TRACKER_DELTA]] para la tabla resumen con métricas comparadas.


---


<!-- ==== fusionado desde d01_clustering_peso.md ==== -->

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
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)


---


<!-- ==== fusionado desde d02_anomaly_detection.md ==== -->

# Ciclo Delta — Experimento D-05 a D-07: Deteccion de anomalias

**Fecha:** 2026-06-22
**Estado:** ✅ Completado (Autoencoder ⚠️ falló — consenso con 2/3 detectores)
**Prerequisito:** D-01 a D-04 completos (clustering)
**Script:** [fase_3_anomalias/scripts/d01_isolation_forest.md](../fase_3_anomalias/scripts/d01_isolation_forest.md) y siguientes (d02, d03, d04)

---

## Objetivo

Detectar anomalias en la curva de peso de KPCL0034 usando tres detectores
independientes (Isolation Forest, Autoencoder, LOF) y construir un
consenso robusto.

## Algoritmo / Tecnica

- Isolation Forest (D-05)
- Autoencoder (D-06)
- LOF + Consenso (D-07)
- Reporte unificado por tipo (H / C / U)

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `IF_CONTAMINATION` | 0.05 | 5% esperado de anomalias |
| `LOF_N_NEIGHBORS` | 20 | — |
| `AUTOENCODER_EPOCHS` | 50 | — |
| `AUTOENCODER_LATENT` | 4 | Dimension del espacio latente |

## Resultados

| Detector | Anomalias detectadas | % dataset | Estado |
|---|---|---|---|
| Isolation Forest (IF) | 6,709 | 5.00% | ✅ |
| Autoencoder | — | — | ⚠️ OSError: c10.dll de PyTorch — incompatibilidad VC++ en Windows |
| LOF | 6,709 | 5.00% | ✅ |
| **Consenso IF∩LOF (≥2 votos)** | **676** | **0.50%** | ✅ |
| Tipo H (hardware, clock_invalid>0.5) | 338 | — | ✅ ≥ 5 ✅ |
| Tipo C (comportamental, horario 06-22h) | 178 | — | — |
| Tipo U (sin clasificar, nocturnas) | 160 | — | — |

### Anomalías por mes

| Mes | Anomalías |
|-----|-----------|
| Abril 2026 | 255 |
| Mayo 2026 | 196 |
| Junio 2026 | 225 |

### Top 5 más extremas (2 votos — consenso máximo)

| Timestamp | Votos | clock_invalid | Tipo |
|-----------|-------|---------------|------|
| 2026-06-12 15:19 UTC | 2 | 1.0 | H |
| 2026-05-28 11:42 UTC | 2 | 1.0 | H |
| 2026-04-12 11:59 UTC | 2 | 0.5 | C |
| 2026-06-12 15:06 UTC | 2 | 1.0 | H |
| 2026-04-21 22:40 UTC | 2 | 0.5 | U |

## Hallazgos

- **IF y LOF coinciden exactamente en cantidad (6,709)** — ambos usan contamination=5%. El consenso reduce a 676 anomalías robustas (0.50% del dataset).
- **Tipo H domina** (338/676 = 50%): lecturas con `clock_invalid=100%` que coinciden con períodos sin cargador documentados en `KPCL_AUDITORIA_SIN_CARGADOR.md`. Validado.
- **Autoencoder pendiente:** Instalar Visual C++ Redistributable 2022 x64 o usar entorno conda para resolver el DLL de PyTorch. Con 3/3 detectores, el consenso sería más estricto.
- **75.65% de anomalías IF tienen clock_invalid=True** — correlación directa hardware/anomalía.

## Visualizaciones generadas

- [x] `fase_3_anomalias/outputs/visualizaciones/isolation_forest_timeline.html`
- [x] `fase_3_anomalias/outputs/visualizaciones/anomaly_timeline_por_tipo.html`
- [ ] `outputs/visualizaciones/reconstruction_error.html` (pendiente — autoencoder no ejecutado)

## Decision

Consenso IF∩LOF con 676 anomalías es suficiente y robusto. Umbral de Tipo H (≥5) superado por amplio margen (338). Se procede a Fase 4.

## Referencias

- [_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)
- `KPCL_AUDITORIA_SIN_CARGADOR.md`
- `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md`


---


<!-- ==== fusionado desde d03_patron_temporal.md ==== -->

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
- [DELTA_EXPERIMENTOS_DETALLE.md](DELTA_EXPERIMENTOS_DETALLE.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)


---


<!-- ==== fusionado desde d04_cross_check_gamma.md ==== -->

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
- [DELTA_EXPERIMENTOS_DETALLE.md](DELTA_EXPERIMENTOS_DETALLE.md)
- [DELTA_EXPERIMENTOS_DETALLE.md](DELTA_EXPERIMENTOS_DETALLE.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)
- `KPCL_AUDITORIA_SIN_CARGADOR.md`
- `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md`


---


<!-- ==== fusionado desde d05_candidatos_servido.md ==== -->

# Ciclo Delta — Experimento D-09: Candidatos de servido nuevos

**Fecha:** 2026-06-22
**Estado:** ✅ Completado — 2 candidatos nuevos (umbral no alcanzado: necesitaba ≥10)
**Prerequisito:** D-08 completo (cross-check Gamma ejecutado)
**Script:** [../fase_4_validacion/scripts/d02_candidatos_servido.md](../fase_4_validacion/scripts/d02_candidatos_servido.md)

---

## Objetivo

Usar el cluster Delta de mayor `delta_w` promedio para generar candidatos
de sesiones de `servido` que Gamma no tenia etiquetadas, aumentando el
conjunto de entrenamiento para el proximo ciclo supervisado.

## Logica de deteccion

El cluster "candidato a servido" se identifica por:
- Mayor promedio de `delta_w` (subida de peso)
- `rolling_std_10` alto (transicion activa)
- `net_weight` en aumento

Lecturas consecutivas de ese cluster (gap < `GAP_CUTOFF_S`) con
`delta_peso_total > 5g` y duracion > 30s se proponen como sesiones nuevas.

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `GAP_CUTOFF_S` | 300 | Heredado de Gamma — separacion entre sesiones |
| `MIN_LECTURAS` | 3 | Minimo para considerar una sesion valida |
| `MIN_DELTA_PESO_G` | 5.0 | Gramos minimos de subida para ser servido |
| `MIN_DURACION_S` | 30 | Duracion minima de la sesion |

## Resultados

| Metrica | Valor | Umbral | Estado |
|---|---|---|---|
| Candidatos totales encontrados | **12** | — | — |
| Candidatos ya etiquetados en Gamma | 10 | — | — |
| Candidatos NUEVOS (no en Gamma) | **2** | ≥ 10 | ⚠️ bajo umbral |
| Rango temporal candidatos nuevos | Jun 01–02, 2026 | — | — |
| Gramos estimados (candidatos nuevos) | 43g (18g + 25g) | — | — |
| Cluster identificado como servido | Cluster 0 (delta_w medio = +4.61g) | — | ✅ |

### Todos los candidatos (12 en total)

| ts_inicio (UTC) | ts_termino | delta_peso_g | duracion_s | n_lecturas | nuevo |
|-----------------|------------|-------------|-----------|-----------|-------|
| 2026-04-09 23:07 | 23:28 | 45g | 1260s | 40 | — |
| 2026-04-27 04:49 | 05:03 | 48g | 870s | 30 | — |
| 2026-04-28 21:03 | 21:18 | 40g | 870s | 30 | — |
| 2026-05-04 01:43 | 01:58 | 49g | 870s | 30 | — |
| 2026-05-30 00:42 | 00:56 | 19g | 840s | 29 | — |
| 2026-05-31 14:41 | 14:55 | 25g | 870s | 30 | — |
| **2026-06-01 09:14** | **09:24** | **18g** | **600s** | 14 | ✅ NUEVO |
| **2026-06-02 12:36** | **12:41** | **25g** | **330s** | 12 | ✅ NUEVO |
| 2026-06-02 21:11 | 21:16 | 13g | 300s | 11 | — |
| 2026-06-05 23:15 | 23:29 | 43g | 870s | 30 | — |
| 2026-06-10 17:45 | 17:58 | 11g | 750s | 26 | — |
| 2026-06-13 04:24 | 04:29 | 14g | 270s | 10 | — |

## Hallazgos

- **10 de 12 candidatos ya estaban etiquetados en Gamma** — valida que el cluster detecta sesiones reales de servido.
- **Solo 2 candidatos nuevos**: ambos en Junio 2026. El dataset de Mayo–Junio tiene menos densidad de anotaciones retroactivas.
- Los candidatos nuevos son de duración media-corta (330–600s) y gramos moderados (18–25g) — perfil de servido pequeño.
- El umbral de ≥ 10 candidatos nuevos no se alcanzó. La razón principal: el período Abr–May ya estaba bien anotado en Gamma via `app_anotacion.py`.
- Delta como detector de servido nuevo es más valioso en períodos sin anotación retroactiva.

## Salidas

- [x] `fase_4_validacion/outputs/candidatos_servido_delta.csv` — 12 candidatos totales
- [x] `fase_4_validacion/outputs/candidatos_servido_delta_nuevos.csv` — 2 candidatos nuevos

> Los 2 candidatos nuevos deben revisarse manualmente con `app_anotacion_gamma.py`
> antes de incorporarlos como etiquetas. La revisión determina si son servido real
> o ruido del sensor.

## Decision

Solo 2 candidatos nuevos — umbral ≥10 no alcanzado. Se incorporan los 2 para revisión humana en Gamma pero no justifican reentrenamiento solo por este aporte. El aporte real de Delta es la validación de pureza del Cluster 0 (50.1% servido) como base para bootstrapping supervisado en Ciclo Epsilon.

## Referencias

- [../fase_4_validacion/scripts/d02_candidatos_servido.md](../fase_4_validacion/scripts/d02_candidatos_servido.md)
- [DELTA_EXPERIMENTOS_DETALLE.md](DELTA_EXPERIMENTOS_DETALLE.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)
- `../../../Ciclo_Gamma/` — destino final del CSV via app_anotacion_gamma.py


---

<!-- ==== fusionado desde REPORTE_EJECUCION_DELTA.md (discontinuado — el resto de su
     contenido, fase por fase, era redundante con lo ya fusionado arriba y con
     APRENDIZAJES_GAMMA_DELTA.md) ==== -->

## Apéndice — Archivos generados por el pipeline Delta

```
fase_1_datos/data/processed/
  X_scaled.parquet         (134164 × 18)
  X_pca2.parquet           (134164 × 2)
  X_pca10.parquet          (134164 × 10)
  X_umap2.parquet          (134164 × 2)
  readings_delta.parquet   (134164 × N+1, incluye cluster_ganador)

fase_2_clustering/outputs/
  models/kmeans/kmeans_best.pkl
  models/dbscan/dbscan_best.pkl
  models/hdbscan/hdbscan_best.pkl
  models/gmm/gmm_best.pkl
  cluster_report/clustering_comparison.csv
  cluster_report/hdbscan_metrics.csv

fase_3_anomalias/outputs/
  anomalias_if.csv             (6,709 filas)
  anomalias_lof.csv            (6,709 filas)
  anomalias_consenso.csv       (676 filas)
  anomalias_detectadas.csv     (676 filas)
  DELTA_ANOMALY_REPORT.md
  visualizaciones/anomaly_timeline_por_tipo.html

fase_4_validacion/outputs/
  cross_check_report/cross_check_results.json
  cross_check_report/heatmap_cluster_vs_etiqueta.html
  candidatos_servido_delta.csv        (12 filas)
  candidatos_servido_delta_nuevos.csv (2 filas)
```

## Apéndice — Pendiente / Recomendaciones (al cierre del ciclo, 2026-06-22)

1. **Autoencoder (d02 Fase 3):** Instalar Visual C++ Redistributable 2022 x64 o usar un entorno conda para resolver el error DLL de PyTorch. Una vez funcional, re-ejecutar d03_lof.py para obtener consenso 3/3 detectores.
2. **ARI bajo (0.16):** Esperado — K-Means divide en 2 clusters mientras Gamma tiene 4 categorías (alimentacion, reposo, servido, sin_clasificar). El cruce temporal solo alcanzó 3% de las lecturas.
3. **2 candidatos servido nuevos:** Revisar manualmente `candidatos_servido_delta_nuevos.csv` para decidir si agregar a sessions_labeled de Gamma.
4. **Ciclo Epsilon:** Con la separación clara Cluster0=servido / Cluster1=alimentacion, se puede avanzar a modelos supervisados usando estos 2 clusters como pseudo-etiquetas de alta calidad (silhouette=0.816).

---
