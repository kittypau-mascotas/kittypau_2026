# Recopilación completa — Datos y textos de la app Alpha v2

**Proyecto:** Kittypau — KPCL0034 "Bandida" (food bowl)
**Generado:** 2026-06-28
**Propósito:** Referencia offline de todo el contenido numérico y textual de `app_anotacion_av2.py`
para perfeccionar las explicaciones de resultados.

---

## 1. Estado del dataset (2026-06-28)

| Artefacto | Estado |
|---|---|
| `readings.csv` | 8 024 filas KPCL0034 · 2026-04-08 → 2026-05-23 (estático, NUNCA tocar) |
| `readings_rows.csv` | 94 588 filas KPCL0034 · 2026-05-23 → 2026-06-27 |
| `candidatos_av2.csv` | 421 candidatos detectados · Abr 8 → Jun 27 |
| `anotaciones_av2.csv` | **421 anotaciones** · alim=209 / serv=45 / ruido=167 |
| `features_anotaciones_v2.csv` | 417 filas × 109 cols (4 anotaciones pendientes de regenerar) |
| `comp_stats_v2.json` | **102 features** · basado en 417 anotaciones (alim=205/serv=45/ruido=167) |

### Tipos de candidatos
| Tipo | Descripción | N (v2.1) |
|---|---|---|
| bajada | El peso baja durante el segmento (>60% del tiempo) | 248 |
| mixto | Sube y baja sin tendencia clara | 95 |
| subida | El peso sube durante el segmento (>60% del tiempo) | 78 |

---

## 2. Constantes de dominio1

```python
# Categorías de anotación
CATEGORIAS = {
    "alimentacion": ("🍽️ Alimentación", "#00b45a", "Bandida come — peso baja gradual, 2–10 min"),
    "servido":      ("🫙 Servido",       "#1e64ff", "Agregan comida — peso sube rápido, 20–90 s"),
    "ruido":        ("⚡ Ruido",         "#ef4444", "Movimiento o error del sensor — no es actividad real"),
}

# Metas de anotación Ciclo Alpha v2
METAS_AV2 = {"alimentacion": 40, "servido": 20, "ruido": 30}

# Resampleo de la señal
RESAMPLE_S = 30  # 30 segundos por muestra

# Zona horaria
TZ_STGO = ZoneInfo("America/Santiago")

# UUIDs de KPCL0034 "Bandida" (food bowl)
KPCL0034_UUIDS = {
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026 → readings.csv
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo-Jun 2026 → readings_rows.csv
}
```

### Umbrales del detector (`config/umbrales.json`)

Editables desde Tab 4 (Panel de Features). Controlan qué actividad se detecta como candidato:
- **rolling_std_min**: desviación estándar mínima en ventana rolling para considerar "actividad"
- **delta_g_min**: delta mínimo (g) en el segmento para no descartarlo como micro-movimiento
- **min_duration_s**: duración mínima del evento (s)
- **gap_fusion_s**: si dos eventos distan < 120 s, se fusionan en uno solo

---

## 3. Arquitectura y pipeline

```
readings.csv + readings_rows.csv (CSVs crudos)
         │
         ▼
01_genera_candidatos.py
  • Lee y resamplea a 30s (ffill limit=2)
  • Detecta actividad (rolling std + delta)
  • Fusiona segmentos cercanos (<120s gap)
  • Extrae 102 features por segmento (Motor v2)
  → candidatos_av2.csv  (421 filas)
         │
         ▼
[Anotar en Tab 1 de la app]
  → anotaciones_av2.csv (421 filas: alim/serv/ruido)
         │
         ▼
revisar_anotaciones_v2.py
  • Extrae 102 features por anotación confirmada
  • Calcula µ/σ/mediana/n por categoría
  → features_anotaciones_v2.csv  (417 filas × 109 cols)
  → comp_stats_v2.json           (102 features × 3 categorías × 4 stats)
```

### Caché de 3 capas
| Capa | Mecanismo | Latencia |
|---|---|---|
| RAM | `session_state["_df_lec"]` | 0 ms (reruns instantáneos) |
| Disco | `data/_cache_lecturas_30s.parquet` | ~300 ms |
| CSV raw | PyArrow + ThreadPoolExecutor(2) | ~5-10 s (solo 1ª vez) |

---

## 4. Navegación (9 tabs con lazy loading)

La app usa `st.radio(horizontal=True, key="tab_nav")` en lugar de `st.tabs()`.
**Solo el tab activo ejecuta su código** en cada rerun. Cada tab muestra
una barra de progreso real 0 → 100% durante la carga (carga en frío).

| Tab | Nombre | Progreso real |
|---|---|---|
| 0 | 🌐 Vista Global | No (instantáneo) |
| 1 | 🔍 Revisar Candidatos | Sí — 4 pasos |
| 2 | 📏 Analizar Curva | Sí — 3 pasos |
| 3 | 🔄 Comparar Curvas | Sí — 3 pasos |
| 4 | 📊 Panel de Features | Sí — 3 pasos |
| 5 | 🧮 Motor Matemático | Sí — 4 pasos |
| 6 | 📋 Anotaciones | No (solo lectura) |
| 7 | 🕐 Próxima Comida | Sí — 3 pasos |
| 8 | 🐱 Kittypau | Sí — 3 pasos |

---

## 5. Motor Matemático v2 — 15 familias de features

`shape_features_v2.py` — 102 features, sin ML. Solo geometría, estadística y teoría de información.

### F00 — Clásicas base (5 features)

Features heredadas del Motor v1. Base del sistema de clasificación.

| Feature | Fórmula | Rango | Significado |
|---|---|---|---|
| `monotonicity` | mean(sign(diff(y))) | −1 a 1 | Consistencia de dirección: −1 baja siempre, +1 sube siempre, 0 oscila |
| `r2_lineal` | 1 − SS_res/SS_tot | 0 a 1 | Bondad del ajuste lineal: 1=tendencia perfectamente lineal, 0=sin tendencia |
| `zcr` | count(sign_changes_dy)/n | 0 a 1 | Tasa de cambios de signo en la derivada: alto=oscilante, bajo=tendencia limpia |
| `sim_alimentacion` | cos(v_norm, ramp_down) | −1 a 1 | Similitud coseno con rampa descendente (template ideal de alimentación) |
| `sim_servido` | cos(v_norm, ramp_up) | −1 a 1 | Similitud coseno con rampa ascendente (template ideal de servido) |

**Notas:** `sim_alimentacion` y `sim_servido` son invariantes a escala y nivel.
La señal se normaliza: `v_delta = valores − valores[0]`, luego `/max(|v_delta|)`.
La similitud con la rampa descendente perfecta (alim) y ascendente (serv) captura
la dirección dominante sin importar el rango de gramos.

### F01 — Geometría diferencial — derivadas 1ª, 2ª, 3ª (25 features)

25 features sobre la velocidad (d1), aceleración (d2) y jerk (d3) de la señal.
Derivadas calculadas dividiendo por `resample_s = 30 s`.

| Familia | Features | Significado |
|---|---|---|
| d1_* | mean, std, max, min, energy, rms | Estadísticas de la velocidad (g/s) |
| d2_* | mean, std, max, min, energy, rms | Estadísticas de la aceleración (g/s²) |
| d3_* | mean, std, max, min, energy, rms | Estadísticas del jerk (g/s³) |
| `d1_n_sign_changes` | count(diff(sign(dy))≠0) | N° cambios de signo en velocidad — alto en ruido |
| `d2_n_sign_changes` | count(diff(sign(d2y))≠0) | N° cambios de signo en aceleración |
| `d1_frac_pos` | mean(dy>0) | Fracción del tiempo con peso subiendo — ~1 en servido |
| `d1_frac_neg` | mean(dy<0) | Fracción del tiempo con peso bajando — ~0.5 en alimentación (con pausas) |

### F02 — Curvatura κ (5 features)

Curvatura de la curva peso-tiempo usando derivadas numéricas (np.gradient).
Fórmula: `κ = |d²y/dx²| / (1 + (dy/dx)²)^(3/2)`

| Feature | Significado |
|---|---|
| `curvature_mean` | Curvatura promedio — alta en señales curvas o S-shaped |
| `curvature_max` | Curvatura máxima — identifica el punto de mayor curvatura |
| `curvature_min` | Curvatura mínima |
| `curvature_std` | Dispersión de curvatura — alta en señales con múltiples inflexiones |
| `curvature_integral` | Integral total de curvatura — ≈ variación angular total recorrida |

### F03 — Longitud de arco (4 features)

Longitud geométrica de la curva en el espacio (tiempo, peso).
Señal normalizada antes del cómputo.

| Feature | Significado |
|---|---|
| `arc_length` | Longitud total del arco — alta en señales muy activas |
| `arc_length_per_min` | Longitud por minuto — velocidad de movimiento del punto de la curva |
| `arc_per_n` | Longitud por muestra — densidad de movimiento |
| `arc_vs_displacement` | Ratio arco / desplazamiento neto — alto en oscilaciones, 1 en rampa perfecta |

### F04 — Tortuosidad (2 features)

Mide cuánto "serpentea" la señal respecto a una línea recta entre inicio y fin.

| Feature | Fórmula | Significado |
|---|---|---|
| `tortuosity` | arc_length / displacement_directo | ~1.0 en rampas limpias; alto en ruido/oscilaciones |
| `straightness` | 1 / tortuosity | ~1.0 = muy recto; ~0 = muy sinuoso |

### F05 — Energía (6 features)

Energía de la señal y sus derivadas. Útil para distinguir señales activas de tranquilas.

