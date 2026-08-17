# Glosario del Ciclo Delta (delta)

> Terminos especificos del ciclo no supervisado. Complementa GLOSARIO.md (Alpha)
> y GLOSARIO_GAMMA.md (Gamma). No redefine terminos ya cubiertos ahi salvo que
> el significado cambie en el contexto no supervisado.

---

## Conceptos generales

- **Clustering no supervisado**: agrupacion de lecturas sin etiquetas previas,
  basada solo en la similitud de features.
- **Silhouette Score**: metrica de calidad del clustering. Rango -1 a 1.
  Valores > 0.25 indican clusters con separacion util.
- **K-Means**: algoritmo de clustering que asigna cada punto al centroide mas
  cercano. Requiere definir K de antemano. Rapido, sensible a outliers.
- **DBSCAN**: clustering basado en densidad. No requiere K. Detecta ruido
  (noise points). Sensible a `eps` y `min_samples`.
- **HDBSCAN**: version jerarquica de DBSCAN. Mas robusta con densidades
  variables. Recomendada para datos de sensores.
- **GMM (Gaussian Mixture Model)**: clustering probabilistico. Cada punto
  tiene probabilidades de pertenecer a cada cluster. Util para detectar
  puntos ambiguos (posibles anomalias).

## Deteccion de anomalias

- **Isolation Forest**: deteccion de anomalias por aislamiento. Los puntos
  faciles de aislar son anomalos. Eficiente en alta dimensionalidad.
- **Autoencoder**: red neuronal que comprime y reconstruye los datos. Los
  puntos con alto error de reconstruccion son anomalos.
- **LOF (Local Outlier Factor)**: detecta anomalias comparando la densidad
  local de un punto con la de sus vecinos.
- **Consenso de anomalias**: punto marcado como anomalia por al menos 2 de 3
  detectores independientes. Mas confiable que cualquier detector individual.
- **Anomalia tipo H (hardware)**: anomalia que coincide con `clock_invalid=True`
  o con un periodo sin bateria/cargador documentado.
- **Anomalia tipo C (comportamiento)**: anomalia de peso fuera del rango
  historico normal en horario de actividad de Bandida.
- **Anomalia tipo U (sin clasificar)**: anomalia que no cae en tipo H ni tipo C.

## Reduccion de dimensionalidad

- **PCA**: reduccion de dimensionalidad lineal. Preserva la varianza global.
- **UMAP**: reduccion de dimensionalidad no lineal. Preserva estructura local
  y global. Mejor para visualizacion de clusters.

## Validacion cruzada con Gamma

- **ARI (Adjusted Rand Index)**: mide la coincidencia entre dos agrupaciones
  (clusters vs etiquetas). Corregido por azar. Rango -1 a 1.
- **NMI (Normalized Mutual Information)**: mide cuanta informacion comparten
  dos agrupaciones. Rango 0 a 1.
- **Cluster dominante**: el cluster mas grande o mas puro de un algoritmo dado.
- **Pureza de cluster**: porcentaje de lecturas de una clase Gamma dentro del
  cluster Delta que mejor la representa.

## Aplicacion practica

- **Candidatos de servido**: lecturas agrupadas por Delta con patron de subida
  de peso que pueden ser sesiones de `servido` no etiquetadas en Gamma.

---

## Referencias

| Archivo | Relacion |
|---|---|
| [instructivo_delta.md](instructivo_delta.md) | Guia maestra del ciclo |
| [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md) | Tabla maestra de experimentos |
| `../Ciclo_Gamma/GLOSARIO_GAMMA.md` | Glosario del ciclo supervisado activo |
| `../GLOSARIO.md` | Glosario original del ciclo Alpha |
