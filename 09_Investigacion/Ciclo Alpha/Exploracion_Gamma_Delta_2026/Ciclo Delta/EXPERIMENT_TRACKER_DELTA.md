# Kittypau ML — Ciclo Delta (delta) — Tracker de Experimentos

**Ciclo:** Delta (delta)
**Inicio:** 2026-06-21
**Estado actual:** ✅ Completado — Fase 4 ejecutada el 2026-06-22

Referencia principal: [instructivo_delta.md](instructivo_delta.md)

---

## Tabla Maestra

| ID | Nombre | Fase | Prerequisito | Meta principal | Silhouette | ARI-Gamma | Estado | Archivo |
|---|---|---|---|---|---|---|---|---|
| **Pre-D** | Setup + datos + features | Pre | Gamma Pre-G ✅ | readings_delta.parquet listo | — | — | ✅ Completado · 134,164 lecturas · 18 features · PCA+UMAP | fase_1_datos/scripts/ |
| **D-01** | K-Means baseline | 2 | Pre-D ✅ | K optimo + Silhouette ≥ 0.25 | **0.8165** ✅ | — | ✅ Completado · k=2 ganador | experiments/d01_clustering_peso.md |
| **D-02** | DBSCAN | 2 | D-01 ✅ | Comparar vs K-Means | 0.2418 | — | ✅ Completado · eps=0.3 · 1322 clusters · 9.71% noise | experiments/d01_clustering_peso.md |
| **D-03** | HDBSCAN | 2 | D-01 ✅ | Comparar vs K-Means | 0.3454 | — | ✅ Completado · 1868 clusters · 7.70% noise | experiments/d01_clustering_peso.md |
| **D-04** | GMM | 2 | D-01 ✅ | Candidatos anomalias GMM | — | — | ✅ Completado · n=7 (BIC mínimo) · 30 candidatos GMM | experiments/d01_clustering_peso.md |
| **D-05** | Isolation Forest | 3 | D-04 ✅ | Anomalias confiables | — | — | ✅ Completado · 6,709 anomalías (5.00%) | experiments/d02_anomaly_detection.md |
| **D-06** | Autoencoder | 3 | D-05 ✅ | Consenso 2/3 detectores | — | — | ⚠️ Falló · OSError DLL torch · consenso calculado con 2/3 detectores | experiments/d02_anomaly_detection.md |
| **D-07** | LOF + Consenso | 3 | D-05 ✅ | anomalias_detectadas.csv | — | — | ✅ Completado · 6,709 LOF · **676 consenso** (H=338 / C=178 / U=160) | experiments/d02_anomaly_detection.md |
| **D-08** | Cross-check Gamma | 4 | D-01 a D-07 ✅ | ARI ≥ 0.30 · NMI ≥ 0.25 | — | **0.1594** ⚠️ | ✅ Completado · NMI=0.1199 · coincidencia_baja · 3% lecturas cruzadas | experiments/d04_cross_check_gamma.md |
| **D-09** | Candidatos servido | 4 | D-08 ✅ | ≥ 10 nuevos candidatos | — | — | ⚠️ 2/10 · 12 totales · 2 nuevos (Jun 2026) · 43g total | experiments/d05_candidatos_servido.md |
| **D-Final** | Reporte final | 4 | D-09 ✅ | reporte_final_delta.md | — | — | ✅ Completado · 2026-06-22 | fase_4_validacion/outputs/reporte_final_delta.md |

---

## Umbrales de Exito del Ciclo Delta

| Metrica | Umbral minimo | Significado |
|---|---|---|
| Silhouette Score (mejor algoritmo) | ≥ 0.25 | Clusters con separacion minima util |
| ARI con etiquetas Gamma | ≥ 0.20 | Cierta coincidencia con el ground truth |
| Anomalias tipo H detectadas | ≥ 5 | Valida que Delta detecta problemas de hardware reales |
| Candidatos servido nuevos | ≥ 10 | Aporte concreto al pipeline de Gamma |
| Cobertura de anomalias consenso | ≥ 2/3 detectores | Robustez del consenso |

---

## Reglas de uso de este archivo

1. Actualizar la fila del experimento tan pronto como termine — no acumular actualizaciones.
2. Registrar metricas reales solo despues de ejecutar el script correspondiente (Mauro).
3. D-08 y D-09 no pueden iniciar sin que D-01 a D-07 esten completos.
4. Ver [instructivo_delta.md](instructivo_delta.md) para las reglas inviolables del Ciclo Delta.

---

## Relacion con Alpha y Gamma

```
Alpha (cerrado)                Gamma (activo)               Delta (nuevo)
─────────────────              ──────────────────           ──────────────────────
Supervisado LightGBM    →      Multi-modelo supervisado  →  No supervisado
α-01 a α-10 (hecho)            G-01 a G-05 hecho            D-01 a D-Final (este ciclo)
```

Delta usa los artefactos de Gamma como datos de entrada (solo lectura) y aporta
candidatos de `servido` nuevos de vuelta a Gamma.
