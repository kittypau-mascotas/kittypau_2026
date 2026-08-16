# Comparación Ciclo Alpha vs Ciclo Gamma

**Fecha:** 2026-06-17
**Estado Gamma al momento de esta comparación:** Pre-G completado · Fase 2 completada 2026-06-17 · ningún modelo entrenado aún · próximo: G-01
**Referencia Alpha:** Exp06 (mejor modelo en producción) y Exp08 (último experimento con datos completos)

---

## Resumen ejecutivo

Gamma mejoró sustancialmente en **calidad y cantidad de datos** respecto a Alpha.
Los 4 errores críticos que Alpha nunca corrigió están resueltos antes de entrenar el primer modelo.
Las métricas de modelo no se pueden comparar todavía: Gamma no tiene ningún experimento entrenado.
El F1-activo de 0.7619 (Exp06 Alpha) sigue siendo la referencia de producción que Gamma debe superar.

---

## 1. Comparación de datos

### 1.1 Volumen de sesiones etiquetadas

| Métrica | Alpha (mejor caso, Exp08) | Gamma Pre-G | Delta |
|---|---|---|---|
| Sesiones alimentación | 185 | 264 | +79 (+43%) |
| Sesiones servido reales | 27 | 63 | +36 (+133%) |
| Sesiones servido efectivas | 27 | 80 (63 real + 17 sint.) | +53 |
| Sesiones reposo etiquetadas | — | 296 | nueva clase explícita |

El cuello de botella histórico de Alpha era el servido. Con 27 sesiones reales, Exp08, 09A, 09B y 10-NN nunca pudieron entrenar bien esa clase. Gamma entra a G-01 con 63 reales — 2.3× más — lo que cambia de raíz la situación de esa clase.

### 1.2 Lecturas procesadas

| Métrica | Alpha | Gamma | Nota |
|---|---|---|---|
| Lecturas crudas | 212,011 | 212,011 (mismo dump) | mismo origen |
| Lecturas post-pipeline | ~212,011 (sin resampleo uniforme) | 134,935 (post-30s uniforme) | Gamma consolida a 30s; Alpha usaba la cadencia variable original |
| Período cubierto | Abr–Jun 2026 (con gap) | Abr–Jun 2026 (unificado) | ver §1.3 |

> La diferencia 212k vs 135k no representa menos datos: es la misma información comprimida
> a cadencia uniforme de 30s. Alpha usaba la cadencia variable del sensor, lo que introducía
> el feature `cadencia_s` (gain ≈ 0 en todos los experimentos) y contaminaba las features
> de rolling con intervalos irregulares.

### 1.3 Correcciones de calidad de datos

| Problema | Alpha | Gamma |
|---|---|---|
| UUID doble de KPCL0034 | ❌ dos UUIDs mezclados sin mapeo explícito | ✅ `uuid_mapping.json` — un UUID canónico antes de cualquier cálculo |
| Timezone mixta en `audit_events.created_at` | ❌ `+00`, `-04`, `-04:00` mezclados | ✅ normalización UTC explícita en g03 |
| Origen de etiquetas | ❌ mixto: tiempo real (Abril) + retroactivo (Mayo–Jun, Exp07/08) con criterios distintos | ✅ un solo criterio: revisión completa de los 3 meses vía `app_anotacion.py` |
| Gap Mayo 1–25 | ❌ documentado pero no manejado — contaminaba splits temporales | ✅ tratado como gap de transmisión; no se rellena |
| `clock_invalid` en Mayo–Jun | ❌ ignorado en Alpha | ✅ forzado a `ingested_at` cuando `clock_invalid=100%` |

---

## 2. Comparación de features

