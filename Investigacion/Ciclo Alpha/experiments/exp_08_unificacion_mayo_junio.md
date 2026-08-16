# Exp 08 — Unificación Mayo-Junio 2026

| Campo | Valor |
|---|---|
| **ID** | Exp 08 |
| **Nombre** | Unificación datos Mayo-Junio 2026 |
| **Fecha** | 2026-06-14 |
| **Estado** | ✅ Completado |
| **Basado en** | Exp 06 (artefactos base) + Exp 07 (anotaciones retroactivas) |

---

## Objetivo

Reentrenar Modelo A y Modelo B incorporando las 91 sesiones retroactivamente anotadas de Mayo-Junio 2026 (resultado del proceso de etiquetado manual via `app_anotacion.py`).

---

## Cambios respecto a Exp 06

| Componente | Exp 06 | Exp 08 |
|---|---|---|
| Fuente de readings | `kittypau_full_07-05-2026_csv/readings.csv` (solo Abril) | Abril + `Mayo_2026/readings_rows.csv` |
| Rango de datos | Apr 8 – May 1, 2026 | Apr 8 – Jun 14, 2026 |
| Total filas readings | 124,682 | **212,011** |
| Sesiones alimentacion (train) | 103 | **185** (+82 retroactivas) |
| Sesiones servido (train) | 18 | **27** (+9 retroactivas) |
| Etiquetado May-Jun | ❌ Sin etiquetar | ✅ Retroactivo via `new_annotations.csv` |
| Split (train/val/test) | Apr 8–Apr 20 / Apr 20–Apr 28 / Apr 28–May 1 | Apr 8–May 31 / May 31–Jun 7 / Jun 7–Jun 14 |
| UUID KPCL0034 Abril | `9510a455-b0e9-4932-8be1-03976d31228a` | mismo |
| UUID KPCL0034 Mayo-Jun | N/A | `3a460074-e7c3-41bf-ae5a-a011445f927a` |

---

## Modificaciones al pipeline

### `fase_1_extraccion/scripts/03_extract_readings.py`
- `FECHA_FIN` extendido de `2026-05-02` a `2026-06-15`
- Nueva función `load_from_csv_mayo_junio()`: lee `Data_2026/Mayo_2026/readings_rows.csv`, filtra por `KPCL0034_MJ_UUID`, usa `ingested_at` (clock_invalid 100% True en Mayo-Jun)
- `main()` concatena Abril + Mayo-Jun antes de llamar a `build_dataframe()`

### Scripts sin cambios
- `04_extract_events.py`: ya fusionaba `new_annotations.csv` automáticamente
- `05_build_sessions.py`: sin cambios (genérico)
- Fase 2 y Fase 3: sin cambios

---

## Resultados — Fase 1

| Métrica | Valor |
|---|---|
| Total readings | 212,011 |
| Rango temporal | Apr 8 – Jun 14, 2026 |
| Gaps > 5 min | 21 (incluyendo gap May 1 – May 25 sin datos) |
| clock_invalid True | 134,576 (63.5%) |
| Sesiones reconstruidas | 212 (185 alim · 27 serv) |
| Eventos etiquetados | 436 (254 audit_events + 182 new_annotations) |

---

## Resultados — Fase 2 (Dataset)

| Split | Filas | Período |
|---|---|---|
| Train | 94,621 | Apr 8 – May 31, 2026 |
| Val | 20,276 | May 31 – Jun 7, 2026 |
| Test | 20,277 | Jun 7 – Jun 14, 2026 |

Distribución train: reposo 97.8% · alimentacion 2.0% · servido 0.1%

---

## Resultados — Modelo A (Binario: activo vs reposo)

| Métrica | Exp 06 | **Exp 08** | Delta |
|---|:---:|:---:|:---:|
| F1 activo | 0.7619 | **0.6021** | −0.16 |
| AUC-ROC | 0.9205 | **0.9181** | −0.00 |
| Threshold | 0.20 | 0.20 | — |
| Precision | — | 0.4960 | — |
| Recall | — | 0.7658 | — |
| Iteraciones | — | 17 | — |

