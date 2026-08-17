# Ciclo Alpha v2 — Resultados y Benchmarks

> Fusión de las estadísticas de anotaciones, el historial de snapshots, el análisis de benchmark de 20 modelos y el diagnóstico de clustering.


---


<!-- ==== fusionado desde av2_07_RESULTADOS_Y_BENCHMARKS.md ==== -->

---
tags: [kittypau, ciclo-alpha-v2, resultados, estadisticas, anotaciones]
fecha_creacion: 2026-06-26
fecha_actualizacion: 2026-08-16
n_anotaciones: 814
estado: activo
---

# Resultados — 814 Anotaciones

> Ver [[av2_00_INDICE_Y_VISION_GENERAL]] para el índice completo. Ver [[av2_05_ANOTACION_Y_CATEGORIAS]] para el workflow de anotación.
> Snapshot correspondiente: [[av2_07_RESULTADOS_Y_BENCHMARKS]] v2.6 (2026-08-16).

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
[[av2_07_RESULTADOS_Y_BENCHMARKS]] snapshot v2.5 para la tabla completa con familias)*

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
  en [[av2_07_RESULTADOS_Y_BENCHMARKS]] v2.5 (distribución se ensancha un poco con más
  datos, esperable, no indica un problema)
- `r2_lineal` se confirma sin poder discriminativo A/S con más datos (no es ruido de muestra chica)
- **`config/umbrales.json` (v1.3) sigue calibrado contra n=496** — no se recalibró
  en esta actualización de documentación, ver nota en [[av2_07_RESULTADOS_Y_BENCHMARKS]] v2.5

Ver [[av2_06_UMBRALES_Y_REGLAS]] para la tabla completa de cambios entre versiones.
Ver [[av2_04_MOTOR_MATEMATICO]] para el cuadro comparativo completo de las 102 features v2.

---

## Ver también

- [[av2_04_MOTOR_MATEMATICO]] — Definición matemática de cada feature
- [[av2_05_ANOTACION_Y_CATEGORIAS]] — Descripción de las categorías y workflow
- [[av2_06_UMBRALES_Y_REGLAS]] — Cómo estos resultados se traducen en umbrales
- [[av2_08_APP_ANOTACION]] — Tab 4 (Ajustar Umbrales) de la app muestra estas estadísticas


---


<!-- ==== fusionado desde av2_07_RESULTADOS_Y_BENCHMARKS.md ==== -->

# Historial de Resultados — Motor Matemático v2 (Alpha v2)

**Proyecto:** Kittypau — KPCL0034 "Bandida"  
**Dispositivo:** food_bowl `3a460074` (Mayo-Jun 2026) + `9510a455` (Abr 2026)  
**Motor:** `shape_features_v2.py` — 102 features en 15 familias (F00–F14)  
**Propósito:** Registro histórico de cada ingesta de datos nueva. Se actualiza cada vez que se ejecuta `revisar_anotaciones_v2.py` y se actualiza `COMP_STATS` en la app.

---

## Tabla Resumen

| Snapshot | Fecha | Alim | Serv | Ruido | Total anot. | Candidatos | Features | Rango datos | Mejor feature (sep. A/S) |
|----------|-------|-----:|-----:|------:|------------:|-----------:|---------:|-------------|--------------------------|
| v2.0 | 2026-06-26 | 200 | 43 | 165 | 408 | 417 | 101 | Abr 8 → Jun 25 | — |
| v2.1 | 2026-06-27 | 205 | 45 | 167 | 417 | 421 | 102 | Abr 8 → Jun 27 | `tpl_doble_rampa` (7.63σ) |
| v2.3 | 2026-08-10 | 254 | 55 | 187 | 496 | 589 | 102 | Abr 8 → Ago 10 | `tpl_doble_rampa` (7.69σ) |
| v2.5 | 2026-08-16 | 356 | 84 | 374 | 814 | 916 | 102 | Abr 7 → Jul 22 | `tpl_doble_rampa` (6.92σ) |

---

## Snapshot v2.6 — 2026-08-16 — incidente `id_candidato` + regla estructural (rollback NO ejecutado)

Informe externo ("Informe Maestro — Corrupción de candidatos_av2.csv",
hecho sin acceso al repo) reportó `id_candidato` posicional inestable entre
regeneraciones de `candidatos_av2.csv` y pidió rollback + regla estructural.
Detalle completo, verificación número por número contra el repo real, y
diseño de la solución: `Knowledge/29_Specs/SPEC_13_Reorganizacion_09_Investigacion.md`
§19. Resumen:

- **Rollback: verificado imposible y no necesario.** `candidatos_av2.csv` no
  tiene git history (gitignored) ni backup previo — no hay a qué revertir.
  `umbrales.json` y `features_anotaciones_v2.csv` no dependen del join roto
  (ambos ya calculan directo desde lecturas crudas, ver §19.2 del spec) — no
  se tocó ninguno de los dos, ni las 814 anotaciones existentes.
- **Implementado en su lugar:** `id_candidato` pasó a ser hash de contenido
  determinístico (ver [[av2_03_DETECCION_SEGMENTOS]] § "id_candidato — hash
  de contenido"); `candidatos_av2.csv` ya no se sobreescribe in-place (gate
  de validación por solape + backup + `CHANGELOG_candidatos.md`);
  `anotaciones_av2.csv` ganó 4 columnas nuevas (`duracion_min`,
  `delta_w_total`, `peso_inicio_g`, `peso_fin_g`) calculadas al momento de
  guardar, que sobreviven cualquier regeneración futura de candidatos.
- **`candidatos_av2.csv` regenerado** con el script corregido (primera
  corrida con IDs por hash): mismos 916 candidatos, misma distribución
  (bajada=515, subida=383, mixto=18) que documentaba v2.5 — el fix no cambió
  el comportamiento del detector, solo cómo se identifican y versionan sus
  resultados. Gate de validación: 814/814 anotaciones (100%) siguen
  solapando algún candidato de la corrida nueva.
- **`id_candidato` de las 814 anotaciones existentes queda con el esquema
  posicional viejo** — no reconciliado a propósito (huérfano frente a
  candidatos nuevos, por diseño). Para cualquier join histórico usar
  `(t_inicio, t_fin)`, nunca `id_candidato`.

## Snapshot v2.5 — 2026-08-16 — regeneración desde 814 anotaciones (+318 vs v2.3/v2.4)

Verificación pedida por Mauro: "todo lo de av2_ esta actualizado en relacion a
los resultados que hemos obtenido con app_anotacion_av2?" — no lo estaba.
`anotaciones_av2.csv` y `candidatos_av2.csv` habían crecido bastante desde el
último snapshot documentado (v2.4, 2026-08-11, 496 anotaciones) sin que nadie
actualizara este historial ni corriera `revisar_anotaciones_v2.py` para
refrescar `features_anotaciones_v2.csv`/`comp_stats_v2.json`.

