---
id: readme_shape_features
title: Motor Matemático v2 — shape_features_v2.py
type: feature
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - features
  - motor-matematico
  - numpy
  - scipy
  - alpha-v2
related:
  - [[00_HOME]]
  - [[11_ModelosIA/MOC_ModelosIA]]
  - [[11_ModelosIA/MODEL_EvidenceEngine]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
  - [[15_Resultados/RESULT_AlphaV2_Snapshots]]
  - [[23_Decisiones/ADR_003_MotorMatematico]]
---

# Motor Matemático v2 — shape_features_v2.py

**Archivo:** `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/shape_features_v2.py`  
**Features:** 102 en 15 familias (F00–F14)  
**Dependencias:** numpy, scipy (solo)  
**Importar:** `from shape_features_v2 import extraer_features, evidence_score`

---

## Uso básico

```python
from shape_features_v2 import extraer_features, evidence_score

# señal: np.ndarray de lecturas de peso (ya resampleadas a 30s)
features = extraer_features(señal)   # dict con 102 keys
score    = evidence_score(señal)     # dict con probabilidades por categoría
```

---

## Las 15 familias de features (F00–F14)

| Familia | Código | N features | Descripción |
|---------|--------|:----------:|-------------|
| Estadísticas básicas | F00 | ~8 | media, std, min, max, rango, skewness, kurtosis, mediana |
| Derivada primera | F01 | ~5 | rms, max, varianza, tendencia, cruces por cero |
| Derivada segunda | F02 | ~4 | rms, max, varianza, cruces por cero |
| Energía y potencia | F03 | ~4 | energía total, potencia media, RMS, energía normalizada |
| Geometría de la curva | F04 | ~6 | straightness, AUC normalizada, pendiente lineal, convexidad |
| Temporales | F05 | ~6 | time_to_min, time_to_max, duración, posición del mínimo/máximo |
| Entropía | F06 | ~4 | entropy_shannon, entropy_permutation, entropy_spectral, complejidad |
| Frecuencial | F07 | ~6 | FFT — frecuencia dominante, potencia espectral, centroide |
| Complejidad | F08 | ~5 | Lempel-Ziv (O(n log n)), Higuchi, DFA |
| Autocorrelación | F09 | ~4 | lag-1, lag-2, decay rate, oscilación |
| Percentiles | F10 | ~6 | p10, p25, p50, p75, p90, IQR |
| Cambios de régimen | F11 | ~5 | n_picos, n_valles, amplitud picos, cambios tendencia |
| Templates canónicos | F12 | ~15 | correlación con formas prototipo de cada categoría |
| Similitudes | F13 | ~6 | sim_alimentacion, sim_servido, sim_ruido |
| Evidence Engine | F14 | ~18 | scores calibrados por categoría con pesos ajustados |

---

## Templates canónicos (F12) — los más discriminativos

| Feature | sep A/S | sep A/R | Interpretación |
|---------|--------:|--------:|----------------|
| `tpl_doble_rampa` | **7.69σ** | 1.58σ | Alimentación cae en doble rampa; servido sube |
| `tpl_sigmoide` | **6.26σ** | 1.33σ | Servido tiene forma sigmoidea de subida |
| `tpl_alim_escalonada` | **6.07σ** | 1.28σ | Alimentación en escalones de descenso |
| `sim_alimentacion` | **6.03σ** | 1.28σ | Similitud global con curva prototipo de alimentación |
| `sim_servido` | **6.03σ** | 1.28σ | Similitud global con curva prototipo de servido |

> Valores recalculados 2026-08-10 sobre 496 anotaciones (antes: 417). El feature #1 no
> cambió, solo la cifra exacta.

---

## Evidence Engine

**Normaliza cada feature (z-score) y calcula los pesos directamente de los datos** —
discriminante tipo Fisher sobre las 102 features + softmax. Reescrito 2026-08-10, ver
[[11_ModelosIA/MODEL_EvidenceEngine]] para el detalle completo (por qué el motor anterior
con pesos a mano sin normalizar acertaba menos que adivinar la clase mayoritaria).

```python
score = evidence_score(feats, comp_stats)
# → {"score_alimentacion": 0.82, "score_servido": 0.07, "score_ruido": 0.11, ...}
```

- Mejor discriminador: `tpl_doble_rampa` (7.69σ Alimentación vs Servido)
- Calibrado sobre 527 anotaciones (recalculado en vivo 2026-08-13, antes: 496 el 2026-08-10)
- Accuracy held-out validada: 80.0% (antes del fix normalizador: 58.4%)
- Ver [[11_ModelosIA/MODEL_EvidenceEngine]] para pesos y fórmula completa

---

## Optimizaciones aplicadas (2026-06-28)

| Función | Cambio | Impacto |
|---------|--------|---------|
| `_f08_lempel_ziv` | O(n²) → O(n log n) con set-based LZ78 | ~5-10× más rápido en señales largas |
| Integración en app | `@st.cache_data(max_entries=500)` | Evita recalcular en cada rerun |

---

## Cómo agregar una feature nueva

1. Elegir familia F00–F14 (o crear F15 si es nueva familia)
2. Implementar función `_fXX_nombre(señal: np.ndarray) -> float` con numpy/scipy
3. Agregar a la lista de llamadas en `extraer_features()`
4. Ejecutar `revisar_anotaciones_v2.py` para recalcular `comp_stats_v2.json`
5. Actualizar este doc + [[15_Resultados/RESULT_AlphaV2_Snapshots]]

---

## Ver también

- [[11_ModelosIA/MOC_ModelosIA]]
- [[14_Experimentos/EXP_AlphaV2_Pipeline]]
- [[15_Resultados/RESULT_AlphaV2_Snapshots]]
- [[23_Decisiones/ADR_003_MotorMatematico]]
