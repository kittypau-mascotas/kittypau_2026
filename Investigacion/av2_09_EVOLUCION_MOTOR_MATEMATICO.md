---
tags: [kittypau, ciclo-alpha-v2, roadmap, matematica, features, motor-v2]
fecha_creacion: 2026-06-26
fecha_implementacion: 2026-06-26
estado: implementado
prioridad: alta
---

# Motor Matemático v2 — Implementación y Hoja de Ruta

> [!success] IMPLEMENTADO — 2026-06-26
> `shape_features_v2.py` creado con **~105 features en 14 familias** + **Evidence Engine** + **Clasificador determinístico**.
> `app_anotacion_av2.py` actualizado con **Tab 5 — Motor Matemático**: cuadro comparativo, radar, templates, dinámica temporal, Feature Registry y cálculo en vivo.

Ver [[av2_00_INDICE_AV2]] para el estado actual. Ver [[av2_04_MATEMATICA_SHAPE_FEATURES]] para las features de la v1.

---

## Estado de implementación

### Módulo `shape_features_v2.py`

| Familia | N features | Estado | Dependencias |
|---------|-----------|--------|-------------|
| F00 Clásicas base (v1) | 5 | ✅ Implementado | numpy |
| F01 Geometría diferencial (3 derivadas × stats) | 25 | ✅ Implementado | numpy |
| F02 Curvatura κ | 5 | ✅ Implementado | numpy |
| F03 Longitud de arco | 4 | ✅ Implementado | numpy |
| F04 Tortuosidad | 2 | ✅ Implementado | numpy |
| F05 Energía | 6 | ✅ Implementado | numpy |
| F06 Entropías (Shannon, Sample, Permutation) | 3 | ✅ Implementado | scipy.stats |
| F07 Dimensión fractal (Higuchi, Katz) | 2 | ✅ Implementado | numpy |
| F08 Complejidad Lempel-Ziv | 1 | ✅ Implementado | numpy |
| F09 Análisis frecuencial (FFT, autocorrelación) | 7 | ✅ Implementado | numpy |
| F10 Estadística robusta | 7 | ✅ Implementado | scipy.stats |
| F11 Topología (picos, valles, plateaus) | 8 | ✅ Implementado | scipy.signal |
| F12 Templates canónicos (12 similitudes coseno) | 12 | ✅ Implementado | numpy |
| F13 Dinámica temporal | 12 | ✅ Implementado | numpy |
| F14 Features derivadas (índices compuestos) | 6 | ✅ Implementado | numpy |
| **Total** | **~105** | **✅ Completo** | numpy, scipy |

### Evidence Engine

| Componente | Estado | Descripción |
|-----------|--------|-------------|
| `REGISTRY` | ✅ | Catálogo completo de todas las features (fórmula, rango, unidad, significado) |
| `feature_list_by_family()` | ✅ | Retorna dict {familia: [features]} |
| `extraer_features(valores, resample_s)` | ✅ | API pública: extrae el vector completo |
| `evidence_score(feats)` | ✅ | Softmax sobre pesos empíricos → score por hipótesis |
| `clasificar(feats, umbrales)` | ✅ | Clasificador determinístico v1.2 (compatible con umbrales.json) |
| `resumen_features(feats)` | ✅ | Resumen textual de features discriminativas |

### App `app_anotacion_av2.py` — Tab 5 Motor Matemático

| Sección | Estado |
|---------|--------|
| Selector de candidato vinculado al estado de sesión | ✅ |
| Gráfico del segmento seleccionado | ✅ |
| Predicción Evidence Engine (scores + barras) | ✅ |
| Clasificador determinístico v1.2 | ✅ |
| Resumen textual de features clave | ✅ |
| Vector de features completo por familia (expanders) | ✅ |
| Cuadro comparativo hardcodeado (F00 − 5 features, 304 anot.) | ✅ |
| Cálculo en vivo del cuadro comparativo (todas las features) | ✅ |
| Radar chart — 10 features clave vs referencias por categoría | ✅ |
| Bar chart — F12 similitudes con 12 templates canónicos | ✅ |
| Bar chart — F06/F07/F08/F14 complejidad y entropía | ✅ |
| Tabla dinámica temporal (F13) | ✅ |
| Feature Registry completo (tabla descargable) | ✅ |

---

## Cuadro comparativo — features conocidas (304 anotaciones)

Las 5 features de la v1 están completamente calibradas. Las nuevas (F01–F14) requieren
ejecutar el cálculo en vivo desde la app para obtener estadísticas empíricas.

