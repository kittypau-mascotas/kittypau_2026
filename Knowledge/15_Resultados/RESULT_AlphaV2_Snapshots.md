---
id: result_alphav2_snapshots
title: Historial de Resultados — Motor Matemático v2 (Alpha v2)
type: result
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-11
tags:
  - resultados
  - motor-v2
  - snapshots
  - features
  - alpha-v2
related:
  - [[00_HOME]]
  - [[13_Features/README_ShapeFeatures]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
  - [[11_ModelosIA/MODEL_MotorMatematico]]
  - [[10_Datasets/README_Datasets]]
---

# Historial de Resultados — Motor Matemático v2 (Alpha v2)

**Proyecto:** Kittypau — KPCL0034 "Bandida"  
**Dispositivo:** food_bowl `3a460074` (Mayo-Jun 2026) + `9510a455` (Abr 2026)  
**Motor:** `shape_features_v2.py` — 102 features en 15 familias (F00–F14)  
**Propósito:** Registro histórico de cada ingesta de datos nueva. Se actualiza cada vez que se
ejecuta `revisar_anotaciones_v2.py`.

---

## Tabla Resumen

> Fuente canónica de este historial: [`fase_0_ruido/HISTORIAL_RESULTADOS.md`](../../Docs/09_Investigacion/Ciclo%20Alpha%20v2/fase_0_ruido/HISTORIAL_RESULTADOS.md)
> — la app y sus scripts escriben ahí directamente. Esta tabla es un espejo resumido
> para navegación rápida desde el vault; ante conflicto, gana el doc de `fase_0_ruido`.

| Snapshot | Fecha | Alim | Serv | Ruido | Total anot. | Candidatos | Features | Rango datos | Mejor feature (sep. A/S) |
|----------|-------|-----:|-----:|------:|------------:|-----------:|---------:|-------------|--------------------------|
| v2.0 | 2026-06-26 | 200 | 43 | 165 | 408 | 417 | 101 | Abr 8 → Jun 25 | — |
| v2.1 | 2026-06-27 | 205 | 45 | 167 | 417 | 421 | 102 | Abr 8 → Jun 27 | `tpl_doble_rampa` (7.63σ) |
| v2.3 | 2026-08-10 | 254 | 55 | 187 | 496 | 589 | 102 | Abr 8 → Ago 10 | `tpl_doble_rampa` (7.69σ) |
| v2.4 | 2026-08-11 | 254 | 55 | 187 | 496 | 589 | 102 | Abr 8 → Ago 10 | sin cambio de features — 4 mejoras de práctica (Evidence Engine, auditoría, umbrales, split mixto) |
| **en vivo** | **2026-08-11** | **262** | **58** | **207** | **527** | **590** | **102** | — | contado directo de `data/anotaciones_av2.csv` — anotación en curso, aún no cerrado como snapshot formal |

**v2.3 es el cambio más importante del historial:** `evidence_score()` (Tab 1 y Tab 8) tenía
un bug estructural — sumaba `peso × valor crudo` sin normalizar, con 496 anotaciones acertaba
solo 49.6% (peor que predecir siempre "alimentación", 51.2%). Fix: z-score pooled + pesos
calculados desde los datos (discriminante tipo Fisher sobre las 102 features en vez de 26
elegidas a mano) → **78.8% accuracy held-out (20% nunca visto)**. Detalle completo en
`fase_0_ruido/RECOPILACION_DATOS_APP.md §12bis` y `fase_0_ruido/HISTORIAL_RESULTADOS.md`.
Tab 1 ahora sugiere la categoría automáticamente con el motor corregido.

**v2.4 (mismo día, 2026-08-11) — 4 mejoras incrementales**, en orden de impacto/riesgo:
1. `spectral_entropy` + `d1_frac_pos` agregados al fallback legado del Evidence Engine (el motor normalizado ya los usaba).
2. Auditoría de discrepancias motor↔humano: 88/496 (17.7%) con ≥85% de confianza discrepante — reporte en `data/auditoria_discrepancias.csv`, sin corrección automática.
3. `umbrales.json` recalibrado (304→496 anotaciones) — bug corregido: la duración/Δpeso de referencia se calculaba contra la ventana del *candidato*, no la ventana *real confirmada* de la anotación (48/55 servidos diferían >1 min).
4. `punto_split_mixto()` implementado y testeado para partir candidatos "mixto" por giro interno — **NO aplicado todavía** a `candidatos_av2.csv` (pendiente de decisión: 25% de los splits caen en el límite de detección de 4-6g, y correr el detector desincroniza `id_candidato` de las 496 anotaciones ya guardadas).

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
- `d1_rms` eliminado del COMP_STATS en esta versión.
- 65 candidatos existentes presentaron `t_inicio` desplazado 90–390 s respecto a anotaciones anteriores (efecto del resampleo sobre la señal extendida). IDs permanecen válidos.

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
# 1. Reemplazar readings_rows.csv en Docs/11_Data/2026/
# 2. Regenerar candidatos
python 01_genera_candidatos.py

# 3. Anotar nuevos candidatos en la app
python -m streamlit run app_anotacion_av2.py

# 4. Regenerar features y comp_stats
python revisar_anotaciones_v2.py

# 5. Agregar nuevo snapshot en este doc:
#    - Fecha, conteos, top 15 features, observaciones
#    - Actualizar fila en Tabla Resumen
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

## Ver también

- [[14_Experimentos/EXP_AlphaV2_Pipeline]]
- [[13_Features/README_ShapeFeatures]]
- [[11_ModelosIA/MODEL_MotorMatematico]]
