# Exp 11 — Reversión `cadencia_s`, revisión retroactiva Mayo-Jun y ensemble GRU+LGBM (Modelo B)

| Campo | Valor |
|---|---|
| **ID** | Exp 11 |
| **Nombre** | Limpieza de features + ampliación de ground truth Mayo-Jun + ensemble servido |
| **Fecha planificada** | A definir (post 2026-06-15) |
| **Estado** | 📋 Planificado — no ejecutado |
| **Basado en** | [Exp 09B](exp_09b_threshold_por_periodo.md) (pipeline 30s, 13 features) + [Exp 10-NN](exp_10_nn_colab.md) (benchmark NN) + [Exp 07](exp_07_inferencia_mayo_junio.md) (candidatos sin etiquetar) |
| **Modelo en producción** | Exp 06 (sin cambios hasta que Exp 11 demuestre mejora real) |

---

## 0. Resumen ejecutivo

Exp 09A, 09B y 10-NN agotaron las palancas de *feature engineering* y *arquitectura*
para cerrar el gap Abril vs Mayo-Jun: ninguna movió el F1 activo de Mayo-Jun más
allá de 0.60. Lo único que sí mostró señal positiva en esas corridas fue:

1. `cadencia_s` no ayuda (Exp 09B lo recomienda revertir).
2. Más datos de `servido` ayudan cuando aparecen (Exp 08: +9 sesiones → F1 servido +0.10).
3. Una arquitectura recurrente/convolucional (GRU/TCN) captura mejor `servido` que LGBM
   (+0.20 en F1 servido, Exp 10-NN), aunque pierde en `alimentacion` y `F1 activo`.

Exp 11 combina estas tres señales en tres líneas de trabajo de bajo riesgo,
ejecutables sin nueva recolección de hardware:

- **Línea A** — revertir `cadencia_s` (12 features, invariante desde Exp 03).
- **Línea B** — revisar retroactivamente las 155 sesiones candidatas que Exp 07
  detectó en Mayo-Jun (134 alimentación, 6 servido, 15 falsos positivos de Modelo A)
  y fusionarlas a `new_annotations.csv`.
- **Línea C** — ensemble LGBM + GRU para el Modelo B, usando los pesos de
  `nn_b_best_b.pt` (Exp 10) como punto de partida para mejorar `F1 servido` sin
  sacrificar `F1 alimentacion`.

**No se toca** el split temporal (train Apr 8–May 31 / val May 31–Jun 7 / test
Jun 7–Jun 14), `GAP_CUTOFF_S=300`, `PLATEAU_THRESHOLD=1.5g`, `plateau_duration` en
segundos, ni `X_test`/`y_test`.

---

## 1. Qué deja cada experimento anterior (insumos de Exp 11)

| Experimento | Aporte que usa Exp 11 | Decisión que motiva |
|---|---|---|
| Exp 06 | Modelo de producción (F1 activo=0.7619, F1 alim=0.7606, AUC=0.9205) | Referencia a no degradar |
| Exp 07 | 155 sesiones candidatas sin etiquetar en Mayo-Jun (134 alim · 6 serv · 15 FP de A) | Insumo directo de Línea B |
| Exp 08 | Train mixto Abril+Mayo-Jun (185 alim · 27 serv) — invariante desde aquí | Base de dataset de Exp 11 |
| Exp 09A | Resampleo a 30s — invariante | Sin cambios |
| Exp 09B | `plateau_duration` en segundos (✅ mantener) · `cadencia_s` (❌ revertir) · threshold por período (sin efecto, val 100% Mayo-Jun) | Línea A |
| Exp 10-NN | GRU: F1 servido=0.34 (vs 0.14 LGBM) · TCN: F1 activo=0.60 · ninguna NN supera a LGBM en general | Línea C |

---

## 2. Línea A — Revertir `cadencia_s` (volver a 12 features)

**Justificación:** en Exp 09B, `cadencia_s` no aparece en el top 10 de importancia
y el F1 activo no cambió (0.6000 → 0.6000). El README ya marca esto como pendiente:
*"revertir si no mejora"*.

