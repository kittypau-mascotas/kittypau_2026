# Exp 09A — Normalización de Cadencia

| Campo | Valor |
|---|---|
| **ID** | Exp 09A |
| **Nombre** | Normalización de cadencia a 30 s |
| **Fecha** | 2026-06-14 |
| **Estado** | ✅ Completado |
| **Basado en** | Exp 08 (dataset Abril + Mayo-Jun) |
| **Siguiente** | [Exp 09B](exp_09b_threshold_por_periodo.md) — threshold por período + plateau en segundos + cadencia_s |

---

## 1. Objetivo

Eliminar el shift de distribución entre Abril 2026 y Mayo-Jun 2026 que causó la
caída de F1 activo de 0.7619 → 0.6021 en Exp 08.

---

## 2. Root cause identificado en Exp 08

Las features de rolling window se computan por **fila**, no por tiempo:

| Período | Cadencia real | `rolling(5)` representa | `rolling(10)` representa |
|---|---|---|---|
| Abril 2026 | ~14.7 s | ~74 s | ~147 s |
| Mayo-Jun 2026 | ~30 s | ~150 s | ~300 s |

El modelo aprende `rolling_std_5`, `plateau_duration`, `delta_w_10` en el contexto
temporal de Abril (147 s por ventana de 10) y los evalúa en Mayo-Jun (300 s por
ventana de 10). La misma feature numérica describe fenómenos diferentes en cada
período → distribución shift → caída de métricas en val/test.

El AUC-ROC se mantuvo estable (0.9181 vs 0.9205) porque el modelo aún discrimina
correctamente en términos de ranking, pero la calibración de probabilidades y los
umbrales se desalinean.

---

## 3. Cambio principal

**Resampleo a cadencia uniforme de 30 s** antes de calcular features.

Con cadencia uniforme:
- `rolling(5)` → siempre 150 s en ambos períodos
- `rolling(10)` → siempre 300 s en ambos períodos
- `plateau_duration` → cuenta en unidades de 30 s, comparables entre períodos

### Implementación

| Archivo | Cambio |
|---|---|
| `fase_2_dataset/scripts/_phase2_utils.py` | Nueva función `resample_to_uniform(df, target_s=30)` + constante `RESAMPLE_TARGET_S=30` |
| `fase_2_dataset/scripts/02_build_features.py` | Llamada a `resample_to_uniform()` entre `remove_subsecond_duplicates` y `compute_segment_features` |

### Qué NO cambia

| Invariante | Valor | Estado |
|---|---|---|
| Las 12 features activas | Sin cambio | ✅ Invariante |
| `GAP_CUTOFF_S` | 300 s | ✅ Invariante |
| `PLATEAU_THRESHOLD` | 1.5 g | ✅ Invariante |
| Split temporal (70/15/15) | Sin cambio | ✅ Invariante |
| `THRESHOLD_A` | 0.20 | ✅ Invariante |
| Fases 1 y 3 | Sin cambio | ✅ Sin modificar |

### Método de resampleo

Forward-fill (step function) por segmento de continuidad. El peso del bowl es
una señal de tipo escalón: no varía entre lecturas salvo por eventos de
alimentación o servido, por lo que propagar el último valor conocido es la
interpolación correcta.

No se rellena a través de gaps > GAP_CUTOFF_S (discontinuidades reales de datos).

---

## 4. Dataset

| Campo | Valor |
|---|---|
| Fuente de readings | Exp 08: Abril + Mayo-Jun (212,011 filas originales) |
| Rango temporal | Apr 8 – Jun 14, 2026 |
| Cadencia mediana post-resampleo | 29.7 s |
| Filas post-resampleo | 134,922 (de 135,174 pre-consolidación, 99.8% retenidas) |
| Segmentos de continuidad | 22 |
| Gaps > 5 min | 21 |
| Sesiones alimentacion | 191 (train) |
| Sesiones servido | 27 (train) |
| Split | 70/15/15 temporal (idéntico a Exp 08) |

### Split temporal

| Split | Filas | Período |
|---|---|---|
| Train | 94,445 | 2026-04-08 → 2026-05-31 |
| Val | 20,238 | 2026-05-31 → 2026-06-07 |
| Test | 20,239 | 2026-06-07 → 2026-06-14 |

