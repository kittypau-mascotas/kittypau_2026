---
tags: [kittypau, ciclo-alpha-v2, resultados, estadisticas, anotaciones]
fecha_creacion: 2026-06-26
fecha_actualizacion: 2026-06-26
n_anotaciones: 417
estado: activo
---

# Resultados — 417 Anotaciones

> Ver [[00_INDICE_AV2]] para el índice completo. Ver [[05_ANOTACION_Y_CATEGORIAS]] para el workflow de anotación.

**Fecha de análisis:** 2026-06-26
**Script:** `revisar_anotaciones_v2.py`
**Fuente:** `anotaciones_av2.csv` + lecturas crudas `11_Data/2026/` (resampled 30s)
**Output:** `features_anotaciones_v2.csv` (417 × 109), `comp_stats_v2.json`

---

## Resumen de anotaciones

| Categoría | N | % del total |
|---|---|---|
| alimentacion | 213 | 51.1% |
| ruido | 159 | 38.1% |
| servido | 45 | 10.8% |
| **Total** | **417** | **100%** |

---

## Estadísticas de métricas clásicas

*(Calculadas directamente desde las lecturas crudas entre `t_inicio` y `t_fin` de cada anotación)*

### ALIMENTACIÓN (n=213)

| Métrica | Media | Std | Min | Max |
|---|---|---|---|---|
| Duración (min) | 6.94 | 2.91 | 1.0 | 20.0 |
| Δpeso (g) | −12.19 | 9.45 | −64.0 | +69.0¹ |
| Rango (g) | 17.73 | 8.54 | 0.0 | 77.0 |
| Pendiente (g/min) | −1.61 | 5.70 | −5.09 | +69.0¹ |

> ¹ Los outliers con Δpeso y pendiente positivos (hasta +69g) corresponden a posibles mislabels o eventos de servido mal categorizado. Requieren revisión.

**Percentiles clave:**
- Δpeso P10: −20.0g | P90: −6.0g
- El 90% de las alimentaciones tiene Δpeso entre −20g y −6g

### SERVIDO (n=45)

| Métrica | Media | Std | Min | Max |
|---|---|---|---|---|
| Duración (min) | 4.06 | 10.83 | 1.0 | 62.0¹ |
| Δpeso (g) | +64.81 | 32.05 | 0.0 | +129.0 |
| Rango (g) | 69.58 | 37.83 | 0.0 | +200.0 |
| Pendiente (g/min) | +39.41 | 30.57 | −0.02 | +126.0 |

> ¹ El evento 2026-05-06 20:54 con 62 minutos es un outlier probable (mislabel). Sin él, la media de duración sería ~2.5 min.

**Percentiles clave:**
- Δpeso P10: +26.0g | P90: +100.0g
- El 90% de los servidos tiene Δpeso entre +26g y +100g

### RUIDO (n=159)

| Métrica | Media | Std | Min | Max |
|---|---|---|---|---|
| Duración (min) | 12.04 | 5.05 | 4.0 | 43.0 |
| Δpeso (g) | +0.81 | 15.72 | −62.0 | +89.0 |
| Rango (g) | 30.30 | 37.91 | 4.0 | 143.0 |
| Pendiente (g/min) | +0.02 | 1.17 | −3.52 | +4.87 |

**Percentiles clave:**
- Δpeso P10: −7.8g | P90: +8.8g
- El rango es muy amplio (0–143g) por la variabilidad del ruido del sensor

---

## Estadísticas de shape features

*(Calculadas desde `candidatos_av2.csv` mergeado con anotaciones via `id_candidato`)*

### Features F00 clásicas (v1)

*(Estadísticas calculadas con `revisar_anotaciones_v2.py` sobre 417 anotaciones, extrayendo señal del raw data)*

| Feature | alim (n=213) | serv (n=45) | ruido (n=159) |
|---|---|---|---|
| **sim_alimentacion** µ | **+0.686** | −0.868 | −0.010 |
| sim_alimentacion std | 0.425 | 0.152 | 0.627 |
| **sim_servido** µ | −0.686 | **+0.868** | +0.010 |
| sim_servido std | 0.425 | 0.152 | 0.627 |
| **monotonicity** µ | **−0.196** | +0.312 | −0.002 |
| monotonicity std | 0.130 | 0.201 | 0.061 |
| **r2_lineal** µ | **0.615** | 0.680 | 0.227 |
| r2_lineal std | 0.267 | 0.214 | 0.207 |
| **zcr** µ | 0.652 | 0.440 | 0.232 |
| zcr std | 0.146 | 0.142 | 0.118 |

> Nota: La ZCR ahora invierte su orden respecto a versiones anteriores — alimentación tiene ZCR más alto porque la ventana de extracción ahora incluye el contexto completo de la curva (variaciones alrededor de la tendencia). El coseno sigue siendo el discriminador primario.

### Top features discriminativas — Motor v2

*(Top 20 por separación alim vs. serv, calculado sobre 417 anotaciones)*