| Feature | Fórmula | Significado |
|---|---|---|
| `energy_signal` | Σ y² | Energía bruta — proporcional a masa al cuadrado |
| `energy_d1` | Σ (dy)² | Energía de la velocidad |
| `energy_d2` | Σ (d²y)² | Energía de la aceleración |
| `energy_ratio_d1_signal` | energy_d1 / energy_signal | Ratio — alto en señales muy dinámicas |
| `rms_signal` | √(mean(y²)) | RMS de la señal — nivel RMS del peso |
| `rms_d1` | √(mean(dy²)) | RMS de la velocidad — actividad media |

### F06 — Entropías (3 features)

Miden la complejidad y desorden de la señal.

| Feature | Fórmula | Significado |
|---|---|---|
| `entropy_shannon` | −Σ p_i·log₂(p_i) sobre histograma 20 bins | Entropía de amplitud: alta en alimentación (señal rica), baja en servido (rampa simple) |
| `entropy_sample` | SampEn: similitud de patrones de longitud m=2 en tolerancia r=0.2σ | Complejidad dinámica: alta en señales impredecibles |
| `entropy_permutation` | Entropía de Bandt-Pompe sobre permutaciones de orden 3 | Regularidad ordinal: alta en alimentación, baja en servido |

**Nota interpretativa:**
- `entropy_shannon` alta en alim (2.45±0.34) vs. baja en serv (1.11±0.24): la alimentación tiene
  una distribución de pesos más variada (Bandida come gradualmente en múltiples niveles).
- `entropy_permutation` alta en alim (0.75±0.13) vs. serv (0.08±0.21): el servido tiene
  un patrón ordinal muy predecible (solo sube), la alimentación es más compleja.

### F07 — Dimensión fractal (2 features)

Miden la autosimilaridad y complejidad geométrica de la señal.

| Feature | Método | Significado |
|---|---|---|
| `fractal_higuchi` | Higuchi FD (kmax=10) | Dimensión fractal: 1=señal simple/lineal, 2=señal muy compleja |
| `fractal_katz` | Katz FD = log₁₀(n) / (log₁₀(n) + log₁₀(d/L)) | Similar, más rápido — alto en señales complejas |

### F08 — Complejidad Lempel-Ziv (1 feature)

Mide la complejidad secuencial: cuántos patrones nuevos aparecen a medida que se "lee" la señal.

| Feature | Fórmula | Significado |
|---|---|---|
| `lempel_ziv` | LZ78 set-based O(n log n) normalizado por log₂(n) | Alto en ruido (muchos patrones distintos), bajo en rampas simples |

**Implementación:** LZ78 set-based O(n log n). Reemplazó búsqueda de substring O(n²) en junio 2026.
La señal se binariza en tres niveles (subida/plana/bajada) antes del cómputo.

### F09 — Análisis frecuencial FFT + autocorrelación (7 features)

| Feature | Significado |
|---|---|
| `freq_dominant_hz` | Frecuencia dominante en FFT (Hz) — periodicidad principal de la señal |
| `freq_centroid_hz` | Centroide espectral — "centro de masa" del espectro |
| `spectral_entropy` | Entropía del espectro normalizado — alta en señales de banda ancha |
| `power_ratio_low` | Potencia en frecuencias bajas / potencia total — alta en tendencias lentas |
| `autocorr_lag1` | Autocorrelación en lag 1 (30 s) — persistencia de corto plazo |
| `autocorr_lag3` | Autocorrelación en lag 3 (90 s) |
| `autocorr_lag5` | Autocorrelación en lag 5 (150 s) |

### F10 — Estadística robusta (7 features)

Estadísticas clásicas y robustas sobre los valores de peso en el segmento.

| Feature | Significado |
|---|---|
| `stat_median` | Mediana del peso (g) — robusto a outliers |
| `stat_iqr` | Rango intercuartil — dispersión robusta del peso |
| `stat_mad` | Desviación absoluta media — dispersión robusta |
| `stat_cv` | Coeficiente de variación = std/mean — variabilidad relativa |
| `stat_skewness` | Asimetría de la distribución de pesos |
| `stat_kurtosis` | Curtosis — colas de la distribución |
| `stat_trimmed_mean` | Media recortada (10%) — promedio sin extremos |

### F11 — Topología (picos, valles, plateaus) (8 features)

Detecta estructura topológica: cuántos picos, valles y mesetas tiene la señal.

| Feature | Significado |
|---|---|
| `n_maxima` | N° de máximos locales (picos de subida) |
| `n_minima` | N° de mínimos locales (picos de bajada) |
| `n_plateaus` | N° de mesetas (segmentos planos > 3 puntos) |
| `peak_height_max` | Peso máximo alcanzado en el segmento (g) |
| `peak_density` | N° picos / duración — alta en señales muy oscilantes |
| `peak_width_mean` | Ancho medio de los picos (en muestras de 30s) |
| `peak_prominence_mean` | Prominencia media de los picos (g) |
| `valley_depth_min` | Peso mínimo alcanzado (g) |
| `overshoot_g` | Subida máxima por encima del nivel inicial (g) |
| `undershoot_g` | Bajada máxima por debajo del nivel final (g) |

### F12 — Templates canónicos (12 features × similitud coseno)

12 templates de señal idealizados. Cada feature es la similitud coseno entre
la señal normalizada y el template correspondiente. Rango: −1 a +1.

| Feature | Template | Qué detecta |
|---|---|---|
| `tpl_ramp_down` | Rampa descendente lineal | Alimentación clásica — baja constante |
| `tpl_exp_decay` | Decaimiento exponencial | Alimentación con comienzo rápido y ralentización |
| `tpl_alim_lenta` | Bajada escalonada lenta con pausas | Bandida come despacio con descansos |
| `tpl_alim_escalonada` | Bajada en escalones | Múltiples "bocadillos" con pausas |
| `tpl_ramp_up` | Rampa ascendente lineal | Servido clásico — sube constante |
| `tpl_exp_rise` | Subida exponencial | Servido brusco con estabilización |
| `tpl_sigmoide` | Sigmoide (S ascendente) | Servido con arranque lento → aceleración → meseta |
| `tpl_serv_brusco` | Pulso ascendente rápido | Servido muy brusco (mano directa) |
| `tpl_plateau` | Señal plana (meseta) | Segmento sin actividad real |
| `tpl_triangular` | Triángulo (sube y baja) | Ruido puntual: peso vuelve al inicio |
| `tpl_parabola_down` | Parábola descendente (convexa) | Alimentación acelerada al inicio |
| `tpl_doble_rampa` | Doble rampa descendente (escalón + bajada) | Alimentación con pausa intermedia — **feature #1** |

**El template más discriminativo:** `tpl_doble_rampa` separa alimentación vs. servido en **7.32σ**.
Captura el patrón típico: Bandida come, hace pausa, sigue comiendo → dos pendientes negativas.

### F13 — Dinámica temporal (12 features)

Métricas de tiempo sobre la evolución del peso en el segmento.

| Feature | Unidad | Significado |
|---|---|---|
| `time_to_min_s` | s | Tiempo hasta el mínimo de peso — largo en alim (comen despacio) |
| `time_to_max_s` | s | Tiempo hasta el máximo de peso |
| `time_to_25pct_s` | s | Tiempo hasta alcanzar el 25% del delta total |
| `time_to_50pct_s` | s | Tiempo hasta alcanzar el 50% del delta total |
| `time_to_75pct_s` | s | Tiempo hasta alcanzar el 75% del delta total |
| `settling_time_s` | s | Tiempo hasta que la señal "se asienta" en ±5% del final |
| `rise_time_s` | s | Tiempo del 10% al 90% del delta (subida) |
| `fall_time_s` | s | Tiempo del 90% al 10% del delta (bajada) |
| `initial_slope_g_min` | g/min | Pendiente inicial (primeros 3 puntos) |
| `final_slope_g_min` | g/min | Pendiente final (últimos 3 puntos) |
| `d1_max` | g/s | Velocidad máxima de cambio |
| `d1_min` | g/s | Velocidad mínima (negativa = bajada más rápida) |

**Nota clave sobre `time_to_min_s`:**
- Alimentación: 364±107 s (~6 min). Bandida tarda ~6 minutos en llegar al punto más bajo.
- Servido: 6±23 s. El peso sube en segundos → `time_to_min_s` es ≈ 0 (no hay bajada).
- Ruido: 124±190 s. Muy variable — no hay patrón temporal definido.

### F14 — Features derivadas / índices compuestos (6 features)

Combinaciones de features primarias que amplificaban separación.

| Feature | Fórmula | Significado |
|---|---|---|
| `idx_linearity` | r2_lineal × straightness | Señal lineal y recta simultáneamente — alto en rampas limpias |
| `idx_shape_noise` | tortuosity × zcr | Sinuosidad × oscilación — alto en ruido |
| `idx_template_max` | max(sim_alim, sim_serv, tpl_plateau) | Mejor similitud a cualquier template simple |
| `idx_complexity` | entropy_sample × n_sign_changes | Complejidad combinada |
| `idx_arc_per_delta` | arc_length / |delta_w| | Camino recorrido por gramo de cambio real |
| `idx_energy_per_min` | energy_d1 / duracion_min | Energía cinética media por minuto |

---

## 6. Evidence Engine

### EVIDENCE_WEIGHTS — 23 features con pesos (w_alim, w_serv, w_ruido)

Calibrados empíricamente sobre ~304 anotaciones. Cada feature contribuye con
`w × valor` a cada hipótesis. Luego se aplica softmax para obtener probabilidades.

Prior inicial: ruido=0.5, alim=0.0, serv=0.0 (sesgo leve hacia "ruido" para candidatos ambiguos).

