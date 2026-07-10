---
fase: 4
nombre: Dataset de Segmentos Etiquetados
estado: pendiente
ciclo: Alpha v2
---

# Fase 4 — Dataset

> **Objetivo:** Etiquetar cada segmento cruzando con el ground truth de Supabase
> y construir los splits de entrenamiento.

---

## Input

- `../fase_3_features/data/segments_features.parquet` — features por segmento
- `../fase_1_extraccion/data/sessions_labeled.parquet` — sesiones ground truth

## Output esperado

| Artefacto | Descripción |
|-----------|-------------|
| `data/segments_labeled.parquet` | Segmentos con etiqueta asignada |
| `data/train/X_train.parquet` | Features de entrenamiento |
| `data/train/X_val.parquet` | Features de validación |
| `data/train/X_test.parquet` | Features de test — **NO TOCAR hasta Fase 6** |
| `data/train/y_*.parquet` | Etiquetas correspondientes |
| `data/train/dataset_meta.json` | Conteos, fechas, distribución de clases |

---

## Regla de etiquetado

Un segmento recibe la etiqueta de la sesión con la que tenga mayor solapamiento temporal.

```python
# Solapamiento: intersección de intervalos / duración del segmento
solapamiento = (min(t_fin_seg, t_fin_ses) - max(t_ini_seg, t_ini_ses)).seconds
solapamiento_pct = solapamiento / duracion_seg

if solapamiento_pct >= 0.5:
    etiqueta = sesion.tipo          # 'alimentacion' o 'servido'
else:
    etiqueta = 'ruido'
```

---

## Reglas críticas del split

- Split **cronológico** — nunca aleatorio. Los datos tienen estructura temporal.
- Proporción: 70% train / 15% val / 15% test
- El split se hace sobre el tiempo, no sobre filas
- `X_test` queda **reservado** hasta la evaluación formal de Fase 6

**IMPORTANTE:** No usar las 17 sesiones sintéticas de servido en el train set.
Solo sesiones reales de `public.audit_events`.

---

## Distribución esperada de clases

La distribución de segmentos va a ser muy diferente a la de lecturas de Ciclo Alpha:

| Clase | Estimado | Nota |
|-------|---------|------|
| `alimentacion` | ~264 segmentos | 1 sesión = 1 segmento |
| `servido` | ~63 segmentos | Todas las sesiones reales |
| `ruido` | Miles | Depende de la sensibilidad de PELT |

El desbalance persiste, pero es menos extremo que en per-reading.
Usar `class_weight` en LightGBM, no SMOTE.

---

## Script a crear

| Script | Acción |
|--------|--------|
| `01_etiquetar_segmentos.py` | Cruza segmentos con sesiones ground truth |
| `02_split_cronologico.py` | Divide en train/val/test por fecha |
| `03_dataset_report.py` | Distribución de clases, fechas del split |
