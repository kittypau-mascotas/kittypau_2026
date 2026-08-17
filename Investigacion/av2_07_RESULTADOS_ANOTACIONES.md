---
tags: [kittypau, ciclo-alpha-v2, resultados, estadisticas, anotaciones]
fecha_creacion: 2026-06-26
fecha_actualizacion: 2026-08-16
n_anotaciones: 814
estado: activo
---

# Resultados — 814 Anotaciones

> Ver [[av2_00_INDICE_AV2]] para el índice completo. Ver [[av2_05_ANOTACION_Y_CATEGORIAS]] para el workflow de anotación.
> Snapshot correspondiente: [[av2_HISTORIAL_RESULTADOS]] v2.5 (2026-08-16).

**Fecha de análisis:** 2026-08-16
**Script:** `revisar_anotaciones_v2.py`
**Fuente:** `anotaciones_av2.csv` + lecturas crudas `11_Data/2026/` (resampled 30s)
**Output:** `features_anotaciones_v2.csv` (814 × 109), `comp_stats_v2.json`

---

## Resumen de anotaciones

| Categoría | N | % del total |
|---|---|---|
| alimentacion | 356 | 43.7% |
| ruido | 374 | 46.0% |
| servido | 84 | 10.3% |
| **Total** | **814** | **100%** |

---

## Estadísticas de métricas clásicas

*(Calculadas directamente desde las lecturas crudas entre `t_inicio` y `t_fin` de cada anotación)*

> Recalculado 2026-08-16 sobre las 814 anotaciones actuales (`extraer_ventana()` de
> `revisar_anotaciones_v2.py`, misma metodología del análisis original). Los outliers
> de mislabel que documentaba la versión anterior de este doc (alimentación con
> Δpeso +69g, servido de 62 min) ya no aparecen en los máximos actuales — o se
> corrigieron/reclasificaron entre entonces y ahora, o quedaron diluidos entre las
> ~400 anotaciones nuevas. No se investigó cuál de las dos explicaciones es correcta.

### ALIMENTACIÓN (n=356)

| Métrica | Media | Std | Min | Max | P10 | P90 |
|---|---|---|---|---|---|---|
| Duración (min) | 7.51 | 3.04 | 3.0 | 20.0 | 5.0 | 12.0 |
| Δpeso (g) | −12.44 | 5.09 | −33.0 | 0.0 | −18.0 | −6.0 |
| Rango (g) | 17.74 | 5.77 | 4.0 | 41.0 | 11.0 | 25.0 |
| Pendiente (g/min) | −1.81 | 0.79 | −4.17 | 0.0 | −2.80 | −0.80 |

**El 90% de las alimentaciones tiene Δpeso entre −18g y −6g.** Ya no hay outliers con
Δpeso positivo en el máximo (antes +69g) — la distribución quedó limpia.

### SERVIDO (n=84)

| Métrica | Media | Std | Min | Max | P10 | P90 |
|---|---|---|---|---|---|---|
| Duración (min) | 3.61 | 3.65 | 1.0 | 17.0 | 1.0 | 11.0 |
| Δpeso (g) | +54.89 | 29.65 | −2.0 | +126.0 | +21.0 | +102.1 |
| Rango (g) | 57.58 | 28.80 | 0.0 | +126.0 | +26.3 | +103.0 |
| Pendiente (g/min) | +27.64 | 25.54 | −0.18 | +126.0 | +3.73 | +53.25 |

**El 90% de los servidos tiene Δpeso entre +21g y +102g.** El outlier de 62 min de la
versión anterior ya no aparece (máximo actual: 17 min).

### RUIDO (n=374)

| Métrica | Media | Std | Min | Max | P10 | P90 |
|---|---|---|---|---|---|---|
| Duración (min) | 9.31 | 6.28 | 1.0 | 43.0 | 1.0 | 16.0 |
| Δpeso (g) | +0.63 | 24.41 | −129.0 | +161.0 | −9.0 | +9.0 |
| Rango (g) | 25.79 | 39.65 | 0.0 | 200.0 | 4.0 | 97.7 |
| Pendiente (g/min) | −0.56 | 12.56 | −129.0 | +16.1 | −0.91 | +4.45 |