```python
EVIDENCE_WEIGHTS = {
    # F00 — Features clásicas
    "sim_alimentacion":     (+5.0, -5.0,  0.0),   # peso más fuerte de todos
    "sim_servido":          (-5.0, +5.0,  0.0),   # peso más fuerte de todos
    "monotonicity":         (-3.0,  0.0,  0.0),   # negativa=baja=alim
    "r2_lineal":            (+2.0, -0.5, -0.5),
    "zcr":                  (-1.0,  0.0, +1.0),
    # F12 — Templates
    "tpl_ramp_down":        (+3.0, -2.0,  0.0),
    "tpl_exp_decay":        (+2.0, -1.0,  0.0),
    "tpl_ramp_up":          (-2.0, +3.0,  0.0),
    "tpl_exp_rise":         (-1.0, +2.0,  0.0),
    "tpl_sigmoide":         (-0.5, +1.5,  0.0),
    "tpl_plateau":          (-1.0, -1.0, +2.0),
    # F04 — Tortuosidad
    "tortuosity":           (-1.5, -0.5, +2.0),
    "straightness":         (+1.5,  0.0, -1.5),
    # F07 — Fractal
    "fractal_higuchi":      (-1.5, -0.5, +2.0),
    "fractal_katz":         (-1.0, -0.5, +1.5),
    # F08 — Lempel-Ziv
    "lempel_ziv":           (-1.0, -0.5, +1.5),
    # F06 — Entropías
    "entropy_permutation":  (-1.5,  0.0, +1.5),
    "entropy_sample":       (-1.0,  0.0, +1.0),
    # F09 — Frecuencial
    "power_ratio_low":      (+1.0,  0.0, -1.0),
    "autocorr_lag1":        (+1.0,  0.0, -1.0),
    # F14 — Compuestos
    "idx_linearity":        (+2.0, -0.5, -0.5),
    "idx_template_max":     (+1.0, +1.0, -2.0),
    "idx_shape_noise":      (-1.5, -0.5, +2.0),
}
```

### Lectura de los pesos

| Signo | Significado |
|---|---|
| w_alim positivo, w_serv negativo | Feature alta → evidencia de alimentación |
| w_alim negativo, w_serv positivo | Feature alta → evidencia de servido |
| w_ruido positivo | Feature alta → evidencia de ruido |
| w = 0 | Feature no aporta evidencia a esa categoría |

### Fórmula completa del Evidence Engine

```
raw[alim] = 0.0 + Σ(w_alim_i × feat_i)
raw[serv] = 0.0 + Σ(w_serv_i × feat_i)
raw[ruido]= 0.5 + Σ(w_ruido_i × feat_i)   ← prior leve a ruido

# Softmax estabilizado:
vals -= vals.max()
probs = exp(vals) / sum(exp(vals))

prediccion = argmax(probs)
confianza  = max(probs)
```

El clasificador determinístico (`_clasificar_v2`) aplica reglas de umbral directas
sobre `sim_alimentacion`, `sim_servido`, `monotonicity` y `zcr` sin softmax.

---

## 7. Estadísticas de las 102 features — tabla completa

**Ordenadas por separación pooled-σ entre Alimentación y Servido (sep_AS).**

Fórmula: `sep_AS = |µ_A − µ_S| / √((σ_A² + σ_S²) / 2)`

`µ` = media, `σ` = desviación estándar, `n` = n de muestras
Fuente: `comp_stats_v2.json` generado sobre 417 anotaciones (alim=205, serv=45, ruido=167).

