---
id: model_evidence_engine
title: MODEL — Evidence Engine (shape_features_v2.py)
type: model
status: active
owner: Mauro
created: 2026-08-10
updated: 2026-08-13
tags:
  - modelo
  - evidence-engine
  - motor-matematico
  - clasificacion
related:
  - [[00_HOME]]
  - [[11_ModelosIA/MOC_ModelosIA]]
  - [[13_Features/README_ShapeFeatures]]
  - [[13_Features/ATLAS_Features_v2]]
  - [[12_Matematica/README_Matematica]]
---

# MODEL — Evidence Engine

> Clasificador `alimentacion` / `servido` / `ruido` sobre segmentos de peso del comedero.
> Vive en `Docs/09_Investigacion/Ciclo Alpha v2/fase_0_ruido/shape_features_v2.py`.
> Estadística clásica (discriminante lineal tipo Fisher + softmax) — sin IA/ML.

---

## Estado (2026-08-10)

**Reescrito completo.** Hasta ayer el motor sumaba `peso × valor crudo` de 23 features
elegidos a mano, sin normalizar. Con 496 anotaciones reales acertaba **49.6%** — peor que
predecir siempre "alimentación" (51.2%, la clase mayoritaria). El motor estaba
matemáticamente roto, no solo mal calibrado.

## Por qué estaba roto

Los features viven en escalas muy distintas: la mayoría en `[-1, 1]`, pero
`entropy_sample` llega a **22.7**. Con pesos `±1` a `±5` elegidos a mano asumiendo escala
uniforme, el feature de mayor magnitud cruda dominaba la suma sin importar el peso que se
le asignara — un solo feature de escala grande podía pesar más que `sim_alimentacion`
(peso ±5.0, el más "fuerte" nominalmente). Además `entropy_sample` tenía el signo
invertido: media alta en **alimentación** (9.57), no en ruido, pero el peso
`(-1.0, 0.0, +1.0)` premiaba ruido — literal error de calibración, no solo de escala.

## Fix aplicado

`evidence_score(feats, comp_stats)` ahora:

1. **Normaliza** cada feature — z-score pooled contra `comp_stats_v2.json`
   (`_normalize_feats()`).
2. **Calcula los pesos desde los datos** — discriminante tipo Fisher sobre las **102
   features** de `comp_stats_v2.json` (no solo las 23 elegidas a mano):
   ```
   w_cat(f) = mean_cat_normalizada(f) − mean_resto_normalizada(f)
   ```
   Función: `compute_data_driven_weights(comp_stats)`.
3. `EVIDENCE_WEIGHTS` (los 23 pesos a mano) queda como **fallback legado** — solo se usa
   si no hay `comp_stats` disponible (cold start sin `comp_stats_v2.json` generado aún).

```python
score = evidence_score(feats, comp_stats)
# → {"score_alimentacion": 0.82, "score_servido": 0.07, "score_ruido": 0.11,
#    "prediccion": "alimentacion", "confianza": 0.82, "razon": "..."}
```

## Resultado — accuracy fuera de muestra

Split 80/20, pesos calculados **solo con el 80%** (train), evaluado en el 20% nunca visto:

| Versión | Medido 2026-08-10 (496 anot.) | Medido 2026-08-13 (527 anot.) |
|---|---|---|
| Motor legado (`EVIDENCE_WEIGHTS`, 23 features a mano, sin normalizar) | 51.5% | 58.4% |
| **Motor normalizado + pesos calculados (102 features)** | 77.8%¹ | **80.0%** |

¹ El número del 2026-08-10 aparece como 77.8% en el comentario de
`tests/test_evidence_engine.py` (fuente autoritativa — es lo que el propio piso del test
documenta) pero como 78.8% en varios documentos de Knowledge escritos ese mismo día —
inconsistencia de transcripción entre docs, no una re-medición distinta. No se investigó
cuál de las dos fue la cifra real originalmente; queda resuelta por el número recalculado
el 2026-08-13, que es el que manda de ahora en adelante.

