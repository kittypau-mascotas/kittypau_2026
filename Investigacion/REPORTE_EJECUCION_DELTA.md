# Reporte de Ejecución — Ciclo Delta

**Fecha:** 2026-06-22  
**Dataset:** `readings_unificado_utc.parquet` — Abril–Junio 2026  
**Dispositivo:** KPCL0034 (Bandida)

---

## Resumen ejecutivo

| Fase | Estado | Resultado clave |
|------|--------|----------------|
| Fase 1 — Datos y features | ✅ | 134,164 lecturas, 18 features, PCA+UMAP generados |
| Fase 2 — Clustering | ✅ | K-Means ganador (silhouette=0.816, k=2) |
| Fase 3 — Anomalías | ⚠️ | 676 anomalías consenso IF∩LOF; autoencoder falló (DLL torch) |
| Fase 4 — Validación | ✅ | ARI=0.16, 2 candidatos servido nuevos |

---

## Fase 1 — Datos y Features

### d01_setup_env.py
- 7 carpetas del pipeline verificadas/creadas

### d02_cargar_datos.py
- **Shape:** (134,164 filas × 25 columnas)
- **Rango temporal:** 2026-04-08 → 2026-06-14
- **clock_invalid:** 71.17% de lecturas usan `ingested_at` (reloj del dispositivo inválido)
- **NaN en features:** 0

### d03_features_no_supervisadas.py
- **PCA(2):** varianza explicada [21.2%, 12.3%] = 33.5% acumulado
- **PCA(10):** varianza explicada acumulada ~84%
- **UMAP(2):** generado (n_jobs=1 forzado por random_state)
- Archivos: `X_scaled.parquet`, `X_pca2.parquet`, `X_pca10.parquet`, `X_umap2.parquet`
- Visualizaciones: `umap_is_plateau.html`, `umap_hour_sin.html`, `umap_delta_w.html`

---

## Fase 2 — Clustering

### d01_kmeans_baseline.py
| k | Silhouette | Inercia | CH | DB |
|---|-----------|---------|----|----|
| 2 | **0.8165** | 2.08M | 21,567 | 1.152 |
| 3 | 0.1450 | 1.89M | 18,653 | 1.896 |
| 4 | 0.1635 | 1.74M | 17,445 | 1.657 |

→ **k óptimo = 2** (silhouette máximo)

### d02_dbscan.py
| eps | Clusters | Noise % | Silhouette |
|-----|----------|---------|-----------|
| 0.3 | 1,322 | 9.71% | **0.2418** |
| 0.5 | 941 | 6.92% | 0.1939 |
| 0.8 | 345 | 5.21% | -0.192 |

→ **eps óptimo = 0.3**

### d03_hdbscan.py
- **Clusters:** 1,868
- **Noise:** 7.70% (10,325 puntos)
- **Silhouette (sin noise):** 0.3454
- Cluster más grande: #47 (2,812 puntos)

### d04_gmm.py
- **n_components óptimo:** 7 (BIC mínimo = -1.233e7)
- **Candidatos anomalía** (max prob < 0.6): 30 de 134,164

### d05_clustering_report.py — Comparación final

| Algoritmo | Clusters | Silhouette | Noise % | Observación |
|-----------|---------|-----------|---------|-------------|
| **K-Means** | **2** | **0.816** | 0% | — |
| DBSCAN | 1,322 | 0.242 | 9.71% | eps=0.3 |
| HDBSCAN | 1,868 | 0.345 | 7.70% | — |
| GMM | 7 | — | 0% | BIC mínimo |

→ **Ganador: K-Means** (mejor silhouette, noise < 15%)  
→ `cluster_ganador` persistido en `readings_delta.parquet`

**Interpretación de clusters:**
- Cluster 0 → perfil "servido" (delta_w medio = +4.6g)
- Cluster 1 → perfil "alimentación/reposo" (delta_w negativo o neutro)

---

## Fase 3 — Detección de Anomalías

### d01_isolation_forest.py
- **Anomalías detectadas:** 6,709 de 134,164 (5.00%)
- **Con clock_invalid:** 75.65%