| # | Feature | µ_alim | σ_alim | nA | µ_serv | σ_serv | nS | µ_ruido | σ_ruido | nR | sep_AS | sep_AR |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | `tpl_doble_rampa` | +0.7441 | 0.3176 | 212 | −0.9370 | 0.0684 | 46 | +0.0376 | 0.5434 | 167 | **7.32σ** | 1.59σ |
| 2 | `tpl_sigmoide` | −0.7040 | 0.3887 | 212 | +0.9083 | 0.0656 | 46 | −0.0220 | 0.6175 | 167 | **5.78σ** | 1.32σ |
| 3 | `tpl_alim_escalonada` | +0.6861 | 0.3955 | 212 | −0.8969 | 0.0591 | 46 | +0.0096 | 0.6393 | 167 | **5.60σ** | 1.27σ |
| 4 | `tpl_ramp_up` | −0.6895 | 0.4001 | 212 | +0.8980 | 0.0576 | 46 | −0.0105 | 0.6412 | 167 | **5.55σ** | 1.27σ |
| 5 | `tpl_ramp_down` | +0.6895 | 0.4001 | 212 | −0.8980 | 0.0576 | 46 | +0.0105 | 0.6412 | 167 | **5.55σ** | 1.27σ |
| 6 | `sim_servido` | −0.6895 | 0.4001 | 212 | +0.8980 | 0.0576 | 46 | −0.0105 | 0.6412 | 167 | **5.55σ** | 1.27σ |
| 7 | `sim_alimentacion` | +0.6895 | 0.4001 | 212 | −0.8980 | 0.0576 | 46 | +0.0105 | 0.6412 | 167 | **5.55σ** | 1.27σ |
| 8 | `tpl_alim_lenta` | +0.6189 | 0.4350 | 212 | −0.8370 | 0.0775 | 46 | −0.0101 | 0.6802 | 167 | **4.66σ** | 1.10σ |
| 9 | `time_to_min_s` | +363.96 | 107.04 | 212 | +5.87 | 23.34 | 46 | +123.95 | 189.78 | 167 | **4.62σ** | 1.56σ |
| 10 | `entropy_shannon` | +2.4520 | 0.3428 | 212 | +1.1121 | 0.2442 | 46 | +1.0816 | 0.6445 | 167 | **4.50σ** | 2.65σ |
| 11 | `tpl_exp_rise` | −0.6047 | 0.4445 | 212 | +0.8133 | 0.0892 | 46 | +0.0101 | 0.6843 | 167 | **4.42σ** | 1.07σ |
| 12 | `tpl_exp_decay` | +0.6047 | 0.4445 | 212 | −0.8133 | 0.0892 | 46 | −0.0101 | 0.6843 | 167 | **4.42σ** | 1.07σ |
| 13 | `entropy_permutation` | +0.7502 | 0.1278 | 212 | +0.0829 | 0.2089 | 46 | +0.3070 | 0.1612 | 167 | **3.85σ** | 3.05σ |
| 14 | `tpl_serv_brusco` | −0.5270 | 0.4591 | 212 | +0.7242 | 0.0996 | 46 | +0.0243 | 0.6996 | 167 | **3.77σ** | 0.93σ |
| 15 | `straightness` | +0.9910 | 0.0066 | 212 | +0.8831 | 0.0421 | 46 | +0.9648 | 0.0664 | 167 | **3.58σ** | 0.56σ |
| 16 | `d1_frac_neg` | +0.3718 | 0.0824 | 212 | +0.0393 | 0.1030 | 46 | +0.0830 | 0.0570 | 167 | **3.56σ** | 4.08σ |
| 17 | `d1_n_sign_changes` | +8.8208 | 2.6956 | 212 | +1.8478 | 1.0534 | 46 | +5.7485 | 4.9634 | 167 | **3.41σ** | 0.77σ |
| 18 | `monotonicity` | −0.2042 | 0.1149 | 212 | +0.3221 | 0.1878 | 46 | −0.0051 | 0.0627 | 167 | **3.38σ** | 2.15σ |
| 19 | `stat_cv` | +0.0416 | 0.0164 | 212 | +0.2309 | 0.0795 | 46 | +0.0618 | 0.0756 | 167 | **3.30σ** | 0.37σ |
| 20 | `tortuosity` | +1.0091 | 0.0068 | 212 | +1.1349 | 0.0537 | 46 | +1.0422 | 0.0837 | 167 | **3.29σ** | 0.56σ |
| 21 | `settling_time_s` | +374.15 | 108.56 | 212 | +102.39 | 48.82 | 46 | +314.19 | 328.32 | 167 | **3.23σ** | 0.25σ |
| 22 | `d2_n_sign_changes` | +9.0330 | 2.9035 | 212 | +1.8043 | 1.4082 | 46 | +6.7844 | 6.1135 | 167 | **3.17σ** | 0.47σ |
| 23 | `undershoot_g` | +12.73 | 5.52 | 212 | +0.50 | 2.07 | 46 | +19.33 | 38.28 | 167 | **2.93σ** | 0.24σ |
| 24 | `spectral_entropy` | +1.7503 | 0.4068 | 212 | +0.5591 | 0.4188 | 46 | +2.7396 | 0.7134 | 167 | **2.89σ** | 1.70σ |
| 25 | `fractal_katz` | +0.7537 | 0.1042 | 212 | +0.9841 | 0.0479 | 46 | +0.8424 | 0.0890 | 167 | **2.84σ** | 0.92σ |
| 26 | `d1_max` | +0.2130 | 0.1271 | 212 | +1.8754 | 0.8294 | 46 | +0.8736 | 1.3427 | 167 | **2.80σ** | 0.69σ |
| 27 | `arc_length` | +402.36 | 113.27 | 212 | +161.21 | 64.48 | 46 | +758.77 | 340.84 | 167 | **2.62σ** | 1.40σ |
| 28 | `d2_max` | +0.0114 | 0.0054 | 212 | +0.0625 | 0.0278 | 46 | +0.0481 | 0.0817 | 167 | **2.55σ** | 0.63σ |
| 29 | `autocorr_lag3` | +0.2451 | 0.2675 | 212 | −0.6831 | 0.4454 | 46 | +0.0928 | 0.3144 | 167 | **2.53σ** | 0.52σ |
| 30 | `d1_std` | +0.1285 | 0.0481 | 212 | +0.8265 | 0.3981 | 46 | +0.2535 | 0.3592 | 167 | **2.46σ** | 0.49σ |
| 31 | `time_to_75pct_s` | +284.15 | 109.85 | 212 | +89.35 | 40.24 | 46 | +315.45 | 318.61 | 167 | **2.35σ** | 0.13σ |
| 32 | `d1_min` | −0.2844 | 0.1185 | 212 | −0.0355 | 0.0967 | 46 | −0.8774 | 1.3283 | 167 | **2.30σ** | 0.63σ |
| 33 | `rms_d1` | +0.1337 | 0.0468 | 212 | +1.0270 | 0.5545 | 46 | +0.2543 | 0.3591 | 167 | **2.27σ** | 0.47σ |
| 34 | `d1_rms` | +0.1337 | 0.0468 | 212 | +1.0270 | 0.5545 | 46 | +0.2543 | 0.3591 | 167 | **2.27σ** | 0.47σ |
| 35 | `d2_rms` | +0.0072 | 0.0029 | 212 | +0.0504 | 0.0279 | 46 | +0.0142 | 0.0208 | 167 | **2.18σ** | 0.47σ |
| 36 | `stat_iqr` | +7.6179 | 3.8263 | 212 | +46.59 | 25.03 | 46 | +4.5591 | 13.67 | 167 | **2.18σ** | 0.30σ |
| 37 | `d1_mean` | −0.0325 | 0.0137 | 212 | +0.5915 | 0.4137 | 46 | +0.0003 | 0.0174 | 167 | **2.13σ** | 2.09σ |
| 38 | `time_to_50pct_s` | +196.98 | 115.40 | 212 | +28.04 | 42.62 | 46 | +155.75 | 255.17 | 167 | **1.94σ** | 0.21σ |
| 39 | `zcr` | +0.6722 | 0.1217 | 212 | +0.4517 | 0.1109 | 46 | +0.2320 | 0.1174 | 167 | **1.89σ** | 3.68σ |
| 40 | `time_to_25pct_s` | +139.39 | 100.98 | 212 | +3.91 | 18.56 | 46 | +133.29 | 250.06 | 167 | **1.87σ** | 0.03σ |
| 41 | `energy_signal` | +266 740 | 131 459 | 212 | +86 313 | 61 325 | 46 | +414 553 | 290 059 | 167 | **1.76σ** | 0.66σ |
| 42 | `d1_frac_pos` | +0.1675 | 0.0906 | 212 | +0.3614 | 0.1283 | 46 | +0.0779 | 0.0569 | 167 | **1.75σ** | 1.18σ |
| 43 | `rise_time_s` | +257.83 | 121.15 | 212 | +98.48 | 48.85 | 46 | +232.63 | 292.56 | 167 | **1.73σ** | 0.11σ |
| 44 | `fall_time_s` | +257.83 | 121.15 | 212 | +98.48 | 48.85 | 46 | +232.63 | 292.56 | 167 | **1.73σ** | 0.11σ |
| 45 | `tpl_parabola_down` | +0.3156 | 0.4743 | 212 | −0.3339 | 0.2512 | 46 | −0.0392 | 0.6577 | 167 | **1.71σ** | 0.62σ |
| 46 | `curvature_mean` | +0.0017 | 0.0007 | 212 | +0.0081 | 0.0056 | 46 | +0.0016 | 0.0018 | 167 | **1.60σ** | 0.07σ |
| 47 | `idx_linearity` | +0.1407 | 0.1069 | 212 | +0.2547 | 0.1241 | 46 | +0.0157 | 0.0277 | 167 | **0.98σ** | 1.60σ |
| 48 | `energy_d1` | +0.2650 | 0.2085 | 212 | +4.3979 | 3.7184 | 46 | +5.3396 | 12.90 | 167 | **1.57σ** | 0.56σ |
| 49 | `d1_energy` | +0.2650 | 0.2085 | 212 | +4.3979 | 3.7184 | 46 | +5.3396 | 12.90 | 167 | **1.57σ** | 0.56σ |
| 50 | `tpl_triangular` | +0.2949 | 0.4682 | 212 | −0.2929 | 0.2499 | 46 | −0.0316 | 0.6302 | 167 | **1.57σ** | 0.59σ |
| 51 | `n_minima` | +0.9764 | 0.8840 | 212 | 0.0000 | 0.0000 | 46 | +0.4731 | 0.7430 | 167 | **1.56σ** | 0.62σ |
| 52 | `arc_length_per_min` | +60.59 | 0.41 | 212 | +82.07 | 19.94 | 46 | +62.54 | 5.03 | 167 | **1.52σ** | 0.55σ |
| 53 | `curvature_max` | +0.0044 | 0.0019 | 212 | +0.0214 | 0.0157 | 46 | +0.0143 | 0.0211 | 167 | **1.52σ** | 0.66σ |
| 54 | `d2_std` | +0.0072 | 0.0029 | 212 | +0.0347 | 0.0256 | 46 | +0.0142 | 0.0208 | 167 | **1.51σ** | 0.47σ |
| 55 | `curvature_std` | +0.0013 | 0.0005 | 212 | +0.0075 | 0.0058 | 46 | +0.0036 | 0.0052 | 167 | **1.51σ** | 0.62σ |
| 56 | `peak_density` | +0.1465 | 0.1261 | 212 | +0.0075 | 0.0359 | 46 | +0.0554 | 0.0692 | 167 | **1.50σ** | 0.90σ |
| 57 | `energy_d2` | +0.0007 | 0.0006 | 212 | +0.0076 | 0.0065 | 46 | +0.0163 | 0.0373 | 167 | **1.49σ** | 0.59σ |
| 58 | `d2_energy` | +0.0007 | 0.0006 | 212 | +0.0076 | 0.0065 | 46 | +0.0163 | 0.0373 | 167 | **1.49σ** | 0.59σ |
| 59 | `d3_rms` | +0.0004 | 0.0002 | 212 | +0.0022 | 0.0017 | 46 | +0.0009 | 0.0013 | 167 | **1.49σ** | 0.54σ |
| 60 | `n_maxima` | +1.0189 | 0.9131 | 212 | +0.0435 | 0.2062 | 46 | +0.6766 | 0.8662 | 167 | **1.47σ** | 0.38σ |
| 61 | `valley_depth_min` | +129.33 | 30.31 | 212 | +76.93 | 40.90 | 46 | +104.69 | 46.17 | 167 | **1.46σ** | 0.63σ |
| 62 | `energy_ratio_d1_signal` | ~0.000 | ~0.000 | 212 | ~0.0001 | ~0.0001 | 46 | ~0.000 | ~0.000 | 167 | **1.41σ** | 0.00σ |
| 63 | `idx_arc_per_delta` | +41.78 | 38.89 | 212 | +3.01 | 1.53 | 46 | +359.63 | 313.55 | 167 | **1.41σ** | 1.42σ |
| 64 | `d3_std` | +0.0004 | 0.0002 | 212 | +0.0020 | 0.0016 | 46 | +0.0009 | 0.0013 | 167 | **1.40σ** | 0.54σ |
| 65 | `entropy_sample` | +10.924 | 10.220 | 212 | +0.989 | 4.337 | 46 | +0.526 | 2.283 | 167 | **1.27σ** | 1.40σ |
| 66 | `d3_min` | −0.0008 | 0.0004 | 212 | −0.0028 | 0.0022 | 46 | −0.0027 | 0.0042 | 167 | **1.26σ** | 0.64σ |
| 67 | `fractal_higuchi` | +0.7519 | 0.2575 | 212 | +0.9881 | 0.0804 | 46 | +0.8271 | 0.4329 | 167 | **1.24σ** | 0.21σ |
| 68 | `d3_mean` | ~0.000 | ~0.000 | 212 | −0.0006 | 0.0007 | 46 | ~0.000 | ~0.000 | 167 | **1.21σ** | 0.00σ |
| 69 | `lempel_ziv` | +2.1581 | 0.1557 | 212 | +1.9162 | 0.2538 | 46 | +1.7579 | 0.2040 | 167 | **1.15σ** | 2.21σ |
| 70 | `overshoot_g` | +4.87 | 4.21 | 212 | +0.76 | 2.87 | 46 | +8.36 | 14.58 | 167 | **1.14σ** | 0.33σ |
| 71 | `idx_energy_per_min` | +0.0401 | 0.0294 | 212 | +2.7111 | 3.3928 | 46 | +0.3857 | 0.8881 | 167 | **1.11σ** | 0.55σ |
| 72 | `peak_prominence_mean` | +4.43 | 4.05 | 212 | +0.59 | 2.79 | 46 | +7.24 | 18.59 | 167 | **1.11σ** | 0.21σ |
| 73 | `idx_complexity` | +8.537 | 8.795 | 212 | +0.981 | 4.338 | 46 | +0.427 | 1.822 | 167 | **1.09σ** | 1.28σ |
| 74 | `peak_width_mean` | +0.705 | 0.712 | 212 | +0.092 | 0.455 | 46 | +0.835 | 1.661 | 167 | **1.03σ** | 0.10σ |
| 75 | `autocorr_lag1` | +0.5882 | 0.2377 | 212 | +0.3666 | 0.2301 | 46 | +0.3962 | 0.3523 | 167 | **0.95σ** | 0.64σ |
| 76 | `arc_per_n` | +28.02 | 0.64 | 212 | +31.79 | 5.77 | 46 | +29.80 | 2.65 | 167 | **0.92σ** | 0.92σ |
| 77 | `final_slope_g_min` | −3.95 | 4.68 | 212 | +36.74 | 63.76 | 46 | +0.09 | 0.76 | 167 | **0.90σ** | 1.20σ |
| 78 | `stat_median` | +134.61 | 30.00 | 212 | +108.46 | 30.15 | 46 | +123.33 | 31.63 | 167 | **0.87σ** | 0.37σ |
| 79 | `idx_template_max` | +0.8516 | 0.1589 | 212 | +0.9533 | 0.0532 | 46 | +0.6407 | 0.3288 | 167 | **0.86σ** | 0.82σ |
| 80 | `freq_dominant_hz` | +0.0031 | 0.0021 | 212 | +0.0052 | 0.0029 | 46 | +0.0033 | 0.0033 | 167 | **0.83σ** | 0.07σ |
| 81 | `stat_kurtosis` | −0.593 | 1.395 | 212 | −1.471 | 0.675 | 46 | +6.874 | 7.929 | 167 | **0.80σ** | 1.31σ |
| 82 | `stat_trimmed_mean` | +134.55 | 29.88 | 212 | +115.04 | 24.68 | 46 | +122.99 | 30.41 | 167 | **0.71σ** | 0.38σ |
| 83 | `d2_mean` | −0.0002 | 0.0003 | 212 | +0.0167 | 0.0345 | 46 | ~0.000 | ~0.000 | 167 | **0.69σ** | 0.89σ |
| 84 | `curvature_integral` | +0.655 | 0.324 | 212 | +0.991 | 0.615 | 46 | +1.187 | 1.507 | 167 | **0.68σ** | 0.49σ |
| 85 | `d3_max` | +0.0008 | 0.0004 | 212 | +0.0014 | 0.0012 | 46 | +0.0027 | 0.0042 | 167 | **0.67σ** | 0.64σ |
| 86 | `stat_skewness` | +0.009 | 0.605 | 212 | +0.354 | 0.566 | 46 | +0.370 | 2.781 | 167 | **0.59σ** | 0.18σ |
| 87 | `idx_shape_noise` | +1.627 | 0.576 | 212 | +1.892 | 0.290 | 46 | +1.442 | 0.742 | 167 | **0.58σ** | 0.28σ |
| 88 | `r2_lineal` | +0.6138 | 0.2635 | 212 | +0.7279 | 0.1108 | 46 | +0.2386 | 0.2129 | 167 | **0.56σ** | 1.57σ |
| 89 | `power_ratio_low` | +0.7771 | 0.1420 | 212 | +0.6673 | 0.3498 | 46 | +0.7226 | 0.1887 | 167 | **0.41σ** | 0.33σ |
| 90 | `rms_signal` | +134.69 | 29.87 | 212 | +125.34 | 22.79 | 46 | +123.29 | 30.41 | 167 | **0.35σ** | 0.38σ |
| 91 | `peak_height_max` | +141.96 | 30.31 | 212 | +125.63 | 67.77 | 46 | +133.28 | 33.70 | 167 | **0.31σ** | 0.27σ |
| 92 | `freq_centroid_hz` | +0.0053 | 0.0016 | 212 | +0.0060 | 0.0031 | 46 | +0.0059 | 0.0024 | 167 | **0.28σ** | 0.29σ |
| 93 | `d2_min` | −0.0145 | 0.0068 | 212 | −0.0265 | 0.0606 | 46 | −0.0365 | 0.0478 | 167 | **0.28σ** | 0.64σ |
| 94 | `time_to_max_s` | +82.50 | 75.09 | 212 | +95.87 | 35.56 | 46 | +127.37 | 223.28 | 167 | **0.23σ** | 0.27σ |
| 95 | `curvature_min` | ~0.000 | ~0.000 | 212 | ~0.000 | ~0.001 | 46 | ~0.000 | ~0.000 | 167 | **0.19σ** | 0.71σ |
| 96 | `n_plateaus` | +0.160 | 0.381 | 212 | +0.109 | 0.315 | 46 | +1.401 | 0.957 | 167 | **0.15σ** | 1.70σ |
| 97 | `arc_vs_displacement` | 1 995 057 | 29 047 886 | 212 | 3.01 | 1.53 | 46 | 107 948 901 | 268 176 165 | 167 | **0.10σ** | 0.56σ |
| 98 | `stat_mad` | +3.83 | 1.77 | 212 | +3.33 | 9.61 | 46 | +0.84 | 2.69 | 167 | **0.07σ** | 1.31σ |
| 99 | `initial_slope_g_min` | +0.67 | 3.24 | 212 | +0.96 | 6.49 | 46 | −0.54 | 10.54 | 167 | **0.06σ** | 0.16σ |
| 100 | `autocorr_lag5` | −0.101 | 0.301 | 212 | −0.099 | 0.286 | 46 | +0.035 | 0.233 | 167 | **0.01σ** | 0.50σ |
| 101 | `tpl_plateau` | 0.0000 | 0.0000 | 212 | 0.0000 | 0.0000 | 46 | 0.0000 | 0.0000 | 167 | **0.00σ** | 0.00σ |
| 102 | `d3_energy` | ~0.000 | ~0.000 | 212 | ~0.000 | ~0.000 | 46 | ~0.0001 | ~0.0001 | 167 | **0.00σ** | 1.41σ |

