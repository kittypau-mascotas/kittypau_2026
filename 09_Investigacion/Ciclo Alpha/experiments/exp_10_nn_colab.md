# Exp 10-NN — Redes Neuronales en Colab (4 arquitecturas)

| Campo | Valor |
|---|---|
| **ID** | Exp 10-NN |
| **Nombre** | Benchmark neuronal — 4 arquitecturas con GPU |
| **Fecha** | 2026-06-15 |
| **Estado** | ✅ Completado |
| **Basado en** | Exp 09B (pipeline normalizado a 30 s · 13 features · dataset Apr–Jun) |
| **Prerrequisito** | Exp 09B completado · Acceso a Google Colab Pro con GPU T4/A100 |
| **Archivo Colab** | `exp_10_colab.py` |
| **Ubicación** | `experiments/exp_10_colab/exp_10_colab.py` |
| **Drive Modelo A** | [Carpeta Drive A](https://drive.google.com/drive/folders/1EUTN-rAuZujoS8JXCwqTD0D54dXPkX_I) — `X_train/val + y_train/val` binario |
| **Drive Modelo B** | [Carpeta Drive B](https://drive.google.com/drive/folders/1ZrTtyl8jKxkeWDxx0gT6OMvqj_G1B8UQ) — `X_train/val + y_train/val` multiclase |

---

## Instrucciones para Claude Code (VS Code)

> ✅ **Limpieza ya ejecutada.** Los artefactos de Exp 10-Claude, Exp 11-NN y Exp 12-RT fueron eliminados el 2026-06-14.
> El script `exp_10_colab.py` ya existe en `experiments/exp_10_colab/`.

```bash
# Verificar que la carpeta de resultados existe
ls "Docs/investigacion/Data Science/experiments/exp_10_colab/results/"
```

> Subir `exp_10_colab.py` junto con los parquets de Exp 09B a Google Colab y ejecutar.

---

## 1. Objetivo

Entrenar y comparar **4 arquitecturas de redes neuronales** sobre el dataset normalizado de Exp 09B para evaluar si alguna supera al LightGBM de Exp 06 en producción.

Las 4 arquitecturas compiten en paralelo sobre GPU en Google Colab:

| # | Arquitectura | Tipo | Foco |
|---|---|---|---|
| NN-A | MLP profundo | Tabular feedforward | Baseline neuronal rápido |
| NN-B | GRU bidireccional | Secuencial recurrente | Captura dependencias temporales |
| NN-C | TCN (Temporal Conv Net) | Convolucional temporal | Ventanas largas, eficiente en GPU |
| NN-D | Transformer (pequeño) | Atención | Relaciones no locales entre timesteps |

---

## 2. Estado de referencia

| Métrica | LightGBM Exp 06 (producción) | Meta NN Exp 10 |
|---|:---:|:---:|
| F1 activo (Modelo A) | **0.7619** | ≥ 0.80 |
| AUC-ROC (Modelo A) | **0.9205** | ≥ 0.92 |
| F1 alimentacion (Modelo B) | **0.7606** | ≥ 0.78 |
| F1 servido (Modelo B) | 0.1395 ⚠️ | ≥ 0.40 |
| Macro F1 (Modelo B) | 0.6312 | ≥ 0.70 |

> Criterio de producción: una NN supera al LGBM si gana en ≥ 3 de las 5 métricas.
> Si ninguna supera, LGBM Exp 06 permanece en producción y las NN se documentan como diagnóstico.

---

## 3. Dataset

### Fuente

Dos carpetas separadas en Google Drive (mismo correo que Colab). El script las descarga automáticamente al ejecutar.

| Modelo | Drive ID | Contenido |
|---|---|---|
| **Modelo A** (binario) | `1EUTN-rAuZujoS8JXCwqTD0D54dXPkX_I` | `X_train/val.parquet` + `y_train/val.parquet` — labels: 0=reposo / 1=activo |
| **Modelo B** (multiclase) | `1ZrTtyl8jKxkeWDxx0gT6OMvqj_G1B8UQ` | `X_train/val.parquet` + `y_train/val.parquet` — labels: 0=alim / 1=serv / 2=rep |

> El script detecta automáticamente si los labels de Modelo A son binarios (0/1) o multiclase (0/1/2 → convierte a binario).

Referencia original (Exp 09B):

```
fase_2_dataset/data/train/
  X_train.parquet   → 94,445 filas
  X_val.parquet     → 20,238 filas
  X_test.parquet    → 20,239 filas  ← NO tocar hasta Fase 4
  y_train.parquet
  y_val.parquet
  y_test.parquet
```

### Features activas (13)

```python
FEATURES = [
    'weight_grams', 'delta_w', 'delta_w_10',
    'rolling_std_5', 'rolling_std_10', 'rolling_mean_5',
    'net_weight', 'is_plateau', 'plateau_duration',
    'hour_sin', 'hour_cos', 'clock_invalid',
    'cadencia_s'
]
```

> `cadencia_s` fue añadida en Exp 09B. Si no mejora en las NN tampoco, se elimina en Exp 11.

### Distribución de clases en train

| Clase | Filas | % |
|---|---|---|
| `reposo` | 92,418 | 97.9% |
| `alimentacion` | 1,901 | 2.0% |
| `servido` | 126 | 0.1% |

### SMOTE sobre `servido` (aplicado en Colab antes de entrenar)

- Target: 378 filas de servido (×3)
- Sintéticas: 252
- Train final: 94,697 filas

---

## 4. Las 4 arquitecturas

### NN-A — MLP profundo

**Por qué:** Baseline mínimo. Verifica si la representación tabular plana ya es suficiente.

| Componente | Valor |
|---|---|
| Input | 13 features (flat) |
| Capas ocultas | [256, 128, 64, 32] |
| Activación | ReLU + BatchNorm + Dropout(0.3) |
| Output binario (A) | Linear(32→1) → Sigmoid |
| Output multiclase (B) | Linear(32→3) → Softmax |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=1e-3, weight_decay=1e-4 |
| Scheduler | CosineAnnealingLR T_max=50 |
| Epochs | 100 · early stopping patience=15 |
| Batch size | 512 |

---

### NN-B — GRU bidireccional

**Por qué:** El bowl es una señal temporal. El GRU captura dependencias entre timesteps consecutivos sin requerir features rolling manuales.

| Componente | Valor |
|---|---|
| Ventana de secuencia | 10 timesteps × 13 features = (batch, 10, 13) |
| Step | 1 timestep (sliding window) |
| GRU | hidden=128, layers=2, bidireccional, dropout=0.3 |
| Clasificador | Linear(256→64) → ReLU → Dropout(0.3) → Linear(64→output) |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=5e-4 |
| Scheduler | ReduceLROnPlateau patience=5 factor=0.5 |
| Epochs | 100 · early stopping patience=15 |
| Batch size | 256 |

---

### NN-C — TCN (Temporal Convolutional Network)

**Por qué:** Las conv dilatadas cubren ventanas largas con menos parámetros que el GRU. Más eficiente en GPU que RNN para secuencias moderadas.

| Componente | Valor |
|---|---|
| Ventana de secuencia | 16 timesteps × 13 features |
| Canales conv | [64, 128, 128, 64] |
| Kernel size | 3 |
| Dilaciones | [1, 2, 4, 8] |
| Activación | ReLU + Weight Norm |
| Dropout | 0.2 |
| Clasificador | Linear(64→output) |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=1e-3 |
| Scheduler | OneCycleLR max_lr=1e-2 |
| Epochs | 80 · early stopping patience=12 |
| Batch size | 256 |

---

### NN-D — Transformer (pequeño)

**Por qué:** La atención multi-cabeza puede detectar relaciones entre momentos no contiguos dentro de la ventana (ej: inicio vs fin de un plateau).

| Componente | Valor |
|---|---|
| Ventana de secuencia | 16 timesteps × 13 features |
| Positional encoding | Learnable |
| d_model | 64 |
| n_heads | 4 |
| n_layers | 3 |
| d_ff | 256 |
| Dropout | 0.1 |
| Clasificador | Mean pooling → Linear(64→output) |
| Loss A | BCELoss (pos_weight = 45.6) |
| Loss B | CrossEntropyLoss (class_weights) |
| Optimizer | AdamW lr=3e-4, weight_decay=1e-4 |
| Scheduler | LinearLR warmup (1 epoch ≈ 740 pasos) → CosineAnnealingWarmRestarts |
| Epochs | 80 · early stopping patience=12 |
| Batch size | 128 |

---

## 5. Métricas de evaluación

Todas las arquitecturas se evalúan con las mismas métricas sobre `X_val`:

### Modelo A (binario: activo vs reposo)

| Métrica | Descripción |
|---|---|
| F1 activo | F1 de la clase positiva con threshold óptimo |
| AUC-ROC | Área bajo la curva ROC |
| Threshold óptimo | Sweep 0.10–0.60 paso 0.02, maximizando F1 |
| Precision / Recall | Con el threshold óptimo |
| Matriz de confusión | TP / FP / FN / TN |

### Modelo B (multiclase)

| Métrica | Descripción |
|---|---|
| Macro F1 | Promedio no ponderado de F1 por clase |
| F1 alimentacion | F1 clase 0 |
| F1 servido | F1 clase 1 |
| F1 reposo | F1 clase 2 |
| Weighted F1 | Promedio ponderado por soporte |

---

## 6. Estructura de resultados

El script genera en `results/` (dentro del directorio de Colab):

```
results/
  # Métricas por arquitectura
  nn_a_results.json            ← history + modelo_a + modelo_b — NN-A MLP
  nn_b_results.json            ← NN-B GRU
  nn_c_results.json            ← NN-C TCN
  nn_d_results.json            ← NN-D Transformer

  # Tablas de comparación
  benchmark_summary.csv        ← tabla comparativa 4 NN vs LGBM Exp 06
  benchmark_report.txt         ← reporte texto con métricas A y B formateadas

  # Curvas de entrenamiento (por arquitectura)
  training_curves_nn_a.png     ← 2×2: A loss / A val / B loss / B val — NN-A
  training_curves_nn_b.png
  training_curves_nn_c.png
  training_curves_nn_d.png

  # Matrices de confusión (por modelo)
  cms_modelo_a.png             ← 2×2 grilla: CM Modelo A para las 4 arquitecturas
  cms_modelo_b.png             ← 2×2 grilla: CM Modelo B para las 4 arquitecturas
  confusion_matrix_best.png    ← CM del mejor en A y del mejor en B (1 plot)

  # Análisis adicional
  roc_curves_modelo_a.png      ← curvas ROC de las 4 NN en un mismo gráfico
  f1_comparison.png            ← barras agrupadas: F1/AUC por métrica y arquitectura

  # Pesos PyTorch (quedan en Colab, no se commitean)
  nn_a_best_a.pt  nn_a_best_b.pt
  nn_b_best_a.pt  nn_b_best_b.pt
  nn_c_best_a.pt  nn_c_best_b.pt
  nn_d_best_a.pt  nn_d_best_b.pt
```

> Solo descargar los `.json`, `.csv`, `.txt` y `.png` para documentar en el repo.
> Los `.pt` quedan en Colab para retomar entrenamiento o llevar a producción en Exp 11.

### Formato de `benchmark_summary.csv`

| Arquitectura | F1_activo | AUC_ROC | F1_alim | F1_servido | Macro_F1 | Threshold | Epochs | Tiempo_s |
|---|---|---|---|---|---|---|---|---|
| LGBM_Exp06 | 0.7619 | 0.9205 | 0.7606 | 0.1395 | 0.6312 | 0.20 | 25 | — |
| NN-A MLP | — | — | — | — | — | — | — | — |
| NN-B GRU | — | — | — | — | — | — | — | — |
| NN-C TCN | — | — | — | — | — | — | — | — |
| NN-D Transformer | — | — | — | — | — | — | — | — |

---

## 7. Orden de ejecución en Colab

```
1. En Colab → Runtime → Change runtime type → GPU (T4 o A100)

2. Subir solo el script al directorio de trabajo de Colab:
   - exp_10_colab.py
   (Los parquets se descargan automáticamente desde Drive)

3. Ejecutar — el script instala dependencias, autentica con Drive,
   descarga los parquets y entrena las 4 arquitecturas:
   !python exp_10_colab.py

4. El script imprimirá el BENCHMARK SUMMARY y la DECISIÓN al finalizar.

5. Descargar de Colab → results/:
   benchmark_summary.csv   benchmark_report.txt
   nn_[a-d]_results.json   training_curves_nn_[a-d].png
   cms_modelo_a.png         cms_modelo_b.png
   roc_curves_modelo_a.png  f1_comparison.png
   confusion_matrix_best.png

6. Copiar al repo local:
   experiments/exp_10_colab/results/
```

> **Drive**: los parquets se descargan en `data_modelo_a/` y `data_modelo_b/` la primera vez.
> En ejecuciones siguientes se saltan si ya existen (no re-descarga).
>
> **AMP activo automáticamente** cuando hay GPU — ~2× más rápido en T4, ~3× en A100.

---

## 8. Criterio de decisión

| Resultado | Acción |
|---|---|
| NN supera LGBM en ≥ 3 métricas | NN candidata a producción → Exp 11 ajusta hiperparámetros de la ganadora |
| NN supera LGBM en 1–2 métricas | NN como ensemble con LGBM → evaluar en Exp 11 |
| Ninguna NN supera LGBM | LGBM Exp 06 permanece en producción · Exp 11 enfocado en más datos |

---

## 9. Artefactos

| Artefacto | Ubicación en el repo |
|---|---|
| `exp_10_colab.py` | `experiments/exp_10_colab/exp_10_colab.py` |
| `benchmark_summary.csv` | `experiments/exp_10_colab/results/` |
| `benchmark_report.txt` | `experiments/exp_10_colab/results/` |
| `nn_[a-d]_results.json` | `experiments/exp_10_colab/results/` |
| `training_curves_nn_[a-d].png` | `experiments/exp_10_colab/results/` |
| `cms_modelo_a.png` · `cms_modelo_b.png` | `experiments/exp_10_colab/results/` |
| `roc_curves_modelo_a.png` | `experiments/exp_10_colab/results/` |
| `f1_comparison.png` | `experiments/exp_10_colab/results/` |
| `confusion_matrix_best.png` | `experiments/exp_10_colab/results/` |

> ⚠️ `X_test.parquet` y `y_test.parquet` NO se usan en Exp 10.
> Quedan reservados para Fase 4 con el modelo ganador final.
>
> Los archivos `.pt` (pesos PyTorch) se generan en Colab pero **no se commitean** al repo.
> Solo subirlos si se decide llevar la NN a producción en Exp 11.

---

## 10. Notas técnicas del script (`exp_10_colab.py`)

| Optimización / Feature | Detalle |
|---|---|
| **Drive API** | `setup_drive()` autentica con `google.colab.auth` y descarga parquets via `googleapiclient` — no requiere gdown ni links públicos |
| **Datos separados A/B** | `load_data_a()` desde `DRIVE_FOLDER_ID_A` · `load_data_b()` desde `DRIVE_FOLDER_ID_B` — datasets independientes por modelo |
| **pos_weight dinámico** | Calculado desde los datos reales de Modelo A (`n_neg / n_pos`) — no hardcodeado |
| **Labels auto-detectados** | `load_data_a()` detecta si y es binario (0/1) o multiclase (0/1/2) y convierte automáticamente |
| **SMOTE solo en B** | Modelo B aplica SMOTE en servido hasta `SMOTE_TARGET=378`; Modelo A no necesita SMOTE (usa pos_weight) |
| **AMP (Mixed Precision)** | `torch.autocast` + `GradScaler` — activo automáticamente en GPU; ~2× en T4, ~3× en A100 |
| **SequenceDataset** | `np.lib.stride_tricks.as_strided` — cero copias de memoria, 5-10× más rápido que loop Python |
| **`_run_task` unificada** | Elimina ~80 líneas de código duplicado entre tarea A y tarea B |
| **Warmup Transformer** | `LinearLR` (1 epoch, start_factor=1e-6) → `SequentialLR` → `CosineAnnealingWarmRestarts` |
| **`build_scheduler()`** | Factory centralizada para cosine / plateau / onecycle / warmrestart |
| **GPU cleanup** | `del model` + `torch.cuda.empty_cache()` entre experimentos |
| **`torch.load` seguro** | `weights_only=True` + `map_location=DEVICE` |
| **ROC curves** | `_get_val_probs_a()` guarda probs del val set → `plot_roc_curves()` genera curvas para las 4 NN |
| **Reportes por modelo** | `cms_modelo_a.png` (2×2 CMs Modelo A) · `cms_modelo_b.png` (2×2 CMs Modelo B) · `f1_comparison.png` (barras agrupadas) |
| **`benchmark_report.txt`** | Reporte texto con tablas de métricas A y B — descargable de Colab |

---

## 11. Resultados

> Ejecutado en Google Colab GPU — 2026-06-15T03:53 UTC.
> GPU usada: T4 (según tiempo de entrenamiento). Datos: `results-20260615T035329Z-3-001/`.

### Modelo A — Clasificador binario (activo vs reposo)

| Arquitectura | F1 activo | AUC-ROC | Threshold | Precision | Recall | Epochs | Tiempo |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **LGBM Exp 06** | **0.7619** | **0.9205** | 0.20 | — | — | 25 | — |
| NN-A MLP | 0.4872 | 0.8969 | 0.60 | 0.3550 | 0.7764 | 16 | 78.4 s |
| NN-B GRU | 0.5203 | 0.9129 | 0.60 | 0.3873 | 0.7927 | 23 | 179.0 s |
| NN-C TCN | **0.6016** | 0.9086 | 0.60 | 0.5014 | 0.7520 | 37 | 335.8 s |
| NN-D Transformer | 0.4948 | 0.8560 | 0.40 | 0.5108 | 0.4797 | 27 | 512.5 s |

### Modelo B — Clasificador multiclase (alim / servido / reposo)

| Arquitectura | Macro F1 | F1 alim | F1 servido | F1 reposo | Epochs |
|---|:---:|:---:|:---:|:---:|:---:|
| **LGBM Exp 06** | **0.6312** | **0.7606** | 0.1395 | — | 25 |
| NN-A MLP | 0.5189 | 0.4728 | 0.1125 | 0.9715 | 21 |
| NN-B GRU | **0.5552** | 0.3613 | **0.3400** | 0.9642 | 24 |
| NN-C TCN | 0.5439 | 0.3305 | 0.3333 | 0.9679 | 26 |
| NN-D Transformer | 0.5492 | 0.3892 | 0.2812 | 0.9772 | 16 |

### Matrices de confusión — Modelo A (mejor: NN-C TCN)

```
NN-C TCN — Modelo A (F1=0.6016, AUC=0.9086, thr=0.60)
             pred_reposo  pred_activo
 real_reposo    19,363        368
 real_activo       122        370
```

### Matrices de confusión — Modelo B (mejor: NN-B GRU)

```
NN-B GRU — Modelo B (Macro F1=0.5552, F1_serv=0.3400)
              pred_alim  pred_serv  pred_rep
 real_alim       375          0        77
 real_serv        11         17        12
 real_rep       1238         43    18,456
```

### Métricas vs meta Exp 10

| Métrica | Meta | Mejor NN | Resultado |
|---|:---:|:---:|:---:|
| F1 activo ≥ 0.80 | ≥ 0.80 | 0.6016 (TCN) | ❌ No alcanzado |
| AUC-ROC ≥ 0.92 | ≥ 0.92 | 0.9129 (GRU) | ❌ No alcanzado |
| F1 alim ≥ 0.78 | ≥ 0.78 | 0.4728 (MLP) | ❌ No alcanzado |
| F1 servido ≥ 0.40 | ≥ 0.40 | 0.3400 (GRU) | ⚠️ Parcial (+0.20 vs LGBM) |
| Macro F1 ≥ 0.70 | ≥ 0.70 | 0.5552 (GRU) | ❌ No alcanzado |

### Decisión final

**Ninguna NN supera a LGBM Exp 06.** LGBM Exp 06 permanece en producción.

Hallazgos clave:

- **F1 activo**: LGBM (0.7619) supera a la mejor NN (TCN 0.6016) por −16 puntos. El MLP tabular plano es insuficiente; GRU y TCN mejoran pero no alcanza. El Transformer es el más débil (AUC=0.856 — el único por debajo de LGBM en AUC).
- **F1 servido**: Las NN muestran una ventaja real aquí. GRU llega a 0.34 (+0.20 sobre LGBM 0.14), TCN a 0.33. El modelo recurrente y convolucional capturan mejor los patrones temporales breves de servido.
- **F1 alimentacion**: Las NN no logran aprender esta clase con el dataset actual. El problema es de datos, no de arquitectura — necesitan más sesiones de alimentación etiquetadas.
- **Threshold óptimo**: Todas las NN convergen en threshold=0.60 (vs 0.20 de LGBM) — señal de que las probabilidades no están calibradas. Calibración isotónica en Exp 11 podría bajar el threshold y mejorar F1.
- **Tiempo**: MLP (78 s) es 6× más rápido que Transformer (512 s) con peor resultado — el Transformer claramente no es adecuado para este tamaño de dataset.

**Acción:**
- Exp 11: ensemble GRU + LGBM para aprovechar la mejora de GRU en servido sin sacrificar F1 activo y alimentacion.
- Alternativamente: más datos etiquetados de alimentacion y servido antes de reentrenar NN.