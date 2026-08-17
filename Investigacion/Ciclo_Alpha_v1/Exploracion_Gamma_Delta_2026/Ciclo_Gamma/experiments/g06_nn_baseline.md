# G-06 — NN Baseline (MLP / GRU / TCN)

**Ciclo:** Gamma (γ)
**Fase:** C — Deep Learning (Data-Conditional)
**Estado:** ⏳ Data-conditional — bloqueado hasta cumplir prerequisito de datos
**Prerequisito de pipeline:** G-05 completado
**Prerequisito de datos:** ≥300 sesiones de alimentación + ≥80 sesiones de servido en `new_annotations_gamma.csv`
**Entorno:** Google Colab Pro (GPU T4 o A100)
**Fecha estimada:** TBD (data-conditional)

Referencia: [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) | [instructivo.md](../instructivo.md) §9

---

## Por qué este experimento es data-conditional

En el Ciclo Alpha, α-10 ejecutó 4 arquitecturas NN con 185 sesiones de alimentación y 27 de servido.
LightGBM ganó por defecto: con datos tabulares tan pequeños y clases tan desbalanceadas,
el GBM tiene ventaja estructural. El resultado era predecible y no informativo.

Este experimento solo se ejecuta cuando la base de datos es suficiente para que la comparación sea justa.
Ejecutarlo antes sería repetir el error α-7.

---

## Objetivo

Determinar si las redes neuronales superan al GBM optimizado de G-04 cuando el dataset es suficiente.
La métrica crítica es **F1 servido** (Modelo B), que fue la mayor debilidad del GBM en Alpha.

El aprendizaje más importante de α-10: el GRU bidireccional tuvo el mejor F1 servido (0.34)
y el TCN tuvo el mejor F1 activo de NN (0.60), ambos con solo 185 sesiones.
Con ≥300 sesiones, la hipótesis es que ambos mejorarán significativamente.

---

## Modelos evaluados

| Modelo | Tipo | Referencia Alpha | Por qué incluir |
|---|---|---|---|
| **MLP profundo** | Feedforward tabular | NN-A en α-10 | Baseline neuronal; rápido de entrenar; no requiere secuencias |
| **GRU bidireccional** | Recurrente | NN-B en α-10 (mejor F1 serv: 0.34) | Captura señal temporal de llenado; fue el más prometedor en servido |
| **TCN** (Temporal Conv Net) | Convolucional temporal | NN-C en α-10 (mejor F1 activo: 0.60) | Ventanas largas eficientes; más estable que GRU en activo |

> El Transformer (NN-D en α-10) fue el peor con 185 sesiones. Solo se incorpora en G-07 con ≥500 sesiones.

---

## Configuración

### Formato de input

Todos los modelos reciben secuencias de longitud fija:
- Ventana: **60 timesteps** (60 × 30s = 30 minutos de contexto)
- Features: las 13 de `FEATURES_GAMMA` (definidas en `_gamma_utils.py`)
- Shape: `(batch, 60, 13)`

```python
SEQUENCE_LENGTH = 60    # timesteps por muestra
N_FEATURES = 13         # features Gamma
BATCH_SIZE = 64
EPOCHS = 100
EARLY_STOPPING_PATIENCE = 10
```

### Arquitecturas base

```python
# MLP
mlp = Sequential([
    Dense(128, activation="relu"),
    Dropout(0.3),
    Dense(64, activation="relu"),
    Dropout(0.2),
    Dense(n_classes, activation="softmax")
])

# GRU bidireccional
gru = Sequential([
    Bidirectional(GRU(64, return_sequences=True)),
    Bidirectional(GRU(32)),
    Dense(32, activation="relu"),
    Dense(n_classes, activation="softmax")
])

# TCN (Temporal Convolutional Network)
# Usar librería keras-tcn o implementación personalizada
tcn = Sequential([
    TCN(nb_filters=64, kernel_size=3, dilations=[1,2,4,8]),
    Dense(n_classes, activation="softmax")
])
```

### Manejo de clases desbalanceadas

```python
# Pesos de clase (calcular en runtime sobre y_train)
class_weights = compute_class_weight("balanced", classes=np.unique(y_train), y=y_train)
class_weight_dict = dict(enumerate(class_weights))
```

### Entorno Colab