> **Nota sobre `tpl_plateau`:** todas las muestras dan 0.0 — el template de meseta perfecta no aparece
> en ningún segmento real. Considerar remover del motor en v2.3.

---

## 8. Observaciones clave sobre los resultados

### Por qué los templates F12 dominan el top 10

Los 9 primeros features discriminativos son todos templates canónicos (F12) más `time_to_min_s`.
**Razón:** la forma de la señal es el predictor más potente. Los templates capturan la
"silueta geométrica" directamente, sin derivadas ni entropías intermedias.

La alimentación de Bandida tiene una forma muy característica: **doble rampa descendente**.
Come durante 2-4 min, hace pausa (meseta breve), come otros 2-3 min. El template
`tpl_doble_rampa` captura exactamente eso.

El servido es uniformemente ascendente y rápido (ramp_up, sigmoide, exp_rise).
El discriminador alim/serv más fácil de interpretar: **¿el peso baja o sube?**

### Features con alta sep_AR (alimentación vs. ruido)

| Feature | sep_AR | Interpretación |
|---|---|---|
| `d1_frac_neg` | 4.08σ | Alim: 37% tiempo bajando; Ruido: 8% — el ruido no baja sostenido |
| `zcr` | 3.68σ | Alim: 0.67 cambios/sample; Ruido: 0.23 — el ruido oscila menos pero con mayor amplitud |
| `entropy_permutation` | 3.05σ | Alim: 0.75; Ruido: 0.31 — la alimentación tiene más riqueza ordinal |
| `entropy_shannon` | 2.65σ | Alim: 2.45; Ruido: 1.08 — distribución de pesos más variada en alim |
| `lempel_ziv` | 2.21σ | Alim: 2.16; Ruido: 1.76 — la alimentación tiene secuencias más complejas que el ruido |

### Hallazgos sobre el ruido

- Ruido tiene `n_plateaus` = 1.40 vs. alim=0.16 → los eventos de ruido suelen tener una meseta
  (vibración breve + vuelta al estado inicial).
- Ruido tiene `undershoot_g` = 19.33 g — mayor que alim (12.73 g). El sensor "rebota" más
  en los eventos de ruido, generando caídas momentáneas más profundas.
- `spectral_entropy` del ruido (2.74) > alim (1.75) → espectro más amplio, menos periódico.

---

## 9. Textos de cada sección de la app

### Tab 0 — 🌐 Vista Global

**Descripción del tab:** Panel de resumen de toda la actividad de KPCL0034 en el rango de fechas disponible.

**Indicador de avance de anotación:**
> "Se muestran barras de progreso hacia las metas del Ciclo Alpha v2: 40 alimentaciones, 20 servidos, 30 ruidos."
> Barra verde si supera meta, barra azul si está en curso.

**Gráfico principal:** Serie de tiempo completa del peso (g) con todos los candidatos marcados.
Colores: 🟢 alim `#00b45a` · 🔵 serv `#1e64ff` · 🔴 ruido `#ef4444` · ⬜ sin anotar `#64748b`

### Tab 1 — 🔍 Revisar Candidatos

**Caption del tab:**
> "Navega los candidatos detectados y asigna la categoría correcta. Usa los filtros para concentrarte
> en los más interesantes."

**Filtros disponibles:**
- Por categoría ya anotada (alim / serv / ruido / sin anotar)
- Por dirección (bajada / subida / mixto)
- Por rango de fecha
- Por delta de peso mínimo (g)

**Flujo de anotación:**
1. Seleccionar candidato con ← → o desde el selector
2. Ver gráfico con ventana de contexto ±30 min
3. Elegir categoría y presionar **Guardar**
4. La anotación se escribe en `anotaciones_av2.csv` y el caché se invalida

**Texto de ayuda sobre categorías:**
- 🍽️ **Alimentación**: Bandida come — el peso del bowl baja gradualmente entre 2 y 10 minutos.
  La señal desciende con uno o dos escalones y luego se estabiliza.
- 🫙 **Servido**: Agregan comida — el peso sube rápidamente en 20 a 90 segundos.
  La señal asciende de forma casi vertical o en sigmoide.
- ⚡ **Ruido**: Movimiento o error del sensor — no es actividad real con comida.
  El peso fluctúa brevemente y regresa al nivel inicial (o queda desplazado sin patrón).

### Tab 2 — 📏 Analizar Curva

**Propósito:** Análisis detallado de una sola curva. Permite ver el shape completo con
las 7 métricas de control calculadas en tiempo real.