**Cambio concreto en `_phase2_utils.py` / `01_prepare_datasets.py`:**

```python
FEATURES = [
    'weight_grams', 'delta_w', 'delta_w_10',
    'rolling_std_5', 'rolling_std_10', 'rolling_mean_5',
    'net_weight', 'is_plateau', 'plateau_duration',
    'hour_sin', 'hour_cos', 'clock_invalid',
    # 'cadencia_s',  ← eliminada (Exp 11, baja importancia en Exp 09B)
]
```

`plateau_duration` **se mantiene en segundos** (Cambio 2 de Exp 09B sigue siendo
invariante — no se revierte, solo `cadencia_s`).

**Costo:** ninguno adicional — se aplica en la misma corrida de Fase 2 que Línea B,
ya que de todas formas hay que recalcular features con las nuevas anotaciones.

**Riesgo:** bajo. Si el F1 baja, es trivial reincorporar la feature.

---

## 3. Línea B — Revisión retroactiva de los 155 candidatos de Exp 07

### 3.1 Qué hay para revisar

Exp 07 corrió inferencia con los modelos de Exp 06 sobre `readings_rows.csv`
(2026-05-25 → 2026-06-14, sin etiquetas) y agrupó 155 sesiones activas:

| Clase dominante (Modelo B) | Sesiones | Acción en Exp 11 |
|---|---:|---|
| `alimentacion` | 134 | Confirmar/descartar con `app_anotacion.py` → `new_annotations.csv` |
| `servido` | 6 | Confirmar/descartar — prioridad alta, clase más escasa |
| `reposo` (falso positivo de Modelo A) | 15 | Revisar para entender sensibilidad del threshold 0.20 en zonas de transición |

### 3.2 Expectativa realista sobre `servido`

El README fija como meta `≥ 40 sesiones nuevas de servido anotadas`. Las 6
candidatas detectadas por Exp 07 **no alcanzan esa meta por sí solas** — parte
de ellas probablemente ya están incluidas en las +9 retroactivas de Exp 08.

Por eso Línea B se documenta con dos resultados posibles:

| Resultado de la revisión | Siguiente paso |
|---|---|
| Se confirman 3-6 sesiones `servido` netas nuevas | Proceder con Línea C (ensemble) usando el incremento disponible |
| 0-2 sesiones netas nuevas | Línea C sigue siendo válida (usa los pesos GRU ya entrenados en Exp 10), pero documentar explícitamente que el cuello de botella de datos **no se resolvió** y escalar a recolección de hardware nueva como prioridad para Exp 12 |

### 3.3 Revisión secundaria (opcional, bajo costo)