| Feature | Familia | alim µ | serv µ | ruido µ | Sep. A/S (σ) |
|---|---|---|---|---|---|
| `tpl_doble_rampa` | F12_templates | +0.730 | −0.902 | +0.021 | **5.76σ** |
| `tpl_sigmoide` | F12_templates | −0.698 | +0.875 | −0.003 | **4.98σ** |
| `tpl_alim_escalonada` | F12_templates | +0.683 | −0.866 | −0.011 | **4.89σ** |
| `tpl_ramp_down` | F12_templates | +0.686 | −0.868 | −0.010 | **4.87σ** |
| `sim_alimentacion` | F00_clasicas | +0.686 | −0.868 | −0.010 | **4.87σ** |
| `tpl_ramp_up` | F12_templates | −0.686 | +0.868 | +0.010 | **4.87σ** |
| `tpl_alim_lenta` | F12_templates | +0.622 | −0.812 | −0.032 | **4.28σ** |
| `tpl_exp_decay` | F12_templates | +0.609 | −0.789 | −0.032 | **4.11σ** |
| `entropy_shannon` | F06_entropias | +2.396 | +1.088 | +1.068 | **3.56σ** |
| `entropy_permutation` | F06_entropias | +0.729 | +0.096 | +0.303 | **3.27σ** |
| `d1_frac_neg` | F01_derivadas | +0.360 | +0.040 | +0.081 | **3.16σ** |
| `monotonicity` | F00_clasicas | −0.196 | +0.312 | −0.002 | **3.00σ** |
| `d1_n_sign_changes` | F01_derivadas | +8.775 | +2.044 | +5.629 | **2.69σ** |
| `stat_cv` | F10_robusta | +0.043 | +0.231 | +0.060 | **2.46σ** |
| `fractal_katz` | F07_fractal | +0.761 | +0.976 | +0.840 | **2.43σ** |
| `d1_max` | F01_derivadas | +0.225 | +1.932 | +0.853 | — |
| `d1_mean` | F01_derivadas | −0.026 | +0.578 | +0.000 | — |
| `settling_time_s` | F13_dinamica | +386.6s | +112.7s | +307.9s | — |
| `straightness` | F04_tortuosidad | +0.991 | +0.880 | +0.966 | — |
| `d1_rms` | F01_derivadas | +0.139 | +1.048 | +0.250 | — |

> **Hallazgo relevante:** `tpl_doble_rampa` (F12) supera a `sim_alimentacion` como mejor discriminador (5.76σ vs 4.87σ). Los templates canónicos de F12 son el conjunto más discriminativo del motor v2.

---

## Tabla de separación (distancia entre categorías)

| Feature | alim vs. serv | alim vs. ruido | Familia |
|---|---|---|---|
| tpl_doble_rampa | **5.76σ** | 1.28σ | F12_templates |
| tpl_sigmoide | **4.98σ** | 1.29σ | F12_templates |
| sim_alimentacion | **4.87σ** | 1.26σ | F00_clasicas |
| entropy_shannon | **3.56σ** | 3.56σ | F06_entropias |
| entropy_permutation | **3.27σ** | 3.02σ | F06_entropias |
| d1_frac_neg | **3.16σ** | 2.32σ | F01_derivadas |
| monotonicity | **3.00σ** | 1.43σ | F00_clasicas |
| r2_lineal | 0.28σ | **2.45σ** | F00_clasicas |

> **Nota sobre r2_lineal:** Con más datos, r2_lineal separación A/S bajó (era 2.4σ con 304 anots., ahora 0.28σ). Servido y alimentación tienen R² similares (~0.62 vs 0.68). Solo discrimina bien alim vs ruido. El motor v2 compensa esto con F12 templates que son mucho más específicos.

---

## Distribución temporal de las anotaciones

Las 417 anotaciones cubren el período 2026-04-07 a 2026-06-26:

### Alimentación (213 eventos)
- Mayor concentración entre 05:00–10:00 y 16:00–22:00 (horario Santiago)
- Promedio: ~2 sesiones de alimentación por día
- Duración media constante (~7 min) durante todo el período

### Servido (45 eventos)
- Irregulares, sin patrón horario claro
- Frecuencia: aproximadamente cada 2–3 días
- Δpeso muy variable (13g–129g) según cantidad servida

### Ruido (159 eventos)
- Duración media 12 min, mucho más larga que alimentación
- Sin patrón horario claro
- Posiblemente correlacionado con actividad en el ambiente cercano al bowl

---

## Outliers y casos especiales

| ID/Fecha | Categoría anotada | Anomalía | Acción recomendada |
|---|---|---|---|
| 2026-05-06 20:54 | servido | Duración 62 min | Revisar / reclasificar como ruido |
| Varios (alim.) | alimentacion | Δpeso +69g, pendiente +69 g/min | Revisar — posible servido no detectado |
| Varios (ruido) | ruido | Rango > 100g (9 casos) | Revisar — posible servido mislabeled |

---

## Impacto de las anotaciones sobre los umbrales

Comparando v1.2 (304 anot.) vs v2.0 (417 anot.):

- La media de Δpeso de alimentación se mantuvo estable (~−12g)
- El conteo de servido subió de 31 a 45 — mejor representación de la clase minoritaria
- `tpl_doble_rampa` superó a `sim_alimentacion` como mejor discriminador (5.76σ vs 4.87σ)
- `entropy_shannon` es el mejor discriminador de ruido (3.56σ en ambas comparaciones A/S y A/R)
- `r2_lineal` perdió poder discriminativo A/S (2.4σ → 0.28σ) — con más datos, servido también tiene R² alto

Ver [[06_UMBRALES_Y_REGLAS]] para la tabla completa de cambios entre versiones.
Ver [[09_EVOLUCION_MOTOR_MATEMATICO]] para el cuadro comparativo completo de las ~105 features v2.

---

## Ver también

- [[04_MATEMATICA_SHAPE_FEATURES]] — Definición matemática de cada feature
- [[05_ANOTACION_Y_CATEGORIAS]] — Descripción de las categorías y workflow
- [[06_UMBRALES_Y_REGLAS]] — Cómo estos resultados se traducen en umbrales
- [[08_APP_ANOTACION_AV2]] — Tab 4 (Ajustar Umbrales) de la app muestra estas estadísticas