| Feature | Alpha (v1_modelo_a_13) | Gamma (FEATURES_GAMMA) | Cambio |
|---|---|---|---|
| `weight_grams` | ✅ | ✅ | igual |
| `delta_w` | ✅ | ✅ | igual |
| `delta_w_10` | ✅ | ✅ | igual |
| `rolling_std_5/10` | ✅ | ✅ | igual |
| `rolling_mean_5` | ✅ | ✅ | igual |
| `net_weight` | ✅ | ✅ | igual |
| `is_plateau` | ✅ | ✅ | igual |
| `plateau_duration` | ✅ en **filas** | ✅ en **segundos** (`plateau_duration_s`) | corregido |
| `hour_sin/cos` | ✅ hora **UTC** | ✅ hora **Santiago** | corregido |
| `cadencia_s` | ✅ (gain ≈ 0 en todos los exp.) | ❌ eliminada | corregido |
| `clock_invalid` | ✅ | ✅ | igual |
| `dia_semana_sin` | ❌ no existía | ✅ nueva | añadida |

Total features: 13 en Alpha · 13 en Gamma (misma cantidad, composición diferente).

---

## 3. Comparación de métricas de modelo

| Métrica | Alpha Exp06 (producción) | Gamma G-01 en adelante |
|---|---|---|
| F1-activo (val) | **0.7619** | pendiente |
| AUC-ROC activo | ~0.91 | pendiente |
| F1-servido | muy bajo / no medido | pendiente |
| Calibración | isotonic regression aplicada | será aplicada desde G-01 |

> No hay métricas de modelo Gamma todavía. Esta sección se completará cuando G-01
> (baseline LightGBM) esté entrenado. El objetivo de Gamma es superar el F1-activo de 0.7619
> y lograr un F1-servido ≥ 0.40.

---

## 4. Desbalance de clases en el dataset de entrenamiento

| Clase | Alpha Exp06 (aprox.) | Gamma train (medido 2026-06-17) |
|---|---|---|
| reposo (mayoritaria) | ~99% de filas | 97.96% — 76,095 filas |
| alimentacion | ~0.7% | 1.86% — 1,446 filas |
| servido | ~0.1% (≈ 241x vs reposo) | 0.17% — 135 filas |
| **Imbalance ratio** | ~241x | **563.7x** (medido por g04) |

Dataset Gamma: 77,676 train · 36,632 val · 20,505 test (sellado). Total: 134,813 filas post-NaN.

El imbalance ratio de **563.7x** (servido vs reposo) en Gamma train parece mayor que en Alpha,
pero se explica por cómo se mide: Alpha usaba solo las sesiones de Abril con etiquetas en
tiempo real (mayor densidad de eventos), mientras Gamma cubre 3 meses completos con mucho
más reposo proporcional. Con **135 sesiones de servido en train** la clase tiene mucho más
representación absoluta de la que tenía en Alpha — el ratio en filas es engañoso.

Acción: `is_unbalance=True` en LightGBM o `class_weight='balanced'` en sklearn desde G-01.
`g04_dataset_report.py` ya emite el aviso automáticamente cuando imbalance > 10x.

---

## 5. Lo que Gamma NO mejoró todavía

- **Sin modelo entrenado.** Toda la mejora es de datos y pipeline. El impacto real se verá en G-01.
- **Hidratación:** 0 sesiones etiquetadas. Se requiere un segundo device (agua) para esta clase.
- **Servido aún por debajo del ideal:** 63 reales / 80 target. Se usa augmentación temporal
  (17 filas sintéticas) mientras se completan las anotaciones. Ver `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md` §7b.
- **Un solo device (KPCL0034 / Bandida).** Las métricas de generalización entre dispositivos
  no se pueden evaluar todavía.

---

## 6. Próximos pasos inmediatos

1. **G-01** — Baseline LightGBM con `is_unbalance=True` sobre el dataset de Fase 2.
   Meta: superar F1-activo = 0.7619 de Exp06.
2. **G-02** — GBM family sweep (XGBoost, CatBoost).
3. **Servido real ≥ 80** — Completar anotaciones pendientes para desactivar la augmentación.
   Ver tracker: `EXPERIMENT_TRACKER_GAMMA.md`.

---

*Ver también:* `instructivo.md` · `CICLO_GAMMA_UNIFICACION_Y_RETIQUETADO.md` · `EXPERIMENT_TRACKER_GAMMA.md`
