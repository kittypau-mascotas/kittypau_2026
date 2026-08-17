---
area: Data Science
estado: activo
ciclo: Alpha v2
actualizado: 2026-06-25
---

# Ciclo Alpha v2 — Detección por Segmentos

> **Enfoque:** Change-point detection sobre la serie temporal de peso.  
> En lugar de clasificar lecturas individuales, se detectan los **bordes del evento**
> y se clasifica la **forma completa del segmento**.

Motivación: los 3 ciclos anteriores (Alpha, Gamma, Delta) confirmaron que el
F1-servido tiene un techo de 0.27 con arquitecturas per-reading. La forma
de la curva no es recuperable desde una sola lectura. Ver diagnóstico completo:
[`../ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md`](../ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md)

---

## Estructura — 7 fases

```
Ciclo_Alpha_v2/
├── README.md                  ← este archivo
├── experiments/
│   └── README.md              ← tracker de experimentos v2
├── fase_0_ruido/              ← PRIMERA — modelo estadístico del sensor en reposo
├── fase_1_extraccion/         ← datos raw desde Supabase (hereda de Ciclo Alpha)
├── fase_2_segmentacion/       ← PELT offline / BOCPD online
├── fase_3_features/           ← features de segmento completo
├── fase_4_dataset/            ← dataset de segmentos etiquetados
├── fase_5_modelos/            ← LightGBM sobre vectores de segmento
└── fase_6_evaluacion/         ← evaluación formal sobre test set reservado
```

---

## Secuencia de ejecución

### Fase 0 — Modelo de ruido (`fase_0_ruido/`)

Caracterizar estadísticamente el sensor KPCL0034 en reposo.
Usar lecturas etiquetadas como `reposo` de Ciclo Alpha.

Outputs:
- `media`, `std`, `autocorrelacion_lag1` del delta de peso en reposo
- `p95_abs_delta_w` — umbral que separa "fluctuación normal" de "movimiento real"
- `noise_model.json` — parámetros del modelo de ruido

> Sin este paso, cualquier segmentador va a sobre-segmentar el ruido del sensor.

---

### Fase 1 — Extracción (`fase_1_extraccion/`)

Reutiliza el pipeline de `Ciclo_Alpha_v1/fase_1_extraccion/` para descargar:
- `readings_raw.parquet` — lecturas KPCL0034 (usar `ingested_at`, clock_invalid=71%)
- `sessions_labeled.parquet` — sesiones del ground truth (`public.audit_events`)

Fuentes disponibles:
- **264 sesiones alimentacion** etiquetadas en `public.audit_events`
- **~63 sesiones servido reales** (+ 17 sintéticas — NO usar sintéticas para train)
- **134,164 lecturas** KPCL0034 Abril–Junio 2026 en `readings_delta.parquet`
  (en `Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Delta/fase_1_datos/data/processed/`)

---

### Fase 2 — Segmentación (`fase_2_segmentacion/`)

Detectar dónde la señal diverge del modelo de ruido (de Fase 0).

Herramientas candidatas:
- **PELT** (Pruned Exact Linear Time) — segmentación offline, más simple
- **BOCPD** (Bayesian Online Change Point Detection) — para producción futura

El segmentador **no clasifica** — solo devuelve inicio y fin de cada segmento.

Output: `segments.parquet` — tabla con `t_inicio`, `t_fin`, `n_lecturas` por segmento.

---

### Fase 3 — Features de segmento (`fase_3_features/`)

Para cada segmento de Fase 2, calcular features que describen su **forma completa**:

| Feature | Descripción |
|---------|-------------|
| `duracion_s` | Duración del segmento en segundos |
| `delta_peso_total` | Cambio total de peso (inicio → fin) |
| `pendiente_ascenso` | Velocidad de subida (g/s) en la fase activa |
| `pendiente_descenso` | Velocidad de bajada (g/s) |
| `peso_inicial` | Peso al inicio del segmento |
| `peso_final` | Peso al final del segmento |
| `area_bajo_curva` | Integral del cambio de peso en el tiempo |
| `tiempo_hasta_pico` | Segundos desde inicio hasta máximo local |
| `variabilidad_plateau` | std del peso en la fase estable post-evento |
| `hora_inicio_sin` | `sin(hora_local * 2π/24)` — componente cíclica |
| `hora_inicio_cos` | `cos(hora_local * 2π/24)` — componente cíclica |

