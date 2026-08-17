# Instructivo Maestro — Ciclo Delta (delta)

**Version:** 1.0
**Fecha de creacion:** 2026-06-21
**Ciclo:** Delta (delta) — No Supervisado
**Estado:** Pre-D en preparacion

---

## 1. Vision y diferencias con Alpha y Gamma

| Ciclo | Enfoque | Etiquetas | Modelos |
|---|---|---|---|
| **Alpha** (α) | Supervisado iterativo | Manuales en `audit_events` | LightGBM |
| **Gamma** (γ) | Supervisado multi-modelo | Manuales + retiqueteo Pre-G | LightGBM, RF, ExtraTrees, etc. |
| **Delta** (δ) | **No supervisado** | Ninguna (solo para validacion cruzada) | Clustering + deteccion de anomalias |

Delta no entrena modelos supervisados ni calibra threshold de clasificacion.
Su objetivo es encontrar estructura y anomalias en los datos sin depender de
las etiquetas humanas, y usar esa estructura para:

1. Descubrir patrones de comportamiento de Bandida no capturados por las 3
   clases de Gamma (alimentacion / servido / reposo).
2. Detectar anomalias de hardware en la curva de peso.
3. Generar candidatos de nuevas sesiones de `servido` sin depender del modelo
   supervisado de Alpha.
4. Validar si los clusters no supervisados coinciden con las etiquetas de
   Gamma (cross-check de calidad del etiquetado).

---

## 2. Lo que Delta hereda de Gamma

- Los datos crudos (`readings_raw.parquet`, `sessions_labeled.parquet`).
- Las 13 features base de Gamma (`FEATURES_GAMMA`).
- Las constantes del pipeline: `GAP_CUTOFF_S=300`, `PLATEAU_THRESHOLD=1.5`,
  resampleo a 30s, ambos UUIDs de KPCL0034, timezone America/Santiago,
  encoding `latin1`.

## 3. Lo que Delta NO hereda

- Las etiquetas de sesiones (solo se usan como referencia de validacion en
  D-08, nunca para entrenar nada).
- Los modelos `.lgb` o `.pkl` supervisados de Gamma o Alpha.
- Los splits train/val/test de Gamma (Delta no entrena modelos supervisados,
  no necesita split temporal sellado).

---

## 4. Estructura de carpetas

```
Ciclo_Delta/
├── instructivo_delta.md
├── EXPERIMENT_TRACKER_DELTA.md
├── GLOSARIO_DELTA.md
├── experiments/
│   ├── d01_clustering_peso.md
│   ├── d02_anomaly_detection.md
│   ├── d03_patron_temporal.md
│   ├── d04_cross_check_gamma.md
│   └── d05_candidatos_servido.md
├── fase_1_datos/
│   ├── scripts/
│   │   ├── _delta_utils.md
│   │   ├── d01_setup_env.md
│   │   ├── d02_cargar_datos.md
│   │   └── d03_features_no_supervisadas.md
│   ├── data/{raw,processed}/
│   └── outputs/quality_report/
├── fase_2_clustering/
│   ├── scripts/{d01_kmeans_baseline,d02_dbscan,d03_hdbscan,d04_gmm,d05_clustering_report}.md
│   ├── models/{kmeans,dbscan,hdbscan,gmm}/
│   └── outputs/{cluster_report,visualizaciones}/
├── fase_3_anomalias/
│   ├── scripts/{d01_isolation_forest,d02_autoencoder,d03_lof,d04_anomaly_report}.md
│   ├── models/
│   └── outputs/{anomaly_report,visualizaciones}/
├── fase_4_validacion/
│   ├── scripts/{d01_cross_check_gamma,d02_candidatos_servido,d03_reporte_final}.md
│   └── outputs/cross_check_report/
└── inferencia_delta.md
```

---

## 5. Secuencia de ejecucion

```
Pre-D (setup + datos + features)
  └── D-01 K-Means ──┬── D-02 DBSCAN
                      ├── D-03 HDBSCAN
                      └── D-04 GMM
                            │
                      D-05 Clustering report (comparacion)
                            │
        ┌───────────────────┼────────────────────┐
   D-06 Isolation Forest  D-07 Autoencoder    D-08 LOF + Consenso
        └───────────────────┼────────────────────┘
                      D-09 Anomaly report
                            │
                  D-10 Cross-check Gamma (ARI/NMI)
                            │
                  D-11 Candidatos servido
                            │
                       D-Final Reporte
```