### Distribución de clases en train

| Clase | Filas | % |
|---|---|---|
| `reposo` | 92,418 | 97.9% |
| `alimentacion` | 1,901 | 2.0% |
| `servido` | 126 | 0.1% |

### Distribución de clases en val

| Clase | Filas |
|---|---|
| `reposo` | 19,746 |
| `alimentacion` | 452 |
| `servido` | 40 |

### Pesos sugeridos para entrenamiento

| Clase | Peso |
|---|---|
| `alimentacion` | 16.561x |
| `servido` | 249.854x |
| `reposo` | 0.341x |

---

## 5. Resultados

*Ejecutado el 2026-06-14.*

### Modelo A (Binario: activo vs reposo)

| Métrica | Exp 06 | Exp 08 | **Exp 09** | vs Exp 08 |
|---|:---:|:---:|:---:|:---:|
| F1 activo | 0.7619 | 0.6021 | **0.6000** | −0.0021 |
| AUC-ROC | 0.9205 | 0.9181 | **0.9146** | −0.0035 |
| Threshold calibrado | 0.20 | 0.20 | **0.26** | — |
| Precisión | 0.750 | 0.4960 | **0.4947** | — |
| Recall | 0.774 | 0.7658 | **0.7622** | — |
| Accuracy | 0.9905 | — | **0.9753** | — |
| Mejor val loss | — | — | **0.086366** | — |
| Iteraciones entrenadas | — | 17 | **25** | — |
| scale_pos_weight | — | — | **45.593** | — |

#### Matriz de confusión

```
TP = 375   FP = 383
FN = 117   TN = 19,363
```

#### Feature importance top 10 (Modelo A)

| Feature | Importancia |
|---|---:|
| `rolling_std_10` | 2,605,090 |
| `plateau_duration` | 737,304 |
| `hour_sin` | 580,438 |
| `weight_grams` | 451,406 |
| `hour_cos` | 337,972 |
| `rolling_mean_5` | 145,206 |
| `rolling_std_5` | 49,102 |
| `net_weight` | 47,987 |
| `clock_invalid` | 9,834 |
| `delta_w_10` | 1,672 |

### Modelo B (Multiclase: alimentacion / servido / reposo)

| Métrica | Exp 06 | Exp 08 | **Exp 09** | vs Exp 08 |
|---|:---:|:---:|:---:|:---:|
| F1 alimentacion | 0.7606 | 0.5778 | **0.5834** | +0.0056 |
| F1 servido | 0.1395 | 0.2414 | **0.2182** | −0.0232 |
| F1 reposo | — | 0.9884 | **0.9891** | +0.0007 |
| Macro F1 | 0.6312 | 0.6025 | **0.5969** | −0.0056 |
| Weighted F1 | — | — | **0.9785** | — |
| Accuracy | — | — | **0.9788** | — |
| Mejor val loss | — | — | **0.073579** | — |
| Iteraciones entrenadas | — | 179 | **235** | — |
| SMOTE sintéticas (servido) | 84 | — | **252** |  — |
| Servido target count | — | — | **378** | — |
| Weight power | — | — | **0.4** | — |

#### Feature importance top 10 (Modelo B)

| Feature | Importancia |
|---|---:|
| `rolling_std_5` | 321,816 |
| `rolling_std_10` | 163,443 |
| `plateau_duration` | 139,668 |
| `hour_sin` | 120,616 |
| `hour_cos` | 117,109 |
| `weight_grams` | 105,640 |
| `net_weight` | 82,184 |
| `delta_w_10` | 69,563 |
| `rolling_mean_5` | 66,896 |
| `clock_invalid` | 17,876 |

---

## 6. Análisis

La hipótesis principal del Exp 09 **no se cumplió**: el resampleo a 30 s no recuperó el nivel de Exp 06 ni mejoró significativamente sobre Exp 08.

El resampleo a 30 s era condición necesaria pero no suficiente para eliminar el shift. Las causas adicionales identificadas son:

