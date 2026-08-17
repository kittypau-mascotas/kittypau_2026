# Experiments — Índice de Iteraciones ML

> Esta carpeta contiene el registro histórico de cada iteración del pipeline ML de Kittypau.
> Para métricas comparativas y estado global, ver [A1_EXPERIMENT_TRACKER.md](../../A1_EXPERIMENT_TRACKER.md).
> Para contexto completo del pipeline, ver [Data Science/README.md](../README.md).

---

## Experimentos en Orden Cronológico

| # | Archivo | Fecha | Estado | Cambio principal | Resultado clave |
|---|---------|-------|--------|-----------------|----------------|
| 1 | [A1_exp_01_linea_base.md](A1_exp_01_linea_base.md) | 2026-04-26 | 🗂️ Histórico | Configuración inicial LightGBM | F1 activo=0.000 — binario colapsa con threshold default |
| 2 | [A1_exp_02_threshold_rebalanceo.md](A1_exp_02_threshold_rebalanceo.md) | 2026-04-26 | 🗂️ Histórico | Threshold sweep → 0.42 | F1 activo=0.555 — mejora crítica en binario |
| 3 | [A1_exp_03_mejor_base.md](A1_exp_03_mejor_base.md) | 2026-04-26 | 🗂️ Histórico | **12 features definitivas** + servido ×3 | F1 multiclase=0.671 — **base histórica fija** |
| 4 | [A1_exp_04_smote_calibracion.md](A1_exp_04_smote_calibracion.md) | 2026-04-26 | 🗂️ Histórico | SMOTE local + calibración isotónica → **threshold 0.20** | F1 activo=0.569 — calibración de producción establecida |
| 5 | [A1_exp_05_nueva_ingesta.md](A1_exp_05_nueva_ingesta.md) | 2026-04-26 | 🗂️ Histórico | Fase 1 cambia a CSV dump (no API) | Sin mejora en modelos — cambio de infraestructura |
| 6 | [A1_exp_06_colab_dataset.md](A1_exp_06_colab_dataset.md) | 2026-06-13 | ✅ **Producción** | +8 sesiones alim, +4 servido en dataset | F1 activo=**0.7619** ✅ · F1 alim=**0.7606** ✅ · **Fase 4 habilitada** |
| 7 | [A1_exp_07_inferencia_mayo_junio.md](A1_exp_07_inferencia_mayo_junio.md) | 2026-06-14 | 🗂️ Histórico | Primera inferencia en datos reales sin etiquetar | 134 sesiones alim detectadas · 1,306 g consumo |
| 8 | [A1_exp_08_unificacion_mayo_junio.md](A1_exp_08_unificacion_mayo_junio.md) | 2026-06-14 | 🗂️ Histórico | Unificación Abril+MayoJun · 185 alim · 27 serv | F1 activo=0.6021 · shift distribución identificado |
| 9A | [A1_exp_09a_cadencia_normalizada.md](A1_exp_09a_cadencia_normalizada.md) | 2026-06-14 | ✅ Completado | Resampleo a cadencia uniforme 30 s | F1 activo=0.6000 · AUC=0.9146 · threshold sube a 0.26 — shift persiste |
| 9B | [A1_exp_09b_threshold_por_periodo.md](A1_exp_09b_threshold_por_periodo.md) | 2026-06-14 | ✅ Completado | Threshold por período + `plateau_duration` en segundos + `cadencia_s` (feature #13) | F1 activo=0.6000 (sin mejora) · AUC=0.9171 (+0.0025) · `cadencia_s` importancia baja |
| 10-NN | [A1_exp_10_nn_colab.md](A1_exp_10_nn_colab.md) | 2026-06-15 | 🗂️ Completado | Benchmark 4 arquitecturas neuronales (MLP / GRU / TCN / Transformer) en Colab T4 | LGBM Exp 06 supera a todas las NN · GRU mejor en F1 servido (0.34) · TCN mejor en F1 activo (0.60) |
| 11 | [A1_exp_11_ensemble_gru_lgbm.md](A1_exp_11_ensemble_gru_lgbm.md) | ⏳ TBD | 📋 Planificado | Revertir `cadencia_s` (→12 feat) · revisar 155 candidatos Exp 07 (Línea B) · ensemble LGBM+GRU Modelo B (Línea C) | Meta: F1 servido ≥ 0.30 · Macro F1 ≥ 0.62 · no degradar F1 activo ni F1 alim |

---

## Hitos Clave por Experimento

### Exp 01 — Por qué el modelo binario colapsó
El threshold default de 0.50 en LightGBM no funciona con clases altamente desbalanceadas (reposo >> activo). El modelo predice siempre reposo.

### Exp 02 — Por qué threshold 0.42 fue el punto de inflexión
El sweep de thresholds mostró que F1 activo salta de 0.000 a 0.555 al bajar el threshold. Origen del principio de threshold bajo.

### Exp 03 — Por qué estas 12 features son invariantes
Tras ablation study, se encontró que las 12 features actuales maximizan F1 con datos disponibles. Añadir más no mejora; cambiarlas sin más datos tampoco.

### Exp 04 — Por qué threshold 0.20 (y no 0.42)
La calibración isotónica reescala las probabilidades del modelo. Tras calibración, el threshold óptimo en val es 0.20. Este valor se mantiene en producción.

### Exp 05 — Por qué Fase 1 cambió a CSV
La API de Supabase tiene límites de paginación que causaban lecturas incompletas. El dump CSV completo garantiza reproducibilidad exacta.

### Exp 06 — Por qué +8 sesiones alim generaron +20 puntos de F1
El dataset tenía sub-representación de sesiones de alimentación. El dump del 07-05-2026 incluye 8 sesiones adicionales que cubren patrones no vistos anteriormente.

### Exp 07 — Por qué no hay métricas de F1
Datos de Mayo–Jun 2026 no tienen etiquetas manuales. El etiquetado retroactivo con `app_anotacion.py` es el prerequisito para calcular F1 formal.

### Exp 08 — Por qué F1 activo cayó de 0.76 a 0.60 con más datos
Al incluir Mayo-Jun 2026 en el dataset, la cadencia diferente (~30s vs ~14.7s de Abril) distorsiona las features de rolling window. La misma cantidad de filas representa ventanas temporales distintas según el período — distribución shift sistemático.

### Exp 09A — Por qué el resampleo a 30s no fue suficiente
Normalizar la cadencia era condición necesaria pero no suficiente. El shift persiste porque (1) las etiquetas de Mayo-Jun son retroactivas (menor calidad), (2) el UUID del dispositivo KPCL0034 cambió entre períodos, y (3) el threshold 0.20 está calibrado sobre Abril y se desalinea con Mayo-Jun (sube a 0.26).

### Exp 09B — Por qué thresholds separados y plateau en segundos
El AUC-ROC estable (~0.91) confirma que el modelo discrimina bien en ranking — el problema es la calibración de probabilidades entre períodos. Dos thresholds (uno por cadencia) resuelven el desalineamiento sin reentrenar. Convertir `plateau_duration` a segundos elimina la dependencia numérica en la cadencia.

### Exp 10-NN — Por qué las NN no superaron al LGBM
Con el dataset actual (185 alim · 27 serv), el tamaño es insuficiente para que las NN generalicen mejor que LGBM en F1 activo y alimentacion. El LGBM tiene ventaja estructural en datos tabulares pequeños. La excepción es F1 servido: GRU (0.34) y TCN (0.33) duplican al LGBM (0.14), porque la señal temporal de servido (plateau breve + variación de peso) es más capturable por modelos recurrentes/convolucionales. El Transformer tuvo el peor AUC (0.856) — arquitectura sobredimensionada para este tamaño de secuencia.

### Exp 11 — Por qué tres líneas y no una sola
Exp 09A/09B/10-NN diagnosticaron que el problema es multifactorial: (1) `cadencia_s` añade ruido sin ayudar (señal de Exp 09B), (2) el cuello de botella de datos `servido` sigue sin resolverse con las 27 sesiones disponibles (señal de Exp 08), y (3) el GRU tiene una ventaja real en `servido` que se pierde en el LGBM. Las tres líneas son independientes y de bajo riesgo: Línea A (revertir feature) y Línea B (más datos) son precondiciones para Línea C (ensemble). Si Línea B no aporta sesiones `servido` nuevas, Línea C sigue siendo válida con los pesos de Exp 10. Si Línea C tampoco cierra la brecha, el diagnóstico apunta a recolección de hardware nueva (Exp 12).

---

## Qué NO Cambiar Entre Experimentos

Las siguientes decisiones son **invariantes desde Exp 03** (salvo excepciones anotadas). Cambiarlas requiere reentrenar desde Fase 1 y crear un nuevo experimento numerado:

| Invariante | Valor | Definido en | Nota |
|-----------|-------|------------|------|
| Features activas | 12 (Exp 03–09A) · **13 en Exp 09B** (`cadencia_s`) | `_phase2_utils.py` | Exp 09B agrega `cadencia_s` — revertir si no mejora |
| `GAP_CUTOFF_S` | 300 s | `_phase2_utils.py` | Invariante |
| `PLATEAU_THRESHOLD` | 1.5 g | `_phase2_utils.py` | Invariante |
| `plateau_duration` unidad | filas (Exp 03–09A) · **segundos en Exp 09B** | `_phase2_utils.py` | Exp 09B cambia a segundos para normalizar cadencia |
| Split temporal | train→May 31 · val→Jun 7 · test→Jun 14 (desde Exp 08) | `fase_2_dataset/scripts/03_build_train_dataset.py` | Invariante desde Exp 08 |
| `THRESHOLD_A` | 0.20 (único) · **por período en Exp 09B** | `calibration_by_period.json` | Exp 09B usa dos thresholds según cadencia mediana |
| Resampleo a 30 s | Activo desde Exp 09A | `_phase2_utils.py` | Invariante para todos los experimentos futuros |

---

## Arquitectura de un Documento de Experimento

Cada `exp_NN_*.md` debe contener estas secciones:

```markdown
# Exp NN — Nombre del Experimento

## 1. Objetivo
## 2. Cambio(s) principal(es) respecto al experimento anterior
## 3. Dataset utilizado (fuente, período, filas, sesiones)
## 4. Parámetros técnicos (threshold, SMOTE, calibración, algoritmo)
## 5. Resultados (Modelo A y Modelo B — métricas completas)
## 6. Análisis y observaciones
## 7. Artefactos generados (con rutas)
## 8. Decisión (continuar / descartar / ir a siguiente fase)
## 9. Próximos pasos
```

---

## Cómo Crear Exp 08

1. Copiar [A1_exp_06_colab_dataset.md](A1_exp_06_colab_dataset.md) como plantilla
2. Renombrar a `exp_08_reentrenamiento_mayo_junio.md`
3. Prerequisito: etiquetado retroactivo completo de Mayo–Jun en `app_anotacion.py`
4. Ejecutar Fase 1 con el CSV `Mayo_2026/readings_rows.csv` + nuevas annotations
5. Ejecutar Fases 2 y 3 con el dataset extendido
6. Actualizar [A1_EXPERIMENT_TRACKER.md](../../A1_EXPERIMENT_TRACKER.md) con fila de Exp 08
7. Si F1 servido > 0.40 → Actualizar `Data Science/README.md` con nuevo experimento activo