```python
# En Google Colab Pro — instalar dependencias
!pip install torch torchvision torchaudio
!pip install lightning imbalanced-learn keras-tcn

# Subir a Colab:
# gamma/fase_3_modelos/scripts/g06_train_modelo_a_nn.py
# gamma/fase_3_modelos/scripts/g07_train_modelo_b_nn.py
# gamma/fase_2_dataset/data/train/X_train.parquet
# gamma/fase_2_dataset/data/train/X_val.parquet
# gamma/fase_2_dataset/data/train/y_train.parquet
# gamma/fase_2_dataset/data/train/y_val.parquet
```

---

## Verificación del prerequisito de datos

```python
# Antes de ejecutar — verificar en local
from gamma._gamma_utils import MIN_ALIM_FOR_NN, MIN_SERVIDO_SESSIONS
import pandas as pd

sesiones = pd.read_parquet("gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet")
n_alim = len(sesiones[sesiones["session_type"] == "alimentacion"])
n_serv = len(sesiones[sesiones["session_type"] == "servido"])

assert n_alim >= MIN_ALIM_FOR_NN, f"❌ {n_alim} sesiones alim. Requeridas: {MIN_ALIM_FOR_NN}"
assert n_serv >= MIN_SERVIDO_SESSIONS, f"❌ {n_serv} sesiones serv. Requeridas: {MIN_SERVIDO_SESSIONS}"
print(f"✅ Dataset suficiente: {n_alim} alim + {n_serv} serv. G-06 desbloqueado.")
```

---

## Metas

| Métrica | Umbral para considerar NN competitiva | Referencia α-10 (185 sesiones) |
|---|---|---|
| F1 activo — GRU/TCN Modelo A | > F1 activo GBM G-04 | TCN: 0.60 |
| F1 servido — GRU Modelo B | **≥ 0.40** | GRU: 0.34 |
| Macro F1 Modelo B | > Macro F1 GBM G-04 | — |

Si ninguna NN supera al GBM en ninguna métrica: saltar G-07 e ir directo a G-08 con solo GBM.

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Volumen de datos al ejecutar

| Clase | Sesiones disponibles |
|---|---|
| Alimentacion | — (objetivo: ≥300) |
| Servido | — (objetivo: ≥80) |
| Reposo | — |

### Modelo A — Comparativa

| Modelo | F1 activo | AUC-ROC | Tiempo por época | Épocas (early stop) | ¿Supera GBM G-04? |
|---|---|---|---|---|---|
| **GBM G-04 (referencia)** | — | — | — | — | — |
| MLP | — | — | — | — | — |
| GRU bidireccional | — | — | — | — | — |
| TCN | — | — | — | — | — |

### Modelo B — Comparativa

| Modelo | F1 alim | F1 serv | Macro F1 | ¿Supera GBM en servido? |
|---|---|---|---|---|
| **GBM G-04 (referencia)** | — | — | — | — |
| MLP | — | — | — | — |
| GRU bidireccional | — | — | — | — |
| TCN | — | — | — | — |

---

## Artefactos generados

```
gamma/fase_3_modelos/models/nn/
├── g06_mlp_a.pt         g06_mlp_b.pt
├── g06_gru_a.pt         g06_gru_b.pt
├── g06_tcn_a.pt         g06_tcn_b.pt
├── g06_mlp_arch.json    (arquitectura para carga posterior)
├── g06_gru_arch.json
├── g06_tcn_arch.json
└── gamma/fase_3_modelos/outputs/training_report/
    └── nn_baseline_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Alguna NN superó al GBM en F1 servido?** —
**¿Alguna NN superó al GBM en F1 activo?** —
**Mejor NN para ensemble G-08:** —

**Próximo paso:**
- Si alguna NN mostró F1 > GBM en ≥1 métrica: G-07 — NN Avanzado (LSTM/TabNet)
- Si ninguna supera al GBM: ir directo a G-08 — Ensemble

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [g05_classical_ml_benchmark.md](g05_classical_ml_benchmark.md) |
| Tracker | [EXPERIMENT_TRACKER_GAMMA.md](../EXPERIMENT_TRACKER_GAMMA.md) |
| Referencia α-10 | `Ciclo_Alpha_v1/experiments/exp_10_nn_colab.md` (referencia histórica) |