---

## Resultados — Modelo B (Multiclase)

| Métrica | Exp 06 | **Exp 08** | Delta |
|---|:---:|:---:|:---:|
| F1 alimentacion | 0.7606 | **0.5778** | −0.18 |
| F1 servido | 0.1395 ⚠️ | **0.2414** ✅ | **+0.10** |
| F1 reposo | — | 0.9884 | — |
| Macro F1 | 0.6312 | **0.6025** | −0.03 |
| Iteraciones | — | 179 | — |

---

## Análisis

### ¿Por qué bajan F1 activo y F1 alimentacion?

El **val set ahora es Mayo-Jun 2026** (May 31 – Jun 7), que tiene características diferentes al período de entrenamiento original (Abril):

| Característica | Abril (train) | Mayo-Jun (val/test) |
|---|---|---|
| Cadencia mediana | ~14.7 s | ~30.0 s |
| clock_invalid True | ~50% | 100% |
| UUID KPCL0034 | `9510a455…` | `3a460074…` |
| Origen de etiquetas | Tiempo real (Supabase) | Retroactivo (app_anotacion) |

El **shift de distribución** entre Abril y Mayo-Jun explica la caída en las métricas de val. El modelo sigue siendo capaz (AUC-ROC = 0.9181 > 0.85), pero el dominio Mayo-Jun es estadísticamente diferente.

### F1 servido mejora (+0.10)

La adición de 9 sesiones de servido retroactivas (de 18 a 27 total) mejoró el F1 servido de 0.1395 a 0.2414. Con más datos de este tipo, el modelo debería seguir mejorando.

### Decisión de producción

**Exp 06 permanece como modelo de producción** ya que tiene mejor F1 activo y F1 alimentacion sobre datos del mismo período de entrenamiento. Exp 08 es un experimento diagnóstico que confirma:

1. La heterogeneidad de datos Abril vs Mayo-Jun requiere normalización de features (cadencia, distribución temporal)
2. Más datos de servido ayudan
3. El shift de distribución es el factor limitante para Exp 08

---

## Próximos pasos → Exp 09

Opciones para Exp 09 (en evaluación):

1. **Normalizar cadencia**: pre-procesar ambos períodos a la misma frecuencia (~30s) antes de calcular features
2. **Revisar etiquetas Abril**: usar `app_anotacion.py` modo "Prep Exp 09 - Abril 2026" para confirmar/corregir las 128 sesiones detectadas
3. **Separar modelos por período**: un modelo para datos Abril (alta cadencia) y otro para Mayo-Jun (baja cadencia)
4. **Incluir `light_*` features**: disponibles desde Mayo-Jun, podrían ayudar a detectar sesiones nocturnas

---

## Artefactos

| Artefacto | Ubicación |
|---|---|
| `modelo_a.lgb` (Exp 08) | `fase_3_modelos/models/modelo_a/modelo_a.lgb` |
| `modelo_b.lgb` (Exp 08) | `fase_3_modelos/models/modelo_b/modelo_b.lgb` |
| `readings_raw.parquet` (extendido) | `fase_1_extraccion/data/raw/readings_raw.parquet` |
| `sessions_labeled.parquet` | `fase_1_extraccion/data/raw/sessions_labeled.parquet` |
| `quality_report.txt` | `fase_1_extraccion/outputs/quality_report/quality_report.txt` |
| `dataset_report.txt` | `fase_2_dataset/outputs/dataset_report/dataset_report.txt` |
| `training_report.txt` | `fase_3_modelos/outputs/training_report/training_report.txt` |

> ⚠️ **NOTA**: Los artefactos `modelo_a.lgb` y `modelo_b.lgb` han sido sobreescritos por Exp 08.
> Para reproducir Exp 06 se necesita re-correr el pipeline con `FECHA_FIN=2026-05-02` y sin el CSV Mayo-Jun.
> La inferencia de producción del sistema web sigue usando los modelos de Exp 06 (via Supabase).