**Desde 2026-08-13 ya no es un número estático:** `app_anotacion_av2.py` (Tab 5 — Motor
Matemático) lo recalcula en vivo con `_evidence_engine_accuracy_cached()` (mismo método,
seed=42, ttl=1h) cada vez que cambian las anotaciones, así no vuelve a quedar
desactualizado en la UI. Ver [[14_Experimentos/EXP_AlphaV2_AppArq]].

Con todos los datos (527 anotaciones, sin held-out): 80.5%.

Test de regresión permanente:
`Docs/09_Investigacion/Ciclo Alpha v2/fase_0_ruido/tests/test_evidence_engine.py`
— corre en cada cambio, falla si la accuracy held-out cae bajo 65% o si el motor
normalizado deja de superar claramente al legado.

## Dónde se usa

| Lugar | Qué hace |
|---|---|
| Tab 1 — Revisar Candidatos | **Nuevo (2026-08-10).** Sugiere la categoría pre-seleccionada con badge de confianza 🟢≥70% / 🟡50-70% / 🔴<50%, usando las features ya calculadas por `01_genera_candidatos.py`. Antes no existía ninguna sugerencia automática — el operador anotaba a ciegas pese a tener un motor calibrado. |
| Tab 5 — Motor Matemático | Predicción sobre un candidato seleccionado + texto explicativo actualizado |
| Tab 7/8 — Próxima Comida / Kittypau | `_evidence_ventana_cached()` — Evidence Engine sobre los últimos N minutos de lecturas |

## Features nuevas en el fallback legado

Además del fix principal, se agregaron 3 features al `EVIDENCE_WEIGHTS` legado (el mejor
discriminador del motor completo no estaba siendo usado ni siquiera en el camino legado):

| Feature | sep_AS | sep_AR | Peso agregado |
|---|---:|---:|---|
| `tpl_doble_rampa` | **7.69σ** (el #1 del motor completo) | 1.58σ | `(+5.0, -4.0, 0.0)` |
| `d1_frac_neg` | 3.13σ | 3.22σ (mejor discriminador alim/ruido) | `(+2.0, -1.5, -1.5)` |
| `entropy_shannon` | 3.69σ | 2.43σ | `(+2.0, -1.5, -1.0)` |

Se removió `tpl_plateau` — constante en `0.0` en 496/496 anotaciones, sin poder
discriminativo, no aportaba nada al softmax.

> Nota histórica: el `tpl_doble_rampa` de la separación 7.32σ/7.63σ citada en versiones
> anteriores de esta documentación era una discrepancia entre snapshots (v2.0 vs v2.1,
> 408 vs 417 anotaciones). Con 496 anotaciones (2026-08-10) el valor real es **7.69σ**.

## El punto débil sigue siendo alimentación vs. ruido

Incluso con el fix, la separación alim/ruido (máx. ~3.2σ) es mucho más débil que
alim/servido (máx. ~7.7σ) — distinguir "Bandida come" de "algo tocó el plato" es
estructuralmente más difícil que distinguir comer de servir. Mejores discriminadores
alim/ruido actuales: `d1_frac_neg` (3.22σ), `entropy_permutation` (2.80σ), `zcr` (2.80σ),
`entropy_shannon` (2.43σ), `monotonicity` (1.99σ) — todos ya en `EVIDENCE_WEIGHTS`.

## Próximo salto de calidad (no implementado)

El discriminante Fisher (mean-difference) es lineal y trata cada feature de forma
independiente. Un LDA propiamente regularizado, o simplemente extender el set de 102 a
todas las combinaciones de features correlacionadas, podría subir más el accuracy — pero
ya es territorio de retornos decrecientes sin pasar a un modelo entrenado (fuera de
alcance mientras el proyecto se mantenga en "solo features y modelamiento matemático").

## Ver también

- [[13_Features/README_ShapeFeatures]] — las 102 features y sus 15 familias
- [[13_Features/ATLAS_Features_v2]] — tabla de separabilidad por feature
- [[12_Matematica/README_Matematica]] — fórmulas de cada familia F00–F14
- [[11_ModelosIA/MOC_ModelosIA]] — mapa de todos los modelos del proyecto