Output: `segments_features.parquet`

---

### Fase 4 — Dataset (`fase_4_dataset/`)

Etiquetar cada segmento cruzando con `public.audit_events` (ground truth).

Regla de asignación:
- Si el segmento solapa ≥ X% con una sesión `alimentacion` → etiqueta `alimentacion`
- Si el segmento solapa ≥ X% con una sesión `servido` → etiqueta `servido`
- Si no solapa con ningún evento real → etiqueta `ruido`

Split: cronológico 70/15/15 (igual que Ciclo Alpha).

**IMPORTANTE:** No usar sintéticas de servido para train. Solo sesiones reales.

Output: `X_train.parquet`, `X_val.parquet`, `X_test.parquet` (y sus `y_*`)

---

### Fase 5 — Modelos (`fase_5_modelos/`)

LightGBM multiclase sobre vectores de segmento (no per-reading).

Clases objetivo:
- `alimentacion` — descenso gradual, duración 2–10 min, delta < -5g
- `servido` — ascenso rápido, duración 20–60s, delta > +5g
- `ruido` — sin dirección sostenida, |delta_total| ≤ 3g

Heurística baseline (antes del modelo):
- `delta_peso_total > +5g` → servido (casi trivial con esta feature)
- `delta_peso_total < -5g AND duracion_s > 120` → alimentacion

El modelo ML debe superar esta heurística para justificar su complejidad.

---

### Fase 6 — Evaluación (`fase_6_evaluacion/`)

Evaluación formal sobre `X_test` reservado.

Métricas objetivo:
- F1-alimentacion ≥ 0.85
- F1-servido ≥ 0.60 (objetivo principal — Alpha no pudo superar 0.27)
- ARI contra ground truth humano ≥ 0.50

---

## Constantes validadas del pipeline (heredadas de Gamma)

```python
GAP_CUTOFF_S        = 300     # 5 min → separa sesiones independientes
PLATEAU_THRESHOLD   = 1.5     # rolling_std_5 < 1.5g → lectura estable
RESAMPLE_TARGET_S   = 30      # SIEMPRE resamplear ANTES de calcular features
TIMEZONE_NEGOCIO    = "America/Santiago"  # NUNCA UTC para features de hora

KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo–Junio 2026
]
```

> Cambiar estas constantes = nuevo experimento explícito. No modificar ad-hoc.

---

## Lo que este ciclo NO debe repetir

| Error | Consecuencia en ciclos anteriores |
|-------|-----------------------------------|
| Clasificar lecturas individuales como objetivo | F1-servido techo en 0.27 (Alpha, Gamma) |
| Usar Silhouette sin ARI | Delta "completó" con resultado engañoso (0.8165 Silhouette, 0.16 ARI) |
| Asumir que más modelos resuelven un problema de formulación | G-01 a G-05 con el mismo techo |
| Augmentar servido sintéticamente | 17 sintéticas inflan artificialmente N |
| Olvidar resamplear a 30s | Distribution shift documentado en Pre-G |
| No modelar ruido antes de segmentar | Sobre-segmentación garantizada |
| Seguir experimentando sin resolver el problema de datos primero | 10 experimentos Alpha sobre base rota |

---

## Assets heredados disponibles

| Asset | Dónde está |
|-------|-----------|
| `readings_delta.parquet` (134k lecturas) | `Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Delta/fase_1_datos/data/processed/` |
| Pipeline extracción Fase 1 | `Ciclo_Alpha_v1/fase_1_extraccion/` |
| `app_anotacion_gamma.py` | `Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Gamma/` |
| Aprendizajes Gamma + Delta | `APRENDIZAJES_GAMMA_DELTA.md` |
| Ground truth completo | `public.audit_events` en Supabase |