**7 métricas mostradas:**
| Métrica | Fórmula | Texto en app |
|---|---|---|
| Δ peso | `valores[-1] − valores[0]` | Cambio total de peso (g). Negativo=bajada, positivo=subida |
| Duración | `(t_fin − t_ini).seconds / 60` | Duración del segmento en minutos |
| Monotonía | `mean(sign(diff(y)))` | −1=baja siempre, +1=sube siempre, 0=oscila. Indicador F00 |
| R² lineal | `1 − SS_res/SS_tot` | Qué tan lineal es la tendencia. 1=rampa perfecta, 0=sin tendencia |
| ZCR dy | `Σ sign_changes / n` | Cambios de dirección por muestra. Alto=oscilante=posible ruido |
| Velocidad máx. bajada | `min(dy) × 60 / resample_s` | Tasa máxima de descenso (g/min). Alto en servido brusco |
| Velocidad máx. subida | `max(dy) × 60 / resample_s` | Tasa máxima de ascenso (g/min) |

### Tab 3 — 🔄 Comparar Curvas

**Propósito:** "Spaghetti plot" — superpone varias curvas del mismo tipo para ver si
tienen forma similar o si hay outliers dentro de una categoría.

**Texto de la app:**
> "Selecciona hasta 20 curvas para comparar su forma. Las curvas se normalizan al rango [0, 1]
> para facilitar la comparación visual de shape."

**Uso típico:** Comparar las 45 alimentaciones para ver si todas tienen "doble rampa"
o si algunas son outliers (servido mal anotado, evento parcial, etc.)

### Tab 4 — 📊 Panel de Features

**Propósito:** Comparar los features de un candidato vs. las distribuciones empíricas
de cada categoría. Muestra dónde cae cada feature en la distribución alim/serv/ruido.

**Texto de la app:**
> "Los puntos muestran el valor del candidato seleccionado. Las cajas muestran el
> rango µ ± σ de cada categoría. Verde=cerca de la media, rojo=lejos."

**También incluye:** El detector de umbrales editable (`config/umbrales.json`) para
ajustar qué se detecta como candidato en `01_genera_candidatos.py`.

### Tab 5 — 🧮 Motor Matemático

**Caption:**
> "~105 features matemáticas organizadas en 14 familias. Sin ML — geometría diferencial,
> entropías, análisis frecuencial, templates y más. Basado en `shape_features_v2.py`."

**Secciones internas:**

#### Sección 5.1 — Evidence Engine
Muestra 4 métricas principales:
- **Predicción** (categoría ganadora con tooltip de top-3 features influyentes)
- **Score Alimentación** (probabilidad softmax, %)
- **Score Servido** (probabilidad softmax, %)
- **Score Ruido** (probabilidad softmax, %)

Bajo las métricas aparece un gráfico de barras con los 3 scores.

**Texto de caption del clasificador:**
> "🔎 **Clasificador determinístico v1.2:** [resultado]  |  🧠 **Evidence Engine:** [resultado] (confianza X%)"

El clasificador determinístico usa reglas de umbral directas; el Evidence Engine usa
pesos calibrados + softmax. Los dos modelos pueden diferir — cuando difieren, el
Evidence Engine tiende a ser más confiable en casos borderline.

#### Sección 5.2 — Resumen textual del vector de features

Bloque de texto preformateado generado por `resumen_features()`:
Muestra los valores de las features clave de F00 y F12 con su interpretación
(positivo/negativo/cercano a cero).

#### Sección 5.3 — Vector de features completo (tablas por familia)

15 expanders, uno por familia. Cada uno muestra:
- Feature | Valor actual | Unidad | Rango típico | Fórmula | Significado

F00 aparece expandido por defecto; el resto colapsados.

#### Sección 5.4 — Cuadro comparativo × categoría

**Caption:**
> "Compara el valor del candidato seleccionado con los promedios empíricos por categoría
> derivados de las **[N] anotaciones** del Ciclo Alpha v2.
> **Verde** = el candidato está cerca de la media de esa categoría.
> **Separación σ** = distancia entre medias en unidades de desviación estándar (alto = feature discriminativa)."

Columnas: Feature | Valor actual | µ_alim | µ_serv | µ_ruido | sep_AS | sep_AR

Features marcadas con 🟢 cuando el candidato está dentro de µ ± σ de una categoría.

**Radar chart — Features clave:**
El radar usa 8 features seleccionadas por su separación pooled-σ:
- `sim_alimentacion`, `sim_servido` (F00)
- `monotonicity` (F00)
- `straightness` (F04)
- `entropy_permutation` (F06)
- `tpl_ramp_down`, `tpl_ramp_up` (F12)
- `fractal_katz` (F07)

El radar superpone el candidato actual (blanco) vs. los centroides de cada categoría (colores).

### Tab 6 — 📋 Anotaciones

**Propósito:** Vista tabular de todas las anotaciones guardadas. Solo lectura (no edita).

**Columnas mostradas:**
`id_anotacion | id_candidato | t_inicio (STGO) | t_fin (STGO) | categoria | notas | origen | created_at`

**Filtros:**
- Por categoría (alim/serv/ruido/todas)
- Por origen (manual/auto/todas)
- Por rango de fecha

**Contadores en el header:**
> "🍽️ Alimentación: 209 | 🫙 Servido: 45 | ⚡ Ruido: 167 | Total: 421"

### Tab 7 — 🕐 Próxima Comida

**Propósito:** Predecir cuándo será la próxima alimentación de Bandida basado en patrones históricos.

**8 bloques de análisis:**

#### Bloque 7.1 — Estadísticas de intervalos
**Texto de header:** "📊 Intervalos entre comidas"

Calcula: para cada par consecutivo de alimentaciones, el intervalo de tiempo en horas.

Métricas mostradas:
| Métrica | Texto en app |
|---|---|
| Intervalo medio | "Tiempo promedio entre comidas (h)" |
| Mediana | "La mitad de los intervalos cae por debajo de este valor" |
| Mínimo / Máximo | "Rango de intervalos observados" |
| Desviación estándar | "Variabilidad del intervalo entre comidas" |

#### Bloque 7.2 — Modelo circadiano

**Texto header:** "🕑 Patrón horario (circadiano)"

Agrupa todas las alimentaciones por hora del día (0–23 h, hora STGO).
Construye histograma de frecuencia horaria y muestra las horas pico.

**Caption:**
> "Las horas de mayor frecuencia de alimentación se muestran con barra más alta.
> La línea roja indica la hora actual."

Horas pico típicas de Bandida (empíricas): ~07:00, ~13:00, ~19:00 (comidas principales)
+ ~02:00 madrugada (snack nocturno ocasional).

#### Bloque 7.3 — Predicción puntual (4 métodos)

**Texto header:** "🎯 Predicción de próxima comida"

4 métodos de predicción, mostrados como métricas:

| Método | Fórmula | Texto en app |
|---|---|---|
| Media | `t_última_alim + mean(intervalos)` | "Predicción simple: última comida + intervalo promedio" |
| Mediana | `t_última_alim + median(intervalos)` | "Más robusto a outliers" |
| Circadiano | Próximo pico horario después de `now` | "Basado en el patrón horario histórico" |
| EWM | Media exponencialmente ponderada (α=0.3) de intervalos | "Más peso a intervalos recientes" |

**Texto de ayuda:**
> "Los 4 métodos tienen distintas suposiciones. El método circadiano suele ser el más
> intuitivo para Bandida — sus comidas tienen un patrón horario bastante regular."

#### Bloque 7.4 — Correlación Δpeso vs. intervalo siguiente

**Texto header:** "📉 Δ peso vs. intervalo siguiente"

Scatter plot: eje X = gramos consumidos en cada alimentación (|Δpeso|),
eje Y = tiempo hasta la siguiente alimentación (h).

**Caption:**
> "Si Bandida come más (Δpeso mayor), ¿espera más antes de la siguiente comida?
> La correlación de Pearson se muestra en el título del gráfico."

**Resultado empírico:** correlación débil (r ≈ −0.1 a −0.2) — sugiere que la cantidad
consumida no predice fuertemente el próximo intervalo.

#### Bloque 7.5 — Estado actual del sensor

**Texto header:** "🟢/🔴/⚫ Estado del sensor"

Tres indicadores:
- **🟢 Activo:** última lectura < 5 min atrás
- **🔴 Sin datos recientes:** última lectura entre 5 y 60 min
- **⚫ Offline:** última lectura > 60 min atrás

**Caption:**
> "El sensor KPCL0034 envía datos cada ~30 segundos. Si el último dato tiene más
> de 5 minutos, puede indicar problema de conectividad o batería baja."

#### Bloque 7.6 — Patrón semanal

**Texto header:** "📅 Patrón semanal"

Heatmap: filas = día de la semana (Lun–Dom), columnas = hora del día (0–23h).
Color = frecuencia de alimentaciones en esa celda.

**Caption:**
> "¿Come más los fines de semana? ¿Hay diferencia entre días de semana y fin de semana?
> (Puede reflejar cambios en rutina del dueño.)"

#### Bloque 7.7 — Predicción de las próximas 3 comidas

**Texto header:** "🔮 Próximas 3 comidas estimadas"

Usando el método circadiano (picos horarios históricos), proyecta las siguientes
3 horas pico después del momento actual.

Muestra 3 cards con:
- Hora estimada (hh:mm STGO)
- "en X horas Y minutos"
- Confianza basada en frecuencia histórica de ese horario

#### Bloque 7.8 — Sistema de error y calibración

**Texto header:** "📐 Error de predicción histórico"

Para cada predicción pasada (back-testing), calcula el error absoluto en minutos.

