---
id: readme_matematica
title: Fundamentos Matemáticos — Motor v2
type: math
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - matematica
  - features
  - motor-matematico
  - scipy
  - numpy
related:
  - [[00_HOME]]
  - [[13_Features/README_ShapeFeatures]]
  - [[13_Features/ATLAS_Features_v2]]
  - [[11_ModelosIA/MOC_ModelosIA]]
  - [[11_ModelosIA/MODEL_EvidenceEngine]]
---

# Fundamentos Matemáticos — Motor v2

> Fórmulas y conceptos matemáticos que sustentan las 102 features de `shape_features_v2.py`.
> Ver [[13_Features/README_ShapeFeatures]] para la lista completa y [[13_Features/ATLAS_Features_v2]] para los valores numéricos.

---

## Señal de entrada

La señal procesada es una serie temporal de peso (gramos) muestreada a **30 segundos**. Longitud típica: 8–25 muestras por candidato.

```
x = [x₀, x₁, ..., xₙ₋₁]   donde xᵢ ∈ ℝ (gramos)
```

**Rangos esperados:** 80–200g (tazón vacío + comida). Sensibilidad HX711: ±1g.

---

## F00 — Estadísticas básicas

| Feature | Fórmula |
|---------|---------|
| `stat_mean` | `μ = Σxᵢ / n` |
| `stat_std` | `σ = √(Σ(xᵢ - μ)² / n)` |
| `stat_cv` | `CV = σ / μ` (coeficiente de variación) |
| `stat_skewness` | `E[(x-μ)³] / σ³` |
| `stat_kurtosis` | `E[(x-μ)⁴] / σ⁴ - 3` (excess kurtosis) |
| `stat_range` | `max(x) - min(x)` |
| `stat_median` | `percentile(x, 50)` |

---

## F01 / F02 — Derivadas

**Primera derivada:**
```
x'[i] = x[i+1] - x[i]    (diferencia finita forward)
```

**Segunda derivada:**
```
x''[i] = x'[i+1] - x'[i]
```

Usadas para detectar cambios bruscos (bajada de alimentación, subida de servido).

---

## F03 — Energía y potencia

| Feature | Fórmula |
|---------|---------|
| `energy_total` | `Σ xᵢ²` |
| `energy_rms` | `√(Σ xᵢ² / n)` |
| `energy_power` | `energy_total / n` |
| `energy_norm` | `energy_total / n²` |

---

## F04 — Geometría de la curva

| Feature | Fórmula |
|---------|---------|
| `geom_straightness` | `dist_euclidea(x₀, xₙ) / longitud_arco_total` |
| `geom_auc_norm` | `∫x dt / (n × max(x))` (área normalizada) |
| `geom_slope` | Pendiente regresión lineal OLS sobre (t, x) |
| `geom_convexity` | Signo medio de x'' |

**Straightness:** 1.0 = línea recta perfecta; <1.0 = curva con desvíos.

---

## F05 — Temporales

| Feature | Descripción |
|---------|-------------|
| `temp_time_to_min` | Índice del mínimo / n (posición relativa) |
| `temp_time_to_max` | Índice del máximo / n (posición relativa) |
| `temp_duration` | Duración total en segundos |
| `temp_rise_time` | Tiempo de subida (20% → 80% del rango) |
| `temp_fall_time` | Tiempo de bajada (80% → 20% del rango) |

---

## F06 — Entropía

**Shannon:**
```
H(x) = -Σ p(xᵢ) × log₂(p(xᵢ))
```
Donde p(xᵢ) se estima por histograma de 10 bins.

**Permutation entropy (Bandt-Pompe):**
```
H_perm = -Σ p(π) × ln(p(π))   (patrones ordinales de orden m=3)
```

Alta entropía → señal irregular → ruido.

---

## F07 — Frecuencial (FFT)

```
X[k] = Σ x[n] × e^(-j2πkn/N)
```

| Feature | Descripción |
|---------|-------------|
| `freq_dominant` | k del coeficiente FFT de mayor magnitud |
| `freq_power` | Potencia espectral total (Σ|X[k]|²) |
| `freq_centroid` | Centro de masa del espectro |

---

## F08 — Complejidad

**Lempel-Ziv (LZ78, O(n log n)):**  
Complejidad de descripción de la secuencia binarizada (x > mediana → 1, sino 0).

**Higuchi FD:** Dimensión fractal estimada por método Higuchi (k=1..5).

**DFA:** Detrended Fluctuation Analysis — escala α de autocorrelaciones.

---

## F09 — Autocorrelación

```
R[τ] = Σ (x[t] - μ)(x[t+τ] - μ) / (n × σ²)
```

Features: `acf_lag1`, `acf_lag2`, `acf_decay` (pendiente de R vs τ), `acf_oscilacion`.

---

## F10 — Percentiles

```
p10, p25, p50, p75, p90 = np.percentile(x, [10, 25, 50, 75, 90])
IQR = p75 - p25
```

---

## F12 — Templates canónicos

Correlación de Pearson entre la señal normalizada y una forma prototipo:

```
tpl_score = Pearson(normalize(x), normalize(template))
```

Prototipos calculados como media de señales anotadas de cada categoría:
- `template_alimentacion` → curva de bajada escalonada
- `template_servido` → curva de subida sigmoide
- `template_ruido` → señal irregular sin tendencia clara

**Los más discriminativos:** `tpl_doble_rampa` (7.69σ), `tpl_sigmoide` (6.26σ) — recalculado 2026-08-10 sobre 496 anotaciones.

---

## F14 — Evidence Engine

Ver [[11_ModelosIA/MODEL_EvidenceEngine]] para el detalle completo (reescrito 2026-08-10).

```
fᵢ_norm = (fᵢ − μ_pooled(fᵢ)) / σ_pooled(fᵢ)         ← normalización z-score, NUEVO
w_cat(fᵢ) = μ_cat_norm(fᵢ) − μ_resto_norm(fᵢ)        ← peso calculado desde los datos, NUEVO
score_cat = softmax(Σ w_cat(fᵢ) × fᵢ_norm)            para cat ∈ {alim, serv, ruido}
```

Antes los pesos `wᵢ` se elegían a mano y se aplicaban sobre `fᵢ` sin normalizar — con
527 anotaciones acertaba 58.4% (peor que adivinar la clase mayoritaria). Normalizando y
calculando los pesos desde `comp_stats_v2.json` (discriminante tipo Fisher, sobre las 102
features): 80.0% held-out (recalculado en vivo 2026-08-13, ver
[[11_ModelosIA/MODEL_EvidenceEngine]]).

---

## Normalización estándar

Antes de calcular templates y similitudes, las señales se normalizan:

```
x_norm[i] = (x[i] - min(x)) / (max(x) - min(x) + ε)   ε = 1e-8
```

---

## Ver también

- [[13_Features/README_ShapeFeatures]] — implementación y uso de extraer_features()
- [[13_Features/ATLAS_Features_v2]] — tabla completa de 102 features con sep A/S y sep A/R
- [[11_ModelosIA/MOC_ModelosIA]] — Evidence Engine y modelos futuros
- [[23_Decisiones/ADR_003_MotorMatematico]] — decisión de numpy/scipy vs sklearn