> Nota: la numeracion de scripts dentro de cada fase reinicia en `d01` por
> fase (ver estructura de carpetas); la tabla del tracker maestro usa
> numeracion global D-01 a D-09 + D-Final para status tracking.

---

## 6. Reglas del ciclo (inviolables)

1. Por cada archivo `.md` de spec que se redacte, NO crear el `.py`. Mauro
   convierte el `.md` a `.py` manualmente.
2. Estructura de carpetas primero: todas las carpetas vacias antes de
   cualquier archivo de contenido.
3. Un experimento = un archivo `.md` en `experiments/` + una fila en
   `EXPERIMENT_TRACKER_DELTA.md`.
4. Siempre hora Santiago (`America/Santiago`) para features temporales.
   Nunca UTC para features de negocio.
5. Siempre `ingested_at` cuando `clock_invalid=True`. Nunca `recorded_at`
   en ese caso.
6. Siempre resampleo a 30s antes de calcular cualquier feature.
7. Ambos UUIDs de KPCL0034 siempre en `KPCL0034_UUIDS`.
8. Encoding `latin1` para CSVs de Supabase.
9. No tocar los datos de test de Gamma (`X_test.parquet` / `y_test.parquet`).
10. No reentrenar modelos supervisados de Gamma. Delta es paralelo e
    independiente.
11. Las features de Delta heredan las 13 de Gamma y pueden anadir features
    adicionales propias del dominio no supervisado.
12. Documentar todo hallazgo en el `.md` del experimento correspondiente
    antes de pasar al siguiente.
13. No modificar ningun archivo dentro de `Ciclo_Gamma/` ni `Ciclo_Alpha_v1/`.
14. No asumir que los artefactos de Gamma ya existen: los scripts deben
    validar su existencia antes de cargarlos.

---

## 7. Comandos de ejecucion (PowerShell, referencia)

```powershell
# Una vez que Mauro convierte los .md a .py:
cd "Docs\investigacion\Ciclo Delta"

# Fase 1
python fase_1_datos/scripts/d01_setup_env.py
python fase_1_datos/scripts/d02_cargar_datos.py
python fase_1_datos/scripts/d03_features_no_supervisadas.py

# Fase 2
python fase_2_clustering/scripts/d01_kmeans_baseline.py
python fase_2_clustering/scripts/d02_dbscan.py
python fase_2_clustering/scripts/d03_hdbscan.py
python fase_2_clustering/scripts/d04_gmm.py
python fase_2_clustering/scripts/d05_clustering_report.py

# Fase 3
python fase_3_anomalias/scripts/d01_isolation_forest.py
python fase_3_anomalias/scripts/d02_autoencoder.py
python fase_3_anomalias/scripts/d03_lof.py
python fase_3_anomalias/scripts/d04_anomaly_report.py

# Fase 4
python fase_4_validacion/scripts/d01_cross_check_gamma.py
python fase_4_validacion/scripts/d02_candidatos_servido.py
python fase_4_validacion/scripts/d03_reporte_final.py
```

---

## 8. Referencias cruzadas

| Documento | Relacion |
|---|---|
| `instructivo.md` | Guia maestra del ciclo activo (Gamma) |
| `EXPERIMENT_TRACKER_GAMMA.md` | Estado y metricas de Gamma |
| `GLOSARIO_GAMMA.md` | Terminos de Gamma |
| `../EXPERIMENT_TRACKER.md` | Tracker historico del Ciclo Alpha |
| `COMPARACION_ALPHA_GAMMA.md` | Comparacion de datos y features Alpha vs Gamma |
| `06_AUDITORIA_SIN_CARGADOR.md` | Referencia para anomalias tipo H |
| `07_AUDITORIA_KPCL0036_ERROR_PESO.md` | Referencia para anomalias tipo H en KPCL0036 |
| [GLOSARIO_DELTA.md](GLOSARIO_DELTA.md) | Terminos del ciclo no supervisado |
| [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md) | Tabla maestra de experimentos Delta |