Métricas:
| Métrica | Texto |
|---|---|
| MAE | "Error medio absoluto de las predicciones (min)" |
| RMSE | "Error cuadrático medio (min)" |
| % dentro de ±30 min | "Porcentaje de predicciones con error < 30 minutos" |

### Tab 8 — 🐱 Kittypau

**Propósito:** Dashboard de salud y comportamiento de Bandida.
Dividido en dos paneles: **Sims** (estado de vida) y **Jedi** (análisis técnico).

---

#### Panel Sims — 10 indicadores de estilo de vida

Inspirado en el juego Los Sims. Cada indicador tiene barra de progreso,
valor numérico, color dinámico y tooltip explicativo.

| # | Indicador | Fórmula/Criterio | Color | Tooltip / Descripción |
|---|---|---|---|---|
| 1 | 🍽️ **Hambre** | `100 - (h_desde_última_alim / umbral_h × 100)` | 🟢→🟡→🔴 | "Tiempo desde la última alimentación. Verde=comió hace poco, rojo=lleva mucho tiempo sin comer." |
| 2 | 🏃 **Actividad** | N° alimentaciones en últimas 24h vs. media histórica | 🟢→🔴 | "Nivel de actividad alimentaria reciente vs. el patrón habitual de Bandida." |
| 3 | ⚖️ **Peso bowl** | Peso actual vs. peso de referencia (bowl vacío) | 🟣→🟢→🔴 | "Cuánta comida queda en el bowl. Calculado como peso_actual − peso_bowl_vacío." |
| 4 | 📅 **Regularidad** | Coeficiente de variación de intervalos recientes (7d) vs. histórico | 🟢→🔴 | "Qué tan regular es el horario de comidas en los últimos 7 días. Bajo CV = rutina estable." |
| 5 | 🌙 **Sueño nocturno** | % de comidas nocturnas (00:00–06:00) en últimas 2 semanas | Neutro→🟡 | "Frecuencia de comidas de madrugada. Alto = Bandida está más activa de noche de lo normal." |
| 6 | 💧 **Hidratación** *(placeholder)* | No implementado — siempre 100% | ⚪ | "Sin sensor de agua disponible en Ciclo Alpha." |
| 7 | 🎯 **Meta diaria** | N° alimentaciones hoy vs. media diaria histórica | 🟢→🟡→🔴 | "¿Ha alcanzado Bandida su cuota habitual de comidas por día?" |
| 8 | 📊 **Consistencia** | Correlación entre horario hoy vs. patrón histórico del mismo día de semana | 🟢→🔴 | "¿El horario de hoy coincide con el patrón habitual de este día?" |
| 9 | ⚡ **Energía** | Velocidad promedio de consumo (g/min) en últimas 24h vs. media | 🟢→🔴 | "Qué tan rápido come. Bajo = come despacio o en pequeñas cantidades." |
| 10 | 🧠 **Mood** | Compuesto de Hambre + Actividad + Regularidad | 😸→😐→😿 | "Estado de ánimo estimado. Emoji cambia según el bienestar general calculado." |

#### Fórmulas de los indicadores Sims

```python
# Hambre (0-100, 100=sin hambre):
h_desde = (now - t_ultima_alim).total_seconds() / 3600
hambre = max(0, 100 - (h_desde / UMBRAL_HAMBRE_H) * 100)

# Actividad (0-100):
n_alim_24h = count(alimentaciones en últimas 24h)
actividad = min(100, (n_alim_24h / media_diaria_historica) * 100)

# Regularidad (0-100, 100=muy regular):
cv_reciente = std(intervalos_7d) / mean(intervalos_7d)
regularidad = max(0, 100 - cv_reciente * 100)

# Mood compuesto:
mood_score = (hambre * 0.4 + actividad * 0.3 + regularidad * 0.3)
emoji = "😸" if mood_score >= 70 else "😐" if mood_score >= 40 else "😿"
```

---

#### Panel Jedi — 8 indicadores técnicos de comportamiento

Panel para el analista. Muestra métricas cuantitativas con colores de semáforo
basados en umbrales calibrados en el dataset histórico.

| # | Indicador | Fórmula | Estados posibles |
|---|---|---|---|
| A | **Intervalo medio (h)** | `mean(últimos 10 intervalos)` | 🟢 < 8h / 🟡 8-12h / 🔴 > 12h |
| B | **CV intervalos** | `std/mean de últimos 10 intervalos` | 🟢 < 0.3 / 🟡 0.3-0.6 / 🔴 > 0.6 |
| C | **Δpeso medio (g)** | `mean(|Δpeso| de últimas 10 alim)` | 🟢 > 5g / 🟡 2-5g / 🔴 < 2g |
| D | **Fracción bajada** | `mean(d1_frac_neg) de últimas 10 alim` | 🟢 > 0.25 / 🟡 0.15-0.25 / 🔴 < 0.15 |
| E | **Score alim medio** | `mean(score_alimentacion) del Evidence Engine en últimas 10` | 🟢 > 0.7 / 🟡 0.5-0.7 / 🔴 < 0.5 |
| F | **Tpl_doble_rampa** | `mean(tpl_doble_rampa) de últimas 10 alim` | 🟢 > 0.5 / 🟡 0.2-0.5 / 🔴 < 0.2 |
| G | **Consistencia circadiana** | Correlación del horario reciente (7d) vs. patrón circadiano histórico | 🟢 > 0.6 / 🟡 0.3-0.6 / 🔴 < 0.3 |
| H | **Anomalías** | N° candidatos marcados como ruido en últimas 24h | 🟢 ≤ 2 / 🟡 3-5 / 🔴 > 5 |

#### Textos descriptivos de los indicadores Jedi

**A — Intervalo medio:**
> "Tiempo promedio entre comidas consecutivas en las últimas 10 alimentaciones.
> Normal para Bandida: 5–8 horas. Por encima de 10h puede indicar que no tuvo apetito
> o que la comida se acabó antes."

**B — CV de intervalos:**
> "Coeficiente de variación: qué tan irregular es el horario.
> CV < 0.3 = rutina muy regular (cada 6h ± poco). CV > 0.6 = horarios muy erráticos —
> puede indicar cambios en la rutina del dueño o episodio de enfermedad."

**C — Δ peso medio:**
> "Gramos promedio consumidos por alimentación.
> Bandida pesa entre 130–160g con comida. Una alimentación típica consume 8–15g.
> Valores por debajo de 3g pueden ser micro-visitas o eventos de ruido mal anotados."

**D — Fracción de tiempo bajando:**
> "En una alimentación real, el peso del bowl baja durante la mayoría del evento.
> `d1_frac_neg` > 0.25 confirma actividad sostenida de consumo.
> Bajo en servido (solo sube) y en ruido (vaivén sin dirección dominante)."

**E — Score de alimentación (Evidence Engine):**
> "Probabilidad promedio que el Evidence Engine asigna a 'alimentación'.
> Si este score baja, puede indicar que las últimas anotaciones son ambiguas
> o que el motor necesita re-calibración con nuevas anotaciones."

**F — Template doble rampa:**
> "Similitud promedio con el template `tpl_doble_rampa` (feature #1 en discriminación).
> Valor > 0.5 confirma que las alimentaciones tienen el shape característico de Bandida.
> Si baja, puede indicar cambio en el comportamiento de comer (enfermedad, nueva comida)."

**G — Consistencia circadiana:**
> "¿Bandida está comiendo a sus horas habituales?
> Se compara el histograma horario de los últimos 7 días con el histograma histórico completo.
> Correlación alta (>0.6) = horario estable. Baja (<0.3) = cambio de patrón reciente."

**H — Anomalías recientes:**
> "N° de eventos detectados como ⚡ Ruido en las últimas 24 horas.
> Alto puede indicar: sensor moviéndose, objeto cayendo al bowl, Bandida jugando con el bowl,
> o interferencia eléctrica. Más de 5 en un día amerita revisar el hardware."

#### Alertas del panel Kittypau

La app muestra un banner de alerta (🚨) cuando se cumplen alguna de estas condiciones:
- **No comió en > 12h:** `h_desde_última_alim > 12`
- **CV de intervalos muy alto:** `CV > 0.8` en últimas 72h
- **Muchos eventos de ruido:** `n_ruido_24h > 7`
- **Sensor offline:** última lectura > 60 min

---

## 10. Textos del cuadro comparativo (Tab 5)

### Cómo leer el cuadro comparativo

**Texto completo de la app:**

> **Verde** = el candidato está cerca de la media de esa categoría (dentro de µ ± 1σ).
>
> **Separación σ** = distancia entre las medias de Alimentación y Servido, en unidades de
> desviación estándar pooled: `sep_AS = |µ_A − µ_S| / √((σ_A² + σ_S²) / 2)`
>
> Una separación alta (>3σ) significa que esa feature es muy discriminativa entre las dos categorías.
> Una separación baja (<1σ) significa que las categorías se solapan mucho para esa feature.
>
> Las estadísticas provienen de **[N] anotaciones** del Ciclo Alpha v2 y se actualizan
> automáticamente al presionar **🔄 Actualizar Todo**.

### Cómo leer el radar chart

> El radar compara 8 features clave del candidato seleccionado (blanco) contra los centroides
> de cada categoría (verde=alim, azul=serv, rojo=ruido).
>
> Si el punto blanco cae cerca del centroide verde → el candidato se parece más a una alimentación.
> Si cae a igual distancia de dos centroides → caso ambiguo; revisar manualmente.
>
> Las 8 features del radar fueron seleccionadas por tener la mayor separación pooled-σ entre
> categorías Y por ser interpretables (sim_alimentacion, sim_servido, monotonicity, straightness,
> entropy_permutation, tpl_ramp_down, tpl_ramp_up, fractal_katz).

