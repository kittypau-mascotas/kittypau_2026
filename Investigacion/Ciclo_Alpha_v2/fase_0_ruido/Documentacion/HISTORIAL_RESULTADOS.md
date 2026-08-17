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
[RECOPILACION_DATOS_APP.md §12bis](RECOPILACION_DATOS_APP.md#12bis-actualización-2026-08-10--el-problema-real-no-eran-los-pesos-era-la-escala).

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