**El rango de ruido sigue siendo muy amplio** (Δpeso −129g a +161g) por la variabilidad
del sensor — pero el P10/P90 (−9g a +9g) muestra que el 80% central sigue siendo
pequeño, consistente con el análisis anterior. Los extremos son ahora más marcados
(antes −62g/+89g) porque el dataset creció ~2.4×.

---

## Estadísticas de shape features

*(Calculadas desde `candidatos_av2.csv` mergeado con anotaciones via `id_candidato`)*

### Features F00 clásicas (v1)

*(Estadísticas de `comp_stats_v2.json`, regenerado 2026-08-16 sobre 814 anotaciones)*

| Feature | alim (n=356) | serv (n=84) | ruido (n=374) |
|---|---|---|---|
| **sim_alimentacion** µ | **+0.738** | −0.871 | +0.050 |
| sim_alimentacion std | 0.352 | 0.181 | 0.692 |
| **sim_servido** µ | −0.738 | **+0.871** | −0.050 |
| sim_servido std | 0.352 | 0.181 | 0.692 |
| **monotonicity** µ | **−0.181** | +0.280 | +0.024 |
| monotonicity std | 0.111 | 0.210 | 0.191 |
| **r2_lineal** µ | **0.619** | 0.643 | 0.300 |
| r2_lineal std | 0.238 | 0.226 | 0.262 |
| **zcr** µ | 0.640 | 0.394 | 0.236 |
| zcr std | 0.162 | 0.176 | 0.160 |

> Los valores se mantienen en el mismo orden de magnitud que el snapshot anterior
> (n=417) — el motor sigue siendo estable al agregar ~400 anotaciones nuevas.

### Top features discriminativas — Motor v2

*(Top 20 por separación alim vs. serv, calculado sobre 814 anotaciones — ver
[[av2_HISTORIAL_RESULTADOS]] snapshot v2.5 para la tabla completa con familias)*

| Feature | Familia | Sep. A/S (σ) |
|---|---|---:|
| `tpl_doble_rampa` | F12_templates | **6.92σ** |
| `tpl_sigmoide` | F12_templates | **5.94σ** |
| `tpl_alim_escalonada` | F12_templates | **5.79σ** |
| `tpl_ramp_down` | F12_templates | **5.75σ** |
| `sim_servido` / `sim_alimentacion` | F00_clasicas | **5.75σ** |
| `tpl_ramp_up` | F12_templates | **5.75σ** |
| `tpl_alim_lenta` | F12_templates | **4.96σ** |
| `tpl_exp_decay` / `tpl_exp_rise` | F12_templates | **4.75σ** |
| `time_to_min_s` | ? | **4.68σ** |
| `tpl_serv_brusco` | F12_templates | **4.12σ** |
| `entropy_permutation` | F06_entropias | **3.42σ** |
| `d1_frac_neg` | F01_derivadas | **3.26σ** |
| `entropy_shannon` | F06_entropias | **3.25σ** |
| `d1_n_sign_changes` | F01_derivadas | **2.92σ** |
| `fractal_katz` | F07_fractal | **2.88σ** |
| `monotonicity` | F00_clasicas | **2.74σ** |
| `settling_time_s` | F13_dinamica | **2.66σ** |
| `d2_n_sign_changes` | ? | **2.66σ** |

> **`tpl_doble_rampa` (F12) sigue siendo el mejor discriminador** — separación bajó de
> 5.76σ (n=417) a 6.92σ (n=814) — en realidad **subió**, no bajó, con más datos (dato
> corregido respecto al snapshot v2.0-era de este mismo doc, que comparaba contra
> 304 anotaciones, no 417). Los templates canónicos de F12 siguen siendo el conjunto
> más discriminativo del motor v2.

---

## Tabla de separación (distancia entre categorías)

*(Recalculado 2026-08-16 sobre 814 anotaciones — σ pooled entre pares de categorías)*