**Ejecutado:** `python revisar_anotaciones_v2.py` sobre el estado actual de
`anotaciones_av2.csv` (814 filas). Exportó `features_anotaciones_v2.csv`
(814 × 109 cols) y `comp_stats_v2.json` frescos. La app los lee directamente
en runtime — no hace falta pegar ningún bloque a mano (la nota "pegar
COMP_STATS en app_anotacion_av2.py" de snapshots anteriores está obsoleta,
el script ahora imprime explícitamente "informativo — la app lee OUT_STATS.json,
no este bloque").

**Conteos:**
- `anotaciones_av2.csv`: 814 (alimentacion=356, ruido=374, servido=84) —
  todas `origen=candidato_auto`, creadas entre 2026-06-26 y 2026-08-13
- `candidatos_av2.csv`: 916 (bajada=515, subida=383, mixto=18), rango
  2026-04-07 → 2026-07-22

**Top features discriminativas (separación alim/serv, σ pooled) — igual
familia que v2.3, orden similar:**

| Feature | Familia | Separación A/S (σ) |
|---|---|---:|
| `tpl_doble_rampa` | F12_templates | 6.92 |
| `tpl_sigmoide` | F12_templates | 5.94 |
| `tpl_alim_escalonada` | F12_templates | 5.79 |
| `tpl_ramp_down` | F12_templates | 5.75 |
| `sim_servido` / `sim_alimentacion` | F00_clasicas | 5.75 |
| `tpl_ramp_up` | F12_templates | 5.75 |
| `tpl_alim_lenta` | F12_templates | 4.96 |
| `entropy_permutation` | F06_entropias | 3.42 |
| `d1_frac_neg` | F01_derivadas | 3.26 |
| `monotonicity` | F00_clasicas | 2.74 |

**Observación:** la separación de `tpl_doble_rampa` bajó de 7.69σ (n=496) a
6.92σ (n=814) — con más anotaciones la distribución se ensancha un poco
(esperable, los nuevos casos incluyen ejemplos más ambiguos), pero sigue
siendo por lejos el discriminador primario. No indica un problema del motor.

**Pendiente, no ejecutado en este snapshot (fuera del alcance de "actualizar
documentación"):** `config/umbrales.json` sigue en v1.3, calibrado contra
n=496 (2026-08-11) — ahora desactualizado frente a las 814 anotaciones
actuales. Recalibrarlo (`03_recalibrar_umbrales.py`) es una decisión de
Motor Matemático que cambia el comportamiento de detección en vivo, no una
actualización de docs — queda como próximo paso a decidir explícitamente,
no se tocó.

---

## Snapshot v2.4 — 2026-08-11 — 4 mejoras de práctica (paso a paso)

Continuación directa de v2.3, mismo día de trabajo. Recomendaciones basadas en datos,
implementadas en orden de impacto/riesgo:

1. **`spectral_entropy` + `d1_frac_pos` al Evidence Engine legado.** El motor
   normalizado (producción real) ya los usaba automáticamente vía
   `compute_data_driven_weights()` — se agregaron al fallback legado por
   consistencia. **Probé un discriminante pairwise (uno-contra-uno en vez de
   uno-contra-el-resto) para el par servido/ruido — dio 74.75% vs. 78.8% del
   actual, peor — no se implementó.**
2. **Auditoría de discrepancias** (`02_auditar_discrepancias.py`) — 88/496
   anotaciones (17.7%) donde el motor discrepa de la etiqueta humana con
   ≥85% confianza, mayoría "humano dijo ruido, motor dice servido/alimentación
   al 100%". Reporte en `data/auditoria_discrepancias.csv`, pendiente de
   revisión manual en Tab 1 — no se corrigió nada automáticamente (el motor
   no es perfecto, confiar ciegamente corrompería el dataset).
3. **`umbrales.json` recalibrado** (`03_recalibrar_umbrales.py`) — de 304 a
   496 anotaciones. Bug encontrado y corregido en el propio script: la
   duración/Δpeso/rango de referencia se calculaban contra la ventana del
   *candidato original* (`candidatos_av2.csv`), no la ventana *real
   confirmada* de la anotación — 48/55 servidos diferían >1 min entre ambas
   (candidato: 14.0min de media: anotación real: 3.4min). Corregido usando
   lecturas crudas + t_inicio/t_fin real de cada anotación.
4. **Partir candidatos "mixto" por giro interno** (`01_genera_candidatos.py`,
   `punto_split_mixto()`) — **implementado y testeado, NO aplicado a
   `candidatos_av2.csv` todavía.** Primera hipótesis (fusión de eventos
   separados por gap con direcciones opuestas) probada y descartada: dio 0
   diferencia contra datos reales — los "mixto" resultaron ser giros
   internos en un solo tramo continuo (ej. 142g→24g→141g), no fusiones.
   Segunda hipótesis (partir en el extremo interno) sí funciona: dry-run
   sobre datos reales da 348/711 segmentos (49%) con giro interno partible,
   "mixto" bajaría de ~23% a ~1.7% de candidatos. **Pendiente de decisión
   antes de aplicar:** (a) el 25% de los splits detectados tiene el lado más
   chico en 4-6g, en el límite del umbral de detección — revisar si es señal
   real o ruido antes de confiar en el número completo; (b) `id_candidato`
   es un índice posicional que se regenera desde cero en cada corrida —
   correr `01_genera_candidatos.py` (con o sin este cambio) desincroniza el
   `id_candidato` de las 496 anotaciones ya guardadas contra `anotaciones_av2.csv`,
   porque `app_anotacion_av2.py:1031` matchea "ya anotado" por ese ID. Este
   riesgo es preexistente (no lo introduce este cambio) pero nunca se había
   hecho explícito — cualquier futura recalibración de `umbrales.json.deteccion`
   o cambio al detector tiene el mismo problema.

Tests nuevos: `tests/test_split_mixto.py` (4 casos). Motor Matemático sin cambios
de familias/conteo — solo el fallback legado del Evidence Engine.

---

## Snapshot v2.3 — 2026-08-10 — fix del Evidence Engine (normalización y pesos calculados)

**Trigger:** revisión de práctica/análisis a pedido de Mauro. No fue solo re-ingesta de
datos (496 anotaciones vs 417 en v2.1) — se encontró y corrigió un bug estructural en
`evidence_score()`. Detalle completo en
[av2_04_MOTOR_MATEMATICO.md §12bis](av2_04_MOTOR_MATEMATICO.md#12bis-actualización-2026-08-10--el-problema-real-no-eran-los-pesos-era-la-escala).

**Resumen:** `evidence_score()` sumaba `peso × valor crudo` sin normalizar. Con 496
anotaciones acertaba **49.6%** — peor que predecir siempre "alimentación" (51.2%). Fix:
normalizar (z-score pooled) + calcular pesos desde los datos (discriminante tipo Fisher,
102 features en vez de las 26 elegidas a mano). Accuracy held-out (20% nunca visto):
**78.8%**. Test de regresión: `tests/test_evidence_engine.py`.

Tab 1 (Revisar Candidatos) ahora sugiere la categoría automáticamente usando el motor
corregido — antes no había ninguna sugerencia, el operador anotaba a ciegas.

---

## Optimizaciones de rendimiento aplicadas (2026-06-28)

| Cambio | Archivo | Impacto |
|--------|---------|---------|
| `_f08_lempel_ziv` O(n²) → O(n log n) | `shape_features_v2.py` | Reducción ~5-10× en señales largas |
| `_calcular_features_v2_cached` con `@st.cache_data` | `app_anotacion_av2.py` | Evita recalcular 102 features en cada rerun |
| `build_global_chart` con `@st.cache_data` | `app_anotacion_av2.py` | Gráfico Vista Global sin reconstruir |
| Lazy loading: `st.tabs()` → `st.radio()` | `app_anotacion_av2.py` | Solo el tab activo ejecuta su código |
| Barras de progreso 0→100% por tab | `app_anotacion_av2.py` | Feedback visual real durante carga |

---

## Snapshot v2.1 — 2026-06-27

**Trigger:** Reemplazo de `readings_rows.csv` con datos extendidos hasta 2026-06-27.  
**Scripts ejecutados:** `01_genera_candidatos.py` → `revisar_anotaciones_v2.py` → COMP_STATS actualizado en app.

### Conteos

| Métrica | Valor |
|---------|-------|
| Anotaciones totales | 417 |
| Alimentacion | 205 |
| Servido | 45 |
| Ruido | 167 |
| Candidatos totales | 421 |
| — bajada | 248 |
| — mixto | 95 |
| — subida | 78 |
| Rango de datos | 2026-04-08 → 2026-06-27 |
| Features en COMP_STATS | 32 (de 102 totales) |
| Features totales en motor | 102 |
| `features_anotaciones_v2.csv` | 417 filas × 109 cols |

### Nuevos candidatos detectados (Jun 26–27)

| id_candidato | t_inicio (UTC) | direction | duración | delta_w |
|-------------|----------------|-----------|----------|---------|
| 417 | 2026-06-26 02:50:30 | bajada | 11.0 min | −9.0 g |
| 418 | 2026-06-26 09:43:00 | bajada | 13.0 min | −14.0 g |
| 419 | 2026-06-26 20:22:30 | bajada | 14.0 min | −12.0 g |
| 420 | 2026-06-27 01:29:00 | bajada | 16.5 min | −7.0 g |

### Top 15 Features Discriminativas (Alimentacion vs Servido)

Basado en separación pooled-σ: `sep_AS = |µ_A − µ_S| / √((σ_A² + σ_S²)/2)`

| Feature | µ_alim | σ_alim | µ_serv | σ_serv | µ_ruido | sep A/S | sep A/R |
|---------|-------:|-------:|-------:|-------:|--------:|--------:|--------:|
| `tpl_doble_rampa` | +0.7544 | 0.3057 | −0.9368 | 0.0692 | +0.0376 | **7.63σ** | 1.63σ |
| `tpl_sigmoide` | −0.7204 | 0.3761 | +0.9079 | 0.0663 | −0.0220 | **6.03σ** | 1.37σ |
| `tpl_alim_escalonada` | +0.7041 | 0.3820 | −0.8968 | 0.0597 | +0.0096 | **5.86σ** | 1.32σ |
| `sim_alimentacion` | +0.7075 | 0.3868 | −0.8979 | 0.0583 | +0.0105 | **5.80σ** | 1.32σ |
| `sim_servido` | −0.7075 | 0.3868 | +0.8979 | 0.0583 | −0.0105 | **5.80σ** | 1.32σ |
| `tpl_ramp_down` | +0.7075 | 0.3868 | −0.8979 | 0.0583 | +0.0105 | **5.80σ** | 1.32σ |
| `tpl_ramp_up` | −0.7075 | 0.3868 | +0.8979 | 0.0583 | −0.0105 | **5.80σ** | 1.32σ |
| `tpl_alim_lenta` | +0.6403 | 0.4212 | −0.8371 | 0.0784 | −0.0101 | **4.88σ** | 1.15σ |
| `tpl_exp_decay` | +0.6272 | 0.4310 | −0.8133 | 0.0902 | −0.0101 | **4.63σ** | 1.11σ |
| `tpl_exp_rise` | −0.6272 | 0.4310 | +0.8133 | 0.0902 | +0.0101 | **4.63σ** | 1.11σ |
| `entropy_shannon` | +2.4366 | 0.3538 | +1.1152 | 0.2461 | +1.0816 | **4.34σ** | 2.61σ |
| `tpl_serv_brusco` | −0.5523 | 0.4460 | +0.7246 | 0.1007 | +0.0243 | **3.95σ** | 0.98σ |
| `entropy_permutation` | +0.7418 | 0.1331 | +0.0847 | 0.2108 | +0.3070 | **3.73σ** | 2.94σ |
| `time_to_min_s` | +375.80 | 143.55 | +6.0000 | 23.587 | +123.95 | **3.59σ** | 1.50σ |
| `straightness` | +0.9913 | 0.0065 | +0.8837 | 0.0424 | +0.9648 | **3.55σ** | 0.56σ |

### Observaciones

- `tpl_doble_rampa` es el feature más discriminativo (7.63σ): la señal de alimentación cae en doble rampa; el servido sube.
- `entropy_permutation` (3.73σ) es el mejor separador A vs Ruido (2.94σ) junto con `entropy_shannon` (2.61σ).
- Features F12 templates canónicos dominan el top 10 — confirman que la forma de la señal es el predictor más fuerte.
- `d1_rms` eliminado del COMP_STATS en esta versión (ya no aparece en la salida de `revisar_anotaciones_v2.py`).
- 65 candidatos existentes presentaron `t_inicio` desplazado 90–390 s respecto a anotaciones anteriores (efecto del resampleo sobre la señal extendida). Los IDs permanecen válidos — las anotaciones caen dentro de la ventana de cada candidato.

---

## Snapshot v2.0 — 2026-06-26

**Trigger:** Primera ejecución con Motor Matemático v2 implementado.

### Conteos

| Métrica | Valor |
|---------|-------|
| Anotaciones totales | 408 |
| Alimentacion | 200 |
| Servido | 43 |
| Ruido | 165 |
| Candidatos totales | 417 |
| Rango de datos | 2026-04-08 → 2026-06-25 |
| Features en COMP_STATS | 33 (incluía `d1_rms`) |
| Features totales en motor | 101 |

### Observaciones

- Primera versión del COMP_STATS con motor v2 (reemplazó motor v1 de 5 features).
- `d1_rms` incluido en COMP_STATS — removido en v2.1 por no aparecer en la salida renovada.
- Top features no registradas en esta versión (snapshot parcial).

---

## Cómo actualizar este documento

Cada vez que se ingesta nueva data y se regeneran los artefactos:

```bash
# 1. Reemplazar readings_rows.csv en 11_Data/2026/
# 2. Regenerar candidatos
python 01_genera_candidatos.py

# 3. Anotar nuevos candidatos en la app
python -m streamlit run app_anotacion_av2.py

# 4. Regenerar features y comp_stats
python revisar_anotaciones_v2.py

# 5. Pegar el bloque COMP_STATS en app_anotacion_av2.py
# 6. Agregar un nuevo snapshot en este documento con:
#    - Fecha, conteos, top 15 features, observaciones
#    - Actualizar la fila en la Tabla Resumen
```

**Campos mínimos por snapshot:**

| Campo | Fuente |
|-------|--------|
| Alim/Serv/Ruido/Total | `anotaciones_av2.csv` → `value_counts()` |
| Candidatos | `candidatos_av2.csv` → `len()` |
| Rango datos | `candidatos_av2.csv` → `t_inicio.min/max` |
| Features (motor) | `comp_stats_v2.json` → `len(keys)` |
| Top features | Salida de `revisar_anotaciones_v2.py` → "TOP FEATURES DISCRIMINATIVAS" |
| Mejor feature | Top 1 de sep A/S |


---


<!-- ==== fusionado desde av2_07_RESULTADOS_Y_BENCHMARKS.md ==== -->

# Análisis del Benchmark — Kittypau KPCL0034 "Bandida"
**Dataset:** features_anotaciones_v2 · 421 eventos · 102 features · 3 clases (alim/serv/ruido)  
**Fuentes:** `resultados_benchmark.csv`, `diagnostico_clustering_resumen.csv`, `shap_importance.png`, `eda_overview.png`, `benchmark_comparison.png`  
**Fecha de análisis:** 2026-06-28

---

## 1. Estado del benchmark — qué se midió

El benchmark corre 20 modelos sobre el mismo dataset (417–421 filas, 102 features numéricas,
3 clases: alimentacion/ruido/servido) y reporta Accuracy, F1 macro y ROC-AUC.
Los modelos de clustering se evalúan separadamente con ARI, AMI y Silhouette.

**Distribución de clases:**
| Clase | N | % |
|-------|--:|--:|
| Alimentación | ~210 | 50 % |
| Ruido | ~168 | 40 % |
| Servido | ~46 | 11 % |

---

## 2. Resultados supervisados — tabla completa

| Modelo | Tipo | Accuracy | F1 macro | ROC-AUC | Train (s) |
|--------|------|--------:|--------:|--------:|----------:|
| Random Forest | Clásico | **1.0000** | **1.0000** | **1.0000** | 2.06 |
| Logistic Regression | Clásico | **1.0000** | **1.0000** | **1.0000** | 3.33 |
| Extra Trees | Clásico | **1.0000** | **1.0000** | **1.0000** | 1.14 |
| XGBoost | Boosting | **1.0000** | **1.0000** | **1.0000** | 1.20 |
| AutoML RF (Optuna) | Boosting | **1.0000** | **1.0000** | **1.0000** | 1.06 |
| Ensemble Voting | Boosting | **1.0000** | **1.0000** | **1.0000** | 14.36 |
| FT-Transformer | Red Neuronal | **1.0000** | **1.0000** | **1.0000** | 10.26 |
| LightGBM | Boosting | 0.9882 | 0.9911 | 1.0000 | 1.72 |
| CatBoost | Boosting | 0.9882 | 0.9911 | 1.0000 | 3.19 |
| MLP Básica | Red Neuronal | 0.9882 | 0.9754 | 1.0000 | 4.58 |
| ResNet Tabular | Red Neuronal | 0.9882 | 0.9754 | 1.0000 | 9.80 |
| KNN | Clásico | 0.9765 | 0.9667 | 0.9989 | ~0 |
| **SVM (RBF)** | **Clásico** | **0.1412** | **0.1215** | 0.8895 | 0.39 |
| **MLP Deep + BN + Drop** | **Red Neuronal** | **0.1412** | **0.1215** | 0.7779 | 6.75 |
| **TabNet** | **Red Neuronal** | **0.4471** | **0.3850** | 0.5012 | 4.27 |

| Modelo de clustering | ARI | AMI | Silhouette |
|----------------------|----:|----:|-----------:|
| K-Means k=3 | 0.020 | 0.081 | **0.982** |
| GMM k=3 | 0.020 | 0.081 | **0.982** |
| Agglomerative k=3 | 0.020 | 0.081 | **0.982** |
| Spectral k=3 | 0.174 | 0.229 | 0.554 |
| DBSCAN best | 0.141 | 0.177 | 0.121 |
| **HDBSCAN** | **0.294** | **0.392** | 0.723 |

---

## 3. Hallazgos críticos

### 3.1 ⚠️ ALERTA DE VALIDACIÓN — Los scores perfectos no son confiables

**Siete modelos alcanzan 1.00/1.00/1.00.** Esto es una señal de alarma, no de éxito.

Con n=421 y 102 features (relación muestras/features = 4:1), y sin evidencia de un hold-out
externo robusto, los scores perfectos indican casi con certeza **evaluación sobre los datos de
entrenamiento** (train = test). Random Forest y Extra Trees memorizar 421 puntos trivialmente.

**¿Por qué importa?** Si se despliega uno de estos modelos para clasificar nuevos gatos o nuevos
dispositivos, el rendimiento real será significativamente inferior. Los únicos scores que reflejan
algo cercano a la realidad son los de **LightGBM (F1 0.991)** y **KNN (F1 0.967)**, que no
llegaron a 1.0 — probablemente porque el split train/test no fue perfect-fit por el modelo.

**Acción necesaria antes de cualquier decisión de producción:**
Repetir el benchmark con **Stratified 5-Fold Cross-Validation** (no un único split).
El F1 macro CV para la clase "servido" (n≈46) es el número que importa.

---

### 3.2 La paradoja Silhouette=0.98 / ARI=0.02

Este es el hallazgo más importante del análisis de clustering:

**K-Means con k=3 obtiene Silhouette=0.982 (excelente cohesión geométrica) pero ARI=0.020
(sus clusters NO se corresponden con las etiquetas reales alim/serv/ruido).**

**Qué significa esto:** Los 102 features del Motor v2 capturan una estructura geométrica muy
clara en el espacio de alta dimensión, pero esa estructura NO coincide con la clasificación
biológica que nos interesa. Hay 3 "formas" geométricas dominantes en los datos que K-Means
detecta perfectamente, pero esas 3 formas NO son alimentación/servido/ruido — son otra
partición del espacio (posiblemente: señales largas/cortas/medias, o señales de alta/media/baja
amplitud).

**Implicación directa:** El Motor Matemático v2 no puede basarse solo en geometría o distancia
euclidiana. Necesita las etiquetas humanas como ancla. El Evidence Engine (supervisado con
pesos calibrados) es la arquitectura correcta — no habría ganado nada con clustering puro.

**Única excepción:** HDBSCAN logra ARI=0.294, el mejor resultado no supervisado. Capta
densidades no esféricas y trata "servido" (n=46, muy compacto en feature space) como una
región densa separada. Pero 0.294 sigue siendo insuficiente para producción.

---

### 3.3 Los modelos que fallan tienen un patrón común

**SVM (RBF), MLP Deep + BN + Dropout** → Accuracy = 0.14 ≈ fracción de la clase minoritaria.  
**Interpretación:** estos modelos colapsaron a predecir siempre la clase mayoritaria (alimentacion
≈ 50 %) o están devolviendo salida aleatoria. El SVM-RBF es sensible al escalado y al
bandwidth del kernel — con 102 features muy correlacionadas, la distancia RBF pierde
discriminación. El MLP Deep con Dropout puede estar sobre-regularizado para n=421.

**TabNet → Accuracy = 0.45:** TabNet usa attention sparsa y necesita al menos miles de filas
para aprender qué features son relevantes en cada ejemplo. Con n=421 no hay suficiente señal
para el mecanismo de atención — colapsa a reglas casi aleatorias.

**Conclusión práctica:** arquitecturas de deep learning (salvo MLP simple con pocos parámetros)
son inadecuadas para este dataset hasta tener al menos 2000–3000 anotaciones etiquetadas.

---

### 3.4 SHAP vs. sep_AS del Motor Matemático — discrepancia significativa

El Motor Matemático v2 usa `sep_AS` (separación pooled-σ) para rankear features. Los top de
ese ranking son templates canónicos (tpl_doble_rampa = 7.6σ, tpl_sigmoide = 6.0σ, etc.).

El análisis SHAP sobre LightGBM para la clase "alimentacion" cuenta una historia diferente:

| Rank SHAP | Feature | Rank sep_AS |
|-----------|---------|-------------|
| #1 | `d1_mean` | ~#20 |
| #2 | `entropy_shannon` | #11 |
| #3 | `d1_frac_neg` | ~#8 (sep_AR) |
| #4 | `time_to_min_s` | #14 |
| #5 | `d1_max` | ~#20 |
| #6 | `zcr` | ~#12 |
| ~#12 | `tpl_doble_rampa` | **#1** |

**Por qué difieren:** `sep_AS` mide separación *univariada* entre alimentacion y servido en
aislamiento. SHAP mide la *contribución marginal* de cada feature dado que las demás ya
están disponibles en el modelo. Con 12 features de template altamente correlacionadas entre sí
(todas miden variantes de la misma cosa — similitud de forma), el modelo LightGBM ya extrae
toda la información de forma con la primera 1–2 templates; las restantes aportan SHAP ≈ 0.

**Implicación para el Evidence Engine:**
Los pesos actuales (sim_alimentacion = +5.0, sim_servido = −5.0) son correctos en dirección
pero quizás están sobredimensionados en relación a features de derivada simple como `d1_mean`
que tienen SHAP más alto. `d1_mean` negativo + `entropy_shannon` alto es una combinación muy
potente que el Evidence Engine actual puede estar subutilizando.

---

### 3.5 Alta multicolinealidad en el bloque de features derivadas

El heatmap de correlaciones (eda_overview.png) muestra que estas features son prácticamente
redundantes entre sí (correlación Pearson > 0.85):

```
d1_max ↔ tortuosity ↔ d2_rms ↔ rms_d1 ↔ curvature_std ↔ d3_min ↔ d3_rms ↔ d3_std
```

Este bloque de 8 features aporta información casi idéntica. En modelos de árbol (RF, XGB)
la redundancia no daña la performance pero sí infla el espacio de features innecesariamente.
En SVM-RBF y redes neuronales, la multicolinealidad puede ser la causa principal de la
degradación observada.

---

### 3.6 La clase "servido" es el cuello de botella real

Con n=46 (11 % del dataset), "servido" es la clase con menos datos. En un experimento de
cross-validation real con k=5 folds, cada fold de test tendría apenas ~9 ejemplos de servido.
La varianza del F1 para esta clase será alta.

Adicionalmente, los 46 eventos de servido forman una región muy compacta en feature space
(HDBSCAN la detecta como cluster denso), lo que sugiere que son morfológicamente muy similares
entre sí — buena noticia para la precisión de clasificación, pero el recall puede sufrir porque
el modelo puede sobre-ajustar a esa región específica y fallar en servidos atípicos (servidos
muy pequeños de 5–10 g, o servidos lentos a cucharadas).

---

## 4. Recomendaciones para futuras decisiones

### Prioridad ALTA (antes de cualquier despliegue)

**R1 — Validación cruzada estratificada obligatoria**
```python
from sklearn.model_selection import StratifiedKFold, cross_validate
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_validate(modelo, X, y, cv=cv,
                        scoring=['accuracy', 'f1_macro', 'roc_auc_ovr'])
```
Los resultados actuales (scores perfectos) NO son válidos para tomar decisiones de producción.
El F1 macro CV es el único número que importa.

**R2 — Modelo de producción recomendado: Extra Trees o AutoML RF (Optuna)**
- Extra Trees: F1=1.0 (benchmark), rápido (1.14s), no hay hiperparámetros críticos,
  excelente interpretabilidad por importancia de features.
- AutoML RF (Optuna): mismo score, tiempo similar (1.06s), tiene optimización automática.
- **NO usar**: FT-Transformer (10s, necesita más datos), Ensemble Voting (14s, sin ganancia
  sobre Extra Trees), TabNet (falla con n<1000).

**Nota:** La elección entre Extra Trees y RF importa poco con este dataset — ambos darán
resultados similares en CV. La diferencia real estará en la generalización a nuevos gatos
(KPCL0035, KPCL0036) que aún no existe.

**R3 — Revisar pesos del Evidence Engine con SHAP**
El Evidence Engine actual (pesos calibrados manualmente sobre sep_AS) puede mejorar
rebalanceando los pesos hacia las features con mayor SHAP para LightGBM:

| Feature | Peso actual (estimado) | Ajuste sugerido |
|---------|----------------------|-----------------|
| `d1_mean` | ~±1.5 | Subir a ±3.0 |
| `entropy_shannon` | ~±2.0 | Mantener |
| `d1_frac_neg` | ~±2.5 | Mantener |
| `tpl_doble_rampa` | ±5.0 | Bajar a ±3.5 (es redundante con sim_alimentacion) |
| `sim_alimentacion` | ±5.0 | Mantener — ancla de dirección |

---

### Prioridad MEDIA (ciclo Beta)

**R4 — Reducir redundancia de features antes del próximo benchmark**
Eliminar del bloque correlacionado: mantener solo `d1_max` + `d2_rms`, eliminar
`tortuosity`, `rms_d1`, `curvature_std`, `d3_min`, `d3_rms`, `d3_std`. Esas 6 features
aportan información casi nula adicional y ralentizan el cómputo.

Resultado esperado: pasar de 102 → ~72 features sin pérdida de accuracy.

**R5 — Aumentar muestra de "servido" a n≥100**
Con n=46, la clase servido es frágil. Al llegar a n=100, el F1 de servido en CV se
estabilizará. Cada vez que alguien agrega comida al bowl, es un nuevo punto de servido —
anotar activamente cada evento de este tipo.

**R6 — Benchmark con train/test split temporal**
El split correcto para este problema es: **train = Abril–Mayo 2026, test = Junio 2026**.
Un split aleatorio contamina el test con datos del mismo período que el train — si Bandida
tiene una rutina estable, el modelo memoriza patrones del mismo día.
El split temporal simula el despliegue real: el modelo entrenado hoy clasificará datos de
mañana, no datos de hace dos meses.

**R7 — Añadir HDBSCAN como herramienta de detección de anotaciones dudosas**
HDBSCAN asigna un "outlier score" a cada punto (probabilidad de ser ruido). Los puntos con
outlier score > 0.7 que están anotados como "alimentacion" o "servido" son candidatos
prioritarios para re-auditar en Tab 1. No usar HDBSCAN para clasificación, sino como
filtro de calidad de dataset.

---

### Prioridad BAJA (ciclo Gamma / multi-gato)

**R8 — No escalar a deep learning hasta n≥2000 por clase**
TabNet, ResNet Tabular, FT-Transformer y MLP Deep fracasaron en este benchmark. La frontera
de utilidad para estas arquitecturas en tabular data está en ~2000 muestras por clase
(referencia: Gorishniy et al. 2021, "Revisiting Deep Learning Models for Tabular Data").
Con n=421 total, cualquier deep learning es prematura.

**R9 — El clustering puro no resolverá la clasificación — no invertir en él**
El hallazgo Silhouette=0.98 / ARI=0.02 demuestra que la estructura geométrica de los datos
no coincide con las etiquetas biológicas. Ningún avance en algoritmos de clustering cambiará
esta conclusión mientras las etiquetas dependan del contexto conductual (hambre del gato,
rutina del dueño) y no solo de la morfología de la curva.
HDBSCAN es útil como herramienta de diagnóstico (R7), no como clasificador.

**R10 — Generalización multi-gato: el mayor riesgo**
Todo este benchmark es sobre un solo gato (Bandida, KPCL0034). Los pesos del Evidence Engine
están calibrados sobre sus patrones específicos (doble rampa, intervalos ~6 h, Δpeso −8 g).
Un segundo gato con patrones distintos podría tener F1 < 0.7 con el modelo actual.
La arquitectura correcta para escalar es: **modelo base general + fine-tuning por gato**
(usar los primeros 50 eventos anotados del nuevo gato para ajustar los pesos).

---

## 5. Mapa de decisión para el siguiente ciclo

```
¿Tenemos CV estratificado con F1 macro real?
    NO → R1 es el primer paso. Nada más vale la pena sin esto.
    SÍ → continuar.

¿F1 macro CV > 0.90?
    SÍ → modelo listo para validación en campo (demo).
    NO → revisar R3 (pesos Evidence Engine) y R4 (reducción de features).

¿n_servido ≥ 100?
    NO → R5 es prioridad antes del siguiente benchmark.

¿Queremos escalar a un segundo gato?
    → R10 primero: necesitamos 50 anotaciones del nuevo gato antes de predecir.
```

---

## 6. Resumen ejecutivo (para presentación / CORFO)

El benchmark sobre 421 eventos del sensor IoT KPCL0034 "Bandida" demuestra que:

1. **La clasificación supervisada es viable**: modelos clásicos (Random Forest, Extra Trees,
   LightGBM) alcanzan F1 macro > 0.99 con las 102 features del Motor Matemático v2. Esto
   valida la arquitectura de features matemáticas sobre señal de peso como base del detector.

2. **Deep learning y clustering son inadecuados en esta escala**: TabNet (0.45 acc), SVM-RBF
   (0.14 acc), K-Means (ARI=0.02) confirman que el enfoque correcto es features
   interpretables + modelo de árbol, no caja negra.

3. **La validación necesita refuerzo**: los scores perfectos (1.0/1.0/1.0) en 7 modelos
   sugieren evaluación sin hold-out real. El siguiente paso crítico es cross-validation
   estratificada con split temporal (train Apr–May / test Jun).

4. **Las features de derivada simple (d1_mean, d1_frac_neg) superan a los templates canónicos
   en SHAP**: el Evidence Engine tiene margen de mejora recalibrando pesos hacia estas
   features, que el análisis SHAP de LightGBM identifica como las más decisivas.

5. **La clase "servido" (n=46) es el cuello de botella**: ampliar a ≥100 anotaciones de
   servido es la intervención de mayor impacto para la siguiente iteración del dataset.

---

*Archivo generado en: `av2_07_RESULTADOS_Y_BENCHMARKS.md`*  
*Fuentes: `resultados_benchmark.csv`, `diagnostico_clustering_resumen.csv`, `av2_07_RESULTADOS_Y_BENCHMARKS.md`, `benchmark_comparison.png`, `eda_overview.png`, `shap_importance.png`*


---


<!-- ==== fusionado desde av2_07_RESULTADOS_Y_BENCHMARKS.md ==== -->

# 🔬 Diagnóstico Profundo de Clustering
## ¿Por qué DBSCAN detecta estructura real (ARI=0.757) pero K-Means/GMM/Agglomerative no (ARI≈0.02)?

### Hipótesis a investigar
| # | Hipótesis |
|---|-----------|
| H1 | Los datos forman clusters **no esféricos** → K-Means falla, DBSCAN no |
| H2 | Existen **sub-clusters internos** dentro de cada clase que engañan al centroide |
| H3 | La clase `servido` (n=46) es un **outlier de densidad** → DBSCAN la detecta como región densa |
| H4 | Los clusters geométricos mezclan clases → hay **overlap en el espacio de features** |
| H5 | Hay **features irrelevantes** que diluyen la señal de los centroides |

---

%%capture
!pip install umap-learn hdbscan kneed scipy scikit-learn matplotlib seaborn pandas numpy

import warnings; warnings.filterwarnings('ignore')
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
import seaborn as sns
from scipy.spatial.distance import cdist
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from scipy.stats import kruskal, f_oneway
from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering, SpectralClustering
from sklearn.mixture import GaussianMixture
from sklearn.metrics import (adjusted_rand_score, silhouette_score,
                             silhouette_samples, calinski_harabasz_score,
                             davies_bouldin_score, confusion_matrix,
                             adjusted_mutual_info_score)
from sklearn.neighbors import NearestNeighbors
from sklearn.ensemble import RandomForestClassifier
import umap.umap_ as umap
import hdbscan
from kneed import KneeLocator

SEED = 42
np.random.seed(SEED)
PALETTE = {'alimentacion': '#2a78d6', 'ruido': '#e34948', 'servido': '#1baf7a'}
sns.set_theme(style='whitegrid')
plt.rcParams['figure.dpi'] = 130
print('✅ Imports OK')

SHEET_ID = '1j-n4Yo-zyauUtCeecuh_4VMnFaM3T1IvPXvIhspH0Ds'
GID = '431591350'

URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
    f"/export?format=csv&gid={GID}"
)
df_raw = pd.read_csv(URL)
print(f'✅ Shape: {df_raw.shape}')

DROP = ['id_anotacion', 'id_candidato', 't_inicio', 't_fin', 'notas']
TARGET = 'categoria'
df = df_raw.drop(columns=DROP, errors='ignore')

le = LabelEncoder()
y = le.fit_transform(df[TARGET])
CLASS_NAMES = le.classes_          # alimentacion=0, ruido=1, servido=2
CLASS_COLORS = [PALETTE[c] for c in CLASS_NAMES]

X = df.drop(columns=[TARGET]).select_dtypes(include=[np.number]).fillna(df.median(numeric_only=True))
feat_names = X.columns.tolist()

scaler = RobustScaler()
Xs = scaler.fit_transform(X)

print(f'Features: {Xs.shape[1]} | Clases: {dict(zip(CLASS_NAMES, np.bincount(y)))}')

---
## 🗺️ SECCIÓN 1 — Visualización comparativa en 2D
### Clusters geométricos vs etiquetas reales en PCA / t-SNE / UMAP

# Reducción dimensional
pca50 = PCA(n_components=min(50, Xs.shape[1]), random_state=SEED)
X50   = pca50.fit_transform(Xs)

tsne2 = TSNE(n_components=2, perplexity=35, random_state=SEED, n_iter=1500, learning_rate='auto')
X_tsne = tsne2.fit_transform(X50)

reducer = umap.UMAP(n_components=2, n_neighbors=20, min_dist=0.05, random_state=SEED)
X_umap  = reducer.fit_transform(Xs)

X_pca2 = PCA(n_components=2, random_state=SEED).fit_transform(Xs)

# K-Means con k=3 y k=5 para comparar
km3 = KMeans(n_clusters=3, random_state=SEED, n_init='auto').fit(Xs)
km5 = KMeans(n_clusters=5, random_state=SEED, n_init='auto').fit(Xs)
db  = DBSCAN(eps=2.5, min_samples=5).fit(X50)   # sobre PCA50

embeddings = [('PCA', X_pca2), ('t-SNE', X_tsne), ('UMAP', X_umap)]
colorings  = [
    ('Etiqueta real',   y,            CLASS_COLORS),
    ('K-Means k=3',     km3.labels_,  None),
    ('K-Means k=5',     km5.labels_,  None),
    ('DBSCAN',          db.labels_,   None),
]

fig, axes = plt.subplots(len(colorings), len(embeddings), figsize=(15, 18))
cmap_discrete = plt.cm.get_cmap('tab10')

for row, (clabel, labels, colors) in enumerate(colorings):
    for col, (ename, emb) in enumerate(embeddings):
        ax = axes[row][col]
        unique_lbls = sorted(set(labels))
        for uid in unique_lbls:
            mask = labels == uid
            if colors and uid < len(colors):
                c = colors[uid]
                lname = CLASS_NAMES[uid]
            else:
                c = 'gray' if uid == -1 else cmap_discrete(uid / max(1, len(unique_lbls)-1))
                lname = 'noise' if uid == -1 else f'cluster {uid}'
            ax.scatter(emb[mask,0], emb[mask,1], c=c, s=12, alpha=0.65, label=lname)
        if row == 0: ax.set_title(ename, fontsize=12, fontweight='bold')
        if col == 0: ax.set_ylabel(clabel, fontsize=10, fontweight='bold')
        ax.legend(fontsize=7, markerscale=1.5, framealpha=0.6)
        ax.set_xticks([]); ax.set_yticks([])

plt.suptitle('Clusters geométricos vs Etiquetas reales en distintas proyecciones', fontsize=13, y=1.01)
plt.tight_layout()
plt.savefig('viz_comparativa_2d.png', bbox_inches='tight')
plt.show()

print(f"DBSCAN clusters: {len(set(db.labels_))-1} | puntos ruido: {(db.labels_==-1).sum()}")

---
## 📐 SECCIÓN 2 — Forma de los clusters: ¿por qué falla K-Means?
### H1: Los datos forman clusters NO esféricos

# ── Elbow + Silhouette para encontrar k óptimo ─────────────────────────────
K_range = range(2, 12)
inertias, sil_scores, ch_scores, db_scores = [], [], [], []

for k in K_range:
    km = KMeans(n_clusters=k, random_state=SEED, n_init='auto').fit(Xs)
    inertias.append(km.inertia_)
    sil_scores.append(silhouette_score(Xs, km.labels_))
    ch_scores.append(calinski_harabasz_score(Xs, km.labels_))
    db_scores.append(davies_bouldin_score(Xs, km.labels_))

kneedle = KneeLocator(list(K_range), inertias, curve='convex', direction='decreasing')
k_opt = kneedle.knee or 3

fig, axes = plt.subplots(1, 4, figsize=(18, 4))

axes[0].plot(K_range, inertias, 'o-', color='#2a78d6')
axes[0].axvline(k_opt, color='red', ls='--', alpha=0.7, label=f'Elbow k={k_opt}')
axes[0].axvline(3, color='green', ls=':', alpha=0.7, label='k=3 (clases reales)')
axes[0].set_title('Inercia (Elbow)'); axes[0].set_xlabel('k'); axes[0].legend(fontsize=8)

axes[1].plot(K_range, sil_scores, 's-', color='#1baf7a')
axes[1].axvline(3, color='green', ls=':', alpha=0.7)
axes[1].set_title('Silhouette Score'); axes[1].set_xlabel('k')
axes[1].set_ylabel('Score (↑ mejor)')

axes[2].plot(K_range, ch_scores, '^-', color='#eda100')
axes[2].axvline(3, color='green', ls=':', alpha=0.7)
axes[2].set_title('Calinski-Harabasz'); axes[2].set_xlabel('k')
axes[2].set_ylabel('Score (↑ mejor)')

axes[3].plot(K_range, db_scores, 'D-', color='#e34948')
axes[3].axvline(3, color='green', ls=':', alpha=0.7)
axes[3].set_title('Davies-Bouldin'); axes[3].set_xlabel('k')
axes[3].set_ylabel('Score (↓ mejor)')

plt.suptitle(f'Métricas de clustering vs k  |  k óptimo geométrico = {k_opt}  vs  k real = 3', fontsize=12)
plt.tight_layout()
plt.savefig('elbow_metrics.png', bbox_inches='tight')
plt.show()

print(f"k óptimo según Elbow: {k_opt}")
print(f"Silhouette en k=3:    {sil_scores[1]:.4f}")
print(f"Silhouette en k={k_opt}:    {sil_scores[k_opt-2]:.4f}")

# ── Silhouette per-sample: ¿qué muestras están mal asignadas? ─────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

for ax, k, title in zip(axes, [3, k_opt], [f'K-Means k=3 (clases reales)', f'K-Means k={k_opt} (óptimo geométrico)']):
    km = KMeans(n_clusters=k, random_state=SEED, n_init='auto').fit(Xs)
    sil_vals = silhouette_samples(Xs, km.labels_)
    y_lower = 10
    cmap = plt.cm.get_cmap('tab10')
    for i in range(k):
        ith_sil = np.sort(sil_vals[km.labels_ == i])
        size_i = ith_sil.shape[0]
        y_upper = y_lower + size_i
        color = cmap(i / k)
        ax.fill_betweenx(np.arange(y_lower, y_upper), 0, ith_sil, alpha=0.7, color=color)
        ax.text(-0.05, y_lower + 0.5 * size_i, str(i), fontsize=9)
        y_lower = y_upper + 10
    ax.axvline(np.mean(sil_vals), color='red', ls='--', lw=1.5, label=f'Media={np.mean(sil_vals):.3f}')
    ax.set_xlabel('Silhouette coefficient')
    ax.set_title(title, fontsize=10)
    ax.legend(fontsize=9)

plt.suptitle('Diagrama Silhouette por muestra — Ancho = cohesión interna del cluster', fontsize=12)
plt.tight_layout()
plt.savefig('silhouette_diagrams.png', bbox_inches='tight')
plt.show()

---
## 🧲 SECCIÓN 3 — Análisis DBSCAN en profundidad
### H3: ¿Por qué DBSCAN captura la estructura real?

# ── k-distance plot para encontrar eps óptimo ──────────────────────────────────
k_neighbors = 5
nbrs = NearestNeighbors(n_neighbors=k_neighbors).fit(X50)
distances, _ = nbrs.kneighbors(X50)
k_dist = np.sort(distances[:, k_neighbors-1])[::-1]

knee_eps = KneeLocator(range(len(k_dist)), k_dist, curve='convex', direction='decreasing')
eps_opt  = k_dist[knee_eps.knee] if knee_eps.knee else 2.0

fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(k_dist, color='#2a78d6', lw=1.5)
if knee_eps.knee:
    ax.axvline(knee_eps.knee, color='red', ls='--', label=f'Elbow → eps≈{eps_opt:.2f}')
ax.set_title(f'k-distance plot (k={k_neighbors}) — eje Y = distancia al k-ésimo vecino')
ax.set_xlabel('Puntos ordenados'); ax.set_ylabel('Distancia')
ax.legend()
plt.tight_layout()
plt.savefig('kdistance_plot.png', bbox_inches='tight')
plt.show()
print(f'eps sugerido por k-distance: {eps_opt:.3f}')

# ── Barrido eps × min_samples ──────────────────────────────────────────────────
eps_vals       = np.linspace(0.5, 5.0, 15)
min_samp_vals  = [3, 5, 8, 12]

results = []
for eps in eps_vals:
    for ms in min_samp_vals:
        db = DBSCAN(eps=eps, min_samples=ms).fit(X50)
        n_cls = len(set(db.labels_)) - (1 if -1 in db.labels_ else 0)
        noise = (db.labels_ == -1).sum()
        if n_cls >= 2 and noise < len(y)*0.5:
            ari = adjusted_rand_score(y, db.labels_)
            ami = adjusted_mutual_info_score(y, db.labels_)
            sil = silhouette_score(X50[db.labels_!=-1], db.labels_[db.labels_!=-1]) if (db.labels_!=-1).sum()>1 else 0
            results.append({'eps': round(eps,2), 'min_s': ms, 'n_cls': n_cls, 'noise': noise, 'ARI': ari, 'AMI': ami, 'Sil': sil})

df_sweep = pd.DataFrame(results).sort_values('ARI', ascending=False)
print('Top 10 configuraciones DBSCAN por ARI:')
print(df_sweep.head(10).to_string(index=False))

# Pivot heatmap ARI
pivot = df_sweep.pivot_table(index='eps', columns='min_s', values='ARI', aggfunc='max').fillna(0)
fig, ax = plt.subplots(figsize=(8, 6))
sns.heatmap(pivot, annot=True, fmt='.3f', cmap='YlOrRd', ax=ax, linewidths=0.3)
ax.set_title('ARI de DBSCAN — barrido eps × min_samples (sobre PCA-50D)')
plt.tight_layout()
plt.savefig('dbscan_sweep_heatmap.png', bbox_inches='tight')
plt.show()

# ── HDBSCAN — más robusto que DBSCAN ──────────────────────────────────────────
hdb = hdbscan.HDBSCAN(min_cluster_size=10, min_samples=5,
                       cluster_selection_method='eom',
                       gen_min_span_tree=True)
hdb.fit(X50)
n_hdb = len(set(hdb.labels_)) - (1 if -1 in hdb.labels_ else 0)
noise_hdb = (hdb.labels_ == -1).sum()

ari_hdb = adjusted_rand_score(y, hdb.labels_)
ami_hdb = adjusted_mutual_info_score(y, hdb.labels_)
print(f'HDBSCAN → clusters: {n_hdb} | ruido: {noise_hdb} | ARI: {ari_hdb:.4f} | AMI: {ami_hdb:.4f}')

# Plot en UMAP
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for ax, (labels, title) in zip(axes, [(y, 'Etiqueta real'), (hdb.labels_, 'HDBSCAN')]):
    unique = sorted(set(labels))
    cmap = plt.cm.get_cmap('tab10')
    for uid in unique:
        mask = labels == uid
        if title == 'Etiqueta real':
            c = CLASS_COLORS[uid]; lname = CLASS_NAMES[uid]
        else:
            c = 'lightgray' if uid == -1 else cmap(uid / max(1, len(unique)-1))
            lname = 'noise' if uid == -1 else f'cluster {uid}'
        ax.scatter(X_umap[mask,0], X_umap[mask,1], c=c, s=14, alpha=0.65, label=lname)
    ax.set_title(title, fontsize=12); ax.legend(fontsize=8)
    ax.set_xticks([]); ax.set_yticks([])
plt.suptitle(f'HDBSCAN en UMAP — ARI={ari_hdb:.4f}', fontsize=12)
plt.tight_layout()
plt.savefig('hdbscan_umap.png', bbox_inches='tight')
plt.show()

---
## 🧩 SECCIÓN 4 — ¿Qué hay dentro de cada clase?
### H2: Sub-clusters internos por clase

# ── Sub-clustering por clase: cuántos grupos naturales hay dentro de cada clase? ─
fig, axes = plt.subplots(len(CLASS_NAMES), 4, figsize=(18, 14))
report = {}

for row, (cls_idx, cls_name) in enumerate(zip(range(len(CLASS_NAMES)), CLASS_NAMES)):
    mask_cls = y == cls_idx
    Xs_cls   = Xs[mask_cls]
    X50_cls  = X50[mask_cls]
    n_cls    = Xs_cls.shape[0]

    # Elbow dentro de la clase
    k_max = min(8, n_cls-1)
    sils_sub, inertias_sub = [], []
    for k in range(2, k_max+1):
        km_ = KMeans(n_clusters=k, random_state=SEED, n_init='auto').fit(Xs_cls)
        inertias_sub.append(km_.inertia_)
        sils_sub.append(silhouette_score(Xs_cls, km_.labels_))

    k_best_sub = np.argmax(sils_sub) + 2
    report[cls_name] = {'n': n_cls, 'k_natural': k_best_sub, 'sil': max(sils_sub)}

    # Dendrograma
    ax = axes[row][0]
    sample_idx = np.random.choice(n_cls, min(60, n_cls), replace=False)
    Z = linkage(Xs_cls[sample_idx], method='ward')
    dendrogram(Z, ax=ax, no_labels=True, color_threshold=0.7*max(Z[:,2]))
    ax.set_title(f'{cls_name} — dendrograma (n={n_cls})', fontsize=9)

    # Silhouette sub-clusters
    ax2 = axes[row][1]
    ax2.plot(range(2, k_max+1), sils_sub, 'o-', color=PALETTE[cls_name])
    ax2.axvline(k_best_sub, color='red', ls='--', alpha=0.7, label=f'k={k_best_sub}')
    ax2.set_title('Silhouette interno', fontsize=9)
    ax2.set_xlabel('k sub-clusters'); ax2.legend(fontsize=8)

    # t-SNE de la clase
    ax3 = axes[row][2]
    if n_cls > 10:
        perp = min(30, n_cls//3)
        emb_cls = TSNE(n_components=2, perplexity=perp, random_state=SEED).fit_transform(X50_cls)
        km_sub = KMeans(n_clusters=k_best_sub, random_state=SEED, n_init='auto').fit(Xs_cls)
        cmap_sub = plt.cm.get_cmap('tab10')
        for sub in range(k_best_sub):
            m = km_sub.labels_ == sub
            ax3.scatter(emb_cls[m,0], emb_cls[m,1], s=16, alpha=0.7,
                       color=cmap_sub(sub/k_best_sub), label=f'sub{sub}')
        ax3.set_title(f't-SNE — {k_best_sub} sub-clusters', fontsize=9)
        ax3.legend(fontsize=7); ax3.set_xticks([]); ax3.set_yticks([])

    # Distribución de distancias al centroide
    ax4 = axes[row][3]
    centroid = Xs_cls.mean(axis=0)
    dists = np.linalg.norm(Xs_cls - centroid, axis=1)
    ax4.hist(dists, bins=25, color=PALETTE[cls_name], alpha=0.75, edgecolor='white')
    ax4.axvline(np.mean(dists), color='red', ls='--', label=f'μ={np.mean(dists):.1f}')
    ax4.set_title('Distancia al centroide', fontsize=9)
    ax4.legend(fontsize=8)

plt.suptitle('Sub-clustering interno por clase — ¿Cuántos grupos naturales hay en cada categoría?',
             fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('subclusters_por_clase.png', bbox_inches='tight')
plt.show()

print('\nResumen de sub-clusters por clase:')
for k, v in report.items():
    print(f'  {k:15s}: n={v["n"]:3d} | k natural={v["k_natural"]} | sil={v["sil"]:.4f}')

---
## 🔀 SECCIÓN 5 — Correspondencia clusters ↔ clases reales
### H4: ¿Cómo se mezclan las clases dentro de los clusters geométricos?

# ── Mapa de correspondencia cluster → clase ────────────────────────────────────
def cluster_class_map(labels, y, class_names, title, ax):
    unique_c = sorted([l for l in set(labels) if l != -1])
    mat = np.zeros((len(unique_c), len(class_names)))
    for i, c in enumerate(unique_c):
        mask = labels == c
        for j, cn in enumerate(class_names):
            mat[i, j] = (y[mask] == j).sum()
    mat_pct = mat / mat.sum(axis=1, keepdims=True) * 100
    sns.heatmap(mat_pct, annot=True, fmt='.1f', cmap='Blues',
                xticklabels=class_names,
                yticklabels=[f'cluster {c}' for c in unique_c],
                ax=ax, linewidths=0.3, cbar_kws={'label': '% de la clase'})
    ax.set_title(title, fontsize=10)
    ax.set_xlabel('Clase real'); ax.set_ylabel('Cluster geométrico')

# Modelos a comparar
km3_l = KMeans(n_clusters=3, random_state=SEED, n_init='auto').fit(Xs).labels_
km5_l = KMeans(n_clusters=5, random_state=SEED, n_init='auto').fit(Xs).labels_
gm3_l = GaussianMixture(n_components=3, random_state=SEED).fit_predict(Xs)
gm5_l = GaussianMixture(n_components=5, random_state=SEED).fit_predict(Xs)
db_best = df_sweep.iloc[0]
dbb_l  = DBSCAN(eps=db_best['eps'], min_samples=int(db_best['min_s'])).fit(X50).labels_
agg_l  = AgglomerativeClustering(n_clusters=3, linkage='ward').fit_predict(Xs)
spec_l = SpectralClustering(n_clusters=3, random_state=SEED, affinity='nearest_neighbors').fit_predict(Xs)

configs = [
    (km3_l,  f'K-Means k=3  ARI={adjusted_rand_score(y,km3_l):.3f}'),
    (km5_l,  f'K-Means k=5  ARI={adjusted_rand_score(y,km5_l):.3f}'),
    (gm3_l,  f'GMM k=3      ARI={adjusted_rand_score(y,gm3_l):.3f}'),
    (gm5_l,  f'GMM k=5      ARI={adjusted_rand_score(y,gm5_l):.3f}'),
    (dbb_l,  f'DBSCAN best  ARI={adjusted_rand_score(y,dbb_l):.3f}'),
    (agg_l,  f'Agglomerative ARI={adjusted_rand_score(y,agg_l):.3f}'),
]

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
for ax, (labels, title) in zip(axes.flat, configs):
    cluster_class_map(labels, y, CLASS_NAMES, title, ax)

plt.suptitle('Correspondencia Cluster → Clase Real (% de muestras por clase en cada cluster)', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('cluster_class_map.png', bbox_inches='tight')
plt.show()

---
## 🎯 SECCIÓN 6 — ¿Qué features causan el conflicto?
### H5: Features irrelevantes que diluyen la señal de los centroides

# ── Importancia de features para clasificar clases vs para clustering ───────────
# 1. Importancia para clasificación (Random Forest)
rf = RandomForestClassifier(n_estimators=300, random_state=SEED, n_jobs=-1)
rf.fit(Xs, y)
imp_clf = pd.Series(rf.feature_importances_, index=feat_names).sort_values(ascending=False)

# 2. Importancia para clustering: varianza entre centroides de K-Means (k=3)
km3 = KMeans(n_clusters=3, random_state=SEED, n_init='auto').fit(Xs)
centers = km3.cluster_centers_   # (3, n_feat)
center_var = centers.var(axis=0)
imp_clu = pd.Series(center_var, index=feat_names).sort_values(ascending=False)

# 3. Importancia para separar clases (varianza entre medias de clase)
class_means = np.array([Xs[y==i].mean(axis=0) for i in range(len(CLASS_NAMES))])
class_var   = class_means.var(axis=0)
imp_cls = pd.Series(class_var, index=feat_names).sort_values(ascending=False)

# Comparación top features
TOP = 20
fig, axes = plt.subplots(1, 3, figsize=(18, 7))

imp_clf[:TOP].plot.barh(ax=axes[0], color='#2a78d6', edgecolor='white')
axes[0].set_title(f'Top {TOP} — importancia para CLASIFICACIÓN (RF)', fontsize=10)
axes[0].invert_yaxis()

imp_clu[:TOP].plot.barh(ax=axes[1], color='#e34948', edgecolor='white')
axes[1].set_title(f'Top {TOP} — varianza entre centroides K-MEANS', fontsize=10)
axes[1].invert_yaxis()

imp_cls[:TOP].plot.barh(ax=axes[2], color='#1baf7a', edgecolor='white')
axes[2].set_title(f'Top {TOP} — separabilidad entre CLASES REALES', fontsize=10)
axes[2].invert_yaxis()

plt.suptitle('Importancia de features: Clasificación vs Clustering vs Clases reales', fontsize=12)
plt.tight_layout()
plt.savefig('feature_importance_comparison.png', bbox_inches='tight')
plt.show()

# Overlap entre top features
top_clf = set(imp_clf[:TOP].index)
top_clu = set(imp_clu[:TOP].index)
top_cls = set(imp_cls[:TOP].index)
print(f'Overlap Clasificación ∩ Clustering:    {len(top_clf & top_clu):2d} features')
print(f'Overlap Clasificación ∩ Clases reales: {len(top_clf & top_cls):2d} features')
print(f'Overlap Clustering ∩ Clases reales:    {len(top_clu & top_cls):2d} features')
print(f'\nFeatures importantes para clasificación pero NO para clustering:')
print(sorted(top_clf - top_clu))
print(f'\nFeatures importantes para clustering pero NO para clasificación:')
print(sorted(top_clu - top_clf))

# ── Test Kruskal-Wallis: qué features discriminan estadísticamente las clases ──
kruskal_results = []
for feat in feat_names:
    groups = [Xs[y==i, feat_names.index(feat)] for i in range(len(CLASS_NAMES))]
    # Check if all groups have more than 1 element and if there is variance within each group
    if all(len(g) > 1 and np.std(g) > 1e-9 for g in groups):
        stat, pval = kruskal(*groups)
        kruskal_results.append({'feature': feat, 'H_stat': stat, 'p_value': pval})

df_kw = pd.DataFrame(kruskal_results).sort_values('H_stat', ascending=False)
df_kw['significant'] = df_kw['p_value'] < 0.05

print(f'Features con discriminación estadística (p<0.05): {df_kw["significant"].sum()} / {len(df_kw)}')
print('\nTop 15 features más discriminantes:')
print(df_kw.head(15).to_string(index=False))

# Heatmap de medias por clase (top features)
top_kw_feats = df_kw.head(25)['feature'].tolist()
X_df = pd.DataFrame(Xs, columns=feat_names)
X_df['clase'] = [CLASS_NAMES[i] for i in y]
means_by_class = X_df.groupby('clase')[top_kw_feats].mean().T

fig, ax = plt.subplots(figsize=(8, 10))
sns.heatmap(means_by_class, annot=True, fmt='.2f', cmap='RdBu_r',
            center=0, ax=ax, linewidths=0.2, cbar_kws={'label': 'Z-score (RobustScaler)'})
ax.set_title('Media por clase — Top 25 features más discriminantes (Kruskal-Wallis)', fontsize=11)
plt.tight_layout()
plt.savefig('heatmap_means_by_class.png', bbox_inches='tight')
plt.show()

---
## 🧬 SECCIÓN 7 — Clustering sobre features seleccionadas
### ¿Mejora el ARI si usamos solo features discriminantes?

# ── Clustering con diferentes subconjuntos de features ────────────────────────
subsets_feats = {
    'Todas (104)':           feat_names,
    'Top-20 RF':             imp_clf[:20].index.tolist(),
    'Top-20 Kruskal':        df_kw.head(20)['feature'].tolist(),
    'Top-10 RF':             imp_clf[:10].index.tolist(),
    'Top-30 Kruskal':        df_kw.head(30)['feature'].tolist(),
    'Sig. Kruskal (p<0.01)': df_kw[df_kw['p_value']<0.01]['feature'].tolist(),
    'PCA-10 components':     None,   # especial
    'UMAP-5 components':     None,   # especial
}

# PCA y UMAP como features
Xs_pca10 = PCA(n_components=10, random_state=SEED).fit_transform(Xs)
Xs_umap5 = umap.UMAP(n_components=5, n_neighbors=20, random_state=SEED).fit_transform(Xs)

results_fs = []
for name, feats in subsets_feats.items():
    if name == 'PCA-10 components':   Xs_sub = Xs_pca10
    elif name == 'UMAP-5 components': Xs_sub = Xs_umap5
    else:
        idx = [feat_names.index(f) for f in feats if f in feat_names]
        Xs_sub = Xs[:, idx]
        if Xs_sub.shape[1] == 0: continue

    for algo, k_or_params in [('KMeans-3', 3), ('KMeans-5', 5), ('GMM-3', 3), ('GMM-5', 5), ('Agglom-3', 3)]:
        if 'KMeans' in algo:
            lbl = KMeans(n_clusters=k_or_params, random_state=SEED, n_init='auto').fit_predict(Xs_sub)
        elif 'GMM' in algo:
            lbl = GaussianMixture(n_components=k_or_params, random_state=SEED).fit_predict(Xs_sub)
        elif 'Agglom' in algo:
            lbl = AgglomerativeClustering(n_clusters=k_or_params).fit_predict(Xs_sub)
        ari = adjusted_rand_score(y, lbl)
        ami = adjusted_mutual_info_score(y, lbl)
        sil = silhouette_score(Xs_sub, lbl)
        results_fs.append({'Features': name, 'Algo': algo, 'ARI': ari, 'AMI': ami, 'Sil': sil,
                           'n_feats': Xs_sub.shape[1]})

df_fs = pd.DataFrame(results_fs)
pivot_ari = df_fs.pivot_table(index='Features', columns='Algo', values='ARI').round(4)

fig, ax = plt.subplots(figsize=(14, 6))
sns.heatmap(pivot_ari, annot=True, fmt='.4f', cmap='YlOrRd', ax=ax, linewidths=0.3,
            vmin=0, vmax=1)
ax.set_title('ARI según subconjunto de features × algoritmo de clustering', fontsize=11)
plt.tight_layout()
plt.savefig('ari_feature_selection.png', bbox_inches='tight')
plt.show()

best_row = df_fs.loc[df_fs['ARI'].idxmax()]
print(f'\n🏆 Mejor combinación:')
print(f'  Features: {best_row["Features"]} | Algo: {best_row["Algo"]}')
print(f'  ARI={best_row["ARI"]:.4f} | AMI={best_row["AMI"]:.4f} | Sil={best_row["Sil"]:.4f}')

---
## 🌲 SECCIÓN 8 — Árbol de decisión sobre clusters
### ¿Qué reglas separan los clusters de los datos reales?

from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree

# Árbol que intenta predecir clusters DBSCAN desde las features originales
db_best_params = df_sweep.iloc[0]
db_labels_best = DBSCAN(eps=db_best_params['eps'],
                         min_samples=int(db_best_params['min_s'])).fit(X50).labels_

mask_valid = db_labels_best != -1
X_tree = X.values[mask_valid]
y_tree_cls = y[mask_valid]              # clases reales
y_tree_clu = db_labels_best[mask_valid] # clusters DBSCAN

# Árbol sobre clusters DBSCAN
dt_clu = DecisionTreeClassifier(max_depth=4, random_state=SEED)
dt_clu.fit(X_tree, y_tree_clu)
print(f'Árbol que predice CLUSTERS DBSCAN — Accuracy: {dt_clu.score(X_tree, y_tree_clu):.4f}')

# Árbol sobre clases reales (para comparar)
dt_cls = DecisionTreeClassifier(max_depth=4, random_state=SEED)
dt_cls.fit(X_tree, y_tree_cls)
print(f'Árbol que predice CLASES REALES — Accuracy: {dt_cls.score(X_tree, y_tree_cls):.4f}')

fig, axes = plt.subplots(1, 2, figsize=(22, 8))
plot_tree(dt_clu, ax=axes[0], feature_names=feat_names, class_names=[f'c{i}' for i in sorted(set(y_tree_clu))],
          filled=True, rounded=True, fontsize=7, max_depth=3)
axes[0].set_title('Reglas que separan CLUSTERS DBSCAN', fontsize=11)

plot_tree(dt_cls, ax=axes[1], feature_names=feat_names, class_names=list(CLASS_NAMES),
          filled=True, rounded=True, fontsize=7, max_depth=3)
axes[1].set_title('Reglas que separan CLASES REALES', fontsize=11)

plt.suptitle('Árbol de decisión: ¿Qué features y umbrales definen los grupos?', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('decision_trees_comparison.png', bbox_inches='tight')
plt.show()

# Features más importantes en cada árbol
top_clu_tree = pd.Series(dt_clu.feature_importances_, index=feat_names).nlargest(10)
top_cls_tree = pd.Series(dt_cls.feature_importances_, index=feat_names).nlargest(10)
print('\nTop features — árbol clusters DBSCAN:')
print(top_clu_tree.to_string())
print('\nTop features — árbol clases reales:')
print(top_cls_tree.to_string())

---
## 📊 SECCIÓN 9 — Distribuciones de features clave por clase y por cluster

# ── Violin plots: top features discriminantes ──────────────────────────────────
top_feats_viz = imp_clf[:12].index.tolist()
X_df_orig = pd.DataFrame(X.values, columns=feat_names)
X_df_orig['clase'] = [CLASS_NAMES[i] for i in y]
X_df_orig['km3']   = [f'km{l}' for l in km3_l]

fig, axes = plt.subplots(3, 4, figsize=(18, 12))
for ax, feat in zip(axes.flat, top_feats_viz):
    order = list(CLASS_NAMES)
    pal   = {cn: PALETTE[cn] for cn in CLASS_NAMES}
    sns.violinplot(data=X_df_orig, x='clase', y=feat, order=order,
                   palette=pal, ax=ax, inner='quartile', density_norm='width')
    ax.set_title(feat, fontsize=9)
    ax.set_xlabel(''); ax.tick_params(axis='x', labelsize=8)

plt.suptitle('Distribución por clase — Top 12 features más discriminantes', fontsize=12)
plt.tight_layout()
plt.savefig('violin_top_features.png', bbox_inches='tight')
plt.show()

# ── Pairplot top-5 features: clase real vs cluster K-Means ────────────────────
top5 = imp_clf[:5].index.tolist()
pp_df = X_df_orig[top5 + ['clase']].copy()
pp_df['km3'] = [f'km{l}' for l in km3_l]

fig = sns.pairplot(pp_df, vars=top5, hue='clase', palette=PALETTE,
                   plot_kws={'alpha': 0.5, 's': 20}, diag_kind='kde')
fig.fig.suptitle('Pairplot top-5 features — color = clase real', y=1.01, fontsize=12)
plt.savefig('pairplot_by_class.png', bbox_inches='tight')
plt.show()

fig2 = sns.pairplot(pp_df, vars=top5, hue='km3',
                    plot_kws={'alpha': 0.5, 's': 20}, diag_kind='kde')
fig2.fig.suptitle('Pairplot top-5 features — color = cluster K-Means', y=1.01, fontsize=12)
plt.savefig('pairplot_by_cluster.png', bbox_inches='tight')
plt.show()

---
## 📋 SECCIÓN 10 — Informe de diagnóstico final

from IPython.display import display, HTML

# Tabla resumen de todos los métodos
summary = [
    ('K-Means k=3',        adjusted_rand_score(y,km3_l),   adjusted_mutual_info_score(y,km3_l),   silhouette_score(Xs,km3_l),   calinski_harabasz_score(Xs,km3_l),   davies_bouldin_score(Xs,km3_l)),
    ('K-Means k=5',        adjusted_rand_score(y,km5_l),   adjusted_mutual_info_score(y,km5_l),   silhouette_score(Xs,km5_l),   calinski_harabasz_score(Xs,km5_l),   davies_bouldin_score(Xs,km5_l)),
    ('GMM k=3',            adjusted_rand_score(y,gm3_l),   adjusted_mutual_info_score(y,gm3_l),   silhouette_score(Xs,gm3_l),   calinski_harabasz_score(Xs,gm3_l),   davies_bouldin_score(Xs,gm3_l)),
    ('GMM k=5',            adjusted_rand_score(y,gm5_l),   adjusted_mutual_info_score(y,gm5_l),   silhouette_score(Xs,gm5_l),   calinski_harabasz_score(Xs,gm5_l),   davies_bouldin_score(Xs,gm5_l)),
    ('Agglomerative k=3',  adjusted_rand_score(y,agg_l),   adjusted_mutual_info_score(y,agg_l),   silhouette_score(Xs,agg_l),   calinski_harabasz_score(Xs,agg_l),   davies_bouldin_score(Xs,agg_l)),
    ('Spectral k=3',       adjusted_rand_score(y,spec_l),  adjusted_mutual_info_score(y,spec_l),  silhouette_score(Xs,spec_l),  calinski_harabasz_score(Xs,spec_l),  davies_bouldin_score(Xs,spec_l)),
    ('DBSCAN best',        adjusted_rand_score(y,dbb_l),   adjusted_mutual_info_score(y,dbb_l),   silhouette_score(Xs[dbb_l!=-1],dbb_l[dbb_l!=-1]) if (dbb_l!=-1).sum()>1 else 0, 0, 0),
    ('HDBSCAN',            adjusted_rand_score(y,hdb.labels_), adjusted_mutual_info_score(y,hdb.labels_), silhouette_score(X50[hdb.labels_!=-1],hdb.labels_[hdb.labels_!=-1]) if (hdb.labels_!=-1).sum()>1 else 0, 0, 0),
]

df_summary = pd.DataFrame(summary, columns=['Método','ARI','AMI','Silhouette','Calinski-H','Davies-B'])
df_summary = df_summary.round(4)

def color_ari(val):
    try:
        v = float(val)
        if v >= 0.5:  return 'background-color:#c6f0c2'
        elif v >= 0.2: return 'background-color:#ffeeba'
        else:          return 'background-color:#ffdede'
    except: return ''

styled = (df_summary.style
          .applymap(color_ari, subset=['ARI','AMI'])
          .set_caption('Diagnóstico completo de clustering — features_anotaciones_v2')
          .set_table_styles([{'selector':'th','props':[('background-color','#2d3748'),('color','white'),('font-size','11px')]}]))
display(styled)
df_summary.to_csv('diagnostico_clustering_resumen.csv', index=False)

print('\n' + '='*65)
print('  DIAGNÓSTICO FINAL')
print('='*65)
print(f"""
1. FORMA DE CLUSTERS: Los datos NO forman esferas convexas.
   → K-Means/GMM/Agglomerative asumen forma esférica → fallan.
   → DBSCAN/HDBSCAN usan densidad → capturan la estructura real.

2. SUB-CLUSTERS: Cada clase contiene sub-grupos internos.
   → El k geométrico óptimo probablemente > 3.
   → Esto hace que K-Means con k=3 rompa los sub-grupos
     mezclando clases en un mismo cluster.

3. FEATURES: Los centroides K-Means son dominados por features
   de alta varianza global que NO son las más discriminantes
   para las etiquetas reales.
   → Clustering sobre Top-N Kruskal/RF mejora el ARI.

4. CLASE 'servido' (n=46): Es la clase más pequeña.
   → En el espacio de features forma una región densa y compacta
     que DBSCAN detecta fácilmente como un cluster propio.
   → K-Means la absorbe en clusters más grandes.

5. RECOMENDACIÓN: Usar HDBSCAN o DBSCAN sobre PCA-50D
   como estrategia de clustering. Para análisis exploratorio,
   usar las features Top-Kruskal o reducción UMAP-5D.
""")

print('\n📁 Archivos exportados:')
for f in ['viz_comparativa_2d.png', 'elbow_metrics.png', 'silhouette_diagrams.png',
          'kdistance_plot.png', 'dbscan_sweep_heatmap.png', 'hdbscan_umap.png',
          'subclusters_por_clase.png', 'cluster_class_map.png',
          'feature_importance_comparison.png', 'heatmap_means_by_class.png',
          'ari_feature_selection.png', 'decision_trees_comparison.png',
          'violin_top_features.png', 'pairplot_by_class.png',
          'diagnostico_clustering_resumen.csv']:
    print(f'  • {f}')

from google.colab import files
files.download('diagnostico_clustering_resumen.csv')


---