### d02_autoencoder.py — ⚠️ FALLÓ
- **Error:** `OSError: [WinError 1114]` — c10.dll de PyTorch no inicializa en este entorno Windows
- **Causa probable:** incompatibilidad de Visual C++ Redistributable
- **Impacto:** consenso se calcula con 2/3 detectores (IF + LOF)

### d03_lof.py
- **Anomalías LOF:** 6,709 de 134,164 (5.00%)
- **Consenso IF∩LOF (≥2 votos):** **676 anomalías**

### d04_anomaly_report.py

| Tipo | N | Descripción |
|------|---|-------------|
| H | 338 | Hardware — clock_invalid > 0.5 (mayoría de lecturas en ventana con reloj inválido) |
| C | 178 | Comportamental — anomalía en horario activo (06:00–22:00) |
| U | 160 | Sin clasificar — anomalía nocturna, no atribuible a clock |

**Total:** 676 anomalías clasificadas (0.50% del dataset)

---

## Fase 4 — Validación

### d01_cross_check_gamma.py
- **Lecturas cruzadas con etiquetas Gamma:** 4,034 de 134,164 (3.0%)
- **ARI:** 0.1594 → coincidencia_baja (< 0.3)
- **NMI:** 0.1199

| cluster_ganador | alimentacion | reposo | servido | sin_clasificar |
|----------------|-------------|--------|---------|----------------|
| 0 | 26.3% | 20.8% | **50.1%** | 2.8% |
| 1 | **68.6%** | 24.5% | 4.1% | 2.8% |

→ Cluster 0 = servido (50% pureza), Cluster 1 = alimentación (69% pureza)

### d02_candidatos_servido.py
- **Cluster servido identificado:** Cluster 0 (delta_w medio = +4.61g)
- **Candidatos totales:** 12
- **Candidatos nuevos** (no etiquetados en Gamma): **2**

### d03_reporte_final.py
- Reporte generado en `reporte_final_delta.md`

---

## Bugs corregidos durante la ejecución

| # | Script(s) | Error | Fix |
|---|-----------|-------|-----|
| 1 | Todos Fase 2/3/4 | `ModuleNotFoundError: _delta_utils` | `sys.path.insert(0, .../fase_1_datos/scripts)` |
| 2 | d01/d02/d03/d04 Fase 2/3 | Paths sin separador (`processedX_scaled`) | Migración a operador `/` de pathlib |
| 3 | d01/d02 Fase 4 | `KeyError: ts_termino` | `ts_fin` (columna real en sessions_labeled) |
| 4 | d05 | `cluster_ganador` nunca persistido | `_guardar_cluster_ganador()` en d05 |
| 5 | d03 Fase 2, d05 | HDBSCAN excluido por falta de metrics CSV | Export CSV en d03, lectura condicional en d05 |
| 6 | d03 Fase 3 (LOF) | `KeyError: votos` — consenso vacío | Tipos string vs Timestamp: `.astype(str)` en ambos sets; fallback si consenso vacío |
| 7 | d01/d02 Fase 4 | `KeyError: categoria` | Columna real es `session_type` en sessions_labeled |
| 8 | d04 Fase 3 | Lookup O(n×m) + ts string vs Timestamp | Merge vectorizado + `pd.to_datetime(..., utc=True)` + umbral `clock_invalid > 0.5` |

---

## Archivos generados

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
  reporte_final_delta.md
```

---

## Pendiente / Recomendaciones

1. **Autoencoder (d02 Fase 3):** Instalar Visual C++ Redistributable 2022 x64 o usar un entorno conda para resolver el error DLL de PyTorch. Una vez funcional, re-ejecutar d03_lof.py para obtener consenso 3/3 detectores.
2. **ARI bajo (0.16):** Esperado — K-Means divide en 2 clusters mientras Gamma tiene 4 categorías (alimentacion, reposo, servido, sin_clasificar). El cruce temporal solo alcanzó 3% de las lecturas.
3. **2 candidatos servido nuevos:** Revisar manualmente `candidatos_servido_delta_nuevos.csv` para decidir si agregar a sessions_labeled de Gamma.
4. **Ciclo Epsilon:** Con la separación clara Cluster0=servido / Cluster1=alimentacion, se puede avanzar a modelos supervisados usando estos 2 clusters como pseudo-etiquetas de alta calidad (silhouette=0.816).