Las **15 sesiones `reposo`-dominante marcadas como activas por Modelo A** son
el mejor material disponible para entender por qué el threshold 0.20
sobre-detecta en Mayo-Jun (hipótesis de Exp 07: "zonas de transición de servido
o reseteo del plato"). Revisarlas con `app_anotacion.py` puede aportar señal
para Línea A/C sin requerir nuevas sesiones `servido`.

### 3.4 Pipeline

```
1. app_anotacion.py → modo revisión de candidatos Exp 07
   - cargar sesiones_detectadas_mayo_junio.csv (Exp 07)
   - para cada sesión: confirmar tipo (alimentacion/servido/ninguna) y ajustar bordes
   - guardar confirmaciones en new_annotations.csv (mismo formato que Exp 08)

2. 04_extract_events.py
   - fusiona audit_events.csv + new_annotations.csv (sin cambios de código, ya soportado desde Exp 08)

3. 05_build_sessions.py / 06_quality_report.py
   - validar: sesiones servido train > 27, sesiones alimentacion train > 185
```

---

## 4. Línea C — Ensemble LGBM + GRU para Modelo B

### 4.1 Justificación

| Métrica (val Exp 10, dataset mixto) | LGBM Exp 06 | GRU (NN-B) | Δ |
|---|:---:|:---:|:---:|
| F1 alimentacion | **0.7606** | 0.3613 | LGBM gana |
| F1 servido | 0.1395 | **0.3400** | GRU gana (+0.20) |
| F1 reposo | — | 0.9642 | similar |
| Macro F1 | 0.6312 | 0.5552 | LGBM gana |

Ningún modelo solo es suficiente. La hipótesis de Exp 11 es que un ensemble
que delegue la decisión `servido` al GRU (donde es fuerte) y el resto a LGBM
(donde es fuerte) puede mejorar Macro F1 y F1 servido sin perder F1 alimentacion.

### 4.2 Estrategia recomendada — blending de probabilidades

```python
# probs_lgbm: (N, 3) -> [alim, serv, rep]
# probs_gru:  (N, 3) -> [alim, serv, rep]  (requiere ventana de 10 timesteps)

# Paso 1: alinear índices (GRU pierde las primeras 9 filas por la ventana)
# Paso 2: blend solo en la columna 'servido', con peso alpha
alpha = 0.6  # peso del GRU para la clase servido — sweep 0.3-0.8 en validación
probs_blend = probs_lgbm.copy()
probs_blend[:, SERVIDO_IDX] = (
    alpha * probs_gru[:, SERVIDO_IDX] + (1 - alpha) * probs_lgbm[:, SERVIDO_IDX]
)
probs_blend = probs_blend / probs_blend.sum(axis=1, keepdims=True)  # renormalizar
y_pred = probs_blend.argmax(axis=1)
```

**Por qué blending y no stacking:** stacking (meta-clasificador) requiere
re-entrenar con CV anidada y añade complejidad para una clase con ~126 filas
de train. El blending con un solo hiperparámetro (`alpha`) es ajustable
directamente sobre `X_val` con un sweep simple, igual que se hizo con los
thresholds en Exp 02-04.

### 4.3 Punto de partida del GRU

- Usar `nn_b_best_b.pt` de Exp 10 como warm-start (pesos guardados en Colab,
  no comiteados — recuperar antes de borrar el entorno de Colab).
- Si Línea B agrega sesiones `servido` nuevas, **reentrenar el GRU** con el
  dataset actualizado (mismo script `exp_10_colab.py`, sección NN-B) antes de
  construir el ensemble — el GRU es el componente más sensible a datos nuevos
  de `servido`.
- Si Línea B no agrega sesiones netas, usar los pesos de Exp 10 sin reentrenar
  y documentar el ensemble como "diagnóstico con datos de Exp 09B".

### 4.4 Riesgo de alineación de ventanas

El GRU usa ventanas de 10 timesteps (`as_strided`, sin padding) → las primeras
9 filas de cada segmento de continuidad no tienen predicción GRU. Para esas
filas, `probs_blend = probs_lgbm` (alpha efectivo = 0). Documentar explícitamente
cuántas filas quedan en este caso (≈ 9 × 22 segmentos ≈ 200 filas de ~20,000 en val).

---

## 5. Modelo A — sin cambios estructurales, solo recálculo

Modelo A no tiene una línea propia en Exp 11. Se reentrena con:

- 12 features (Línea A aplicada).
- Dataset ampliado por Línea B (más sesiones `alimentacion`/`servido` confirmadas
  en Mayo-Jun pueden reducir falsos positivos cerca de zonas de servido,
  indirectamente ayudando a F1 activo).
- `calibration_by_period.json` (Exp 09B) se recalcula, pero se documenta de nuevo
  si el val set sigue siendo 100% Mayo-Jun (en cuyo caso `threshold_abril`
  permanece heredado en 0.20, sin cambios).

**No se espera un salto grande en Modelo A** — el objetivo es no degradar
(F1 activo Mayo-Jun ≥ 0.58, AUC-ROC ≥ 0.91) mientras Líneas A-C atacan Modelo B.

---

## 6. Orden de ejecución

```
Paso 1 — Línea B (datos primero — sin esto, A y C tienen poco que ofrecer)
├── app_anotacion.py: revisar 155 candidatos de Exp 07
│     ├── 134 alimentacion → confirmar/descartar
│     ├── 6 servido → confirmar/descartar (prioridad)
│     └── 15 reposo (FP de A) → revisar, documentar patrón
├── Guardar confirmaciones en new_annotations.csv
└── Re-ejecutar Fase 1: 04_extract_events.py, 05_build_sessions.py, 06_quality_report.py

Paso 2 — Línea A (en paralelo con Fase 2)
├── _phase2_utils.py / 01_prepare_datasets.py: quitar cadencia_s (12 features)
└── plateau_duration se mantiene en segundos

Paso 3 — Fase 2 completa
├── 01_build_labels.py
├── 02_build_features.py   (12 features, 30s, plateau en segundos)
├── 03_build_train_dataset.py  (split sin cambios: Apr8-May31/May31-Jun7/Jun7-Jun14)
└── 04_dataset_report.py   → comparar conteos servido/alimentacion vs Exp 09B

Paso 4 — Fase 3 — Modelo A y B (LGBM)
├── 02_train_modelo_a.py  (12 features, recalibrar)
└── 03_train_modelo_b.py  (12 features, dataset ampliado)

Paso 5 — Línea C (ensemble)
├── Si hubo sesiones servido nuevas → reentrenar GRU (exp_10_colab.py, NN-B)
├── Si no → reusar nn_b_best_b.pt de Exp 10
├── Generar probs_lgbm y probs_gru sobre X_val
├── Sweep de alpha (0.3-0.8, paso 0.1) → elegir alpha óptimo por Macro F1 / F1 servido
└── Documentar matriz de confusión del ensemble vs LGBM solo vs GRU solo

Paso 6 — Reporte
├── 04_training_report.py
└── Completar secciones 8-9 de este documento con resultados reales
```

---

## 7. Métricas objetivo

| Métrica | Exp 06 (prod, Abril) | Exp 09B (val Mayo-Jun) | Mejor NN (Exp 10) | **Meta Exp 11** |
|---|:---:|:---:|:---:|:---:|
| Modelo A — F1 activo | 0.7619 | 0.6000 | 0.6016 (TCN) | ≥ 0.6000 (no degradar) |
| Modelo A — AUC-ROC | 0.9205 | 0.9171 | 0.9129 (GRU) | ≥ 0.9171 (no degradar) |
| Modelo B — F1 alimentacion | 0.7606 | 0.5944 | 0.4728 (MLP) | ≥ 0.5944 (no degradar) |
| Modelo B — F1 servido | 0.1395 | 0.2264 | **0.3400 (GRU)** | **≥ 0.30** (ensemble) |
| Modelo B — Macro F1 | 0.6312 | 0.6034 | 0.5552 (GRU) | ≥ 0.62 |

> Si `F1 servido (ensemble) ≥ 0.30` **y** Macro F1 ≥ Exp 09B sin degradar
> `F1 alimentacion` → el ensemble queda como candidato a reemplazar el Modelo B
> de Exp 06 para el período Mayo-Jun, manteniendo Exp 06 puro para Abril.

---

## 8. Checklist de ejecución

### Línea B — datos
- [ ] `sesiones_detectadas_mayo_junio.csv` (Exp 07) disponible y accesible
- [ ] `app_anotacion.py` soporta modo "revisión de candidatos" (verificar/agregar)
- [ ] 134 candidatos `alimentacion` revisados
- [ ] 6 candidatos `servido` revisados (prioridad)
- [ ] 15 candidatos `reposo`/FP revisados y documentados
- [ ] `new_annotations.csv` actualizado
- [ ] `quality_report.txt` muestra conteos de sesiones actualizados

### Línea A — features
- [ ] `cadencia_s` eliminada de `FEATURES` en `_phase2_utils.py`
- [ ] `plateau_duration` confirmado en segundos (sin cambios)
- [ ] `dataset_report.txt` confirma 12 columnas de features

### Fase 3 — LGBM
- [ ] Modelo A reentrenado, métricas no degradan vs Exp 09B
- [ ] Modelo B reentrenado, métricas no degradan vs Exp 09B

### Línea C — ensemble
- [ ] Pesos GRU de Exp 10 recuperados (`nn_b_best_b.pt`) o reentrenados
- [ ] `probs_lgbm` y `probs_gru` generados sobre `X_val`
- [ ] Sweep de `alpha` documentado (tabla alpha vs F1 servido / Macro F1)
- [ ] Matriz de confusión del ensemble documentada
- [ ] Comparación final: LGBM solo vs GRU solo vs ensemble

### Cierre
- [ ] Sección "9. Resultados" completada con métricas reales
- [ ] Decisión documentada (¿reemplaza a Exp 06 para Mayo-Jun? ¿queda como diagnóstico?)
- [ ] Fila de Exp 11 actualizada en `experiments/README.md` y `EXPERIMENT_TRACKER.md`

---

## 9. Resultados

*Pendiente de ejecución.*

| Métrica | Valor |
|---|---|
| Modelo A — F1 activo | — |
| Modelo A — AUC-ROC | — |
| Modelo B — F1 alimentacion (LGBM) | — |
| Modelo B — F1 servido (LGBM) | — |
| Modelo B — F1 servido (GRU) | — |
| Modelo B — F1 servido (ensemble, alpha=?) | — |
| Modelo B — Macro F1 (ensemble) | — |
| Sesiones `servido` netas nuevas (Línea B) | — |

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Línea B aporta 0-2 sesiones `servido` nuevas (escenario más probable según conteos de Exp 07) | Documentar honestamente; el ensemble (Línea C) sigue siendo válido con datos de Exp 09B/10 |
| Alineación de ventanas GRU (9 filas sin predicción por segmento) | Usar `probs_lgbm` puro en esas filas; cuantificar cuántas son (~1% del val) |
| `app_anotacion.py` no tiene modo "revisión de candidatos" todavía | Construirlo reutilizando el modo "Comparación Modelo A" de Exp 09B (mismo tipo de overlay) |
| Revertir `cadencia_s` requiere recalcular Fase 2 completa | Se hace en la misma corrida que Línea B — sin costo incremental |
| Ensemble mejora val pero no generaliza a test (Jun 7-14, nunca visto) | No tocar `X_test`/`y_test` en Exp 11; reservar para Fase 4 con el modelo ganador final |

---

## 11. Si Exp 11 no cierra la brecha — opciones para Exp 12

Estas opciones quedan **fuera de alcance de Exp 11** pero documentadas como
backlog, en orden de prioridad si Línea B confirma que los datos `servido`
siguen siendo el cuello de botella dominante:

1. **Recolección de hardware nueva** dirigida específicamente a `servido`
   (sesiones cortas, ~160s de duración media) — la palanca de mayor impacto
   histórico (Exp 06: +4 sesiones servido → contexto de +20pts en F1 activo).
2. **Separar modelos por período** (Abril alta cadencia / Mayo-Jun baja cadencia)
   — propuesto en Exp 08 (`Próximos pasos`, opción 3) y nunca probado. El AUC
   estable (~0.91-0.92) en todos los experimentos sugiere que el problema es de
   *calibración por dominio*, no de capacidad discriminativa — dos modelos
   especializados podrían evitar el promedio que penaliza a ambos dominios.
3. **Incluir `light_percent`/`light_lux`** (disponibles desde Mayo-Jun, Exp 07) —
   podrían ayudar a discriminar sesiones nocturnas, pero requieren que Abril
   tenga (o se impute) un valor equivalente para no introducir otra discontinuidad
   entre períodos.

---

## Artefactos esperados

| Artefacto | Ubicación |
|---|---|
| `new_annotations.csv` (actualizado, Línea B) | `Docs/investigacion/Data_2026/Mayo_2026/` |
| `dataset_report.txt` (12 features) | `fase_2_dataset/outputs/dataset_report/` |
| `modelo_a.lgb`, `modelo_b.lgb` (Exp 11) | `fase_3_modelos/models/modelo_a/`, `modelo_b/` |
| `nn_b_best_b.pt` (GRU, reentrenado o de Exp 10) | `experiments/exp_10_colab/results/` → copiar a `fase_3_modelos/models/modelo_b/` |
| `ensemble_alpha_sweep.csv` | `fase_3_modelos/outputs/training_report/` |
| `training_report.txt` (Exp 11) | `fase_3_modelos/outputs/training_report/` |