| Feature | alim vs. serv | alim vs. ruido | Familia |
|---|---|---|---|
| tpl_doble_rampa | **6.92σ** | 1.52σ | F12_templates |
| tpl_sigmoide | **5.94σ** | 1.31σ | F12_templates |
| sim_alimentacion | **5.75σ** | 1.25σ | F00_clasicas |
| entropy_permutation | **3.42σ** | 2.89σ | F06_entropias |
| entropy_shannon | **3.25σ** | 2.76σ | F06_entropias |
| d1_frac_neg | **3.26σ** | 2.41σ | F01_derivadas |
| monotonicity | **2.74σ** | 1.31σ | F00_clasicas |
| r2_lineal | 0.11σ | **1.28σ** | F00_clasicas |

> **r2_lineal sigue sin discriminar alim vs. serv** (0.11σ, similar al 0.28σ del
> snapshot n=417) — confirma que no fue un artefacto de la muestra chica, es una
> propiedad real de la feature: servido y alimentación tienen R² lineal parecido.
> Solo discrimina alim vs ruido. El motor v2 sigue compensando con F12 templates.

---

## Distribución temporal de las anotaciones

Las 814 anotaciones fueron creadas entre 2026-06-26 y 2026-08-13 (fecha de
anotación, vía `app_anotacion_av2.py`), sobre datos crudos que cubren
2026-04-07 → 2026-07-22.

> El detalle por franja horaria/día de la semana del snapshot anterior (n=417) no
> se recalculó en esta actualización — requiere una consulta aparte a
> `hora_inicio_stgo`/`fecha_inicio_stgo` de `candidatos_av2.csv` que no se hizo en
> esta pasada. Si hace falta, correr esa consulta antes de confiar en cualquier
> afirmación sobre patrones horarios.

---

## Outliers y casos especiales

Los 3 outliers documentados en el snapshot anterior (servido de 62 min,
alimentación con Δpeso +69g, 9 casos de ruido con rango >100g) **ya no aparecen
como máximos** en las estadísticas actuales — ver la nota al inicio de la sección
"Estadísticas de métricas clásicas". No se investigó si fueron corregidos
manualmente o simplemente diluidos por las ~400 anotaciones nuevas.

Nuevo candidato a revisar: ruido ahora tiene un mínimo de Δpeso de −129g (antes
−62g) y un máximo de +161g (antes +89g) — rango mucho más amplio que antes. Vale
la pena revisar manualmente esos casos extremos en Tab 1 antes de asumir que son
ruido genuino y no servidos/alimentaciones mal etiquetados.

---

## Impacto de las anotaciones sobre los umbrales

Comparando snapshot v2.3 (n=496, 2026-08-10) vs este snapshot v2.5 (n=814, 2026-08-16):

- La media de Δpeso de alimentación se mantuvo estable (~−12g)
- El conteo de servido subió de 55 a 84 — sigue siendo la clase minoritaria pero
  con más representación
- `tpl_doble_rampa` sigue siendo por lejos el mejor discriminador A/S, aunque la
  separación bajó levemente de 7.69σ (n=496) a 6.92σ (n=814) — ver la observación
  en [[av2_HISTORIAL_RESULTADOS]] v2.5 (distribución se ensancha un poco con más
  datos, esperable, no indica un problema)
- `r2_lineal` se confirma sin poder discriminativo A/S con más datos (no es ruido de muestra chica)
- **`config/umbrales.json` (v1.3) sigue calibrado contra n=496** — no se recalibró
  en esta actualización de documentación, ver nota en [[av2_HISTORIAL_RESULTADOS]] v2.5

Ver [[av2_06_UMBRALES_Y_REGLAS]] para la tabla completa de cambios entre versiones.
Ver [[av2_09_EVOLUCION_MOTOR_MATEMATICO]] para el cuadro comparativo completo de las 102 features v2.

---

## Ver también

- [[av2_04_MATEMATICA_SHAPE_FEATURES]] — Definición matemática de cada feature
- [[av2_05_ANOTACION_Y_CATEGORIAS]] — Descripción de las categorías y workflow
- [[av2_06_UMBRALES_Y_REGLAS]] — Cómo estos resultados se traducen en umbrales
- [[av2_08_APP_ANOTACION_AV2]] — Tab 4 (Ajustar Umbrales) de la app muestra estas estadísticas