| Feature | Familia | Alim. µ (n=160) | Servido µ (n=31) | Ruido µ (n=113) | Sep. A/S (σ) | Poder |
|---------|---------|-----------------|-----------------|-----------------|-------------|-------|
| `sim_alimentacion` | F00 | **+0.881** | −0.875 | +0.021 | **34.4σ** | ⭐⭐⭐⭐⭐ |
| `sim_servido` | F00 | −0.881 | **+0.875** | −0.021 | **34.4σ** | ⭐⭐⭐⭐⭐ |
| `monotonicity` | F00 | **−0.090** | +0.008 | −0.008 | 1.6σ | ⭐⭐⭐ |
| `r2_lineal` | F00 | **0.570** | 0.240 | 0.233 | 2.4σ | ⭐⭐⭐ |
| `zcr` | F00 | 0.277 | 0.185 | 0.208 | 0.8σ | ⭐ |

### Predicciones cualitativas para las nuevas features (pendiente de validación empírica)

| Feature | Familia | Alim. esperado | Servido esperado | Ruido esperado | Hipótesis |
|---------|---------|---------------|-----------------|----------------|-----------|
| `fractal_higuchi` | F07 | **~1.2** (curva suave) | ~1.3 | **~1.5+** (señal rugosa) | Discrimina ruido |
| `lempel_ziv` | F08 | **~0.3** (repetitivo) | ~0.4 | **~0.7+** (aleatorio) | Discrimina ruido |
| `entropy_permutation` | F06 | **~0.55** (baja) | ~0.65 | **~0.80** (alta) | Discrimina ruido |
| `tortuosity` | F04 | **~1.05** (casi recta) | ~1.10 | **~2.0+** (zigzag) | Discrimina ruido |
| `straightness` | F04 | **~0.95** (alta) | ~0.90 | **~0.50** (baja) | Discrimina ruido |
| `rise_time_s` | F13 | ~180s (lento) | **~30s** (rápido) | ~120s | Discrimina servido |
| `initial_slope_g_min` | F13 | ~-1.5 g/min | **~+40 g/min** | ~0 g/min | Discrimina servido |
| `tpl_exp_decay` | F12 | **~+0.85** (alto) | ~-0.80 | ~0 | Variante de alim. |
| `tpl_sigmoide` | F12 | ~-0.70 | **~+0.80** | ~0 | Variante de serv. |
| `autocorr_lag1` | F09 | **~0.90** (alta) | ~0.85 | **~0.70** (menor) | Suavidad de señal |
| `power_ratio_low` | F09 | **~0.70** (bajas frec) | ~0.65 | **~0.45** (más frec.) | Lentitud de cambio |
| `idx_linearity` | F14 | **~0.051** (R²×mono) | ~0.002 | ~0.002 | Muy específico alim. |
| `d1_frac_neg` | F01 | **~0.50+** | ~0.15 | ~0.40 | Bajada neta en alim. |

---

## 12 Templates canónicos (F12) — especificaciones

| Template | Forma | Categoría objetivo | Coseno esperado |
|----------|-------|-------------------|----------------|
| `tpl_ramp_down` | Rampa lineal 0 → −1 | Alimentación | alim: +0.88 |
| `tpl_exp_decay` | −(1−e^−3t) | Alimentación lenta | alim: +0.80+ |
| `tpl_alim_lenta` | −√t | Alimentación muy gradual | alim: +0.75+ |
| `tpl_alim_escalonada` | Escalera −0.25 cada paso | Alimentación en tandas | alim: variable |
| `tpl_ramp_up` | Rampa lineal 0 → +1 | Servido | serv: +0.88 |
| `tpl_exp_rise` | 1−e^−3t | Servido asintótico | serv: +0.85 |
| `tpl_sigmoide` | 2/(1+e^−6(t−0.5))−1 | Servido gradual | serv: +0.80 |
| `tpl_serv_brusco` | Subida 1/3 + plateau | Servido con estabilización | serv: +0.75+ |
| `tpl_plateau` | Señal plana (=0) | Reposo / sin actividad | ruido: ~0 en todos |
| `tpl_triangular` | Sube + baja simétrico | Movimiento de bowl | ruido: variable |
| `tpl_parabola_down` | −4t(1−t) | Pico y regreso | ruido: variable |
| `tpl_doble_rampa` | Plateau + bajada | Post-servido + inicio consumo | variable |

---

