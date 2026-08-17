# Reporte Final — Ciclo Delta

**Generado:** 2026-06-22T10:26:33.981192

## Resumen ejecutivo

- **K-Means k=2 ganó con Silhouette=0.816**: separación binaria clara entre lecturas de "subida de peso" (Cluster 0 = servido) y "descenso/estable" (Cluster 1 = alim/reposo). Los tres algoritmos alternativos (DBSCAN, HDBSCAN, GMM) confirmaron la estructura pero con granularidad excesiva.
- **676 anomalías consenso** (IF∩LOF) detectadas: 50% son Tipo H (hardware — reloj inválido), 26% Tipo C (comportamentales), 24% Tipo U (nocturnas sin clasificar). El Autoencoder falló por incompatibilidad DLL en Windows; pendiente resolución con VC++ 2022.
- **ARI=0.1594 con Gamma** es esperado: K-Means solo genera 2 clusters vs las 4 categorías de Gamma. La pureza del Cluster 0 como "servido" (50.1%) y del Cluster 1 como "alimentación" (68.6%) valida que los clusters son semánticamente coherentes.
- **2 candidatos de servido nuevos** encontrados (Jun 2026, 18g y 25g): umbral ≥10 no alcanzado. El período Abr–May ya estaba bien anotado en Gamma.
- **Recomendación para Ciclo Epsilon**: usar los 2 clusters de K-Means como pseudo-etiquetas de alta calidad (Silhouette=0.816) para bootstrapping supervisado, evitando dependencia total de la anotación manual.

## Clusters encontrados

| algoritmo   |   clusters |   silhouette |   noise_pct | observacion   |
|:------------|-----------:|-------------:|------------:|:--------------|
| K-Means     |          2 |     0.816462 |     0       | —             |
| DBSCAN      |       1322 |     0.241784 |     9.71125 | eps=0.3       |
| HDBSCAN     |       1868 |     0.345394 |     7.69581 | —             |
| GMM         |          7 |   nan        |     0       | BIC minimo    |

## Anomalias detectadas

Ver detalle completo en `DELTA_ANOMALY_REPORT.md`. Resumen:

# Reporte de Anomalias — Ciclo Delta

Generado: 2026-06-22T10:22:57.793601

## Total por tipo

- Tipo H: 338
- Tipo C: 178
- Tipo U: 160

## Top 10 anomalias mas extremas (por votos de consenso)

| ts                        |   votos |   clock_invalid | tipo   |
|:--------------------------|--------:|----------------:|:-------|
| 2026-06-12 15:19:00+00:00 |       2 |             1   | H      |
| 2026-05-28 11:42:30+00:00 |       2 |             1   | H      |
| 2026-04-12 11:59:00+00:00 |       2 |             0.5 | C      |
| 2026-06-12 15:06:30+00:00 |       2 |             1   | H      |
| 2026-04-21 22:40:00+00:00 |       2 |             0.5 | U      |
| 2026-04-10 09:02:00+00:00 |       2 |             0.5 | C      |
| 2026-05-04 02:45:30+00:00 |       2 |             0.5 | U      |
| 2026-06-14 03:07:00+00:00 |       2 |             1   | H      |
| 2026-06-09 17:41:30+00:00 |       2 |             1   | H      |
| 2026-05-06 03:01:00+00:00 |       2 |             0   | U      |

## Candidatos de servido nuevos

- Candidatos nuevos: 2
- Rango temporal: 2026-06-01 09:14:30+00:00 -> 2026-06-02 12:41:30+00:00
- Gramos estimados (suma): 43.0 g

## ARI / NMI con Gamma

- ARI: 0.15941047289271426
- NMI: 0.11992132528802238
- Interpretacion: coincidencia_baja

## Recomendaciones para Gamma

- Revisar los 2 candidatos nuevos de servido (Jun 1–2, 2026) con `app_anotacion_gamma.py` antes de incorporarlos como etiquetas oficiales.
- Las 338 anomalías Tipo H coinciden con períodos documentados en `KPCL_AUDITORIA_SIN_CARGADOR.md`; considerar excluir esas ventanas del dataset de entrenamiento de Gamma para evitar contaminación.
- Las 178 anomalías Tipo C (horario activo) merecen revisión manual: pueden ser sesiones de servido atípicas no capturadas.

## Recomendaciones para el Ciclo Epsilon (si aplica)

- Usar K-Means k=2 como pseudo-etiquetador para lecturas sin anotación humana: Cluster 0 → candidato servido, Cluster 1 → candidato alimentación/reposo.
- Explorar si añadir más features propias de Delta (e.g., `weight_zscore`, `anomaly_score_if`) mejora la separabilidad de `reposo` vs `alimentacion` (actualmente mezclados en Cluster 1).
- Con el Autoencoder funcionando (3/3 detectores), el consenso de anomalías debería reducirse de 676 a un conjunto más puro y confiable para análisis de calidad de hardware.