---

## 11. Explicaciones de clasificación por categoría (para refinar)

### Patrones típicos de alimentación (alim)

Texto actual en la app (Tab 1, tooltip de la categoría):
> "Bandida come — el peso del bowl baja gradualmente entre 2 y 10 minutos.
> La señal desciende con uno o dos escalones y luego se estabiliza."

**Datos que respaldan esto:**
- Duración media: ~6 min (`time_to_min_s` = 364 s ≈ 6 min)
- Δpeso medio: −10 a −20 g (estimado de `undershoot_g` = 12.7 g)
- `tpl_doble_rampa` = +0.74 → forma de doble rampa muy presente
- `monotonicity` = −0.20 → baja el 60% del tiempo (no constantemente, hay pausas)
- `entropy_permutation` = 0.75 → secuencia ordinal muy variada (come, pausa, sigue)

**Propuesta de texto mejorado:**
> "Bandida come — el peso del bowl baja entre 5 y 10 gramos a lo largo de 4–8 minutos.
> El patrón típico es una doble rampa: come ~2 min, hace una pausa, come otros ~2 min.
> La señal baja el ~37% del tiempo y oscila ligeramente el resto (pausas breves).
> La entropía de permutación alta (0.75) confirma que el patrón de comida es complejo y rico,
> no una simple bajada continua."

---

### Patrones típicos de servido (serv)

Texto actual:
> "Agregan comida — el peso sube rápidamente en 20 a 90 segundos."

**Datos que respaldan esto:**
- `time_to_min_s` = 5.9 s → casi instantáneamente empieza a subir (no hay bajada)
- `monotonicity` = +0.32 → sube el 66% del tiempo
- `tpl_sigmoide` = +0.91 → forma sigmoide muy marcada (arranque lento, aceleración, meseta)
- `stat_cv` = 0.23 → alta variabilidad de peso (peso sube y varía)
- `d1_max` = 1.88 g/s → velocidad de subida alta

**Propuesta de texto mejorado:**
> "Alguien agrega comida al bowl — el peso sube típicamente 20–80 g en 30–60 segundos.
> La señal asciende con forma de sigmoide (arranque lento, luego aceleración, luego meseta).
> La velocidad de subida máxima es ~1.9 g/s — unas 5× más rápida que la bajada en alimentación.
> El tiempo hasta el mínimo (6 s) confirma que nunca hay bajada real: todo es ascenso."

---

### Patrones típicos de ruido (ruido)

Texto actual:
> "Movimiento o error del sensor — no es actividad real con comida."

**Datos que respaldan esto:**
- `n_plateaus` = 1.40 → suele haber una meseta (vibración breve + vuelta al estado inicial)
- `undershoot_g` = 19.3 g → caídas momentáneas más profundas que en alimentación (rebote)
- `spectral_entropy` = 2.74 → espectro muy amplio, señal "de todo un poco"
- `zcr` = 0.23 → pocas oscilaciones/muestra, pero con amplitud alta (no muchos cambios de dirección)
- `d1_frac_neg` = 8% → casi no baja sostenidamente (raro en ruido)

**Propuesta de texto mejorado:**
> "Movimiento del sensor o del bowl sin que Bandida coma.
> Causas comunes: bowl empujado, vibración del suelo, Bandida olfatea sin comer, sensor moviéndose.
> El patrón típico: el peso cae o sube bruscamente y luego regresa al nivel inicial en <1 min.
> La señal tiene alta entropía espectral (2.74) — 'todo un poco' pero sin tendencia clara.
> La caída momentánea puede ser más profunda que una alimentación real (undershoot = 19.3 g),
> pero dura muy poco y no se sostiene."

---

## 12bis. Actualización 2026-08-10 — el problema real no eran los pesos, era la escala

Las recomendaciones de la §12 (agregar `tpl_doble_rampa`, `entropy_shannon`, etc. a mano)
nunca se aplicaron, y aunque se hubieran aplicado tal cual no habrían arreglado el
problema real: **`evidence_score()` sumaba `peso × valor crudo` sin normalizar**. Con 496
anotaciones (el doble que en junio), medido directamente:

- Motor con `EVIDENCE_WEIGHTS` (26 features, pesos a mano, sin normalizar): **49.6%**
  accuracy — peor que predecir siempre "alimentación" (51.2%, clase mayoritaria).
- Causa: los features viven en escalas muy distintas — la mayoría en `[-1, 1]`, pero
  `entropy_sample` llega a 22.7. Con pesos `±1` a `±5` elegidos asumiendo escala uniforme,
  el feature de mayor magnitud cruda domina la suma sin importar el peso que se le asigne.
  `entropy_sample` además tenía el signo invertido: media alta en alimentación (9.57), no
  en ruido — el peso `(-1.0, 0.0, +1.0)` premiaba ruido cuando debía premiar alimentación.

**Fix aplicado:** `evidence_score(feats, comp_stats)` ahora normaliza cada feature
(z-score pooled contra `comp_stats_v2.json`) y calcula los pesos directamente de los
datos — discriminante tipo Fisher, sobre las 102 features (no solo las 26 elegidas a
mano). Ver `compute_data_driven_weights()` y `_normalize_feats()` en
`shape_features_v2.py`.

| Versión | Accuracy (held-out 20%, pesos fitteados solo con el 80%) |
|---|---|
| Motor legado (`EVIDENCE_WEIGHTS`, sin normalizar) | 51.5% |
| Motor normalizado + pesos calculados desde los datos | **78.8%** |

`EVIDENCE_WEIGHTS` queda como fallback legado (sin `comp_stats`, ej. cold start sin
`comp_stats_v2.json` generado aún) — se le agregaron `tpl_doble_rampa`, `d1_frac_neg`,
`entropy_shannon` y se removió `tpl_plateau` (constante 0.0), pero ya no es el camino
principal de clasificación.

**Tab 1 (Revisar Candidatos)** ahora muestra la sugerencia del motor normalizado como
categoría pre-seleccionada, con badge de confianza 🟢≥70% / 🟡50-70% / 🔴<50% — antes no
existía ninguna sugerencia automática, el operador anotaba a ciegas pese a que las
features ya estaban calculadas por `01_genera_candidatos.py`.

Test de regresión: `tests/test_evidence_engine.py` (accuracy held-out, no-NaN, motor
normalizado > legado).

---

## 12. Referencia rápida para calibración del Evidence Engine (histórico — pre 12bis)

### Features con mayor impacto por categoría

**Para reforzar predicción de ALIMENTACIÓN:**
- Subir `w_alim` de `sim_alimentacion` (actualmente +5.0 — ya máximo)
- Considerar agregar `tpl_doble_rampa` al Evidence Engine (+3.0, −3.0, 0.0) — candidato evidente
- Considerar agregar `entropy_shannon` (+1.5, −1.5, 0.0) — sep A/S = 4.50σ, no está en EVIDENCE_WEIGHTS
- Considerar agregar `time_to_min_s` normalizado (+2.0, 0.0, −1.0)

**Para reforzar predicción de SERVIDO:**
- `tpl_sigmoide` (−0.5, +1.5) — sep A/S = 5.78σ, weight podría aumentar a (−0.5, +2.0)
- `stat_cv` separación = 3.30σ, no está en EVIDENCE_WEIGHTS — candidato a agregar (−2.0, +2.0, 0.0)
- `d1_std` separación = 2.46σ — candidato (−1.0, +2.0, 0.0)

**Para reforzar predicción de RUIDO:**
- `n_plateaus` separación ruido/alim alta (1.70σ, ruido>>alim) — candidato (−1.0, 0.0, +2.0)
- `spectral_entropy` separación ruido/alim = 1.70σ — candidato (−1.0, 0.0, +1.5)
- `zcr` ya está (−1.0, 0.0, +1.0) — sep A/R = 3.68σ — considerar aumentar a +1.5

### Features con bajo poder discriminativo (candidatas a remover del motor en v2.3)

| Feature | sep_AS | sep_AR | Observación |
|---|---|---|---|
| `tpl_plateau` | 0.00σ | 0.00σ | Siempre 0.0 en datos reales — remover |
| `autocorr_lag5` | 0.01σ | 0.50σ | Sin poder discriminativo |
| `initial_slope_g_min` | 0.06σ | 0.16σ | Pendiente inicial muy ruidosa |
| `stat_mad` | 0.07σ | 1.31σ | MAD no agrega sobre IQR |
| `stat_skewness` | 0.59σ | 0.18σ | Bajo poder, alta varianza |
| `curvature_min` | 0.19σ | 0.71σ | Mínimo de curvatura siempre ~0 |

---

## 13. Historial de snapshots

| Versión | Fecha | Alim | Serv | Ruido | Total | Mejor feature (sep A/S) |
|---|---|---:|---:|---:|---:|---|
| v2.0 | 2026-06-26 | 200 | 43 | 165 | 408 | — |
| v2.1 | 2026-06-27 | 205 | 45 | 167 | 417 | `tpl_doble_rampa` (7.63σ) |
| v2.2 | pendiente | 209 | 45 | 167 | 421 | pendiente regenerar |

**Las estadísticas de la Sección 7 corresponden a v2.1** (417 anotaciones).
Al ejecutar `revisar_anotaciones_v2.py` con las 421 anotaciones actuales,
los valores cambiarán levemente (4 alimentaciones nuevas, +2%).

---

*Fin del documento — generado 2026-06-28 desde `app_anotacion_av2.py`, `shape_features_v2.py` y `comp_stats_v2.json`*
