---
fase: 2
nombre: Segmentación (Change-Point Detection)
estado: pendiente
ciclo: Alpha v2
---

# Fase 2 — Segmentación

> **Objetivo:** Detectar los bordes de los eventos (inicio y fin) sin clasificarlos.
> El segmentador solo responde: "aquí cambió algo" — no qué cambió.

Esta es la fase que reemplaza la clasificación per-reading de Ciclo Alpha/Gamma.

---

## Herramientas candidatas

### PELT (Pruned Exact Linear Time) — **recomendado para Alpha v2**

- Segmentación **offline** sobre datos históricos
- Librería: `ruptures` (Python)
- Modelo de costo: `rbf` o `l2`
- Parámetro `pen` (penalización por ruptura): tuning en Experimento AV2-E02

```python
import ruptures as rpt
signal = readings["delta_w_resampleado"].values
algo = rpt.Pelt(model="rbf").fit(signal)
breakpoints = algo.predict(pen=noise_model["p95_abs_delta_w"])
```

### BOCPD (Bayesian Online Change Point Detection) — para producción futura

- Segmentación **online** (un punto a la vez)
- Solo necesario si se integra al bridge en tiempo real
- No implementar en Alpha v2 salvo que PELT valide el enfoque

---

## Input

- `data/readings_raw.parquet` (de Fase 1) — resampleado a 30s
- `../fase_0_ruido/noise_model.json` — parámetros del modelo de ruido

## Output esperado

| Artefacto | Descripción |
|-----------|-------------|
| `data/segments.parquet` | Tabla: `t_inicio`, `t_fin`, `n_lecturas`, `idx_inicio`, `idx_fin` |
| `data/segments_viz.html` | Visualización: curva de peso + líneas de breakpoints |

---

## Scripts a crear

| Script | Acción |
|--------|--------|
| `01_resample.py` | Lee `readings_raw.parquet`, resamplea a 30s |
| `02_segmentar_pelt.py` | Corre PELT con parámetros del modelo de ruido |
| `03_visualiza_segmentos.py` | Genera HTML con curva + breakpoints + sesiones ground truth superpuestas |

---

## Criterio de éxito

- Los segmentos de PELT capturan ≥ 80% de las sesiones conocidas de alimentacion
- Los segmentos de PELT capturan ≥ 70% de las sesiones conocidas de servido
- Tasa de falsos positivos (segmentos sin sesión real) ≤ 30%

---

## Riesgo principal

**Sobre-segmentación:** si `pen` es muy bajo, cada fluctuación de ruido genera
un segmento. Solución: calibrar `pen` con base en `p95_abs_delta_w` de Fase 0.

**Sub-segmentación:** si `pen` es muy alto, eventos cortos (servido de 20–60s)
se fusionan con el segmento adyacente. Solución: ajustar con los servidos conocidos.
