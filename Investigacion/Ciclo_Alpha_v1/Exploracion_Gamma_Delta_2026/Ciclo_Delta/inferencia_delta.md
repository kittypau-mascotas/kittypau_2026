# Inferencia Delta — Uso de modelos no supervisados en produccion

**Version:** 1.0
**Fecha:** 2026-06-21
**Ciclo:** Delta (delta) — No Supervisado

---

## Contexto

A diferencia de Alpha y Gamma (que exportan modelos supervisados `.lgb` /
`.pkl` de clasificacion), Delta exporta:

1. **Modelos de clustering** — para asignar un cluster a nuevas lecturas.
2. **Umbrales de anomalia** — para marcar nuevas lecturas como anomalas.
3. **Candidatos de servido** — CSV para incorporar a Gamma como nuevas etiquetas.

La "inferencia" de Delta no es clasificacion en tiempo real; es una
operacion de auditoria periodica que se ejecuta offline cuando hay datos
nuevos suficientes.

---

## Artefactos exportados por Delta

| Artefacto | Ruta | Uso |
|---|---|---|
| `kmeans_best.pkl` | `fase_2_clustering/models/kmeans/` | Asignar cluster a lecturas nuevas |
| `dbscan_best.pkl` | `fase_2_clustering/models/dbscan/` | Alternativa si DBSCAN gano |
| `hdbscan_best.pkl` | `fase_2_clustering/models/hdbscan/` | Alternativa si HDBSCAN gano |
| `gmm_best.pkl` | `fase_2_clustering/models/gmm/` | Probabilidades de cluster |
| `isolation_forest.pkl` | `fase_3_anomalias/models/` | Score de anomalia IF |
| `lof_model.pkl` | `fase_3_anomalias/models/` | Score de anomalia LOF |
| `autoencoder.h5` | `fase_3_anomalias/models/` | Error de reconstruccion |
| `scaler_delta.pkl` | `fase_1_datos/data/processed/` | Escalado de features (reusar en inferencia) |
| `candidatos_servido_delta_nuevos.csv` | `fase_4_validacion/outputs/` | Input a app_anotacion_gamma.py |

---

## Flujo de inferencia offline

```
Nuevas lecturas (raw)
       |
       v
_delta_utils.cargar_readings_gamma()     ← solo lectura de Gamma
       |
_delta_utils.aplicar_timestamp_correcto()
       |
_delta_utils.calcular_features_delta_extra()
       |
_delta_utils.escalar_features(scaler=scaler_delta.pkl)   ← usar scaler entrenado
       |
       ├── kmeans_best.pkl.predict(X_scaled) → cluster_id
       |
       ├── isolation_forest.pkl.decision_function(X_scaled) → anomaly_score_if
       ├── lof_model.pkl.decision_function(X_scaled) → anomaly_score_lof
       └── autoencoder.predict(X_scaled) → reconstruction_error
                   |
                   v
         consenso ≥ 2/3 detectores → anomalia confirmada
```

---

## Reglas de inferencia

1. **No reentrenar**: usar siempre el scaler y los modelos serializados de
   la Fase 1-3 de Delta. Si los datos cambian sustancialmente (nuevo
   dispositivo, nueva temporada), iniciar un **Ciclo Epsilon** en lugar de
   reentrenar Delta.
2. **Timestamp correcto**: siempre `ingested_at` cuando `clock_invalid=True`.
3. **Ambos UUIDs**: siempre filtrar por `KPCL0034_UUIDS` (ambos UUIDs).
4. **Encoding**: siempre `latin1` para CSVs de Supabase.
5. **No modificar Gamma**: los candidatos de servido generados por Delta se
   incorporan a Gamma solo despues de revision humana en `app_anotacion_gamma.py`.

---

## Cuando ejecutar inferencia Delta

| Trigger | Frecuencia sugerida | Accion |
|---|---|---|
| Auditoria periodica de anomalias | Mensual | Ejecutar Fase 1 → 3 sobre datos nuevos |
| Generacion de candidatos de servido | Despues de acumular 2+ semanas de datos | Ejecutar Fase 1 → 4 |
| Cross-check post-reentrenamiento Gamma | Cada vez que Gamma sube una nueva version | Ejecutar solo Fase 4 (cross-check) |

---

## Referencias

- [instructivo_delta.md](instructivo_delta.md)
- [EXPERIMENT_TRACKER_DELTA.md](EXPERIMENT_TRACKER_DELTA.md)
- [fase_1_datos/scripts/_delta_utils.md](fase_1_datos/scripts/_delta_utils.md)
- [fase_4_validacion/scripts/d02_candidatos_servido.md](fase_4_validacion/scripts/d02_candidatos_servido.md)
- `../Ciclo_Gamma/` — destino de los candidatos de servido