| Factor | Abril (train) | Mayo-Jun (val/test) |
|---|---|---|
| Cadencia mediana | ~14.7 s → 30 s post-resampleo | ~30 s (nativo) |
| clock_invalid True | ~50% | ~100% |
| UUID KPCL0034 | `9510a455…` | `3a460074…` |
| Origen etiquetas | Tiempo real (Supabase) | Retroactivo (app_anotacion) |
| Calidad anotaciones | Alta (operador en tiempo real) | Variable (retroactiva) |

El AUC-ROC se mantiene estable (0.9146) porque el modelo sigue discriminando en ranking, pero la calibración de probabilidades sigue desalineada entre períodos.

El Modelo B muestra una leve mejora en `alimentacion` (+0.0056 vs Exp 08) pero retrocede en `servido` (−0.0232). Con solo 40 ejemplos de `servido` en val, el F1 de esa clase es inestable en cualquier experimento.

**Conclusión:** El shift entre Abril y Mayo-Jun tiene causas más profundas que la cadencia. La normalización a 30 s es correcta como invariante del pipeline, pero no es suficiente para recuperar las métricas de Exp 06.

---

## 7. Pasos ejecutados

```bash
cd "Docs/investigacion/Data Science"

# Fase 1 (sin cambios — artefactos de Exp 08)
# readings_raw.parquet y sessions_labeled.parquet ya existían

# Fase 2 (resampleo aplicado en 02_build_features.py)
python fase_2_dataset/scripts/01_build_labels.py
python fase_2_dataset/scripts/02_build_features.py   # ← resampleo a 30s aplicado aquí
python fase_2_dataset/scripts/03_build_train_dataset.py
python fase_2_dataset/scripts/04_dataset_report.py

# Fase 3
python fase_3_modelos/scripts/01_prepare_datasets.py
python fase_3_modelos/scripts/02_train_modelo_a.py
python fase_3_modelos/scripts/03_train_modelo_b.py
python fase_3_modelos/scripts/04_training_report.py

# Fase 4 (actualización de visualización)
python fase_4_visualizacion/prepare_data.py
```

---

## 8. Decisión

**Exp 06 permanece como modelo de producción.** El resampleo a 30 s queda como invariante del pipeline para todos los experimentos futuros (es la decisión correcta aunque no resolvió el shift por sí sola).

Exp 09 es un experimento diagnóstico que confirma:

1. La cadencia no era el único factor del shift — el origen retroactivo de las etiquetas y el cambio de UUID del dispositivo también contribuyen.
2. Más datos de `servido` siguen siendo el cuello de botella principal.
3. El pipeline normalizado a 30 s está listo para Exp 10 y Exp 11.

**Criterio de habilitación para Exp 10-Claude:**
- Pipeline normalizado a 30 s ✅
- `ANTHROPIC_API_KEY` disponible en `.env.local`
- Objetivo: ≥ 40 sesiones nuevas de `servido` anotadas

---

## Artefactos

| Artefacto | Ubicación |
|---|---|
| `modelo_a.lgb` (Exp 09) | `fase_3_modelos/models/modelo_a/modelo_a.lgb` |
| `modelo_b.lgb` (Exp 09) | `fase_3_modelos/models/modelo_b/modelo_b.lgb` |
| `readings_features.parquet` (30s) | `fase_2_dataset/data/interim/readings_features.parquet` |
| `calibration_isotonic.json` | `fase_3_modelos/models/modelo_a/calibration_isotonic.json` |
| `feature_importance.csv` (A) | `fase_3_modelos/models/modelo_a/feature_importance.csv` |
| `feature_importance.csv` (B) | `fase_3_modelos/models/modelo_b/feature_importance.csv` |
| `training_report.txt` | `fase_3_modelos/outputs/training_report/training_report.txt` |
| `dataset_report.txt` | `fase_2_dataset/outputs/dataset_report/dataset_report.txt` |
| `quality_report.txt` | `fase_1_extraccion/outputs/quality_report/quality_report.txt` |

> ⚠️ **NOTA**: Los artefactos `modelo_a.lgb` y `modelo_b.lgb` han sido sobreescritos por Exp 09.
> Para reproducir Exp 08 se necesita re-correr el pipeline sin el resampleo a 30 s.
> La inferencia de producción sigue usando los modelos de Exp 06 (via Supabase).