## Evidence Engine — pesos del clasificador

Los pesos EVIDENCE_WEIGHTS están calibrados cualitativamente en las 304 anotaciones.
La próxima iteración los derivará empíricamente via regresión logística sobre el vector de features.

```python
# Pesos actuales (positivo = evidencia a favor de la categoría)
EVIDENCE_WEIGHTS = {
    "sim_alimentacion":  (+5.0, -5.0,  0.0),  # F00: primario
    "sim_servido":       (-5.0, +5.0,  0.0),  # F00: primario
    "monotonicity":      (-3.0,  0.0,  0.0),  # F00: secundario
    "r2_lineal":         (+2.0, -0.5, -0.5),  # F00: secundario
    "tpl_ramp_down":     (+3.0, -2.0,  0.0),  # F12: template
    "tpl_ramp_up":       (-2.0, +3.0,  0.0),  # F12: template
    "tortuosity":        (-1.5, -0.5, +2.0),  # F04: ruido
    "fractal_higuchi":   (-1.5, -0.5, +2.0),  # F07: ruido
    "lempel_ziv":        (-1.0, -0.5, +1.5),  # F08: ruido
    "entropy_permutation": (-1.5, 0.0, +1.5), # F06: complejidad
    "idx_linearity":     (+2.0, -0.5, -0.5),  # F14: compuesto
    ...
}
```

---

## Uso del módulo desde Python

```python
from shape_features_v2 import extraer_features, evidence_score, clasificar, resumen_features

# Extraer ~105 features de un array de peso
import numpy as np
peso = np.array([200.1, 199.5, 198.8, 197.3, 196.0, 195.2, 194.5])
feats = extraer_features(peso, resample_s=30.0)

# Ver resumen compacto
print(resumen_features(feats))

# Predicción probabilística (Evidence Engine)
ev = evidence_score(feats)
print(f"Predicción: {ev['prediccion']} ({ev['confianza']:.1%})")
print(f"Razón: {ev['razon']}")

# Clasificador determinístico (compatible con umbrales.json)
cat = clasificar(feats)
print(f"Clasificador v1.2: {cat}")

# Iterar por familia
from shape_features_v2 import feature_list_by_family
for familia, fnames in feature_list_by_family().items():
    print(f"\n{familia}: {len(fnames)} features")
    for f in fnames:
        print(f"  {f} = {feats.get(f, '—')}")
```

---

## Roadmap pendiente (segunda iteración)

### Familias aún no implementadas (del diagnóstico original)

| Familia | Features estimadas | Prioridad | Bloqueante |
|---------|-------------------|-----------|-----------|
| Wavelets (Daubechies, Symlet) | ~20 | Media | requiere `pywt` |
| Análisis Lomb-Scargle | ~3 | Baja | requiere `astropy` |
| Huber location estimator | ~1 | Baja | scipy implementado |
| Approximate Entropy (ApEn) | ~1 | Media | O(n²) — implementar con límite |

### Próximas mejoras al Evidence Engine

1. **Calibración empírica de pesos** — regresión logística multinomial sobre el vector de 105 features usando las 304 anotaciones
2. **Umbral adaptivo** — ajustar `sim_min` dinámicamente según el percentil empírico de cada device
3. **Validación cruzada** — Leave-One-Out sobre las 304 anotaciones para calcular F1 por categoría
4. **Integración PELT/CUSUM** — mejorar la detección de candidatos con `ruptures` (ya en requirements)

### Actualizar estadísticas empíricas del cuadro comparativo

Cuando se tengan más anotaciones, regenerar `COMP_STATS` en la app ejecutando:

```python
# script: revisar_anotaciones_v2.py (pendiente de crear)
# — merges anotaciones_av2.csv + candidatos_av2.csv + lecturas crudas
# — extrae features v2 para TODOS los eventos anotados
# — calcula µ ± σ por categoría
# — exporta tabla completa + actualiza COMP_STATS en la app
```

---

## Ver también

- [[av2_04_MATEMATICA_SHAPE_FEATURES]] — Features actuales de la v1 (detalle matemático)
- [[av2_06_UMBRALES_Y_REGLAS]] — Clasificador determinístico v1.2 (umbrales.json)
- [[av2_07_RESULTADOS_ANOTACIONES]] — Base empírica para calibrar las nuevas features
- [[av2_03_DETECCION_SEGMENTOS]] — Pipeline de detección de candidatos
- [[av2_08_APP_ANOTACION_AV2]] — Documentación de la app Streamlit
